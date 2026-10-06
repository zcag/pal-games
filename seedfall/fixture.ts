// Writes test/shots/seedfall.json: the store screenshots' fixture. Each palette seeds the page's storage with a save
// the bot played (the regular player on one seed, until it first reaches the Core, about an hour and a half: the town
// built up, the log filling, still on Vell), then staged the way scripts/gallery.ts stages the real game in the source repo: the pod moved to a
// place, the time of day set, and a `scene` (surface/main.ts) that skips the title card, opens a screen and keeps the
// page from storing anything. The rules are deterministic from the seed and the page's chance is seeded
// (shots.mjs), so a picture is the same every run. `make shots EXT=seedfall`.
import { Host } from "../.pal/host/test/harness.ts";
import { NOW, pinClock, writeFixture } from "../.pal/app/scripts/fixture-kit.ts";
import { Game } from "./game/game.ts";
import { Bot, SKILLS, play } from "./game/bot.ts";
import { W, STATS } from "./game/types.ts";
import { HW } from "./game/pod.ts";
import { MATERIALS } from "./game/content/world.ts";
import manifest from "./pal.json" with { type: "json" };

const lived = (() => {
  const g = Game.create(7, { now: NOW, tz: 0 });
  play(g, new Bot(g, SKILLS.regular, 7), 150 * 60, () => g.s.reached >= 6);
  return g.save(NOW);
})();

type Stage = { at?: string | number; dy?: number; levels?: number; day?: number; screen?: string; tab?: number; give?: number; dig?: boolean };

/** Every first-run hint, learned: a lived save has done each long ago (surface/ui/onboarding.ts `HINTS`). */
const HINTS = ["dig", "fly", "sell", "buy", "enter", "scan", "items", "full"];

/** The lived save, staged: the pod stood in a place (the depot pad, a structure's kind, or a row), the time of day (0..1, noon 0.5). */
function staged(o: Stage) {
  const g = Game.load(structuredClone(lived), NOW, { now: NOW, tz: 0 });
  if (o.levels) for (const st of STATS) g.set(st, Math.min(o.levels, st === "scanner" ? 8 : 20));
  if (o.give) g.give(o.give);
  if (o.day !== undefined) g.s.time = 600 * (o.day - 0.3 + 1);
  if (o.at === "pad") g.teleport(g.world.spawnX + 4.5, -HW - 1e-6);
  else if (o.at !== undefined) {
    const w = g.world, liquid = (m: number) => MATERIALS[m]?.kind === "liquid";
    const solid = (x: number, y: number) => x < 1 || x > W - 2 || (y >= 0 && w.mat[y * W + x] !== 0 && !liquid(w.mat[y * W + x]));
    let [x, y] = [24, typeof o.at === "number" ? o.at : 400];
    if (typeof o.at === "string") {
      // the biggest of its kind, and for a lava lake the one with the most lava left in it after the bot's hours
      const lava = (s: { x: number; y: number; w: number; h: number }) => { let n = 0; for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) n += liquid(w.mat[y * W + x]) ? 1 : 0; return n; };
      const s = w.structures.filter((s) => s.kind === o.at).sort((a, b) => lava(b) - lava(a) || b.w * b.h - a.w * a.h)[0];
      if (s) [x, y] = [s.x + s.w / 2, s.y + s.h / 2 + (o.dy ?? 0)];
    } else for (let c = 6; c < 42; c++) if (w.mat[y * W + c] === 0) { x = c; break; }
    // the nearest open tile with ground under it
    const ok = (tx: number, ty: number) => !solid(tx, ty) && solid(tx, ty + 1);
    find: for (let r = 0; r < 60; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = Math.round(x) + dx, ty = Math.round(y) + dy;
      if (tx < 1 || tx > W - 2 || ty < 1 || ty > 770) continue;
      if (ok(tx, ty)) { x = tx + 0.5; y = ty + 1 - 0.4375 - 1e-6; break find; }
    }
    g.setReached(6);
    g.teleport(x, y);
    // `dig`: the shaft the player dug to get here, straight up until it meets a known way home (no "Sealed in")
    if (o.dig) for (let ty = Math.floor(y) - 1; ty > 0 && !Number.isFinite(g.pod.fuelHome); ty--) {
      if (solid(Math.floor(x), ty)) g.live.clear(g, ty * W + Math.floor(x));
      g.teleport(x, y);
    }
  }
  return { save: g.save(NOW), hints: HINTS, scene: { ...(o.screen && { screen: o.screen }), ...(o.tab && { tab: o.tab }) } };
}

const SCENES: Record<string, Stage> = {
  crystal: { at: "star_geode", levels: 12 },
  magma: { at: "lava_lake", dy: -3, levels: 12, dig: true },
  town: { at: "pad", day: 0.75 },
  workshop: { at: "pad", day: 0.5, screen: "workshop", give: 40000 },
  chamber: { at: "chamber", dy: -4, levels: 14 },
  log: { at: "pad", day: 0.95, screen: "log" },
};

pinClock();
const host = await Host.bundled({ only: ["seedfall"] });
try {
  const view = await host.request("view", { extension: "seedfall", palette: "seedfall" });
  const palette = (o: Stage) => ({ title: manifest.title, icon: manifest.icon, view: "view", tree: view, surface: { storage: staged(o), settings: { volume: 0 } } });
  const shots: Record<string, { palette: string; keys: string[]; caption: string; cover?: number[] }> = {
    "1-crystal": { palette: "crystal", keys: ["wait:1800"], caption: "Down in the crystal caves: the pod's lamp, the ore glinting in the rock, fuel, hull and cargo at a glance" },
    "2-town": { palette: "town", keys: ["wait:1800"], caption: "Gantry at sunset: land on the depot pad and the haul sells, the tank fills and the hull is mended" },
    "3-workshop": { palette: "workshop", keys: ["wait:1500"], caption: "The workshop: every part of the pod, what the next level does in plain numbers, and the one to buy next" },
    "4-magma": { cover: [253, 303, 923, 452], palette: "magma", keys: ["wait:1800"], caption: "The magma layer: lava lakes light the rock, and the heat climbs while you stay" },
    "5-chamber": { palette: "chamber", keys: ["wait:1800"], caption: "The Seed at the bottom of the world: wake it and launch it, and follow it to the next planet" },
    "6-log": { palette: "log", keys: ["wait:1500"], caption: "The collection log: every ore, jackpot and relic you have found, and where" },
  };
  writeFixture("seedfall", { palettes: Object.fromEntries(Object.keys(SCENES).map((k) => [k, palette(SCENES[k])])), shots });
  console.log("seedfall: 6 shots planned");
} finally {
  host.kill();
}
