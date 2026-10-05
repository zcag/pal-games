// War supplies (R20, content.md 11.10): names, card text, rarity and shop price.
// Their battle effects are the battle agent's.
import type { Rarity, SupplyId } from "../../types.ts";

export interface SupplyDef { id: SupplyId; name: string; rarity: Rarity; price: number; text: string; flavour: string }

export const SUPPLIES: SupplyDef[] = [
  { id: "oil-barrel", name: "Oil Barrel", rarity: "common", price: 20, text: "An oil puddle (r 1.2) for 8 s: slows and oils what walks in.", flavour: "Roll it, crack it, step back." },
  { id: "gold-cache", name: "Gold Cache", rarity: "common", price: 20, text: "+60 gold (x gold).", flavour: "Buried by someone who meant to come back." },
  { id: "spike-trap", name: "Spike Trap", rarity: "common", price: 20, text: "The next 8 ground enemies to pass take 60 physical damage (x act).", flavour: "Mind the road." },
  { id: "lifeblood", name: "Lifeblood", rarity: "common", price: 20, text: "Heal 2 lives.", flavour: "Drink it before the fighting, not after." },
  { id: "frost-flask", name: "Frost Flask", rarity: "uncommon", price: 28, text: "Freeze every enemy within 1.5 u for 2 s.", flavour: "Winter, corked." },
  { id: "war-horn", name: "War Horn", rarity: "uncommon", price: 28, text: "All towers and soldiers attack 30% faster for 8 s.", flavour: "One long note, and every arm moves faster." },
  { id: "masons-kit", name: "Mason's Kit", rarity: "uncommon", price: 28, text: "Every disabled tower works again, at once.", flavour: "Hammer, wedge, and a stubborn man." },
  { id: "flare", name: "Flare", rarity: "uncommon", price: 28, text: "Reveal every stealthed enemy for 10 s.", flavour: "Red light, and nowhere to hide." },
  { id: "heavy-bolt", name: "Heavy Bolt", rarity: "rare", price: 35, text: "300 pure damage (x act) to the enemy with the most health.", flavour: "Saved for the one that matters." },
  { id: "bell", name: "Bell", rarity: "rare", price: 35, text: "Stun every enemy for 1.5 s.", flavour: "Everyone stops to look. Everyone." },
];

export const SUPPLY: Record<SupplyId, SupplyDef> = Object.fromEntries(SUPPLIES.map((s) => [s.id, s])) as Record<SupplyId, SupplyDef>;

/** Shop prices per supply (by rarity: 20 / 28 / 35). */
export const SUPPLY_SHOP: Record<SupplyId, number> = Object.fromEntries(SUPPLIES.map((s) => [s.id, s.price])) as Record<SupplyId, number>;

/** Random draws (elites, treasure, events, the blessing, the shop): common 50, uncommon 35, rare 15. */
export const SUPPLY_RARITY: Partial<Record<Rarity, number>> = { common: 50, uncommon: 35, rare: 15 };

export const SUPPLY_SLOTS = 2;
