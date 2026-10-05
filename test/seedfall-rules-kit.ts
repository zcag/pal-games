// Test kit for the rules: a small hand-made world (no generator), a game on it, and input helpers.
import { W, H, FLAG, HAZ, type Input, type WorldData, type GameEvent } from "../seedfall/game/types.ts";
import { MAT, slotOfRow } from "../seedfall/game/content/world.ts";
import { Game, type GameOpts } from "../seedfall/game/game.ts";
import { HW } from "../seedfall/game/pod.ts";

export const I = (x: number, y: number) => y * W + x;

/** A solid world of one material, bedrock at the sides, the mine mouth open at column 24 rows 0-3. */
export function flatWorld(fill: number = MAT.LOAM): WorldData {
  const n = W * H;
  const w: WorldData = {
    seed: 7, planet: "vell",
    mat: new Uint8Array(n), find: new Uint8Array(n), haz: new Uint8Array(n), back: new Uint8Array(n),
    flag: new Uint8Array(n), biome: new Uint8Array(n), fluid: new Uint8Array(n),
    spawnX: 24, structures: [], caches: [],
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y), m = x === 0 || x === W - 1 || y === H - 1 ? MAT.BEDROCK : fill;
    w.mat[i] = m; w.back[i] = m; w.biome[i] = Math.min(6, slotOfRow(y));
  }
  for (let y = 0; y <= 3; y++) { const i = I(24, y); w.mat[i] = 0; w.flag[i] = FLAG.DUG | FLAG.STRUCT; }
  return w;
}

export const paint = (w: WorldData, x: number, y: number, mat: number, find = 0, haz = 0) => {
  const i = I(x, y);
  w.mat[i] = mat; w.back[i] = mat || w.back[i]; w.find[i] = find; w.haz[i] = haz;
  if (mat === MAT.LAVA) w.fluid[i] = 255;
};
/** Open a vertical run of tiles (a shaft) or a horizontal one. */
export const openCol = (w: WorldData, x: number, y0: number, y1: number) => { for (let y = y0; y <= y1; y++) paint(w, x, y, 0); };
export const openRow = (w: WorldData, y: number, x0: number, x1: number) => { for (let x = x0; x <= x1; x++) paint(w, x, y, 0); };

/** A game on a copy of a hand-made world (the save's base world is the same copy). */
export function mk(build: (w: WorldData) => void = () => {}, opts: GameOpts = {}): Game {
  const make = () => { const w = flatWorld(); build(w); return w; };
  return Game.create(1, { makeWorld: make, ...opts });
}

export const input = (o: Partial<Input> = {}): Input => ({ left: false, right: false, up: false, down: false, ...o });

/** Step for `sec` seconds holding an input; returns every event. */
export function run(g: Game, sec: number, o: Partial<Input> = {}, until?: (e: GameEvent) => boolean): GameEvent[] {
  const out: GameEvent[] = [];
  const n = Math.round(sec * 60);
  for (let k = 0; k < n; k++) {
    const ev = g.step(1 / 60, input(k === 0 ? o : { ...o, item: undefined, scan: undefined, dump: undefined, confirm: o.confirm }));
    out.push(...ev);
    if (until && ev.some(until)) break;
  }
  return out;
}
/** Seconds until the first event matching a test (or Infinity). */
export function timeTo(g: Game, max: number, o: Partial<Input>, test: (e: GameEvent) => boolean): number {
  for (let k = 1; k <= Math.round(max * 60); k++) if (g.step(1 / 60, input(o)).some(test)) return k / 60;
  return Infinity;
}
/** Stand the pod in open tile (x, y), resting on the tile below. */
export function place(g: Game, x: number, y: number) {
  g.teleport(x + 0.5, y + 1 - HW - 1e-6);
  g.pod.grounded = true;
}
export const ofType = <T extends GameEvent["t"]>(ev: GameEvent[], t: T) => ev.filter((e) => e.t === t) as Extract<GameEvent, { t: T }>[];
export { MAT, HAZ, FLAG, W, H, HW };
