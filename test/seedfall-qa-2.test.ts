// QA pass 2 (design/qa-2.md): regression guards for the qa-1 items that pass 1 left without a test, and repros for
// the new bugs. A `test.failing` is an open bug (a fix turns it red: flip it to `test`); a plain `test` guards a fix.
import { expect, test } from "bun:test";
import { Game } from "../seedfall/game/game.ts";
import { input, mk, openCol, openRow, place, run, ofType, HW, I, W } from "./seedfall-rules-kit.ts";
import { liveVsLoaded, inp, podInRock, overlapDepth, DT } from "../seedfall/scripts/qa-lib.ts";
import { findByKey, CHAMBER } from "../seedfall/game/content/world.ts";

const copper = findByKey("copper")!.id;
const iron = findByKey("iron")!.id;
const hs = findByKey("heartstone")!.id;

test("Q5 the warn ladder and the last input survive a save: a game saved low on fuel does not re-warn after load", () => {
  const g = mk((w) => openCol(w, 24, 0, 30));
  place(g, 24, 30);
  g.pod.fuel = 0.1 * g.pod.fuelMax;
  run(g, 1, {});
  const b = Game.load(JSON.parse(JSON.stringify(g.save())));
  const ev = run(b, 0.5, {});
  // the stand-in world is not what a plain load regenerates, so the way home differs; the fuel warning must not re-fire
  expect(ofType(ev, "warn").filter((e) => e.what !== "home").length).toBe(0);
  expect(liveVsLoaded(g, () => inp({ up: true }), 60)).toBeNull();
});

test("Q6 the magnet pulls one unit per pull (an ingot or a piece, not both) along a clear line", () => {
  const g = mk((w) => openRow(w, 20, 10, 16));
  g.giveData(1e4); g.setReached(2); g.buyModule("magnet"); g.give(1e5);
  g.teleport(28, -HW - 1e-6); g.equipModule("magnet");
  g.live.add("crate", 15.5, 20.5, { cargo: { [copper]: 3 }, ingots: { [iron]: 2 } });
  place(g, 13, 20);
  const before = g.pod.cargoUsed;
  // one step past the first pull
  for (let k = 0; k < 120 && g.pod.cargoUsed === before; k++) g.step(DT, input());
  const ing = Object.values(g.pod.ingots).reduce((a, b) => a + b, 0), pcs = Object.values(g.pod.cargo).reduce((a, b) => a + b, 0);
  expect(ing + pcs).toBe(1);
});

test("Q13 the pod parked on the mouth's lip: holding Down still takes it into the shaft", () => {
  const g = Game.create(42);
  for (let k = 0; k < 38; k++) g.step(DT, input({ left: true }));
  for (let k = 0; k < 20; k++) g.step(DT, input());
  run(g, 3, { down: true });
  expect(g.pod.y).toBeGreaterThan(2);
});

test("Q13b from a fresh game, holding Down on the pad drives to the mouth and drops in", () => {
  const g = Game.create(42);
  run(g, 4, { down: true });
  expect(g.pod.y).toBeGreaterThan(2);
  expect(Math.floor(g.pod.x)).toBe(g.world.spawnX);
});

test("Q16 three hours away with no rigs and no lab gives no offline card and no Night Shift", () => {
  const g = Game.create(5, { now: 1.7e12 });
  const b = Game.load(JSON.parse(JSON.stringify(g.save(1.7e12))), 1.7e12 + 3 * 3600e3);
  expect(b.s.offline).toBeNull();
  expect(b.collectOffline().ok).toBe(false);
});

test("Q16b a full silo's card awards Night Shift only when the silo had output", () => {
  const g = Game.create(5, { now: 1.7e12 });
  g.setReached(2); g.s.rigs = [3, 3, 0, 0, 0, 0, 0];
  const b = Game.load(JSON.parse(JSON.stringify(g.save(1.7e12))), 1.7e12 + 30 * 3600e3);
  expect(b.s.offline?.cash ?? 0).toBeGreaterThan(0);
  expect(b.s.offline?.full).toBe(true);
});

test("Q19 a launch resets the next planet's depth record (a replay pays depth data again) and the lab", () => {
  const g = Game.create(5);
  for (const pl of ["vell", "cinder", "ferrum"]) g.s.records.deepest[pl] = 700;
  g.s.lab = 2;
  g.setReached(7); g.give(1e7); g.s.plans = true;
  for (const id of ["frame", "coil", "head"]) g.buyLancePart(id);
  g.pod.cargo[hs] = 5;
  g.teleport(CHAMBER.cx, CHAMBER.cy - CHAMBER.seedR - HW - 0.01);
  expect(g.launch().ok).toBe(true);
  for (let k = 0; k < 60 * 60 && g.s.launch?.phase !== "choose"; k++) g.step(DT, input());
  expect(g.s.launch?.phase).toBe("choose");
  expect(g.choosePlanet(g.s.launch!.choices[0]).ok).toBe(true);
  expect(g.s.records.deepest[g.s.planet] ?? 0).toBe(0);
  expect(g.s.lab).toBe(0);
});

test("Q20 Down on the depot pad does not dig a hole in the forecourt", () => {
  const g = Game.create(42);
  const pad = g.world.spawnX + 4;
  g.teleport(pad + 0.5, -HW - 1e-6);
  g.pod.grounded = true;
  run(g, 0.05, { down: true });
  // the pad drive takes over; whatever it does, row 0 of the forecourt stays solid
  for (let x = g.world.spawnX + 1; x <= g.world.spawnX + 6; x++) expect(g.world.mat[I(x, 0)]).not.toBe(0);
});

test("Q21 the warn ladder resets to quiet in town", () => {
  const g = mk((w) => openCol(w, 24, 0, 12));
  place(g, 24, 12);
  g.pod.fuel = 0.05 * g.pod.fuelMax;
  run(g, 0.5, {});
  expect((g.s.warns.fuel ?? 0) + (g.s.warns.home ?? 0)).toBeGreaterThan(0);
  g.teleport(g.padX(), -HW - 1e-6);
  run(g, 0.5, {});
  expect(g.s.warns.fuel ?? 0).toBe(0);
  expect(g.s.warns.home ?? 0).toBe(0);
});

test("Q26 a tow's crate made while the pod hangs in a shaft lies on the shaft's floor", () => {
  const g = mk((w) => openCol(w, 24, 0, 20));
  g.teleport(24.5, 12.5);
  g.pod.cargo[copper] = 3;
  g.pod.fuel = 0.01;
  run(g, 3, {});
  run(g, 0.1, { confirm: true });
  const c = g.entities.find((e) => e.kind === "crate")!;
  expect(c.y).toBeCloseTo(20.5, 1);
});

test("Q26b a tow's crate drops when the tile under it is dug away later", () => {
  const g = mk((w) => { openCol(w, 24, 0, 12); });
  place(g, 24, 12);
  g.pod.cargo[copper] = 3;
  g.pod.fuel = 0.01;
  run(g, 3, {});
  run(g, 0.1, { confirm: true });
  const c = g.entities.find((e) => e.kind === "crate")!;
  expect(c).toBeTruthy();
  g.live.clear(g, I(24, 14)); g.live.clear(g, I(24, 13));
  run(g, 3, {});
  expect(c.y).toBeGreaterThan(13);
});

test("Q7 the Seed wakes from the chamber floor beside it, not only from its top", () => {
  const g = Game.create(5);
  g.setReached(7); g.give(1e7); g.s.plans = true;
  for (const id of ["frame", "coil", "head"]) g.buyLancePart(id);
  g.pod.cargo[hs] = 5;
  // the nearest standable chamber-floor tile that is not on top of the Seed
  let spot: [number, number] | null = null, best = Infinity;
  for (let y = 740; y < 772; y++) for (let x = 1; x < W - 1; x++) {
    if (g.world.mat[I(x, y)] !== 0 || !g.live.solid(x, y + 1)) continue;
    if (Math.abs(x + 0.5 - CHAMBER.cx) <= 3 && y < CHAMBER.cy) continue;
    const d = Math.hypot(x + 0.5 - CHAMBER.cx, y + 1 - HW - CHAMBER.cy);
    if (d < best) { best = d; spot = [x, y]; }
  }
  expect(spot).not.toBeNull();
  place(g, spot![0], spot![1]);
  expect(g.canLaunch()).toEqual({ ok: true });
});

test("Q2 regression on real worlds: running dry mid-dig never squeezes the pod through rock (5 seeds)", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const g = Game.create(seed);
    g.teleport(g.world.spawnX + 0.5, 1.5);
    run(g, 2, { down: true });
    g.pod.fuel = 0.03;
    let worst = 0;
    for (let k = 0; k < 240; k++) { g.step(DT, input({ down: true })); worst = Math.max(worst, overlapDepth(g, podInRock(g))); }
    expect(worst).toBeLessThan(0.05);
  }
});

/** N1: launch() takes the 5 Heartstone from the bay but leaves cargoUsed and load stale; a save made during the launch
 * then loads with a different cargoUsed than the live game (the soak's save-roundtrip divergences, always 5). */
test("N1 the bay count is right after the Seed takes the Heartstone", () => {
  const g = Game.create(5);
  g.setReached(7); g.give(1e7); g.s.plans = true;
  for (const id of ["frame", "coil", "head"]) g.buyLancePart(id);
  g.pod.cargo[hs] = 7; g.pod.cargo[copper] = 4; g.refreshStats(false);
  g.teleport(CHAMBER.cx, CHAMBER.cy - CHAMBER.seedR - HW - 0.01);
  expect(g.launch().ok).toBe(true);
  expect(g.pod.cargoUsed).toBe(6);
});

/** N2: with the Lift built, a pod driving from the pad toward the west buildings clamps to the rail at the mouth; Left and
 * Right then do nothing at the top, and Up throws it ~13 tiles into the sky. A person cannot drive across the mouth. */
test("N2 with the Lift built, driving left from the pad crosses the mouth to the fuel station", () => {
  const g = Game.create(22);
  g.setReached(1); g.give(1e5); g.buyLift();
  g.teleport(g.padX(), -HW - 1e-6);
  run(g, 0.3, {});
  run(g, 4, { left: true });
  expect(g.pod.riding).toBe(false);
  expect(g.pod.x).toBeLessThan(g.world.spawnX - 1);
});
