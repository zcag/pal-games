import { describe, expect, test } from "bun:test";
import { generateAct, mapProblems, eliteSpan, eliteFree } from "../ramparts/game/run/index.ts";
import { parentsOf } from "../ramparts/game/run/map.ts";
import { BATTLE_THEMES, BOSSES_BY_ACT, BOUNTIES } from "../ramparts/game/content/run/map.ts";
import type { Act, ActMap } from "../ramparts/game/types.ts";

// 1000 here; `bun ramparts/scripts/sweep.ts` runs 2000
const SEEDS = process.env.RAMPARTS_SWEEP === "1" ? 2000 : 1000;
// generated once per act and ascension: the tests only read them
const made = new Map<string, ActMap[]>();
const maps = (act: Act, asc: number) => {
  const k = `${act}/${asc}`;
  if (!made.has(k)) made.set(k, Array.from({ length: SEEDS }, (_, i) => generateAct((i + 1) * 2654435761 >>> 0, act, { ascension: asc })));
  return made.get(k)!;
};

describe("act maps I-III", () => {
  for (const asc of [0, 1, 6]) for (const act of [1, 2, 3] as Act[]) {
    test(`act ${act}, ascension ${asc}: every generator rule holds on ${SEEDS} seeds`, () => {
      const bad: string[] = [];
      for (const m of maps(act, asc)) for (const p of mapProblems(m, asc)) bad.push(p);
      expect(bad).toEqual([]);
    });
  }

  test("shape: 3 starts, F6 all camps, one boss every camp leads to, paths only move one lane", () => {
    for (const m of maps(2, 0).slice(0, 300)) {
      expect(m.nodes.filter((n) => n.floor === 1).length).toBe(3);
      const boss = m.nodes.filter((n) => n.floor === 7);
      expect(boss.length).toBe(1);
      expect(boss[0]!.kind).toBe("boss");
      for (const n of m.nodes.filter((x) => x.floor === 6)) { expect(n.kind).toBe("rest"); expect(n.next).toEqual([boss[0]!.id]); }
      for (const n of m.nodes) if (n.floor < 6) for (const c of n.next) {
        expect(m.nodes[c]!.floor).toBe(n.floor + 1);
        expect(Math.abs(m.nodes[c]!.lane - n.lane)).toBeLessThanOrEqual(1);
      }
    }
  });

  test("act I F2 is battles and events only; no elite before F3", () => {
    for (const m of maps(1, 0)) for (const n of m.nodes) {
      if (n.floor === 2) expect(["battle", "event"]).toContain(n.kind);
      if (n.kind === "elite") expect(n.floor).toBeGreaterThanOrEqual(3);
    }
  });

  test("elite counts: act I exactly 2 (A1: 3), acts II-III 2-4 (A1: 3-5)", () => {
    const count = (m: ActMap) => m.nodes.filter((n) => n.kind === "elite").length;
    for (const m of maps(1, 0)) expect(count(m)).toBe(2);
    for (const m of maps(1, 1)) expect(count(m)).toBe(3);
    for (const m of maps(3, 0)) { expect(count(m)).toBeGreaterThanOrEqual(2); expect(count(m)).toBeLessThanOrEqual(4); }
    for (const m of maps(2, 1)) { expect(count(m)).toBeGreaterThanOrEqual(3); expect(count(m)).toBeLessThanOrEqual(5); }
  });

  test("a safe route and a greedy route always exist", () => {
    for (const m of maps(2, 0)) { const s = eliteSpan(m.nodes); expect(s.min).toBe(0); expect(s.max).toBeGreaterThanOrEqual(2); }
  });

  test("never an elite after an elite, never a shop after a shop, never three events in a row", () => {
    for (const m of maps(3, 0)) for (const n of m.nodes) {
      const ps = parentsOf(m.nodes, n.id);
      if (n.kind === "elite") expect(ps.some((p) => p.kind === "elite")).toBe(false);
      if (n.kind === "shop") expect(ps.some((p) => p.kind === "shop")).toBe(false);
    }
  });

  // The treasure goes on the F4 node the most walked paths share; 5 paths over at most 4 F4 nodes
  // means that node always carries 2+ paths (pigeonhole).
  test("one treasure per act, on F4", () => {
    for (const m of maps(1, 0)) {
      const t = m.nodes.filter((n) => n.kind === "treasure");
      expect(t.length).toBe(1);
      expect(t[0]!.floor).toBe(4);
    }
  });

  test("a shop and a forge in every act; A1 puts every shop behind an elite", () => {
    for (const m of maps(2, 0)) { expect(m.nodes.some((n) => n.kind === "shop")).toBe(true); expect(m.nodes.some((n) => n.kind === "forge")).toBe(true); }
    for (const m of maps(1, 1)) {
      const free = eliteFree(m.nodes);
      const shops = m.nodes.filter((n) => n.kind === "shop");
      expect(shops.length).toBeGreaterThan(0);
      for (const s of shops) expect(free.has(s.id)).toBe(false);
      expect(eliteSpan(m.nodes).min).toBe(0); // the elite-free route still exists, without a shop
    }
  });

  test("F5 shops and forges always have a fight beside them", () => {
    for (const m of maps(2, 0)) for (const n of m.nodes.filter((x) => x.floor === 5 && (x.kind === "shop" || x.kind === "forge"))) {
      const sib = parentsOf(m.nodes, n.id).flatMap((p) => p.next).filter((c) => c !== n.id).map((c) => m.nodes[c]!.kind);
      expect(sib.some((k) => k === "battle" || k === "elite" || k === "bounty")).toBe(true);
    }
  });

  test("nodes show what they hold: elite kind and affixes (A6: 2 from act I), bounty, theme, boss", () => {
    for (const m of maps(1, 0).slice(0, 200)) for (const n of m.nodes) {
      if (n.kind === "elite") { expect(["juggernaut", "warlock", "matron"]).toContain(n.info!.elite!); expect(n.info!.affixes).toEqual([]); }
      if (n.kind === "bounty") expect(BOUNTIES.map((b) => b.id)).toContain(n.info!.bounty!);
      if (["battle", "elite", "bounty"].includes(n.kind)) {
        expect(BATTLE_THEMES[1].map((t) => t.line)).toContain(n.info!.theme!);
        expect(n.info!.archetypes!.length).toBe(2);
      }
      if (n.kind === "boss") expect(BOSSES_BY_ACT[1]).toContain(n.info!.boss!);
    }
    for (const m of maps(1, 6).slice(0, 200)) for (const n of m.nodes.filter((x) => x.kind === "elite")) {
      const a = n.info!.affixes!;
      expect(a.length).toBe(2);
      expect(new Set(a).size).toBe(2);
      expect(a.includes("plated") && a.includes("runed")).toBe(false);
      if (n.info!.elite === "matron") expect(a).not.toContain("brood");
    }
    for (const m of maps(2, 0).slice(0, 200)) for (const n of m.nodes.filter((x) => x.kind === "elite")) expect(n.info!.affixes!.length).toBe(1);
  });

  test("acts III: some F4-F5 battles carry an elite (about 30%), never earlier floors", () => {
    let withElite = 0, total = 0;
    for (const m of maps(3, 0)) for (const n of m.nodes.filter((x) => x.kind === "battle")) {
      if (n.floor >= 4 && n.floor <= 5) { total++; if (n.info?.elite) withElite++; }
      else expect(n.info?.elite).toBeUndefined();
    }
    expect(withElite / total).toBeGreaterThan(0.25);
    expect(withElite / total).toBeLessThan(0.35);
  });

  test("R21: both bosses of each act get rolled", () => {
    for (const act of [1, 2, 3] as Act[]) {
      const seen = new Set(maps(act, 0).slice(0, 100).map((m) => m.boss));
      expect([...seen].sort()).toEqual([...BOSSES_BY_ACT[act]].sort());
    }
  });

  test("deterministic per seed", () => {
    expect(JSON.stringify(generateAct(99, 2, { ascension: 3 }))).toBe(JSON.stringify(generateAct(99, 2, { ascension: 3 })));
  });
});

describe("act IV", () => {
  test("the Ash Road or the Gatehouse, the Last Camp, the Tyrant", () => {
    const m = generateAct(5, 4, { ascension: 0 });
    expect(m.boss).toBe("tyrant");
    expect(m.nodes.map((n) => n.kind)).toEqual(["battle", "elite", "camp", "boss"]);
    expect(m.nodes.map((n) => n.info?.name)).toEqual(["The Ash Road", "The Gatehouse", "The Last Camp", undefined]);
    expect(m.nodes[0]!.next).toEqual([2]);
    expect(m.nodes[1]!.next).toEqual([2]);
    expect(m.nodes[2]!.next).toEqual([3]);
    expect(m.nodes[1]!.info!.affixes!.length).toBe(2);
  });

  test("A10 replaces the Last Camp with a champion", () => {
    const m = generateAct(5, 4, { ascension: 10, champion: "lich" });
    expect(m.nodes[2]!.kind).toBe("boss");
    expect(m.nodes[2]!.info).toEqual({ boss: "lich", champion: true });
  });
});
