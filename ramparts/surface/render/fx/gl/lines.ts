// Immediate-mode thick segments with round caps (capsule SDF in screen space): lightning,
// beams, ribbon trails, ropes and dotted routes. Width is in world units with a css-px floor.
import * as THREE from "../../../vendor/three.js";
import { dyn, flush, fxMaterial, OUT } from "./common.ts";

const VS = /* glsl */ `
  attribute vec3 iA; attribute vec3 iB; attribute vec4 iW; attribute vec4 iCa; attribute vec4 iCb;
  uniform vec2 uPx; uniform float uUi;
  varying vec2 vQ; varying float vLen; varying float vHw; varying vec4 vCol; varying float vSoft; varying float vK;
  void main() {
    vec4 ca = projectionMatrix * viewMatrix * vec4(iA, 1.0);
    vec4 cb = projectionMatrix * viewMatrix * vec4(iB, 1.0);
    if (ca.w < 0.05 || cb.w < 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec2 toPx = 1.0 / uPx;                          // clip-ndc -> css px (half extent)
    vec2 sa = ca.xy / ca.w * toPx, sb = cb.xy / cb.w * toPx;
    float t = position.x + 0.5;                      // 0 at A, 1 at B
    float wa = max(iW.x * projectionMatrix[1][1] / ca.w / uPx.y, iW.y * uUi);
    float wb = max(iW.x * projectionMatrix[1][1] / cb.w / uPx.y, iW.y * uUi);
    float hw = mix(wa, wb, t) * 0.5;
    vec2 d = sb - sa; float L = length(d); vec2 dir = L > 1e-4 ? d / L : vec2(1.0, 0.0); vec2 nrm = vec2(-dir.y, dir.x);
    float along = mix(-hw, L + hw, t);
    float across = position.y * 2.0 * hw;
    vec2 sp = sa + dir * along + nrm * across;
    vec4 c = mix(ca, cb, t);
    gl_Position = vec4(sp / toPx * c.w, c.z, c.w);
    vQ = vec2(along, across); vLen = L; vHw = hw; vCol = mix(iCa, iCb, t); vSoft = iW.z; vK = iW.w;
  }
`;
const FS = /* glsl */ `
  varying vec2 vQ; varying float vLen; varying float vHw; varying vec4 vCol; varying float vSoft; varying float vK;
  void main() {
    float dx = vQ.x < 0.0 ? -vQ.x : max(0.0, vQ.x - vLen);
    float d = length(vec2(dx, vQ.y)) / max(vHw, 1e-3);
    float a = vCol.a * (1.0 - smoothstep(1.0 - max(vSoft, 0.25 / vHw), 1.0, d));
    if (a < 0.003) discard;
    vec3 col = vCol.rgb;
    float k = vK;
    ${OUT}
  }
`;

export class Lines {
  readonly mesh: THREE.Mesh;
  private geo: THREE.InstancedBufferGeometry;
  private at: THREE.InstancedBufferAttribute[];
  private A: Float32Array; private B: Float32Array; private W: Float32Array; private Ca: Float32Array; private Cb: Float32Array;
  n = 0;
  constructor(readonly cap: number, order: number, depthTest = true) {
    const g = new THREE.InstancedBufferGeometry();
    const q = new THREE.PlaneGeometry(1, 1);
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const a = dyn(g, "iA", 3, cap), b = dyn(g, "iB", 3, cap), w = dyn(g, "iW", 4, cap), ca = dyn(g, "iCa", 4, cap), cb = dyn(g, "iCb", 4, cap);
    this.at = [a, b, w, ca, cb];
    this.A = a.array as Float32Array; this.B = b.array as Float32Array; this.W = w.array as Float32Array;
    this.Ca = ca.array as Float32Array; this.Cb = cb.array as Float32Array;
    g.instanceCount = 0;
    this.geo = g;
    this.mesh = new THREE.Mesh(g, fxMaterial({ vs: VS, fs: FS, order, depthTest }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
    this.mesh.name = "fx-lines";
  }
  begin(): void { this.n = 0; }
  /** World-space segment; `w` world width, `minPx` css-px floor, `soft` 0 hard .. 1 all soft, `k` blend. */
  seg(ax: number, ay: number, az: number, bx: number, by: number, bz: number, w: number, minPx: number, soft: number, k: number,
      r: number, g: number, b: number, a: number, a2 = a, r2 = r, g2 = g, b2 = b): void {
    const i = this.n;
    if (i >= this.cap) return;
    this.n++;
    const A = this.A, B = this.B, W = this.W, Ca = this.Ca, Cb = this.Cb;
    A[i * 3] = ax; A[i * 3 + 1] = ay; A[i * 3 + 2] = az;
    B[i * 3] = bx; B[i * 3 + 1] = by; B[i * 3 + 2] = bz;
    W[i * 4] = w; W[i * 4 + 1] = minPx; W[i * 4 + 2] = soft; W[i * 4 + 3] = k;
    Ca[i * 4] = r; Ca[i * 4 + 1] = g; Ca[i * 4 + 2] = b; Ca[i * 4 + 3] = a;
    Cb[i * 4] = r2; Cb[i * 4 + 1] = g2; Cb[i * 4 + 2] = b2; Cb[i * 4 + 3] = a2;
  }
  end(): void {
    this.geo.instanceCount = this.n;
    flush(this.at, this.n);
  }
}
