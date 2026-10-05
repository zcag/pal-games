// Ramparts' side of accounts: every storage key has a sync rule, the rules follow the content
// (game/sync.ts, written into pal.json by scripts/sync-rules.ts), two machines' profiles merge
// without losing either's runs, and the one board is declared.
import { describe, expect, test } from "bun:test";
import { newRun } from "../ramparts/game/run/index.ts";
import { applyRun, codexRecord, migrate, newProfile, type Profile } from "../ramparts/game/meta.ts";
import { syncRules } from "../ramparts/game/sync.ts";
import { MAX_ASCENSION } from "../ramparts/game/content/run/ascensions.ts";
import type { RunState } from "../ramparts/game/types.ts";
import { declared, manifestOf, merge, problems, storedKeys } from "./game-accounts.ts";

const m = manifestOf("ramparts");
const rule = m.sync.profile as { fields: Record<string, unknown> };

/** A finished (lost) run worth `floors` x 2 renown that saw the Archer win kills. */
function runWorth(p: Profile, floors: number, seed: number): RunState {
  const r = structuredClone(newRun({ seed, commander: "marshal", ascension: 0, profile: p }));
  r.book!.floors = floors; r.book!.lostAct1 = 1;
  r.over = { won: false, act: 1, floor: 3 };
  return r;
}

describe("accounts", () => {
  test("every stored key has a rule, the rules are game/sync.ts's, and every profile field has one", () => {
    expect(problems(m)).toEqual([]);
    expect(Object.keys(m.sync).sort()).toEqual(storedKeys("ramparts"));
    expect(m.sync).toEqual(syncRules());
    expect([m.sync.run, m.sync.scene]).toEqual(["latest", "local"]);
    expect(Object.keys(rule.fields).sort()).toEqual(Object.keys(newProfile()).sort());
  });

  test("the board is the highest ascension won", () => {
    expect(declared(m, "ascension")).toMatchObject({ order: "desc", format: "points", min: 0, max: MAX_ASCENSION });
  });

  test("two machines that played from the same synced profile keep both: renown and codex add up, history and unlocks are a union", () => {
    const base = migrate(applyRun(newProfile(), runWorth(newProfile(), 5, 1), 1000).profile);
    const play = (seed: number, floors: number, at: number, kills: number) => {
      const p = codexRecord(base, { met: ["footman"], killed: { footman: kills }, towerKills: { archer: kills } });
      return applyRun(p, runWorth(p, floors, seed), at).profile;
    };
    const a = play(2, 10, 2000, 30), b = play(3, 15, 3000, 50);
    const synced = merge(m.sync.profile, a, base, base);
    const merged = migrate(merge(m.sync.profile, b, synced, base));
    expect(merged.renown).toBe(base.renown + (a.renown - base.renown) + (b.renown - base.renown));
    expect(merged.totals.runs).toBe(3);
    expect(merged.codex.enemies.footman!.killed).toBe(80);
    expect(merged.codex.towers.archer!.kills).toBe(80);
    expect(merged.codex.commanders.marshal!.runs).toBe(3);
    expect(merged.history.map((h) => h.at)).toEqual([3000, 2000, 1000]);
    expect(merged.unlocked.towers).toEqual(expect.arrayContaining(base.unlocked.towers));
  });
});
