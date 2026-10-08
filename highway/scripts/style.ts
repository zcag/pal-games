// How a player drives against the best-time search: re-drives the player's saved runs (this machine's pal storage) and
// runs a search tried (`scripts/sprint-try.jsonl`, written by `sprint.ts --try`) and prints each one's taps, fixes
// and pass gaps. bun highway/scripts/style.ts [sprint-try.jsonl]. A car's wheelbase here is the search's guess, not
// its model's, so a run in a car other than its region's first can drift and crash
import { readFileSync, existsSync } from "node:fs";
import { Drive, ROLLING_START } from "../game/drive.ts";
import { bestDrive, chooser, decode, type Hulls } from "../game/bestrun.ts";
import { CARS } from "../game/content.ts";
import { SPRINTS } from "../game/sprint.ts";
import hulls from "../surface/cars/hulls.json";
const H = hulls as unknown as Hulls, sizes = new Map(Object.entries(H));
const store = JSON.parse(readFileSync(process.env.HOME + "/Library/Application Support/pal/storage/highway.json", "utf8"));
const tries = existsSync(process.argv[2] ?? "-") ? readFileSync(process.argv[2], "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
const unpack = (s: string) => { let n = 0; return s.split(",").map((x) => { n += parseInt(x.slice(0, -1) || "0", 36); const c = parseInt(x.slice(-1), 36); return [n, c & 1, (c >> 1) & 1, (c >> 2) - 1] as const; }); };

function measure(d: Drive, next: () => { throttle: number; brake: number; steer: number }) {
  const gaps: number[] = [], presses: { t: number; dur: number; dir: number }[] = [];
  d.events.pass = (_n, gap) => gaps.push(gap);
  let cur = 0, since = 0, brakeSteps = 0, offs: number[] = [];
  while (!d.over && d.steps < 120 * 200) {
    const i = next(); d.step(1 / 120, i);
    if (d.intro > 0) continue;
    if (i.brake) brakeSteps++;
    if (i.steer !== cur) { if (cur) presses.push({ t: since / 120, dur: (d.steps - since) / 120, dir: cur }); cur = i.steer; since = d.steps; }
    if (d.steps % 12 === 0) offs.push(d.veh.x);
  }
  const corr = presses.filter((p, k) => k && presses[k - 1].dir === -p.dir && p.t - (presses[k - 1].t + presses[k - 1].dur) < 0.6).length;
  const durs = presses.map((p) => p.dur).sort((a, b) => a - b), q = (a: number[], f: number) => a[Math.floor(a.length * f)]?.toFixed(2);
  const near = gaps.filter((g) => g < 1.5);
  const bucket = [0.3, 0.6, 1.0, 1.5].map((b, k, a) => near.filter((g) => g <= b && g > (k ? a[k - 1] : -1)).length);
  const secs = d.score.time;
  return `${d.ended} ${secs.toFixed(2)}s presses ${presses.length} (${(presses.length / secs * 60).toFixed(0)}/min) dur p25/50/75 ${q(durs, .25)}/${q(durs, .5)}/${q(durs, .75)} counter<0.6s ${corr} brake ${(brakeSteps / 120).toFixed(1)}s | passes<1.5m ${near.length}: ≤.3 ${bucket[0]} ≤.6 ${bucket[1]} ≤1 ${bucket[2]} ≤1.5 ${bucket[3]} median ${q(near.sort((a, b) => a - b), .5)} m; <0.1 ${near.filter((g) => g < 0.1).length} <0.05 ${near.filter((g) => g < 0.05).length} min ${near[0]?.toFixed(2)}`;
}
for (const [id, tape] of Object.entries(store.tapes as Record<string, any>)) {
  const s = SPRINTS.find((x) => x.id === id)!, car = CARS.find((c) => c.id === tape.car)!, size = sizes.get(car.id)!;
  const d = new Drive(s.layout, car, size, size.z * 0.58, (k) => sizes.get(k), {}, { sprint: { seed: s.seed, length: s.length, density: s.density }, intro: ROLLING_START, seed: tape.seed });
  const t = unpack(tape.tape); let j = 0, c = { throttle: 0, brake: 0, steer: 0 };
  const me = measure(d, () => { while (j < t.length && t[j][0] <= d.steps) { c = { throttle: t[j][1], brake: t[j][2], steer: t[j][3] }; j++; } return c; });
  console.log(`${id} (you ${tape.car} ${tape.time.toFixed(2)}, bot ${s.car})\n  you ${me}`);
  for (const r of tries.filter((x) => x.id === id)) { const b = bestDrive(s, H); console.log(`  bot ${measure(b, chooser(b, decode(r.choices), r.pace))}  ${JSON.stringify(r.pace)}`); }
}
