// Writes test/shots/chip.json: the store screenshots' fixture. The page opens
// on the tee; the pictures are the hole at rest and an aim raised by the
// arrow keys, in the Canyon look, and the same tee at Dusk. `make shots EXT=chip`.
import { Host } from "../.pal/host/test/harness.ts";
import { pinClock, writeFixture } from "../.pal/app/scripts/fixture-kit.ts";
import manifest from "./pal.json" with { type: "json" };

pinClock();
const host = await Host.bundled({ only: ["chip"] });
try {
  const view = await host.request("view", { extension: "chip", palette: "chip" });
  const palette = (look: string) => ({ title: manifest.title, icon: manifest.icon, view: "view", tree: view, surface: { storage: { best: 4, look }, settings: { volume: 0 } } });
  const shots = {
    "1-tee": { palette: "canyon", keys: ["wait:1500"], caption: "The tee in the canyon: the aim, the power meter, and the flag 84 m off over a pond and a cliff", cover: [300, 240, 960, 470] },
    "2-aim": { palette: "canyon", keys: ["up*12", "wait:1000"], caption: "Up and down aim the shot; hold space for power, and the arrows spin the ball in flight" },
    "3-dusk": { palette: "dusk", keys: ["wait:1500"], caption: "L changes the look: the same canyon at dusk, or the alpine morning" },
  };
  writeFixture("chip", { palettes: { canyon: palette("canyon"), dusk: palette("dusk") }, shots });
  console.log("chip: 3 shots planned");
} finally {
  host.kill();
}
