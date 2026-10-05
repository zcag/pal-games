// Water per act (art 2.x): pools (water, oasis, frozen lake, lava), a stream carved to the slab edge,
// and the waterfall pouring off it (the off-play-area "awe" detail, art 1.1), with mist below.
import * as THREE from "../../vendor/three.js";
import type { Look } from "../palette.ts";
import { Field, ROAD_EDGE, ROAD_HALF } from "./field.ts";
import type { perimeter } from "./terrain.ts";

const MODE = { water: 0, oasis: 0, ice: 1, lava: 2 } as const;

const VS = /* glsl */ `
attribute float aFlow; varying vec3 vW; varying vec2 vUv; varying float vFlow;
void main() { vUv = uv; vFlow = aFlow; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const FS = /* glsl */ `
uniform vec3 deep, shallow, foam, sky, fogCol; uniform float time, mode, fall; uniform vec4 pools[4]; uniform int nPools;
varying vec3 vW; varying vec2 vUv; varying float vFlow;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec3 c;
  if (fall > 0.5) {
    // the falling ribbon: streaks scrolling down, foam at the lip, fading into mist
    float v = vUv.y, u = vUv.x;
    float s = n(vec2(u * 9.0, v * 3.0 - time * (mode > 1.5 ? 0.35 : 1.6))) * 0.6 + n(vec2(u * 23.0, v * 7.0 - time * (mode > 1.5 ? 0.6 : 2.6))) * 0.4;
    if (mode < 0.5) {
      c = mix(shallow, foam, smoothstep(0.45, 0.8, s) * 0.85);
      c = mix(c, foam, smoothstep(0.12, 0.0, v) * 0.7);
    } else if (mode < 1.5) {
      c = mix(shallow * 1.05, foam, smoothstep(0.55, 0.9, s) * 0.5);
      float trickle = smoothstep(0.08, 0.0, abs(u - 0.5 - sin(v * 6.0) * 0.05));
      c = mix(c, vec3(0.75, 0.85, 0.9), trickle * (0.4 + 0.4 * n(vec2(v * 20.0 - time * 3.0, 1.0))));
    } else {
      c = mix(shallow, foam * 2.2, smoothstep(0.35, 0.85, s));
    }
    float edge = smoothstep(0.0, 0.12, u) * smoothstep(1.0, 0.88, u);
    float a = edge * smoothstep(1.0, 0.65, v);
    c = mix(c, fogCol, smoothstep(0.25, 1.0, v) * 0.7);
    gl_FragColor = vec4(c, a * 0.95);
    return;
  }
  // pools and streams
  float depth = 0.0, rim = 0.0;
  for (int i = 0; i < 4; i++) {
    if (i >= nPools) break;
    vec4 p = pools[i];
    float d = length(vW.xz - p.xy) / p.z;
    depth = max(depth, 1.0 - smoothstep(0.25, 1.0, d));
    rim = max(rim, smoothstep(0.82, 0.96, d) * (1.0 - smoothstep(0.98, 1.08, d)));
  }
  if (vFlow > 0.0) { depth = max(depth, 0.35 * (1.0 - abs(vUv.x - 0.5) * 2.0)); rim = max(rim, smoothstep(0.3, 0.48, abs(vUv.x - 0.5))); }
  vec2 q = vW.xz;
  if (vFlow > 0.0) q = vec2(vUv.x * 2.0, vUv.y - time * 0.6);
  float r1 = n(q * 2.2 + vec2(time * 0.08, time * 0.05)), r2 = n(q * 4.7 - vec2(time * 0.06, -time * 0.09));
  float rip = r1 * 0.6 + r2 * 0.4;
  if (mode < 0.5) {
    c = mix(shallow, deep * 0.8, pow(depth, 0.7));
    c = mix(c, sky, 0.12 + 0.12 * smoothstep(0.55, 0.8, rip));
    c += vec3(1.0, 0.97, 0.9) * smoothstep(0.82, 0.9, n(q * 9.0 + time * 0.3)) * 0.35;
    float pulse = 0.6 + 0.4 * sin(time * 1.6 + rip * 4.0);
    float lace = smoothstep(0.35, 0.75, n(q * 6.0 + time * 0.2));
    c = mix(c, foam, rim * (0.55 + 0.45 * lace) * pulse);
  } else if (mode < 1.5) {
    // frozen lake: pale ice with crack lines, a darker core
    c = mix(shallow, deep, depth * 0.45);
    vec2 g = q * 1.6; vec2 i = floor(g), f = fract(g);
    float m = 8.0, m2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 o = vec2(float(x), float(y)); vec2 pt = o + vec2(h(i + o), h(i + o + 9.1)) - f; float dd = length(pt); if (dd < m) { m2 = m; m = dd; } else if (dd < m2) m2 = dd; }
    c = mix(c, foam, (1.0 - smoothstep(0.0, 0.05, m2 - m)) * 0.7);
    c = mix(c, foam, rim * 0.6);
    c += vec3(0.9, 0.95, 1.0) * smoothstep(0.86, 0.92, n(q * 11.0)) * 0.15;
  } else {
    // lava: two scrolling noise layers, a dark crust that cracks open in pulses
    float flow = n(q * 1.3 + vec2(time * 0.05, time * 0.03)) * 0.6 + n(q * 3.1 - vec2(time * 0.04, 0.0)) * 0.4;
    float crust = smoothstep(0.42, 0.62, flow + 0.12 * sin(time * 2.1 + q.x));
    c = mix(foam * 1.5, shallow * 1.1, crust);
    c = mix(c, deep, smoothstep(0.65, 0.9, flow) * 0.85);
    c = mix(c, deep * 0.8, rim * 0.8);
  }
  gl_FragColor = vec4(c, 1.0);
}`;

export function water(f: Field, look: Look, per: ReturnType<typeof perimeter>, rnd: () => number) {
  const group = new THREE.Group();
  const mode = MODE[look.water.kind];
  const pools = f.pools.slice(0, 4);
  const u = {
    deep: { value: new THREE.Color(look.water.deep) }, shallow: { value: new THREE.Color(look.water.shallow) }, foam: { value: new THREE.Color(look.water.foam) },
    sky: { value: new THREE.Color(look.skyTop) }, fogCol: { value: new THREE.Color(look.fog) },
    time: { value: 0 }, mode: { value: mode }, fall: { value: 0 },
    pools: { value: [0, 1, 2, 3].map((i) => (pools[i] ? new THREE.Vector4(pools[i]!.x, pools[i]!.z, pools[i]!.r, 0) : new THREE.Vector4(999, 999, 1, 0))) },
    nPools: { value: pools.length },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS });
  if (mode === 2) for (const p of pools) { group.add(lavaPool(p.r, rnd).translateX(p.x).translateZ(p.z)); group.add(embers(p.x, p.z, p.r, rnd)); }
  for (const p of mode === 2 ? [] : pools) {
    const g = new THREE.CircleGeometry(p.r + 0.45, 28);
    g.rotateX(-Math.PI / 2);
    g.setAttribute("aFlow", new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count), 1));
    const m = new THREE.Mesh(g, mat);
    m.position.set(p.x, -0.1, p.z);
    m.receiveShadow = false;
    group.add(m);
  }
  // the stream to the edge and its fall (planned before the ground was built: f.stream)
  const s = f.stream;
  if (s) {
    const pts = s.pts;
    const pos: number[] = [], uv: number[] = [], flow: number[] = [];
    let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)]!, b = pts[Math.min(pts.length - 1, i + 1)]!;
      const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l;
      if (i > 0) acc += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.z - pts[i - 1]!.z);
      const wdt = s.w / 2 + 0.12;
      pos.push(pts[i]!.x + nx * wdt, -0.12, pts[i]!.z + nz * wdt, pts[i]!.x - nx * wdt, -0.12, pts[i]!.z - nz * wdt);
      uv.push(0, acc, 1, acc); flow.push(1, 1);
    }
    const idx: number[] = [];
    for (let i = 0; i + 1 < pts.length; i++) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("aFlow", new THREE.Float32BufferAttribute(flow, 1));
    g.setIndex(idx);
    group.add(new THREE.Mesh(g, mat));
    // the fall: a ribbon curving out over the lip and down into the fog
    const end = pts[pts.length - 1]!;
    const N = s.n;
    const fu = { ...u, fall: { value: 1 } };
    const fmat = new THREE.ShaderMaterial({ uniforms: fu, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const prof: [number, number][] = [[0, -0.12], [0.18, -0.2], [0.38, -0.55], [0.55, -1.3], [0.66, -2.6], [0.72, -4.2], [0.76, -6], [0.78, -8]];
    const fp: number[] = [], fuv: number[] = [], ff: number[] = [], fi: number[] = [];
    const tx = -N.z, tz = N.x, half = s.w / 2 + 0.05;
    prof.forEach(([o, y], i) => {
      const spread = half * (1 + i * 0.06);
      const cx = end.x + N.x * o, cz = end.z + N.z * o;
      fp.push(cx + tx * spread, y, cz + tz * spread, cx - tx * spread, y, cz - tz * spread);
      const v = i / (prof.length - 1);
      fuv.push(0, v, 1, v); ff.push(0, 0);
      if (i) { const k = (i - 1) * 2; fi.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    });
    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
    fg.setAttribute("uv", new THREE.Float32BufferAttribute(fuv, 2));
    fg.setAttribute("aFlow", new THREE.Float32BufferAttribute(ff, 1));
    fg.setIndex(fi);
    const fall = new THREE.Mesh(fg, fmat);
    fall.renderOrder = 5;
    group.add(fall);
    // mist: soft puffs where it dissolves
    if (false as boolean) group.add(mist(end.x + N.x * 0.75, -3.5, end.z + N.z * 0.75, mode === 2 ? "#FF9A50" : "#F4F6F2", mode === 2, rnd));
    u.fall = u.fall; // shared uniforms (time) are copied by reference below
    fu.time = u.time;
  }
  void per; void ROAD_HALF; void ROAD_EDGE;
  return { group, update: (t: number) => { u.time.value = t; } };
}

function mist(x: number, y: number, z: number, color: string, additive: boolean, rnd: () => number) {
  const N = 26;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos.set([x + (rnd() - 0.5) * 1.2, y - rnd() * 3, z + (rnd() - 0.5) * 1.2], i * 3); seed[i] = rnd(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { col: { value: new THREE.Color(color) }, time: { value: 0 }, px: { value: 400 } },
    vertexShader: `attribute float aSeed; uniform float time, px; varying float vA;
      void main() { vec3 p = position; float t = fract(time * 0.12 + aSeed); p.y += t * 1.4; p.x += sin(aSeed * 40.0 + time) * 0.2;
        vA = sin(t * 3.1416) * 0.45; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = px * (0.5 + aSeed) / -mv.z; }`,
    fragmentShader: `uniform vec3 col; varying float vA; void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(col, vA * smoothstep(0.5, 0.0, d)); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  pts.name = "mist";
  pts.onBeforeRender = (r) => { m.uniforms.time!.value = performance.now() / 1000; m.uniforms.px!.value = r.getDrawingBufferSize(new THREE.Vector2()).y * 1.6; };
  return pts;
}

/** Choose where the stream runs off the edge (before the ground is built, so it can be carved). */
export function planStream(f: Field) {
  if (!f.pools.length) return;
  let best: { pts: { x: number; z: number }[]; w: number; n: { x: number; z: number }; score: number } | null = null;
  for (const p of f.pools) {
    // try the four outward directions plus diagonals
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const dx = Math.cos(a), dz = Math.sin(a);
      const pts: { x: number; z: number }[] = [];
      let ok = true, len = 0;
      let x = p.x + dx * p.r * 0.7, z = p.z + dz * p.r * 0.7;
      for (let i = 0; i < 60; i++) {
        pts.push({ x, z });
        if (f.sdf(x, z) > -0.05) break;
        const c = f.dRoad(x, z) - ROAD_HALF - ROAD_EDGE;
        if (c < 1.0 || f.dPad(x, z) < 1.6) { ok = false; break; }
        x += dx * 0.3; z += dz * 0.3; len += 0.3;
      }
      if (!ok || f.sdf(x, z) < -0.05) continue;
      // a slight meander
      pts.forEach((q, i) => { const s = Math.sin(i * 0.7) * 0.12 * Math.min(1, i / 3); q.x += -dz * s; q.z += dx * s; });
      const last = pts[pts.length - 1]!;
      // outward normal at the exit
      const e = 0.05, gx = f.sdf(last.x + e, last.z) - f.sdf(last.x - e, last.z), gz = f.sdf(last.x, last.z + e) - f.sdf(last.x, last.z - e);
      const gl = Math.hypot(gx, gz) || 1;
      // prefer streams that fall off the sides or the front, where the fall can be seen
      if (gz / gl < -0.4) continue; // never off the back edge: the fall would be hidden behind the slab
      const score = len + (gz / gl > 0.5 ? -2 : 0) + (Math.abs(gx / gl) > 0.5 ? -1 : 0);
      if (!best || score < best.score) best = { pts, w: 0.6, n: { x: gx / gl, z: gz / gl }, score };
    }
  }
  if (best) f.stream = { pts: best.pts, w: best.w, n: best.n };
}

/** Lava as a faceted low-poly pool: a yellow-hot core to a red rim, dark crust plates drifting on it. */
function lavaPool(r: number, rnd: () => number) {
  const rings = [0, 0.35, 0.7, 1.0, 1.2];
  const seg = 18;
  const P: THREE.Vector3[][] = rings.map((k, ri) => Array.from({ length: ri ? seg : 1 }, (_, i) => {
    const a = (i / seg) * Math.PI * 2 + ri * 0.17;
    const j = ri ? 1 + (rnd() - 0.5) * 0.18 : 0;
    return new THREE.Vector3(Math.cos(a) * k * r * j, -0.08 + (ri === rings.length - 1 ? 0.06 : (rnd() - 0.5) * 0.04), Math.sin(a) * k * r * j);
  }));
  const pos: number[] = [], heat: number[] = [];
  const cols = (ri: number) => 1 - ri / (rings.length - 1);
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, h: number) => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); const crust = rnd() < 0.18 ? -1 : 1; for (let k = 0; k < 3; k++) heat.push(h * crust); };
  for (let ri = 1; ri < rings.length; ri++) for (let i = 0; i < seg; i++) {
    const i2 = (i + 1) % seg;
    const o = P[ri]!, inner = P[ri - 1]!;
    const h = (cols(ri) + cols(ri - 1)) / 2;
    if (ri === 1) tri(inner[0]!, o[i2]!, o[i]!, h);
    else { tri(inner[i]!, inner[i2]!, o[i]!, h); tri(inner[i2]!, o[i2]!, o[i]!, h * 0.92); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aHeat", new THREE.Float32BufferAttribute(heat, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `attribute float aHeat; varying float vHeat; varying vec3 vW; void main() { vHeat = aHeat; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform float time; varying float vHeat; varying vec3 vW;
      void main() {
        float h = abs(vHeat);
        float pulse = 0.85 + 0.15 * sin(time * 1.8 + vW.x * 2.1 + vW.z * 1.7);
        vec3 c = mix(vec3(0.75, 0.12, 0.04), vec3(1.0, 0.5, 0.1), smoothstep(0.1, 0.6, h));
        c = mix(c, vec3(1.0, 0.85, 0.4), smoothstep(0.6, 1.0, h));
        c *= (0.9 + h * 1.3) * pulse;
        if (vHeat < 0.0) c = vec3(0.09, 0.05, 0.05) + c * 0.06;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.onBeforeRender = () => { m.uniforms.time!.value = performance.now() / 1000; };
  mesh.name = "lava";
  return mesh;
}

/** A column of embers rising off a lava pool (additive points). */
function embers(x: number, z: number, r: number, rnd: () => number) {
  const N = 28;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { const a = rnd() * 6.28, d = rnd() * r * 0.8; pos.set([x + Math.cos(a) * d, 0, z + Math.sin(a) * d], i * 3); seed[i] = rnd(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, px: { value: 400 } },
    vertexShader: `attribute float aSeed; uniform float time, px; varying float vA;
      void main() { vec3 p = position; float t = fract(time * 0.25 + aSeed); p.y += t * 3.2; p.x += sin(aSeed * 40.0 + time * 2.0) * 0.15 * t;
        vA = (1.0 - t) * (0.6 + 0.4 * sin(time * 9.0 + aSeed * 50.0)); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(1.5, px * 0.06 / -mv.z); }`,
    fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.55, 0.18) * 2.0, vA * smoothstep(0.5, 0.1, d)); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  const size = new THREE.Vector2();
  pts.onBeforeRender = (rend, _s, cam) => { m.uniforms.time!.value = performance.now() / 1000; rend.getDrawingBufferSize(size); m.uniforms.px!.value = size.y / (2 * Math.tan(((cam as THREE.PerspectiveCamera).fov * Math.PI) / 360)); };
  return pts;
}
