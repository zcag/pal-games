// Unit models (art 3.2-3.4, 4.4): every enemy role, elite, boss and soldier as merged low-poly parts.
// Model faces +Z, stands on y = 0. Part ids drive the vertex animation (mats.ts ANIM):
// 0 body, 1/2 legs L/R, 3/4 arms L/R, 5 head, 6/7 wings L/R, 8 tail/scarf/hem, 9 orbit, 10 weapon arm (pose), 11 static.
import * as THREE from "../../vendor/three.js";
import type { EnemyId, SoldierKind } from "../../../game/types.ts";
import { Kit, TAU, type V3 } from "./kit.ts";
import type { Look } from "../palette.ts";
import { SHARED } from "../palette.ts";

export interface Pal { body: string; key: string; trim: string; steel: string; skin: string; bone: string; dark: string; act4: boolean }

export function palOf(look: Look): Pal {
  const act4 = !!look.bodyTrim;
  return {
    body: look.body, key: look.key, trim: act4 ? look.bodyTrim! : "#5A4A3E", steel: "#8E98A6",
    skin: act4 ? "#2A2426" : "#5A4234", bone: act4 ? "#E2D6C0" : "#D8CCB4", dark: act4 ? "#141012" : "#1E1816", act4,
  };
}

export interface UnitModel {
  geo: THREE.BufferGeometry;
  /** bob (u), swing (rad), style (0 walk, 1 glide, 2 hop, 3 flap, 4 float, 5 crawl), sway */
  motion: [number, number, number, number];
  /** Steps (or flaps) per second at base speed. */
  freq: number;
  /** Footprint diameter for the blob shadow. */
  foot: number;
  height: number;
  flyer?: boolean;
  /** Outline width multiplier (big bodies a touch thicker). */
  outline?: number;
}

type Build = (k: Kit, c: Pal, s: number) => void;
const L = 1, R = 2, AL = 3, AR = 4, HEAD = 5, WL = 6, WR = 7, TAIL = 8, ORBIT = 9, WEAPON = 10;

// ------------------------------------------------------------------ shared bodies
/** A little soldier frame: legs, torso, head, arms. Height ~0.75 * s. Returns key points. */
function biped(k: Kit, c: Pal, s: number, o: { torso?: string; cloth?: string; legs?: string; wide?: number; head?: number; lean?: number; noArms?: boolean } = {}) {
  const w = (o.wide ?? 1) * s;
  const hip = 0.27 * s;
  const lean = o.lean ?? 0;
  const legC = o.legs ?? c.body;
  for (const [id, x] of [[L, -0.075], [R, 0.075]] as const) {
    k.box(0.1 * w, hip, 0.12 * s, { at: [x * w, hip / 2, 0], color: legC, part: id, pivot: [x * w, hip, 0] });
    k.box(0.11 * w, 0.05 * s, 0.16 * s, { at: [x * w, 0.025 * s, 0.02 * s], color: c.dark, part: id, pivot: [x * w, hip, 0] });
  }
  const ty = hip + 0.16 * s;
  k.box(0.3 * w, 0.3 * s, 0.2 * s, { at: [0, ty, lean * 0.1 * s], rot: [lean, 0, 0], color: o.torso ?? c.body });
  k.box(0.32 * w, 0.2 * s, 0.215 * s, { at: [0, ty - 0.06 * s, lean * 0.1 * s], rot: [lean, 0, 0], color: o.cloth ?? c.key });
  const hy = ty + 0.24 * s;
  const hr = (o.head ?? 0.11) * s;
  k.ico(hr, 1, { at: [0, hy, lean * 0.22 * s], color: c.skin, part: HEAD, pivot: [0, hy - hr, 0] });
  if (!o.noArms) for (const [id, x] of [[AL, -0.19], [AR, 0.19]] as const) {
    k.box(0.08 * s, 0.26 * s, 0.09 * s, { at: [x * w, ty - 0.02 * s, lean * 0.1 * s], color: c.body, part: id, pivot: [x * w, ty + 0.1 * s, 0] });
  }
  return { hip, ty, hy, hr, w };
}

function crown(k: Kit, y: number, r: number) {
  k.torus(r, r * 0.16, 4, 12, { at: [0, y, 0], rot: [Math.PI / 2, 0, 0], color: "#E8C15A", part: HEAD, pivot: [0, y, 0] });
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; k.cone(r * 0.2, r * 0.45, 4, { at: [Math.cos(a) * r, y + r * 0.22, Math.sin(a) * r], color: "#E8C15A", part: HEAD, pivot: [0, y, 0] }); }
}

// ------------------------------------------------------------------ roles
const footman: Build = (k, c, s) => {
  const b = biped(k, c, s);
  k.sphere(b.hr * 1.12, 8, 4, { at: [0, b.hy + b.hr * 0.25, 0], scale: [1, 0.85, 1], color: c.act4 ? c.bone : "#6E6A66", part: HEAD, pivot: [0, b.hy, 0] });
  k.box(b.hr * 2.2, 0.025 * s, b.hr * 2.2, { at: [0, b.hy + 0.02 * s, 0], color: c.act4 ? c.bone : "#5E5A56", part: HEAD, pivot: [0, b.hy, 0] });
  k.cyl(0.13 * s, 0.13 * s, 0.035 * s, 10, { at: [-0.24 * s, b.ty, 0.05 * s], rot: [0, 0, Math.PI / 2], color: c.key, part: AL, pivot: [-0.19 * s, b.ty + 0.1 * s, 0] });
  k.cyl(0.05 * s, 0.05 * s, 0.045 * s, 6, { at: [-0.26 * s, b.ty, 0.05 * s], rot: [0, 0, Math.PI / 2], color: c.dark, part: AL, pivot: [-0.19 * s, b.ty + 0.1 * s, 0] });
  k.box(0.035 * s, 0.035 * s, 0.38 * s, { at: [0.2 * s, b.ty - 0.1 * s, 0.18 * s], color: "#9A9890", part: AR, pivot: [0.19 * s, b.ty + 0.1 * s, 0] });
};

const risen: Build = (k, c, s) => {
  const g = { ...c, body: "#7A7468", skin: "#C8C0AC", key: "#5E584E", dark: "#4A453E" };
  const b = biped(k, g, s);
  k.box(0.03 * s, 0.03 * s, 0.3 * s, { at: [0.2 * s, b.ty - 0.1 * s, 0.16 * s], color: "#6E6A66", part: AR, pivot: [0.19 * s, b.ty + 0.1 * s, 0] });
  for (const x of [-1, 1]) k.box(0.03 * s, 0.03 * s, 0.02 * s, { at: [x * 0.04 * s, b.hy + 0.01 * s, b.hr * 0.95], color: "#1C1512", part: HEAD, pivot: [0, b.hy, 0] });
};

const runner: Build = (k, c, s) => {
  // thin wedge leaning 25 deg, long legs, a trailing scarf
  const lean = 0.44;
  for (const [id, x] of [[L, -0.06], [R, 0.06]] as const) {
    k.box(0.07 * s, 0.32 * s, 0.09 * s, { at: [x * s, 0.16 * s, 0], color: c.body, part: id, pivot: [x * s, 0.32 * s, 0] });
    k.box(0.08 * s, 0.04 * s, 0.14 * s, { at: [x * s, 0.02 * s, 0.03 * s], color: c.dark, part: id, pivot: [x * s, 0.32 * s, 0] });
  }
  k.cone(0.13 * s, 0.32 * s, 4, { at: [0, 0.46 * s, 0.07 * s], rot: [Math.PI + lean, Math.PI / 4, 0], color: c.body });
  k.box(0.22 * s, 0.06 * s, 0.16 * s, { at: [0, 0.48 * s, 0.07 * s], rot: [lean, 0, 0], color: c.key });
  k.cone(0.09 * s, 0.17 * s, 5, { at: [0, 0.64 * s, 0.17 * s], rot: [lean, 0, 0], color: c.key, part: HEAD, pivot: [0, 0.58 * s, 0.12 * s] });
  k.ico(0.065 * s, 0, { at: [0, 0.6 * s, 0.17 * s], color: c.skin, part: HEAD, pivot: [0, 0.58 * s, 0.12 * s] });
  // scarf streaming back
  k.box(0.05 * s, 0.03 * s, 0.34 * s, { at: [0.03 * s, 0.56 * s, -0.12 * s], rot: [-0.25, 0.1, 0], color: c.key, part: TAIL, pivot: [0, 0.56 * s, 0.05 * s] });
  for (const [id, x] of [[AL, -0.13], [AR, 0.13]] as const) k.box(0.05 * s, 0.22 * s, 0.06 * s, { at: [x * s, 0.44 * s, 0.1 * s], rot: [lean, 0, 0], color: c.body, part: id, pivot: [x * s, 0.54 * s, 0.1 * s] });
  k.box(0.02 * s, 0.02 * s, 0.16 * s, { at: [0.14 * s, 0.36 * s, 0.22 * s], color: "#B0AEA6", part: AR, pivot: [0.13 * s, 0.54 * s, 0.1 * s] });
};

const brute: Build = (k, c, s) => {
  const w = 1.0;
  for (const [id, x] of [[L, -0.12], [R, 0.12]] as const) {
    k.box(0.16 * s, 0.32 * s, 0.18 * s, { at: [x * s, 0.16 * s, 0], color: c.body, part: id, pivot: [x * s, 0.32 * s, 0] });
    k.box(0.18 * s, 0.07 * s, 0.22 * s, { at: [x * s, 0.035 * s, 0.03 * s], color: c.dark, part: id, pivot: [x * s, 0.32 * s, 0] });
  }
  // wide trapezoid torso
  k.cyl(0.33 * s, 0.22 * s, 0.5 * s, 4, { at: [0, 0.58 * s, 0], rot: [0, Math.PI / 4, 0], scale: [1.25, 1, 0.75], color: c.body });
  k.box(0.46 * s * w, 0.16 * s, 0.32 * s, { at: [0, 0.42 * s, 0.01 * s], color: c.key });
  // huge steel shoulder plates
  for (const x of [-1, 1]) {
    k.sphere(0.2 * s, 6, 3, { at: [x * 0.33 * s, 0.84 * s, 0], scale: [1.1, 0.75, 1.1], color: c.act4 ? c.bone : c.steel, shade: 0.04 });
    k.box(0.12 * s, 0.32 * s, 0.14 * s, { at: [x * 0.38 * s, 0.56 * s, 0.02 * s], color: c.body, part: x < 0 ? AL : AR, pivot: [x * 0.38 * s, 0.76 * s, 0] });
  }
  k.box(0.26 * s, 0.14 * s, 0.05 * s, { at: [0, 0.7 * s, 0.17 * s], color: c.act4 ? c.bone : c.steel });
  k.ico(0.09 * s, 0, { at: [0, 0.94 * s, 0.05 * s], color: c.skin, part: HEAD, pivot: [0, 0.86 * s, 0] });
  // club
  k.cyl(0.06 * s, 0.035 * s, 0.4 * s, 6, { at: [0.4 * s, 0.4 * s, 0.14 * s], rot: [0.5, 0, 0], color: "#5E4630", part: AR, pivot: [0.38 * s, 0.76 * s, 0] });
};

const acolyte: Build = (k, c, s) => {
  // tall hooded cone robe, hands together, a violet rune halo at the chest
  k.cone(0.22 * s, 0.72 * s, 7, { at: [0, 0.36 * s, 0], color: c.key, part: TAIL, pivot: [0, 0.7 * s, 0] });
  k.cone(0.17 * s, 0.5 * s, 7, { at: [0, 0.46 * s, 0.015 * s], color: c.body });
  k.cone(0.1 * s, 0.24 * s, 6, { at: [0, 0.84 * s, -0.01 * s], color: c.key, part: HEAD, pivot: [0, 0.7 * s, 0] });
  k.ico(0.055 * s, 0, { at: [0, 0.76 * s, 0.05 * s], color: c.dark, part: HEAD, pivot: [0, 0.7 * s, 0] });
  k.box(0.12 * s, 0.07 * s, 0.1 * s, { at: [0, 0.5 * s, 0.13 * s], color: c.skin });
  k.torus(0.24 * s, 0.014 * s, 3, 18, { at: [0, 0.5 * s, 0], rot: [Math.PI / 2, 0, 0], color: "#A472FF", emit: 1.4, part: ORBIT, pivot: [0, 0.5 * s, 0] });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; k.box(0.03 * s, 0.05 * s, 0.01 * s, { at: [Math.cos(a) * 0.24 * s, 0.5 * s, Math.sin(a) * 0.24 * s], rot: [0, -a, 0], color: "#C8A8FF", emit: 1.4, part: ORBIT, pivot: [0, 0.5 * s, 0] }); }
};

const shieldbearer: Build = (k, c, s) => {
  const b = biped(k, c, s * 1.08);
  k.sphere(b.hr * 1.15, 8, 4, { at: [0, b.hy + b.hr * 0.25, 0], scale: [1, 0.8, 1], color: c.act4 ? c.bone : "#6E6A66", part: HEAD, pivot: [0, b.hy, 0] });
  // tall rectangular tower shield in front with a cyan gem
  k.box(0.42 * s, 0.62 * s, 0.05 * s, { at: [0, 0.38 * s, 0.22 * s], color: c.key, part: AL, pivot: [0, 0.6 * s, 0.1 * s] });
  k.box(0.46 * s, 0.05 * s, 0.06 * s, { at: [0, 0.68 * s, 0.22 * s], color: c.act4 ? c.bone : "#6E6A66", part: AL, pivot: [0, 0.6 * s, 0.1 * s] });
  k.box(0.46 * s, 0.05 * s, 0.06 * s, { at: [0, 0.08 * s, 0.22 * s], color: c.act4 ? c.bone : "#6E6A66", part: AL, pivot: [0, 0.6 * s, 0.1 * s] });
  k.octa(0.06 * s, { at: [0, 0.42 * s, 0.26 * s], color: "#BFF6FF", emit: 1.0, part: AL, pivot: [0, 0.6 * s, 0.1 * s] });
};

const shaman: Build = (k, c, s) => {
  const b = biped(k, c, s, { lean: 0.35, head: 0.1 });
  // antler headdress
  for (const x of [-1, 1]) k.tube([[x * 0.04 * s, b.hy + 0.06 * s, 0.05 * s], [x * 0.12 * s, b.hy + 0.16 * s, 0.03 * s], [x * 0.16 * s, b.hy + 0.26 * s, 0.06 * s]], 0.022 * s, 0.008 * s, 4, { color: c.bone, part: HEAD, pivot: [0, b.hy, 0] });
  k.box(0.34 * s, 0.1 * s, 0.24 * s, { at: [0, b.ty + 0.12 * s, 0.03 * s], color: c.key });
  // crooked staff with a green light
  k.tube([[0.22 * s, 0, 0.12 * s], [0.24 * s, 0.5 * s, 0.14 * s], [0.2 * s, 0.86 * s, 0.12 * s], [0.26 * s, 0.96 * s, 0.14 * s]], 0.022 * s, 0.016 * s, 4, { color: "#5E4630", part: AR, pivot: [0.19 * s, b.ty + 0.1 * s, 0] });
  k.ico(0.06 * s, 1, { at: [0.26 * s, 1.02 * s, 0.14 * s], color: "#5FD08A", emit: 1.5, part: AR, pivot: [0.19 * s, b.ty + 0.1 * s, 0] });
};

const slime = (scale: number): Build => (k, c, s) => {
  const r = 0.3 * s * scale;
  k.ico(r, 1, { at: [0, r * 0.75, 0], scale: [1.15, 0.78, 1.1], color: new THREE.Color(c.key).multiplyScalar(c.act4 ? 0.9 : 0.85), jitter: 0.01 * scale, shade: 0.05 });
  k.ico(r * 0.45, 0, { at: [0, r * 0.95, 0], color: new THREE.Color(c.key).multiplyScalar(0.45) });
  for (const x of [-1, 1]) k.ico(r * 0.12, 0, { at: [x * r * 0.32, r * 0.95, r * 0.88], color: "#1C1512" });
};

const shade: Build = (k, c, s) => {
  // footless ragged cloak, two eye dots
  k.cone(0.24 * s, 0.6 * s, 7, { at: [0, 0.42 * s, 0], color: c.body, part: TAIL, pivot: [0, 0.7 * s, 0] });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; k.cone(0.06 * s, 0.18 * s, 3, { at: [Math.cos(a) * 0.19 * s, 0.1 * s, Math.sin(a) * 0.19 * s], rot: [Math.PI, 0, 0], color: c.body, part: TAIL, pivot: [0, 0.7 * s, 0] }); }
  k.sphere(0.14 * s, 7, 5, { at: [0, 0.72 * s, 0], color: c.key, part: HEAD, pivot: [0, 0.62 * s, 0] });
  k.sphere(0.1 * s, 6, 4, { at: [0, 0.71 * s, 0.05 * s], color: "#0E0A0C", part: HEAD, pivot: [0, 0.62 * s, 0] });
  for (const x of [-1, 1]) k.ico(0.025 * s, 0, { at: [x * 0.045 * s, 0.73 * s, 0.13 * s], color: "#E6F0FF", emit: 1.3, part: HEAD, pivot: [0, 0.62 * s, 0] });
};

const swarmling = (key?: string, body?: string): Build => (k, c, s) => {
  // tiny beetle-imp: four legs, oversized head
  const bc = body ?? c.body, kc = key ?? c.key;
  k.ico(0.12 * s, 0, { at: [0, 0.16 * s, -0.04 * s], scale: [1, 0.8, 1.2], color: bc });
  k.ico(0.11 * s, 0, { at: [0, 0.18 * s, -0.06 * s], scale: [1.05, 0.5, 1.1], color: kc });
  k.ico(0.13 * s, 1, { at: [0, 0.24 * s, 0.13 * s], color: bc, part: HEAD, pivot: [0, 0.2 * s, 0.05 * s] });
  for (const x of [-1, 1]) k.cone(0.03 * s, 0.1 * s, 3, { at: [x * 0.08 * s, 0.37 * s, 0.13 * s], rot: [0, 0, -x * 0.4], color: kc, part: HEAD, pivot: [0, 0.2 * s, 0.05 * s] });
  for (const x of [-1, 1]) k.ico(0.025 * s, 0, { at: [x * 0.05 * s, 0.27 * s, 0.24 * s], color: "#FFD27A", emit: 0.6 });
  for (const [id, x, z] of [[L, -1, 0.06], [R, 1, 0.06], [R, -1, -0.12], [L, 1, -0.12]] as const) k.box(0.035 * s, 0.14 * s, 0.035 * s, { at: [x * 0.12 * s, 0.07 * s, z * s], rot: [0, 0, x * 0.4], color: c.dark, part: id, pivot: [x * 0.08 * s, 0.14 * s, z * s] });
};

const sapper: Build = (k, c, s) => {
  const b = biped(k, c, s * 0.92, { lean: 0.5 });
  k.cone(0.12 * s, 0.14 * s, 6, { at: [0, b.hy + 0.07 * s, 0.07 * s], rot: [0.5, 0, 0], color: c.key, part: HEAD, pivot: [0, b.hy, 0] });
  // big bomb pack on the back with a lit fuse
  k.ico(0.2 * s, 1, { at: [0, 0.52 * s, -0.2 * s], color: "#2A2426", shade: 0.05 });
  k.box(0.18 * s, 0.05 * s, 0.24 * s, { at: [0, 0.6 * s, -0.1 * s], color: "#6A5038" });
  k.cyl(0.015 * s, 0.015 * s, 0.12 * s, 4, { at: [0.04 * s, 0.76 * s, -0.24 * s], rot: [0.3, 0, 0.3], color: "#8A6A48" });
  k.ico(0.04 * s, 0, { at: [0.06 * s, 0.83 * s, -0.27 * s], color: "#FFD27A", emit: 2.0 });
};

const bat: Build = (k, c, s) => {
  k.ico(0.09 * s, 0, { at: [0, 0, 0], scale: [1, 0.9, 1.3], color: c.body });
  k.ico(0.07 * s, 0, { at: [0, 0.04 * s, 0.11 * s], color: c.body, part: HEAD, pivot: [0, 0, 0.05 * s] });
  for (const x of [-1, 1]) k.cone(0.025 * s, 0.07 * s, 3, { at: [x * 0.04 * s, 0.11 * s, 0.11 * s], color: c.body, part: HEAD, pivot: [0, 0, 0.05 * s] });
  for (const [id, x] of [[WL, -1], [WR, 1]] as const) {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.06); sh.lineTo(0.42, 0.1); sh.lineTo(0.36, -0.02); sh.lineTo(0.25, 0.03); sh.lineTo(0.16, -0.06); sh.lineTo(0.06, -0.06); sh.lineTo(0, 0.06);
    k.extrude(sh, 0.015, { at: [x * 0.05 * s, 0, 0], rot: [-Math.PI / 2, x < 0 ? Math.PI : 0, 0], scale: [s, s, s], color: c.key, part: id, pivot: [x * 0.05 * s, 0, 0] });
  }
};

const drake: Build = (k, c, s) => {
  k.ico(0.26 * s, 1, { at: [0, 0, 0], scale: [0.9, 0.8, 1.5], color: c.body });
  k.ico(0.2 * s, 0, { at: [0, -0.08 * s, 0.05 * s], scale: [0.9, 0.6, 1.4], color: c.key });
  // long neck and head
  k.tube([[0, 0.05 * s, 0.32 * s], [0, 0.22 * s, 0.55 * s], [0, 0.3 * s, 0.72 * s]], 0.09 * s, 0.06 * s, 5, { color: c.body, part: HEAD, pivot: [0, 0, 0.3 * s] });
  k.cone(0.09 * s, 0.32 * s, 5, { at: [0, 0.3 * s, 0.86 * s], rot: [Math.PI / 2, 0, 0], color: c.body, part: HEAD, pivot: [0, 0, 0.3 * s] });
  for (const x of [-1, 1]) k.cone(0.025 * s, 0.14 * s, 3, { at: [x * 0.05 * s, 0.4 * s, 0.74 * s], rot: [-0.8, 0, 0], color: c.bone, part: HEAD, pivot: [0, 0, 0.3 * s] });
  // tail
  k.tube([[0, 0, -0.3 * s], [0.05 * s, 0.02 * s, -0.7 * s], [-0.04 * s, 0.04 * s, -1.05 * s]], 0.09 * s, 0.015 * s, 4, { color: c.body, part: TAIL, pivot: [0, 0, -0.3 * s] });
  // big membrane wings
  for (const [id, x] of [[WL, -1], [WR, 1]] as const) {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.18); sh.lineTo(0.38, 0.3); sh.lineTo(0.8, 0.1); sh.lineTo(0.66, -0.04); sh.lineTo(0.48, 0.0); sh.lineTo(0.34, -0.16); sh.lineTo(0.18, -0.1); sh.lineTo(0, -0.18); sh.lineTo(0, 0.18);
    k.extrude(sh, 0.02, { at: [x * 0.15 * s, 0.05 * s, 0], rot: [-Math.PI / 2, x < 0 ? Math.PI : 0, 0], scale: [s, s, s], color: new THREE.Color(c.body).lerp(new THREE.Color(c.key), 0.6), part: id, pivot: [x * 0.15 * s, 0.05 * s, 0] });
    k.box(0.62 * s, 0.035 * s, 0.035 * s, { at: [x * 0.45 * s, 0.07 * s, -0.18 * s], rot: [0, x * -0.25, 0], color: c.body, part: id, pivot: [x * 0.15 * s, 0.05 * s, 0] });
  }
};

const juggernaut: Build = (k, c, s) => {
  // siege golem: a hunched stone-and-steel mass with a ram's head plough in front
  const plate = c.act4 ? c.bone : c.steel;
  for (const [id, x] of [[L, -0.24], [R, 0.24]] as const) {
    k.box(0.22 * s, 0.36 * s, 0.26 * s, { at: [x * s, 0.18 * s, -0.04 * s], color: c.body, part: id, pivot: [x * s, 0.36 * s, 0] });
    k.box(0.25 * s, 0.07 * s, 0.3 * s, { at: [x * s, 0.04 * s, 0], color: c.dark, part: id, pivot: [x * s, 0.36 * s, 0] });
  }
  k.dodeca(0.48 * s, { at: [0, 0.78 * s, -0.08 * s], scale: [1.15, 0.95, 1.0], color: c.body, jitter: 0.02 });
  for (const y of [0.62, 0.9]) k.cyl(0.5 * s, 0.52 * s, 0.07 * s, 9, { at: [0, y * s, -0.08 * s], color: plate });
  k.box(0.5 * s, 0.3 * s, 0.34 * s, { at: [0, 1.12 * s, -0.16 * s], color: c.key, jitter: 0.01 });
  // ram head: a heavy snout and two curled horns
  k.cyl(0.13 * s, 0.2 * s, 0.34 * s, 7, { at: [0, 0.78 * s, 0.46 * s], rot: [Math.PI / 2 + 0.25, 0, 0], color: plate });
  k.ico(0.17 * s, 0, { at: [0, 0.86 * s, 0.34 * s], color: plate });
  for (const x of [-1, 1]) {
    k.torus(0.1 * s, 0.035 * s, 4, 8, { at: [x * 0.2 * s, 0.86 * s, 0.32 * s], rot: [0, Math.PI / 2, 0], color: c.bone }, Math.PI * 1.5);
    k.ico(0.025 * s, 0, { at: [x * 0.08 * s, 0.9 * s, 0.48 * s], color: "#FFB45A", emit: 1.0 });
  }
  for (const [id, x] of [[AL, -0.56], [AR, 0.56]] as const) {
    k.dodeca(0.16 * s, { at: [x * s, 0.95 * s, 0], color: plate, part: id, pivot: [x * 0.9 * s, 0.95 * s, 0] });
    k.box(0.18 * s, 0.46 * s, 0.2 * s, { at: [x * 1.02 * s, 0.6 * s, 0.06 * s], color: c.body, part: id, pivot: [x * 0.9 * s, 0.95 * s, 0] });
  }
};

const warlock: Build = (k, c, s) => {
  k.cone(0.3 * s, 1.0 * s, 8, { at: [0, 0.5 * s, 0], color: c.key, part: TAIL, pivot: [0, 0.95 * s, 0] });
  k.cone(0.24 * s, 0.7 * s, 8, { at: [0, 0.66 * s, 0.02 * s], color: c.body });
  k.box(0.46 * s, 0.1 * s, 0.24 * s, { at: [0, 0.94 * s, 0], color: c.body });
  k.cone(0.13 * s, 0.32 * s, 6, { at: [0, 1.16 * s, -0.02 * s], color: c.key, part: HEAD, pivot: [0, 1.0 * s, 0] });
  k.ico(0.07 * s, 0, { at: [0, 1.06 * s, 0.07 * s], color: c.dark, part: HEAD, pivot: [0, 1.0 * s, 0] });
  for (const x of [-1, 1]) k.ico(0.018 * s, 0, { at: [x * 0.03 * s, 1.07 * s, 0.13 * s], color: "#A472FF", emit: 1.4, part: HEAD, pivot: [0, 1.0 * s, 0] });
  // floating grimoire and skull lantern in orbit
  k.box(0.2 * s, 0.05 * s, 0.15 * s, { at: [0.36 * s, 0.82 * s, 0.1 * s], rot: [0.3, 0.4, 0.2], color: "#5A2E3A", part: ORBIT, pivot: [0, 0.8 * s, 0] });
  k.box(0.18 * s, 0.03 * s, 0.13 * s, { at: [0.36 * s, 0.85 * s, 0.1 * s], rot: [0.3, 0.4, 0.2], color: "#E9DEC4", part: ORBIT, pivot: [0, 0.8 * s, 0] });
  k.ico(0.07 * s, 1, { at: [-0.34 * s, 0.86 * s, -0.12 * s], color: c.bone, part: ORBIT, pivot: [0, 0.8 * s, 0] });
  k.ico(0.04 * s, 0, { at: [-0.34 * s, 0.78 * s, -0.12 * s], color: "#A472FF", emit: 1.4, part: ORBIT, pivot: [0, 0.8 * s, 0] });
};

const matron: Build = (k, c, s) => {
  // swollen brood mother: a huge pulsing rear sack, small head, crawling legs
  k.ico(0.36 * s, 1, { at: [0, 0.44 * s, -0.22 * s], scale: [1.05, 0.95, 1.05], color: new THREE.Color(c.body).lerp(new THREE.Color(c.key), 0.45), jitter: 0.015, part: TAIL, pivot: [0, 0.4 * s, 0] });
  for (let i = 0; i < 3; i++) k.torus(0.36 * s * (1 - i * 0.1), 0.02 * s, 3, 12, { at: [0, 0.48 * s, -0.12 * s - i * 0.22 * s], scale: [1.05, 0.95, 1], color: c.body, part: TAIL, pivot: [0, 0.4 * s, 0] });
  k.ico(0.24 * s, 1, { at: [0, 0.42 * s, 0.18 * s], scale: [1, 0.85, 1.1], color: c.body });
  k.ico(0.13 * s, 0, { at: [0, 0.5 * s, 0.42 * s], color: c.body, part: HEAD, pivot: [0, 0.45 * s, 0.3 * s] });
  for (const x of [-1, 1]) k.cone(0.03 * s, 0.16 * s, 3, { at: [x * 0.06 * s, 0.46 * s, 0.56 * s], rot: [Math.PI / 2 + 0.3, 0, x * 0.3], color: c.bone, part: HEAD, pivot: [0, 0.45 * s, 0.3 * s] });
  for (let i = 0; i < 3; i++) for (const x of [-1, 1]) {
    const z = (0.28 - i * 0.2) * s, id = (i + (x > 0 ? 1 : 0)) % 2 ? L : R;
    k.tube([[x * 0.18 * s, 0.4 * s, z], [x * 0.34 * s, 0.36 * s, z + 0.04 * s], [x * 0.4 * s, 0.0, z + 0.08 * s]], 0.04 * s, 0.015 * s, 4, { color: c.dark, part: id, pivot: [x * 0.18 * s, 0.4 * s, z] });
  }
};

// ------------------------------------------------------------------ bosses
const gorrak: Build = (k, c, s) => {
  const b = biped(k, c, s, { wide: 1.25, head: 0.1 });
  // horned helm
  k.sphere(b.hr * 1.2, 8, 4, { at: [0, b.hy + b.hr * 0.2, 0], scale: [1, 0.85, 1], color: "#5E5A56", part: HEAD, pivot: [0, b.hy, 0] });
  for (const x of [-1, 1]) k.tube([[x * b.hr * 0.8, b.hy + b.hr * 0.3, 0], [x * b.hr * 1.8, b.hy + b.hr * 0.9, 0.02 * s], [x * b.hr * 1.9, b.hy + b.hr * 2.0, 0.06 * s]], 0.03 * s, 0.008 * s, 5, { color: "#E2D6C0", part: HEAD, pivot: [0, b.hy, 0] });
  // pauldrons and belt
  for (const x of [-1, 1]) k.sphere(0.1 * s, 6, 3, { at: [x * 0.22 * s * 1.25, b.ty + 0.12 * s, 0], scale: [1.2, 0.7, 1.1], color: "#6E6A66" });
  k.box(0.42 * s, 0.05 * s, 0.24 * s, { at: [0, b.ty - 0.14 * s, 0], color: "#3A2E26" });
  // war banner on his back (cloth part waves)
  k.cyl(0.012 * s, 0.012 * s, 0.75 * s, 4, { at: [-0.06 * s, b.ty + 0.32 * s, -0.13 * s], color: "#4A3A2E" });
  k.box(0.2 * s, 0.26 * s, 0.01 * s, { at: [-0.06 * s + 0.1 * s, b.ty + 0.55 * s, -0.13 * s], color: c.key, part: TAIL, pivot: [-0.06 * s, b.ty + 0.55 * s, -0.13 * s] });
  k.ico(0.03 * s, 0, { at: [-0.04 * s + 0.1 * s, b.ty + 0.56 * s, -0.12 * s], color: "#E2D6C0", part: TAIL, pivot: [-0.06 * s, b.ty + 0.55 * s, -0.13 * s] });
  // the cleaver arm (raised for the war cry)
  k.box(0.05 * s, 0.05 * s, 0.32 * s, { at: [0.25 * s, b.ty - 0.1 * s, 0.17 * s], color: "#4A3A2E", part: WEAPON, pivot: [0.24 * s, b.ty + 0.1 * s, 0] });
  k.box(0.02 * s, 0.17 * s, 0.24 * s, { at: [0.25 * s, b.ty - 0.03 * s, 0.38 * s], color: "#B8B4AC", part: WEAPON, pivot: [0.24 * s, b.ty + 0.1 * s, 0] });
};

const wyrmHead: Build = (k, c, s) => {
  k.ico(0.4 * s, 1, { at: [0, 0.38 * s, 0], scale: [1, 0.85, 1.25], color: "#C7A26E", jitter: 0.02 });
  k.cone(0.34 * s, 0.6 * s, 6, { at: [0, 0.36 * s, 0.55 * s], rot: [Math.PI / 2, 0, 0], color: "#B8956A", part: HEAD, pivot: [0, 0.36 * s, 0.2 * s] });
  k.cone(0.24 * s, 0.4 * s, 6, { at: [0, 0.18 * s, 0.5 * s], rot: [Math.PI / 2 + 0.25, 0, 0], color: c.dark, part: HEAD, pivot: [0, 0.36 * s, 0.2 * s] });
  for (const x of [-1, 1]) {
    k.ico(0.05 * s, 0, { at: [x * 0.18 * s, 0.5 * s, 0.42 * s], color: "#FFD27A", emit: 1.2 });
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.3, 0.35); sh.lineTo(0.1, -0.1); sh.lineTo(0, 0);
    k.extrude(sh, 0.02, { at: [x * 0.3 * s, 0.5 * s, 0], rot: [0, x * -1.2, 0], scale: [s, s, s], color: c.key, part: TAIL, pivot: [x * 0.3 * s, 0.5 * s, 0] });
  }
  for (let i = 0; i < 4; i++) k.cone(0.06 * s, 0.22 * s, 4, { at: [0, 0.72 * s, -0.25 * s + i * 0.15 * s], rot: [-0.3, 0, 0], color: c.key });
};

const wyrmSeg: Build = (k, c, s) => {
  k.ico(0.34 * s, 1, { at: [0, 0.3 * s, 0], scale: [1, 0.85, 1.1], color: "#C7A26E", jitter: 0.02 });
  k.cyl(0.36 * s, 0.36 * s, 0.08 * s, 8, { at: [0, 0.3 * s, -0.25 * s], rot: [Math.PI / 2, 0, 0], color: "#A88A60" });
  k.cone(0.05 * s, 0.24 * s, 4, { at: [0, 0.64 * s, 0], rot: [-0.3, 0, 0], color: c.key });
  for (const x of [-1, 1]) k.cone(0.04 * s, 0.18 * s, 3, { at: [x * 0.3 * s, 0.45 * s, 0], rot: [0, 0, -x * 0.9], color: c.key });
};

const colossus: Build = (k, _c, s) => {
  const granite = "#6E7882", dark = "#4E5862", ice = "#BFE6F5";
  for (const [id, x] of [[L, -0.18], [R, 0.18]] as const) {
    k.box(0.2 * s, 0.34 * s, 0.24 * s, { at: [x * s, 0.17 * s, 0], color: dark, jitter: 0.01, part: id, pivot: [x * s, 0.34 * s, 0] });
    k.dodeca(0.15 * s, { at: [x * s, 0.36 * s, 0.02 * s], color: granite, jitter: 0.02, part: id, pivot: [x * s, 0.34 * s, 0] });
  }
  k.dodeca(0.4 * s, { at: [0, 0.68 * s, 0], scale: [1.2, 1, 0.85], color: granite, jitter: 0.04 });
  k.dodeca(0.32 * s, { at: [0, 0.86 * s, -0.08 * s], scale: [1.4, 0.8, 0.9], color: dark, jitter: 0.04 });
  // the pale-blue glowing chest core
  k.octa(0.11 * s, { at: [0, 0.7 * s, 0.3 * s], color: "#9FE4FF", emit: 1.5 });
  k.ico(0.06 * s, 0, { at: [0, 1.0 * s, 0.22 * s], color: "#9FE4FF", emit: 1.1, part: HEAD, pivot: [0, 0.95 * s, 0.1 * s] });
  k.dodeca(0.12 * s, { at: [0, 1.0 * s, 0.14 * s], color: granite, part: HEAD, pivot: [0, 0.95 * s, 0.1 * s] });
  // arms like boulders
  for (const [id, x] of [[AL, -0.5], [AR, 0.5]] as const) {
    k.dodeca(0.15 * s, { at: [x * s, 0.86 * s, 0], color: granite, part: id, pivot: [x * 0.9 * s, 0.9 * s, 0] });
    k.box(0.16 * s, 0.42 * s, 0.18 * s, { at: [x * 1.05 * s, 0.58 * s, 0.04 * s], color: dark, part: id, pivot: [x * 0.9 * s, 0.9 * s, 0] });
    k.dodeca(0.14 * s, { at: [x * 1.05 * s, 0.34 * s, 0.06 * s], color: granite, part: id, pivot: [x * 0.9 * s, 0.9 * s, 0] });
  }
  // ice crystal growths
  const rnd = mulberry(4);
  for (let i = 0; i < 9; i++) {
    const a = rnd() * TAU, y = 0.7 + rnd() * 0.35;
    k.cyl(0, 0.05 * s, (0.18 + rnd() * 0.2) * s, 5, { at: [Math.cos(a) * 0.32 * s, y * s, Math.sin(a) * 0.24 * s - 0.06 * s], rot: [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7], color: i % 2 ? ice : "#D8F0FA" });
  }
};

const tyrant: Build = (k, _c, s) => {
  // obsidian dragon-lord, bone crown, magma veins
  const ob = "#1E1A1C", vein = "#FF7A2A";
  for (const [id, x] of [[L, -0.13], [R, 0.13]] as const) {
    k.box(0.13 * s, 0.3 * s, 0.16 * s, { at: [x * s, 0.15 * s, 0], color: ob, part: id, pivot: [x * s, 0.3 * s, 0] });
    k.box(0.15 * s, 0.03 * s, 0.17 * s, { at: [x * s, 0.18 * s, 0.01 * s], color: vein, emit: 1.6, part: id, pivot: [x * s, 0.3 * s, 0] });
  }
  k.ico(0.2 * s, 1, { at: [0, 0.48 * s, 0], scale: [1.15, 1.1, 0.9], color: ob });
  k.box(0.04 * s, 0.3 * s, 0.02 * s, { at: [0, 0.48 * s, 0.17 * s], color: vein, emit: 1.8 });
  k.box(0.22 * s, 0.03 * s, 0.02 * s, { at: [0, 0.52 * s, 0.17 * s], rot: [0, 0, 0.4], color: vein, emit: 1.8 });
  // neck and head that rears for the breath
  k.tube([[0, 0.6 * s, 0.06 * s], [0, 0.72 * s, 0.14 * s], [0, 0.8 * s, 0.22 * s]], 0.07 * s, 0.055 * s, 5, { color: ob, part: WEAPON, pivot: [0, 0.6 * s, 0.05 * s] });
  k.cone(0.07 * s, 0.24 * s, 5, { at: [0, 0.82 * s, 0.34 * s], rot: [Math.PI / 2, 0, 0], color: ob, part: WEAPON, pivot: [0, 0.6 * s, 0.05 * s] });
  for (let i = 0; i < 5; i++) { const a = -0.8 + i * 0.4; k.cone(0.018 * s, 0.11 * s, 3, { at: [Math.sin(a) * 0.06 * s, 0.9 * s, 0.24 * s - Math.cos(a) * 0.02 * s], rot: [-0.3, 0, a], color: "#E2D6C0", part: WEAPON, pivot: [0, 0.6 * s, 0.05 * s] }); }
  for (const x of [-1, 1]) k.ico(0.015 * s, 0, { at: [x * 0.035 * s, 0.86 * s, 0.4 * s], color: "#FFD27A", emit: 1.8, part: WEAPON, pivot: [0, 0.6 * s, 0.05 * s] });
  for (const [id, x] of [[AL, -0.24], [AR, 0.24]] as const) k.box(0.08 * s, 0.28 * s, 0.09 * s, { at: [x * s, 0.44 * s, 0.03 * s], color: ob, part: id, pivot: [x * s, 0.58 * s, 0] });
  k.tube([[0, 0.3 * s, -0.12 * s], [0.06 * s, 0.14 * s, -0.4 * s], [-0.04 * s, 0.04 * s, -0.7 * s]], 0.07 * s, 0.01 * s, 5, { color: ob, part: TAIL, pivot: [0, 0.3 * s, -0.12 * s] });
  // wings (folded on the ground, spread in flight: the units system scales part 6/7 via the flap)
  for (const [id, x] of [[WL, -1], [WR, 1]] as const) {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.1); sh.lineTo(0.45, 0.38); sh.lineTo(1.0, 0.2); sh.lineTo(0.85, 0.02); sh.lineTo(0.6, 0.06); sh.lineTo(0.42, -0.14); sh.lineTo(0.2, -0.06); sh.lineTo(0, -0.14); sh.lineTo(0, 0.1);
    k.extrude(sh, 0.015, { at: [x * 0.12 * s, 0.6 * s, -0.08 * s], rot: [-0.25, x < 0 ? Math.PI : 0, x * 1.1], scale: [s * 0.8, s * 0.8, s], color: "#3A2224", part: id, pivot: [x * 0.12 * s, 0.6 * s, -0.08 * s] });
    k.box(0.5 * s, 0.02 * s, 0.02 * s, { at: [x * 0.22 * s, 0.9 * s, -0.1 * s], rot: [0, 0, x * 1.1], color: vein, emit: 1.4, part: id, pivot: [x * 0.12 * s, 0.6 * s, -0.08 * s] });
  }
};

const lich: Build = (k, c, s) => {
  warlock(k, { ...c, key: "#3A3448", body: "#1E1A22" }, s);
  k.ico(0.07 * s, 1, { at: [0, 1.08 * s, 0.06 * s], color: c.bone, part: HEAD, pivot: [0, 1.0 * s, 0] });
  crown(k, 1.2 * s, 0.07 * s);
  k.torus(0.42 * s, 0.012 * s, 3, 20, { at: [0, 0.6 * s, 0], rot: [Math.PI / 2, 0, 0], color: "#A472FF", emit: 1.4, part: ORBIT, pivot: [0, 0.6 * s, 0] });
};

const hivequeen: Build = (k, c, s) => {
  matron(k, c, s);
  for (const [id, x] of [[WL, -1], [WR, 1]] as const) {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.35, 0.3, 0.7, 0.05); sh.quadraticCurveTo(0.35, -0.12, 0, 0);
    k.extrude(sh, 0.01, { at: [x * 0.12 * s, 0.62 * s, 0.05 * s], rot: [-Math.PI / 2 + 0.3, x < 0 ? Math.PI : 0, 0], scale: [s, s, s], color: "#E8E0C8", part: id, pivot: [x * 0.12 * s, 0.62 * s, 0.05 * s] });
  }
  crown(k, 0.62 * s, 0.07 * s);
};

const packlord: Build = (k, c, s) => {
  // a great wolf-runner: low, long, maned
  for (const [id, x, z] of [[L, -0.1, 0.18], [R, 0.1, 0.18], [R, -0.1, -0.2], [L, 0.1, -0.2]] as const) k.box(0.06 * s, 0.26 * s, 0.07 * s, { at: [x * s, 0.13 * s, z * s], color: c.body, part: id, pivot: [x * s, 0.26 * s, z * s] });
  k.ico(0.18 * s, 1, { at: [0, 0.34 * s, 0], scale: [0.85, 0.75, 1.7], color: c.body });
  k.ico(0.16 * s, 0, { at: [0, 0.42 * s, 0.2 * s], scale: [1.1, 0.9, 1.1], color: c.key });
  k.cone(0.09 * s, 0.26 * s, 5, { at: [0, 0.44 * s, 0.42 * s], rot: [Math.PI / 2, 0, 0], color: c.body, part: HEAD, pivot: [0, 0.42 * s, 0.3 * s] });
  for (const x of [-1, 1]) k.cone(0.03 * s, 0.09 * s, 3, { at: [x * 0.05 * s, 0.53 * s, 0.34 * s], color: c.body, part: HEAD, pivot: [0, 0.42 * s, 0.3 * s] });
  for (const x of [-1, 1]) k.ico(0.012 * s, 0, { at: [x * 0.04 * s, 0.47 * s, 0.47 * s], color: "#FFD27A", emit: 1.4, part: HEAD, pivot: [0, 0.42 * s, 0.3 * s] });
  k.tube([[0, 0.38 * s, -0.28 * s], [0, 0.42 * s, -0.48 * s], [0, 0.34 * s, -0.62 * s]], 0.05 * s, 0.015 * s, 4, { color: c.key, part: TAIL, pivot: [0, 0.38 * s, -0.28 * s] });
  crown(k, 0.52 * s, 0.05 * s);
};

// ------------------------------------------------------------------ soldiers (our side: blue, white, gold; never red)
const soldier = (kind: SoldierKind): Build => (k, c0, s) => {
  const blue = SHARED.blue, gold = SHARED.gold;
  const steel = "#9AA2AC";
  if (kind === "treant") {
    const bark = "#5A4632", moss = "#4FAE5C";
    for (const [id, x] of [[L, -0.12], [R, 0.12]] as const) k.box(0.14 * s, 0.34 * s, 0.16 * s, { at: [x * s, 0.17 * s, 0], color: bark, part: id, pivot: [x * s, 0.34 * s, 0] });
    k.cyl(0.2 * s, 0.26 * s, 0.6 * s, 6, { at: [0, 0.62 * s, 0], color: bark, jitter: 0.01 });
    k.ico(0.34 * s, 0, { at: [0, 1.08 * s, 0], color: moss, jitter: 0.03 });
    k.ico(0.24 * s, 0, { at: [0.2 * s, 1.0 * s, -0.12 * s], color: "#6EA84E", jitter: 0.02 });
    for (const x of [-1, 1]) k.ico(0.03 * s, 0, { at: [x * 0.07 * s, 0.78 * s, 0.22 * s], color: "#FFE6A0", emit: 0.8 });
    for (const [id, x] of [[AL, -0.3], [AR, 0.3]] as const) k.tube([[x * 0.8 * s, 0.8 * s, 0], [x * s, 0.55 * s, 0.08 * s], [x * 1.1 * s, 0.3 * s, 0.1 * s]], 0.06 * s, 0.03 * s, 4, { color: bark, part: id === AR ? WEAPON : id, pivot: [x * 0.8 * s, 0.8 * s, 0] });
    return;
  }
  const c: Pal = {
    ...c0, body: kind === "blademaster" ? "#3A3230" : kind === "paladin" ? "#E8E4DA" : steel, key: kind === "blademaster" ? "#1E3A6E" : blue,
    skin: "#E0BC9A", dark: "#3A3230",
  };
  const b = biped(k, c, s, { cloth: kind === "paladin" ? "#E8E4DA" : kind === "blademaster" ? "#2A2422" : blue, torso: kind === "paladin" ? "#E8E4DA" : steel });
  if (kind === "blademaster") {
    k.box(0.33 * s, 0.05 * s, 0.22 * s, { at: [0, b.ty - 0.04 * s, 0], color: "#B8323A" }); // crimson sash (art 4.3)
    for (const [id, x] of [[AL, -0.21], [WEAPON, 0.21]] as const) k.box(0.02 * s, 0.03 * s, 0.34 * s, { at: [x * s, b.ty - 0.1 * s, 0.17 * s], color: "#D8DCE2", part: id, pivot: [x * s, b.ty + 0.1 * s, 0] });
    k.sphere(b.hr * 1.05, 7, 4, { at: [0, b.hy + 0.02 * s, -0.01 * s], scale: [1, 0.7, 1], color: "#2A2422", part: HEAD, pivot: [0, b.hy, 0] });
  } else {
    k.sphere(b.hr * 1.12, 8, 4, { at: [0, b.hy + b.hr * 0.25, 0], scale: [1, 0.85, 1], color: kind === "paladin" ? gold : steel, part: HEAD, pivot: [0, b.hy, 0] });
    // shield: round with a gold boss (soldier), kite (paladin)
    if (kind === "paladin") {
      k.box(0.2 * s, 0.28 * s, 0.035 * s, { at: [-0.25 * s, b.ty - 0.02 * s, 0.07 * s], rot: [0, 0.4, 0], color: "#F1EADB", part: AL, pivot: [-0.19 * s, b.ty + 0.1 * s, 0] });
      k.box(0.05 * s, 0.2 * s, 0.04 * s, { at: [-0.25 * s, b.ty - 0.02 * s, 0.09 * s], rot: [0, 0.4, 0], color: gold, part: AL, pivot: [-0.19 * s, b.ty + 0.1 * s, 0] });
    } else {
      k.cyl(0.13 * s, 0.13 * s, 0.035 * s, 10, { at: [-0.24 * s, b.ty, 0.05 * s], rot: [0, 0, Math.PI / 2], color: blue, part: AL, pivot: [-0.19 * s, b.ty + 0.1 * s, 0] });
      k.cyl(0.045 * s, 0.045 * s, 0.045 * s, 6, { at: [-0.26 * s, b.ty, 0.05 * s], rot: [0, 0, Math.PI / 2], color: gold, part: AL, pivot: [-0.19 * s, b.ty + 0.1 * s, 0] });
    }
    k.box(0.025 * s, 0.03 * s, 0.32 * s, { at: [0.21 * s, b.ty - 0.1 * s, 0.16 * s], color: "#D8DCE2", part: WEAPON, pivot: [0.21 * s, b.ty + 0.1 * s, 0] });
    k.box(0.1 * s, 0.025 * s, 0.03 * s, { at: [0.21 * s, b.ty - 0.1 * s, 0.02 * s], color: gold, part: WEAPON, pivot: [0.21 * s, b.ty + 0.1 * s, 0] });
  }
  if (kind === "reinforcement") k.cone(0.05 * s, 0.1 * s, 4, { at: [0, b.hy + 0.16 * s, 0], color: gold, part: HEAD, pivot: [0, b.hy, 0] });
};

// ------------------------------------------------------------------ table
interface Spec { span?: number; h: number; build: Build; motion: [number, number, number, number]; freq: number; foot: number; flyer?: boolean; base?: number; outline?: number }


const ENEMY: Record<string, Spec> = {
  footman: { h: 0.75, base: 0.75, build: footman, motion: [0.03, 0.5, 0, 0.5], freq: 2, foot: 0.5 },
  runner: { h: 0.6, base: 0.68, build: runner, motion: [0.035, 0.7, 0, 1], freq: 4, foot: 0.4 },
  brute: { h: 1.2, base: 1.0, build: brute, motion: [0.04, 0.35, 0, 0.5], freq: 1.2, foot: 0.9, outline: 1.15 },
  acolyte: { h: 0.8, base: 0.9, build: acolyte, motion: [0.05, 0, 1, 0.6], freq: 1.5, foot: 0.45 },
  shieldbearer: { h: 1.0, base: 0.82, build: shieldbearer, motion: [0.025, 0.4, 0, 0.5], freq: 1.6, foot: 0.6 },
  shaman: { h: 0.85, base: 0.98, build: shaman, motion: [0.02, 0.35, 5, 0.5], freq: 1.6, foot: 0.5 },
  splitter: { h: 0.7, base: 0.5, build: slime(1.15), motion: [0.08, 0, 2, 0], freq: 1.6, foot: 0.75 },
  slime: { h: 0.48, base: 0.5, build: slime(1.15), motion: [0.07, 0, 2, 0], freq: 2, foot: 0.5 },
  slimelet: { h: 0.32, base: 0.5, build: slime(1.15), motion: [0.05, 0, 2, 0], freq: 2.6, foot: 0.34 },
  sandling: { h: 0.48, base: 0.5, build: slime(1.15), motion: [0.07, 0, 2, 0], freq: 2, foot: 0.5 },
  shade: { h: 0.8, base: 0.86, build: shade, motion: [0.06, 0, 4, 1.4], freq: 1.2, foot: 0.45 },
  swarmling: { h: 0.45, base: 0.38, build: swarmling(), motion: [0.02, 0.8, 0, 0], freq: 6, foot: 0.3 },
  brood: { h: 0.4, base: 0.38, build: swarmling(), motion: [0.02, 0.8, 0, 0], freq: 6, foot: 0.28 },
  shard: { h: 0.45, base: 0.38, build: swarmling("#BFE6F5", "#5D6672"), motion: [0.02, 0.8, 0, 0], freq: 5, foot: 0.3 },
  sapper: { h: 0.7, base: 0.86, build: sapper, motion: [0.03, 0.6, 0, 0.3], freq: 3, foot: 0.45 },
  bat: { span: 0.8, h: 0.5, base: 0.5, build: bat, motion: [0.05, 0.9, 3, 0], freq: 7, foot: 0.6, flyer: true },
  drake: { span: 2.4, h: 1.4, base: 0.55, build: drake, motion: [0.08, 0.5, 3, 0.6], freq: 1.4, foot: 1.6, flyer: true, outline: 1.15 },
  "ember-drake": { span: 2.4, h: 1.4, base: 0.55, build: drake, motion: [0.08, 0.5, 3, 0.6], freq: 1.4, foot: 1.6, flyer: true, outline: 1.15 },
  juggernaut: { h: 1.8, base: 1.34, build: juggernaut, motion: [0.05, 0.3, 0, 0], freq: 1.0, foot: 1.2, outline: 1.25 },
  warlock: { h: 1.3, base: 1.3, build: warlock, motion: [0.06, 0, 1, 0.5], freq: 1.1, foot: 0.7, outline: 1.15 },
  matron: { h: 1.2, base: 0.93, build: matron, motion: [0.03, 0.35, 5, 0.25], freq: 1.6, foot: 1.4, outline: 1.2 },
  risen: { h: 0.72, base: 0.75, build: risen, motion: [0.035, 0.45, 0, 0.5], freq: 1.8, foot: 0.45 },
  skeleton: { h: 0.72, base: 0.75, build: risen, motion: [0.035, 0.45, 0, 0.5], freq: 1.8, foot: 0.45 },
  pup: { h: 0.5, base: 0.68, build: runner, motion: [0.03, 0.7, 0, 1], freq: 4.5, foot: 0.35 },
  "ember-runner": { h: 0.6, base: 0.68, build: runner, motion: [0.035, 0.7, 0, 1], freq: 4, foot: 0.4 },
  gorrak: { h: 2.8, base: 0.78, build: gorrak, motion: [0.05, 0.35, 0, 0.6], freq: 0.8, foot: 1.6, outline: 1.4 },
  wyrm: { h: 1.8, base: 0.75, build: wyrmHead, motion: [0.04, 0, 1, 0.5], freq: 1.0, foot: 1.6, outline: 1.4 },
  "wyrm-seg": { h: 1.3, base: 0.7, build: wyrmSeg, motion: [0.04, 0, 1, 0], freq: 1.0, foot: 1.2, outline: 1.3 },
  colossus: { h: 3.4, base: 1.1, build: colossus, motion: [0.06, 0.25, 0, 0], freq: 0.6, foot: 2.2, outline: 1.5 },
  tyrant: { h: 3.2, base: 0.95, build: tyrant, motion: [0.05, 0.35, 0, 0.6], freq: 0.8, foot: 2.0, outline: 1.4 },
  hivequeen: { h: 2.1, base: 0.93, build: hivequeen, motion: [0.03, 0.35, 5, 0.25], freq: 1.2, foot: 2.2, outline: 1.4 },
  lich: { h: 2.8, base: 1.3, build: lich, motion: [0.08, 0, 1, 0.6], freq: 0.8, foot: 1.2, outline: 1.4 },
  packlord: { h: 1.9, base: 0.6, build: packlord, motion: [0.05, 0.6, 0, 1], freq: 2.2, foot: 1.8, outline: 1.4 },
  mound: { h: 0.35, build: (k) => { k.ico(0.7, 1, { at: [0, 0, 0], scale: [1, 0.35, 1.3], color: "#B8956A", jitter: 0.05 }); for (let i = 0; i < 5; i++) k.dodeca(0.12, { at: [Math.cos(i * 1.3) * 0.6, 0.08, Math.sin(i * 1.3) * 0.7], color: "#A88A60", jitter: 0.03 }); }, motion: [0.04, 0, 2, 0], freq: 2.5, foot: 1.6 },
  // our side
  soldier: { h: 0.7, base: 0.75, build: soldier("soldier"), motion: [0.03, 0.5, 0, 0], freq: 2.2, foot: 0.45 },
  paladin: { h: 0.74, base: 0.75, build: soldier("paladin"), motion: [0.03, 0.5, 0, 0], freq: 2.0, foot: 0.48 },
  blademaster: { h: 0.72, base: 0.75, build: soldier("blademaster"), motion: [0.03, 0.55, 0, 0], freq: 2.6, foot: 0.45 },
  reinforcement: { h: 0.66, base: 0.75, build: soldier("reinforcement"), motion: [0.03, 0.5, 0, 0], freq: 2.2, foot: 0.42 },
  treant: { h: 1.6, base: 1.4, build: soldier("treant"), motion: [0.04, 0.3, 0, 0], freq: 0.9, foot: 1.0, outline: 1.2 },
};

export const UNIT_KINDS = Object.keys(ENEMY);
export function unitSpec(kind: string): Spec { return ENEMY[kind] ?? ENEMY.footman!; }

const natural = new Map<string, number>();
/** Scale so the model's height matches its size class (measured once from a unit-scale build). */
function scaleOf(kind: string, look: Look): number {
  const sp = unitSpec(kind);
  let h = natural.get(kind);
  if (h === undefined) {
    const k = new Kit();
    sp.build(k, palOf(look), 1);
    const g = k.build();
    const bb = g.boundingBox!;
    h = sp.span ? (bb.max.x - bb.min.x) / sp.h * sp.h : Math.max(0.05, bb.max.y - Math.min(0, bb.min.y));
    natural.set(kind, h);
    g.dispose();
  }
  return (sp.span ?? sp.h) / h;
}

export function buildUnit(kind: string, look: Look, elite = false): UnitModel {
  const sp = unitSpec(kind);
  const k = new Kit();
  const pal = palOf(look);
  const s = scaleOf(kind, look);
  sp.build(k, kind === "ember-runner" || kind === "ember-drake" ? { ...pal, key: "#E2D6C0", body: "#1E1A1C" } : pal, s);
  if (elite) {
    // an elite's crown rim (art 3.2) above the head
    const top = kind === "matron" ? 0.62 * sp.h / 1 : sp.h * 0.98;
    crown(k, kind === "matron" ? 0.42 * sp.h : top, Math.max(0.08, sp.h * 0.075));
  }
  return { geo: k.build(), motion: sp.motion, freq: sp.freq, foot: sp.foot, height: sp.h, flyer: sp.flyer, outline: sp.outline };
}

export const buildElite = (kind: string, look: Look) => buildUnit(kind, look, true);

function mulberry(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { let t = (s = (s + 0x6d2b79f5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export type { EnemyId, V3, SoldierKind };
