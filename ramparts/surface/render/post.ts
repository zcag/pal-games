// Post (art 5.2, 6.2, 6.3): the scene renders into a half-float MSAA target, a mip-chain bloom with a
// high threshold adds only real emissives, then one pass tone-maps (Khronos PBR Neutral), grades
// (contrast, saturation, lift, gain), vignettes toward the fog colour, and dithers.
import * as THREE from "../vendor/three.js";
import { UnrealBloomPass } from "../vendor/three.js";
import type { Grade } from "./palette.ts";

const VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FS = /* glsl */ `
uniform sampler2D tScene; uniform float exposure, contrast, saturation, vignette, time, pause, danger, red, dim, leftShade;
uniform vec3 lift, gain, vigCol; uniform vec2 aspect;
varying vec2 vUv;
vec3 neutral(vec3 color) {
  const float startCompression = 0.8 - 0.04; const float desaturation = 0.15;
  color *= exposure;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) return color;
  const float d = 1.0 - startCompression;
  float newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = neutral(texture2D(tScene, vUv).rgb);
  c = clamp(c, 0.0, 1.0);
  c = toSRGB(c);
  // grade in display space
  c = (c - 0.5) * contrast + 0.5;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, saturation * (1.0 - pause * 0.7));
  c = c * gain + lift * (1.0 - c);
  c *= 1.0 - pause * 0.25 - dim;
  // vignette: elliptical, from 55% of the radius, toward the fog colour x 0.4
  vec2 q = (vUv - 0.5) * 2.0;
  float r = length(q * vec2(1.0, 0.92));
  float v = smoothstep(0.55, 1.45, r) * vignette;
  c = mix(c, vigCol, v);
  // danger pulse and leak flash (red at the edge)
  float edge = smoothstep(0.45, 1.35, r);
  c = mix(c, vec3(0.478, 0.102, 0.078), edge * danger * (0.5 + 0.5 * sin(time * 6.2832 / 2.4)) * 0.35);
  c = mix(c, vec3(0.753, 0.125, 0.102), edge * red * 0.5);
  // title: a soft dark gradient behind the left column (the UI draws the name and menu there)
  c = mix(c, vec3(0.05, 0.06, 0.1), leftShade * 0.62 * (1.0 - smoothstep(0.08, 0.46, vUv.x)));
  c += (hash(gl_FragCoord.xy + fract(time)) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
}`;

export class Post {
  target: THREE.WebGLRenderTarget;
  bloom: UnrealBloomPass;
  private quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  bloomOn = true;
  u: Record<string, THREE.IUniform>;

  constructor(private gl: THREE.WebGLRenderer) {
    this.target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.45, 1.0);
    // soft knee: a wider smooth band over the threshold
    (this.bloom as unknown as { highPassUniforms: Record<string, THREE.IUniform> }).highPassUniforms.smoothWidth!.value = 0.5;
    this.u = {
      tScene: { value: this.target.texture }, exposure: { value: 1 }, contrast: { value: 1 }, saturation: { value: 1 },
      vignette: { value: 0.2 }, time: { value: 0 }, pause: { value: 0 }, danger: { value: 0 }, red: { value: 0 }, dim: { value: 0 }, leftShade: { value: 0 },
      lift: { value: new THREE.Vector3() }, gain: { value: new THREE.Vector3(1, 1, 1) }, vigCol: { value: new THREE.Color() }, aspect: { value: new THREE.Vector2(1, 1) },
    };
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: this.u, depthTest: false, depthWrite: false }));
    this.quad.frustumCulled = false;
  }

  setGrade(g: Grade, fog: string, exposure: number) {
    this.u.contrast!.value = g.contrast; this.u.saturation!.value = g.saturation; this.u.vignette!.value = g.vignette;
    (this.u.lift!.value as THREE.Vector3).set(...g.lift); (this.u.gain!.value as THREE.Vector3).set(...g.gain);
    // the vignette target is a display colour: fog x 0.4, in sRGB
    (this.u.vigCol!.value as THREE.Color).set(fog).convertLinearToSRGB().multiplyScalar(0.4);
    this.u.exposure!.value = exposure;
  }

  setSize(W: number, H: number, msaa: boolean) {
    this.target.setSize(W, H);
    if (this.target.samples !== (msaa ? 4 : 0)) {
      this.target.dispose();
      this.target = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: msaa ? 4 : 0 });
      this.u.tScene!.value = this.target.texture;
    }
    this.bloom.setSize(W, H);
  }

  render(scene: THREE.Scene, camera: THREE.Camera, t: number) {
    const gl = this.gl;
    gl.setRenderTarget(this.target);
    gl.clear();
    gl.render(scene, camera);
    if (this.bloomOn) this.bloom.render(gl, null as unknown as THREE.WebGLRenderTarget, this.target, 0, false);
    this.u.time!.value = t;
    gl.setRenderTarget(null);
    gl.render(this.quad, this.cam);
  }
}
