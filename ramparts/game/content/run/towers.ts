// Run-side facts about towers: names for card text, blueprint rarity, draft partners, air reach.
// Battle numbers live in game/content/battle; this is only what the draft needs (content.md 2.1,
// run-meta.md 3).
import type { Rarity, TowerId } from "../../types.ts";

export interface TowerCard {
  id: TowerId;
  name: string;
  /** Blueprint rarity (content.md 2.1 / reconciliation 18). */
  rarity: Rarity;
  /** Synergy partners for blueprint weighting (run-meta.md 3). */
  partners: TowerId[];
  /** Can shoot flyers from L1 (R2's air list, plus Ballista). */
  air: boolean;
  /** Build menu line (content.md 2.1). */
  line: string;
}

export const TOWER_IDS: TowerId[] = [
  "archer", "barracks", "mage", "bombard", "frost", "pyre",
  "alchemist", "storm", "beacon", "banner", "ballista", "thornwood",
];

/** Unlocked from the first run (run-meta.md 8). */
export const START_TOWERS: TowerId[] = ["archer", "barracks", "mage", "bombard", "frost", "pyre"];

/** R2: the air blueprints a commander without air reach is offered first. */
export const AIR_BLUEPRINTS: TowerId[] = ["archer", "mage", "frost", "storm"];

export const TOWERS: Record<TowerId, TowerCard> = {
  archer: { id: "archer", name: "Archer", rarity: "common", partners: ["beacon", "frost", "banner"], air: true, line: "Fast arrows at air and ground. Cheap and steady." },
  barracks: { id: "barracks", name: "Barracks", rarity: "common", partners: ["bombard", "pyre", "thornwood"], air: false, line: "Three soldiers block the road. Ground only." },
  mage: { id: "mage", name: "Mage", rarity: "common", partners: ["storm", "beacon"], air: true, line: "Magic bolts that ignore armour. Hits air too." },
  bombard: { id: "bombard", name: "Bombard", rarity: "common", partners: ["barracks", "frost", "alchemist"], air: false, line: "Slow shells that blast groups. Ground only." },
  frost: { id: "frost", name: "Frost Spire", rarity: "uncommon", partners: ["ballista", "bombard", "archer", "storm"], air: true, line: "Chills and freezes. Little damage, lots of time." },
  pyre: { id: "pyre", name: "Pyre", rarity: "uncommon", partners: ["alchemist", "barracks", "thornwood"], air: false, line: "Short flame cone. Fire ignores armour and ward." },
  alchemist: { id: "alchemist", name: "Alchemist", rarity: "uncommon", partners: ["pyre", "bombard", "barracks"], air: false, line: "Lobs oil: slows the road and feeds fire." },
  storm: { id: "storm", name: "Storm Spire", rarity: "rare", partners: ["frost", "mage", "beacon"], air: true, line: "Lightning jumps between enemies. Breaks shields." },
  beacon: { id: "beacon", name: "Beacon", rarity: "rare", partners: ["archer", "ballista", "mage"], air: false, line: "Shows hidden enemies and marks them for crits." },
  banner: { id: "banner", name: "War Banner", rarity: "uncommon", partners: ["archer", "mage", "ballista"], air: false, line: "Nearby towers attack faster. Deals no damage." },
  ballista: { id: "ballista", name: "Ballista", rarity: "rare", partners: ["frost", "beacon", "alchemist"], air: true, line: "Long-range bolts that punch through armour." },
  thornwood: { id: "thornwood", name: "Thornwood Grove", rarity: "uncommon", partners: ["barracks", "pyre", "bombard"], air: false, line: "Thorns hurt all nearby; roots hold one in place." },
};
