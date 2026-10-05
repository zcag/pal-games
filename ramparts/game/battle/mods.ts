// Battle-side effects of boons, relics, curses, commander passives and ascensions.
// Ids follow the id rule (architecture.md): "Glass Bones" -> "glass-bones".
// Pools (content.md 0.1): base / dealt / aspd / range / critC / cost / gold add into one
// pool each; the sim applies the caps. Tempered boons use content's tempered column.
import type { Act, CommanderId, Loadout, TowerId } from "../types.ts";
import { ACTS } from "../content/battle/acts.ts";
import { TOWER_IDS } from "../content/battle/towers.ts";

export interface TowerMods {
  dmgAdd: number;
  dealt: number;
  aspd: number;
  range: number;
  critC: number;
  cost: number;
  pierce: number;
  wardIgnore: number;
  /** Boon id -> 1 (base) or 2 (tempered). */
  b: Record<string, 1 | 2>;
}

export interface Mods {
  t: Record<TowerId, TowerMods>;
  /** Relics, curses, the commander's passive, perks: id -> true. */
  r: Record<string, boolean>;
  commander: CommanderId;
  asc: number;
  startGold: number;
  bountyPct: number;
  interestCapPct: number;
  countdownMul: number;
  callBonusMul: number;
  noCall: boolean;
  spellRate: number;
  aspdCap: number;
  /** Extra L1 cost % from blueprints 5 and 6 (R18). */
  l1Cost: number;
  bossHp: number;
  threatMul: number;
  bonusPads: number;
}

/** Which tower each tower boon belongs to (content.md 3). */
export const BOON_TOWER: Record<string, TowerId> = {
  "barbed-tips": "archer", "taut-strings": "archer", "high-perch": "archer", "keen-eyes": "archer", "twin-shot": "archer", "pitch-arrows": "archer", "glass-arrows": "archer",
  drilled: "barracks", whetstones: "barracks", "quick-muster": "barracks", "long-reach": "barracks", "shield-wall": "barracks", "fourth-soldier": "barracks", bait: "barracks",
  focus: "mage", "quickened-runes": "mage", "rune-breaker": "mage", "opening-bolt": "mage", "lingering-hex": "mage", "arc-splinter": "mage", "curse-engine": "mage",
  "heavy-shot": "bombard", "black-powder": "bombard", "quick-fuse": "bombard", "rapid-loader": "bombard", oilshot: "bombard", "concussive-shells": "bombard", shatterfall: "bombard",
  "deep-cold": "frost", "long-winter": "frost", frostbite: "frost", "lingering-cold": "frost", "frozen-mark": "frost", splinter: "frost", "glass-bones": "frost", "endless-winter": "frost",
  "thick-oil": "alchemist", "wide-flasks": "alchemist", "sticky-tar": "alchemist", "strong-brew": "alchemist", "caustic-oil": "alchemist", "twin-flasks": "alchemist", firewalk: "alchemist",
  hotter: "pyre", "wide-nozzle": "pyre", "long-flame": "pyre", "slow-burn": "pyre", backdraft: "pyre", scorching: "pyre", "cinder-rain": "pyre",
  "copper-wire": "storm", "long-arc": "storm", capacitor: "storm", "quick-coils": "storm", "seeking-sparks": "storm", "sky-arcs": "storm", grounding: "storm",
  "wider-light": "beacon", "quick-signal": "beacon", "long-mark": "beacon", "bright-mark": "beacon", "spreading-mark": "beacon", searchlight: "beacon", "hunters-moon": "beacon",
  "louder-drums": "banner", "tall-pole": "banner", "war-song": "banner", "standard-bearer": "banner", "brave-hearts": "banner", "field-forge": "banner",
  "long-draw": "ballista", "heavy-bolts": "ballista", winch: "ballista", "steel-tips": "ballista", "pinning-bolts": "ballista", "twin-bolts": "ballista", "spear-of-dawn": "ballista",
  "sharper-thorns": "thornwood", "wide-grove": "thornwood", "quick-roots": "thornwood", "thick-briars": "thornwood", "long-roots": "thornwood", "strangling-roots": "thornwood", "heartwood-bond": "thornwood",
};
/** Universal boons (one card names one tower). Cut by R16: sapper-proof, bounty, last-stand. */
export const UNIVERSAL = ["veteran", "thrifty", "overseer", "watchful", "rangefinder", "steadfast", "trophy"];

/**
 * A boon entry is "<boon>"; a universal boon's tower comes from `loadout.boonOn`, or is
 * written into the id ("veteran:archer", "archer:veteran", "veteran@archer", "archer/veteran").
 */
export function parseBoon(s: string): { boon: string; tower: TowerId | null } {
  const parts = s.toLowerCase().split(/[:@/]/);
  let tower: TowerId | null = null, boon = parts[0]!;
  for (const p of parts) if ((TOWER_IDS as string[]).includes(p)) tower = p as TowerId; else boon = p;
  if (!tower) tower = BOON_TOWER[boon] ?? null;
  return { boon, tower };
}

const blank = (): TowerMods => ({ dmgAdd: 0, dealt: 0, aspd: 0, range: 0, critC: 0, cost: 0, pierce: 0, wardIgnore: 0, b: {} });

/** Base/tempered value of a boon on a tower; 0 when absent. */
export function bv(m: Mods, tower: TowerId, boon: string, base: number, temp: number): number {
  const lv = m.t[tower].b[boon];
  return lv === 2 ? temp : lv === 1 ? base : 0;
}
export const hasB = (m: Mods, tower: TowerId, boon: string) => !!m.t[tower].b[boon];
export const has = (m: Mods, id: string) => !!m.r[id];

export function computeMods(l: Loadout, act: Act): Mods {
  const t = {} as Record<TowerId, TowerMods>;
  for (const id of TOWER_IDS) t[id] = blank();
  const tempered = new Set(l.tempered.map((s) => { const p = parseBoon(s); return `${p.boon}:${l.boonOn?.[s] ?? l.boonOn?.[p.boon] ?? p.tower}`; }));
  for (const s of l.boons) {
    const p = parseBoon(s);
    const boon = p.boon, tower = l.boonOn?.[s] ?? l.boonOn?.[boon] ?? p.tower;
    if (!tower) continue;
    t[tower].b[boon] = tempered.has(`${boon}:${tower}`) ? 2 : 1;
  }
  const r: Record<string, boolean> = {};
  for (const id of [...l.relics, ...l.curses, ...l.perks]) r[id.toLowerCase().replace(/_/g, "-")] = true;
  const passive = { marshal: "drillmaster", alchemist: "volatile", seer: "foresight", quartermaster: "supply-lines", warden: "deep-roots" }[l.commander];
  r[passive] = true;
  const gm = ACTS[act].bountyMul;
  const m: Mods = {
    t, r, commander: l.commander, asc: l.ascension,
    startGold: 0, bountyPct: 0, interestCapPct: 0, countdownMul: 1, callBonusMul: 1, noCall: false, spellRate: 1,
    aspdCap: 1.0, l1Cost: 0, bossHp: 0, threatMul: 1, bonusPads: 0,
  };
  // tower pools
  const P = (tw: TowerId, boon: string, field: keyof Omit<TowerMods, "b">, base: number, temp: number) => { m.t[tw][field] += bv(m, tw, boon, base, temp); };
  P("archer", "barbed-tips", "dmgAdd", 2, 3); P("archer", "taut-strings", "aspd", 0.12, 0.18); P("archer", "high-perch", "range", 0.12, 0.18); P("archer", "keen-eyes", "critC", 6, 10);
  P("mage", "focus", "dealt", 0.15, 0.22); P("mage", "quickened-runes", "aspd", 0.10, 0.15); P("mage", "rune-breaker", "wardIgnore", 15, 25);
  P("bombard", "black-powder", "dealt", 0.15, 0.22); P("bombard", "rapid-loader", "aspd", 0.12, 0.18);
  P("frost", "frostbite", "dmgAdd", 4, 6);
  P("alchemist", "strong-brew", "dealt", 0.25, 0.40);
  P("pyre", "long-flame", "range", 0.12, 0.18);
  P("storm", "capacitor", "dealt", 0.15, 0.22); P("storm", "quick-coils", "aspd", 0.12, 0.18);
  P("beacon", "wider-light", "range", 0.20, 0.30);
  P("banner", "tall-pole", "range", 0.20, 0.30); P("banner", "standard-bearer", "cost", -0.20, -0.30);
  P("ballista", "long-draw", "range", 0.15, 0.22); P("ballista", "heavy-bolts", "dealt", 0.15, 0.22); P("ballista", "winch", "aspd", 0.12, 0.18); P("ballista", "steel-tips", "pierce", 15, 25);
  P("thornwood", "wide-grove", "range", 0.15, 0.25);
  P("barracks", "whetstones", "dealt", 0.25, 0.40);
  for (const tw of TOWER_IDS) {
    P(tw, "thrifty", "cost", -0.15, -0.22);
    P(tw, "rangefinder", "range", 0.10, 0.15);
  }
  // relics / curses / passives / ascension
  if (has(m, "war-chest")) m.startGold += Math.round(40 * gm);
  if (has(m, "royal-mint")) { m.startGold += Math.round(150 * gm); m.bountyPct -= 0.15; }
  if (has(m, "abacus")) m.interestCapPct += 1.0;
  if (has(m, "gilded-ledger")) m.interestCapPct += 0.5; // cut by R16; harmless if a run still carries it
  if (l.ascension >= 2) m.interestCapPct -= 0.5;
  if (l.ascension >= 9) { m.countdownMul = 0.8; m.callBonusMul = 0.5; }
  if (has(m, "siege-engine")) m.noCall = true;
  if (has(m, "sun-disc")) m.spellRate = 2;
  if (has(m, "overclock")) m.aspdCap = 2.0;
  if (has(m, "dread")) m.bossHp += 0.15;
  if (has(m, "seven-bells")) { m.threatMul *= 1.15; m.bonusPads += 2; }
  if (has(m, "ninth-pad")) m.bonusPads += 1;
  m.l1Cost = Math.max(0, l.towers.length - 4) * 0.05;
  return m;
}
