// Commander spells (art 5.8, each keeps one colour), war supplies (R20) and boss moments
// (art 3.4, 5.6): spawn roars, telegraph pops, ability impacts, phase shockwaves.
import type { Battle, BattleEvent } from "../../../game/types.ts";
import type { Ctx, Timed } from "./core.ts";
import type { Hub } from "./events.ts";
import { C } from "./gl/atlas.ts";
import { D } from "./gl/decals.ts";
import { easeInCubic } from "./gl/common.ts";
import { BOSS, K, SPELL, SUPPLY } from "./palette.ts";
import { emit, rnd } from "./particles.ts";
import { P } from "./presets.ts";
import { sawMeteor } from "./projectiles.ts";
import { bodyOf, towerTop } from "./sizes.ts";
import { column, decal, emitter, flameEmit, flash, lightPool, pop, sigil, skyBeam, sparkleEmit, spikes, wave } from "./timed.ts";

type Ev<N extends BattleEvent["e"]> = Extract<BattleEvent, { e: N }>;

// ---------------------------------------------------------------- spells
export function spellCast(hub: Hub, ev: Ev<"spell_cast">, b: Battle): void {
  const { c, dom, juice } = hub;
  const col = SPELL[ev.spell];
  const X = c.wx(ev.x), Z = c.wz(ev.y), r = ev.r || 1.4;
  switch (ev.spell) {
    case "meteor": {
      // 1 s warning circle, then the fall (the sim's explode event does the impact)
      const f = c.spawn(warnFn, 1.0, ev.x, ev.y, 0, r); f.col = col;
      const m = c.spawn(meteorFall, 1.0, ev.x, ev.y, 0, r); m.col = col;
      break;
    }
    case "firebomb": {
      flash(c, ev.x, ev.y, 0.5, r * 0.6, K.fire, 2.6, 0.14);
      emit(P.fireball, 14, X, 0.3, Z, 1.4);
      emit(P.oilSplash, 10, X, 0.2, Z, 1.2);
      emitter(c, flameEmit, 1.2, 0.03, ev.x, ev.y, r * 0.9);
      wave(c, ev.x, ev.y, r, K.fire, 0.6, 0.35, 0.3, 0.35, 0);
      lightPool(c, ev.x, ev.y, r * 1.5, K.fire, 0.25, 0.8);
      juice.shake(0.1);
      break;
    }
    case "tarpit": {
      emit(P.oilSplash, 18, X, 0.3, Z, 1.6, 0, 0, 0, K.tar);
      wave(c, ev.x, ev.y, r, K.tarHi, 0.5, 0.5, 0.4, 0.5, 1);
      break;
    }
    case "stillness": {
      dom.flash(c.RT, "radial-gradient(ellipse at center, rgba(220,245,255,.0) 30%, rgba(190,235,255,.9) 100%)", 0.45, 0.6);
      for (const e of b.enemies) {
        if (rnd() < 0.5) emit(P.frostPuff, 1, c.wx(e.x), 0.1, c.wz(e.y), 0.8);
      }
      if (c.map) for (const s of c.map.spawns) wave(c, s.x, s.y, 4, K.iceCore, 0.3, 0.8, 0.05, 0.6, 0);
      break;
    }
    case "judgement": {
      skyBeam(c, ev.x, ev.y, 0.5, col, 0.5);
      flash(c, ev.x, ev.y, 0.8, 1.2, K.warm, 3, 0.15);
      wave(c, ev.x, ev.y, 1.8, col, 0.7, 0.45, 0.1, 0.3, 0);
      emit(P.star, 12, X, 0.8, Z, 1.4, 0, 0, 0, col);
      juice.shake(0.12);
      break;
    }
    case "requisition": {
      // the selected tower gains a level: gold column and coin glints
      const tw = c.b?.towers.find((t) => t.pad >= 0 && Math.abs(c.tx(t) - ev.x) < 0.3 && Math.abs(c.ty(t) - ev.y) < 0.3);
      const top = tw ? towerTop(tw.kind, tw.level) : 2;
      column(c, ev.x, ev.y, 0.35, 5, col, 0.45, 0.8, 1.1);
      emit(P.coinGlint, 12, X, top, Z, 1.2);
      emitter(c, sparkleEmit, 0.6, 0.03, ev.x, ev.y, 0.8, col);
      break;
    }
    case "rally": {
      for (const tw of b.towers) {
        const f = c.spawn(rallyRing, 1.0, c.tx(tw), c.ty(tw), towerTop(tw.kind, tw.level), 1); f.col = col; f.e = rnd() * 0.15;
      }
      for (const so of b.soldiers) if (so.state !== "dead") emit(P.light, 2, c.wx(so.x), 0.5, c.wz(so.y), 1, 0, 0, 0, col);
      break;
    }
    case "barrier": {
      emit(P.dust, 16, X, 0.1, Z, 1.6);
      emit(P.thornChip, 10, X, 0.1, Z, 1.2);
      juice.shake(0.08);
      break;
    }
    case "bramblesurge": {
      wave(c, ev.x, ev.y, r, col, 0.6, 0.5, 0.1, 0.4, 0.2);
      spikes(c, ev.x, ev.y, r * 0.85, 18, 0.55, K.root, 0, 1.0);
      spikes(c, ev.x, ev.y, r * 0.45, 9, 0.45, K.root, 0, 1.0);
      emit(P.leaf, 14, X, 0.2, Z, 1.4);
      break;
    }
    case "reinforcements": {
      column(c, ev.x, ev.y, 0.5, 7, K.gold, 0.45, 0.9, 1.1);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const f = c.spawn(pennantDrop, 1.6, ev.x + Math.cos(a) * 0.7, ev.y + Math.sin(a) * 0.7, 0, 0); f.e = i * 0.08;
      }
      emit(P.dust, 10, X, 0.1, Z, 1.2);
      emit(P.light, 14, X, 0.3, Z, 1.2);
      break;
    }
  }
}

/** Warning circle for a delayed area (meteor): fills over its life, flashes at the end. */
function warnFn(c: Ctx, f: Timed, t: number): void {
  const flashA = t > 0.92 ? 1 : 0;
  c.ground.add(c.wx(f.x), 0.02, c.wz(f.y), f.r, f.r, D.TELE, 0, f.col[0], f.col[1], f.col[2], 0.85, 1, t, flashA, 0, 0);
}
/** Our own meteor fall (only when the sim has no meteor projectile). */
function meteorFall(c: Ctx, f: Timed, t: number): void {
  if (t < 0.45 || sawMeteor) return;
  const u = easeInCubic((t - 0.45) / 0.55);
  const X = c.wx(f.x) + (1 - u) * 3, Y = (1 - u) * 11 + 0.3, Z = c.wz(f.y) - (1 - u) * 4;
  c.over.add(X, Y, Z, 0.9, 0.9, C.GLOW, K.fireHot[0] * 3, K.fireHot[1] * 3, K.fireHot[2] * 3, 1, 0);
  c.over.add(X, Y, Z, 1.8, 1.8, C.GLOW, K.fire[0] * 1.2, K.fire[1] * 1.2, K.fire[2] * 1.2, 0.6, 0);
  c.lines.seg(X, Y, Z, X + 1.2, Y + 4, Z - 1.6, 0.4, 4, 1, 0, K.fire[0] * 1.6, K.fire[1] * 1.6, K.fire[2] * 1.6, 0.7, 0);
  if (c.dt > 0) emit(P.ember, 2, X, Y, Z, 1.4);
}
function rallyRing(c: Ctx, f: Timed, _t: number, age: number): void {
  if (age < f.e) return;
  const u = Math.min(1, (age - f.e) / (f.dur - f.e));
  const h = f.z * (0.1 + 0.9 * u);
  c.ground.add(c.wx(f.x), h, c.wz(f.y), f.r * (1 - u * 0.3), f.r * (1 - u * 0.3), D.RING, 0, f.col[0] * 1.4, f.col[1] * 1.4, f.col[2] * 1.4, 0.8 * (1 - u), 0, 0.08, 0, 0, 0);
}
function pennantDrop(c: Ctx, f: Timed, t: number, age: number): void {
  const a = Math.max(0, age - f.e);
  const fall = Math.min(1, a / 0.35);
  const y = 0.35 + (1 - fall * fall) * 4;
  const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
  c.over.add(c.wx(f.x), y, c.wz(f.y), 0.45, 0.45, C.PENNANT, 1, 1, 1, fade, 1, Math.sin(age * 8) * 0.06);
  if (fall >= 1 && f.d === 0) { f.d = 1; emit(P.dust, 4, c.wx(f.x), 0.05, c.wz(f.y), 0.6); }
}

// ---------------------------------------------------------------- supplies
export function supplyUsed(hub: Hub, ev: Ev<"supply_used">, b: Battle): void {
  const { c, dom, juice } = hub;
  const col = SUPPLY[ev.supply];
  const X = c.wx(ev.x), Z = c.wz(ev.y), r = ev.r || 1.2;
  switch (ev.supply) {
    case "oil-barrel": {
      emit(P.oilSplash, 22, X, 0.4, Z, 1.6);
      emit(P.debris, 8, X, 0.3, Z, 1, 0, 0, 0, K.shaft);
      wave(c, ev.x, ev.y, r, K.oil, 0.5, 0.35, 0.3, 0.4, 1);
      break;
    }
    case "frost-flask": {
      emit(P.glass, 10, X, 0.4, Z, 1);
      decal(c, D.FROST, ev.x, ev.y, r, K.iceCore, 0.5, 1.5, 0.8, K.frost, 0);
      wave(c, ev.x, ev.y, r, K.iceCore, 0.7, 0.4, 0.15, 0.3, 0.3);
      spikes(c, ev.x, ev.y, r * 0.9, 14, 0.45, K.ice, 0.5, 0.7);
      break;
    }
    case "gold-cache": {
      emit(P.coinGlint, 18, X, 0.6, Z, 1.6);
      dom.coinsAt(c.RT, ev.x, ev.y, 0.6, 12, 60 * (c.b?.act ?? 1), 2.2);
      break;
    }
    case "spike-trap": {
      spikes(c, ev.x, ev.y, 0.5, 9, 0.35, K.steel, 0.2, 1.2);
      spikes(c, ev.x, ev.y, 0.22, 5, 0.3, K.steel, 0.2, 1.2);
      emit(P.spark, 6, X, 0.2, Z, 1, 0, 0, 0, K.steel);
      break;
    }
    case "war-horn": {
      for (const tw of b.towers) { const f = c.spawn(rallyRing, 0.9, c.tx(tw), c.ty(tw), towerTop(tw.kind, tw.level), 1); f.col = col; f.e = rnd() * 0.1; }
      if (c.map?.exits[0]) for (let i = 0; i < 3; i++) wave(c, c.map.exits[0].x, c.map.exits[0].y, 4 + i * 2, col, 0.3, 0.8 + i * 0.2, 0.1, 0.3, 0);
      break;
    }
    case "masons-kit": {
      for (const tw of b.towers) emit(P.coinGlint, 4, c.wx(c.tx(tw)), towerTop(tw.kind, tw.level) * 0.7, c.wz(c.ty(tw)), 1, 0, 0, 0, col);
      break;
    }
    case "flare": {
      const f = c.spawn(flareFn, 1.6, ev.x, ev.y, 0, 0); f.col = col;
      break;
    }
    case "heavy-bolt": {
      skyBeam(c, ev.x, ev.y, 0.3, K.white, 0.25);
      flash(c, ev.x, ev.y, 0.6, 0.9, K.warm, 3, 0.12);
      emit(P.debris, 10, X, 0.2, Z, 1.3);
      emit(P.dust, 10, X, 0.1, Z, 1.4);
      decal(c, D.CRATER, ev.x, ev.y, 0.7, K.scorch, 0.5, 5, 1, K.char, 0.6);
      juice.shake(0.15);
      break;
    }
    case "bell": {
      for (let i = 0; i < 3; i++) { const f = c.spawn(bellWave, 1.2, ev.x, ev.y, 0, 14); f.e = i * 0.18; f.col = col; }
      juice.shake(0.1);
      break;
    }
    case "lifeblood": {
      const g = c.map?.exits[0] ?? { x: ev.x, y: ev.y };
      emit(P.heart, 8, c.wx(g.x), 0.6, c.wz(g.y), 1.2);
      flash(c, g.x, g.y, 0.8, 1.2, col, 1.5, 0.3);
      break;
    }
  }
}
function flareFn(c: Ctx, f: Timed, _t: number, age: number): void {
  const up = Math.min(1, age / 0.5);
  const y = 1 + up * 5;
  const X = c.wx(f.x), Z = c.wz(f.y);
  if (up < 1) {
    c.over.add(X, y, Z, 0.35, 0.35, C.GLOW, 3, 2.6, 1.6, 1, 0);
    if (c.dt > 0) emit(P.ember, 1, X, y, Z, 0.8, 0, 0, 0, K.gold);
  } else {
    const u = (age - 0.5) / (f.dur - 0.5);
    c.over.add(X, y, Z, 1.2 + u * 1.5, 1.2 + u * 1.5, C.BURST, 2.4, 2.1, 1.2, 1 - u, 0, u);
    c.ground.add(X, 0.02, Z, 9, 9, D.SOFT, 0, f.col[0], f.col[1], f.col[2], 0.22 * (1 - u), 0, 1.2);
    if (f.e === 0) { f.e = 1; emit(P.star, 16, X, y, Z, 1.6, 0, 0, 0, K.gold); }
  }
}
function bellWave(c: Ctx, f: Timed, _t: number, age: number): void {
  if (age < f.e) return;
  const u = (age - f.e) / (f.dur - f.e);
  const r = f.r * u;
  c.ground.add(c.wx(f.x), 0.03, c.wz(f.y), r, r, D.WAVE, 0, f.col[0], f.col[1], f.col[2], 0.4 * (1 - u), 0, 0.5);
}

// ---------------------------------------------------------------- bosses
export function bossSpawn(hub: Hub, ev: Ev<"boss_spawn">): void {
  const { c, juice } = hub;
  const col = BOSS[ev.boss];
  wave(c, ev.x, ev.y, 4, col, 0.55, 0.8, 0.05, 0.5, 0);
  emit(P.dust, 20, c.wx(ev.x), 0.1, c.wz(ev.y), 2.2);
  juice.shake(0.25);
}

export function bossTelegraph(hub: Hub, ev: Ev<"boss_telegraph">): void {
  const { c } = hub;
  const e = c.enemy(ev.id);
  const h = e ? Math.max(0, e.z) + bodyOf(e).h : 3;
  pop(c, C.BANG, ev.x, ev.y, h + 0.6, 0.6, BOSS[ev.boss], 1.6, 0.6, 0.3);
}

/** At the trigger the telegraph decal flashes to 60% for 80 ms, then the impact. */
export function bossAbility(hub: Hub, ev: Ev<"boss_ability">, b: Battle): void {
  const { c, juice } = hub;
  const col = BOSS[ev.boss];
  const X = c.wx(ev.x), Z = c.wz(ev.y), r = ev.r || 2.4;
  const ab = ev.ability.toLowerCase();
  const tele = lastTele.get(ev.id);
  if (tele) { const f = c.spawn(teleFlash, 0.45, tele.x, tele.y, 0, tele.r); f.col = col; f.a = tele.shape; f.b = tele.rot; f.c = tele.len; f.d = tele.half; lastTele.delete(ev.id); }
  if (ab.includes("stomp")) {
    wave(c, ev.x, ev.y, r, K.iceCore, 0.8, 0.5, 0.1, 0.4, 0.3);
    spikes(c, ev.x, ev.y, r * 0.9, 20, 0.6, K.ice, 0.5, 0.9);
    decal(c, D.CRACK, ev.x, ev.y, r, K.frostDeep, 0.6, 3, 1, undefined, 0, rnd() * 6);
    emit(P.frostPuff, 16, X, 0.1, Z, 2.2);
    for (const id of ev.towers) { const tw = c.tower(id); if (tw) { decal(c, D.CRACK, c.tx(tw), c.ty(tw), 0.9, K.frostDeep, 0.6, 4, 1); emit(P.ice, 6, c.wx(c.tx(tw)), 1.2, c.wz(c.ty(tw)), 1); } }
    juice.shake(0.35);
  } else if (ab.includes("cry") || ab.includes("howl") || ab.includes("roar")) {
    wave(c, ev.x, ev.y, r, col, 0.7, 0.6, 0.1, 0.5, 0);
    wave(c, ev.x, ev.y, r * 0.7, col, 0.5, 0.5, 0.05, 0.35, 0);
    juice.shake(0.25);
  } else if (ab.includes("breath") || ab.includes("dive") || ab.includes("fire")) {
    const len = tele?.len || r;
    const rot = tele?.rot ?? 0;
    for (let i = 0; i < 18; i++) {
      const u = rnd(), w = (rnd() - 0.5) * (tele?.shape === 1 ? u * 2 : 0.6);
      const gx = ev.x + Math.cos(rot) * len * u - Math.sin(rot) * w, gy = ev.y + Math.sin(rot) * len * u + Math.cos(rot) * w;
      emit(P.fireball, 1, c.wx(gx), 0.3, c.wz(gy), 1.2);
      emit(P.flame, 1, c.wx(gx), 0.1, c.wz(gy), 1.2);
    }
    juice.shake(0.3);
    for (const id of ev.towers) { const tw = c.tower(id); if (tw) emit(P.smoke, 5, c.wx(c.tx(tw)), 1.4, c.wz(c.ty(tw)), 1.2); }
  } else if (ab.includes("burrow")) {
    emit(P.sand, 20, X, 0.2, Z, 1.6);
    wave(c, ev.x, ev.y, 2, col, 0.4, 0.8, 0.1, 0.5, 1);
  } else if (ab.includes("erupt") || ab.includes("emerge") || ab.includes("surface")) {
    emit(P.sand, 26, X, 0.2, Z, 2.2);
    emit(P.debris, 12, X, 0.2, Z, 1.6, 0, 0, 0, K.dust);
    wave(c, ev.x, ev.y, r, col, 0.7, 0.5, 0.1, 0.4, 0.3);
    decal(c, D.CRATER, ev.x, ev.y, r * 0.6, K.scorch, 0.4, 6, 1, K.dust, 0.5);
    juice.shake(0.35);
  } else if (ab.includes("wing")) {
    // takes wing: a downdraft of dust and embers
    wave(c, ev.x, ev.y, 3.5, K.dust, 0.6, 0.6, 0.1, 0.5, 1);
    emit(P.dust, 24, X, 0.1, Z, 2.4);
    emit(P.ember, 16, X, 1.5, Z, 1.6);
    juice.shake(0.25);
  } else if (ab.includes("bury")) {
    emit(P.dust, 14, X, 0.1, Z, 1.6);
    emit(P.debris, 10, X, 0.2, Z, 1.2, 0, 0, 0, K.dust);
  } else if (ab.includes("boneward")) {
    flash(c, ev.x, ev.y, 1.8, 2, K.hex, 1.6, 0.3);
    emit(P.hexShard, 14, X, 1.6, Z, 1.6, 0, 0, 0, K.hex);
  } else if (ab.includes("embers")) {
    sigil(c, ev.x, ev.y, 1.4, K.fire, 1.0, 1.4);
    emit(P.ember, 14, X, 0.4, Z, 1.6);
  } else if (ab.includes("muster") || ab.includes("summon") || ab.includes("raise") || ab.includes("brood") || ab.includes("birth") || ab.includes("swarm")) {
    sigil(c, ev.x, ev.y, 1.5, col, 1.1, 1.3);
    emit(P.dust, 12, X, 0.1, Z, 1.6);
  } else if (ab.includes("charge") || ab.includes("leap")) {
    emit(P.dust, 18, X, 0.1, Z, 1.8);
    wave(c, ev.x, ev.y, 1.6, K.dust, 0.6, 0.4, 0.2, 0.4, 1);
    juice.shake(0.2);
  } else if (ab.includes("storm")) {
    hub.dom.flash(c.RT, "rgba(120,96,60,1)", 0.25, 2.0);
    emit(P.sand, 30, X, 0.5, Z, 3);
  } else if (ab.includes("armour") || ab.includes("ice")) {
    flash(c, ev.x, ev.y, 1.8, 2, K.iceCore, 1.6, 0.3);
    emit(P.ice, 14, X, 2, Z, 1.4);
  } else {
    wave(c, ev.x, ev.y, r, col, 0.6, 0.5, 0.1, 0.4, 0.2);
    juice.shake(0.2);
  }
  for (const id of ev.soldiers) { const so = b.soldiers.find((s) => s.id === id); if (so) emit(P.dust, 4, c.wx(so.x), 0.1, c.wz(so.y), 0.8); }
}

export function bossPhase(hub: Hub, ev: Ev<"boss_phase">): void {
  const { c, juice } = hub;
  const col = BOSS[ev.boss];
  juice.hitstop(120, true); juice.shake(0.45); juice.slow(0.35, 1.0);
  flash(c, ev.x, ev.y, 2, 2.4, col, 2.4, 0.16);
  const f = c.spawn(roarFn, 1.2, ev.x, ev.y, 0, 9); f.col = col;
  emit(P.dust, 24, c.wx(ev.x), 0.1, c.wz(ev.y), 2.6);
  hub.dom.flash(c.RT, `radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(${Math.round(col[0] ** (1 / 2.2) * 255)},${Math.round(col[1] ** (1 / 2.2) * 255)},${Math.round(col[2] ** (1 / 2.2) * 255)},.8) 100%)`, 0.25, 0.7);
}
/** Phase roar: two rings rushing out across the map, the first sharp, the second soft. */
function roarFn(c: Ctx, f: Timed, t: number): void {
  const e = 1 - (1 - t) ** 2;
  const X = c.wx(f.x), Z = c.wz(f.y);
  c.ground.add(X, 0.03, Z, f.r * e, f.r * e, D.WAVE, 0, f.col[0] * 1.3, f.col[1] * 1.3, f.col[2] * 1.3, 0.6 * (1 - t), 0, 0.3 + e * 0.6);
  const t2 = Math.max(0, t - 0.15) / 0.85, e2 = 1 - (1 - t2) ** 2;
  if (t2 > 0) c.ground.add(X, 0.03, Z, f.r * 0.8 * e2, f.r * 0.8 * e2, D.WAVE, 0, 1, 1, 1, 0.3 * (1 - t2), 0, 0.8);
}

// ---------------------------------------------------------------- telegraph memory (for the trigger flash)
interface Tele { x: number; y: number; r: number; shape: number; rot: number; len: number; half: number }
export const lastTele = new Map<number, Tele>();
function teleFlash(c: Ctx, f: Timed, _t: number, age: number): void {
  const a = age < 0.08 ? 1 : 1 - (age - 0.08) / (f.dur - 0.08);
  const shape = f.a === 1 ? D.CONE : f.a === 2 ? D.STRIPE : D.TELE;
  if (shape === D.STRIPE) {
    const cx = f.x + Math.cos(f.b) * f.c * 0.5, cy = f.y + Math.sin(f.b) * f.c * 0.5;
    c.ground.add(c.wx(cx), 0.025, c.wz(cy), f.c * 0.5, f.r, D.STRIPE, f.b, f.col[0], f.col[1], f.col[2], a, 1, 1, 1, 0, 0);
  } else c.ground.add(c.wx(f.x), 0.025, c.wz(f.y), shape === D.CONE ? f.c : f.r, shape === D.CONE ? f.c : f.r, shape, f.b, f.col[0], f.col[1], f.col[2], a, 1, 1, 1, f.d, 0);
}
