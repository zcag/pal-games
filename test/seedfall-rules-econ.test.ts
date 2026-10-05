// The economy and meta: prices (progression), the dock's sale math and guards, shop actions, Ines' orders,
// research and modules (R7), prestige (R4, R6, D8), offline caps, the suggestion card (gates only).
import { expect, test } from "bun:test";
import { mk, place, run, openCol, paint, ofType, input, MAT } from "./seedfall-rules-kit.ts";
import { findByKey, CHAMBER } from "../seedfall/game/content/world.ts";
import { orePrice, upgradeCost, fuelPrice, repairPrice, itemPrice, shardsFor, rigYield, rigCost, LIFT_SEGMENTS, UPGRADES, ITEMS, GATES, SEED_AGE } from "../seedfall/game/content/economy.ts";
import { HW } from "../seedfall/game/pod.ts";

const copper = findByKey("copper")!.id, tin = findByKey("tin")!.id, heart = findByKey("heartstone")!.id;

test("prices follow progression: ore 8 x 1.95^(T-1), upgrades base x growth^L, fuel 0.4 x 2.2^b, items k x 10 x 2.9^b", () => {
  // progression's rounded table, within 3% (it rounds)
  const table = [8, 16, 30, 60, 115, 225, 440, 860, 1670, 3260, 6360, 12400];
  table.forEach((v, k) => expect(Math.abs(orePrice(k + 1) / v - 1)).toBeLessThan(0.03));
  for (const st of ["drill", "radiator", "tank", "cargo"] as const)
    for (const L of [0, 4, 9]) expect(upgradeCost(st, L)).toBe(Math.round(UPGRADES[st].base * Math.pow(UPGRADES[st].growth, L)));
  expect(fuelPrice(4)).toBeCloseTo(9.37, 2);
  expect(repairPrice(0)).toBeCloseTo(0.16, 5);
  expect(itemPrice("fuel", 0)).toBe(15);
  expect(itemPrice("teleport", 6)).toBe(Math.round(ITEMS.teleport.k * 10 * Math.pow(2.9, 6)));
  expect(rigYield(1, 2)).toBeCloseTo(rigYield(1, 1) * 1.5, 6);
  expect(rigCost(1, 1)).toBeGreaterThan(rigCost(1, 0));
  // the Lift: one segment per biome, each dearer than the last
  LIFT_SEGMENTS.forEach((l, k) => k && expect(l.price).toBeGreaterThan(LIFT_SEGMENTS[k - 1].price));
});

test("the shard formula (R4): floor(12 x (E / 1M)^0.6 x (1 + 0.2n) x (1 + 0.1 lens)) + 10, +5 for a planet's first launch", () => {
  expect(shardsFor(2.05e6, 0, 0, true)).toBe(33); // progression's run 1
  // E counts at Seed age 0's prices (E / 1.3^n), so later runs rise by the (1 + 0.2n), not by the age's value
  const ref = (E: number, n: number, lens: number) => Math.floor(12 * Math.pow(E / Math.pow(SEED_AGE.value, n) / 1e6, 0.6) * (1 + 0.2 * n) * (1 + 0.1 * lens));
  expect(shardsFor(2.06e6, 1, 0, true)).toBe(ref(2.06e6, 1, 0) + 15);
  expect(shardsFor(1e6, 1, 1, false)).toBe(ref(1e6, 1, 1) + 10);
  expect(shardsFor(0, 0, 0, false)).toBe(10);
});

/** Land on the depot forecourt from a short dive with cargo. */
function dockWith(g: ReturnType<typeof mk>, cargo: Record<number, number>, fuel: number, hull: number) {
  place(g, 10, 5);
  g.step(1 / 60, input());
  Object.assign(g.pod.cargo, cargo);
  g.pod.fuel = fuel; g.pod.hull = hull;
  g.s.orders = [];
  g.teleport(g.padX(), -HW - 1e-6);
  return run(g, 0.1, {});
}

test("the depot sells all, refuels and repairs, and says what it sold", () => {
  const g = mk((w) => openCol(w, 10, 1, 5));
  const cash = g.s.cash;
  const ev = dockWith(g, { [copper]: 3, [tin]: 2 }, 5, 30);
  const sale = ofType(ev, "dock")[0].sale;
  const sold = 3 * orePrice(1) + 2 * orePrice(2);
  expect(sale.lines.reduce((a, l) => a + l.value, 0)).toBeCloseTo(sold, 6);
  expect(sale.fuel).toBeCloseTo(5 * fuelPrice(0), 6);
  expect(sale.repair).toBeCloseTo(10 * repairPrice(0), 6);
  expect(sale.total).toBeCloseTo(sold - sale.fuel - sale.repair, 6);
  expect(g.s.cash).toBeCloseTo(cash + sale.total, 6);
  expect(g.pod.fuel).toBe(g.pod.fuelMax);
  expect(g.pod.hull).toBe(g.pod.hullMax);
  expect(g.pod.cargoUsed).toBe(0);
  expect(g.s.earned).toBeCloseTo(sold, 6);
});

test("the broke guard: an empty bay and no cash for half a tank refuels to 50% free, once per 10 minutes", () => {
  const g = mk((w) => openCol(w, 10, 1, 5));
  const ev = dockWith(g, {}, 0.5, 40);
  expect(g.pod.fuel).toBe(5);
  expect(ofType(ev, "toast").some((t) => t.text.includes("Ida"))).toBe(true);
  const ev2 = dockWith(g, {}, 0.5, 40);
  expect(g.pod.fuel).toBe(0.5);
  expect(ofType(ev2, "toast").some((t) => t.text.includes("skipped"))).toBe(true);
});

test("shop actions return { ok, why }: upgrades cost cash, raise the stat and keep fuel topped", () => {
  const g = mk();
  expect(g.buyUpgrade("drill")).toEqual({ ok: false, why: "Not enough cash." });
  g.give(100);
  expect(g.buyUpgrade("tank").ok).toBe(true);
  expect(g.s.cash).toBe(100 - upgradeCost("tank", 0));
  expect(g.pod.fuelMax).toBeCloseTo(12, 6);
  expect(g.pod.fuel).toBeCloseTo(12, 6);
  const ev = g.step(1 / 60, input());
  expect(ofType(ev, "buy")[0]).toMatchObject({ what: "upgrade", id: "tank", level: 1 });
  // not in the dive
  place(g, 24, 2);
  g.give(1000);
  expect(g.buyUpgrade("drill").ok).toBe(false);
});

test("items: sold from their biome, carry limits, restock to the loadout at the depot", () => {
  const g = mk((w) => openCol(w, 10, 1, 5));
  g.give(1000);
  expect(g.buyItem("dynamite").ok).toBe(false); // from Stone
  expect(g.buyItem("fuel", 5).ok).toBe(true);
  expect(g.pod.items.fuel).toBe(3);
  g.pod.items.fuel = 0;
  g.setLoadout("fuel", 2);
  dockWith(g, {}, 10, 40);
  expect(g.pod.items.fuel).toBe(2);
});

test("the Lift goes on sale per its segment table; segments cost what progression says", () => {
  const g = mk();
  g.give(1e6);
  expect(g.buyLift().ok).toBe(false);
  g.setReached(LIFT_SEGMENTS[0].onSale);
  expect(g.buyLift().ok).toBe(true);
  expect(g.s.cash).toBe(1e6 - LIFT_SEGMENTS[0].price);
  // the next segment waits for its own biome unless it opens at the same one
  expect(g.buyLift().ok).toBe(LIFT_SEGMENTS[1].onSale <= LIFT_SEGMENTS[0].onSale);
});

test("research spends data and opens with its biome; modules are unlocked with data and fit the slots (2, +1 Fungal, +1 Module Rack)", () => {
  const g = mk();
  g.giveData(2000);
  expect(g.buyResearch("G1").ok).toBe(true);
  expect(g.buyResearch("E1")).toEqual({ ok: false, why: "Opens once you reach Stone." });
  g.setReached(3);
  expect(g.buyResearch("E1").ok).toBe(true);
  expect(g.buyModule("tracer").ok).toBe(true);
  expect(g.buyModule("magnet").ok).toBe(true);
  expect(g.buyModule("dense").ok).toBe(true);
  expect(g.buyModule("overcharge").ok).toBe(false); // opens at Ruins
  expect(g.equipModule("heatsink").ok).toBe(false);
  expect(g.equipModule("magnet").ok).toBe(true);
  expect(g.equipModule("dense").ok).toBe(true);
  expect(g.pod.cargoMax).toBe(10);
  expect(g.equipModule("tracer")).toEqual({ ok: false, why: "No free module slot." });
  g.s.fungalSlot = true;
  expect(g.equipModule("tracer").ok).toBe(true);
  expect(g.buyResearch("E2").ok).toBe(true);
  expect(g.moduleSlots()).toBe(4);
  expect(g.s.data).toBe(2000 - 20 - 60 - 100 - 150 - 250 - 450);
});

test("Ines' orders: a count order multiplies those pieces x1.6; orders refresh every 3 docks", () => {
  const g = mk((w) => openCol(w, 10, 1, 5));
  place(g, 10, 5);
  g.step(1 / 60, input());
  g.pod.cargo[copper] = 4;
  g.pod.cargo[tin] = 4;
  g.s.orders = [{ id: "t1", kind: "count", find: copper, n: 3, mult: 1.6, text: "" }];
  g.teleport(g.padX(), -HW - 1e-6);
  const ev = run(g, 0.1, {});
  expect(ofType(ev, "order")[0]).toEqual({ t: "order", id: "t1", done: true });
  const lines = ofType(ev, "dock")[0].sale.lines;
  expect(lines.find((l) => l.find === copper)!.value).toBeCloseTo(4 * 8 * 1.6, 6);
  expect(g.s.ordersFilled).toBe(1);
  // a bonus is capped at 25% of the haul it pays on
  place(g, 10, 5); g.step(1 / 60, input());
  g.pod.cargo[copper] = 4;
  g.s.orders = [{ id: "t2", kind: "count", find: copper, n: 3, mult: 1.6, text: "" }];
  g.teleport(g.padX(), -HW - 1e-6);
  const sale = ofType(run(g, 0.1, {}), "dock")[0].sale;
  expect(sale.lines[0].value).toBeCloseTo(32 * 1.25, 6);
});

test("reaching a biome: data, the story beat, the Fungal module slot, free lance plans at the Core (R6)", () => {
  const g = mk((w) => { openCol(w, 10, 1, 700); });
  g.set("radiator", 20); g.set("hull", 20);
  const data = g.s.data;
  g.teleport(10.5, 290);
  const ev = run(g, 0.1, {});
  expect(ofType(ev, "biome")[0]).toMatchObject({ biome: 3, first: true });
  expect(g.s.reached).toBe(3);
  expect(g.s.fungalSlot).toBe(true);
  expect(g.s.data - data).toBeGreaterThanOrEqual(25 + 50 + 75);
  expect(ofType(ev, "toast").some((t) => t.text.includes("makes its own light"))).toBe(true);
  g.teleport(10.5, 690);
  run(g, 0.1, {});
  expect(g.s.plans).toBe(true);
});

test("the suggestion card picks the cheapest missing gate (never a module); B buys it", () => {
  const g = mk();
  const sg = g.suggestion()!;
  expect(sg.kind).toBe("upgrade");
  // nothing gates Stone: the best-payback comfort level (never a module)
  expect(["drill", "cargo", "tank", "engine"]).toContain(sg.stat!);
  g.give(sg.cost);
  expect(g.buySuggested().ok).toBe(true);
  expect(g.s.levels[sg.stat!]).toBe(1);
  expect(g.s.cash).toBe(0);
  g.set("drill", 1);
  // in Stone, the step to Crystal: entry drill 3, hull 2, and the Topsoil Lift segment
  g.setReached(1);
  const goal = g.nextGoal();
  expect(goal.kind).toBe("biome");
  if (goal.kind === "biome") {
    expect(goal.gates.map((x) => x.stat)).toEqual(["drill", "hull", "lift"]);
    expect(goal.gates[0]).toMatchObject({ have: 1, need: GATES[2].drill, cost: upgradeCost("drill", 1) + upgradeCost("drill", 2) });
  }
  const gates = goal.kind === "biome" ? goal.gates : [];
  const cheapest = gates.reduce((a, x) => (x.stat === "lift" ? x.cost : g.upgradePrice(x.stat as "drill")) < (a.stat === "lift" ? a.cost : g.upgradePrice(a.stat as "drill")) ? x : a);
  expect(g.suggestion()!.kind).toBe(cheapest.stat === "lift" ? "lift" : "upgrade");
});

test("prestige (D8, R4): launch at the Seed with the lance and 5 Heartstone; upgrades and cash reset, research and data persist", () => {
  const g = mk((w) => openCol(w, 24, 1, 760));
  g.giveData(500);
  g.buyResearch("G1");
  g.give(1e6);
  g.s.plans = true;
  for (const p of ["frame", "coil", "head"]) expect(g.buyLancePart(p).ok).toBe(true);
  g.set("drill", 10);
  g.s.earned = 2.3e6;
  g.teleport(CHAMBER.cx, CHAMBER.cy - 4);
  expect(g.launch().ok).toBe(false);
  g.pod.cargo[heart] = 6;
  expect(g.launch().ok).toBe(true);
  expect(g.pod.cargo[heart]).toBe(1);
  expect(g.s.shards).toBe(shardsFor(2.3e6, 0, 0, true) + 2 + 3); // + Seedfall's 2 and Speedrun's 3
  const data = g.s.data;
  const ev = run(g, 20, {});
  expect(ofType(ev, "launch").find((e) => e.phase === "shards")!.count).toBe(g.s.launch!.shards);
  expect(ofType(ev, "launch").map((e) => e.phase)).toEqual(["wake", "rise", "break", "sky", "shards", "wash"]);
  expect(g.choosePlanet("cinder").ok).toBe(true);
  expect(g.s.planet).toBe("cinder");
  expect(g.s.launches).toBe(1);
  expect(g.s.levels.drill).toBe(0);
  expect(g.s.cash).toBe(0);
  expect(g.s.research).toContain("G1");
  expect(g.s.data).toBeGreaterThanOrEqual(data);
  expect(g.s.lance).toEqual([]);
  expect(g.inTown()).toBe(true);
  // Seed age 1: value x1.3; Cinder's x1.3 only on its own biome's ores (Jade, Sunstone, ...)
  expect(g.pieceValue(copper)).toBeCloseTo(8 * 1.3, 6);
  const jade = findByKey("jade")!;
  expect(g.pieceValue(jade.id)).toBeCloseTo(orePrice(jade.tier) * 1.3 * 1.3, 6);
  expect(g.hazardScale(10)).toBeCloseTo(1.08, 6);
  // perks spend shards
  expect(g.buyPerk("headstart").ok).toBe(true);
});

test("offline: rigs fill the silo up to its cap (2 h), the lab trickles data, 6 h away gives the rested bonus", () => {
  const t0 = 1.7e12;
  const g = mk(() => {}, { now: t0 });
  g.setReached(1);
  g.give(1000);
  expect(g.buildRig(1).ok).toBe(true);
  g.save(t0);
  const card = g.applyOffline(t0 + 10 * 3600e3)!;
  expect(card.counted).toBe(7200);
  expect(card.full).toBe(true);
  const perMin = rigYield(1, 1);
  expect(card.cash).toBeCloseTo(perMin * 120, 6);
  expect(g.s.rested).toBe(3);
  expect(g.collectOffline().ok).toBe(true);
  expect(g.s.cash).toBeCloseTo(1000 - rigCost(1, 0) + perMin * 120, 0);
  // a clock set backwards counts as nothing; under 5 minutes shows no card
  expect(g.applyOffline(t0)).toBe(null);
  expect(g.applyOffline(t0 + 60e3)).toBe(null);
});

test("the stall guard: no purchase in 3 dives switches the card to the best payback and the goal says about how many dives", () => {
  const g = mk();
  g.setReached(1);
  g.set("drill", 1);
  expect(g.suggestion()!.kind).toBe("lift");
  g.s.dives = 3;
  g.s.hauls = [100, 100];
  const sg = g.suggestion()!;
  expect(sg.kind).toBe("upgrade");
  const goal = g.nextGoal();
  expect(goal.kind === "biome" && goal.about).toBeGreaterThan(0);
  g.give(100);
  g.buyUpgrade("tank");
  expect(g.suggestion()!.kind).toBe("lift");
});

test("the thin-ore guard: reached bands mined under a third with a gate unaffordable: the depot marks the best vein", () => {
  const g = mk((w) => { for (let x = 2; x < 20; x++) paint(w, x, 12, MAT.LOAM, copper); paint(w, 30, 14, MAT.LOAM, tin); });
  expect(g.s.bandOre[1]).toBe(19);
  for (let x = 2; x < 20; x++) g.world.find[12 * 48 + x] = 0;
  g.s.deepest = 15;
  g.setReached(1);
  expect(g.s.cash).toBe(0);
  const ev = dockWith(g, { [copper]: 1 }, 10, 40);
  expect(g.s.mark).toMatchObject({ x: 30, y: 14, find: tin });
  expect(ofType(ev, "toast").some((t) => t.text.includes("marked"))).toBe(true);
});
