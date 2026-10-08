import { describe, expect, test } from "bun:test";
import { Vehicle } from "../highway/game/vehicle.ts";
import { Director } from "../highway/game/director.ts";
import { Score } from "../highway/game/score.ts";
import { CARS, FEEL, MODES, spec } from "../highway/game/content.ts";
import { Drive, ROLLING_START } from "../highway/game/drive.ts";
import { ONE_WAY, edges, laneX, RAIL } from "../highway/game/layout.ts";
import { SPRINTS, starTimes, starsFor, ghostTimeAt, ghostAt, GHOST_DT } from "../highway/game/sprint.ts";
import { fresh, load, stored, has, pickFor, finishSprintRun, type Save } from "../highway/game/meta.ts";
import { REGIONS, BOSS_STARS, sprintsOf, rivalTime } from "../highway/game/sprint.ts";
import { closed, regionOpen, starsIn, bossOf, nextStop, carNeeds } from "../highway/game/trip.ts";
import { declared, manifestOf, merge, problems, storedKeys } from "./game-accounts.ts";
import { bestDrive, chooser, decode, encode, HUMAN, type Hulls } from "../highway/game/bestrun.ts";
import hulls from "../highway/surface/cars/hulls.json";
import best from "../highway/surface/best.json";
import { existsSync } from "node:fs";
import { DUELS, TEXTS, PEOPLE, TRIP_KM, LAST_DUEL, kmLeft, brought, latest, pending, ending, textsSoFar, type Who } from "../highway/game/story.ts";


test("every car reaches about its top speed, and brakes from 100 km/h to a crawl in about a second", () => {
  for (const car of [CARS[0], CARS[CARS.length - 1]]) {
    const v = new Vehicle(spec(car, 2.6));
    for (let i = 0; i < 120 * 70; i++) v.step(1 / 120, { throttle: 1, brake: 0, steer: 0 });
    expect(Math.abs(v.kmh / FEEL.pace - car.top) / car.top).toBeLessThan(0.08);
    const b = new Vehicle(spec(car, 2.6));
    b.launch((100 / 3.6) * FEEL.pace);
    let t = 0;
    while (b.kmh / FEEL.pace > FEEL.crawl + 1 && t < 5) { b.step(1 / 120, { throttle: 0, brake: 1, steer: 0 }); t += 1 / 120; }
    expect(t).toBeLessThan(1.5);
    for (let i = 0; i < 240; i++) b.step(1 / 120, { throttle: 0, brake: 1, steer: 0 });
    expect(b.kmh / FEEL.pace).toBeGreaterThan(FEEL.crawl - 1); // the brakes never stop you on the highway
  }
});

test("a tap of the steering moves the car across and lets it straighten, without a spin", () => {
  const v = new Vehicle(spec(CARS[6], 2.6));
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

test("cars come with the trip: a region's first with it, its others by its Sprints finished, and a save survives a round trip", () => {
  const s = fresh(), [compact, kiri, milano] = CARS;
  expect([has(s, compact), has(s, kiri), has(s, milano), has(s, CARS[3])]).toEqual([true, false, false, false]);
  expect([carNeeds(kiri), carNeeds(milano)]).toEqual(["Finish 3 stops in Countryside", "Finish 6 stops in Countryside"]);
  expect(carNeeds(CARS[3])).toBe("Beat Ines in Countryside");
  for (const sp of sprintsOf(0).slice(0, 2)) s.sprints[sp.id] = starTimes(sp)[2];
  expect(has(s, kiri)).toBe(false); // stars do not open a car: Sprints finished do
  for (const sp of sprintsOf(0).slice(2, 4)) s.sprints[sp.id] = 999;
  expect([has(s, kiri), has(s, milano)]).toEqual([true, false]);
  expect(pickFor(s, 0)).toBe(kiri); // the best you have drives the region
  s.pick.city = compact.id;
  expect(pickFor(load(JSON.parse(JSON.stringify(stored(s)))), 0)).toBe(compact);
});
describe("the road trip", () => {
  test("a region's first three stops are open, each finish opens one more, the duel opens at its stars", () => {
    const times: Record<string, number> = {}, list = sprintsOf(0);
    expect(list.map((x) => closed(x, times) === null)).toEqual([true, true, true, false, false, false, false, false, false, false]); // eight Sprints, the duel, the Legend
    times[list[0].id] = 999;
    expect(closed(list[3], times)).toBeNull();
    expect(closed(list[4], times)).not.toBeNull();
    for (const x of list.slice(0, 8)) times[x.id] = starTimes(x)[1]; // two stars each
    expect(starsIn(0, times)).toBe(16);
    expect(closed(list[8], times)).toBeNull();
    expect(BOSS_STARS).toBeLessThanOrEqual(16);
    expect(regionOpen(1, times)).toBe(false);
  });

  test("a finish gives its stars and the cars they open; winning the duel gives the rival's car and opens the next region", () => {
    const s = fresh(), list = sprintsOf(0);
    const first = finishSprintRun(s, list[0], timed(starTimes(list[0])[2]));
    expect([first.stars, first.before, first.cars]).toEqual([3, 0, []]);
    finishSprintRun(s, list[1], timed(starTimes(list[1])[2]));
    const third = finishSprintRun(s, list[2], timed(starTimes(list[2])[1])); // three finished: the Kiri
    expect(third.cars.map((c) => c.id)).toEqual([CARS[1].id]);
    expect(pickFor(s, 0)?.id).toBe(CARS[1].id); // a new car drives its region
    const boss = bossOf(0);
    expect(finishSprintRun(s, boss, timed(rivalTime(boss) + 1)).duel).toEqual({ won: false });
    const win = finishSprintRun(s, boss, timed(rivalTime(boss) - 1));
    expect(win.duel).toEqual({ won: true, opened: REGIONS[1].name });
    expect(win.cars.map((c) => c.id)).toContain(boss.boss!.car);
    expect(regionOpen(1, s.sprints)).toBe(true);
    expect(pickFor(s, 1)?.id).toBe(boss.boss!.car);
  });
  test("the next stop is the first open one still short of its stars, in the furthest open region", () => {
    const times: Record<string, number> = {};
    expect(nextStop(times).id).toBe(sprintsOf(0)[0].id);
    times[sprintsOf(0)[0].id] = starTimes(sprintsOf(0)[0])[2];
    expect(nextStop(times).id).toBe(sprintsOf(0)[1].id);
  });
  test("after a run the map stays in its region while a stop there is open and never driven: the Legend a won duel opened", () => {
    const times: Record<string, number> = {}, list = sprintsOf(0), boss = bossOf(0);
    for (const x of list.slice(0, 8)) times[x.id] = starTimes(x)[2];
    times[boss.id] = Math.min(starTimes(boss)[2], rivalTime(boss) - 1);
    expect(regionOpen(1, times)).toBe(true);
    expect(nextStop(times).region).toBe(1);
    expect(nextStop(times, 0).id).toBe(list[9].id);
  });
  test("each stop's stars are set in the latest car of its class come by then: three cars after 3 and 6 Sprints, four after 2, 4 and 6", () => {
    expect(sprintsOf(0).map((x) => x.car)).toEqual([...Array(3).fill("compact-07"), ...Array(3).fill("kiri-10"), ...Array(4).fill("milano-95")]);
    expect(sprintsOf(1).map((x) => x.car)).toEqual(["tozzo-98", "tozzo-98", "sigil-07", "sigil-07", "tiara-gt-83", "tiara-gt-83", "asti-stradale-89", "asti-stradale-89", "asti-stradale-89", "asti-stradale-89"]);
  });

});

describe("the story", () => {
  test("every duel has its rival's lines, every text sits on a Sprint, and everyone has a picture", () => {
    for (const s of SPRINTS.filter((x) => x.boss)) expect(DUELS[s.id]).toBeDefined();
    for (const id of Object.keys(TEXTS)) { const s = SPRINTS.find((x) => x.id === id); expect(s && !s.boss && !s.legend).toBe(true); }
    for (const who of Object.keys(PEOPLE) as Who[]) expect(existsSync(new URL(`../highway/surface/story/${who}.webp`, import.meta.url))).toBe(true);
    expect(bossOf(4).id).toBe(LAST_DUEL);
  });
  test("a region's sign has the latest text said in it or before it, in the road's order", () => {
    const times: Record<string, number> = {};
    for (const r of [0, 1, 2, 3, 4]) for (const s of sprintsOf(r)) times[s.id] = s.boss ? rivalTime(s) - 1 : 60;
    expect(latest(times, 4)).toEqual(TEXTS.graveyard.at(-1));
    expect(latest(times, 3)).toEqual(DUELS["duel-vega"].won.at(-1));
  });
  test("a stop's texts come with its first finish, a duel's with the win, and the kilometres come down to none", () => {
    const times: Record<string, number> = {};
    expect(kmLeft(times)).toBe(TRIP_KM);
    const first = sprintsOf(0)[0], before = { ...times };
    times[first.id] = 60;
    expect(brought(before, times)).toEqual(TEXTS[first.id]);
    expect(brought({ ...times }, times)).toEqual([]); // driven again: nothing new
    expect(pending(first, times)).toEqual([]);
    expect(latest(times, 0)).toEqual(TEXTS[first.id].at(-1));
    expect(kmLeft(times)).toBeLessThan(TRIP_KM);
    const boss = bossOf(0), was = { ...times };
    times[boss.id] = rivalTime(boss) + 5;
    expect(brought(was, times)).toEqual([]); // a duel lost says nothing new
    times[boss.id] = rivalTime(boss) - 1;
    expect(brought(was, times)).toEqual(DUELS[boss.id].won);
    for (const s of SPRINTS) times[s.id] = s.boss ? rivalTime(s) - 1 : 60;
    expect(kmLeft(times)).toBe(0);
    expect(textsSoFar(times).length).toBe(Object.values(TEXTS).flat().length + Object.values(DUELS).flatMap((d) => d.won).length);
  });
  test("the trip ends after the last duel: driven and lost, then won", () => {
    const times: Record<string, number> = {}, last = bossOf(4);
    expect(ending(times)).toBeNull();
    times[last.id] = rivalTime(last) + 5;
    expect(ending(times)?.title).toBe("The porch light comes on.");
    times[last.id] = rivalTime(last) - 1;
    expect(ending(times)?.title).toBe("The lights are off.");
  });
});

describe("accounts", () => {
  const m = manifestOf("highway");
  const rule = m.sync.save as { fields: Record<string, { fields: Record<string, unknown> }> };

  test("every stored key has a rule (a kept run and a staged scene stay on this machine), every car and mode merges field by field", () => {
    expect(problems(m)).toEqual([]);
    expect(Object.keys(m.sync).sort()).toEqual(storedKeys("highway"));
    expect([m.sync.run, m.sync.scene]).toEqual(["local", "local"]);
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

  test("two machines that both played since they synced keep the best times, paints and records of both", () => {
    const synced = JSON.parse(JSON.stringify(stored(fresh()))) as Save;
    const a = load(structuredClone(synced)), b = load(structuredClone(synced));
    const [x, y] = sprintsOf(0);
    a.sprints[x.id] = 70; a.sprints[y.id] = 80; a.paint["compact-07"] = "#c81d25";
    a.best.endless = { score: 40000, distance: 9000, combo: 5, topSpeed: 230 };
    a.totals.runs += 3;
    b.sprints[x.id] = 65;
    b.best.twoway = { score: 52000, distance: 7000, combo: 8, topSpeed: 210 };
    b.totals.runs += 2;
    const merged = load(merge(m.sync.save, stored(b), merge(m.sync.save, stored(a), synced, synced), synced));
    expect(merged.sprints).toEqual({ [x.id]: 65, [y.id]: 80 });
    expect(merged.paint["compact-07"]).toBe("#c81d25");
    expect(merged.best).toMatchObject({ endless: { score: 40000 }, twoway: { score: 52000 } });
    expect(merged.totals.runs).toBe(5);
  });});

test("Speed Trap ends a run held under its floor; Time Attack's clock runs down", () => {
  const size = { x: 1.9, z: 4.5 }, sizeOf = () => size;
  const trap = new Drive(ONE_WAY, CARS[6], size, 2.6, sizeOf, {}, { seed: 3, mode: "trap" });
  for (let i = 0; i < 120 * 6 && !trap.ended; i++) trap.step(1 / 120, { throttle: 0, brake: 1, steer: 0 });
  expect(trap.ended).toBe("slow");
  const time = new Drive(ONE_WAY, CARS[6], size, 2.6, sizeOf, {}, { seed: 3, mode: "time" });
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
  const a = new Drive(ONE_WAY, CARS[6], size, 2.6, sizeOf, {}, { seed: 11, mode: "time" });
  for (let i = 0; i < 120 * 5; i++) a.step(1 / 120, drive(i));
  const b = new Drive(ONE_WAY, CARS[6], size, 2.6, sizeOf, {}, { seed: 99, mode: "time" });
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
  const road = sp;

  test("the road is the same whatever the speed: every row, its cars and their drivers", () => {
    const met = (throttle: number) => {
      const d = new Drive(sp.layout, CARS[1], size, 2.6, sizeOf, {}, { sprint: road });
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
    const d = new Drive(sp.layout, CARS[1], size, 2.6, sizeOf, {}, { sprint: { ...road, length: 300 } });
    d.ghost = true; // nothing touches: only the line ends it
    for (let i = 0; i < 120 * 30 && !d.over; i++) d.step(1 / 120, { throttle: 1, brake: 0, steer: 0 });
    expect(d.ended).toBe("line");
    expect(d.toLine).toBe(0);
    expect(d.score.time).toBeGreaterThan(5);
  });

  test("stars are margins over the best time, the run it comes from making three, and a ghost says its time at any point of the road", () => {
    const sp = { ...SPRINTS[1], best: 60 };
    const [one, two, three] = starTimes(sp);
    expect(one > two && two > three && three > sp.best).toBe(true);
    for (const s of SPRINTS) expect(starsFor(s, s.best)).toBe(3);
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
  const d = new Drive(ONE_WAY, CARS[3], size, 2.6, sizeOf, {}, { seed: 5 });
  for (let i = 0; i < 120 * 3; i++) d.step(1 / 120, { throttle: 0.5, brake: 0, steer: -1 });
  const [lo] = edges(ONE_WAY);
  expect(d.veh.x - size.x / 2).toBeCloseTo(lo - RAIL, 1);
  // a narrow car in the outer lane, on its line: the two overlap
  expect(Math.abs(d.veh.x - laneX(ONE_WAY, 0))).toBeLessThan((size.x + 1.6) / 2 - 0.3);
});

test("momentum: a combo's surge takes the car past its top speed, and fades once the combo breaks", () => {
  const size = { x: 1.9, z: 4.5 }, sizeOf = () => size, car = CARS[0];
  const d = new Drive(ONE_WAY, car, size, 2.6, sizeOf, {}, { seed: 2 });
  d.ghost = true; // nothing touches
  d.surge = 99;
  const step = () => { d.traffic.cars.length = 0; d.step(1 / 120, { throttle: 1, brake: 0, steer: 0 }); }; // an empty road: no pass restarts the combo
  for (let i = 0; i < 120 * 40; i++) { d.score.combo = 5; d.score.comboLeft = 4; step(); }
  d.surge = Math.min(d.surge, d.surgeMax);
  expect(d.surgeMax).toBeCloseTo(car.top * 0.15, 6);
  expect(d.kmh).toBeGreaterThan(car.top * 1.1); // past its top, short of the full 15%: the pull fades near the limit
  d.score.breakCombo();
  for (let i = 0; i < 120 * 3; i++) step();
  expect(d.surge).toBe(0);
});

test("a near miss adds to the surge by how close it was, up to a quarter of the top speed", () => {
  const size = { x: 1.9, z: 4.5 }, sizeOf = () => size;
  const d = new Drive(ONE_WAY, CARS[0], size, 2.6, sizeOf, {}, { seed: 2 });
  d.veh.launch((150 / 3.6) * 1.4);
  d.traffic.add({ kind: "x", length: 4.5, width: 1.9, z: d.veh.z + 3, v: 20, lane: 2, v0: 20, T: 1.2, a: 1, b: 2, oncoming: false, politeness: 0.5, side: 0, phase: 0, cooldown: 2 });
  d.veh.x = laneX(ONE_WAY, 2) - 1.9 - 0.2; // beside its lane, 20 cm off: a Paint trader as it drops behind
  for (let i = 0; i < 60; i++) d.step(1 / 120, { throttle: 1, brake: 0, steer: 0 });
  expect(d.score.graded["Paint trader"]).toBe(1);
  expect(d.surge).toBeGreaterThan(7);
});

test("a save from before keeps its paints and settings, and drops money, upgrades, levels and old Sprint times", () => {
  const old = { v: 3, cash: 9000, level: 9, xp: 40, car: CARS[2].id, owned: { [CARS[2].id]: { upgrades: { speed: 1, handling: 0, brakes: 0 }, paint: "#fff" } },
    sprints: { "first-light": 64 }, settings: { view: "Chase" } };
  const s = load(old);
  expect(s.paint).toEqual({ [CARS[2].id]: "#fff" });
  expect(s.sprints).toEqual({});
  expect(s.car).toBe(CARS[0].id); // the Milano is not yours on the road trip yet
  expect(s.settings.view).toBe("Chase");
  expect(["cash", "level", "owned", "missions"].some((k) => k in s)).toBe(false);
});
test("the line between two lanes is no lane: side by side, some pairs leave room for a car and some do not", () => {
  const size = { x: 1.6, z: 3.6 }, sizeOf = () => ({ x: 1.8, z: 4.4 });
  const d = new Drive(ONE_WAY, CARS[0], size, 2.2, sizeOf, {}, { sprint: { seed: 11, length: 9000, density: 0.6, span: 140 } });
  d.ghost = true; // nothing touches: only the traffic is watched
  const fits = size.x - 0.16; // what the Compact needs between two bodies (its collision outline)
  let open = 0, shut = 0;
  for (let i = 0; i < 120 * 60; i++) {
    d.step(1 / 120, { throttle: 1, brake: 0, steer: 0 });
    if (i % 30) continue;
    const cars = d.traffic.cars.filter((n) => !n.oncoming && n.from === n.lane);
    for (const a of cars) for (const b of cars) if (b.lane === a.lane + 1 && Math.abs(a.z - b.z) < 3) {
      const room = Math.abs(b.x - a.x) - (a.width + b.width) / 2;
      if (room >= fits) open++; else shut++;
    }
  }
  expect(open).toBeGreaterThan(0);
  expect(shut).toBeGreaterThan(0);
});

test("drivers decide on their own: cars placed together do not change lanes all at once", () => {
  const size = { x: 1.8, z: 4.4 }, sizeOf = () => size;
  let worst = 0;
  for (const seed of [3, 4]) {
    const d = new Drive(ONE_WAY, CARS[0], size, 2.6, sizeOf, {}, { sprint: { seed, length: 9000, density: 0.8, span: 140 } });
    d.ghost = true;
    const started: number[] = [];
    const was = new Map<number, number>();
    for (let i = 0; i < 60 * 60; i++) {
      d.step(1 / 60, { throttle: 0.6, brake: 0, steer: 0 });
      for (const n of d.traffic.cars) { if (n.signal && !was.get(n.id)) started.push(i / 60); was.set(n.id, n.signal); }
    }
    // the most signals switched on within any half second
    for (const t of started) worst = Math.max(worst, started.filter((u) => u >= t && u < t + 0.5).length);
  }
  expect(worst).toBeLessThanOrEqual(3); // it was 6 when every car placed together waited the same 2 s
});

test("a rolling start: the car cruises, nothing counts and nothing touches until it ends, then the clock runs", () => {
  const size = { x: 1.8, z: 4.4 }, sizeOf = () => size;
  const d = new Drive(ONE_WAY, CARS[0], size, 2.6, sizeOf, {}, { sprint: { seed: 9, length: 3000, density: 0.9, span: 140 }, intro: ROLLING_START });
  const z = d.veh.z;
  for (let i = 0; i < 120 * (ROLLING_START - 0.1); i++) d.step(1 / 120, { throttle: 0, brake: 1, steer: 1 }); // the keys are ignored
  expect([d.score.time, d.score.distance, d.over]).toEqual([0, 0, false]);
  expect(d.veh.z - z).toBeGreaterThan(80); // it kept going
  expect(d.kmh).toBeGreaterThan(95);
  for (let i = 0; i < 120; i++) d.step(1 / 120, { throttle: 1, brake: 0, steer: 0 });
  expect(d.intro).toBe(0);
  expect(d.score.time).toBeCloseTo(0.9, 1);
});

test("a run's clone carries on exactly as the run does, and apart from it", () => {
  const size = { x: 1.9, z: 4.5 }, sizeOf = () => size;
  const drive = (i: number) => ({ throttle: 1, brake: 0, steer: Math.sin(i / 90) * 0.6 });
  const a = new Drive(ONE_WAY, CARS[6], size, 2.6, sizeOf, {}, { sprint: { seed: 4, length: 9000, density: 0.7, span: 140 } });
  a.ghost = true;
  for (let i = 0; i < 120 * 5; i++) a.step(1 / 120, drive(i));
  const b = a.clone();
  for (let i = 600; i < 120 * 10; i++) { a.step(1 / 120, drive(i)); b.step(1 / 120, drive(i)); }
  expect([b.veh.z, b.score.points, b.surge]).toEqual([a.veh.z, a.score.points, a.surge]);
  expect(b.traffic.cars.map((n) => [n.z, n.x])).toEqual(a.traffic.cars.map((n) => [n.z, n.x]));
  // the copy goes its own way and leaves the run as it was
  const was = JSON.stringify([a.veh, a.traffic.cars, a.score, a.director.planned]);
  for (let i = 0; i < 120; i++) b.step(1 / 120, { throttle: 0, brake: 1, steer: 1 });
  expect(JSON.stringify([a.veh, a.traffic.cars, a.score, a.director.planned])).toBe(was);
  expect(b.veh.z).not.toBe(a.veh.z);
});

test("momentum pushes only on the gas: lift with a full surge and the car slows; brake and the surge bleeds away", () => {
  const size = { x: 1.9, z: 4.5 }, sizeOf = () => size, car = CARS[0];
  const d = new Drive(ONE_WAY, car, size, 2.6, sizeOf, {}, { seed: 2 });
  d.ghost = true;
  const step = (input: { throttle: number; brake: number; steer: number }) => { d.traffic.cars.length = 0; d.score.combo = 5; d.score.comboLeft = 4; d.step(1 / 120, input); };
  d.surge = d.surgeMax;
  for (let i = 0; i < 120 * 30; i++) step({ throttle: 1, brake: 0, steer: 0 });
  const fast = d.kmh;
  expect(fast).toBeGreaterThan(car.top * 1.1);
  for (let i = 0; i < 120 * 4; i++) step({ throttle: 0, brake: 0, steer: 0 });
  expect(d.kmh).toBeLessThan(fast - 10); // lifted: it slows, the combo still alive
  for (let i = 0; i < 120; i++) step({ throttle: 0, brake: 1, steer: 0 });
  expect(d.surge).toBe(0);
});

test("a Legend opens with three stars on its region's duel, and its first finish gives a paint every car can wear", () => {
  const s = fresh(), list = sprintsOf(0), legend = list[list.length - 1], boss = bossOf(0);
  expect(legend.legend).toBeDefined();
  for (const sp of list.slice(0, 8)) s.sprints[sp.id] = starTimes(sp)[2];
  s.sprints[boss.id] = starTimes(boss)[1]; // won, two stars
  expect(closed(legend, s.sprints)).toContain(boss.boss!.rival);
  s.sprints[boss.id] = starTimes(boss)[2];
  expect(closed(legend, s.sprints)).toBeNull();
  const first = finishSprintRun(s, legend, timed(starTimes(legend)[0]));
  expect(first.paint).toEqual(legend.legend);
  expect(finishSprintRun(s, legend, timed(starTimes(legend)[2])).paint).toBeUndefined();
});

describe("replays", () => {
  const hullsOf = hulls as unknown as Hulls, sp = SPRINTS[0];
  test("a run's tape drives it again to the same end, step for step", () => {
    const a = bestDrive(sp, hullsOf);
    a.tape = [];
    for (let i = 0; i < 120 * 12 && !a.over; i++) a.step(1 / 120, { throttle: 1, brake: 0, steer: Math.floor(i / 90) % 3 - 1 });
    expect(a.tape.length).toBeGreaterThan(3);
    const b = bestDrive(sp, hullsOf);
    let j = 0, cur = { throttle: 0, brake: 0, steer: 0 };
    for (let i = 0; i < a.steps; i++) {
      while (j < a.tape.length && a.tape[j][0] <= i) { const [, throttle, brake, steer] = a.tape[j++]; cur = { throttle, brake, steer }; }
      b.step(1 / 120, cur);
    }
    expect([b.ended, b.score.time, b.veh.x, b.veh.z]).toEqual([a.ended, a.score.time, a.veh.x, a.veh.z]);
  });
  // searched on Linux, watched on a Mac: the last duel is the fastest car on one of the longest roads, where a bit's
  // difference (the system's sin) once grew into a crash (game/fmath.ts)
  test("a Sprint's best run, as shipped, finishes in its best time on this machine too", () => {
    const runs = best as Record<string, string>;
    for (const s of [SPRINTS.find((x) => runs[x.id])!, SPRINTS.find((x) => x.id === "duel-kaz")!]) {
      expect(decode(runs[s.id]).map((c) => encode([c])).join("")).toBe(runs[s.id]);
      const d = bestDrive(s, hullsOf), next = chooser(d, decode(runs[s.id]), HUMAN);
      for (let i = 0; i < 120 * 120 && !d.over; i++) d.step(1 / 120, next());
      expect([s.id, d.ended, +d.score.time.toFixed(2)]).toEqual([s.id, "line", s.best]);
    }
  });
});
