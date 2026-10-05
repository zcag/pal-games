// Enemy roles (content.md 4, systems 9). Act I base numbers; HP scales with hpMul.
import type { EnemyId } from "../../types.ts";

export type SizeClass = "S" | "M" | "L" | "XL" | "boss";

export interface EnemyDef {
  id: EnemyId;
  name: string;
  line: string;
  hp: number;
  speed: number;
  armour: number;
  ward: number;
  threat: number;
  /** Flat bounty (children, summons), else round(threat x 5 x bountyMul). */
  bounty?: number;
  leak: number;
  /** Melee vs soldiers: damage per hit (x act), interval s. */
  melee: { dmg: number; int: number; magic?: boolean; cleave?: number } | null;
  freezeAt: number;
  flying: boolean;
  blockable: boolean;
  size: SizeClass;
  elite?: boolean;
  boss?: boolean;
  /** HP does not scale with hpMul (already final). */
  fixedHp?: boolean;
  /** Can't be chilled (ice shards). */
  noChill?: boolean;
  /** Preview badge traits. */
  traits: string[];
}

const E = (d: Omit<EnemyDef, "traits"> & { traits?: string[] }): EnemyDef => ({ traits: [], ...d });

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  footman: E({ id: "footman", name: "Footman", line: "Walks the road and fights whoever stops it.", hp: 60, speed: 1.1, armour: 0, ward: 0, threat: 1, leak: 1, melee: { dmg: 5, int: 1.0 }, freezeAt: 100, flying: false, blockable: true, size: "M" }),
  runner: E({ id: "runner", name: "Runner", line: "Fast and frail. Slips past soldiers for a moment.", hp: 35, speed: 2.0, armour: 0, ward: 0, threat: 1, leak: 1, melee: { dmg: 3, int: 0.8 }, freezeAt: 100, flying: false, blockable: true, size: "S" }),
  brute: E({ id: "brute", name: "Brute", line: "Heavy armour. Magic, fire and shred get through it.", hp: 240, speed: 0.7, armour: 45, ward: 0, threat: 3, leak: 2, melee: { dmg: 20, int: 1.5, cleave: 1 }, freezeAt: 150, flying: false, blockable: true, size: "L", traits: ["armour"] }),
  acolyte: E({ id: "acolyte", name: "Acolyte", line: "Wards turn aside magic. Arrows and fire do fine.", hp: 90, speed: 0.95, armour: 0, ward: 45, threat: 2, leak: 2, melee: { dmg: 6, int: 1.0, magic: true }, freezeAt: 100, flying: false, blockable: true, size: "M", traits: ["ward"] }),
  shieldbearer: E({ id: "shieldbearer", name: "Shieldbearer", line: "Shields nearby allies. Lightning breaks shields fast.", hp: 150, speed: 0.8, armour: 25, ward: 0, threat: 3, leak: 2, melee: { dmg: 8, int: 1.2 }, freezeAt: 150, flying: false, blockable: true, size: "L", traits: ["shield", "armour"] }),
  shaman: E({ id: "shaman", name: "Shaman", line: "Heals nearby allies. A hex stops the healing.", hp: 100, speed: 0.9, armour: 0, ward: 25, threat: 3, leak: 2, melee: { dmg: 4, int: 1.0 }, freezeAt: 100, flying: false, blockable: true, size: "M", traits: ["healer"] }),
  splitter: E({ id: "splitter", name: "Splitter", line: "Splits in two when it dies, and again.", hp: 110, speed: 0.8, armour: 0, ward: 0, threat: 3, leak: 2, melee: { dmg: 6, int: 1.0 }, freezeAt: 100, flying: false, blockable: true, size: "M" }),
  slime: E({ id: "slime", name: "Slime", line: "Half a splitter. It splits again.", hp: 40, speed: 1.1, armour: 0, ward: 0, threat: 0, bounty: 2, leak: 1, melee: { dmg: 4, int: 1.0 }, freezeAt: 60, flying: false, blockable: true, size: "S" }),
  slimelet: E({ id: "slimelet", name: "Slimelet", line: "The smallest piece.", hp: 12, speed: 1.4, armour: 0, ward: 0, threat: 0, bounty: 1, leak: 1, melee: { dmg: 2, int: 0.8 }, freezeAt: 60, flying: false, blockable: true, size: "S" }),
  shade: E({ id: "shade", name: "Shade", line: "Unseen until a Beacon finds it or it is hurt.", hp: 100, speed: 1.3, armour: 0, ward: 25, threat: 3, leak: 1, melee: { dmg: 8, int: 0.8 }, freezeAt: 100, flying: false, blockable: true, size: "M", traits: ["stealth"] }),
  swarmling: E({ id: "swarmling", name: "Swarmling", line: "Tiny and many. Splash and chains clear them.", hp: 14, speed: 1.5, armour: 0, ward: 0, threat: 0.3, bounty: 2, leak: 1, melee: { dmg: 2, int: 0.6 }, freezeAt: 60, flying: false, blockable: true, size: "S" }),
  sapper: E({ id: "sapper", name: "Sapper", line: "Stops by a tower and plants a charge. Block it.", hp: 110, speed: 1.2, armour: 25, ward: 0, threat: 3, leak: 2, melee: { dmg: 6, int: 1.0 }, freezeAt: 100, flying: false, blockable: true, size: "M", traits: ["armour"] }),
  bat: E({ id: "bat", name: "Bat", line: "Flies the short way. Only air towers reach it.", hp: 22, speed: 1.6, armour: 0, ward: 0, threat: 1, bounty: 3, leak: 1, melee: null, freezeAt: 60, flying: true, blockable: false, size: "S", traits: ["air"] }),
  drake: E({ id: "drake", name: "Drake", line: "A big flyer with light armour and wards.", hp: 420, speed: 0.8, armour: 25, ward: 25, threat: 6, leak: 2, melee: null, freezeAt: 150, flying: true, blockable: false, size: "L", traits: ["air", "armour", "ward"] }),
  juggernaut: E({ id: "juggernaut", name: "Juggernaut", line: "Can't be stopped, held, rooted or stunned.", hp: 900, speed: 0.6, armour: 65, ward: 0, threat: 15, leak: 3, melee: null, freezeAt: 250, flying: false, blockable: false, size: "XL", elite: true, traits: ["elite", "armour"] }),
  warlock: E({ id: "warlock", name: "Warlock", line: "Raises the dead. Stun it while it chants.", hp: 570, speed: 0.75, armour: 0, ward: 65, threat: 14, leak: 3, melee: { dmg: 15, int: 1.2, magic: true }, freezeAt: 250, flying: false, blockable: true, size: "L", elite: true, traits: ["elite", "ward"] }),
  matron: E({ id: "matron", name: "Matron", line: "Births swarmlings as she walks, and more when she dies.", hp: 720, speed: 0.6, armour: 25, ward: 25, threat: 14, leak: 3, melee: { dmg: 12, int: 1.0 }, freezeAt: 250, flying: false, blockable: true, size: "XL", elite: true, traits: ["elite"] }),
  risen: E({ id: "risen", name: "Risen", line: "Raised by a warlock. Weak, but there are three.", hp: 42, speed: 1.1, armour: 0, ward: 0, threat: 0, bounty: 1, leak: 1, melee: { dmg: 3.5, int: 1.0 }, freezeAt: 100, flying: false, blockable: true, size: "M" }),
  skeleton: E({ id: "skeleton", name: "Risen", line: "Raised by the Lich from those who fell.", hp: 42, speed: 1.1, armour: 0, ward: 0, threat: 0, bounty: 1, leak: 1, melee: { dmg: 4, int: 1.0 }, freezeAt: 100, flying: false, blockable: true, size: "M" }),
  shard: E({ id: "shard", name: "Ice Shard", line: "A splinter of the Colossus. Can't be chilled.", hp: 30, speed: 1.5, armour: 0, ward: 0, threat: 0, bounty: 2, leak: 1, melee: { dmg: 2, int: 0.6 }, freezeAt: 60, flying: false, blockable: true, size: "S", noChill: true }),
  sandling: E({ id: "sandling", name: "Sandling", line: "Spat out by the Wyrm.", hp: 40, speed: 1.1, armour: 0, ward: 0, threat: 0, bounty: 2, leak: 1, melee: { dmg: 4, int: 1.0 }, freezeAt: 60, flying: false, blockable: true, size: "S" }),
  brood: E({ id: "brood", name: "Broodling", line: "Bursts from the road ahead of the Hive Queen.", hp: 30, speed: 1.3, armour: 0, ward: 0, threat: 0, bounty: 1, leak: 1, melee: { dmg: 2, int: 0.8 }, freezeAt: 60, flying: false, blockable: true, size: "S" }),
  pup: E({ id: "pup", name: "Pup", line: "Runs with the Pack-Lord.", hp: 100, speed: 2.0, armour: 0, ward: 0, threat: 0, bounty: 1, leak: 1, melee: { dmg: 3, int: 0.8 }, freezeAt: 100, flying: false, blockable: true, size: "S" }),
  "ember-runner": E({ id: "ember-runner", name: "Ember Runner", line: "Cracks off the Tyrant's molten hide.", hp: 35, speed: 2.0, armour: 0, ward: 0, threat: 0, bounty: 5, leak: 1, melee: { dmg: 3, int: 0.8 }, freezeAt: 100, flying: false, blockable: true, size: "S" }),
  "ember-drake": E({ id: "ember-drake", name: "Ember Drake", line: "The Tyrant's brood, half grown.", hp: 210, speed: 0.8, armour: 25, ward: 25, threat: 0, bounty: 20, leak: 2, melee: null, freezeAt: 150, flying: true, blockable: false, size: "L", traits: ["air"] }),
  gorrak: E({ id: "gorrak", name: "Gorrak the Warlord", line: "War cry speeds nearby enemies. Calls footmen at two thirds health.", hp: 4000, speed: 0.45, armour: 30, ward: 0, threat: 0, bounty: 0, leak: 10, melee: { dmg: 60, int: 1.5, cleave: 1 }, freezeAt: 400, flying: false, blockable: true, size: "boss", boss: true, fixedHp: true, traits: ["boss", "armour"] }),
  wyrm: E({ id: "wyrm", name: "The Sand Wyrm", line: "Burrows under your towers and bursts out. Calls a sandstorm at half health.", hp: 5200, speed: 0.6, armour: 0, ward: 45, threat: 0, bounty: 0, leak: 10, melee: { dmg: 40, int: 1.5 }, freezeAt: 500, flying: false, blockable: true, size: "boss", boss: true, fixedHp: true, traits: ["boss", "ward"] }),
  colossus: E({ id: "colossus", name: "The Frost Colossus", line: "Stomps freeze nearby towers. Grows ice armour that lightning and fire break.", hp: 8000, speed: 0.35, armour: 55, ward: 25, threat: 0, bounty: 0, leak: 10, melee: null, freezeAt: 800, flying: false, blockable: false, size: "boss", boss: true, fixedHp: true, traits: ["boss", "armour", "shield"] }),
  tyrant: E({ id: "tyrant", name: "The Ember Tyrant", line: "Breathes fire on your towers. Takes to the air: bring air defence.", hp: 20800, speed: 0.5, armour: 30, ward: 30, threat: 0, bounty: 0, leak: 10, melee: { dmg: 120, int: 2.0 }, freezeAt: 600, flying: false, blockable: true, size: "boss", boss: true, fixedHp: true, traits: ["boss", "air"] }),
  hivequeen: E({ id: "hivequeen", name: "The Hive Queen", line: "Births bats and swarmlings as she walks. Her brood bursts from the road ahead.", hp: 3400, speed: 0.45, armour: 25, ward: 25, threat: 0, bounty: 0, leak: 10, melee: { dmg: 40, int: 1.5 }, freezeAt: 400, flying: false, blockable: true, size: "boss", boss: true, fixedHp: true, traits: ["boss", "air"] }),
  lich: E({ id: "lich", name: "The Lich", line: "Raises fallen enemies near it. Wraps itself in bone that lightning and hexes break.", hp: 6800, speed: 0.5, armour: 0, ward: 65, threat: 0, bounty: 0, leak: 10, melee: { dmg: 35, int: 1.2, magic: true }, freezeAt: 500, flying: false, blockable: true, size: "boss", boss: true, fixedHp: true, traits: ["boss", "ward"] }),
  packlord: E({ id: "packlord", name: "The Pack-Lord", line: "Howls to speed its pack and call more. Leaps ahead along the road.", hp: 5500, speed: 0.7, armour: 25, ward: 25, threat: 0, bounty: 0, leak: 10, melee: { dmg: 70, int: 1.0, cleave: 1 }, freezeAt: 600, flying: false, blockable: true, size: "boss", boss: true, fixedHp: true, traits: ["boss"] }),
};

export const ENEMY_IDS = Object.keys(ENEMIES) as EnemyId[];

/** Roles that waves are built from (no children, summons or bosses). */
export const WAVE_ROLES: EnemyId[] = ["footman", "runner", "brute", "acolyte", "shieldbearer", "shaman", "splitter", "shade", "swarmling", "sapper", "bat", "drake"];
export const ELITES: EnemyId[] = ["juggernaut", "warlock", "matron"];

/** Elite affixes (content 4.4, R32: one list for elites and ascension waves). */
export const AFFIXES: Record<string, { name: string; line: string }> = {
  hasted: { name: "Hasted", line: "+40% speed." },
  vengeful: { name: "Vengeful", line: "On death, disables the nearest tower for 4 s." },
  regenerating: { name: "Regenerating", line: "Heals 2% a second after 2 s unhurt." },
  plated: { name: "Plated", line: "Armour one tier up." },
  runed: { name: "Runed", line: "Ward one tier up." },
  warleader: { name: "Warleader", line: "Allies within 2 move 20% faster." },
  brood: { name: "Brood", line: "Drops 2 footmen at 75%, 50% and 25% health." },
  // ascension 3 wave affix only (on a wave, Hasted is +20%)
  many: { name: "Many", line: "A bigger wave." },
};
export const ELITE_AFFIXES = ["hasted", "vengeful", "regenerating", "plated", "runed", "warleader", "brood"];

/** One resist tier up: 0 -> 25 -> 45 -> 65 -> 80. */
export function tierUp(v: number): number { return v < 25 ? 25 : v < 45 ? 45 : v < 65 ? 65 : 80; }
