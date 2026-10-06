// Highway's contact against what is drawn (highway/game/crash.ts): a car
// collides as its outline from above pulled in by the insets, not as the box
// around it, whose corners stick out past a tapered nose or tail (6 to 35 cm
// on the game's models). A gap the screen shows is a miss; paint into paint
// is still a hit.
import { expect, test } from "bun:test";
import { collide, planform, type Box, type Pt } from "../highway/game/crash.ts";
import { INSET, INSET_END } from "../highway/game/drive.ts";

// A sports car's planform (the Stinger's numbers): 1.95 m wide, 4.17 long, the nose narrowing to 1.25 m over
// its last 0.4 m and the tail to 1.52 over its last 0.3.
const W = 1.95, L = 4.17;
const SHAPE: Pt[] = [[W / 2, L / 2 - 0.4], [0.625, L / 2], [-0.625, L / 2], [-W / 2, L / 2 - 0.4], [-W / 2, -L / 2 + 0.3], [-0.76, -L / 2], [0.76, -L / 2], [W / 2, -L / 2 + 0.3]];
const drawn = planform(SHAPE);
const hull = planform(SHAPE, INSET, INSET_END);

const as = (x: number, z: number, outline: "box" | "drawn" | "hull"): Box =>
  outline === "box" ? { x, z, yaw: 0, w: W * 0.96, l: L * 0.98 } : { x, z, yaw: 0, w: W, l: L, hull: outline === "drawn" ? drawn : hull };
const hits = (b: [number, number], outline: "box" | "drawn" | "hull") => !!collide(as(0, 0, outline), as(b[0], b[1], outline));

test("the outline is what is drawn: the hull of the points, the insets taken off every side", () => {
  expect(Math.max(...drawn.map((p) => p[0]))).toBeCloseTo(W / 2, 3);
  expect(Math.max(...hull.map((p) => p[0]))).toBeCloseTo(W / 2 - INSET, 3);
  expect(Math.max(...hull.map((p) => p[1]))).toBeCloseTo(L / 2 - INSET_END, 3);
  // a point inside the hull is not part of it
  expect(planform([...SHAPE, [0, 0], [0.3, 1]])).toEqual(drawn);
});

test("cutting past a car's tail with a gap on screen is a miss; the old box called it a crash", () => {
  // the car ahead, half a car width over and just ahead: its tail corner by your nose corner, both tapered
  const by: [number, number] = [W - 0.12, L - 0.15];
  expect(hits(by, "drawn")).toBe(false); // the screen shows a gap
  expect(hits(by, "box")).toBe(true); // what used to end the run
  expect(hits(by, "hull")).toBe(false);
});

test("side by side: a hair of paint is forgiven, a real lean into it is a hit", () => {
  expect(hits([W + 0.02, 0], "hull")).toBe(false); // a 2 cm gap
  expect(hits([W - 2 * INSET + 0.01, 0], "hull")).toBe(false); // the outlines just touch: 15 cm of paint
  expect(hits([W - 0.25, 0], "hull")).toBe(true);
});

test("into the back of a car is still a crash, and a turned car collides turned", () => {
  expect(hits([0, L - 0.3], "hull")).toBe(true);
  expect(hits([0.4, L - 0.3], "hull")).toBe(true);
  // beside it with a 10 cm gap straight, but turned 20 degrees into it the nose reaches it
  const a: Box = { x: 0, z: 0, yaw: 0, w: W, l: L, hull };
  const b = (yaw: number): Box => ({ x: W - 2 * INSET + 0.1, z: 0.6, yaw, w: W, l: L, hull });
  expect(collide(a, b(0))).toBeNull();
  expect(collide(a, b(-0.35))).not.toBeNull();
});
