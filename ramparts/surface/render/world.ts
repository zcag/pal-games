// World build: the floating slab for a battle map (or a menu vista), its dressing and atmosphere.
import * as THREE from "../vendor/three.js";
import type { Battle, BattleMap } from "../../game/types.ts";
import type { Stage } from "./api.ts";
import { LOOKS } from "./palette.ts";
import { Field, MARGIN, mulberry } from "./world/field.ts";
import { cliffMesh, groundMesh, hangers } from "./world/terrain.ts";
import { clouds, silhouettes } from "./world/sky.ts";
import { vistaMap } from "./world/vista.ts";
import { water } from "./world/water.ts";
import { dress } from "./world/dress.ts";
import { ambient } from "./world/ambient.ts";
import { landmark } from "./world/landmark.ts";
import { titleFx } from "./world/titlefx.ts";
import { createPads, type Pads } from "./pads.ts";

export interface WorldView {
  group: THREE.Group;
  field: Field;
  pads: Pads | null;
  /** True for a menu backdrop (no battle map). */
  vista: boolean;
  /** Points the battle camera keeps in frame: the content box (lanes, pads, gates + margin) at ground and tower height. */
  content: THREE.Vector3[];
  update(t: number, dt: number, b: Battle | null): void;
}

export function buildWorld(stage: Stage, map: BattleMap | null, lookKey: keyof typeof LOOKS): WorldView {
  const look = LOOKS[lookKey];
  const vista = !map;
  const m = map ?? vistaMap(lookKey);
  const group = new THREE.Group();
  const f = new Field(m);
  const rnd = mulberry(m.seed * 9301 + 49297);
  const updates: ((t: number, dt: number, b: Battle | null) => void)[] = [];

  // gates and big props claim flat ground first, so the terrain flattens under them
  const dressing = dress(f, look, lookKey, rnd, vista);
  const ground = groundMesh(f, look, lookKey);
  const { mesh: cliff, per } = cliffMesh(f, look);
  group.add(ground, cliff, hangers(f, look, lookKey, per, rnd));
  group.add(dressing.group);
  updates.push(dressing.update);
  const wat = water(f, look, per, rnd);
  group.add(wat.group);
  updates.push(wat.update);
  group.add(silhouettes(look, lookKey, m.seed));
  if (!vista && !(m as { showroom?: boolean }).showroom) { const lm = landmark(look, lookKey, f.W2, f.H2, m.seed); group.add(lm.group); updates.push((t, dt) => lm.update(t, dt)); }
  if (vista && lookKey === "title") {
    const ex = f.ends.find((e) => e.kind === "exit");
    const tf = titleFx(look, new THREE.Vector3(ex ? ex.x + ex.dx * 3 : 4, 0, ex ? ex.z + ex.dz * 3 : 0));
    group.add(tf.group); updates.push((t) => tf.update(t));
  }
  const cl = clouds(look, f.W2, f.H2, m.seed, vista);
  group.add(cl.mesh);
  updates.push((t) => cl.update(t));
  const amb = ambient(f, look);
  group.add(amb.mesh);
  updates.push(amb.update);
  let pads: Pads | null = null;
  if (!vista) {
    pads = createPads(f, look, m);
    group.add(pads.group);
    updates.push((t, dt, b) => pads!.update(stage, t, dt, b));
  }
  // the content box: lanes, pads and gates, plus a margin, clamped to the slab
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  const grow = (x: number, z: number, r: number) => { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); z0 = Math.min(z0, z - r); z1 = Math.max(z1, z + r); };
  for (const l of m.lanes) for (const p of l.points) grow(p.x - m.w / 2, p.y - m.h / 2, 1.5);
  for (const p of m.pads) grow(p.x - m.w / 2, p.y - m.h / 2, 0.8 + 1.0);
  const gates = f.ends.map((e) => new THREE.Vector3(e.x + e.dx * MARGIN * 0.62, 0, e.z + e.dz * MARGIN * 0.62));
  f.ends.forEach((e, i) => grow(gates[i]!.x, gates[i]!.z, e.kind === "exit" ? 2.4 : 1.5));
  x0 = Math.max(x0, -f.W2); x1 = Math.min(x1, f.W2); z0 = Math.max(z0, -f.H2); z1 = Math.min(z1, f.H2);
  const content: THREE.Vector3[] = [];
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] as const) { content.push(new THREE.Vector3(x, 0, z)); if (z === z0) content.push(new THREE.Vector3(x, 2.4, z)); }
  for (const g of gates) content.push(new THREE.Vector3(g.x, 4.6, g.z), new THREE.Vector3(g.x, 0, g.z + 1.4));
  return {
    group, field: f, pads, vista, content,
    update(t, dt, b) { for (const u of updates) u(t, dt, b); },
  };
}
