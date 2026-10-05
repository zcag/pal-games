// how much of the air route archers on the pads can reach
import { generateMap, laneAt } from "../../game/map.ts";
for (const act of [1, 2, 3, 4] as const) {
  let frac = 0, ratio = 0, best = 0; const n = 30;
  for (let s = 1; s <= n; s++) {
    const m = generateMap(s * 977, act); const L = m.air[0]!; ratio += L.length / m.lanes[0]!.length;
    const v = { x: 0, y: 0 }; let cov = 0, tot = 0; const perPad = m.pads.map(() => 0);
    for (let d = 0; d <= L.length; d += 0.25) { laneAt(L, d, v); tot++; let any = false; m.pads.forEach((p, i) => { if ((p.x - v.x) ** 2 + (p.y - v.y) ** 2 <= 3.4 * 3.4) { any = true; perPad[i]!++; } }); if (any) cov++; }
    frac += cov / tot; best += Math.max(...perPad) * 0.25;
  }
  console.log(`act ${act}: air route ${(100 * ratio / n).toFixed(0)}% of road length; ${(100 * frac / n).toFixed(0)}% of it within archer reach of some pad; best single pad sees ${(best / n).toFixed(1)} u`);
}
