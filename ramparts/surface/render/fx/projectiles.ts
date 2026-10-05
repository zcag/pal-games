// Projectiles drawn from Battle.projectiles (art 5.1): an emissive head that blooms (the
// brightest moving thing), a fading ribbon trail, a body mesh where the shape matters, ground
// shadows and landing rings for lobbed shots, a rope for the harpoon. Interpolated by alpha.
import type { Battle, Projectile, ProjectileKind } from "../../../game/types.ts";
import type { Ctx, Timed } from "./core.ts";
import { C } from "./gl/atlas.ts";
import { D } from "./gl/decals.ts";
import { rgb, type RGB } from "./gl/common.ts";
import { K } from "./palette.ts";
import { emit, rnd } from "./particles.ts";
import { P } from "./presets.ts";
import { bodyOf, towerTop } from "./sizes.ts";

interface Look {
  head: RGB; hi: number; hs: number;            // head colour, intensity, size (u)
  trail: RGB; ta: number; tw: number; tn: number; // trail colour, alpha, width (u), segments
  body?: "shaft" | "ball" | "shard" | "bolt" | "flask";
  bodyCol?: RGB; len?: number; rad?: number;
  lob?: boolean; smoke?: boolean; ring?: boolean; spin?: number; motes?: "ice" | "ember" | "violet" | "hex" | "acid";
}
const L = (o: Look) => o;
export const LOOK: Record<ProjectileKind, Look> = {
  arrow: L({ head: K.warm, hi: 2.5, hs: 0.16, trail: K.white, ta: 0.5, tw: 0.035, tn: 5, body: "shaft", bodyCol: K.shaft, len: 0.5 }),
  volley: L({ head: rgb(0xff9a3a), hi: 2.4, hs: 0.15, trail: rgb(0xffc080), ta: 0.45, tw: 0.035, tn: 4, body: "shaft", bodyCol: K.shaft, len: 0.45, motes: "ember" }),
  marksman: L({ head: K.gold, hi: 3, hs: 0.2, trail: K.gold, ta: 0.55, tw: 0.03, tn: 10, body: "shaft", bodyCol: K.shaft, len: 0.65 }),
  bolt: L({ head: K.violetCore, hi: 3, hs: 0.36, trail: K.violet, ta: 0.6, tw: 0.08, tn: 9, motes: "violet" }),
  arcane: L({ head: rgb(0xdfe6ff), hi: 3, hs: 0.34, trail: rgb(0x9fb8ff), ta: 0.6, tw: 0.08, tn: 9, motes: "violet" }),
  hex: L({ head: K.hex, hi: 2.5, hs: 0.36, trail: K.hexDark, ta: 0.55, tw: 0.1, tn: 8, body: "ball", bodyCol: K.hexDark, rad: 0.11, motes: "hex" }),
  shell: L({ head: K.fireCore, hi: 3, hs: 0.14, trail: K.smokeLight, ta: 0.0, tw: 0.05, tn: 0, body: "ball", bodyCol: rgb(0x2c2a2a), rad: 0.15, lob: true, smoke: true }),
  mortar: L({ head: K.fireCore, hi: 3, hs: 0.16, trail: K.smokeLight, ta: 0, tw: 0.05, tn: 0, body: "ball", bodyCol: rgb(0x2c2a2a), rad: 0.2, lob: true, smoke: true, ring: true }),
  bomblet: L({ head: K.fireCore, hi: 2.6, hs: 0.11, trail: K.smokeLight, ta: 0, tw: 0.04, tn: 0, body: "ball", bodyCol: rgb(0x2c2a2a), rad: 0.09, lob: true, smoke: true }),
  flask: L({ head: K.acidFlask, hi: 1.4, hs: 0.22, trail: K.acidFlask, ta: 0.25, tw: 0.03, tn: 4, body: "flask", bodyCol: K.glass, rad: 0.11, lob: true, spin: 9, motes: "acid" }),
  firebomb: L({ head: K.fire, hi: 2.4, hs: 0.3, trail: K.fire, ta: 0.4, tw: 0.06, tn: 6, body: "flask", bodyCol: rgb(0x6a3a20), rad: 0.13, lob: true, spin: 8, motes: "ember" }),
  shard: L({ head: K.iceCore, hi: 2.2, hs: 0.24, trail: K.frost, ta: 0.45, tw: 0.05, tn: 6, body: "shard", bodyCol: K.ice, len: 0.35, motes: "ice" }),
  fireball: L({ head: K.fireHot, hi: 2.8, hs: 0.42, trail: K.fire, ta: 0.6, tw: 0.13, tn: 9, motes: "ember", lob: true }),
  ballista: L({ head: K.white, hi: 2, hs: 0.14, trail: K.white, ta: 0.4, tw: 0.05, tn: 4, body: "bolt", bodyCol: K.iron, len: 1.0, rad: 0.07 }),
  harpoon: L({ head: K.white, hi: 2, hs: 0.14, trail: K.white, ta: 0.3, tw: 0.04, tn: 3, body: "bolt", bodyCol: K.iron, len: 0.9, rad: 0.07 }),
  siege: L({ head: K.white, hi: 2.2, hs: 0.2, trail: K.dust, ta: 0.45, tw: 0.12, tn: 8, body: "bolt", bodyCol: K.iron, len: 1.5, rad: 0.12 }),
  meteor: L({ head: K.fireHot, hi: 3.2, hs: 0.9, trail: K.fire, ta: 0.7, tw: 0.35, tn: 10, body: "ball", bodyCol: rgb(0x3a2620), rad: 0.38, lob: true, motes: "ember" }),
};
const LOBBED = (k: ProjectileKind) => LOOK[k].lob === true;

interface PS { id: number; kind: ProjectileKind; seen: number; hist: Float32Array; hn: number; hh: number; born: number; lx: number; ly: number; lz: number; dx: number; dy: number; dz: number; emitT: number; tx: number; ty: number }
const HN = 12;
const live = new Map<number, PS>();
const pool: PS[] = [];
let frame = 0;
export let sawMeteor = false;
export function resetProjectiles(): void { for (const p of live.values()) pool.push(p); live.clear(); sawMeteor = false; }

function heightOf(c: Ctx, _b: Battle, p: Projectile, ix: number, iy: number, iz: number): number {
  if (LOBBED(p.kind) || p.dur > 0) return iz;
  if (iz > 0.05) {
    // homing shots fly at the sim's height: ease down onto the target's body as they close in
    const e = p.target ? c.enemy(p.target) : null;
    if (!e) return iz;
    const total = Math.hypot(e.x - p.sx, e.y - p.sy) || 1, rem = Math.hypot(e.x - ix, e.y - iy);
    const u = Math.max(0, Math.min(1, 1 - rem / total));
    const goal = Math.max(0, e.z) + bodyOf(e).h * 0.55;
    return iz + (goal - iz) * u * u;
  }
  // the sim may keep straight shots at z 0: fly from the tower top down to body height
  const tw = p.from ? c.tower(p.from) : null;
  const top = tw ? towerTop(tw.kind, tw.level) * 0.85 : 1.2;
  const total = Math.hypot(p.tx - p.sx, p.ty - p.sy) || 1;
  const done = Math.min(1, Math.hypot(ix - p.sx, iy - p.sy) / total);
  return top + (0.45 - top) * done;
}

export function drawProjectiles(c: Ctx, b: Battle): void {
  frame++;
  const a = c.alpha, ox = c.ox, oz = c.oz, T = c.T;
  for (let i = 0; i < b.projectiles.length; i++) {
    const p = b.projectiles[i];
    const lk = LOOK[p.kind] ?? LOOK.arrow;
    if (p.kind === "meteor") sawMeteor = true;
    let s = live.get(p.id);
    const gx = p.px + (p.x - p.px) * a, gy = p.py + (p.y - p.py) * a, gz = p.pz + (p.z - p.pz) * a;
    const h = heightOf(c, b, p, gx, gy, gz);
    const X = gx + ox, Y = h, Z = gy + oz;
    if (!s) {
      s = pool.pop() ?? { id: 0, kind: "arrow", seen: 0, hist: new Float32Array(HN * 3), hn: 0, hh: 0, born: 0, lx: 0, ly: 0, lz: 0, dx: 1, dy: 0, dz: 0, emitT: 0, tx: 0, ty: 0 };
      s.id = p.id; s.kind = p.kind; s.hn = 0; s.hh = 0; s.born = T; s.lx = X; s.ly = Y; s.lz = Z; s.emitT = T;
      // direction from the start toward the aim point
      s.dx = p.tx - p.sx; s.dy = 0; s.dz = p.ty - p.sy;
      live.set(p.id, s);
    }
    s.seen = frame; s.tx = p.tx; s.ty = p.ty;
    const mx = X - s.lx, my = Y - s.ly, mz = Z - s.lz, md = Math.hypot(mx, my, mz);
    if (md > 0.02) { s.dx = mx; s.dy = my; s.dz = mz; }
    if (md > 0.06 || s.hn === 0) {
      s.hh = (s.hh + 1) % HN; s.hist[s.hh * 3] = X; s.hist[s.hh * 3 + 1] = Y; s.hist[s.hh * 3 + 2] = Z;
      if (s.hn < HN) s.hn++;
    }
    s.lx = X; s.ly = Y; s.lz = Z;
    drawOne(c, p, lk, s, X, Y, Z, T);
  }
  // gone: leave a short ghost trail (and arrows stick for 300 ms)
  for (const [id, s] of live) {
    if (s.seen === frame) continue;
    live.delete(id);
    const lk = LOOK[s.kind];
    if (lk.tn > 0 && s.hn > 1) {
      const f = c.spawn(ghostTrail, 0.14, 0, 0);
      const n = Math.min(s.hn, lk.tn, 16);
      for (let k = 0; k < n; k++) {
        const j = ((s.hh - k + HN * 4) % HN) * 3;
        f.pts[k * 3] = s.hist[j]; f.pts[k * 3 + 1] = s.hist[j + 1]; f.pts[k * 3 + 2] = s.hist[j + 2];
      }
      f.n = n; f.col = lk.trail; f.a = lk.ta; f.b = lk.tw;
    }
    if (lk.body === "shaft" || lk.body === "bolt") {
      const f = c.spawn(stuck, s.kind === "arrow" || s.kind === "volley" || s.kind === "marksman" ? 0.3 : 0.5, 0, 0);
      const l = Math.hypot(s.dx, s.dy, s.dz) || 1;
      f.x = s.lx; f.y = s.ly; f.z = s.lz; f.a = s.dx / l; f.b = s.dy / l; f.c = s.dz / l; f.d = lk.len ?? 0.5; f.e = lk.rad ?? 0.035;
      f.col = lk.bodyCol ?? K.shaft;
    }
    pool.push(s);
  }
}

function drawOne(c: Ctx, p: Projectile, lk: Look, s: PS, X: number, Y: number, Z: number, T: number): void {
  const dl = Math.hypot(s.dx, s.dy, s.dz) || 1;
  const ux = s.dx / dl, uy = s.dy / dl, uz = s.dz / dl;
  // trail: newest -> oldest, fading
  const n = Math.min(s.hn, lk.tn);
  if (n > 1 && lk.ta > 0) {
    let ax = X, ay = Y, az = Z;
    for (let k = 1; k < n; k++) {
      const j = ((s.hh - k + HN * 4) % HN) * 3;
      const bx = s.hist[j], by = s.hist[j + 1], bz = s.hist[j + 2];
      const f0 = 1 - (k - 1) / n, f1 = 1 - k / n;
      c.lines.seg(ax, ay, az, bx, by, bz, lk.tw * (0.5 + 0.5 * f0), 1.2, 0.7, 0.2,
        lk.trail[0] * 1.3, lk.trail[1] * 1.3, lk.trail[2] * 1.3, lk.ta * f0, lk.ta * f1);
      ax = bx; ay = by; az = bz;
    }
  }
  // body
  const bc = lk.bodyCol ?? K.shaft;
  switch (lk.body) {
    case "shaft": {
      const len = lk.len ?? 0.5;
      c.shaft.addDir(X - ux * len * 0.5, Y - uy * len * 0.5, Z - uz * len * 0.5, ux, uy, uz, 0, 1, 1, len, bc[0], bc[1], bc[2], 1, 0, 0.3);
      break;
    }
    case "bolt": {
      const len = lk.len ?? 1, r = lk.rad ?? 0.07;
      c.bolt.addDir(X - ux * len * 0.5, Y - uy * len * 0.5, Z - uz * len * 0.5, ux, uy, uz, 0, r, r, len, bc[0], bc[1], bc[2], 1, 0, 0.4);
      // fletching / iron head: a small steel ball at the tip
      c.ball.add(X, Y, Z, 0, 0, 0, r * 1.4, r * 1.4, r * 1.4, K.steel[0], K.steel[1], K.steel[2], 1, 0.2, 0.5);
      break;
    }
    case "ball": {
      const r = lk.rad ?? 0.15;
      c.ball.add(X, Y, Z, T * 3, T * 2, 0, r, r, r, bc[0], bc[1], bc[2], 1, 0, 0.35);
      break;
    }
    case "shard": {
      const len = lk.len ?? 0.35;
      c.shard.addDir(X - ux * len * 0.3, Y - uy * len * 0.3, Z - uz * len * 0.3, ux, uy, uz, T * 8, 0.18, 0.18, len * 0.5, K.ice[0], K.ice[1], K.ice[2], 0.9, 0.9, 1.2);
      break;
    }
    case "flask": {
      const r = lk.rad ?? 0.11, sp = (lk.spin ?? 8) * (T - s.born);
      c.ball.add(X, Y, Z, sp * 0.4, sp, 0, r, r * 1.25, r, bc[0], bc[1], bc[2], 0.85, 0.2, 0.8);
      break;
    }
  }
  // head glow (bloom), min 3 px at 720x390
  const hs = lk.hs;
  const pulse = p.kind === "bolt" || p.kind === "arcane" ? 1 + 0.12 * Math.sin(T * 30 + p.id) : 1;
  if (p.kind === "shell" || p.kind === "mortar" || p.kind === "bomblet") {
    // the lit fuse spark at the back
    const fl = 0.75 + 0.25 * Math.sin(T * 40 + p.id);
    c.over.add(X - ux * 0.12, Y + 0.12, Z - uz * 0.12, hs * fl, hs * fl, C.SPARK, lk.head[0] * lk.hi, lk.head[1] * lk.hi, lk.head[2] * lk.hi, 1, 0, T * 12);
  } else {
    c.over.add(X, Y, Z, hs * pulse, hs * pulse, C.GLOW, lk.head[0] * lk.hi, lk.head[1] * lk.hi, lk.head[2] * lk.hi, 1, 0);
    // a tiny hard core so it reads even before bloom
    c.over.add(X, Y, Z, 4, 4, C.DOT, lk.head[0] * lk.hi, lk.head[1] * lk.hi, lk.head[2] * lk.hi, 1, 0, 0, 1);
  }
  if (p.kind === "fireball" || p.kind === "meteor") {
    c.over.add(X, Y, Z, hs * 1.9, hs * 1.9, C.GLOW, K.fire[0] * 1.2, K.fire[1] * 1.2, K.fire[2] * 1.2, 0.6, 0);
  }
  // lobbed: ground shadow under the shot, mortar landing ring
  if (lk.lob) {
    const gx = X, gz = Z, alt = Math.max(0, Y);
    const sr = (lk.rad ?? 0.12) * (1.6 + alt * 0.25);
    c.ground.add(gx, 0.012, gz, sr, sr, D.SOFT, 0, 0, 0, 0, Math.max(0.12, 0.45 - alt * 0.06), 1, 1.4);
    if (lk.ring || p.kind === "meteor") {
      const prog = p.dur > 0 ? Math.min(1, p.t / p.dur) : 0;
      const r = p.kind === "meteor" ? 1.4 : 1.1;
      c.ground.add(p.tx + c.ox, 0.014, p.ty + c.oz, r, r, D.TELE, 0, K.warn[0], K.warn[1], K.warn[2], 0.4, 1, prog, 0, 0, 0);
    }
  }
  // per-kind motes and smoke
  if (T > s.emitT) {
    switch (lk.motes) {
      case "ice": emit(P.frostMote, 1, X, Y, Z, 1); s.emitT = T + 0.05; break;
      case "ember": emit(P.ember, p.kind === "meteor" ? 3 : 1, X, Y, Z, p.kind === "meteor" ? 1.6 : 0.8); s.emitT = T + 0.04; break;
      case "violet": emit(P.magic, 1, X, Y, Z, 0.6); s.emitT = T + 0.05; break;
      case "hex": emit(P.hexMote, 1, X, Y, Z, 0.8); s.emitT = T + 0.06; break;
      case "acid": if (rnd() < 0.5) emit(P.acidSplash, 1, X, Y - 0.05, Z, 0.4); s.emitT = T + 0.08; break;
    }
    if (lk.smoke && T > s.emitT - 0.001) { emit(P.smokeThin, 1, X - ux * 0.15, Y, Z - uz * 0.15, 0.8); s.emitT = T + 0.07; }
    if (p.kind === "meteor") emit(P.smoke, 1, X, Y + 0.2, Z, 1.2);
  }
  // harpoon chain: a sagging catenary from the tower to the head
  if (p.kind === "harpoon") {
    const tw = c.tower(p.from);
    if (tw) {
      const sx = c.tx(tw) + c.ox, sz = c.ty(tw) + c.oz, sy = towerTop(tw.kind, tw.level) * 0.7;
      rope(c, sx, sy, sz, X, Y, Z, 0.35);
    }
  }
}

export function rope(c: Ctx, ax: number, ay: number, az: number, bx: number, by: number, bz: number, sag: number): void {
  let px = ax, py = ay, pz = az;
  for (let k = 1; k <= 10; k++) {
    const t = k / 10;
    const x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t - sag * 4 * t * (1 - t);
    c.lines.seg(px, py, pz, x, y, z, 0.035, 1.2, 0.3, 1, 0.16, 0.16, 0.17, 0.95);
    px = x; py = y; pz = z;
  }
}

function ghostTrail(c: Ctx, f: Timed, t: number): void {
  const n = f.n;
  for (let k = 0; k < n - 1; k++) {
    const f0 = (1 - k / n) * (1 - t), f1 = (1 - (k + 1) / n) * (1 - t);
    c.lines.seg(f.pts[k * 3], f.pts[k * 3 + 1], f.pts[k * 3 + 2], f.pts[k * 3 + 3], f.pts[k * 3 + 4], f.pts[k * 3 + 5],
      f.b * 0.7, 1, 0.7, 0.2, f.col[0] * 1.3, f.col[1] * 1.3, f.col[2] * 1.3, f.a * f0, f.a * f1);
  }
}

function stuck(c: Ctx, f: Timed, t: number): void {
  const len = f.d, a = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
  const m = f.e > 0.05 ? c.bolt : c.shaft;
  const w = f.e > 0.05 ? f.e : 1;
  m.addDir(f.x - f.a * len * 0.35, f.y - f.b * len * 0.35, f.z - f.c * len * 0.35, f.a, f.b, f.c, 0, w, w, len, f.col[0], f.col[1], f.col[2], a, 0, 0.2);
}

export function projectileCount(): number { return live.size; }
