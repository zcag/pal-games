// Commander spells (content.md 7.2, systems 11, R2/R11/R16) and war supplies (R20).
import type { CommanderId, SpellId, SpellState, SupplyId } from "../../types.ts";

export interface SpellDef {
  id: SpellId;
  name: string;
  commander: CommanderId;
  key: "Q" | "W";
  aim: SpellState["aim"];
  radius: number;
  cooldown: number;
  /** Deals damage (Echo Stone recasts it; others recharge instead). */
  damage: boolean;
  line: string;
  flavour: string;
}

export const SPELLS: Record<SpellId, SpellDef> = {
  reinforcements: { id: "reinforcements", name: "Reinforcements", commander: "marshal", key: "Q", aim: "point", radius: 0.8, cooldown: 35, damage: false,
    line: "Two soldiers drop on the road and hold for 10 s.", flavour: "Two good men, right where you need them." },
  meteor: { id: "meteor", name: "Meteor", commander: "marshal", key: "W", aim: "circle", radius: 1.4, cooldown: 40, damage: true,
    line: "After a moment, a burning rock: big fire damage and a burn.", flavour: "Look up." },
  firebomb: { id: "firebomb", name: "Firebomb", commander: "alchemist", key: "Q", aim: "circle", radius: 1.4, cooldown: 25, damage: true,
    line: "Oil and a match: fire damage, everyone inside ignites.", flavour: "Oil first. Then the match." },
  tarpit: { id: "tarpit", name: "Tar Pit", commander: "alchemist", key: "W", aim: "circle", radius: 2.0, cooldown: 40, damage: false,
    line: "A pool for 6 s: half speed and oiled inside. Fire lights it.", flavour: "Thick, black, and very flammable." },
  stillness: { id: "stillness", name: "Stillness", commander: "seer", key: "Q", aim: "instant", radius: 0, cooldown: 35, damage: false,
    line: "Every enemy freezes for 3 s.", flavour: "For a moment, nothing moves." },
  judgement: { id: "judgement", name: "Judgement", commander: "seer", key: "W", aim: "auto", radius: 0.8, cooldown: 20, damage: true,
    line: "Pure damage and a short stun on the enemy with the most health.", flavour: "The sky chooses." },
  requisition: { id: "requisition", name: "Requisition", commander: "quartermaster", key: "Q", aim: "point", radius: 0, cooldown: 20, damage: false,
    line: "The chosen tower gains a level at half price.", flavour: "Sign here." },
  rally: { id: "rally", name: "Rally", commander: "quartermaster", key: "W", aim: "instant", radius: 0, cooldown: 25, damage: false,
    line: "All towers and soldiers attack 40% faster for 8 s.", flavour: "Double time, everyone." },
  barrier: { id: "barrier", name: "Barrier", commander: "warden", key: "Q", aim: "point", radius: 0.7, cooldown: 20, damage: false,
    line: "A wall of roots closes the road for 4 s.", flavour: "The road is closed." },
  bramblesurge: { id: "bramblesurge", name: "Bramble Surge", commander: "warden", key: "W", aim: "circle", radius: 2.2, cooldown: 25, damage: true,
    line: "Roots everything in a wide circle for 2 s.", flavour: "The ground grabs back." },
};

export const COMMANDER_SPELLS: Record<CommanderId, [SpellId, SpellId]> = {
  marshal: ["reinforcements", "meteor"],
  alchemist: ["firebomb", "tarpit"],
  seer: ["stillness", "judgement"],
  quartermaster: ["requisition", "rally"],
  warden: ["barrier", "bramblesurge"],
};

/** Spell numbers (act I values; "x act" ones multiply by spellMul). */
export const SPELL_NUM = {
  reinfHp: 90, reinfArmour: 15, reinfDmg: 8, reinfS: 10,
  meteorDelay: 1.0, meteorDmg: 160, meteorBurn: 20, meteorBurnS: 3,
  firebombDmg: 80, firebombS: 6,
  tarS: 6, tarSlow: 50, tarBossSlow: 25,
  stillS: 3, stillElite: 1.5,
  judgeDmg: 350, judgeStun: 1, judgeBossStun: 0.25,
  rallyAspd: 40, rallyS: 8,
  barrierS: 4, barrierBreak: 1,
  surgeRoot: 2, surgeDmg: 60, surgeSlow: 50,
  airMul: 0.5,
  echoMul: 0.6, echoDelay: 1.0,
} as const;

export interface SupplyDef {
  id: SupplyId;
  name: string;
  line: string;
  aim: "point" | "circle" | "instant";
  radius: number;
}

export const SUPPLIES: Record<SupplyId, SupplyDef> = {
  "oil-barrel": { id: "oil-barrel", name: "Oil Barrel", line: "Spills a big oil puddle on the road.", aim: "circle", radius: 1.2 },
  "frost-flask": { id: "frost-flask", name: "Frost Flask", line: "Freezes everything in a small circle.", aim: "circle", radius: 1.5 },
  "gold-cache": { id: "gold-cache", name: "Gold Cache", line: "+60 gold now.", aim: "instant", radius: 0 },
  "spike-trap": { id: "spike-trap", name: "Spike Trap", line: "Hurts the next 8 enemies to walk over it.", aim: "point", radius: 0.6 },
  "war-horn": { id: "war-horn", name: "War Horn", line: "Every tower attacks 30% faster for 8 s.", aim: "instant", radius: 0 },
  "masons-kit": { id: "masons-kit", name: "Mason's Kit", line: "Every disabled tower works again at once.", aim: "instant", radius: 0 },
  flare: { id: "flare", name: "Flare", line: "Shows every hidden enemy for 10 s.", aim: "instant", radius: 0 },
  "heavy-bolt": { id: "heavy-bolt", name: "Heavy Bolt", line: "A huge pure hit on the strongest enemy.", aim: "instant", radius: 0 },
  bell: { id: "bell", name: "Bell", line: "Stuns every enemy for 1.5 s.", aim: "instant", radius: 0 },
  lifeblood: { id: "lifeblood", name: "Lifeblood", line: "+2 lives.", aim: "instant", radius: 0 },
};

export const SUPPLY_NUM = {
  oilS: 8, flaskFreeze: 2.0, gold: 60, spikeDmg: 60, spikeCount: 8, spikeS: 30, hornAspd: 30, hornS: 8,
  flareS: 10, boltDmg: 300, bellStun: 1.5, lives: 2,
} as const;
