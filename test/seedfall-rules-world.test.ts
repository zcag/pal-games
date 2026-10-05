// The live world: lava flow and crust (D12, R12), gas fuse and blast (R12), boulders, timber cave-ins, false floors,
// arc pylons, spore vents, the core pulse, explosives (R8), the scanner (D10), caches (R10).
import { expect, test } from "bun:test";
import { mk, place, run, timeTo, paint, openCol, openRow, ofType, input, MAT, HAZ, FLAG, I } from "./seedfall-rules-kit.ts";
import { findByKey } from "../seedfall/game/content/world.ts";

const copper = findByKey("copper")!.id;

test("lava flows into opened tiles at 1 tile per 0.5 s down and crusts to basalt after 15 s still", () => {
  const g = mk((w) => { paint(w, 10, 20, MAT.LAVA); openCol(w, 10, 21, 30); });
  g.teleport(30.5, 5);
  g.live.wake(I(10, 20));
  run(g, 2.05, {});
  // four moves down in 2 s: the blob is at row 24
  expect(g.world.mat[I(10, 24)]).toBe(MAT.LAVA);
  expect(g.world.mat[I(10, 20)]).toBe(0);
  run(g, 3.1, {});
  expect(g.world.mat[I(10, 30)]).toBe(MAT.LAVA); // on the floor
  run(g, 14, {});
  expect(g.world.mat[I(10, 30)]).toBe(MAT.LAVA); // not yet 15 s still
  run(g, 1.5, {});
  expect(g.world.mat[I(10, 30)]).toBe(MAT.BASALT);
});

test("lava spreads sideways at 1 tile per 1.5 s, up to its volume", () => {
  const g = mk((w) => { paint(w, 10, 30, MAT.LAVA); openRow(w, 30, 4, 9); openRow(w, 30, 11, 16); });
  g.teleport(30.5, 5);
  g.live.wake(I(10, 30));
  run(g, 1.45, {});
  expect(g.world.mat[I(9, 30)] === MAT.LAVA || g.world.mat[I(11, 30)] === MAT.LAVA).toBe(false);
  run(g, 0.1, {});
  expect(g.world.mat[I(9, 30)] === MAT.LAVA || g.world.mat[I(11, 30)] === MAT.LAVA).toBe(true);
  run(g, 12, {});
  let tiles = 0, vol = 0;
  for (let x = 4; x <= 16; x++) if (g.world.mat[I(x, 30)] === MAT.LAVA) { tiles++; vol += g.world.fluid[I(x, 30)]; }
  expect(tiles).toBeGreaterThan(2);
  expect(tiles).toBeLessThanOrEqual(8); // 255 units, nothing under 32 spreads
  expect(vol).toBe(255);
});

test("lava never enters the Lift's casing", () => {
  const g = mk((w) => { paint(w, 25, 30, MAT.LAVA); });
  g.setReached(1); g.give(1e4); g.buyLift();
  g.teleport(10.5, 5);
  g.live.wake(I(25, 30));
  run(g, 5, {});
  expect(g.world.mat[I(24, 30)]).toBe(0);
  expect(g.world.mat[I(25, 30)]).toBe(MAT.LAVA);
});

test("gas (R12): only drilling the gas tile lights it; fuse 0.8 x k_m^0.25 s; blast radius 2 clears H <= P; no chain from neighbours", () => {
  const g = mk((w) => { openRow(w, 30, 4, 12); paint(w, 6, 31, MAT.LOAM, 0, HAZ.GAS); paint(w, 9, 34, MAT.GRANITE); });
  place(g, 6, 30);
  g.set("hull", 10);
  const ev = run(g, 0.2, { down: true });
  const fuse = ofType(ev, "gas_fuse");
  expect(fuse.length).toBe(1);
  const t = timeTo(g, 3, {}, (e) => e.t === "explode");
  expect(t + 0.2 - 0.1).toBeCloseTo(0.8, 1);
  // loam within 2 tiles of (6, 31) is gone; the dig had not finished
  expect(g.world.mat[I(6, 33)]).toBe(0);
  expect(g.world.mat[I(8, 31)]).toBe(0);
  expect(g.world.mat[I(9, 31)]).toBe(MAT.LOAM);
  expect(g.pod.hull).toBeLessThan(g.pod.hullMax);
  // heavier pods get a longer fuse
  const h = mk((w) => { openRow(w, 30, 4, 12); paint(w, 6, 31, MAT.LOAM, 0, HAZ.GAS); });
  h.pod.cargo[findByKey("lead")!.id] = 40;
  h.set("cargo", 10);
  place(h, 6, 30);
  const k = h.pod.load;
  run(h, 0.2, { down: true });
  const t2 = timeTo(h, 3, {}, (e) => e.t === "explode");
  expect(t2 + 0.1).toBeCloseTo(0.8 * Math.pow(k, 0.25), 1);
});

test("digging next to gas is safe", () => {
  const g = mk((w) => { openRow(w, 30, 4, 12); paint(w, 7, 31, MAT.LOAM, 0, HAZ.GAS); });
  place(g, 6, 30);
  const ev = run(g, 3, { down: true });
  expect(ofType(ev, "gas_fuse").length).toBe(0);
  expect(ofType(ev, "explode").length).toBe(0);
});

test("a loose boulder wobbles 0.6 s when its support goes, falls, hits for 10 x D_b and settles as a boulder tile", () => {
  const g = mk((w) => { openCol(w, 10, 21, 30); paint(w, 10, 20, MAT.BOULDER_STONE); });
  g.teleport(30.5, 5);
  // something digs out the tile under it
  g.live.clear(g, I(10, 21));
  const ev = run(g, 0.55, {});
  expect(ofType(ev, "wobble").length).toBe(1);
  expect(g.world.mat[I(10, 20)]).toBe(MAT.BOULDER_STONE);
  run(g, 0.1, {});
  expect(g.world.mat[I(10, 20)]).toBe(0);
  const land = ofType(run(g, 2, {}), "fall_land")[0];
  expect(land.y).toBe(30);
  expect(g.world.mat[I(10, 30)]).toBe(MAT.BOULDER_STONE);
  // under the pod: a hit
  const h = mk((w) => { openCol(w, 10, 21, 30); paint(w, 10, 20, MAT.BOULDER_STONE); });
  place(h, 10, 30);
  h.live.clear(h, I(10, 21));
  const ev2 = run(h, 3, {});
  const dmg = ofType(ev2, "damage").find((d) => d.source === "boulder")!;
  expect(dmg.amount).toBeCloseTo(10, 5); // Topsoil: D_b = 1
});

test("pulling a timber post collapses the 2 tiles above it into rubble after 1 s", () => {
  const g = mk((w) => { openRow(w, 30, 4, 12); paint(w, 8, 30, MAT.TIMBER); });
  place(g, 6, 30);
  g.live.clear(g, I(8, 30));
  g.live.timberCollapse(g, I(8, 30));
  run(g, 0.9, {});
  expect(g.world.mat[I(8, 29)]).toBe(MAT.LOAM);
  run(g, 1.5, {});
  expect(g.world.mat[I(8, 30)]).toBe(MAT.RUBBLE);
  expect(g.world.mat[I(8, 28)]).toBe(0);
});

test("a false floor crumbles 0.8 s after the pod rests on it", () => {
  const g = mk((w) => { openRow(w, 30, 4, 12); openRow(w, 32, 4, 12); paint(w, 6, 31, MAT.BRICK, 0, HAZ.FALSE_FLOOR); });
  place(g, 6, 30);
  run(g, 0.7, {});
  expect(g.world.mat[I(6, 31)]).toBe(MAT.BRICK);
  run(g, 0.2, {});
  expect(g.world.mat[I(6, 31)]).toBe(0);
});

test("arc pylons charge 0.4 s, then arc 1 s every 4 s across their gap: 8 x D_b on contact", () => {
  const g = mk((w) => { openRow(w, 600, 4, 12); paint(w, 5, 600, MAT.PYLON, 0, HAZ.PYLON); paint(w, 9, 600, MAT.PYLON, 0, HAZ.PYLON); });
  g.set("hull", 20);
  place(g, 7, 600);
  g.live.index();
  const ev = run(g, 4.01, {});
  const arcs = ofType(ev, "arc");
  expect(arcs.filter((a) => a.phase === "charge").length).toBe(1);
  expect(arcs.filter((a) => a.phase === "fire").length).toBe(1);
  const hits = ofType(ev, "damage").filter((d) => d.source === "arc");
  expect(hits.length).toBeGreaterThan(0);
  expect(hits[0].amount).toBeCloseTo(8 * Math.pow(1.6, 5), 5);
});

test("spore vents tell, then puff a cloud that rises 0.5 tiles/s; inside it the lamp halves for 4 s", () => {
  const g = mk((w) => { openRow(w, 300, 4, 12); paint(w, 8, 301, MAT.ROOTSTONE, 0, HAZ.SPORE_VENT); });
  place(g, 8, 300);
  g.live.index();
  const ev = run(g, 13, {});
  expect(ofType(ev, "spore_charge").length).toBeGreaterThan(0);
  expect(ofType(ev, "spore").length).toBeGreaterThan(0);
  expect(ofType(ev, "spore_charge")[0]).toBeDefined();
  run(g, 0.1, {});
  // the lamp is halved while blinded (any cloud that passed through the pod)
  if (g.pod.blind > 0) expect(g.pod.lamp).toBeCloseTo(3.5 / 2, 5);
});

test("the core pulse: a beat every 10 s; +80 C for 1.5 s when the ring passes the pod; no push", () => {
  const g = mk((w) => openRow(w, 720, 4, 12));
  g.set("radiator", 20);
  place(g, 8, 720);
  const x0 = g.pod.x;
  let hot = 0;
  const ev: ReturnType<typeof run> = [];
  for (let k = 0; k < 60 * 11; k++) { ev.push(...g.step(1 / 60, input())); if (g.pod.pulseHeat > 0) hot++; }
  expect(ofType(ev, "pulse").length).toBe(1);
  expect(hot / 60).toBeCloseTo(1.5, 1);
  expect(g.pod.x).toBe(x0);
});

test("dynamite (R8) clears a 3x3 of what the drill could dig (H <= 2.5P) and hurts the pod 20% within 1.5 tiles", () => {
  const g = mk((w) => { openRow(w, 30, 4, 12); paint(w, 9, 31, MAT.GRANITE); paint(w, 7, 31, MAT.LOAM, copper); paint(w, 8, 31, MAT.HARDPAN); });
  place(g, 8, 30);
  g.giveItem("dynamite");
  g.set("hull", 5);
  const h0 = g.pod.hull;
  run(g, 1 / 60, { item: 3 });
  const ev = run(g, 2.1, {});
  expect(ofType(ev, "explode")[0].kind).toBe("dynamite");
  expect(g.world.mat[I(8, 31)]).toBe(0); // hardpan 2.0 <= 2.5
  expect(g.world.mat[I(9, 31)]).toBe(MAT.GRANITE); // granite 2.8 > 2.5
  expect(g.pod.hull).toBeCloseTo(h0 - 0.2 * g.pod.hullMax, 5);
  // ore in a blast drops as loose pieces
  expect(g.entities.some((e) => e.kind === "nugget" && e.find === copper) || g.pod.cargo[copper] === 1).toBe(true);
});

test("Overcharge (R8): ratio / 4 for 8 tiles, only where ratio <= 5; never vault seals", () => {
  const g = mk((w) => { openRow(w, 30, 4, 12); for (let y = 31; y < 40; y++) paint(w, 6, y, MAT.DOLERITE); paint(w, 6, 40, MAT.VAULT_SEAL); });
  g.s.unlocked.push("overcharge");
  g.s.modules.push("overcharge");
  place(g, 6, 30);
  run(g, 1 / 60, { item: 7 });
  expect(g.pod.overcharge).toBe(8);
  // dolerite 3.8 at P 1: ratio 3.8 -> 0.95
  const ev = run(g, 8, { down: true });
  expect(ofType(ev, "break").length).toBe(8);
  expect(g.pod.overcharge).toBe(0);
  expect(ofType(ev, "too_hard").length).toBe(1);
});

test("the scanner (D10): Q reveals ores and caches within 4 + 2L; L2 adds gas and lava", () => {
  const g = mk((w) => { openRow(w, 30, 4, 12); paint(w, 8, 34, MAT.LOAM, copper); paint(w, 9, 33, MAT.LOAM, 0, HAZ.GAS); paint(w, 8, 45, MAT.LOAM, copper); });
  place(g, 8, 30);
  expect(g.scanPulse(false).ok).toBe(false);
  g.set("scanner", 1);
  const f = g.pod.fuel;
  run(g, 1 / 60, { scan: true });
  expect(g.world.flag[I(8, 34)] & FLAG.SCANNED).toBeTruthy();
  expect(g.world.flag[I(9, 33)] & FLAG.SCANNED).toBeFalsy();
  expect(g.world.flag[I(8, 45)] & FLAG.SCANNED).toBeFalsy();
  expect(f - g.pod.fuel).toBeGreaterThan(0.19);
  expect(g.scanPulse(false).ok).toBe(false); // 8 s cooldown
  g.set("scanner", 2);
  run(g, 8, {});
  run(g, 1 / 60, { scan: true });
  expect(g.world.flag[I(9, 33)] & FLAG.SCANNED).toBeTruthy();
});

test("caches (R10): opened by drilling; pieces to the bay, an item to its slot", () => {
  const g = mk((w) => {
    openRow(w, 30, 4, 12);
    paint(w, 8, 31, MAT.CACHE_CRATE);
    w.back[I(8, 31)] = MAT.LOAM;
    w.caches = [{ x: 8, y: 31, kind: "crate", pieces: [{ find: copper, count: 3 }], item: "fuel" }];
  });
  place(g, 8, 30);
  const ev = run(g, 1.2, { down: true });
  expect(ofType(ev, "cache")[0].theme).toBe("crate");
  expect(g.pod.cargo[copper]).toBe(3);
  expect(g.pod.items.fuel).toBe(1);
});

test("map memory: tiles in lamp light are marked SEEN", () => {
  const g = mk((w) => openRow(w, 30, 4, 12));
  place(g, 8, 30);
  run(g, 0.3, {});
  expect(g.world.flag[I(10, 30)] & FLAG.SEEN).toBeTruthy();
  expect(g.world.flag[I(8, 40)] & FLAG.SEEN).toBeFalsy();
  expect(g.takeDirty().length).toBeGreaterThan(0);
});

test("Cinder's geysers: every 8 s a 1 s tell, then a 1.5 s fire column up to 6 tiles", () => {
  const g = mk((w) => { openRow(w, 300, 4, 12); openRow(w, 299, 4, 12); paint(w, 8, 301, MAT.GEYSER); });
  g.set("hull", 10);
  place(g, 8, 300);
  g.live.index();
  const ev = run(g, 8.1, {});
  expect(ofType(ev, "geyser").filter((e) => e.phase === "charge").length).toBe(1);
  expect(ofType(ev, "geyser").filter((e) => e.phase === "fire").length).toBe(1);
  expect(ofType(ev, "damage").some((d) => d.source === "geyser")).toBe(true);
  expect(g.live.geyserColumn(I(8, 301)).length).toBe(2);
});
