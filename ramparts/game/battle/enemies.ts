// Enemies: spawning, movement, role mechanics (systems 9.2), leaks (1.3, R1), deaths (tick step 8).
import type { Battle, EnemyId, Statuses } from "../types.ts";
import { ACTS, ACT4_FIREPROOF, TYRANT_FIREPROOF } from "../content/battle/acts.ts";
import { ENEMIES, tierUp } from "../content/battle/enemies.ts";
import { BOSS_NUM } from "../content/battle/bosses.ts";
import { laneNearest } from "../map.ts";
import { bv, has, hasB } from "./mods.ts";
import {
  DT, T, X, alive, d2, dist, emit, enemies, hittable, nid, placeAt, roll, soldiers, synergy, towers, zones,
  type EnemyX, type SpawnItem, type TowerX,
} from "./internal.ts";
import { chill, damage, disableTower, hex, mark } from "./damage.ts";
import { initBoss, updateBoss, bossStops } from "./bosses.ts";

export const blankStatuses = (): Statuses => ({
  slow: 0, slowT: 0, chill: 0, frozen: 0, thaw: 0, numb: 0, brittle: 0, burnDps: 0, burnT: 0, oiled: 0,
  marked: 0, markPct: 0, hexed: 0, hexPct: 0, shred: 0, corrode: 0, shredT: 0, stun: 0, stunImmune: 0,
  root: 0, rootImmune: 0, revealed: 0, charges: 0, chargeT: 0, grounded: 0, warcry: 0,
});

export interface SpawnOpts {
  wave?: number; elite?: boolean; affixes?: string[]; summoned?: boolean; noGold?: boolean; s?: number; onAir?: boolean;
}

/** Create an enemy at the start of a ground lane (or at `s`). Flyers take that lane's air route. */
export function spawnEnemy(b: Battle, kind: EnemyId, groundLane: number, o: SpawnOpts = {}): EnemyX {
  const x = X(b), def = ENEMIES[kind], act = ACTS[b.act];
  const lane = b.map.lanes[Math.min(groundLane, b.map.lanes.length - 1)]!;
  const airIdx = Math.max(0, b.map.air.findIndex((a) => a.spawn === lane.spawn));
  let hp = def.fixedHp ? def.hp : def.hp * act.hpMul;
  if (def.boss) {
    hp *= 1 + x.mods.bossHp;
    if (b.act === 4 && kind !== "tyrant") hp *= BOSS_NUM.championHp;
  }
  let armour = def.armour, ward = def.ward, haste = 0;
  if (b.act === 2) { if (kind === "brute") armour = 65; if (kind === "shieldbearer") armour = 45; }
  const affixes = [...(o.affixes ?? [])];
  for (const a of affixes) {
    if (a === "plated") armour = tierUp(armour);
    if (a === "runed") ward = tierUp(ward);
    if (a === "hasted") haste += o.elite || def.elite ? 0.4 : 0.2;
  }
  const onAir = o.onAir ?? def.flying;
  const e: EnemyX = {
    id: nid(b), kind, lane: onAir ? airIdx : groundLane, air: def.flying, s: 0, x: 0, y: 0, px: 0, py: 0,
    z: def.flying ? (kind === "drake" || kind === "ember-drake" ? 2.0 : 1.4) : 0,
    hp, maxHp: hp, shield: 0, maxShield: 0, armour, ward,
    fireproof: b.act === 4 ? (kind === "tyrant" ? TYRANT_FIREPROOF : ACT4_FIREPROOF) : 0,
    baseSpeed: def.speed, speed: def.speed, st: blankStatuses(), stealth: kind === "shade", heldBy: 0,
    elite: !!(o.elite || def.elite), affixes: affixes.filter((a) => a !== "haunted"), born: b.tick,
    dead: false, gone: false, leakV: def.leak, threat: def.threat,
    bountyV: def.bounty ?? Math.round(def.threat * 5 * act.bountyMul),
    noGold: !!o.noGold || affixes.includes("haunted"), summoned: !!o.summoned,
    freezeAt: def.freezeAt, noChill: !!def.noChill,
    melee: def.melee ? { dmg: def.melee.dmg, int: T(def.melee.int), magic: !!def.melee.magic, cleave: def.melee.cleave ?? 0 } : null,
    meleeCd: 0, pend: 0, chillHold: T(1.5), chillIdle: 0, hexerT: 0, hexForever: 0, markBy: 0, brittleT: 0, shatterPct: 0,
    frozenBy: 0, rootPct: 0, scorchPct: 0, burns: [], burnSrc: 0, burnAcc: 0, slip: 0, heldT: 0, rootedBy: 0, seg: 0,
    laneLen: 0, baseArmour: armour, baseWard: ward, hasted: haste, warleader: affixes.includes("warleader"), regenIdle: 0,
    broodStep: 0, abilT: 0, abilT2: 0, channel: 0, plant: 0, plantTower: 0, opened: [], acidAcc: 0, shredAcc: 0, lastBy: 0,
    revealSrc: 0, airLane: airIdx, groundLane: Math.min(groundLane, b.map.lanes.length - 1), lap: 0, spikeHit: [],
    killedBy: 0, chain: 0, howl: 0, pullT: 0, hatch: 0, zslow: 0, onAir,
  };
  // role timers (content 4.2): first pulses
  if (kind === "shaman" || kind === "shieldbearer") e.abilT = T(2);
  if (kind === "warlock") e.abilT = T(4);
  if (kind === "matron") e.abilT = T(4);
  placeAt(b, e, o.s ?? 0);
  e.px = e.x; e.py = e.y;
  if (def.boss) initBoss(b, e);
  // Snowglobe: wave 1 (and the boss escort, R16) enters chilled at 80%
  if (has(x.mods, "snowglobe") && !e.noChill && !def.boss && (o.wave === 0 || (o.wave !== undefined && b.waves[o.wave]?.boss))) {
    e.st.chill = e.freezeAt * 0.8; e.chillHold = T(6);
  }
  if (e.elite) x.elites++;
  b.enemies.push(e);
  emit(b, e.x, e.y, { e: "spawn", id: e.id, kind, lane: e.lane });
  if (def.boss) emit(b, e.x, e.y, { e: "boss_spawn", id: e.id, boss: kind as never });
  return e;
}

/** Spawn queued wave units whose tick has come. */
export function runSpawner(b: Battle) {
  const x = X(b);
  const q = x.spawnQ;
  let k = 0;
  while (k < q.length && q[k]!.tick <= b.tick) {
    const it: SpawnItem = q[k]!;
    spawnEnemy(b, it.kind, it.lane, { wave: it.wave, elite: it.elite, affixes: it.affixes, noGold: it.noGold });
    k++;
  }
  if (k) q.splice(0, k);
  if (x.spawning && !q.some((it) => it.wave === x.waveOf)) {
    x.spawning = false;
    x.lastSpawnTick = b.tick;
    const last = b.next >= b.waves.length;
    if (!last) b.countdown = Math.round(T(ACTS[b.act].countdown) * x.mods.countdownMul);
    emit(b, 0, 0, { e: "wave_spawned", wave: x.waveOf, countdown: last ? -1 : b.countdown });
  }
}

/** Spawn a child/summon on the parent's road near its position. */
export function spawnNear(b: Battle, kind: EnemyId, p: EnemyX, ds: number, o: SpawnOpts = {}): EnemyX {
  const def = ENEMIES[kind];
  if (def.flying) {
    const air = b.map.air[p.airLane] ?? b.map.air[0]!;
    const n = laneNearest(air, p.x, p.y);
    const e = spawnEnemy(b, kind, p.groundLane, { ...o, onAir: true, s: Math.max(0, n.s + ds) });
    return e;
  }
  const s = p.onAir ? laneNearest(b.map.lanes[p.groundLane]!, p.x, p.y).s : p.s;
  return spawnEnemy(b, kind, p.groundLane, { ...o, onAir: false, s: Math.max(0, s + ds) });
}

// ---------------------------------------------------------------- movement
function speedOf(_b: Battle, e: EnemyX, leaders: EnemyX[]): number {
  const st = e.st;
  if (e.boss2) {
    if (e.boss!.burrowed) return BOSS_NUM.burrowSpeed * (1 + BOSS_NUM.lapSpeed * e.lap);
    if (e.boss!.flying) return BOSS_NUM.wingLand / BOSS_NUM.wingS;
    if (e.boss2.chargeLeft > 0) return BOSS_NUM.chargeSpeed;
    if (bossStops(e)) return 0;
  }
  if (st.frozen > 0 || st.stun > 0 || e.channel > 0 || e.plant > 0) return 0;
  if (!e.air && st.root > 0) return 0;
  if (e.baseSpeed <= 0) return 0;
  let slow = Math.max(st.slowT > 0 ? st.slow : 0, e.zslow, st.numb > 0 ? 0.5 : 0, e.freezeAt > 0 ? (0.4 * st.chill) / e.freezeAt : 0);
  if (e.boss) slow *= 0.5;
  let haste = e.hasted + (st.warcry > 0 ? BOSS_NUM.warcrySpeed : 0) + (e.howl > 0 ? BOSS_NUM.howlHaste : 0);
  for (const l of leaders) if (l !== e && d2(l.x, l.y, e.x, e.y) <= 4) { haste += 0.2; break; }
  let v = e.baseSpeed * (e.boss2 ? e.boss2.speedMul : 1) * Math.max(0.25, 1 - slow) * (1 + haste) * (1 + BOSS_NUM.lapSpeed * e.lap);
  if (e.heldBy) {
    if (e.slip > 0) { e.slip--; v *= 0.5; }
    else if (e.kind === "wyrm") v *= 0.5;
    else v = 0;
  }
  return v;
}

export function moveEnemies(b: Battle) {
  const x = X(b);
  const es = enemies(b);
  const leaders = es.filter((e) => e.warleader && alive(e));
  const barriers = zones(b).filter((z) => z.kind === "barrier");
  for (let i = 0; i < es.length; i++) {
    const e = es[i]!;
    if (!alive(e)) continue;
    e.px = e.x; e.py = e.y;
    if (e.boss2) updateBoss(b, e);
    if (!alive(e)) continue;
    roleAbilities(b, e);
    let v = speedOf(b, e, leaders);
    let ds = v * DT;
    if (e.pullT > 0) ds -= 2.5 / 9;
    if (!e.onAir && ds > 0) for (const z of barriers) {
      const ls = z.ls[e.groundLane];
      if (ls === undefined || ls < 0) continue;
      if (e.s < ls && e.s + ds >= ls - 0.45) {
        ds = Math.max(0, ls - 0.45 - e.s); v = 0;
        if (e.boss || e.kind === "juggernaut") { z.stop++; if (z.stop >= T(1)) z.ticks = 0; }
      }
    }
    e.speed = Math.max(0, v);
    if (ds !== 0) placeAt(b, e, e.s + ds);
    if (x.hold && e.s > (e.laneLen * 2) / 3 && !e.onAir) x.hold = false;
    if (e.s >= e.laneLen - 1e-6 && e.baseSpeed > 0) leak(b, e);
  }
}

// ---------------------------------------------------------------- leaks
export function leak(b: Battle, e: EnemyX) {
  const x = X(b), m = x.mods;
  let cost = e.leakV;
  const special = e.elite || !!e.boss;
  if (!special) {
    if (has(m, "lucky-horseshoe") && !x.horseshoe) { x.horseshoe = true; cost = 0; }
    if (cost > 0 && has(m, "leaking-roof") && x.roof < 3) { x.roof++; cost++; }
    if (cost > 0 && has(m, "pact-of-embers")) cost++;
  }
  b.lives -= cost;
  b.stats.leaked++;
  b.stats.livesLost += cost;
  if (b.bounty?.id === "clean-sweep" && cost > 0) b.bounty.ok = false;
  emit(b, e.x, e.y, { e: "leak", id: e.id, kind: e.kind, lives: cost, left: Math.max(0, b.lives) });
  if (b.lives <= 5 && b.lives + cost > 5) emit(b, e.x, e.y, { e: "lives_low", left: Math.max(0, b.lives) });
  if (e.boss) {
    // R1: the boss re-enters at its gate with its HP and phase, +20% speed per lap
    e.lap++;
    releaseHold(b, e);
    if (e.boss.burrowed) { e.boss.burrowed = false; e.z = 0; if (e.boss2) e.boss2.burrowT = 0; }
    if (e.boss.flying) { e.boss.flying = false; e.air = false; e.z = 0; if (e.boss2) e.boss2.flyT = 0; }
    e.onAir = false;
    e.st = blankStatuses(); e.burns.length = 0; e.brittleT = 0; e.hexerT = 0; e.hexForever = 0;
    placeAt(b, e, 0);
    e.px = e.x; e.py = e.y;
    emit(b, e.x, e.y, { e: "boss_lap", id: e.id, boss: e.boss.id, lap: e.lap });
  } else {
    e.gone = true;
    releaseHold(b, e);
  }
  if (b.lives <= 0) {
    if (has(m, "phoenix-feather") && !x.phoenix && !special) { x.phoenix = true; b.lives = 8; }
    else if (b.phase === "running") lose(b);
  }
}

export function lose(b: Battle) {
  b.lives = Math.min(b.lives, 0);
  b.phase = "lost";
  X(b).endTick = b.tick + 60;
  emit(b, 0, 0, { e: "defeat" });
}

export function releaseHold(b: Battle, e: EnemyX) {
  if (!e.heldBy) return;
  const s = soldiers(b).find((q) => q.id === e.heldBy);
  if (s) { const k = s.held.indexOf(e.id); if (k >= 0) s.held.splice(k, 1); if (s.target === e.id) s.target = 0; }
  e.heldBy = 0;
}

// ---------------------------------------------------------------- role mechanics
function cc(e: EnemyX) { return e.st.frozen > 0 || e.st.stun > 0 || e.st.root > 0 || e.pullT > 0; }

function roleAbilities(b: Battle, e: EnemyX) {
  const act = ACTS[b.act];
  switch (e.kind) {
    case "shaman": {
      if (cc(e)) break;
      if (--e.abilT > 0) break;
      e.abilT = T(4);
      let healed = 0, refused = 0;
      for (const o of enemies(b)) {
        if (!alive(o) || d2(o.x, o.y, e.x, e.y) > 4) continue;
        if (o.st.hexed > 0) { refused++; continue; }
        const amt = Math.min(o.maxHp - o.hp, o.maxHp * (o === e ? 0.04 : 0.08));
        if (amt > 0) { o.hp += amt; healed += amt; }
      }
      emit(b, e.x, e.y, { e: "heal_pulse", id: e.id, r: 2.0, healed, refused });
      break;
    }
    case "shieldbearer": {
      if (cc(e)) break;
      if (--e.abilT > 0) break;
      e.abilT = T(8);
      for (const o of enemies(b)) {
        if (o === e || !alive(o) || o.shield > 0 || o.boss || d2(o.x, o.y, e.x, e.y) > 1.6 * 1.6) continue;
        const amt = Math.min(0.3 * o.maxHp, 150 * act.hpMul) * (o.st.hexed > 0 ? 0.5 : 1);
        o.shield = amt; o.maxShield = amt;
        emit(b, o.x, o.y, { e: "shield_up", id: o.id, lightning: false });
      }
      break;
    }
    case "sapper": {
      if (e.plant === 0 && !e.heldBy && !cc(e)) {
        let best: TowerX | null = null;
        for (const t of towers(b)) {
          const p = b.map.pads[t.pad]!;
          if (d2(p.x, p.y, e.x, e.y) > 4) continue;
          if (!best || t.invested > best.invested) best = t;
        }
        if (best) { e.plant = T(1.2); e.plantTower = best.id; emit(b, e.x, e.y, { e: "sapper_plant", id: e.id, tower: best.id }); }
      } else if (e.plant > 0) {
        if (e.heldBy || cc(e)) { e.plant = -1; break; }
        if (--e.plant === 0) {
          e.plant = -1;
          const t = towers(b).find((q) => q.id === e.plantTower);
          if (t) disableTower(b, t, T(6), "sapper");
        }
      }
      break;
    }
    case "warlock": {
      if (e.channel > 0) {
        if (cc(e)) { e.channel = 0; e.abilT = T(7); break; }
        if (--e.channel === 0) {
          const ids: number[] = [];
          for (let k = 0; k < 3; k++) ids.push(spawnNear(b, "risen", e, (k - 1) * 0.4, { summoned: true }).id);
          emit(b, e.x, e.y, { e: "summon", id: e.id, ids });
          e.abilT = T(7);
        }
      } else if (!cc(e) && --e.abilT <= 0) e.channel = T(1.5);
      break;
    }
    case "matron": {
      if (cc(e)) break;
      if (--e.abilT > 0) break;
      e.abilT = T(4);
      const ids = [spawnNear(b, "swarmling", e, -0.3, { summoned: true }).id, spawnNear(b, "swarmling", e, 0.3, { summoned: true }).id];
      emit(b, e.x, e.y, { e: "summon", id: e.id, ids });
      break;
    }
    case "juggernaut": {
      for (const s of soldiers(b)) {
        if (s.state === "dead" || d2(s.x, s.y, e.x, e.y) > 0.6 * 0.6 || s.knock.includes(e.id)) continue;
        s.knock.push(e.id);
        const dx = s.x - e.x, dy = s.y - e.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
        s.x += (dx / dd) * 1; s.y += (dy / dd) * 1;
        hurtSoldier(b, s, 25 * act.spellMul, false);
      }
      break;
    }
  }
  // Brood affix: 2 footmen at 75%, 50%, 25% HP
  if (e.affixes.includes("brood")) {
    while (e.broodStep < 3 && e.hp <= e.maxHp * (0.75 - 0.25 * e.broodStep)) {
      e.broodStep++;
      const ids = [spawnNear(b, "footman", e, -0.4, { summoned: true }).id, spawnNear(b, "footman", e, -0.8, { summoned: true }).id];
      emit(b, e.x, e.y, { e: "summon", id: e.id, ids });
    }
  }
}

// ---------------------------------------------------------------- soldiers hurt (shared with soldiers.ts)
import { hurtSoldier } from "./soldiers.ts";

// ---------------------------------------------------------------- deaths (tick step 8)
export function processDeaths(b: Battle) {
  const x = X(b), m = x.mods, act = ACTS[b.act];
  const q = x.deathQ;
  for (let qi = 0; qi < q.length; qi++) {
    const e = enemies(b).find((o) => o.id === q[qi]);
    if (!e || e.gone) continue;
    e.gone = true;
    releaseHold(b, e);
    const by = e.killedBy;
    const tw = towers(b).find((t) => t.id === by) ?? null;
    // bounty (R10: summons pay nothing once the last wave has spawned)
    let gold = 0;
    const lastSpawned = b.next >= b.waves.length && !x.spawning;
    if (!e.noGold && !e.boss && !(e.summoned && lastSpawned)) {
      let pct = m.bountyPct;
      if (tw && tw.treasury) pct += 0.25;
      gold = Math.round(e.bountyV * (1 + pct));
      if (e.st.marked > 0) {
        const mk = towers(b).find((t) => t.id === e.markBy);
        if (mk && (mk.spec === "huntersmark" || mk.spec2 === "huntersmark")) { gold += Math.round(2 * act.bountyMul); if (tw?.treasury) synergy(b, "Bounty Hunt", e.x, e.y); }
        if (has(m, "hunters-whistle")) gold += Math.round(3 * act.bountyMul);
      }
      if (has(m, "volatile") && (e.st.burnT > 0)) gold += Math.round(1 * act.bountyMul);
      if (gold > 0) { b.gold += gold; b.stats.goldEarned += gold; }
    }
    b.stats.kills++;
    if (tw) tw.stats.kills++;
    const overkill = Math.max(0, -e.hp);
    emit(b, e.x, e.y, { e: "kill", id: e.id, kind: e.kind, by, bounty: gold, overkill, threat: e.threat, elite: e.elite, boss: !!e.boss });
    if (x.graves.length >= 40) x.graves.shift();
    if (!e.air && !e.boss) x.graves.push({ x: e.x, y: e.y, tick: b.tick });
    if (e.elite) x.elitesKilled++;
    x.waveKills[x.waveOf] = (x.waveKills[x.waveOf] ?? 0) + 1;
    if (e.boss) {
      x.bossDead = true;
      x.spawnQ.length = 0; x.spawning = false;
      for (const o of enemies(b)) if (o !== e && alive(o)) { o.gone = true; o.heldBy = 0; }
      for (const s of soldiers(b)) { s.held.length = 0; s.target = 0; }
      continue;
    }
    // splitting
    if (e.kind === "splitter" || e.kind === "slime") {
      const child: EnemyId = e.kind === "splitter" ? "slime" : "slimelet";
      const ids = [-0.3, 0.3].map((ds) => {
        const c = spawnNear(b, child, e, ds, { summoned: false });
        c.st = { ...e.st, frozen: 0, marked: 0, markPct: 0 };
        c.burns = e.burns.map((z) => ({ ...z }));
        c.burnSrc = e.burnSrc; c.burnAcc = e.burnAcc;
        return c.id;
      });
      emit(b, e.x, e.y, { e: "split", parent: e.id, children: ids });
    }
    if (e.kind === "matron") {
      const ids: number[] = [];
      for (let k = 0; k < 8; k++) ids.push(spawnNear(b, "swarmling", e, (k - 3.5) * 0.15, { summoned: true }).id);
      emit(b, e.x, e.y, { e: "summon", id: e.id, ids });
    }
    // shatter (Shatter spire / Glass Bones): pure burst that can chain
    if (e.brittleT > 0) {
      const fb = towers(b).find((t) => t.id === e.frozenBy) ?? null;
      const endless = hasB(m, "frost", "endless-winter");
      const limit = endless ? Infinity : 4;
      if (e.chain < limit) {
        const pct = e.shatterPct * (endless ? 1 + bv(m, "frost", "endless-winter", 0.10, 0.15) * e.chain : 1);
        const dmg = e.maxHp * pct;
        emit(b, e.x, e.y, { e: "shatter", id: e.id, chain: e.chain, damage: dmg, r: 1.2 });
        synergy(b, "Shatterline", e.x, e.y);
        for (const o of enemies(b)) {
          if (!hittable(o) || o === e || d2(o.x, o.y, e.x, e.y) > 1.44) continue;
          o.chain = e.chain + 1;
          damage(b, o, { amount: dmg, type: "pure", tower: fb, area: true });
          if (alive(o)) { chill(b, o, 30, { tower: fb, freeze: T(1.5) }); o.chain = 0; }
        }
      }
    }
    // Curse Spread: a Hexer's hex passes to the 2 nearest within 1.5
    if (e.hexerT > 0) {
      const near = enemies(b).filter((o) => o !== e && hittable(o) && d2(o.x, o.y, e.x, e.y) <= 2.25)
        .sort((p, r) => d2(p.x, p.y, e.x, e.y) - d2(r.x, r.y, e.x, e.y) || p.id - r.id).slice(0, 2);
      for (const o of near) hex(b, o, T(5), 25, null, true);
    }
    // a marked death passes the mark (Hunter's Mark; Spreading Mark)
    if (e.st.marked > 0 && e.markBy) {
      const mk = towers(b).find((t) => t.id === e.markBy);
      if (mk) {
        const hm = mk.spec === "huntersmark" || mk.spec2 === "huntersmark";
        const sp = hasB(m, "beacon", "spreading-mark");
        if (hm || sp) {
          const r = mk.rangeMul * (statRange(mk));
          const reach = sp ? Math.max(r, 0) : r;
          const n = sp && hm ? 2 : 1;
          const near = enemies(b).filter((o) => o !== e && hittable(o) && o.st.marked <= 0 && (d2(o.x, o.y, mk.x, mk.y) <= reach * reach || (bv(m, "beacon", "spreading-mark", 0, 1) && d2(o.x, o.y, e.x, e.y) <= 9)))
            .sort((p, r2) => d2(p.x, p.y, e.x, e.y) - d2(r2.x, r2.y, e.x, e.y) || p.id - r2.id).slice(0, n);
          for (const o of near) mark(b, o, e.st.marked, e.st.markPct, mk);
        }
      }
    }
    // Cinder Rain: dying while burning throws embers
    if (e.st.burnT > 0 && hasB(m, "pyre", "cinder-rain")) {
      const n = bv(m, "pyre", "cinder-rain", 3, 5);
      const src = towers(b).find((t) => t.id === e.burnSrc) ?? null;
      for (let k = 0; k < n; k++) {
        const a = roll(b) * 2 - 1, c = roll(b) * 2 - 1, ex = e.x + a * 2, ey = e.y + c * 2;
        for (const o of enemies(b)) if (hittable(o) && !o.air && d2(o.x, o.y, ex, ey) <= 0.25) damage(b, o, { amount: 15 * act.spellMul, type: "fire", tower: src, area: true });
        for (const z of zones(b)) if (z.oil && !z.lit && z.lightAt < 0 && d2(z.x, z.y, ex, ey) <= z.r * z.r) z.lightAt = b.tick + 1;
      }
    }
    // Vengeful: disables the nearest tower 4 s
    if (e.affixes.includes("vengeful")) {
      let best: TowerX | null = null, bd = Infinity;
      for (const t of towers(b)) { const dd = d2(t.x, t.y, e.x, e.y); if (dd < bd) { bd = dd; best = t; } }
      if (best) disableTower(b, best, T(4), "vengeful");
    }
  }
  q.length = 0;
}

function statRange(t: TowerX): number {
  // late import to avoid a cycle with towers.ts
  return rangeBase(t);
}
import { rangeBase } from "./towers.ts";
export { dist };
