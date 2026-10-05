// Immediate-mode ground decals: flat quads on the ground, every shape procedural in one
// fragment shader. Drawn first among the fx (after the opaque world and units, depth-tested,
// so any unit standing on a decal covers it: rings, puddles and telegraphs never sit on a unit).
import * as THREE from "../../../vendor/three.js";
import { dyn, flush, fxMaterial, OUT } from "./common.ts";

export const D = {
  SOFT: 0, RING: 1, SCORCH: 2, OIL: 3, ACID: 4, FIRE: 5, TELE: 6, CONE: 7, STRIPE: 8, FROST: 9, SIGIL: 10,
  CRATER: 11, TAR: 12, BRAMBLE: 13, CRACK: 14, WAVE: 15, RETICLE: 16, GOUGE: 17, BARRIER: 18, HEAL: 19,
} as const;

const VS = /* glsl */ `
  attribute vec3 iPos; attribute vec2 iSize; attribute vec4 iMisc; attribute vec4 iP; attribute vec4 iCol; attribute vec4 iCol2;
  varying vec2 vP; varying vec2 vSize; varying vec4 vMisc; varying vec4 vPar; varying vec4 vCol; varying vec4 vCol2;
  void main() {
    float c = cos(iMisc.x), s = sin(iMisc.x);
    vec2 q = position.xy * 2.0 * iSize;            // local, in u
    vec2 w = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
    gl_Position = projectionMatrix * viewMatrix * vec4(iPos.x + w.x, iPos.y, iPos.z + w.y, 1.0);
    vP = q; vSize = iSize; vMisc = iMisc; vPar = iP; vCol = iCol; vCol2 = iCol2;
  }
`;

const FS = /* glsl */ `
  uniform float uTime;
  varying vec2 vP; varying vec2 vSize; varying vec4 vMisc; varying vec4 vPar; varying vec4 vCol; varying vec4 vCol2;
  float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { return vnoise(p) * 0.55 + vnoise(p * 2.1 + 3.1) * 0.3 + vnoise(p * 4.3 + 7.7) * 0.15; }
  float angN(float a, float seed) {
    return sin(a * 3.0 + seed) * 0.5 + sin(a * 5.0 + seed * 2.3) * 0.3 + sin(a * 9.0 + seed * 4.1) * 0.2;
  }
  float aaw(float d, float w) { float f = fwidth(d) * 0.8; return 1.0 - smoothstep(w - f, w + f, abs(d)); }
  vec3 film(float t) { return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67))); }

  void main() {
    float shape = vMisc.y, k = vMisc.z, seed = vMisc.w;
    vec2 p = vP; float R = vSize.x; float r = length(p); float ang = atan(p.y, p.x);
    vec3 col = vCol.rgb; float a = 0.0;
    if (shape < 0.5) { // SOFT
      float e = vPar.x > 0.0 ? vPar.x : 1.5;
      a = vCol.a * pow(max(0.0, 1.0 - r / R), e);
    } else if (shape < 1.5) { // RING: line, dashes / ticks / dots, accent fill + inner glow
      float lw = max(vPar.x, fwidth(r) * 1.6) * 0.5;
      float line = aaw(r - R + lw, lw);
      float n = vPar.y;
      if (n > 0.0) {
        float u = fract((ang + vPar.z) / 6.2832 * n);
        if (vPar.w < 0.5) line *= smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.5, 0.56, u));
        else if (vPar.w < 1.5) { line *= 1.0 - smoothstep(0.18, 0.24, u); line = max(line * aaw(r - R + lw * 3.0, lw * 3.0), 0.0); }
        else { float d = length(vec2((u - 0.5) * 6.2832 * R / n, r - R + lw)); line = 1.0 - smoothstep(lw * 1.2 - fwidth(d), lw * 1.2 + fwidth(d), d); }
      }
      float inside = 1.0 - smoothstep(R - fwidth(r), R, r);
      float glow = smoothstep(R - 0.4, R, r) * inside;
      float fa = vCol2.a * (1.0 + glow * 1.25) * inside;
      a = max(line * vCol.a, fa);
      col = mix(vCol2.rgb, vCol.rgb, line * vCol.a / max(a, 1e-3));
    } else if (shape < 2.5) { // SCORCH
      float edge = R * (0.78 + 0.18 * angN(ang, seed));
      a = vCol.a * (1.0 - smoothstep(edge * 0.35, edge, r)) * (0.65 + 0.35 * fbm(p * 2.5 + seed));
    } else if (shape < 3.5 || (shape > 11.5 && shape < 12.5)) { // OIL / TAR: glossy dark puddle
      float edge = R * (0.82 + 0.14 * angN(ang, seed));
      float body = 1.0 - smoothstep(edge - 0.08, edge, r);
      float n = fbm(p * 1.8 + seed);
      vec3 base = vCol.rgb * (0.8 + 0.5 * n);
      float spec = pow(max(0.0, 1.0 - length((p - vec2(-0.3, -0.25) * R) * vec2(1.0, 2.2)) / (R * 0.45)), 3.0);
      if (shape < 3.5) {
        float sheen = smoothstep(0.35, 0.7, n) * (1.0 - smoothstep(0.7, 0.95, n));
        base += film(n * 2.2 + r * 0.6 + uTime * 0.04) * sheen * 0.2;
      } else {
        float bub = smoothstep(0.92, 0.97, vnoise(p * 4.0 + vec2(0.0, uTime * 0.6)));
        base += vec3(0.05, 0.04, 0.03) * bub;
      }
      base += vec3(0.5) * spec * 0.6;
      col = base; a = vCol.a * body;
    } else if (shape < 4.5) { // ACID
      float edge = R * (0.82 + 0.14 * angN(ang, seed));
      float body = 1.0 - smoothstep(edge - 0.1, edge, r);
      vec2 g = p * 3.2; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
      float ph = fract(uTime * 0.6 + h1(id + seed));
      float bub = (1.0 - smoothstep(0.02, 0.06, abs(length(f) - ph * 0.35))) * (1.0 - ph) * step(0.45, h1(id * 1.7));
      col = vCol.rgb * (0.75 + 0.4 * fbm(p * 2.0 + uTime * 0.2)) + vCol2.rgb * bub;
      a = vCol.a * body * (0.85 + bub * 0.4) * (0.7 + 0.3 * smoothstep(edge * 0.7, edge, r));
    } else if (shape < 5.5) { // FIRE patch: char base + glowing cracks (vCol2 = ember colour * intensity)
      float edge = R * (0.8 + 0.16 * angN(ang, seed));
      float body = 1.0 - smoothstep(edge - 0.15, edge, r);
      float n = fbm(p * 3.0 + seed + vec2(0.0, uTime * 0.3));
      float crack = smoothstep(0.42, 0.5, n) * (1.0 - smoothstep(0.5, 0.6, n));
      float flick = 0.75 + 0.25 * sin(uTime * 11.0 + n * 9.0);
      col = mix(vCol.rgb, vCol2.rgb, crack * flick);
      a = body * mix(vCol.a, 1.0, crack * flick * vPar.x);
      k = mix(k, 0.2, crack);
    } else if (shape < 6.5 || (shape > 6.5 && shape < 7.5)) { // TELE circle / CONE
      float prog = vPar.x, flash = vPar.y;
      float inside, edgeD, fillD;
      if (shape < 6.5) { inside = 1.0 - smoothstep(R - fwidth(r), R, r); edgeD = r - R + 0.05; fillD = abs(r - prog * R); }
      else {
        float half_ = vPar.z;
        float ad = abs(ang);
        float inAng = 1.0 - smoothstep(half_ - fwidth(ang), half_, ad);
        inside = inAng * (1.0 - smoothstep(R - fwidth(r), R, r));
        float side = r * sin(max(0.0, ad - half_) + 0.0) ;
        edgeD = min(abs(r - R + 0.05), abs(sin(ad - half_) * r)) ;
        if (ad > half_ + 0.3) edgeD = abs(r - R + 0.05) + 9.0;
        fillD = abs(r - prog * R);
      }
      float coneOk = shape < 6.5 ? 1.0 : step(-0.02, r * cos(abs(ang)));
      float line = aaw(edgeD, 0.05) * coneOk;
      float halo = aaw(edgeD, 0.11) * coneOk;          // dark border so the ring reads on snow and sand
      float inner = aaw(fillD, 0.035) * inside * step(0.02, prog);
      float fill = inside * (0.3 * prog + 0.6 * flash);
      float lit = max(line * 0.95, inner * 0.8);
      a = max(max(lit, halo * 0.45), fill) * vCol.a;
      col = mix(vec3(0.012, 0.008, 0.006), vCol.rgb * (1.0 + flash * 0.6), clamp(max(lit, fill) / max(a / max(vCol.a, 1e-3), 1e-3), 0.0, 1.0));
    } else if (shape < 8.5) { // STRIPE (line telegraph): x from -size.x to +size.x
      float L = vSize.x, Wd = vSize.y;
      float prog = vPar.x, flash = vPar.y;
      float ex = abs(p.x) - L + 0.05, ey = abs(p.y) - Wd + 0.05;
      float line = aaw(max(ex, ey), 0.05);
      float halo = aaw(max(ex, ey), 0.11);
      float t = (p.x + L) / (2.0 * L);
      float chev = step(0.5, fract((p.x - abs(p.y) * 0.8) * 1.2 - uTime * 1.5)) * 0.12;
      float inside = step(ex, 0.0) * step(ey, 0.0);
      float fill = inside * (step(t, prog) * 0.3 + chev * step(t, prog) + 0.6 * flash);
      float lit = max(line * 0.95, fill);
      a = max(lit, halo * 0.45) * vCol.a;
      col = mix(vec3(0.012, 0.008, 0.006), vCol.rgb * (1.0 + flash * 0.6), clamp(lit / max(a / max(vCol.a, 1e-3), 1e-3), 0.0, 1.0));
    } else if (shape < 9.5) { // FROST ring decal
      float edge = R * (0.86 + 0.1 * abs(angN(ang * 2.0, seed)));
      float body = 1.0 - smoothstep(edge - 0.05, edge, r);
      float spikes = pow(abs(sin(ang * 9.0 + seed)), 12.0) * smoothstep(R * 0.4, R, r);
      float ring = smoothstep(edge * 0.55, edge, r);
      col = mix(vCol2.rgb, vCol.rgb, ring + spikes);
      a = vCol.a * body * (0.25 + 0.75 * ring + spikes) * (0.75 + 0.25 * fbm(p * 5.0 + seed));
    } else if (shape < 10.5) { // SIGIL: two rings + rotating runes
      float prog = vPar.x, rot = vPar.z;
      float a1 = aaw(r - R * 0.95, 0.04), a2 = aaw(r - R * 0.72, 0.03);
      float aa = ang + rot;
      float seg = fract(aa / 6.2832 * 12.0);
      float runes = step(0.25, seg) * step(seg, 0.75) * aaw(r - R * 0.835, 0.045) * step(0.4, h1(vec2(floor(aa / 6.2832 * 12.0), seed)));
      float spokes = aaw(sin((ang - rot * 0.5) * 3.0) * r, 0.03) * step(r, R * 0.72);
      float draw = step((ang + 3.1416) / 6.2832, prog);
      a = vCol.a * max(max(a1, a2), max(runes, spokes * 0.6)) * draw;
    } else if (shape < 11.5) { // CRATER
      float edge = R * (0.85 + 0.12 * angN(ang, seed));
      float rim = smoothstep(edge * 0.6, edge * 0.85, r) * (1.0 - smoothstep(edge * 0.85, edge, r));
      float pit = 1.0 - smoothstep(0.0, edge * 0.8, r);
      col = mix(vCol.rgb, vCol2.rgb, rim);
      a = vCol.a * max(pit * 0.8, rim) * (0.7 + 0.3 * fbm(p * 3.0));
    } else if (shape < 13.5) { // BRAMBLE
      float edge = R * (0.82 + 0.15 * angN(ang, seed));
      float body = 1.0 - smoothstep(edge - 0.2, edge, r);
      float n = fbm(p * 2.6 + seed);
      float thorn = aaw(sin(p.x * 7.0 + n * 6.0) * cos(p.y * 6.0 - n * 5.0), 0.12);
      col = mix(vCol.rgb, vCol2.rgb, thorn);
      a = vCol.a * body * (0.55 + 0.45 * max(smoothstep(0.4, 0.6, n), thorn));
    } else if (shape < 14.5) { // CRACK
      float n = 0.0;
      for (int i = 0; i < 7; i++) {
        float aa = h1(vec2(float(i), seed)) * 6.2832;
        float wob = sin(r * 7.0 + float(i) * 3.0) * 0.12;
        float d = abs(sin(ang - aa + wob)) * r;
        n = max(n, aaw(d, 0.025 * (1.0 - r / R)) * step(r, R * (0.6 + 0.4 * h1(vec2(seed, float(i))))));
      }
      a = vCol.a * n;
    } else if (shape < 15.5) { // WAVE: soft shock ring (vPar.x thickness in u)
      float th = max(vPar.x, 0.05);
      float d = (R - r) / th;
      a = vCol.a * smoothstep(-0.05, 0.0, d) * (1.0 - smoothstep(0.0, 1.0, d)) * (d > 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 0.1, -d));
      a *= 0.75 + 0.25 * vnoise(vec2(ang * 6.0 + seed, r * 3.0));
    } else if (shape < 16.5) { // RETICLE
      float lw = max(0.05, fwidth(r) * 1.2);
      float u = fract((ang + vPar.z) / 6.2832 * 16.0);
      float ring = aaw(r - R + lw, lw) * step(0.3, u);
      float tick = aaw(min(abs(p.x), abs(p.y)), lw) * step(R * 0.55, r) * step(r, R * 0.85);
      float dot_ = 1.0 - smoothstep(0.06, 0.06 + fwidth(r), r);
      float inside = 1.0 - smoothstep(R - fwidth(r), R, r);
      float fill = vCol2.a * inside * (1.0 + smoothstep(R - 0.4, R, r) * 1.25);
      float line = max(max(ring, tick), dot_);
      a = max(line * vCol.a, fill);
      col = mix(vCol2.rgb, vCol.rgb, line * vCol.a / max(a, 1e-3));
    } else if (shape < 17.5) { // GOUGE (stripe, fades to the ends)
      float t = (p.x + vSize.x) / (2.0 * vSize.x);
      float w = vSize.y * (0.6 + 0.4 * fbm(vec2(p.x * 2.0, seed)));
      a = vCol.a * (1.0 - smoothstep(w * 0.4, w, abs(p.y))) * smoothstep(0.0, 0.15, t) * smoothstep(1.0, 0.7, t);
    } else if (shape < 18.5) { // BARRIER root wall footprint
      float n = fbm(vec2(p.x * 3.0, p.y * 6.0) + seed);
      float body = (1.0 - smoothstep(vSize.y * 0.6, vSize.y, abs(p.y) + n * 0.15)) * (1.0 - smoothstep(vSize.x - 0.2, vSize.x, abs(p.x)));
      col = mix(vCol.rgb, vCol2.rgb, smoothstep(0.45, 0.75, n));
      a = vCol.a * body;
    } else { // HEAL ring: soft ring; broken (vPar.y > 0) shows gaps that jitter
      float th = 0.12;
      float d = abs(r - R * 0.92);
      a = vCol.a * (1.0 - smoothstep(th * 0.3, th, d));
      if (vPar.y > 0.5) a *= step(0.45, fract(ang / 6.2832 * 7.0 + seed));
    }
    if (a < 0.003) discard;
    ${OUT}
  }
`;

export class Decals {
  readonly mesh: THREE.Mesh;
  private geo: THREE.InstancedBufferGeometry;
  private at: Record<string, THREE.InstancedBufferAttribute>;
  n = 0;
  constructor(readonly cap: number, order = 0, depthTest = true) {
    const g = new THREE.InstancedBufferGeometry();
    const q = new THREE.PlaneGeometry(1, 1);
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    this.at = { iPos: dyn(g, "iPos", 3, cap), iSize: dyn(g, "iSize", 2, cap), iMisc: dyn(g, "iMisc", 4, cap), iP: dyn(g, "iP", 4, cap), iCol: dyn(g, "iCol", 4, cap), iCol2: dyn(g, "iCol2", 4, cap) };
    g.instanceCount = 0;
    this.geo = g;
    const m = fxMaterial({ vs: VS, fs: FS, order, depthTest });
    m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4;
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
    this.mesh.name = "fx-decals";
  }
  begin(): void { this.n = 0; }
  /**
   * A ground decal at (x, z) game coords already in world space. `rx`, `rz` half extents in u
   * (rings: rx = radius). Colours linear rgb (x intensity); `k` 0 additive .. 1 normal.
   */
  add(x: number, y: number, z: number, rx: number, rz: number, shape: number, rot: number,
      r: number, g: number, b: number, a: number, k = 1,
      p0 = 0, p1 = 0, p2 = 0, p3 = 0,
      r2 = 0, g2 = 0, b2 = 0, a2 = 0, seed = 0): number {
    const i = this.n;
    if (i >= this.cap) return -1;
    this.n++;
    const A = this.at;
    const P = A.iPos.array as Float32Array, S = A.iSize.array as Float32Array, M = A.iMisc.array as Float32Array;
    const Q = A.iP.array as Float32Array, C1 = A.iCol.array as Float32Array, C2 = A.iCol2.array as Float32Array;
    P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
    S[i * 2] = rx; S[i * 2 + 1] = rz;
    M[i * 4] = rot; M[i * 4 + 1] = shape; M[i * 4 + 2] = k; M[i * 4 + 3] = seed;
    Q[i * 4] = p0; Q[i * 4 + 1] = p1; Q[i * 4 + 2] = p2; Q[i * 4 + 3] = p3;
    C1[i * 4] = r; C1[i * 4 + 1] = g; C1[i * 4 + 2] = b; C1[i * 4 + 3] = a;
    C2[i * 4] = r2; C2[i * 4 + 1] = g2; C2[i * 4 + 2] = b2; C2[i * 4 + 3] = a2;
    return i;
  }
  end(): void {
    this.geo.instanceCount = this.n;
    flush(Object.values(this.at), this.n);
  }
}
