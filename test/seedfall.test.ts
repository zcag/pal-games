// Seedfall in pal: the manifest's accounts side (what syncs and how, the board) and the page's fold of a merged save,
// which must agree with the server's merge. The game's own rules are tested in seedfall-*.test.ts.
import { describe, expect, test } from "bun:test";
import { Game } from "../seedfall/game/game.ts";
import { Bot, SKILLS, play } from "../seedfall/game/bot.ts";
import { SYNC, STATE, absorb, fold } from "../seedfall/game/sync.ts";
import type { SaveData } from "../seedfall/game/save.ts";
import { ACTIONS } from "../seedfall/index.ts";
import { declared, manifestOf, merge, problems, storedKeys } from "./game-accounts.ts";

const m = manifestOf("seedfall");
const NOW = Date.UTC(2026, 8, 16, 11, 32);

/** A game the bot played for `minutes` from a save, as a machine would store it. */
function played(from: SaveData, minutes: number, seed: number, at: number): SaveData {
  const g = Game.load(structuredClone(from), at);
  play(g, new Bot(g, SKILLS.good, seed), minutes * 60);
  return g.save(at + minutes * 60_000);
}

describe("accounts", () => {
  test("every stored key has a rule, the screenshots' scene stays on this machine, and pal.json's rules are the game's", () => {
    expect(problems(m)).toEqual([]);
    expect(Object.keys(m.sync).sort()).toEqual(storedKeys("seedfall"));
    expect(m.sync.scene).toBe("local");
    expect(m.sync as unknown).toEqual(JSON.parse(JSON.stringify(SYNC)));
  });

  test("the board is the fastest run to the Core, lower is better, in seconds", () => {
    expect(declared(m, "core")).toMatchObject({ order: "asc", format: "time" });
  });

  test("the panel's actions and keys are listed in the manifest", () => {
    const keys = m.palettes!.seedfall.keys!.map((k) => k.keys);
    for (const a of ACTIONS) expect(keys, a.id).toContain(a.shortcut as string);
  });

  test("two machines that both played since they synced: the later one's world and run, everything kept for good from both", () => {
    const g = Game.create(11, { now: NOW, tz: 0 });
    play(g, new Bot(g, SKILLS.good, 11), 3 * 60);
    const synced = g.save(NOW);
    const a = played(synced, 2, 1, NOW + 60_000);
    const b = played(synced, 2, 2, NOW + 120_000);
    // the machine that played first pushes, then the later one: the server merges each onto what it holds
    const held = merge(m.sync.save, a, synced, synced) as SaveData;
    const merged = merge(m.sync.save, b, held, synced) as SaveData;
    const s = merged.state;
    // the world, the pod and the run are b's, whole
    expect(merged.diff).toEqual(b.diff);
    expect(merged.live).toEqual(b.live);
    expect([s.cash, s.pod, s.levels, s.rigs]).toEqual([b.state.cash, b.state.pod, b.state.levels, b.state.rigs]);
    // what either machine earned for good is kept
    for (const id of [...a.state.achievements, ...b.state.achievements]) expect(s.achievements).toContain(id);
    for (const id of [...a.state.research, ...b.state.research]) expect(s.research).toContain(id);
    for (const k of new Set([...Object.keys(a.state.log.finds), ...Object.keys(b.state.log.finds)])) {
      const n = (x: SaveData) => (x.state.log.finds as Record<string, { n: number }>)[k]?.n ?? 0;
      expect((s.log.finds as Record<string, { n: number }>)[k].n).toBe(Math.max(n(a), n(b)));
    }
    expect(s.shards).toBe(Math.max(a.state.shards, b.state.shards));
    expect(s.everReached).toBe(Math.max(a.state.everReached, b.state.everReached));
    expect(s.records.richestHaul).toBe(Math.max(a.state.records.richestHaul, b.state.records.richestHaul));
    // and it is a save that loads and plays on
    const back = Game.load(merged, b.state.lastNow);
    play(back, new Bot(back, SKILLS.good, 3), 20);
    expect(back.s.time).toBeGreaterThan(b.state.time);
  });

  test("a merged save folded into a running game agrees with the server's merge, and leaves the world and run alone", () => {
    const g = Game.create(5, { now: NOW, tz: 0 });
    play(g, new Bot(g, SKILLS.good, 5), 3 * 60);
    const synced = g.save(NOW);
    const a = played(synced, 1, 7, NOW + 60_000), b = played(synced, 2, 8, NOW + 60_000);
    b.state.perks = { contacts: 2, lens: 1 };
    a.state.perks = { contacts: 1, headstart: 1 };
    b.state.shards = 40;
    const mine = Game.load(structuredClone(a), a.state.lastNow);
    const before = { cash: mine.s.cash, pod: structuredClone(mine.s.pod), levels: { ...mine.s.levels } };
    absorb(mine.s, b.state);
    const want = merge(m.sync.save, a, b) as SaveData;
    for (const k of Object.keys((STATE as { fields: object }).fields)) expect((mine.s as unknown as Record<string, unknown>)[k], k).toEqual((want.state as unknown as Record<string, unknown>)[k]);
    expect(mine.s.perks).toEqual({ contacts: 2, headstart: 1, lens: 1 });
    expect(mine.s.shards).toBe(40);
    expect({ cash: mine.s.cash, pod: mine.s.pod, levels: mine.s.levels }).toEqual(before);
    expect(fold(STATE, a.state, b.state)).toEqual(merge((m.sync.save as { fields: Record<string, never> }).fields.state, a.state, b.state));
  });
});
