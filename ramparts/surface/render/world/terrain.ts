// The slab: the ground top (road drawn from a distance field in the shader), the cut edge in strata
// bands, the rock root that tapers into the fog, and things hanging from the lip (art 1.1).
import * as THREE from "../../vendor/three.js";
import { lit } from "../mats.ts";
import type { Look } from "../palette.ts";
import { CORNER, Field, ROAD_EDGE, ROAD_HALF, hash2, noise2 } from "./field.ts";
import { Kit } from "../models/kit.ts";

const STYLE: Record<string, number> = { meadow: 0, title: 0, desert: 1, peaks: 2, citadel: 3 };

const GROUND_HEAD = /* glsl */ `
vec3 rpGlow = vec3(0.0);
uniform sampler2D uRoadTex; uniform vec4 uRoadBox; uniform vec3 uG0, uGA, uGB, uR0, uRE; uniform float uRH, uREW, uStyle;
vec2 rpVor(vec2 p) {
  vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(rpHash(i + g), rpHash(i + g + 17.3)) * 0.8 + 0.1;
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(d1, d2);
}`;

const GROUND_COLOR = /* glsl */ `
{
  vec2 xz = vWorld.xz;
  float d = texture2D(uRoadTex, (xz - uRoadBox.xy) * uRoadBox.zw).r;
  float n = rpFbm(xz * 0.3 + 4.0);
  vec3 g = uG0;
  g = mix(g, uGA, smoothstep(0.5, 0.68, n));
  g = mix(g, uGB, smoothstep(0.44, 0.3, n) * 0.85);
  float fine = rpNoise(xz * 3.3) * 0.6 + rpNoise(xz * 9.0) * 0.4;
  g *= 0.955 + 0.09 * fine;
  if (uStyle > 0.5 && uStyle < 1.5) {
    float rp = sin(dot(xz, vec2(0.83, 0.55)) * 6.5 + rpNoise(xz * 0.7) * 7.0);
    g *= 1.0 + 0.03 * rp;
  } else if (uStyle > 1.5 && uStyle < 2.5) {
    g = mix(g, uGA * 0.97, smoothstep(0.02, -0.16, vWorld.y) * 0.7);
    g = mix(g, uGB, smoothstep(0.1, 0.25, vWorld.y) * 0.5);
  } else if (uStyle > 2.5) {
    vec2 v = rpVor(xz * 0.7);
    float crack = 1.0 - smoothstep(0.0, 0.03, v.y - v.x);
    float far = smoothstep(1.6, 3.2, d);
    float live = smoothstep(0.62, 0.82, rpNoise(xz * 0.22 + 4.0)) * far;
    g *= 1.0 - 0.25 * crack;
    rpGlow = mix(vec3(1.0, 0.25, 0.05), vec3(1.0, 0.62, 0.2), rpNoise(xz * 3.0 + uTime * 0.3)) * crack * live * (1.2 + 0.4 * sin(uTime * 1.7 + xz.x));
  }
  float wob = (rpNoise(xz * 1.7) - 0.5) * 0.12 + (rpNoise(xz * 7.0) - 0.5) * 0.05;
  float dd = d + wob;
  float aa = fwidth(dd) * 0.8 + 0.008;
  float outer = uRH + uREW;
  float inRoad = 1.0 - smoothstep(outer - aa, outer + aa, dd);
  float core = 1.0 - smoothstep(uRH - aa, uRH + aa, dd + (rpNoise(xz * 3.0) - 0.5) * 0.08);
  vec3 r = uR0 * (0.95 + 0.07 * rpNoise(xz * 5.0));
  if (uStyle < 0.5 || (uStyle > 1.5 && uStyle < 2.5)) {
    float rut = 1.0 - smoothstep(0.02, 0.08, abs(d - 0.24));
    r *= 1.0 - 0.09 * rut * (0.6 + 0.4 * rpNoise(xz * 2.0));
    r *= 1.0 - 0.06 * smoothstep(0.6, 0.9, rpNoise(xz * 11.0));
  } else {
    vec2 v = rpVor(xz * 2.3);
    float joint = 1.0 - smoothstep(0.02, 0.07, v.y - v.x);
    r *= (0.94 + 0.1 * rpHash(floor(xz * 2.3 + v.x))) * (1.0 - 0.22 * joint);
  }
  vec3 road = mix(uRE, r, core);
  vec3 col = mix(g, road, inRoad);
  col *= 1.0 - 0.1 * (1.0 - smoothstep(outer, outer + 0.45, dd)) * (1.0 - inRoad);
  col *= 1.0 - 0.17 * smoothstep(1.2, 7.5, d);
  rpGlow *= 1.0 - inRoad;
  diffuseColor.rgb *= col;
}`;

export function groundMesh(f: Field, look: Look, theme: string) {
  const { tex, box } = f.roadTexture();
  const step = 0.34;
  const x0 = -f.W2 - 0.4, z0 = -f.H2 - 0.4;
  const nx = Math.ceil((f.W2 * 2 + 0.8) / step), nz = Math.ceil((f.H2 * 2 + 0.8) / step);
  const pos: number[] = [], col: number[] = [];
  const P: [number, number, number][] = [];
  const C: [number, number, number][] = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    let x = x0 + i * step, z = z0 + j * step;
    // jitter interior vertices a little: breaks the grid's regularity in the facets
    if (f.sdf(x, z) < -0.4) { x += (hash2(i, j) - 0.5) * step * 0.5; z += (hash2(j, i + 3) - 0.5) * step * 0.5; }
    [x, z] = f.snap(x, z);
    const y = f.height(x, z);
    P.push([x, y, z]);
    // banks near water: wet and darker
    let k = 1;
    for (const w of f.pools) { const d = Math.hypot(x - w.x, z - w.z); k = Math.min(k, 0.82 + 0.18 * THREE.MathUtils.smoothstep(d, w.r - 0.1, w.r + 0.7)); }
    C.push([k, k, k * 1.01]);
  }
  const at = (i: number, j: number) => j * (nx + 1) + i;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    const tris = (i + j) % 2 ? [a, c, b, b, c, d] : [a, c, d, a, d, b];
    for (let t = 0; t < 6; t += 3) {
      const p0 = P[tris[t]!]!, p1 = P[tris[t + 1]!]!, p2 = P[tris[t + 2]!]!;
      // drop collapsed triangles on the snapped rim
      const area = Math.abs((p1[0] - p0[0]) * (p2[2] - p0[2]) - (p2[0] - p0[0]) * (p1[2] - p0[2]));
      if (area < 1e-5) continue;
      for (const v of [tris[t]!, tris[t + 1]!, tris[t + 2]!]) { pos.push(...P[v]!); col.push(...C[v]!); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const c = (h: string) => ({ value: new THREE.Color(h) });
  const mat = lit({
    kind: "top", rough: 0.95, key: "ground", fragHead: GROUND_HEAD, fragColor: GROUND_COLOR,
    extra: {
      uRoadTex: { value: tex }, uRoadBox: { value: box }, uG0: c(look.ground), uGA: c(look.groundA), uGB: c(look.groundB),
      uR0: c(look.road), uRE: c(look.roadEdge), uRH: { value: ROAD_HALF }, uREW: { value: ROAD_EDGE }, uStyle: { value: STYLE[theme] ?? 0 },
    },
  });
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  m.name = "ground";
  return m;
}

/** Points round the slab's boundary with outward normals (counter-clockwise seen from above). */
export function perimeter(f: Field, spacing = 0.42) {
  const W = f.W2, H = f.H2, c = CORNER;
  const pts: { x: number; z: number; nx: number; nz: number }[] = [];
  const straightX = 2 * (W - c), straightZ = 2 * (H - c), arc = (Math.PI / 2) * c;
  const L = 2 * straightX + 2 * straightZ + 4 * arc;
  const n = Math.round(L / spacing);
  for (let i = 0; i < n; i++) {
    let s = (i / n) * L;
    let x = 0, z = 0, nx = 0, nz = 0;
    // walk: bottom edge (z = +H) going -x? We go: front edge (z=H) from +x to -x, then left, back, right.
    const segs: [number, (t: number) => void][] = [
      [straightX, (t) => { x = W - c - t; z = H; nx = 0; nz = 1; }],
      [arc, (t) => { const a = Math.PI / 2 + t / c; x = -(W - c) + Math.cos(a) * c; z = H - c + Math.sin(a) * c; nx = Math.cos(a); nz = Math.sin(a); }],
      [straightZ, (t) => { x = -W; z = H - c - t; nx = -1; nz = 0; }],
      [arc, (t) => { const a = Math.PI + t / c; x = -(W - c) + Math.cos(a) * c; z = -(H - c) + Math.sin(a) * c; nx = Math.cos(a); nz = Math.sin(a); }],
      [straightX, (t) => { x = -(W - c) + t; z = -H; nx = 0; nz = -1; }],
      [arc, (t) => { const a = Math.PI * 1.5 + t / c; x = W - c + Math.cos(a) * c; z = -(H - c) + Math.sin(a) * c; nx = Math.cos(a); nz = Math.sin(a); }],
      [straightZ, (t) => { x = W; z = -(H - c) + t; nx = 1; nz = 0; }],
      [arc, (t) => { const a = t / c; x = W - c + Math.cos(a) * c; z = H - c + Math.sin(a) * c; nx = Math.cos(a); nz = Math.sin(a); }],
    ];
    for (const [len, fn] of segs) { if (s <= len) { fn(s); break; } s -= len; }
    // onto the wobbly boundary
    const [bx, bz] = f.snap(x + nx * 0.6, z + nz * 0.6);
    pts.push({ x: bx, z: bz, nx, nz });
  }
  return pts;
}

/** The cut edge: strata bands stepping in as they go down, ledges between, then the rock root. */
export function cliffMesh(f: Field, look: Look) {
  const per = perimeter(f);
  const n = per.length;
  const bands = [0.95, 1.25, 1.15, 1.15];
  const insets = [0, 0.1, 0.22, 0.36];
  const pos: number[] = [], col: number[] = [], emit: number[] = [];
  const C = look.strata.map((h) => new THREE.Color(h).multiplyScalar(1.25));
  const seam = look.seam ? new THREE.Color(look.seam) : null;
  const tmp = new THREE.Color();
  const push = (p: number[], c: THREE.Color, e: number) => { pos.push(...p); col.push(c.r, c.g, c.b); emit.push(e); };
  const quad = (a: number[], b: number[], c: number[], d: number[], cl: THREE.Color, e: number, out: [number, number]) => {
    // two triangles a b c, a c d; flip if facing inward
    const ux = b[0]! - a[0]!, uy = b[1]! - a[1]!, uz = b[2]! - a[2]!, vx = c[0]! - a[0]!, vy = c[1]! - a[1]!, vz = c[2]! - a[2]!;
    const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx, ny = uz * vx - ux * vz;
    const flip = nx * out[0] + nz * out[1] + (out[0] === 0 && out[1] === 0 ? ny : 0) < 0;
    const tris = flip ? [a, c, b, a, d, c] : [a, b, c, a, c, d];
    const k1 = 1 + (hash2(a[0]! * 3.1, a[2]! * 1.7 + a[1]!) - 0.5) * 0.14, k2 = 1 + (hash2(c[0]! * 2.3, c[2]! * 3.9 + c[1]!) - 0.5) * 0.14;
    for (let i = 0; i < 6; i++) push(tris[i]!, tmp.copy(cl).multiplyScalar(i < 3 ? k1 : k2), e);
  };
  // band boundaries per column (smoothly jittered along the perimeter)
  const tops: number[][] = [];
  for (let i = 0; i < n; i++) {
    const p = per[i]!;
    const yTop = f.height(p.x, p.z);
    const ys = [yTop];
    let y = 0;
    for (let k = 0; k < bands.length; k++) {
      y -= bands[k]!;
      const j = k === bands.length - 1 ? (noise2(i * 0.15, 9) - 0.5) * 0.3 : (noise2(i * 0.18 + k * 7, k * 3.1) - 0.5) * 0.32;
      ys.push(y + j);
    }
    tops.push(ys);
  }
  const P = (i: number, y: number, inset: number, salt: number) => {
    const p = per[i % n]!;
    const j = (hash2(i % n + salt * 13.1, y * 7.7) - 0.5) * 0.16;
    const off = -inset + j;
    return [p.x + p.nx * off, y, p.z + p.nz * off];
  };
  for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n;
    const out: [number, number] = [per[i]!.nx, per[i]!.nz];
    for (let k = 0; k < bands.length; k++) {
      const yt0 = tops[i]![k]!, yt1 = tops[i2]![k]!, yb0 = tops[i]![k + 1]!, yb1 = tops[i2]![k + 1]!;
      const ins = insets[k]!;
      const cl = C[Math.min(k, C.length - 1)]!.clone().multiplyScalar(1 - k * 0.04);
      // two rows per band for more facets
      const ym0 = (yt0 + yb0) / 2 + (hash2(i, k) - 0.5) * 0.25, ym1 = (yt1 + yb1) / 2 + (hash2(i2, k) - 0.5) * 0.25;
      const a = P(i, yt0, ins, k), b = P(i2, yt1, ins, k), m0 = P(i, ym0, ins + 0.06, k + 5), m1 = P(i2, ym1, ins + 0.06, k + 5), c = P(i2, yb1, ins, k + 9), d = P(i, yb0, ins, k + 9);
      quad(a, b, m1, m0, cl, 0, out);
      quad(m0, m1, c, d, cl.clone().multiplyScalar(0.94), 0, out);
      if (k + 1 < bands.length) {
        // ledge stepping in to the next band (faces up, catches light)
        const ni = insets[k + 1]!;
        const e = P(i, yb0, ni, k + 1), g = P(i2, yb1, ni, k + 1);
        const lc = seam && k >= 1 ? seam : C[Math.min(k + 1, C.length - 1)]!.clone().lerp(C[k]!, 0.5).multiplyScalar(1.08);
        quad(d, c, g, e, lc, seam && k >= 1 ? 1.25 : 0, [0, 0]);
      }
    }
  }
  // the rock root: rings shrinking toward a point, lost in the fog
  const rings = [{ y: -6.0, s: 0.97 }, { y: -7.5, s: 0.91 }, { y: -9.0, s: 0.84 }, { y: -10.5, s: 0.76 }, { y: -12.0, s: 0.66 }, { y: -13.5, s: 0.52 }, { y: -15, s: 0.32 }, { y: -16, s: 0.05 }];
  const deep = C[C.length - 1]!.clone().multiplyScalar(0.85);
  let prev = per.map((_p, i) => P(i, tops[i]![bands.length]!, insets[insets.length - 1]!, 77));
  rings.forEach((r, ri) => {
    const cur = per.map((p, i) => {
      const k = r.s * (1 + (noise2(i * 0.2, ri * 3) - 0.5) * 0.06);
      return [p.x * k, r.y + (hash2(i, ri) - 0.5) * 0.5, p.z * k];
    });
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      quad(prev[i]!, prev[i2]!, cur[i2]!, cur[i]!, (ri < 2 ? C[C.length - 2]!.clone().lerp(deep, 0.5 + ri * 0.25) : deep.clone().multiplyScalar(1 - ri * 0.04)), 0, [per[i]!.nx, per[i]!.nz]);
    }
    prev = cur;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("aEmit", new THREE.Float32BufferAttribute(emit, 1));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, lit({ kind: "cliff", rough: 0.95, side: new URLSearchParams(location.search).has("dbl") ? THREE.DoubleSide : THREE.FrontSide }));
  m.receiveShadow = true;
  m.castShadow = true;
  m.name = "cliff";
  return { mesh: m, per };
}

/** Roots, vines or icicles hanging from the lip, swaying (instanced per variant). */
export function hangers(f: Field, look: Look, theme: string, per: ReturnType<typeof perimeter>, rnd: () => number) {
  const group = new THREE.Group();
  const kind = theme === "peaks" ? "ice" : theme === "citadel" ? "chain" : theme === "desert" ? "dry" : "root";
  const variants: THREE.BufferGeometry[] = [];
  for (let v = 0; v < 3; v++) {
    const k = new Kit();
    const L = 0.6 + v * 0.45;
    if (kind === "ice") {
      k.cone(0.07 + v * 0.02, L, 5, { at: [0, -L / 2, 0], rot: [Math.PI, 0, 0], color: "#CFE8F2", shade: 0.04 });
      k.cone(0.04, L * 0.6, 4, { at: [0.09, -L * 0.3, 0.03], rot: [Math.PI, 0, 0], color: "#E4F2F8", shade: 0.04 });
    } else {
      const c = kind === "root" ? "#5A4632" : kind === "dry" ? "#7A6248" : "#3A3133";
      const pts: [number, number, number][] = [];
      for (let s = 0; s <= 4; s++) pts.push([Math.sin(s * 1.3 + v) * 0.08, -(s / 4) * L, Math.cos(s * 1.7 + v) * 0.05 + s * 0.02]);
      k.tube(pts, 0.045, 0.012, 4, { color: c, shade: 0.05 });
      if (kind === "root" && v !== 1) {
        k.ico(0.09, 0, { at: [0.03, -L * 0.55, 0.05], color: look.foliage[1], shade: 0.08 });
        k.ico(0.07, 0, { at: [-0.04, -L * 0.85, 0.03], color: look.foliage[2], shade: 0.08 });
      }
    }
    variants.push(k.build());
  }
  const mat = lit({ kind: "foliage", rough: kind === "ice" ? 0.4 : 0.9 });
  const count = kind === "chain" ? 14 : 34;
  const mats = variants.map(() => [] as THREE.Matrix4[]);
  for (let i = 0; i < count; i++) {
    const p = per[Math.floor(rnd() * per.length)]!;
    // skip in front of gates
    if (f.ends.some((e) => Math.hypot(p.x - (e.x + e.dx * 1.5), p.z - (e.z + e.dz * 1.5)) < 2.2)) continue;
    const y = f.height(p.x, p.z) - 0.05 - rnd() * 0.25;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x + p.nx * 0.04, y, p.z + p.nz * 0.04), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6.28, 0)), new THREE.Vector3(1, 0.7 + rnd() * 0.8, 1));
    mats[Math.floor(rnd() * variants.length)]!.push(m);
  }
  variants.forEach((g, v) => {
    if (!mats[v]!.length) return;
    const im = new THREE.InstancedMesh(g, mat, mats[v]!.length);
    mats[v]!.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = false;
    group.add(im);
  });
  return group;
}
