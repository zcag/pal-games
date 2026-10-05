// probe: shades alone against a few defences, until every one has died or leaked
import type { TowerId } from "../../game/types.ts";
import { arena, put } from "../../game/battle/testkit.ts";
import { step, command } from "../../game/battle/index.ts";
import { towers } from "../../game/battle/internal.ts";
const sets: TowerId[][] = [["archer", "archer"], ["beacon", "archer"], ["bombard", "bombard"], ["pyre", "pyre"], ["thornwood", "archer"], ["barracks", "archer"], ["storm", "storm"]];
for (const set of sets) {
  let killed = 0, leaked = 0;
  for (const seed of [3, 7, 11]) {
    const b = arena({ seed }); b.lives = 1e9;
    const pads = [...b.map.pads].sort((p, q) => q.score - p.score);
    set.forEach((k, i) => command(b, { t: "build", pad: pads[i]!.id, tower: k }));
    for (const t of towers(b)) { command(b, { t: "upgrade", tower: t.id }); t.building = 0; }
    for (let i = 0; i < 30 * 90; i++) { if (i % 45 === 0 && i < 30 * 20) put(b, "shade", 0); step(b); for (const e of b.events) { if (e.e === "kill" && e.kind === "shade") killed++; if (e.e === "leak" && e.kind === "shade") leaked++; } b.events.length = 0; }
  }
  console.log(`${set.join("+").padEnd(20)} shades killed ${killed}, leaked ${leaked}`);
}
