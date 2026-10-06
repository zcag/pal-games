// Writes test/shots/highway.json: the store screenshots' fixture.
// Each palette seeds the page's storage: a save a few hours in, and a scene
// (game/meta.ts `Scene`) that stages the map, the garage, a run already going
// (played forward by the page's own driver, then shown live) or a run's end. Chance is
// seeded in the page (shots.mjs), so a picture is the same every run.
// `make shots EXT=highway`.
import { Host } from "../.pal/host/test/harness.ts";
import { pinClock, writeFixture } from "../.pal/app/scripts/fixture-kit.ts";
import { fresh, type Save, type Scene } from "./game/meta.ts";
import { sprintsOf, starTimes, rivalTime } from "./game/sprint.ts";
import manifest from "./pal.json" with { type: "json" };

/** A save a few hours in: Countryside won (Ines's Tozzo in the garage), High Noon under way, a few paints chosen. */
function lived(): Save {
  const s = fresh();
  s.paint = { "compact-07": "#e8e6e0", "kiri-10": "#2a5caa", "milano-95": "#c81d25", "tozzo-98": "#d8d8d8" };
  s.car = "milano-95";
  s.pick = { city: "kiri-10", sport: "tozzo-98" };
  // every Countryside stop with two or three stars and the duel won; three High Noon stops started
  for (const [i, sp] of sprintsOf(0).entries()) s.sprints[sp.id] = sp.boss ? rivalTime(sp) - 1.4 : starTimes(sp)[i % 3 === 0 ? 2 : 1] - 0.3;
  for (const [i, sp] of sprintsOf(1).slice(0, 3).entries()) s.sprints[sp.id] = starTimes(sp)[i] - 0.2;
  s.stop = sprintsOf(1)[3].id;
  s.seen = ["region:countryside", "region:high-noon", "car:kiri-10", "car:milano-95", "car:tozzo-98"];
  s.best = { endless: { score: 186420, distance: 14820, combo: 23, topSpeed: 181 }, twoway: { score: 98410, distance: 6210, combo: 12, topSpeed: 164 } };
  s.totals = { runs: 61, distance: 412000, misses: 2210 };
  return s;
}

const SCENES: Record<string, Scene> = {
  map: { show: "map", sprint: sprintsOf(1)[3].id },
  run: { show: "run", sprint: sprintsOf(0)[5].id, car: "kiri-10", paint: "#2a5caa", speed: 146, warm: 9 },
  garage: { show: "garage", car: "tozzo-98", paint: "#d8d8d8" },
  night: { show: "run", location: "night", mode: "endless", car: "saba-v12-95", paint: "#e85d04", speed: 236, warm: 8 },
  results: { show: "results", location: "midday", mode: "twoway", car: "tozzo-98", paint: "#d8d8d8", speed: 160, warm: 40, crash: { you: 162, them: 58, kind: "lct-3000-95", oncoming: false } },
};

pinClock();
const host = await Host.bundled();
try {
  const view = await host.request("view", { extension: "highway", palette: "highway" });
  const palette = (scene: Scene) => ({ title: manifest.title, icon: manifest.icon, view: "view", tree: view, surface: { storage: { save: lived(), scene }, settings: {} } });
  writeFixture("highway", {
    palettes: Object.fromEntries(Object.entries(SCENES).map(([k, s]) => [k, palette(s)])),
    shots: {
      "1-map": { palette: "map", keys: ["wait:20000"], caption: "The road trip: High Noon's stops on the map, each with its stars, the next one picked, the duel at the end of the road" },
      "2-run": { cover: [264, 315, 844, 414], palette: "run", keys: ["wait:30000"], caption: "A Sprint in the Countryside: the clock, the road to the line and the time the next star needs, a combo carrying the Kiri past its top speed" },
      "3-garage": { palette: "garage", keys: ["wait:30000"], caption: "The garage: your cars in their bays and the ones still under covers, each with what opens it" },
      "4-night": { palette: "night", keys: ["wait:30000"], caption: "Free Drive at night in the Saba: headlights on the road, tail lamps ahead, brake lights when a driver slows" },
      "5-results": { palette: "results", keys: ["wait:30000"], caption: "The end of a Free Drive run: the points and where they stand on the board" },
    },
  });
  console.log("highway: 5 shots planned");
} finally {
  host.kill();
}
