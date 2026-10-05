import { describe, expect, test } from "bun:test";
import { newRun, choices, choose, battleFor } from "../ramparts/game/run/index.ts";
import { startEvent } from "../ramparts/game/run/events.ts";
import type { Run } from "../ramparts/game/run/state.ts";
import { fullProfile, newProfile } from "../ramparts/game/meta.ts";
import { EVENTS, EVENT } from "../ramparts/game/content/run/events.ts";
import { BOON } from "../ramparts/game/content/run/boons.ts";
import { RELIC } from "../ramparts/game/content/run/relics.ts";
import type { Act, CommanderId, RunState, TowerId } from "../ramparts/game/types.ts";

interface Setup { act?: Act; seed?: number; commander?: CommanderId; crowns?: number; lives?: number; towers?: TowerId[]; boons?: string[]; curses?: string[]; relics?: string[]; fresh?: boolean; floor?: number }

function at(o: Setup = {}): Run {
  let r = newRun({ seed: o.seed ?? 1, commander: o.commander ?? "marshal", ascension: 0, profile: o.fresh ? newProfile() : fullProfile() });
  r = choose(r, choices(r).find((c) => ["A Full Purse", "Strong Walls", "Supplies", "A Relic"].includes(c.label))!.key);
  const x = r as Run;
  const act = o.act ?? 1;
  x.act = act; x.map = x.book.maps[act - 1]!;
  const node = x.map.nodes.find((n) => n.floor === (o.floor ?? 3))!;
  x.at = node.id; x.floor = node.floor;
  x.crowns = o.crowns ?? 300;
  x.loadout.maxLives = 20; x.loadout.lives = o.lives ?? 10;
  if (o.towers) x.loadout.towers = [...o.towers];
  x.loadout.boons = [...(o.boons ?? [])];
  x.loadout.tempered = [];
  x.loadout.curses = [...(o.curses ?? [])];
  x.loadout.relics = [...(o.relics ?? [])];
  x.loadout.supplies = [null, null];
  return x;
}

/** Resolve one choice, then take the first option of every pick that follows. */
function play(id: string, choice: string, o: Setup = {}): { b: Run; a: RunState; seen: string[] } {
  const b = at(o);
  b.screen = startEvent(b, id);
  let a: RunState = choose(b, `choice:${choice}`);
  const seen: string[] = [a.screen.s];
  for (let i = 0; i < 12 && (a.screen.s === "pick" || (a.screen.s === "event" && a.screen.done)); i++) {
    a = choose(a, a.screen.s === "pick" ? choices(a).find((c) => !c.disabled)!.key : "continue");
    seen.push(a.screen.s);
  }
  return { b, a, seen };
}

const d = (b: RunState, a: RunState) => ({
  crowns: a.crowns - b.crowns,
  lives: a.loadout.lives - b.loadout.lives,
  max: a.loadout.maxLives - b.loadout.maxLives,
  towers: a.loadout.towers.length - b.loadout.towers.length,
  boons: a.loadout.boons.length - b.loadout.boons.length,
  tempered: a.loadout.tempered.length - b.loadout.tempered.length,
  relics: a.loadout.relics.filter((x) => !b.loadout.relics.includes(x)),
  lostRelics: b.loadout.relics.filter((x) => !a.loadout.relics.includes(x)),
  curses: a.loadout.curses.filter((x) => !b.loadout.curses.includes(x)),
  lifted: b.loadout.curses.filter((x) => !a.loadout.curses.includes(x)),
  supplies: a.loadout.supplies.filter(Boolean).length - b.loadout.supplies.filter(Boolean).length,
});
type Delta = ReturnType<typeof d>;
const NONE: Delta = { crowns: 0, lives: 0, max: 0, towers: 0, boons: 0, tempered: 0, relics: [], lostRelics: [], curses: [], lifted: [], supplies: 0 };
const only = (x: Partial<Delta>): Delta => ({ ...NONE, ...x });
const newBoons = (b: RunState, a: RunState) => a.loadout.boons.filter((x) => !b.loadout.boons.includes(x));

describe("events", () => {
  test("30 events: 12 any act, 6 per act I-III; two locked, from act II", () => {
    expect(EVENTS.length).toBe(30);
    expect(EVENTS.filter((e) => e.acts.length === 0).length).toBe(10);
    expect(EVENTS.filter((e) => e.locked).map((e) => e.id).sort()).toEqual(["the-ruined-chapel", "the-wandering-merchant"]);
    for (const a of [1, 2, 3] as Act[]) expect(EVENTS.filter((e) => e.acts.length === 1 && e.acts[0] === a).length).toBe(6);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(30);
  });

  test("every choice of every event resolves without error and records its codex entry", () => {
    for (const e of EVENTS) {
      const r = at({ act: e.acts[0] ?? 2, boons: ["barbed-tips", "drilled", "focus"], curses: ["rust"], towers: ["archer", "barracks", "mage", "frost"] });
      r.screen = startEvent(r, e.id);
      for (const c of choices(r)) {
        if (c.disabled) continue;
        const a = choose(r, c.key);
        expect(a.book!.choices).toContain(`${e.id}/${c.key.slice(7)}`);
      }
    }
  });

  test("The Crossroads Shrine", () => {
    let p = play("the-crossroads-shrine", "pray");
    expect(d(p.b, p.a)).toEqual(only({ lives: -3, boons: 1 }));
    expect(BOON[newBoons(p.b, p.a)[0]!]!.rarity).toBe("rare");
    p = play("the-crossroads-shrine", "leave-a-coin", { curses: ["debt"] });
    expect(d(p.b, p.a)).toEqual(only({ crowns: -25, lifted: ["debt"] }));
    p = play("the-crossroads-shrine", "leave-a-coin");
    expect(d(p.b, p.a)).toEqual(only({ crowns: -25, lives: 5 }));
    p = play("the-crossroads-shrine", "take-a-candle");
    expect(d(p.b, p.a)).toEqual(only({ relics: ["votive-candle"], curses: ["toll"] }));
    const poor = at({ crowns: 10 }); poor.screen = startEvent(poor, "the-crossroads-shrine");
    expect(choices(poor).find((c) => c.key === "choice:leave-a-coin")!.disabled).toBe("Not enough crowns");
  });

  test("The Old Battlefield: 25% risk, +15 a search, a relic on the third find", () => {
    let fails = 0, thirds = 0;
    for (let s = 1; s <= 300; s++) {
      const b = at({ seed: s });
      b.screen = startEvent(b, "the-old-battlefield");
      let a: RunState = b, finds = 0;
      for (let i = 0; i < 4; i++) {
        const key = choices(a).find((c) => c.key.startsWith("choice:search"))?.key;
        if (!key) break;
        const before = a;
        a = choose(a, key);
        const x = d(before, a);
        if (x.lives === -2) { expect(x).toEqual(only({ lives: -2 })); if (i === 0) fails++; break; }
        finds++;
        expect(x.crowns).toBe(20);
        expect(x.relics.length).toBe(finds === 3 ? 1 : 0);
        if (finds === 3) { thirds++; expect(RELIC[x.relics[0]!]!.rarity).toBe("uncommon"); }
        const risk = 25 + 15 * finds;
        expect(choices(a)[0]!.text).toContain(`${risk}%`);
      }
    }
    expect(fails / 300).toBeGreaterThan(0.17);
    expect(fails / 300).toBeLessThan(0.33);
    expect(thirds).toBeGreaterThan(0);
    const p = play("the-old-battlefield", "leave");
    expect(d(p.b, p.a)).toEqual(NONE);
  });

  test("The Tinker's Cart", () => {
    let p = play("the-tinkers-cart", "trade-up", { boons: ["barbed-tips"] });
    expect(p.a.loadout.boons).not.toContain("barbed-tips");
    const got = newBoons(p.b, p.a);
    expect(got.length).toBe(1);
    expect(BOON[got[0]!]!.tower).toBe("archer");
    expect(BOON[got[0]!]!.rarity).toBe("uncommon");
    p = play("the-tinkers-cart", "mystery-crate");
    const x = d(p.b, p.a);
    expect(x.crowns).toBe(-40);
    expect(["common", "uncommon"]).toContain(RELIC[x.relics[0]!]!.rarity);
    expect(d(p.b, play("the-tinkers-cart", "move-on").a)).toEqual(NONE);
    const r = at({ boons: ["glass-arrows"] }); r.screen = startEvent(r, "the-tinkers-cart");
    expect(choices(r).find((c) => c.key === "choice:trade-up")!.disabled).toBe("No boon to trade");
  });

  test("A Deserter", () => {
    let p = play("a-deserter", "take-him-in");
    expect(d(p.b, p.a)).toEqual(only({ towers: 1 }));
    p = play("a-deserter", "ask-for-his-map");
    expect(p.a.map.nodes.filter((n) => n.kind === "event" && !n.visited).every((n) => n.info?.revealed)).toBe(true);
    p = play("a-deserter", "send-him-away");
    expect(d(p.b, p.a)).toEqual(only({ lives: 3 }));
  });

  test("The Gambler's Table", () => {
    let wins = 0;
    for (let s = 1; s <= 200; s++) {
      const p = play("the-gamblers-table", "bet-30-crowns", { seed: s });
      const x = d(p.b, p.a);
      expect([45, -30]).toContain(x.crowns);
      if (x.crowns === 45) wins++;
      const q = play("the-gamblers-table", "bet-a-life", { seed: s });
      const y = d(q.b, q.a);
      if (y.boons) { expect(y).toEqual(only({ boons: 1 })); expect(BOON[newBoons(q.b, q.a)[0]!]!.rarity).toBe("uncommon"); }
      else expect(y).toEqual(only({ lives: -3 }));
    }
    expect(wins / 200).toBeGreaterThan(0.35);
    expect(wins / 200).toBeLessThan(0.55);
    const w = play("the-gamblers-table", "watch-then-leave");
    expect(d(w.b, w.a)).toEqual(NONE);
  });

  test("The Smith's Widow", () => {
    let p = play("the-smiths-widow", "temper-two-boons", { boons: ["barbed-tips", "drilled", "focus"] });
    expect(d(p.b, p.a)).toEqual(only({ tempered: 2 }));
    p = play("the-smiths-widow", "take-his-hammer");
    expect(d(p.b, p.a)).toEqual(only({ relics: ["widows-hammer"] }));
  });

  test("Refugees on the Road", () => {
    let p = play("refugees-on-the-road", "give-30-crowns");
    expect(d(p.b, p.a)).toEqual(only({ crowns: -30, max: 3, lives: 3 }));
    p = play("refugees-on-the-road", "walk-with-them");
    expect(d(p.b, p.a)).toEqual(NONE);
    expect(p.a.book!.walk).toBe(true);
    const r = structuredClone(p.a) as Run;
    r.screen = { s: "battle", node: r.at, kind: "battle" };
    expect(battleFor(r).fewerWaves).toBe(2);
    expect(d(p.b, play("refugees-on-the-road", "pass-by").a)).toEqual(NONE);
  });

  test("The Wandering Bard", () => {
    let p = play("the-wandering-bard", "pay-him-20-crowns");
    expect(d(p.b, p.a)).toEqual(only({ crowns: -20 }));
    const r = structuredClone(p.a) as Run;
    const boss = r.map.nodes.find((n) => n.kind === "boss")!;
    r.at = boss.id; r.screen = { s: "battle", node: boss.id, kind: "boss" };
    expect(battleFor(r).bossHpPct).toBe(-10);
    p = play("the-wandering-bard", "ask-for-a-song-of-the-road");
    expect(p.a.book!.revealedNext).toBe(true);
    const iv = at({ act: 4, floor: 1 }); iv.screen = startEvent(iv, "the-wandering-bard");
    expect(choices(iv).find((c) => c.key === "choice:ask-for-a-song-of-the-road")!.disabled).toBe("Not in act IV");
  });

  test("The Overturned Wagon", () => {
    let p = play("the-overturned-wagon", "take-what-you-can-carry");
    expect(d(p.b, p.a)).toEqual(only({ supplies: 2 }));
    p = play("the-overturned-wagon", "right-the-wagon");
    expect(d(p.b, p.a)).toEqual(only({ lives: -2, crowns: 15, supplies: 2 }));
    expect(p.seen).toContain("pick"); // the third supply asks which to keep
  });

  test("The Recruiting Sergeant", () => {
    let p = play("the-recruiting-sergeant", "hire-a-crew");
    expect(d(p.b, p.a)).toEqual(only({ crowns: -35, boons: 1 }));
    expect(BOON[newBoons(p.b, p.a)[0]!]!.rarity).toBe("uncommon");
    p = play("the-recruiting-sergeant", "drill-your-own", { boons: ["focus"] });
    expect(d(p.b, p.a)).toEqual(only({ lives: -2, tempered: 1 }));
    const r = at(); r.screen = startEvent(r, "the-recruiting-sergeant");
    expect(choices(r).find((c) => c.key === "choice:drill-your-own")!.disabled).toBe("No boons to temper");
  });

  test("The Miller's Fire", () => {
    let p = play("the-millers-fire", "climb-up");
    expect(d(p.b, p.a)).toEqual(only({ lives: -3, crowns: 30, towers: 1 }));
    expect(p.a.loadout.towers).toContain("pyre");
    p = play("the-millers-fire", "climb-up", { towers: ["archer", "pyre", "mage"] });
    expect(d(p.b, p.a)).toEqual(only({ lives: -3, crowns: 30, boons: 1 }));
    expect(BOON[newBoons(p.b, p.a)[0]!]!.tower).toBe("pyre");
    p = play("the-millers-fire", "fetch-water");
    expect(d(p.b, p.a)).toEqual(only({ crowns: 15 }));
    p = play("the-millers-fire", "fetch-water", { towers: ["archer", "frost"] });
    expect(d(p.b, p.a)).toEqual(only({ boons: 1 }));
  });

  test("Bees in the Orchard", () => {
    let p = play("bees-in-the-orchard", "take-the-honey");
    expect(d(p.b, p.a)).toEqual(only({ lives: 6 }));
    p = play("bees-in-the-orchard", "take-the-whole-hive", { lives: 15 });
    expect(d(p.b, p.a)).toEqual(only({ lives: -4, towers: 1 }));
    expect(p.a.loadout.towers).toContain("thornwood");
    p = play("bees-in-the-orchard", "take-the-whole-hive", { lives: 15, fresh: true });
    expect(d(p.b, p.a)).toEqual(only({ lives: -4, boons: 2 }));
    expect(p.a.loadout.towers).not.toContain("thornwood");
  });

  test("The Harvest Fair", () => {
    expect(d(at(), play("the-harvest-fair", "enter-the-contest").a).crowns).toBe(40);
    expect(d(at(), play("the-harvest-fair", "enter-the-contest", { towers: ["mage", "barracks"] }).a).crowns).toBe(15);
    let p = play("the-harvest-fair", "buy-at-the-stalls");
    expect(d(p.b, p.a)).toEqual(only({ crowns: -25, supplies: 2 }));
    p = play("the-harvest-fair", "rest-a-while");
    expect(d(p.b, p.a)).toEqual(only({ lives: 4 }));
  });

  test("The Scarecrow", () => {
    let p = play("the-scarecrow", "take-its-coat");
    const x = d(p.b, p.a);
    expect(x.curses).toEqual(["haunted"]);
    expect(RELIC[x.relics[0]!]!.rarity).toBe("common");
    p = play("the-scarecrow", "burn-it", { curses: ["rust"] });
    expect(d(p.b, p.a)).toEqual(only({ lives: -1, lifted: ["rust"] }));
    p = play("the-scarecrow", "burn-it");
    expect(d(p.b, p.a)).toEqual(only({ lives: -1, crowns: 20 }));
  });

  test("The Ford", () => {
    let p = play("the-ford", "pay-the-ferryman");
    expect(d(p.b, p.a)).toEqual(only({ crowns: -20 }));
    const r = structuredClone(p.a) as Run;
    r.screen = { s: "battle", node: r.at, kind: "battle" };
    expect(battleFor(r).gold).toBe(60);
    let falls = 0;
    for (let s = 1; s <= 200; s++) {
      const q = play("the-ford", "take-the-bridge", { seed: s });
      const x = d(q.b, q.a);
      expect(x.crowns).toBe(15);
      expect([0, -3]).toContain(x.lives);
      if (x.lives) falls++;
    }
    expect(falls / 200).toBeGreaterThan(0.3);
    expect(falls / 200).toBeLessThan(0.5);
    p = play("the-ford", "wade-across");
    expect(d(p.b, p.a)).toEqual(only({ lives: -1 }));
  });

  test("The Lost Patrol", () => {
    let p = play("the-lost-patrol", "take-them-on");
    expect(d(p.b, p.a)).toEqual(only({ boons: 1 }));
    p = play("the-lost-patrol", "take-them-on", { commander: "alchemist" });
    expect(p.a.loadout.towers).toContain("barracks");
    p = play("the-lost-patrol", "send-them-home");
    expect(d(p.b, p.a)).toEqual(only({ max: 2, lives: 2 }));
    p = play("the-lost-patrol", "arm-them-and-march-on");
    expect(d(p.b, p.a)).toEqual(only({ crowns: -15, supplies: 2 }));
    expect(p.a.loadout.supplies).toEqual(["spike-trap", "war-horn"]);
  });

  test("The Sunken Vault", () => {
    let p = play("the-sunken-vault", "open-it", { act: 2 });
    const x = d(p.b, p.a);
    expect(x.curses).toEqual(["debt"]);
    expect(RELIC[x.relics[0]!]!.rarity).toBe("rare");
    p = play("the-sunken-vault", "mark-it-and-move-on", { act: 2 });
    expect(d(p.b, p.a)).toEqual(only({ crowns: 25 }));
  });

  test("The Mirage Market opens a half-price shop", () => {
    const b = at({ act: 2 }); b.screen = startEvent(b, "the-mirage-market");
    const a = choose(b, "choice:shop");
    expect(a.screen.s).toBe("shop");
    expect((a.screen as { mirage?: boolean }).mirage).toBe(true);
    const q = play("the-mirage-market", "walk-past", { act: 2 });
    expect(d(q.b, q.a)).toEqual(NONE);
  });

  test("The Sphinx", () => {
    const p = play("the-sphinx", "name-one", { act: 2, boons: ["drilled"] });
    // archer (first offered) gains two, barracks loses its one
    expect(p.a.loadout.boons).not.toContain("drilled");
    expect(newBoons(p.b, p.a).length).toBe(2);
    const q = play("the-sphinx", "name-none", { act: 2 });
    expect(d(q.b, q.a)).toEqual(NONE);
  });

  test("The Dry Well", () => {
    let p = play("the-dry-well", "climb-down", { act: 2 });
    const x = d(p.b, p.a);
    expect(x.lives).toBe(-3);
    expect(RELIC[x.relics[0]!]!.rarity).toBe("uncommon");
    p = play("the-dry-well", "drop-a-coin-and-wish", { act: 2 });
    expect(d(p.b, p.a)).toEqual(only({ crowns: -10, lives: 4 }));
  });

  test("The Caravan Master", () => {
    let p = play("the-caravan-master", "buy-his-oil", { act: 2 });
    expect(d(p.b, p.a)).toEqual(only({ crowns: -30, supplies: 2 }));
    p = play("the-caravan-master", "sell-him-a-tower", { act: 2, towers: ["archer", "barracks", "mage", "frost"], boons: ["barbed-tips"] });
    expect(d(p.b, p.a)).toEqual(only({ crowns: 70, towers: -1, boons: -1 }));
    const r = at({ act: 2 }); r.screen = startEvent(r, "the-caravan-master");
    expect(choices(r).find((c) => c.key === "choice:sell-him-a-tower")!.disabled).toBe("Need 4 tower cards");
    p = play("the-caravan-master", "ask-about-the-road", { act: 2 });
    expect(p.a.map.nodes.filter((n) => n.kind === "event").every((n) => n.info?.revealed)).toBe(true);
  });

  test("The Buried King", () => {
    let p = play("the-buried-king", "dig-out-its-hands", { act: 2 });
    expect(d(p.b, p.a)).toEqual(only({ lives: -2, boons: 1 }));
    p = play("the-buried-king", "read-the-words-on-its-brow", { act: 2 });
    expect(d(p.b, p.a)).toEqual(only({ boons: 1, tempered: 1 }));
    expect(BOON[newBoons(p.b, p.a)[0]!]!.rarity).toBe("common");
  });

  test("The Frozen Knight", () => {
    let p = play("the-frozen-knight", "thaw-him", { act: 3 });
    expect(d(p.b, p.a).lives).toBe(-4);
    expect(RELIC[d(p.b, p.a).relics[0]!]!.rarity).toBe("rare");
    p = play("the-frozen-knight", "take-the-sword", { act: 3 });
    expect(d(p.b, p.a).curses).toEqual(["cold-hands"]);
    expect(RELIC[d(p.b, p.a).relics[0]!]!.rarity).toBe("uncommon");
  });

  test("The Avalanche Pass", () => {
    let p = play("the-avalanche-pass", "go-quietly", { act: 3, floor: 2 });
    expect(d(p.b, p.a)).toEqual(only({ crowns: 20 }));
    const leap = choices(p.a).map((c) => p.a.map.nodes[c.node!]!.floor);
    expect(leap.length).toBeGreaterThan(0);
    expect(leap.every((f) => f === 4)).toBe(true);
    const r = at({ act: 3, floor: 5 }); r.screen = startEvent(r, "the-avalanche-pass");
    expect(choices(r).find((c) => c.key === "choice:go-quietly")!.disabled).toBeTruthy();
    p = play("the-avalanche-pass", "dig-through-the-old-road", { act: 3 });
    expect(d(p.b, p.a)).toEqual(only({ crowns: -30, boons: 1 }));
    p = play("the-avalanche-pass", "wait-it-out", { act: 3 });
    expect(d(p.b, p.a)).toEqual(only({ lives: 4 }));
  });

  test("The Hermit", () => {
    let p = play("the-hermit", "a-tower", { act: 3, towers: ["archer", "barracks", "mage", "frost"], boons: ["barbed-tips"] });
    expect(d(p.b, p.a)).toEqual(only({ towers: -1, boons: 1 }));
    expect(newBoons(p.b, p.a).map((b) => BOON[b]!.rarity)).toEqual(["rare", "rare"]);
    p = play("the-hermit", "time", { act: 3 });
    expect(p.a.book!.revealedNext).toBe(true);
    p = play("the-hermit", "nothing", { act: 3 });
    expect(d(p.b, p.a)).toEqual(only({ lives: 2 }));
  });

  test("The Ice Bridge", () => {
    for (let s = 1; s <= 60; s++) {
      const p = play("the-ice-bridge", "cross-quickly", { act: 3, seed: s });
      const x = d(p.b, p.a);
      expect([only({ crowns: 25 }), only({ lives: -4 })]).toContainEqual(x);
    }
    let p = play("the-ice-bridge", "cut-one-free", { act: 3 });
    expect(d(p.b, p.a)).toEqual(only({ towers: 1, curses: ["cold-hands"] }));
    p = play("the-ice-bridge", "cut-one-free", { act: 3, towers: ["frost", "archer"] });
    expect(d(p.b, p.a)).toEqual(only({ boons: 1, curses: ["cold-hands"] }));
    p = play("the-ice-bridge", "go-around", { act: 3 });
    expect(d(p.b, p.a)).toEqual(only({ lives: -1 }));
  });

  test("The Ember Shrine", () => {
    let p = play("the-ember-shrine", "warm-your-hands", { act: 3 });
    expect(d(p.b, p.a)).toEqual(only({ lives: 6 }));
    p = play("the-ember-shrine", "feed-it-a-boon", { act: 3, boons: ["focus"] });
    expect(d(p.b, p.a).boons).toBe(-1);
    expect(RELIC[d(p.b, p.a).relics[0]!]!.rarity).toBe("rare");
    p = play("the-ember-shrine", "take-a-coal", { act: 3 });
    expect(d(p.b, p.a)).toEqual(only({ lives: -2, towers: 1 }));
  });

  test("The Snowed-In Inn", () => {
    for (let s = 1; s <= 60; s++) {
      const p = play("the-snowed-in-inn", "join-the-game", { act: 3, seed: s });
      expect([60, -40]).toContain(d(p.b, p.a).crowns);
    }
    let p = play("the-snowed-in-inn", "buy-a-round", { act: 3, boons: ["focus", "drilled", "barbed-tips"] });
    expect(d(p.b, p.a)).toEqual(only({ crowns: -20, tempered: 2 }));
    p = play("the-snowed-in-inn", "sleep-by-the-fire", { act: 3 });
    expect(d(p.b, p.a)).toEqual(only({ lives: 5 }));
  });

  test("The Wandering Merchant", () => {
    let p = play("the-wandering-merchant", "buy-the-boss-relic", { act: 2 });
    const x = d(p.b, p.a);
    expect(x.crowns).toBe(-150); expect(x.lives).toBe(-3);
    expect(RELIC[x.relics[0]!]!.rarity).toBe("boss");
    p = play("the-wandering-merchant", "buy-a-rare-boon", { act: 2 });
    expect(d(p.b, p.a)).toEqual(only({ crowns: -80, boons: 1 }));
  });

  test("The Ruined Chapel", () => {
    let p = play("the-ruined-chapel", "leave-your-curses-here", { act: 2, curses: ["debt", "rust"] });
    expect(d(p.b, p.a)).toEqual(only({ max: -2, lifted: ["debt", "rust"] }));
    p = play("the-ruined-chapel", "take-the-reliquary", { act: 2 });
    const x = d(p.b, p.a);
    expect(x.relics.length).toBe(2);
    expect(x.curses.length).toBe(2);
  });

  test("events never repeat in a run and respect acts and unlocks", () => {
    const r = at({ act: 1, fresh: true });
    for (const e of EVENTS) {
      if (e.locked) expect(r.book.unlocked.events).not.toContain(e.id);
    }
    expect(EVENT["the-sunken-vault"]!.acts).toEqual([2]);
  });

  test("losing the last life to an event ends the run (or the Phoenix Feather saves it)", () => {
    const p = play("the-frozen-knight", "thaw-him", { act: 3, lives: 3 });
    expect(p.a.over?.won).toBe(false);
    expect(p.a.over?.by).toBe("The Frozen Knight");
    const q = play("the-frozen-knight", "thaw-him", { act: 3, lives: 3, relics: ["phoenix-feather"] });
    expect(q.a.over).toBeUndefined();
    expect(q.a.loadout.lives).toBe(8);
    expect(q.a.loadout.relics).not.toContain("phoenix-feather");
  });
});
