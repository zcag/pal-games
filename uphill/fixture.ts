// Writes test/shots/uphill.json: the store screenshots' fixture. Each palette
// seeds the page's storage: a best distance some runs in, and a scene
// (surface/main.ts `stage`): the bot drives the road to a moment in an instant
// and the picture holds there, or lets the end card come up. The physics is
// fixed-step and chance is seeded in the page (shots.mjs), so a picture is the
// same every run. `make shots EXT=uphill`.
import { Host } from "../.pal/host/test/harness.ts";
import { pinClock, writeFixture } from "../.pal/app/scripts/fixture-kit.ts";
import manifest from "./pal.json" with { type: "json" };

type Scene = { to: number; style?: "careful" | "careless"; hold?: boolean; end?: boolean };
const SCENES: Record<string, Scene | null> = {
  climb: { to: 602, hold: true },
  gap: { to: 885, hold: true },
  crash: { to: 9999, style: "careless", end: true },
  start: null,
};

pinClock();
const host = await Host.bundled({ only: ["uphill"] });
try {
  const view = await host.request("view", { extension: "uphill", palette: "uphill" });
  const palette = (scene: Scene | null) => ({ title: manifest.title, icon: manifest.icon, view: "view", tree: view, surface: { storage: { best: 1240, look: "forest", ...(scene ? { scene } : {}) }, settings: {} } });
  const shots: Record<string, { palette: string; keys: string[]; caption: string; cover?: number[] }> = {
    "1-climb": { palette: "climb", keys: ["wait:1200"], caption: "A climb with the suspension squatting under it, the hills growing behind" },
    "2-gap": { cover: [300, 240, 960, 470], palette: "gap", keys: ["wait:1200"], caption: "Over the gap: the same keys that drive lean the car in the air, so you land on both wheels" },
    "3-crash": { palette: "crash", keys: ["wait:1500"], caption: "The gas held through the kicker 450 m in: driver down, and how far your best went" },
    "4-start": { palette: "start", keys: ["wait:1000"], caption: "The start: the gas, the brake and the fuel the cans along the road keep topped up" },
  };
  writeFixture("uphill", { palettes: Object.fromEntries(Object.keys(SCENES).map((k) => [k, palette(SCENES[k])])), shots });
  console.log("uphill: 4 shots planned");
} finally {
  host.kill();
}
