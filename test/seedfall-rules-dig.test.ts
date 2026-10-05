// Drilling (core-loop "Drilling"): timing, engage delay, chain, decay, too hard with the needed level, unbreakable,
// pieces per tile, the bay overflowing into loose pieces, dumping.
import { expect, test } from "bun:test";
import { mk, place, run, timeTo, paint, openRow, ofType, input, MAT, I } from "./seedfall-rules-kit.ts";
import { needLevel } from "../seedfall/game/pod.ts";
import { findByKey } from "../seedfall/game/content/world.ts";

const copper = findByKey("copper")!.id;
const iron = findByKey("iron")!.id;

test("a loam tile at drill 0 breaks after the 0.10 s engage plus 0.25 + 0.40 x ratio", () => {
  const g = mk((w) => openRow(w, 10, 4, 8));
  place(g, 5, 10);
  const t = timeTo(g, 3, { down: true }, (e) => e.t === "break");
  // ratio 1: 0.65 s dig after 0.10 s engage
  expect(t).toBeGreaterThan(0.73);
  expect(t).toBeLessThan(0.78);
});

test("ore tiles are host x 1.15 and dig slower; drill levels speed them up", () => {
  const g = mk((w) => { openRow(w, 10, 4, 8); paint(w, 5, 11, MAT.LOAM, copper); });
  place(g, 5, 10);
  const t = timeTo(g, 3, { down: true }, (e) => e.t === "break");
  expect(t).toBeCloseTo(0.1 + 0.25 + 0.4 * 1.15, 1);
  const h = mk((w) => openRow(w, 10, 4, 8));
  h.set("drill", 4);
  place(h, 5, 10);
  expect(timeTo(h, 3, { down: true }, (e) => e.t === "break")).toBeCloseTo(0.1 + 0.25 + 0.4 / Math.pow(1.25, 4), 1);
});

test("bumping a wall shorter than the engage delay never starts a dig", () => {
  const g = mk((w) => openRow(w, 10, 4, 8));
  place(g, 8, 10);
  const ev = run(g, 0.05, { right: true });
  run(g, 0.5, {});
  expect(ofType(ev, "dig_start").length).toBe(0);
  expect(g.pod.dig).toBe(null);
});

test("holding down chains digs: each next tile starts at once, no engage", () => {
  const g = mk((w) => openRow(w, 10, 4, 8));
  place(g, 5, 10);
  const times: number[] = [];
  for (let k = 1; k <= 60 * 4; k++) if (g.step(1 / 60, input({ down: true })).some((e) => e.t === "break")) times.push(k / 60);
  expect(times.length).toBeGreaterThanOrEqual(5);
  for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeCloseTo(0.65, 1);
  expect(g.pod.y).toBeGreaterThan(14);
});

test("a released dig decays at twice the rate it was gained", () => {
  const g = mk((w) => openRow(w, 10, 4, 8));
  place(g, 5, 10);
  run(g, 0.4, { down: true });
  const p0 = g.pod.dig!.progress;
  const ev = run(g, 0.1, {});
  expect(ofType(ev, "dig_cancel").length).toBe(1);
  expect(g.pod.dig!.progress).toBeCloseTo(p0 - (2 * (0.1 - 1 / 60)) / 0.65, 1);
  // pressing again resumes from what is left, without a new engage
  const before = g.pod.dig!.progress;
  run(g, 1 / 60, { down: true });
  expect(g.pod.dig!.progress).toBeGreaterThan(before);
});

test("too hard: told on contact with the drill level that digs it, at most once per tile per 5 s", () => {
  const g = mk((w) => { openRow(w, 10, 4, 8); paint(w, 5, 11, MAT.GRANITE); });
  place(g, 5, 10);
  const ev = run(g, 2, { down: true });
  const th = ofType(ev, "too_hard");
  expect(th.length).toBe(1);
  expect(th[0].need).toBe(1); // granite 2.8: ratio 2.24 at drill 1
  expect(ofType(ev, "dig_start").length).toBe(0);
  expect(needLevel(26)).toBe(11); // obsidian: "Drill 11."
  expect(needLevel(94)).toBe(17); // husk plate (the core shell)
  g.set("drill", 1);
  expect(ofType(run(g, 2, { down: true }), "break").length).toBeGreaterThan(0);
});

test("unbreakable rock rings and is never dug", () => {
  const g = mk((w) => { openRow(w, 10, 4, 8); paint(w, 5, 11, MAT.IRONSTONE); });
  g.set("drill", 21);
  place(g, 5, 10);
  const ev = run(g, 1, { down: true });
  expect(ofType(ev, "unbreakable").length).toBe(1);
  expect(g.world.mat[I(5, 11)]).toBe(MAT.IRONSTONE);
});

test("sideways digs need the ground; never up, never airborne", () => {
  const g = mk((w) => openRow(w, 10, 4, 8));
  place(g, 8, 10);
  expect(timeTo(g, 2, { right: true }, (e) => e.t === "break")).toBeLessThan(0.9);
  expect(g.world.mat[I(9, 10)]).toBe(0);
  // up never digs
  const h = mk((w) => openRow(w, 10, 4, 8));
  place(h, 5, 10);
  expect(ofType(run(h, 1, { up: true }), "dig_start").length).toBe(0);
});

test("ore tiles yield 1 + floor(b/2) pieces; what does not fit lies loose; X dumps the cheapest", () => {
  // a Magma-depth ore tile gives 3 pieces
  const g = mk((w) => { openRow(w, 450, 4, 8); paint(w, 5, 451, MAT.LOAM, iron); });
  place(g, 5, 450);
  const ev = run(g, 1.5, { down: true });
  expect(ofType(ev, "pickup").reduce((a, e) => a + e.count, 0)).toBe(3);
  // a full bay drops the rest as one pile, and says so once
  const h = mk((w) => { openRow(w, 10, 4, 8); for (let y = 11; y < 22; y++) paint(w, 5, y, MAT.LOAM, copper); });
  place(h, 5, 10);
  const ev2 = run(h, 9, { down: true });
  expect(h.pod.cargoUsed).toBe(8);
  expect(ofType(ev2, "cargo_full").length).toBe(1);
  expect(h.entities.filter((e) => e.kind === "nugget").length).toBeGreaterThan(0);
  h.pod.cargo[iron] = 1;
  h.step(1 / 60, input({ dump: true }));
  expect(h.pod.cargo[copper]).toBe(7);
  expect(h.pod.cargo[iron]).toBe(1);
});
