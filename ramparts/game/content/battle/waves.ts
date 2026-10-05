// Wave archetypes, per-act weights, unlocks, battle themes, bounty conditions
// (content.md 6 and 11.4, systems 9.5, Revision 1 R2/R13/R24).
import type { Act, EnemyId } from "../../types.ts";

export type ArchId =
  | "march" | "rush" | "armoured" | "swarm" | "airswarm" | "warded" | "shieldwall"
  | "healer" | "slime" | "stealth" | "siege" | "skyraid" | "twofronts" | "grand";

export interface ArchDef {
  id: ArchId;
  name: string;
  core: EnemyId | null;
  min: number;
  weights: Partial<Record<EnemyId, number>>;
  spacing: number;
  /** Group gap override (clumped archetypes). */
  gap?: number;
  asks: string;
}

export const ARCHETYPES: Record<ArchId, ArchDef> = {
  march: { id: "march", name: "March", core: "footman", min: 1, weights: { footman: 70, runner: 15, brute: 15 }, spacing: 0.8, asks: "coverage" },
  rush: { id: "rush", name: "Rush", core: "runner", min: 1, weights: { runner: 60, swarmling: 30, footman: 10 }, spacing: 0.35, asks: "slows, blockers, fast towers" },
  armoured: { id: "armoured", name: "Armoured push", core: "brute", min: 2, weights: { brute: 45, shieldbearer: 20, footman: 35 }, spacing: 1.0, asks: "magic, shred, pierce, fire" },
  swarm: { id: "swarm", name: "Swarm", core: "swarmling", min: 12, weights: { swarmling: 70, runner: 15, footman: 15 }, spacing: 0.25, asks: "area damage" },
  airswarm: { id: "airswarm", name: "Air swarm", core: "bat", min: 6, weights: { bat: 75, footman: 25 }, spacing: 0.4, asks: "air reach" },
  warded: { id: "warded", name: "Warded column", core: "acolyte", min: 3, weights: { acolyte: 55, footman: 30, shaman: 15 }, spacing: 0.9, asks: "physical, fire" },
  shieldwall: { id: "shieldwall", name: "Shield wall", core: "shieldbearer", min: 2, weights: { shieldbearer: 30, brute: 35, footman: 35 }, spacing: 0.9, gap: 1.0, asks: "Storm, Hexer, focus" },
  healer: { id: "healer", name: "Healer ball", core: "shaman", min: 2, weights: { shaman: 25, acolyte: 25, footman: 50 }, spacing: 0.6, gap: 1.0, asks: "Hexer, burst, splash" },
  slime: { id: "slime", name: "Slime flood", core: "splitter", min: 3, weights: { splitter: 60, swarmling: 40 }, spacing: 1.0, asks: "splash after the split" },
  stealth: { id: "stealth", name: "Stealth raid", core: "shade", min: 4, weights: { shade: 60, sapper: 25, runner: 15 }, spacing: 0.9, asks: "reveal, area" },
  siege: { id: "siege", name: "Siege", core: "sapper", min: 2, weights: { sapper: 35, brute: 35, shieldbearer: 30 }, spacing: 1.0, asks: "blocking, spreading out" },
  skyraid: { id: "skyraid", name: "Sky raid", core: "drake", min: 1, weights: { drake: 50, bat: 50 }, spacing: 1.2, asks: "big air" },
  twofronts: { id: "twofronts", name: "Two fronts", core: null, min: 0, weights: {}, spacing: 0, asks: "covering both lanes" },
  grand: { id: "grand", name: "Grand assault", core: null, min: 0, weights: {}, spacing: 0.6, asks: "everything" },
};

/** Weighted picks per act (content 6.4). Air swarm in act I is placed by the guarantee only. */
export const ARCH_WEIGHTS: Record<Act, Partial<Record<ArchId, number>>> = {
  1: { march: 30, rush: 20, armoured: 18, swarm: 15, warded: 9, shieldwall: 5, healer: 3 },
  2: { march: 10, rush: 10, armoured: 13, swarm: 8, airswarm: 8, warded: 12, shieldwall: 8, healer: 6, slime: 8, stealth: 7, siege: 6, skyraid: 6, twofronts: 8 },
  3: { march: 6, rush: 9, armoured: 12, swarm: 9, airswarm: 8, warded: 11, shieldwall: 10, healer: 8, slime: 8, stealth: 8, siege: 8, skyraid: 8, twofronts: 10 },
  4: { march: 5, rush: 8, armoured: 12, swarm: 8, airswarm: 9, warded: 11, shieldwall: 10, healer: 8, slime: 7, stealth: 8, siege: 9, skyraid: 12, twofronts: 10 },
};

const NEVER = 99;
type Unlock = Partial<Record<EnemyId, number>>;
const ALL1: Unlock = { footman: 1, runner: 1, brute: 1, swarmling: 1, acolyte: 1, bat: 1, shieldbearer: 1, shaman: 1, splitter: 1, drake: 1, shade: 1, sapper: 1 };

/** Earliest wave (1-based) a role may appear, by act and floor (content 6.2). */
export function unlockWave(act: Act, floor: number, role: EnemyId): number {
  let u: Unlock;
  if (act === 1) {
    if (floor <= 1) u = { footman: 1, runner: 2, brute: 3, swarmling: 4, acolyte: 5 };
    else if (floor === 2) u = { footman: 1, runner: 2, brute: 3, swarmling: 3, acolyte: 5, bat: 4, shieldbearer: 6 };
    else u = { footman: 1, runner: 2, brute: 3, swarmling: 3, acolyte: 5, bat: 4, shieldbearer: 6, shaman: 7 };
  } else if (act === 2) {
    const base: Unlock = { footman: 1, runner: 1, brute: 1, swarmling: 1, acolyte: 1, bat: 1, shieldbearer: 1, shaman: 2 };
    if (floor <= 1) u = { ...base, splitter: 2, drake: 4 };
    else if (floor === 2) u = { ...base, splitter: 2, drake: 4, shade: 3 };
    else u = { ...base, splitter: 1, drake: 3, shade: 2, sapper: 3 };
  } else u = ALL1;
  return u[role] ?? NEVER;
}

/** Act I battles on floors 2-3 cap bats per wave (R2). */
export const ACT1_BAT_CAP = 10;

/** Theme archetypes (R24): themes live in game/content/run; a battle gets their two archetype ids. */
export function themeArchetypes(ids: readonly string[] | undefined): ArchId[] {
  return (ids ?? []).map((x) => x.toLowerCase()).filter((x): x is ArchId => x in ARCHETYPES && x !== "grand" && x !== "twofronts");
}

/** Bounty conditions (content 11.4), ids per the id rule. */
export const BOUNTIES: Record<string, { name: string; line: string }> = {
  "clean-sweep": { name: "Clean Sweep", line: "Lose no lives." },
  "few-hands": { name: "Few Hands", line: "Build on at most 5 pads." },
  "no-sell": { name: "No Sell", line: "Never sell a tower." },
  "quick-march": { name: "Quick March", line: "Call at least 5 waves early." },
  "old-ways": { name: "Old Ways", line: "Cast no spell." },
  "lean-purse": { name: "Lean Purse", line: "Never hold more than 300 gold." },
  "single-file": { name: "Single File", line: "Use at most 3 different towers." },
  "hold-the-gate": { name: "Hold the Gate", line: "Let nothing reach the last third of the road." },
};
