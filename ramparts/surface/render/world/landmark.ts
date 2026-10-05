// One hero landmark per act on its own small floating islet behind the slab (never on the play area):
// a windmill hill village (meadow), a ruined pyramid and colossus (desert), a frozen giant (peaks),
// a volcano (citadel). It sits above the slab's back edge in the battle frame.
import * as THREE from "../../vendor/three.js";
import { Kit, TAU } from "../models/kit.ts";
import * as P from "../models/props.ts";
import type { Look } from "../palette.ts";
import { lit } from "../mats.ts";
import { mulberry } from "./field.ts";

export function landmark(look: Look, theme: string, W2: number, H2: number, seed: number) {
  const rnd = mulberry(seed ^ 0x1a4d);
  const g = new THREE.Group();
  g.name = "landmark";
  const k = new Kit();
  const R = theme === "citadel" ? 4.2 : 3.4;
  // the islet: a grassy (sandy, snowy, basalt) top over a faceted rock that tapers away
  k.cyl(R, R * 0.92, 0.7, 12, { at: [0, -0.35, 0], color: look.strata[0]!, jitter: 0.12 });
  k.cyl(R * 0.98, R * 0.98, 0.12, 12, { at: [0, 0.02, 0], color: look.ground, jitter: 0.05 });
  k.cone(R * 0.9, 5.5, 9, { at: [0, -3.4, 0], rot: [Math.PI, 0, 0], color: look.strata[2]!, jitter: 0.35 });
  if (theme === "meadow" || theme === "title") {
    k.ico(2.3, 1, { at: [0.2, 0.2, 0], scale: [1.2, 0.55, 1.1], color: look.groundA, jitter: 0.12 });
    const w = P.windmill(k, [0.3, 1.25, -0.2], 0.4);
    const blades = new THREE.Mesh(P.windmillBlades(), lit({ kind: "world", fog: false }));
    blades.position.copy(w.hub); blades.rotation.y = w.rot;
    g.add(blades);
    g.userData.spin = blades;
    for (let i = 0; i < 4; i++) {
      const a = 2.2 + i * 0.7, d = 2.0;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      k.box(0.6, 0.45, 0.5, { at: [x, 0.5, z], rot: [0, a, 0], color: "#E6DCC6" });
      k.cone(0.52, 0.4, 4, { at: [x, 0.92, z], rot: [0, a + Math.PI / 4, 0], color: i % 2 ? "#8E5A3E" : "#9A6A44" });
    }
    for (let i = 0; i < 5; i++) { const a = rnd() * TAU; k.ico(0.45, 0, { at: [Math.cos(a) * 2.6, 0.6, Math.sin(a) * 2.6], color: look.foliage[i % 3]!, jitter: 0.05 }); }
  } else if (theme === "desert") {
    // a stepped ruined pyramid, one corner fallen, and a seated colossus at its foot
    for (let i = 0; i < 5; i++) {
      const s = 4.2 - i * 0.8;
      k.box(s, 0.55, s, { at: [0.3, 0.27 + i * 0.55, -0.3], rot: [0, 0.1, 0], color: i % 2 ? "#C8A87A" : "#BC9C6C", jitter: 0.08 });
    }
    k.dodeca(0.5, { at: [1.9, 0.3, 1.0], color: "#B8986A", jitter: 0.1 });
    k.box(0.8, 1.6, 0.8, { at: [-2.0, 0.8, 1.2], color: "#C8B08A" });
    k.ico(0.42, 0, { at: [-2.0, 1.95, 1.2], color: "#C8B08A", jitter: 0.04 });
    k.box(1.1, 0.5, 0.9, { at: [-2.0, 0.25, 1.6], color: "#BCA47E" });
  } else if (theme === "peaks") {
    // a frozen giant kneeling in the ice
    const ice = "#BFE6F5", granite = "#6E7882";
    k.ico(1.4, 1, { at: [0, 1.3, 0], scale: [1.2, 1.1, 0.9], color: granite, jitter: 0.12 });
    k.ico(0.7, 1, { at: [0, 2.9, 0.15], color: granite, jitter: 0.08 });
    for (const x of [-1, 1]) {
      k.ico(0.65, 0, { at: [x * 1.6, 2.1, 0.1], color: granite, jitter: 0.08 });
      k.box(0.6, 1.6, 0.6, { at: [x * 1.9, 1.1, 0.5], rot: [0.4, 0, x * 0.2], color: granite });
    }
    for (let i = 0; i < 14; i++) {
      const a = rnd() * TAU, d = 0.6 + rnd() * 2.2, h = 0.8 + rnd() * 2.2;
      k.cyl(0, 0.25 + rnd() * 0.2, h, 5, { at: [Math.cos(a) * d, h / 2, Math.sin(a) * d], rot: [(rnd() - 0.5) * 0.6, 0, (rnd() - 0.5) * 0.6], color: i % 2 ? ice : "#D8F0FA" });
    }
    k.octa(0.25, { at: [0, 1.5, 1.1], color: "#9FE4FF", emit: 1.3 });
  } else {
    // a volcano: basalt cone, a glowing crater, lava runs down its side
    k.cone(3.6, 4.8, 9, { at: [0, 2.3, 0], color: "#2A2426", jitter: 0.22 });
    k.cyl(0.9, 1.1, 0.25, 9, { at: [0, 4.6, 0], color: "#FF9A3A", emit: 2.0 });
    for (let i = 0; i < 3; i++) {
      const a = 0.6 + i * 1.9;
      k.tube([[Math.cos(a) * 0.9, 4.5, Math.sin(a) * 0.9], [Math.cos(a) * 2.0, 2.6, Math.sin(a) * 2.0], [Math.cos(a) * 3.3, 0.3, Math.sin(a) * 3.3]], 0.16, 0.24, 4, { color: "#FF6A20", emit: 1.6 });
    }
  }
  const m = new THREE.Mesh(k.build(), lit({ kind: "world", rough: 0.9 }));
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  if (theme === "citadel") g.add(smoke());
  // behind the slab, toward a back corner, a little above the slab so it reads against the sky
  const side = rnd() < 0.5 ? -1 : 1;
  g.position.set(side * (W2 - 7), -3.6, -H2 - 6.5);
  g.scale.setScalar(theme === "citadel" ? 0.72 : 0.8);
  g.rotation.y = rnd() * TAU;
  return {
    group: g,
    update(_t: number, dt: number) { const s = g.userData.spin as THREE.Object3D | undefined; if (s) s.rotation.z += dt * 0.9; },
  };
}

/** A slow smoke column over the volcano (soft additive-free puffs). */
function smoke() {
  const N = 16;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos.set([0, 4.8, 0], i * 3); seed[i] = i / N; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { time: { value: 0 }, px: { value: 400 } },
    vertexShader: `attribute float aSeed; uniform float time, px; varying float vA;
      void main() { float t = fract(time * 0.05 + aSeed); vec3 p = position + vec3(t * 3.0 + sin(aSeed * 20.0) * 0.4, t * 9.0, -t * 1.5);
        vA = sin(t * 3.1416) * 0.5; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = px * (0.6 + t * 1.6) / -mv.z; }`,
    fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(0.2, 0.15, 0.17, vA * smoothstep(0.5, 0.1, d)); }`,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  const size = new THREE.Vector2();
  p.onBeforeRender = (r, _s, cam) => { m.uniforms.time!.value = performance.now() / 1000; r.getDrawingBufferSize(size); m.uniforms.px!.value = size.y / (2 * Math.tan(((cam as THREE.PerspectiveCamera).fov * Math.PI) / 360)); };
  return p;
}
