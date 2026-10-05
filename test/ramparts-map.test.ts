// Map generation constraints (systems 10, R4/R25/R26) over many seeds per act and layout.
import { describe, expect, test } from "bun:test";
import type { Act } from "../ramparts/game/types.ts";
import { checkMap, generateMap, hairpins, PAD, type Layout } from "../ramparts/game/map.ts";

// The suite checks a few seeds per act and layout; `bun ramparts/scripts/sweep.ts` checks 500.
const SEEDS = Number(process.env.MAP_SEEDS ?? (process.env.RAMPARTS_SWEEP === "1" ? 500 : 4));

describe("map constraints", () => {
  for (const act of [1, 2, 3, 4] as Act[]) for (const layout of ["single", "merge", "fork"] as Layout[]) {
    test(`act ${act} ${layout}: ${SEEDS} seeds pass every rule`, () => {
      let fallback = 0;
      for (let s = 0; s < SEEDS; s++) {
        const m = generateMap(s * 2654435761 + act * 97, act, { layout });
        const f = checkMap(m);
        if (f.length) throw new Error(`seed ${s}: ${f.join(", ")}`);
        if ((m as { fallback?: boolean }).fallback) fallback++;
        expect(m.layout).toBe(layout);
        expect(m.lanes.length).toBe(layout === "single" ? 1 : 2);
        expect(m.air.length).toBe(layout === "merge" ? 2 : 1);
      }
      // a rate, so only on a real sample (the sweep)
      if (SEEDS >= 100) expect(fallback / SEEDS).toBeLessThan(0.05);
    }, 120000);
  }
  test("deterministic per seed", () => {
    expect(JSON.stringify(generateMap(1234, 2))).toBe(JSON.stringify(generateMap(1234, 2)));
    expect(JSON.stringify(generateMap(1234, 2))).not.toBe(JSON.stringify(generateMap(1235, 2)));
  });
  test("relic pads, high ground and rubble", () => {
    const m = generateMap(77, 3, { bonusPads: 3, ninth: true, rubble: 60 });
    const bonus = m.pads.filter((p) => p.bonus);
    expect(bonus.length).toBe(3);
    expect(bonus[0]!.score).toBeGreaterThanOrEqual(6);
    expect(m.pads.filter((p) => p.high).length).toBe(2);
    const rubble = m.pads.filter((p) => p.rubble);
    expect(rubble.length).toBe(1);
    expect(rubble[0]!.tier).toBe("prime");
    for (const p of m.pads) for (const q of m.pads) if (p.id < q.id) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(PAD.spacing - 1e-9);
  });
  test("signature bend: 1-2 hairpins on the main road", () => {
    expect(hairpins([0, 10, 20, 21, 11, 1, 2])).toBe(1);
  });
});
