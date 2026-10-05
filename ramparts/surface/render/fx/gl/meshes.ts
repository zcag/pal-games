// Immediate-mode instanced 3D meshes for things that need volume: ice shells, shield bubbles,
// projectile bodies, kill chunks, coins. Simple wrapped lambert + fresnel rim + emissive.
import * as THREE from "../../../vendor/three.js";
import { dyn, flush, fxMaterial } from "./common.ts";

const VS = /* glsl */ `
  attribute vec4 iCol; attribute vec4 iFx;
  varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec4 vCol; varying vec4 vFx; varying float vY;
  void main() {
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    vCol = iCol; vFx = iFx; vY = position.y; vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const FS = /* glsl */ `
  uniform vec3 uSun; uniform vec3 uRim; uniform float uFlat;
  varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec4 vCol; varying vec4 vFx; varying float vY;
  void main() {
    vec3 n = uFlat > 0.5 ? normalize(cross(dFdx(vW), dFdy(vW))) : normalize(vN);
    float l = clamp((dot(n, uSun) + 0.3) / 1.3, 0.0, 1.0);
    float fr = pow(1.0 - abs(dot(n, vV)), 3.0);
    vec3 col = vCol.rgb * (0.45 + 0.65 * l) + uRim * fr * vFx.y + vCol.rgb * vFx.x;
    float a = vCol.a * mix(1.0, 0.15 + fr * 1.1, vFx.z);
    // vFx.w: vertical reveal mask (0..1 of the mesh height, from the bottom), for growing ice
    if (vFx.w < 1.0 && vY > mix(-1.0, 1.0, vFx.w)) discard;
    float k = 1.0;
    gl_FragColor = vec4(col * a, a * k);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();

export class Meshes {
  readonly mesh: THREE.InstancedMesh;
  private col: THREE.InstancedBufferAttribute; private fx: THREE.InstancedBufferAttribute;
  n = 0;
  constructor(geo: THREE.BufferGeometry, readonly cap: number, o: { order: number; rim?: number; flat?: boolean; depthWrite?: boolean }) {
    const g = geo.clone();
    const ig = g as unknown as THREE.InstancedBufferGeometry;
    this.col = dyn(ig, "iCol", 4, cap); this.fx = dyn(ig, "iFx", 4, cap);
    const rim = new THREE.Color(o.rim ?? 0xffffff);
    const m = fxMaterial({ vs: VS, fs: FS, order: o.order, side: THREE.FrontSide, uniforms: {
      uSun: { value: new THREE.Vector3(-0.45, 0.8, -0.4).normalize() }, uRim: { value: new THREE.Vector3(rim.r, rim.g, rim.b) }, uFlat: { value: o.flat ? 1 : 0 },
    } });
    if (o.depthWrite) m.depthWrite = true;
    this.mesh = new THREE.InstancedMesh(g, m, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = o.order;
    this.mesh.name = "fx-meshes";
  }
  begin(): void { this.n = 0; }
  /**
   * Position in world space, yaw/pitch/roll (YXZ), scale. Colour linear (x emissive via `em`),
   * `rim` fresnel strength, `glass` 0 solid .. 1 fresnel-alpha (bubbles, ice), `reveal` 0..1 from the bottom.
   */
  add(x: number, y: number, z: number, yaw: number, pitch: number, roll: number, sx: number, sy: number, sz: number,
      r: number, g: number, b: number, a: number, em = 0, rim = 0, glass = 0, reveal = 1): void {
    const i = this.n;
    if (i >= this.cap) return;
    this.n++;
    e.set(pitch, yaw, roll, "YXZ"); q.setFromEuler(e);
    m4.compose(v.set(x, y, z), q, s.set(sx, sy, sz));
    m4.toArray(this.mesh.instanceMatrix.array as Float32Array, i * 16);
    const C = this.col.array as Float32Array, F = this.fx.array as Float32Array;
    C[i * 4] = r; C[i * 4 + 1] = g; C[i * 4 + 2] = b; C[i * 4 + 3] = a;
    F[i * 4] = em; F[i * 4 + 1] = rim; F[i * 4 + 2] = glass; F[i * 4 + 3] = reveal;
  }
  /** Orient the mesh's +Z along a direction (bolts, arrows). */
  addDir(x: number, y: number, z: number, dx: number, dy: number, dz: number, roll: number, sx: number, sy: number, sz: number,
         r: number, g: number, b: number, a: number, em = 0, rim = 0): void {
    const yaw = Math.atan2(dx, dz), pitch = -Math.atan2(dy, Math.hypot(dx, dz));
    this.add(x, y, z, yaw, pitch, roll, sx, sy, sz, r, g, b, a, em, rim, 0, 1);
  }
  end(): void {
    this.mesh.count = this.n;
    const im = this.mesh.instanceMatrix;
    im.clearUpdateRanges(); if (this.n) im.addUpdateRange(0, this.n * 16); im.needsUpdate = true;
    flush([this.col, this.fx], this.n);
  }
}
