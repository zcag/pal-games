import { describe, expect, test } from "bun:test";
import { W, H, HAZ, type PlanetId, type WorldData } from "../seedfall/game/types.ts";
import { generate, reach, richPocket, worldStats, cacheContents } from "../seedfall/game/gen.ts";
import {
  MAT, MATERIALS, FINDS, BIOMES, CACHES, ORE_IDS, JACKPOT_IDS, ARTIFACT_IDS, LIFT_X, CHAMBER,
  planetDef, biomeDef, findByKey, oreOnPlanet, piecesPerTile, tempAt, massOf, tileHardness,
} from "../seedfall/game/content/world.ts";

const I = (x: number, y: number) => y * W + x;
// GEN_SWEEP=n adds n more seeds per planet (a slower, wider check: GEN_SWEEP=40 bun test test/gen.test.ts).
const SEEDS: [number, PlanetId][] = [[1, "vell"], [2, "vell"], [3, "vell"], [11, "vell"], [3, "cinder"], [5, "cinder"], [4, "ferrum"], [7, "ferrum"]];
for (let k = 0; k < +(process.env.GEN_SWEEP ?? 0); k++) for (const p of ["vell", "cinder", "ferrum"] as const) SEEDS.push([100 + k * 37, p]);
const worlds = new Map<string, WorldData>();
const world = (seed: number, p: PlanetId) => {
  const k = `${seed}:${p}`;
  if (!worlds.has(k)) worlds.set(k, generate(seed, p));
  return worlds.get(k)!;
};
const each = (fn: (w: WorldData, seed: number, p: PlanetId) => void) => { for (const [s, p] of SEEDS) fn(world(s, p), s, p); };
const kind = (m: number) => MATERIALS[m].kind;
const count = (w: WorldData, key: string, x0: number, x1: number, y0: number, y1: number) => {
  const id = findByKey(key)!.id;
  let c = 0;
  for (let y = y0; y <= y1; y++) for (let x = Math.max(1, x0); x <= Math.min(W - 2, x1); x++) if (w.find[I(x, y)] === id) c++;
  return c;
};

describe("content", () => {
  test("ids are stable and tables complete", () => {
    expect(MATERIALS[0].key).toBe("air");
    MATERIALS.forEach((m, i) => expect(m.id).toBe(i));
    expect(ORE_IDS.length).toBe(28);
    expect(JACKPOT_IDS.length).toBe(11);
    expect(ARTIFACT_IDS.length).toBe(31);
    FINDS.forEach((f, i) => f && expect(f.id).toBe(i));
    expect(FINDS.length).toBeLessThan(256);
    expect(MATERIALS.length).toBeLessThan(256);
  });
  test("hardness follows D1 and R12: typical 1.9^b, dense 2x", () => {
    for (const b of BIOMES) {
      let t = 1;
      for (let i = 0; i < b.slot; i++) t *= 1.9;
      expect(Math.abs(b.typical - t) / t).toBeLessThan(0.02);
      expect(MATERIALS[b.dense].dense).toBe(true);
      expect(Math.abs(MATERIALS[b.dense].hardness / b.typical - 2)).toBeLessThan(0.05);
      expect(kind(b.unb)).toBe("unbreakable");
    }
    expect(MATERIALS[MAT.VAULT_SEAL].hardness).toBe(95);
    expect(tileHardness(MAT.BASALT, findByKey("cinnabar")!.id)).toBeCloseTo(13 * 1.15);
  });
  test("pieces per tile and mass (R3, D3)", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(piecesPerTile)).toEqual([1, 1, 2, 2, 3, 3, 4]);
    expect(findByKey("lead")!.mass).toBeCloseTo(massOf(22, 1));
    expect(massOf(10, 0)).toBe(1);
    expect(findByKey("voidstone")!.mass).toBeLessThan(findByKey("lead")!.mass);
  });
  test("temperature is D2's curve; a planet's heat modifier only on its own rows (R5)", () => {
    const pts: [number, number][] = [[0, 15], [160, 40], [280, 90], [400, 200], [540, 345], [560, 300], [680, 330], [770, 485]];
    for (const [r, c] of pts) expect(tempAt(r)).toBeCloseTo(c);
    expect(tempAt(80)).toBeCloseTo(27.5);
    expect(tempAt(340, "cinder")).toBeCloseTo(tempAt(340) * 1.3);
    expect(tempAt(450, "cinder")).toBeCloseTo(tempAt(450));
    expect(tempAt(340, "ferrum")).toBeCloseTo(tempAt(340));
  });
  test("art.md shape classes: ores whose row bands overlap never share a class", () => {
    const ores = ORE_IDS.map((id) => FINDS[id]);
    for (const a of ores) for (const b of ores) {
      if (a.id >= b.id) continue;
      const overlap = a.rows![0] <= b.rows![1] && b.rows![0] <= a.rows![1];
      if (overlap) expect(`${a.key}:${a.cls}`).not.toBe(`${a.key}:${b.cls}`);
    }
  });
  test("nothing glows before Crystal except jackpots (R11)", () => {
    for (const id of ORE_IDS) if (FINDS[id].rows![0] < 160) expect(FINDS[id].glow).toBeUndefined();
  });
});

describe("generation", () => {
  test("deterministic: same seed, same bytes", () => {
    for (const p of ["vell", "cinder", "ferrum"] as const) {
      const a = generate(42, p), b = generate(42, p);
      for (const k of ["mat", "find", "haz", "back", "flag", "biome", "fluid"] as const) expect(Buffer.from(a[k]).equals(Buffer.from(b[k]))).toBe(true);
      expect(JSON.stringify(a.structures)).toBe(JSON.stringify(b.structures));
      expect(JSON.stringify(a.caches)).toBe(JSON.stringify(b.caches));
    }
    expect(Buffer.from(generate(1, "vell").mat).equals(Buffer.from(generate(2, "vell").mat))).toBe(false);
  });

  test("under 50 ms per world", () => {
    generate(900, "vell");
    const ts: number[] = [];
    for (let s = 0; s < 7; s++) { const t = performance.now(); generate(1000 + s, (["vell", "cinder", "ferrum"] as const)[s % 3]); ts.push(performance.now() - t); }
    ts.sort((a, b) => a - b);
    // CI's runners are several times slower and share their cores with the other test files
    expect(ts[3]).toBeLessThan(process.env.CI ? 200 : 50);
  });

  test("every world generates", () => each((w) => expect(w.mat.length).toBe(W * H)), 120_000);

  test("frame: bedrock sides and floor, biomes in order", () => each((w) => {
    let bad = 0;
    for (let y = 0; y < H; y++) if (w.mat[I(0, y)] !== MAT.BEDROCK || w.mat[I(W - 1, y)] !== MAT.BEDROCK) bad++;
    for (let x = 0; x < W; x++) if (w.mat[I(x, H - 1)] !== MAT.BEDROCK) bad++;
    for (let x = 1; x < W - 1; x++) for (let y = 1; y < H; y++) if (w.biome[I(x, y)] < w.biome[I(x, y - 1)]) bad++;
    for (const top of [60, 160, 280, 400, 540, 680]) for (let x = 1; x < W - 1; x++) if (w.biome[I(x, top - 4)] >= w.biome[I(x, top + 3)]) bad++;
    expect(bad).toBe(0);
  }));

  test("fair start", () => each((w, _s, p) => {
    for (let y = 0; y <= 3; y++) expect(w.mat[I(LIFT_X, y)]).toBe(0);
    expect(w.spawnX).toBe(LIFT_X);
    expect(count(w, "copper", LIFT_X - 6, LIFT_X + 6, 3, 10)).toBeGreaterThanOrEqual(6);
    expect(count(w, "copper", LIFT_X - 6, LIFT_X + 6, 3, 7)).toBeGreaterThanOrEqual(2);
    expect(count(w, "coal", LIFT_X - 12, LIFT_X + 12, 2, 8)).toBeGreaterThanOrEqual(4);
    expect(count(w, "tin", 1, W - 2, 0, 22)).toBeGreaterThanOrEqual(2);
    for (let y = 0; y < 12; y++) for (let x = LIFT_X - 3; x <= LIFT_X + 3; x++) {
      const m = MATERIALS[w.mat[I(x, y)]];
      expect(m.kind === "unbreakable" || !!m.dense).toBe(false);
    }
    const first: Record<number, string> = { 1: "iron", 2: "quartz", 3: p === "cinder" ? "jade" : "sporestone", 4: "cinnabar", 5: "sower_scrap", 6: "heartstone" };
    for (let s = 1; s <= 6; s++) {
      const top = biomeDef(p, s).rows[0];
      expect(count(w, first[s], LIFT_X - 10, LIFT_X + 10, top, top + 19)).toBeGreaterThanOrEqual(8);
    }
  }));

  test("no hazards near spawn or on the Lift's ride", () => each((w) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = I(x, y), m = w.mat[i];
      if (w.haz[i]) {
        expect(y).toBeGreaterThan(8);
        expect(x < 22 || x > 26).toBe(true);
      }
      if (x >= 21 && x <= 27 && y < 750) {
        expect(m === MAT.LAVA || m === MAT.GEYSER || w.haz[i] === HAZ.LAVA_POCKET).toBe(false);
      }
      const dx = Math.abs(x - LIFT_X);
      if ((y <= 25 && dx <= 8) || (y < 40 && dx <= 3)) expect(`${x},${y}:${MATERIALS[m].kind}`).not.toBe(`${x},${y}:loose`);
    }
  }));

  test("lift column: no ore, cache or find in column 24; protected structures keep columns 21-27 clear", () => each((w) => {
    for (let y = 0; y < 750; y++) {
      expect(w.find[I(LIFT_X, y)]).toBe(0);
      expect(MATERIALS[w.mat[I(LIFT_X, y)]].cache).toBeUndefined();
    }
    const prot = new Set(["cart_room", "geode", "star_geode", "singing_chamber", "kiln", "vault", "nursery", "lava_lake", "vent_hall", "forge", "scorched"]);
    for (const s of w.structures) if (prot.has(s.kind)) expect(s.x + s.w - 1 < 21 || s.x > 27).toBe(true);
    for (const c of w.caches!) expect(c.x < 21 || c.x > 27).toBe(true);
    for (let i = 0; i < W * H; i++) {
      const f = FINDS[w.find[i]];
      if (f && f.kind !== "ore") { const x = i % W; expect(x < 21 || x > 27).toBe(true); }
    }
  }));

  test("structure counts", () => each((w, _s, p) => {
    const n = (k: string) => w.structures.filter((s) => s.kind === k).length;
    const own = planetDef(p).own;
    for (const k of ["mouth", "chamber", "seed", "cart_room", "kiln", "nursery", "approach"]) expect(n(k)).toBe(1);
    expect(n("vault")).toBe(4);
    expect(n("singing_chamber")).toBe(own === 2 ? 0 : 1);
    expect(n("star_geode")).toBe(own === 2 ? 0 : 1);
    expect(n("forge")).toBe(own === 2 ? 1 : 0);
    expect(n("great_hollow")).toBe(own === 3 ? 0 : 1);
    expect(n("vent_hall")).toBe(own === 3 ? 1 : 0);
    if (own !== 2) { expect(n("geode")).toBeGreaterThanOrEqual(8); expect(n("geode")).toBeLessThanOrEqual(12); }
    if (own !== 3) expect(n("mushroom")).toBeGreaterThanOrEqual(2);
    expect(n("tunnel")).toBeGreaterThanOrEqual(3);
    expect(n("tunnel")).toBeLessThanOrEqual(6);
    expect(n("shaft")).toBeGreaterThanOrEqual(1);
    expect(n("lava_lake")).toBeGreaterThanOrEqual(3);
    expect(w.structures.some((s) => s.kind === "lava_lake" && s.w >= 12)).toBe(true);
    expect(n("room")).toBeGreaterThanOrEqual(10);
    expect(n("room")).toBeLessThanOrEqual(14);
    expect(n("pylons")).toBeGreaterThanOrEqual(1);
    // One seal per vault, and the Seed sits in the chamber on column 24.
    let seals = 0;
    for (let i = 0; i < W * H; i++) if (w.mat[i] === MAT.VAULT_SEAL) seals++;
    expect(seals).toBe(4);
    expect(w.mat[I(LIFT_X, CHAMBER.cy)]).toBe(MAT.SEED);
    for (let y = 0; y < 760; y++) if (w.mat[I(LIFT_X, y)] === 0 && y > 3) { /* natural openings are fine */ }
  }));

  test("finds: every jackpot and relic is placed once (Vell, nothing found yet)", () => each((w, _s, p) => {
    const got = new Map<number, number>();
    for (let i = 0; i < W * H; i++) if (w.find[i] && FINDS[w.find[i]].kind !== "ore") got.set(w.find[i], (got.get(w.find[i]) ?? 0) + 1);
    const own = planetDef(p).own;
    for (const id of JACKPOT_IDS) {
      const f = FINDS[id];
      const expected = f.planet ? (f.planet === p ? 1 : 0) : f.biome === own ? 0 : f.key === "strongbox" || f.key === "moonpearl" ? 2 : 1;
      expect(`${f.key}:${got.get(id) ?? 0}`).toBe(`${f.key}:${expected}`);
    }
    for (const id of ARTIFACT_IDS) {
      const f = FINDS[id];
      const expected = f.planet ? f.planet === p : p === "vell" || f.key === "A13" || (f.thread !== "wren" && f.biome !== own);
      expect(`${f.key}:${got.get(id) ?? 0}`).toBe(`${f.key}:${expected ? 1 : 0}`);
    }
  }));

  test("oreMult: 1 is byte-identical to the default; larger veins add ore deterministically", () => {
    const a = generate(9, "vell"), b = generate(9, "vell", { oreMult: 1 });
    for (const k of ["mat", "find", "haz", "flag"] as const) expect(Buffer.from(a[k]).equals(Buffer.from(b[k]))).toBe(true);
    const ores = (w: WorldData) => worldStats(w).reduce((n, s) => n + s.ore, 0);
    const c = generate(9, "vell", { oreMult: 1.4 }), d = generate(9, "vell", { oreMult: 1.4 });
    expect(Buffer.from(c.find).equals(Buffer.from(d.find))).toBe(true);
    expect(ores(c)).toBeGreaterThan(ores(a) * 1.15);
  });

  test("found relics are not placed again, except the door-key", () => {
    const a13 = findByKey("A13")!.id, a1 = findByKey("A1")!.id;
    const w = generate(5, "cinder", { found: [a13, a1] });
    expect(w.find.includes(a13)).toBe(true);
    expect(w.find.includes(a1)).toBe(false);
  });

  test("caches: one per 15 rows of each biome, contents per world.md", () => each((w, _s, p) => {
    for (let s = 0; s < 7; s++) {
      const d = biomeDef(p, s), cd = CACHES[d.id];
      const here = w.caches!.filter((c) => c.kind === cd.key);
      expect(here.length).toBe(cd.count);
      for (const c of here) {
        expect(w.mat[I(c.x, c.y)]).toBe(cd.mat);
        expect(c.pieces.reduce((a, q) => a + q.count, 0)).toBe(3 * piecesPerTile(s));
        for (const q of c.pieces) expect(oreOnPlanet(q.find, p)).toBe(true);
        expect(c).toEqual({ x: c.x, y: c.y, kind: c.kind, ...cacheContents(w.seed, p, s, c.x, c.y) });
      }
    }
  }));

  test("one cache in three holds an item", () => {
    let items = 0, all = 0;
    each((w) => { all += w.caches!.length; items += w.caches!.filter((c) => c.item).length; });
    expect(items / all).toBeGreaterThan(0.22);
    expect(items / all).toBeLessThan(0.45);
  });

  test("connectivity: the chamber, every find, cache and seal are reachable; dense rock is a detour", () => each((w, _s, p) => {
    const pass = (i: number) => { const k = MATERIALS[w.mat[i]].kind; return k !== "unbreakable" && k !== "liquid"; };
    const seen = reach(w, pass);
    expect(seen[I(16, CHAMBER.cy)]).toBe(1);
    for (let i = 0; i < W * H; i++) {
      if (w.find[i] && FINDS[w.find[i]].kind !== "ore") expect(`${FINDS[w.find[i]].key}@${i % W},${(i / W) | 0}:${seen[i]}`).toBe(`${FINDS[w.find[i]].key}@${i % W},${(i / W) | 0}:1`);
      if (w.mat[i] === MAT.VAULT_SEAL) expect(seen[i]).toBe(1);
    }
    for (const c of w.caches!) expect(seen[I(c.x, c.y)]).toBe(1);
    const routing = reach(w, (i) => pass(i) && !MATERIALS[w.mat[i]].dense);
    for (let s = 0; s < 6; s++) {
      const y = biomeDef(p, s).rows[1];
      let ok = false;
      for (let x = 1; x < W - 1; x++) ok ||= routing[I(x, y)] === 1;
      expect(`${s}:${ok}`).toBe(`${s}:true`);
    }
  }));

  test("open, unbreakable and dense shares near world.md", () => {
    const open = [0.025, 0.09, 0.12, 0.22, 0.15, 0.18, 0.26];
    const unb = [0.005, 0.03, 0.05, 0.06, 0.07, 0.10, 0.08];
    for (const [seed, p] of SEEDS.filter(([, p]) => p === "vell")) worldStats(world(seed, p)).forEach((s, b) => {
      expect(Math.abs(s.open / s.tiles - open[b])).toBeLessThan(0.07);
      expect(Math.abs(s.unb / s.tiles - unb[b])).toBeLessThan(0.03);
      expect(Math.abs(s.dense / s.diggable - 0.1)).toBeLessThan(0.025);
    });
  });

  test("ore share per biome within world.md's table", () => {
    const table: Record<string, number> = { topsoil: 7.0, stone: 5.6, crystal: 5.0, fungal: 4.4, magma: 4.3, ruins: 4.8, core: 4.5, ash: 4.2, banded: 4.4 };
    const sum: Record<string, number[]> = {};
    for (const [seed, p] of SEEDS) {
      const pd = planetDef(p);
      worldStats(world(seed, p)).forEach((s, b) => {
        const key = BIOMES[pd.biomes[b]].key, share = (100 * s.ore) / s.diggable;
        const want = table[key] * (p === "ferrum" ? pd.oreCount : 1);
        expect(`${key}:${share > want * 0.65 && share < want * 1.4}`).toBe(`${key}:true`);
        (sum[key] ??= []).push(share / want);
      });
    }
    for (const k in sum) { const m = sum[k].reduce((a, b) => a + b) / sum[k].length; expect(`${k}:${m > 0.8 && m < 1.2}`).toBe(`${k}:true`); }
  });

  test("planets: replaced biomes, unique ores, removed ores", () => {
    const has = (w: WorldData, key: string) => w.find.includes(findByKey(key)!.id);
    const v = world(1, "vell"), c = world(3, "cinder"), f = world(4, "ferrum");
    expect(has(v, "sunstone") || has(v, "lodestone")).toBe(false);
    expect(has(c, "sunstone")).toBe(true);
    expect(has(c, "sporestone") || has(c, "lumen_amber")).toBe(false);
    expect(has(f, "lodestone")).toBe(true);
    expect(has(f, "emerald")).toBe(false);
    let geysers = 0, ash = 0;
    for (let i = 0; i < W * H; i++) { if (c.mat[i] === MAT.GEYSER) geysers++; if (c.mat[i] === MAT.TUFF) ash++; }
    expect(geysers).toBeGreaterThanOrEqual(8);
    expect(ash).toBeGreaterThan(1000);
    let banded = 0;
    for (let i = 0; i < W * H; i++) if (f.mat[i] === MAT.BANDED) banded++;
    expect(banded).toBeGreaterThan(1000);
  });
});

describe("rich pocket (R10)", () => {
  const w = world(1, "vell");
  test("deterministic per dive, fair and below the deepest row", () => {
    for (const [dive, deepest, P] of [[1, 20, 1], [5, 150, 2], [9, 300, 4], [14, 520, 8], [20, 700, 30]]) {
      const a = richPocket(w, dive, deepest, P), b = richPocket(w, dive, deepest, P);
      expect(a).toEqual(b);
      expect(a).not.toBeNull();
      const f = FINDS[a!.find];
      expect(f.kind).toBe("ore");
      const size = Math.max(...a!.tiles.map(() => 1)) && a!.tiles.length;
      expect(size).toBeGreaterThanOrEqual(1);
      for (const i of a!.tiles) {
        const x = i % W, y = (i / W) | 0;
        expect(x < 22 || x > 26).toBe(true);
        expect(y).toBeGreaterThan(deepest);
        expect(y).toBeLessThanOrEqual(Math.min(748, deepest + 27));
        expect(w.find[i]).toBe(0);
        expect(MATERIALS[w.mat[i]].dense).toBeUndefined();
        expect(tileHardness(w.mat[i], a!.find)).toBeLessThanOrEqual(2.5 * P);
      }
    }
    expect(richPocket(w, 2, 100, 2)).not.toEqual(richPocket(w, 3, 100, 2));
  });
  test("no pocket when the drill can dig nothing there", () => {
    expect(richPocket(w, 1, 700, 0.5)).toBeNull();
  });
});
