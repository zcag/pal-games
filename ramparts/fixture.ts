// Writes test/shots/ramparts.json: the store screenshots' fixture.
// Each palette seeds the page's storage: a profile some runs in (renown level 8, three
// commanders, the Marshal at ascension 3), and for the battle shots a scene (surface/main.ts
// `Scene`): a battle on a seeded map, towers built on its best pads and played forward some
// waves, then shown live. The run map and the commanders are reached with the game's own keys
// from the title. Chance is seeded in the page (shots.mjs), so a picture is the same every run.
// `make shots EXT=ramparts`.
import { Host } from "../.pal/host/test/harness.ts";
import { pinClock, writeFixture } from "../.pal/app/scripts/fixture-kit.ts";
import { migrate, type Profile } from "./game/meta.ts";
import { START_TOWERS } from "./game/content/run/towers.ts";
import type { Scene } from "./surface/scene.ts";
import manifest from "./pal.json" with { type: "json" };

/** A profile some runs in: level 8 on the renown track, four wins, the Marshal at ascension 3. */
function lived(): Profile {
  return migrate({
    renown: 512, level: 8, track: 8,
    unlocked: {
      towers: [...START_TOWERS, "alchemist", "storm"], commanders: ["marshal", "alchemist", "warden", "seer"],
      relics: ["black-ice", "long-fuse", "wildfire-crown"], events: ["the-wandering-merchant", "the-ruined-chapel"], titles: [],
    },
    perks: { "thick-walls": true, "second-look": true },
    ascension: { marshal: 3, alchemist: 1 }, reachedAct3: true, furthest: { act: 4, floor: 7 },
    codex: {
      towers: { archer: { built: 96, kills: 2210, damage: 412000, topWins: 2, specs: ["marksmen"] }, mage: { built: 58, kills: 930, damage: 188000, topWins: 1, specs: ["hexer"] }, frost: { built: 41, kills: 120, damage: 40000, topWins: 0, specs: ["shatter"] }, barracks: { built: 33, kills: 410, damage: 61000, topWins: 0, specs: [] }, pyre: { built: 27, kills: 380, damage: 90000, topWins: 1, specs: [] } },
      boons: {}, relics: {}, enemies: {}, events: {},
      bosses: { gorrak: { met: 9, defeated: 7, fastest: 3100, ascBeaten: 2 }, hivequeen: { met: 3, defeated: 2, fastest: 3500, ascBeaten: 1 }, wyrm: { met: 6, defeated: 5, fastest: 3900, ascBeaten: 2 }, colossus: { met: 5, defeated: 4, fastest: 4200, ascBeaten: 2 }, tyrant: { met: 4, defeated: 4, fastest: 5100, ascBeaten: 2 } },
      commanders: { marshal: { runs: 11, wins: 3, best: 2, towers: { archer: 11, mage: 9, barracks: 8 } }, alchemist: { runs: 3, wins: 1, best: 0, towers: { alchemist: 3, pyre: 3 } } },
    },
    totals: { runs: 14, wins: 4, streak: 1, bestStreak: 2, fastestWin: 61200, mostLivesWin: 17 },
    tutorial: Object.fromEntries(["map", "blessing", "battle", "build", "reward", "shop", "event", "forge", "camp"].map((k) => [k, true])),
    lastCommander: "marshal",
  });
}

const T1: Scene["battle"]["towers"] = [["archer", 3], ["mage", 4, "hexer"], ["barracks", 4, "paladins"], ["bombard", 2], ["frost", 4, "shatter"], ["archer", 4, "marksmen"], ["pyre", 3]];
const T2: Scene["battle"]["towers"] = [["alchemist", 4, "naphtha"], ["pyre", 4, "inferno"], ["storm", 4, "tempest"], ["ballista", 3], ["beacon", 2], ["banner", 4, "wardrums"], ["mage", 3], ["thornwood", 4, "treant"]];
const SCENES: Record<string, Scene | null> = {
  meadow: { battle: { act: 1, seed: 3, towers: T1, waves: 4, ticks: 260 } },
  tyrant: { battle: { act: 4, kind: "boss", seed: 4, towers: T2, waves: 11, ticks: 150, lives: 14 } },
  snow: { battle: { act: 3, seed: 21, towers: T1, waves: 8, ticks: 120 } },
  desert: { battle: { act: 2, seed: 5, towers: T2, waves: 4, ticks: 260 } },
  title: null,
};

pinClock();
const host = await Host.bundled({ only: ["ramparts"] });
try {
  const view = await host.request("view", { extension: "ramparts", palette: "ramparts" });
  const palette = (scene: Scene | null) => ({ title: manifest.title, icon: manifest.icon, view: "view", tree: view, surface: { storage: { profile: lived(), settings: { tips: false }, ...(scene ? { scene } : {}) }, settings: { volume: 0 } } });
  const shots: Record<string, { palette: string; keys: string[]; caption: string; cover?: number[] }> = {
    "1-meadow": { cover: [253, 234, 923, 452], palette: "meadow", keys: ["wait:6000"], caption: "Act I in the meadow, wave 5 of 7: towers on the bends, specialised at level four, and the next wave's roles in the band above" },
    "2-tyrant": { palette: "tyrant", keys: ["wait:6000"], caption: "The Ember Tyrant at the citadel, its health in three bars: alchemy, fire and storm towers, a ballista and a war banner" },
    "3-map": { palette: "title", keys: ["wait:3000", "enter", "wait:1200", "enter", "wait:1500", "1", "wait:4000"], caption: "A run's map: battles, events, shops, forges and camps on branching paths, and the act's boss waiting at the end" },
    "4-snow": { palette: "snow", keys: ["wait:6000"], caption: "Act III's last wave in the snow: bats take the short way over the corners, where only some towers reach" },
    "5-commander": { palette: "title", keys: ["wait:3000", "enter", "wait:1500"], caption: "Five commanders, each with its own towers, spells, relic and gift, and ten ascensions to climb" },
    "6-title": { palette: "title", keys: ["wait:4000"], caption: "The title: your renown level, what it opens next, and the codex of everything you've met" },
  };
  writeFixture("ramparts", { palettes: Object.fromEntries(Object.keys(SCENES).map((k) => [k, palette(SCENES[k]!)])), shots });
  console.log("ramparts: 6 shots planned");
} finally {
  host.kill();
}
