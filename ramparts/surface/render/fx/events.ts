// Sim events -> instant effects (systems.md 12, art 5.3-5.7). Combat, statuses, towers, soldiers
// and gold here; spells, supplies and bosses in spells.ts.
import type { Battle, BattleEvent, DamageType, Enemy } from "../../../game/types.ts";
import type { Ctx } from "./core.ts";
import type { Dom } from "./dom.ts";
import { C } from "./gl/atlas.ts";
import { D } from "./gl/decals.ts";
import type { RGB } from "./gl/common.ts";
import type { Juice } from "./juice.ts";
import { noteHit, noteSoldierHit, peekState } from "./overlays.ts";
import { ACCENT, BODY, K, KEY, SPARK, SPEC } from "./palette.ts";
import { budget, emit, rnd } from "./particles.ts";
import { P } from "./presets.ts";
import { body, BURST, bodyOf, towerTop } from "./sizes.ts";
import { bossAbility, bossPhase, bossSpawn, bossTelegraph, spellCast, supplyUsed } from "./spells.ts";
import { chunks, column, decal, emitter, flash, healRing, lightning, lightPool, pop, runeStamp, sigil, sparkleEmit, spikes, wave } from "./timed.ts";
import type { Timed } from "./core.ts";

export interface Hub { c: Ctx; dom: Dom; juice: Juice }

const byId = new Map<number, Enemy>();
/** Aura pulses already shown (tower * 8 + level). Cleared per battle. */
export const pulsed = new Set<number>();
const PTS = new Float32Array(48);
/** Boss damage numbers aggregate per source per 250 ms. */
const bossAgg = new Map<number, { v: number; t0: number; x: number; y: number; h: number; type: DamageType; crit: boolean }>();
let shatterTick = -1, shatterN = 0, shatterX = 0, shatterY = 0;

function enemyH(_c: Ctx, id: number): { z: number; h: number } {
  const e = byId.get(id);
  if (e) { const b = bodyOf(e); return { z: Math.max(0, e.z), h: b.h }; }
  const s = peekState(id);
  return s ? { z: s.z, h: s.h } : { z: 0, h: 0.75 };
}

export function handleEvents(hub: Hub, evs: readonly BattleEvent[], b: Battle): void {
  const { c } = hub;
  byId.clear();
  for (const e of b.enemies) byId.set(e.id, e);
  for (const ev of evs) {
    // events from a fast-forward (or a long stall) arrive in one burst: play only the last moment of it
    if (b.tick - ev.tick > 20) continue;
    try { one(hub, ev, b); } catch (err) { console.warn("fx event", ev.e, err); }
  }
  flushShatter(hub);
  flushBoss(hub, c.RT);
}

function one(hub: Hub, ev: BattleEvent, b: Battle): void {
  const { c, dom, juice } = hub;
  const X = c.wx(ev.x), Z = c.wz(ev.y);
  switch (ev.e) {
    case "wave_start": {
      const m = c.map;
      if (m) {
        for (const s of m.spawns) { flash(c, s.x, s.y, 1, 1.2, KEY[c.theme], 1.4, 0.4); wave(c, s.x, s.y, 2.2, KEY[c.theme], 0.4, 0.7, 0.1, 0.4, 0); }
        if (ev.income > 0 && m.exits[0]) dom.coinsAt(c.RT, m.exits[0].x, m.exits[0].y, 0.5, 6, ev.income, 1.2, false);
        if (ev.early && ev.bonus > 0 && m.spawns[0]) dom.coinsAt(c.RT, m.spawns[0].x, m.spawns[0].y, 1.5, Math.min(8, 2 + Math.round(ev.bonus / 10)), ev.bonus, 2);
      }
      break;
    }
    case "spawn": emit(P.dust, 3, X, 0.05, Z, 0.8); break;
    case "shoot": shoot(hub, ev, b); break;
    case "hit": hit(hub, ev); break;
    case "kill": kill(hub, ev); break;
    case "split": {
      const key = KEY[c.theme];
      emit(P.acidSplash, 8, X, 0.35, Z, 1, 0, 0, 0, key);
      wave(c, ev.x, ev.y, 0.7, key, 0.35, 0.3, 0.2, 0.2, 1);
      break;
    }
    case "leak": {
      dom.edgeFlash(c.RT);
      flash(c, ev.x, ev.y, 1.2, 1.6, K.leak, 1.2, 0.25);
      wave(c, ev.x, ev.y, 2.4, K.leak, 0.5, 0.5, 0.1, 0.4, 0);
      juice.shake(ev.left <= 0 ? 0.5 : ev.lives >= 2 ? 0.28 : 0.2);
      if (ev.left <= 0) { juice.hitstop(300, true, true); juice.slow(0.3, 2.2); }
      break;
    }
    case "chill": emit(P.frostMote, 2, X, enemyH(c, ev.id).h * 0.6, Z, 1); break;
    case "freeze": {
      const { z, h } = enemyH(c, ev.id);
      emit(P.ice, 4, X, z + h * 0.4, Z, 0.5);
      emit(P.frostPuff, 3, X, z + 0.1, Z, Math.max(0.6, h));
      flash(c, ev.x, ev.y, z + h * 0.5, 0.3 * Math.max(1, h), K.iceCore, 1.4, 0.1);
      break;
    }
    case "thaw": break; // overlays: drip and steam
    case "numb": wave(c, ev.x, ev.y, 1.0, K.frost, 0.4, 0.35, 0.3, 0.2, 0); break;
    case "shatter": {
      const { z, h } = enemyH(c, ev.id);
      emit(P.ice, 12, X, z + h * 0.5, Z, Math.max(0.8, h));
      flash(c, ev.x, ev.y, z + h * 0.5, 0.55 * Math.max(1, h), K.white, 2.5, 0.05);
      decal(c, D.FROST, ev.x, ev.y, 1.0, K.iceCore, 0.55, 1.6, 0.8, K.frost, 0);
      if (shatterTick !== ev.tick) { flushShatter(hub); shatterTick = ev.tick; shatterN = 0; shatterX = 0; shatterY = 0; }
      shatterN++; shatterX += ev.x; shatterY += ev.y;
      if (ev.chain >= 3) juice.hitstop(ev.chain >= 5 ? 66 : 50);
      if (ev.damage > 0) dom.number(c.RT, ev.x, ev.y, z + h + 0.3, ev.damage, "phys", false);
      break;
    }
    case "ignite": {
      const { z, h } = enemyH(c, ev.id);
      flash(c, ev.x, ev.y, z + h * 0.5, 0.6, K.fire, 2.2, 0.12);
      emit(P.fireball, 4, X, z + h * 0.4, Z, 0.7);
      emit(P.ember, 5, X, z + h * 0.5, Z, 1);
      lightPool(c, ev.x, ev.y, 1.4, K.fire, 0.22, 0.4);
      if (ev.puddle) igniteRing(c, ev.x, ev.y, 1.15);
      break;
    }
    case "explode": explode(hub, ev); break;
    case "burn_tick": if (rnd() < 0.5) emit(P.ember, 1, X, enemyH(c, ev.id).h * 0.6, Z, 1); break;
    case "shield_up": {
      const { z, h } = enemyH(c, ev.id);
      pop(c, C.HEX, ev.x, ev.y, z + h * 0.6, Math.max(0.5, h * 0.9), K.shield, 1.2, 0.3, 0.4);
      wave(c, ev.x, ev.y, 1.1, K.shield, 0.35, 0.4, 0.2, 0.2, 0);
      break;
    }
    case "shield_break": {
      const { z, h } = enemyH(c, ev.id);
      emit(P.hexShard, ev.lightning ? 12 : 8, X, z + h * 0.55, Z, ev.lightning ? 1.3 : 1);
      flash(c, ev.x, ev.y, z + h * 0.55, 0.5, K.shield, ev.lightning ? 2.2 : 1.6, 0.08);
      if (ev.lightning) emit(P.stormSpark, 6, X, z + h * 0.55, Z, 1);
      break;
    }
    case "hex": {
      runeStamp(c, ev.x, ev.y);
      const { z, h } = enemyH(c, ev.id);
      emit(P.hexMote, 5, X, z + h * 0.5, Z, 1);
      break;
    }
    case "mark": {
      const { z, h } = enemyH(c, ev.id);
      pop(c, C.DIAMOND, ev.x, ev.y, z + h + 0.32, 0.5, K.mark, 2, 0.3, 0.3);
      break;
    }
    case "stun": {
      const { z, h } = enemyH(c, ev.id);
      pop(c, C.BURST, ev.x, ev.y, z + h + 0.1, 0.6, K.stun, 1.6, 0.25, 0, false, 2);
      break;
    }
    case "root": {
      spikes(c, ev.x, ev.y, 0.32, 5, 0.42, K.root, 0, 0.9);
      emit(P.thornChip, 4, X, 0.1, Z, 1);
      emit(P.dust, 3, X, 0.05, Z, 0.6);
      break;
    }
    case "pull": {
      emit(P.dust, 6, X, 0.05, Z, 0.8);
      const { z, h } = enemyH(c, ev.id);
      emit(P.sparkBig, 4, X, z + h * 0.5, Z, 0.8);
      break;
    }
    case "grounded": {
      emit(P.dust, 10, X, 0.05, Z, 1.4);
      emit(P.debris, 6, X, 0.1, Z, 1);
      wave(c, ev.x, ev.y, 1.4, K.dust, 0.45, 0.45, 0.2, 0.4, 1);
      break;
    }
    case "reveal": {
      const { z, h } = enemyH(c, ev.id);
      pop(c, C.EYE, ev.x, ev.y, z + h + 0.3, 0.55, K.gold, 1.8, 0.4, 0.3);
      wave(c, ev.x, ev.y, 0.9, K.gold, 0.35, 0.3, 0.2, 0.15, 0);
      break;
    }
    case "chain": chain(hub, ev); break;
    case "cone": cone(hub, ev); break;
    case "nova": {
      const tw = c.tower(ev.tower);
      const glacier = tw?.spec === "glacier";
      decal(c, D.FROST, ev.x, ev.y, ev.r, K.iceCore, 0.26, 0.8, 0.8, K.frost, 0);
      wave(c, ev.x, ev.y, ev.r, K.iceCore, 0.6, 0.4, 0.15, 0.35, 0.3);
      spikes(c, ev.x, ev.y, ev.r * 0.92, glacier ? 22 : 14, glacier ? 0.55 : 0.4, K.ice, 0.5, 0.65);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; emit(P.frostPuff, 1, X + Math.cos(a) * ev.r * 0.9, 0.1, Z + Math.sin(a) * ev.r * 0.9, 1); }
      break;
    }
    case "aura_pulse": {
      const tw = c.tower(ev.tower);
      // buff rings pulse once (per tower and level), then stay off: the pad rim carries the buff
      const key = ev.tower * 8 + (tw?.level ?? 0);
      if (pulsed.has(key)) break;
      pulsed.add(key);
      const col = tw ? (tw.spec ? SPEC[tw.spec] ?? ACCENT[tw.kind] : ACCENT[tw.kind]) : K.gold;
      wave(c, ev.x, ev.y, ev.r, col, 0.11, 0.9, 0.05, 0.5, 0.2);
      break;
    }
    case "block": {
      emit(P.spark, 3, X, 0.45, Z, 0.8);
      emit(P.dust, 2, X, 0.05, Z, 0.5);
      break;
    }
    case "soldier_down": emit(P.dust, 5, X, 0.05, Z, 0.8); noteSoldierHit(ev.soldier, c.T); break;
    case "soldier_respawn": pop(c, C.SPARK, ev.x, ev.y, 0.6, 0.4, K.ourBlue, 1.6, 0.3, 0); break;
    case "heal_pulse": {
      healRing(c, ev.x, ev.y, ev.r, ev.refused > 0);
      if (ev.healed > 0) for (let i = 0; i < 6; i++) { const a = rnd() * Math.PI * 2, r = ev.r * Math.sqrt(rnd()); emit(P.green, 1, X + Math.cos(a) * r, 0.4, Z + Math.sin(a) * r, 1); }
      if (ev.refused > 0) emit(P.hexMote, 6, X, 0.6, Z, 1.2);
      break;
    }
    case "sapper_plant": {
      const tw = c.tower(ev.tower);
      const top = tw ? towerTop(tw.kind, tw.level) : 1.7;
      emit(P.sparkBig, 6, X, top * 0.6, Z, 0.7, 0, 0, 0, K.chip);
      break;
    }
    case "tower_disabled": {
      const tw = c.tower(ev.tower);
      const top = tw ? towerTop(tw.kind, tw.level) : 1.7;
      emit(P.smoke, 6, X, top * 0.5, Z, 1);
      emit(P.sparkBig, 5, X, top * 0.7, Z, 0.8);
      break;
    }
    case "tower_enabled": {
      const tw = c.tower(ev.tower);
      const top = tw ? towerTop(tw.kind, tw.level) : 1.7;
      emit(P.coinGlint, 6, X, top * 0.8, Z, 1);
      break;
    }
    case "summon": {
      sigil(c, ev.x, ev.y, 1.2, K.hex, 1.0, 1.3);
      emit(P.hexMote, 10, X, 0.2, Z, 1.4);
      break;
    }
    case "build": {
      wave(c, ev.x, ev.y, 1.5, K.dust, 0.5, 0.6, 0.3, 0.4, 1);
      emit(P.dust, 10, X, 0.08, Z, 1.2);
      emitter(c, sparkleEmit, 0.52, 0.035, ev.x, ev.y, 0.8, K.gold);
      const f = c.spawn(crownBurst, 0.62, ev.x, ev.y, towerTop(ev.kind, ev.level), 0); f.col = ACCENT[ev.kind];
      break;
    }
    case "upgrade": {
      const top = towerTop(ev.kind, ev.level);
      flash(c, ev.x, ev.y, top * 0.6, 0.9, K.warm, 2, 0.12);
      pop(c, C.HAMMER, ev.x, ev.y, top + 0.5, 0.55, K.gold, 1.6, 0.45, 0.4);
      emit(P.debris, 8, X, top, Z, 1, 0, 0, 0, K.stone);
      const f = c.spawn(ringSweep, 0.6, ev.x, ev.y, top, 0.95); f.col = K.gold;
      emitter(c, sparkleEmit, 0.4, 0.04, ev.x, ev.y, 0.7, K.gold);
      break;
    }
    case "specialise": {
      const top = towerTop(ev.kind, 4);
      const tw = c.tower(ev.tower);
      const col = (tw?.spec && SPEC[tw.spec]) || ACCENT[ev.kind];
      column(c, ev.x, ev.y, 0.3, 6, col, 0.5, 0.9, 1);
      sigil(c, ev.x, ev.y, 1.15, col, 0.9, 1.0);
      flash(c, ev.x, ev.y, top, 0.9, col, 2.4, 0.12);
      emit(P.star, 10, X, top, Z, 1.2, 0, 0, 0, col);
      const f = c.spawn(ringSweep, 0.7, ev.x, ev.y, top, 1.0); f.col = col;
      juice.shake(0.05);
      break;
    }
    case "sell": {
      const top = towerTop(ev.kind, ev.level);
      chunks(c, X, top * 0.6, Z, 10, 0.14, K.stone, K.shaft, 0.7);
      emit(P.dust, 14, X, 0.1, Z, 1.4);
      emit(P.smoke, 4, X, top * 0.3, Z, 1);
      if (ev.gold > 0) dom.coinsAt(c.RT, ev.x, ev.y, top * 0.6, Math.min(6, 2 + Math.round(ev.gold / 40)), ev.gold, 1.4);
      break;
    }
    case "spell_cast": spellCast(hub, ev, b); break;
    case "supply_used": supplyUsed(hub, ev, b); break;
    case "boss_spawn": bossSpawn(hub, ev); break;
    case "boss_telegraph": bossTelegraph(hub, ev); break;
    case "boss_ability": bossAbility(hub, ev, b); break;
    case "boss_phase": bossPhase(hub, ev); break;
    case "boss_lap": {
      flash(c, ev.x, ev.y, 1.5, 2, K.leak, 1.4, 0.3);
      juice.shake(0.3);
      dom.edgeFlash(c.RT);
      break;
    }
    case "victory": juice.slow(0.4, 1.6); break;
    case "defeat": juice.slow(0.3, 2.2); break;
    default: break;   // wave_spawned, lives_low, deny, synergy_first, spell_ready, gold, pressure: HUD and audio
  }
}

// ---------------------------------------------------------------- shoot (muzzle)
function shoot(hub: Hub, ev: Extract<BattleEvent, { e: "shoot" }>, _b: Battle): void {
  const { c } = hub;
  const tw = c.tower(ev.tower);
  const top = tw ? towerTop(tw.kind, tw.level) : towerTop(ev.kind, 1);
  const X = c.wx(ev.x), Z = c.wz(ev.y);
  const dx = ev.tx - ev.x, dy = ev.ty - ev.y, dl = Math.hypot(dx, dy) || 1;
  const mx = X + (dx / dl) * 0.35, mz = Z + (dy / dl) * 0.35;
  switch (ev.kind) {
    case "bombard": {
      emit(P.smoke, 2, mx, top * 0.85, mz, 0.6);
      pop(c, C.GLOW, ev.x + (dx / dl) * 0.35, ev.y + (dy / dl) * 0.35, top * 0.85, 0.5, K.fireCore, 2.2, 0.06);
      break;
    }
    case "mage": pop(c, C.GLOW, ev.x, ev.y, top + 0.35, 0.5, ev.spec === "hexer" ? K.hex : K.violetCore, 2, 0.12); break;
    case "storm": pop(c, C.GLOW, ev.x, ev.y, top + 0.25, 0.6, ev.spec === "overload" ? K.overload : K.storm, 2.6, 0.08); break;
    case "frost": decal(c, D.FROST, ev.x, ev.y, 0.9, K.iceCore, 0.3, 0.5, 0.8, K.frost, 0); break;
    case "ballista": emit(P.dust, 3, X, 0.1, Z, 0.8); break;
    case "beacon": {
      const e = byId.get(ev.target);
      const th = e ? bodyOf(e).h * 0.7 + Math.max(0, e.z) : 0.6;
      const f = c.spawn(beamFn, 0.2, ev.x, ev.y, top * 0.9, 0);
      f.a = ev.tx; f.b = ev.ty; f.c = th; f.col = K.fireHot;
      break;
    }
    case "thornwood": {
      const f = c.spawn(bulgeFn, 0.35, ev.x, ev.y, 0, 0);
      f.a = ev.tx; f.b = ev.ty;
      break;
    }
    case "archer": if (ev.spec === "volley") emit(P.ember, 2, X, top, Z, 0.6); break;
    default: break;
  }
}

/** Beacon marking beam: soft gold, 40%, 200 ms. */
function beamFn(c: Ctx, f: Timed, t: number): void {
  const a = 0.4 * (1 - t);
  c.lines.seg(c.wx(f.x), f.z, c.wz(f.y), c.wx(f.a), f.c, c.wz(f.b), 0.12, 3, 1, 0, f.col[0] * 1.2, f.col[1] * 1.2, f.col[2] * 1.2, a);
}
/** Thornwood: a ground bulge line running from the tower to the target. */
function bulgeFn(c: Ctx, f: Timed, t: number): void {
  if (c.dt > 0 && rnd() < 0.8) {
    const u = Math.min(1, t * 1.1);
    const x = f.x + (f.a - f.x) * u, y = f.y + (f.b - f.y) * u;
    emit(P.dust, 1, c.wx(x), 0.04, c.wz(y), 0.45);
    if (rnd() < 0.3) emit(P.thornChip, 1, c.wx(x), 0.05, c.wz(y), 0.6);
  }
}

// ---------------------------------------------------------------- hit
function hit(hub: Hub, ev: Extract<BattleEvent, { e: "hit" }>): void {
  const { c, dom, juice } = hub;
  const e = byId.get(ev.target) ?? null;
  const fresh = noteHit(c, ev.target, e, ev.shield, ev.big || ev.crit);
  const { z, h } = enemyH(c, ev.target);
  const X = c.wx(ev.x), Z = c.wz(ev.y), Y = z + h * 0.55;
  if (fresh) {
    emit(P.spark, ev.big ? 4 : 3, X, Y, Z, ev.big ? 1.2 : 0.8, 0, 0, 0, SPARK[ev.type]);
    if (e && e.st.hexed > 0) emit(P.magic, 2, X, Y, Z, 0.6, 0, 0, 0, K.hex);
    if (e && e.armour > 0 && ev.type === "phys" && rnd() < 0.5) emit(P.spark, 2, X, Y, Z, 1, 0, 0, 0, K.steel);
  }
  if (ev.shield > 0) {
    const s = peekState(ev.target); if (s) s.shieldHit = c.T;
  }
  if (ev.crit) {
    pop(c, C.SPARK, ev.x, ev.y, Y + 0.1, 0.45 + Math.min(0.4, (ev.mult - 1.5) * 0.15), K.gold, 2.6, 0.22, 0, false, 3);
    const s = peekState(ev.target); if (s) s.markFlash = c.T;
    if (ev.mult >= 3.5) { juice.hitstop(66); pop(c, C.BURST, ev.x, ev.y, Y + 0.1, 0.9, K.white, 2.2, 0.15); }
  }
  // numbers: crits, single hits >= 25% max hp, boss hits aggregated per source per 250 ms
  const boss = e?.boss != null;
  if (boss) {
    const key = ev.target * 4096 + (ev.tower & 4095);
    let a = bossAgg.get(key);
    if (!a) { a = { v: 0, t0: c.RT, x: ev.x, y: ev.y, h: z + h + 0.4, type: ev.type, crit: false }; bossAgg.set(key, a); }
    a.v += ev.amount; a.crit ||= ev.crit; a.x = ev.x; a.y = ev.y;
  } else if (ev.crit || (ev.big && !splashTower(c, ev.tower))) {
    dom.number(c.RT, ev.x, ev.y, z + h + 0.3, ev.amount, ev.type, ev.crit);
  }
}

/** Hits from splash and area towers show as the explosion's total, not one number each. */
function splashTower(c: Ctx, id: number): boolean {
  if (!id) return true;
  const k = c.tower(id)?.kind;
  return k === "bombard" || k === "alchemist" || k === "pyre" || k === "storm";
}

function flushBoss(hub: Hub, RT: number): void {
  for (const [k, a] of bossAgg) {
    if (RT - a.t0 < 0.25) continue;
    hub.dom.number(RT, a.x, a.y, a.h, a.v, a.type, a.crit);
    bossAgg.delete(k);
  }
}

function flushShatter(hub: Hub): void {
  if (shatterN > 1) {
    const x = shatterX / shatterN, y = shatterY / shatterN;
    wave(hub.c, x, y, 1.2 + shatterN * 0.35, K.white, 0.55, 0.45, 0.1, 0.25, 0);
    if (shatterN >= 5) hub.juice.hitstop(40);
  }
  shatterN = 0;
}

// ---------------------------------------------------------------- kill
function kill(hub: Hub, ev: Extract<BattleEvent, { e: "kill" }>): void {
  const { c, dom, juice } = hub;
  const bd = body(ev.kind);
  const st = peekState(ev.id);
  const z = st?.z ?? (bd.flyer ? 1.4 : 0);
  const h = (st?.h ?? bd.h) * (ev.elite ? 1.15 : 1);
  const X = c.wx(ev.x), Z = c.wz(ev.y), Y = z + h * 0.5;
  const sc = BURST[bd.cls] * (ev.elite ? 1.3 : 1);
  // fewer chunks for small bodies and in crowds, so a dead swarm is a puff, not a carpet
  const n = Math.max(2, Math.round(Math.min(12, 2 + 3 * sc) * budget.scale));
  chunks(c, X, Y, Z, ev.boss ? 22 : n, 0.07 * Math.sqrt(sc) + 0.03, BODY[c.theme], KEY[c.theme], Math.sqrt(sc));
  emit(P.dust, Math.round(2 + sc * 1.5), X, 0.08, Z, Math.min(2, 0.7 + sc * 0.3));
  emit(P.wisp, 1, X, Y, Z, Math.min(2, sc), 0, 0, 0, KEY[c.theme]);
  if (bd.flyer) emit(P.smoke, 2, X, Y, Z, 0.8);
  if (ev.elite || ev.boss) {
    wave(c, ev.x, ev.y, ev.boss ? 4 : 2, K.gold, 0.7, 0.55, 0.1, 0.3, 0);
    emit(P.star, ev.boss ? 20 : 8, X, Y + h * 0.3, Z, ev.boss ? 2 : 1.2);
    flash(c, ev.x, ev.y, Y, ev.boss ? 2.5 : 1, K.warm, 2.6, 0.12);
  }
  if (ev.boss) {
    juice.hitstop(220, true, true); juice.shake(0.6); juice.slow(0.35, 1.4);
    decal(c, D.SCORCH, ev.x, ev.y, 3, K.scorch, 0.4, 6, 1);
    emit(P.smoke, 14, X, 0.4, Z, 2.4);
  } else if (ev.elite) juice.hitstop(50);
  if (ev.bounty > 0) dom.coinsAt(c.RT, ev.x, ev.y, Y, ev.bounty <= 5 ? 1 : ev.bounty <= 12 ? 2 : ev.boss ? 8 : 3, ev.bounty, ev.boss ? 2 : 1);
}

// ---------------------------------------------------------------- explosions
function explode(hub: Hub, ev: Extract<BattleEvent, { e: "explode" }>): void {
  const { c, dom, juice } = hub;
  const X = c.wx(ev.x), Z = c.wz(ev.y), r = Math.max(0.5, ev.r);
  const src = ev.source;
  const big = src === "mortar" || src === "meteor" || src === "heavy" || src === "naphtha";
  const fire = src === "naphtha" || src === "meteor" || src === "firebomb" || src === "fireball";
  // 0-120 ms flash core, radius 0.4x splash
  flash(c, ev.x, ev.y, 0.45, r * 0.4 + 0.2, K.warm, 3, 0.12);
  // fireball billboards (10-16) and smoke that lingers below units
  emit(P.fireball, Math.round(8 + r * 3), X, 0.35, Z, Math.min(1.8, 0.6 + r * 0.35));
  emit(P.smoke, Math.round(4 + r * 2), X, 0.3, Z, Math.min(2.2, 0.7 + r * 0.4));
  emit(P.debris, 6, X, 0.2, Z, Math.min(1.5, 0.6 + r * 0.3));
  emit(P.sparkBig, 5, X, 0.4, Z, 1);
  // the dust ring at the splash radius shows the real hit area
  wave(c, ev.x, ev.y, r, K.dust, 0.55, 0.5, 0.25, 0.35, 1);
  decal(c, big ? D.CRATER : D.SCORCH, ev.x, ev.y, r * (big ? 0.75 : 0.65), K.scorch, big ? 0.4 : 0.28, 4, 1, K.char, 0.6);
  lightPool(c, ev.x, ev.y, r * 1.4, K.fire, 0.25, 0.3);
  if (src === "shrapnel") emit(P.spark, 6, X, 0.35, Z, 1.6, 0, 0, 0, K.steel);
  if (fire) { emit(P.flame, 8, X, 0.1, Z, Math.min(2, r)); emit(P.ember, 8, X, 0.3, Z, 1.4); }
  juice.shake(src === "mortar" ? 0.12 : src === "meteor" ? 0.2 : src === "naphtha" ? 0.1 : 0.08);
  if (ev.damage > 0 && (big || ev.damage >= 60)) dom.number(c.RT, ev.x, ev.y, 1.2, ev.damage, fire ? "fire" : "phys", false);
}

/** Flame racing round a lit puddle's edge (200 ms), then a low flame field. */
function igniteRing(c: Ctx, x: number, y: number, r: number): void {
  const f = c.spawn(igniteFn, 0.22, x, y, 0, r);
  f.e = 0;
}
function igniteFn(c: Ctx, f: Timed, t: number): void {
  const a0 = f.e, a1 = t * Math.PI * 2;
  for (let a = a0; a < a1; a += 0.35) {
    emit(P.flame, 1, c.wx(f.x) + Math.cos(a) * f.r, 0.05, c.wz(f.y) + Math.sin(a) * f.r, 1);
    emit(P.flame, 1, c.wx(f.x) + Math.cos(-a) * f.r, 0.05, c.wz(f.y) + Math.sin(-a) * f.r, 1);
  }
  f.e = a1;
}

// ---------------------------------------------------------------- lightning and flame
function chain(hub: Hub, ev: Extract<BattleEvent, { e: "chain" }>): void {
  const { c } = hub;
  const tw = c.tower(ev.tower);
  const overload = tw?.spec === "overload", arc = tw?.kind === "mage";
  const col: RGB = arc ? [0.78, 0.7, 1] : overload ? K.overload : K.storm;
  let n = 0;
  const top = tw ? towerTop(tw.kind, tw.level) + 0.2 : 2.4;
  const pts = ev.pts;
  // the sim's path starts at the tower when it has one more point than targets
  const startsAtTower = pts.length > ev.ids.length;
  if (!startsAtTower && tw) { PTS[0] = c.wx(c.tx(tw)); PTS[1] = top; PTS[2] = c.wz(c.ty(tw)); n = 1; }
  for (let i = 0; i < pts.length && n < 16; i++) {
    const id = startsAtTower ? ev.ids[i - 1] : ev.ids[i];
    let y = top;
    if (!(startsAtTower && i === 0)) { const { z, h } = enemyH(c, id); y = z + h * 0.55; }
    PTS[n * 3] = c.wx(pts[i].x); PTS[n * 3 + 1] = y; PTS[n * 3 + 2] = c.wz(pts[i].y);
    n++;
  }
  lightning(c, PTS, n, col, arc ? 0.7 : overload ? 1.3 : 1, arc ? 0.14 : 0.2);
  for (let i = 1; i < n; i++) {
    emit(P.stormSpark, 4, PTS[i * 3], PTS[i * 3 + 1], PTS[i * 3 + 2], 0.8, 0, 0, 0, arc ? K.violetCore : K.stormCore);
    pop(c, C.GLOW, PTS[i * 3] - c.ox, PTS[i * 3 + 2] - c.oz, PTS[i * 3 + 1], 0.45, col, 2.5, 0.1);
  }
}

function cone(hub: Hub, ev: Extract<BattleEvent, { e: "cone" }>): void {
  const { c } = hub;
  const tw = c.tower(ev.tower);
  const top = tw ? towerTop(tw.kind, tw.level) * 0.6 : 1;
  const l = Math.hypot(ev.dx, ev.dy) || 1, dx = ev.dx / l, dy = ev.dy / l;
  const X = c.wx(ev.x) + dx * 0.4, Z = c.wz(ev.y) + dy * 0.4;
  const spd = ev.r / 0.32;
  const blue = tw?.spec === "firestorm";
  P.coneFlame.speed[0] = spd * 0.75; P.coneFlame.speed[1] = spd * 1.05;
  emit(P.coneFlame, 9, X, top, Z, 1, dx, -top / (ev.r * 1.3), dy);
  if (blue) emit(P.coneFlame, 3, X, top, Z, 0.6, dx, -top / (ev.r * 1.3), dy, K.frost);
  emit(P.coneSmoke, 1, X + dx * ev.r * 0.6, 0.3, Z + dy * ev.r * 0.6, 1, dx, 0.2, dy);
  lightPool(c, ev.x + dx * ev.r * 0.5, ev.y + dy * ev.r * 0.5, ev.r * 0.7, K.fire, 0.16, 0.25);
}

// ---------------------------------------------------------------- tower build helpers
function crownBurst(c: Ctx, f: Timed, t: number): void {
  if (t > 0.84 && f.e === 0) {
    f.e = 1;
    emit(P.star, 8, c.wx(f.x), f.z, c.wz(f.y), 0.9, 0, 0, 0, K.gold);
    flash(c, f.x, f.y, f.z, 0.4, K.gold, 2, 0.1);
  }
}
/** A gold ring sweeping up the tower body (upgrade, specialise). */
function ringSweep(c: Ctx, f: Timed, t: number): void {
  const h = f.z * (0.1 + 0.95 * t);
  const a = t < 0.8 ? 0.9 : 0.9 * (1 - (t - 0.8) / 0.2);
  c.ground.add(c.wx(f.x), h, c.wz(f.y), f.r, f.r, D.RING, 0, f.col[0] * 1.5, f.col[1] * 1.5, f.col[2] * 1.5, a, 0, 0.09, 0, 0, 0, 0, 0, 0, 0);
}

