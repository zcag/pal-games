// The balance simulator: many seeded bot runs per persona, commander and ascension, in parallel
// workers, reported against DESIGN.md "Balance targets" and run-meta 9.
//
//   bun scripts/sim.ts                 standard survey (~N=300 per cell; a few minutes on 16 cores)
//   bun scripts/sim.ts --n 1000        bigger samples
//   bun scripts/sim.ts --asc           expert A0..A10 per step
//   bun scripts/sim.ts --lifts         relic and cap-lifter lift experiments (paired seeds)
//   bun scripts/sim.ts --quick         small smoke survey
// The report prints to stdout and is saved to scripts/balance/report-<date>-<mode>.txt.
import os from "node:os";
import type { CommanderId, TowerId } from "../game/types.ts";
import { COMMANDER_IDS } from "../game/content/run/commanders.ts";
import { RELICS } from "../game/content/run/relics.ts";
import { BOON } from "../game/content/run/boons.ts";
import { SPEC_OF } from "../game/content/battle/towers.ts";
import type { CareerSum, RunSum, RunTask, Task } from "./balance/tasks.ts";
import { synergyLifts } from "./balance/synergy.ts";
import { hash } from "../game/rng.ts";

const argv = process.argv.slice(2);
const flag = (k: string) => argv.includes(`--${k}`);
const num = (k: string, d: number) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? Number(argv[i + 1]) : d; };
const N = num("n", flag("quick") ? 60 : 300);
const CAREERS = num("careers", flag("quick") ? 60 : 300);
const THREADS = num("threads", Math.max(1, os.cpus().length - 2));

// ---------------------------------------------------------------- the pool
async function pool<T>(tasks: Task[]): Promise<T[]> {
  const out: T[] = new Array(tasks.length);
  const chunk = 2;
  let next = 0, done = 0;
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    if (!tasks.length) return resolve();
    const workers = Array.from({ length: Math.min(THREADS, Math.ceil(tasks.length / chunk)) }, () => new Worker(new URL("./balance/worker.ts", import.meta.url).href));
    const feed = (w: Worker) => {
      if (next >= tasks.length) { w.terminate(); return; }
      const id = next;
      w.postMessage({ id, tasks: tasks.slice(id, id + chunk) });
      next += chunk;
    };
    for (const w of workers) {
      w.onmessage = (e: MessageEvent<{ id: number; out: T[] }>) => {
        e.data.out.forEach((x, i) => (out[e.data.id + i] = x));
        done += e.data.out.length;
        if (done % 200 < chunk) process.stderr.write(`  ${done}/${tasks.length} (${((performance.now() - t0) / 1000).toFixed(0)} s)\r`);
        if (done >= tasks.length) { workers.forEach((x) => x.terminate()); resolve(); } else feed(w);
      };
      w.onerror = (e) => { console.error(e); process.exit(1); };
      feed(w);
    }
  });
  process.stderr.write(`  ${tasks.length} tasks in ${((performance.now() - t0) / 1000).toFixed(0)} s          \n`);
  return out;
}

// ---------------------------------------------------------------- formatting
const lines: string[] = [];
const say = (s = "") => { lines.push(s); console.log(s); };
const pct = (x: number) => `${(100 * x).toFixed(0)}%`;
const f1 = (x: number) => x.toFixed(1);
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)]! : NaN; };
const table = (head: string[], rows: (string | number)[][]) => {
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  say(head.map((h, i) => h.padEnd(w[i]!)).join("  "));
  for (const r of rows) say(r.map((c, i) => String(c).padEnd(w[i]!)).join("  "));
};
const winRate = (rs: RunSum[]) => rs.filter((r) => r.won).length / Math.max(1, rs.length);
const mark = (ok: boolean) => (ok ? "ok" : "MISS");

/** Estimated real minutes (run-meta 1 "Time budget"): players play later waves at 2x, so a battle takes
 *  0.75 of its 1x time, plus 30 s setup and a 15 s reward screen; rests 20 s, other nodes 35 s, 30 s
 *  per act for the map and transitions. */
const SPEED = 0.75;
const minutes = (r: RunSum) => {
  const fights = r.battles.reduce((a, b) => a + SPEED * b.ticks / 30 + 30 + 15, 0);
  const other = (r.kinds ?? []).filter((k) => !["battle", "elite", "boss", "bounty"].includes(k)).reduce((a, k) => a + (k === "rest" || k === "camp" ? 20 : 35), 0);
  return (fights + other + 30 * r.act) / 60;
};

// ---------------------------------------------------------------- tasks
const runTasks = (persona: string, k: number, commanders: CommanderId[], ascs: number[], n: number, base: number, explore = 0): RunTask[] => {
  const out: RunTask[] = [];
  for (const c of commanders) for (const a of ascs) for (let i = 0; i < n; i++) out.push({ t: "run", persona, k, commander: c, asc: a, seed: hash(hash(base, a), i), explore });
  return out;
};

async function survey(core = false) {
  const tasks: Task[] = [];
  if (!core) for (let i = 0; i < CAREERS; i++) tasks.push({ t: "career", persona: "learning", seed: hash(0xc0de, i), runs: 12 });
  tasks.push(...runTasks("decent", 0.6, core ? ["marshal"] : COMMANDER_IDS, [0], N, 1, core ? 0 : 0.2));
  tasks.push(...runTasks("expert", 0.9, ["marshal"], core ? [0] : [0, 5, 10], N, 2));
  if (!core) tasks.push(...runTasks("novice", 0.2, ["marshal"], [0], Math.round(N / 2), 3));
  const res = await pool<RunSum | CareerSum>(tasks);
  const careers = res.filter((x): x is CareerSum => "runs" in x);
  const runs = res.filter((x): x is RunSum => !("runs" in x));
  report(careers, runs);
}

function report(careers: CareerSum[], runs: RunSum[]) {
  const date = new Date().toISOString().slice(0, 10);
  say(`Ramparts balance report ${date}  (runs per cell ${N}, careers ${careers.length})`);
  const decent = runs.filter((r) => r.persona === "decent");
  const expert = runs.filter((r) => r.persona === "expert");
  const novice = runs.filter((r) => r.persona === "novice");
  const firsts = careers.map((c) => c.first);
  if (process.env.TUNE) say(`TUNE ${process.env.TUNE}`);
  const firstWin = careers.map((c) => c.runs.find((r) => r.won)?.n ?? Infinity);
  const allRuns = [...runs, ...firsts];

  // ---------------- targets
  say("\n== Targets ==");
  const r1 = { a1: firsts.filter((r) => !r.won && r.act === 1).length / firsts.length, a2: firsts.filter((r) => !r.won && r.act === 2).length / firsts.length, win: winRate(firsts) };
  const by8 = firstWin.filter((n) => n <= 8).length / careers.length;
  const med = median(firstWin);
  const dm = decent.filter((r) => r.commander === "marshal");
  const ex = (a: number) => winRate(expert.filter((r) => r.asc === a));
  const battles = allRuns.flatMap((r) => r.battles);
  const len = battles.filter((b) => b.won).map((b) => b.ticks / 30);
  const wins = dm.filter((r) => r.won);
  table(["check", "target", "measured", ""], [
    ["learning run 1 dies in act I", "45-60%", pct(r1.a1), mark(r1.a1 >= 0.45 && r1.a1 <= 0.6)],
    ["learning run 1 dies in act II", "30-45%", pct(r1.a2), mark(r1.a2 >= 0.3 && r1.a2 <= 0.45)],
    ["learning run 1 wins", "< 3%", pct(r1.win), mark(r1.win < 0.03)],
    ["first win by run 8", "60-75%", pct(by8), mark(by8 >= 0.6 && by8 <= 0.75)],
    ["median first win", "run 5-6", isFinite(med) ? `run ${med}` : "never", mark(med >= 5 && med <= 6)],
    ["decent k0.6 A0 (Marshal)", "35-50%", pct(winRate(dm)), mark(winRate(dm) >= 0.35 && winRate(dm) <= 0.5)],
    ["expert k0.9 A0", "~80%", pct(ex(0)), mark(Math.abs(ex(0) - 0.8) <= 0.07)],
    ["expert k0.9 A5", "~50%", pct(ex(5)), mark(Math.abs(ex(5) - 0.5) <= 0.07)],
    ["expert k0.9 A10", "15-25%", pct(ex(10)), mark(ex(10) >= 0.15 && ex(10) <= 0.25)],
    ["battle length (won, 1x)", "2:00-3:15", `${fmtS(median(len))} median (${fmtS(pct10(len, 0.1))}-${fmtS(pct10(len, 0.9))})`, mark(median(len) >= 120 && median(len) <= 195)],
    ["run length (decent win)", "30-45 min", wins.length ? `${f1(median(wins.map(minutes)))} min` : "-", mark(wins.length > 0 && median(wins.map(minutes)) >= 30 && median(wins.map(minutes)) <= 45)],
    ["novice k0.2 wins", "rare", pct(winRate(novice)), ""],
  ]);
  if (wins.length) {
    const part = (k: string[]) => { const bs = wins.flatMap((r) => r.battles.filter((b) => k.includes(b.kind))); return `${f1(bs.length / wins.length)} x ${fmtS(mean(bs.map((b) => SPEED * b.ticks / 30 + 45)))}`; };
    const other = mean(wins.map((r) => (r.kinds ?? []).filter((k) => !["battle", "elite", "boss", "bounty"].includes(k)).length));
    say(`run time of a decent win (real, setup + reward included): battles ${part(["battle", "bounty", "ambush"])}, elites ${part(["elite"])}, bosses ${part(["boss"])}, other nodes ${f1(other)}`);
  }

  // ---------------- commanders
  say("\n== Commanders (decent k0.6, A0) ==");
  const base = winRate(dm);
  table(["commander", "win", "vs Marshal", "died act I/II/III/IV"], COMMANDER_IDS.map((c) => {
    const rs = decent.filter((r) => r.commander === c);
    const w = winRate(rs);
    return [c, pct(w), `${w - base >= 0 ? "+" : ""}${(100 * (w - base)).toFixed(0)}`, [1, 2, 3, 4].map((a) => pct(rs.filter((r) => !r.won && r.act === a).length / rs.length)).join(" / ")];
  }));

  // ---------------- learning curve
  say("\n== Learning player ==");
  const dist = new Map<string, number>();
  for (const n of firstWin) { const k = isFinite(n) ? String(n) : ">12"; dist.set(k, (dist.get(k) ?? 0) + 1); }
  say(`first win on run: ${[...dist].sort((a, b) => (a[0] === ">12" ? 99 : +a[0]) - (b[0] === ">12" ? 99 : +b[0])).map(([k, v]) => `${k}: ${pct(v / careers.length)}`).join("  ")}`);
  const byRun: string[] = [];
  for (let n = 1; n <= 8; n++) {
    const rs = careers.map((c) => c.runs.find((r) => r.n === n)).filter((x) => !!x);
    if (!rs.length) break;
    byRun.push(`run ${n}: act ${f1(mean(rs.map((r) => (r!.won ? 5 : r!.act))))} k ${f1(mean(rs.map((r) => r!.k)))}`);
  }
  say(byRun.join(" | "));
  say(`run 1 death: ${deathLine(firsts)}`);

  // ---------------- deaths
  say("\n== Where runs end (act-floor, losses) ==");
  for (const [name, rs] of [["novice", novice], ["decent", decent], ["expert A0", expert.filter((r) => r.asc === 0)]] as [string, RunSum[]][]) say(`${name.padEnd(10)} ${deathLine(rs)}`);

  // ---------------- battles
  say("\n== Battles (all personas) ==");
  table(["act", "kind", "n", "lives lost (mean)", "won", "length", "called early", "gold at w1/w4/last"], [1, 2, 3, 4].flatMap((a) => ["battle", "elite", "boss"].map((k) => {
    const bs = battles.filter((b) => b.act === a && (b.kind === k || (k === "battle" && (b.kind === "ambush" || b.kind === "bounty"))));
    if (!bs.length) return null;
    const g = (i: number) => Math.round(mean(bs.map((b) => b.gold[i < 0 ? b.gold.length - 1 : i] ?? 0)));
    return [a, k, bs.length, f1(mean(bs.map((b) => b.lost))), pct(bs.filter((b) => b.won).length / bs.length), fmtS(median(bs.map((b) => b.ticks / 30))), f1(mean(bs.map((b) => b.calls))), `${g(0)}/${g(3)}/${g(-1)}`];
  }).filter((x) => !!x) as (string | number)[][]));
  for (const [name, rs] of [["novice", novice], ["learning run 1", firsts], ["decent", decent], ["expert A0", expert.filter((r) => r.asc === 0)]] as [string, RunSum[]][]) {
    const bs = rs.flatMap((r) => r.battles);
    say(`${name.padEnd(15)} lives lost per battle by act: ${[1, 2, 3, 4].map((a) => { const x = bs.filter((b) => b.act === a && b.kind !== "boss"); return x.length ? f1(mean(x.map((b) => b.lost))) : "-"; }).join(" / ")}`);
  }

  say("lives lost per battle to each enemy kind (decent + expert A0; battles, elites and bosses together):");
  for (const a of [1, 2, 3, 4]) {
    const bs = [...decent, ...expert.filter((r) => r.asc === 0)].flatMap((r) => r.battles).filter((b) => b.act === a);
    if (!bs.length) continue;
    const m = new Map<string, number>();
    for (const b of bs) for (const [k, v] of Object.entries(b.leakBy)) m.set(k, (m.get(k) ?? 0) + v);
    say(`  act ${a}: ${[...m].sort((x, y) => y[1] - x[1]).slice(0, 9).map(([k, v]) => `${k} ${f1(v / bs.length)}`).join(", ")}`);
  }

  // ---------------- bosses
  say("\n== Bosses (decent + expert A0) ==");
  const be = [...decent, ...expert.filter((r) => r.asc === 0)];
  const bosses = new Set(be.flatMap((r) => r.bossesMet));
  table(["boss", "met", "beaten", "runs it ended", "its health left then"], [...bosses].map((bo) => {
    const met = be.filter((r) => r.bossesMet.includes(bo)).length, won = be.filter((r) => r.bossesWon.includes(bo)).length;
    const ended = be.filter((r) => r.boss === bo);
    return [bo, met, pct(won / Math.max(1, met)), ended.length, ended.length ? pct(mean(ended.map((r) => r.bossHpLeft ?? 0))) : "-"];
  }));

  // ---------------- towers
  say("\n== Towers (decent + expert A0) ==");
  const towers = ["archer", "barracks", "mage", "bombard", "frost", "pyre", "alchemist", "storm", "beacon", "banner", "ballista", "thornwood"] as TowerId[];
  const bt = be.flatMap((r) => r.battles.map((b) => ({ b, r })));
  const top = new Map<string, number>();
  const won = be.filter((r) => r.won);
  for (const r of won) { const d = new Map<string, number>(); for (const b of r.battles) for (const t of b.built) d.set(t[0], (d.get(t[0]) ?? 0) + t[3]); const tt = [...d].sort((a, c) => c[1] - a[1])[0]; if (tt) top.set(tt[0], (top.get(tt[0]) ?? 0) + 1); }
  const totalDmg = bt.reduce((a, x) => a + x.b.built.reduce((s, t) => s + t[3], 0), 0);
  const blocker = new Map<string, number>();
  for (const r of won) for (const t of towers) {
    const half = r.battles.filter((b) => b.built.filter((x) => x[0] === t).length >= 2).length >= r.battles.length / 2;
    if (half) blocker.set(t, (blocker.get(t) ?? 0) + 1);
  }
  const perGold = (pred: (x: [TowerId, number, string | null, number, number]) => boolean) => {
    let d = 0, g = 0;
    for (const x of bt) for (const y of x.b.built) if (pred(y)) { d += y[3] / ([1, 1.0, 1.1, 1.25][x.b.act - 1]!); g += y[4]; }
    return g ? d / g : NaN;
  };
  const allPg = perGold(() => true);
  table(["tower", "owned", "built/battle", "dmg share", "dmg per gold (x mean)", "win when owned", "top dmg in wins", "2+ in half (wins)"], towers.map((t) => {
    const own = be.filter((r) => r.towers.includes(t));
    const builtIn = bt.filter((x) => x.b.built.some((y) => y[0] === t)).length / Math.max(1, bt.length);
    const dmg = bt.reduce((a, x) => a + x.b.built.filter((y) => y[0] === t).reduce((s, y) => s + y[3], 0), 0) / Math.max(1, totalDmg);
    const ts = (top.get(t) ?? 0) / Math.max(1, won.length);
    const bl = (blocker.get(t) ?? 0) / Math.max(1, won.length);
    return [t, pct(own.length / be.length), pct(builtIn), pct(dmg), f1(perGold((y) => y[0] === t) / allPg), pct(winRate(own)), `${pct(ts)} ${ts > 0.15 || ts < 0.05 ? "!" : ""}`, `${pct(bl)}${bl > 0.6 ? " FLAG" : ""}`];
  }));

  // ---------------- specs
  say("\n== Specialisations (share when that tower specialises; target 35-65%; damage per gold x mean) ==");
  const specs = new Map<string, number>();
  for (const x of bt) for (const t of x.b.built) if (t[2]) specs.set(t[2], (specs.get(t[2]) ?? 0) + 1);
  const rows: (string | number)[][] = [];
  for (const t of towers) {
    const pair = Object.entries(SPEC_OF).filter(([, v]) => v.tower === t).map(([s]) => s);
    const n = pair.map((s) => specs.get(s) ?? 0), tot = n[0]! + n[1]!;
    const pg = (s: string) => { const v = perGold((y) => y[2] === s) / allPg; return isNaN(v) ? "" : ` (${f1(v)})`; };
    rows.push([t, `${pair[0]} ${tot ? pct(n[0]! / tot) : "-"}${pg(pair[0]!)}`, `${pair[1]} ${tot ? pct(n[1]! / tot) : "-"}${pg(pair[1]!)}`, tot, tot && (n[0]! / tot < 0.35 || n[0]! / tot > 0.65) ? "MISS" : ""]);
  }
  table(["tower", "spec A", "spec B", "n", ""], rows);

  // ---------------- cards and relics
  say("\n== Cards and relics (decent, explore picks: win when picked vs offered and not picked) ==");
  const offers = new Map<string, { off: number; pick: number; eo: number; ep: number; ew: number; en: number; enw: number }>();
  for (const r of decent) for (const [key, picked, explore] of r.offers) {
    const o = offers.get(key) ?? { off: 0, pick: 0, eo: 0, ep: 0, ew: 0, en: 0, enw: 0 };
    if (!explore) { o.off++; if (picked) o.pick++; }
    else { o.eo++; if (picked) { o.ep++; if (r.won) o.ew++; } else { o.en++; if (r.won) o.enw++; } }
    offers.set(key, o);
  }
  const card = [...offers].filter(([, o]) => o.off >= 15).map(([k, o]) => ({ k, rate: o.pick / o.off, lift: o.ep >= 8 && o.en >= 8 ? o.ew / o.ep - o.enw / o.en : NaN, n: o.off }));
  const dead = card.filter((c) => c.rate < 0.1).sort((a, b) => a.rate - b.rate);
  const must = card.filter((c) => c.rate > 0.7).sort((a, b) => b.rate - a.rate);
  say(`cards offered 15+ times: ${card.length}; picked < 10%: ${dead.length}; picked > 70%: ${must.length}`);
  say(`  rarely picked: ${dead.slice(0, 18).map((c) => `${c.k.split(":")[1]} ${pct(c.rate)}${isNaN(c.lift) ? "" : ` (lift ${(100 * c.lift).toFixed(0)})`}`).join(", ")}`);
  say(`  must-picks:    ${must.slice(0, 18).map((c) => `${c.k.split(":")[1]} ${pct(c.rate)}${isNaN(c.lift) ? "" : ` (lift ${(100 * c.lift).toFixed(0)})`}`).join(", ")}`);
  const lifted = card.filter((c) => !isNaN(c.lift)).sort((a, b) => b.lift - a.lift);
  say(`  biggest random-pick lifts: ${lifted.slice(0, 8).map((c) => `${c.k.split(":")[1]} +${(100 * c.lift).toFixed(0)}`).join(", ")}`);
  say(`  smallest: ${lifted.slice(-8).map((c) => `${c.k.split(":")[1]} ${(100 * c.lift).toFixed(0)}`).join(", ")}`);
  // relics held at the end (observational)
  const held = new Map<string, [number, number]>();
  for (const r of decent) for (const id of r.relics) { const h = held.get(id) ?? [0, 0]; h[0]++; if (r.won) h[1]++; held.set(id, h); }
  const wr = winRate(decent);
  const rel = [...held].filter(([, h]) => h[0] >= 20).map(([id, h]) => [id, h[0], h[1] / h[0] - wr] as [string, number, number]).sort((a, b) => b[2] - a[2]);
  say(`relics held (observational win-rate vs all decent, n>=20): top ${rel.slice(0, 6).map(([id, n, l]) => `${id} ${l >= 0 ? "+" : ""}${(100 * l).toFixed(0)} (${n})`).join(", ")}`);
  void RELICS; void BOON;
}

function deathLine(rs: RunSum[]): string {
  const m = new Map<string, number>();
  for (const r of rs) { const k = r.won ? "WIN" : `${["", "I", "II", "III", "IV"][r.act]}-${r.floor}`; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m].sort((a, b) => b[1] - a[1]).slice(0, 9).map(([k, v]) => `${k} ${pct(v / rs.length)}`).join("  ");
}
function fmtS(s: number) { if (!isFinite(s)) return "-"; const m = Math.floor(s / 60); return `${m}:${String(Math.round(s - m * 60)).padStart(2, "0")}`; }
function pct10(xs: number[], q: number) { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(q * (s.length - 1))] ?? NaN; }

// ---------------------------------------------------------------- ascension sweep
async function ascSweep() {
  const res = await pool<RunSum>(runTasks("expert", 0.9, ["marshal"], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], N, 5));
  say("\n== Expert k0.9 win rate by ascension (target 80 / 50 / 15-25 at A0 / A5 / A10, steps 4-10, none over 15) ==");
  let prev = NaN;
  table(["asc", "win", "step"], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((a) => {
    const w = winRate(res.filter((r) => r.asc === a));
    const step = isNaN(prev) ? "" : `${(100 * (prev - w)).toFixed(0)}`;
    prev = w;
    return [a, pct(w), step];
  }));
}

// ---------------------------------------------------------------- lift experiments (paired seeds)
async function lifts() {
  const n = N;
  const base = runTasks("decent", 0.6, ["marshal"], [0], n, 9);
  const tasks: RunTask[] = [...base];
  const relics = RELICS.filter((r) => ["common", "uncommon", "rare", "boss", "shop"].includes(r.rarity)).map((r) => r.id);
  for (const id of relics) for (const t of base) tasks.push({ ...t, grant: { relics: [id] }, tag: `relic:${id}` });
  // cap-lifters that are boons: given with their tower
  const boonLift: [string, TowerId][] = [["field-forge", "banner"], ["endless-winter", "frost"]];
  for (const [b, tw] of boonLift) for (const t of base) {
    tasks.push({ ...t, grant: { towers: [tw] }, tag: `tower:${tw}` });
    tasks.push({ ...t, grant: { towers: [tw], boons: [[b, tw]] }, tag: `boon:${b}` });
  }
  const res = await pool<RunSum>(tasks);
  const w0 = winRate(res.filter((r) => !r.tag));
  say(`\n== Relic lifts: decent Marshal A0, relic given at the start, ${n} paired seeds; baseline ${pct(w0)} (target < 8 points; cap-lifters <= 15) ==`);
  const rows = relics.map((id) => { const w = winRate(res.filter((r) => r.tag === `relic:${id}`)); return [id, pct(w), (100 * (w - w0)).toFixed(0)] as [string, string, string]; }).sort((a, b) => +b[2] - +a[2]);
  table(["relic", "win", "lift"], rows.map((r) => [...r, +r[2] > 8 ? (["deadeyes-oath", "wildfire-crown", "overclock"].includes(r[0]) ? (+r[2] > 15 ? "OVER cap-lifter" : "cap-lifter ok") : "OVER") : ""]));
  for (const [b, tw] of boonLift) {
    const wt = winRate(res.filter((r) => r.tag === `tower:${tw}`)), wb = winRate(res.filter((r) => r.tag === `boon:${b}`));
    say(`${b}: with ${tw} ${pct(wt)} -> with the boon ${pct(wb)}: lift ${(100 * (wb - wt)).toFixed(0)} (cap 15)`);
  }
}

// ---------------------------------------------------------------- win rate against k (does knowing more win more?)
async function kSweep() {
  const ks = [0.2, 0.4, 0.6, 0.75, 0.9];
  const res = await pool<RunSum>(ks.flatMap((k) => runTasks(`k${k}`, k, ["marshal"], [0], N, 11)));
  say(`\n== Marshal A0 win rate by knowledge k (${N} runs each) ==`);
  table(["k", "win", "lives lost per battle by act", "ends"], ks.map((k) => {
    const rs = res.filter((r) => r.persona === `k${k}`), bs = rs.flatMap((r) => r.battles);
    return [k, pct(winRate(rs)), [1, 2, 3, 4].map((a) => { const x = bs.filter((b) => b.act === a); return x.length ? f1(mean(x.map((b) => b.lost))) : "-"; }).join(" / "), deathLine(rs)];
  }));
}

// ---------------------------------------------------------------- commanders only
async function cmdSweep() {
  const res = await pool<RunSum>(runTasks("decent", 0.6, COMMANDER_IDS, [0], N, 1));
  say(`\n== Commanders, decent k0.6 A0 (${N} runs each) ==`);
  const base = winRate(res.filter((r) => r.commander === "marshal"));
  table(["commander", "win", "vs Marshal", "lives lost per battle by act", "ends"], COMMANDER_IDS.map((c) => {
    const rs = res.filter((r) => r.commander === c), bs = rs.flatMap((r) => r.battles), w = winRate(rs);
    return [c, pct(w), `${w >= base ? "+" : ""}${(100 * (w - base)).toFixed(0)}`, [1, 2, 3, 4].map((a) => { const x = bs.filter((b) => b.act === a); return x.length ? f1(mean(x.map((b) => b.lost))) : "-"; }).join(" / "), deathLine(rs)];
  }));
}

// ---------------------------------------------------------------- main
const mode = flag("cmds") ? "cmds" : flag("ks") ? "ks" : flag("asc") ? "asc" : flag("lifts") ? "lifts" : flag("synergy") ? "synergy" : flag("core") ? "core" : flag("quick") ? "quick" : "survey";
const t0 = performance.now();
if (mode === "asc") await ascSweep();
else if (mode === "ks") await kSweep();
else if (mode === "cmds") await cmdSweep();
else if (mode === "lifts") await lifts();
else if (mode === "synergy") synergyLifts(say);
else if (mode === "core") await survey(true);
else { await survey(); say(""); synergyLifts(say); }
say(`\n(${mode}, ${((performance.now() - t0) / 1000).toFixed(0)} s, ${THREADS} threads)`);
const file = `scripts/balance/report-${new Date().toISOString().slice(0, 10)}-${mode}.txt`;
await Bun.write(file, lines.join("\n") + "\n");
console.log(`saved ${file}`);
