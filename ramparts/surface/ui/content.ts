// Every player-facing word the UI shows comes from the content tables (game/content/**, read
// only); this file only adapts them to what the screens need and adds the UI's own words
// (node rims, status colours, badge names) in content.md section 14's vocabulary.
import type { Act, BossId, CommanderId, DamageType, NodeKind, Rarity, SpecId, SpellId, SupplyId, TowerId } from "../../game/types.ts";
import { TOWERS as BT, SPEC_OF, purchaseCost, statsOf as bStats, type TStats } from "../../game/content/battle/towers.ts";
import { ENEMIES as BE } from "../../game/content/battle/enemies.ts";
import { SPELLS as BS, SUPPLIES as BSUP } from "../../game/content/battle/spells.ts";
import { ACTS as BA } from "../../game/content/battle/acts.ts";
import { RELIC } from "../../game/content/run/relics.ts";
import { BOON } from "../../game/content/run/boons.ts";
import { CURSE } from "../../game/content/run/curses.ts";
import { EVENT } from "../../game/content/run/events.ts";
import { SUPPLY } from "../../game/content/run/supplies.ts";
import { COMMANDERS as RC } from "../../game/content/run/commanders.ts";
import { ASCENSIONS as RASC } from "../../game/content/run/ascensions.ts";
import { BLESSINGS as RBL, RARE_BLESSING } from "../../game/content/run/blessings.ts";
import { BOSS_INFO, BOUNTIES as RBOUNTY, AFFIXES as RAFF } from "../../game/content/run/map.ts";
import { PERKS } from "../../game/content/run/unlocks.ts";

export type { TStats };

// ---------------------------------------------------------------- towers and specs (battle content)
export interface TowerText { name: string; line: string; flavour: string; c: number; dmg: DamageType | "none"; air: boolean; specs: [SpecId, SpecId]; support: boolean; accent: string }
export const TOWER_IDS = Object.keys(BT) as TowerId[];
export const TOWERS = Object.fromEntries(TOWER_IDS.map((t) => {
  const d = BT[t];
  const dmg: DamageType | "none" = d.support ? "none" : d.levels[0].type ?? "phys";
  return [t, { name: d.name, line: d.line, flavour: d.flavour, c: d.cost, dmg, air: d.air, specs: [d.specs[0].id, d.specs[1].id], support: d.support, accent: d.accent }];
})) as Record<TowerId, TowerText>;

export const SPECS = Object.fromEntries(TOWER_IDS.flatMap((t) => BT[t].specs.map((s) => [s.id, { name: s.name, line: s.line, mechanic: s.mechanic, cost: s.cost, accent: s.accent, air: s.air }]))) as
  Record<SpecId, { name: string; line: string; mechanic: string; cost: number; accent: string; air: boolean }>;
export const specTower = (s: SpecId) => SPEC_OF[s].tower;

/** Content cost of the purchase that takes a tower to `level` (1..4). */
export const stepCost = (t: TowerId, level: number, spec: SpecId | null = null) => purchaseCost(t, level, spec);
export const towerStats = (t: TowerId, level: number, spec: SpecId | null) => bStats(t, level, spec);
export const towerAir = (t: TowerId, level: number, spec: SpecId | null) => (level >= 4 && spec ? SPECS[spec].air : BT[t].air);

// ---------------------------------------------------------------- enemies and bosses
export const ENEMIES: Record<string, { name: string; line: string }> = Object.fromEntries(Object.entries(BE).map(([k, e]) => [k, { name: e.name, line: e.line }]));
export const enemyLeak = (k: string) => BE[k as keyof typeof BE]?.leak ?? 1;
export const enemy = (k: string) => ENEMIES[k] ?? { name: titleCase(k), line: "" };

export interface BossText { name: string; act: Act; tip: string }
export const BOSSES = Object.fromEntries(Object.values(BOSS_INFO).map((b) => [b.id, { name: b.name, act: b.act, tip: b.line }])) as Record<BossId, BossText>;
export const AFFIXES: Record<string, { name: string; text: string }> = Object.fromEntries(RAFF.map((a) => [a.id, { name: a.name, text: a.text }]));

// ---------------------------------------------------------------- spells and supplies
export const SPELLS = Object.fromEntries(Object.values(BS).map((s) => [s.id, { name: s.name, line: s.line, cd: s.cooldown, flavour: s.flavour }])) as Record<SpellId, { name: string; line: string; cd: number; flavour: string }>;
export const SUPPLIES = Object.fromEntries((Object.keys(SUPPLY) as SupplyId[]).map((id) => [id, { name: SUPPLY[id].name, line: BSUP[id]?.line ?? SUPPLY[id].text, text: SUPPLY[id].text, aim: (BSUP[id]?.aim ?? "instant") !== "instant", r: BSUP[id]?.radius ?? 1, flavour: SUPPLY[id].flavour }])) as
  Record<SupplyId, { name: string; line: string; text: string; aim: boolean; r: number; flavour: string }>;

// ---------------------------------------------------------------- commanders, ascensions, blessings, perks
export interface CommanderText {
  name: string; title: string; line: string; flavour: string; towers: TowerId[]; relic: string; relicText: string;
  passive: string; passiveText: string; spells: [SpellId, SpellId]; unlock: string; difficulty: string;
}
export const COMMANDER_IDS = Object.keys(RC) as CommanderId[];
export const COMMANDERS = Object.fromEntries(COMMANDER_IDS.map((c) => {
  const d = RC[c];
  return [c, { name: d.name, title: d.title, line: d.line, flavour: d.flavour, towers: d.towers, relic: RELIC[d.relic]?.name ?? d.relic, relicText: RELIC[d.relic]?.text ?? "",
    passive: d.passive.name, passiveText: d.passive.text, spells: [d.spells.Q, d.spells.W], unlock: d.unlock, difficulty: d.difficulty }];
})) as Record<CommanderId, CommanderText>;
export const commanderRelic = (c: CommanderId) => RC[c].relic;

export const ASCENSIONS: { name: string; line: string; rule: string }[] = [{ name: "No ascension", line: "The war as it comes.", rule: "" }, ...RASC.map((a) => ({ name: a.name, line: a.line, rule: a.rule }))];
export const BLESSINGS: Record<string, { name: string; line: string; glyph: string }> = Object.fromEntries([...RBL, RARE_BLESSING].map((b) => [b.id, { name: b.name, line: b.text, glyph: ({ relic: "r-gem", blueprint: "build", swap: "reroll", lives: "life", crowns: "crown", supplies: "gold-cache", "rare-relic": "star" } as Record<string, string>)[b.id] ?? "star" }]));
export const PERK = Object.fromEntries(PERKS.map((p) => [p.id, p]));

// ---------------------------------------------------------------- acts
export const ACTS: Record<Act, { name: string; title: string; mood: string; key: string; trait?: string; interestCap: number; countdown: number }> = {
  1: { name: BA[1].name, title: "Act I", mood: BA[1].mood, key: "#C2502E", trait: BA[1].trait?.line, interestCap: BA[1].interestCap, countdown: BA[1].countdown },
  2: { name: BA[2].name, title: "Act II", mood: BA[2].mood, key: "#2E8C86", trait: BA[2].trait?.line, interestCap: BA[2].interestCap, countdown: BA[2].countdown },
  3: { name: BA[3].name, title: "Act III", mood: BA[3].mood, key: "#B8323A", trait: BA[3].trait?.line, interestCap: BA[3].interestCap, countdown: BA[3].countdown },
  4: { name: BA[4].name, title: "Act IV", mood: BA[4].mood, key: "#E2D6C0", trait: BA[4].trait?.line, interestCap: BA[4].interestCap, countdown: BA[4].countdown },
};

// ---------------------------------------------------------------- relics, boons, curses, events
export interface RelicText { name: string; text: string; rarity: Rarity; flavour?: string; downside?: string }
export interface BoonText { name: string; text: string; tower: TowerId | null; rarity: Rarity; tempered?: string; keystone?: boolean; flavour?: string }
export interface CurseText { name: string; text: string; flavour?: string }
export interface EventText { name: string; prose: string; glyph?: string }
const titleCase = (id: string) => id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const relic = (id: string): RelicText => RELIC[id] ?? { name: titleCase(id), text: "", rarity: "common" };
export const boon = (id: string): BoonText => BOON[id] ?? { name: titleCase(id), text: "", tower: null, rarity: "common" };
export const curse = (id: string): CurseText => CURSE[id] ?? { name: titleCase(id), text: "" };
export const event = (id: string): EventText => { const e = EVENT[id]; return e ? { name: e.name, prose: e.text, glyph: eventGlyph(id) } : { name: titleCase(id), prose: "" }; };
export const RELIC_IDS = Object.keys(RELIC);
export const BOON_IDS = Object.keys(BOON);
export const EVENT_IDS = Object.keys(EVENT);
/** The tower a boon counts for on the war table (universal boons: the one it was taken for). */
export const boonTower = (id: string, boonOn?: Record<string, TowerId>) => BOON[id]?.tower ?? boonOn?.[id] ?? null;

const EVENT_GLYPHS: [RegExp, string][] = [[/shrine|chapel|candle|altar|prayer/, "r-candle"], [/battle|deserter|soldier|camp|war/, "phys"], [/merchant|cart|tinker|market|trader/, "shop"],
  [/well|spring|lake|river|tide/, "oiled"], [/smith|forge|anvil|widow/, "forge"], [/sphinx|riddle|oracle|seer/, "r-eye"], [/tomb|crypt|bones|grave/, "boss"], [/storm|lightning/, "storm"],
  [/snow|ice|frost|avalanche/, "frost"], [/fire|ember|ash|forge/, "fire"], [/bard|song|music/, "r-horn"], [/refugee|caravan|road/, "flag"]];
function eventGlyph(id: string) { for (const [re, g] of EVENT_GLYPHS) if (re.test(id)) return g; return "event"; }

// ---------------------------------------------------------------- UI words (glossary, section 14)
export const NODES: Record<NodeKind, { name: string; tip: string; rim: string }> = {
  battle: { name: "Battle", tip: "Crowns and a reward.", rim: "#9A9384" },
  bounty: { name: "Bounty", tip: "A battle with a posted goal. Meet it for a second reward.", rim: "#C9A45A" },
  elite: { name: "Elite", tip: "A champion joins the waves. A relic and a better reward.", rim: "#D9643A" },
  boss: { name: "Boss", tip: "Ends the act. Costs 10 lives if it gets through.", rim: "#B8323A" },
  event: { name: "?", tip: "Something on the road. Usually a story; now and then a fight, a shop or a chest.", rim: "#5FA8D6" },
  shop: { name: "Shop", tip: "Spend crowns on towers, boons, relics and supplies.", rim: "#E3B655" },
  forge: { name: "Forge", tip: "Shape one tower's boons.", rim: "#B8733A" },
  rest: { name: "Camp", tip: "Heal, or train. Not both.", rim: "#6FD88A" },
  camp: { name: "Camp", tip: "A shop, then one camp choice.", rim: "#6FD88A" },
  treasure: { name: "Treasure", tip: "A relic and a few crowns, free.", rim: "#E3B655" },
};

export const DAMAGE: Record<DamageType | "none", { name: string; line: string; color: string }> = {
  phys: { name: "Physical", line: "Blocked by armour.", color: "#FFF6E8" },
  magic: { name: "Magic", line: "Blocked by wards.", color: "#CDA8FF" },
  fire: { name: "Fire", line: "Ignores armour and wards. Only fireproof foes resist it.", color: "#FFB15A" },
  pure: { name: "Pure", line: "Nothing blocks it.", color: "#FFE07A" },
  none: { name: "Support", line: "Deals no damage; helps the towers around it.", color: "#C8C0AE" },
};

export const STATUSES: Record<string, { name: string; line: string; color: string }> = {
  slow: { name: "Slowed", line: "Moves slower. Slows don't add up: the strongest counts.", color: "#9FC4D8" },
  chill: { name: "Chilled", line: "Slowed by cold. Enough cold freezes it.", color: "#86DBFF" },
  frozen: { name: "Frozen", line: "Can't move or fight.", color: "#BFEFFF" },
  numb: { name: "Numb", line: "Too big to freeze. Slowed instead.", color: "#9FB8C8" },
  burn: { name: "Burning", line: "Takes fire damage over time.", color: "#FF8A3A" },
  oiled: { name: "Oiled", line: "Fire will make it burst into flame.", color: "#C9B26A" },
  marked: { name: "Marked", line: "Takes more damage and is easier to crit.", color: "#FFD36B" },
  hexed: { name: "Hexed", line: "Takes more damage from everything. Can't be healed.", color: "#B26BFF" },
  shred: { name: "Cracked armour", line: "Armour lowered for a while.", color: "#C8CED6" },
  stun: { name: "Stunned", line: "Can't move, fight or cast.", color: "#FFE07A" },
  rooted: { name: "Rooted", line: "Can't move, but still fights.", color: "#6FC27A" },
  revealed: { name: "Revealed", line: "A hidden enemy that towers can now see.", color: "#FFF1C2" },
  shield: { name: "Shielded", line: "Extra health that breaks first. Lightning breaks it fast.", color: "#6FE3F0" },
};

/** Next-wave badges (WavePlan.badges) -> glyph and word. */
export const BADGES: Record<string, { glyph: string; name: string }> = {
  air: { glyph: "air", name: "Flyers" }, stealth: { glyph: "shade", name: "Hidden" }, armour: { glyph: "armour", name: "Armoured" },
  ward: { glyph: "ward", name: "Warded" }, shield: { glyph: "shield", name: "Shields" }, healer: { glyph: "shaman", name: "Healers" },
  elite: { glyph: "elite", name: "Elite" }, boss: { glyph: "boss", name: "Boss" }, new: { glyph: "new", name: "New enemy" },
};

export const BOUNTIES: Record<string, { name: string; line: string }> = Object.fromEntries(RBOUNTY.map((b) => [b.id, { name: b.name, line: b.line }]));

export const RARITY: Record<Rarity, { name: string; color: string }> = {
  common: { name: "Common", color: "#9A9384" }, uncommon: { name: "Uncommon", color: "#5FA8D6" }, rare: { name: "Rare", color: "#E3B655" },
  boss: { name: "Boss", color: "#D96BFF" }, shop: { name: "Shop", color: "#C9A45A" }, event: { name: "Event", color: "#5FA8D6" }, starter: { name: "Starting", color: "#C8C0AE" },
};

export const REST_GLYPH: Record<string, string> = { rest: "life", drill: "upgrade", fortify: "armour", dig: "treasure", pray: "r-candle", scout: "map" };
export const FORGE_GLYPH: Record<string, string> = { hone: "hammer", temper: "forge", recast: "reroll", leave: "next" };
