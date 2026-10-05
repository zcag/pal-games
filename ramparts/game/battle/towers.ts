// Towers (systems 6, 8; content 2): buffs, targeting with the overkill guard, every
// tower and spec, projectiles and zones they make.
import type { Battle, DamageType, ProjectileKind, TargetMode, ZoneKind } from "../types.ts";
import { ACTS } from "../content/battle/acts.ts";
import { TOWERS, SPEC_OF, statsOf, type TStats } from "../content/battle/towers.ts";
import { bv, has, hasB } from "./mods.ts";
import {
  DT, T, X, alive, d2, emit, enemies, hittable, nid, projs, remaining, roll, rollInt, synergy, towers, zones,
  type EnemyX, type ProjX, type TowerX, type ZoneX,
} from "./internal.ts";
import { burn, chill, corrode, damage, expected, freeze, hex, mark, numb, root, shred, slow, stunExact } from "./damage.ts";
import { lightZone } from "./statuses.ts";
import { syncSoldiers } from "./soldiers.ts";

const COS35 = 0.8191520442889918, COS45 = 0.7071067811865476, COS55 = 0.573576436351046;

export const rangeBase = (t: TowerX) => statsOf(t.kind, t.level, t.spec).range;
export const stats = (t: TowerX): TStats => statsOf(t.kind, t.level, t.spec);
export const hasSpec = (t: TowerX, s: string) => t.spec === s || t.spec2 === s;

/** Effective range: base x (1 + range pool capped at +40%) x sandstorm; Overclock -1 (R19). */
export function effRange(b: Battle, t: TowerX): number {
  const hot = has(X(b).mods, "overclock") && !TOWERS[t.kind].support;
  return Math.max(0.5, rangeBase(t) * t.rangeMul - (hot ? 1 : 0));
}

/** Can this tower hit flyers? (spec-aware) */
export function hitsAir(t: TowerX): boolean {
  if (t.level >= 4 && t.spec) {
    if (TOWERS[t.kind].specs[SPEC_OF[t.spec].index].air) return true;
    if (t.spec2 && TOWERS[t.kind].specs[SPEC_OF[t.spec2].index].air) return true;
    return false;
  }
  return TOWERS[t.kind].air;
}

// ---------------------------------------------------------------- buffs (auras, pools)
export function computeBuffs(b: Battle) {
  const x = X(b), m = x.mods;
  const ts = towers(b);
  const pad = (t: TowerX) => b.map.pads[t.pad]!;
  const active = (t: TowerX) => t.building <= 0 && t.disabled <= 0;
  const banners = ts.filter((t) => t.kind === "banner" && active(t));
  const lights = ts.filter((t) => t.kind === "beacon" && hasSpec(t, "lighthouse") && active(t));
  const fieldForge = hasB(m, "banner", "field-forge");
  for (const t of ts) {
    const p = pad(t);
    let rangePct = m.t[t.kind].range + (p.high ? 0.15 : 0);
    if (has(m, "spyglass") && (t.kind === "archer" || t.kind === "ballista")) rangePct += 0.15;
    t.lighthouse = lights.some((l) => l !== t && d2(pad(l).x, pad(l).y, p.x, p.y) <= 9.0001);
    if (t.lighthouse) rangePct += 0.15;
    t.rangeMul = (1 + Math.min(0.4, rangePct)) * (x.stormT > 0 ? 0.8 : 1);
    t.critAdd = t.lighthouse ? 10 : 0;
    // banners: best aura in reach (Field Forge: the two best add)
    const auras: number[] = [];
    let dealt = 0, sdmg = 0, best = 0, treasury = 0, brave = 0;
    if (t.kind !== "banner") for (const bn of banners) {
      const st = stats(bn);
      const r = st.range * (1 + Math.min(0.4, m.t.banner.range)) + bv(m, "banner", "field-forge", 0, 0.4);
      const inTower = d2(pad(bn).x, pad(bn).y, p.x, p.y) <= r * r + 1e-9;
      const inRally = !!t.rally && d2(pad(bn).x, pad(bn).y, t.rally.x, t.rally.y) <= r * r + 1e-9;
      if (!inTower && !inRally) continue;
      const v = (st.aspd! + bv(m, "banner", "louder-drums", 5, 8)) / 100;
      auras.push(v);
      if (v > (auras.length > 1 ? Math.max(...auras.slice(0, -1)) : -1)) best = bn.id;
      if (hasSpec(bn, "wardrums")) { dealt = Math.max(dealt, 0.15); sdmg = Math.max(sdmg, 0.25); synergy(b, "Drumline", p.x, p.y); }
      const ws = bv(m, "banner", "war-song", 0.05, 0.08);
      if (ws) { dealt = Math.max(dealt, hasSpec(bn, "wardrums") ? 0.15 + ws : ws); sdmg = Math.max(sdmg, (hasSpec(bn, "wardrums") ? 0.25 : 0) + bv(m, "banner", "war-song", 0.20, 0.30)); }
      if (hasSpec(bn, "treasury") && inTower) treasury = bn.id;
      if (hasB(m, "banner", "brave-hearts") && inTower) brave = bv(m, "banner", "brave-hearts", T(3), T(2));
    }
    auras.sort((a, c) => c - a);
    let aspd = (auras[0] ?? 0) + (fieldForge ? auras[1] ?? 0 : 0);
    if (fieldForge && auras.length > 1) synergy(b, "Field Forge", p.x, p.y);
    aspd += m.t[t.kind].aspd + (x.rallyT > 0 ? 0.4 : 0) + (x.hornT > 0 ? 0.3 : 0);
    if (has(m, "crowded-banners")) {
      const n = ts.filter((o) => o !== t && d2(pad(o).x, pad(o).y, p.x, p.y) <= 2.8 * 2.8 + 1e-9).length;
      aspd += n ? 0.1 * n : -0.3;
    }
    if (has(m, "overclock")) aspd += 0.25;
    t.aspd = aspd; t.dealt = dealt; t.soldierDmg = sdmg; t.banner = best; t.treasury = treasury; t.braveHearts = brave;
  }
}

/** Ticks between attacks for an interval in seconds. */
function interval(b: Battle, t: TowerX, s: number): number {
  const a = Math.min(X(b).mods.aspdCap, t.aspd);
  return Math.max(1, Math.round(T(s) / Math.max(0.1, 1 + a)));
}

// ---------------------------------------------------------------- targeting
export function pick(b: Battle, t: TowerX, r: number, mode: TargetMode, opts: { air: boolean; ground?: boolean; guard?: boolean; exclude?: number[]; from?: { x: number; y: number } } ): EnemyX | null {
  const es = enemies(b);
  const ox = opts.from ? opts.from.x : t.x, oy = opts.from ? opts.from.y : t.y;
  const r2 = r * r;
  let best: EnemyX | null = null, bk = 0;
  for (let i = 0; i < es.length; i++) {
    const e = es[i]!;
    if (!hittable(e) || (e.stealth && e.st.revealed <= 0)) continue;
    if (e.air ? !opts.air : opts.ground === false) continue;
    if (d2(e.x, e.y, ox, oy) > r2) continue;
    if (opts.exclude && opts.exclude.includes(e.id)) continue;
    if (opts.guard && e.pend >= e.hp + e.shield + (e.boss?.iceShield ?? 0) - 1e-6) continue;
    const k = mode === "first" ? remaining(e) : mode === "last" ? -remaining(e) : -(e.hp + e.shield + (e.boss?.iceShield ?? 0));
    if (!best || k < bk) { best = e; bk = k; }
  }
  return best;
}

/** Targets in mode order (Volley, Firestorm). */
function pickN(b: Battle, t: TowerX, r: number, n: number, air: boolean): EnemyX[] {
  const out: EnemyX[] = [];
  for (let k = 0; k < n; k++) { const e = pick(b, t, r, t.mode, { air, exclude: out.map((q) => q.id) }); if (!e) break; out.push(e); }
  return out;
}

// ---------------------------------------------------------------- projectiles & zones
function proj(b: Battle, t: TowerX | null, kind: ProjectileKind, kindOf: string, sx: number, sy: number, tx: number, ty: number, o: Partial<ProjX>): ProjX {
  const p: ProjX = {
    id: nid(b), kind, from: t?.id ?? 0, target: 0, x: sx, y: sy, z: 1.6, px: sx, py: sy, pz: 1.6, sx, sy, tx, ty, t: 0, dur: 0, homing: false,
    dmg: 0, type: "phys", splash: 0, pendAmt: 0, kindOf, flags: 0, speed: 10, vx: 0, vy: 0, hit: [], extra: 0, air: false, ...o,
  };
  b.projectiles.push(p);
  return p;
}

function homing(b: Battle, t: TowerX, e: EnemyX, kind: ProjectileKind, kindOf: string, dmg: number, type: DamageType, speed: number, o: Partial<ProjX> = {}): ProjX {
  const pierce = (stats(t).pierce ?? 0) + X(b).mods.t[t.kind].pierce;
  const pendAmt = expected(b, e, dmg * (1 + t.dealt + X(b).mods.t[t.kind].dealt), type, pierce);
  e.pend += pendAmt;
  return proj(b, t, kind, kindOf, t.x, t.y, e.x, e.y, { target: e.id, homing: true, dmg, type, speed, pendAmt, ...o });
}

/** Lobbed shot aimed at the straight-line prediction along the target's heading (R8). */
function lobbed(b: Battle, t: TowerX, e: EnemyX, kind: ProjectileKind, kindOf: string, dmg: number, type: DamageType, flight: number, splash: number, o: Partial<ProjX> = {}): ProjX {
  const vx = (e.x - e.px) / DT, vy = (e.y - e.py) / DT;
  const tx = e.x + vx * flight, ty = e.y + vy * flight;
  return proj(b, t, kind, kindOf, t.x, t.y, tx, ty, { dur: Math.max(1, T(flight)), dmg, type, splash, ...o });
}

export function addZone(b: Battle, kind: ZoneKind, x: number, y: number, r: number, ticks: number, from: number, o: Partial<ZoneX> = {}): ZoneX {
  const z: ZoneX = {
    id: nid(b), kind, x, y, r, ticks, total: ticks, from, oil: false, lit: false, lightAt: -1, slow: 0, dps: 0, acid: false,
    explosive: false, patchDps: 0, ls: [], charges: 0, dmg: 0, stop: 0, tarBoss: 0, roots: false, ...o,
  };
  b.zones.push(z);
  return z;
}

/** Splash damage (linear falloff to 50% at the edge unless flat). Returns enemies hit. */
export function splash(b: Battle, x: number, y: number, r: number, amount: number, type: DamageType, t: TowerX | null,
  o: { air?: boolean; airMul?: number; flat?: boolean; lightning?: boolean; by?: number; exclude?: number } = {}): EnemyX[] {
  const hits: EnemyX[] = [];
  const r2 = r * r;
  for (const e of enemies(b)) {
    if (!hittable(e) || e.id === o.exclude) continue;
    if (e.air && !o.air) continue;
    const dd = d2(e.x, e.y, x, y);
    if (dd > r2) continue;
    const k = (o.flat ? 1 : 1 - (0.5 * Math.sqrt(dd)) / r) * (e.air ? o.airMul ?? 1 : 1);
    damage(b, e, { amount: amount * k, type, tower: t, area: true, lightning: o.lightning, by: o.by });
    hits.push(e);
  }
  return hits;
}

const still = (e: EnemyX) => e.speed <= 0.01 || e.st.root > 0 || e.st.frozen > 0 || e.st.stun > 0 || !!e.heldBy;

// ---------------------------------------------------------------- per tick
export function updateTowers(b: Battle) {
  const ts = towers(b);
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i]!;
    if (t.building > 0) { if (--t.building === 0) t.cooldown = 0; continue; }
    if (t.disabled > 0) { if (--t.disabled === 0) emit(b, t.x, t.y, { e: "tower_enabled", tower: t.id, ticks: 0 }); continue; }
    if (t.cooldown > 0) t.cooldown--;
    switch (t.kind) {
      case "archer": archer(b, t); break;
      case "mage": mage(b, t); break;
      case "bombard": bombard(b, t); break;
      case "frost": frost(b, t); break;
      case "alchemist": alchemist(b, t); break;
      case "pyre": hasSpec(t, "firestorm") ? firestorm(b, t) : pyre(b, t); break;
      case "storm": storm(b, t); break;
      case "beacon": beacon(b, t); break;
      case "banner": banner(b, t); break;
      case "ballista": ballista(b, t); break;
      case "thornwood": thornwood(b, t); break;
      case "barracks": break;
    }
  }
}

function shoot(b: Battle, t: TowerX, e: { id: number; x: number; y: number }) {
  t.target = e.id; t.aimX = e.x; t.aimY = e.y; t.shots++;
  emit(b, t.x, t.y, { e: "shoot", tower: t.id, kind: t.kind, spec: t.spec, target: e.id, tx: e.x, ty: e.y });
}

// ---------------------------------------------------------------- 1 Archer
function archer(b: Battle, t: TowerX) {
  const m = X(b).mods, st = stats(t);
  if (t.rain) arrowRain(b, t);
  if (t.cooldown > 0) return;
  const r = effRange(b, t);
  const volley = hasSpec(t, "volley") && t.spec === "volley";
  const dmgAdd = volley ? bv(m, "archer", "barbed-tips", 1, 2) : m.t.archer.dmgAdd;
  if (volley) {
    const tg = pickN(b, t, r, 3, true);
    if (!tg.length) { t.target = 0; return; }
    t.cooldown = interval(b, t, st.int!);
    shoot(b, t, tg[0]!);
    for (let k = 0; k < 3; k++) {
      const e = tg[k % tg.length]!;
      homing(b, t, e, "volley", "arrow", (st.dmg! + dmgAdd) * (k < tg.length ? 1 : 0.5), "phys", st.speed!, { flags: arrowFlags(b, t) });
    }
    if (twinShot(b, t, 5, 4)) for (const e of tg) homing(b, t, e, "volley", "arrow", st.dmg! + dmgAdd, "phys", st.speed!);
    if (t.shots % 5 === 0) startRain(b, t, r);
    if (hasSpec(t, "marksmen")) marksShot(b, t, r);
    return;
  }
  const marks = t.spec === "marksmen";
  const e = pick(b, t, r, t.mode, { air: true, guard: true });
  if (!e) { t.target = 0; return; }
  t.cooldown = interval(b, t, st.int!);
  shoot(b, t, e);
  const kind: ProjectileKind = marks ? "marksman" : "arrow";
  const flags = arrowFlags(b, t);
  homing(b, t, e, kind, "arrow", st.dmg! + dmgAdd, flags & 1 ? "fire" : "phys", st.speed!, { flags });
  if (twinShot(b, t, marks ? 4 : 5, marks ? 3 : 4)) homing(b, t, e, kind, "arrow", st.dmg! + dmgAdd, "phys", st.speed!);
  if (hasSpec(t, "volley") && t.shots % 5 === 0) startRain(b, t, r);
}

/** Twin Crests on Marksmen+Volley: Volley's rain is handled above; Deadeye is in the crit rule. */
function marksShot(_b: Battle, _t: TowerX, _r: number) {}

function twinShot(b: Battle, t: TowerX, every: number, temp: number): boolean {
  const n = bv(X(b).mods, "archer", "twin-shot", every, temp);
  return n > 0 && t.shots % n === 0;
}

/** Bit 1: Pitch Arrows (fire, burn, ignites). */
function arrowFlags(b: Battle, t: TowerX): number {
  const n = bv(X(b).mods, "archer", "pitch-arrows", 4, 3);
  return n > 0 && t.shots % n === 0 ? 1 : 0;
}

function startRain(b: Battle, t: TowerX, r: number) {
  let best: EnemyX | null = null, bn = -1;
  const es = enemies(b);
  for (const e of es) {
    if (!hittable(e) || d2(e.x, e.y, t.x, t.y) > r * r || (e.stealth && e.st.revealed <= 0)) continue;
    let n = 0;
    for (const o of es) if (hittable(o) && d2(o.x, o.y, e.x, e.y) <= 1.44) n++;
    if (n > bn) { bn = n; best = e; }
  }
  if (best) t.rain = { x: best.x, y: best.y, left: 8, next: b.tick, hits: [] };
}

function arrowRain(b: Battle, t: TowerX) {
  const rn = t.rain!;
  if (b.tick < rn.next) return;
  rn.next = b.tick + 4;
  rn.left--;
  const pool = enemies(b).filter((e) => hittable(e) && d2(e.x, e.y, rn.x, rn.y) <= 1.44 && rn.hits.filter((h) => h === e.id).length < 3);
  if (pool.length) {
    const e = pool[rollInt(b, pool.length)]!;
    rn.hits.push(e.id);
    damage(b, e, { amount: 12 + bv(X(b).mods, "archer", "barbed-tips", 1, 2), type: "phys", tower: t, direct: true, crit: stats(t).crit, critM: 2 });
    emit(b, e.x, e.y, { e: "shoot", tower: t.id, kind: "archer", spec: "volley", target: e.id, tx: e.x, ty: e.y });
  }
  if (rn.left <= 0) t.rain = null;
}

// ---------------------------------------------------------------- 3 Mage
function mage(b: Battle, t: TowerX) {
  if (t.cooldown > 0) return;
  const m = X(b).mods, st = stats(t);
  const e = pick(b, t, effRange(b, t), t.mode, { air: true, guard: true });
  if (!e) { t.target = 0; return; }
  t.cooldown = interval(b, t, st.int!);
  shoot(b, t, e);
  const speed = st.speed! * (1 + bv(m, "mage", "quickened-runes", 0.5, 0.8));
  homing(b, t, e, hasSpec(t, "hexer") && t.spec === "hexer" ? "hex" : hasSpec(t, "arcanist") ? "arcane" : "bolt", "bolt", st.dmg!, "magic", speed);
}

function mageHit(b: Battle, t: TowerX, e: EnemyX, p: ProjX) {
  const m = X(b).mods;
  let dealt = 0;
  if (hasB(m, "mage", "opening-bolt") && !e.opened.includes(t.id)) { dealt += bv(m, "mage", "opening-bolt", 0.5, 0.8); e.opened.push(t.id); }
  damage(b, e, { amount: p.dmg, type: "magic", tower: t, direct: true, dealt });
  const lvlPct = t.level >= 4 ? 25 : [20, 22, 25][t.level - 1]!;
  const isHexer = hasSpec(t, "hexer");
  if (alive(e)) {
    if (isHexer) hex(b, e, T(5 + bv(m, "mage", "lingering-hex", 1, 2)), 25, t, true);
    else if (hasB(m, "mage", "lingering-hex")) hex(b, e, T(bv(m, "mage", "lingering-hex", 1, 2)), lvlPct, t);
    if (hasB(m, "mage", "curse-engine")) {
      hex(b, e, T(2), lvlPct, t, isHexer);
      e.hexForever = t.id;
      if (bv(m, "mage", "curse-engine", 0, 1)) slow(e, 0.1, T(2));
    }
  }
  if (isHexer && t.shots % 3 === 0) for (const o of enemies(b)) if (hittable(o) && d2(o.x, o.y, e.x, e.y) <= 1.44) hex(b, o, T(5), 25, t, true);
  const splinter = bv(m, "mage", "arc-splinter", 0.3, 0.45);
  if (splinter) splash(b, e.x, e.y, 0.8, p.dmg * splinter, "magic", t, { air: true, exclude: e.id });
  if (hasSpec(t, "arcanist")) {
    // chains 2 jumps (1.8 u, -25% each)
    const hit = [e.id];
    let from: EnemyX = e, dmg = p.dmg;
    const ids = [e.id], pts = [{ x: e.x, y: e.y }];
    for (let k = 0; k < 2; k++) {
      dmg *= 0.75;
      let nx: EnemyX | null = null, bd = 1.8 * 1.8;
      for (const o of enemies(b)) if (hittable(o) && !hit.includes(o.id)) { const dd = d2(o.x, o.y, from.x, from.y); if (dd <= bd) { bd = dd; nx = o; } }
      if (!nx) break;
      hit.push(nx.id); ids.push(nx.id); pts.push({ x: nx.x, y: nx.y });
      damage(b, nx, { amount: dmg, type: "magic", tower: t, direct: true });
      from = nx;
    }
    if (ids.length > 1) emit(b, t.x, t.y, { e: "chain", tower: t.id, ids, pts });
    if (t.shots % 4 === 0) {
      emit(b, e.x, e.y, { e: "explode", r: 1.0, source: "arcane", damage: 50 });
      splash(b, e.x, e.y, 1.0, 50, "magic", t, { air: true });
    }
  }
}

// ---------------------------------------------------------------- 4 Bombard
function bombard(b: Battle, t: TowerX) {
  if (t.cooldown > 0) return;
  const m = X(b).mods, st = stats(t);
  const e = pick(b, t, effRange(b, t), t.mode, { air: false });
  if (!e) { t.target = 0; return; }
  t.cooldown = interval(b, t, st.int!);
  shoot(b, t, e);
  const flight = st.flight! / (1 + bv(m, "bombard", "quick-fuse", 0.3, 0.45));
  const kind: ProjectileKind = hasSpec(t, "mortar") ? "mortar" : "shell";
  lobbed(b, t, e, kind, "shell", st.dmg!, "phys", flight, st.splash! * (1 + bv(m, "bombard", "heavy-shot", 0.2, 0.3)));
}

function shellLand(b: Battle, t: TowerX | null, p: ProjX) {
  const m = X(b).mods;
  const frozenBefore = enemies(b).filter((e) => hittable(e) && !e.air && e.st.frozen > 0 && d2(e.x, e.y, p.tx, p.ty) <= p.splash * p.splash);
  const pinned = enemies(b).some((e) => hittable(e) && !e.air && still(e) && d2(e.x, e.y, p.tx, p.ty) <= 0.25);
  if (pinned) synergy(b, "Pinned", p.tx, p.ty);
  emit(b, p.tx, p.ty, { e: "explode", r: p.splash, source: p.kindOf === "bomblet" ? "bomblet" : p.kind, damage: p.dmg });
  const hits = splash(b, p.tx, p.ty, p.splash, p.dmg, "phys", t);
  if (p.kindOf === "bomblet") { for (const e of hits) shred(e, 1, 10); return; }
  if (!t) return;
  if (hasSpec(t, "shrapnel")) {
    for (const e of hits) shred(e, 2, 10);
    if (hits.length) synergy(b, "Sunder", p.tx, p.ty);
    for (let k = 0; k < 4; k++) {
      const a = roll(b) * 2 - 1, c = roll(b) * 2 - 1;
      proj(b, t, "bomblet", "bomblet", p.tx, p.ty, p.tx + a * 1.2, p.ty + c * 1.2, { dur: T(0.3), dmg: 18, type: "phys", splash: 0.6 });
    }
  }
  if (hasSpec(t, "mortar")) addZone(b, "crater", p.tx, p.ty, 1.0, T(3), t.id, { slow: 0.3 });
  if (hasB(m, "bombard", "oilshot")) {
    const max = bv(m, "bombard", "oilshot", 2, 3);
    puddle(b, t, p.tx, p.ty, 0.9, T(bv(m, "bombard", "oilshot", 4, 6)), max, false, false);
  }
  const cs = bv(m, "bombard", "concussive-shells", T(0.4), T(0.6));
  if (cs) { const r = bv(m, "bombard", "concussive-shells", 0.4, 0.5); for (const e of hits) if (d2(e.x, e.y, p.tx, p.ty) <= r * r) stunExact(b, e, e.boss ? Math.max(T(0.2), Math.round(cs * 0.25)) : cs); }
  if (frozenBefore.length && hasB(m, "bombard", "shatterfall")) {
    const ft = bv(m, "bombard", "shatterfall", T(1.0), T(1.5));
    for (const e of hits) if (alive(e) && !frozenBefore.includes(e)) { if (e.elite || e.boss) numb(b, e); else freeze(b, e, ft); }
  }
  if (has(m, "long-fuse")) addZone(b, "burning", p.tx, p.ty, 0.8, T(2), t.id, { dps: 15 });
}

// ---------------------------------------------------------------- 5 Frost Spire
function frost(b: Battle, t: TowerX) {
  const m = X(b).mods, st = stats(t);
  if (hasSpec(t, "glacier")) {
    if (--t.t1 <= 0) {
      t.t1 = interval(b, t, 3.5);
      emit(b, t.x, t.y, { e: "nova", tower: t.id, r: 2.4 });
      const nova = 30 + bv(m, "frost", "frostbite", 10, 15);
      for (const e of enemies(b)) {
        if (!hittable(e) || d2(e.x, e.y, t.x, t.y) > 2.4 * 2.4) continue;
        damage(b, e, { amount: nova, type: "magic", tower: t, area: true });
        if (alive(e)) chill(b, e, 35 * (1 + bv(m, "frost", "deep-cold", 0.25, 0.40)), chillSrc(b, t));
      }
    }
  }
  if (t.cooldown > 0) return;
  // a spire keeps chilling one enemy until it freezes or walks out of reach; hopping to a new target
  // every shot (a dense column) spreads the chill so thin that nothing ever freezes
  const r = effRange(b, t);
  const cur = t.target ? enemies(b).find((q) => q.id === t.target) : undefined;
  const e = cur && hittable(cur) && cur.st.frozen <= 0 && cur.st.thaw <= 0 && !cur.noChill && (!cur.stealth || cur.st.revealed > 0)
    && d2(cur.x, cur.y, t.x, t.y) <= r * r ? cur : pick(b, t, r, t.mode, { air: true });
  if (!e) { t.target = 0; return; }
  t.cooldown = interval(b, t, st.int!);
  shoot(b, t, e);
  homing(b, t, e, "shard", "shard", st.dmg! + m.t.frost.dmgAdd, "magic", st.speed!);
}

function chillSrc(b: Battle, t: TowerX) {
  const m = X(b).mods, st = stats(t);
  const shatter = hasSpec(t, "shatter"), bones = hasB(m, "frost", "glass-bones");
  return {
    tower: t,
    freeze: T((st.freeze ?? 1.5) + bv(m, "frost", "long-winter", 0.5, 0.8)),
    brittle: shatter || bones ? T(1) + (bones ? bv(m, "frost", "glass-bones", 0, T(1) / 30) * 30 : 0) : 0,
    shatterPct: shatter ? (bones ? 0.35 : 0.25) : bones ? 0.25 : 0,
    markS: hasB(m, "frost", "frozen-mark") ? T(bv(m, "frost", "frozen-mark", 2, 3)) : 0,
    markPct: bv(m, "frost", "frozen-mark", 10, 12),
    hold: T(bv(m, "frost", "lingering-cold", 3, 4.5) || 1.5),
  };
}

function frostHit(b: Battle, t: TowerX, e: EnemyX, p: ProjX) {
  const m = X(b).mods, st = stats(t);
  damage(b, e, { amount: p.dmg, type: "magic", tower: t, direct: true });
  const amt = st.chill! * (1 + bv(m, "frost", "deep-cold", 0.25, 0.40));
  if (alive(e)) chill(b, e, amt, chillSrc(b, t));
  const sp = bv(m, "frost", "splinter", 0.5, 1.0);
  if (sp) {
    let nx: EnemyX | null = null, bd = 1.44;
    for (const o of enemies(b)) if (o !== e && hittable(o)) { const dd = d2(o.x, o.y, e.x, e.y); if (dd <= bd) { bd = dd; nx = o; } }
    if (nx) chill(b, nx, amt * sp, chillSrc(b, t));
  }
}

// ---------------------------------------------------------------- 6 Alchemist
function alchemist(b: Battle, t: TowerX) {
  if (t.cooldown > 0) return;
  const m = X(b).mods, st = stats(t);
  const r = effRange(b, t);
  const e = pick(b, t, r, t.mode, { air: false });
  if (!e) { t.target = 0; return; }
  t.cooldown = interval(b, t, st.int!);
  shoot(b, t, e);
  const fire = hasSpec(t, "naphtha") && (t.shots % 4 === 0);
  lobbed(b, t, e, fire ? "firebomb" : "flask", "flask", st.dmg!, "magic", st.flight!, st.splash!, { flags: fire ? 1 : 0 });
  const tw = bv(m, "alchemist", "twin-flasks", 3, 2);
  if (tw && t.shots % tw === 0) {
    const e2 = pick(b, t, r, t.mode, { air: false, exclude: [e.id] });
    if (e2) lobbed(b, t, e2, "flask", "flask", st.dmg!, "magic", st.flight!, st.splash!);
  }
}

function puddle(b: Battle, t: TowerX, x: number, y: number, r: number, ticks: number, max: number, acid: boolean, explosive: boolean): ZoneX {
  const m = X(b).mods;
  while (t.puddles.length >= max) {
    const id = t.puddles.shift()!;
    const z = zones(b).find((q) => q.id === id);
    if (z) z.ticks = 0;
  }
  const z = addZone(b, acid ? "acid" : "oil", x, y, r, ticks, t.id, {
    oil: true, slow: hasB(m, "alchemist", "sticky-tar") && t.kind === "alchemist" ? bv(m, "alchemist", "sticky-tar", 0.35, 0.40) : 0.25,
    acid, dps: acid ? 15 : 0, explosive,
  });
  t.puddles.push(z.id);
  return z;
}

function flaskLand(b: Battle, t: TowerX, p: ProjX) {
  const m = X(b).mods, st = stats(t);
  splash(b, p.tx, p.ty, p.splash, p.dmg, "magic", t);
  const r = st.puddleR! * (1 + bv(m, "alchemist", "wide-flasks", 0.25, 0.40)) * (has(m, "grease-pot") ? 1.3 : 1);
  const dur = T(st.puddle! * (1 + bv(m, "alchemist", "thick-oil", 0.5, 0.8)));
  const z = puddle(b, t, p.tx, p.ty, r, dur, 3, hasSpec(t, "acid"), hasSpec(t, "naphtha"));
  if (p.flags & 1) lightZone(b, z);
}

// ---------------------------------------------------------------- 7 Pyre
function pyre(b: Battle, t: TowerX) {
  const m = X(b).mods, st = stats(t);
  const r = effRange(b, t);
  if (--t.t1 <= 0) {
    t.t1 = T(0.5);
    const e = pick(b, t, r, t.mode, { air: false });
    if (e) {
      const dx = e.x - t.x, dy = e.y - t.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
      t.coneDx = dx / dd; t.coneDy = dy / dd;
      if (e.id !== t.coneTgt) t.heatT = 0;
      t.coneTgt = e.id;
      t.target = e.id; t.aimX = e.x; t.aimY = e.y;
    } else { t.coneTgt = 0; t.target = 0; t.heatT = 0; }
  }
  if (!t.coneTgt) return;
  t.heatT++;
  if (--t.t2 > 0) return;
  t.t2 = 6;
  const nozzle = bv(m, "pyre", "wide-nozzle", 1, 2);
  const cosHalf = nozzle === 2 ? COS55 : nozzle === 1 ? COS45 : COS35;
  const aspd = 1 + Math.min(m.aspdCap, t.aspd);
  const heat = hasSpec(t, "inferno") ? Math.min(1.2, (0.15 * t.heatT) / 30) : 0;
  const per = st.dmg! * 0.2 * aspd;
  const burnDps = st.burn! + bv(m, "pyre", "hotter", 2, 4);
  const burnS = T(st.burnS! + bv(m, "pyre", "slow-burn", 1.5, 2.5));
  emit(b, t.x, t.y, { e: "cone", tower: t.id, dx: t.coneDx, dy: t.coneDy, r });
  if (t.shots++ % 5 === 0) emit(b, t.x, t.y, { e: "shoot", tower: t.id, kind: "pyre", spec: t.spec, target: t.coneTgt, tx: t.aimX, ty: t.aimY });
  const r2 = r * r;
  for (const e of enemies(b)) {
    if (!hittable(e) || e.air) continue;
    const dx = e.x - t.x, dy = e.y - t.y, dd = dx * dx + dy * dy;
    if (dd > r2) continue;
    const len = Math.sqrt(dd) || 1;
    if ((dx * t.coneDx + dy * t.coneDy) / len < cosHalf) continue;
    const dealt = heat + (e.heldBy ? bv(m, "pyre", "backdraft", 0.25, 0.40) : 0);
    if (e.heldBy) synergy(b, "Kill Box", e.x, e.y);
    damage(b, e, { amount: per, type: "fire", tower: t, area: true, dealt });
    if (alive(e)) burn(b, e, burnDps, burnS, t);
  }
  if (hasB(m, "alchemist", "firewalk")) for (const z of zones(b)) {
    if (!z.oil || z.lit) continue;
    const dx = z.x - t.x, dy = z.y - t.y, dd = Math.sqrt(dx * dx + dy * dy);
    if (dd - z.r > r) continue;
    if (dd <= z.r || (dx * t.coneDx + dy * t.coneDy) / dd >= cosHalf) lightZone(b, z);
  }
}

function firestorm(b: Battle, t: TowerX) {
  if (t.cooldown > 0) return;
  const m = X(b).mods, st = stats(t);
  const tg = pickN(b, t, effRange(b, t), 3, true);
  if (!tg.length) { t.target = 0; return; }
  t.cooldown = interval(b, t, st.int!);
  shoot(b, t, tg[0]!);
  const r = st.splash! + bv(m, "pyre", "wide-nozzle", 0.2, 0.3);
  for (let k = 0; k < 3; k++) {
    const e = tg[k % tg.length]!;
    lobbed(b, t, e, "fireball", "fireball", st.dmg!, "fire", st.flight!, r, { air: e.air });
  }
}

function fireballLand(b: Battle, t: TowerX, p: ProjX) {
  const m = X(b).mods, st = stats(t);
  emit(b, p.tx, p.ty, { e: "explode", r: p.splash, source: "fireball", damage: p.dmg });
  const hits = splash(b, p.tx, p.ty, p.splash, p.dmg, "fire", t, { air: true, airMul: 0.5, flat: true });
  const burnDps = st.burn! + bv(m, "pyre", "hotter", 2, 4);
  for (const e of hits) if (alive(e)) burn(b, e, burnDps, T(st.burnS! + bv(m, "pyre", "slow-burn", 1.5, 2.5)), t);
  if (!p.air) addZone(b, "burning", p.tx, p.ty, 0.8, T(3), t.id, { dps: 15 });
}

// ---------------------------------------------------------------- 8 Storm Spire
function storm(b: Battle, t: TowerX) {
  const m = X(b).mods, st = stats(t);
  if (hasSpec(t, "tempest") && --t.t1 <= 0) {
    t.t1 = T(4);
    let any = false;
    for (const e of enemies(b)) if (hittable(e) && e.air && d2(e.x, e.y, t.x, t.y) <= 3.5 * 3.5) { any = true; damage(b, e, { amount: 50, type: "magic", tower: t, area: true, lightning: true }); }
    if (any) emit(b, t.x, t.y, { e: "nova", tower: t.id, r: 3.5 });
  }
  if (t.cooldown > 0) return;
  const first = pick(b, t, effRange(b, t), t.mode, { air: true });
  if (!first) { t.target = 0; return; }
  t.cooldown = interval(b, t, st.int!);
  shoot(b, t, first);
  const targets = st.targets! + bv(m, "storm", "copper-wire", 1, 2) + (has(m, "copper-coil") ? 1 : 0);
  const seek = bv(m, "storm", "seeking-sparks", 1, 2);
  const ids = [first.id], pts = [{ x: t.x, y: t.y }, { x: first.x, y: first.y }];
  let e: EnemyX = first, dmg = st.dmg!, conductor = false;
  for (let k = 0; k < targets; k++) {
    const cond = e.st.chill > 0 || e.st.frozen > 0;
    if (cond) conductor = true;
    const dealt = (cond ? 0.3 + (has(m, "storm-glass") ? 0.6 : 0) : 0) + (e.air ? bv(m, "storm", "sky-arcs", 0.35, 0.5) : 0);
    damage(b, e, { amount: dmg, type: "magic", tower: t, direct: true, lightning: true, dealt });
    if (hasSpec(t, "overload") && alive(e)) {
      e.st.charges++; e.st.chargeT = T(5);
      if (e.st.charges >= 3) {
        e.st.charges = 0;
        stunExact(b, e, e.boss ? T(0.4) : T(1.5));
        splash(b, e.x, e.y, 1.0, 40, "magic", t, { air: true, lightning: true });
        emit(b, e.x, e.y, { e: "explode", r: 1.0, source: "overload", damage: 40 });
      }
    }
    if (k === targets - 1) break;
    const jr = (cond ? 2.4 : 1.6) + bv(m, "storm", "long-arc", 0.5, 0.8);
    let nx: EnemyX | null = null, bk = Infinity;
    for (const o of enemies(b)) {
      if (!hittable(o) || ids.includes(o.id)) continue;
      const dd = d2(o.x, o.y, e.x, e.y);
      if (dd > jr * jr) continue;
      const pref = seek && (o.st.chill > 0 || o.st.oiled > 0 || o.shield > 0) ? -100 : 0;
      if (dd + pref < bk) { bk = dd + pref; nx = o; }
    }
    if (!nx) break;
    if (!(seek && k < seek)) dmg *= 1 - st.fall!;
    ids.push(nx.id); pts.push({ x: nx.x, y: nx.y });
    e = nx;
  }
  if (conductor) synergy(b, "Conductor", first.x, first.y);
  const gr = bv(m, "storm", "grounding", T(0.5), T(0.8));
  if (gr && alive(e)) stunExact(b, e, e.boss ? T(0.2) : gr);
  emit(b, t.x, t.y, { e: "chain", tower: t.id, ids, pts });
}

// ---------------------------------------------------------------- 9 Beacon
function beacon(b: Battle, t: TowerX) {
  const m = X(b).mods, st = stats(t);
  const r = effRange(b, t), r2 = r * r;
  const linger = hasB(m, "beacon", "searchlight") ? T(bv(m, "beacon", "searchlight", 4, 6)) : T(1);
  const dur = T(bv(m, "beacon", "long-mark", 7, 9) || 5);
  const pct = st.markPct! + bv(m, "beacon", "bright-mark", 5, 8);
  for (const e of enemies(b)) {
    if (!e.stealth || !hittable(e) || d2(e.x, e.y, t.x, t.y) > r2) continue;
    const fresh = e.st.revealed <= 0;
    e.st.revealed = Math.max(e.st.revealed, linger);
    if (fresh) { emit(b, e.x, e.y, { e: "reveal", id: e.id }); if (hasB(m, "beacon", "searchlight")) mark(b, e, dur, pct, t); }
  }
  if (--t.t1 <= 0) {
    t.t1 = Math.round(T(st.markEvery!) / (1 + bv(m, "beacon", "quick-signal", 0.25, 0.40)));
    const hm = hasSpec(t, "huntersmark");
    const n = hm ? 3 : 1;
    const have = enemies(b).filter((e) => hittable(e) && e.markBy === t.id && e.st.marked > 0).length;
    let room = hm ? n - have : 1;
    const cands = enemies(b).filter((e) => hittable(e) && e.st.marked <= 0 && isVisible(e) && d2(e.x, e.y, t.x, t.y) <= r2)
      .sort((p, q) => (hm ? Number(!!(q.elite || q.boss)) - Number(!!(p.elite || p.boss)) : 0) || (q.hp + q.shield) - (p.hp + p.shield) || p.id - q.id);
    for (const e of cands) { if (room-- <= 0) break; mark(b, e, dur, pct, t); }
    if (cands.length) { t.shots++; t.target = cands[0]!.id; t.aimX = cands[0]!.x; t.aimY = cands[0]!.y; }
  }
  if (hasSpec(t, "lighthouse") && --t.t2 <= 0) {
    t.t2 = T(3);
    emit(b, t.x, t.y, { e: "aura_pulse", tower: t.id, r });
    for (const e of enemies(b)) if (hittable(e) && isVisible(e) && d2(e.x, e.y, t.x, t.y) <= r2) mark(b, e, dur, 15 + bv(m, "beacon", "bright-mark", 5, 8), t);
  }
}
const isVisible = (e: EnemyX) => !e.stealth || e.st.revealed > 0;

// ---------------------------------------------------------------- 10 War Banner
function banner(b: Battle, t: TowerX) {
  if (--t.t1 <= 0) { t.t1 = T(hasSpec(t, "wardrums") ? 1 : 2); emit(b, t.x, t.y, { e: "aura_pulse", tower: t.id, r: stats(t).range }); }
}

// ---------------------------------------------------------------- 11 Ballista
function ballista(b: Battle, t: TowerX) {
  if (t.cooldown > 0) return;
  const m = X(b).mods, st = stats(t);
  const r = effRange(b, t);
  const siege = t.spec === "siegebolt";
  const e = pick(b, t, r, t.mode, { air: true, guard: !siege });
  if (!e) { t.target = 0; return; }
  t.cooldown = interval(b, t, st.int!);
  shoot(b, t, e);
  if (siege) {
    const dx = e.x - t.x, dy = e.y - t.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
    proj(b, t, "siege", "siege", t.x, t.y, t.x + (dx / dd) * r, t.y + (dy / dd) * r, { dmg: st.dmg!, type: "phys", speed: st.speed!, vx: dx / dd, vy: dy / dd, extra: r, air: true });
  } else homing(b, t, e, hasSpec(t, "harpoon") ? "harpoon" : "ballista", "ballista", st.dmg!, "phys", st.speed!, { extra: bv(m, "ballista", "spear-of-dawn", 2, 3) });
  const tw = bv(m, "ballista", "twin-bolts", 0.6, 0.8);
  if (tw && t.shots % 3 === 0) {
    const e2 = pick(b, t, r, t.mode, { air: true, exclude: [e.id] });
    if (e2) homing(b, t, e2, "ballista", "ballista", st.dmg! * tw, "phys", st.speed!);
  }
}

function ballistaHit(b: Battle, t: TowerX, e: EnemyX, p: ProjX) {
  const m = X(b).mods, st = stats(t);
  damage(b, e, { amount: p.dmg, type: "phys", tower: t, direct: true, pierce: st.pierce, crit: 0 });
  if (alive(e)) {
    if (hasSpec(t, "harpoon") && p.kind === "harpoon" && t.shots % 3 === 0) pull(b, e);
    const pin = bv(m, "ballista", "pinning-bolts", T(0.6), T(1.0));
    if (pin && !e.elite) root(b, e, pin, t);
  } else if (p.extra > 0) {
    // Spear of Dawn: a killing bolt flies on at 70%
    let nx: EnemyX | null = null, bd = 9;
    for (const o of enemies(b)) if (hittable(o) && o !== e && isVisible(o)) { const dd = d2(o.x, o.y, e.x, e.y); if (dd <= bd) { bd = dd; nx = o; } }
    if (nx) {
      const q = proj(b, t, "ballista", "ballista", e.x, e.y, nx.x, nx.y, { target: nx.id, homing: true, dmg: p.dmg * 0.7, type: "phys", speed: st.speed!, extra: p.extra - 1 });
      q.pendAmt = 0;
    }
  }
}

/** Harpoon pull: 2.5 u back over 0.3 s; flyers grounded 4 s; juggernauts and bosses slowed (systems 5). */
export function pull(b: Battle, e: EnemyX) {
  if (e.boss || e.kind === "juggernaut") { slow(e, 0.6, T(1)); return; }
  if (e.air) {
    e.air = false; e.st.grounded = T(4);
    emit(b, e.x, e.y, { e: "grounded", id: e.id });
    synergy(b, "Grounded", e.x, e.y);
    return;
  }
  if (e.st.stunImmune > 0) return;
  e.pullT = 9;
  e.st.stunImmune = 30 + 9;
  emit(b, e.x, e.y, { e: "pull", id: e.id });
  synergy(b, "Second Pass", e.x, e.y);
}

// ---------------------------------------------------------------- 12 Thornwood Grove
function thornwood(b: Battle, t: TowerX) {
  const m = X(b).mods, st = stats(t);
  const r = effRange(b, t), r2 = r * r;
  const bramble = hasSpec(t, "bramble");
  if (--t.t2 <= 0) {
    t.t2 = 15;
    const dps = st.thorns! + (bramble ? bv(m, "thornwood", "sharper-thorns", 4, 7) : bv(m, "thornwood", "sharper-thorns", 3, 5));
    const aspd = 1 + Math.min(m.aspdCap, t.aspd);
    for (const e of enemies(b)) if (hittable(e) && !e.air && d2(e.x, e.y, t.x, t.y) <= r2) {
      damage(b, e, { amount: dps * 0.5 * aspd, type: "phys", tower: t, area: true });
      if (bramble && b.tick % 60 < 15) shred(e, 1);
    }
  }
  if (--t.t1 <= 0) {
    t.t1 = Math.round(T(st.rootEvery!) / (1 + bv(m, "thornwood", "quick-roots", 0.2, 0.3)));
    const n = st.roots!;
    const dur = T(st.rootS! + bv(m, "thornwood", "long-roots", 0.5, 0.8));
    const pct = bv(m, "thornwood", "strangling-roots", 0.2, 0.3);
    const cands = enemies(b).filter((e) => d2(e.x, e.y, t.x, t.y) <= r2 && !e.air && hittable(e)).sort((p, q) => remaining(p) - remaining(q) || p.id - q.id);
    let k = 0;
    for (const e of cands) { if (k >= n) break; if (root(b, e, dur, t, pct)) { k++; if (k === 1) shoot(b, t, e); } }
  }
}

/** Aura slows (Bramble 20%, Thick Briars) applied before movement. */
export function auraSlows(b: Battle) {
  const m = X(b).mods;
  for (const t of towers(b)) {
    if (t.kind !== "thornwood" || t.building > 0 || t.disabled > 0) continue;
    const s = Math.max(hasSpec(t, "bramble") ? 0.2 : 0, bv(m, "thornwood", "thick-briars", 0.10, 0.15));
    if (!s) continue;
    const r = effRange(b, t), r2 = r * r;
    for (const e of enemies(b)) if (hittable(e) && !e.air && d2(e.x, e.y, t.x, t.y) <= r2) e.zslow = Math.max(e.zslow, s);
  }
}

/** Watchful: towers reveal stealth in their range (Barracks: engage radius). Spyglass: archers and ballistas. */
export function watchers(b: Battle) {
  const m = X(b).mods;
  for (const t of towers(b)) {
    const w = hasB(m, t.kind, "watchful") || (has(m, "spyglass") && (t.kind === "archer" || t.kind === "ballista"));
    if (!w || t.building > 0) continue;
    const r = t.kind === "barracks" ? 1.4 : effRange(b, t);
    const cx = t.kind === "barracks" && t.rally ? t.rally.x : t.x, cy = t.kind === "barracks" && t.rally ? t.rally.y : t.y;
    for (const e of enemies(b)) if (e.stealth && hittable(e) && d2(e.x, e.y, cx, cy) <= r * r) {
      if (e.st.revealed <= 0) emit(b, e.x, e.y, { e: "reveal", id: e.id });
      e.st.revealed = Math.max(e.st.revealed, T(1));
    }
  }
}

// ---------------------------------------------------------------- projectiles (tick step 7)
export function updateProjectiles(b: Battle) {
  const ps = projs(b);
  const es = enemies(b);
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i]!;
    p.px = p.x; p.py = p.y; p.pz = p.z;
    const t = p.from ? towers(b).find((q) => q.id === p.from) ?? null : null;
    if (p.kindOf === "siege") {
      const step = p.speed * DT;
      const nx = p.x + p.vx * step, ny = p.y + p.vy * step;
      for (const e of es) {
        if (!hittable(e) || p.hit.includes(e.id)) continue;
        if (segDist(e.x, e.y, p.x, p.y, nx, ny) <= 0.4) {
          p.hit.push(e.id);
          damage(b, e, { amount: p.dmg, type: "phys", tower: t, direct: true, noArmour: true });
          if (p.hit.length >= 3) synergy(b, "Siege line", e.x, e.y);
        }
      }
      p.x = nx; p.y = ny; p.t++;
      p.extra -= step;
      if (p.extra <= 0) p.dur = -1;
      continue;
    }
    if (p.homing) {
      const e = p.target ? es.find((q) => q.id === p.target) : undefined;
      if (e && hittable(e)) { p.tx = e.x; p.ty = e.y; }
      else if (p.target) { if (e) e.pend = Math.max(0, e.pend - p.pendAmt); p.target = 0; }
      const dx = p.tx - p.x, dy = p.ty - p.y, dd = Math.sqrt(dx * dx + dy * dy);
      const step = p.speed * DT;
      if (dd <= step) {
        p.x = p.tx; p.y = p.ty; p.dur = -1;
        if (e && p.target) { e.pend = Math.max(0, e.pend - p.pendAmt); resolveHoming(b, t, e, p); }
      } else { p.x += (dx / dd) * step; p.y += (dy / dd) * step; }
      continue;
    }
    // lobbed
    p.t++;
    const k = Math.min(1, p.t / p.dur);
    p.x = p.sx + (p.tx - p.sx) * k; p.y = p.sy + (p.ty - p.sy) * k;
    p.z = 1.6 * (1 - k) + 4 * k * (1 - k) * (p.kind === "mortar" ? 3 : 1.8);
    if (p.t >= p.dur) { p.dur = -1; resolveLobbed(b, t, p); }
  }
  for (let i = ps.length - 1; i >= 0; i--) if (ps[i]!.dur === -1) ps.splice(i, 1);
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let k = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  k = k < 0 ? 0 : k > 1 ? 1 : k;
  return Math.sqrt(d2(px, py, ax + dx * k, ay + dy * k));
}

function resolveHoming(b: Battle, t: TowerX | null, e: EnemyX, p: ProjX) {
  if (!t) { damage(b, e, { amount: p.dmg, type: p.type, direct: true }); return; }
  const m = X(b).mods, act = ACTS[b.act];
  switch (p.kindOf) {
    case "arrow": {
      const st = stats(t);
      const wasFrozen = e.st.frozen > 0;
      damage(b, e, { amount: p.dmg, type: p.type, tower: t, direct: true, crit: st.crit, critM: st.critM, pierce: st.pierce });
      if (p.flags & 1 && alive(e)) burn(b, e, bv(m, "archer", "pitch-arrows", 6, 8), T(2), t);
      if (wasFrozen && hasB(m, "archer", "glass-arrows")) {
        const r = bv(m, "archer", "glass-arrows", 0.8, 1.0);
        splash(b, e.x, e.y, r, bv(m, "archer", "glass-arrows", 20, 30) * act.spellMul, "phys", t, { air: true, flat: true });
      }
      if (e.brittleT > 0) synergy(b, "Shatterline", e.x, e.y);
      if (e.st.shred > 0) synergy(b, "Sunder", e.x, e.y);
      break;
    }
    case "bolt": mageHit(b, t, e, p); break;
    case "shard": frostHit(b, t, e, p); break;
    case "ballista": ballistaHit(b, t, e, p); break;
    default: damage(b, e, { amount: p.dmg, type: p.type, tower: t, direct: true });
  }
}

function resolveLobbed(b: Battle, t: TowerX | null, p: ProjX) {
  switch (p.kindOf) {
    case "shell": case "bomblet": shellLand(b, t, p); break;
    case "flask": if (t) flaskLand(b, t, p); break;
    case "fireball": if (t) fireballLand(b, t, p); break;
    case "meteor": meteorLand(b, p); break;
  }
}

/** Meteor (spell): fire in r 1.4 + burn, ignites oil; flyers at 50% (R2). */
function meteorLand(b: Battle, p: ProjX) {
  emit(b, p.tx, p.ty, { e: "explode", r: p.splash, source: "meteor", damage: p.dmg });
  const hits = splash(b, p.tx, p.ty, p.splash, p.dmg, "fire", null, { air: true, airMul: 0.5, flat: true, by: -1 });
  for (const e of hits) if (alive(e)) burn(b, e, p.extra, T(3), null);
  for (const z of zones(b)) if (z.oil && !z.lit && d2(z.x, z.y, p.tx, p.ty) <= (z.r + p.splash) * (z.r + p.splash)) lightZone(b, z);
}

/** Spell-made lobbed projectile (Meteor). */
export function spellProjectile(b: Battle, kind: ProjectileKind, x: number, y: number, dmg: number, r: number, delay: number, burnDps: number) {
  proj(b, null, kind, kind, x, y - 0.01, x, y, { dur: Math.max(1, delay), dmg, type: "fire", splash: r, extra: burnDps, z: 12 });
}

/** Called when a tower is built/upgraded/specialised. */
export function onTowerChanged(b: Battle, t: TowerX) {
  if (t.kind === "barracks" || (t.kind === "thornwood" && hasSpec(t, "treant"))) syncSoldiers(b, t);
  if (!t.firstShot) t.firstShot = true;
  t.t1 = 0; t.t2 = 0;
}

export { corrode };
