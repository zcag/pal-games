// The damage formula (systems 4.3, R12/R15/R19) and every status applier (systems 5, R9).
import type { Battle, DamageType } from "../types.ts";
import { ACTS, fireTakenMul } from "../content/battle/acts.ts";
import { ENEMIES } from "../content/battle/enemies.ts";
import { bv, has, hasB } from "./mods.ts";
import {
  T, X, emit, hittable, roll, soldiers, synergy, zones, d2, type EnemyX, type TowerX,
} from "./internal.ts";
import { bossPhaseCheck } from "./bosses.ts";

export interface Hit {
  amount: number;
  type: DamageType;
  tower?: TowerX | null;
  /** Projectile or melee strike on its own target: may crit (systems 4.5). */
  direct?: boolean;
  /** Extra damage-dealt fraction from conditions the caller knows (heat, conductive...). */
  dealt?: number;
  crit?: number;
  critM?: number;
  pierce?: number;
  /** Splash, cone, puddle, patch or burn (Bait). */
  area?: boolean;
  lightning?: boolean;
  dot?: boolean;
  noArmour?: boolean;
  /** Ignite's own hit (does not ignite again). */
  ignite?: boolean;
  /** Who gets the credit when no tower (spell, supply, relic). */
  by?: number;
}

const HARD_CC_IMMUNE = 30; // R9: 1 s after any hard CC

/** Total damage-taken pool on an enemy for a hit of this type (systems 4.4). */
export function takenPool(b: Battle, e: EnemyX, type: DamageType, area: boolean): number {
  const st = e.st, m = X(b).mods;
  let t = 0;
  if (st.hexed > 0) t += st.hexPct / 100;
  if (st.marked > 0) t += st.markPct / 100;
  if (type === "phys" && e.brittleT > 0) t += 0.5;
  if (st.frozen > 0 && has(m, "black-ice")) t += 0.25;
  if (area && e.heldBy) {
    const s = soldiers(b).find((q) => q.id === e.heldBy);
    if (s && s.tower) {
      const tw = b.towers.find((q) => q.id === s.tower);
      if (tw && tw.kind === "barracks") t += bv(m, "barracks", "bait", 0.30, 0.40);
    }
  }
  if (e.scorchPct > 0 && (st.burnT > 0 || e.burns.length)) t += e.scorchPct;
  if (st.root > 0 && e.rootPct > 0) t += e.rootPct;
  if (type === "fire" && st.oiled > 0 && has(m, "volatile")) t += 0.15;
  const cap = e.hexerT > 0 ? 1.5 : 1.0;
  return Math.min(cap, t);
}

/** Expected post-resist damage (no crit), for the overkill guard. */
export function expected(b: Battle, e: EnemyX, amount: number, type: DamageType, pierce = 0, wardIgnore = 0): number {
  return amount * resistMul(b, e, type, pierce, wardIgnore, false) * (1 + takenPool(b, e, type, false));
}

function resistMul(b: Battle, e: EnemyX, type: DamageType, pierce: number, wardIgnore: number, noArmour: boolean): number {
  const m = X(b).mods;
  if (type === "phys") {
    if (noArmour || (e.st.frozen > 0 && has(m, "cold-iron"))) return 1;
    const eff = Math.max(0, e.armour - 5 * e.st.shred) * (1 - Math.min(100, pierce) / 100);
    return 1 - Math.min(80, eff) / 100;
  }
  if (type === "magic") {
    const awl = has(m, "armourers-awl") ? 5 * e.st.shred : 0;
    const eff = Math.max(0, e.ward - 5 * e.st.corrode - awl - wardIgnore);
    return 1 - Math.min(80, eff) / 100;
  }
  if (type === "fire") return (has(m, "dragonglass") ? 1 : 1 - e.fireproof / 100) * fireTakenMul(b.act);
  return 1;
}

/** Apply one hit. Returns the damage dealt to shields + HP. */
export function damage(b: Battle, e: EnemyX, h: Hit): number {
  if (!hittable(e) || h.amount <= 0) return 0;
  if (e.boss && e.boss.invuln > 0) return 0;
  const x = X(b), m = x.mods, tw = h.tower ?? null;
  // 1. dealt
  let dealt = h.dealt ?? 0;
  if (tw) {
    dealt += m.t[tw.kind].dealt + tw.dealt;
    if (e.boss) dealt += bv(m, tw.kind, "steadfast", 0.25, 0.40);
    if (e.stealth && e.st.revealed > 0) dealt += bv(m, tw.kind, "watchful", 0, 0.10);
  }
  let raw = h.amount * (1 + dealt);
  // 2. crit (direct hits only)
  let crit = false, mult = 1;
  if (h.direct) {
    const marked = e.st.marked > 0;
    let chance = (h.crit ?? 0) + (tw ? m.t[tw.kind].critC + tw.critAdd : 0);
    if (marked) chance += 20 + huntersMoon(b);
    chance = Math.min(75, chance);
    if (chance > 0 && roll(b) * 100 < chance) {
      crit = true;
      mult = h.critM ?? 2;
      if (marked) {
        if (tw?.spec === "marksmen" || tw?.spec2 === "marksmen") { mult = Math.max(mult, 3.5); synergy(b, "Deadeye", e.x, e.y); }
        if (huntersMoon(b) > 0) mult = Math.max(mult, 2.5);
        if (has(m, "deadeyes-oath")) mult = Math.max(mult, 5);
      }
      raw *= mult;
    }
  }
  // 3. resist
  const pierce = (h.pierce ?? 0) + (tw ? m.t[tw.kind].pierce : 0);
  const wardIgnore = tw ? m.t[tw.kind].wardIgnore : 0;
  raw *= resistMul(b, e, h.type, pierce, wardIgnore, !!h.noArmour);
  // 4. taken
  raw *= 1 + takenPool(b, e, h.type, !!h.area);
  // 5. shields: the Colossus's ice armour first (fire x2, lightning x3), then a granted shield (lightning x3)
  let left = raw, absorbed = 0;
  const bs = e.boss;
  if (bs && bs.iceShield > 0 && left > 0) {
    const k = h.lightning ? 3 : h.type === "fire" ? 2 : 1;
    const pts = left * k;
    if (pts < bs.iceShield) { bs.iceShield -= pts; absorbed += left; left = 0; }
    else { absorbed += bs.iceShield / k; left -= bs.iceShield / k; bs.iceShield = 0; emit(b, e.x, e.y, { e: "shield_break", id: e.id, lightning: !!h.lightning }); if (e.boss2) e.boss2.iceRegrow = T(20); }
    if (h.lightning) synergy(b, "Overcharge", e.x, e.y);
  }
  if (e.shield > 0 && left > 0) {
    const k = h.lightning ? 3 : 1;
    const pts = left * k;
    if (pts < e.shield) { e.shield -= pts; absorbed += left; left = 0; }
    else { absorbed += e.shield / k; left -= e.shield / k; e.shield = 0; emit(b, e.x, e.y, { e: "shield_break", id: e.id, lightning: !!h.lightning }); }
    if (h.lightning) synergy(b, "Overcharge", e.x, e.y);
  }
  // 6. HP
  const hp0 = e.hp;
  e.hp -= left;
  const dealtTotal = absorbed + Math.min(hp0, left);
  e.regenIdle = 0;
  if (e.stealth) e.st.revealed = Math.max(e.st.revealed, T(1.5));
  if (tw) {
    e.lastBy = tw.id;
    tw.stats.damage += dealtTotal;
    b.stats.damageBy[tw.kind] = (b.stats.damageBy[tw.kind] ?? 0) + dealtTotal;
  } else if (h.by) e.lastBy = h.by;
  if (raw > b.stats.biggestHit) b.stats.biggestHit = raw;
  const big = crit || raw >= 100 * ACTS[b.act].hpMul;
  emit(b, e.x, e.y, { e: "hit", target: e.id, amount: raw, type: h.type, crit, mult, shield: absorbed, big, tower: tw?.id ?? 0 });
  if (e.boss) bossPhaseCheck(b, e);
  // fire and ice cancel (systems 5.3); oil and fire ignite (5.5)
  if (h.type === "fire") {
    if (e.st.frozen > 0) { thawNow(b, e); synergy(b, "Fire and ice", e.x, e.y); }
    e.st.chill = Math.max(0, e.st.chill - 30);
    const oiled = e.st.oiled > 0 || (has(m, "tidewater-vial") && e.st.chill > 0);
    if (!h.ignite && oiled && e.hp > 0) ignite(b, e, tw);
  }
  if (e.hp <= 0 && !e.dead) kill(b, e, tw?.id ?? h.by ?? 0);
  return dealtTotal;
}

function huntersMoon(b: Battle): number {
  const m = X(b).mods;
  return bv(m, "beacon", "hunters-moon", 10, 15);
}

export function kill(b: Battle, e: EnemyX, by: number) {
  e.dead = true;
  e.heldBy = 0;
  X(b).deathQ.push(e.id);
  e.killedBy = by;
}

// ---------------------------------------------------------------- statuses
export function thawNow(b: Battle, e: EnemyX) {
  e.st.frozen = 0;
  e.st.thaw = T(3);
  e.st.stunImmune = Math.max(e.st.stunImmune, HARD_CC_IMMUNE);
  emit(b, e.x, e.y, { e: "thaw", id: e.id });
}

const immune = (e: EnemyX) => e.st.stunImmune > 0;

export interface ChillSrc { tower?: TowerX | null; freeze?: number; brittle?: number; shatterPct?: number; markS?: number; markPct?: number; hold?: number }

/** Add chill; a full meter freezes (elites and bosses go Numb). */
export function chill(b: Battle, e: EnemyX, amount: number, src: ChillSrc = {}) {
  if (!hittable(e) || e.noChill || amount <= 0) return;
  if (e.st.frozen > 0 || e.st.thaw > 0) return;
  if (e.kind === "colossus" && !e.boss) return;
  const mul = b.act === 3 ? 0.75 : b.act === 4 ? 1.25 : 1;
  e.st.chill += amount * mul;
  e.chillIdle = 0;
  e.chillHold = src.hold ?? T(1.5);
  emit(b, e.x, e.y, { e: "chill", id: e.id });
  if (e.st.chill >= e.freezeAt) {
    if (e.elite || e.boss) numb(b, e);
    else freeze(b, e, src.freeze ?? T(1.5), src);
  }
}

export function numb(b: Battle, e: EnemyX, ticks = T(2)) {
  e.st.chill = 0;
  e.st.numb = Math.max(e.st.numb, ticks);
  emit(b, e.x, e.y, { e: "numb", id: e.id });
}

/** Freeze for `ticks` (respects Thawing and the hard-CC window). */
export function freeze(b: Battle, e: EnemyX, ticks: number, src: ChillSrc = {}): boolean {
  if (!hittable(e)) return false;
  if (e.elite || e.boss) { numb(b, e, e.boss ? Math.min(ticks, T(3)) : T(2)); return false; }
  if (e.st.thaw > 0 || immune(e) || e.noChill) return false;
  e.st.frozen = ticks;
  e.st.chill = 0;
  e.st.burnDps = 0; e.st.burnT = 0; e.burns.length = 0;
  e.frozenBy = src.tower?.id ?? 0;
  if (src.brittle) { e.brittleT = ticks + src.brittle; e.shatterPct = Math.max(e.shatterPct, src.shatterPct ?? 0.25); }
  if (src.markS) mark(b, e, ticks + src.markS, src.markPct ?? 10, src.tower ?? null);
  emit(b, e.x, e.y, { e: "freeze", id: e.id });
  return true;
}

export function stun(b: Battle, e: EnemyX, ticks: number): boolean {
  if (!hittable(e) || e.kind === "juggernaut" || immune(e)) return false;
  if (e.boss) ticks = Math.max(T(0.2), Math.round(ticks * 0.25));
  e.st.stun = Math.max(e.st.stun, ticks);
  if (e.channel > 0) { e.channel = 0; e.abilT = T(7); }
  emit(b, e.x, e.y, { e: "stun", id: e.id });
  return true;
}

/** Stun with an exact duration (bosses already scaled by the caller). */
export function stunExact(b: Battle, e: EnemyX, ticks: number): boolean {
  if (!hittable(e) || e.kind === "juggernaut" || immune(e)) return false;
  e.st.stun = Math.max(e.st.stun, ticks);
  if (e.channel > 0) { e.channel = 0; e.abilT = T(7); }
  emit(b, e.x, e.y, { e: "stun", id: e.id });
  return true;
}

export function rootable(e: EnemyX): boolean {
  return hittable(e) && !e.air && !e.boss && e.kind !== "juggernaut" && e.st.rootImmune <= 0 && !immune(e) && e.st.root <= 0 && ENEMIES[e.kind].speed > 0;
}

export function root(b: Battle, e: EnemyX, ticks: number, src: TowerX | null = null, pct = 0): boolean {
  if (!rootable(e)) return false;
  e.st.root = ticks;
  e.rootedBy = src?.id ?? 0;
  e.rootPct = pct;
  emit(b, e.x, e.y, { e: "root", id: e.id });
  return true;
}

export function slow(e: EnemyX, pct: number, ticks: number) {
  if (e.st.slowT <= 0 || pct >= e.st.slow) { e.st.slow = pct; e.st.slowT = Math.max(ticks, pct === e.st.slow ? e.st.slowT : 0); }
}

export function hex(b: Battle, e: EnemyX, ticks: number, pct: number, tw: TowerX | null, hexer = false) {
  if (!hittable(e)) return;
  const fresh = e.st.hexed <= 0;
  e.st.hexed = Math.max(e.st.hexed, ticks);
  e.st.hexPct = fresh ? pct : Math.max(e.st.hexPct, pct);
  if (hexer) e.hexerT = Math.max(e.hexerT, ticks);
  if (fresh) {
    if (e.shield > 0) e.shield /= 2;
    if (e.boss && e.boss.iceShield > 0) e.boss.iceShield /= 2;
    emit(b, e.x, e.y, { e: "hex", id: e.id });
  }
  if (tw && hexer) synergy(b, "The Curse", e.x, e.y);
}

export function mark(b: Battle, e: EnemyX, ticks: number, pct: number, tw: TowerX | null) {
  if (!hittable(e)) return;
  const fresh = e.st.marked <= 0;
  e.st.marked = Math.max(e.st.marked, ticks);
  e.st.markPct = fresh ? pct : Math.max(e.st.markPct, pct);
  if (tw) e.markBy = tw.id;
  if (has(X(b).mods, "prism-lens") && tw?.kind === "beacon") hex(b, e, ticks, 20, tw);
  if (fresh) emit(b, e.x, e.y, { e: "mark", id: e.id });
}

export function shred(e: EnemyX, n: number, cap = 6) {
  const cur = e.st.shred;
  e.st.shred = cur >= cap ? cur : Math.min(cap, cur + n);
  e.st.shredT = T(6);
}

export function corrode(e: EnemyX, n: number, cap = 6) {
  const cur = e.st.corrode;
  e.st.corrode = cur >= cap ? cur : Math.min(cap, cur + n);
  e.st.shredT = T(6);
}

/** One burn per enemy: max dps, max remaining (Wildfire Crown: up to 3 sources add). */
export function burn(b: Battle, e: EnemyX, dps: number, ticks: number, tw: TowerX | null) {
  if (!hittable(e) || dps <= 0 || e.st.frozen > 0) return;
  const m = X(b).mods;
  if (tw && hasB(m, "pyre", "scorching") && tw.kind === "pyre") e.scorchPct = Math.max(e.scorchPct, bv(m, "pyre", "scorching", 0.10, 0.15));
  if (has(m, "wildfire-crown")) {
    const src = tw?.id ?? 0;
    const cur = e.burns.find((q) => q.src === src);
    if (cur) { cur.dps = Math.max(cur.dps, dps); cur.t = Math.max(cur.t, ticks); }
    else { e.burns.push({ dps, t: ticks, src }); e.burns.sort((p, q) => q.dps - p.dps); if (e.burns.length > 3) e.burns.length = 3; }
    e.st.burnDps = e.burns.reduce((s, q) => s + q.dps, 0);
    e.st.burnT = Math.max(...e.burns.map((q) => q.t));
  } else {
    e.st.burnDps = Math.max(e.st.burnDps, dps);
    e.st.burnT = Math.max(e.st.burnT, ticks);
    e.burnSrc = tw?.id ?? e.burnSrc;
  }
  if (e.burnAcc <= 0) e.burnAcc = T(0.5);
}

/** Oil + fire: 60 fire, burn 20 dps 4 s, and the puddle it stands in catches (systems 5.5). */
export function ignite(b: Battle, e: EnemyX, tw: TowerX | null) {
  e.st.oiled = 0;
  if (has(X(b).mods, "tidewater-vial")) e.st.chill = 0;
  let puddle = false;
  for (const z of zones(b)) if (z.oil && !z.lit && d2(z.x, z.y, e.x, e.y) <= z.r * z.r) { if (z.lightAt < 0) z.lightAt = b.tick + 1; puddle = true; }
  emit(b, e.x, e.y, { e: "ignite", id: e.id, puddle });
  synergy(b, "Wildfire", e.x, e.y);
  damage(b, e, { amount: 60, type: "fire", tower: tw, area: true, ignite: true });
  burn(b, e, 20, T(4), tw);
}

/** Disable a tower (sapper, vengeful, boss abilities); Iron Shutters and Brave Hearts cap it. */
export function disableTower(b: Battle, t: TowerX, ticks: number, _why: string) {
  const m = X(b).mods;
  if (has(m, "iron-shutters")) ticks = Math.min(ticks, T(2));
  if (t.braveHearts > 0) ticks = Math.min(ticks, t.braveHearts);
  if (ticks <= t.disabled) return;
  t.disabled = ticks;
  emit(b, t.x, t.y, { e: "tower_disabled", tower: t.id, ticks });
}
