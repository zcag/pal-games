import { describe, expect, test } from "bun:test";
import { Vehicle } from "../highway/game/vehicle.ts";
import { Director } from "../highway/game/director.ts";
import { Score } from "../highway/game/score.ts";
import { CARS, FEEL, MODES, spec, upgradeCost } from "../highway/game/content.ts";
import { Drive } from "../highway/game/drive.ts";
import { ONE_WAY, edges, laneX, RAIL } from "../highway/game/layout.ts";
import { SPRINTS, starTimes, starsFor, ghostTimeAt, ghostAt, GHOST_DT } from "../highway/game/sprint.ts";
import { fresh, buyCar, buyUpgrade, load, stored, pickFor, finishSprintRun, finishFree, type Save } from "../highway/game/meta.ts";
import { REGIONS, BOSS_STARS, sprintsOf, rivalTime } from "../highway/game/sprint.ts";
import { closed, regionOpen, starsIn, bossOf, FINISH_PAY, STAR_PAY, nextStop } from "../highway/game/trip.ts";
import { declared, manifestOf, merge, problems, storedKeys } from "./game-accounts.ts";

const NO_UP = { speed: 0, handling: 0, brakes: 0 };

test("every car reaches about its top speed, and brakes from 100 km/h to a crawl in about a second", () => {
  for (const car of [CARS[0], CARS[CARS.length - 1]]) {
    const v = new Vehicle(spec(car, NO_UP, 2.6));
    for (let i = 0; i < 120 * 70; i++) v.step(1 / 120, { throttle: 1, brake: 0, steer: 0 });
    expect(Math.abs(v.kmh / FEEL.pace - car.top) / car.top).toBeLessThan(0.08);
    const b = new Vehicle(spec(car, NO_UP, 2.6));
    b.launch((100 / 3.6) * FEEL.pace);
    let t = 0;
    while (b.kmh / FEEL.pace > FEEL.crawl + 1 && t < 5) { b.step(1 / 120, { throttle: 0, brake: 1, steer: 0 }); t += 1 / 120; }
    expect(t).toBeLessThan(1.5);
    for (let i = 0; i < 240; i++) b.step(1 / 120, { throttle: 0, brake: 1, steer: 0 });
    expect(b.kmh / FEEL.pace).toBeGreaterThan(FEEL.crawl - 1); // the brakes never stop you on the highway
  }
});

test("a tap of the steering moves the car across and lets it straighten, without a spin", () => {
  const v = new Vehicle(spec(CARS[6], NO_UP, 2.6));
  v.launch(220 / 3.6);
  for (let i = 0; i < 120 * 4; i++) v.step(1 / 120, { throttle: 0.5, brake: 0, steer: i < 60 ? 1 : 0 });
  expect(v.x).toBeGreaterThan(1);
  expect(Math.abs(v.yaw)).toBeLessThan(0.05);
});

test("the director never fills every lane of a row", () => {
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const d = new Director({ lanes: 4, oncomingLanes: 0, topSpeed: 70, rnd });
  const cars: { lane: number; z: number; oncoming: boolean }[] = [];
  for (let z = 0; z < 30000; z += 200) {
    d.time = z / 60;
    d.plan(z, 60, cars);
  }
  for (const c of cars) {
    const near = new Set(cars.filter((o) => Math.abs(o.z - c.z) < 10).map((o) => o.lane));
    expect(near.size).toBeLessThan(4);
  }
});

test("a near miss counts only fast and close, and builds a combo", () => {
  const s = new Score();
  expect(s.pass(0.5, 75, false)).toBeNull();
  expect(s.pass(1.5, 150, false)).toBeNull();
  const a = s.pass(0.5, 150, false)!, b = s.pass(0.2, 150, true)!;
  expect(a.combo).toBe(1);
  expect(b.combo).toBe(2);
  expect(b.points).toBeGreaterThan(a.points * 3);
  s.tick(5, 150, false);
  expect(s.combo).toBe(0);
});

// the trip's rules read each Sprint's best time; until scripts/sprint.ts has set them all, a stand-in
for (const sp of SPRINTS) sp.best ||= 60;
const timed = (time: number) => Object.assign(new Score(), { time, distance: 3000 });

test("buying needs the cash and the car's region open, and a save survives a round trip", () => {
  const s = fresh();
  expect(buyCar(s, CARS[1])).toBe(false);
  s.cash = 100000;
  expect(buyCar(s, CARS[1])).toBe(true);
  expect(buyCar(s, CARS[3])).toBe(false); // a Sport car: High Noon is not open
  expect(buyUpgrade(s, CARS[1], "speed")).toBe(true);
  const back = load(JSON.parse(JSON.stringify(stored(s))));
  expect(back.owned[CARS[1].id].upgrades.speed).toBe(1);
});

describe("the road trip", () => {
  test("a region's first three stops are open, each finish opens one more, the duel opens at its stars", () => {
    const times: Record<string, number> = {}, list = sprintsOf(0);
    expect(list.map((x) => closed(x, times) === null)).toEqual([true, true, true, false, false, false, false, false, false]);
    times[list[0].id] = 999;
    expect(closed(list[3], times)).toBeNull();
    expect(closed(list[4], times)).not.toBeNull();
    for (const x of list.slice(0, 8)) times[x.id] = starTimes(x)[1]; // two stars each
    expect(starsIn(0, times)).toBe(16);
    expect(closed(list[8], times)).toBeNull();
    expect(BOSS_STARS).toBeLessThanOrEqual(16);
    expect(regionOpen(1, times)).toBe(false);
  });

  test("a finish pays every time, a star only the first time; winning the duel gives the rival's car and opens the next region", () => {
    const s = fresh(), sp = sprintsOf(0)[0];
    const first = finishSprintRun(s, sp, timed(starTimes(sp)[0]));
    expect(first.cash).toBe(FINISH_PAY[0] + STAR_PAY[0]);
    const again = finishSprintRun(s, sp, timed(starTimes(sp)[0] - 0.05));
    expect(again.cash).toBe(FINISH_PAY[0]);
    const better = finishSprintRun(s, sp, timed(starTimes(sp)[2]));
    expect(better.cash).toBe(FINISH_PAY[0] + STAR_PAY[0] * 2 + STAR_PAY[0] * 3);
    const boss = bossOf(0);
    const lost = finishSprintRun(s, boss, timed(rivalTime(boss) + 1));
    expect(lost.duel).toEqual({ won: false });
    const win = finishSprintRun(s, boss, timed(rivalTime(boss) - 1));
    expect(win.duel?.won).toBe(true);
    expect(win.duel?.car?.id).toBe(boss.boss!.car);
    expect(win.duel?.opened).toBe(REGIONS[1].name);
    expect(s.owned[boss.boss!.car]).toBeDefined();
    expect(regionOpen(1, s.sprints)).toBe(true);
    expect(pickFor(s, 1)?.id).toBe(boss.boss!.car); // the won car drives the new region
  });

  test("the next stop is the first open one still short of its stars, in the furthest open region", () => {
    const times: Record<string, number> = {};
    expect(nextStop(times).id).toBe(sprintsOf(0)[0].id);
    times[sprintsOf(0)[0].id] = starTimes(sprintsOf(0)[0])[2];
    expect(nextStop(times).id).toBe(sprintsOf(0)[1].id);
  });

  test("Free Drive pays by the minute in the car's region", () => {
    const s = fresh();
    const res = finishFree(s, timed(120), "endless", CARS[0]);
    expect(res.cash).toBe(FINISH_PAY[0] * 2);
    expect(s.cash).toBe(res.cash);
  });
});

describe("accounts", () => {
  const m = manifestOf("highway");
  const rule = m.sync.save as { fields: Record<string, { fields: Record<string, unknown> }> };

  test("every stored key has a rule (a kept run and a staged scene stay on this machine), every car and mode merges field by field", () => {
    expect(problems(m)).toEqual([]);
    expect(Object.keys(m.sync).sort()).toEqual(storedKeys("highway"));
    expect([m.sync.run, m.sync.scene]).toEqual(["local", "local"]);
    expect(Object.keys(rule.fields.owned.fields)).toEqual(CARS.map((c) => c.id));
    expect(Object.keys(rule.fields.best.fields)).toEqual(MODES.map((x) => x.id));
    expect(Object.keys(rule.fields).sort()).toEqual(Object.keys(stored(fresh())).sort());
  });

  test("each mode has its board, the one a finished run posts to", () => {
    for (const x of MODES) expect(declared(m, x.id), x.id).toMatchObject({ title: x.name, order: "desc", format: "points" });
  });

  test("each Sprint and duel has a board for its time, lower is better, and the trip one for its stars", () => {
    for (const sp of SPRINTS) expect(declared(m, `sprint/${sp.id}`), sp.id).toMatchObject({ title: expect.stringContaining(sp.name), order: "asc", format: "time" });
    expect(declared(m, "stars")).toMatchObject({ order: "desc", max: SPRINTS.length * 3 });
    expect(m.leaderboards!.length).toBe(MODES.length + SPRINTS.length + 1);
  });

  test("two machines that both played since they synced keep the cash, cars, upgrades, best times and records of both", () => {
    const base = fresh();
    base.cash = 10000;
    const synced = JSON.parse(JSON.stringify(stored(base))) as Save;
    const a = load(structuredClone(synced)), b = load(structuredClone(synced));
    const [x, y] = sprintsOf(0);
    // a buys a car and upgrades it, sets a best, a record
    buyCar(a, CARS[1]); buyUpgrade(a, CARS[1], "speed");
    a.sprints[x.id] = 70; a.sprints[y.id] = 80;
    a.best.endless = { score: 40000, distance: 9000, combo: 5, topSpeed: 230 };
    a.totals.runs += 3;
    // b earns cash, upgrades the first car, does better on one Sprint and on Two-Way
    b.cash += 4000;
    buyUpgrade(b, CARS[0], "brakes");
    b.sprints[x.id] = 65;
    b.best.twoway = { score: 52000, distance: 7000, combo: 8, topSpeed: 210 };
    b.totals.runs += 2;
    const merged = load(merge(m.sync.save, stored(b), merge(m.sync.save, stored(a), synced, synced), synced));
    expect(merged.cash).toBe(10000 + (a.cash - 10000) + (b.cash - 10000));
    expect(merged.owned[CARS[1].id].upgrades.speed).toBe(1);
    expect(merged.owned[CARS[0].id].upgrades.brakes).toBe(1);
    expect(merged.sprints).toEqual({ [x.id]: 65, [y.id]: 80 });
    expect(merged.best).toMatchObject({ endless: { score: 40000 }, twoway: { score: 52000 } });
    expect(merged.totals.runs).toBe(5);
  });
});

test("Speed Trap ends a run held under its floor; Time Attack's clock runs down", () => {
  const size = { x: 1.9, z: 4.5 }, sizeOf = () => size;
  const trap = new Drive(ONE_WAY, CARS[6], NO_UP, size, 2.6, sizeOf, {}, { seed: 3, mode: "trap" });
  for (let i = 0; i < 120 * 6 && !trap.ended; i++) trap.step(1 / 120, { throttle: 0, brake: 1, steer: 0 });
  expect(trap.ended).toBe("slow");
  const time = new Drive(ONE_WAY, CARS[6], NO_UP, size, 2.6, sizeOf, {}, { seed: 3, mode: "time" });
  for (let i = 0; i < 120; i++) time.step(1 / 120, { throttle: 0.3, brake: 0, steer: 0 });
  expect(time.clock).toBeCloseTo(59, 1);
  // the HUD's second figure: the road left to the next checkpoint, and what it adds
  expect(time.toCheckpoint).toBeCloseTo(2500 - time.score.distance, 6);
  expect(time.bonus).toBe(30);
  time.score.distance = 2500;
  time.step(1 / 120, { throttle: 0.3, brake: 0, steer: 0 });
  expect([time.checkpoints, time.bonus, Math.round(time.toCheckpoint / 100)]).toEqual([1, 27, 25]);
});

test("a run packed and unpacked carries on exactly as it would have", () => {
  const size = { x: 1.9, z: 4.5 }, sizeOf = () => size;
  const drive = (i: number) => ({ throttle: 1, brake: 0, steer: Math.sin(i / 90) * 0.6 });
  const a = new Drive(ONE_WAY, CARS[6], NO_UP, size, 2.6, sizeOf, {}, { seed: 11, mode: "time" });
  for (let i = 0; i < 120 * 5; i++) a.step(1 / 120, drive(i));
  const b = new Drive(ONE_WAY, CARS[6], NO_UP, size, 2.6, sizeOf, {}, { seed: 99, mode: "time" });
  b.unpack(JSON.parse(JSON.stringify(a.pack())));
  for (let i = 600; i < 120 * 10; i++) { a.step(1 / 120, drive(i)); b.step(1 / 120, drive(i)); }
  expect(b.veh.z).toBe(a.veh.z);
  expect(b.score.points).toBe(a.score.points);
  expect(b.traffic.cars.map((n) => n.z)).toEqual(a.traffic.cars.map((n) => n.z));
  expect(b.clock).toBe(a.clock);
});

describe("Sprints", () => {
  const size = { x: 1.9, z: 4.5 }, sizeOf = () => size;
  const sp = SPRINTS[1];
  const road = { seed: sp.seed, length: sp.length, density: sp.density };

  test("the road is the same whatever the speed: every row, its cars and their drivers", () => {
    const met = (throttle: number) => {
      const d = new Drive(sp.layout, CARS[1], NO_UP, size, 2.6, sizeOf, {}, { sprint: road });
      d.ghost = true; // nothing touches, so both drive the whole 30 s
      const seen = new Map<number, string>();
      for (let i = 0; i < 120 * 30 && !d.over; i++) {
        d.step(1 / 120, { throttle, brake: 0, steer: 0 });
        for (const n of d.traffic.cars) if (!seen.has(n.id)) seen.set(n.id, `${n.kind} ${n.lane} ${n.v0.toFixed(3)} ${n.T.toFixed(3)}`);
      }
      return [...seen.values()];
    };
    const fast = met(1), slow = met(0.35);
    expect(slow.length).toBeGreaterThan(30);
    expect(fast.slice(0, slow.length)).toEqual(slow);
  });

  test("it ends at the line, on the clock", () => {
    const d = new Drive(sp.layout, CARS[1], NO_UP, size, 2.6, sizeOf, {}, { sprint: { ...road, length: 300 } });
    d.ghost = true; // nothing touches: only the line ends it
    for (let i = 0; i < 120 * 30 && !d.over; i++) d.step(1 / 120, { throttle: 1, brake: 0, steer: 0 });
    expect(d.ended).toBe("line");
    expect(d.toLine).toBe(0);
    expect(d.score.time).toBeGreaterThan(5);
  });

  test("stars are margins over the best time, and a ghost says its time at any point of the road", () => {
    const sp = { ...SPRINTS[1], best: 60 };
    const [one, two, three] = starTimes(sp);
    expect(one > two && two > three && three > sp.best).toBe(true);
    expect([starsFor(sp, three), starsFor(sp, two), starsFor(sp, one), starsFor(sp, one + 0.1)]).toEqual([3, 2, 1, 0]);
    const g = { x: [0, 1, 2], z: [0, 10, 30], yaw: [0, 0, 0], time: 2 * GHOST_DT };
    expect(ghostTimeAt(g, 20)).toBeCloseTo(GHOST_DT * 1.5, 6);
    expect(ghostTimeAt(g, 40)).toBeNull();
    expect(ghostAt(g, GHOST_DT / 2)).toMatchObject({ x: 0.5, z: 5 });
  });

  test("a best time is kept per Sprint; an unknown one is dropped", () => {
    const s = load({ ...stored(fresh()), stop: sp.id, sprints: { [sp.id]: 71.5, nope: 3 } });
    expect([s.stop, s.sprints]).toEqual([sp.id, { [sp.id]: 71.5 }]);
  });
});

test("the guardrail is no lane: a car against it still meets the outer lane's traffic", () => {
  const size = { x: 1.8, z: 4.4 }, sizeOf = () => size;
  const d = new Drive(ONE_WAY, CARS[3], NO_UP, size, 2.6, sizeOf, {}, { seed: 5 });
  for (let i = 0; i < 120 * 3; i++) d.step(1 / 120, { throttle: 0.5, brake: 0, steer: -1 });
  const [lo] = edges(ONE_WAY);
  expect(d.veh.x - size.x / 2).toBeCloseTo(lo - RAIL, 1);
  // a narrow car in the outer lane, on its line: the two overlap
  expect(Math.abs(d.veh.x - laneX(ONE_WAY, 0))).toBeLessThan((size.x + 1.6) / 2 - 0.3);
});

test("momentum: a combo's surge takes the car past its top speed, and fades once the combo breaks", () => {
  const size = { x: 1.9, z: 4.5 }, sizeOf = () => size, car = CARS[0];
  const d = new Drive(ONE_WAY, car, NO_UP, size, 2.6, sizeOf, {}, { seed: 2 });
  d.ghost = true; // nothing touches
  d.surge = 99;
  const step = () => { d.traffic.cars.length = 0; d.step(1 / 120, { throttle: 1, brake: 0, steer: 0 }); }; // an empty road: no pass restarts the combo
  for (let i = 0; i < 120 * 40; i++) { d.score.combo = 5; d.score.comboLeft = 4; step(); }
  d.surge = Math.min(d.surge, d.surgeMax);
  expect(d.surgeMax).toBeCloseTo(car.top * 0.15, 6);
  expect(d.kmh).toBeGreaterThan(car.top * 1.12);
  d.score.breakCombo();
  for (let i = 0; i < 120 * 3; i++) step();
  expect(d.surge).toBe(0);
});

test("a near miss adds to the surge by how close it was, up to a quarter of the top speed", () => {
  const size = { x: 1.9, z: 4.5 }, sizeOf = () => size;
  const d = new Drive(ONE_WAY, CARS[0], NO_UP, size, 2.6, sizeOf, {}, { seed: 2 });
  d.veh.launch((150 / 3.6) * 1.4);
  d.traffic.add({ kind: "x", length: 4.5, width: 1.9, z: d.veh.z + 3, v: 20, lane: 2, v0: 20, T: 1.2, a: 1, b: 2, oncoming: false, politeness: 0.5 });
  d.veh.x = laneX(ONE_WAY, 2) - 1.9 - 0.2; // beside its lane, 20 cm off: a Paint trader as it drops behind
  for (let i = 0; i < 60; i++) d.step(1 / 120, { throttle: 1, brake: 0, steer: 0 });
  expect(d.score.graded["Paint trader"]).toBe(1);
  expect(d.surge).toBeGreaterThan(7);
});

test("a save from before the road trip keeps its cars and cash, pays nitro levels back, and drops levels and old Sprint times", () => {
  const old = { v: 2, cash: 100, level: 9, xp: 40, car: CARS[2].id, owned: { [CARS[2].id]: { upgrades: { speed: 1, handling: 0, brakes: 0, nitro: 2 }, paint: "#fff", paints: ["#fff"] } },
    missions: [{ kind: "nitro", text: "Light the nitro 3 times in one run", target: 3, reward: { cash: 400, xp: 150 } }], sprints: { "first-light": 64 } };
  const s = load(old);
  expect(s.owned[CARS[2].id]).toEqual({ upgrades: { speed: 1, handling: 0, brakes: 0 }, paint: "#fff" });
  expect(s.cash).toBe(100 + upgradeCost(CARS[2], 0) + upgradeCost(CARS[2], 1));
  expect(s.sprints).toEqual({});
  expect("level" in s || "missions" in s).toBe(false);
  expect(load(stored(s)).cash).toBe(s.cash); // once
});
