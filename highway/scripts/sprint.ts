// The best time on each Sprint's road (game/sprint.ts), found by search: a
// beam of runs played headless (game/drive.ts at 1/120 s), each choosing every
// quarter second, a player's pace, where across the road to steer for (in
// half-lane steps: as finely as a player places a car), gas or brake, and whether to light
// the nitro. The road is fixed, so it knows the road the way someone who has
// learned it does. Its time is the `best` a Sprint's stars are margins over.
//   bun highway/scripts/sprint.ts [ids..] [--beam 60] [--json out.json]
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { Drive } from "../game/drive.ts";
import { steerToward } from "../game/bot.ts";
import { CARS, FEEL } from "../game/content.ts";
import { edges } from "../game/layout.ts";
import { SPRINTS, starTimes, type Sprint } from "../game/sprint.ts";
import carsJson from "../surface/cars/cars.json";

const DT = 1 / 120, EVERY = 30; // a choice every 0.25 s
const GRID = 0.9, MOVES = [-4, -2, -1, 0, 1, 2, 4];
const sizes = new Map((carsJson as { id: string; size: number[] }[]).map((c) => [c.id, { x: c.size[0], z: c.size[2] }]));

type Node = { d: Drive; slot: number; value: number; path: { slot: number; brake: boolean; nitro: boolean }[] };

function make(s: Sprint) {
  const car = CARS.find((c) => c.id === s.car)!, size = sizes.get(car.id)!;
  return new Drive(s.layout, car, s.up, size, size.z * 0.58, (id) => sizes.get(id), {}, { sprint: { seed: s.seed, length: s.length, density: s.density } });
}
function clone(s: Sprint, d: Drive) { const c = make(s); c.unpack(d.pack()); return c; }

/** Search one Sprint: its best time and how it got there. */
function search(s: Sprint, beam: number) {
  const d0 = make(s), [lo, hi] = edges(s.layout);
  const half = d0.size.x / 2 + 0.2, slots = Math.floor((hi - lo - 2 * half) / GRID);
  const xOf = (i: number) => lo + half + i * GRID;
  let nodes: Node[] = [{ d: d0, slot: Math.round((d0.veh.x - lo - half) / GRID), value: 0, path: [] }];
  let best: { time: number; node: Node } | null = null;
  for (let round = 0; nodes.length && round < 4000; round++) {
    const kids: Node[] = [];
    for (const n of nodes) {
      const lit = n.d.nitro >= 0.25 && !n.d.boosting;
      for (const m of MOVES) {
        const slot = n.slot + m;
        if (slot < 0 || slot > slots) continue;
        for (const brake of [false, true]) for (const nitro of lit && !brake ? [false, true] : [false]) {
          const d = clone(s, n.d);
          for (let i = 0; i < EVERY && !d.over; i++) d.step(DT, { throttle: brake ? 0 : 1, brake: brake ? 1 : 0, steer: steerToward(d, xOf(slot)), nitro: nitro && i < 2 });
          if (d.ended === "crash") continue;
          const node: Node = { d, slot, value: d.score.distance + d.veh.u / FEEL.pace * 0.8 + d.nitro * 15, path: [...n.path, { slot, brake, nitro }] };
          if (d.ended === "line") {
            const time = d.score.time;
            if (!best || time < best.time) best = { time, node };
            continue;
          }
          kids.push(node);
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
    if (process.env.TRACE && round % 10 === 0) console.error(s.id, round, kids.length, nodes.length, nodes[0] && Math.round(nodes[0].d.score.distance), nodes[0] && Math.round(nodes[0].d.kmh));
  }
  if (!best) return null;
  const d = best.node.d;
  return { id: s.id, time: +best.time.toFixed(2), misses: d.score.misses, doubles: d.score.doubles, avg: Math.round((s.length / d.score.time) * 3.6), nitro: d.score.nitroUses };
}

if (!isMainThread) {
  parentPort!.on("message", ({ id, beam }: { id: string; beam: number }) => parentPort!.postMessage(search(SPRINTS.find((s) => s.id === id)!, beam)));
} else {
  const args = process.argv.slice(2);
  const opt = (k: string, def: string) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : def; };
  const beam = +opt("--beam", "60"), json = opt("--json", "");
  const ids = args.length ? args : SPRINTS.map((s) => s.id);
  const t0 = performance.now();
  const out = process.env.TRACE ? ids.map((id) => search(SPRINTS.find((s) => s.id === id)!, beam)) : await Promise.all(ids.map((id) => new Promise<ReturnType<typeof search>>((res) => {
    const w = new Worker(new URL(import.meta.url));
    w.on("message", (r) => { res(r); w.terminate(); });
    w.postMessage({ id, beam });
  })));
  for (const r of out) {
    if (!r) { console.log("no finish found"); continue; }
    const s = SPRINTS.find((x) => x.id === r.id)!;
    console.log(`${r.id.padEnd(12)} best ${r.time} s (${r.misses} near misses, ${r.doubles} gaps, ${r.avg} km/h, nitro ×${r.nitro})  stars at ${starTimes({ ...s, best: r.time }).join(" / ")}`);
  }
  console.error(`${((performance.now() - t0) / 1000).toFixed(0)} s`);
  if (json) await Bun.write(json, JSON.stringify(out, null, 2));
}
