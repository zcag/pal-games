// The best time on each Sprint's road (game/sprint.ts), found by search: a
// beam of runs played headless (game/drive.ts at 1/120 s), each choosing every
// quarter second, a player's pace, where across the road to steer for (in
// half-lane steps: as finely as a player places a car) and gas, lift or brake.
// The road is fixed, so it knows the road the way someone who has learned it
// does. Cars collide as the outlines the game draws them with (hulls.json,
// taken from the page's models), so a pass that is fine on screen is fine
// here. Its time is the `best` a Sprint's stars are margins over.
// A duel's best line (game/sprint.ts `Ghost`) is what its rival drives:
// surface/rivals/<id>.json.
//
// Searching is costly, so it is only done when it must: each result is kept
// in sprint-cache.json under a fingerprint of the road and of the code that
// decides how a run drives (FILES), and a road whose fingerprint has not
// changed is not searched again. --write puts the cached times in
// game/sprint.ts (BEST). Run it on marko, out of the way, at low priority:
//   rsync -a game scripts package.json marko:tmp/hw-search/highway/
//   ssh marko 'cd tmp/hw-search && nice -n 19 bun highway/scripts/sprint.ts'
//   rsync -a marko:tmp/hw-search/highway/scripts/sprint-cache.json scripts/ \
//     && rsync -a marko:tmp/hw-search/highway/surface/rivals/ surface/rivals/
//   bun highway/scripts/sprint.ts --write
//   bun highway/scripts/sprint.ts [ids..|--region N] [--all] [--beam 30] [--workers 11] [--write]
// A beam of 30 found the same best as 150 on the eight roads compared (2026-10-07: squeeze, noon-rush, convoy,
// red-lights, afterburn, tunnel-vision and two duels), at a fifth of the cost; 15 and 20 were 0.1 to 0.4% off.
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { Drive, ROLLING_START } from "../game/drive.ts";
import { steerToward } from "../game/bot.ts";
import { CARS, FEEL } from "../game/content.ts";
import { edges } from "../game/layout.ts";
import { SPRINTS, starTimes, GHOST_DT, type Sprint, type Ghost } from "../game/sprint.ts";
import hulls from "./hulls.json";

/** A choice every quarter second (a player's pace), at the game's own step. (Searching at a coarser step and
 *  replaying at the game's was tried: the physics drifts too far, no replay reached the line.) */
const CHOICE = 0.25, DT = 1 / 120;
// at most a lane's move a choice, and gas or brake: as good a best as finer choices found (farm-road, 46.21 s both
// ways), with half the runs to try
const GRID = 0.9, MOVES = [-2, -1, 0, 1, 2];
const sizes = new Map(Object.entries(hulls as unknown as Record<string, { x: number; z: number; hull: [number, number][] }>));
const PEDALS = [{ throttle: 1, brake: 0 }, { throttle: 0, brake: 1 }];

/** The choices that led to a run: this one and the ones before it. */
type Path = { up: Path | null; slot: number; pedal: number };
type Node = { d: Drive; slot: number; value: number; path: Path | null };

function make(s: Sprint) {
  const car = CARS.find((c) => c.id === s.car)!, size = sizes.get(car.id)!;
  return new Drive(s.layout, car, size, size.z * 0.58, (id) => sizes.get(id), {}, { sprint: { seed: s.seed, length: s.length, density: s.density }, intro: ROLLING_START });
}
/** Where across the road a slot is, and how many there are, for a road and its car. */
function slotsOf(s: Sprint, d: Drive) {
  const [lo, hi] = edges(s.layout), half = d.size.x / 2 + 0.2;
  return { xOf: (i: number) => lo + half + i * GRID, last: Math.floor((hi - lo - 2 * half) / GRID), at: (x: number) => Math.round((x - lo - half) / GRID) };
}

/** Search one Sprint at a step size: the choices of the best run found, or null. */
function search(s: Sprint, beam: number, dt: number) {
  const d0 = make(s), { xOf, last, at } = slotsOf(s, d0), every = Math.round(CHOICE / dt);
  while (d0.intro > 0) d0.step(dt, { throttle: 0, brake: 0, steer: 0 }); // the rolling start, as a player gets it
  let nodes: Node[] = [{ d: d0, slot: at(d0.veh.x), value: 0, path: null }];
  let best: { time: number; path: Path | null } | null = null;
  for (let round = 0; nodes.length && round < 4000; round++) {
    const kids: Node[] = [];
    for (const n of nodes) {
      for (const m of MOVES) {
        const slot = n.slot + m;
        if (slot < 0 || slot > last) continue;
        for (let p = 0; p < PEDALS.length; p++) {
          const d = n.d.clone();
          for (let i = 0; i < every && !d.over; i++) d.step(dt, { ...PEDALS[p], steer: steerToward(d, xOf(slot)) });
          if (d.ended === "crash") continue;
          const path: Path = { up: n.path, slot, pedal: p };
          if (d.ended === "line") { if (!best || d.score.time < best.time) best = { time: d.score.time, path }; continue; }
          // how far it got, and what it carries on with: its speed and the combo's surge
          kids.push({ d, slot, value: d.score.distance + (d.veh.u / FEEL.pace) * 0.8 + d.surge * 0.6, path });
        }
      }
    }
    // the best of each kind of place to be (where across, how fast), then the best overall: a beam that keeps
    // its options rather than every run in the same spot
    kids.sort((a, b) => b.value - a.value);
    const seen = new Map<string, number>();
    nodes = [];
    for (const k of kids) {
      const key = `${Math.round(k.d.veh.x / 1.8)}/${Math.round(k.d.kmh / 12)}`;
      if ((seen.get(key) ?? 0) >= 3) continue;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      nodes.push(k);
      if (nodes.length >= beam) break;
    }
    // once a run has finished, the rest are only worth carrying while they could still beat it
    if (best) nodes = nodes.filter((n) => n.d.score.time < best!.time);
  }
  if (!best) return null;
  const choices: { slot: number; pedal: number }[] = [];
  for (let p: Path | null = best.path; p; p = p.up) choices.unshift({ slot: p.slot, pedal: p.pedal });
  return choices;
}

/** Drive a run's choices: its time and its line (a duel's rival drives it). */
function replay(s: Sprint, choices: { slot: number; pedal: number }[]) {
  const d = make(s), { xOf } = slotsOf(s, d), every = Math.round(CHOICE / DT);
  while (d.intro > 0) d.step(DT, { throttle: 0, brake: 0, steer: 0 });
  const z0 = d.veh.z, ghost: Ghost = { x: [], z: [], yaw: [], time: 0 };
  for (const c of choices) for (let i = 0; i < every && !d.over; i++) {
    d.step(DT, { ...PEDALS[c.pedal], steer: steerToward(d, xOf(c.slot)) });
    if (d.score.time >= ghost.z.length * GHOST_DT) { ghost.x.push(+d.veh.x.toFixed(2)); ghost.z.push(+(d.veh.z - z0).toFixed(2)); ghost.yaw.push(+d.veh.yaw.toFixed(3)); }
  }
  if (d.ended !== "line") return null;
  ghost.time = +d.score.time.toFixed(2);
  return { id: s.id, time: ghost.time, misses: d.score.misses, doubles: d.score.doubles, combo: d.score.bestCombo, avg: Math.round((s.length / d.score.time) * 3.6), ghost };
}

/** A road's best: its choices searched, then driven once more for the time and the line (kept out of the search,
 *  which only carries its choices). */
function best(s: Sprint, beam: number) {
  const choices = search(s, beam, DT);
  return choices && replay(s, choices);
}

/** What decides how a run drives: a change to any of these can change a best time. */
const FILES = ["game/drive.ts", "game/director.ts", "game/traffic.ts", "game/vehicle.ts", "game/content.ts", "game/score.ts", "game/crash.ts", "game/layout.ts", "game/bot.ts", "scripts/hulls.json", "scripts/sprint.ts"];
const root = new URL("..", import.meta.url).pathname;
const CACHE = `${root}scripts/sprint-cache.json`;
type Cached = Record<string, { key: string; best: number }>;
const code = createHash("sha256").update(FILES.map((f) => readFileSync(root + f, "utf8")).join("\0")).digest("hex");
/** A road's fingerprint: the code, and the road itself (not its name, its best or where it sits on the map). */
const keyOf = (s: Sprint) => createHash("sha256").update(code + JSON.stringify([s.car, s.layout, s.length, s.density, s.seed, !!s.boss])).digest("hex").slice(0, 16);
const readCache = (): Cached => (existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {});

/** The cached times that still fit their roads, into game/sprint.ts's BEST. */
async function write() {
  const cache = readCache(), p = `${root}game/sprint.ts`, src = readFileSync(p, "utf8");
  const fresh = SPRINTS.filter((s) => cache[s.id]?.key === keyOf(s));
  const body = fresh.map((s) => `\n  "${s.id}": ${cache[s.id].best},`).join("");
  await Bun.write(p, src.replace(/const BEST: Record<string, number> = \{[^}]*\};/, `const BEST: Record<string, number> = {${body}\n};`));
  const stale = SPRINTS.filter((s) => !fresh.includes(s)).map((s) => s.id);
  console.log(`${fresh.length} of ${SPRINTS.length} best times written${stale.length ? `; still to search: ${stale.join(" ")}` : ""}`);
}

if (!isMainThread) {
  parentPort!.on("message", (m: { id: string; beam: number }) => { const sp = SPRINTS.find((s) => s.id === m.id); if (!sp) console.error("worker got", JSON.stringify(m)); parentPort!.postMessage(sp ? best(sp, m.beam) : null); });
} else {
  const args = process.argv.slice(2);
  const opt = (k: string, def: string) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : def; };
  const flag = (k: string) => { const i = args.indexOf(k); if (i >= 0) args.splice(i, 1); return i >= 0; };
  const beam = +opt("--beam", "30"), region = opt("--region", ""), workers = +opt("--workers", "11"), all = flag("--all");
  if (flag("--write")) { await write(); process.exit(0); }
  const cache = readCache();
  const ids = (args.length ? args : SPRINTS.filter((s) => region === "" || s.region === +region).map((s) => s.id))
    .filter((id) => all || args.length || cache[id]?.key !== keyOf(SPRINTS.find((s) => s.id === id)!));
  console.error(`${ids.length} to search${ids.length ? `: ${ids.join(" ")}` : " (every road's time fits it)"}`);
  const t0 = performance.now();
  type Out = NonNullable<ReturnType<typeof best>>;
  const report = async (r: Out | null) => {
    if (!r) { console.log("no finish found"); return; }
    const s = SPRINTS.find((x) => x.id === r.id)!;
    console.log(`${r.id.padEnd(14)} best ${r.time} s (${r.misses} near misses, ${r.doubles} gaps, best combo ×${r.combo}, ${r.avg} km/h)  stars at ${starTimes({ ...s, best: r.time }).join(" / ")}`);
    if (s.boss) await Bun.write(`${root}surface/rivals/${r.id}.json`, JSON.stringify(r.ghost));
    // kept as each road finishes, so a run stopped halfway loses only the roads it was on
    const now = readCache();
    now[r.id] = { key: keyOf(s), best: r.time };
    await Bun.write(CACHE, JSON.stringify(now, null, 1) + "\n");
  };
  if (process.env.TRACE) for (const id of ids) await report(best(SPRINTS.find((s) => s.id === id)!, beam));
  else {
    // a pool: each worker takes the next Sprint as it finishes one
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(workers, ids.length) }, () => new Promise<void>((done) => {
      const w = new Worker(new URL(import.meta.url));
      const feed = () => { if (next >= ids.length) { w.terminate(); done(); return; } w.postMessage({ id: ids[next++], beam }); };
      w.on("message", async (r) => { await report(r); feed(); });
      feed();
    })));
  }
  console.error(`${((performance.now() - t0) / 1000).toFixed(0)} s`);
}
