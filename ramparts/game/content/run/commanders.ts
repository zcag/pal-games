// Commanders (content.md 7.1, R27: the Seer starts with Archer; the Warden unlocks at renown level 6).
import type { CommanderId, RelicId, SpellId, TowerId } from "../../types.ts";

export interface CommanderDef {
  id: CommanderId;
  name: string;
  title: string;
  /** Card line and flavour. */
  line: string;
  flavour: string;
  towers: TowerId[];
  relic: RelicId;
  passive: { id: string; name: string; text: string };
  spells: { Q: SpellId; W: SpellId };
  /** How it unlocks, in words (the codex shows this). */
  unlock: string;
  /** Towers it brings unlocked with it. */
  brings: TowerId[];
  difficulty: string;
  playsAs: string;
}

export const COMMANDERS: Record<CommanderId, CommanderDef> = {
  marshal: {
    id: "marshal", name: "The Marshal", title: "Marshal of the Ramparts",
    line: "Every kind of damage, and spells that fix mistakes.",
    flavour: "She has lost battles. Never twice the same way.",
    towers: ["archer", "barracks", "mage"], relic: "old-standard",
    passive: { id: "drillmaster", name: "Drillmaster", text: "The first upgrade you buy each battle is free (not a specialisation)." },
    spells: { Q: "reinforcements", W: "meteor" }, unlock: "Open from the start.", brings: [],
    difficulty: "easy", playsAs: "balanced, learn-the-game",
  },
  alchemist: {
    id: "alchemist", name: "The Alchemist", title: "Keeper of the Still",
    line: "Oil and fire from the first battle. Find air cover.",
    flavour: "He has fewer eyebrows every year.",
    towers: ["alchemist", "pyre", "bombard"], relic: "bubbling-retort",
    passive: { id: "volatile", name: "Volatile", text: "Oiled enemies take 15% more fire damage; burning kills give 1 more gold." },
    spells: { Q: "firebomb", W: "tarpit" }, unlock: "Renown level 4.", brings: ["alchemist"],
    difficulty: "medium", playsAs: "area denial, combo",
  },
  seer: {
    id: "seer", name: "The Seer", title: "Who Saw It Coming",
    line: "Sees what is coming and stops time.",
    flavour: "She saw this war before it started.",
    towers: ["mage", "frost", "archer"], relic: "third-eye",
    passive: { id: "foresight", name: "Foresight", text: "See who is coming at every battle and elite on the map; the next-wave skull shows two waves." },
    spells: { Q: "stillness", W: "judgement" }, unlock: "Reach act III once.", brings: ["beacon"],
    difficulty: "medium", playsAs: "control, knowledge",
  },
  quartermaster: {
    id: "quartermaster", name: "The Quartermaster", title: "Master of Stores",
    line: "Gold now, gold later, if you can hold.",
    flavour: "Every arrow has a price, and he knows it.",
    towers: ["archer", "bombard", "banner"], relic: "ledger",
    passive: { id: "supply-lines", name: "Supply Lines", text: "Shop prices 15% lower; +3 crowns after every battle." },
    spells: { Q: "requisition", W: "rally" }, unlock: "Renown level 12.", brings: ["banner"],
    difficulty: "hard", playsAs: "greed, tempo",
  },
  warden: {
    id: "warden", name: "The Warden", title: "Forester of the March",
    line: "Nothing gets through, on foot or on the wing.",
    flavour: "He was a forester before the war. He still is.",
    towers: ["barracks", "thornwood", "archer"], relic: "heartwood",
    passive: { id: "deep-roots", name: "Deep Roots", text: "Soldiers heal soon after a fight; an enemy held for 3 s is revealed and marked." },
    spells: { Q: "barrier", W: "bramblesurge" }, unlock: "Renown level 6.", brings: ["thornwood"],
    difficulty: "easy-medium", playsAs: "hold the line",
  },
};

export const COMMANDER_IDS: CommanderId[] = ["marshal", "alchemist", "seer", "quartermaster", "warden"];
