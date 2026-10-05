// Events (content.md 10, R16, R22, R27): 30 events, text, choices and their exact outcomes.
// Outcomes run against an EventCtx (game/run/events.ts) and return the line the player reads next.
import type { Act, EventId } from "../../types.ts";
import type { EventCtx } from "../../run/events.ts";
import { idOf } from "./ids.ts";

export interface EventChoice {
  id: string;
  label: string;
  /** What it does, in plain numbers. */
  text: string;
  /** Why it can't be taken now (greyed), or null. */
  need?: (c: EventCtx) => string | null;
  /** Apply the outcome; return the line shown after (empty = the event just ends). */
  run: (c: EventCtx) => string | void;
}

export interface EventDef {
  id: EventId;
  name: string;
  /** Acts it can appear in (empty = any act). */
  acts: Act[];
  /** Unlocked by renown (not in the pool from the start). */
  locked?: boolean;
  text: string;
  choices: EventChoice[] | ((c: EventCtx) => EventChoice[]);
}

const ch = (label: string, text: string, run: EventChoice["run"], need?: EventChoice["need"]): EventChoice =>
  ({ id: idOf(label), label, text, run, ...(need ? { need } : {}) });
const nothing = (label: string, line = "You move on.") => ch(label, "Nothing.", () => line);
const lives = (n: number) => `You lose ${n} ${n === 1 ? "life" : "lives"}.`;

const E = (name: string, acts: Act[], text: string, choices: EventDef["choices"], locked = false): EventDef =>
  ({ id: idOf(name), name, acts, text, choices, ...(locked ? { locked } : {}) });

export const EVENTS: EventDef[] = [
  // ---------------------------------------------------------------- any act
  E("The Crossroads Shrine", [], "A small stone shrine stands where four roads meet. Candles burn inside it, though no one is near. The wax is still soft.", [
    ch("Pray", "Lose 3 lives. Choose a rare boon for one of your towers (pick 1 of 3).", (c) => { c.lives(-3); c.chooseBoon("rare"); return lives(3); }),
    ch("Leave a coin", "Pay 25 crowns. Lift a curse; if you have none, heal 5 lives.", (c) => {
      c.pay(25);
      if (c.curses.length) { c.liftOne(); return "The candles gutter. Something lets go of you."; }
      c.lives(5); return "You feel lighter. You heal 5 lives.";
    }, (c) => c.needCrowns(25)),
    ch("Take a candle", "Gain the Votive Candle. Gain the curse Toll.", (c) => { c.relicId("votive-candle"); c.curse("toll"); return "You gain the Votive Candle, and the curse Toll."; }),
  ]),
  E("The Old Battlefield", [], "Rusted helms lie in the long grass, a whole line of them, all facing the same way. Something glints under a broken shield. Crows watch from a dead tree.", (c) => {
    const risk = 25 + 15 * c.data;
    return [
      ch(c.data ? "Search again" : "Search", `${100 - risk}%: gain 20 crowns and search again. ${risk}%: something wakes; lose 2 lives.${c.data === 2 ? " A third find also turns up a relic." : ""}`, (x) => {
        if (x.g.chance(risk / 100)) { x.lives(-2); return `Something wounded wakes. ${lives(2)}`; }
        x.crowns(20);
        const found = x.data + 1;
        let line = "You find 20 crowns.";
        if (found === 3) line += ` ${x.relic({ uncommon: 1 })}`;
        x.keep(1, found);
        return line;
      }),
      nothing("Leave"),
    ];
  }),
  E("The Tinker's Cart", [], "A cart full of springs, lenses and little brass wheels. The tinker says he can make anything better, for a price. He has not stopped talking since you arrived.", [
    ch("Trade up", "Give up one common or uncommon boon. Choose 1 of 2 boons one rarity higher for the same tower.", (c) => {
      c.chooseOwnBoon("tinker-give", "Give the tinker a boon", (b) => c.boonRarity(b) !== "rare"); return "He turns it over in his hands.";
    }, (c) => (c.r.loadout.boons.some((b) => c.boonRarity(b) !== "rare") ? null : "No boon to trade")),
    ch("Mystery crate", "Pay 40 crowns. Gain a random relic: common 60%, uncommon 40%.", (c) => { c.pay(40); return c.relic({ common: 60, uncommon: 40 }); }, (c) => c.needCrowns(40)),
    nothing("Move on"),
  ]),
  E("A Deserter", [], "A soldier in a torn tabard steps out of the trees with his hands open. \"Their side is losing,\" he says. \"I'd rather be on yours.\"", [
    ch("Take him in", "Gain a random unlocked tower card you don't own. With 6, choose one to replace (its boons pay 10 crowns each).", (c) => {
      const t = c.randomBlueprint();
      if (!t) { c.crowns(20); return "He has nothing new to teach. He gives you 20 crowns."; }
      c.tower(t); return "He knows a trade you don't.";
    }),
    ch("Ask for his map", "See what every ? node on this act's map holds.", (c) => { c.revealUnknown(); return "He marks the map with a stub of charcoal."; }),
    ch("Send him away", "Heal 3 lives.", (c) => { c.lives(3); return "You heal 3 lives."; }),
  ]),
  E("The Gambler's Table", [], "Three cups and a dried pea, on a barrel by the road. The man behind it smiles too much.", [
    ch("Bet 30 crowns", "45%: win 75 crowns (+45). 55%: lose the 30.", (c) => {
      c.pay(30);
      if (c.g.chance(0.45)) { c.crowns(75); return "You win 75 crowns."; }
      return "The pea was never there. You lose 30 crowns.";
    }, (c) => c.needCrowns(30)),
    ch("Bet a life", "50%: a random uncommon boon for one of your towers. 50%: lose 3 lives.", (c) => {
      if (c.g.chance(0.5)) return c.boons(c.towers, 1, { uncommon: 1 });
      c.lives(-3); return lives(3);
    }),
    nothing("Watch, then leave"),
  ]),
  E("The Smith's Widow", [], "Her husband's forge has been cold since the spring. She looks at your towers for a long time, then offers to light it once more.", [
    ch("Temper two boons", "Temper two boons of your choice, free.", (c) => { c.temperPick(2); return "The forge roars."; }, (c) => c.needBoons()),
    ch("Take his hammer", "Gain the Widow's Hammer.", (c) => { c.relicId("widows-hammer"); return "You gain the Widow's Hammer."; }),
  ]),
  E("Refugees on the Road", [], "A line of carts, children asleep on the sacks. They have walked a long way. They ask for nothing.", [
    ch("Give 30 crowns", "+3 max lives and heal 3 lives.", (c) => { c.pay(30); c.maxLives(3, true); return "+3 max lives, and you heal 3."; }, (c) => c.needCrowns(30)),
    ch("Walk with them", "Your next battle has 2 fewer waves and gives no card reward (crowns as normal).", (c) => { c.walk(); return "You walk slowly, and the road is quieter for it."; }),
    nothing("Pass by"),
  ]),
  E("The Wandering Bard", [], "He has heard of you, he says, and could make you famous. His lute has three strings left.", [
    ch("Pay him 20 crowns", "The next boss starts with 10% less health.", (c) => { c.pay(20); c.bossHp(-10); return "He sings of your victory before it happens."; }, (c) => c.needCrowns(20)),
    ch("Ask for a song of the road", "See the next act's map and boss now.", (c) => { c.revealNext(); return "He sings of the road ahead, and you listen."; }, (c) => (c.r.act >= 4 ? "Not in act IV" : null)),
    nothing("Tell him to go"),
  ]),
  E("The Overturned Wagon", [], "A supply wagon lies on its side in the ditch, one wheel still turning. The crates are stencilled with our own crest. Nobody is guarding them.", [
    ch("Take what you can carry", "Gain two random war supplies.", (c) => c.supplies(2)),
    ch("Right the wagon", "Lose 2 lives. Gain three random war supplies and 15 crowns.", (c) => { c.lives(-2); c.crowns(15); return `${lives(2)} ${c.supplies(3)} And 15 crowns.`; }),
    nothing("Leave it for its owners"),
  ]),
  E("The Recruiting Sergeant", [], "A sergeant with a drum and a list of names sits on a milestone. \"I can find you men,\" he says, \"or I can make the ones you have better.\"", [
    ch("Hire a crew", "Pay 35 crowns. Choose a tower: it gains a random uncommon boon.", (c) => {
      c.pay(35); c.chooseTower("tower-boon", "Which tower gets the crew?", { rarity: "uncommon" }, (t) => (c.canBoon(t, "uncommon") ? null : "Nothing left to offer")); return "He counts the coins twice.";
    }, (c) => c.needCrowns(35) ?? (c.towers.some((t) => c.canBoon(t, "uncommon")) ? null : "Nothing left to offer")),
    ch("Drill your own", "Lose 2 lives. Temper one boon of your choice.", (c) => { c.lives(-2); c.temperPick(1); return lives(2); }, (c) => c.needBoons()),
    nothing("Decline"),
  ]),

  // ---------------------------------------------------------------- act I
  E("The Miller's Fire", [1], "The mill is burning. The miller is on the roof, waving his hat, and the ladder is on fire too.", [
    ch("Climb up", "Lose 3 lives. Gain the Pyre (if you own it, a random Pyre boon instead) and 30 crowns.", (c) => { c.lives(-3); c.crowns(30); return `${lives(3)} ${c.towerOrBoon("pyre")} And 30 crowns.`; }),
    ch("Fetch water", "If you own a Frost Spire, gain a random Frost Spire boon; otherwise gain 15 crowns.", (c) => {
      if (c.owns("frost")) return c.boons(["frost"], 1, { common: 60, uncommon: 35, rare: 5 });
      c.crowns(15); return "The miller pays you 15 crowns.";
    }),
    nothing("Keep going"),
  ]),
  E("Bees in the Orchard", [1], "The old orchard hums. A hive as big as a barrel hangs from the biggest tree, and the honey drips into the grass.", [
    ch("Take the honey", "Heal 6 lives.", (c) => { c.lives(6); return "You heal 6 lives."; }),
    ch("Take the whole hive", "Lose 4 lives. Gain the Thornwood Grove (if you own it, two random Thornwood boons; if it is still locked, two random boons for your towers).", (c) => {
      c.lives(-4);
      if (!c.r.book.unlocked.towers.includes("thornwood")) return `${lives(4)} ${c.boons(c.towers, 2, { common: 60, uncommon: 35, rare: 5 })}`;
      if (c.owns("thornwood")) return `${lives(4)} ${c.boons(["thornwood"], 2, { common: 60, uncommon: 35, rare: 5 })}`;
      c.tower("thornwood"); return `${lives(4)} The Thornwood Grove joins your war table.`;
    }),
  ]),
  E("The Harvest Fair", [1], "Bunting between the barns, a pig on a spit, and a shooting contest with a silver prize. Nobody here seems to know there is a war.", [
    ch("Enter the contest", "If you own an Archer or a Ballista, gain 40 crowns; otherwise gain 15 crowns.", (c) => {
      const n = c.owns("archer") || c.owns("ballista") ? 40 : 15; c.crowns(n); return `You win ${n} crowns.`;
    }),
    ch("Buy at the stalls", "Pay 25 crowns. Gain two random war supplies.", (c) => { c.pay(25); return c.supplies(2); }, (c) => c.needCrowns(25)),
    ch("Rest a while", "Heal 4 lives.", (c) => { c.lives(4); return "You heal 4 lives."; }),
  ]),
  E("The Scarecrow", [1], "A scarecrow stands in an empty field in a good new coat, its eyes stitched shut. The crows won't come near it. Neither will the wind.", [
    ch("Take its coat", "Gain a random common relic. Gain the curse Haunted.", (c) => { const l = c.relic({ common: 1 }); c.curse("haunted"); return `${l} You gain the curse Haunted.`; }),
    ch("Burn it", "Lose 1 life. Lift a curse; if you have none, gain 20 crowns.", (c) => {
      c.lives(-1);
      if (c.curses.length) { c.liftOne(); return `${lives(1)} Something burns away with it.`; }
      c.crowns(20); return `${lives(1)} You find 20 crowns in the ashes.`;
    }),
    nothing("Leave it standing"),
  ]),
  E("The Ford", [1], "The river is high and brown. A ferryman waits with a flat boat; a mile upstream an old bridge still stands, mostly.", [
    ch("Pay the ferryman", "Pay 20 crowns. Your next battle starts with 60 more gold.", (c) => { c.pay(20); c.nextGold(60); return "You cross dry, with time to spare."; }, (c) => c.needCrowns(20)),
    ch("Take the bridge", "Gain 15 crowns from what washed up. 40%: a plank gives way; lose 3 lives.", (c) => {
      c.crowns(15);
      if (c.g.chance(0.4)) { c.lives(-3); return `You find 15 crowns. A plank gives way. ${lives(3)}`; }
      return "You find 15 crowns, and the bridge holds.";
    }),
    ch("Wade across", "Lose 1 life.", (c) => { c.lives(-1); return lives(1); }),
  ]),
  E("The Lost Patrol", [1], "Four of our own soldiers, mud to the knees, sheltering under a hedge. Their captain is gone. They ask who is in charge now.", [
    ch("Take them on", "Gain the Barracks (if you own it, a random Barracks boon).", (c) => c.towerOrBoon("barracks")),
    ch("Send them home", "+2 max lives and heal 2 lives.", (c) => { c.maxLives(2, true); return "+2 max lives, and you heal 2."; }),
    ch("Arm them and march on", "Pay 15 crowns. Gain a Spike Trap and a War Horn.", (c) => { c.pay(15); return c.supplies(2, ["spike-trap", "war-horn"]); }, (c) => c.needCrowns(15)),
  ]),

  // ---------------------------------------------------------------- act II
  E("The Sunken Vault", [2], "A stone door in the sand, half buried. Old words are cut above it: \"What is taken is paid for.\"", [
    ch("Open it", "Gain a random rare relic. Gain the curse Debt.", (c) => { const l = c.relic({ rare: 1 }); c.curse("debt"); return `${l} You gain the curse Debt.`; }),
    ch("Mark it and move on", "Gain 25 crowns.", (c) => { c.crowns(25); return "You gain 25 crowns."; }),
  ]),
  E("The Mirage Market", [2], "Stalls shimmer in the heat, too bright to be real. Everything on them is half price. The merchants don't cast shadows.", [
    ch("Shop", "A full shop at half price. When you leave, the most expensive thing you bought turns to sand and is lost.", (c) => { c.shop(true); return ""; }),
    nothing("Walk past"),
  ]),
  E("The Sphinx", [2], "It doesn't ask a riddle. It asks which of your towers you trust most, and waits.", [
    ch("Name one", "Choose a tower: it gains two random boons (common 60, uncommon 35, rare 5). One other tower with a boon loses one boon (random).", (c) => {
      c.chooseTower("sphinx", "Which tower do you trust most?", {}, (t) => (c.canBoon(t) ? null : "Nothing left to offer"));
      return "The sphinx nods slowly.";
    }),
    nothing("Name none", "Nothing happens. The sphinx looks disappointed."),
  ]),
  E("The Dry Well", [2], "A well in the ruins, its rope long gone. Far below something glints, and a cold breath rises from the dark.", [
    ch("Climb down", "Lose 3 lives. Gain a random uncommon relic.", (c) => { c.lives(-3); return `${lives(3)} ${c.relic({ uncommon: 1 })}`; }),
    ch("Drop a coin and wish", "Pay 10 crowns. Heal 4 lives.", (c) => { c.pay(10); c.lives(4); return "You heal 4 lives."; }, (c) => c.needCrowns(10)),
    nothing("Move on"),
  ]),
  E("The Caravan Master", [2], "Forty camels and one tired man with a ledger. He sells to both sides, and says so cheerfully.", [
    ch("Buy his oil", "Pay 30 crowns. Gain two Oil Barrels and a Frost Flask.", (c) => { c.pay(30); return c.supplies(3, ["oil-barrel", "oil-barrel", "frost-flask"]); }, (c) => c.needCrowns(30)),
    ch("Sell him a tower", "Remove one tower card and its boons. Gain 70 crowns.", (c) => { c.chooseTower("sell-tower", "Which tower do you sell?", { crowns: 70 }); return "He opens his ledger."; },
      (c) => (c.towers.length >= 4 ? null : "Need 4 tower cards")),
    ch("Ask about the road", "See what every ? node on this act's map holds.", (c) => { c.revealUnknown(); return "He tells you what he has seen on the road."; }),
  ]),
  E("The Buried King", [2], "A stone king's head, tall as a house, half sunk in the sand. Its mouth is open, and the wind moans through it.", [
    ch("Dig out its hands", "Lose 2 lives. Choose a rare boon for one of your towers (pick 1 of 3).", (c) => { c.lives(-2); c.chooseBoon("rare"); return lives(2); }),
    ch("Read the words on its brow", "Choose a tower: it gains a random common boon, already tempered.", (c) => {
      c.chooseTower("tower-boon", "Which tower reads the words?", { rarity: "common", temper: true }, (t) => (c.canBoon(t, "common") ? null : "Nothing left to offer")); return "The words are older than the sand.";
    }, (c) => (c.towers.some((t) => c.canBoon(t, "common")) ? null : "Nothing left to offer")),
    nothing("Leave it to the sand"),
  ]),

  // ---------------------------------------------------------------- act III
  E("The Frozen Knight", [3], "A knight stands in the ice, sword raised, eyes open. The ice around his heart is thinner than the rest.", [
    ch("Thaw him", "Lose 4 lives. Gain a random rare relic.", (c) => { c.lives(-4); return `${lives(4)} ${c.relic({ rare: 1 })}`; }),
    ch("Take the sword", "Gain a random uncommon relic. Gain the curse Cold Hands.", (c) => { const l = c.relic({ uncommon: 1 }); c.curse("cold-hands"); return `${l} You gain the curse Cold Hands.`; }),
    nothing("Leave him to the cold"),
  ]),
  E("The Avalanche Pass", [3], "Snow hangs over the narrow pass like a held breath. One loud word would bring it down.", [
    ch("Go quietly", "Gain 20 crowns. Skip the next floor: move to any node two floors ahead that a path reaches from here.", (c) => { c.crowns(20); c.leap(); return "You slip through before the snow lets go."; },
      (c) => (c.r.map.nodes[c.r.at]?.floor ?? 9) >= 5 ? "The camps are next" : null),
    ch("Dig through the old road", "Pay 30 crowns. Hone at a forge here (see 3 boons for one tower, take one).", (c) => { c.pay(30); c.hone(); return "You find an old smithy under the snow."; }, (c) => c.needCrowns(30)),
    ch("Wait it out", "Heal 4 lives.", (c) => { c.lives(4); return "You heal 4 lives."; }),
  ]),
  E("The Hermit", [3], "An old man lives in a cave lined with maps, most of them of places that no longer exist. He asks what you would give up to win.", [
    ch("A tower", "Remove one tower card and its boons (no crowns). Two other towers each gain a rare boon (pick 1 of 3 for each).", (c) => {
      c.chooseTower("hermit-remove", "Which tower do you give up?"); return "He takes it without a word.";
    }, (c) => (c.towers.length >= 3 ? null : "Need 3 tower cards")),
    ch("Time", "See the next act's map and its elites now.", (c) => { c.revealNext(); return "He unrolls a map of the road ahead."; }, (c) => (c.r.act >= 4 ? "Not in act IV" : null)),
    ch("Nothing", "He nods and gives you tea. Heal 2 lives.", (c) => { c.lives(2); return "You heal 2 lives."; }),
  ]),
  E("The Ice Bridge", [3], "A bridge of clear ice spans the gorge. Soldiers are frozen inside it, all walking the same way.", [
    ch("Cross quickly", "70%: gain 25 crowns from a frozen purse. 30%: the ice cracks; lose 4 lives.", (c) => {
      if (c.g.chance(0.3)) { c.lives(-4); return `The ice cracks. ${lives(4)}`; }
      c.crowns(25); return "You gain 25 crowns from a frozen purse.";
    }),
    ch("Cut one free", "Gain a random Frost Spire boon (if you don't own a Frost Spire, its tower card). Gain the curse Cold Hands.", (c) => {
      const l = c.owns("frost") ? c.boons(["frost"], 1, { common: 60, uncommon: 35, rare: 5 }) : (c.tower("frost"), "The Frost Spire joins your war table.");
      c.curse("cold-hands"); return `${l} You gain the curse Cold Hands.`;
    }),
    ch("Go around", "Lose 1 life.", (c) => { c.lives(-1); return lives(1); }),
  ]),
  E("The Ember Shrine", [3], "A shrine to some fire god, high in the snow, its brazier still lit. The warmth is the first you have felt in days.", [
    ch("Warm your hands", "Heal 6 lives.", (c) => { c.lives(6); return "You heal 6 lives."; }),
    ch("Feed it a boon", "Lose one boon of your choice. Gain a random rare relic.", (c) => { c.chooseOwnBoon("feed-boon", "Which boon goes into the fire?"); return "The brazier flares."; },
      (c) => (c.r.loadout.boons.length ? null : "No boon")),
    ch("Take a coal", "Lose 2 lives. Gain the Pyre (if you own it, a random Pyre boon).", (c) => { c.lives(-2); return `${lives(2)} ${c.towerOrBoon("pyre")}`; }),
  ]),
  E("The Snowed-In Inn", [3], "An inn half buried in drift, smoke from the chimney. Inside, veterans of every side play cards and pretend not to know each other.", [
    ch("Join the game", "Bet 40 crowns. 50%: win 100 (+60). 50%: lose the 40.", (c) => {
      c.pay(40);
      if (c.g.chance(0.5)) { c.crowns(100); return "You win 100 crowns."; }
      return "You lose 40 crowns.";
    }, (c) => c.needCrowns(40)),
    ch("Buy a round", "Pay 20 crowns. Temper two random boons.", (c) => { c.pay(20); return c.temperRandom(2); }, (c) => c.needCrowns(20) ?? c.needBoons()),
    ch("Sleep by the fire", "Heal 5 lives.", (c) => { c.lives(5); return "You heal 5 lives."; }),
  ]),

  // ---------------------------------------------------------------- unlocked at renown level 7, from act II
  E("The Wandering Merchant", [2, 3], "A cart pulled by a white ox, with no driver. Everything on it shines oddly, as if lit from inside.", [
    ch("Buy the boss relic", "A random boss relic you don't own, for 150 crowns and 3 lives.", (c) => { c.pay(150); c.lives(-3); return `${lives(3)} ${c.relic({ boss: 1 })}`; },
      (c) => c.needCrowns(150)),
    ch("Buy a rare boon", "80 crowns: choose 1 of 3 rare boons for your towers.", (c) => { c.pay(80); c.chooseBoon("rare"); return "He opens a velvet box."; }, (c) => c.needCrowns(80)),
    nothing("Leave"),
  ], true),
  E("The Ruined Chapel", [2, 3], "A roofless chapel. Snow, or sand, lies in the aisle, but the altar is clean, as if someone still tends it.", [
    ch("Leave your curses here", "Lift all curses. Lose 1 max life per curse lifted.", (c) => { const n = c.liftAll(); c.maxLives(-n); return `Your curses stay on the altar. -${n} max ${n === 1 ? "life" : "lives"}.`; },
      (c) => c.needCurse()),
    ch("Take the reliquary", "Gain two random relics (common 50, uncommon 35, rare 15). Gain two random curses.", (c) => {
      const a = c.relic({ common: 50, uncommon: 35, rare: 15 }), b = c.relic({ common: 50, uncommon: 35, rare: 15 });
      const cs = c.randomCurses(2);
      return `${a} ${b} You gain the curses ${cs.join(" and ")}.`;
    }),
  ], true),
];

export const EVENT: Record<EventId, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
