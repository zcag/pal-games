// Shared state of the fx systems: the batches, fx time, world mapping and a pool of timed
// effects. A timed effect is a preallocated record plus a static draw function; drawing it
// each frame pushes sprites, decals and lines. Nothing allocates per frame.
import * as THREE from "../../vendor/three.js";
import type { Battle, BattleMap, Enemy, Pad, Theme, Tower } from "../../../game/types.ts";
import type { Stage } from "../api.ts";
import { Decals } from "./gl/decals.ts";
import { Lines } from "./gl/lines.ts";
import { Meshes } from "./gl/meshes.ts";
import { Sprites } from "./gl/sprites.ts";

export type FxFn = (c: Ctx, f: Timed, t: number, age: number) => void;
export interface Timed {
  fn: FxFn | null;
  t0: number; dur: number;
  x: number; y: number; z: number; r: number;
  a: number; b: number; c: number; d: number; e: number;
  id: number; seed: number;
  col: readonly [number, number, number];
  pts: Float32Array; n: number;
}

const POOL = 1536;
const BLACK = [0, 0, 0] as const;
function blank(): Timed {
  return { fn: null, t0: 0, dur: 0, x: 0, y: 0, z: 0, r: 0, a: 0, b: 0, c: 0, d: 0, e: 0, id: 0, seed: 0, col: BLACK, pts: new Float32Array(48), n: 0 };
}

export class Ctx {
  /** fx time (s): stops during hitstop, slows in slow motion. */
  T = 0;
  /** real time (s). */
  RT = 0;
  dt = 0;
  map: BattleMap | null = null;
  theme: Theme = "meadow";
  b: Battle | null = null;
  alpha = 1;
  ox = 0; oz = 0;
  /** css viewport and ui scale. */
  vw = 720; vh = 390; ui = 1;
  /** Game speed (1/2/3) as set by the lead. */
  speed = 1;

  readonly ground = new Decals(1400, 1);
  /** Boss telegraphs again, faint and undepth-tested, so a huge boss body never hides its own warning. */
  readonly groundTop = new Decals(32, 7, false);
  readonly under = new Sprites(5000, { order: 2, push: 1.6 });
  readonly over = new Sprites(7000, { order: 5 });
  /** Pulled toward the camera: drawn over the unit they sit on (statuses, hit sparks). */
  readonly body = new Sprites(3000, { order: 5, push: -0.9 });
  readonly lines = new Lines(4000, 6);
  readonly groundLines = new Lines(600, 1);
  readonly ice: Meshes; readonly bubble: Meshes; readonly oil: Meshes;
  readonly chunk: Meshes; readonly shaft: Meshes; readonly ball: Meshes; readonly shard: Meshes; readonly spike: Meshes; readonly bolt: Meshes;

  private pool: Timed[] = [];
  private live = 0;
  private next = 0;

  constructor(readonly stage: Stage) {
    const ico = new THREE.IcosahedronGeometry(1, 0);
    this.ice = new Meshes(ico, 260, { order: 4, rim: 0xffffff, flat: true });
    this.bubble = new Meshes(new THREE.SphereGeometry(1, 18, 12), 260, { order: 4, rim: 0xbff6ff });
    const skirt = new THREE.CylinderGeometry(1, 1.12, 1, 10, 1, true);
    this.oil = new Meshes(skirt, 260, { order: 3, rim: 0x9c8a78 });
    this.chunk = new Meshes(new THREE.DodecahedronGeometry(1, 0), 700, { order: 3, rim: 0xfff1da, flat: true, depthWrite: true });
    const shaft = new THREE.BoxGeometry(0.035, 0.035, 1);
    this.shaft = new Meshes(shaft, 500, { order: 3, rim: 0xfff1da, depthWrite: true });
    this.ball = new Meshes(new THREE.IcosahedronGeometry(1, 1), 400, { order: 3, rim: 0xfff1da, flat: true, depthWrite: true });
    const sh = new THREE.OctahedronGeometry(1, 0); sh.scale(0.45, 0.45, 1);
    this.shard = new Meshes(sh, 500, { order: 4, rim: 0xffffff, flat: true });
    const cone = new THREE.ConeGeometry(1, 1, 5); cone.translate(0, 0.5, 0);
    this.spike = new Meshes(cone, 900, { order: 3, rim: 0xfff1da, flat: true, depthWrite: true });
    const bolt = new THREE.CylinderGeometry(0.5, 0.5, 1, 6); bolt.rotateX(Math.PI / 2);
    this.bolt = new Meshes(bolt, 200, { order: 3, rim: 0xfff1da, flat: true, depthWrite: true });
    for (let i = 0; i < POOL; i++) this.pool.push(blank());
  }

  meshes(): Meshes[] { return [this.ice, this.bubble, this.oil, this.chunk, this.shaft, this.ball, this.shard, this.spike, this.bolt]; }
  objects(): THREE.Object3D[] {
    return [this.ground.mesh, this.groundTop.mesh, this.groundLines.mesh, this.under.mesh, this.over.mesh, this.body.mesh, this.lines.mesh, ...this.meshes().map((m) => m.mesh)];
  }

  setMap(map: BattleMap | null, theme: Theme): void {
    this.map = map; this.theme = theme;
    this.ox = map ? -map.w / 2 : 0; this.oz = map ? -map.h / 2 : 0;
    for (const f of this.pool) f.fn = null;
    this.live = 0;
  }

  /** Game (x, y) -> world X, world Z. */
  wx(x: number): number { return x + this.ox; }
  wz(y: number): number { return y + this.oz; }

  tower(id: number): Tower | null {
    const ts = this.b?.towers;
    if (ts) for (let i = 0; i < ts.length; i++) if (ts[i].id === id) return ts[i];
    return null;
  }
  /** A tower's game position (its pad). */
  tx(t: Tower): number { const p = this.pad(t.pad); return p ? p.x : 0; }
  ty(t: Tower): number { const p = this.pad(t.pad); return p ? p.y : 0; }
  pad(id: number): Pad | null {
    const ps = this.map?.pads;
    if (ps) for (let i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i];
    return null;
  }
  enemy(id: number): Enemy | null {
    const es = this.b?.enemies;
    if (es) for (let i = 0; i < es.length; i++) if (es[i].id === id) return es[i];
    return null;
  }

  /** Interpolated enemy position (game coords) into out. */
  epos(e: Enemy, out: { x: number; y: number }): void {
    const a = this.alpha;
    out.x = e.px + (e.x - e.px) * a; out.y = e.py + (e.y - e.py) * a;
  }

  /** Start a timed effect (game coords x/y, height z). Reuses the oldest slot when full. */
  spawn(fn: FxFn, dur: number, x: number, y: number, z = 0, r = 0): Timed {
    let f: Timed | null = null;
    for (let k = 0; k < POOL; k++) {
      const c = this.pool[(this.next + k) % POOL];
      if (!c.fn) { f = c; this.next = (this.next + k + 1) % POOL; break; }
    }
    if (!f) { f = this.pool[this.next]; this.next = (this.next + 1) % POOL; } else this.live++;
    f.fn = fn; f.t0 = this.T; f.dur = dur; f.x = x; f.y = y; f.z = z; f.r = r;
    f.a = f.b = f.c = f.d = f.e = 0; f.id = 0; f.n = 0; f.col = BLACK; f.seed = Math.random() * 100;
    return f;
  }

  drawTimed(): void {
    for (let i = 0; i < POOL; i++) {
      const f = this.pool[i];
      if (!f.fn) continue;
      const age = this.T - f.t0;
      if (age >= f.dur) { f.fn = null; this.live--; continue; }
      f.fn(this, f, f.dur > 0 ? age / f.dur : 1, age);
    }
  }
  liveCount(): number { return this.live; }

  /** Dev: names of batches holding a NaN in their live instances. */
  findNaN(): string[] {
    const out: string[] = [];
    for (const o of this.objects()) {
      const g = (o as THREE.Mesh).geometry as THREE.InstancedBufferGeometry;
      const n = (o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : g.instanceCount;
      for (const [k, a] of Object.entries(g.attributes)) {
        if (!(a as THREE.InstancedBufferAttribute).isInstancedBufferAttribute) continue;
        const arr = a.array as Float32Array, len = Math.min(arr.length, n * a.itemSize);
        for (let i = 0; i < len; i++) if (!Number.isFinite(arr[i])) { out.push(`${o.name}.${k}@${Math.floor(i / a.itemSize)}`); break; }
      }
      if ((o as THREE.InstancedMesh).isInstancedMesh) {
        const arr = (o as THREE.InstancedMesh).instanceMatrix.array as Float32Array;
        for (let i = 0; i < n * 16; i++) if (!Number.isFinite(arr[i])) { out.push(`${o.name}.matrix@${Math.floor(i / 16)}`); break; }
      }
    }
    return out;
  }

  begin(): void {
    this.ground.begin(); this.groundTop.begin(); this.groundLines.begin(); this.under.begin(); this.over.begin(); this.body.begin(); this.lines.begin();
    for (const m of this.meshes()) m.begin();
  }
  end(): void {
    this.ground.end(); this.groundTop.end(); this.groundLines.end(); this.under.end(); this.over.end(); this.body.end(); this.lines.end();
    for (const m of this.meshes()) m.end();
  }
}
