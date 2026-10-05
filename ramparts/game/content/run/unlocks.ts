// The renown unlock track, perks and renown sources (content.md 13 with R16 and R27).
import type { CommanderId, EventId, RelicId, TowerId } from "../../types.ts";

export type UnlockItem =
  | { kind: "tower"; tower: TowerId }
  | { kind: "relics"; relics: RelicId[] }
  | { kind: "perk"; perk: string }
  | { kind: "commander"; commander: CommanderId }
  | { kind: "events"; events: EventId[] }
  | { kind: "title"; title: string };

export interface UnlockDef { name: string; item: UnlockItem }

/** Total renown for each level, 1-20. */
export const LEVELS = [25, 60, 100, 150, 210, 280, 360, 450, 550, 660, 780, 910, 1050, 1200, 1360, 1530, 1710, 1900, 2100, 2310];

/** The track in order (content.md 13.2 with R27: the Warden at level 6 brings the Thornwood Grove, so
 *  the later items move up one). A level unlocks the next item that is not already unlocked. */
export const UNLOCKS: UnlockDef[] = [
  { name: "Alchemist", item: { kind: "tower", tower: "alchemist" } },
  { name: "Black Ice, Long Fuse, Wildfire Crown", item: { kind: "relics", relics: ["black-ice", "long-fuse", "wildfire-crown"] } },
  { name: "Thick Walls", item: { kind: "perk", perk: "thick-walls" } },
  { name: "The Alchemist", item: { kind: "commander", commander: "alchemist" } },
  { name: "Storm Spire", item: { kind: "tower", tower: "storm" } },
  { name: "The Warden", item: { kind: "commander", commander: "warden" } },
  { name: "The Wandering Merchant, the Ruined Chapel", item: { kind: "events", events: ["the-wandering-merchant", "the-ruined-chapel"] } },
  { name: "Second Look", item: { kind: "perk", perk: "second-look" } },
  { name: "Beacon", item: { kind: "tower", tower: "beacon" } },
  { name: "Prism Lens, Twin Crests, Storm Glass, Deadeye's Oath", item: { kind: "relics", relics: ["prism-lens", "twin-crests", "storm-glass", "deadeyes-oath"] } },
  { name: "Scout", item: { kind: "perk", perk: "scout" } },
  { name: "War Banner", item: { kind: "tower", tower: "banner" } },
  { name: "The Quartermaster", item: { kind: "commander", commander: "quartermaster" } },
  { name: "Ballista", item: { kind: "tower", tower: "ballista" } },
  { name: "Old Oak Seed, Cold Iron, Seven Bells, Crowded Banners, Overclock", item: { kind: "relics", relics: ["old-oak-seed", "cold-iron", "seven-bells", "crowded-banners", "overclock"] } },
  { name: "Strike Off", item: { kind: "perk", perk: "strike-off" } },
  { name: "Nest Egg", item: { kind: "perk", perk: "nest-egg" } },
  { name: "Tidewater Vial, Pact of Embers, Bellows, Dragonglass", item: { kind: "relics", relics: ["tidewater-vial", "pact-of-embers", "bellows", "dragonglass"] } },
  { name: "Thicker Walls", item: { kind: "perk", perk: "thicker-walls" } },
  { name: "Warden of the Ramparts", item: { kind: "title", title: "Warden of the Ramparts" } },
];

export interface PerkDef { id: string; name: string; text: string; line: string }

export const PERKS: PerkDef[] = [
  { id: "thick-walls", name: "Thick Walls", text: "+2 max lives.", line: "Stone on stone." },
  { id: "second-look", name: "Second Look", text: "One card reroll per act.", line: "Let me see that again." },
  { id: "scout", name: "Scout", text: "Camp option: see the next act's map now.", line: "Send a rider ahead." },
  { id: "strike-off", name: "Strike Off", text: "Once per act, cross a card off for the rest of the run.", line: "Not that one. Never that one." },
  { id: "nest-egg", name: "Nest Egg", text: "+25 starting crowns.", line: "Put a little aside." },
  { id: "thicker-walls", name: "Thicker Walls", text: "+2 max lives.", line: "And another course of stone." },
];

/** Renown sources (content.md 13.1). */
export const RENOWN = {
  floor: 2, elite: 6, actBoss: 15, finalBoss: 30, bounty: 2, cleanActI: 5, firstBoss: 10, firstWin: 20,
};

/** Milestones off the track (R27). */
export const MILESTONES = [
  { id: "seer", name: "The Seer", text: "Reach act III once." },
  { id: "ascension", name: "Ascension", text: "Win a run with a commander to unlock its next ascension." },
];
