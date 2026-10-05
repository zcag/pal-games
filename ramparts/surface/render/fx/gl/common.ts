// Shared bits for the fx batches: one premultiplied blend for everything (a per-instance
// `k` picks additive 0 .. normal 1), colour helpers, and the viewport uniforms.
import * as THREE from "../../../vendor/three.js";

/** Linear rgb of an sRGB hex, written into `out` at `o` (three's colour management does the conversion). */
const tmpC = new THREE.Color();
export function lin(hex: number, out?: Float32Array | number[], o = 0): [number, number, number] {
  tmpC.setHex(hex);
  if (out) { out[o] = tmpC.r; out[o + 1] = tmpC.g; out[o + 2] = tmpC.b; }
  return [tmpC.r, tmpC.g, tmpC.b];
}

export type RGB = readonly [number, number, number];
export const rgb = (hex: number): RGB => lin(hex);

/** Shared per-frame uniforms: css px -> clip scale, real time, ui scale. */
export const U = {
  uPx: { value: new THREE.Vector2(2 / 720, 2 / 390) },
  uTime: { value: 0 },
  uUi: { value: 1 },
};

const v2 = new THREE.Vector2();
export function syncViewport(r: THREE.WebGLRenderer, t: number): { w: number; h: number; ui: number } {
  r.getSize(v2);
  const w = Math.max(1, v2.x), h = Math.max(1, v2.y);
  U.uPx.value.set(2 / w, 2 / h);
  U.uTime.value = t;
  U.uUi.value = Math.min(1.5, Math.max(1, Math.min(w / 720, h / 390)));
  return { w, h, ui: U.uUi.value };
}

export function fxMaterial(o: {
  vs: string; fs: string; uniforms?: Record<string, THREE.IUniform>; depthTest?: boolean; order: number; side?: THREE.Side;
}): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    vertexShader: o.vs,
    fragmentShader: o.fs,
    uniforms: { ...U, ...(o.uniforms ?? {}) },
    transparent: true,
    depthWrite: false,
    depthTest: o.depthTest ?? true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    side: o.side ?? THREE.DoubleSide,
    fog: false,
  });
  return m;
}

/** Fragment tail: premultiplied out with additive/normal mix `k`. */
export const OUT = /* glsl */ `
  gl_FragColor = vec4(col * a, a * k);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/** An InstancedBufferAttribute that is rewritten every frame. */
export function dyn(geo: THREE.InstancedBufferGeometry, name: string, size: number, cap: number): THREE.InstancedBufferAttribute {
  const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * size), size);
  a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute(name, a);
  return a;
}

export function flush(attrs: THREE.InstancedBufferAttribute[], n: number): void {
  for (const a of attrs) {
    a.clearUpdateRanges();
    if (n > 0) a.addUpdateRange(0, n * a.itemSize);
    a.needsUpdate = true;
  }
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
export const easeInCubic = (x: number) => x * x * x;
export const easeOutBack = (x: number) => { const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
