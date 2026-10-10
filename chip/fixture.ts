// Writes test/shots/chip.json: the store screenshots' fixture. The page opens
// on the tee; the pictures are the hole at rest and an aim raised by the
// arrow keys. `make shots EXT=chip`.
import { Host } from "../.pal/host/test/harness.ts";
import { pinClock, writeFixture } from "../.pal/app/scripts/fixture-kit.ts";
import manifest from "./pal.json" with { type: "json" };

pinClock();
const host = await Host.bundled({ only: ["chip"] });
try {
  const view = await host.request("view", { extension: "chip", palette: "chip" });
  const palette = { title: manifest.title, icon: manifest.icon, view: "view", tree: view, surface: { storage: { best: 4 }, settings: { volume: 0 } } };
  const shots = {
    "1-tee": { palette: "tee", keys: ["wait:1200"], caption: "The tee: the aim, the power meter, and the flag 84 m off over a pond and a cliff", cover: [300, 240, 960, 470] },
    "2-aim": { palette: "tee", keys: ["up*12", "wait:800"], caption: "Up and down aim the shot; hold space for power, and the arrows spin the ball in flight" },
  };
  writeFixture("chip", { palettes: { tee: palette }, shots });
  console.log("chip: 2 shots planned");
} finally {
  host.kill();
}
