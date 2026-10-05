// Backdrop (art 1.2): a painted two-stop sky behind everything, two layers of distant silhouettes far
// below the slab (pre-softened into the fog), and low-poly cloud puffs drifting under the rim.
import * as THREE from "../../vendor/three.js";
import type { Look } from "../palette.ts";
import { Kit } from "../models/kit.ts";
import { hash2, mulberry, noise2 } from "./field.ts";

export function skyQuad() {
  const u = {
    top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, fog: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector2(-0.6, 0.6) }, sunCol: { value: new THREE.Color() }, time: { value: 0 },
  };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: u, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top, hor, fog, sunCol; uniform vec2 sunDir; uniform float time; varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        float y = vUv.y;
        vec3 c = mix(hor, top, smoothstep(0.4, 1.0, y));
        c = mix(c, mix(hor, fog, 0.5) * 0.82, smoothstep(0.42, 0.0, y) * 0.75);
        // a soft warm glow from the sun's side, and faint painted cloud bands
        float g = smoothstep(1.3, 0.0, length((vUv - 0.5) * vec2(1.6, 1.0) - sunDir * 0.55));
        c += sunCol * g * 0.12;
        float b = n(vec2(vUv.x * 3.0 + time * 0.004, y * 9.0)) * n(vec2(vUv.x * 7.0 - time * 0.006, y * 15.0));
        c = mix(c, mix(c, hor, 0.5) * 1.04, smoothstep(0.2, 0.6, b) * 0.35);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  m.frustumCulled = false;
  m.renderOrder = -1000;
  m.name = "sky";
  return { mesh: m, u };
}

export function setSky(u: ReturnType<typeof skyQuad>["u"], look: Look) {
  u.top.value.set(look.skyTop); u.hor.value.set(look.skyHorizon); u.fog.value.set(look.fog);
  u.sunCol.value.set(look.sun.color);
  const az = (look.sun.az * Math.PI) / 180;
  u.sunDir.value.set(-Math.cos(az - Math.PI / 2) * 0.8, 0.7);
}

/** Two silhouette ridges far below and behind, plus a ring round the sides; unlit, faded into the fog at their base. */
export function silhouettes(look: Look, theme: string, seed: number) {
  const g = new THREE.Group();
  const fog = new THREE.Color(look.fog);
  const rnd = mulberry(seed ^ 0x51);
  const layer = (dist: number, y0: number, amp: number, mix: number, colHex: string, jag: number) => {
    const col = new THREE.Color(colHex).lerp(fog, mix);
    const base = fog.clone().lerp(col, 0.15);
    const pos: number[] = [], cols: number[] = [];
    const N = 90, R = dist;
    // an arc behind the slab (and wrapping round the sides), from -150 to -30 deg of azimuth
    const ridge: [number, number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const a = -Math.PI * 0.98 + (i / N) * Math.PI * 0.96;
      const x = Math.cos(a) * R * 1.4, z = Math.sin(a) * R;
      let hgt = (noise2(i * 0.11 + seed % 97, dist) * 0.7 + noise2(i * 0.37, dist + 3) * 0.3) * amp;
      if (jag > 0) hgt += (hash2(i, dist) - 0.5) * jag * amp;
      ridge.push([x, y0 + hgt, z]);
    }
    for (let i = 0; i < N; i++) {
      const a = ridge[i]!, b = ridge[i + 1]!;
      const quad = [a, b, [b[0], y0 - 40, b[2]], a, [b[0], y0 - 40, b[2]], [a[0], y0 - 40, a[2]]] as number[][];
      for (const p of quad) {
        pos.push(p[0]!, p[1]!, p[2]!);
        const k = THREE.MathUtils.smoothstep(p[1]!, y0 + 2, y0 + amp * 0.9);
        const c = base.clone().lerp(col, k);
        cols.push(c.r, c.g, c.b);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
    m.renderOrder = -900 + dist * -0.01;
    m.frustumCulled = false;
    return m;
  };
  const jag = theme === "peaks" ? 0.9 : theme === "citadel" ? 0.5 : theme === "desert" ? 0.1 : 0.2;
  // mountains rising out of the cloud sea
  g.add(layer(150, -20, theme === "peaks" ? 30 : 20, 0.55, look.hills[1], jag + 0.4));
  g.add(layer(95, -20, theme === "peaks" ? 18 : 11, 0.32, look.hills[0], jag + 0.2));
  g.add(cloudSea(look));
  // act 4: the black citadel far off, one lit line of windows
  if (theme === "citadel") {
    const k = new Kit();
    const dark = "#2A2026";
    k.box(10, 30, 6, { at: [0, 0, 0], color: dark });
    k.box(4, 44, 4, { at: [-7, 7, 1], color: dark });
    k.box(3, 52, 3, { at: [6, 11, -1], color: dark });
    k.cone(2.6, 9, 4, { at: [6, 41.5, -1], color: dark });
    k.cone(3, 8, 4, { at: [-7, 33, 1], color: dark });
    k.box(9, 0.6, 0.2, { at: [0, 6, 3.1], color: "#FFB347", emit: 1.4, shade: 0 });
    const m = new THREE.Mesh(k.build(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
    // keep it hazy: tint toward fog by drawing it in a fogged colour
    const cols = m.geometry.attributes.color as THREE.BufferAttribute;
    const emit = m.geometry.attributes.aEmit as THREE.BufferAttribute;
    const c = new THREE.Color();
    for (let i = 0; i < cols.count; i++) {
      c.fromBufferAttribute(cols, i);
      if (emit.getX(i) > 0) c.multiplyScalar(2.2); else c.lerp(fog, 0.55);
      cols.setXYZ(i, c.r, c.g, c.b);
    }
    m.position.set(26, -44, -88);
    m.renderOrder = -905;
    g.add(m);
  }
  void rnd;
  return g;
}

/** Cloud puffs below the rim, drifting with the wind (one instanced mesh). */
export function clouds(look: Look, W2: number, H2: number, seed: number, all = false) {
  const k = new Kit();
  const rnd = mulberry(seed ^ 0xc10d);
  const base = new THREE.Color(look.fog).lerp(new THREE.Color("#FFFFFF"), 0.18);
  k.ico(1.0, 1, { at: [0, 0, 0], color: base, shade: 0.04 });
  k.ico(0.75, 1, { at: [0.9, -0.15, 0.2], color: base, shade: 0.04 });
  k.ico(0.7, 1, { at: [-0.95, -0.2, -0.1], color: base, shade: 0.04 });
  k.ico(0.55, 1, { at: [0.3, 0.45, -0.3], color: base, shade: 0.04 });
  const geo = k.build();
  geo.scale(1, 0.62, 1);
  // shade the underside toward fog (clouds lit from above)
  const pos = geo.attributes.position as THREE.BufferAttribute, col = geo.attributes.color as THREE.BufferAttribute;
  const fog = new THREE.Color(look.fog), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.fromBufferAttribute(col, i).lerp(fog.clone().multiplyScalar(0.92), THREE.MathUtils.smoothstep(-pos.getY(i), -0.2, 0.6) * 0.6);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0.94, depthWrite: false });
  const N = 30;
  const im = new THREE.InstancedMesh(geo, mat, N);
  im.frustumCulled = false;
  im.renderOrder = -800;
  im.name = "clouds";
  const items: { a: number; r: number; y: number; s: number; v: number }[] = [];
  for (let i = 0; i < N; i++) {
    items.push({ a: all ? rnd() * Math.PI * 2 : Math.PI * (1.0 + rnd() * 1.15) - 0.07, r: 1.12 + rnd() * 0.6, y: -6.5 - rnd() * 7, s: 1.1 + rnd() * 1.8, v: (0.004 + rnd() * 0.006) * (rnd() < 0.5 ? 1 : 1) });
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const update = (t: number) => {
    items.forEach((it, i) => {
      const a = it.a + Math.sin(t * it.v) * 0.25;
      const front = all ? Math.max(0, Math.sin(a)) * 0.9 : 0;
      p.set(Math.cos(a) * (W2 + 2.5) * it.r, it.y - front * front * 9, Math.sin(a) * (H2 + 2.5) * it.r);
      s.set(it.s * 1.4, it.s, it.s);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.a);
      m.compose(p, q, s);
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { mesh: im, update };
}

/** A sea of clouds far below the slab, fading into the horizon (sells "floating"). */
function cloudSea(look: Look) {
  const u = {
    time: { value: 0 }, fog: { value: new THREE.Color(look.fog) }, hor: { value: new THREE.Color(look.skyHorizon) },
    lit: { value: new THREE.Color(look.fog).lerp(new THREE.Color("#FFFFFF"), 0.35) }, shade: { value: new THREE.Color(look.fog).lerp(new THREE.Color(look.skyTop), 0.25).multiplyScalar(0.93) },
  };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float time; uniform vec3 fog, hor, lit, shade; varying vec3 vW;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec2 q = vW.xz * 0.045 + vec2(time * 0.004, time * 0.002);
        float c = n(q) * 0.5 + n(q * 2.1 + 3.0) * 0.3 + n(q * 4.3 + 7.0) * 0.2;
        vec3 col = mix(shade, lit, smoothstep(0.3, 0.8, c));
        float d = length(vW.xz);
        col = mix(col, hor, smoothstep(60.0, 260.0, d));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  m.position.y = -17;
  m.renderOrder = -850;
  m.frustumCulled = false;
  m.name = "cloudsea";
  m.onBeforeRender = () => { u.time.value = performance.now() / 1000; };
  return m;
}
