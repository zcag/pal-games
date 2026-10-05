import { describe, expect, test } from "bun:test";
import { newRun, choices, choose } from "../ramparts/game/run/index.ts";
import { openShop, price, basePrice, priceMods } from "../ramparts/game/run/shop.ts";
import type { Run } from "../ramparts/game/run/state.ts";
import { fullProfile } from "../ramparts/game/meta.ts";
import { RELIC } from "../ramparts/game/content/run/relics.ts";
import { TOWERS } from "../ramparts/game/content/run/towers.ts";
import type { CommanderId, RunScreen, RunState, TowerId } from "../ramparts/game/types.ts";

type Shop = Extract<RunScreen, { s: "shop" }>;

function run(o: { seed?: number; commander?: CommanderId; relics?: string[]; curses?: string[]; crowns?: number } = {}): Run {
  let r = newRun({ seed: o.seed ?? 3, commander: o.commander ?? "marshal", ascension: 0, profile: fullProfile() });
  r = choose(r, choices(r).find((c) => ["A Full Purse", "Strong Walls", "Supplies", "A Relic"].includes(c.label))!.key);
  const x = r as Run;
  x.loadout.relics.push(...(o.relics ?? []));
  x.loadout.curses.push(...(o.curses ?? []));
  x.crowns = o.crowns ?? 1000;
  x.loadout.supplies = [null, null];
  return x;
}

function inShop(r: Run, o: { mirage?: boolean } = {}): Run {
  r.screen = openShop(r, o);
  return r;
}
const shop = (r: RunState) => r.screen as Shop;

describe("shop stock", () => {
  test("2 blueprints, 3 boons, 2 relics and a shop relic, 2 supplies; Merchant's Bell adds a relic", () => {
    for (let s = 1; s <= 200; s++) {
      const r = inShop(run({ seed: s }));
      const k = shop(r).stock.map((i) => i.card.kind === "relic" ? `relic-${RELIC[i.card.relic]!.rarity === "shop" ? "shop" : "pool"}` : i.card.kind);
      expect(k.filter((x) => x === "blueprint").length).toBe(2);
      expect(k.filter((x) => x === "boon").length).toBe(3);
      expect(k.filter((x) => x === "relic-pool").length).toBe(2);
      expect(k.filter((x) => x === "relic-shop").length).toBe(1);
      expect(k.filter((x) => x === "supply").length).toBe(2);
      for (const i of shop(r).stock) if (i.card.kind === "relic") {
        const d = RELIC[i.card.relic]!;
        expect(d.noShop ?? false).toBe(false);
        expect(["common", "uncommon", "rare", "shop"]).toContain(d.rarity);
      }
      const b = inShop(run({ seed: s, relics: ["merchants-bell"] }));
      expect(shop(b).stock.filter((i) => i.card.kind === "relic").length).toBe(4);
    }
  });

  test("exactly one card on sale at half price", () => {
    for (let s = 1; s <= 100; s++) {
      const st = shop(inShop(run({ seed: s }))).stock;
      const sale = st.filter((i) => i.sale);
      expect(sale.length).toBe(1);
      expect(["blueprint", "boon"]).toContain(sale[0]!.card.kind);
      const base = basePrice(sale[0]!.card);
      expect(sale[0]!.price).toBeGreaterThanOrEqual(Math.round(base * 0.5));
      expect(sale[0]!.price).toBeLessThanOrEqual(Math.round(base * 0.55));
    }
  });
});

describe("shop prices", () => {
  test("base prices by rarity with a +-10% roll", () => {
    for (let s = 1; s <= 100; s++) for (const i of shop(inShop(run({ seed: s }))).stock) {
      if (i.sale) continue;
      const b = basePrice(i.card);
      expect(i.price).toBeGreaterThanOrEqual(Math.round(b * 0.9));
      expect(i.price).toBeLessThanOrEqual(Math.round(b * 1.1));
    }
    expect(basePrice({ kind: "blueprint", tower: "storm", rarity: "rare" })).toBe(110);
    expect(basePrice({ kind: "blueprint", tower: "archer", rarity: "common" })).toBe(50);
    expect(basePrice({ kind: "relic", relic: "black-ice", rarity: "uncommon" })).toBe(150);
    expect(basePrice({ kind: "relic", relic: "abacus", rarity: "shop" })).toBe(130);
    expect(basePrice({ kind: "boon", boon: "focus", tower: "mage", rarity: "common" })).toBe(40);
    expect(TOWERS.storm.rarity).toBe("rare");
  });

  test("modifiers add into one percentage, never below half of base (content.md 11.2)", () => {
    expect(priceMods(run({ relics: ["guild-seal"] }))).toBe(-20);
    expect(priceMods(run({ commander: "quartermaster" }))).toBe(-15);
    expect(priceMods(run({ relics: ["hollow-crown", "guild-seal"] }))).toBe(80);
    expect(priceMods(run({ relics: ["guild-seal"], commander: "quartermaster" }), true)).toBe(-85);
    expect(price(150, 1.05, -20)).toBe(126);
    expect(price(150, 1.0, -85)).toBe(75);
    expect(price(100, 0.9, 100)).toBe(180);
  });

  test("Hollow Crown doubles, Guild Seal cuts and frees the restock", () => {
    const plain = shop(inShop(run({ seed: 7 })));
    const crown = shop(inShop(run({ seed: 7, relics: ["hollow-crown"] })));
    const seal = shop(inShop(run({ seed: 7, relics: ["guild-seal"] })));
    expect(seal.services!.restock).toBe(0);
    expect(plain.services!.restock).toBe(25);
    expect(crown.services!.mend).toBe(80);
    expect(seal.services!.mend).toBe(32);
  });
});

describe("shop actions", () => {
  test("buying takes the crowns, marks it sold and adds it to the war table", () => {
    const r = inShop(run({ seed: 5, crowns: 500 }));
    const i = shop(r).stock.findIndex((x) => x.card.kind === "boon");
    const it = shop(r).stock[i]!;
    const after = choose(r, `buy:${i}`);
    expect(after.crowns).toBe(500 - it.price);
    expect(shop(after).stock[i]!.sold).toBe(true);
    expect(after.loadout.boons).toContain((it.card as { boon: string }).boon);
    expect(choices(after).find((c) => c.key === `buy:${i}`)!.disabled).toBe("Sold");
  });

  test("greyed with the reason when you can't pay", () => {
    const r = inShop(run({ crowns: 10 }));
    for (const c of choices(r).filter((c) => c.key.startsWith("buy:"))) expect(c.disabled).toBe("Not enough crowns");
  });

  test("Mend heals 5 for 40 once; Lift a curse costs 60, then 80 at the next shop", () => {
    const r = inShop(run({ crowns: 300, curses: ["debt", "rust"] }));
    r.loadout.lives = 10;
    let a = choose(r, "mend");
    expect(a.loadout.lives).toBe(15);
    expect(a.crowns).toBe(260);
    expect(choices(a).find((c) => c.key === "mend")!.disabled).toBe("Used");
    a = choose(a, "lift");
    expect(a.crowns).toBe(200);
    expect(a.screen.s).toBe("pick");
    a = choose(a, "pick:1");
    expect(a.loadout.curses).toEqual(["debt"]);
    expect(a.screen.s).toBe("shop");
    const next = openShop(a as Run);
    expect(next.services!.lift).toBe(80);
  });

  test("Restock replaces every unbought card and relic, once", () => {
    const r = inShop(run({ seed: 11, crowns: 500 }));
    const before = shop(r).stock.map((i) => JSON.stringify(i.card));
    const a = choose(r, "restock");
    expect(a.crowns).toBe(475);
    const after = shop(a).stock.map((i) => JSON.stringify(i.card));
    expect(after.filter((c, i) => c !== before[i] && !c.includes("supply")).length).toBeGreaterThan(4);
    expect(choices(a).find((c) => c.key === "restock")!.disabled).toBe("Used");
  });

  test("Toll takes 15 crowns at the door (all you have, if less)", () => {
    const r = run({ curses: ["toll"], crowns: 100 });
    openShop(r);
    expect(r.crowns).toBe(85);
    r.crowns = 9;
    openShop(r);
    expect(r.crowns).toBe(0);
  });

  test("the Mirage Market is half price, and the most expensive thing bought turns to sand", () => {
    const r = inShop(run({ seed: 2, crowns: 2000 }), { mirage: true });
    const st = shop(r).stock;
    for (const it of st) if (!it.sale) expect(it.price).toBeLessThanOrEqual(Math.round(basePrice(it.card) * 0.55));
    const boon = st.findIndex((x) => x.card.kind === "boon");
    const relic = st.findIndex((x) => x.card.kind === "relic");
    let a = choose(r, `buy:${boon}`);
    a = choose(a, `buy:${relic}`);
    const relicId = (st[relic]!.card as { relic: string }).relic;
    expect(a.loadout.relics).toContain(relicId);
    expect(choices(a).find((c) => c.key === "leave")!.text).toContain("turns to sand");
    a = choose(a, "leave");
    expect(a.loadout.relics).not.toContain(relicId);
    expect(a.loadout.boons).toContain((st[boon]!.card as { boon: string }).boon);
  });

  test("a 7th tower from the shop asks which to replace and is paid on replacing", () => {
    const r = inShop(run({ seed: 8, crowns: 500 }));
    r.loadout.towers = ["archer", "barracks", "mage", "bombard", "frost", "pyre"];
    const st = shop(r).stock;
    const i = st.findIndex((x) => x.card.kind === "blueprint" && !r.loadout.towers.includes((x.card as { tower: TowerId }).tower));
    if (i < 0) return;
    let a = choose(r, `buy:${i}`);
    expect(a.screen.s).toBe("replace");
    expect(choose(a, "keep").crowns).toBe(500);
    a = choose(a, "replace:archer");
    expect(a.crowns).toBe(500 - st[i]!.price);
    expect(a.screen.s).toBe("shop");
    expect(shop(a).stock[i]!.sold).toBe(true);
    expect(a.loadout.towers).not.toContain("archer");
  });

  test("supplies: bought into a free slot; greyed when both slots are full", () => {
    const r = inShop(run({ seed: 4, crowns: 500 }));
    const i = shop(r).stock.findIndex((x) => x.card.kind === "supply");
    const a = choose(r, `buy:${i}`);
    expect(a.loadout.supplies.filter(Boolean).length).toBe(1);
    const full = inShop(run({ seed: 4, crowns: 500 }));
    full.loadout.supplies = ["bell", "flare"];
    expect(choices(full).find((c) => c.key === `buy:${i}`)!.disabled).toBe("Your packs are full");
  });
});
