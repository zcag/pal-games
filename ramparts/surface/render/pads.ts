// Build pads (art 3.8, R4, R25): flagstone discs that look clickable; states from Focus (hover lift and
// lit rim, selected gold dashed ring, keyboard brackets), high ground raised on a rock plinth, rubble,
// bonus pads with a gold inlay. Built pads keep their rim visible round the tower base.
import * as THREE from "../vendor/three.js";
import type { Battle, BattleMap, Tower } from "../../game/types.ts";
import { focus, toWorld, type Stage } from "./api.ts";
import { Kit, TAU } from "./models/kit.ts";
import { lit, flagMaterial } from "./mats.ts";
import type { Look } from "./palette.ts";
import { SHARED } from "./palette.ts";
import { Field, PAD_R } from "./world/field.ts";
import { bannerCloth } from "./models/props.ts";

export const PAD_H = 0.14;
export const HIGH_H = 0.5;
const easeOutBack = (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

export interface Pads {
  group: THREE.Group;
  /** Top of a pad's stone in world Y (towers stand here), including the hover lift. */
  top(id: number): number;
  update(stage: Stage, t: number, dt: number, b: Battle | null): void;
  /** Buff glow on a pad rim (accent hex, 0 = off), set by towers each frame. */
  glow(id: number, color: string | null, stacks?: number): void;
}

function padGeo(look: Look, kind: "plain" | "high" | "bonus") {
  const k = new Kit();
  const stone = new THREE.Color(SHARED.pad).lerp(new THREE.Color(look.ground), 0.15);
  const groove = SHARED.padGroove;
  const y0 = kind === "high" ? HIGH_H - PAD_H : 0;
  if (kind === "high") {
    // a rock plinth under the pad
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      k.dodeca(0.42, { at: [Math.cos(a) * 0.62, 0.12, Math.sin(a) * 0.62], scale: [1.1, 0.9, 1.1], color: "#8A8070", jitter: 0.06, seed: i, shade: 0.1 });
    }
    k.cyl(PAD_R + 0.08, PAD_R + 0.3, y0, 9, { at: [0, y0 / 2, 0], color: "#958B7A", jitter: 0.05 });
  }
  // the disc: outer ring, a groove, the inner face
  k.cyl(PAD_R, PAD_R + 0.04, PAD_H, 14, { at: [0, y0 + PAD_H / 2, 0], color: stone, shade: 0.05, jitter: 0.008 });
  k.cyl(PAD_R - 0.13, PAD_R - 0.13, 0.012, 14, { at: [0, y0 + PAD_H + 0.002, 0], color: groove, shade: 0 });
  k.cyl(PAD_R - 0.18, PAD_R - 0.17, 0.02, 14, { at: [0, y0 + PAD_H + 0.008, 0], color: stone.clone().multiplyScalar(1.07), shade: 0.03 });
  // four notches on the rim
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    k.box(0.1, PAD_H * 0.7, 0.16, { at: [Math.cos(a) * (PAD_R - 0.02), y0 + PAD_H * 0.65, Math.sin(a) * (PAD_R - 0.02)], rot: [0, -a, 0], color: groove });
  }
  if (kind === "bonus") k.torus(PAD_R - 0.07, 0.025, 4, 18, { at: [0, y0 + PAD_H + 0.004, 0], rot: [Math.PI / 2, 0, 0], color: SHARED.gold });
  return k.build();
}

function plusGeo() {
  const k = new Kit();
  k.box(0.42, 0.012, 0.09, { at: [0, 0, 0], color: SHARED.padGroove, shade: 0 });
  k.box(0.09, 0.012, 0.42, { at: [0, 0, 0], color: SHARED.padGroove, shade: 0 });
  return k.build();
}

function rubbleGeo() {
  const k = new Kit();
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, r = 0.12 + (i % 3) * 0.17;
    k.dodeca(0.13 + (i % 2) * 0.07, { at: [Math.cos(a) * r, 0.08, Math.sin(a) * r], scale: [1.2, 0.7, 1], color: i % 2 ? "#8C8478" : "#A39A8A", jitter: 0.03, seed: i });
  }
  k.box(0.5, 0.06, 0.12, { at: [0.15, 0.2, -0.1], rot: [0.2, 0.7, 0.3], color: "#7A5E40" });
  return k.build();
}

function ringGeo(r: number, w: number, dashes: number) {
  const pos: number[] = [];
  const seg = dashes * 4;
  for (let i = 0; i < seg; i++) {
    if (dashes && i % 4 === 3) continue;
    const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
    const p = (a: number, rr: number) => [Math.cos(a) * rr, 0, Math.sin(a) * rr];
    pos.push(...p(a0, r - w), ...p(a1, r - w), ...p(a1, r), ...p(a0, r - w), ...p(a1, r), ...p(a0, r));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

export function createPads(f: Field, look: Look, map: BattleMap): Pads {
  const group = new THREE.Group();
  group.name = "pads";
  const N = map.pads.length;
  const kinds = map.pads.map((p) => (p.high ? "high" : p.bonus ? "bonus" : "plain") as "plain" | "high" | "bonus");
  const mat = lit({ kind: "top", rough: 0.85 });
  const meshes: Record<string, THREE.InstancedMesh> = {};
  const slot = new Map<number, { mesh: THREE.InstancedMesh; i: number }>();
  for (const kind of ["plain", "high", "bonus"] as const) {
    const ids = map.pads.filter((_, i) => kinds[i] === kind);
    if (!ids.length) continue;
    const im = new THREE.InstancedMesh(padGeo(look, kind), mat, ids.length);
    im.castShadow = true; im.receiveShadow = true;
    ids.forEach((p, i) => slot.set(p.id, { mesh: im, i }));
    meshes[kind] = im;
    group.add(im);
  }
  const plus = new THREE.InstancedMesh(plusGeo(), mat, N);
  // the rune: a glowing ring and plus in the groove (additive, brightness per pad)
  const rg = new Kit();
  rg.torus(0.5, 0.025, 3, 28, { rot: [Math.PI / 2, 0, 0], color: "#FFFFFF", shade: 0 });
  rg.box(0.46, 0.01, 0.06, { color: "#FFFFFF", shade: 0 });
  rg.box(0.06, 0.01, 0.46, { color: "#FFFFFF", shade: 0 });
  const runes = new THREE.InstancedMesh(rg.build(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), N);
  runes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  runes.renderOrder = 3;
  group.add(runes);
  group.add(plus);
  const rubbles = map.pads.filter((p) => p.rubble);
  const rubble = rubbles.length ? new THREE.InstancedMesh(rubbleGeo(), mat, rubbles.length) : null;
  if (rubble) { rubble.castShadow = true; group.add(rubble); }
  // pennant: stake + flag at the pad's back-right
  const stake = new Kit();
  stake.cyl(0.022, 0.028, 0.62, 5, { at: [0, 0.31, 0], color: "#6A5038" });
  stake.ico(0.035, 0, { at: [0, 0.64, 0], color: SHARED.gold });
  const stakes = new THREE.InstancedMesh(stake.build(), mat, N);
  stakes.castShadow = true;
  group.add(stakes);
  const flagGeo = bannerCloth(0.3, 0.13, SHARED.blue, SHARED.gold);
  const flags: THREE.Mesh[] = map.pads.map(() => { const m = new THREE.Mesh(flagGeo, flagMaterial()); group.add(m); return m; });
  // rim glow (hover / buffs): additive ring, colour scaled per instance
  const rimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const rim = new THREE.InstancedMesh(ringGeo(PAD_R + 0.03, 0.11, 0), rimMat, N);
  rim.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  rim.renderOrder = 3;
  group.add(rim);
  // selected: gold dashed ring rotating; keyboard focus: four bracket corners
  const sel = new THREE.Mesh(ringGeo(PAD_R + 0.28, 0.07, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(SHARED.focusGold).multiplyScalar(0.95), transparent: true, depthWrite: false }));
  sel.visible = false;
  group.add(sel);
  const bk = new Kit();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4, r = PAD_R + 0.2;
    const g = new Kit();
    g.box(0.26, 0.03, 0.06, { at: [0.1, 0, 0], color: SHARED.focusGold, shade: 0 });
    g.box(0.06, 0.03, 0.26, { at: [0, 0, 0.1], color: SHARED.focusGold, shade: 0 });
    bk.merge(g, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI * 1.25), new THREE.Vector3(1, 1, 1)));
  }
  const brackets = new THREE.Mesh(bk.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
  brackets.visible = false;
  group.add(brackets);

  const lift = new Float32Array(N);       // 0..1 hover progress
  const glowCol: (THREE.Color | null)[] = map.pads.map(() => null);
  const idx = new Map(map.pads.map((p, i) => [p.id, i]));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  const zero = new THREE.Vector3(0, 0, 0);
  const c = new THREE.Color();
  const hover = new THREE.Color(SHARED.hoverRim);
  const padPos = map.pads.map((p) => new THREE.Vector3(...toWorld(map, p.x, p.y)));
  const built = new Map<number, Tower>();
  const rune = new THREE.Color(SHARED.focusGold);
  let runeK = 0.3;

  const pads: Pads = {
    group,
    top(id) {
      const i = idx.get(id);
      if (i === undefined) return PAD_H;
      return (map.pads[i]!.high ? HIGH_H : PAD_H) + easeOutBack(Math.min(1, lift[i]!)) * 0.08 * (built.has(id) ? 0 : 1);
    },
    glow(id, color) { const i = idx.get(id); if (i !== undefined) glowCol[i] = color ? new THREE.Color(color) : null; },
    update(_stage, t, dt, b) {
      built.clear();
      if (b) for (const tw of b.towers) built.set(tw.pad, tw);
      const sp = focus.selectedPad;
      // empty pads breathe a faint gold rune glow: clear in setup, dim while a wave runs
      const want = !b || b.phase === "setup" ? 0.55 : b.enemies.length ? 0.12 : 0.3;
      runeK += (want - runeK) * Math.min(1, dt * 3);
      map.pads.forEach((p, i) => {
        const on = focus.pad === p.id || sp === p.id;
        lift[i] = THREE.MathUtils.clamp(lift[i]! + (on ? dt / 0.12 : -dt / 0.12), 0, 1);
        const y = easeOutBack(lift[i]!) * 0.08 * (built.has(p.id) ? 0 : 1);
        const base = padPos[i]!;
        const sl = slot.get(p.id)!;
        m4.compose(v.set(base.x, y, base.z), q.identity(), s1);
        sl.mesh.setMatrixAt(sl.i, m4);
        const top = (p.high ? HIGH_H : PAD_H) + y;
        const empty = !built.has(p.id) && !p.rubble;
        m4.compose(v.set(base.x, top + 0.012, base.z), q.identity(), empty ? s1 : zero);
        plus.setMatrixAt(i, m4);
        m4.compose(v.set(base.x, top + 0.02, base.z), q.identity(), empty ? s1 : zero);
        runes.setMatrixAt(i, m4);
        runes.setColorAt(i, c.copy(rune).multiplyScalar(empty ? runeK * (0.75 + 0.25 * Math.sin(t * 2.2 + i * 0.9)) + lift[i]! * 0.4 : 0));
        // the stake sits on the back-right of the rim; hidden once built
        const sa = -Math.PI / 4;
        const sx = base.x + Math.cos(sa) * (PAD_R - 0.06), sz = base.z + Math.sin(sa) * (PAD_R - 0.06);
        m4.compose(v.set(sx, top - 0.05, sz), q.identity(), built.has(p.id) ? zero : s1);
        stakes.setMatrixAt(i, m4);
        const fl = flags[i]!;
        fl.visible = !built.has(p.id);
        fl.position.set(sx, top + 0.57 + (on ? 0.02 : 0), sz);
        fl.rotation.y = on ? 0.4 : Math.sin(t * 1.2 * TAU * 0.1 + i) * 0.4;
        // rim light: hover glow (just under the bloom threshold), else a buff's accent at 0.6
        const g = glowCol[i];
        if (lift[i]! > 0) c.copy(hover).multiplyScalar(0.55 * lift[i]!);
        else if (g) c.copy(g).multiplyScalar(0.35 + 0.1 * Math.sin(t * 3 + i));
        else c.setRGB(0, 0, 0);
        rim.setColorAt(i, c);
        m4.compose(v.set(base.x, top + 0.004, base.z), q.identity(), s1);
        rim.setMatrixAt(i, m4);
      });
      if (rubble) rubbles.forEach((p, i) => { const pp = padPos[idx.get(p.id)!]!; m4.compose(v.set(pp.x, PAD_H, pp.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.id), s1); rubble.setMatrixAt(i, m4); });
      for (const m of Object.values(meshes)) m.instanceMatrix.needsUpdate = true;
      plus.instanceMatrix.needsUpdate = true; runes.instanceMatrix.needsUpdate = true; if (runes.instanceColor) runes.instanceColor.needsUpdate = true; stakes.instanceMatrix.needsUpdate = true; rim.instanceMatrix.needsUpdate = true;
      if (rim.instanceColor) rim.instanceColor.needsUpdate = true;
      if (rubble) rubble.instanceMatrix.needsUpdate = true;
      const si = sp !== null ? idx.get(sp) : undefined;
      sel.visible = si !== undefined;
      if (si !== undefined) { const p = map.pads[si]!; sel.position.set(padPos[si]!.x, pads.top(p.id) + 0.01, padPos[si]!.z); sel.rotation.y = t * 0.1 * TAU; }
      const fi = focus.pad !== null ? idx.get(focus.pad) : undefined;
      brackets.visible = fi !== undefined && !!focus.keys;
      if (fi !== undefined) { const p = map.pads[fi]!; brackets.position.set(padPos[fi]!.x, pads.top(p.id) + 0.02, padPos[fi]!.z); const k = 1 + Math.sin(t * 6) * 0.04; brackets.scale.set(k, 1, k); }
    },
  };
  void f;
  return pads;
}
