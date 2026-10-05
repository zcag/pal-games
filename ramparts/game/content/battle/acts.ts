// Per-act numbers (content.md 1, systems 0, Revision 1 R13/R15/R17).
import type { Act, BossId, EnemyId } from "../../types.ts";

export interface ActDef {
  act: Act;
  name: string;
  mood: string;
  hpMul: number;
  bountyMul: number;
  spellMul: number;
  /** Threat base B (wave 1). */
  B: number;
  startGold: number;
  interestCap: number;
  /** Wave counts (R13): normal battle, elite node, pre-boss waves of a boss battle. */
  waves: { battle: number; elite: number; boss: number };
  /** Countdown between waves, seconds. */
  countdown: number;
  trait: { id: string; name: string; line: string } | null;
  /** Bosses this act can roll (R21); the first is the classic one. */
  bosses: BossId[];
  pads: [number, number];
  pathLen: [number, number];
  /** Per-wave cap on swarmlings and bats (content 6.1 step 5). */
  smallCap: number;
  /** Leftover gold per crown (R17). */
  goldPerCrown: number;
  /** Names of each role in this act (content 4.3); missing = the role's base name. */
  names: Partial<Record<EnemyId, string>>;
}

export const ACTS: Record<Act, ActDef> = {
  1: {
    act: 1, name: "The Meadow", mood: "Hay, wildflowers and an old road. The calm before.",
    hpMul: 1.0, bountyMul: 1.0, spellMul: 1.0, B: 10, startGold: 340, interestCap: 20,
    waves: { battle: 7, elite: 8, boss: 7 }, countdown: 10, trait: null,
    bosses: ["gorrak", "hivequeen"], pads: [9, 11], pathLen: [48, 58], smallCap: 20, goldPerCrown: 10,
    names: { footman: "Raider", runner: "Cutpurse", brute: "Bruiser", acolyte: "Hedge Acolyte", shieldbearer: "Shieldbearer", shaman: "Hedge Witch", swarmling: "Grub", bat: "Crow", juggernaut: "Ram Golem", warlock: "Hedge Warlock", matron: "Brood Mother" },
  },
  2: {
    act: 2, name: "The Desert Ruins", mood: "Bleached stone and a buried empire, under a white sun.",
    hpMul: 1.0, bountyMul: 1.45, spellMul: 1.0, B: 14, startGold: 330, interestCap: 25,
    waves: { battle: 8, elite: 9, boss: 7 }, countdown: 10,
    trait: { id: "sun-hardened", name: "Sun-hardened", line: "Sun-hardened: their brutes and shieldbearers wear heavier armour." },
    bosses: ["wyrm", "lich"], pads: [10, 12], pathLen: [46, 56], smallCap: 28, goldPerCrown: 14,
    names: { footman: "Sandstrider", runner: "Dune Runner", brute: "Tomb Guard", acolyte: "Sun Priest", shieldbearer: "Bronze Shield", shaman: "Sand Shaman", splitter: "Sand Jelly", slime: "Jelly", slimelet: "Jellet", shade: "Mirage", swarmling: "Scarab", sapper: "Tomb Sapper", bat: "Carrion Bat", drake: "Sand Drake", juggernaut: "Bronze Juggernaut", warlock: "Tomb Warlock", matron: "Scarab Queen", sandling: "Jelly" },
  },
  3: {
    act: 3, name: "The Frozen Peaks", mood: "Thin air, pale noon, and snow that never melts.",
    hpMul: 1.1, bountyMul: 1.6, spellMul: 1.1, B: 19, startGold: 400, interestCap: 30,
    waves: { battle: 9, elite: 10, boss: 7 }, countdown: 9,
    trait: { id: "cold-blooded", name: "Cold-blooded", line: "Cold-blooded: they chill slowly and burn easily." },
    bosses: ["colossus", "packlord"], pads: [11, 13], pathLen: [44, 54], smallCap: 36, goldPerCrown: 18,
    names: { footman: "Hillman", runner: "Ridge Runner", brute: "Ice Brute", acolyte: "Rime Acolyte", shieldbearer: "Glacier Shield", shaman: "Antler Shaman", splitter: "Ice Ooze", slime: "Ooze", slimelet: "Oozelet", shade: "Wraith", swarmling: "Ice Mite", sapper: "Powder Sapper", bat: "Frost Bat", drake: "Frost Drake", juggernaut: "Ice Juggernaut", warlock: "Rime Warlock", matron: "Mite Queen" },
  },
  4: {
    act: 4, name: "The Ember Citadel", mood: "Ash on the wind. The enemy's own door.",
    hpMul: 1.25, bountyMul: 1.75, spellMul: 1.25, B: 24, startGold: 470, interestCap: 35,
    waves: { battle: 9, elite: 10, boss: 8 }, countdown: 9,
    trait: { id: "fireproof", name: "Fireproof", line: "Fireproof: they shrug off fire, but the cold bites them." },
    bosses: ["tyrant"], pads: [12, 14], pathLen: [42, 52], smallCap: 36, goldPerCrown: 22,
    names: { footman: "Cinderguard", runner: "Ember Runner", brute: "Obsidian Brute", acolyte: "Ash Acolyte", shieldbearer: "Bone Shield", shaman: "Ash Shaman", splitter: "Magma Slime", slime: "Slime", slimelet: "Slimelet", shade: "Smoke Shade", swarmling: "Cinder Imp", sapper: "Fire Sapper", bat: "Ash Bat", drake: "Ember Drake", juggernaut: "Obsidian Juggernaut", warlock: "Ash Warlock", matron: "Cinder Matron" },
  },
};

/** Act IV natives' fireproofing (R15), the Tyrant's own. */
export const ACT4_FIREPROOF = 25;
export const TYRANT_FIREPROOF = 30;

/** Floor factor on the whole threat budget (content 1). */
export function floorFactor(act: Act, floor: number, boss: boolean): number {
  if (boss) return 1.0;
  if (act === 4) return 1.05;
  return [0.9, 0.95, 1.0, 1.05, 1.1][Math.max(0, Math.min(4, floor - 1))]!;
}

/** Chill gained multiplier by act trait (systems 9.4). */
export function chillMul(act: Act): number { return act === 3 ? 0.75 : act === 4 ? 1.25 : 1; }
/** Fire taken multiplier by act trait (act III cold-blooded). */
export function fireTakenMul(act: Act): number { return act === 3 ? 1.2 : 1; }
