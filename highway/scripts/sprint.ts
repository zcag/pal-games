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
import { Drive } from "../game/drive.ts";
import { bestDrive as drive, slotsOf, inputOf, chooser, encode, stepsOf, PEDALS, DT, HUMAN, TAS, type Choice, type Hulls, type Pace } from "../game/bestrun.ts";
import hulls from "../surface/cars/hulls.json";
import { CARS, CLASSES, FEEL, TRAFFIC, spec, trafficTop } from "../game/content.ts";
import { SPRINTS, starTimes, GHOST_DT, type Sprint, type Ghost } from "../game/sprint.ts";

// a choice is game/bestrun.ts's: where across (slots GRID apart, at most the pace's `moves` from the last) and gas or
// brake, every `every` s of the pace, felt `delay` s late
const bestDrive = (s: Sprint) => drive(s, hulls as unknown as Hulls);

/** The choices that led to a run: this one and the ones before it. */
type Path = { up: Path | null; slot: number; pedal: number };
type Node = { d: Drive; slot: number; value: number; path: Path | null };

/** Search one Sprint at a step size: the choices of the best run found, or null. */
/** A turn's choices from each run: every move (staying first, so where nothing is gained a run keeps its lane rather
 *  than drift to the rail) and pedal, driven at the pace; the runs that carry on, and those that reached the line. */
function expand(nodes: Node[], t: { xOf: (i: number) => number; last: number; every: number; late: number; start: Choice; moves: number[] }) {
  const kids: Node[] = [], done: { time: number; path: Path }[] = [];
  for (const n of nodes) {
    for (const m of t.moves) {
      const slot = n.slot + m;
      if (slot < 0 || slot > t.last) continue;
      for (let p = 0; p < PEDALS.length; p++) {
        const d = n.d.clone(), prev = n.path ?? t.start;
        // the turn's choice is felt `late` steps in: the last one holds till then (game/bestrun.ts's chooser)
        // a pass closer than the pace's nerve allows is as good as a crash: a person would not have gone there
        for (let i = 0; i < t.every && !d.over; i++) d.step(DT, inputOf(d, t.xOf, i < t.late ? prev : { slot, pedal: p }));
        if (d.ended === "crash") continue;
        const path: Path = { up: n.path, slot, pedal: p };
        if (d.ended === "line") { done.push({ time: d.score.time, path }); continue; }
        // how far it got, and what it carries on with: its speed and the combo's surge
        kids.push({ d, slot, value: d.score.distance + (d.veh.u / FEEL.pace) * 0.8 + d.surge * 0.6, path });
      }
    }
  }
  return { kids, done };
}

/** The best of each kind of place to be (where across, how fast), then the best overall: a beam that keeps its
 *  options rather than every run in the same spot. A stable sort: of equals, the first tried (the one that stayed). */
function prune(kids: Node[], beam: number) {
  kids.sort((a, b) => b.value - a.value);
  const seen = new Map<string, number>(), out: Node[] = [];
  for (const k of kids) {
    const key = `${Math.round(k.d.veh.x / 1.8)}/${Math.round(k.d.kmh / 12)}`;
    if ((seen.get(key) ?? 0) >= 3) continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
    out.push(k);
    if (out.length >= beam) break;
  }
  return out;
}

/** A road's start at a pace: the car after its rolling start, and what each turn needs. */
function begin(s: Sprint, pace: Pace) {
  const d0 = bestDrive(s), { xOf, last, at } = slotsOf(s, d0);
  while (d0.intro > 0) d0.step(DT, { throttle: 0, brake: 0, steer: 0 }); // the rolling start, as a player gets it
  const start: Choice = { slot: at(d0.veh.x), pedal: 0 };
  const moves = [0, ...Array.from({ length: pace.moves }, (_, i) => [-(i + 1), i + 1]).flat()];
  return { d0, start, turn: { xOf, last, every: stepsOf(pace.every), late: stepsOf(pace.delay), start, moves } };
}
const choicesOf = (path: Path | null) => { const c: Choice[] = []; for (let p = path; p; p = p.up) c.unshift({ slot: p.slot, pedal: p.pedal }); return c; };

/** Search one Sprint: the choices of the best run found, or null. */
function search(s: Sprint, beam: number, pace: Pace) {
  const { d0, start, turn } = begin(s, pace);
  let nodes: Node[] = [{ d: d0, slot: start.slot, value: 0, path: null }];
  let best: { time: number; path: Path | null } | null = null;
  for (let round = 0; nodes.length && round < 4000; round++) {
    const { kids, done } = expand(nodes, turn);
    for (const f of done) if (!best || f.time < best.time) best = f;
    nodes = prune(kids, beam);
    // once a run has finished, the rest are only worth carrying while they could still beat it
    if (best) nodes = nodes.filter((n) => n.d.score.time < best!.time);
  }
  return best ? choicesOf(best.path) : null;
}

/** Drive a run's choices at its pace, as the page does: its time and its line (a duel's rival drives it). */
function replay(s: Sprint, choices: Choice[], pace: Pace) {
  const d = bestDrive(s), next = chooser(s, d, choices, pace);
  while (d.intro > 0) d.step(DT, next());
  const z0 = d.veh.z, ghost: Ghost = { x: [], z: [], yaw: [], time: 0 };
  for (let n = 0; n < choices.length * stepsOf(pace.every) + stepsOf(pace.delay) && !d.over; n++) {
    d.step(DT, next());
    if (d.score.time >= ghost.z.length * GHOST_DT) { ghost.x.push(+d.veh.x.toFixed(2)); ghost.z.push(+(d.veh.z - z0).toFixed(2)); ghost.yaw.push(+d.veh.yaw.toFixed(3)); }
  }
  if (d.ended !== "line") return null;
  ghost.time = +d.score.time.toFixed(2);
  return { id: s.id, time: ghost.time, choices: encode(choices), misses: d.score.misses, doubles: d.score.doubles, combo: d.score.bestCombo, avg: Math.round((s.length / d.score.time) * 3.6), ghost };
}

/** A road's best: its choices searched, then driven once more for the time and the line (kept out of the search,
 *  which only carries its choices). */
function best(s: Sprint, beam: number, pace: Pace) {
  const choices = search(s, beam, pace);
  return choices && replay(s, choices, pace);
}

/** What decides how a run drives: a change to any of these can change a best time. */
const FILES = ["game/drive.ts", "game/director.ts", "game/traffic.ts", "game/vehicle.ts", "game/score.ts", "game/crash.ts", "game/layout.ts", "game/bot.ts", "game/bestrun.ts", "surface/cars/hulls.json", "scripts/sprint.ts"];
const root = new URL("..", import.meta.url).pathname;
const CACHE = `${root}scripts/sprint-cache.json`;
type Cached = Record<string, { key: string; best: number; choices?: string }>;
// game/content.ts by what of it drives (the cars, the traffic, the feel, the physics made from them), not its places
// or paints, so a change to how a place looks searches nothing again
const driving = JSON.stringify([CARS, TRAFFIC, FEEL, CLASSES, spec.toString(), trafficTop.toString()]);
const code = createHash("sha256").update(FILES.map((f) => readFileSync(root + f, "utf8")).join("\0") + driving).digest("hex");
/** A road's fingerprint: the code, and the road itself (not its name, its best or where it sits on the map). */
const keyOf = (s: Sprint, pace: Pace = HUMAN) => createHash("sha256").update(code + JSON.stringify([s.car, s.layout, s.length, s.density, s.seed, !!s.boss, pace])).digest("hex").slice(0, 16);
const readCache = (): Cached => (existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {});

/** The cached times that still fit their roads, into game/sprint.ts's BEST. */
async function write() {
  const cache = readCache(), p = `${root}game/sprint.ts`, src = readFileSync(p, "utf8");
  const fresh = SPRINTS.filter((s) => cache[s.id]?.key === keyOf(s));
  const body = fresh.map((s) => `\n  "${s.id}": ${cache[s.id].best},`).join("");
  await Bun.write(p, src.replace(/const BEST: Record<string, number> = \{[^}]*\};/, `const BEST: Record<string, number> = {${body}\n};`));
  // each best run's choices, for the page to replay ("watch the best run": game/bestrun.ts)
  await Bun.write(`${root}surface/best.json`, JSON.stringify(Object.fromEntries(fresh.filter((s) => cache[s.id].choices).map((s) => [s.id, cache[s.id].choices]))) + "\n");
  const stale = SPRINTS.filter((s) => !fresh.includes(s)).map((s) => s.id);
  console.log(`${fresh.length} of ${SPRINTS.length} best times written${stale.length ? `; still to search: ${stale.join(" ")}` : ""}`);
}

if (!isMainThread) {
  parentPort!.on("message", (m: { id: string; beam: number; pace: Pace }) => { const sp = SPRINTS.find((s) => s.id === m.id); if (!sp) console.error("worker got", JSON.stringify(m)); parentPort!.postMessage(sp ? best(sp, m.beam, m.pace) : null); });
} else {
  const args = process.argv.slice(2);
  const opt = (k: string, def: string) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : def; };
  const flag = (k: string) => { const i = args.indexOf(k); if (i >= 0) args.splice(i, 1); return i >= 0; };
  const beam = +opt("--beam", "30"), region = opt("--region", ""), workers = +opt("--workers", "11"), all = flag("--all");
  // the pace searched at: HUMAN's, the machine's (--pace tas, to compare), or one being tuned (--every/--delay/--moves);
  // --try prints a pace's results and keeps nothing (the cache and the rivals are HUMAN's)
  const base = opt("--pace", "human") === "tas" ? TAS : HUMAN;
  const pace: Pace = { every: +opt("--every", String(base.every)), delay: +opt("--delay", String(base.delay)), moves: +opt("--moves", String(base.moves)) };
  const trying = flag("--try") || JSON.stringify(pace) !== JSON.stringify(HUMAN);
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
    console.log(`${r.id.padEnd(14)} best ${r.time} s (${r.misses} near misses, ${r.doubles} gaps, best combo ×${r.combo}, ${r.avg} km/h)  stars at ${starTimes({ ...s, best: r.time }).join(" / ")}${trying ? `  [pace ${JSON.stringify(pace)}, tried: not kept]` : ""}`);
    if (trying) return;
    if (s.boss) await Bun.write(`${root}surface/rivals/${r.id}.json`, JSON.stringify(r.ghost));
    // kept as each road finishes, so a run stopped halfway loses only the roads it was on
    const now = readCache();
    now[r.id] = { key: keyOf(s), best: r.time, choices: r.choices };
    await Bun.write(CACHE, JSON.stringify(now, null, 1) + "\n");
  };
  if (process.env.TRACE) for (const id of ids) await report(best(SPRINTS.find((s) => s.id === id)!, beam, pace));
  else {
    // a pool: each worker takes the next Sprint as it finishes one
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(workers, ids.length) }, () => new Promise<void>((done) => {
      const w = new Worker(new URL(import.meta.url));
      const feed = () => { if (next >= ids.length) { w.terminate(); done(); return; } w.postMessage({ id: ids[next++], beam, pace }); };
      w.on("message", async (r) => { await report(r); feed(); });
      feed();
    })));
  }
  console.error(`${((performance.now() - t0) / 1000).toFixed(0)} s`);
}
