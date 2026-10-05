// The run-start blessing (R23, content.md 11.11): pick 1 of 3 drawn from six. After a commander's
// first win, its next run adds a rare relic card (R27). Run 1's three are fixed.
export interface BlessingDef { id: string; name: string; text: string }

export const BLESSINGS: BlessingDef[] = [
  { id: "relic", name: "A Relic", text: "A common relic." },
  { id: "blueprint", name: "A Fourth Tower", text: "A tower card you don't start with, on key 4." },
  { id: "swap", name: "Trade a Tower", text: "Give up one starting tower; choose a rare boon for one of the other two." },
  { id: "lives", name: "Strong Walls", text: "+8 max lives, healed." },
  { id: "crowns", name: "A Full Purse", text: "+60 crowns." },
  { id: "supplies", name: "Supplies", text: "Two war supplies." },
];

export const RARE_BLESSING: BlessingDef = { id: "rare-relic", name: "A Victor's Gift", text: "Choose 1 of 3 rare relics." };

/** Run 1's fixed blessings. */
export const FIRST_RUN_BLESSINGS = ["relic:lucky-horseshoe", "lives", "crowns"];

export const BLESSING_LIVES = 8;
export const BLESSING_CROWNS = 60;
