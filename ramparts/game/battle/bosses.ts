// Boss fights (systems 9.8-9.9, content 5, R1/R7/R15/R21; Boss Fury for ascension 6).
// Every ability telegraphs (>= 1.5 s, not interruptible), then lands.
import type { Battle, BossId } from "../types.ts";
import { BOSSES, BOSS_NUM as N } from "../content/battle/bosses.ts";
import { ENEMIES } from "../content/battle/enemies.ts";
import { laneAt, laneNearest } from "../map.ts";
import {
  T, X, alive, d2, emit, enemies, placeAt, soldiers, towers, type EnemyX,
} from "./internal.ts";
import { blankStatuses, releaseHold, spawnEnemy, spawnNear } from "./enemies.ts";
import { disableTower } from "./damage.ts";
import { hurtSoldier, kill as killSoldier } from "./soldiers.ts";

const COS30 = 0.8660254037844387;
/** Fury (content 5.8): from ascension 10 the champion and the Tyrant carry their third mechanic. */
const fury = (b: Battle, e?: EnemyX) => X(b).mods.asc >= 10 && (X(b).champion || e?.kind === "tyrant");

export function initBoss(b: Battle, e: EnemyX) {
  const id = e.kind as BossId;
  const def = BOSSES[id];
  e.boss = { id, phase: 1, burrowed: false, flying: false, invuln: 0, iceShield: 0 };
  const timers: Record<string, number> = {};
  for (const a of def.abilities) if (a.phases.includes(1)) timers[a.id] = T(a.first);
  if (id === "wyrm" && fury(b, e)) timers.sandstorm = T(12);
  e.boss2 = { timers, thresholds: def.thresholds, burrowT: 0, flyT: 0, flyS: 0, chargeLeft: 0, boneWardT: 0, iceRegrow: -1, iceMax: 0, furyWing: false, stormT: 0, speedMul: 1, door: false };
  e.leakV = 10;
}

/** Bosses stand still while some telegraphs wind up. */
export function bossStops(e: EnemyX): boolean {
  const tl = e.boss?.tele;
  return !!tl && ["muster", "stomp", "breath", "breath3", "burrow", "burrow2", "brood", "brood3", "raise", "raise2", "raise3", "leap", "leap3", "embers", "bury", "bury3", "deathsdoor", "boneward"].includes(tl.ability);
}

/** Phase thresholds: 1 s invulnerable roar, damage that tick discarded (systems 9.8). */
export function bossPhaseCheck(b: Battle, e: EnemyX) {
  const bs = e.boss!, bx = e.boss2!;
  if (e.hp <= 0 && bs.id === "lich" && fury(b, e) && !bx.door) {
    // Death's Door: falls, then rises after a 2 s telegraph with 20% HP and its Bone Ward
    bx.door = true; e.hp = 1; bs.invuln = T(2); releaseHold(b, e);
    startTele(b, e, "deathsdoor", 1.0, T(2));
    return;
  }
  const th = bx.thresholds[bs.phase - 1];
  if (th === undefined || e.hp > th * e.maxHp || e.hp <= 0) {
    if (bs.id === "tyrant" && fury(b, e) && !bx.furyWing && e.hp > 0 && e.hp <= N.furyWingAt * e.maxHp && !bs.flying) { bx.furyWing = true; takeWing(b, e, T(N.furyWingS)); }
    return;
  }
  e.hp = th * e.maxHp;
  bs.phase++;
  bs.invuln = T(1);
  bs.tele = undefined;
  emit(b, e.x, e.y, { e: "boss_phase", id: e.id, boss: bs.id, phase: bs.phase });
  const def = BOSSES[bs.id];
  for (const a of def.abilities) if (a.phases.includes(bs.phase) && !a.phases.includes(bs.phase - 1)) bx.timers[a.id] = T(a.first);
  switch (bs.id) {
    case "colossus":
      if (bs.phase === 2) startTele(b, e, "icearmour", 0, T(2));
      if (bs.phase === 3) bx.speedMul = N.colossusP3Speed / ENEMIES.colossus.speed;
      break;
    case "tyrant":
      if (bs.phase === 2) bx.timers.wing = 0;
      if (bs.phase === 3) { e.armour = 0; e.ward = 0; bx.speedMul = N.tyrantP3Speed / ENEMIES.tyrant.speed; if (bs.flying) land(b, e); }
      break;
    case "packlord":
      if (bs.phase === 3) bx.speedMul = N.packP3Speed / ENEMIES.packlord.speed;
      break;
    case "hivequeen":
      if (bs.phase === 3) bx.speedMul = N.queenP3Speed / ENEMIES.hivequeen.speed;
      break;
    case "lich":
      if (bs.phase === 2) startTele(b, e, "boneward", 0, T(2));
      if (bs.phase === 3) { e.ward = N.lichWard3; e.baseWard = N.lichWard3; e.shield = 0; bx.iceRegrow = -1; }
      break;
  }
}

function startTele(b: Battle, e: EnemyX, ability: string, r: number, ticks: number, at?: { x: number; y: number }, dir?: { x: number; y: number }) {
  const bs = e.boss!;
  bs.tele = { ability, x: at?.x ?? e.x, y: at?.y ?? e.y, r, ticks, total: ticks, dx: dir?.x, dy: dir?.y };
  emit(b, bs.tele.x, bs.tele.y, { e: "boss_telegraph", id: e.id, boss: bs.id, ability, r, ticks });
}

/** A point `ahead` u further along the boss's road. */
function ahead(b: Battle, e: EnemyX, ahead: number): { x: number; y: number; s: number } {
  const l = b.map.lanes[e.groundLane]!;
  const s = Math.min(l.length, e.s + ahead);
  const v = { x: 0, y: 0 };
  laneAt(l, s, v);
  return { ...v, s };
}

export function updateBoss(b: Battle, e: EnemyX) {
  const bs = e.boss!, bx = e.boss2!;
  if (bs.invuln > 0) bs.invuln--;
  // ongoing states
  if (bs.burrowed) {
    if (--bx.burrowT === T(N.surfaceWarn)) {
      const p = ahead(b, e, N.burrowSpeed * N.surfaceWarn);
      startTele(b, e, "erupt", N.eruptR, T(N.surfaceWarn), p);
    }
    if (bx.burrowT <= 0) surface(b, e);
    return;
  }
  if (bs.flying) {
    bx.flyT--;
    if (bx.flyT === T(2)) startTele(b, e, "land", 1.5, T(2), ahead(b, e, (N.wingLand / N.wingS) * 2));
    if (bx.flyT <= 0) land(b, e);
    return;
  }
  if (bx.chargeLeft > 0) {
    bx.chargeLeft -= N.chargeSpeed / 30;
    for (const s of soldiers(b)) if (s.state !== "dead" && d2(s.x, s.y, e.x, e.y) <= 0.6 && !s.knock.includes(e.id)) {
      s.knock.push(e.id);
      const dx = s.x - e.x, dy = s.y - e.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
      s.x += dx / dd; s.y += dy / dd;
      hurtSoldier(b, s, N.chargeDmg, false, false);
    }
  }
  if (bx.iceRegrow > 0 && bs.iceShield <= 0 && !bs.tele && --bx.iceRegrow === 0) startTele(b, e, "icearmour", 0, T(2));
  if (bs.id === "lich" && bs.phase === 2) {
    if (e.shield <= 0 && bx.boneWardT === 0 && !bs.tele && bx.iceMax > 0) bx.boneWardT = T(N.boneRegrow);
    if (bx.boneWardT > 0 && --bx.boneWardT === 0 && !bs.tele) startTele(b, e, "boneward", 0, T(2));
  }
  if (bs.tele) {
    if (["warcry", "howl", "howl3", "brood", "brood3", "raise", "raise2", "raise3"].includes(bs.tele.ability)) { bs.tele.x = e.x; bs.tele.y = e.y; }
    if (--bs.tele.ticks <= 0) { const tl = bs.tele; bs.tele = undefined; resolve(b, e, tl.ability, tl); }
    return;
  }
  const def = BOSSES[bs.id];
  for (const a of def.abilities) {
    if (!a.phases.includes(bs.phase) || !(a.id in bx.timers) || a.every <= 0) continue;
    if (bx.timers[a.id]! > 0) { bx.timers[a.id]!--; continue; }
    if (bs.tele) continue;
    if (begin(b, e, a.id, a.r, T(a.tele))) bx.timers[a.id] = T(a.every);
  }
  if (bs.id === "wyrm" && fury(b, e) && bs.phase === 1) {
    if (bx.timers.sandstorm! > 0) bx.timers.sandstorm!--;
    else if (!bs.tele && begin(b, e, "sandstorm", 0, T(2))) bx.timers.sandstorm = T(20);
  }
}

/** Start an ability's telegraph; false = nothing to do now (try again next tick). */
function begin(b: Battle, e: EnemyX, id: string, r: number, tele: number): boolean {
  switch (id) {
    case "charge": { const p = ahead(b, e, N.chargeDist); startTele(b, e, id, r, tele, p, { x: p.x - e.x, y: p.y - e.y }); return true; }
    case "breath": case "breath3": {
      const dir = breathDir(b, e);
      if (!dir) return false;
      startTele(b, e, id, 3, tele, e, dir); return true;
    }
    case "bury": case "bury3": { const p = ahead(b, e, N.mounds[1]!); startTele(b, e, id, r, tele, p); return true; }
    case "leap": case "leap3": { const p = ahead(b, e, fury(b, e) ? N.furyLeap : N.leapDist); startTele(b, e, id, r, tele, p); return true; }
    case "wing": takeWing(b, e, T(N.wingS)); return true;
    default: startTele(b, e, id, r, tele); return true;
  }
}

/** Direction to the densest group of towers within 3 u (+1.5 margin). */
function breathDir(b: Battle, e: EnemyX): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null, bn = 0;
  const ts = towers(b).filter((t) => d2(t.x, t.y, e.x, e.y) <= 3.4 * 3.4);
  for (const t of ts) {
    const dx = t.x - e.x, dy = t.y - e.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / dd, uy = dy / dd;
    const n = ts.filter((o) => { const ox = o.x - e.x, oy = o.y - e.y, od = Math.sqrt(ox * ox + oy * oy) || 1; return (ox * ux + oy * uy) / od >= COS30; }).length;
    if (n > bn) { bn = n; best = { x: ux, y: uy }; }
  }
  return best;
}

type Tele = NonNullable<NonNullable<EnemyX["boss"]>["tele"]>;

function resolve(b: Battle, e: EnemyX, id: string, tl: Tele) {
  const bs = e.boss!, bx = e.boss2!;
  const hitT: number[] = [], hitS: number[] = [];
  const done = () => emit(b, tl.x, tl.y, { e: "boss_ability", id: e.id, boss: bs.id, ability: id, r: tl.r, towers: hitT, soldiers: hitS });
  switch (id) {
    case "warcry":
      for (const o of enemies(b)) if (alive(o) && o !== e && d2(o.x, o.y, e.x, e.y) <= tl.r * tl.r) { o.st.warcry = T(N.warcryS); o.st.slow = 0; o.st.slowT = 0; o.st.chill = 0; }
      return done();
    case "muster": {
      for (let k = 0; k < N.musterFootmen; k++) spawnNear(b, "footman", e, -0.3 * k, { summoned: true });
      for (let k = 0; k < N.musterRunners; k++) spawnNear(b, "runner", e, -0.4 - 0.3 * k, { summoned: true });
      if (fury(b, e)) { spawnNear(b, "shieldbearer", e, -0.5, { summoned: true }); spawnNear(b, "shieldbearer", e, -0.9, { summoned: true }); e.shield = e.maxShield = N.furyShield; }
      return done();
    }
    case "charge": releaseHold(b, e); bx.chargeLeft = N.chargeDist; for (const s of soldiers(b)) s.knock.length = 0; return done();
    case "burrow": case "burrow2":
      releaseHold(b, e);
      bs.burrowed = true; e.z = -1;
      e.st = blankStatuses(); e.burns.length = 0; e.brittleT = 0; e.hexerT = 0; e.hexForever = 0; e.shield = 0;
      bx.burrowT = T(N.burrowS);
      return done();
    case "erupt": return; // landed by surface()
    case "sandstorm": {
      X(b).stormT = T(N.sandstormS);
      if (fury(b, e)) {
        let best = null as null | ReturnType<typeof towers>[number];
        for (const t of towers(b)) if (d2(t.x, t.y, e.x, e.y) <= 36 && (!best || t.invested > best.invested)) best = t;
        if (best) { disableTower(b, best, T(N.sandstormS), "buried"); hitT.push(best.id); }
      }
      return done();
    }
    case "stomp": {
      for (const t of towers(b)) if (d2(t.x, t.y, e.x, e.y) <= tl.r * tl.r) { disableTower(b, t, T(N.stompDisable), "stomp"); hitT.push(t.id); }
      for (const s of soldiers(b)) if (s.state !== "dead" && d2(s.x, s.y, e.x, e.y) <= tl.r * tl.r) { s.frozen = T(N.stompFreeze); hurtSoldier(b, s, N.stompDmg, false, false); hitS.push(s.id); }
      const shards = bs.phase >= 3 ? N.shards : fury(b, e) ? N.furyShards : 0;
      for (let k = 0; k < shards; k++) spawnNear(b, "shard", e, -0.4 * (k + 1), { summoned: true });
      return done();
    }
    case "icearmour": bs.iceShield = N.iceArmour; bx.iceMax = N.iceArmour; bx.iceRegrow = 0; emit(b, e.x, e.y, { e: "shield_up", id: e.id, lightning: false }); return done();
    case "breath": case "breath3": {
      const dx = tl.dx ?? 1, dy = tl.dy ?? 0;
      const inCone = (x: number, y: number) => { const ox = x - e.x, oy = y - e.y, od = Math.sqrt(ox * ox + oy * oy); return od <= 3 && (od < 0.3 || (ox * dx + oy * dy) / od >= COS30); };
      for (const t of towers(b)) if (inCone(t.x, t.y)) { disableTower(b, t, T(N.breathDisable), "breath"); hitT.push(t.id); }
      for (const s of soldiers(b)) if (s.state !== "dead" && inCone(s.x, s.y)) { killSoldier(b, s); hitS.push(s.id); }
      return done();
    }
    case "embers": for (let k = 0; k < N.emberRunners; k++) spawnNear(b, "ember-runner", e, 0.3 * k, { summoned: true }); return done();
    case "land": return;
    case "brood": case "brood3": {
      for (let k = 0; k < N.broodSwarm; k++) spawnNear(b, "swarmling", e, -0.2 * k, { summoned: true });
      const bats = (id === "brood3" ? N.brood3Bats : N.broodBats) + (fury(b, e) ? N.furyBats : 0);
      for (let k = 0; k < bats; k++) spawnNear(b, "bat", e, -0.3 * k, { summoned: true });
      return done();
    }
    case "bury": case "bury3": {
      const at = fury(b, e) ? [...N.mounds, N.furyMound] : N.mounds;
      const l = b.map.lanes[e.groundLane]!;
      for (const d of at) for (let k = 0; k < N.broodlings; k++) {
        const s0 = Math.min(l.length - 1, e.s + d + (k - 1) * 0.25);
        spawnEnemy(b, "brood", e.groundLane, { summoned: true, s: s0, wave: -1 });
      }
      return done();
    }
    case "raise": case "raise2": case "raise3": {
      const x = X(b);
      const max = id === "raise3" ? N.raiseMax3 : N.raiseMax;
      const l = b.map.lanes[e.groundLane]!;
      const fresh = x.graves.filter((g) => b.tick - g.tick <= T(N.raiseWindow) && d2(g.x, g.y, e.x, e.y) <= tl.r * tl.r)
        .sort((p, q) => q.tick - p.tick).slice(0, max);
      const ids: number[] = [];
      for (const g of fresh) {
        x.graves.splice(x.graves.indexOf(g), 1);
        const near = laneNearest(l, g.x, g.y);
        const sk = spawnEnemy(b, "risen", e.groundLane, { summoned: true, s: Math.min(near.s, l.length - 0.5), wave: -1 });
        if (bs.phase >= 3) sk.hasted += N.risenHaste3;
        ids.push(sk.id);
      }
      emit(b, e.x, e.y, { e: "summon", id: e.id, ids });
      return done();
    }
    case "boneward": e.shield = e.maxShield = N.boneWard; bx.iceMax = N.boneWard; bx.boneWardT = 0; emit(b, e.x, e.y, { e: "shield_up", id: e.id, lightning: false }); return done();
    case "deathsdoor": e.hp = e.maxHp * N.deathsDoor; e.shield = e.maxShield = N.boneWard; emit(b, e.x, e.y, { e: "boss_phase", id: e.id, boss: bs.id, phase: bs.phase }); return done();
    case "howl": case "howl3": {
      const n = id === "howl3" ? N.howlPups3 : N.howlPups;
      for (let k = 0; k < n; k++) spawnNear(b, "pup", e, -0.3 * k, { summoned: true });
      if (fury(b, e)) for (let k = 0; k < N.furyShades; k++) spawnNear(b, "shade", e, -0.5 * (k + 1), { summoned: true });
      for (const o of enemies(b)) if (alive(o) && o !== e && d2(o.x, o.y, e.x, e.y) <= tl.r * tl.r) { o.howl = T(N.howlS); o.st.slow = 0; o.st.slowT = 0; o.st.chill = 0; }
      return done();
    }
    case "leap": case "leap3": {
      releaseHold(b, e);
      const l = b.map.lanes[e.groundLane]!;
      const dist = fury(b, e) ? N.furyLeap : N.leapDist;
      const to = l.length - e.s <= dist ? l.length : e.s + dist;
      placeAt(b, e, to);
      for (const s of soldiers(b)) if (s.state !== "dead" && d2(s.x, s.y, e.x, e.y) <= tl.r * tl.r) {
        const dx = s.x - e.x, dy = s.y - e.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
        s.x += dx / dd; s.y += dy / dd;
        hurtSoldier(b, s, N.leapDmg, false, false); hitS.push(s.id);
      }
      return done();
    }
  }
}

function surface(b: Battle, e: EnemyX) {
  const bs = e.boss!;
  bs.burrowed = false; e.z = 0;
  const hitT: number[] = [], hitS: number[] = [];
  for (const t of towers(b)) if (d2(t.x, t.y, e.x, e.y) <= N.eruptR * N.eruptR) { disableTower(b, t, T(N.eruptDisable), "erupt"); hitT.push(t.id); }
  for (const s of soldiers(b)) if (s.state !== "dead" && d2(s.x, s.y, e.x, e.y) <= N.eruptR * N.eruptR) {
    const dx = s.x - e.x, dy = s.y - e.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
    s.x += dx / dd; s.y += dy / dd;
    hurtSoldier(b, s, N.eruptDmg, false, false); hitS.push(s.id);
  }
  if (bs.phase >= 2) for (let k = 0; k < N.sandlings; k++) spawnNear(b, "sandling", e, -0.3 * (k + 1), { summoned: true });
  emit(b, e.x, e.y, { e: "boss_ability", id: e.id, boss: bs.id, ability: "erupt", r: N.eruptR, towers: hitT, soldiers: hitS });
}

/** Tyrant takes wing (R7: it lands at most 6 u past its take-off point). */
function takeWing(b: Battle, e: EnemyX, ticks: number) {
  const bs = e.boss!, bx = e.boss2!;
  releaseHold(b, e);
  bs.flying = true; e.air = true; e.z = 3;
  bx.flyT = ticks; bx.flyS = e.s;
  for (let k = 0; k < N.wingDrakes; k++) spawnNear(b, "ember-drake", e, 0.5 * k, { summoned: true });
  emit(b, e.x, e.y, { e: "boss_ability", id: e.id, boss: bs.id, ability: "wing", r: 0, towers: [], soldiers: [] });
}

function land(b: Battle, e: EnemyX) {
  const bs = e.boss!, bx = e.boss2!;
  bs.flying = false; e.air = false; e.z = 0;
  const l = b.map.lanes[e.groundLane]!;
  placeAt(b, e, Math.min(e.s, bx.flyS + N.wingLand, l.length));
  bx.flyT = 0;
  emit(b, e.x, e.y, { e: "boss_ability", id: e.id, boss: bs.id, ability: "land", r: 1.5, towers: [], soldiers: [] });
}
