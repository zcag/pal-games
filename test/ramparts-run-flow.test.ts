import { describe, expect, test } from "bun:test";
import {
  newRun, choices, choose, battleFor, finishBattle, moveTo, summary, reachable, restHeal,
} from "../ramparts/game/run/index.ts";
import { drive, firstChoice, stubBattle } from "../ramparts/game/run/drive.ts";
import { rollUnknown } from "../ramparts/game/run/unknown.ts";
import type { Run } from "../ramparts/game/run/state.ts";
import { fullProfile, newProfile } from "../ramparts/game/meta.ts";
import { RELIC } from "../ramparts/game/content/run/relics.ts";
import { BOON } from "../ramparts/game/content/run/boons.ts";
import type { BattleResult, CommanderId, RunScreen, RunState } from "../ramparts/game/types.ts";

type Reward = Extract<RunScreen, { s: "reward" }>;
const PREFER = ["card:", "relic:", "bless:", "node:", "choice:", "rest", "open", "pick:", "continue", "leave", "skip"];

function begin(o: { seed?: number; commander?: CommanderId; ascension?: number; full?: boolean; first?: boolean } = {}): Run {
  let r = newRun({ seed: o.seed ?? 1, commander: o.commander ?? "marshal", ascension: o.ascension ?? 0, profile: o.full === false ? newProfile() : fullProfile(), firstRun: o.first });
  r = choose(r, choices(r).find((c) => ["A Full Purse", "Strong Walls", "Supplies", "A Relic"].includes(c.label))!.key);
  while (r.screen.s === "pick") r = choose(r, choices(r).find((c) => !c.disabled)!.key);
  return r as Run;
}

const res = (r: RunState, o: Partial<BattleResult> & { lost?: number } = {}): BattleResult => {
  const base = stubBattle({ leaks: o.lost ?? 0, gold: o.goldLeft ?? 0 })(battleFor(r));
  return { ...base, ...o, livesLeft: o.livesLeft ?? r.loadout.lives - (o.lost ?? 0) };
};

/** Put the run on a battle at a node of this kind and finish it. */
function fightAt(r: Run, kind: "battle" | "elite" | "bounty" | "boss", o: Partial<BattleResult> & { lost?: number } = {}): RunState {
  const n = r.map.nodes.find((x) => x.kind === kind)!;
  r.at = n.id; r.floor = n.floor; n.visited = true;
  r.history.push({ act: r.act, node: n.id, kind: n.kind, leaked: 0 });
  r.screen = { s: "battle", node: n.id, kind };
  return finishBattle(r, res(r, o));
}

describe("a whole run", () => {
  test("deterministic: the same seed and the same choices replay exactly", () => {
    const go = () => drive(begin({ seed: 77 }), { choose: firstChoice(PREFER), battle: stubBattle({ leaks: 1 }) });
    expect(JSON.stringify(go())).toBe(JSON.stringify(go()));
    const other = drive(begin({ seed: 78 }), { choose: firstChoice(PREFER), battle: stubBattle({ leaks: 1 }) });
    expect(JSON.stringify(other.history)).not.toBe(JSON.stringify(go().history));
  });

  test("a scripted run that wins: 4 acts, ends at the Tyrant, summary says so", () => {
    for (const commander of ["marshal", "alchemist", "seer", "quartermaster", "warden"] as CommanderId[]) {
      const acts = new Set<number>();
      const r = drive(begin({ seed: 5, commander }), { choose: firstChoice(PREFER), battle: stubBattle({ leaks: 1 }), onStep: (x) => acts.add(x.act) });
      expect(r.over?.won).toBe(true);
      expect([...acts].sort()).toEqual([1, 2, 3, 4]);
      expect(r.book!.bossesWon.length).toBe(4);
      expect(r.book!.bossesWon[3]).toBe("tyrant");
      const s = summary(r);
      expect(s.result).toBe("Victory at the Ember Citadel");
      expect(s.path.length).toBe(4);
      expect(s.damage[0]!.share).toBeGreaterThan(0);
      expect(r.stats.battles).toBeGreaterThanOrEqual(10);
    }
  });

  test("a scripted run that dies: leaks bleed the run out and the summary names where", () => {
    const r = drive(begin({ seed: 6 }), { choose: firstChoice(["card:", "relic:", "bless:", "node:", "choice:", "fortify", "open", "pick:", "continue", "leave", "skip"]), battle: stubBattle({ leaks: 6 }) });
    expect(r.over?.won).toBe(false);
    expect(r.loadout.lives).toBe(0);
    expect(summary(r).result).toMatch(/^Fell to .+, act I+V?, floor \d$/);
  });

  test("dying to a boss: the summary's almost line uses the battle's numbers", () => {
    const r = begin({ seed: 3 });
    const a = fightAt(r, "boss", { won: false, livesLeft: 0, bossHpLeft: 0.14 });
    expect(a.over!.boss).toBe(r.map.boss);
    const s = summary(a);
    expect(s.result.startsWith("Fell to ")).toBe(true);
    expect(s.almost[0]).toMatch(/had 14% health left\.$/);
  });

  test("the run starts on the blessing (R23): 3 options from 6, plus the rare relic after a first win (R27)", () => {
    const p = fullProfile();
    const r = newRun({ seed: 2, commander: "marshal", ascension: 0, profile: p });
    expect(r.screen.s).toBe("blessing");
    expect(choices(r).length).toBe(3);
    const q = newRun({ seed: 2, commander: "marshal", ascension: 0, profile: { ...p, blessingRare: { marshal: true } } });
    expect(choices(q).length).toBe(4);
    let a = choose(q, "bless:3");
    expect(a.screen.s).toBe("pick");
    a = choose(a, "pick:0");
    expect(a.loadout.relics.filter((x) => RELIC[x]!.rarity === "rare").length).toBe(1);
  });

  test("run 1's blessings are fixed: Lucky Horseshoe, Strong Walls, A Full Purse", () => {
    const r = newRun({ seed: 9, commander: "marshal", ascension: 0, profile: newProfile(), firstRun: true });
    expect(choices(r).map((c) => c.label)).toEqual(["A Relic", "Strong Walls", "A Full Purse"]);
    expect(choose(r, "bless:0").loadout.relics).toContain("lucky-horseshoe");
  });

  test("blessings do what they say", () => {
    for (let s = 1; s <= 40; s++) {
      const r = newRun({ seed: s, commander: "marshal", ascension: 0, profile: fullProfile() });
      const opts = (r.screen as Extract<RunScreen, { s: "blessing" }>).options;
      opts.forEach((o, i) => {
        let a = choose(r, `bless:${i}`);
        while (a.screen.s === "pick") a = choose(a, choices(a).find((c) => !c.disabled)!.key);
        const id = o.split(":")[0];
        if (id === "lives") { expect(a.loadout.maxLives).toBe(r.loadout.maxLives + 8); expect(a.loadout.lives).toBe(r.loadout.lives + 8); }
        if (id === "crowns") expect(a.crowns).toBe(r.crowns + 60);
        if (id === "relic") expect(a.loadout.relics.length).toBe(r.loadout.relics.length + 1);
        if (id === "blueprint") expect(a.loadout.towers.length).toBe(4);
        if (id === "supplies") expect(a.loadout.supplies.filter(Boolean).length).toBe(2);
        if (id === "swap") { expect(a.loadout.towers.length).toBe(2); expect(a.loadout.boons.map((b) => BOON[b]!.rarity)).toEqual(["rare"]); }
      });
    }
  });

  test("start: lives, crowns, relic, perks and ascension rules", () => {
    const fresh = newRun({ seed: 1, commander: "marshal", ascension: 0, profile: newProfile() });
    expect([fresh.loadout.lives, fresh.loadout.maxLives, fresh.crowns]).toEqual([20, 20, 30]);
    expect(fresh.loadout.relics).toEqual(["old-standard"]);
    expect(fresh.loadout.towers).toEqual(["archer", "barracks", "mage"]);
    const p = fullProfile();
    const warden = newRun({ seed: 1, commander: "warden", ascension: 0, profile: p });
    expect([warden.loadout.lives, warden.loadout.maxLives, warden.crowns]).toEqual([30, 30, 55]); // 26 + Thick and Thicker Walls; 30 + Nest Egg
    const a8 = newRun({ seed: 1, commander: "warden", ascension: 8, profile: p });
    expect([a8.loadout.lives, a8.loadout.maxLives]).toEqual([26, 30]);
    expect(a8.loadout.curses).toEqual(["doubt"]);
    const seer = newRun({ seed: 1, commander: "seer", ascension: 0, profile: p });
    expect(seer.loadout.towers).toEqual(["mage", "frost", "archer"]);
    expect(seer.map.nodes.filter((n) => n.kind === "battle").every((n) => n.info?.roles?.length)).toBe(true);
    // ascension is capped by what the commander has unlocked (R26)
    expect(newRun({ seed: 1, commander: "marshal", ascension: 5, profile: newProfile() }).ascension).toBe(0);
    expect(newRun({ seed: 1, commander: "marshal", ascension: 5, profile: { ...newProfile(), ascension: { marshal: 3 } } }).ascension).toBe(3);
  });

  test("battleFor: the first battle of run 1 is the tutorial battle; args carry theme, bounty, elite, boss", () => {
    let r: RunState = begin({ first: true, full: false });
    r = moveTo(r, reachable(r)[0]!);
    const a = battleFor(r);
    expect(a.loadout.firstBattle).toBe(true);
    expect(a.act).toBe(1);
    expect(a.floor).toBe(1);
    expect(a.archetypes!.length).toBe(2);
    const later = begin({ seed: 4 });
    const e = later.map.nodes.find((n) => n.kind === "elite")!;
    later.at = e.id; later.screen = { s: "battle", node: e.id, kind: "elite" };
    expect(battleFor(later).elite!.kind).toBe(e.info!.elite!);
    expect(battleFor(later).loadout.firstBattle).toBeUndefined();
    const b = later.map.nodes.find((n) => n.kind === "boss")!;
    later.at = b.id; later.screen = { s: "battle", node: b.id, kind: "boss" };
    expect(battleFor(later).boss).toBe(later.map.boss);
  });
});

describe("after a battle", () => {
  test("crowns: battle 12 + 5 clean + leftover at 10 gold per crown in act I (R17)", () => {
    const r = begin();
    const a = fightAt(r, "battle", { goldLeft: 95 });
    const sc = a.screen as Reward;
    expect(sc.tally!.map((t) => [t.label, t.crowns])).toEqual([["Battle", 12], ["No lives lost", 5], ["Leftover gold", 9]]);
    expect(a.crowns).toBe(r.crowns + 26);
  });

  test("leftover gold by act: 10 / 14 / 18 / 22 per crown, max 12; the Ledger 5 per crown, max 20", () => {
    for (const [act, rate] of [[1, 10], [2, 14], [3, 18]] as const) {
      const r = begin({ seed: 2 });
      r.act = act; r.map = r.book.maps[act - 1]!;
      const a = fightAt(r, "battle", { goldLeft: rate * 5 + rate - 1, lost: 1 });
      expect((a.screen as Reward).tally!.find((t) => t.label === "Leftover gold")!.crowns).toBe(5);
      const b = fightAt(begin({ seed: 2 }), "battle", { goldLeft: 5000 });
      expect((b.screen as Reward).tally!.find((t) => t.label === "Leftover gold")!.crowns).toBe(12);
    }
    const q = begin({ commander: "quartermaster" });
    const a = fightAt(q, "battle", { goldLeft: 5000 });
    const t = (a.screen as Reward).tally!;
    expect(t.find((x) => x.label === "Leftover gold")!.crowns).toBe(20);
    expect(t.find((x) => x.label === "Supply Lines")!.crowns).toBe(3);
    const q2 = begin({ commander: "quartermaster" });
    expect((fightAt(q2, "battle", { goldLeft: 0, treasury: 30 }).screen as Reward).tally!.find((x) => x.label === "Treasury")!.crowns).toBe(30);
  });

  test("elite: double crowns, a relic pick of 2 when every elite died (R5), a war supply, then a card without commons", () => {
    const r = begin({ seed: 8 });
    let a = fightAt(r, "elite");
    let sc = a.screen as Reward;
    expect(sc.relics!.length).toBe(2);
    expect(sc.tally!.find((t) => t.label === "Elite")!.crowns).toBe(24);
    expect(a.loadout.supplies.filter(Boolean).length).toBe(Math.min(2, r.loadout.supplies.filter(Boolean).length + 1));
    a = choose(a, "relic:0");
    sc = a.screen as Reward;
    expect(sc.cards.every((c) => c.rarity !== "common")).toBe(true);
    const missed = fightAt(begin({ seed: 8 }), "elite", { elitesKilled: false });
    expect((missed.screen as Reward).relics ?? []).toEqual([]);
  });

  test("bounty met: a second reward", () => {
    const r = begin({ seed: 9 });
    const a = fightAt(r, "bounty", { bountyOk: true });
    expect(a.book!.after.some((x) => x.s === "reward")).toBe(true);
    expect(a.book!.bounties).toBe(1);
    const b = fightAt(begin({ seed: 9 }), "bounty", { bountyOk: false });
    expect(b.book!.after.some((x) => x.s === "reward")).toBe(false);
  });

  test("boss: crowns, half of missing lives back (rounded up), a boss relic pick of 3, three rare cards, then the next act", () => {
    const r = begin({ seed: 10 });
    r.loadout.lives = 11; r.loadout.maxLives = 20; r.loadout.relics = [];
    let a = fightAt(r, "boss");
    expect(a.loadout.lives).toBe(11 + 5); // missing 9 -> 4.5 -> 5
    let sc = a.screen as Reward;
    expect(sc.relics!.length).toBe(3);
    expect(sc.relics!.every((x) => RELIC[x]!.rarity === "boss")).toBe(true);
    expect(a.book!.revealedNext).toBe(true);
    a = choose(a, "relic:0");
    sc = a.screen as Reward;
    expect(sc.cards.length).toBe(3);
    expect(sc.cards.every((c) => c.rarity === "rare")).toBe(true);
    expect((fightAt(begin({ seed: 10 }), "boss").screen as Reward).tally!.find((t) => t.label === "Boss")!.crowns).toBe(40);
    a = choose(a, "skip");
    expect(a.act).toBe(2);
    expect(a.at).toBe(-1);
    expect(a.screen.s).toBe("map");
  });

  test("act III boss gives a rare relic pick; A5 heals a third", () => {
    const r = begin({ seed: 11, ascension: 5 });
    r.act = 3; r.map = r.book.maps[2]!;
    r.loadout.lives = 8; r.loadout.maxLives = 20; r.loadout.relics = [];
    const a = fightAt(r, "boss");
    expect(a.loadout.lives).toBe(8 + 4); // 12 / 3
    expect((a.screen as Reward).relics!.every((x) => RELIC[x]!.rarity === "rare")).toBe(true);
  });

  test("Debt takes 10 after each battle; Coin Purse +6 when clean; Old Standard heals 1 at 0-1 lost; Trophy +3", () => {
    const r = begin();
    r.loadout.curses.push("debt"); r.loadout.relics.push("coin-purse");
    r.loadout.boons.push("trophy"); (r.loadout.boonOn ??= {}).trophy = "archer";
    r.loadout.lives = 15;
    const a = fightAt(r, "battle", { goldLeft: 0, lost: 1 });
    const t = Object.fromEntries((a.screen as Reward).tally!.map((x) => [x.label, x.crowns ?? x.lives]));
    expect(t).toEqual({ Battle: 12, Trophy: 3, Debt: -10, "Old Standard": 1 });
    expect(a.loadout.lives).toBe(15);
  });

  test("Refugees' walk: the next battle gives crowns but no card", () => {
    const r = begin(); r.book.walk = true;
    const a = fightAt(r, "battle");
    expect((a.screen as Reward).cards).toEqual([]);
    expect(a.book!.walk).toBe(false);
  });

  test("ghost layout and supplies come back from the battle", () => {
    const r = begin();
    const ghost = [{ tower: "archer" as const, level: 2, spec: null, tier: "prime" as const, rank: 0 }];
    const a = fightAt(r, "battle", { ghost, supplies: ["bell", null] });
    expect(a.loadout.ghost).toEqual(ghost);
    expect(a.loadout.supplies).toEqual(["bell", null]);
  });

  test("Phoenix Feather used in battle crumbles", () => {
    const r = begin(); r.loadout.relics.push("phoenix-feather");
    expect(fightAt(r, "battle", { phoenixUsed: true }).loadout.relics).not.toContain("phoenix-feather");
  });
});

describe("nodes", () => {
  test("camp: Rest heals 35% of max (rounded up), Field Rations +4, A5 25%; Sun Disc forbids Rest", () => {
    const r = begin();
    r.loadout.maxLives = 20; r.loadout.lives = 5;
    expect(restHeal(r)).toBe(7);
    r.loadout.relics.push("field-rations");
    expect(restHeal(r)).toBe(11);
    const a5 = begin({ ascension: 5 }); a5.loadout.maxLives = 22;
    expect(restHeal(a5)).toBe(6);
    const n = r.map.nodes.find((x) => x.kind === "rest")!;
    r.screen = { s: "rest", options: ["rest", "drill", "fortify"] };
    r.at = n.id;
    expect(choose(r, "rest").loadout.lives).toBe(16);
    expect(choose(r, "fortify").loadout.maxLives).toBe(22);
    r.loadout.relics.push("sun-disc");
    expect(choices(r).find((c) => c.key === "rest")!.disabled).toBeTruthy();
    expect(choices(r).find((c) => c.key === "drill")!.disabled).toBe("No boons to temper");
  });

  test("camp options: Dig with the Spade, Pray with the Candle, Scout with the perk", () => {
    const r = begin();
    r.loadout.relics.push("wayfarers-spade", "votive-candle");
    r.loadout.curses.push("rust");
    const n = r.map.nodes.find((x) => x.kind === "rest")!;
    r.at = r.map.nodes.find((x) => x.next.includes(n.id))!.id;
    const a = moveTo(r, n.id);
    expect((a.screen as Extract<RunScreen, { s: "rest" }>).options).toEqual(["rest", "drill", "fortify", "dig", "pray", "scout"]);
    expect(choose(a, "dig").loadout.relics.length).toBe(r.loadout.relics.length + 1);
    expect(choose(a, "pray").loadout.curses).toEqual([]);
    expect(choose(a, "scout").book!.revealedNext).toBe(true);
  });

  test("forge: Hone, Temper (two; Bellows three; Widow's Hammer adds one), Recast (needs 4, pays 10 per boon)", () => {
    const r = begin();
    r.screen = { s: "forge" };
    let a = choose(r, "hone");
    expect(a.screen.s).toBe("pick");
    a = choose(a, "pick:0");
    expect((a.screen as Extract<RunScreen, { s: "pick" }>).options.length).toBe(3);
    a = choose(a, "pick:0");
    expect(a.loadout.boons.length).toBe(1);
    expect(choices(r).find((c) => c.key === "recast")!.disabled).toBe("Needs 4 tower cards");

    r.loadout.boons = ["barbed-tips", "drilled", "focus", "taut-strings"];
    let t = choose(r, "temper"); t = choose(t, "pick:0"); t = choose(t, "pick:0");
    expect(t.loadout.tempered.length).toBe(2);
    expect(t.screen.s).toBe("map");
    r.loadout.relics.push("widows-hammer");
    t = choose(r, "temper"); t = choose(t, "pick:0"); t = choose(t, "pick:0");
    expect(t.loadout.tempered.length).toBe(4);

    const q = begin(); q.screen = { s: "forge" };
    q.loadout.towers.push("frost"); q.loadout.boons = ["barbed-tips", "taut-strings"];
    const before = q.crowns;
    let c = choose(q, "recast"); c = choose(c, "pick:0");
    expect(c.screen.s).toBe("pick");
    const into = (c.screen as Extract<RunScreen, { s: "pick" }>).options[0]!.tower!;
    c = choose(c, "pick:0");
    expect(c.loadout.towers[0]).toBe(into);
    expect(c.loadout.boons).toEqual([]);
    expect(c.crowns).toBe(before + 20);
  });

  test("treasure: a relic, 15-25 crowns and a supply", () => {
    for (let s = 1; s <= 30; s++) {
      const r = begin({ seed: s });
      const n = r.map.nodes.find((x) => x.kind === "treasure")!;
      r.at = r.map.nodes.find((x) => x.next.includes(n.id))!.id;
      const a = moveTo(r, n.id);
      const t = a.screen as Extract<RunScreen, { s: "treasure" }>;
      expect(t.crowns).toBeGreaterThanOrEqual(15); expect(t.crowns).toBeLessThanOrEqual(25);
      const b = choose(a, "open");
      expect(b.loadout.relics).toContain(t.relic);
      expect(b.crowns).toBe(r.crowns + t.crowns);
    }
  });

  test("? nodes: 75% events; pity raises the others; Merchant's Bell triples shops", () => {
    const counts = { event: 0, battle: 0, shop: 0, treasure: 0 } as Record<string, number>;
    const r = begin();
    for (let i = 0; i < 4000; i++) { r.book.unknown = { battle: 0, shop: 0, treasure: 0 }; counts[rollUnknown(r)]!++; }
    expect(counts.event! / 4000).toBeGreaterThan(0.71);
    expect(counts.event! / 4000).toBeLessThan(0.79);
    r.book.unknown = { battle: 0, shop: 0, treasure: 0 };
    rollUnknown(r);
    const u = r.book.unknown;
    expect(u.battle === 0 || u.battle === 10).toBe(true);
    r.loadout.relics.push("merchants-bell");
    let shops = 0;
    for (let i = 0; i < 4000; i++) { r.book.unknown = { battle: 0, shop: 0, treasure: 0 }; if (rollUnknown(r) === "shop") shops++; }
    expect(shops / 4000).toBeGreaterThan(counts.shop! / 4000 * 2.2);
  });

  test("Pilgrim's Map shows every ? before you choose it", () => {
    const r = begin();
    let a: RunState = r;
    (a as Run).loadout.relics = [];
    const reward = { s: "reward", cards: [], relics: ["pilgrims-map"], crowns: 0, skip: 0 } as Reward;
    (a as Run).screen = reward;
    a = choose(a, "relic:0");
    expect(a.map.nodes.filter((n) => n.kind === "event").every((n) => n.info?.revealed)).toBe(true);
  });

  test("the Last Camp is a shop, then a camp choice; A10 makes it a champion battle", () => {
    const r = begin({ seed: 3 });
    r.act = 4; r.map = r.book.maps[3]!; r.at = 0;
    let a = moveTo(r, 2);
    expect(a.screen.s).toBe("shop");
    expect((a.screen as Extract<RunScreen, { s: "shop" }>).camp).toBe(true);
    a = choose(a, "leave");
    expect(a.screen.s).toBe("rest");
    const h = begin({ seed: 3, ascension: 10 });
    h.act = 4; h.map = h.book.maps[3]!; h.at = 0;
    const b = moveTo(h, 2);
    expect(b.screen).toEqual({ s: "battle", node: 2, kind: "boss" });
    const args = battleFor(b);
    expect(args.champion).toBe(true);
    // the champion is a boss this run did not meet (content.md 5.9)
    expect(h.book.maps.slice(0, 3).map((m) => m.boss)).not.toContain(args.boss);
    const won = finishBattle(b, res(b));
    expect(won.over).toBeUndefined();
    let w: RunState = won;
    while (w.screen.s !== "map") w = choose(w, choices(w).find((c) => !c.disabled && (c.key === "skip" || c.key.startsWith("relic:") || c.key.startsWith("pick:")))!.key);
    expect(w.act).toBe(4);
    expect(reachable(w)).toEqual([3]);
  });

  test("moving: only the next floor's linked nodes, or the Avalanche's leap", () => {
    const r = begin();
    expect(reachable(r).map((id) => r.map.nodes[id]!.floor)).toEqual([1, 1, 1]);
    expect(() => moveTo(r, r.map.nodes.find((n) => n.floor === 3)!.id)).toThrow();
  });

  test("curse lifts at shops cost 60, +20 each time in the run", () => {
    const r = begin();
    r.loadout.curses.push("rust", "debt"); r.crowns = 500;
    const sh = r.map.nodes.find((n) => n.kind === "shop")!;
    r.at = r.map.nodes.find((x) => x.next.includes(sh.id))?.id ?? -1;
    let a = r.at >= 0 ? moveTo(r, sh.id) : r;
    if (a.screen.s !== "shop") return;
    expect(choices(a).find((c) => c.key === "lift")!.price).toBe(60);
    a = choose(a, "lift"); a = choose(a, "pick:0");
    expect(a.book!.lifts).toBe(1);
  });
});
