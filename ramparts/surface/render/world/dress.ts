// Dressing: gates, signature props, trees, rocks, grass, flowers, kerb stones (art 1.1, 2.x).
// Everything static merges into one mesh; plants are instanced per variant with wind sway.
import * as THREE from "../../vendor/three.js";
import type { Battle } from "../../../game/types.ts";
import { flagMaterial, foliageDepthMaterial, lit } from "../mats.ts";
import { Kit } from "../models/kit.ts";
import * as P from "../models/props.ts";
import type { Look } from "../palette.ts";
import { SHARED } from "../palette.ts";
import { Field, MARGIN, PAD_R, ROAD_EDGE, ROAD_HALF, noise2 } from "./field.ts";
import { planStream } from "./water.ts";

const SWIRL_FS = /* glsl */ `
uniform float time, speed; uniform vec3 key; varying vec2 vUv;
void main() {
  vec2 q = (vUv - vec2(0.5, 0.42)) * vec2(1.0, 1.25);
  float r = length(q), a = atan(q.y, q.x);
  float s = sin(a * 3.0 + r * 14.0 - time * (1.5 + speed * 4.0));
  float arch = 1.0 - smoothstep(0.47, 0.5, length(max(abs(vUv - vec2(0.5, 0.36)) - vec2(0.0, 0.0), 0.0) * vec2(1.0, 0.0)) );
  vec3 c = mix(vec3(0.02, 0.012, 0.03), key * 0.55, smoothstep(0.3, 1.0, s) * (1.0 - r * 1.2));
  c += key * 0.5 * smoothstep(0.25, 0.0, r);
  float shape = step(vUv.y, 0.62) + step(0.62, vUv.y) * step(length((vUv - vec2(0.5, 0.62)) * vec2(1.0, 1.55)), 0.5);
  gl_FragColor = vec4(c, clamp(shape, 0.0, 1.0));
}`;

export function dress(f: Field, look: Look, theme: string, rnd: () => number, vista: boolean) {
  const bare = !!(f.map as { showroom?: boolean }).showroom;
  const group = new THREE.Group();
  group.name = "dress";
  const updates: ((t: number, dt: number, b: Battle | null) => void)[] = [];
  const k = new Kit();
  const flag = flagMaterial();

  // ---------------------------------------------------------------- gates (first: they flatten their ground)
  const swirls: THREE.ShaderMaterial[] = [];
  for (const e of f.ends) {
    const gx = e.x + e.dx * MARGIN * 0.62, gz = e.z + e.dz * MARGIN * 0.62;
    const yaw = Math.atan2(e.dx, e.dz);
    const title = vista && theme === "title" && e.kind === "exit";
    const hero = e.kind === "exit" ? (title ? 1.6 : 1.35) : 1.15;
    f.flats.push({ x: gx, z: gz, r: title ? 2.6 : 1.5, y: 0 });
    f.take(gx, gz, title ? 3.2 : 2.2);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(gx, 0, gz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
    const g = new Kit();
    if (e.kind === "exit") {
      P.gatehouse(g, title ? 1.6 : hero);
      if (title) castleKeep(g);
      // banners on the towers, blue with gold
      const s = hero;
      for (const sx of [-1, 1]) {
        const ban = new THREE.Mesh(P.bannerCloth(0.32 * s, 0.75 * s, SHARED.blue, SHARED.gold), flag);
        ban.position.set(sx * 0.95 * s - 0.16 * s, 1.85 * s, -0.56 * s);
        ban.rotation.y = 0;
        const holder = new THREE.Group();
        holder.add(ban);
        holder.applyMatrix4(m);
        ban.castShadow = true;
        group.add(holder);
        // a pennant on the roof
        const pen = new THREE.Mesh(P.bannerCloth(0.36 * s, 0.12 * s, SHARED.gold, SHARED.blue), flag);
        pen.position.set(sx * 0.95 * s, 3.25 * s, 0);
        const ph = new THREE.Group(); ph.add(pen); ph.applyMatrix4(m); group.add(ph);
      }
    } else {
      P.hordeGate(g, theme);
      const sw = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, speed: { value: 0 }, key: { value: new THREE.Color(look.key) } },
        vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: SWIRL_FS, transparent: true, side: THREE.DoubleSide,
      });
      swirls.push(sw);
      const mouth = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.2), sw);
      mouth.position.set(0, 1.1, 0);
      const holder = new THREE.Group(); holder.add(mouth); holder.applyMatrix4(m); group.add(holder);
    }
    k.merge(g, m);
  }
  updates.push((t, _dt, b) => {
    const cd = b && b.countdown >= 0 ? 1 - Math.min(1, b.countdown / 300) : 0;
    for (const s of swirls) { s.uniforms.time!.value = t; s.uniforms.speed!.value = cd; }
  });

  planStream(f);

  // ---------------------------------------------------------------- big props
  const spot = (r: number, o: { back?: boolean; play?: boolean; edge?: boolean } = {}) => {
    let best: [number, number, number] | null = null;
    for (let i = 0; i < 260; i++) {
      const x = (rnd() - 0.5) * 2 * (f.W2 - 0.4), z = (rnd() - 0.5) * 2 * (f.H2 - 0.4);
      if (bare && f.inPlay(x, z, -0.6)) continue;
      if (!o.play && f.inPlay(x, z, -0.2) && !vista) {
        // inside the playable rect only in big open areas
        if (f.clearance(x, z) < r + 1.4) continue;
      }
      const c = f.clearance(x, z) - r;
      if (c < 0.25) continue;
      let score = Math.min(c, 2) + rnd() * 1.5;
      if (o.back) score += z < 0 ? 1.5 : -1.5;
      if (o.edge) score += -f.sdf(x, z) < 2.5 ? 1 : 0;
      // keep tall things off the front band (they would cover the play area)
      if (z > f.h / 2 - 1) score -= 3;
      if (!best || score > best[2]) best = [x, z, score];
    }
    if (!best) return null;
    f.take(best[0], best[1], r);
    return [best[0], f.height(best[0], best[1]) - 0.03, best[1]] as [number, number, number];
  };

  const spinners: { obj: THREE.Object3D; speed: number }[] = [];
  if (theme === "meadow" || theme === "title") {
    const w = spot(1.1, { back: true });
    if (w) {
      const { hub, rot } = P.windmill(k, w, Math.PI * 0.15 + rnd() * 0.5);
      const blades = new THREE.Mesh(P.windmillBlades(), lit({ kind: "world", fog: false }));
      blades.position.copy(hub); blades.rotation.y = rot;
      blades.castShadow = true;
      const pivot = new THREE.Group(); pivot.add(blades); group.add(pivot);
      spinners.push({ obj: blades, speed: 0.15 * Math.PI * 2 });
    }
    const wl = spot(0.7); if (wl) P.well(k, wl);
    const sh = spot(0.5); if (sh) P.shrine(k, sh);
    for (let i = 0; i < 5; i++) { const h = spot(0.45); if (h) P.hayBale(k, h, rnd() * 3); }
    for (let i = 0; i < 3; i++) { const a = spot(0.4, { edge: true }); if (a) { const ang = rnd() * Math.PI; P.stoneWall(k, [a[0] - Math.cos(ang) * 1.1, a[1], a[2] - Math.sin(ang) * 1.1], [a[0] + Math.cos(ang) * 1.1, a[1], a[2] + Math.sin(ang) * 1.1]); f.take(a[0], a[2], 1.2); } }
    fencesAlongRoad(f, k, rnd);
  } else if (theme === "desert") {
    const c = spot(1.6, { back: true });
    if (c) { const ang = rnd() * Math.PI; for (let i = 0; i < 4; i++) P.column(k, [c[0] + Math.cos(ang) * (i - 1.5) * 0.9, c[1], c[2] + Math.sin(ang) * (i - 1.5) * 0.9], 1.3 + (i % 2) * 0.3, i === 2 || i === 3); }
    const hd = spot(1.1); if (hd) P.statueHead(k, hd, rnd() * 6);
    for (let i = 0; i < 2; i++) { const o = spot(0.5, { back: true }); if (o) P.obelisk(k, o, 1.8 + rnd()); }
    for (let i = 0; i < 2; i++) { const a = spot(0.8); if (a) P.awning(k, a, rnd() * 6, i ? "#3E7B8C" : "#B65A42"); }
    for (let i = 0; i < 3; i++) { const t = spot(0.8); if (t) P.toppled(k, t, rnd() * 6); }
    for (let i = 0; i < 5; i++) { const p = spot(0.25); if (p) P.pot(k, p, 0.8 + rnd() * 0.5); }
    for (let i = 0; i < 4; i++) { const c2 = spot(0.4); if (c2) P.column(k, c2, 0.3 + rnd() * 0.8, true); }
  } else if (theme === "peaks") {
    const w = spot(1.1, { back: true }); if (w) P.watchtower(k, w);
    for (let i = 0; i < 4; i++) { const c = spot(0.35); if (c) P.cairn(k, c); }
    const bn = spot(1.0); if (bn) P.bones(k, bn, rnd() * 6);
  } else if (theme === "citadel") {
    for (let i = 0; i < 7; i++) { const s = spot(0.55, { back: i < 4 }); if (s) P.spire(k, s, 1.6 + rnd() * 1.6, i); }
    for (let i = 0; i < 4; i++) { const b = spot(0.75); if (b) P.basalt(k, b, i); }
    for (let i = 0; i < 4; i++) { const b = spot(0.35); if (b) P.brazier(k, b); }
    for (let i = 0; i < 2; i++) { const c = spot(0.4); if (c) P.cage(k, c); }
  }
  kerbs(f, k, look, theme, rnd);

  // ---------------------------------------------------------------- plants
  const inst = (geos: THREE.BufferGeometry[], kind: "foliage" | "world", items: { x: number; z: number; s: number; r: number; v: number }[], shadow: boolean) => {
    const mat = lit({ kind: kind === "foliage" ? "foliage" : "top", rough: 0.9 });
    const depth = kind === "foliage" ? foliageDepthMaterial() : undefined;
    geos.forEach((g, v) => {
      const mine = items.filter((it) => it.v === v);
      if (!mine.length) return;
      const im = new THREE.InstancedMesh(g, mat, mine.length);
      im.name = `inst${group.children.length}`;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      mine.forEach((it, i) => { m.compose(new THREE.Vector3(it.x, f.height(it.x, it.z) - 0.03, it.z), q.setFromAxisAngle(up, it.r), new THREE.Vector3(it.s, it.s, it.s)); im.setMatrixAt(i, m); });
      im.castShadow = shadow; im.receiveShadow = true;
      if (depth) im.customDepthMaterial = depth;
      im.computeBoundingSphere();
      group.add(im);
    });
  };
  const scatter = (n: number, need: number, nv: number, o: { inPlayNeed?: number; clump?: number; s?: [number, number]; take?: number; front?: boolean } = {}) => {
    const out: { x: number; z: number; s: number; r: number; v: number }[] = [];
    for (let i = 0; i < n * 6 && out.length < n; i++) {
      const x = (rnd() - 0.5) * 2 * f.W2, z = (rnd() - 0.5) * 2 * f.H2;
      if (o.clump && noise2(x * 0.35 + 3, z * 0.35 + 8) < o.clump) continue;
      const inPlay = f.inPlay(x, z, -0.3);
      if (bare && inPlay && need > 0.3) continue;
      const c = f.clearance(x, z);
      if (c < (inPlay ? (o.inPlayNeed ?? need) : need)) continue;
      // tall plants stay off the front edge's dressing so they never cover the play area
      if (!o.front && z > f.h / 2 + 0.2) continue;
      const s = (o.s ?? [0.8, 1.2]);
      out.push({ x, z, s: s[0] + rnd() * (s[1] - s[0]), r: rnd() * Math.PI * 2, v: Math.floor(rnd() * nv) });
      if (o.take) f.take(x, z, o.take);
    }
    return out;
  };

  if (theme === "meadow" || theme === "title") {
    inst([0, 1, 2].map((v) => P.roundTree(look, v)), "foliage", scatter(vista ? 46 : 38, 0.7, 3, { inPlayNeed: 1.5, take: 0.55, s: [0.85, 1.3], clump: 0.5 }), true);
    inst([0, 1].map((v) => P.bush(look, v)), "foliage", scatter(30, 0.4, 2, { inPlayNeed: 0.9, take: 0.3, front: true, clump: 0.45 }), true);
    inst([0, 1, 2].map((v) => P.rock(look, theme, v)), "world", scatter(18, 0.35, 3, { inPlayNeed: 0.8, take: 0.35, front: true, s: [0.6, 1.3] }), true);
    inst([0, 1, 2].map((v) => P.grassTuft(look, v, "grass")), "foliage", scatter(1500, 0.3, 3, { clump: 0.5, front: true, s: [0.6, 1.1] }), false);
    inst([0, 1, 2].map((v) => P.flowers(look, v)), "foliage", scatter(110, 0.3, 3, { clump: 0.55, front: true }), false);
  } else if (theme === "desert") {
    inst([0, 1, 2].map((v) => P.palm(look, v)), "foliage", nearWater(f, rnd, 10).concat(scatter(8, 0.8, 3, { inPlayNeed: 1.8, take: 0.5 })), true);
    inst([0, 1].map((v) => P.bush(look, v)), "foliage", scatter(22, 0.4, 2, { inPlayNeed: 1, take: 0.3, front: true, s: [0.6, 0.9] }), true);
    inst([0, 1, 2].map((v) => P.rock(look, theme, v)), "world", scatter(22, 0.35, 3, { inPlayNeed: 0.8, take: 0.35, front: true, s: [0.6, 1.4] }), true);
    inst([0, 1, 2].map((v) => P.grassTuft(look, v, "dry")), "foliage", scatter(700, 0.25, 3, { clump: 0.55, front: true, s: [0.7, 1.2] }), false);
  } else if (theme === "peaks") {
    inst([0, 1, 2].map((v) => P.pine(look, v, true)), "foliage", scatter(vista ? 60 : 46, 0.6, 3, { inPlayNeed: 1.4, take: 0.5, s: [0.8, 1.4], clump: 0.48 }), true);
    inst([0, 1, 2].map((v) => P.rock(look, theme, v)), "world", scatter(22, 0.35, 3, { inPlayNeed: 0.8, take: 0.35, front: true, s: [0.6, 1.4] }), true);
    inst([0, 1, 2].map((v) => P.iceCrystal(v)), "world", scatter(10, 0.4, 3, { inPlayNeed: 1.2, take: 0.35, s: [0.8, 1.4] }), true);
    inst([0, 1, 2].map((v) => P.grassTuft(look, v, "snowgrass")), "foliage", scatter(500, 0.25, 3, { clump: 0.6, front: true, s: [0.7, 1.1] }), false);
  } else {
    inst([0, 1, 2].map((v) => P.deadTree(look, v)), "foliage", scatter(16, 0.6, 3, { inPlayNeed: 1.5, take: 0.45 }), true);
    inst([0, 1, 2].map((v) => P.rock(look, theme, v)), "world", scatter(26, 0.35, 3, { inPlayNeed: 0.8, take: 0.35, front: true, s: [0.6, 1.5] }), true);
    inst([0, 1, 2].map((v) => P.grassTuft(look, v, "moss")), "foliage", scatter(160, 0.25, 3, { clump: 0.55, front: true, s: [0.8, 1.6] }), false);
  }

  group.add(aoDecals(f));
  const props = new THREE.Mesh(k.build(), lit({ kind: "top", rough: 0.88 }));
  props.castShadow = true; props.receiveShadow = true;
  props.name = "props";
  group.add(props);

  return {
    group,
    update(t: number, dt: number, b: Battle | null) {
      for (const s of spinners) s.obj.rotation.z += s.speed * dt;
      for (const u of updates) u(t, dt, b);
    },
  };
}

function nearWater(f: Field, rnd: () => number, n: number) {
  const out: { x: number; z: number; s: number; r: number; v: number }[] = [];
  for (const p of f.pools) for (let i = 0; i < 40 && out.length < n; i++) {
    const a = rnd() * Math.PI * 2, d = p.r + 0.4 + rnd() * 0.9;
    const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
    if (f.clearance(x, z) < 0.3 || (f.inPlay(x, z) && f.clearance(x, z) < 1.4)) continue;
    out.push({ x, z, s: 0.85 + rnd() * 0.35, r: rnd() * 6.28, v: Math.floor(rnd() * 3) });
    f.take(x, z, 0.4);
  }
  return out;
}

function kerbs(f: Field, k: Kit, look: Look, theme: string, rnd: () => number) {
  const off = ROAD_HALF + ROAD_EDGE + 0.05;
  const skip = theme === "desert" || theme === "citadel" ? 0.35 : 0.55;
  for (const r of f.roads) {
    // walk the whole line at a fixed spacing (the drawn road is finely resampled)
    let next = 0, acc = 0;
    for (let i = 0; i + 1 < r.length; i++) {
      const a = r[i]!, b = r[i + 1]!;
      const L = a.distanceTo(b);
      if (L < 1e-6) continue;
      const dx = (b.x - a.x) / L, dz = (b.y - a.y) / L;
      while (next <= acc + L) {
        const s = next - acc;
        next += 0.55;
        if (rnd() < skip) continue;
        const side = rnd() < 0.5 ? -1 : 1;
        const x = a.x + dx * s - dz * off * side, z = a.y + dz * s + dx * off * side;
        if (f.sdf(x, z) > -0.25 || f.dPad(x, z) < PAD_R + 0.25 || f.dRoad(x, z) < off - 0.08) continue;
        k.box(0.2 + rnd() * 0.12, 0.1, 0.14, { at: [x, f.height(x, z) + 0.035, z], rot: [0, Math.atan2(dx, dz) + (rnd() - 0.5) * 0.4, 0], color: look.kerb, jitter: 0.02, seed: next });
      }
      acc += L;
    }
  }
}

function fencesAlongRoad(f: Field, k: Kit, rnd: () => number) {
  // short split-rail fences beside the road where there is room, mostly in the dressing
  let made = 0;
  for (const r of f.roads) for (let i = 0; i + 1 < r.length && made < 4; i++) {
    const a = r[i]!, b = r[i + 1]!, L = a.distanceTo(b);
    if (L < 2.4 || rnd() < 0.4) continue;
    const dx = (b.x - a.x) / L, dz = (b.y - a.y) / L, side = rnd() < 0.5 ? -1 : 1, off = 1.25;
    const s0 = rnd() * (L - 2.2), s1 = s0 + 1.6 + rnd() * 0.8;
    const p0 = [a.x + dx * s0 - dz * off * side, a.y + dz * s0 + dx * off * side], p1 = [a.x + dx * s1 - dz * off * side, a.y + dz * s1 + dx * off * side];
    let ok = true;
    for (let t = 0; t <= 1; t += 0.2) { const x = p0[0]! + (p1[0]! - p0[0]!) * t, z = p0[1]! + (p1[1]! - p0[1]!) * t; if (f.clearance(x, z) < 0.25 || f.dPad(x, z) < PAD_R + 0.6) ok = false; }
    if (!ok) continue;
    P.fence(k, [p0[0]!, 0, p0[1]!], [p1[0]!, 0, p1[1]!]);
    for (let t = 0; t <= 1; t += 0.25) f.take(p0[0]! + (p1[0]! - p0[0]!) * t, p0[1]! + (p1[1]! - p0[1]!) * t, 0.2);
    made++;
  }
}

/** The title castle: a keep and towers behind the gatehouse, ringed by the ramparts. */
function castleKeep(k: Kit) {
  const stone = "#CFC6B2", roof = SHARED.blue, gold = SHARED.gold;
  k.box(2.4, 3.6, 2.2, { at: [0, 1.8, 2.6], color: stone, jitter: 0.02 });
  for (let i = 0; i < 6; i++) k.box(0.3, 0.3, 2.2, { at: [-1.05 + i * 0.42, 3.75, 2.6], color: stone });
  k.cone(1.5, 1.6, 4, { at: [0, 4.7, 2.6], rot: [0, Math.PI / 4, 0], color: roof });
  for (const [x, z, h] of [[-2.2, 3.6, 3.2], [2.2, 3.6, 3.6], [-2.6, 1.4, 2.4], [2.6, 1.4, 2.4]] as const) {
    k.cyl(0.55, 0.62, h, 10, { at: [x, h / 2, z], color: stone, jitter: 0.015 });
    k.cone(0.66, 1.0, 10, { at: [x, h + 0.5, z], color: roof });
    k.cyl(0.6, 0.6, 0.06, 10, { at: [x, h + 0.02, z], color: gold });
  }
  // windows that light (emissive, <= 1.6)
  for (let i = 0; i < 4; i++) k.box(0.18, 0.32, 0.04, { at: [-0.75 + i * 0.5, 2.4, 1.48], color: "#FFCF7A", emit: 1.5, shade: 0 });
  for (let i = 0; i < 3; i++) k.box(0.16, 0.28, 0.04, { at: [-0.5 + i * 0.5, 1.4, 1.48], color: "#FFCF7A", emit: 1.3, shade: 0 });
  // ramparts round the hill
  for (const [x0, z0, x1, z1] of [[-3.2, 0.6, -3.2, 4.4], [3.2, 0.6, 3.2, 4.4], [-3.2, 4.4, 3.2, 4.4]] as const) {
    const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    k.box(L, 1.0, 0.45, { at: [(x0 + x1) / 2, 0.5, (z0 + z1) / 2], rot: [0, -ang, 0], color: stone, jitter: 0.02 });
    const n = Math.round(L / 0.45);
    for (let i = 0; i < n; i += 2) k.box(0.22, 0.2, 0.45, { at: [x0 + (x1 - x0) * (i + 0.5) / n, 1.1, z0 + (z1 - z0) * (i + 0.5) / n], rot: [0, -ang, 0], color: stone });
  }
}

/** Contact AO: a soft dark pool where every tree, rock and prop meets the ground (one instanced mesh). */
function aoDecals(f: Field) {
  const items = f.taken.filter((t) => t.r < 2.4);
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.05, 0.04, 0.06, smoothstep(1.0, 0.2, d) * 0.32); }",
  });
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  const m = new THREE.Matrix4();
  items.forEach((t, i) => { const r = t.r * 2.6 + 0.3; m.makeScale(r, 1, r).setPosition(t.x, f.height(t.x, t.z) + 0.03, t.z); im.setMatrixAt(i, m); });
  im.count = items.length;
  im.renderOrder = 1;
  im.name = "ao";
  return im;
}
