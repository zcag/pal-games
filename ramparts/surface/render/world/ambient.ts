// Ambient particles per act (art 2.x): pollen, sand streaks, snow, embers + ash. All motion is in the
// vertex shader from a per-particle seed; one draw call. Fades to 50% while > 80 enemies are on screen.
import * as THREE from "../../vendor/three.js";
import type { Battle } from "../../../game/types.ts";
import type { Look } from "../palette.ts";
import type { Field } from "./field.ts";
import { U } from "../mats.ts";

const VS = /* glsl */ `
attribute vec4 aSeed; attribute float aKind;
uniform float time, px, fade; uniform vec3 box; uniform vec2 wind; uniform vec3 colA, colB;
varying vec3 vCol; varying float vA; varying float vStreak;
float wrap(float v, float lo, float hi) { return lo + mod(v - lo, hi - lo); }
void main() {
  vec4 s = aSeed; float k = aKind;
  vec3 p; float size = 0.05; float a = 0.5; vCol = colA; vStreak = 0.0;
  if (k < 0.5) { // pollen: drifting on soft curls
    p = vec3((s.x - 0.5) * box.x * 2.0, 0.3 + s.y * 2.2, (s.z - 0.5) * box.z * 2.0);
    p.x += sin(time * 0.31 + s.w * 40.0) * 0.7 + wind.x * time * 0.2; p.z += cos(time * 0.27 + s.w * 31.0) * 0.6 + wind.y * time * 0.2;
    p.y += sin(time * 0.5 + s.w * 17.0) * 0.25;
    size = 0.045; a = 0.5;
  } else if (k < 1.5) { // sand streaks with the wind, in the dressing and the slab's top third
    float t = time * 1.2 * (0.8 + s.w * 0.4);
    p = vec3((s.x - 0.5) * box.x * 2.0 + wind.x * t * 1.2, 0.1 + s.y * 0.9, -box.z + s.z * box.z * 0.75 + wind.y * t);
    size = 0.07; a = 0.3; vStreak = 1.0;
  } else if (k < 2.5) { // snow: falling, tumbling, sideways in gusts
    float fall = time * 0.5 * (0.7 + s.w * 0.6);
    p = vec3((s.x - 0.5) * box.x * 2.0, 4.0 - mod(fall + s.y * 4.5, 4.5), (s.z - 0.5) * box.z * 2.0);
    float gust = smoothstep(0.85, 1.0, sin(time * 0.55)) * 3.0;
    p.x += sin(time * 0.9 + s.w * 50.0) * 0.25 + wind.x * (time * 0.3 + gust);
    p.z += cos(time * 0.7 + s.w * 20.0) * 0.2 + wind.y * time * 0.3;
    size = 0.035 + s.w * 0.03; a = 0.7;
  } else if (k < 3.5) { // embers: rising, flickering, dying at 2-4 u; back 40% of the slab only
    float life = 2.0 + s.w * 2.0, t = mod(time * 0.4 + s.y * life, life);
    p = vec3((s.x - 0.5) * box.x * 2.0 + sin(time + s.w * 30.0) * 0.3, t, -box.z + s.z * box.z * 0.85);
    size = 0.05; a = (1.0 - t / life) * (0.6 + 0.4 * sin(time * 9.0 + s.w * 70.0)); vCol = colB;
  } else { // ash flakes falling
    float fall = time * 0.3 * (0.7 + s.w * 0.6);
    p = vec3((s.x - 0.5) * box.x * 2.0 + sin(time * 0.6 + s.w * 9.0) * 0.4, 3.5 - mod(fall + s.y * 3.5, 3.5), (s.z - 0.5) * box.z * 2.0);
    size = 0.05; a = 0.5;
  }
  p.x = wrap(p.x, -box.x, box.x); p.z = wrap(p.z, -box.z, box.z);
  vA = a * fade;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.5, px * size / -mv.z * (1.0 + vStreak * 1.5));
}`;

const FS = /* glsl */ `
varying vec3 vCol; varying float vA; varying float vStreak;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  if (vStreak > 0.5) q.y *= 4.0;
  float d = length(q);
  gl_FragColor = vec4(vCol, vA * smoothstep(0.5, 0.15, d));
}`;

export function ambient(f: Field, look: Look) {
  const kinds: [number, number][] = look.particles === "pollen" || look.particles === "title" ? [[0, 40]]
    : look.particles === "sand" ? [[1, 60]] : look.particles === "snow" ? [[2, 120]] : [[3, 80], [4, 60]];
  const n = kinds.reduce((a, k) => a + k[1], 0);
  const seed = new Float32Array(n * 4), kind = new Float32Array(n);
  let i = 0;
  let s = 12345;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (const [k, c] of kinds) for (let j = 0; j < c; j++, i++) { seed.set([r(), r(), r(), r()], i * 4); kind[i] = k; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  g.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
  const colA = look.particles === "sand" ? "#F6E3C0" : look.particles === "snow" ? "#FFFFFF" : look.particles === "embers" ? "#4A4040" : "#FFF4D0";
  const u = {
    time: { value: 0 }, px: { value: 600 }, fade: { value: 1 },
    box: { value: new THREE.Vector3(f.W2, 0, f.H2) }, wind: U.uWind,
    colA: { value: new THREE.Color(colA) }, colB: { value: new THREE.Color("#FFB060").multiplyScalar(2.2) },
  };
  const additive = look.particles === "embers";
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  pts.renderOrder = 2;
  pts.name = "ambient";
  const size = new THREE.Vector2();
  pts.onBeforeRender = (rend, _s, cam) => {
    rend.getDrawingBufferSize(size);
    u.px.value = size.y / (2 * Math.tan(((cam as THREE.PerspectiveCamera).fov * Math.PI) / 360));
  };
  return {
    mesh: pts,
    update(t: number, _dt: number, b: Battle | null) {
      u.time.value = t;
      const many = (b?.enemies.length ?? 0) > 80;
      u.fade.value += ((many ? 0.5 : 1) - u.fade.value) * 0.05;
    },
  };
}
