// Blocking (systems 7): soldiers, holding, enemy melee, respawn, rally.
import type { Battle, SoldierKind, Vec } from "../types.ts";
import { ACTS } from "../content/battle/acts.ts";
import { ENEMIES } from "../content/battle/enemies.ts";
import { statsOf, type SoldierStats } from "../content/battle/towers.ts";
import { laneAt, laneNearest } from "../map.ts";
import { bv, has, hasB } from "./mods.ts";
import {
  DT, T, X, alive, d2, emit, enemies, nid, roll, soldiers, towers,
  type EnemyX, type SoldierX, type TowerX, type ZoneX,
} from "./internal.ts";
import { damage, shred } from "./damage.ts";

const SLOTS: Vec[] = [{ x: 0, y: -0.35 }, { x: -0.35, y: 0.25 }, { x: 0.35, y: 0.25 }, { x: 0, y: 0.6 }];

/** Default rally: the nearest road point to the pad (systems 7.1). */
export function defaultRally(b: Battle, t: TowerX): Vec {
  let best = { s: 0, d: Infinity }, lane = 0;
  b.map.lanes.forEach((l, i) => { const n = laneNearest(l, t.x, t.y); if (n.d < best.d) { best = n; lane = i; } });
  const v = { x: 0, y: 0 };
  laneAt(b.map.lanes[lane]!, best.s, v);
  return v;
}

/** Rally reach from the pad (Long Reach, Rangefinder on Barracks). */
export function rallyRange(b: Battle, t: TowerX): number {
  const m = X(b).mods;
  if (t.kind === "thornwood") return 2.2;
  return 2.6 + bv(m, "barracks", "long-reach", 1.0, 1.5) + 2.6 * bv(m, "barracks", "rangefinder", 0.1, 0.15);
}

/** Snap a point to the road; null when it is too far from the road. */
export function snapToRoad(b: Battle, x: number, y: number): Vec | null {
  let best = { s: 0, d: Infinity }, lane = 0;
  b.map.lanes.forEach((l, i) => { const n = laneNearest(l, x, y); if (n.d < best.d) { best = n; lane = i; } });
  if (best.d > 1.2) return null;
  const v = { x: 0, y: 0 };
  laneAt(b.map.lanes[lane]!, best.s, v);
  return v;
}

function soldierStats(_b: Battle, t: TowerX): SoldierStats {
  return statsOf(t.kind, t.level, t.spec).soldiers!;
}

/** Make a tower's soldiers match its level/spec (build, upgrade, specialise). Upgrades heal. */
export function syncSoldiers(b: Battle, t: TowerX) {
  const m = X(b).mods;
  const base = soldierStats(b, t);
  if (!base) return;
  const kind: SoldierKind = t.kind === "thornwood" ? "treant" : t.spec === "paladins" ? "paladin" : t.spec === "blademasters" ? "blademaster" : "soldier";
  let count = base.count;
  if (t.kind === "barracks" && hasB(m, "barracks", "fourth-soldier")) count = 4;
  if (!t.rally) t.rally = defaultRally(b, t);
  const mine = soldiers(b).filter((s) => s.tower === t.id);
  for (let i = 0; i < count; i++) {
    let s = mine[i];
    const sergeant = i === 3 && bv(m, "barracks", "fourth-soldier", 0, 1) > 0;
    const hpMul = (t.kind === "barracks" ? 1 + bv(m, "barracks", "drilled", 0.25, 0.40) : 1) * (sergeant ? 1.5 : 1);
    const hp = base.hp * hpMul;
    if (!s) {
      s = {
        id: nid(b), tower: t.id, kind, x: t.x, y: t.y, px: t.x, py: t.y, hp, maxHp: hp, state: "moving", target: 0,
        respawn: 0, ttl: -1, slot: i, armour: 0, ward: 0, dmg: 0, int: 30, cd: 0, holds: 1, held: [], idle: 0,
        lay: false, bond: false, safe: 0, crit: 0, dodge: 0, whirl: T(4), slam: 0, regen: 0.1, rx: 0, ry: 0, speed: 2.2,
        frozen: 0, knock: [], homeX: t.x, homeY: t.y, bondHeal: false, er: 1.4,
      };
      b.soldiers.push(s);
      t.soldierIds.push(s.id);
    }
    s.kind = kind;
    s.armour = base.armour; s.ward = base.ward;
    s.dmg = base.dmg * (sergeant ? 1.5 : 1); s.int = T(base.int);
    s.holds = base.holds; s.crit = base.crit ?? 0; s.dodge = t.spec === "blademasters" ? 30 : 0;
    s.regen = base.regen;
    s.maxHp = hp;
    if (s.state !== "dead") s.hp = hp;
    s.er = kind === "treant" ? 1.4 : 1.4 + bv(m, "barracks", "long-reach", 0.4, 0.6);
    setSlot(s, t.rally!);
  }
  // fewer soldiers than before (never happens on upgrades; kept for safety)
  for (let i = count; i < mine.length; i++) removeSoldier(b, mine[i]!);
}

function setSlot(s: SoldierX, r: Vec) {
  const o = SLOTS[s.slot % SLOTS.length]!;
  const k = s.kind === "treant" ? 0 : 1;
  s.rx = r.x + o.x * k; s.ry = r.y + o.y * k;
}

export function setRally(b: Battle, t: TowerX, r: Vec) {
  t.rally = { x: r.x, y: r.y };
  for (const s of soldiers(b)) if (s.tower === t.id) { setSlot(s, r); releaseAll(b, s); }
}

export function removeSoldier(b: Battle, s: SoldierX) {
  releaseAll(b, s);
  const i = b.soldiers.indexOf(s);
  if (i >= 0) b.soldiers.splice(i, 1);
  for (const t of towers(b)) { const k = t.soldierIds.indexOf(s.id); if (k >= 0) t.soldierIds.splice(k, 1); }
}

function releaseAll(b: Battle, s: SoldierX) {
  for (const id of s.held) { const e = enemies(b).find((q) => q.id === id); if (e && e.heldBy === s.id) e.heldBy = 0; }
  s.held.length = 0;
  s.target = 0;
}

/** Spell soldiers (Reinforcements). */
export function dropReinforcements(b: Battle, at: Vec, n: number, hp: number, armour: number, dmg: number, ttl: number) {
  for (let i = 0; i < n; i++) {
    const s: SoldierX = {
      id: nid(b), tower: 0, kind: "reinforcement", x: at.x + (i - 0.5) * 0.5, y: at.y, px: at.x, py: at.y, hp, maxHp: hp,
      state: "idle", target: 0, respawn: 0, ttl, slot: i, armour, ward: 0, dmg, int: 30, cd: 0, holds: 1, held: [], idle: 0,
      lay: false, bond: false, safe: 0, crit: 0, dodge: 0, whirl: 0, slam: 0, regen: 0.1, rx: at.x + (i - 0.5) * 0.5, ry: at.y,
      speed: 2.2, frozen: 0, knock: [], homeX: at.x, homeY: at.y, bondHeal: false, er: 1.4,
    };
    b.soldiers.push(s);
    emit(b, s.x, s.y, { e: "soldier_respawn", soldier: s.id });
  }
}

/** Can this enemy be held right now (systems 7.2)? */
export function blockable(e: EnemyX): boolean {
  if (!alive(e) || e.air) return false;
  if (e.stealth && e.st.revealed <= 0) return false;
  const def = ENEMIES[e.kind];
  if (!def.blockable && !(def.flying && e.st.grounded > 0)) return false;
  if (e.boss && (e.boss.burrowed || e.boss.flying || (e.boss2 && e.boss2.chargeLeft > 0))) return false;
  return true;
}

/** Soldier takes a hit. Returns HP lost. */
export function hurtSoldier(b: Battle, s: SoldierX, raw: number, magic: boolean, melee = true): number {
  if (s.state === "dead" || s.safe > 0) return 0;
  if (melee && s.dodge > 0 && roll(b) * 100 < s.dodge) return 0;
  const red = magic ? s.ward : s.armour;
  const dmg = raw * (1 - Math.min(80, red) / 100);
  s.hp -= dmg;
  s.idle = 0;
  if (s.hp <= 0) {
    const m = X(b).mods;
    if (!s.bond && s.tower && hasB(m, "thornwood", "heartwood-bond") && towers(b).some((t) => t.kind === "thornwood" && d2(t.x, t.y, s.x, s.y) <= sq(auraR(b, t)))) {
      s.bond = true; s.hp = 1; s.safe = bv(m, "thornwood", "heartwood-bond", T(3), T(5)); s.bondHeal = bv(m, "thornwood", "heartwood-bond", 0, 1) > 0;
      return dmg;
    }
    kill(b, s);
  } else if (s.kind === "paladin" && !s.lay && s.hp < 0.3 * s.maxHp) { s.lay = true; s.hp = s.maxHp; }
  return dmg;
}

const sq = (v: number) => v * v;
function auraR(_b: Battle, t: TowerX): number {
  const st = statsOf(t.kind, t.level, t.spec);
  return st.range * t.rangeMul;
}

export function kill(b: Battle, s: SoldierX) {
  const m = X(b).mods;
  releaseAll(b, s);
  s.hp = 0;
  emit(b, s.x, s.y, { e: "soldier_down", soldier: s.id });
  if (has(m, "old-oak-seed")) {
    const z: ZoneX = { id: nid(b), kind: "bramble", x: s.x, y: s.y, r: 0.6, ticks: T(60), total: T(60), from: 0, oil: false, lit: false, lightAt: -1, slow: 0, dps: 0, acid: false, explosive: false, patchDps: 0, ls: [], charges: 0, dmg: 0, stop: 0, tarBoss: 0, roots: true };
    b.zones.push(z);
  }
  if (s.tower === 0) { s.state = "dead"; s.ttl = 0; return; }
  const t = towers(b).find((q) => q.id === s.tower);
  const base = t ? statsOf(t.kind, t.level, t.spec).soldiers! : null;
  let resp = T(base ? base.respawn : 10);
  if (t?.kind === "barracks") resp *= 1 - bv(m, "barracks", "quick-muster", 0.30, 0.45);
  if (has(m, "marching-drum")) resp *= 0.75;
  s.respawn = Math.round(resp);
  s.state = "dead";
  s.lay = false; s.bond = false;
}

// ---------------------------------------------------------------- per tick
export function updateSoldiers(b: Battle) {
  const m = X(b).mods, act = ACTS[b.act];
  const ss = soldiers(b);
  const es = enemies(b);
  for (let i = ss.length - 1; i >= 0; i--) {
    const s = ss[i]!;
    s.px = s.x; s.py = s.y;
    if (s.ttl > 0 && --s.ttl === 0) { removeSoldier(b, s); continue; }
    if (s.state === "dead") {
      if (s.tower === 0) { removeSoldier(b, s); continue; }
      if (--s.respawn <= 0) {
        const t = towers(b).find((q) => q.id === s.tower);
        if (!t) { removeSoldier(b, s); continue; }
        s.state = "moving"; s.hp = s.maxHp; s.x = t.x; s.y = t.y; s.px = s.x; s.py = s.y; s.idle = 0; s.knock.length = 0;
        emit(b, s.x, s.y, { e: "soldier_respawn", soldier: s.id });
      }
      continue;
    }
    if (s.safe > 0 && --s.safe === 0 && s.bondHeal) { s.bondHeal = false; s.hp = Math.min(s.maxHp, s.hp + 0.3 * s.maxHp); }
    if (s.frozen > 0) { s.frozen--; continue; }
    if (s.knock.length && b.tick % 30 === 0) s.knock.length = 0;
    const t = s.tower ? towers(b).find((q) => q.id === s.tower) : undefined;
    if (t && (t.disabled > 0 || t.building > 0) && false) continue;
    const rx = s.rx, ry = s.ry;
    const er = s.er;
    // capacity: Paladins hold 2 only above half health (R12)
    const cap = s.kind === "paladin" ? (s.hp > 0.5 * s.maxHp ? 2 : 1) : s.holds;
    // drop holds that are no longer valid
    for (let k = s.held.length - 1; k >= 0; k--) {
      const e = es.find((q) => q.id === s.held[k]);
      if (!e || !blockable(e) || e.heldBy !== s.id || d2(e.x, e.y, rx, ry) > sq(er + 1.2) || k >= cap) {
        if (e && e.heldBy === s.id) e.heldBy = 0;
        s.held.splice(k, 1);
      }
    }
    let tg = s.target ? es.find((q) => q.id === s.target) : undefined;
    if (tg && (!blockable(tg) || d2(tg.x, tg.y, rx, ry) > sq(er + 1.2))) { tg = undefined; s.target = 0; }
    if (tg && tg.heldBy && tg.heldBy !== s.id && s.held.length < cap) {
      // someone else got it first: look for a free one
      const free = pickFree(es, rx, ry, er, s);
      if (free) { tg = free; s.target = free.id; }
    }
    if (!tg && s.held.length) { tg = es.find((q) => q.id === s.held[0]); s.target = tg?.id ?? 0; }
    if (!tg) {
      const free = s.held.length < cap ? pickFree(es, rx, ry, er, s) : null;
      if (free) { tg = free; s.target = free.id; }
      else {
        // gang up on the held enemy with the lowest HP
        let best: EnemyX | null = null;
        for (const e of es) if (blockable(e) && e.heldBy && d2(e.x, e.y, rx, ry) <= er * er && (!best || e.hp < best.hp)) best = e;
        if (best) { tg = best; s.target = best.id; }
      }
    }
    // move
    const sp = (has(m, "marching-drum") && !tg ? 2 : 1) * s.speed * DT;
    const gx = tg ? tg.x : rx, gy = tg ? tg.y : ry;
    const dd = Math.sqrt(d2(s.x, s.y, gx, gy));
    const stop = tg ? 0.4 : 0.02;
    if (dd > stop) { const k = Math.min(1, sp / dd); s.x += (gx - s.x) * k; s.y += (gy - s.y) * k; s.state = "moving"; }
    else s.state = tg ? "fighting" : "idle";
    if (tg) {
      const near = Math.sqrt(d2(s.x, s.y, tg.x, tg.y));
      if (near <= 0.45 && !tg.heldBy && s.held.length < cap) hold(b, s, tg);
      // a holder with room picks up a second enemy right beside it
      if (s.held.length && s.held.length < cap) for (const e of es) {
        if (s.held.length >= cap) break;
        if (!e.heldBy && blockable(e) && d2(e.x, e.y, s.x, s.y) <= 0.36) hold(b, s, e);
      }
      s.idle = 0;
      if (s.cd > 0) s.cd--;
      if (near <= 0.6 && s.cd <= 0) strike(b, s, t ?? null, tg);
    } else {
      s.idle++;
      if (s.cd > 0) s.cd--;
    }
    // Blademasters' whirl
    if (s.kind === "blademaster" && --s.whirl <= 0) {
      s.whirl = T(4);
      let any = false;
      for (const e of es) if (alive(e) && !e.air && d2(e.x, e.y, s.x, s.y) <= 0.81) { any = true; damage(b, e, { amount: 30, type: "phys", tower: t ?? null, area: true }); shred(e, 1); }
      if (any) emit(b, s.x, s.y, { e: "aura_pulse", tower: s.tower, r: 0.9 });
    }
    // regen out of combat
    const wait = has(m, "deep-roots") ? T(0.5) : T(2);
    if (s.idle > wait && s.hp < s.maxHp) {
      const drums = t ? (t.soldierDmg >= 0.25 ? 2 : 1) : 1;
      s.hp = Math.min(s.maxHp, s.hp + (s.maxHp * s.regen * drums) / 30);
    }
  }
  // enemy melee against their holders
  for (const e of es) {
    if (!alive(e) || !e.heldBy || !e.melee) continue;
    if (e.st.frozen > 0 || e.st.stun > 0) continue;
    if (e.meleeCd > 0) { e.meleeCd--; continue; }
    const s = ss.find((q) => q.id === e.heldBy);
    if (!s || s.state === "dead") continue;
    e.meleeCd = e.melee.int;
    const raw = e.melee.dmg * (e.boss ? 1 : act.spellMul);
    hurtSoldier(b, s, raw, e.melee.magic);
    if (e.melee.cleave) {
      let n = e.melee.cleave;
      for (const o of ss) { if (n <= 0) break; if (o !== s && o.state !== "dead" && d2(o.x, o.y, s.x, s.y) <= 0.64) { hurtSoldier(b, o, raw, e.melee.magic); n--; } }
    }
  }
}

function pickFree(es: EnemyX[], rx: number, ry: number, er: number, s: SoldierX): EnemyX | null {
  let best: EnemyX | null = null, bd = Infinity;
  for (const e of es) {
    if (e.heldBy || !blockable(e)) continue;
    const dd = d2(e.x, e.y, rx, ry);
    if (dd > er * er) continue;
    const ds = d2(e.x, e.y, s.x, s.y);
    if (ds < bd) { bd = ds; best = e; }
  }
  return best;
}

function hold(b: Battle, s: SoldierX, e: EnemyX) {
  e.heldBy = s.id;
  s.held.push(e.id);
  if (e.kind === "runner" || e.kind === "pup" || e.kind === "packlord") e.slip = T(0.5);
  e.meleeCd = Math.max(e.meleeCd, 6);
  emit(b, e.x, e.y, { e: "block", soldier: s.id, id: e.id });
}

function strike(b: Battle, s: SoldierX, t: TowerX | null, e: EnemyX) {
  const m = X(b).mods, act = ACTS[b.act];
  const aspd = Math.min(m.aspdCap, (t ? t.aspd : 0) + (X(b).rallyT > 0 ? 0.4 : 0) + (X(b).hornT > 0 ? 0.3 : 0));
  s.cd = Math.max(1, Math.round(s.int / (1 + aspd)));
  const bonus = t ? t.soldierDmg : 0;
  if (s.kind === "treant") {
    for (const o of enemies(b)) if (alive(o) && !o.air && d2(o.x, o.y, s.x, s.y) <= 1.0) damage(b, o, { amount: s.dmg, type: "phys", tower: t, area: true, dealt: bonus });
    emit(b, s.x, s.y, { e: "aura_pulse", tower: s.tower, r: 1.0 });
    return;
  }
  damage(b, e, { amount: s.dmg, type: "phys", tower: t, direct: true, crit: s.crit, dealt: bonus, by: s.tower });
  if (t && t.kind === "barracks") {
    const sw = bv(m, "barracks", "shield-wall", 1, 2);
    if (sw) shred(e, sw);
  }
  void act;
}
