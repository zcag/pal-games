// QA chaos: drop a kitted pod into random open tiles of every biome on every planet and mash human-like inputs
// (held keys of random length, items 1-7, scan, dump, confirm), checking the invariants every step and a save ->
// load round trip now and then. Reports issues and which hazards and features were exercised.
//   bun scripts/qa-chaos.ts [--trials 60] [--secs 40] [--planets vell,cinder,ferrum] [--seed 1]
import { Game } from "../game/game.ts";
import { W, H, STATS, type GameEvent, type Input, type PlanetId } from "../game/types.ts";
import { BIOME_TOP, MATERIALS } from "../game/content/world.ts";
import { GATES, MODULES, RESEARCH, ITEM_KEYS, PACE, type ModuleId } from "../game/content/economy.ts";
import { Checker, DT, rng, inp, I, liveVsLoaded, podInRock } from "./qa-lib.ts";
import { HW } from "../game/pod.ts";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const trials = +opt("trials", "60"), secs = +opt("secs", "40"), seed0 = +opt("seed", "1");
const planets = opt("planets", "vell,cinder,ferrum").split(",") as PlanetId[];

const seen: Record<string, number> = {};
const chk = new Checker(6);
let steps = 0, worst = 0, sum = 0;
const r = rng(seed0 * 977);

for (const planet of planets) {
  for (let t = 0; t < trials; t++) {
    const seed = seed0 * 1000 + t;
    const g = Game.create(seed, { planet, now: 1.7e12 });
    // a slot and a kit about right for it (sometimes under-kitted, as a player pushing early would be)
    const slot = Math.floor(r() * 7);
    const under = r() < 0.3 ? 2 : 0;
    g.setReached(slot);
    const gate = GATES[Math.min(7, slot + 1)];
    g.set("drill", Math.max(PACE[slot] - under, gate.drill - under));
    g.set("hull", gate.hull + 2); g.set("radiator", gate.radiator + (r() < 0.5 ? 2 : 0));
    for (const st of ["engine", "tank", "cargo", "lamp", "scanner"] as const) g.set(st, Math.floor(r() * (4 + 2 * slot)));
    g.giveData(5000);
    for (const res of RESEARCH) if (r() < 0.5) g.buyResearch(res.id);
    const mods = (Object.keys(MODULES) as ModuleId[]).filter(() => r() < 0.6);
    for (const m of mods) g.buyModule(m);
    g.s.fungalSlot = slot >= 3;
    for (const m of mods.sort(() => r() - 0.5)) g.equipModule(m);
    for (const id of ITEM_KEYS) g.giveItem(id, 1 + Math.floor(r() * 3));
    g.give(Math.floor(r() * 5000));
    if (r() < 0.5 && slot > 0) { for (let k = 0; k < slot; k++) g.buyLift(); }
    // an open tile in the slot's rows (a cave), else dig a pocket
    const top = BIOME_TOP[slot], bot = slot < 6 ? BIOME_TOP[slot + 1] - 1 : 769;
    let spot = -1;
    for (let k = 0; k < 400 && spot < 0; k++) {
      const x = 1 + Math.floor(r() * (W - 2)), y = top + Math.floor(r() * (bot - top));
      if (g.world.mat[I(x, y)] === 0 && g.world.mat[I(x, y + 1)] !== 0 && MATERIALS[g.world.mat[I(x, y + 1)]].kind !== "liquid") spot = I(x, y);
    }
    if (spot < 0) continue;
    g.teleport((spot % W) + 0.5, ((spot / W) | 0) + 1 - HW - 1e-6);
    if (podInRock(g).length) { chk.add("spawn-in-rock", `${spot % W},${(spot / W) | 0}`, 0); continue; }
    let held: Input = inp(), hold = 0;
    let ev: GameEvent[] = [];
    for (let k = 0; k < secs * 60; k++) {
      if (hold <= 0) {
        const c = r();
        held = c < 0.35 ? inp({ down: true }) : c < 0.5 ? inp({ left: true }) : c < 0.65 ? inp({ right: true }) : c < 0.8 ? inp({ up: true }) : c < 0.88 ? inp({ up: true, left: r() < 0.5, right: r() < 0.5 }) : inp();
        hold = Math.floor(6 + r() * 120);
      }
      hold--;
      const i: Input = { ...held };
      const c = r();
      if (c < 0.004) i.item = 1 + Math.floor(r() * 7);
      else if (c < 0.006) i.scan = true;
      else if (c < 0.007) i.dump = true;
      if (g.pod.stranded || r() < 0.002) i.confirm = true;
      if (held.up && r() < 0.01) i.up = false; // a double tap now and then (Afterburner)
      const a = performance.now();
      ev = g.step(DT, i);
      const ms = performance.now() - a;
      sum += ms; steps++; worst = Math.max(worst, ms);
      if (ms > 8) chk.add("slow-step", `${ms.toFixed(1)} ms at ${planet} slot ${slot} pod ${g.pod.x.toFixed(1)},${g.pod.y.toFixed(1)} ents ${g.entities.length}`, g.s.time);
      for (const e of ev) {
        const key = e.t === "explode" ? `explode:${e.kind}` : e.t === "damage" ? `damage:${e.source}` : e.t === "rescue" ? `rescue:${e.kind}` : e.t === "item" ? `item:${e.item}:${e.ok}` : e.t === "teleport" ? `teleport:${e.phase}` : e.t === "break" ? `break:${e.by}` : e.t;
        seen[key] = (seen[key] ?? 0) + 1;
      }
      chk.note(g, i, ev);
      chk.step(g, ev);
      if (r() < 1 / 1500) {
        const why = liveVsLoaded(g, () => inp(), 60);
        if (why) chk.add("save-roundtrip", `${why} at ${planet} slot ${slot}`, g.s.time);
      }
      if (g.inTown()) break;
    }
  }
}
console.log(`chaos: ${planets.join("/")} x ${trials} trials x ${secs}s | step avg ${((sum / steps) * 1000).toFixed(0)}us worst ${worst.toFixed(1)}ms`);
console.log(`issues: ${chk.report()}`);
for (const is of chk.issues) console.log(` - [${is.kind}] t=${is.t.toFixed(1)} ${is.detail}`);
const keys = Object.keys(seen).sort();
console.log("exercised:", keys.map((k) => `${k}=${seen[k]}`).join(" "));
const want = ["gas_fuse", "explode:gas", "explode:dynamite", "explode:charge", "wobble", "fall_land", "lava_touch", "spore", "arc", "pulse", "geyser", "storm", "cache", "teleport:done", "rescue:tow", "rescue:wreck", "damage:boulder", "damage:arc", "damage:lava", "damage:heat", "damage:geyser", "break:drone"];
console.log("never seen:", want.filter((k) => !seen[k]).join(" ") || "none");
void STATS; void H;
