// Units (art 3.2-3.4): enemies and soldiers drawn as one InstancedMesh per role (+ its inverted-hull
// outline), synced to the Battle by id each frame: interpolated position, eased facing, a walk/flap
// phase advanced by actual speed, hit flash, chill/hex/burn tints, stealth dither, boss poses, blob
// shadows (flyers have only those), the Sand Wyrm's segmented body and its burrow mound.
import * as THREE from "../vendor/three.js";
import type { Battle, BattleEvent, Enemy, Soldier, Theme } from "../../game/types.ts";
import { toWorld, type Stage } from "./api.ts";
import { lit, outlineMaterial, unitDepthMaterial } from "./mats.ts";
import { LOOKS, type Look } from "./palette.ts";
import { buildElite, buildUnit, unitSpec, type UnitModel } from "./models/units.ts";
import { bodyFx } from "./fx/overlays.ts";

export interface UnitPose { x: number; y: number; z: number; height: number; yaw: number; flyer: boolean }

export interface Units {
  onEvents(s: Stage, e: readonly BattleEvent[], b: Battle): void;
  update(s: Stage, b: Battle | null, a: number, dt: number, t: number): void;
  /** World pose (three coords) of an enemy or soldier drawn this frame; `y` is the feet. */
  pose(id: number): UnitPose | null;
  /** Flash a unit white (hit flash, art 5.3); VFX may call it for its own hits. */
  flash(id: number, amount?: number): void;
  /** Model height of a kind (enemy id, soldier kind, or boss id) in u, before elite scale. */
  height(kind: string): number;
  /** Squash a unit along a direction for 60 ms (8%, big hits 15%). */
  squash(id: number, big?: boolean): void;
}

interface Role {
  key: string;
  model: UnitModel;
  mesh: THREE.InstancedMesh;
  outline: THREE.InstancedMesh;
  iA: THREE.InstancedBufferAttribute;
  iB: THREE.InstancedBufferAttribute;
  cap: number;
  n: number;
  motion: { value: THREE.Vector4 };
}

interface St { yaw: number; phase: number; flash: number; lastFlash: number; squash: number; seen: number; trail?: THREE.Vector3[]; travelled?: number; swing: number }

const EASE_YAW = 1 / 0.12;

export function createUnits(): Units {
  const group = new THREE.Group();
  group.name = "units";
  let roles = new Map<string, Role>();
  let theme: Theme | null = null;
  let look: Look = LOOKS.meadow;
  const st = new Map<number, St>();
  const poses = new Map<number, UnitPose>();
  let frame = 0;
  let attached: Stage | null = null;
  const blobs = blobMesh();
  group.add(blobs.mesh);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();

  function role(key: string, elite: boolean): Role {
    const rk = elite ? key + "+e" : key;
    let r = roles.get(rk);
    if (r && r.n < r.cap) return r;
    const cap = r ? r.cap * 2 : 16;
    const model = r?.model ?? (elite ? buildElite(key, look) : buildUnit(key, look));
    const geo = r?.model.geo ?? model.geo;
    const iA = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    const iB = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    if (r) { iA.array.set(r.iA.array); iB.array.set(r.iB.array); }
    iA.setUsage(THREE.DynamicDrawUsage); iB.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("iA", iA); geo.setAttribute("iB", iB);
    const motion = r?.motion ?? { value: new THREE.Vector4(...model.motion) };
    const mat = r?.mesh.material as THREE.Material ?? lit({ kind: "unit", rough: 0.75, extra: { uMotion: motion } });
    const omat = r?.outline.material as THREE.Material ?? outlineMaterial(motion, "#1C1512", model.outline ?? 1);
    const mesh = new THREE.InstancedMesh(geo, mat, cap);
    const outline = new THREE.InstancedMesh(geo, omat, cap);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    outline.instanceMatrix = mesh.instanceMatrix;
    mesh.castShadow = !model.flyer;
    mesh.customDepthMaterial = unitDepthMaterial(motion);
    mesh.frustumCulled = false; outline.frustumCulled = false;
    if (model.flyer) { mesh.renderOrder = 6; outline.renderOrder = 6; }
    if (r) { group.remove(r.mesh, r.outline); r.mesh.dispose(); r.outline.dispose(); mesh.instanceMatrix.array.set(r.mesh.instanceMatrix.array.subarray(0, r.cap * 16)); }
    const nr: Role = { key: rk, model, mesh, outline, iA, iB, cap, n: r?.n ?? 0, motion };
    roles.set(rk, nr);
    group.add(mesh, outline);
    return nr;
  }

  function reset(th: Theme) {
    for (const r of roles.values()) { group.remove(r.mesh, r.outline); r.mesh.dispose(); r.outline.dispose(); r.model.geo.dispose(); }
    roles = new Map();
    theme = th;
    look = LOOKS[th];
    st.clear();
  }

  const state = (id: number): St => {
    let s = st.get(id);
    if (!s) { s = { yaw: 0, phase: Math.random() * 6.28, flash: 0, lastFlash: -1, squash: 0, seen: frame, swing: 0 }; st.set(id, s); }
    s.seen = frame;
    return s;
  };

  function put(r: Role, x: number, y: number, z: number, yaw: number, scale: number, a: [number, number, number, number], b: [number, number, number, number], squash = 0) {
    const i = r.n++;
    q.setFromAxisAngle(up, yaw);
    sc.set(scale * (1 + squash * 0.5), scale * (1 - squash), scale * (1 + squash * 0.5));
    m4.compose(v.set(x, y, z), q, sc);
    r.mesh.setMatrixAt(i, m4);
    r.iA.setXYZW(i, ...a);
    r.iB.setXYZW(i, ...b);
  }

  const units: Units = {
    pose: (id) => poses.get(id) ?? null,
    flash(id, amount = 1) {
      const s = st.get(id);
      if (!s) return;
      const now = performance.now();
      if (now - s.lastFlash < 100) { s.flash = Math.max(s.flash, amount * 0.6); return; }
      s.lastFlash = now; s.flash = amount;
    },
    squash(id, big) { const s = st.get(id); if (s) s.squash = big ? 0.15 : 0.08; },
    height: (kind) => unitSpec(kind).h,
    onEvents(_s, evs) {
      for (const e of evs) {
        if (e.e === "hit") { units.flash(e.target, 1); units.squash(e.target, e.big); }
        else if (e.e === "shatter" || e.e === "stun") units.flash(e.id, 0.6);
      }
    },
    update(stage, b, alpha, dt, t) {
      if (attached !== stage) { attached = stage; stage.scene.add(group); }
      if (theme !== stage.theme) reset(stage.theme);
      frame++;
      for (const r of roles.values()) r.n = 0;
      blobs.n = 0;
      poses.clear();
      const map = stage.map;
      if (b && map) {
        for (const e of b.enemies) drawEnemy(e, map, alpha, dt, t);
        for (const s of b.soldiers) drawSoldier(s, map, b, alpha, dt, t);
      }
      for (const r of roles.values()) {
        r.mesh.count = r.n; r.outline.count = r.n;
        r.mesh.visible = r.outline.visible = r.n > 0;
        r.mesh.instanceMatrix.needsUpdate = true;
        r.iA.needsUpdate = true; r.iB.needsUpdate = true;
      }
      blobs.commit();
      for (const [id, s] of st) if (frame - s.seen > 2) st.delete(id);
    },
  };

  function drawEnemy(e: Enemy, map: { w: number; h: number }, alpha: number, dt: number, t: number) {
    const kind = e.boss?.id ?? e.kind;
    const sp = unitSpec(kind);
    const s = state(e.id);
    const gx = e.px + (e.x - e.px) * alpha, gy = e.py + (e.y - e.py) * alpha;
    const [wx, , wz] = toWorld(map, gx, gy);
    const dx = e.x - e.px, dy = e.y - e.py;
    if (dx * dx + dy * dy > 1e-8) s.yaw = turn(s.yaw, Math.atan2(dx, dy), dt);
    const frozen = e.st.frozen > 0 || e.st.stun > 0 || bodyFx.frozen(e.id);
    const moving = e.speed > 0.01;
    const rate = frozen ? 0 : sp.flyer ? 1 : moving ? Math.max(0.4, e.speed / Math.max(0.1, e.baseSpeed)) : 0.18;
    s.phase += dt * sp.freq * 2 * Math.PI * rate * (e.st.chill > 0 ? 0.7 : 1);
    s.flash = Math.max(0, s.flash - dt / 0.07);
    s.squash = Math.max(0, s.squash - dt / 0.06 * 0.15);
    // the VFX layer owns hit timing: take the stronger of its flash/squash and ours
    s.flash = Math.max(s.flash, bodyFx.flash(e.id)); s.squash = Math.max(s.squash, bodyFx.squash(e.id));
    // readable at 720x390 (critic gate 1): everything 1.45x, elites 1.15x on top, bosses 1.25x
    const scale = (e.boss ? 1.25 : e.elite ? 1.15 * 1.45 : 1.45);
    const stealthA = e.stealth && e.st.revealed <= 0 ? 0.3 : 1;
    const chill = e.st.frozen > 0 ? 0 : Math.min(1, e.st.chill > 0 ? 1 : 0);
    const hex = e.st.hexed > 0 ? 1 : 0, burn = e.st.burnT > 0 ? 1 : 0;
    let pose = 0;
    const tele = e.boss?.tele;
    if (tele) pose = THREE.MathUtils.smoothstep(1 - tele.ticks / Math.max(1, tele.total), 0, 0.35);
    let y = 0;
    let bob = 0;
    if (sp.flyer || e.air) {
      y = Math.max(e.z, sp.flyer ? 1.4 : 0);
      if (e.kind === "bat") { const w = Math.sin(t * 2.3 + e.id) * 0.3; v.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw)).multiplyScalar(w); bob = w; }
    }
    let x = wx + (bob ? v.x : 0), z = wz + (bob ? v.z : 0);
    const flying = e.boss?.flying || (e.kind !== "bat" && sp.flyer);
    if (e.boss?.id === "tyrant" && e.boss.flying) y = Math.max(y, e.z || 2.6);
    // the wyrm: head + body along its trail; burrowed = sunk, a mound shows where it moves
    if (kind === "wyrm") { drawWyrm(e, s, x, z, scale, pose, t); return; }
    const r = role(kind, e.elite && !e.boss);
    put(r, x, y, z, s.yaw, scale, [s.phase, 0, s.flash, chill], [stealthA, hex, burn, pose], s.squash);
    if (kind === "tyrant") r.motion.value.z = e.boss?.flying ? 3 : 0;
    poses.set(e.id, { x, y, z, height: sp.h * scale, yaw: s.yaw, flyer: !!flying || !!sp.flyer });
    // blob shadow: footprint x 1.3; flyers softer and fainter with altitude (0.45 at 1.4 u, 0.32 at 2.0 u)
    const fa = y > 0.2 ? THREE.MathUtils.clamp(0.45 - (y - 1.4) * 0.22, 0.2, 0.45) : 0.38;
    blobs.add(x, z, sp.foot * 1.3 * scale * (1 + y * 0.12), fa * (stealthA < 1 ? 0.5 : 1), e.st.frozen > 0);
    if (e.boss) blobs.ring(x, z, sp.foot * scale * 1.7, t);
  }

  function drawWyrm(e: Enemy, s: St, x: number, z: number, scale: number, pose: number, t: number) {
    const burrowed = !!e.boss?.burrowed || e.z < 0;
    if (!s.trail) { s.trail = []; s.travelled = 0; }
    const tr = s.trail;
    const head = new THREE.Vector3(x, 0, z);
    if (!tr.length || tr[0]!.distanceTo(head) > 0.12) { tr.unshift(head); if (tr.length > 160) tr.pop(); }
    const sink = burrowed ? -2.4 : 0;
    const hr = role("wyrm", false), sr = role("wyrm-seg", false);
    put(hr, x, sink, z, s.yaw, scale, [s.phase, 0, s.flash, 0], [1, 0, 0, pose]);
    poses.set(e.id, { x, y: sink, z, height: unitSpec("wyrm").h, yaw: s.yaw, flyer: false });
    // segments at fixed spacing back along the trail
    let acc = 0, seg = 1;
    const gap = 0.62;
    for (let i = 1; i < tr.length && seg <= 13; i++) {
      acc += tr[i]!.distanceTo(tr[i - 1]!);
      if (acc >= seg * gap) {
        const p = tr[i]!, prev = tr[i - 1]!;
        const yaw = Math.atan2(prev.x - p.x, prev.z - p.z);
        const k = 1 - seg * 0.04;
        put(sr, p.x, sink + Math.sin(t * 2 + seg * 0.8) * 0.05, p.z, yaw, scale * k, [s.phase + seg * 0.6, 0, s.flash * 0.5, 0], [1, 0, 0, 0]);
        blobs.add(p.x, p.z, 1.4 * k, burrowed ? 0 : 0.3, false);
        seg++;
      }
    }
    if (burrowed) { const m = role("mound", false); put(m, x, -0.05, z, s.yaw, 1, [t * 3, 0, 0, 0], [1, 0, 0, 0]); }
    else blobs.add(x, z, 2.0, 0.38, false);
  }

  function drawSoldier(so: Soldier, map: { w: number; h: number }, b: Battle, alpha: number, dt: number, t: number) {
    if (so.state === "dead") return;
    const sp = unitSpec(so.kind);
    const s = state(so.id);
    const gx = so.px + (so.x - so.px) * alpha, gy = so.py + (so.y - so.py) * alpha;
    const [x, , z] = toWorld(map, gx, gy);
    const dx = so.x - so.px, dy = so.y - so.py;
    const moving = dx * dx + dy * dy > 1e-7;
    let want = s.yaw;
    if (so.state === "fighting" && so.target) {
      const en = b.enemies.find((e) => e.id === so.target);
      if (en) want = Math.atan2(en.x - so.x, en.y - so.y);
    } else if (moving) want = Math.atan2(dx, dy);
    s.yaw = turn(s.yaw, want, dt);
    s.phase += dt * sp.freq * 2 * Math.PI * (moving ? 1 : 0.15);
    s.flash = Math.max(0, s.flash - dt / 0.07);
    // two-beat swing: raise 120 ms, strike 80 ms, rest (a 0.9 s cycle) while fighting
    let pose = 0;
    if (so.state === "fighting") {
      s.swing = (s.swing + dt / 0.9) % 1;
      const c = s.swing * 0.9;
      pose = c < 0.12 ? c / 0.12 : c < 0.2 ? 1 - (c - 0.12) / 0.08 : 0;
    } else s.swing = (so.id % 7) / 7;
    const r = role(so.kind, false);
    put(r, x, 0, z, s.yaw, 1.35, [s.phase, 0, s.flash, 0], [1, 0, 0, pose]);
    poses.set(so.id, { x, y: 0, z, height: sp.h * 1.35, yaw: s.yaw, flyer: false });
    blobs.add(x, z, sp.foot * 1.3 * 1.35, 0.38, false);
    void t;
  }

  return units;
}

function turn(cur: number, want: number, dt: number) {
  let d = want - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + d * Math.min(1, dt * EASE_YAW);
}

/** Soft elliptical blob shadows (one instanced quad mesh, multiplied darkness via alpha). */
function blobMesh() {
  const cap = 1024;
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const aB = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2);
  aB.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("aB", aB);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `attribute vec2 aB; varying vec2 vUv; varying vec2 vB;
      void main() { vUv = uv; vB = aB; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; varying vec2 vB;
      void main() { float d = length(vUv - 0.5) * 2.0;
        if (vB.y > 1.5) { float band = smoothstep(0.78, 0.86, d) * (1.0 - smoothstep(0.9, 0.98, d)); gl_FragColor = vec4(1.0, 0.36, 0.22, band * vB.x); return; }
        float a = smoothstep(1.0, 0.25, d) * vB.x;
        vec3 c = mix(vec3(0.0), vec3(0.55, 0.75, 0.9), vB.y); gl_FragColor = vec4(c, a); }`,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  const m4 = new THREE.Matrix4();
  const blobs = {
    mesh, n: 0,
    add(x: number, z: number, d: number, a: number, frozen: boolean) {
      if (blobs.n >= cap || a <= 0) return;
      m4.makeScale(d, 1, d * 0.85).setPosition(x, 0.02, z);
      mesh.setMatrixAt(blobs.n, m4);
      aB.setXY(blobs.n, a, frozen ? 1 : 0);
      blobs.n++;
    },
    /** A boss's ground ring: a bright key-red band round its feet (aB.y = 2 marks the ring style). */
    ring(x: number, z: number, d: number, t: number) {
      if (blobs.n >= cap) return;
      const k = d * (1 + Math.sin(t * 3) * 0.04);
      m4.makeScale(k, 1, k).setPosition(x, 0.03, z);
      mesh.setMatrixAt(blobs.n, m4);
      aB.setXY(blobs.n, 0.85, 2);
      blobs.n++;
    },
    commit() { mesh.count = blobs.n; mesh.instanceMatrix.needsUpdate = true; aB.needsUpdate = true; },
  };
  return blobs;
}
