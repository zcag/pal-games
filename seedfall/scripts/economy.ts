// The economy simulator (DESIGN R15, progression.md section 13): player-like bots (src/game/bot.ts) play the real rules
// from fresh saves, through the real shop, for whole runs (the first launch, then runs 2-4), on worker threads; the
// report holds every target of progression.md section 9/13 and DESIGN R1-R6, R16, per bot skill.
//
//   bun scripts/economy.ts [--bots 12] [--skills casual,regular,good] [--runs 4] [--cap 300] [--threads 16] [--seed 1]
//                          [--dominance] [--json out.json]
//   bun scripts/economy.ts --trace [--seed 1] [--skill regular] [--minutes 20] [--from 0] [--to 0]
//     (one bot's dive log; with --from/--to, a per-second sample of the pod between those game seconds)
//
// Tuning log (content/economy.ts; medians of the real bot, regular unless noted; before -> after):
//   0. Baseline (progression.md numbers) once the bot played whole runs: first launch 99-111 min but Stone 11-16,
//      Crystal 16-23, Ruins 22-30 min, per-dock bursts p90 6 / max 9-11 (B kept buying cheap tank and cargo), tank
//      and cargo maxed by Ruins (100-slot bays too heavy to climb), idle share 2-8%, run 2 at 67-89% of run 1.
//   1. tank growth 1.5 -> 1.6, cargo 1.6 -> 1.7 (fewer comfort levels per dock); Head Start 10/20/45/90/160 ->
//      6/12/24/70/140: bursts p90 6 -> 5, max 9 -> 6; run 2 63%, run 4 44%.
//   2. drill growth 1.68 -> 1.72, radiator base 850 -> 1200, engine growth 1.65 -> 1.7, rig cost 3 x 1.65^l ->
//      2.5 x 1.6^l (bot also plunges to its work row now): launch 80 -> 90 min, idle share 12 -> 19%.
//   3. drill base 75 -> 95, radiator 1200 -> 1000 x 1.38: launch 94; 4. Crystal hull gate 2 -> 1, Topsoil Lift
//      80 -> 60 (Stone 12 -> 10 min); 5. drill base 110, Crystal Lift 1000 -> 1500, Fungal Lift 4760 -> 7000:
//      launch 90; Fungal/Magma hull gates 4/6 -> 5/7 (wrecks at the Magma entry 1.95/h for the good bot -> 0.6).
//   6. Rules fixes landed (lift exit, rail digs, re-clamp, Heartstone kept, sealed tow, Cinder radiator gates).
//      drill 110 x 1.72 -> 90 x 1.74, tank 30 x 1.6 -> 25 x 1.5 (Stone is fuel-bound: 14 -> 11.8 min), radiator
//      base 1250, rig cost 2.5 -> 2 x 1.6^l: launch casual/regular/good 113/87/89 -> 105/90/83, idle 11 -> 12-25%.
//   7. Magma Lift 22.6k -> 35k, lance 60/120/200k -> 70/140/230k, Head Start 50/100 for IV/V (replays faster).
//      run 4 (replay) regular 35 -> 31.5 min, run 3 44 -> 34; launch 90 -> 88.
//   8. drill growth 1.74 -> 1.77 (Ruins and Core gates dearer): launch casual/regular/good 102/88/84 -> 106/93/85,
//      Ruins 11 -> 13 min, run 2 64% -> 51% of run 1, idle share 15-20%.
//   9. R1 check (--dominance, 10 regular bots, 40 min): teleport strategy earned 103-108% of turning back at k = 8;
//      teleporter k 8 -> 24 (the 30% loss is DESIGN R1's and stays): teleport 87%, tow 77% of turning back.
//  10. Runs 1-10 (QA 2 feel 1: shards exploded): shardsFor takes E at Seed age 0 prices (E / 1.3^min(n, cap)), Market
//      Contacts 8 x 1.6^L -> 8 x 1.8^L, engine growth 1.7 -> 1.6, Head Station opens at Fungal for 300 data (was Magma,
//      400), Stone Lift on sale at Stone (Stone 12 -> 2-3 min; launch regular 91 -> 78): shards rise ~15%/run
//      (regular 43 -> 187-219 by run 10), late runs regular 19-26 min.
//  11. Seed age value capped at 4 launches (rules hook), climb cap min(30, 7 + 1.15L) -> min(36, 8 + 1.4L), drill base
//      90 -> 120, radiator base 1250 -> 1500: launch casual/regular/good 101/84/89, runs 6-10 regular 20-26 min, good
//      14-28. Transit stays 36-38% (Lift at 60 t/s and the faster climb moved it < 2 points): the rest is the bot's
//      way back through its own tunnels, not the rules.
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { availableParallelism } from "node:os";
import { Game } from "../game/game.ts";
import { Bot, SKILLS, Rec, fmt, type RunRec, type Strategy } from "../game/bot.ts";
import { fuelPrice } from "../game/content/economy.ts";

const NOW = Date.UTC(2026, 9, 5, 12);

// ---------------------------------------------------------------- one career (a worker's job)

interface Job { seed: number; skill: string; runs: number; cap: number; strategy: Strategy; minutes?: number }
interface Career { seed: number; skill: string; strategy: Strategy; runs: RunRec[]; softlocks: number; stalls: number; offline: { cash: number; perMin: number; hours: number } | null; minutes: number }

function career(job: Job): Career {
  const g = Game.create(job.seed, { now: NOW, tz: 0 });
  const rec = new Rec();
  const bot = new Bot(g, SKILLS[job.skill], job.seed, { rec, strategy: job.strategy });
  const dt = 1 / 60;
  let softlocks = 0, lockT = 0, offline: Career["offline"] = null;
  for (;;) {
    bot.observe(g.step(dt, bot.tick(dt)));
    // the offline card for 2 hours away, taken once at 45 bot minutes into run 1
    if (!offline && rec.runs.length === 1 && g.time >= 45 * 60) offline = offlineReturn(g, rec);
    // a pod in town with an empty tank and no cash cannot drive back onto the depot (rules issue): count it and give
    // it the half tank the broke guard should have
    const p = g.pod;
    if (g.inTown() && p.fuel <= 0.01 && g.s.cash < fuelPrice(g.bDeep())) {
      lockT += dt;
      if (lockT > 20) { softlocks++; p.fuel = 0.5 * p.fuelMax; lockT = 0; }
    } else lockT = 0;
    if (rec.runs.length > job.runs) break; // launched `runs` times
    if (job.minutes && g.time >= job.minutes * 60) break;
    if (g.time - rec.cur().t0 > job.cap * 60 && !g.s.launch) break;
  }
  for (const r of rec.runs) if (!r.launched && !r.t1) r.t1 = g.time;
  if (!rec.cur().launched) bot.closeRun();
  const runs = rec.runs.slice(0, job.runs);
  return { seed: job.seed, skill: job.skill, strategy: job.strategy, runs: runs.map(slim), softlocks, stalls: rec.stalls.length, offline, minutes: g.time / 60 };
}

/** The offline card for 2 hours away right now, against the income of the last 15 minutes of play. */
function offlineReturn(g: Game, rec: Rec) {
  const hours = 2;
  const save = g.save(NOW);
  const back = Game.load(JSON.parse(JSON.stringify(save)), NOW + hours * 3600e3);
  const card = back.s.offline;
  const run = rec.cur(), t = g.time - run.t0;
  const then = run.docks.filter((d) => d.t <= t - 900).pop()?.earned ?? 0;
  return { cash: card?.cash ?? 0, perMin: (g.s.earned - then) / 15, hours };
}

const slim = (r: RunRec): RunRec => ({ ...r });

if (!isMainThread) {
  parentPort!.on("message", (job: Job) => {
    try { parentPort!.postMessage(career(job)); }
    catch (e) { parentPort!.postMessage({ ...job, error: String((e as Error).stack ?? e) }); }
  });
}

// ---------------------------------------------------------------- statistics

const q = (xs: number[], p: number) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const med = (xs: number[]) => q(xs, 0.5);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const m = (s: number) => (isNaN(s) ? "-" : (s / 60).toFixed(1));
const pct = (x: number) => (isNaN(x) ? "-" : `${Math.round(x * 100)}%`);
const BIOME = ["Topsoil", "Stone", "Crystal", "Fungal", "Magma", "Ruins", "Core"];

/** Every target for one run of one bot. */
function metrics(r: RunRec, c: Career) {
  const end = r.t1 - r.t0;
  // purchase moments: docks where an upgrade, a Lift segment or a lance part was bought
  const shop = r.buys.filter((b) => b.what === "upgrade" || b.what === "lift" || b.what === "lance");
  const times = [...new Set(shop.map((b) => b.dock))].map((k) => shop.find((b) => b.dock === k)!.t);
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  const early = gaps.filter((_, i) => times[i] < 1800), late = gaps.filter((_, i) => times[i] >= 1800);
  const docks = r.docks;
  const perDock = docks.map((d) => d.buys);
  const statMax = Math.max(0, ...docks.map((d) => Math.max(0, ...Object.values(d.stats).map((v) => v ?? 0))));
  const dives = r.dives.filter((d) => d.t1 > d.t0);
  const len = (d: (typeof dives)[number]) => d.t1 - d.t0;
  const transit = dives.map((d) => d.transit / Math.max(1, len(d)));
  const lateDives = dives.filter((d) => d.slot >= 5);
  const deepDives = dives.filter((d) => d.slot >= 4 && (d.end === "fuel" || d.end === "full"));
  // depth-frozen stretches: consecutive dives that start at a gate limit (heat, drill, hull) already at it
  let frozen = 0, longest = 0, runF = 0, startF = -1;
  for (let i = 0; i < dives.length; i++) {
    const d = dives[i], next = dives[i + 1];
    if (d.frozen) {
      if (startF < 0) startF = d.t0;
      runF = (next ? next.t0 : d.t1) - startF;
      if (!next?.frozen) { frozen += runF; longest = Math.max(longest, runF); startF = -1; runF = 0; }
    }
  }
  const reach = (s: number) => r.reach[s] ?? NaN;
  const biomeT = [1, 2, 3, 4, 5].map((s) => reach(s + 1) - reach(s));
  biomeT.push(r.launched ? end - reach(6) : NaN);
  const workMin = dives.reduce((a, d) => a + len(d), 0) / 60;
  const ores = dives.reduce((a, d) => a + d.ores, 0), dug = dives.reduce((a, d) => a + d.dug, 0);
  const left = r.oreLeft && r.oreStart ? r.oreLeft.map((x, i) => x / Math.max(1, r.oreStart![i])) : [];
  const hours = end / 3600;
  // dead walls: the longest stretch with no purchase (upgrades, lift, lance) after the first 5 minutes
  const wall = Math.max(0, ...gaps.filter((_, i) => times[i] > 300));
  return {
    run: r.run, planet: r.planet, launched: r.launched, end, first: times[0] ?? NaN,
    docksBuy1h: docks.filter((d) => d.t < 3600 && d.buys > 0).length,
    gapMed: med(gaps), gapMax: Math.max(0, ...gaps), gapEarly: med(early), gapLate: med(late), wall,
    perDockP90: q(perDock.filter((x) => x > 0), 0.9), perDockMax: Math.max(0, ...perDock), statMax,
    biomeT, frozenShare: frozen / Math.max(1, end), longestFreeze: longest,
    transitMed: med(transit), transitP90: q(transit, 0.9), transitMax: Math.max(0, ...transit),
    lateTransitMed: med(lateDives.map((d) => d.transit)), lateTransitMax: Math.max(0, ...lateDives.map((d) => d.transit)),
    oreLeft: left, fuelEnd: deepDives.length ? deepDives.filter((d) => d.end === "fuel").length / deepDives.length : NaN,
    wrecksH: r.wrecks / hours, towsH: r.tows / hours, teleports: r.teleports,
    idle: r.rigIncome / Math.max(1, r.sales + r.rigIncome),
    diveEarly: med(dives.filter((d) => d.t0 - r.t0 < 900).map(len)), diveLate: med(dives.filter((d) => d.t0 - r.t0 >= 900).map(len)),
    diveMax: Math.max(0, ...dives.map(len)),
    dugMin: dug / Math.max(0.01, workMin), oresMin: ores / Math.max(0.01, workMin),
    perMin: r.earned / Math.max(1, end / 60), earned: r.earned, shards: r.shards,
    ends: dives.reduce((a, d) => { a[d.end] = (a[d.end] ?? 0) + 1; return a; }, {} as Record<string, number>),
    softlocks: c.softlocks, sealed: r.sealed, tows: r.tows, wrecks: r.wrecks,
  };
}
type Metrics = ReturnType<typeof metrics>;

// ---------------------------------------------------------------- the report

function report(careers: Career[], skills: string[]) {
  const by = new Map<string, Metrics[][]>();
  for (const c of careers) {
    const list = by.get(c.skill) ?? [];
    list.push(c.runs.map((r) => metrics(r, c)));
    by.set(c.skill, list);
  }
  const rows: [string, string, ...string[]][] = [];
  const add = (name: string, target: string, f: (ms: Metrics[][], skill: string) => string) => rows.push([name, target, ...skills.map((s) => f(by.get(s) ?? [], s))]);
  const run1 = (ms: Metrics[][]) => ms.map((x) => x[0]).filter(Boolean);
  const r1 = (f: (x: Metrics) => number, agg: (xs: number[]) => number = med) => (ms: Metrics[][]) => agg(run1(ms).map(f).filter((v) => !isNaN(v)));
  const fmtS = (v: number) => (isNaN(v) ? "-" : `${Math.round(v)} s`);
  add("Time to first upgrade", "<= 75 s (about 1 min)", (ms) => fmtS(r1((x) => x.first)(ms)));
  add("Docks with a purchase, first hour", ">= 20", (ms) => String(r1((x) => x.docksBuy1h)(ms)));
  add("Gap between purchases, median / max", "<= 2.5 / <= 6 min", (ms) => `${m(r1((x) => x.gapMed)(ms))} / ${m(r1((x) => x.gapMax)(ms))}`);
  add("Gap median, early (<30 min) / late", "", (ms) => `${m(r1((x) => x.gapEarly)(ms))} / ${m(r1((x) => x.gapLate)(ms))}`);
  add("Purchases per dock, p90 / max", "<= 4 / <= 6", (ms) => `${r1((x) => x.perDockP90)(ms)} / ${r1((x) => x.perDockMax, (xs) => Math.max(...xs))(ms)}`);
  add("Levels of one stat in one dock (max)", "<= 2", (ms) => String(r1((x) => x.statMax, (xs) => Math.max(...xs))(ms)));
  for (let s = 0; s < 6; s++) {
    const tgt = ["3-8", "6-14", "8-20", "12-24", "6-20", "8-20"][s];
    add(`Time in ${s < 5 ? BIOME[s + 1] : "Core + chamber"} (min)`, tgt, (ms) => { const v = run1(ms).map((x) => x.biomeT[s]).filter((v) => !isNaN(v)); return `${m(med(v))} (${m(q(v, 0.1))}-${m(q(v, 0.9))})${v.length < run1(ms).length ? ` n=${v.length}` : ""}`; });
  }
  add("First launch (bot min)", "R16: 80-110 (regular)", (ms) => { const v = run1(ms).filter((x) => x.launched).map((x) => x.end); return `${m(med(v))} (${m(q(v, 0.1))}-${m(q(v, 0.9))}) ${v.length}/${run1(ms).length}`; });
  const nRuns = Math.max(...careers.map((c) => c.runs.length));
  for (let k = 1; k < nRuns; k++) add(`Run ${k + 1} (min, vs run 1)`, k === 1 ? "<= 60%" : k === 3 ? "<= 45 min; replay <= 30" : k >= 5 ? "late runs >= 20-30 min" : "", (ms) => {
    const v = ms.filter((x) => x[k]?.launched && x[0].launched);
    if (!v.length) return "-";
    return `${m(med(v.map((x) => x[k].end)))} (${pct(med(v.map((x) => x[k].end / x[0].end)))}) ${v[0][k].planet} n=${v.length}`;
  });
  add("Shards per run", "rises ~10-20% a run", (ms) => Array.from({ length: nRuns }, (_, k) => { const v = ms.map((x) => x[k]?.shards).filter((x) => x); return v.length ? String(med(v as number[])) : "-"; }).join(" / "));
  add("Tows / wrecks per run (median, runs 1..)", "few", (ms) => Array.from({ length: nRuns }, (_, k) => { const v = ms.map((x) => x[k]).filter(Boolean); return v.length ? `${med(v.map((x) => x.tows))}/${med(v.map((x) => x.wrecks))}` : "-"; }).join(" "));
  add("Depth-frozen share / longest freeze", "<= 20% / <= 6 min", (ms) => `${pct(r1((x) => x.frozenShare)(ms))} / ${m(r1((x) => x.longestFreeze)(ms))} (worst ${m(r1((x) => x.longestFreeze, (xs) => Math.max(...xs))(ms))})`);
  add("Transit share of a dive, median / p90 / max", "<= 30%", (ms) => `${pct(r1((x) => x.transitMed)(ms))} / ${pct(r1((x) => x.transitP90)(ms))} / ${pct(r1((x) => x.transitMax)(ms))}`);
  add("Late transit (Ruins, Core), median / max", "<= 45 s", (ms) => `${fmtS(r1((x) => x.lateTransitMed)(ms))} / ${fmtS(r1((x) => x.lateTransitMax)(ms))}`);
  add("Ore left at launch, per biome", ">= 30% each", (ms) => {
    const v = run1(ms).filter((x) => x.oreLeft.length);
    return v.length ? [0, 1, 2, 3, 4, 5, 6].map((b) => pct(med(v.map((x) => x.oreLeft[b])))).join(" ") : "-";
  });
  add("Late dives ending on fuel (Magma+)", "<= 60% (D16)", (ms) => pct(r1((x) => x.fuelEnd)(ms)));
  add("Wrecks / tows per hour", "wrecks 0.3-1", (ms) => `${r1((x) => x.wrecksH, mean)(ms).toFixed(2)} / ${r1((x) => x.towsH, mean)(ms).toFixed(2)}`);
  add("Idle share of income (run 1)", "15-30%", (ms) => pct(r1((x) => x.idle)(ms)));
  add("Dive length early / late / max", "40-90 s / <= 5 min", (ms) => `${fmtS(r1((x) => x.diveEarly)(ms))} / ${fmtS(r1((x) => x.diveLate)(ms))} / ${fmtS(r1((x) => x.diveMax, (xs) => Math.max(...xs))(ms))}`);
  add("Tiles dug / ore tiles per dive-minute", "human-like", (ms) => `${r1((x) => x.dugMin)(ms).toFixed(0)} / ${r1((x) => x.oresMin)(ms).toFixed(1)}`);
  add("Income per minute, run 1", "", (ms) => `$${Math.round(r1((x) => x.perMin)(ms))}`);
  add("Longest stretch with no purchase", "no dead wall (<= 6 min)", (ms) => `${m(r1((x) => x.wall)(ms))} (worst ${m(r1((x) => x.wall, (xs) => Math.max(...xs))(ms))})`);
  add("Offline: 2 h away at 45 min", "a good return, < a dive's worth/min", (_ms, s) => {
    const v = careers.filter((c) => c.skill === s && c.offline).map((c) => c.offline!);
    if (!v.length) return "-";
    return `$${Math.round(med(v.map((o) => o.cash)))} = ${med(v.map((o) => o.cash / Math.max(1, o.perMin))).toFixed(0)} min of play`;
  });
  add("Dive endings (run 1, all bots)", "", (ms) => {
    const t: Record<string, number> = {};
    for (const x of run1(ms)) for (const [k, v] of Object.entries(x.ends)) t[k] = (t[k] ?? 0) + v;
    const n = Object.values(t).reduce((a, b) => a + b, 0);
    return Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v / n)}`).join(", ");
  });
  add("Sealed in (no way up) per hour", "rare", (ms) => (run1(ms).reduce((a, x) => a + x.sealed, 0) / Math.max(1, run1(ms).reduce((a, x) => a + x.end, 0) / 3600)).toFixed(2));
  add("Bot stalls (10 s without progress) per hour", "bot health: ~0", (_ms, s) => { const cs = careers.filter((c) => c.skill === s); return (cs.reduce((a, c) => a + c.stalls, 0) / Math.max(1, cs.reduce((a, c) => a + c.minutes, 0) / 60)).toFixed(2); });
  add("Soft-locks (town, no fuel, no cash)", "0", (_ms, s) => String(careers.filter((c) => c.skill === s).reduce((a, c) => a + c.softlocks, 0)));
  table(rows, skills);
  // per biome (run 1): the dive runner's statistics (R15 level 1), against progression's model table
  for (const s of skills) {
    const list = careers.filter((c) => c.skill === s).map((c) => c.runs[0]).filter(Boolean);
    const brow: string[][] = [];
    for (let b = 0; b < 7; b++) {
      const ds = list.flatMap((r) => r.dives.filter((d) => d.slot === b && d.t1 > d.t0));
      if (!ds.length) continue;
      const len = ds.map((d) => d.t1 - d.t0), tot = len.reduce((a, x) => a + x, 0) / 60;
      const val = ds.reduce((a, d) => a + d.value, 0);
      const fuel = ds.filter((d) => d.end === "fuel").length, full = ds.filter((d) => d.end === "full").length;
      brow.push([BIOME[b], String(ds.length), `${Math.round(med(len))} s`, `$${Math.round(val / ds.length)}`, `$${Math.round(val / tot)}`,
        pct(med(ds.map((d) => d.transit / Math.max(1, d.t1 - d.t0)))), `${fuel}/${fuel + full}`,
        (ds.reduce((a, d) => a + d.dug, 0) / tot).toFixed(0), (ds.reduce((a, d) => a + d.ores, 0) / tot).toFixed(1)]);
    }
    console.log(`\n${s}: dives by deepest biome (run 1, ${list.length} bots)`);
    table([["Biome", "Dives", "Length", "Avg haul", "Active $/min", "Transit", "Fuel/(fuel+full)", "Dug/min", "Ores/min"], ...brow], null);
  }
}

function table(rows: string[][], skills: string[] | null) {
  if (skills) rows = [["Metric", "Target", ...skills], ...rows];
  const w = rows[0].map((_, i) => Math.max(...rows.map((r) => (r[i] ?? "").length)));
  const line = (r: string[]) => "| " + r.map((c, i) => c.padEnd(w[i])).join(" | ") + " |";
  console.log(line(rows[0]));
  console.log("|" + w.map((n) => "-".repeat(n + 2)).join("|") + "|");
  for (const r of rows.slice(1)) console.log(line(r));
}

// ---------------------------------------------------------------- workers

async function runAll(jobs: Job[], threads: number): Promise<Career[]> {
  const out: Career[] = [];
  let next = 0, done = 0;
  const t0 = performance.now();
  // a career that runs far longer than the rest is reported (a bot that loops forever is a bot fault to look at)
  const busy = new Map<Worker, { job: Job; t: number }>();
  const watch = setInterval(() => { for (const { job, t } of busy.values()) if (performance.now() - t > 300e3) { console.error(`\nslow career: seed ${job.seed} ${job.skill} ${job.strategy} (${((performance.now() - t) / 1000).toFixed(0)} s)`); busy.forEach((v) => { if (v.job === job) v.t = performance.now(); }); } }, 30e3);
  await Promise.all(Array.from({ length: Math.min(threads, jobs.length) }, () => new Promise<void>((res) => {
    const w = new Worker(new URL(import.meta.url));
    const feed = () => {
      if (next >= jobs.length) { w.terminate(); res(); return; }
      busy.set(w, { job: jobs[next], t: performance.now() });
      w.postMessage(jobs[next++]);
    };
    w.on("message", (c: Career & { error?: string }) => { busy.delete(w); if (c.error) console.error(`seed ${c.seed} ${c.skill}: ${c.error.split("\n").slice(0, 3).join(" | ")}`); else out.push(c); done++; process.stderr.write(`\r${done}/${jobs.length} careers, ${((performance.now() - t0) / 1000).toFixed(0)} s`); feed(); });
    w.on("error", (e) => { console.error(e); feed(); });
    feed();
  })));
  clearInterval(watch);
  process.stderr.write("\n");
  return out;
}

function arg(name: string, def: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function trace() {
  const seed = +arg("seed", "1"), skill = arg("skill", "regular"), minutes = +arg("minutes", "20");
  const from = +arg("from", "0"), to = +arg("to", "0");
  const g = Game.create(seed, { now: NOW, tz: 0 });
  const rec = new Rec(); rec.trace = true;
  const bot = new Bot(g, SKILLS[skill], seed, { rec });
  const dt = 1 / 60;
  while (g.time < minutes * 60) { bot.observe(g.step(dt, bot.tick(dt))); }
  bot.closeRun();
  console.log(rec.log.join("\n"));
  for (const r of rec.runs) console.log(`run ${r.run} ${r.planet}: buys ${r.buys.map((b) => `${fmt(b.t)} ${b.what}:${b.id}${b.level ? " " + b.level : ""}`).join(", ")}`);
  const tot = Object.values(rec.doing).reduce((a, b) => a + b, 0);
  console.log("dive time: " + Object.entries(rec.doing).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v / tot)}`).join(", "));
  console.log(`cash $${Math.round(g.s.cash)}, deepest row ${g.s.deepest}, levels ${JSON.stringify(g.s.levels)}`);
  if (to > from) for (const s of rec.samples.filter((s) => s.t >= from && s.t < to))
    console.log(`${fmt(s.t)} row ${s.row} ${s.mode.padEnd(7)} fuel ${s.fuel.toFixed(1)} home ${s.home === Infinity ? "sealed" : s.home.toFixed(1)} bay ${s.cargo} hull ${pct(s.hull)} heat ${pct(s.heat)} cash $${Math.round(s.cash)}`);
}

async function main() {
  if (flag("trace")) return trace();
  const skills = arg("skills", "casual,regular,good").split(",");
  const bots = +arg("bots", "12"), runs = +arg("runs", "4"), cap = +arg("cap", "300"), seed0 = +arg("seed", "1");
  const threads = +arg("threads", String(Math.max(1, availableParallelism() - 2)));
  const jobs: Job[] = [];
  for (const skill of skills) for (let k = 0; k < bots; k++) jobs.push({ seed: seed0 + k, skill, runs, cap, strategy: "normal" });
  if (flag("dominance")) {
    // R1: the same seeds played to 40 minutes turning back at the tick, running dry for the tow, or teleporting home
    const djobs: Job[] = [];
    for (const strategy of ["normal", "tow", "teleport"] as Strategy[]) for (let k = 0; k < bots; k++) djobs.push({ seed: seed0 + k, skill: "regular", runs: 1, cap, strategy, minutes: 40 });
    const res = await runAll(djobs, threads);
    const rate = (st: Strategy) => res.filter((c) => c.strategy === st).map((c) => (c.runs[0].sales + c.runs[0].rigIncome) / c.minutes);
    const base = mean(rate("normal"));
    console.log(`R1 dominance (regular bot, 40 min, $/min): turn back ${base.toFixed(0)}, tow ${mean(rate("tow")).toFixed(0)} (${pct(mean(rate("tow")) / base)}), teleport ${mean(rate("teleport")).toFixed(0)} (${pct(mean(rate("teleport")) / base)})`);
    return;
  }
  const careers = await runAll(jobs, threads);
  report(careers, skills);
  const json = arg("json", "");
  if (json) await Bun.write(json, JSON.stringify(careers));
}

if (isMainThread) await main();
