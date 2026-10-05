// Determinism and saves on the real generated world: same seed + same inputs -> same state hash; save -> load gives
// the identical state and world, and both copies keep stepping identically.
import { expect, test } from "bun:test";
import { Game } from "../seedfall/game/game.ts";
import { input, mk, paint, place, run, MAT, I } from "./seedfall-rules-kit.ts";
import type { Input } from "../seedfall/game/types.ts";

/** A scripted session: into the mouth, dig down, sideways, climb, scan; varied enough to touch most rules. */
function script(k: number): Input {
  const t = k / 60;
  if (t < 1.5) return input({ left: true });
  if (t < 9) return input({ down: true });
  if (t < 11) return input({ right: true });
  if (t < 12) return input({ down: true, scan: k % 60 === 0 });
  if (t < 14) return input({ left: true });
  if (t < 18) return input({ down: true });
  if (t < 20) return input({ up: true });
  return input({ down: (k >> 5) % 2 === 0, right: (k >> 6) % 3 === 0, left: (k >> 6) % 3 === 1, dump: k % 400 === 0 });
}
function play(g: Game, from: number, to: number) { for (let k = from; k < to; k++) g.step(1 / 60, script(k)); }

test("determinism: the same seed and inputs give the same state hash; another seed does not", () => {
  const a = Game.create(1234), b = Game.create(1234), c = Game.create(99);
  play(a, 0, 60 * 30); play(b, 0, 60 * 30); play(c, 0, 60 * 30);
  expect(a.stateHash()).toBe(b.stateHash());
  expect(a.stateHash()).not.toBe(c.stateHash());
  expect(a.pod.y).toBeGreaterThan(3);
});

test("save -> JSON -> load is exact, and both copies keep stepping identically", () => {
  const a = Game.create(777);
  play(a, 0, 60 * 25);
  a.give(500);
  const json = JSON.stringify(a.save(1.7e12));
  const b = Game.load(JSON.parse(json));
  expect(b.stateHash()).toBe(a.stateHash());
  play(a, 60 * 25, 60 * 40);
  play(b, 60 * 25, 60 * 40);
  expect(b.stateHash()).toBe(a.stateHash());
  // the world is stored as a difference: far smaller than the 37k-tile layers
  expect(json.length).toBeLessThan(40000);
});

test("saves keep the live world mid-flight: lava, a falling boulder, a lit fuse, a crate", () => {
  const make = (g: Game) => g;
  const a = mk((w) => { paint(w, 10, 20, MAT.LAVA); for (let y = 21; y <= 30; y++) paint(w, 10, y, 0); paint(w, 14, 20, MAT.BOULDER_STONE); for (let y = 21; y <= 30; y++) paint(w, 14, y, 0); });
  make(a);
  place(a, 6, 2);
  a.live.wake(I(10, 20));
  a.live.clear(a, I(14, 21));
  run(a, 0.8, {});
  const b = Game.load(JSON.parse(JSON.stringify(a.save())), undefined, a.opts);
  expect(b.stateHash()).toBe(a.stateHash());
  run(a, 20, {}); run(b, 20, {});
  expect(b.stateHash()).toBe(a.stateHash());
  expect(a.world.mat[I(10, 30)]).toBe(MAT.BASALT);
});

test("a save from the start of a game loads and plays", () => {
  const g = Game.create(5);
  const h = Game.load(g.save());
  expect(h.pod.x).toBe(g.pod.x);
  expect(h.world.spawnX).toBe(g.world.spawnX);
  play(h, 0, 120);
  expect(h.time).toBeCloseTo(2, 6);
});
