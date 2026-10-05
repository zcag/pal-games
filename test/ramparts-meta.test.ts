import { describe, expect, test } from "bun:test";
import { newRun, choices, choose } from "../ramparts/game/run/index.ts";
import { drive, firstChoice, stubBattle } from "../ramparts/game/run/drive.ts";
import {
  applyRun, codexRecord, fullProfile, migrate, newProfile, nextUnlock, renownFor, setPerk, type Profile,
} from "../ramparts/game/meta.ts";
import { LEVELS, UNLOCKS } from "../ramparts/game/content/run/unlocks.ts";
import type { BattleArgs, CommanderId, RunState } from "../ramparts/game/types.ts";

const PREFER = ["card:", "relic:", "bless:", "node:", "choice:", "rest", "open", "pick:", "continue", "leave", "skip"];

function play(p: Profile, o: { seed?: number; commander?: CommanderId; ascension?: number; loseAt?: (a: BattleArgs) => boolean; seeded?: boolean } = {}): RunState {
  const r = newRun({ seed: o.seed ?? 1, commander: o.commander ?? "marshal", ascension: o.ascension ?? 0, profile: p, seeded: o.seeded });
  const win = stubBattle({ leaks: 0 });
  return drive(r, {
    choose: firstChoice(PREFER),
    battle: (a) => (o.loseAt?.(a) ? { ...win(a), won: false, livesLeft: 0 } : win(a)),
  });
}

/** A finished run whose renown is exactly `n` (n even): n/2 floors, nothing else. */
function runWorth(p: Profile, n: number, act = 1): RunState {
  const r = structuredClone(newRun({ seed: n, commander: "marshal", ascension: 0, profile: p }));
  r.book!.floors = n / 2; r.act = act as RunState["act"]; r.book!.lostAct1 = 1;
  r.over = { won: false, act: r.act, floor: 3 };
  return r;
}

describe("renown", () => {
  test("line by line, times 1 + 0.1 x ascension, rounded half up", () => {
    const r = structuredClone(newRun({ seed: 1, commander: "warden", ascension: 0, profile: fullProfile() }));
    const b = r.book!;
    Object.assign(b, { floors: 20, elitesWon: 3, bounties: 2, lostAct1: 0, bossesMet: ["gorrak", "wyrm", "colossus", "tyrant"], bossesWon: ["gorrak", "wyrm", "colossus", "tyrant"], codexBosses: [], codexWins: [] });
    r.act = 4; r.over = { won: true, act: 4, floor: 3 };
    const t = renownFor(r);
    expect(t.lines.map((l) => [l.label, l.renown])).toEqual([
      ["Floors cleared", 40], ["Elites defeated", 18], ["Bosses defeated", 45], ["The Ember Tyrant defeated", 30],
      ["Bounties met", 4], ["No lives lost in act I", 5], ["First meeting", 40], ["First win with The Warden", 20],
    ]);
    expect(t.total).toBe(202);
    r.ascension = 5;
    expect(renownFor(r).total).toBe(303);
    r.ascension = 3; b.floors = 21; // 204 x 1.3 = 265.2
    expect(renownFor(r).total).toBe(265);
  });

  test("a first run that dies at the act I boss earns about 30 (run-meta 8)", () => {
    const r = play(newProfile(), { loseAt: (a) => a.kind === "boss" });
    expect(r.over!.act).toBe(1);
    const t = renownFor(r);
    expect(t.total).toBeGreaterThanOrEqual(22);
    expect(t.total).toBeLessThanOrEqual(40);
    expect(t.lines.find((l) => l.label === "First meeting")!.renown).toBe(10);
  });

  test("a win at A0 earns the most, with first meetings and the first win", () => {
    const r = play(newProfile());
    expect(r.over!.won).toBe(true);
    const t = renownFor(r);
    expect(t.lines.find((l) => l.label === "The Ember Tyrant defeated")!.renown).toBe(30);
    expect(t.lines.find((l) => l.label.startsWith("First win"))!.renown).toBe(20);
    expect(t.total).toBeGreaterThan(150);
  });
});

describe("unlock track", () => {
  test("20 levels, 20 items", () => {
    expect(LEVELS.length).toBe(20);
    expect(UNLOCKS.length).toBe(20);
    expect(UNLOCKS[5]!.item).toEqual({ kind: "commander", commander: "warden" });
    expect(UNLOCKS[6]!.item.kind).toBe("events");
  });

  test("pacing: something unlocks on each of the first 6 runs at 30-60 renown a run", () => {
    let p = newProfile();
    for (const n of [30, 40, 50, 50, 60, 60]) {
      const a = applyRun(p, runWorth(p, n));
      expect(a.unlocks.length).toBeGreaterThan(0);
      p = a.profile;
    }
    expect(p.level).toBe(6);
    expect(p.unlocked.commanders).toContain("warden");
    expect(p.unlocked.towers).toContain("thornwood");
  });

  test("pacing: then at least every second run at 120 a run, to level 20", () => {
    let p = newProfile();
    for (const n of [30, 40, 50, 50, 60, 60]) p = applyRun(p, runWorth(p, n)).profile;
    let dry = 0;
    for (let i = 0; i < 40 && p.level < 20; i++) {
      const a = applyRun(p, runWorth(p, 120));
      dry = a.unlocks.length ? 0 : dry + 1;
      expect(dry).toBeLessThan(2);
      p = a.profile;
    }
    expect(p.level).toBe(20);
    expect(p.unlocked.titles).toEqual(["Warden of the Ramparts"]);
    for (const k of ["thick-walls", "second-look", "scout", "strike-off", "nest-egg", "thicker-walls"]) expect(p.perks[k]).toBe(true);
  });

  test("skip-ahead: the Seer brings the Beacon on reaching act III, so level 9 unlocks the next item instead", () => {
    let p = newProfile();
    p = applyRun(p, runWorth(p, 20, 3)).profile;
    expect(p.unlocked.commanders).toContain("seer");
    expect(p.unlocked.towers).toContain("beacon");
    while (p.level < 9) p = applyRun(p, runWorth(p, 100)).profile;
    expect(p.unlocked.relics).toContain("prism-lens"); // level 9 skipped the Beacon
    expect(p.level).toBe(9);
    expect(nextUnlock(p)!.name).toBe("Scout");
  });

  test("the next unlock line counts down truthfully", () => {
    const p = newProfile();
    const a = applyRun(p, runWorth(p, 10));
    expect(nextUnlock(a.profile)).toEqual({ name: "Alchemist", level: 1, need: 15 });
    expect(a.lines).toContain("15 renown to Alchemist.");
  });
});

describe("ascensions per commander (R26, R27)", () => {
  test("a win unlocks the next ascension for that commander only; a rare relic blessing next run", () => {
    let p = fullProfile();
    p.ascension = {}; p.codex.commanders = {};
    const r = play(p);
    const a = applyRun(p, r);
    expect(a.profile.ascension.marshal).toBe(1);
    expect(a.profile.ascension.alchemist ?? 0).toBe(0);
    expect(a.profile.blessingRare.marshal).toBe(true);
    expect(a.lines).toContain("Next: Ascension 1, Hard Roads.");
    p = a.profile;
    const next = newRun({ seed: 2, commander: "marshal", ascension: 1, profile: p });
    expect(next.ascension).toBe(1);
    expect(choices(next).length).toBe(4);
    const b = applyRun(p, play(p, { ascension: 1, seed: 2 }));
    expect(b.profile.ascension.marshal).toBe(2);
    expect(b.profile.blessingRare.marshal).toBe(false); // used, and not a first win any more
  });

  test("seeded runs give renown but no ascension", () => {
    const p = fullProfile(); p.ascension = {};
    const a = applyRun(p, play(p, { seeded: true }));
    expect(a.profile.ascension.marshal ?? 0).toBe(0);
    expect(a.tally.total).toBeGreaterThan(0);
  });
});

describe("profile", () => {
  test("history keeps the last 50, newest first; totals and the codex fill in", () => {
    let p = newProfile();
    const won = play(p);
    for (let i = 0; i < 52; i++) p = applyRun(p, runWorth(p, 2), i).profile;
    p = applyRun(p, won, 999).profile;
    expect(p.history.length).toBe(50);
    expect(p.history[0]!.at).toBe(999);
    expect(p.history[0]!.result).toBe("Victory at the Ember Citadel");
    expect(p.totals.runs).toBe(53);
    expect(p.totals.wins).toBe(1);
    expect(p.totals.streak).toBe(1);
    expect(p.codex.commanders.marshal!.runs).toBe(53);
    expect(p.codex.bosses.tyrant!.defeated).toBe(1);
    expect(Object.keys(p.codex.events).sort()).toEqual([...won.seenEvents].sort());
    for (const b of won.book!.seen.boons) expect(p.codex.boons[b]!.seen).toBeGreaterThan(0);
  });

  test("codexRecord folds battle facts in", () => {
    const p = codexRecord(newProfile(), { met: ["footman", "bat"], killed: { footman: 30 }, leaked: { bat: 2 }, built: { archer: 3 }, specs: [{ tower: "archer", spec: "volley" }], bossTicks: { boss: "gorrak", ticks: 900 } });
    expect(p.codex.enemies.footman).toEqual({ met: 1, killed: 30, leaked: 0, worstLeak: 0 });
    expect(p.codex.enemies.bat!.worstLeak).toBe(2);
    expect(p.codex.towers.archer!.specs).toEqual(["volley"]);
    expect(p.codex.bosses.gorrak!.fastest).toBe(900);
  });

  test("perks can be switched off for a run", () => {
    const p = setPerk(fullProfile(), "nest-egg", false);
    expect(newRun({ seed: 1, commander: "marshal", ascension: 0, profile: p }).crowns).toBe(30);
  });

  test("migrate: round trip, junk, partial and old saves", () => {
    let p = newProfile();
    p = applyRun(p, play(p)).profile;
    p.settings = { volume: 0.4, music: false };
    expect(migrate(JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(migrate(null)).toEqual(newProfile());
    expect(migrate("nope")).toEqual(newProfile());
    const partial = migrate({ renown: 70, unlocked: { towers: ["storm"] }, perks: { "thick-walls": true, bogus: true }, codex: { events: { "the-ford": { seen: 2, choices: ["wade-across"] } } } });
    expect(partial.renown).toBe(70);
    expect(partial.unlocked.towers).toContain("storm");
    expect(partial.unlocked.towers).toContain("archer");
    expect(partial.perks).toEqual({ "thick-walls": true });
    expect(partial.codex.events["the-ford"]!.seen).toBe(2);
    expect(partial.totals.runs).toBe(0);
    const typed = migrate({ renown: "lots", level: 99, history: "x" });
    expect(typed.renown).toBe(0);
    expect(typed.level).toBe(20);
    expect(typed.history).toEqual([]);
  });

  test("a fresh profile starts with the six towers and the Marshal", () => {
    const p = newProfile();
    expect(p.unlocked.towers).toEqual(["archer", "barracks", "mage", "bombard", "frost", "pyre"]);
    expect(p.unlocked.commanders).toEqual(["marshal"]);
    const r = newRun({ seed: 1, commander: "marshal", ascension: 0, profile: p });
    expect(choose(r, "bless:0").screen.s).not.toBe("blessing");
  });
});
