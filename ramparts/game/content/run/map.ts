// What the act map shows on its nodes: bosses (R21), elites and affixes (content.md 4.4, R26),
// bounties (11.4), named battle themes (R24) and the archetypes they lean on (6.3).
import type { Act, BossId, EnemyId } from "../../types.ts";
import type { ArchId } from "../battle/waves.ts";

export interface BossInfo { id: BossId; name: string; act: Act; line: string }

export const BOSSES_BY_ACT: Record<Act, BossId[]> = {
  1: ["gorrak", "hivequeen"], 2: ["wyrm", "lich"], 3: ["colossus", "packlord"], 4: ["tyrant"],
};

export const BOSS_INFO: Record<BossId, BossInfo> = {
  gorrak: { id: "gorrak", name: "Gorrak the Warlord", act: 1, line: "War cry speeds nearby enemies. Calls footmen at two thirds health." },
  hivequeen: { id: "hivequeen", name: "The Hive Queen", act: 1, line: "Births bats and swarmlings as she walks. Her brood bursts from the road ahead." },
  wyrm: { id: "wyrm", name: "The Sand Wyrm", act: 2, line: "Burrows under your towers and bursts out. Calls a sandstorm at half health." },
  lich: { id: "lich", name: "The Lich", act: 2, line: "Raises fallen enemies near it. Wraps itself in bone that lightning and hexes break." },
  colossus: { id: "colossus", name: "The Frost Colossus", act: 3, line: "Stomps freeze nearby towers. Grows ice armour that lightning and fire break." },
  packlord: { id: "packlord", name: "The Pack-Lord", act: 3, line: "Howls to speed its pack and call more. Leaps ahead along the road." },
  tyrant: { id: "tyrant", name: "The Ember Tyrant", act: 4, line: "Breathes fire on your towers. Takes to the air: bring air defence." },
};

/** A10's champion is one of the act I-III bosses rolled for this run's acts (content.md 5.6). */
export const CHAMPION_NAME = (boss: string) => `Champion of the Citadel: ${boss}`;

export const ELITES: EnemyId[] = ["juggernaut", "warlock", "matron"];
export const ELITE_NAMES: Partial<Record<EnemyId, string>> = { juggernaut: "Juggernaut", warlock: "Warlock", matron: "Matron" };
export const ELITE_WEIGHTS: Record<Act, [number, number, number]> = {
  1: [35, 35, 30], 2: [33, 33, 34], 3: [33, 33, 34], 4: [34, 33, 33],
};
export const ELITE_AFFIXES_BY_ACT: Record<Act, number> = { 1: 0, 2: 1, 3: 1, 4: 2 };

export interface AffixInfo { id: string; name: string; text: string; notOn?: EnemyId[] }
export const AFFIXES: AffixInfo[] = [
  { id: "hasted", name: "Hasted", text: "40% faster." },
  { id: "vengeful", name: "Vengeful", text: "On death, disables the nearest tower for 4 s." },
  { id: "regenerating", name: "Regenerating", text: "Heals when left alone." },
  { id: "plated", name: "Plated", text: "Heavier armour." },
  { id: "runed", name: "Runed", text: "Stronger ward." },
  { id: "warleader", name: "Warleader", text: "Nearby allies move 20% faster." },
  { id: "brood", name: "Brood", text: "Drops footmen as it is hurt.", notOn: ["matron"] },
];

/** Normal battles in acts III-IV on F4-F5, and the Ash Road, carry an elite this often (content.md 4.4). */
export const BATTLE_ELITE_CHANCE = 0.3;

export interface BountyInfo { id: string; name: string; line: string }
export const BOUNTIES: BountyInfo[] = [
  { id: "clean-sweep", name: "Clean Sweep", line: "Lose no lives." },
  { id: "few-hands", name: "Few Hands", line: "Build on at most 5 spots." },
  { id: "no-sell", name: "No Sell", line: "Never sell a tower." },
  { id: "quick-march", name: "Quick March", line: "Call at least 5 waves early." },
  { id: "old-ways", name: "Old Ways", line: "Cast no spell." },
  { id: "lean-purse", name: "Lean Purse", line: "Never hold more than 300 gold." },
  { id: "single-file", name: "Single File", line: "Use at most 3 different towers." },
  { id: "hold-the-gate", name: "Hold the Gate", line: "Let nothing reach the last third of the road." },
];

/** Wave archetypes (content.md 6.3), keyed by battle's archetype ids: the word a node line uses,
 *  the core role that gates them and the roles they send. */
export const ARCHETYPES: Partial<Record<ArchId, { name: string; core: EnemyId; roles: EnemyId[] }>> = {
  "march": { name: "march", core: "footman", roles: ["footman", "runner", "brute"] },
  "rush": { name: "rush", core: "runner", roles: ["runner", "swarmling", "footman"] },
  "armoured": { name: "armour", core: "brute", roles: ["brute", "shieldbearer", "footman"] },
  "swarm": { name: "swarm", core: "swarmling", roles: ["swarmling", "runner", "footman"] },
  "airswarm": { name: "bats", core: "bat", roles: ["bat", "footman"] },
  "warded": { name: "wards", core: "acolyte", roles: ["acolyte", "footman", "shaman"] },
  "shieldwall": { name: "shields", core: "shieldbearer", roles: ["shieldbearer", "brute", "footman"] },
  "healer": { name: "healers", core: "shaman", roles: ["shaman", "acolyte", "footman"] },
  "slime": { name: "slimes", core: "splitter", roles: ["splitter", "swarmling"] },
  "stealth": { name: "stealth", core: "shade", roles: ["shade", "sapper", "runner"] },
  "siege": { name: "sappers", core: "sapper", roles: ["sapper", "brute", "shieldbearer"] },
  "skyraid": { name: "drakes", core: "drake", roles: ["drake", "bat"] },
};

/** First floor of each act a role may appear on (content.md 6.2, ignoring the per-wave gate). */
export const ROLE_FLOOR: Record<Act, Partial<Record<EnemyId, number>>> = {
  1: { footman: 1, runner: 1, brute: 1, acolyte: 1, swarmling: 2, bat: 2, shieldbearer: 2, shaman: 3 },
  2: { footman: 1, runner: 1, brute: 1, acolyte: 1, swarmling: 1, bat: 1, shieldbearer: 1, shaman: 1, splitter: 1, drake: 1, shade: 2, sapper: 3 },
  3: { footman: 1, runner: 1, brute: 1, acolyte: 1, swarmling: 1, bat: 1, shieldbearer: 1, shaman: 1, splitter: 1, drake: 1, shade: 1, sapper: 1 },
  4: { footman: 1, runner: 1, brute: 1, acolyte: 1, swarmling: 1, bat: 1, shieldbearer: 1, shaman: 1, splitter: 1, drake: 1, shade: 1, sapper: 1 },
};

export interface ThemeDef { id: string; name: string; archetypes: [ArchId, ArchId]; line: string }

const T = (name: string, a: ArchId, b: ArchId, line: string): ThemeDef =>
  ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, archetypes: [a, b], line });

/** Named battle themes per act (content.md 6.7, R24): two archetypes at x3 weight, shown on the node. */
export const BATTLE_THEMES: Record<Act, ThemeDef[]> = {
  1: [
    T("Raiders", "rush", "swarm", "Raiders: rush and swarm."),
    T("Vanguard", "march", "armoured", "Vanguard: a long column with brutes."),
    T("Iron Line", "armoured", "shieldwall", "Iron Line: armour and shields."),
    T("Hedge Coven", "warded", "healer", "Hedge Coven: wards and healers."),
    T("Levy", "march", "rush", "Levy: many feet, little armour."),
  ],
  2: [
    T("Tomb Robbers", "stealth", "siege", "Tomb Robbers: unseen, with charges."),
    T("Sun Court", "warded", "healer", "Sun Court: wards and healers."),
    T("Bronze Legion", "armoured", "shieldwall", "Bronze Legion: heavy plate."),
    T("Sky Hunters", "skyraid", "airswarm", "Sky Hunters: drakes and bats."),
    T("Sand Flood", "slime", "swarm", "Sand Flood: slimes and swarms."),
  ],
  3: [
    T("Avalanche", "rush", "slime", "Avalanche: fast and many."),
    T("Night Raid", "stealth", "rush", "Night Raid: hidden and quick."),
    T("Iron Pass", "shieldwall", "siege", "Iron Pass: shields and sappers."),
    T("Frost Wings", "skyraid", "airswarm", "Frost Wings: the sky is full."),
    T("Ice Coven", "warded", "healer", "Ice Coven: wards and healers."),
  ],
  4: [
    T("Ash Wings", "skyraid", "airswarm", "Ash Wings: the sky is full."),
    T("Obsidian Legion", "armoured", "shieldwall", "Obsidian Legion: heavy plate."),
    T("Cinder Swarm", "swarm", "slime", "Cinder Swarm: slimes and swarms."),
    T("Smoke Raid", "stealth", "siege", "Smoke Raid: unseen, with charges."),
    T("Ember Coven", "warded", "healer", "Ember Coven: wards and healers."),
  ],
};

/** Act IV's fixed node names. */
export const ACT4_NAMES = { road: "The Ash Road", gate: "The Gatehouse", camp: "The Last Camp" };

export const ACT_NAMES: Record<Act, string> = { 1: "The Meadow", 2: "The Desert Ruins", 3: "The Frozen Peaks", 4: "The Ember Citadel" };
