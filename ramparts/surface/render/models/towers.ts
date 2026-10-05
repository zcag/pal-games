// Tower models (art 4): 12 towers x L1-L3 + 24 specialisations. Shape families read at L1
// (tall-thin single target, squat-wide splash, round/organic area, open-topped siege/support); the
// level reads from the material alone (rough timber / rubble base / dressed stone with iron and gold /
// a crown module); one bright accent per tower. Parts: a static body, a head that turns to aim,
// a spinning/bobbing accent, cloth flags. Model faces +Z, stands on y = 0 (the pad's top).
import * as THREE from "../../vendor/three.js";
import type { SpecId, TowerId } from "../../../game/types.ts";
import { Kit, TAU, type V3 } from "./kit.ts";
import { ACCENT, MAT, SHARED } from "../palette.ts";

export interface Flag { geo: THREE.BufferGeometry; at: V3; rotY: number; head?: boolean }
export interface TowerModel {
  body: THREE.BufferGeometry;
  head: THREE.BufferGeometry | null;
  headY: number;
  spin: THREE.BufferGeometry | null;
  spinY: number;
  spinSpeed: number;
  bob: number;
  flags: Flag[];
  /** Projectile origin, local to the head (before its yaw). */
  muzzle: V3;
  height: number;
  /** What the head does when idle: scan (archers), sweep (beacon), none. */
  idle: "scan" | "sweep" | "none";
  recoil: number;
}

interface TB { body: Kit; head: Kit; spin: Kit; flags: Flag[]; muzzle: V3; headY: number; spinY: number; spinSpeed: number; bob: number; h: number; idle: TowerModel["idle"]; recoil: number }

const L3 = (lvl: number) => Math.min(3, lvl);
const steel = "#8C939C", dark = "#2E2A28", copper = "#B8733A", gold = MAT.trim;

/** Wall colour by level and height fraction (art 4.1 materials). */
function wall(lvl: number, frac: number) {
  if (lvl === 1) return MAT.timber;
  if (lvl === 2) return frac < 0.4 ? MAT.rubble : MAT.timber;
  return frac < 0.6 ? MAT.stone : "#C2B9A8";
}

/** A square shaft from y0 to y1, materials by level. */
function squareShaft(k: Kit, lvl: number, w: number, y0: number, y1: number) {
  const h = y1 - y0;
  if (lvl === 1) {
    k.box(w * 0.9, h, w * 0.9, { at: [0, y0 + h / 2, 0], rot: [0, 0.03, 0.015], color: MAT.plank, jitter: 0.012, shade: 0.08 });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.box(0.1, h + 0.08, 0.1, { at: [x! * w * 0.45, y0 + h / 2, z! * w * 0.45], rot: [0, 0, x! * 0.02], color: MAT.darkWood });
    for (const f of [0.3, 0.72]) k.box(w * 0.94, 0.05, w * 0.94, { at: [0, y0 + h * f, 0], color: MAT.rope });
    // planks: vertical seams on the front
    for (let i = -1; i <= 1; i++) k.box(0.025, h * 0.9, 0.01, { at: [i * w * 0.22, y0 + h / 2, w * 0.455], color: MAT.darkWood });
  } else if (lvl === 2) {
    const hb = h * 0.4;
    k.box(w, hb, w, { at: [0, y0 + hb / 2, 0], color: MAT.rubble, jitter: 0.03, shade: 0.1 });
    for (let i = 0; i < 6; i++) k.dodeca(0.13, { at: [(i % 3 - 1) * w * 0.38, y0 + 0.08 + (i > 2 ? hb * 0.5 : 0), w * 0.5], scale: [1.2, 0.8, 0.5], color: "#8C8478", jitter: 0.02, seed: i });
    k.box(w * 0.9, h - hb, w * 0.9, { at: [0, y0 + hb + (h - hb) / 2, 0], color: MAT.plank, jitter: 0.008, shade: 0.07 });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.box(0.1, h - hb + 0.06, 0.1, { at: [x! * w * 0.45, y0 + hb + (h - hb) / 2, z! * w * 0.45], color: MAT.darkWood });
  } else {
    const hb = h * 0.6;
    k.box(w, hb, w, { at: [0, y0 + hb / 2, 0], color: MAT.stone, jitter: 0.006, shade: 0.05 });
    // block courses
    for (let i = 1; i < 4; i++) k.box(w + 0.01, 0.018, w + 0.01, { at: [0, y0 + (hb * i) / 4, 0], color: "#9C9384" });
    k.box(w * 0.95, h - hb, w * 0.95, { at: [0, y0 + hb + (h - hb) / 2, 0], color: "#C2B9A8", shade: 0.05 });
    for (const f of [0.18, 0.62]) {
      k.box(w + 0.04, 0.07, w + 0.04, { at: [0, y0 + h * f, 0], color: MAT.iron });
      for (let i = -1; i <= 1; i++) k.box(0.04, 0.04, 0.02, { at: [i * w * 0.32, y0 + h * f, w / 2 + 0.03], color: "#6A6E75" });
    }
  }
}

/** A round shaft (cylinder or taper), materials by level. */
function roundShaft(k: Kit, lvl: number, rb: number, rt: number, y0: number, y1: number, seg = 8) {
  const h = y1 - y0;
  if (lvl === 1) {
    k.cyl(rt * 0.95, rb * 0.95, h, seg, { at: [0, y0 + h / 2, 0], rot: [0.02, 0, 0.02], color: MAT.plank, jitter: 0.012, shade: 0.08 });
    for (const f of [0.25, 0.7]) { const r = rb + (rt - rb) * f; k.cyl(r, r, 0.05, seg, { at: [0, y0 + h * f, 0], color: MAT.rope }); }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; k.box(0.08, h, 0.08, { at: [Math.cos(a) * (rb + rt) * 0.48, y0 + h / 2, Math.sin(a) * (rb + rt) * 0.48], color: MAT.darkWood }); }
  } else if (lvl === 2) {
    const hb = h * 0.4, rm = rb + (rt - rb) * 0.4;
    k.cyl(rm, rb, hb, seg, { at: [0, y0 + hb / 2, 0], color: MAT.rubble, jitter: 0.03, shade: 0.1 });
    k.cyl(rt * 0.95, rm * 0.92, h - hb, seg, { at: [0, y0 + hb + (h - hb) / 2, 0], color: MAT.plank, jitter: 0.01, shade: 0.07 });
    k.cyl(rm * 0.95, rm * 0.95, 0.05, seg, { at: [0, y0 + hb + 0.02, 0], color: MAT.rope });
  } else {
    const hb = h * 0.6, rm = rb + (rt - rb) * 0.6;
    k.cyl(rm, rb, hb, seg, { at: [0, y0 + hb / 2, 0], color: MAT.stone, jitter: 0.004, shade: 0.05 });
    k.cyl(rt, rm * 0.97, h - hb, seg, { at: [0, y0 + hb + (h - hb) / 2, 0], color: "#C2B9A8", shade: 0.05 });
    for (const f of [0.15, 0.6]) { const r = rb + (rt - rb) * f + 0.025; k.cyl(r, r, 0.07, seg, { at: [0, y0 + h * f, 0], color: MAT.iron }); }
  }
}

function crenels(k: Kit, lvl: number, w: number, y: number, round: boolean, n = 4) {
  const c = lvl === 1 ? MAT.darkWood : lvl === 2 ? MAT.rubble : MAT.stone;
  if (round) {
    const m = n * 2;
    for (let i = 0; i < m; i++) { const a = (i / m) * TAU; k.box(0.14, 0.16, 0.12, { at: [Math.cos(a) * w, y + 0.08, Math.sin(a) * w], rot: [0, -a, 0], color: c, jitter: 0.008 }); }
  } else {
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
      const t = (i + 0.5) / n - 0.5;
      k.box(0.14, 0.16, 0.1, { at: [t * w * 2, y + 0.08, s * w], color: c, jitter: 0.008 });
      k.box(0.1, 0.16, 0.14, { at: [s * w, y + 0.08, t * w * 2], color: c, jitter: 0.008 });
    }
  }
  if (lvl >= 3) k.box(round ? 0 : w * 2 + 0.06, 0.035, round ? 0 : 0.035, { at: [0, y + 0.01, w + 0.02], color: gold });
}

/** Peaked roof: thatch (L1), slate (L2), slate with a gold finial (L3). */
function roof(k: Kit, lvl: number, r: number, y: number, h: number, sides = 4, at: V3 = [0, 0, 0]) {
  const c = lvl === 1 ? MAT.thatch : MAT.slate;
  k.cone(r, h, sides, { at: [at[0], y + h / 2, at[2]], rot: [0, sides === 4 ? Math.PI / 4 : 0, 0], color: c, jitter: lvl === 1 ? 0.02 : 0.005, shade: 0.06 });
  if (lvl >= 3) {
    k.cyl(0.02, 0.02, 0.22, 4, { at: [at[0], y + h + 0.1, at[2]], color: gold });
    k.ico(0.045, 0, { at: [at[0], y + h + 0.22, at[2]], color: gold });
  }
}

/** Blue pennant for L3+ (art 4.1) on a pole. */
function pennant(t: TB, at: V3, len = 0.42, col = SHARED.blue) {
  t.body.cyl(0.018, 0.018, 0.55, 4, { at: [at[0], at[1] + 0.27, at[2]], color: MAT.darkWood });
  t.flags.push({ geo: cloth(len, 0.16, col, gold, true), at: [at[0], at[1] + 0.53, at[2]], rotY: 0 });
}

/** A cloth (flag material: hangs from x = 0 along +x). `tri` makes a swallow-tail pennant. */
export function cloth(w: number, h: number, col: string, trim: string, tri = false) {
  const k = new Kit();
  const seg = 5;
  for (let i = 0; i < seg; i++) {
    const t0 = i / seg, t1 = (i + 1) / seg;
    const hh = tri ? h * (1 - (t0 + t1) / 2 * 0.75) : h;
    k.box(w / seg, hh, 0.012, { at: [(t0 + t1) / 2 * w, -hh / 2, 0], color: col, shade: 0.02 });
  }
  k.box(0.02, h, 0.016, { at: [0.01, -h / 2, 0], color: trim });
  return k.build();
}

/** A hanging banner (static, vertical) on the front face. */
function frontBanner(k: Kit, w: number, h: number, y: number, z: number, col: string, emit = 0) {
  k.box(w + 0.08, 0.04, 0.04, { at: [0, y, z + 0.02], color: MAT.darkWood });
  k.box(w, h, 0.02, { at: [0, y - h / 2, z + 0.02], color: col, emit, shade: 0.03 });
  const tip = new THREE.Shape(); tip.moveTo(-w / 2, 0); tip.lineTo(w / 2, 0); tip.lineTo(0, -0.12); tip.lineTo(-w / 2, 0);
  k.extrude(tip, 0.02, { at: [0, y - h, z + 0.02], color: col, emit });
}

function levelNotches(k: Kit, lvl: number) {
  const n = Math.min(3, lvl);
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.16;
    k.box(0.05, 0.03, 0.09, { at: [Math.cos(a) * 0.73, 0.012, Math.sin(a) * 0.73], rot: [0, -a, 0], color: lvl >= 4 ? "#FFE6A0" : gold, emit: 0.35 });
  }
}

function figure(k: Kit, at: V3, s: number, tunic: string, hood: string, bow = true, facing = 0) {
  const [x, y, z] = at;
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), facing), new THREE.Vector3(s, s, s));
  const f = new Kit();
  f.box(0.16, 0.22, 0.12, { at: [0, 0.11, 0], color: "#4A3A2E" });
  f.box(0.2, 0.2, 0.15, { at: [0, 0.3, 0], color: tunic });
  f.ico(0.075, 0, { at: [0, 0.47, 0], color: "#D8B490" });
  f.cone(0.1, 0.16, 5, { at: [0, 0.53, -0.01], color: hood });
  if (bow) {
    f.torus(0.15, 0.012, 3, 8, { at: [0.1, 0.33, 0.12], rot: [0, Math.PI / 2, 0], color: "#6A5038" }, Math.PI);
    f.box(0.012, 0.012, 0.22, { at: [0.06, 0.33, 0.08], color: "#E6DCC8" });
  }
  f.box(0.06, 0.2, 0.06, { at: [-0.08, 0.36, -0.08], rot: [0.3, 0, 0], color: hood });
  k.merge(f, m);
}

// ------------------------------------------------------------------ the twelve
function archer(t: TB, lvl: number, spec: SpecId | null) {
  const L = L3(lvl), w = [0.82, 0.9, 0.98][L - 1]!, h = [1.15, 1.55, 1.95][L - 1]!;
  squareShaft(t.body, L, w, 0, h);
  const pw = spec === "volley" ? w + 0.42 : w + 0.16;
  t.body.box(pw, 0.1, pw, { at: [0, h + 0.05, 0], color: L === 1 ? MAT.darkWood : L === 2 ? MAT.timber : "#A89E8C" });
  crenels(t.body, L, pw / 2, h + 0.1, false, spec === "volley" ? 4 : 3);
  frontBanner(t.body, 0.26, h * 0.32, h - 0.06, w / 2 + 0.01, ACCENT.archer!, 0.25);
  t.headY = h + 0.1;
  const hood = spec === "marksmen" ? "#6A7A3A" : "#8A5A32";
  if (spec === "marksmen") {
    // one tall hooded sniper on a high narrow perch, a spyglass glint
    t.body.box(0.32, 0.7, 0.32, { at: [0, h + 0.45, -0.05], color: MAT.stone, jitter: 0.004 });
    t.body.box(0.42, 0.06, 0.42, { at: [0, h + 0.82, -0.05], color: MAT.iron });
    t.headY = h + 0.85;
    figure(t.head, [0, 0, 0], 1.25, "#5A6A32", "#C8A84A", true);
    t.head.ico(0.025, 0, { at: [0.05, 0.6, 0.12], color: "#FFF4D6", emit: 1.4 });
    t.muzzle = [0.1, 0.42, 0.25];
    roof(t.body, 3, 0.3, h + 1.55, 0.3, 4, [0, 0, -0.05]);
    t.body.cyl(0.02, 0.02, 0.7, 4, { at: [0.16, h + 1.2, -0.2], color: MAT.darkWood });
  } else {
    const n = spec === "volley" ? 4 : L === 3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * (spec === "volley" ? 0.32 : 0.3);
      figure(t.head, [x, 0, 0.05 + (i % 2) * 0.06], 1, "#5A4A3A", hood, true);
    }
    t.muzzle = [0, 0.35, 0.3];
    if (L >= 2) {
      // a peaked hood roof on a pole, off to the back so the archers stay visible
      t.body.cyl(0.03, 0.03, 0.9, 4, { at: [-pw / 2 + 0.08, h + 0.5, -pw / 2 + 0.08], color: MAT.darkWood });
      roof(t.body, L, 0.42, h + 0.92, 0.38, 4, [-pw / 2 + 0.2, 0, -pw / 2 + 0.2]);
    }
    if (spec === "volley") {
      t.body.cyl(0.12, 0.08, 0.16, 6, { at: [pw / 2 - 0.12, h + 0.24, pw / 2 - 0.12], color: MAT.iron });
      t.body.ico(0.1, 0, { at: [pw / 2 - 0.12, h + 0.36, pw / 2 - 0.12], scale: [1, 1.4, 1], color: "#FF9A3A", emit: 1.6 });
    }
  }
  if (L >= 3) pennant(t, [pw / 2 - 0.05, h + 0.18, -pw / 2 + 0.05]);
  t.idle = "scan";
  t.h = t.headY + 0.6;
}

function barracks(t: TB, lvl: number, spec: SpecId | null) {
  const L = L3(lvl), H = [0.8, 0.98, 1.16][L - 1]!;
  const paladin = spec === "paladins", blade = spec === "blademasters";
  const stone = paladin ? "#E8E4DA" : undefined;
  // a low wide gatehouse
  if (stone) t.body.box(1.3, H, 0.92, { at: [0, H / 2, 0], color: stone, jitter: 0.004 });
  else squareShaftWide(t.body, L, 1.3, 0.92, H);
  for (const x of [-1, 1]) {
    const mh = H + 0.32;
    if (stone) t.body.box(0.38, mh, 0.5, { at: [x * 0.56, mh / 2, 0.12], color: stone });
    else squareShaftWide(t.body, L, 0.38, 0.5, mh, [x * 0.56, 0, 0.12]);
    for (const dx of [-1, 1]) t.body.box(0.1, 0.12, 0.12, { at: [x * 0.56 + dx * 0.13, mh + 0.06, 0.32], color: stone ?? wall(L, 0.9) });
  }
  // the big arched door on the road side
  const arch = new THREE.Shape(); arch.moveTo(-0.24, 0); arch.lineTo(-0.24, 0.36); arch.absarc(0, 0.36, 0.24, Math.PI, 0, true); arch.lineTo(0.24, 0); arch.lineTo(-0.24, 0);
  t.body.extrude(arch, 0.06, { at: [0, 0, 0.45], color: "#4A3426" });
  t.body.box(0.03, 0.5, 0.02, { at: [0, 0.28, 0.49], color: dark });
  if (L >= 2) t.body.box(0.62, 0.06, 0.06, { at: [0, 0.68, 0.48], color: paladin ? gold : MAT.iron });
  // torch by the door
  t.body.box(0.04, 0.16, 0.04, { at: [0.36, 0.5, 0.5], color: MAT.darkWood });
  t.body.ico(0.05, 0, { at: [0.36, 0.62, 0.5], scale: [1, 1.5, 1], color: "#FFB45A", emit: 1.5 });
  if (paladin) {
    t.body.sphere(0.36, 8, 4, { at: [0, H, -0.1], color: gold, shade: 0.03 });
    t.body.cyl(0.02, 0.02, 0.3, 4, { at: [0, H + 0.48, -0.1], color: gold });
    t.body.box(0.2, 0.03, 0.03, { at: [0, H + 0.52, -0.1], color: gold });
  } else if (blade) {
    t.body.cone(0.85, 0.5, 4, { at: [0, H + 0.25, -0.05], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.75], color: "#9A3A32", shade: 0.05 });
    for (const x of [-1, 1]) t.body.box(0.03, 0.4, 0.02, { at: [x * 0.12, H * 0.62, 0.49], rot: [0, 0, x * 0.5], color: "#D8DCE2" });
  } else if (L >= 2) roof(t.body, L, 0.55, H, 0.32, 4, [0, 0, -0.08]);
  // the flag (accent blue)
  t.body.cyl(0.02, 0.02, 0.7, 4, { at: [0.56, H + 0.6, 0.12], color: MAT.darkWood });
  t.flags.push({ geo: cloth(0.42, 0.24, paladin ? "#F1EADB" : ACCENT.barracks!, gold), at: [0.56, H + 0.93, 0.12], rotY: 0 });
  t.h = H + 0.9;
  t.muzzle = [0, 0.3, 0.5];
}

function squareShaftWide(k: Kit, lvl: number, w: number, d: number, h: number, at: V3 = [0, 0, 0]) {
  const m = new THREE.Matrix4().makeTranslation(at[0], at[1], at[2]).multiply(new THREE.Matrix4().makeScale(1, 1, d / w));
  const s = new Kit();
  squareShaft(s, lvl, w, 0, h);
  k.merge(s, m);
}

function mage(t: TB, lvl: number, spec: SpecId | null) {
  const L = L3(lvl), h = [1.25, 1.65, 2.05][L - 1]!;
  roundShaft(t.body, L, 0.5, 0.26, 0, h, 7);
  t.body.cyl(0.36, 0.3, 0.1, 7, { at: [0, h + 0.05, 0], color: L >= 3 ? MAT.stone : MAT.darkWood });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; t.body.cone(0.05, 0.3, 4, { at: [Math.cos(a) * 0.28, h + 0.22, Math.sin(a) * 0.28], rot: [Math.sin(a) * -0.4, 0, Math.cos(a) * 0.4], color: L >= 3 ? gold : MAT.darkWood }); }
  if (L >= 2) t.body.box(0.12, 0.2, 0.03, { at: [0, h * 0.62, 0.36], color: "#2A2440" });
  t.spinY = h + 0.6; t.spinSpeed = 0.6; t.bob = 0.08;
  const v = ACCENT.mage!;
  if (spec === "arcanist") {
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; t.spin.octa(0.13, { at: [Math.cos(a) * 0.3, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.3], scale: [0.7, 1.4, 0.7], color: ACCENT.arcanist!, emit: 1.5 }); }
    t.spin.ico(0.07, 0, { at: [0, 0, 0], color: "#FFFFFF", emit: 1.5 });
    t.spinSpeed = 1.4;
  } else if (spec === "hexer") {
    t.spin.sphere(0.17, 10, 6, { at: [0, 0, 0], color: "#2A1E36" });
    t.spin.sphere(0.09, 8, 5, { at: [0, 0, 0.11], scale: [1, 1, 0.5], color: ACCENT.hexer!, emit: 1.5 });
    t.spin.sphere(0.035, 6, 4, { at: [0, 0, 0.155], color: "#0A0610" });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; t.body.box(0.025, 0.5, 0.025, { at: [Math.cos(a) * 0.24, h + 0.6, Math.sin(a) * 0.24], color: MAT.iron }); }
    t.body.torus(0.24, 0.025, 3, 12, { at: [0, h + 0.85, 0], rot: [Math.PI / 2, 0, 0], color: MAT.iron });
    t.spinSpeed = 0.25; t.bob = 0.03;
  } else {
    t.spin.octa(0.16, { at: [0, 0, 0], scale: [0.75, 1.5, 0.75], color: v, emit: 1.4 });
    t.spin.torus(0.3, 0.018, 3, 16, { at: [0, 0, 0], rot: [Math.PI / 2 - 0.3, 0, 0], color: L >= 3 ? gold : "#B8A880" });
  }
  if (L >= 3) pennant(t, [0.3, h * 0.55, -0.3]);
  if (lvl >= 4) frontBanner(t.body, 0.2, 0.36, h * 0.82, 0.3, spec === "hexer" ? "#5A2E6A" : "#4A5AA8");
  t.muzzle = [0, t.spinY, 0];
  t.h = t.spinY + 0.4;
}

function bombard(t: TB, lvl: number, spec: SpecId | null) {
  const L = L3(lvl), h = [0.6, 0.74, 0.88][L - 1]!;
  roundShaft(t.body, L, 0.68, 0.64, 0, h, 10);
  crenels(t.body, L, 0.62, h, true, 5);
  t.body.cyl(0.58, 0.58, 0.06, 10, { at: [0, h + 0.02, 0], color: L === 1 ? MAT.darkWood : "#8C8478" });
  if (spec === "shrapnel") for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; t.body.cone(0.05, 0.3, 4, { at: [Math.cos(a) * 0.72, h * 0.5, Math.sin(a) * 0.72], rot: [Math.sin(a) * 1.4, 0, -Math.cos(a) * 1.4], color: steel }); }
  t.headY = h + 0.05;
  // the turntable and barrel
  t.head.cyl(0.36, 0.4, 0.1, 8, { at: [0, 0.05, 0], color: MAT.darkWood });
  if (spec === "mortar") {
    t.head.cyl(0.24, 0.3, 0.75, 10, { at: [0, 0.45, 0.06], rot: [0.32, 0, 0], color: MAT.iron });
    t.head.cyl(0.26, 0.26, 0.06, 10, { at: [0, 0.8, 0.18], rot: [0.32, 0, 0], color: gold });
    t.head.cyl(0.17, 0.17, 0.02, 10, { at: [0, 0.83, 0.19], rot: [0.32, 0, 0], color: dark });
    for (let i = 0; i < 4; i++) t.body.ico(0.1, 0, { at: [-0.4 + (i % 2) * 0.18, h + 0.1 + Math.floor(i / 2) * 0.15, -0.3], color: "#2A2426" });
    t.muzzle = [0, 0.85, 0.2];
  } else if (spec === "shrapnel") {
    for (const x of [-0.17, 0, 0.17]) t.head.cyl(0.07, 0.09, 0.42, 7, { at: [x, 0.24, 0.2], rot: [Math.PI / 2 - 0.3, 0, 0], color: MAT.iron });
    t.head.box(0.5, 0.18, 0.24, { at: [0, 0.18, -0.02], color: "#5A5E66" });
    t.muzzle = [0, 0.3, 0.42];
  } else {
    t.head.box(0.12, 0.22, 0.3, { at: [-0.18, 0.18, 0], color: MAT.darkWood });
    t.head.box(0.12, 0.22, 0.3, { at: [0.18, 0.18, 0], color: MAT.darkWood });
    t.head.cyl(0.14, 0.17, 0.5, 9, { at: [0, 0.26, 0.12], rot: [Math.PI / 2 - 0.25, 0, 0], color: L >= 3 ? "#3E4248" : "#4A4E55" });
    t.head.cyl(0.16, 0.16, 0.05, 9, { at: [0, 0.32, 0.36], rot: [Math.PI / 2 - 0.25, 0, 0], color: L >= 3 ? gold : MAT.iron });
    t.muzzle = [0, 0.34, 0.4];
  }
  // ember accent: a coal pot by the gun
  t.head.cyl(0.08, 0.06, 0.08, 6, { at: [0.3, 0.12, -0.2], color: MAT.iron });
  t.head.ico(0.06, 0, { at: [0.3, 0.18, -0.2], color: ACCENT.bombard!, emit: 1.3 });
  if (L >= 3) pennant(t, [-0.5, h + 0.1, -0.35]);
  t.h = h + 0.8; t.recoil = 0.15;
}

function frost(t: TB, lvl: number, spec: SpecId | null) {
  const L = L3(lvl), h = [1.25, 1.65, 2.05][L - 1]!;
  const ch = [0.35, 0.48, 0.6][L - 1]!;
  roundShaft(t.body, L, 0.62, 0.54, 0, ch, 8);
  t.body.torus(0.56, 0.035, 3, 16, { at: [0, ch, 0], rot: [Math.PI / 2, 0, 0], color: L >= 3 ? gold : MAT.darkWood });
  const ice = ACCENT.frost!;
  if (spec === "glacier") {
    t.body.cyl(0.7, 0.7, 0.04, 10, { at: [0, ch + 0.02, 0], color: "#CFEFFF", emit: 0.3 });
    t.body.box(0.55, h - ch + 0.2, 0.5, { at: [0, ch + (h - ch + 0.2) / 2, 0], rot: [0.04, 0.3, -0.03], color: "#A8E2FA", emit: 0.5, jitter: 0.04 });
    t.body.box(0.3, 0.5, 0.3, { at: [0.3, ch + 0.25, 0.2], rot: [0.2, 0.7, 0.1], color: "#CFEFFF", emit: 0.4, jitter: 0.03 });
    t.spinY = h + 0.35; t.spinSpeed = 0.3; t.bob = 0.04;
    t.spin.octa(0.12, { at: [0, 0, 0], color: "#E4F7FF", emit: 1.4 });
  } else if (spec === "shatter") {
    // the obelisk broken into jagged shards hovering apart
    t.spinY = ch + 0.2; t.spinSpeed = 0.35; t.bob = 0.06;
    const rnd = mulberry(7);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU, y = 0.2 + i * 0.28;
      t.spin.cyl(0, 0.12, 0.45 + rnd() * 0.2, 4, { at: [Math.cos(a) * 0.16, y, Math.sin(a) * 0.16], rot: [rnd() - 0.5, rnd() * 3, rnd() - 0.5], color: i % 2 ? ACCENT.shatter! : ice, emit: 0.9 });
    }
  } else {
    // crystalline obelisk, three shards ringing it
    const oh = h - ch;
    t.body.cyl(0.0, 0.22, oh * 0.2, 4, { at: [0, ch + oh * 0.9, 0], rot: [0, Math.PI / 4, 0], color: "#D8F4FF", emit: 0.9 });
    t.body.cyl(0.22, 0.16, oh * 0.8, 4, { at: [0, ch + oh * 0.4, 0], rot: [0, Math.PI / 4, 0], color: ice, emit: 0.7, shade: 0.06 });
    t.spinY = ch + oh * 0.55; t.spinSpeed = 0.5; t.bob = 0.06;
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; t.spin.octa(0.09, { at: [Math.cos(a) * 0.42, Math.sin(a * 3) * 0.1, Math.sin(a) * 0.42], scale: [0.6, 1.6, 0.6], color: "#BFEAFF", emit: 1.0 }); }
  }
  if (L >= 3) pennant(t, [0.5, ch, -0.3]);
  t.muzzle = [0, t.spinY, 0];
  t.h = h + 0.3;
}

function alchemist(t: TB, lvl: number, spec: SpecId | null) {
  const L = L3(lvl), h = [0.66, 0.8, 0.94][L - 1]!;
  roundShaft(t.body, L, 0.66, 0.6, 0, h, 9);
  t.body.cone(0.7, 0.34, 9, { at: [0, h + 0.17, 0], color: L === 1 ? MAT.thatch : MAT.slate });
  t.body.box(0.2, 0.32, 0.04, { at: [0, 0.16, 0.64], color: "#4A3426" });
  if (spec === "acid") {
    t.body.sphere(0.36, 10, 5, { at: [0, h + 0.3, 0], color: "#9AD860", emit: 0.5 });
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.5; t.body.tube([[Math.cos(a) * 0.3, h + 0.35, Math.sin(a) * 0.3], [Math.cos(a) * 0.6, h + 0.2, Math.sin(a) * 0.6], [Math.cos(a) * 0.68, h - 0.3, Math.sin(a) * 0.68]], 0.035, 0.03, 4, { color: copper }); t.body.ico(0.04, 0, { at: [Math.cos(a) * 0.68, h - 0.4, Math.sin(a) * 0.68], color: ACCENT.acid!, emit: 1.2 }); }
  } else if (spec === "naphtha") {
    for (const x of [-0.25, 0.25]) {
      t.body.cyl(0.18, 0.18, 0.5, 8, { at: [x, h + 0.25, -0.1], color: "#2A2628" });
      t.body.cyl(0.19, 0.19, 0.06, 8, { at: [x, h + 0.32, -0.1], color: ACCENT.naphtha! });
    }
    t.body.ico(0.07, 0, { at: [0, h + 0.62, -0.1], scale: [1, 1.6, 1], color: "#FFB45A", emit: 1.6 });
  } else {
    // copper alembic and a bubbling vat (the accent)
    t.body.sphere(0.16, 8, 5, { at: [-0.22, h + 0.38, -0.12], color: copper });
    t.body.tube([[-0.22, h + 0.52, -0.12], [-0.05, h + 0.6, -0.12], [0.12, h + 0.45, -0.1]], 0.03, 0.02, 4, { color: copper });
    t.body.cyl(0.22, 0.18, 0.22, 9, { at: [0.2, h + 0.3, 0.05], color: MAT.iron });
    t.body.cyl(0.19, 0.19, 0.02, 9, { at: [0.2, h + 0.41, 0.05], color: ACCENT.alchemist!, emit: 1.3 });
  }
  // the swinging ladle arm (aims)
  t.headY = h + 0.15;
  t.head.cyl(0.05, 0.05, 0.2, 5, { at: [0, 0.1, 0], color: MAT.darkWood });
  t.head.box(0.06, 0.06, 0.75, { at: [0, 0.22, 0.3], rot: [-0.2, 0, 0], color: MAT.timber });
  t.head.sphere(0.08, 6, 4, { at: [0, 0.32, 0.66], color: copper });
  t.head.ico(0.06, 0, { at: [0, 0.38, 0.66], color: spec === "naphtha" ? "#3A3028" : ACCENT.alchemist!, emit: spec === "naphtha" ? 0 : 1.2 });
  if (L >= 3) pennant(t, [-0.55, h - 0.1, -0.2]);
  t.muzzle = [0, 0.4, 0.66]; t.recoil = 0.05;
  t.h = h + 0.9;
}

function pyre(t: TB, lvl: number, spec: SpecId | null) {
  const L = L3(lvl), h = [1.0, 1.3, 1.6][L - 1]!;
  t.body.cyl(0.55, 0.62, 0.22, 8, { at: [0, 0.11, 0], color: wall(L, 0.1), jitter: 0.01 });
  roundShaft(t.body, L, 0.36, 0.26, 0.22, h, 7);
  const big = spec === "inferno" ? 1.35 : 1;
  // iron cage basket of fire
  t.body.cyl(0.36 * big, 0.2, 0.18, 8, { at: [0, h + 0.09, 0], color: MAT.iron });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; t.body.box(0.03, 0.42 * big, 0.03, { at: [Math.cos(a) * 0.34 * big, h + 0.32 * big, Math.sin(a) * 0.34 * big], rot: [Math.sin(a) * -0.15, 0, Math.cos(a) * 0.15], color: MAT.iron }); }
  t.body.torus(0.38 * big, 0.025, 3, 10, { at: [0, h + 0.52 * big, 0], rot: [Math.PI / 2, 0, 0], color: MAT.iron });
  // the fire (spin part flickers)
  t.spinY = h + 0.2; t.spinSpeed = 0.8; t.bob = 0.02;
  const core = spec === "firestorm" ? ACCENT.firestorm! : "#FFD27A";
  const flame = spec === "inferno" ? ACCENT.inferno! : ACCENT.pyre!;
  t.spin.ico(0.26 * big, 0, { at: [0, 0.18 * big, 0], scale: [1, 1.5, 1], color: flame, emit: 1.6, jitter: 0.03 });
  t.spin.ico(0.16 * big, 0, { at: [0.04, 0.32 * big, 0.02], scale: [1, 1.6, 1], color: "#FFB040", emit: 1.6 });
  t.spin.ico(0.09 * big, 0, { at: [0, 0.22 * big, 0.05], color: core, emit: 1.6 });
  // nozzle head (aims the cone)
  t.headY = h * 0.75;
  if (spec === "firestorm") {
    t.head.box(0.18, 0.18, 0.4, { at: [0, 0, 0.3], color: "#3E4248" });
    t.head.cone(0.12, 0.25, 4, { at: [0, 0.04, 0.58], rot: [Math.PI / 2, Math.PI / 4, 0], color: "#3E4248" });
    for (const x of [-1, 1]) t.head.cone(0.03, 0.14, 3, { at: [x * 0.07, 0.14, 0.3], rot: [-0.6, 0, 0], color: gold });
    t.head.ico(0.035, 0, { at: [0, 0.03, 0.7], color: ACCENT.firestorm!, emit: 1.6 });
    t.muzzle = [0, 0.03, 0.72];
  } else {
    t.head.cyl(0.08, 0.12, 0.45, 6, { at: [0, 0, 0.34], rot: [Math.PI / 2 - 0.15, 0, 0], color: MAT.iron });
    t.muzzle = [0, 0.05, 0.58];
  }
  if (L >= 3) pennant(t, [0.45, 0.22, -0.4]);
  t.h = h + 0.8;
}

function storm(t: TB, lvl: number, spec: SpecId | null) {
  const L = L3(lvl), h = [1.85, 2.4, 2.95][L - 1]!;
  t.body.cyl(0.5, 0.58, 0.3, 8, { at: [0, 0.15, 0], color: wall(L, 0.1), jitter: 0.01 });
  if (L >= 2) t.body.cyl(0.4, 0.5, 0.25, 8, { at: [0, 0.42, 0], color: wall(L, 0.3) });
  const rods = spec === "tempest" ? [-0.22, 0.22] : [0];
  for (const x of rods) {
    t.body.cyl(0.06, 0.09, h - 0.3, 6, { at: [x, 0.3 + (h - 0.3) / 2, 0], color: "#5A5E66" });
    const coils = spec === "overload" ? 0 : Math.round((h - 0.8) / 0.18);
    for (let i = 0; i < coils; i++) t.body.torus(0.11, 0.025, 3, 8, { at: [x, 0.65 + i * 0.18, 0], rot: [Math.PI / 2, 0, 0], color: copper });
  }
  if (spec === "overload") {
    t.body.cyl(0.26, 0.26, 1.2, 10, { at: [0, h - 0.9, 0], color: copper });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; t.body.box(0.03, 1.4, 0.03, { at: [Math.cos(a) * 0.36, h - 0.9, Math.sin(a) * 0.36], color: MAT.iron }); }
    for (const y of [-0.6, 0.6]) t.body.torus(0.36, 0.03, 3, 12, { at: [0, h - 0.9 + y, 0], rot: [Math.PI / 2, 0, 0], color: MAT.iron });
  }
  t.spinY = h + 0.12; t.spinSpeed = 1.2; t.bob = 0.05;
  if (spec === "tempest") {
    t.spin.ico(0.3, 1, { at: [0, 0.05, 0], scale: [1.3, 0.8, 1], color: "#5E6670", jitter: 0.04 });
    t.spin.ico(0.2, 0, { at: [0.25, 0.1, 0.05], color: "#6E7680" });
    t.spin.ico(0.12, 0, { at: [0, -0.05, 0.18], color: ACCENT.tempest!, emit: 1.4 });
    t.spinSpeed = 0.3;
  } else {
    t.spin.torus(0.26, 0.03, 4, 16, { at: [0, 0, 0], rot: [Math.PI / 2, 0, 0], color: spec === "overload" ? ACCENT.overload! : ACCENT.storm!, emit: 1.4 });
    t.spin.octa(0.08, { at: [0, 0, 0], color: "#E8F0FF", emit: 1.5 });
  }
  if (L >= 3) pennant(t, [0.45, 0.55, -0.2]);
  t.muzzle = [0, t.spinY, 0];
  t.h = h + 0.3;
}

function beacon(t: TB, lvl: number, spec: SpecId | null) {
  const L = L3(lvl), h = [1.45, 1.85, 2.25][L - 1]!;
  roundShaft(t.body, L, 0.5, 0.36, 0, h, 9);
  if (L >= 2) for (let i = 0; i < 3; i++) t.body.box(0.38 + 0.02, 0.08, 0.02, { at: [0, h * (0.25 + i * 0.25), 0.4 - i * 0.03], color: "#B83A32" });
  t.body.cyl(0.46, 0.42, 0.08, 9, { at: [0, h + 0.04, 0], color: L >= 3 ? MAT.stone : MAT.darkWood });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; t.body.box(0.02, 0.14, 0.02, { at: [Math.cos(a) * 0.44, h + 0.15, Math.sin(a) * 0.44], color: MAT.iron }); }
  const lr = spec === "lighthouse" ? 0.3 : 0.24;
  if (spec === "huntersmark") {
    t.spinY = h + 0.35; t.spinSpeed = 0.4; t.bob = 0.04;
    t.spin.torus(0.2, 0.03, 3, 14, { at: [0, 0, 0], color: ACCENT.huntersmark!, emit: 1.4 });
    t.spin.sphere(0.1, 8, 5, { at: [0, 0, 0], scale: [1.4, 0.7, 0.4], color: ACCENT.huntersmark!, emit: 1.5 });
    t.spin.sphere(0.05, 6, 4, { at: [0, 0, 0.03], color: "#1C1512" });
    t.body.tube([[0.3, h + 0.1, 0.3], [0.42, h + 0.0, 0.42], [0.5, h + 0.12, 0.5]], 0.025, 0.07, 6, { color: "#C8A060" });
    t.flags.push({ geo: cloth(0.3, 0.42, "#B8323A", gold), at: [-0.38, h - 0.05, 0.25], rotY: 0.8 });
  } else {
    // glass lantern room, a dome, the rotating beam head
    t.body.cyl(lr, lr, 0.36, 8, { at: [0, h + 0.26, 0], color: ACCENT.beacon!, emit: 1.5 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; t.body.box(0.03, 0.38, 0.03, { at: [Math.cos(a) * (lr + 0.01), h + 0.26, Math.sin(a) * (lr + 0.01)], color: MAT.iron }); }
    t.body.cone(lr + 0.08, 0.28, 8, { at: [0, h + 0.58, 0], color: L >= 3 ? MAT.slate : MAT.darkWood });
    if (L >= 3) { t.body.ico(0.05, 0, { at: [0, h + 0.76, 0], color: gold }); }
    t.headY = h + 0.26;
    t.head.box(0.1, 0.16, 0.12, { at: [0, 0, lr + 0.04], color: MAT.iron });
    t.head.cyl(0.07, 0.07, 0.02, 8, { at: [0, 0, lr + 0.11], rot: [Math.PI / 2, 0, 0], color: "#FFF4D6", emit: 1.6 });
    if (spec === "lighthouse") t.body.torus(lr + 0.05, 0.03, 3, 12, { at: [0, h + 0.44, 0], rot: [Math.PI / 2, 0, 0], color: gold });
  }
  if (L >= 3) pennant(t, [0.42, h * 0.6, -0.3]);
  t.idle = "sweep";
  t.muzzle = [0, 0, 0.35];
  t.h = h + 0.8;
}

function banner(t: TB, lvl: number, spec: SpecId | null) {
  const L = L3(lvl);
  const ph = [0.95, 1.05, 1.15][L - 1]!, pole = [1.9, 2.3, 2.7][L - 1]!;
  t.body.cyl(0.62, 0.66, 0.1, 8, { at: [0, 0.05, 0], color: wall(L, 0.1) });
  if (spec === "treasury") {
    t.body.box(1.0, 0.7, 0.8, { at: [0, 0.45, -0.05], color: MAT.stone });
    t.body.cone(0.82, 0.45, 4, { at: [0, 1.02, -0.05], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.85], color: gold });
    t.body.box(0.36, 0.22, 0.24, { at: [0.25, 0.21, 0.45], color: "#6A4A2E" });
    t.body.box(0.38, 0.05, 0.26, { at: [0.25, 0.33, 0.45], color: gold });
    for (let i = 0; i < 5; i++) t.body.cyl(0.05, 0.05, 0.015, 8, { at: [-0.2 + i * 0.03, 0.12 + i * 0.016, 0.5], color: "#FFD36B", emit: 0.4 });
  } else {
    // open pavilion on four posts, a canopy, a war drum
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) t.body.cyl(0.04, 0.05, ph, 5, { at: [x! * 0.5, ph / 2, z! * 0.5], color: L >= 3 ? MAT.stone : MAT.darkWood });
    t.body.cone(0.82, 0.32, 4, { at: [0, ph + 0.16, 0], rot: [0, Math.PI / 4, 0], color: L === 1 ? MAT.thatch : "#7A4A44", shade: 0.04 });
    if (L >= 3) for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) t.body.ico(0.04, 0, { at: [x! * 0.5, ph + 0.02, z! * 0.5], color: gold });
    const drums = spec === "wardrums" ? [[-0.28, 0.28], [0.3, -0.1]] : [[0.28, 0.25]];
    for (const [x, z] of drums) {
      const r = spec === "wardrums" ? 0.26 : 0.17;
      t.body.cyl(r, r, r * 1.2, 10, { at: [x!, r * 0.6 + 0.1, z!], color: "#8A5A3A" });
      t.body.cyl(r * 1.02, r * 1.02, 0.03, 10, { at: [x!, r * 1.2 + 0.1, z!], color: "#E6DCC8" });
      t.body.cyl(r * 1.04, r * 1.04, 0.04, 10, { at: [x!, 0.14, z!], color: gold });
    }
    if (spec === "wardrums") figure(t.body, [-0.05, 0.1, 0.05], 0.9, "#8E3A3E", "#5A3A2E", false, 2.4);
  }
  // the central pole and its huge banner (the accent)
  t.body.cyl(0.035, 0.045, pole, 5, { at: [0, pole / 2, 0], color: MAT.darkWood });
  t.body.ico(0.06, 0, { at: [0, pole + 0.02, 0], color: gold });
  t.body.box(0.7, 0.04, 0.04, { at: [0.33, pole - 0.06, 0], color: MAT.darkWood });
  t.flags.push({ geo: cloth(0.66, 0.9, spec === "treasury" ? "#C89A32" : spec === "wardrums" ? ACCENT.wardrums! : ACCENT.banner!, gold), at: [0.02, pole - 0.08, 0.03], rotY: 0 });
  t.h = pole + 0.2;
  t.muzzle = [0, 0.6, 0];
}

function ballista(t: TB, lvl: number, spec: SpecId | null) {
  const L = L3(lvl), h = [0.45, 0.6, 0.75][L - 1]!;
  squareShaftWide(t.body, L, 1.28, 1.28, h);
  crenels(t.body, L, 0.64, h, false, 3);
  t.headY = h + 0.02;
  const long = spec === "siegebolt" ? 1.4 : 1;
  // swivel, stock, bow arms, string, bolt
  t.head.cyl(0.24, 0.3, 0.14, 8, { at: [0, 0.07, 0], color: MAT.darkWood });
  t.head.box(0.16, 0.12, 1.0 * long, { at: [0, 0.26, 0.1], rot: [-0.12, 0, 0], color: MAT.timber });
  for (const x of [-1, 1]) t.head.box(0.5, 0.07, 0.07, { at: [x * 0.27, 0.34, 0.42 * long], rot: [0, x * 0.35, x * 0.08], color: L >= 3 ? MAT.iron : MAT.darkWood });
  t.head.box(1.0, 0.015, 0.015, { at: [0, 0.32, 0.25 * long], color: "#E6DCC8" });
  const tip = spec === "harpoon" ? "#8C939C" : ACCENT.ballista!;
  t.head.box(0.04, 0.04, 0.9 * long, { at: [0, 0.36, 0.2], rot: [-0.12, 0, 0], color: "#6A5038" });
  t.head.cone(0.05 * long, 0.18 * long, 4, { at: [0, 0.43 + 0.02 * long, 0.7 * long], rot: [Math.PI / 2 - 0.12, 0, 0], color: tip, emit: 0.5 });
  // winch with an operator
  t.head.cyl(0.08, 0.08, 0.36, 6, { at: [0, 0.24, -0.38], rot: [0, 0, Math.PI / 2], color: MAT.darkWood });
  figure(t.head, [0.32, 0, -0.38], 0.85, "#4A5A7A", "#3A3A44", false, -1.2);
  if (spec === "harpoon") {
    t.head.cyl(0.16, 0.16, 0.22, 8, { at: [-0.4, 0.22, -0.1], rot: [0, 0, Math.PI / 2], color: MAT.iron });
    for (let i = 0; i < 6; i++) t.head.torus(0.035, 0.012, 3, 6, { at: [-0.25 + i * 0.05, 0.3 + i * 0.008, 0.0 + i * 0.12], rot: [i % 2 ? Math.PI / 2 : 0, 0, 0], color: steel });
    for (const x of [-1, 1]) t.head.cone(0.025, 0.12, 3, { at: [x * 0.05, 0.44, 0.62], rot: [Math.PI / 2 + x * 0.8, 0, 0], color: steel });
  } else if (spec === "siegebolt") {
    for (const x of [-1, 1]) t.head.box(0.2, 0.3, 0.2, { at: [x * 0.4, 0.2, -0.5], color: MAT.iron });
  }
  if (L >= 3) pennant(t, [0.55, h, -0.55]);
  t.muzzle = [0, 0.42, 0.8 * long];
  t.h = h + 0.7; t.recoil = 0.08;
}

function thornwood(t: TB, lvl: number, spec: SpecId | null) {
  const L = L3(lvl);
  const s = [0.8, 0.95, 1.1][L - 1]!;
  t.body.cyl(0.66, 0.7, 0.06, 10, { at: [0, 0.03, 0], color: "#5A4632" });
  // a ring of gnarled thorny roots
  const n = 5 + L;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r0 = 0.62, r1 = 0.28;
    t.body.tube([[Math.cos(a) * r0, 0, Math.sin(a) * r0], [Math.cos(a + 0.2) * (r0 - 0.05), 0.35 * s, Math.sin(a + 0.2) * (r0 - 0.05)], [Math.cos(a + 0.4) * r1, 0.45 * s, Math.sin(a + 0.4) * r1]], 0.06, 0.02, 4, { color: "#5A4632" });
    t.body.cone(0.025, 0.12, 3, { at: [Math.cos(a + 0.2) * (r0 - 0.02), 0.32 * s, Math.sin(a + 0.2) * (r0 - 0.02)], rot: [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2], color: "#C7E07A" });
  }
  if (spec === "treant") {
    // the tree becomes a sleeping giant face
    t.body.cyl(0.24, 0.34, 1.3 * s, 7, { at: [0, 0.65 * s, 0], color: "#6A5038", jitter: 0.02 });
    for (const x of [-1, 1]) t.body.box(0.12, 0.025, 0.03, { at: [x * 0.1, 0.9 * s, 0.27], rot: [0, 0, x * -0.25], color: "#2A2018" });
    t.body.cone(0.05, 0.16, 4, { at: [0, 0.78 * s, 0.3], rot: [Math.PI / 2, 0, 0], color: "#5A4632" });
    t.body.box(0.18, 0.03, 0.03, { at: [0, 0.6 * s, 0.3], color: "#2A2018" });
    t.spinY = 1.45 * s; t.spinSpeed = 0.05; t.bob = 0.02;
    t.spin.ico(0.5, 1, { at: [0, 0, 0], color: "#4F8E4C", jitter: 0.04 });
    t.spin.ico(0.32, 0, { at: [0.3, -0.1, 0.12], color: ACCENT.treant!, jitter: 0.03 });
    t.spin.ico(0.28, 0, { at: [-0.28, 0.05, -0.1], color: "#6EA84E", jitter: 0.03 });
  } else {
    // a small old tree in the middle
    t.body.tube([[0, 0, 0], [0.06, 0.5 * s, 0.03], [-0.03, 0.95 * s, 0]], 0.13, 0.07, 6, { color: "#6A5038" });
    t.spinY = 1.15 * s; t.spinSpeed = 0.05; t.bob = 0.02;
    t.spin.ico(0.38 * s, 0, { at: [0, 0, 0], color: "#3E7A40", jitter: 0.03 });
    t.spin.ico(0.28 * s, 0, { at: [0.25 * s, -0.08, 0.1], color: ACCENT.thornwood!, jitter: 0.03 });
    t.spin.ico(0.24 * s, 0, { at: [-0.22 * s, 0.1, -0.08], color: "#5E9A4A", jitter: 0.03 });
    if (L >= 2) for (let i = 0; i < 5; i++) t.spin.ico(0.04, 0, { at: [Math.cos(i * 1.3) * 0.32 * s, Math.sin(i * 2.1) * 0.15, Math.sin(i * 1.3) * 0.32 * s], color: "#F0D0E0" });
  }
  if (spec === "bramble") {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.3;
      t.body.ico(0.16, 0, { at: [Math.cos(a) * 0.62, 0.12, Math.sin(a) * 0.62], scale: [1, 0.7, 1], color: "#3E6A3A", jitter: 0.03 });
      t.body.ico(0.045, 0, { at: [Math.cos(a) * 0.66, 0.22, Math.sin(a) * 0.66], color: ACCENT.bramble!, emit: 0.4 });
    }
  }
  if (L >= 3) for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; t.body.box(0.16, 0.24, 0.08, { at: [Math.cos(a) * 0.5, 0.12, Math.sin(a) * 0.5], rot: [0, -a, 0], color: MAT.stone }); t.body.box(0.17, 0.03, 0.09, { at: [Math.cos(a) * 0.5, 0.25, Math.sin(a) * 0.5], rot: [0, -a, 0], color: gold }); }
  t.muzzle = [0, 0.3, 0];
  t.h = t.spinY + 0.5;
}

const BUILD: Record<TowerId, (t: TB, lvl: number, spec: SpecId | null) => void> = { archer, barracks, mage, bombard, frost, alchemist, pyre, storm, beacon, banner, ballista, thornwood };

/** Spec banner hanging from the body (art 4.1: the spec glyph on a banner) and the light ring on the base. */
function specTrim(t: TB, kind: TowerId, spec: SpecId) {
  const col = ACCENT[spec] ?? ACCENT[kind]!;
  // a coloured band on the base and a small hanging banner in the spec colour
  t.body.torus(0.7, 0.03, 3, 20, { at: [0, 0.03, 0], rot: [Math.PI / 2, 0, 0], color: col, emit: 0.4 });
  if (kind !== "banner" && kind !== "thornwood") t.flags.push({ geo: cloth(0.22, 0.34, col, gold), at: [-0.62, 0.95, 0.35], rotY: -0.6 });
}

const cache = new Map<string, TowerModel>();
export function towerModel(kind: TowerId, level: number, spec: SpecId | null): TowerModel {
  const key = `${kind}:${level}:${spec ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const t: TB = { body: new Kit(), head: new Kit(), spin: new Kit(), flags: [], muzzle: [0, 1, 0], headY: 0, spinY: 0, spinSpeed: 0, bob: 0, h: 1.7, idle: "none", recoil: 0 };
  BUILD[kind](t, level, level >= 4 ? spec : null);
  if (level >= 4 && spec) specTrim(t, kind, spec);
  levelNotches(t.body, level);
  const shift = (g: THREE.BufferGeometry, dy: number) => { const a = g.attributes.aOrd as THREE.BufferAttribute; for (let i = 0; i < a.count; i++) a.setX(i, a.getX(i) + dy); return g; };
  const m: TowerModel = {
    body: t.body.build(), head: t.head.empty ? null : shift(t.head.build(), t.headY), headY: t.headY,
    spin: t.spin.empty ? null : shift(t.spin.build(), t.spinY), spinY: t.spinY, spinSpeed: t.spinSpeed, bob: t.bob,
    flags: t.flags, muzzle: t.muzzle, height: t.h, idle: t.idle, recoil: t.recoil,
  };
  cache.set(key, m);
  return m;
}

function mulberry(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { let t = (s = (s + 0x6d2b79f5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
