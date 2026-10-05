// Immediate-mode billboard batch: every frame the fx systems push sprites, `end()` uploads.
// One draw call per batch. A sprite is world-sized or css-px sized, may be stretched along a
// world axis (streaks, bolts), and blends anywhere between additive (k 0) and normal (k 1).
// `push` > 0 moves the depth (not the image) that far away from the camera, so smoke and dust
// sit *behind* any unit standing near them (art rule 3: effects live behind units). A negative
// push pulls the depth forward: status treatments and hit sparks draw over their own body.
import * as THREE from "../../../vendor/three.js";
import { atlas, ATLAS_GLSL, BAKED } from "./atlas.ts";
import { dyn, flush, fxMaterial, OUT } from "./common.ts";

export const PX = 1, BAKE = 2;

const VS = /* glsl */ `
  attribute vec3 iPos; attribute vec2 iSize; attribute vec4 iMisc; attribute vec4 iCol; attribute vec3 iCol2; attribute vec3 iAxis;
  uniform vec2 uPx; uniform float uPush; uniform float uUi;
  varying vec2 vUv; varying vec4 vCol; varying vec3 vCol2; varying float vCell; varying float vBake; varying float vK;
  void main() {
    vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
    float flags = iMisc.z;
    bool px = mod(flags, 2.0) >= 1.0;
    vBake = mod(floor(flags / 2.0), 2.0);
    float c = cos(iMisc.x), s = sin(iMisc.x);
    vec2 q = position.xy * iSize;
    vec2 off;
    if (dot(iAxis, iAxis) > 0.0) {
      vec2 ax = (viewMatrix * vec4(iAxis, 0.0)).xy;
      float l = length(ax);
      ax = l > 1e-5 ? ax / l : vec2(1.0, 0.0);
      off = ax * q.x + vec2(-ax.y, ax.x) * q.y;
    } else off = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
    vec4 clip;
    if (px) { clip = projectionMatrix * mv; clip.xy += off * uUi * uPx * clip.w; }
    else clip = projectionMatrix * (mv + vec4(off, 0.0, 0.0));
    if (uPush != 0.0) {
      vec4 pc = projectionMatrix * vec4(mv.xyz + vec3(0.0, 0.0, -uPush), 1.0);
      clip.z = pc.z / pc.w * clip.w;
    }
    gl_Position = clip;
    vUv = position.xy + 0.5; vCol = iCol; vCol2 = iCol2; vCell = iMisc.y; vK = iMisc.w;
  }
`;
const FS = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv; varying vec4 vCol; varying vec3 vCol2; varying float vCell; varying float vBake; varying float vK;
  ${ATLAS_GLSL}
  void main() {
    vec4 t = texture2D(uMap, cellUv(vCell, vUv));
    vec3 col = vBake > 0.5 ? pow(t.rgb, vec3(2.2)) * vCol.rgb : mix(vCol2, vCol.rgb, t.r);
    float a = t.a * vCol.a;
    if (a < 0.003) discard;
    float k = vK;
    ${OUT}
  }
`;

export class Sprites {
  readonly mesh: THREE.Mesh;
  private pos: THREE.InstancedBufferAttribute; private size: THREE.InstancedBufferAttribute; private misc: THREE.InstancedBufferAttribute;
  private col: THREE.InstancedBufferAttribute; private col2: THREE.InstancedBufferAttribute; private axis: THREE.InstancedBufferAttribute;
  private geo: THREE.InstancedBufferGeometry;
  n = 0;
  constructor(readonly cap: number, o: { order: number; push?: number; depthTest?: boolean }) {
    const g = new THREE.InstancedBufferGeometry();
    const q = new THREE.PlaneGeometry(1, 1);
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    this.pos = dyn(g, "iPos", 3, cap); this.size = dyn(g, "iSize", 2, cap); this.misc = dyn(g, "iMisc", 4, cap);
    this.col = dyn(g, "iCol", 4, cap); this.col2 = dyn(g, "iCol2", 3, cap); this.axis = dyn(g, "iAxis", 3, cap);
    g.instanceCount = 0;
    this.geo = g;
    const m = fxMaterial({ vs: VS, fs: FS, order: o.order, depthTest: o.depthTest, uniforms: { uMap: { value: atlas() }, uPush: { value: o.push ?? 0 } } });
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = o.order;
    this.mesh.name = "fx-sprites";
  }
  begin(): void { this.n = 0; }
  /** Returns the slot, or -1 when full. Colours are linear rgb times intensity (>1 blooms). */
  add(x: number, y: number, z: number, w: number, h: number, cell: number,
      r: number, g: number, b: number, a: number, k = 0, rot = 0, flags = 0,
      r2 = r, g2 = g, b2 = b): number {
    const i = this.n;
    if (i >= this.cap) return -1;
    this.n++;
    const P = this.pos.array as Float32Array, S = this.size.array as Float32Array, M = this.misc.array as Float32Array;
    const Co = this.col.array as Float32Array, C2 = this.col2.array as Float32Array, A = this.axis.array as Float32Array;
    P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
    S[i * 2] = w; S[i * 2 + 1] = h;
    M[i * 4] = rot; M[i * 4 + 1] = cell; M[i * 4 + 2] = flags | (BAKED[cell] ? BAKE : 0); M[i * 4 + 3] = k;
    Co[i * 4] = r; Co[i * 4 + 1] = g; Co[i * 4 + 2] = b; Co[i * 4 + 3] = a;
    C2[i * 3] = r2; C2[i * 3 + 1] = g2; C2[i * 3 + 2] = b2;
    A[i * 3] = 0; A[i * 3 + 1] = 0; A[i * 3 + 2] = 0;
    return i;
  }
  /** Stretch the last-added sprite along a world direction (its width runs along it). */
  axisOf(i: number, ax: number, ay: number, az: number): void {
    if (i < 0) return;
    const A = this.axis.array as Float32Array;
    A[i * 3] = ax; A[i * 3 + 1] = ay; A[i * 3 + 2] = az;
  }
  end(): void {
    this.geo.instanceCount = this.n;
    flush([this.pos, this.size, this.misc, this.col, this.col2, this.axis], this.n);
  }
}
