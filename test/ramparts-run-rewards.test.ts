import { describe, expect, test } from "bun:test";
import { Rng } from "../ramparts/game/rng.ts";
import { newRun, choices, choose, finishBattle, battleFor, reroll, banish } from "../ramparts/game/run/index.ts";
import { buildCards, cardCount, notePity, rollRarity, rollRelics, relicFits } from "../ramparts/game/run/rewards.ts";
import { stubBattle } from "../ramparts/game/run/drive.ts";
import type { Run } from "../ramparts/game/run/state.ts";
import { fullProfile, newProfile } from "../ramparts/game/meta.ts";
import { BOON, BOONS } from "../ramparts/game/content/run/boons.ts";
import { RELIC, RELICS } from "../ramparts/game/content/run/relics.ts";
import { START_TOWERS, TOWER_IDS } from "../ramparts/game/content/run/towers.ts";
import type { Card, CommanderId, RunState } from "../ramparts/game/types.ts";

function start(o: { seed?: number; commander?: CommanderId; first?: boolean; full?: boolean } = {}): Run {
  let r = newRun({ seed: o.seed ?? 1, commander: o.commander ?? "marshal", ascension: 0, profile: o.full ? fullProfile() : newProfile(), firstRun: o.first });
  const opts = choices(r);
  const plain = ["A Full Purse", "Strong Walls", "Supplies", "A Relic"].map((l) => opts.find((c) => c.label === l)).find(Boolean)!;
  r = choose(r, plain.key);
  while (r.screen.s === "pick") r = choose(r, choices(r).find((c) => !c.disabled)!.key);
  return r as Run;
}

/** Into the first F1 battle and win it. */
function firstReward(r: RunState, leaks = 0): RunState {
  r = choose(r, choices(r)[0]!.key);
  return finishBattle(r, stubBattle({ leaks })(battleFor(r)));
}

function scenario(seed: number): Run {
  const g = new Rng(seed);
  const r = start({ seed, full: g.chance(0.7), commander: g.pick(["marshal", "alchemist", "seer", "quartermaster", "warden"]) as CommanderId });
  const pool = r.book.unlocked.towers.filter((t) => !r.loadout.towers.includes(t));
  for (const t of g.shuffle(pool).slice(0, g.int(0, 3))) r.loadout.towers.push(t);
  for (const b of g.shuffle([...BOONS]).slice(0, g.int(0, 12))) {
    const t = b.tower ?? g.pick(r.loadout.towers);
    if (r.loadout.towers.includes(t) && !b.notOn?.includes(t)) { r.loadout.boons.push(b.id); if (!b.tower) (r.loadout.boonOn ??= {})[b.id] = t; }
  }
  for (const x of g.shuffle(RELICS.filter((d) => ["common", "uncommon", "rare", "boss"].includes(d.rarity))).slice(0, g.int(0, 5))) r.loadout.relics.push(x.id);
  if (g.chance(0.3)) r.loadout.relics.push("siege-engine");
  r.book.rewards = 5;
  return r;
}

function checkCard(r: Run, c: Card) {
  const L = r.loadout;
  if (c.kind === "boon") {
    const b = BOON[c.boon]!;
    expect(L.boons).not.toContain(c.boon);
    expect(L.towers).toContain(c.tower!);
    if (b.tower) expect(c.tower).toBe(b.tower);
    else expect(b.notOn ?? []).not.toContain(c.tower!);
    if (b.needs) expect(b.needs.some((t) => L.towers.includes(t))).toBe(true);
    if (c.boon === "veteran") expect(L.relics).not.toContain("siege-engine");
  } else if (c.kind === "blueprint") {
    expect(r.book.unlocked.towers).toContain(c.tower);
    expect(L.towers).not.toContain(c.tower);
  } else if (c.kind === "relic") {
    const d = RELIC[c.relic]!;
    expect(L.relics).not.toContain(c.relic);
    if (d.unlock > 0) expect(r.book.unlocked.relics).toContain(c.relic);
    for (const x of d.excludes ?? []) expect(L.relics).not.toContain(x);
  }
}

describe("reward screens", () => {
  test("R13: run 1's first reward is Frost Spire, Bombard and Glass Bones; Glass Bones promises the Frost Spire next", () => {
    const r = firstReward(start({ first: true }));
    expect(r.screen.s).toBe("reward");
    const cards = (r.screen as Extract<RunState["screen"], { s: "reward" }>).cards;
    expect(cards).toEqual([
      { kind: "blueprint", tower: "frost", rarity: "uncommon" },
      { kind: "blueprint", tower: "bombard", rarity: "common" },
      { kind: "boon", boon: "glass-bones", tower: "frost", rarity: "rare" },
    ]);
    let after = choose(r, "card:2");
    expect(after.loadout.towers).not.toContain("frost");
    expect(after.loadout.boons).toContain("glass-bones");
    after = choose(after, choices(after)[0]!.key);
    after = finishBattle(after, stubBattle()(battleFor(after)));
    expect((after.screen as Extract<RunState["screen"], { s: "reward" }>).cards[1]).toEqual({ kind: "blueprint", tower: "frost", rarity: "uncommon" });
  });

  test("R2: a commander with no air reach is offered an air tower in slot B of the first reward", () => {
    for (let s = 1; s <= 150; s++) {
      for (const commander of ["alchemist"] as CommanderId[]) { // the Warden starts with an Archer since balance.md session 2
        const r = firstReward(start({ seed: s, commander, full: s % 2 === 0 }));
        const cards = (r.screen as Extract<RunState["screen"], { s: "reward" }>).cards;
        expect(cards[1]!.kind).toBe("blueprint");
        expect(["archer", "mage", "frost", "storm"]).toContain((cards[1] as Extract<Card, { kind: "blueprint" }>).tower);
      }
    }
  });

  // smaller samples here; `bun ramparts/scripts/sweep.ts` runs 1500 each
  const FULL = process.env.RAMPARTS_SWEEP === "1";
  const SAMPLE = FULL ? 1500 : 1000;
  test("slot A is a boon for an owned tower; slot B is a blueprint about 80% of the time with 3 towers", () => {
    let bp = 0;
    const N = SAMPLE;
    for (let s = 1; s <= N; s++) {
      const r = start({ seed: s, full: true });
      r.book.rewards = 3;
      const cards = buildCards(r, "battle");
      expect(cards[0]!.kind).toBe("boon");
      expect(r.loadout.towers).toContain((cards[0] as Extract<Card, { kind: "boon" }>).tower!);
      if (cards[1]!.kind === "blueprint") bp++;
    }
    expect(bp / N).toBeGreaterThan(0.75);
    expect(bp / N).toBeLessThan(0.85);
  });

  test("core weighting: a tower with boons is offered more in slot A", () => {
    let frostA = 0;
    for (let s = 1; s <= SAMPLE; s++) {
      const r = start({ seed: s, commander: "seer", full: true });
      r.book.rewards = 3;
      for (const b of ["deep-cold", "long-winter", "frostbite"]) r.loadout.boons.push(b);
      const c = buildCards(r, "battle")[0] as Extract<Card, { kind: "boon" }>;
      if (c.tower === "frost") frostA++;
    }
    // weight 3.25 against 1 + 1 (and 0.35 universal share): well over a third
    expect(frostA / SAMPLE).toBeGreaterThan(0.5);
  });

  const TABLES = FULL ? 1500 : 500;
  test(`no dead offers over ${TABLES} random war tables (keystone needs, R6, Veteran vs Siege Engine, unique boons, locked content)`, () => {
    for (let s = 1; s <= TABLES; s++) {
      const r = scenario(s);
      for (const src of ["battle", "elite", "boss", "ambush"] as const) for (const c of buildCards(r, src)) checkCard(r, c);
      for (const id of rollRelics(r, new Rng(s), 3, { common: 1, uncommon: 1, rare: 1, boss: 1 })) checkCard(r, { kind: "relic", relic: id, rarity: RELIC[id]!.rarity });
    }
  });

  test("locked content is never offered with a fresh profile", () => {
    const locked = new Set(TOWER_IDS.filter((t) => !START_TOWERS.includes(t)));
    for (let s = 1; s <= 400; s++) {
      const r = start({ seed: s });
      r.book.rewards = 3;
      for (const c of [...buildCards(r, "battle"), ...buildCards(r, "elite")]) {
        if (c.kind === "blueprint") expect(locked.has(c.tower)).toBe(false);
        if (c.kind === "relic") expect(RELIC[c.relic]!.unlock).toBe(0);
      }
      for (const id of rollRelics(r, new Rng(s), 3, { common: 1, uncommon: 1, rare: 1, boss: 1 })) expect(RELIC[id]!.unlock).toBe(0);
    }
  });

  test("Black Ice and Cold Iron exclude each other; Siege Engine is not offered with Veteran", () => {
    const r = start({ full: true });
    r.loadout.relics.push("black-ice");
    expect(relicFits(r, "cold-iron")).toBe(false);
    r.loadout.relics = ["cold-iron"];
    expect(relicFits(r, "black-ice")).toBe(false);
    r.loadout.boons.push("veteran"); (r.loadout.boonOn ??= {}).veteran = "archer";
    expect(relicFits(r, "siege-engine")).toBe(false);
  });

  test("tower-tagged relics are not offered at 6 towers without the tower", () => {
    const r = start({ full: true });
    r.loadout.towers = ["archer", "barracks", "mage", "bombard", "pyre", "banner"];
    expect(relicFits(r, "copper-coil")).toBe(false);
    expect(relicFits(r, "war-chest")).toBe(true);
    r.loadout.towers = ["archer", "barracks", "mage"];
    expect(relicFits(r, "copper-coil")).toBe(true);
  });

  test("rarity by source: elites never common, bosses all rare, ambushes hold one uncommon or better", () => {
    for (let s = 1; s <= 400; s++) {
      const r = start({ seed: s, full: true });
      r.book.rewards = 3;
      expect(buildCards(r, "elite").every((c) => c.rarity !== "common")).toBe(true);
      expect(buildCards(r, "boss").every((c) => c.rarity === "rare")).toBe(true);
      expect(buildCards(r, "ambush").some((c) => c.rarity !== "common")).toBe(true);
    }
  });

  test("pity: +1 per common shown, reset on a rare; a big pity makes rares near certain", () => {
    const r = start();
    r.pity = 4;
    notePity(r, [{ kind: "blueprint", tower: "frost", rarity: "uncommon" }, { kind: "boon", boon: "focus", tower: "mage", rarity: "common" }, { kind: "boon", boon: "drilled", tower: "barracks", rarity: "common" }]);
    expect(r.pity).toBe(6);
    notePity(r, [{ kind: "boon", boon: "curse-engine", tower: "mage", rarity: "rare" }]);
    expect(r.pity).toBe(0);
    const g = new Rng(3);
    let rare = 0;
    for (let i = 0; i < 1000; i++) if (rollRarity(g, { common: 62, uncommon: 33, rare: 5 }, 0) === "rare") rare++;
    expect(rare).toBeLessThan(80);
    let rare2 = 0;
    for (let i = 0; i < 1000; i++) if (rollRarity(g, { common: 62, uncommon: 33, rare: 5 }, 300) === "rare") rare2++;
    expect(rare2).toBeGreaterThan(700);
  });

  test("pity rises across reward screens without a rare", () => {
    let r: RunState = start({ seed: 9, full: true });
    r = firstReward(r);
    const shown = (r.screen as Extract<RunState["screen"], { s: "reward" }>).cards;
    const commons = shown.filter((c) => c.rarity === "common").length;
    expect(r.pity).toBe(shown.some((c) => c.rarity === "rare") ? 0 : commons);
  });

  test("card count: 3, Third Eye 4, Hollow Crown +1, never more than 5", () => {
    const r = start({ full: true });
    expect(cardCount(r)).toBe(3);
    r.loadout.relics.push("third-eye");
    expect(cardCount(r)).toBe(4);
    r.loadout.relics.push("hollow-crown");
    expect(cardCount(r)).toBe(5);
    r.book.rewards = 3;
    expect(buildCards(r, "battle").length).toBe(5);
    const seer = start({ commander: "seer", full: true });
    seer.book.rewards = 3;
    expect(buildCards(seer, "battle").length).toBe(4);
  });

  test("skip pays crowns by act; Smuggler's Crate gives a boon instead", () => {
    const r = firstReward(start({ seed: 4, full: true }));
    const before = r.crowns;
    expect(choose(r, "skip").crowns).toBe(before + 10);
    const s = structuredClone(r) as Run;
    s.loadout.relics.push("smugglers-crate");
    const after = choose(s, "skip");
    expect(after.crowns).toBe(before);
    expect(after.loadout.boons.length).toBe(s.loadout.boons.length + 1);
  });

  test("Second Look rerolls once per act; Strike Off banishes a card for the rest of the run", () => {
    let r: RunState = firstReward(start({ seed: 12, full: true }));
    expect(choices(r).some((c) => c.key === "reroll")).toBe(true);
    const r2 = reroll(r);
    expect(choices(r2).some((c) => c.key === "reroll")).toBe(false);
    const card = (r2.screen as Extract<RunState["screen"], { s: "reward" }>).cards[0]!;
    const r3 = banish(r2, 0);
    expect((r3.screen as Extract<RunState["screen"], { s: "reward" }>).cards.length).toBe(2);
    expect(r3.book!.banished.length).toBe(1);
    expect(choices(r3).some((c) => c.key.startsWith("banish:"))).toBe(false);
    // the banished card never shows again
    const run = r3 as Run;
    for (let i = 0; i < 300; i++) for (const c of buildCards(run, "battle")) expect(JSON.stringify(c)).not.toBe(JSON.stringify(card));
  });

  test("taking a 7th tower asks which one to replace; its boons pay 10 crowns each; keeping returns to the reward", () => {
    let r: RunState = firstReward(start({ seed: 21, full: true }));
    const run = r as Run;
    run.loadout.towers = ["archer", "barracks", "mage", "bombard", "frost", "pyre"];
    run.loadout.boons = ["barbed-tips", "taut-strings"];
    const reward = run.screen as Extract<RunState["screen"], { s: "reward" }>;
    reward.cards[0] = { kind: "blueprint", tower: "storm", rarity: "rare" };
    r = choose(run, "card:0");
    expect(r.screen.s).toBe("replace");
    const kept = choose(r, "keep");
    expect(kept.screen.s).toBe("reward");
    const before = r.crowns;
    const done = choose(r, "replace:archer");
    expect(done.loadout.towers).toEqual(["storm", "barracks", "mage", "bombard", "frost", "pyre"]);
    expect(done.loadout.boons).toEqual([]);
    expect(done.crowns).toBe(before + 20);
    expect(done.screen.s).not.toBe("reward");
  });
});
