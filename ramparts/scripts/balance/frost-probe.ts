// probe: how often a frost spire freezes footmen in a stream (lane 0, best pad)
import { arena, put } from "../../game/battle/testkit.ts";
import { step, command } from "../../game/battle/index.ts";
import { towers } from "../../game/battle/internal.ts";
import { geo } from "../../game/bot/model.ts";
for (const lv of [1, 3, 4]) for (const seed of [3, 7]) {
  const b = arena({ seed }); b.lives = 1e9;
  const g = geo(b); const lane0 = g.ground.filter((s) => s.lane === 0);
  const p1 = [...b.map.pads].sort((p, q) => lane0.filter((s) => (s.x - q.x) ** 2 + (s.y - q.y) ** 2 <= 9).length - lane0.filter((s) => (s.x - p.x) ** 2 + (s.y - p.y) ** 2 <= 9).length)[0]!;
  command(b, { t: "build", pad: p1.id, tower: "frost" }); const t = towers(b)[0]!; while (t.level < Math.min(3, lv)) command(b, { t: "upgrade", tower: t.id }); if (lv === 4) command(b, { t: "specialise", tower: t.id, spec: "shatter" }); t.building = 0; if (process.env.MODE) t.mode = process.env.MODE as never;
  let fr = 0, sh = 0, sw = 0, last = 0;
  for (let i = 0; i < 1800; i++) { if (i % 24 === 0) { const e = put(b, "footman", 0); e.hp = e.maxHp = 1e6; } step(b); for (const ev of b.events) { if (ev.e === "freeze") fr++; if (ev.e === "shoot") { sh++; if (ev.target !== last) sw++; last = ev.target; } } b.events.length = 0; }
  console.log(`L${lv} seed ${seed}: ${fr} freezes, ${sh} shots, ${sw} target switches in 60 s`);
}
