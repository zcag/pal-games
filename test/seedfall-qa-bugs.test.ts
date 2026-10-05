// QA repros for the bugs filed in design/qa-1.md. Each is `test.failing` while the bug is open: the suite stays green,
// and a fix turns the test red here, the cue to flip it to `test` (it then guards the fix). Ids match qa-1.md.
import { expect, test } from "bun:test";
import { Game } from "../seedfall/game/game.ts";
import { input, mk, openCol, openRow, paint, place, run, ofType, MAT, HW, I } from "./seedfall-rules-kit.ts";
import { podInRock, overlapDepth, liveVsLoaded, inp } from "../seedfall/scripts/qa-lib.ts";
import { findByKey, CHAMBER } from "../seedfall/game/content/world.ts";

const copper = findByKey("copper")!.id;

/** Q1: a tow with an empty wallet leaves the pod at the depot with 0 fuel; dock() never runs again, so it never moves. */
test("Q1 a tow with no cash and the broke guard spent: the pod can still leave town", () => {
  const g = mk((w) => openCol(w, 24, 0, 12));
  g.s.brokeAt = g.s.time; // Ida covered half a tank a minute ago (the guard's 10 minutes are running)
  place(g, 24, 12);
  g.pod.fuel = 0.01;
  run(g, 3, {});
  expect(g.pod.stranded).toBe(true);
  run(g, 0.1, { confirm: true });
  expect(g.inTown()).toBe(true);
  run(g, 700, {}); // even after the guard's 10 minutes
  const x0 = g.pod.x;
  run(g, 1, { left: true });
  expect(g.pod.fuel).toBeGreaterThan(0);
  expect(g.pod.x).not.toBe(x0);
});

/** Q2: running dry mid-dig leaves the pod inside the half-dug tile; the collision push-out ratchets it up through rock. */
test("Q2 running dry in the middle of a dig leaves the pod where it was, not squeezed up through the rock", () => {
  const g = mk((w) => openCol(w, 24, 0, 10));
  place(g, 24, 10);
  g.pod.fuel = 0.05;
  let worst = 0;
  for (let k = 0; k < 180; k++) {
    g.step(1 / 60, input({ down: true }));
    worst = Math.max(worst, overlapDepth(g, podInRock(g)));
  }
  expect(g.inTown()).toBe(false);
  expect(Math.floor(g.pod.y)).toBeGreaterThanOrEqual(10);
  expect(worst).toBeLessThan(0.05);
});

/** Q3: a released down dig resumed after a sideways nudge snaps the pod down by its progress while it is off-centre. */
test("Q3 resuming a down dig after a sideways nudge does not push the pod into the neighbouring rock", () => {
  const g = mk((w) => { openCol(w, 24, 0, 10); openRow(w, 10, 24, 28); });
  place(g, 24, 10);
  run(g, 0.55, { down: true }); // most of a loam tile
  run(g, 0.12, { right: true }); // a nudge: the dig is released, the pod drives right
  let worst = 0;
  for (let k = 0; k < 30; k++) { g.step(1 / 60, input({ down: true })); worst = Math.max(worst, overlapDepth(g, podInRock(g))); }
  expect(worst).toBeLessThan(0.05);
});

/** Q4: continuous damage (lava, heat, geysers' heat) is a `damage` event every tick, 60 a second. */
test("Q4 standing in lava sends a damage event a few times a second, not every tick", () => {
  const g = mk((w) => { openRow(w, 20, 10, 14); paint(w, 12, 21, MAT.LAVA); for (let x = 10; x <= 14; x++) if (x !== 12) paint(w, x, 21, MAT.BEDROCK); });
  g.set("hull", 15);
  g.teleport(12.5, 21.4);
  const ev = run(g, 1, {});
  expect(ofType(ev, "damage").length).toBeLessThan(10);
});

/** Q5: the save does not keep the step's previous input (edge detection), so a loaded game diverges from the live one. */
test("Q5 a game saved while Up is held steps the same after load as the live one", () => {
  const g = Game.create(3);
  place(g, g.world.spawnX, 6);
  for (let k = 0; k < 30; k++) g.step(1 / 60, input({ up: true }));
  const why = liveVsLoaded(g, () => inp({ up: true }), 60);
  expect(why).toBeNull();
});

/** Q6: the magnet's crate pull takes an ingot and a piece per pull, and pulls through solid rock. */
test("Q6 the Magnet Coil does not pull a crate's contents through solid rock", () => {
  const g = mk((w) => { openRow(w, 20, 10, 12); openRow(w, 20, 14, 16); });
  g.giveData(1e4); g.setReached(2); g.buyModule("magnet"); g.give(1e5);
  g.teleport(28, -HW - 1e-6); g.equipModule("magnet");
  g.live.add("crate", 15.3, 20.5, { cargo: { [copper]: 3 }, ingots: {} });
  place(g, 12, 20); // 2.8 tiles from the crate, with solid tile 13 between
  run(g, 1, {});
  expect(g.pod.cargoUsed).toBe(0);
});

/** Q7: the Seed can be woken only within 5 tiles of its centre, but no tile beside it can be stood on; the chamber floor
 * is 8.8+ tiles away. Standing on the Seed's top works, which a player would not guess. Recorded as a check, not a fail. */
test("Q7 (info) the nearest floor to the Seed that is not the Seed itself", () => {
  const g = Game.create(5);
  let best = Infinity;
  for (let y = 740; y < 772; y++) for (let x = 1; x < 47; x++) {
    const i = I(x, y);
    if (g.world.mat[i] !== 0 || !g.live.solid(x, y + 1) || !Game.prototype.constructor) continue;
    const under = g.world.mat[I(x, y + 1)];
    if (Math.abs(x + 0.5 - CHAMBER.cx) <= 3 && y < CHAMBER.cy) continue; // on top of the Seed
    const d = Math.hypot(x + 0.5 - CHAMBER.cx, y + 1 - HW - CHAMBER.cy);
    if (under && d < best) best = d;
  }
  expect(best).toBeGreaterThan(CHAMBER.seedR + 2);
});
