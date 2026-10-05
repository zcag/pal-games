// Shops (content.md 11.2, R14 Toll, R16 Mirage Market, R20 supplies).
import type { Card, RunScreen, ShopItem } from "../types.ts";
import { RELIC, RELICS } from "../content/run/relics.ts";
import { TOWERS } from "../content/run/towers.ts";
import { BOON } from "../content/run/boons.ts";
import { SUPPLY } from "../content/run/supplies.ts";
import { CARD_RARITY, RELIC_RARITY, SHOP } from "../content/run/economy.ts";
import { TOLL_CROWNS } from "../content/run/curses.ts";
import { coreWeight, pickBlueprint, pickBoon, rollRarity, rollRelics, relicFits } from "./rewards.ts";
import { cardKey, crowns, cursed, has, randomSupply, rng, type Run } from "./state.ts";

type Shop = Extract<RunScreen, { s: "shop" }>;

/** The modifiers that add into one price percentage. */
export function priceMods(r: Run, mirage = false): number {
  let m = 0;
  if (has(r, "guild-seal")) m += SHOP.mods.guildSeal;
  if (r.commander === "quartermaster") m += SHOP.mods.supplyLines;
  if (has(r, "hollow-crown")) m += SHOP.mods.hollowCrown;
  if (mirage) m += SHOP.mods.mirage;
  return m;
}

/** `round(base x roll x (1 + mods))`, never below half of base. */
export function price(base: number, roll: number, mods: number): number {
  return Math.max(Math.round(base * SHOP.floor), Math.round(base * roll * (1 + mods / 100)));
}

export function basePrice(c: Card): number {
  if (c.kind === "blueprint") return SHOP.blueprint[TOWERS[c.tower].rarity] ?? 75;
  if (c.kind === "boon") return SHOP.boon[BOON[c.boon]!.rarity] ?? 60;
  if (c.kind === "relic") return SHOP.relic[RELIC[c.relic]!.rarity] ?? 150;
  return SUPPLY[c.supply].price;
}

function stockCards(r: Run, avoid: Set<string>): Card[] {
  const g = rng(r, "shop");
  const out: Card[] = [];
  const add = (c: Card | null) => { if (c && !avoid.has(cardKey(c))) { avoid.add(cardKey(c)); out.push(c); } };
  for (let i = 0; i < SHOP.counts.blueprints; i++) add(pickBlueprint(r, g, { common: 1, uncommon: 1, rare: 1 }, avoid));
  for (let i = 0; i < SHOP.counts.boons; i++) add(pickBoon(r, g, r.loadout.towers, (t) => coreWeight(r, t), rollRarity(g, CARD_RARITY.shop, 0), avoid));
  const pool = (id: string) => !RELIC[id]!.noShop && ["common", "uncommon", "rare"].includes(RELIC[id]!.rarity) && !avoid.has(`relic:${id}`);
  const n = SHOP.counts.relics + (has(r, "merchants-bell") ? 1 : 0);
  for (const id of rollRelics(r, g, n, RELIC_RARITY.shop, pool)) add({ kind: "relic", relic: id, rarity: RELIC[id]!.rarity });
  const shopRelics = RELICS.filter((d) => d.rarity === "shop" && relicFits(r, d.id) && !avoid.has(`relic:${d.id}`));
  if (shopRelics.length) { const d = g.pick(shopRelics); add({ kind: "relic", relic: d.id, rarity: "shop" }); }
  for (let i = 0; i < SHOP.counts.supplies; i++) {
    const s = randomSupply(g, out.flatMap((c) => (c.kind === "supply" ? [c.supply] : [])));
    add({ kind: "supply", supply: s, rarity: SUPPLY[s].rarity });
  }
  return out;
}

function priced(r: Run, c: Card, sale: boolean, mirage: boolean): ShopItem {
  const roll = 1 + rng(r, "shop").range(-SHOP.roll, SHOP.roll);
  return { card: c, price: price(basePrice(c), roll, priceMods(r, mirage) + (sale ? -50 : 0)), sale, sold: false };
}

/** Open a shop. Toll takes its crowns at the door. */
export function openShop(r: Run, o: { mirage?: boolean; camp?: boolean } = {}): Shop {
  if (cursed(r, "toll")) crowns(r, -Math.min(r.crowns, TOLL_CROWNS));
  const mirage = !!o.mirage;
  const cards = stockCards(r, new Set());
  const g = rng(r, "shop");
  const saleable = cards.map((c, i) => [c, i] as const).filter(([c]) => c.kind === "blueprint" || c.kind === "boon");
  const sale = saleable.length ? g.pick(saleable)[1] : -1;
  const stock = cards.map((c, i) => priced(r, c, i === sale, mirage));
  const mods = priceMods(r, mirage);
  return {
    s: "shop", stock,
    services: {
      mend: price(SHOP.mend.price, 1, mods),
      lift: r.loadout.curses.length ? price(SHOP.lift.price + SHOP.lift.step * r.book.lifts, 1, mods) : null,
      restock: has(r, "guild-seal") ? 0 : price(SHOP.restock, 1, mods),
    },
    ...(mirage ? { mirage } : {}), ...(o.camp ? { camp: true } : {}),
  };
}

/** Restock: every unbought card, relic and supply is replaced, each by one of its own kind. */
export function restock(r: Run, shop: Shop) {
  const keep = new Set(shop.stock.map((i) => cardKey(i.card)));
  const fresh = stockCards(r, keep);
  shop.stock = shop.stock.map((it) => {
    if (it.sold) return it;
    const i = fresh.findIndex((c) => c.kind === it.card.kind && (c.kind !== "relic" || (RELIC[c.relic]!.rarity === "shop") === (RELIC[(it.card as { relic: string }).relic]!.rarity === "shop")));
    if (i < 0) return { ...it, sold: true };
    const [c] = fresh.splice(i, 1);
    return priced(r, c!, it.sale, !!shop.mirage);
  });
}
