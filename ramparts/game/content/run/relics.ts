// Relics (content.md 8 with Revision 1: R1, R15, R16 cuts and reworks, R19 cap-lifters).
// Battle effects live in game/battle/mods.ts by id; run-layer effects in game/run.
import type { RelicId, Rarity, TowerId } from "../../types.ts";
import { idOf } from "./ids.ts";

export interface RelicDef {
  id: RelicId;
  name: string;
  rarity: Rarity;           // common | uncommon | rare | boss | shop | event | starter
  text: string;
  /** Boss relics: the price. */
  downside?: string;
  tags: string[];
  /** Towers it is tagged to: 3x as likely while you own one; never offered with 6 blueprints and none of them. */
  towers: TowerId[];
  /** Renown level that adds it to the pool (0 = from the first run). */
  unlock: number;
  flavour: string;
  /** Never sold in shops (The Ninth Pad; boss, event and starter relics). */
  noShop?: boolean;
  /** Not offered while you hold any of these (Black Ice / Cold Iron). */
  excludes?: RelicId[];
}

type Row = [name: string, text: string, tags: string, towers: TowerId[], unlock: number, flavour: string, extra?: Partial<RelicDef>];

const FROST: TowerId[] = ["frost"];
const BLOCK: TowerId[] = ["barracks", "thornwood"];

const TABLE: Partial<Record<Rarity, Row[]>> = {
  common: [
    ["Spare Planks", "The first tower you build each battle is free (its L1 cost after discounts, up to 100 gold).", "all", [], 0, "Left over from last time. There's always some left over."],
    ["War Chest", "Start each battle with 40 more gold (x gold).", "all", [], 0, "Heavier than it looks."],
    ["Lucky Horseshoe", "The first enemy to get through each battle costs no lives (never an elite or a boss).", "all", [], 0, "Nailed over the gate, points up."],
    ["Field Rations", "Rest heals 4 more lives.", "all", [], 0, "Hard bread, honest cheese."],
    ["Coin Purse", "+6 crowns after every battle with no lives lost.", "econ", [], 0, "It jingles when you do well."],
    ["Signal Horn", "The call-early bonus is doubled for waves 2, 3 and 4.", "econ", [], 0, "One blast: come on, then."],
    ["Snowglobe", "Enemies of wave 1, and a boss's escort, enter with their chill at 80%; it starts fading after 6 s.", "frost", FROST, 0, "Shake it and the first ones shiver."],
    ["Copper Coil", "Storm Spire chains reach 1 more enemy.", "storm", ["storm"], 0, "Wound tight, still humming."],
    ["Grease Pot", "Alchemist puddles are 30% larger.", "fire", ["alchemist"], 0, "Don't ask what's in it."],
    ["Marching Drum", "Soldiers move twice as fast to their rally point and respawn 25% sooner.", "block", BLOCK, 0, "Left, right, left, faster."],
  ],
  uncommon: [
    ["Black Ice", "Frozen enemies take 25% more damage from everything.", "frost", FROST, 2, "Dark ice is the hardest kind.", { excludes: ["cold-iron"] }],
    ["Storm Glass", "Storm Spires deal 60% more damage to Chilled or Frozen enemies.", "storm,frost", ["storm"], 10, "The weather in the glass is always a storm."],
    ["Hunter's Whistle", "Marked enemies drop 3 more gold (x gold) when they die.", "mark,econ", ["beacon"], 0, "Two short notes: dinner."],
    ["Armourer's Awl", "Every shred stack also lowers ward by 5.", "hex,fire", ["bombard", "alchemist", "barracks"], 0, "A tool for opening things."],
    ["Long Fuse", "Bombard shells leave fire where they land: 2 s, r 0.8, 15 fire dps; it lights oil.", "fire", ["bombard"], 2, "Lit early, lands late."],
    ["Thorn Collar", "Enemies held by a soldier take 10 physical damage a second (x act).", "block", BLOCK, 0, "It hurts more to push against it."],
    ["Echo Stone", "The first damage spell you cast each battle is cast again 1 s later at 60% strength. The first non-damage spell instead gets 50% of its cooldown back at once.", "spell", [], 0, "Say it once. Hear it twice."],
    ["Spyglass", "Archers and Ballistas get 15% more range and reveal stealthed enemies in their range.", "mark", ["archer", "ballista"], 0, "Brass, cracked, still true."],
    ["Iron Shutters", "No tower can be disabled for more than 2 s.", "all", [], 0, "Bolted from the inside."],
    ["Pilgrim's Map", "You can see what each ? node holds before you choose it.", "all", [], 0, "Someone walked this way before, and wrote it down."],
  ],
  rare: [
    ["The Ninth Pad", "Every map has one extra build spot, on a good bend (never the best one).", "wide,all", [], 0, "Someone left a foundation here. Lucky.", { id: "ninth-pad", noShop: true }],
    ["Tidewater Vial", "Chilled enemies count as Oiled: fire ignites them (using up their chill) and Naphtha's explosions catch them.", "frost,fire", ["frost", "pyre", "alchemist"], 18, "Sea water, cold as a grave, burns like lamp oil."],
    ["Prism Lens", "Beacon marks also hex (+20% taken, no healing, shields halved) while they last.", "mark,hex", ["beacon"], 10, "Light, bent into a curse."],
    ["Cold Iron", "Physical damage ignores all armour on Frozen enemies.", "frost", FROST, 15, "Old iron hates the cold, and what lives in it.", { excludes: ["black-ice"] }],
    ["Old Oak Seed", "When a soldier falls, a bramble grows there and roots the next ground enemy to pass for 1.5 s.", "block", BLOCK, 15, "Plant it where someone brave fell."],
    ["Twin Crests", "Once per battle, the first tower you specialise may also buy the other specialisation at full price.", "tall", [], 10, "Two houses, one shield."],
    ["Phoenix Feather", "The first time your lives reach 0, they return to 8 (not when an elite or a boss takes the last life). Then it crumbles.", "all", [], 0, "Warm to the touch, for now."],
    // R15, R19: new rares.
    ["Dragonglass", "Fire damage ignores fireproofing.", "fire", ["pyre", "alchemist"], 18, "Black glass from a dragon's bed. Fire remembers it."],
    ["Deadeye's Oath", "Crits against Marked enemies deal x5, from every tower.", "mark", ["beacon"], 10, "Swear it on the string: one shot, one end."],
    ["Wildfire Crown", "Burns stack: an enemy can carry burns from up to 3 different towers or spells at once.", "fire", ["pyre"], 2, "It sits on no head. It burns all the same."],
  ],
  boss: [
    ["Royal Mint", "Start each battle with 150 more gold (x gold).", "econ,tall", [], 0, "Stamped with a face nobody likes.", { downside: "Kills give 15% less gold." }],
    ["Mason's Seal", "Building and upgrading cost 25% less.", "wide", [], 0, "Square, level, plumb.", { downside: "Specialisations cost 50% more." }],
    ["Siege Engine", "Every tower is built at L2, for its L1 cost plus half its L2 cost.", "all", [], 0, "Assembled on site. Slowly.", { downside: "You can't call waves early." }],
    ["Sun Disc", "Commander spells recharge twice as fast.", "spell", [], 0, "Bright enough to see the spells coming back.", { downside: "You can't choose Rest at camps (Drill and Fortify only)." }],
    ["Seven Bells", "Two extra build spots on every map.", "wide", [], 15, "They ring for the dead, and the dead come.", { downside: "Every wave is 15% bigger." }],
    ["Hollow Crown", "Card rewards show 1 more card.", "all", [], 0, "It fits anyone. That's the trouble.", { downside: "Shop prices are doubled." }],
    ["Pact of Embers", "+6 max lives, and heal to full now.", "all", [], 18, "Signed in something warmer than ink.", { downside: "Every enemy that gets through costs 1 more life (not elites or bosses)." }],
    ["Crowded Banners", "Towers gain 10% attack speed for each tower on a spot within 2.8 u.", "wide", [], 15, "Shoulder to shoulder, or not at all.", { downside: "Towers with no tower within 2.8 u attack 30% slower." }],
    // R19: the attack-speed cap-lifter.
    ["Overclock", "Towers attack 25% faster, and the attack-speed cap is +200% instead of +100%.", "tall", [], 15, "Run it hot. Run it until it glows.", { downside: "Towers overheat: every attacking tower has 1 u less range." }],
  ],
  shop: [
    ["Guild Seal", "Shop prices 20% lower; the restock is free.", "econ", [], 0, "Members pay less. Members always pay less."],
    ["Abacus", "The gold interest cap is doubled.", "econ", [], 0, "Click, click, profit."],
    ["Merchant's Bell", "? nodes are 3x as likely to be shops; shops carry one more relic.", "econ", [], 0, "Ring it and someone with a cart appears."],
    ["Smuggler's Crate", "Skipping a card gives a random boon for your tower with the most boons instead of crowns.", "tall", [], 0, "No questions, no receipts."],
    ["Wayfarer's Spade", "Camps offer Dig: find a relic.", "all", [], 0, "Every campsite has something buried under it."],
    ["Bellows", "Forge Hone shows 4 boons; Temper upgrades 3.", "tall", [], 18, "Breathe on the coals and they remember."],
  ],
  event: [
    ["Votive Candle", "Camps offer Pray: lift a curse.", "all", [], 0, "Someone else's prayer. You carry it now."],
    ["Widow's Hammer", "Each Temper also tempers one random other boon.", "tall", [], 0, "Worn smooth where his hand was."],
  ],
  starter: [
    ["Old Standard", "After a battle with 0 or 1 lives lost, heal 1 life.", "all", [], 0, "Faded, patched, still flying."],
    ["Bubbling Retort", "Each battle starts with 3 oil puddles on the road's longest straight. They stay until lit.", "fire", [], 0, "It never quite stops simmering."],
    ["Third Eye", "Card rewards show 4 cards.", "all", [], 0, "It sees the choice you'd have missed."],
    ["Ledger", "Leftover battle gold turns into crowns at 1 per 5 gold, up to 20.", "econ", [], 0, "Every coin in its column."],
    ["Heartwood", "+6 max lives.", "all", [], 0, "A slice of the oldest tree, still warm."],
  ],
};

export const RELICS: RelicDef[] = (Object.keys(TABLE) as Rarity[]).flatMap((rarity) =>
  TABLE[rarity]!.map(([name, text, tags, towers, unlock, flavour, extra]) => ({
    id: idOf(name), name, rarity, text, tags: tags.split(","), towers, unlock, flavour,
    ...(rarity === "boss" || rarity === "event" || rarity === "starter" ? { noShop: true } : {}),
    ...extra,
  })),
);

export const RELIC: Record<RelicId, RelicDef> = Object.fromEntries(RELICS.map((r) => [r.id, r]));

/** The draft pool (relics that can be offered by rewards, shops, treasure and events). */
export const POOL_RARITIES: Rarity[] = ["common", "uncommon", "rare", "boss", "shop"];
