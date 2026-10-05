// The pod (core-loop): fall damage, the braked fast drop, fuel burn by state, the fuel-to-home tick, tow, teleport,
// wreck (R1, D15), heat per D2/R6, the Lift.
import { expect, test } from "bun:test";
import { mk, place, run, timeTo, openCol, openRow, paint, ofType, input, MAT, HW, I } from "./seedfall-rules-kit.ts";
import { findByKey, tempAt } from "../seedfall/game/content/world.ts";
import { STAT_FX, fuelPrice } from "../seedfall/game/content/economy.ts";
import { fuelRow } from "../seedfall/game/pod.ts";

const copper = findByKey("copper")!.id;
const gold = findByKey("gold")!.id;

/** Drop the pod from rest with its bottom `h` tiles above the floor of an open shaft; returns the landing event. */
function drop(h: number, load?: (g: ReturnType<typeof mk>) => void) {
  const g = mk((w) => openCol(w, 10, 5, 29));
  load?.(g);
  g.teleport(10.5, 30 - h - HW - 1e-6);
  const ev = run(g, 3, {}, (e) => e.t === "land");
  return { g, land: ofType(ev, "land")[0] };
}

test("fall damage follows core-loop's table: 2 tiles free, 3 tiles 4 HP, 4.5+ tiles 15 HP (cap 12 tiles/s)", () => {
  expect(drop(2).land.damage).toBe(0);
  expect(drop(3).land.damage).toBeCloseTo(4, 0);
  expect(drop(4.5).land.damage).toBeCloseTo(15, 0);
  expect(drop(12).land.damage).toBeCloseTo(15, 0);
  // heavier pods take more: x k_m^0.5
  const heavy = drop(12, (g) => { g.pod.cargo[findByKey("lead")!.id] = 8; });
  expect(heavy.land.damage).toBeGreaterThan(15 * Math.sqrt(heavy.g.pod.load) - 1);
});

test("holding Down over an open column drops at up to 25 tiles/s and brakes 3 tiles above the floor: no damage", () => {
  const g = mk((w) => openCol(w, 10, 1, 79));
  g.teleport(10.5, 1.5);
  let vmax = 0;
  const ev: ReturnType<typeof run> = [];
  for (let k = 0; k < 240; k++) { ev.push(...g.step(1 / 60, input({ down: true }))); vmax = Math.max(vmax, g.pod.vy); if (ev.some((e) => e.t === "land")) break; }
  const land = ofType(ev, "land")[0];
  expect(vmax).toBeGreaterThan(24);
  expect(vmax).toBeLessThanOrEqual(25);
  expect(land.damage).toBe(0);
  expect(land.speed).toBeLessThanOrEqual(3.01);
  expect(g.pod.y).toBeCloseTo(80 - HW, 1);
  // 78 rows in about 3.5 s
  expect(g.time).toBeLessThan(4);
});

test("fuel burns by state: 0.04 idle below row 0, nothing in town, driving 0.10, drilling 0.12 + 0.04 x ratio", () => {
  const g = mk((w) => openRow(w, 10, 4, 20));
  place(g, 5, 10);
  let f = g.pod.fuel;
  run(g, 10, {});
  expect(f - g.pod.fuel).toBeCloseTo(0.4, 2);
  // in town
  const t = mk();
  f = t.pod.fuel;
  run(t, 10, {});
  expect(t.pod.fuel).toBe(f);
  // drilling loam (ratio 1): 0.16 L/s while the dig runs
  place(g, 5, 10);
  run(g, 0.2, { down: true });
  expect(g.pod.burn).toBeCloseTo(0.16, 3);
  // thrust: burn per row is fixed; per second it scales with the climb
  const k = g.pod.load;
  run(g, 0.5, { up: true });
  const h = 0.04 + 0.21 * Math.sqrt(k);
  expect(g.pod.burn).toBeCloseTo(Math.max(h, fuelRow(g, k) * -g.pod.vy), 3);
});

test("the home tick: 1.2 x (rows up x fuel_row + side / V_x x 0.10) to the nearest row-0 tile", () => {
  const g = mk((w) => { openCol(w, 24, 0, 20); openRow(w, 20, 24, 30); });
  place(g, 30, 20);
  g.step(1 / 60, input());
  const fr = fuelRow(g, 1);
  expect(g.pod.fuelHome).toBeCloseTo(1.2 * (20 * fr + (6 * 0.1) / STAT_FX.drive(0)), 3);
  // sealed in: Infinity; the sealed-in prompt is the warning, so no "turn back" home warning (QA P3)
  const s = mk((w) => openRow(w, 20, 4, 8));
  place(s, 5, 20);
  const ev = run(s, 0.3, {});
  expect(s.pod.fuelHome).toBe(Infinity);
  expect(ofType(ev, "warn").some((e) => e.what === "home" && e.level > 0)).toBe(false);
});

test("the Lift: bought one segment at a time, carved through anything; home is the lift head; rides at 40 tiles/s", () => {
  const g = mk((w) => { paint(w, 24, 30, MAT.IRONSTONE); openRow(w, 40, 25, 30); });
  g.setReached(1);
  g.give(1000);
  expect(g.buyLift().ok).toBe(true);
  expect(g.liftDepth).toBe(60);
  expect(g.world.mat[I(24, 30)]).toBe(0);
  // a side tunnel at row 40 joins the column: home is 6 tiles of driving, no climbing
  place(g, 30, 40);
  g.step(1 / 60, input());
  expect(g.pod.fuelHome).toBeCloseTo((1.2 * 6 * 0.1) / STAT_FX.drive(0), 3);
  // drive into the column, clamp, ride up to the depot: no fuel, about 1 s
  run(g, 3, { left: true }, (e) => e.t === "lift" && e.phase === "start");
  expect(g.pod.riding).toBe(true);
  const f = g.pod.fuel;
  const t = timeTo(g, 4, { up: true }, (e) => e.t === "lift" && e.phase === "stop");
  expect(t).toBeLessThan(1.6);
  expect(g.pod.fuel).toBeGreaterThanOrEqual(f);
  expect(g.inTown()).toBe(true);
});

test("out of fuel (R1): the engine cuts; a tow brings the pod only, the cargo stays as a crate, the fee is a full tank", () => {
  const g = mk((w) => openRow(w, 30, 4, 10));
  place(g, 6, 30);
  g.pod.cargo[copper] = 5;
  g.pod.fuel = 0;
  g.give(100);
  const ev = run(g, 1.2, {});
  expect(g.pod.stranded).toBe(true);
  expect(ofType(ev, "toast").length).toBe(1);
  const ev2 = run(g, 1 / 60, { confirm: true });
  const r = ofType(ev2, "rescue")[0];
  expect(r.kind).toBe("tow");
  expect(r.fee).toBe(Math.round(fuelPrice(0) * 10));
  expect(g.inTown()).toBe(true);
  expect(g.pod.cargoUsed).toBe(0);
  const crate = g.entities.find((e) => e.kind === "crate") as { cargo: Record<number, number>; x: number; y: number };
  expect(crate.cargo[copper]).toBe(5);
  expect(Math.floor(crate.y)).toBe(30);
});

test("the teleporter (R1): a 2.5 s channel, a hit cancels and keeps it; home with 70% of the pieces, cheapest lost first", () => {
  const g = mk((w) => openRow(w, 30, 4, 10));
  place(g, 6, 30);
  g.pod.cargo[copper] = 4;
  g.pod.cargo[gold] = 6;
  g.giveItem("teleport");
  run(g, 1 / 60, { item: 5 });
  run(g, 1, {});
  g.hurt(1, "test");
  expect(g.pod.channel).toBe(0);
  expect(g.pod.items.teleport).toBe(1);
  run(g, 0.5, {});
  run(g, 1 / 60, { item: 5 });
  const ev = run(g, 2.6, {});
  expect(ofType(ev, "teleport").some((e) => e.phase === "done")).toBe(true);
  expect(g.pod.items.teleport).toBe(0);
  // 10 pieces: ceil(3) lost, the copper first; the depot then sells the rest
  expect(g.inTown()).toBe(true);
  const sale = ofType(ev, "dock")[0].sale;
  expect(sale.lines.find((l) => l.find === copper)!.count).toBe(1);
  expect(sale.lines.find((l) => l.find === gold)!.count).toBe(6);
});

test("a wreck (D15): cargo into the crate (100% recoverable), pod rebuilt full; fee 10% of cash capped at the lost cargo", () => {
  const g = mk((w) => openRow(w, 30, 4, 12));
  place(g, 6, 30);
  g.pod.cargo[copper] = 3;
  g.give(1000);
  g.pod.invuln = 0;
  g.hurt(999, "test");
  const ev = run(g, 1.5, {});
  const r = ofType(ev, "rescue")[0];
  expect(r.kind).toBe("wreck");
  expect(r.fee).toBe(Math.round(3 * g.pieceValue(copper))); // cap: the cargo was worth less than 10% of cash
  expect(g.pod.hull).toBe(g.pod.hullMax);
  expect(g.pod.fuel).toBe(g.pod.fuelMax);
  expect(g.inTown()).toBe(true);
  // the next dive recovers it by touch
  place(g, 6, 30);
  run(g, 0.2, {});
  expect(g.pod.cargo[copper]).toBe(3);
  expect(g.entities.some((e) => e.kind === "crate")).toBe(false);
});

test("heat (D2, R6): frontier rows per radiator level; heat fills at over/20 %/s and cools 8 %/s", () => {
  const frontier = (L: number) => { let r = 0; for (let y = 0; y <= 770; y++) if (tempAt(y) <= STAT_FX.radiator(L)) r = y; else if (y > 300) break; return r; };
  expect(frontier(0)).toBe(312);
  expect(frontier(4)).toBe(400);
  expect(frontier(11)).toBe(535);
  expect(frontier(12)).toBeGreaterThanOrEqual(696);
  expect(frontier(16)).toBe(743);
  const g = mk((w) => openRow(w, 450, 4, 10));
  place(g, 6, 450);
  run(g, 1, {});
  const over = g.pod.temp - 120;
  expect(g.pod.heat).toBeCloseTo(over / 20 / 100, 2);
  g.set("radiator", 8);
  const h = g.pod.heat;
  run(g, 0.5, {});
  expect(g.pod.heat).toBeCloseTo(Math.max(0, h - 0.04), 2);
});

test("lava contact: 9 x D_b HP per second and +40% heat per second", () => {
  const g = mk((w) => { openRow(w, 450, 4, 10); paint(w, 8, 450, MAT.LAVA); });
  g.set("radiator", 20);
  g.set("hull", 10);
  place(g, 8, 450);
  const h0 = g.pod.hull;
  const ev = run(g, 1, {});
  expect(ofType(ev, "lava_touch").length).toBe(1);
  expect(h0 - g.pod.hull).toBeCloseTo(9 * Math.pow(1.6, 4), 0);
  expect(g.pod.heat).toBeCloseTo(0.4 - 0.08, 1); // +40%/s in contact, -8%/s below the radiator
});

test("dropping into the mine mouth from town never costs hull: the auto-brake covers the mouth column", () => {
  const g = mk((w) => openCol(w, 24, 4, 40));
  g.teleport(24.5, -HW - 1e-6);
  const ev = run(g, 4, {});
  const land = ofType(ev, "land")[0];
  expect(land.damage).toBe(0);
  expect(ofType(ev, "damage").length).toBe(0);
  expect(g.pod.hull).toBe(g.pod.hullMax);
  expect(g.pod.y).toBeGreaterThan(40);
});

test("a fast drop released mid-fall stays braked until it lands", () => {
  const g = mk((w) => openCol(w, 10, 1, 79));
  g.teleport(10.5, 1.5);
  const ev = run(g, 1.2, { down: true });
  expect(g.pod.vy).toBeGreaterThan(20);
  ev.push(...run(g, 4, {}));
  const land = ofType(ev, "land")[0];
  expect(land.damage).toBe(0);
  expect(land.speed).toBeLessThanOrEqual(3.01);
  // a fall off a ledge with no Down held still hurts (outside the mouth column)
  expect(drop(4.5).land.damage).toBeCloseTo(15, 0);
});
