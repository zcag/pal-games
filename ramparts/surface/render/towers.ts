// Towers (art 4): one object per tower id, synced to the Battle. Build (parts drop in bottom to top
// with easeOutBack), upgrade (squash, new parts stack in), specialise (light column, crown drops),
// sell (crumble into the pad), heads that turn to aim (max 540 deg/s), idle loops with random phases,
// firing kick, disabled grey, a gold outline when hovered or selected, a rally flag when selected,
// and support-aura glows on buffed pad rims.
import * as THREE from "../vendor/three.js";
import type { Battle, BattleEvent, Tower, TowerId } from "../../game/types.ts";
import { focus, toWorld, type Stage } from "./api.ts";
import { flagMaterial, lit } from "./mats.ts";
import { towerModel, cloth, type TowerModel } from "./models/towers.ts";
import { ACCENT, SHARED } from "./palette.ts";
import type { RampartsStage } from "./stage.ts";
import { statsOf } from "../../game/content/battle/towers.ts";

export interface Towers {
  onEvents(s: Stage, e: readonly BattleEvent[], b: Battle): void;
  update(s: Stage, b: Battle | null, a: number, dt: number, t: number): void;
  /** World position projectiles leave from (head yaw applied). */
  muzzle(id: number, out?: THREE.Vector3): THREE.Vector3 | null;
  /** World Y of the tower's top (for floating UI). */
  top(id: number): number | null;
  /** Play the firing kick (shoot events do this already). */
  kick(id: number): void;
}

const BUILD_S = 0.52, UPGRADE_S = 0.6, SPEC_S = 0.9, SELL_S = 0.5;

const VERT_HEAD = `attribute float aOrd; attribute vec3 aHull; uniform float uBuild, uH, uSell;`;
const VERT_BEGIN = `{
  float ord = clamp(aOrd / max(uH, 0.1), 0.0, 1.0);
  float p = clamp((uBuild - ord * 0.6) / 0.4, 0.0, 1.0);
  float q = p - 1.0; float e = 1.0 + 2.70158 * q * q * q + 1.70158 * q * q;
  transformed.y += (1.0 - e) * 1.5;
  if (p <= 0.0) transformed.y -= 40.0;
  float s = uSell; transformed.y -= s * s * (0.4 + ord * 1.6) * uH; transformed.xz += aHull.xz * s * 0.25; transformed.xz *= 1.0 - s * 0.3;
}`;

interface TObj {
  id: number; kind: TowerId; level: number; spec: string | null; pad: number;
  group: THREE.Group; body: THREE.Mesh; head: THREE.Mesh | null; headPivot: THREE.Group; spin: THREE.Mesh | null; flags: THREE.Mesh[];
  outline: THREE.Mesh;
  model: TowerModel;
  u: { uGrey: { value: number }; uFlash: { value: number }; uBuild: { value: number }; uH: { value: number }; uSell: { value: number } };
  anim: { kind: "build" | "upgrade" | "spec" | "sell" | null; t: number; dur: number };
  yaw: number; kick: number; phase: number; grey: number; seen: number;
  column: THREE.Mesh | null;
}

export function createTowers(): Towers {
  const group = new THREE.Group();
  group.name = "towers";
  const objs = new Map<number, TObj>();
  let attached: Stage | null = null;
  let frame = 0;
  let mapRef: unknown = null;
  const flagMat = flagMaterial();
  const outlineMat = goldOutline();
  const rally = rallyFlag();
  rally.visible = false;
  group.add(rally);
  // ghost preview of a tower option on the selected pad (art 8: "ghost tower at 35%")
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xfff4dc, transparent: true, opacity: 0.35, depthWrite: false });
  const ghost = new THREE.Mesh(new THREE.BufferGeometry(), ghostMat);
  ghost.visible = false;
  group.add(ghost);
  let ghostKey = "";
  const aoGeo = new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2);
  const aoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.04, 0.03, 0.05, smoothstep(1.0, 0.5, d) * 0.4); }",
  });
  const colGeo = new THREE.CylinderGeometry(0.3, 0.3, 6, 16, 1, true).translate(0, 3, 0);

  function material(o: Pick<TObj, "u">) {
    return lit({ kind: "tower", rough: 0.85, extra: o.u as unknown as Record<string, THREE.IUniform>, vertHead: VERT_HEAD, vertBegin: VERT_BEGIN, key: "tower" });
  }

  function setModel(o: TObj, m: TowerModel) {
    o.model = m;
    o.body.geometry = m.body;
    o.outline.geometry = m.body;
    if (o.head) { o.headPivot.remove(o.head); o.head = null; }
    if (o.spin) { o.group.remove(o.spin); o.spin = null; }
    for (const f of o.flags) o.group.remove(f);
    o.flags = [];
    const mat = o.body.material as THREE.Material;
    if (m.head) { o.head = new THREE.Mesh(m.head, mat); o.head.castShadow = true; o.headPivot.add(o.head); }
    o.headPivot.position.y = m.headY;
    if (m.spin) { o.spin = new THREE.Mesh(m.spin, mat); o.spin.position.y = m.spinY; o.spin.castShadow = true; o.group.add(o.spin); }
    for (const f of m.flags) {
      const fm = new THREE.Mesh(f.geo, flagMat);
      fm.position.set(...f.at); fm.rotation.y = f.rotY; fm.castShadow = true;
      o.group.add(fm); o.flags.push(fm);
    }
    o.u.uH.value = m.height;
  }

  function create(tw: Tower, stage: Stage): TObj {
    const u = { uGrey: { value: 0 }, uFlash: { value: 0 }, uBuild: { value: 0 }, uH: { value: 2 }, uSell: { value: 0 } };
    const g = new THREE.Group();
    const mat = material({ u });
    const m = towerModel(tw.kind, tw.level, tw.spec);
    const body = new THREE.Mesh(m.body, mat);
    body.castShadow = true; body.receiveShadow = true;
    const outline = new THREE.Mesh(m.body, outlineMat);
    outline.visible = false;
    const headPivot = new THREE.Group();
    const ao = new THREE.Mesh(aoGeo, aoMat);
    ao.position.y = -0.1; ao.renderOrder = 1;
    g.add(body, outline, headPivot, ao);
    const o: TObj = {
      id: tw.id, kind: tw.kind, level: tw.level, spec: tw.spec, pad: tw.pad, group: g, body, head: null, headPivot, spin: null, flags: [], outline, model: m, u,
      anim: { kind: "build", t: 0, dur: BUILD_S }, yaw: 0, kick: 0, phase: Math.random() * 10, grey: 0, seen: frame, column: null,
    };
    setModel(o, m);
    // face the road at first: toward the aim point
    const pad = stage.map!.pads.find((p) => p.id === tw.pad);
    if (pad) o.yaw = Math.atan2(tw.aimX - pad.x, tw.aimY - pad.y);
    group.add(g);
    objs.set(tw.id, o);
    return o;
  }

  function column(o: TObj, color: string) {
    const m = new THREE.Mesh(colGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.9), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    o.group.add(m);
    o.column = m;
  }

  const towers: Towers = {
    muzzle(id, out = new THREE.Vector3()) {
      const o = objs.get(id);
      if (!o) return null;
      const [mx, my, mz] = o.model.muzzle;
      if (o.head) { out.set(mx, my, mz).applyAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw).add(new THREE.Vector3(0, o.model.headY, 0)); }
      else out.set(mx, my, mz);
      return out.add(o.group.position);
    },
    top(id) { const o = objs.get(id); return o ? o.group.position.y + o.model.height : null; },
    kick(id) { const o = objs.get(id); if (o) o.kick = 1; },
    onEvents(_s, evs) {
      for (const e of evs) if (e.e === "shoot") towers.kick(e.tower);
    },
    update(stage, b, _alpha, dt, t) {
      if (attached !== stage) { attached = stage; stage.scene.add(group); }
      if (mapRef !== stage.map) {
        // new battle: drop everything
        for (const o of objs.values()) group.remove(o.group);
        objs.clear();
        mapRef = stage.map;
      }
      frame++;
      const map = stage.map;
      const rs = stage as RampartsStage;
      const pads = rs.worldView?.pads ?? null;
      if (!b || !map) { rally.visible = false; return; }
      const padOf = new Map(map.pads.map((p) => [p.id, p]));
      // buffs: banner auras (and lighthouse) glow on the pad rims of towers inside them
      if (pads) for (const p of map.pads) pads.glow(p.id, null);
      for (const tw of b.towers) {
        if (tw.kind !== "banner" && tw.spec !== "lighthouse") continue;
        const src = padOf.get(tw.pad);
        if (!src) continue;
        let r = 2.6;
        try { r = statsOf(tw.kind, Math.min(3, tw.level), tw.spec).range; } catch { /* content not ready */ }
        for (const other of b.towers) {
          if (other.id === tw.id) continue;
          const p = padOf.get(other.pad);
          if (p && Math.hypot(p.x - src.x, p.y - src.y) <= r) pads?.glow(p.id, tw.spec && ACCENT[tw.spec] ? ACCENT[tw.spec]! : ACCENT[tw.kind]!);
        }
      }
      for (const tw of b.towers) {
        let o = objs.get(tw.id);
        if (!o) o = create(tw, stage);
        o.seen = frame;
        if (o.anim.kind === "sell") { o.anim = { kind: "build", t: 1, dur: BUILD_S }; o.u.uSell.value = 0; }
        // level / spec changes
        if (tw.level !== o.level || tw.spec !== o.spec) {
          const specd = tw.level >= 4 && o.level < 4;
          o.level = tw.level; o.spec = tw.spec;
          setModel(o, towerModel(tw.kind, tw.level, tw.spec));
          o.anim = specd ? { kind: "spec", t: 0, dur: SPEC_S } : { kind: "upgrade", t: 0, dur: UPGRADE_S };
          if (specd) { column(o, ACCENT[tw.spec ?? ""] ?? ACCENT[tw.kind]!); stage.shake(0.05); }
        }
        const pad = padOf.get(tw.pad);
        if (!pad) continue;
        const [x, , z] = toWorld(map, pad.x, pad.y);
        o.group.position.set(x, pads ? pads.top(pad.id) : 0.14, z);
        animate(o, dt);
        // aim: turn the head toward the aim point (eased, capped at 540 deg/s); idle loops otherwise
        let want = o.yaw;
        if (tw.target) want = Math.atan2(tw.aimX - pad.x, tw.aimY - pad.y);
        else if (o.model.idle === "scan") want = o.yaw + Math.sin(t * 0.5 + o.phase) * 0.004;
        else if (o.model.idle === "sweep") want = o.yaw + dt * 0.6;
        let d = want - o.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const maxStep = THREE.MathUtils.degToRad(540) * dt;
        o.yaw += THREE.MathUtils.clamp(d * Math.min(1, dt * 12), -maxStep, maxStep);
        o.headPivot.rotation.y = o.yaw;
        o.kick = Math.max(0, o.kick - dt / 0.28);
        const k = o.kick > 0.7 ? (1 - o.kick) / 0.3 : o.kick / 0.7; // 80 ms out, 200 ms settle
        if (o.head) o.head.position.z = -o.model.recoil * k;
        if (o.spin) {
          o.spin.rotation.y += dt * o.model.spinSpeed * (1 + o.kick * 4);
          o.spin.position.y = o.model.spinY + Math.sin(t * 1.6 + o.phase) * o.model.bob;
          if (o.kind === "pyre") { const f = 1 + Math.sin(t * 13 + o.phase) * 0.06 + Math.sin(t * 7.3) * 0.05 + o.kick * 0.25; o.spin.scale.set(f, f * (1 + o.kick * 0.2), f); }
        }
        // disabled: grey 40%
        o.grey += ((tw.disabled > 0 ? 0.4 : 0) - o.grey) * Math.min(1, dt * 8);
        o.u.uGrey.value = o.grey;
        o.outline.visible = (focus.tower === tw.id || (focus.pad === tw.pad && focus.selectedPad === null) || focus.selectedPad === tw.pad) && !o.anim.kind;
      }
      // sold / gone: crumble into the pad
      for (const [id, o] of objs) {
        if (o.seen === frame) continue;
        if (o.anim.kind !== "sell") { o.anim = { kind: "sell", t: 0, dur: SELL_S }; o.outline.visible = false; }
        animate(o, dt);
        if (o.anim.kind === null) { group.remove(o.group); objs.delete(id); }
      }
      const gh = focus.ghost;
      const gpad = gh ? padOf.get(gh.pad) : undefined;
      ghost.visible = !!gh && !!gpad && !b.towers.some((tw) => tw.pad === gh.pad);
      if (ghost.visible && gh && gpad) {
        if (ghostKey !== gh.tower) { ghostKey = gh.tower; ghost.geometry = towerModel(gh.tower, 1, null).body; }
        const [x, , z] = toWorld(map, gpad.x, gpad.y);
        ghost.position.set(x, pads ? pads.top(gpad.id) : 0.14, z);
        ghostMat.opacity = 0.3 + Math.sin(t * 4) * 0.05;
      }
      // rally flag for the selected barracks / treant
      const sel = focus.tower !== null ? b.towers.find((tw) => tw.id === focus.tower) : null;
      const rp = focus.rally ?? sel?.rally ?? null;
      rally.visible = !!rp && !!sel;
      if (rp && rally.visible) {
        const [x, , z] = toWorld(map, rp.x, rp.y);
        rally.position.set(x, 0, z);
      }
    },
  };

  function animate(o: TObj, dt: number) {
    const a = o.anim;
    if (!a.kind) { o.u.uBuild.value = 1; o.group.scale.set(1, 1, 1); return; }
    a.t = Math.min(1, a.t + dt / a.dur);
    if (a.kind === "build") o.u.uBuild.value = a.t;
    else if (a.kind === "upgrade") {
      // squash to 0.9 height (first 100 ms), then the upper parts stack in
      const sq = a.t < 0.17 ? 1 - 0.1 * (a.t / 0.17) : 0.9 + 0.1 * Math.min(1, (a.t - 0.17) / 0.3);
      o.group.scale.set(1 + (1 - sq) * 0.4, sq, 1 + (1 - sq) * 0.4);
      o.u.uBuild.value = 0.5 + 0.5 * a.t;
    } else if (a.kind === "spec") {
      o.u.uBuild.value = 0.62 + 0.38 * Math.min(1, a.t * 1.4);
      if (o.column) { (o.column.material as THREE.MeshBasicMaterial).opacity = 0.5 * Math.sin(Math.PI * a.t); o.column.scale.set(1 + a.t * 0.4, 1, 1 + a.t * 0.4); }
    } else if (a.kind === "sell") o.u.uSell.value = a.t;
    if (a.t >= 1) {
      if (o.column) { o.group.remove(o.column); o.column = null; }
      o.group.scale.set(1, 1, 1);
      a.kind = null; o.u.uBuild.value = 1;
    }
  }

  return towers;
}

/** Gold hull for the hovered/selected tower (art 3.2: #FFD36B, 0.05 u). */
function goldOutline() {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(SHARED.focusGold).multiplyScalar(0.9), side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aHull;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += aHull * 0.05;");
  };
  m.customProgramCacheKey = () => "rp-gold-hull";
  return m;
}

/** The rally point flag (art 3.7): a small blue flag on the road. */
function rallyFlag() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.7, 5).translate(0, 0.35, 0), lit({ kind: "world", fog: false }));
  pole.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pole.geometry.attributes.position!.count * 3).fill(0.3), 3));
  const f = new THREE.Mesh(cloth(0.34, 0.22, SHARED.blue, SHARED.gold), flagMaterial());
  f.position.y = 0.68;
  g.add(pole, f);
  return g;
}
