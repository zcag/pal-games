// The 12 towers and 24 specialisations (content.md 2, Revision 1 R11/R12).
// Times in seconds, distances in u. The sim converts to ticks.
import type { DamageType, SpecId, TargetMode, TowerId } from "../../types.ts";

/** Soldier stats for Barracks levels/specs and the Treant. */
export interface SoldierStats {
  count: number; hp: number; armour: number; ward: number;
  dmg: number; int: number; respawn: number; holds: number;
  crit?: number; regen: number; // fraction of max HP per second out of combat
}

/** Every number a level or spec may carry. Unused fields are absent. */
export interface TStats {
  range: number;
  dmg?: number;
  int?: number;
  type?: DamageType;
  /** Homing projectile speed (u/s) or lobbed flight time (s). */
  speed?: number;
  flight?: number;
  splash?: number;
  crit?: number;
  critM?: number;
  pierce?: number;
  // frost
  chill?: number;
  freeze?: number;
  // alchemist
  puddle?: number; puddleR?: number;
  // pyre
  cone?: number; burn?: number; burnS?: number;
  // storm
  targets?: number; jump?: number; fall?: number;
  // beacon
  markEvery?: number; markPct?: number; marks?: number;
  // banner
  aspd?: number;
  // thornwood
  thorns?: number; rootEvery?: number; rootS?: number; roots?: number;
  soldiers?: SoldierStats;
}

export interface SpecDef {
  id: SpecId;
  name: string;
  line: string;
  flavour: string;
  cost: number;
  stats: TStats;
  /** The spec's mechanic in one plain sentence (radial tooltip, codex). */
  mechanic: string;
  mode?: TargetMode;
  air: boolean;
  accent: string;
}

export interface TowerDef {
  id: TowerId;
  name: string;
  flavour: string;
  /** Build menu line. */
  line: string;
  /** Base cost c; purchase costs below are the content table's (L1, L2, L3). */
  cost: number;
  costs: [number, number, number];
  levels: [TStats, TStats, TStats];
  specs: [SpecDef, SpecDef];
  air: boolean;
  ground: boolean;
  support: boolean;
  mode: TargetMode;
  accent: string;
  /** Projectile kind for the surface. */
  shot: "homing" | "lobbed" | "instant" | "cone" | "aura" | "melee" | "none";
}

const SOLDIER = (hp: number, armour: number, dmg: number, respawn: number): SoldierStats =>
  ({ count: 3, hp, armour, ward: 0, dmg, int: 1.0, respawn, holds: 1, regen: 0.10 });

export const TOWERS: Record<TowerId, TowerDef> = {
  archer: {
    id: "archer", name: "Archer", flavour: "Good bows, steady hands, and a roof against the rain.",
    line: "Fast arrows at air and ground. Cheap and steady.",
    cost: 70, costs: [70, 80, 110], air: true, ground: true, support: false, mode: "first", accent: "#E6B85C", shot: "homing",
    levels: [
      { range: 3.4, dmg: 8, int: 0.7, type: "phys", speed: 14, crit: 5, critM: 2 },
      { range: 3.6, dmg: 12, int: 0.65, type: "phys", speed: 14, crit: 5, critM: 2 },
      { range: 3.8, dmg: 17, int: 0.6, type: "phys", speed: 14, crit: 5, critM: 2 },
    ],
    specs: [
      { id: "marksmen", name: "Marksmen", line: "A sniper. Big crits, best on marked foes.", flavour: "One arrow, chosen with care.", cost: 170,
        stats: { range: 4.8, dmg: 46, int: 1.15, type: "phys", speed: 22, crit: 20, critM: 2.5, pierce: 30 },
        mechanic: "Deadeye: crits on marked enemies deal x3.5.", mode: "strong", air: true, accent: "#D9C25A" },
      { id: "volley", name: "Volley", line: "Three arrows at once, and a rain of them.", flavour: "Look up. Then run.", cost: 170,
        stats: { range: 3.8, dmg: 9, int: 0.6, type: "phys", speed: 14, crit: 5, critM: 2, targets: 3 },
        mechanic: "Every 5th attack: Arrow Rain, 8 arrows of 12 on the densest spot in range.", air: true, accent: "#FF9A3A" },
    ],
  },
  barracks: {
    id: "barracks", name: "Barracks", flavour: "They signed up for the bread. They stay for each other.",
    line: "Three soldiers block the road. Ground only.",
    cost: 70, costs: [70, 80, 110], air: false, ground: true, support: false, mode: "first", accent: "#4A86E0", shot: "melee",
    levels: [
      { range: 2.6, soldiers: SOLDIER(60, 0, 5, 10) },
      { range: 2.6, soldiers: SOLDIER(90, 15, 8, 9) },
      { range: 2.6, soldiers: SOLDIER(130, 30, 12, 8) },
    ],
    specs: [
      { id: "paladins", name: "Paladins", line: "Holy walls. Each one stops two.", flavour: "The road ends here, and so do you.", cost: 170,
        stats: { range: 2.6, soldiers: { count: 3, hp: 240, armour: 45, ward: 30, dmg: 16, int: 1.0, respawn: 8, holds: 2, regen: 0.15 } },
        mechanic: "Each holds two while above half health. Once per life, heals to full at low health.", air: false, accent: "#E8E4DA" },
      { id: "blademasters", name: "Blademasters", line: "Blockers who kill. Their whirl cracks armour.", flavour: "Two blades each, and no patience.", cost: 170,
        stats: { range: 2.6, soldiers: { count: 3, hp: 160, armour: 25, ward: 0, dmg: 16, int: 0.8, respawn: 8, holds: 1, crit: 10, regen: 0.10 } },
        mechanic: "Dodge 30% of melee hits. Every 4 s a whirl: 30 to all close by, and 1 shred.", air: false, accent: "#B8323A" },
    ],
  },
  mage: {
    id: "mage", name: "Mage", flavour: "Old words, spoken quickly.",
    line: "Magic bolts that ignore armour. Hits air too.",
    cost: 100, costs: [100, 110, 160], air: true, ground: true, support: false, mode: "first", accent: "#8E6CF2", shot: "homing",
    levels: [
      { range: 3.2, dmg: 24, int: 1.5, type: "magic", speed: 10 },
      { range: 3.3, dmg: 38, int: 1.4, type: "magic", speed: 10 },
      { range: 3.5, dmg: 54, int: 1.3, type: "magic", speed: 10 },
    ],
    specs: [
      { id: "arcanist", name: "Arcanist", line: "Bolts leap to two more foes.", flavour: "Why hit one when the spell can travel?", cost: 240,
        stats: { range: 3.8, dmg: 70, int: 1.3, type: "magic", speed: 12, targets: 3, jump: 1.8, fall: 0.25 },
        mechanic: "Bolts chain to 2 more foes. Every 4th bolt bursts for 50 around its target.", air: true, accent: "#9FB8FF" },
      { id: "hexer", name: "Hexer", line: "Hexed foes take more from everyone.", flavour: "It doesn't kill you. It makes everything else kill you.", cost: 240,
        stats: { range: 3.6, dmg: 60, int: 1.2, type: "magic", speed: 10 },
        mechanic: "Hex: +25% damage taken, no healing, shields halved, damage cap raised. Hex spreads on death.", mode: "strong", air: true, accent: "#B26BFF" },
    ],
  },
  bombard: {
    id: "bombard", name: "Bombard", flavour: "Loud, slow, and very sure of itself.",
    line: "Slow shells that blast groups. Ground only.",
    cost: 125, costs: [125, 140, 200], air: false, ground: true, support: false, mode: "first", accent: "#E2752F", shot: "lobbed",
    levels: [
      { range: 3.0, dmg: 40, int: 2.6, type: "phys", splash: 1.0, flight: 1.0 },
      { range: 3.2, dmg: 62, int: 2.5, type: "phys", splash: 1.1, flight: 1.0 },
      { range: 3.4, dmg: 92, int: 2.4, type: "phys", splash: 1.2, flight: 1.0 },
    ],
    specs: [
      { id: "mortar", name: "Mortar", line: "Huge range, huge blast. Leaves a slowing crater.", flavour: "From the back row, with love.", cost: 300,
        stats: { range: 4.6, dmg: 120, int: 3.2, type: "phys", splash: 1.4, flight: 1.4 },
        mechanic: "Crater: 30% slow for 3 s where it lands.", air: false, accent: "#E2752F" },
      { id: "shrapnel", name: "Shrapnel", line: "Cracks armour on everything it hits.", flavour: "Everything near the bang gets a piece.", cost: 300,
        stats: { range: 3.4, dmg: 56, int: 2.0, type: "phys", splash: 1.1, flight: 0.9 },
        mechanic: "+2 shred on all it hits; 4 bomblets of 18 scatter around the blast.", air: false, accent: "#B7C0CC" },
    ],
  },
  frost: {
    id: "frost", name: "Frost Spire", flavour: "The cold does the work. The spire just points.",
    line: "Chills and freezes. Little damage, lots of time.",
    cost: 100, costs: [100, 110, 160], air: true, ground: true, support: false, mode: "first", accent: "#86DBFF", shot: "homing",
    levels: [
      { range: 3.0, dmg: 5, int: 1.0, type: "magic", speed: 12, chill: 18, freeze: 1.5 },
      { range: 3.1, dmg: 8, int: 0.9, type: "magic", speed: 12, chill: 22, freeze: 1.5 },
      { range: 3.3, dmg: 12, int: 0.8, type: "magic", speed: 12, chill: 26, freeze: 1.5 },
    ],
    specs: [
      { id: "glacier", name: "Glacier", line: "Pulses cold around itself. Freezes last longer.", flavour: "Winter, on a small scale.", cost: 240,
        stats: { range: 3.3, dmg: 12, int: 0.8, type: "magic", speed: 12, chill: 26, freeze: 2.0 },
        mechanic: "Nova every 3.5 s: 35 chill and 30 magic to all within 2.4.", air: true, accent: "#BFE6F5" },
      { id: "shatter", name: "Shatter", line: "Frozen foes take more from arrows and bolts, and burst.", flavour: "Ice is just glass that hasn't broken yet.", cost: 240,
        stats: { range: 3.3, dmg: 20, int: 0.8, type: "magic", speed: 12, chill: 40, freeze: 1.5 },
        mechanic: "Its freezes make foes brittle (+50% physical taken); brittle foes shatter on death.", air: true, accent: "#D8F4FF" },
    ],
  },
  alchemist: {
    id: "alchemist", name: "Alchemist", flavour: "Smells terrible. Works wonderfully.",
    line: "Lobs oil: slows the road and feeds fire.",
    cost: 100, costs: [100, 110, 160], air: false, ground: true, support: false, mode: "first", accent: "#A6E04A", shot: "lobbed",
    levels: [
      { range: 3.0, dmg: 15, int: 2.4, type: "magic", splash: 0.9, flight: 0.8, puddle: 4, puddleR: 0.9 },
      { range: 3.1, dmg: 24, int: 2.2, type: "magic", splash: 0.9, flight: 0.8, puddle: 5, puddleR: 0.9 },
      { range: 3.3, dmg: 36, int: 2.0, type: "magic", splash: 0.9, flight: 0.8, puddle: 6, puddleR: 0.9 },
    ],
    specs: [
      { id: "acid", name: "Acid", line: "Acid strips armour and ward alike.", flavour: "Eats through plate, and through charms.", cost: 240,
        stats: { range: 3.3, dmg: 36, int: 2.0, type: "magic", splash: 0.9, flight: 0.8, puddle: 7, puddleR: 0.9 },
        mechanic: "Puddles are acid: 15 magic a second, 1 shred and 1 corrode a second.", air: false, accent: "#B6F24A" },
      { id: "naphtha", name: "Naphtha", line: "Its oil explodes. Every fourth flask lights itself.", flavour: "Mind the drip.", cost: 240,
        stats: { range: 3.3, dmg: 36, int: 2.0, type: "magic", splash: 0.9, flight: 0.8, puddle: 6, puddleR: 0.9 },
        mechanic: "A lit puddle explodes for 90 fire, then burns. Every 4th flask is a firebomb.", air: false, accent: "#FF8A2A" },
    ],
  },
  pyre: {
    id: "pyre", name: "Pyre", flavour: "Keep your hands inside the wall.",
    line: "Short flame cone. Fire ignores armour and ward.",
    cost: 100, costs: [100, 110, 160], air: false, ground: true, support: false, mode: "first", accent: "#FF5A2A", shot: "cone",
    levels: [
      { range: 2.2, dmg: 10, type: "fire", cone: 70, burn: 5, burnS: 3 },
      { range: 2.3, dmg: 16, type: "fire", cone: 70, burn: 8, burnS: 3 },
      { range: 2.4, dmg: 25, type: "fire", cone: 70, burn: 12, burnS: 3 },
    ],
    specs: [
      { id: "inferno", name: "Inferno", line: "A melting beam for big targets.", flavour: "It gets hotter the longer you stand there.", cost: 240,
        stats: { range: 2.6, dmg: 36, type: "fire", cone: 70, burn: 18, burnS: 4 },
        mechanic: "Heat: +15% a second on the same target, up to +120%.", mode: "strong", air: false, accent: "#FF4A1E" },
      { id: "firestorm", name: "Firestorm", line: "Fireballs that reach far, and hit flyers.", flavour: "Fire from the sky, for once on our side.", cost: 240,
        stats: { range: 3.8, dmg: 40, int: 2.5, type: "fire", splash: 0.8, flight: 0.9, burn: 10, burnS: 4, targets: 3 },
        mechanic: "3 fireballs every 2.5 s, flyers too (half damage); burning ground where they land.", air: true, accent: "#7FD0FF" },
    ],
  },
  storm: {
    id: "storm", name: "Storm Spire", flavour: "Copper, rain and a bad temper.",
    line: "Lightning jumps between enemies. Breaks shields.",
    cost: 125, costs: [125, 140, 200], air: true, ground: true, support: false, mode: "first", accent: "#7FA2FF", shot: "instant",
    levels: [
      { range: 3.0, dmg: 30, int: 1.7, type: "magic", targets: 2, jump: 1.6, fall: 0.25 },
      { range: 3.1, dmg: 44, int: 1.6, type: "magic", targets: 3, jump: 1.6, fall: 0.25 },
      { range: 3.3, dmg: 62, int: 1.5, type: "magic", targets: 4, jump: 1.6, fall: 0.25 },
    ],
    specs: [
      { id: "tempest", name: "Tempest", line: "Long chains, and a field that shocks flyers.", flavour: "The sky is full of it today.", cost: 300,
        stats: { range: 3.3, dmg: 64, int: 1.3, type: "magic", targets: 7, jump: 1.6, fall: 0.25 },
        mechanic: "Static Field every 4 s: 50 magic to every flyer within 3.5.", air: true, accent: "#9FC0FF" },
      { id: "overload", name: "Overload", line: "Every third hit stuns and sparks.", flavour: "Hold still. You won't have a choice.", cost: 300,
        stats: { range: 3.3, dmg: 84, int: 1.6, type: "magic", targets: 4, jump: 1.6, fall: 0.25 },
        mechanic: "3 charges stun for 1.5 s and spark for 40 around.", air: true, accent: "#D8C8FF" },
    ],
  },
  beacon: {
    id: "beacon", name: "Beacon", flavour: "Nothing hides from a good lamp.",
    line: "Shows hidden enemies and marks them for crits.",
    cost: 90, costs: [90, 100, 145], air: true, ground: true, support: true, mode: "strong", accent: "#FFE6A0", shot: "none",
    levels: [
      { range: 3.0, markEvery: 3.0, markPct: 8, marks: 1 },
      { range: 3.2, markEvery: 2.5, markPct: 12, marks: 1 },
      { range: 3.4, markEvery: 2.0, markPct: 15, marks: 1 },
    ],
    specs: [
      { id: "lighthouse", name: "Lighthouse", line: "Nearby towers reach further and crit more.", flavour: "Shine on the ones who shoot.", cost: 215,
        stats: { range: 3.8, markEvery: 2.0, markPct: 15, marks: 1 },
        mechanic: "Towers within 3 get +15% range and +10% crit chance. A sweeping beam marks all in reach.", air: true, accent: "#FFF1C9" },
      { id: "huntersmark", name: "Hunter's Mark", line: "Marks three foes. Marked kills pay gold.", flavour: "One bell for every head.", cost: 215,
        stats: { range: 3.6, markEvery: 2.0, markPct: 30, marks: 3 },
        mechanic: "Marks 3 (elites and bosses first), +30% taken; marks jump on a kill; marked kills pay +2 gold.", air: true, accent: "#E8C15A" },
    ],
  },
  banner: {
    id: "banner", name: "War Banner", flavour: "Stand under it and you stand a little taller.",
    line: "Nearby towers attack faster. Deals no damage.",
    cost: 90, costs: [90, 100, 145], air: false, ground: false, support: true, mode: "first", accent: "#D94A5E", shot: "aura",
    levels: [
      { range: 2.6, aspd: 10 },
      { range: 2.6, aspd: 14 },
      { range: 2.6, aspd: 18 },
    ],
    specs: [
      { id: "wardrums", name: "War Drums", line: "Faster and harder hits for the whole cluster.", flavour: "Boom. Boom. Faster now.", cost: 215,
        stats: { range: 2.8, aspd: 25 },
        mechanic: "+25% attack speed and +15% damage in its aura; soldiers +25% damage, double regen.", air: false, accent: "#FF6A5A" },
      { id: "treasury", name: "Treasury", line: "More gold for kills nearby, and a crown each wave.", flavour: "The war pays for itself, if you count carefully.", cost: 160,
        stats: { range: 2.6, aspd: 18 },
        mechanic: "+25% bounty for kills by towers in its aura; +1 crown for every wave that starts while it stands.", air: false, accent: "#E3B655" },
    ],
  },
  ballista: {
    id: "ballista", name: "Ballista", flavour: "Built to hit the castle. Hits you instead.",
    line: "Long-range bolts that punch through armour.",
    cost: 120, costs: [120, 130, 190], air: true, ground: true, support: false, mode: "strong", accent: "#B7C2CC", shot: "homing",
    levels: [
      { range: 4.4, dmg: 50, int: 2.6, type: "phys", speed: 22, pierce: 50 },
      { range: 4.7, dmg: 80, int: 2.5, type: "phys", speed: 22, pierce: 50 },
      { range: 5.0, dmg: 115, int: 2.4, type: "phys", speed: 22, pierce: 50 },
    ],
    specs: [
      { id: "harpoon", name: "Harpoon", line: "Drags big foes back, and pulls flyers down.", flavour: "Come here.", cost: 290,
        stats: { range: 5.0, dmg: 170, int: 2.6, type: "phys", speed: 20, pierce: 50 },
        mechanic: "Every 3rd shot pulls its target 2.5 back; flyers are grounded for 4 s.", mode: "strong", air: true, accent: "#8E98A6" },
      { id: "siegebolt", name: "Siege Bolt", line: "A bolt through the whole line. No armour helps.", flavour: "It does not stop for the first one.", cost: 290,
        stats: { range: 5.6, dmg: 130, int: 3.2, type: "phys", speed: 28, pierce: 100 },
        mechanic: "Flies the full range in a line, hitting everything it passes, ignoring armour.", mode: "strong", air: true, accent: "#D0D6DC" },
    ],
  },
  thornwood: {
    id: "thornwood", name: "Thornwood Grove", flavour: "The old wood remembers every boot.",
    line: "Thorns hurt all nearby; roots hold one in place.",
    cost: 100, costs: [100, 110, 160], air: false, ground: true, support: false, mode: "first", accent: "#4FAE5C", shot: "aura",
    levels: [
      { range: 2.0, thorns: 8, type: "phys", rootEvery: 6.0, rootS: 1.2, roots: 1 },
      { range: 2.1, thorns: 13, type: "phys", rootEvery: 5.5, rootS: 1.4, roots: 1 },
      { range: 2.2, thorns: 19, type: "phys", rootEvery: 5.0, rootS: 1.6, roots: 1 },
    ],
    specs: [
      { id: "bramble", name: "Bramble", line: "A thorny zone that slows, cracks and roots.", flavour: "Every step costs something.", cost: 240,
        stats: { range: 2.6, thorns: 22, type: "phys", rootEvery: 5.0, rootS: 1.6, roots: 3 },
        mechanic: "20% slow inside, 1 shred every 2 s, roots 3 every 5 s.", air: false, accent: "#9E3A5A" },
      { id: "treant", name: "Ancient Treant", line: "A giant guardian that holds three at once.", flavour: "It was asleep for three hundred years. It is awake now.", cost: 240,
        stats: { range: 2.2, thorns: 15, type: "phys", rootEvery: 5.0, rootS: 1.6, roots: 1,
          soldiers: { count: 1, hp: 800, armour: 35, ward: 0, dmg: 50, int: 2.0, respawn: 15, holds: 3, regen: 0.02 } },
        mechanic: "A Treant guards the road: 800 health, holds 3, slams all around it.", air: false, accent: "#5A4632" },
    ],
  },
};

export const TOWER_IDS = Object.keys(TOWERS) as TowerId[];

/** Spec id -> its tower and index (0 = A, 1 = B). */
export const SPEC_OF: Record<SpecId, { tower: TowerId; index: 0 | 1 }> = (() => {
  const out = {} as Record<SpecId, { tower: TowerId; index: 0 | 1 }>;
  for (const t of TOWER_IDS) TOWERS[t].specs.forEach((s, i) => (out[s.id] = { tower: t, index: i as 0 | 1 }));
  return out;
})();

/** Stats for a tower at a level (spec when level 4). */
export function statsOf(kind: TowerId, level: number, spec: SpecId | null): TStats {
  const d = TOWERS[kind];
  if (level >= 4 && spec) return d.specs[SPEC_OF[spec].index].stats;
  return d.levels[Math.max(0, Math.min(2, level - 1))]!;
}

/** Content cost of the purchase that takes a tower to `level` (1..4), before modifiers. */
export function purchaseCost(kind: TowerId, level: number, spec: SpecId | null): number {
  const d = TOWERS[kind];
  if (level >= 4) return spec ? d.specs[SPEC_OF[spec].index].cost : d.specs[0].cost;
  return d.costs[level - 1]!;
}
