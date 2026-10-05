// QA soak: the autopilot plays the real rules for a long session per seed, checking invariants every step, a
// save -> load round trip at random moments (live vs loaded, stepped on together), offline progress, and step time.
//   bun scripts/qa-soak.ts [--seeds 1,2,3] [--minutes 60] [--noise 0.02] [--planet vell] [--debug-cash 0] [--verbose]
import { Game } from "../game/game.ts";
import type { GameEvent, PlanetId } from "../game/types.ts";
import { BIOMES, planetDef } from "../game/content/world.ts";
import { Checker, Pilot, DT, rng, liveVsLoaded, inp } from "./qa-lib.ts";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const seeds = opt("seeds", "1,2,3").split(",").map(Number);
const minutes = +opt("minutes", "60");
const noise = +opt("noise", "0.02");
const planet = opt("planet", "vell") as PlanetId;
const debugCash = +opt("debug-cash", "0");
const verbose = args.includes("--verbose");
/** --boost k: at every dock, give k x the suggestion's price (drives the pilot through every biome fast). */
const boost = +opt("boost", "0");
/** --bot <skill>: drive with the economy agent's bot (src/game/bot.ts) instead of the QA pilot. */
const botSkill = opt("bot", "");
const botMod = botSkill ? await import("../game/bot.ts") : null;

let fail = 0;
for (const seed of seeds) {
  const t0 = performance.now();
  let g = Game.create(seed, { planet, now: 1.7e12 });
  if (debugCash) g.give(debugCash);
  const chk = new Checker();
  const pilot = new Pilot(seed * 7 + 1, noise);
  const bot = botMod ? new botMod.Bot(g, botMod.SKILLS[botSkill], seed) : null;
  const r = rng(seed * 13 + 5);
  let ev: GameEvent[] = [];
  let worstAt = "";
  let workarounds = 0, worst = 0, sumMs = 0, steps = 0, trips = 0, offline = 0;
  // progress watch: cash earned, deepest row, launches; a session that makes none of them for 20 bot-minutes is stuck
  let progT = 0, progKey = "", stuckTold = 0, still = { x: 0, y: 0, t: 0 }, townT = 0;
  const stuckLog: string[] = [];
  const counts: Record<string, number> = {};
  const n = Math.round(minutes * 60 * 60);
  let wall = 1.7e12;
  for (let k = 0; k < n; k++) {
    if (bot) bot.observe(ev);
    const i = bot ? bot.tick(DT) : pilot.input(g, ev);
    const a = performance.now();
    ev = g.step(DT, i);
    const ms = performance.now() - a;
    sumMs += ms; steps++; if (ms > worst) { worst = ms; worstAt = `t=${g.s.time.toFixed(0)} pod ${g.pod.x.toFixed(1)},${g.pod.y.toFixed(1)} launch ${g.s.launch?.phase ?? "-"} ev ${ev.map((e) => e.t).join(",").slice(0, 120)}`; }
    wall += DT * 1000;
    for (const e of ev) counts[e.t] = (counts[e.t] ?? 0) + 1;
    if (process.env.QA_TRACE) chk.note(g, i, ev);
    {
      const s = g.s, p = g.pod, t = s.time;
      const key = `${Math.floor(s.earned / 50)}|${s.deepest}|${s.launches}|${s.planet}|${s.lift}|${JSON.stringify(s.levels)}`;
      if (key !== progKey) { progKey = key; progT = t; }
      else if (t - progT > 1200 && t - stuckTold > 1200) { stuckTold = t; chk.add("no-progress-20min", `pod ${p.x.toFixed(1)},${p.y.toFixed(1)} fuel ${p.fuel.toFixed(1)}/${p.fuelMax.toFixed(0)} hull ${p.hull.toFixed(0)} cash ${s.cash.toFixed(0)} cargo ${p.cargoUsed}/${p.cargoMax} launch ${s.launch?.phase ?? "-"} docked ${s.docked} mode ${bot ? bot.mode : pilot.mode}`, t); }
      if (Math.hypot(p.x - still.x, p.y - still.y) > 0.5 || s.launch || g.inTown()) still = { x: p.x, y: p.y, t };
      else if (t - still.t > 120) { chk.add("pod-still-120s", `in the mine at ${p.x.toFixed(2)},${p.y.toFixed(2)} fuel ${p.fuel.toFixed(1)} stranded ${p.stranded} dead ${p.dead} grounded ${p.grounded} dig ${p.dig ? p.dig.dir : "-"} mode ${bot ? bot.mode : pilot.mode}`, t); still.t = t; }
      if (g.inTown()) { townT += DT; if (townT > 600) { chk.add("town-10min", `10 min in town: cash ${s.cash.toFixed(0)} fuel ${p.fuel.toFixed(1)} docked ${s.docked} x ${p.x.toFixed(2)} building ${g.building()} mode ${bot ? bot.mode : pilot.mode}`, t); townT = -1e9; } }
      else townT = 0;
      for (const e of ev) if (e.t === "launch" || (e.t === "rescue")) stuckLog.push(`${t.toFixed(0)} ${e.t}${"phase" in e ? ":" + e.phase : ""}${"kind" in e ? ":" + e.kind : ""}`);
    }
    chk.step(g, ev);
    if (boost && ev.some((e) => e.t === "dock")) { const sg = g.suggestion(); g.give(Math.round(boost * (sg?.cost ?? 100))); g.giveData(50); }
    // work around the dry-tank soft lock (filed) so the session can go on
    if (g.inTown() && g.pod.fuel <= 0 && g.s.docked && g.s.time - g.s.brokeAt > 31) { g.give(20); g.s.docked = false; workarounds++; }
    // a save at a random moment: the live game and its loaded copy must keep stepping identically
    if (r() < 1 / (60 * 90)) {
      trips++;
      const seq: ReturnType<typeof inp>[] = [];
      const probe = new Pilot(seed, 0, false);
      const why = liveVsLoaded(g, (j) => (seq[j] ??= probe.input(g, [])), 90);
      if (why) chk.add("save-roundtrip", `${why} (pod ${g.pod.x.toFixed(1)},${g.pod.y.toFixed(1)} mode ${pilot.mode})`, g.s.time);
    }
    // reload as a person would, sometimes after hours away (offline progress and the card)
    if (r() < 1 / (60 * 600)) {
      const away = r() < 0.5 ? 60e3 : 3.6e6 * (1 + r() * 20);
      const json = JSON.stringify(g.save(wall));
      const silo0 = g.s.silo;
      wall += away;
      g = Game.load(JSON.parse(json), wall);
      if (bot) bot.g = g;
      offline++;
      const card = g.s.offline;
      if (away >= 300e3 && !card && g.s.rigs.some((l) => l > 0)) chk.add("offline-card", `no card after ${(away / 3.6e6).toFixed(1)} h with rigs`, g.s.time);
      if (card && card.counted > card.cap + 1e-6) chk.add("offline-cap", JSON.stringify(card), g.s.time);
      if (card && Math.abs(g.s.silo - silo0 - card.cash) > 1 && !card.full) { /* card.cash accumulates across loads */ }
    }
  }
  const ms = performance.now() - t0;
  const s = g.s;
  const line = `seed ${seed} ${planet}: ${minutes} min | reached ${BIOMES[planetDef(s.planet).biomes[Math.min(6, s.reached)]]?.name ?? s.reached} (slot ${s.reached}) deepest ${s.deepest} | cash ${Math.round(s.cash)} earned ${Math.round(s.earned)} data ${Math.round(s.data)} | levels ${JSON.stringify(s.levels)} lift ${s.lift} modules ${s.modules.join("/")} | dives ${s.dives} homes ${bot ? "(bot)" : JSON.stringify(pilot.homes)} launches ${s.launches} planet ${s.planet} | step avg ${(sumMs / steps * 1000).toFixed(0)}us worst ${worst.toFixed(1)}ms | dry-lock workarounds ${workarounds} | trips ${trips} reloads ${offline} | wall ${(ms / 1000).toFixed(1)}s`;
  console.log(line);
  console.log(`  worst step at ${worstAt}`);
  console.log(`  issues: ${chk.report()}`);
  for (const is of chk.issues) console.log(`   - [${is.kind}] t=${is.t.toFixed(1)} ${is.detail}`);
  if (verbose) { console.log("  events:", JSON.stringify(counts)); console.log("  pilot:", pilot.log.slice(-25).join(" | ")); }
  else if (pilot.homes.stuck) console.log("  pilot stuck log:", pilot.log.filter((l) => /stuck|sealed/.test(l)).slice(0, 6).join(" | "));
  if (bot) {
    const rec = bot.rec;
    for (const run of rec.runs) console.log(`  run ${run.run} ${run.planet}: ${(((run.launched ? run.t1 : g.s.time) - run.t0) / 60).toFixed(1)} min launched ${run.launched} reach(min) ${run.reach.map((x) => (x ? (x / 60).toFixed(0) : "-")).join("/")} dives ${run.dives.length} wrecks ${run.wrecks} tows ${run.tows} tele ${run.teleports} sealed ${run.sealed} shards ${run.shards}`);
    const ends: Record<string, number> = {};
    for (const run of rec.runs) for (const d of run.dives) ends[d.end] = (ends[d.end] ?? 0) + 1;
    console.log(`  dive ends: ${JSON.stringify(ends)} | stalls ${rec.stalls.length}`);
    for (const st of rec.stalls.slice(0, 6)) console.log(`    stall t=${st.t.toFixed(0)} ${st.mode}/${st.target} at ${st.x.toFixed(1)},${st.y.toFixed(1)} next ${st.next} ${st.note}`);
  }
  if (chk.issues.length) fail++;
}
process.exit(fail ? 1 : 0);
