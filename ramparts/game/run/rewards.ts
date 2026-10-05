// The draft: what can be offered (no dead picks) and how reward screens are built
// (run-meta.md 3, content.md 11.3, R2, R6, R13, R18).
import type { Rng } from "../rng.ts";
import type { BoonId, Card, Rarity, RelicId, TowerId } from "../types.ts";
import { BOONS, BOON, type BoonDef } from "../content/run/boons.ts";
import { RELIC, RELICS } from "../content/run/relics.ts";
import { TOWERS } from "../content/run/towers.ts";
import {
  CARD_RARITY, CORE, MAX_CARDS, MAX_TOWERS, RELIC_RARITY, RELIC_TAG_WEIGHT, SLOT_B_BLUEPRINT,
  SLOT_C_BLUEPRINT, SLOT_C_RELIC, SYNERGY_WEIGHT, type Weights,
} from "../content/run/economy.ts";
import { boonsOf, cardKey, has, owns, rng, type Run } from "./state.ts";

const RANK: Rarity[] = ["common", "uncommon", "rare"];

// ---------------------------------------------------------------- what may be offered
export function boonFits(r: Run, b: BoonDef, t: TowerId): boolean {
  if (!owns(r, t) || r.loadout.boons.includes(b.id) || r.book.banished.includes(`boon:${b.id}`)) return false;
  if (b.tower ? b.tower !== t : b.notOn?.includes(t)) return false;
  if (b.needs && !b.needs.some((n) => owns(r, n))) return false;
  if (b.id === "veteran" && has(r, "siege-engine")) return false;
  return true;
}

/** Every (boon, tower) pair that can be offered. */
export function boonOffers(r: Run, towers: TowerId[] = r.loadout.towers, rarity?: Rarity): { b: BoonDef; t: TowerId }[] {
  const out: { b: BoonDef; t: TowerId }[] = [];
  for (const t of towers) for (const b of BOONS) if ((!rarity || b.rarity === rarity) && boonFits(r, b, t)) out.push({ b, t });
  return out;
}

export function blueprintFits(r: Run, t: TowerId): boolean {
  return r.book.unlocked.towers.includes(t) && !owns(r, t) && !r.book.banished.includes(`blueprint:${t}`);
}

export function relicFits(r: Run, id: RelicId): boolean {
  const d = RELIC[id];
  if (!d || has(r, id) || r.book.banished.includes(`relic:${id}`)) return false;
  if (!["common", "uncommon", "rare", "boss", "shop"].includes(d.rarity)) return false;
  if (d.unlock > 0 && !r.book.unlocked.relics.includes(id)) return false;
  if (d.excludes?.some((x) => has(r, x))) return false;
  if (id === "siege-engine" && r.loadout.boons.includes("veteran")) return false;
  if (d.towers.length && r.loadout.towers.length >= MAX_TOWERS && !d.towers.some((t) => owns(r, t))) return false;
  return true;
}

export function relicWeight(r: Run, id: RelicId): number {
  const d = RELIC[id]!;
  let w = d.towers.some((t) => owns(r, t)) ? RELIC_TAG_WEIGHT : 1;
  if (id === "lucky-horseshoe" && r.book.firstRun && !r.book.seen.relics.length) w *= 3;
  return w;
}

/** Pick `n` distinct relics of rolled rarities from the pool (falls back to neighbouring rarities). */
export function rollRelics(r: Run, g: Rng, n: number, table: Weights, extra: (id: RelicId) => boolean = () => true): RelicId[] {
  const out: RelicId[] = [];
  for (let i = 0; i < n; i++) {
    const want = rollRarity(g, table, 0);
    for (const rar of byCloseness(want, Object.keys(table) as Rarity[])) {
      const c = RELICS.filter((d) => d.rarity === rar && relicFits(r, d.id) && !out.includes(d.id) && extra(d.id)).map((d) => d.id);
      if (c.length) { out.push(g.weighted(c, (id) => relicWeight(r, id))); break; }
    }
  }
  return out;
}

function byCloseness(want: Rarity, pool: Rarity[]): Rarity[] {
  const order = want === "rare" ? ["rare", "uncommon", "common"] : want === "uncommon" ? ["uncommon", "common", "rare"] : ["common", "uncommon", "rare"];
  const rest = pool.filter((x) => !order.includes(x));
  return [...order.filter((x) => pool.includes(x as Rarity)), ...rest] as Rarity[];
}

export function rollRarity(g: Rng, table: Weights, pity: number): Rarity {
  const ks = (Object.keys(table) as Rarity[]).filter((k) => (table[k] ?? 0) > 0 || (k === "rare" && pity > 0 && table.rare !== undefined));
  return g.weighted(ks, (k) => (table[k] ?? 0) + (k === "rare" ? pity : 0));
}

// ---------------------------------------------------------------- weights
export function coreWeight(r: Run, t: TowerId): number {
  let w = Math.min(CORE.cap, 1 + CORE.perBoon * boonsOf(r, t).length);
  const dmg = r.book.lastDamage, total = Object.values(dmg).reduce((a, b) => a + (b ?? 0), 0);
  if (total > 0 && (dmg[t] ?? 0) / total >= CORE.hotShare) w += CORE.hot;
  return w;
}

export function synergyWeight(r: Run, t: TowerId): number {
  return r.loadout.towers.some((o) => boonsOf(r, o).length >= 2 && TOWERS[o].partners.includes(t)) ? SYNERGY_WEIGHT : 1;
}

/** Universal boons weigh less in steered slots so a tower's own boons lead. */
const UNIVERSAL_W = 0.35;

function boonCard(_r: Run, b: BoonDef, t: TowerId): Card {
  return { kind: "boon", boon: b.id, tower: b.tower ? b.tower : t, rarity: b.rarity };
}

/** A boon card for one of `towers` (weighted by `tw`), rarity rolled from `table`. */
export function pickBoon(r: Run, g: Rng, towers: TowerId[], tw: (t: TowerId) => number, rarity: Rarity, avoid: Set<string>, steered = true): Card | null {
  const ok = (rar: Rarity) => boonOffers(r, towers, rar).filter(({ b, t }) => !avoid.has(`boon:${b.id}`) && towers.includes(t));
  for (const rar of byCloseness(rarity, RANK)) {
    const c = ok(rar);
    if (!c.length) continue;
    if (!steered) { const p = g.pick(c); return boonCard(r, p.b, p.t); }
    // steered: the tower by its weight first, then one of its boons (universal ones weigh less)
    const ts = [...new Set(c.map((x) => x.t))];
    const t = g.weighted(ts, tw);
    const p = g.weighted(c.filter((x) => x.t === t), ({ b }) => (b.tower ? 1 : UNIVERSAL_W));
    return boonCard(r, p.b, p.t);
  }
  return null;
}

export function pickBlueprint(r: Run, g: Rng, table: Weights, avoid: Set<string>, only?: TowerId[]): Card | null {
  const c = (only ?? r.book.unlocked.towers).filter((t) => blueprintFits(r, t) && !avoid.has(`blueprint:${t}`));
  const w = (t: TowerId) => synergyWeight(r, t) * (table[TOWERS[t].rarity] ?? 0);
  const live = c.filter((t) => w(t) > 0);
  if (!live.length) return null;
  const t = g.weighted(live, w);
  return { kind: "blueprint", tower: t, rarity: TOWERS[t].rarity };
}

// ---------------------------------------------------------------- reward screens
export type Source = "battle" | "elite" | "boss" | "ambush";

export function cardCount(r: Run): number {
  return Math.min(MAX_CARDS, 3 + (has(r, "third-eye") ? 1 : 0) + (has(r, "hollow-crown") ? 1 : 0));
}

/** Build a card reward: slots A (core boon), B (blueprint or boon), C (wild), extras A then C. */
export function buildCards(r: Run, source: Source): Card[] {
  const g = rng(r, "reward");
  const table = CARD_RARITY[source];
  const avoid = new Set<string>();
  const cards: Card[] = [];
  const add = (c: Card | null) => { if (c && !avoid.has(cardKey(c))) { avoid.add(cardKey(c)); cards.push(c); } };
  const first = r.book.rewards === 0;
  r.book.rewards++;

  // R13: run 1's first reward.
  if (first && r.book.firstRun && !owns(r, "frost") && !owns(r, "bombard")) {
    add({ kind: "blueprint", tower: "frost", rarity: TOWERS.frost.rarity });
    add({ kind: "blueprint", tower: "bombard", rarity: TOWERS.bombard.rarity });
    add({ kind: "boon", boon: "glass-bones", tower: "frost", rarity: BOON["glass-bones"]!.rarity });
    return cards;
  }

  const slotA = () => add(pickBoon(r, g, r.loadout.towers, (t) => coreWeight(r, t), rollRarity(g, table, r.pity), avoid));
  const slotC = () => {
    const rar = rollRarity(g, table, r.pity);
    if (g.chance(SLOT_C_RELIC)) {
      // battle-tier screens use the wild relic table; elite and boss screens keep the card's rarity
      const rt = source === "battle" || source === "ambush" ? RELIC_RARITY.wild : { [rar]: 1 };
      const [rel] = rollRelics(r, g, 1, rt, (id) => !avoid.has(`relic:${id}`) && (rt[RELIC[id]!.rarity] ?? 0) > 0);
      if (rel) return add({ kind: "relic", relic: rel, rarity: RELIC[rel]!.rarity });
    }
    if (g.chance(SLOT_C_BLUEPRINT)) {
      const bp = pickBlueprint(r, g, { [rar]: 1 }, avoid) ?? pickBlueprint(r, g, table, avoid);
      if (bp) return add(bp);
    }
    add(pickBoon(r, g, r.loadout.towers, () => 1, rar, avoid, false));
  };

  slotA();
  // slot B
  const owned = r.loadout.towers.length;
  const noAir = !r.loadout.towers.some((t) => TOWERS[t].air);
  const promised = r.book.promised && !owns(r, r.book.promised) ? r.book.promised : null;
  r.book.promised = null;
  if (promised) {
    add({ kind: "blueprint", tower: promised, rarity: TOWERS[promised].rarity });
  } else if (first && noAir) {
    add(pickBlueprint(r, g, { common: 1, uncommon: 1, rare: 1 }, avoid, ["archer", "mage", "frost", "storm"]));
  } else if (g.chance(SLOT_B_BLUEPRINT[Math.min(6, Math.max(3, owned))]!)) {
    const bp = pickBlueprint(r, g, table, avoid);
    if (bp) add(bp); else slotA();
  } else slotA();
  slotC();
  const n = cardCount(r);
  for (let i = 3; i < n; i++) (i === 3 ? slotA : slotC)();

  // Elites never show commons and bosses only rares: a slot that ran out of boons at that rarity
  // takes a blueprint or relic of the rarity instead.
  const min = source === "boss" ? 2 : source === "elite" ? 1 : 0;
  if (min) for (let i = 0; i < cards.length; i++) {
    if (RANK.indexOf(cards[i]!.rarity) >= min) continue;
    const want = RANK.slice(min) as Rarity[];
    const w = Object.fromEntries(want.map((x) => [x, table[x] ?? 1]));
    const sub = want.map((x) => pickBoon(r, g, r.loadout.towers, () => 1, x, avoid, false)).find((c) => c && RANK.indexOf(c.rarity) >= min)
      ?? pickBlueprint(r, g, w, avoid)
      ?? (() => { const [id] = rollRelics(r, g, 1, w, (x) => !avoid.has(`relic:${x}`) && want.includes(RELIC[x]!.rarity)); return id ? { kind: "relic", relic: id, rarity: RELIC[id]!.rarity } as Card : null; })();
    if (sub) { avoid.delete(cardKey(cards[i]!)); avoid.add(cardKey(sub)); cards[i] = sub; }
  }

  // An ambush always holds one uncommon or better.
  if (source === "ambush" && cards.length && cards.every((c) => c.rarity === "common")) {
    const up = pickBoon(r, g, r.loadout.towers, (t) => coreWeight(r, t), "uncommon", avoid);
    if (up) cards[0] = up;
  }
  notePity(r, cards);
  return cards;
}

/** Pity: +1 per common shown, reset when a rare is shown. */
export function notePity(r: Run, cards: Card[]) {
  if (cards.some((c) => c.rarity === "rare")) r.pity = 0;
  else r.pity += cards.filter((c) => c.rarity === "common").length;
}

/** Rare boons for some towers (events, blessing). */
export function rareBoons(r: Run, n: number, towers: TowerId[] = r.loadout.towers, rarity: Rarity = "rare"): Card[] {
  const g = rng(r, "reward");
  const avoid = new Set<string>();
  const out: Card[] = [];
  for (let i = 0; i < n; i++) {
    const c = pickBoon(r, g, towers, () => 1, rarity, avoid, false);
    if (!c) break;
    avoid.add(cardKey(c)); out.push(c);
  }
  return out;
}

/** A random boon from a rarity table for one of these towers (gambles, Sphinx, Bees). */
export function randomBoon(r: Run, g: Rng, towers: TowerId[], table: Weights): Card | null {
  return pickBoon(r, g, towers, () => 1, rollRarity(g, table, 0), new Set(), false);
}

export const boonDef = (id: BoonId) => BOON[id];
