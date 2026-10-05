// Ascensions 1-10 (content.md 12 with R26: per commander; A6 and A7 replaced).
// Run-layer rules read the flags below; battle rules read `loadout.ascension`.
export interface AscensionDef {
  n: number;
  name: string;
  rule: string;
  line: string;
}

export const ASCENSIONS: AscensionDef[] = [
  { n: 1, name: "Hard Roads", rule: "Each act map gets one more elite; every path from the start to a shop passes an elite (an elite-free path still exists, without a shop).", line: "Shopping costs a fight." },
  { n: 2, name: "Lean Coffers", rule: "The gold interest cap is halved.", line: "Banking pays less." },
  { n: 3, name: "Veteran Foes", rule: "One wave per battle (from wave 3, never the last) carries an affix for all its enemies: Hasted, Plated, Runed or Many. Shown on the skull.", line: "Read the skull." },
  { n: 4, name: "Wounded", rule: "Start with 16 / 20 lives (Warden 22 / 26).", line: "You start hurt." },
  { n: 5, name: "Short Rest", rule: "Rest heals 25% of max lives; a boss heals a third of missing lives.", line: "Rest is shorter." },
  { n: 6, name: "Seasoned Elites", rule: "Every elite carries at least 2 affixes, from act I.", line: "Elites come prepared." },
  { n: 7, name: "Rubble", rule: "One build spot per map is rubble until you pay 60 gold to clear it.", line: "Clear the ground first." },
  { n: 8, name: "Ill Omen", rule: "Start the run with the curse Doubt.", line: "No time to set up." },
  { n: 9, name: "Swift Tides", rule: "The countdown between waves is 20% shorter; the call-early bonus is halved.", line: "Less time between waves." },
  { n: 10, name: "The Tyrant's Guard", rule: "Act IV's Last Camp becomes a battle against a champion of an earlier boss you did not meet, and the champion and the Tyrant carry their Fury; the Tyrant comes straight after.", line: "A second boss, no camp between." },
];

export const MAX_ASCENSION = 10;
export const RUBBLE_GOLD = 60;
