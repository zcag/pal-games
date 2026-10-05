// Bosses (content.md 5, systems 9.8-9.9, Revision 1 R1/R7/R14/R15/R21).
// Body stats live in ENEMIES (hp, armour, speed...); this file holds the fight script.
// Times in seconds. "first" is after spawn (phase 1) or after the phase starts.
import type { Act, BossId, EnemyId } from "../../types.ts";

export interface BossAbility {
  id: string;
  name: string;
  phases: number[];
  first: number;
  every: number;
  tele: number;
  r: number;
}

export interface BossDef {
  id: BossId;
  name: string;
  act: Act;
  intro: string;
  death: string;
  tooltip: string;
  /** HP fractions where phases 2, 3 start. */
  thresholds: number[];
  abilities: BossAbility[];
  /** Escort archetype weights for the boss wave (budget 0.6 x B). */
  escort: Partial<Record<EnemyId, number>>;
  /** Boss Fury (third mechanic) line. */
  fury: string;
  alternate: boolean;
}

const A = (id: string, name: string, phases: number[], first: number, every: number, tele: number, r: number): BossAbility =>
  ({ id, name, phases, first, every, tele, r });

export const BOSSES: Record<BossId, BossDef> = {
  gorrak: {
    id: "gorrak", name: "Gorrak the Warlord", act: 1, alternate: false,
    intro: "Gorrak the Warlord. Your fields will feed my army.",
    death: "Gorrak falls. His banner goes down with him.",
    tooltip: "War cry speeds nearby enemies. Calls footmen at two thirds health.",
    thresholds: [0.66, 0.33],
    abilities: [
      A("warcry", "War Cry", [1, 2, 3], 6, 12, 1.5, 3.0),
      A("muster", "Muster", [2], 4, 14, 2.0, 1.0),
      A("charge", "Charge", [3], 3, 10, 1.5, 4.0),
    ],
    escort: { footman: 60, runner: 20, brute: 20 },
    fury: "Shield Wall: every Muster also brings 2 shieldbearers and Gorrak gains a 600 shield.",
  },
  hivequeen: {
    id: "hivequeen", name: "The Hive Queen", act: 1, alternate: true,
    intro: "The Hive Queen. The meadow hums for her now.",
    death: "The Hive Queen goes still. The humming stops.",
    tooltip: "Births bats and swarmlings as she walks. Her brood bursts from the road ahead.",
    thresholds: [0.6, 0.3],
    abilities: [
      A("brood", "Brood", [1, 2], 5, 9, 1.5, 1.2),
      A("bury", "Buried Brood", [2], 3, 14, 2.0, 0.8),
      A("brood3", "Brood", [3], 2, 6, 1.5, 1.2),
      A("bury3", "Buried Brood", [3], 3, 10, 2.0, 0.8),
    ],
    escort: { swarmling: 50, runner: 30, footman: 20 },
    fury: "Winged Brood: every Brood births 2 more bats, and Buried Brood raises a fourth mound.",
  },
  wyrm: {
    id: "wyrm", name: "The Sand Wyrm", act: 2, alternate: false,
    intro: "The Sand Wyrm. The ground itself is hungry.",
    death: "The Wyrm sinks for the last time. The sand goes still.",
    tooltip: "Burrows under your towers and bursts out. Calls a sandstorm at half health.",
    thresholds: [0.5],
    abilities: [
      A("burrow", "Burrow", [1], 8, 15, 1.5, 1.5),
      A("burrow2", "Burrow", [2], 4, 12, 1.5, 1.5),
      A("sandstorm", "Sandstorm", [2], 6, 20, 2.0, 0),
    ],
    escort: { acolyte: 60, shade: 40 },
    fury: "Buried Pad: sandstorms from the start, and each buries your most-invested tower near the Wyrm.",
  },
  lich: {
    id: "lich", name: "The Lich", act: 2, alternate: true,
    intro: "The Lich. Nothing that falls near me stays down.",
    death: "The Lich crumbles, and the dead lie still at last.",
    tooltip: "Raises fallen enemies near it. Wraps itself in bone that lightning and hexes break.",
    thresholds: [0.6, 0.3],
    abilities: [
      A("raise", "Raise Dead", [1], 6, 10, 1.5, 3.0),
      A("raise2", "Raise Dead", [2], 8, 8, 1.5, 3.0),
      A("boneward", "Bone Ward", [2], 0, 0, 2.0, 0),
      A("raise3", "Raise Dead", [3], 6, 6, 1.5, 4.0),
    ],
    escort: { acolyte: 50, footman: 50 },
    fury: "Death's Door: the first time it would die it rises again with 20% health and its Bone Ward.",
  },
  colossus: {
    id: "colossus", name: "The Frost Colossus", act: 3, alternate: false,
    intro: "The Frost Colossus. The mountain has come down to meet you.",
    death: "The Colossus cracks from the core and falls as snow.",
    tooltip: "Stomps freeze nearby towers. Grows ice armour that lightning and fire break.",
    thresholds: [0.6, 0.25],
    abilities: [
      A("stomp", "Stomp", [1, 2, 3], 5, 10, 2.0, 2.4),
      A("icearmour", "Ice Armour", [2, 3], 0, 0, 2.0, 0),
    ],
    escort: { brute: 40, shieldbearer: 30, footman: 30 },
    fury: "Shard Rain: stomps shed ice shards in every phase.",
  },
  packlord: {
    id: "packlord", name: "The Pack-Lord", act: 3, alternate: true,
    intro: "The Pack-Lord. Run, and we run faster.",
    death: "The Pack-Lord falls. The howling scatters into the snow.",
    tooltip: "Howls to speed its pack and call more. Leaps ahead along the road.",
    thresholds: [0.6, 0.3],
    abilities: [
      A("howl", "Howl", [1, 2], 5, 12, 1.5, 3.5),
      A("leap", "Leap", [2], 3, 10, 1.5, 1.2),
      A("howl3", "Howl", [3], 2, 8, 1.5, 3.5),
      A("leap3", "Leap", [3], 3, 7, 1.5, 1.2),
    ],
    escort: { runner: 50, brute: 25, shade: 25 },
    fury: "Shadow Pack: every Howl also calls 2 shades, and Leap reaches 7 u.",
  },
  tyrant: {
    id: "tyrant", name: "The Ember Tyrant", act: 4, alternate: false,
    intro: "The Ember Tyrant. You came all this way to burn.",
    death: "The Tyrant's fire goes out. The citadel is quiet at last.",
    tooltip: "Breathes fire on your towers. Takes to the air: bring air defence.",
    thresholds: [0.66, 0.33],
    abilities: [
      A("breath", "Flame Breath", [1, 2], 6, 11, 1.5, 3.0),
      A("wing", "Takes Wing", [2], 0, 30, 2.0, 1.5),
      A("breath3", "Flame Breath", [3], 3, 8, 1.5, 3.0),
      A("embers", "Embers", [3], 4, 8, 1.5, 1.0),
    ],
    escort: { drake: 40, runner: 30, acolyte: 30 },
    fury: "Second Flight: at 15% health it takes wing once more.",
  },
};

/** Numbers the boss scripts use (kept here so the balance agent can tune them). */
export const BOSS_NUM = {
  warcrySpeed: 0.5, warcryS: 4,
  musterFootmen: 4, musterRunners: 2,
  chargeDist: 4, chargeSpeed: 3, chargeDmg: 40,
  furyShield: 600,
  burrowS: 6, burrowSpeed: 1.2, surfaceWarn: 2.0, eruptDisable: 3, eruptDmg: 30, eruptR: 1.5,
  sandlings: 2, sandstormS: 6, sandstormRange: 0.2,
  stompDisable: 4, stompFreeze: 4, stompDmg: 60, iceArmour: 2500, iceRegrow: 20, shards: 3, furyShards: 2, colossusP3Speed: 0.5,
  breathDisable: 3, breathCone: 60, wingS: 15, wingLand: 6, wingDrakes: 2, tyrantP3Speed: 0.65, emberRunners: 2,
  furyWingAt: 0.15, furyWingS: 10,
  // alternates (content 5.5-5.7)
  broodSwarm: 4, broodBats: 2, brood3Bats: 3, furyBats: 2, mounds: [4, 6, 8], furyMound: 10, broodlings: 3, queenP3Speed: 0.6,
  raiseMax: 8, raiseMax3: 12, raiseWindow: 10, boneWard: 2000, boneRegrow: 16, lichWard3: 45, risenHaste3: 0.3, deathsDoor: 0.2,
  howlPups: 4, howlPups3: 6, howlHaste: 0.4, howlS: 5, leapDist: 5, furyLeap: 7, leapDmg: 50, packP3Speed: 0.9, furyShades: 2,
  lapSpeed: 0.2,
  dread: 0.15,
  championHp: 1.6,
} as const;
