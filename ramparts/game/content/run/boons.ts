// Boons (content.md 3, minus R16's cuts, plus R19's Endless Winter). Card text is `text`, exactly.
// Battle effects are implemented by game/battle/mods.ts by id; this file owns the definitions.
import type { BoonId, Rarity, TowerId } from "../../types.ts";
import { idOf } from "./ids.ts";

export interface BoonDef {
  id: BoonId;
  name: string;
  /** The tower it belongs to; null = universal (offered as "Boon: <tower>", one card names one tower). */
  tower: TowerId | null;
  rarity: Rarity;
  text: string;
  /** What the tempered (+) version does. */
  tempered: string;
  /** Stat pools (content.md 0.1), for the battle engineer. */
  pool: string[];
  flavour: string;
  /** Keystone: offered only while you own at least one of these blueprints. */
  needs?: TowerId[];
  /** Universal boons: towers it is never offered on. */
  notOn?: TowerId[];
  keystone?: boolean;
}

type Row = [name: string, rarity: Rarity, text: string, tempered: string, pool: string, flavour: string, extra?: Partial<BoonDef>];

const KEY = (needs?: TowerId[]): Partial<BoonDef> => ({ keystone: true, ...(needs ? { needs } : {}) });

const TABLE: Record<TowerId | "any", Row[]> = {
  archer: [
    ["Barbed Tips", "common", "Arrows deal +2 damage (Volley arrows and Arrow Rain +1).", "+3 (Volley +2)", "base", "Small hooks. Big difference."],
    ["Taut Strings", "common", "+12% attack speed.", "+18%", "aspd", "Wax the string, mind your fingers."],
    ["High Perch", "common", "+12% range.", "+18%", "range", "Higher roof, wider view."],
    ["Keen Eyes", "common", "+6% crit chance.", "+10%", "critC", "Aim for the gap in the helmet."],
    ["Twin Shot", "uncommon", "Every 5th arrow is shot twice at the same target (Marksmen: every 4th shot; Volley: every 5th volley).", "every 4th (Marksmen 3rd, Volley 4th)", "rule", "Two arrows, one breath."],
    ["Pitch Arrows", "uncommon", "Every 4th arrow is lit: it deals fire instead of physical, burns 6 dps for 2 s and ignites oil.", "every 3rd, burn 8 dps", "rule", "Dip, light, loose."],
    ["Glass Arrows", "rare", "Needs Frost Spire. An arrow that hits a Frozen enemy bursts for 20 physical damage (x act) to every enemy within 0.8 u.", "30 (x act), r 1.0", "rule", "The ice breaks. So does what's inside.", KEY(["frost"])],
  ],
  barracks: [
    ["Drilled", "common", "Soldiers +25% max HP.", "+40%", "base", "Up at dawn, every day."],
    ["Whetstones", "common", "Soldiers deal +25% damage.", "+40%", "dealt", "Sharp swords end fights sooner."],
    ["Quick Muster", "common", "Soldiers respawn 30% faster.", "45%", "base", "The next one is already lacing his boots."],
    ["Long Reach", "common", "Rally range +1.0 u and engage radius +0.4 u.", "+1.5 u / +0.6 u", "base", "They'll go a bit further for you."],
    ["Shield Wall", "uncommon", "Each soldier hit adds 1 shred to its target.", "2 shred per hit", "shred", "Shields first, then the hammer."],
    ["Fourth Soldier", "uncommon", "This Barracks keeps 4 soldiers.", "the 4th is a Sergeant: +50% HP and damage", "base", "There's always room for one more."],
    ["Bait", "rare", "Needs Bombard, Pyre or Alchemist. Enemies held by these soldiers are Baited: +30% damage taken from splash, cones, puddles, fire patches and burns.", "+40%", "taken:baited", "Stand still. It's for your own good.", KEY(["bombard", "pyre", "alchemist"])],
  ],
  mage: [
    ["Focus", "common", "+15% damage.", "+22%", "dealt", "Breathe, then speak the word."],
    ["Quickened Runes", "common", "+10% attack speed; bolts fly 50% faster.", "+15%; 80% faster", "aspd,base", "Shorter words, same meaning."],
    ["Rune Breaker", "common", "Bolts ignore 15 ward.", "25 ward", "wardIgnore", "Every charm has a seam."],
    ["Opening Bolt", "common", "The first bolt this Mage fires at an enemy deals +50% damage.", "+80%", "dealt", "First impressions matter."],
    ["Lingering Hex", "uncommon", "Bolts hex for 1 s (20/22/25% by level; Hexer: its hex lasts 1 s longer).", "2 s (Hexer +2 s)", "taken:hex,dur", "A little curse, left behind."],
    ["Arc Splinter", "uncommon", "Bolts burst on hit for 30% of their damage in r 0.8.", "45%", "rule", "It doesn't stop at the skin."],
    ["Curse Engine", "rare", "Bolts hex for 2 s, and hex from this Mage never wears off while the enemy lives.", "its hex also slows 10%", "rule,taken:hex", "Some words, once spoken, stay.", KEY()],
  ],
  bombard: [
    ["Heavy Shot", "common", "+20% splash radius.", "+30%", "range", "More powder, wider hole."],
    ["Black Powder", "common", "+15% damage.", "+22%", "dealt", "The good stuff, from the east."],
    ["Quick Fuse", "common", "Shells fly 30% faster (fewer misses).", "45% faster", "base", "Less waiting, more bang."],
    ["Rapid Loader", "common", "+12% attack speed.", "+18%", "aspd", "Swab, load, fire, again."],
    ["Oilshot", "uncommon", "Shells leave an oil puddle (r 0.9, 4 s) where they land; at most 2 per Bombard.", "3 puddles, 6 s", "rule", "Some of it doesn't go off. That's the point."],
    ["Concussive Shells", "uncommon", "Enemies within 0.4 u of the impact are stunned for 0.4 s.", "0.6 s, within 0.5 u", "rule", "The ringing lasts longer than the bang."],
    ["Shatterfall", "rare", "Needs Frost Spire. A shell that lands on a Frozen enemy freezes every other enemy in its splash for 1.0 s (respects Thawing; elites go Numb).", "1.5 s", "rule", "Cold travels fast through a crowd.", KEY(["frost"])],
  ],
  frost: [
    ["Deep Cold", "common", "Chill +25%.", "+40%", "base", "Colder than the north wind."],
    ["Long Winter", "common", "Its freezes last +0.5 s.", "+0.8 s", "dur", "Spring is late this year."],
    ["Frostbite", "common", "+4 magic damage per hit (Nova +10).", "+6 (Nova +15)", "base", "Cold enough to sting."],
    ["Lingering Cold", "common", "Chill from this spire starts to fade after 3 s instead of 1.5 s.", "4.5 s", "dur", "It gets into your bones and stays."],
    ["Frozen Mark", "uncommon", "Enemies it freezes are Marked for the freeze + 2 s (+20% crit chance against, +10% taken).", "+ 3 s, +12% taken", "taken:mark,critC", "A clear target, standing very still."],
    ["Splinter", "uncommon", "Each shard also chills the nearest other enemy within 1.2 u for half its chill.", "full chill", "rule", "Ice never breaks cleanly."],
    ["Glass Bones", "rare", "This spire's freezes make enemies Brittle (+50% physical taken, freeze + 1 s), like Shatter. With Shatter, its shatter bursts deal 35% of max HP instead of 25%.", "Brittle lasts freeze + 2 s", "taken:brittle,rule", "Frozen through, and fragile as a cup.", KEY()],
    // R19: a cap-lifter, its own rare.
    ["Endless Winter", "rare", "Shatter chains started by this spire have no link limit, and each link deals 10% more than the one before.", "each link +15%", "rule", "One crack, and the whole lake goes."],
  ],
  alchemist: [
    ["Thick Oil", "common", "Puddles last 50% longer.", "80%", "dur", "Stir slowly. It sets."],
    ["Wide Flasks", "common", "Puddle radius +25%.", "+40%", "range", "Bigger bottles, bigger spills."],
    ["Sticky Tar", "common", "Puddle slow 35% instead of 25%.", "40%", "slow", "Like walking through honey."],
    ["Strong Brew", "common", "Flasks deal +25% damage.", "+40%", "dealt", "Double the recipe."],
    ["Caustic Oil", "uncommon", "Its puddles add 1 shred per 1.5 s to enemies inside (Acid keeps its own rate).", "also 1 corrode per 1.5 s", "shred,corrode", "It eats leather first, then iron."],
    ["Twin Flasks", "uncommon", "Every 3rd throw lobs 2 flasks at 2 different targets.", "every 2nd", "rule", "Two hands, two bottles."],
    ["Firewalk", "rare", "Needs Pyre. A Pyre cone touching a puddle lights it, and a lit puddle lights every other puddle within 2.5 u.", "3.5 u; patches burn 2 s longer", "rule", "One spark, and the road is a river of flame.", KEY(["pyre"])],
  ],
  pyre: [
    ["Hotter", "common", "Burn +2 dps.", "+4 dps", "base", "More coal, less mercy."],
    ["Wide Nozzle", "common", "Cone 90° instead of 70° (Firestorm: fireball radius +0.2).", "110° (+0.3)", "base", "Spread it around."],
    ["Long Flame", "common", "+12% range.", "+18%", "range", "A longer reach than it looks."],
    ["Slow Burn", "common", "Burns last 1.5 s longer.", "2.5 s", "dur", "Embers keep their grudges."],
    ["Backdraft", "uncommon", "+25% damage to enemies held by soldiers.", "+40%", "dealt", "Pinned in place, and in the heat."],
    ["Scorching", "uncommon", "Burning enemies are Scorched: +10% damage taken from everything.", "+15%", "taken:scorched", "Blistered armour gives way."],
    ["Cinder Rain", "rare", "Needs Alchemist. An enemy that dies burning throws 3 embers within 2.0 u: each deals 15 fire (x act) in r 0.5 and lights any puddle it lands in.", "5 embers", "rule", "The fire spreads by itself now.", KEY(["alchemist"])],
  ],
  storm: [
    ["Copper Wire", "common", "+1 chain target.", "+2", "base", "Give it somewhere to go."],
    ["Long Arc", "common", "Jumps reach +0.5 u.", "+0.8 u", "base", "It leaps further on a wet day."],
    ["Capacitor", "common", "+15% damage.", "+22%", "dealt", "Store it up, let it out."],
    ["Quick Coils", "common", "+12% attack speed.", "+18%", "aspd", "The hum gets higher."],
    ["Seeking Sparks", "uncommon", "Jumps prefer Chilled, Oiled or shielded enemies, and the first jump loses no damage.", "the first two jumps lose none", "rule", "Lightning knows where it wants to be."],
    ["Sky Arcs", "uncommon", "+35% damage to flyers.", "+50%", "dealt", "Nothing up there to hide behind."],
    ["Grounding", "rare", "The last target of each chain is stunned for 0.5 s (bosses 0.2 s).", "0.8 s", "rule", "The bolt ends in the feet.", KEY()],
  ],
  beacon: [
    ["Wider Light", "common", "+20% radius.", "+30%", "range", "Trim the wick, open the shutters."],
    ["Quick Signal", "common", "Marks 25% more often.", "40%", "base", "Flash, flash, flash."],
    ["Long Mark", "common", "Marks last 7 s instead of 5 s.", "9 s", "dur", "Once seen, never lost."],
    ["Bright Mark", "common", "Marked enemies take +5% more damage.", "+8%", "taken:mark", "A brighter ring, a bigger target."],
    ["Spreading Mark", "uncommon", "When a marked enemy dies, its mark jumps to the nearest unmarked enemy in radius (Hunter's Mark: to 2).", "jumps to the nearest within 3 u even outside the radius", "rule", "The hunt moves on."],
    ["Searchlight", "uncommon", "Revealed enemies stay revealed 4 s after leaving the radius, and revealing a stealthed enemy marks it.", "6 s", "dur,rule", "Once you've seen it, you can't unsee it."],
    ["Hunter's Moon", "rare", "Needs Archer or Ballista. Crits against marked enemies deal at least x2.5 for every tower, and marked enemies give +10% more crit chance.", "+15% crit chance", "critM,critC", "Under this moon, every shot finds its mark.", KEY(["archer", "ballista"])],
  ],
  banner: [
    ["Louder Drums", "common", "Aura attack speed +5% (L1 10% becomes 15%).", "+8%", "aspd", "Hit the skin harder."],
    ["Tall Pole", "common", "Aura +20% radius.", "+30%", "range", "Seen from every wall."],
    ["War Song", "common", "Towers in aura +5% damage; soldiers in aura +20% damage.", "+8% / +30%", "dealt", "Everyone knows the words."],
    ["Standard Bearer", "common", "This Banner costs 20% less to build, upgrade and specialise.", "30%", "cost", "The cloth is cheap. The courage is free."],
    ["Brave Hearts", "uncommon", "Towers in aura can't be disabled for more than 3 s.", "2 s", "rule", "Back to your post. Now."],
    // R16 cut War Tax, so the Banner has one uncommon.
    ["Field Forge", "rare", "Banners stack: a tower in this Banner's aura adds the two best banner auras in reach instead of taking the best.", "and this Banner's aura +0.4 u", "aspd,rule", "A smith behind every banner, and a banner behind every smith.", KEY()],
  ],
  ballista: [
    ["Long Draw", "common", "+15% range.", "+22%", "range", "Wind it tighter."],
    ["Heavy Bolts", "common", "+15% damage.", "+22%", "dealt", "An iron head on an oak shaft."],
    ["Winch", "common", "+12% attack speed.", "+18%", "aspd", "Two cranks quicker."],
    ["Steel Tips", "common", "Pierce +15 points (50% becomes 65%).", "+25", "pierce", "Made for plate."],
    ["Pinning Bolts", "uncommon", "Bolts root non-elite ground enemies for 0.6 s.", "1.0 s", "rule", "Nailed to the road."],
    ["Twin Bolts", "uncommon", "Every 3rd shot fires a second bolt at the next enemy (by its target mode) for 60% damage.", "80%", "rule", "Two strings, two bolts."],
    ["Spear of Dawn", "rare", "A bolt that kills flies on to the nearest enemy within 3 u at 70% damage, up to 2 more times.", "up to 3 more times", "rule", "It doesn't stop at the first. It never did.", KEY()],
  ],
  thornwood: [
    ["Sharper Thorns", "common", "Thorns +3 dps (Bramble +4).", "+5 (Bramble +7)", "base", "Longer spines, deeper cuts."],
    ["Wide Grove", "common", "Aura +15% radius.", "+25%", "range", "The wood creeps outward."],
    ["Quick Roots", "common", "Roots 20% more often.", "30%", "base", "Restless roots."],
    ["Thick Briars", "common", "Enemies in the aura are slowed 10%.", "15%", "slow", "Every step snags."],
    ["Long Roots", "uncommon", "Roots last 0.5 s longer.", "0.8 s", "dur", "Deeper in, harder out."],
    ["Strangling Roots", "uncommon", "Rooted enemies take 20% more damage.", "30%", "taken:rooted", "Held tight, and squeezed."],
    ["Heartwood Bond", "rare", "Needs Barracks. A soldier inside its aura who would die falls to 1 HP instead and can't be hurt for 3 s; once per soldier life.", "5 s, then heals 30%", "rule", "The grove will not let them fall. Not yet.", KEY(["barracks"])],
  ],
  any: [
    ["Veteran", "uncommon", "This tower is built at L2, paying its L1 cost plus half its L2 cost.", "and its L3 costs 20% less", "rule,cost", "They've done this before."],
    ["Thrifty", "common", "This tower costs 15% less (build, upgrades, specialisation).", "22%", "cost", "Same tower, cheaper nails."],
    ["Overseer", "uncommon", "This tower's L3 upgrade costs 40% less.", "and its specialisation costs 15% less", "cost", "Someone who knows the trade."],
    ["Watchful", "common", "This tower reveals stealthed enemies in its range (Barracks: its engage radius).", "and deals +10% damage to revealed enemies", "rule,dealt", "Eyes open, always.", { notOn: ["beacon"] }],
    ["Rangefinder", "common", "+10% range (Barracks: rally range).", "+15%", "range", "Measured twice, built once."],
    ["Steadfast", "uncommon", "+25% damage to bosses.", "+40%", "dealt", "Big ones fall too.", { notOn: ["beacon", "banner"] }],
    ["Trophy", "common", "+3 crowns after each battle in which this tower dealt the most damage.", "+5", "run", "Hang it over the door.", { notOn: ["beacon", "banner"] }],
  ],
};

export const BOONS: BoonDef[] = (Object.keys(TABLE) as (TowerId | "any")[]).flatMap((t) =>
  TABLE[t].map(([name, rarity, text, tempered, pool, flavour, extra]) => ({
    id: idOf(name), name, tower: t === "any" ? null : t, rarity, text, tempered,
    pool: pool.split(","), flavour, ...extra,
  })),
);

export const BOON: Record<BoonId, BoonDef> = Object.fromEntries(BOONS.map((b) => [b.id, b]));

/** Trophy's crowns, plain and tempered. */
export const TROPHY_CROWNS = [3, 5] as const;
