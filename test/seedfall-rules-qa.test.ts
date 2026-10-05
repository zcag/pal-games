// Fixes from QA pass 1 (design/qa-1.md) that test/qa-bugs.test.ts does not cover.
import { expect, test } from "bun:test";
import { Game } from "../seedfall/game/game.ts";
import { mk, place, run, openCol, openRow, paint, ofType, input, MAT, HW, I } from "./seedfall-rules-kit.ts";
import { findByKey, CHAMBER } from "../seedfall/game/content/world.ts";
import { makeOrders } from "../seedfall/game/meta.ts";

const copper = findByKey("copper")!.id, tin = findByKey("tin")!.id;

test("Q9 the launch emits choose after wash; done comes with choosePlanet", () => {
  const g = mk((w) => openCol(w, 24, 1, 760));
  g.give(1e6); g.s.plans = true;
  for (const p of ["frame", "coil", "head"]) g.buyLancePart(p);
  g.teleport(CHAMBER.cx, CHAMBER.cy - 4);
  g.pod.cargo[findByKey("heartstone")!.id] = 5;
  expect(g.launch().ok).toBe(true);
  const phases = ofType(run(g, 22, {}), "launch").map((e) => e.phase);
  expect(phases.slice(-2)).toEqual(["wash", "choose"]);
  g.choosePlanet("ferrum");
  expect(ofType(g.step(1 / 60, input()), "launch").map((e) => e.phase)).toEqual(["done"]);
});

test("Q13 the pod spawns on a tile centre; Down beside the mouth eases it in", () => {
  const g = Game.create(42);
  expect(g.pod.x % 1).toBeCloseTo(0.5, 6);
  // perched on the lip (QA's 24.86-24.94) and over the mouth's lining (25.1-25.9): Down drops it in
  for (const x of [24.9, 25.2, 25.5, 25.9]) {
    g.teleport(x, -HW - 1e-6);
    run(g, 1.5, { down: true });
    expect(g.pod.y).toBeGreaterThan(1);
  }
});

test("Q16 nothing accrued means no offline card and no Night Shift", () => {
  const t0 = 1.7e12;
  const g = mk(() => {}, { now: t0 });
  g.save(t0);
  expect(g.applyOffline(t0 + 3 * 3600e3)).toBe(null);
  expect(g.collectOffline().ok).toBe(false);
  expect(g.s.achievements).not.toContain("night_shift");
});

test("Q19 a launch resets the planet's depth record and the lab", () => {
  const g = mk((w) => openCol(w, 24, 1, 760));
  g.s.records.deepest.vell = 500; g.s.lab = 2; g.s.plans = true;
  g.give(1e6);
  for (const p of ["frame", "coil", "head"]) g.buyLancePart(p);
  g.teleport(CHAMBER.cx, CHAMBER.cy - 4);
  g.pod.cargo[findByKey("heartstone")!.id] = 5;
  g.launch();
  g.choosePlanet("vell" === g.s.launch!.choices[0] ? "vell" : g.s.launch!.choices[0]);
  expect(g.s.lab).toBe(0);
  expect(g.s.records.deepest[g.s.planet]).toBe(0);
});

test("Q20 the depot forecourt and the mouth's lining are town ground: not drilled, not blasted", () => {
  const g = mk();
  g.set("drill", 21);
  const ev = run(g, 1.5, { down: true });
  expect(ofType(ev, "unbreakable").length).toBe(0); // silent: Down there drives to the mouth
  expect(g.world.mat[I(28, 0)]).not.toBe(0);
  g.live.explode(g, 25.5, 1.5, 2.5, "charge", 1e9);
  expect(g.world.mat[I(25, 1)]).not.toBe(0);
});

test("Q26 a crate left in mid-air falls to the floor, and falls again when its floor is dug", () => {
  const g = mk((w) => openCol(w, 10, 5, 20));
  g.teleport(10.5, 8);
  g.pod.cargo[copper] = 2;
  g.tow();
  const c = g.entities.find((e) => e.kind === "crate")!;
  expect(c.y).toBeCloseTo(20.5, 6);
  g.live.clear(g, I(10, 21));
  expect(c.y).toBeCloseTo(21.5, 6);
});

test("feel 4: orders are never met by any few pieces", () => {
  const g = mk();
  for (let k = 0; k < 40; k++) {
    for (const o of makeOrders(g.s, g.world)) {
      if (o.kind === "count") expect(o.n).toBeGreaterThanOrEqual(4);
      if (o.kind === "depth") { expect(o.n).toBeGreaterThanOrEqual(4); expect(o.tier).toBeGreaterThan(1); }
    }
  }
});

test("feel 5: the Seed wakes from anywhere on the chamber floor", () => {
  const g = mk((w) => openCol(w, 24, 1, 760));
  g.give(1e6); g.s.plans = true;
  for (const p of ["frame", "coil", "head"]) g.buyLancePart(p);
  g.pod.cargo[findByKey("heartstone")!.id] = 5;
  g.teleport(CHAMBER.cx - 12, CHAMBER.cy + 5);
  expect(g.canLaunch().ok).toBe(true);
  g.teleport(CHAMBER.cx, CHAMBER.cy - 20);
  expect(g.canLaunch().ok).toBe(false);
});

test("dump(find, all) drops one piece or all of an ore", () => {
  const g = mk();
  g.pod.cargo[copper] = 3; g.pod.cargo[tin] = 2;
  expect(g.dump(copper).ok).toBe(true);
  expect(g.pod.cargo[copper]).toBe(2);
  expect(g.dump(tin, true).ok).toBe(true);
  expect(g.pod.cargo[tin]).toBeUndefined();
  expect(g.pod.cargoUsed).toBe(2);
  expect(g.dump(tin).ok).toBe(false);
});

test("Q1 a tow leaves at least a quarter tank even with no cash", () => {
  const g = mk((w) => openRow(w, 30, 4, 10));
  place(g, 6, 30);
  g.pod.fuel = 0;
  g.tow();
  expect(g.pod.fuel).toBeGreaterThanOrEqual(0.25 * g.pod.fuelMax);
  void HW; void paint; void MAT;
});

test("onboarding: holding Down on the depot pad drives to the mine mouth and drops in, unhurt and unlabelled", () => {
  const g = Game.create(42);
  const ev = run(g, 4, { down: true });
  expect(ofType(ev, "unbreakable").length).toBe(0);
  expect(ofType(ev, "damage").length).toBe(0);
  expect(g.pod.y).toBeGreaterThan(2);
  expect(Math.floor(g.pod.x)).toBe(g.world.spawnX);
  // the far side of the mouth too
  const h = Game.create(42);
  h.teleport(h.world.spawnX - 0.5, -HW - 1e-6);
  run(h, 3, { down: true });
  expect(h.pod.y).toBeGreaterThan(2);
});
