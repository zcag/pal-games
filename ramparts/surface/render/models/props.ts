// World dressing models (art 2.x signature props), plants, gates. Geometry only; dress.ts places them.
import * as THREE from "../../vendor/three.js";
import { Kit, TAU, type V3 } from "./kit.ts";
import type { Look } from "../palette.ts";
import { SHARED } from "../palette.ts";

type K = Kit;
const r3 = (rnd: () => number, a: number) => (rnd() - 0.5) * 2 * a;

// ------------------------------------------------------------------ plants (instanced, wind sway)
export function roundTree(look: Look, v: number) {
  const k = new Kit();
  const h = 0.75 + v * 0.15;
  k.cyl(0.07, 0.11, h, 6, { at: [0, h / 2, 0], color: "#6A5038", seed: v });
  const lobes: [V3, number, number][] = [
    [[0, h + 0.38, 0], 0.55, 1], [[0.3, h + 0.22, 0.12], 0.4, 0], [[-0.26, h + 0.25, -0.12], 0.42, 2],
  ];
  if (v === 2) lobes.push([[0.05, h + 0.75, 0.05], 0.36, 2]);
  for (const [at, r, c] of lobes.slice(0, v === 0 ? 2 : lobes.length)) k.ico(r, 0, { at, color: look.foliage[c]!, jitter: 0.04, seed: v * 7 + r * 10, shade: 0.08 });
  return k.build();
}

export function bush(look: Look, v: number) {
  const k = new Kit();
  k.ico(0.28, 0, { at: [0, 0.2, 0], color: look.foliage[v % 2 ? 0 : 1], jitter: 0.04, seed: v + 3 });
  k.ico(0.2, 0, { at: [0.22, 0.14, 0.06], color: look.foliage[2], jitter: 0.03, seed: v + 9 });
  if (v) k.ico(0.17, 0, { at: [-0.2, 0.12, -0.05], color: look.foliage[1], jitter: 0.03, seed: v + 5 });
  return k.build();
}

export function pine(look: Look, v: number, snow: boolean) {
  const k = new Kit();
  const s = 0.85 + v * 0.2;
  k.cyl(0.06, 0.09, 0.5 * s, 5, { at: [0, 0.25 * s, 0], color: "#4A3A2E" });
  const tiers = 3 + (v === 2 ? 1 : 0);
  for (let i = 0; i < tiers; i++) {
    const r = (0.62 - i * 0.13) * s, y = (0.45 + i * 0.36) * s, hh = 0.62 * s;
    k.cone(r, hh, 7, { at: [0, y + hh / 2, 0], color: look.foliage[i % 2 ? 1 : 0], seed: i + v * 5, shade: 0.06, rot: [0, i * 0.5, 0] });
    if (snow) k.cone(r * 0.55, hh * 0.42, 7, { at: [0, y + hh * 0.79, 0], color: look.foliage[2], seed: i + 30, shade: 0.03, rot: [0, i * 0.5, 0] });
  }
  return k.build();
}

export function palm(look: Look, v: number) {
  const k = new Kit();
  const h = 1.5 + v * 0.3, lean = 0.25 + v * 0.1;
  const pts: V3[] = [];
  for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push([Math.sin(t * 1.4) * lean, t * h, 0]); }
  k.tube(pts, 0.09, 0.06, 5, { color: "#8A6E4C", shade: 0.1 });
  const top = pts[4]!;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + v;
    const f: V3[] = [top, [top[0] + Math.cos(a) * 0.45, top[1] + 0.12, top[2] + Math.sin(a) * 0.45], [top[0] + Math.cos(a) * 0.85, top[1] - 0.22, top[2] + Math.sin(a) * 0.85]];
    k.tube(f, 0.11, 0.02, 3, { color: look.foliage[i % 3]!, shade: 0.06, seed: i });
  }
  k.ico(0.1, 0, { at: [top[0], top[1] - 0.05, top[2]], color: "#6A5038" });
  return k.build();
}

export function deadTree(look: Look, v: number) {
  const k = new Kit();
  const h = 1.0 + v * 0.3;
  k.tube([[0, 0, 0], [0.05, h * 0.5, 0.02], [-0.04, h, 0]], 0.1, 0.035, 5, { color: look.foliage[0] });
  k.tube([[0.03, h * 0.5, 0], [0.3, h * 0.75, 0.1], [0.42, h * 0.95, 0.05]], 0.05, 0.015, 4, { color: look.foliage[0] });
  k.tube([[-0.02, h * 0.68, 0], [-0.28, h * 0.85, -0.12], [-0.33, h * 1.05, -0.2]], 0.04, 0.012, 4, { color: look.foliage[0] });
  k.ico(0.16, 0, { at: [0.08, 0.06, 0.1], color: look.foliage[1], jitter: 0.02 });
  return k.build();
}

export function grassTuft(look: Look, v: number, kind: "grass" | "dry" | "snowgrass" | "moss") {
  const k = new Kit();
  const n = kind === "moss" ? 0 : 5;
  const rnd = mulberry32(v * 31 + 7);
  const cols = kind === "dry" ? ["#B49A62", "#9E8A58", "#C8B07A"] : kind === "snowgrass" ? ["#7E8A70", "#96A07E", "#6E7A64"] : [look.foliage[2], look.groundB, look.foliage[1]];
  for (let i = 0; i < n; i++) {
    const h = 0.16 + rnd() * 0.16, a = rnd() * TAU, r = rnd() * 0.08;
    k.cone(0.03, h, 3, { at: [Math.cos(a) * r, h / 2, Math.sin(a) * r], rot: [r3(rnd, 0.35), rnd() * 3, r3(rnd, 0.35)], color: cols[i % 3]!, shade: 0.05 });
  }
  if (kind === "moss") {
    k.ico(0.12, 0, { at: [0, 0.03, 0], scale: [1.2, 0.4, 1], color: look.foliage[1], jitter: 0.02 });
    k.ico(0.08, 0, { at: [0.12, 0.02, 0.04], scale: [1.2, 0.4, 1], color: look.foliage[2], jitter: 0.02 });
  }
  return k.build();
}

export function flowers(look: Look, v: number) {
  const k = new Kit();
  const rnd = mulberry32(v * 13 + 1);
  const fc = look.flowers ?? ["#E9DCA8"];
  for (let i = 0; i < 4; i++) {
    const a = rnd() * TAU, r = rnd() * 0.1, h = 0.12 + rnd() * 0.1;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    k.cyl(0.008, 0.01, h, 3, { at: [x, h / 2, z], color: look.foliage[1] });
    k.ico(0.035, 0, { at: [x, h, z], color: fc[(i + v) % fc.length]!, shade: 0.02 });
  }
  return k.build();
}

export function rock(look: Look, theme: string, v: number) {
  const k = new Kit();
  const c = theme === "desert" ? "#9A5A3A" : theme === "peaks" ? "#7D8791" : theme === "citadel" ? "#3E3536" : "#8E8A80";
  k.dodeca(0.32, { at: [0, 0.12, 0], scale: [1.2 + v * 0.2, 0.75, 1], color: c, jitter: 0.06, seed: v + 1, shade: 0.1 });
  if (v === 1) k.dodeca(0.2, { at: [0.35, 0.06, 0.12], scale: [1, 0.7, 1], color: c, jitter: 0.04, seed: 9, shade: 0.1 });
  if (theme === "peaks") k.dodeca(0.25, { at: [0, 0.27, 0], scale: [1.1 + v * 0.2, 0.3, 0.85], color: "#E6EEF2", jitter: 0.03, seed: 4 });
  if (theme === "meadow" || theme === "title") k.ico(0.12, 0, { at: [-0.25, 0.04, 0.15], scale: [1.4, 0.5, 1], color: look.foliage[1], jitter: 0.02 });
  return k.build();
}

export function iceCrystal(v: number) {
  const k = new Kit();
  const rnd = mulberry32(v + 5);
  for (let i = 0; i < 4; i++) {
    const h = 0.4 + rnd() * 0.6;
    k.cyl(0.0, 0.1 + rnd() * 0.06, h, 5, { at: [r3(rnd, 0.18), h / 2 - 0.05, r3(rnd, 0.18)], rot: [r3(rnd, 0.4), rnd() * 3, r3(rnd, 0.4)], color: i % 2 ? "#BFE6F5" : "#D8F0FA", shade: 0.08 });
  }
  return k.build();
}

// ------------------------------------------------------------------ props (static, merged)
export function windmill(k: K, at: V3, rot: number) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(1, 1, 1));
  const w = new Kit();
  w.cyl(0.62, 0.85, 2.2, 8, { at: [0, 1.1, 0], color: "#D6CDB8", jitter: 0.02 });
  w.cyl(0.66, 0.66, 0.12, 8, { at: [0, 2.2, 0], color: "#7A6248" });
  w.cone(0.82, 0.9, 8, { at: [0, 2.7, 0], color: "#8E5A3E" });
  w.box(0.42, 0.62, 0.08, { at: [0, 0.32, 0.8], color: "#5E4630" });
  w.box(0.26, 0.3, 0.06, { at: [0, 1.5, 0.66], color: "#4A3A2E" });
  w.cyl(0.08, 0.08, 0.5, 6, { at: [0, 2.35, 0.75], rot: [Math.PI / 2, 0, 0], color: "#5E4630" });
  k.merge(w, m);
  return { hub: new THREE.Vector3(0, 2.35, 0.98).applyMatrix4(m), rot };
}

export function windmillBlades() {
  const k = new Kit();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    k.box(0.06, 1.45, 0.04, { at: [c * 0.0 - s * 0.72, c * 0.72, 0], rot: [0, 0, a], color: "#6A5038" });
    k.box(0.36, 1.1, 0.02, { at: [-s * 0.82 + c * 0.2, c * 0.82 + s * 0.2, 0.02], rot: [0, 0, a], color: "#EDE3CC" });
  }
  k.cyl(0.12, 0.12, 0.12, 6, { rot: [Math.PI / 2, 0, 0], color: "#4A3A2E" });
  return k.build();
}

export function hayBale(k: K, at: V3, rot: number) {
  k.cyl(0.32, 0.32, 0.6, 9, { at: [at[0], at[1] + 0.3, at[2]], rot: [0, rot, Math.PI / 2], color: "#D2B46A", shade: 0.05 });
  k.cyl(0.33, 0.33, 0.06, 9, { at: [at[0] + Math.cos(rot) * 0.0, at[1] + 0.3, at[2]], rot: [0, rot, Math.PI / 2], color: "#B89A52" });
}

export function fence(k: K, a: V3, b: V3) {
  const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz), n = Math.max(1, Math.round(L / 0.9));
  const ang = Math.atan2(dz, dx);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    k.box(0.07, 0.5, 0.07, { at: [a[0] + dx * t, a[1] + 0.25, a[2] + dz * t], rot: [0, -ang, 0], color: "#7A5E40", jitter: 0.01 });
  }
  for (const y of [0.22, 0.4]) k.box(L, 0.05, 0.04, { at: [(a[0] + b[0]) / 2, a[1] + y, (a[2] + b[2]) / 2], rot: [0, -ang, (Math.random() - 0.5) * 0.05], color: "#8E6E4C" });
}

export function stoneWall(k: K, a: V3, b: V3, col = "#A39C8E") {
  const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz), n = Math.max(1, Math.round(L / 0.35));
  const ang = Math.atan2(dz, dx);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    k.box(L / n * 0.95, 0.22 + ((i * 7) % 3) * 0.04, 0.3, { at: [a[0] + dx * t, a[1] + 0.12, a[2] + dz * t], rot: [0, -ang, 0], color: col, jitter: 0.03, seed: i });
    if (i % 2 === 0) k.box(L / n * 0.9, 0.16, 0.26, { at: [a[0] + dx * t, a[1] + 0.32, a[2] + dz * t], rot: [0, -ang + 0.05, 0], color: col, jitter: 0.03, seed: i + 50 });
  }
}

export function well(k: K, at: V3) {
  const [x, y, z] = at;
  k.cyl(0.42, 0.45, 0.42, 10, { at: [x, y + 0.21, z], color: "#9C958A", jitter: 0.02 });
  k.cyl(0.33, 0.33, 0.05, 10, { at: [x, y + 0.42, z], color: "#3E5560" });
  for (const s of [-1, 1]) k.box(0.07, 0.8, 0.07, { at: [x + s * 0.36, y + 0.8, z], color: "#6A5038" });
  k.box(0.95, 0.06, 0.06, { at: [x, y + 1.15, z], color: "#6A5038" });
  k.cone(0.68, 0.38, 4, { at: [x, y + 1.38, z], rot: [0, Math.PI / 4, 0], color: "#8E5A3E" });
}

export function shrine(k: K, at: V3) {
  const [x, y, z] = at;
  k.box(0.5, 0.15, 0.5, { at: [x, y + 0.07, z], color: "#9C958A", jitter: 0.02 });
  k.box(0.28, 0.75, 0.2, { at: [x, y + 0.52, z], color: "#B5AE9E", jitter: 0.02 });
  k.cone(0.2, 0.18, 4, { at: [x, y + 0.98, z], rot: [0, Math.PI / 4, 0], color: "#B5AE9E" });
  k.box(0.1, 0.1, 0.02, { at: [x, y + 0.6, z + 0.11], color: "#E3B655" });
}

export function column(k: K, at: V3, h: number, broken: boolean, col = "#D8C8A8") {
  const [x, y, z] = at;
  k.box(0.62, 0.18, 0.62, { at: [x, y + 0.09, z], color: col, jitter: 0.02 });
  k.cyl(0.22, 0.25, h, 8, { at: [x, y + 0.18 + h / 2, z], color: col, jitter: broken ? 0.03 : 0.01, shade: 0.06 });
  if (!broken) k.box(0.58, 0.16, 0.58, { at: [x, y + 0.26 + h, z], color: col, jitter: 0.02 });
  else k.dodeca(0.22, { at: [x, y + 0.18 + h, z], scale: [1.1, 0.45, 1.1], color: col, jitter: 0.06 });
}

export function toppled(k: K, at: V3, rot: number, col = "#D2C2A0") {
  for (let i = 0; i < 3; i++) {
    const d = i * 0.55 - 0.55;
    k.cyl(0.22, 0.22, 0.5, 8, { at: [at[0] + Math.cos(rot) * d, at[1] + 0.2, at[2] + Math.sin(rot) * d], rot: [0, -rot, Math.PI / 2 + (i - 1) * 0.08], color: col, jitter: 0.02, seed: i });
  }
}

export function statueHead(k: K, at: V3, rot: number) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, rot, 0.18)), new THREE.Vector3(1, 1, 1));
  const h = new Kit();
  const c = "#CDB894";
  h.ico(0.75, 1, { at: [0, 0.35, 0], scale: [0.85, 1.05, 0.9], color: c, jitter: 0.05, shade: 0.07 });
  h.box(0.9, 0.16, 0.5, { at: [0, 0.85, 0.15], color: c });
  h.box(0.18, 0.32, 0.2, { at: [0, 0.35, 0.72], color: c });
  h.box(0.5, 0.06, 0.06, { at: [0, 0.08, 0.68], color: "#8E7A5C" });
  for (const s of [-1, 1]) h.box(0.2, 0.07, 0.05, { at: [s * 0.25, 0.55, 0.7], color: "#7A6A50" });
  h.box(1.6, 0.4, 1.4, { at: [0, -0.35, 0], color: "#C7AA7C", jitter: 0.1 });
  k.merge(h, m);
}

export function obelisk(k: K, at: V3, h: number, col = "#C9B48E") {
  const [x, y, z] = at;
  k.box(0.7, 0.2, 0.7, { at: [x, y + 0.1, z], color: col, jitter: 0.02 });
  k.cyl(0.18, 0.3, h, 4, { at: [x, y + 0.2 + h / 2, z], rot: [0, Math.PI / 4, 0], color: col });
  k.cone(0.18, 0.3, 4, { at: [x, y + 0.35 + h, z], rot: [0, Math.PI / 4, 0], color: "#E3B655" });
}

export function awning(k: K, at: V3, rot: number, cloth: string) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(1, 1, 1));
  const a = new Kit();
  for (const [x, z] of [[-0.55, -0.4], [0.55, -0.4], [-0.55, 0.4], [0.55, 0.4]]) a.cyl(0.035, 0.04, x! < 0 ? 1.05 : 0.95, 4, { at: [x!, 0.5, z!], color: "#6A5038" });
  a.box(1.3, 0.03, 1.0, { at: [0, 1.0, 0], rot: [0.12, 0, 0], color: cloth, shade: 0.04 });
  a.ico(0.18, 0, { at: [0.3, 0.16, 0.1], scale: [1, 1.2, 1], color: "#B07A52" });
  a.ico(0.14, 0, { at: [-0.2, 0.12, -0.1], scale: [1, 1.3, 1], color: "#A0684A" });
  a.box(0.4, 0.3, 0.3, { at: [-0.25, 0.15, 0.2], color: "#8E6E4C" });
  k.merge(a, m);
}

export function pot(k: K, at: V3, s: number) {
  k.ico(0.16 * s, 0, { at: [at[0], at[1] + 0.15 * s, at[2]], scale: [1, 1.2, 1], color: "#B07A52", jitter: 0.01 });
  k.cyl(0.07 * s, 0.09 * s, 0.08 * s, 6, { at: [at[0], at[1] + 0.34 * s, at[2]], color: "#9A6648" });
}

export function watchtower(k: K, at: V3) {
  const [x, y, z] = at;
  k.cyl(0.7, 0.8, 1.8, 8, { at: [x, y + 0.9, z], color: "#8A929A", jitter: 0.04 });
  k.cyl(0.78, 0.7, 0.3, 8, { at: [x, y + 1.95, z], color: "#7D8791", jitter: 0.06 });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.3; if (i === 2) continue; k.box(0.32, 0.4 - i * 0.08, 0.25, { at: [x + Math.cos(a) * 0.66, y + 2.25, z + Math.sin(a) * 0.66], rot: [0, -a, 0], color: "#7D8791", jitter: 0.03 }); }
  k.cyl(0.72, 0.85, 0.25, 8, { at: [x, y + 2.15, z], color: "#E6EEF2", jitter: 0.04 });
  k.box(0.3, 0.5, 0.06, { at: [x, y + 0.3, z + 0.78], color: "#3F4552" });
  k.dodeca(0.3, { at: [x + 0.9, y + 0.12, z + 0.2], scale: [1, 0.5, 1], color: "#7D8791", jitter: 0.05 });
}

export function cairn(k: K, at: V3) {
  let y = at[1];
  for (let i = 0; i < 4; i++) {
    const s = 0.26 - i * 0.05;
    k.dodeca(s, { at: [at[0] + (i % 2) * 0.03, y + s * 0.5, at[2]], scale: [1.2, 0.55, 1], color: i % 2 ? "#7D8791" : "#8C95A0", jitter: 0.03, seed: i });
    y += s * 0.8;
  }
}

export function bones(k: K, at: V3, rot: number) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(1, 1, 1));
  const b = new Kit();
  const c = "#E2DCCC";
  for (let i = 0; i < 4; i++) b.tube([[i * 0.28 - 0.4, 0, -0.35], [i * 0.28 - 0.4, 0.55, 0], [i * 0.28 - 0.4, 0.1, 0.4]], 0.05, 0.03, 4, { color: c });
  b.ico(0.32, 0, { at: [0.85, 0.2, 0], scale: [1.3, 0.9, 1], color: c, jitter: 0.03 });
  for (const s of [-1, 1]) b.tube([[0.9, 0.12, s * 0.22], [1.4, 0.15, s * 0.5], [1.7, 0.6, s * 0.35]], 0.07, 0.025, 5, { color: "#F0EAD8" });
  k.merge(b, m);
}

export function spire(k: K, at: V3, h: number, v: number) {
  const [x, y, z] = at;
  k.cone(0.4, h, 5, { at: [x, y + h / 2, z], rot: [0.06 * (v - 1), v, 0.05], color: "#2E2628", jitter: 0.05, seed: v });
  k.cone(0.22, h * 0.55, 4, { at: [x + 0.35, y + h * 0.27, z + 0.1], rot: [0, v * 2, -0.15], color: "#3A3133", jitter: 0.04 });
}

export function basalt(k: K, at: V3, v: number) {
  const rnd = mulberry32(v + 77);
  for (let i = 0; i < 6; i++) {
    const h = 0.4 + rnd() * 0.9, a = rnd() * TAU, r = rnd() * 0.45;
    k.cyl(0.2, 0.2, h, 6, { at: [at[0] + Math.cos(a) * r, at[1] + h / 2, at[2] + Math.sin(a) * r], color: i % 2 ? "#4A3F3E" : "#3E3536", shade: 0.08 });
  }
}

export function brazier(k: K, at: V3) {
  const [x, y, z] = at;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; k.box(0.05, 0.6, 0.05, { at: [x + Math.cos(a) * 0.16, y + 0.3, z + Math.sin(a) * 0.16], rot: [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25], color: "#2A2426" }); }
  k.cyl(0.3, 0.16, 0.2, 8, { at: [x, y + 0.66, z], color: "#3A3133" });
  k.ico(0.2, 0, { at: [x, y + 0.82, z], scale: [1, 1.4, 1], color: "#FF9A3A", emit: 1.6, shade: 0.1 });
  k.ico(0.11, 0, { at: [x, y + 0.98, z], color: "#FFD27A", emit: 1.6 });
}

export function cage(k: K, at: V3) {
  const [x, y, z] = at;
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; k.box(0.03, 0.9, 0.03, { at: [x + Math.cos(a) * 0.3, y + 0.45, z + Math.sin(a) * 0.3], color: "#2A2426" }); }
  k.cyl(0.33, 0.33, 0.05, 8, { at: [x, y + 0.9, z], color: "#2A2426" });
  k.cyl(0.33, 0.33, 0.05, 8, { at: [x, y + 0.03, z], color: "#2A2426" });
  k.ico(0.1, 0, { at: [x + 0.05, y + 0.12, z], color: "#E2D6C0" });
}

// ------------------------------------------------------------------ gates
/** Our gatehouse (art 1.1): two round towers with blue roofs and gold trim, an arched gate, short walls. Faces +z (road comes in along +z... the gate's opening axis is z). */
export function gatehouse(k: K, scale = 1) {
  const s = scale;
  const stone = "#C9C0AE", dark = "#8E8676", roof = SHARED.blue, gold = SHARED.gold;
  for (const sx of [-1, 1]) {
    const x = sx * 0.95 * s;
    k.cyl(0.48 * s, 0.55 * s, 1.9 * s, 10, { at: [x, 0.95 * s, 0], color: stone, jitter: 0.015 });
    k.cyl(0.56 * s, 0.56 * s, 0.14 * s, 10, { at: [x, 1.92 * s, 0], color: dark });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; k.box(0.16 * s, 0.18 * s, 0.14 * s, { at: [x + Math.cos(a) * 0.5 * s, 2.05 * s, Math.sin(a) * 0.5 * s], rot: [0, -a, 0], color: stone }); }
    k.cone(0.5 * s, 0.85 * s, 10, { at: [x, 2.55 * s, 0], color: roof, shade: 0.04 });
    k.cyl(0.02 * s, 0.02 * s, 0.35 * s, 4, { at: [x, 3.1 * s, 0], color: gold });
    k.box(0.12 * s, 0.22 * s, 0.04 * s, { at: [x + sx * 0.0, 1.3 * s, 0.52 * s], color: "#2A3448" });
    k.cyl(0.5 * s, 0.5 * s, 0.05 * s, 10, { at: [x, 2.22 * s, 0], color: gold });
  }
  // the gate block with an arch
  k.box(1.5 * s, 1.55 * s, 0.7 * s, { at: [0, 0.78 * s, 0], color: stone, jitter: 0.01 });
  k.box(1.6 * s, 0.12 * s, 0.78 * s, { at: [0, 1.6 * s, 0], color: dark });
  for (let i = 0; i < 4; i++) k.box(0.22 * s, 0.2 * s, 0.7 * s, { at: [(-0.6 + i * 0.4) * s, 1.76 * s, 0], color: stone });
  const arch = new THREE.Shape();
  arch.moveTo(-0.42, 0); arch.lineTo(-0.42, 0.62); arch.absarc(0, 0.62, 0.42, Math.PI, 0, true); arch.lineTo(0.42, 0); arch.lineTo(-0.42, 0);
  for (const zz of [0.36, -0.36]) k.extrude(arch, 0.02, { at: [0, 0, zz * s], scale: [s, s, s], color: "#2A2220" });
  k.box(0.84 * s, 1.0 * s, 0.6 * s, { at: [0, 0.5 * s, 0], color: "#3A2E26" });
  // gold trim and a crest
  k.box(1.52 * s, 0.05 * s, 0.05 * s, { at: [0, 1.5 * s, 0.37 * s], color: gold });
  k.box(0.3 * s, 0.3 * s, 0.04 * s, { at: [0, 1.25 * s, 0.37 * s], rot: [0, 0, Math.PI / 4], color: roof });
  // short walls running off to the sides
  for (const sx of [-1, 1]) k.box(0.9 * s, 0.9 * s, 0.4 * s, { at: [sx * 1.8 * s, 0.45 * s, -0.05 * s], color: stone, jitter: 0.02 });
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) k.box(0.18 * s, 0.16 * s, 0.4 * s, { at: [sx * (1.45 + i * 0.32) * s, 0.98 * s, -0.05 * s], color: stone });
}

/** Banner cloth for the gatehouse (flag material; hangs from x = 0 along +x). */
export function bannerCloth(w: number, h: number, color: string, trim: string) {
  const k = new Kit();
  const seg = 6;
  for (let i = 0; i < seg; i++) {
    k.box(w / seg, h, 0.015, { at: [(i + 0.5) * (w / seg), -h / 2, 0], color, shade: 0.02 });
  }
  k.box(w, 0.06, 0.02, { at: [w / 2, -0.03, 0], color: trim });
  const tip = new THREE.Shape();
  tip.moveTo(0, 0); tip.lineTo(w, 0); tip.lineTo(w / 2, -0.18); tip.lineTo(0, 0);
  k.extrude(tip, 0.015, { at: [0, -h, 0], color });
  return k.build();
}

/** Horde gate per act: broken arch / obelisk pair / ice teeth / lava portal. Opening axis z; mouth at z = 0. */
export function hordeGate(k: K, theme: string) {
  if (theme === "desert") {
    for (const sx of [-1, 1]) obelisk(k, [sx * 0.95, 0, 0], 2.4, "#B8A27C");
    k.box(2.4, 0.3, 0.5, { at: [0, 2.35, 0], rot: [0, 0, 0.06], color: "#A8926C", jitter: 0.04 });
    k.dodeca(0.3, { at: [1.3, 0.12, 0.5], scale: [1, 0.5, 1], color: "#B8A27C" });
  } else if (theme === "peaks") {
    const rnd = mulberry32(5);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (i / 8);
      const h = 0.8 + Math.sin(a) * 1.6 + rnd() * 0.3;
      k.cone(0.22, h, 5, { at: [Math.cos(a) * 1.15, Math.sin(a) * 1.05 + h * 0.15, 0], rot: [0, 0, a - Math.PI / 2 + (rnd() - 0.5) * 0.3], color: i % 2 ? "#BFE6F5" : "#9CCFE6", shade: 0.06 });
    }
    for (const sx of [-1, 1]) k.dodeca(0.45, { at: [sx * 1.2, 0.2, 0], scale: [1, 0.8, 1], color: "#7D8791", jitter: 0.05 });
  } else if (theme === "citadel") {
    for (const sx of [-1, 1]) {
      k.cyl(0.32, 0.42, 2.6, 6, { at: [sx * 1.05, 1.3, 0], color: "#2E2628", jitter: 0.03 });
      k.cone(0.34, 0.6, 6, { at: [sx * 1.05, 2.9, 0], color: "#3A3133" });
      k.ico(0.16, 0, { at: [sx * 1.05, 2.1, 0.35], color: "#E2D6C0" });
    }
    k.box(2.6, 0.35, 0.45, { at: [0, 2.6, 0], color: "#2E2628", jitter: 0.03 });
    k.box(2.2, 0.08, 0.5, { at: [0, 0.03, 0], color: "#FF7A2A", emit: 1.2 });
  } else {
    // meadow: a broken stone arch, ivy
    const c = "#9C958A";
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 5; i++) k.box(0.45, 0.42, 0.5, { at: [sx * 1.0, 0.21 + i * 0.42, 0], rot: [0, (i % 2) * 0.06, 0], color: c, jitter: 0.04, seed: i + sx * 9 });
    }
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * (0.12 + i * 0.16);
      k.box(0.45, 0.4, 0.5, { at: [Math.cos(a) * 1.0, 2.1 + Math.sin(a) * 0.65, 0], rot: [0, 0, a - Math.PI / 2], color: c, jitter: 0.04, seed: i + 30 });
    }
    k.dodeca(0.3, { at: [0.9, 0.12, 0.6], scale: [1, 0.6, 1], color: c, jitter: 0.05 });
    k.ico(0.25, 0, { at: [-1.05, 1.5, 0.27], scale: [0.6, 1.6, 0.4], color: "#4F7A3E", jitter: 0.04 });
  }
}

export function mulberry32(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { let t = (s = (s + 0x6d2b79f5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
