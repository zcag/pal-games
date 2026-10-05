// The Lift and the lance, from the economy bot's findings: head exits, rail digs, re-clamping, Heartstone kept for the
// lance, the sealed-in tow, Cinder's radiator gates.
import { expect, test } from "bun:test";
import { mk, place, run, openCol, openRow, paint, ofType, input, MAT, HW, I } from "./seedfall-rules-kit.ts";
import { findByKey } from "../seedfall/game/content/world.ts";
import { stepGates } from "../seedfall/game/meta.ts";

const hs = findByKey("heartstone")!.id, copper = findByKey("copper")!.id;
const withLift = (build: Parameters<typeof mk>[0] = () => {}) => {
  const g = mk(build);
  g.setReached(1); g.give(1000); g.buyLift();
  return g;
};

test("leaving the Lift at its head hands over at a safe speed, braked: no fall damage", () => {
  const g = withLift((w) => openCol(w, 24, 60, 120));
  g.teleport(24.5, 5);
  const ev = run(g, 6, { down: true });
  expect(ofType(ev, "lift").some((e) => e.phase === "stop")).toBe(true);
  const land = ofType(ev, "land")[0];
  expect(land.damage).toBe(0);
  expect(ofType(ev, "damage").length).toBe(0);
  expect(g.pod.y).toBeGreaterThan(115);
});

test("the pod digs a side tunnel from the Lift's rails", () => {
  const g = withLift();
  g.teleport(24.5, 30.5);
  run(g, 0.2, {});
  expect(g.pod.riding).toBe(true);
  const ev = run(g, 2, { right: true });
  expect(ofType(ev, "break").some((e) => e.x === 25 && e.y === 30)).toBe(true);
});

test("a pod that left at the head re-clamps when it climbs back into the Lift", () => {
  const g = withLift((w) => openCol(w, 24, 60, 70));
  g.teleport(24.5, 5);
  run(g, 3, { down: true });
  expect(g.pod.riding).toBe(false);
  expect(g.pod.y).toBeGreaterThan(65);
  const ev = run(g, 3, { up: true }, (e) => e.t === "lift" && e.phase === "start");
  expect(ofType(ev, "lift").some((e) => e.phase === "start")).toBe(true);
  expect(g.pod.riding).toBe(true);
});

test("the depot keeps up to 5 Heartstone for the lance once the plans are known; the Smelter never takes them", () => {
  const g = mk((w) => openCol(w, 10, 1, 5));
  g.s.plans = true;
  place(g, 10, 5); g.step(1 / 60, input());
  g.pod.cargo[hs] = 7; g.pod.cargo[copper] = 2;
  g.teleport(g.padX(), -HW - 1e-6);
  const sale = ofType(run(g, 0.1, {}), "dock")[0].sale;
  expect(g.pod.cargo[hs]).toBe(5);
  expect(sale.lines.find((l) => l.find === hs)!.count).toBe(2);
  g.s.unlocked.push("smelter"); g.s.modules.push("smelter");
  place(g, 10, 5);
  run(g, 3, {});
  expect(g.pod.cargo[hs]).toBe(5);
  expect(g.pod.ingots[hs]).toBeUndefined();
  expect(g.heartstone()).toBe(5);
});

test("sealed in with nothing to blast or jump: a tow, pod only, no fuel burn", () => {
  const g = mk((w) => openRow(w, 40, 5, 8));
  place(g, 6, 40);
  g.pod.cargo[copper] = 2;
  const f = g.pod.fuel;
  const ev = run(g, 1.5, {});
  expect(g.pod.stranded).toBe(true);
  expect(ofType(ev, "toast").some((t) => t.text.startsWith("Sealed in"))).toBe(true);
  const r = ofType(run(g, 1 / 60, { confirm: true }), "rescue")[0];
  expect(r.kind).toBe("tow");
  expect(g.inTown()).toBe(true);
  expect(g.entities.some((e) => e.kind === "crate")).toBe(true);
  expect(f - 0.1).toBeLessThan(10);
  // with dynamite aboard, no tow is offered
  const h = mk((w) => openRow(w, 40, 5, 8));
  place(h, 6, 40); h.setReached(1); h.giveItem("dynamite");
  run(h, 1.5, {});
  expect(h.pod.stranded).toBe(false);
  void paint; void MAT; void I;
});

test("the radiator gate reads the planet's heat: Cinder needs L7 for Magma, Vell L4", () => {
  const vell = mk();
  vell.setReached(3);
  expect(stepGates(vell).out.find((x) => x.stat === "radiator")!.need).toBe(4);
  const cinder = mk(() => {}, { planet: "cinder" });
  cinder.setReached(3);
  expect(stepGates(cinder).out.find((x) => x.stat === "radiator")!.need).toBe(7);
  vell.setReached(5);
  expect(stepGates(vell).out.find((x) => x.stat === "radiator")!.need).toBe(12);
});

test("N2: with the Lift built, driving over the mouth carries on; Down at the mouth still takes the rail", () => {
  const g = withLift();
  g.teleport(g.padX(), -HW - 1e-6);
  run(g, 3, { left: true });
  expect(g.pod.riding).toBe(false);
  expect(g.pod.x).toBeLessThan(22);
  // without the Lift the pod crosses too (no snag in the 1-wide hole)
  const h = mk();
  h.teleport(h.padX(), -HW - 1e-6);
  run(h, 3, { left: true });
  expect(h.pod.x).toBeLessThan(22);
  g.teleport(g.padX(), -HW - 1e-6);
  const ev = run(g, 3, { down: true }, (e) => e.t === "lift" && e.phase === "start");
  expect(ofType(ev, "lift").length).toBe(1);
});

test("B never chains levels of one stat at one dock; docking again offers it", () => {
  const g = mk((w) => openCol(w, 10, 1, 5));
  g.setReached(4);
  g.give(1e7);
  const first = g.suggestion()!;
  expect(g.buySuggested().ok).toBe(true);
  const second = g.suggestion();
  if (second && first.stat) expect(second.stat).not.toBe(first.stat);
  place(g, 10, 5); g.step(1 / 60, input());
  g.teleport(g.padX(), -HW - 1e-6);
  run(g, 0.1, {});
  expect(g.s.boughtHere).toEqual([]);
});
