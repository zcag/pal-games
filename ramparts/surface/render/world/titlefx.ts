// Title-only life (art 2.6, 7.11): birds wheeling over the castle and soft god rays from the low sun.
import * as THREE from "../../vendor/three.js";
import type { Look } from "../palette.ts";

export function titleFx(look: Look, castle: THREE.Vector3) {
  const g = new THREE.Group();
  g.name = "titlefx";
  // birds: little V silhouettes on lazy circles, wings folding to flap
  const bird = new THREE.BufferGeometry();
  bird.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.08, -0.32, 0.06, -0.05, 0, 0, -0.06, 0, 0, 0.08, 0, 0, -0.06, 0.32, 0.06, -0.05], 3));
  const N = 7;
  const birds = new THREE.InstancedMesh(bird, new THREE.MeshBasicMaterial({ color: "#2A2230", side: THREE.DoubleSide }), N);
  birds.frustumCulled = false;
  const seeds = Array.from({ length: N }, (_, i) => ({ r: 5 + (i % 3) * 1.6, h: 7 + (i % 4) * 0.7, p: i * 0.9, v: 0.22 + (i % 2) * 0.06 }));
  g.add(birds);
  // god rays: long additive shafts slanting down from the sun's side
  const az = (look.sun.az * Math.PI) / 180;
  const dir = new THREE.Vector3(-Math.sin(az), 0, Math.cos(az)).normalize();
  const rayMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { col: { value: new THREE.Color(look.sun.color) }, time: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 col; uniform float time; varying vec2 vUv;
      void main() { float a = smoothstep(0.0, 0.35, vUv.y) * (1.0 - vUv.y) * smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
        a *= 0.15 * (0.75 + 0.25 * sin(time * 0.4 + vUv.x * 6.0)); gl_FragColor = vec4(col * a, 1.0); }`,
  });
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + i * 0.4, 22), rayMat);
    const off = (i - 2) * 2.6;
    m.position.copy(castle).add(new THREE.Vector3(dir.x * 6 - dir.z * off, 6, dir.z * 6 + dir.x * off));
    m.lookAt(castle.clone().add(new THREE.Vector3(0, 6, 0)).add(new THREE.Vector3(0, 0, 30)));
    m.rotateX(0.15); m.rotateZ(Math.atan2(dir.x, 1) * 0.6 - 0.5);
    g.add(m);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    group: g,
    update(t: number) {
      rayMat.uniforms.time!.value = t;
      seeds.forEach((b, i) => {
        const a = t * b.v + b.p;
        v.set(castle.x + Math.cos(a) * b.r, b.h + Math.sin(t * 0.7 + i) * 0.3, castle.z + Math.sin(a) * b.r);
        e.set(Math.sin(t * 0.5 + i) * 0.1, -a, 0.25);
        const flap = 0.55 + 0.45 * Math.abs(Math.sin(t * 6 + i * 1.7));
        s.set(1, flap * 1.6 - 0.6, 1).multiplyScalar(0.9);
        m4.compose(v, q.setFromEuler(e), s);
        birds.setMatrixAt(i, m4);
      });
      birds.instanceMatrix.needsUpdate = true;
    },
  };
}
