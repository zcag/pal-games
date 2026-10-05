// Curses (content.md 9 with R14's numbers). Debt and Toll are run-layer; the rest act in battle.
import type { CurseId } from "../../types.ts";

export interface CurseDef { id: CurseId; name: string; text: string; flavour: string }

export const CURSES: CurseDef[] = [
  { id: "debt", name: "Debt", text: "Lose 10 crowns after each battle (never below 0).", flavour: "The vault keeps its own accounts." },
  { id: "doubt", name: "Doubt", text: "Setup is timed: wave 1 starts by itself 20 s after a battle opens.", flavour: "No time to think it through." },
  { id: "haunted", name: "Haunted", text: "A shade joins waves 3, 6 and 9 of every battle.", flavour: "Something follows you from camp to camp." },
  { id: "rust", name: "Rust", text: "L3 upgrades cost 20% more.", flavour: "Everything you build creaks a little." },
  { id: "leaking-roof", name: "Leaking Roof", text: "Every enemy that gets through costs 1 more life, up to 3 more a battle.", flavour: "Always the same corner." },
  { id: "cold-hands", name: "Cold Hands", text: "Your first tower each battle costs 50% more.", flavour: "Fingers that won't work in the morning." },
  { id: "dread", name: "Dread", text: "Bosses start with 15% more health.", flavour: "They've heard you're coming." },
  { id: "toll", name: "Toll", text: "Entering a shop costs 15 crowns (all you have, if less).", flavour: "There's a man at every gate now." },
];

export const CURSE: Record<CurseId, CurseDef> = Object.fromEntries(CURSES.map((c) => [c.id, c]));

export const DEBT_CROWNS = 10;
export const TOLL_CROWNS = 15;
