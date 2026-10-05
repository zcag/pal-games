// Pick screens: every "choose one of these" step that an event, forge, camp, shop or blessing
// raises. A pick is plain data (`act` names the handler, `data` its arguments) so a run saved on a
// pick screen resumes exactly.
import type { BoonId, Card, CurseId, PickOption, Rarity, RunScreen, SupplyId, TowerId } from "../types.ts";
import { BOON } from "../content/run/boons.ts";
import { CURSE } from "../content/run/curses.ts";
import { RELIC } from "../content/run/relics.ts";
import { SUPPLY } from "../content/run/supplies.ts";
import { TOWERS } from "../content/run/towers.ts";
import { FORGE, RELIC_RARITY } from "../content/run/economy.ts";
import { boonOffers, blueprintFits, pickBoon, randomBoon, rareBoons, rollRelics } from "./rewards.ts";
import {
  boonsOf, crowns, gainCard, gainRelic, has, liftCurse, loseBoon, removeTower, replaceTower,
  rng, temper, untempered, type Run,
} from "./state.ts";

type Pick = Extract<RunScreen, { s: "pick" }>;

export function cardName(c: Card): string {
  if (c.kind === "blueprint") return TOWERS[c.tower].name;
  if (c.kind === "boon") { const b = BOON[c.boon]!; return b.tower ? b.name : `${b.name}: ${TOWERS[c.tower!].name}`; }
  if (c.kind === "relic") return RELIC[c.relic]?.name ?? c.relic;
  return SUPPLY[c.supply].name;
}

export function cardText(c: Card): string {
  if (c.kind === "blueprint") return TOWERS[c.tower].line;
  if (c.kind === "boon") return BOON[c.boon]!.text;
  if (c.kind === "relic") { const d = RELIC[c.relic]!; return d.downside ? `${d.text} ${d.downside}` : d.text; }
  return SUPPLY[c.supply].text;
}

export const cardOption = (c: Card): PickOption => ({ label: cardName(c), text: cardText(c), card: c });
const towerOption = (r: Run, t: TowerId, disabled?: string): PickOption =>
  ({ label: TOWERS[t].name, text: `${boonsOf(r, t).length} boons`, tower: t, ...(disabled ? { disabled } : {}) });
const boonOption = (b: BoonId, r: Run): PickOption =>
  ({ label: BOON[b]!.name + (r.loadout.tempered.includes(b) ? " +" : ""), text: BOON[b]!.text, boon: b });

export function pick(r: Run, act: string, title: string, options: PickOption[], data?: Record<string, unknown>, extra: { text?: string; skip?: string } = {}) {
  if (!options.length) return;
  const p: Pick = { s: "pick", act, title, options, ...(data ? { data } : {}), ...extra };
  r.book.pending.push(p);
}

// ---------------------------------------------------------------- raisers
export function pickCard(r: Run, title: string, cards: Card[], skip?: string) {
  pick(r, "card", title, cards.map(cardOption), undefined, skip ? { skip } : {});
}

export function pickTemper(r: Run, left: number, title = "Temper a boon") {
  const bs = untempered(r);
  if (!bs.length || left <= 0) return;
  pick(r, "temper", title, bs.map((b) => boonOption(b, r)), { left });
}

export function pickLift(r: Run) {
  if (r.loadout.curses.length === 1) { liftCurse(r, r.loadout.curses[0]!); return; }
  pick(r, "lift", "Lift a curse", r.loadout.curses.map((c) => ({ label: CURSE[c]!.name, text: CURSE[c]!.text, curse: c })));
}

/** Choose a tower; `act` then acts on it. Towers with nothing to offer are greyed with the reason. */
export function pickTower(r: Run, act: string, title: string, data: Record<string, unknown> = {}, ok: (t: TowerId) => string | null = () => null) {
  pick(r, act, title, r.loadout.towers.map((t) => towerOption(r, t, ok(t) ?? undefined)), data);
}

export function pickBoonOf(r: Run, act: string, title: string, filter: (b: BoonId) => boolean, data: Record<string, unknown> = {}) {
  pick(r, act, title, r.loadout.boons.filter(filter).map((b) => boonOption(b, r)), data);
}

/** Forge Hone: choose a tower, then 3 (Bellows 4) of its boons. */
export function pickHone(r: Run) {
  pickTower(r, "hone-tower", "Hone: choose a tower", {}, (t) => (boonOffers(r, [t]).length ? null : "Nothing left to offer"));
}

export function honeCards(r: Run, t: TowerId): Card[] {
  const g = rng(r, "forge");
  const n = has(r, "bellows") ? FORGE.honeBellows : FORGE.hone;
  const avoid = new Set<string>(), out: Card[] = [];
  for (let i = 0; i < n; i++) {
    const want: Rarity = g.weighted(["common", "uncommon", "rare"] as Rarity[], (x) => FORGE.hone_rarity[x] ?? 0);
    const c = pickBoon(r, g, [t], () => 1, want, avoid, false);
    if (!c) break;
    avoid.add(`boon:${(c as Extract<Card, { kind: "boon" }>).boon}`);
    out.push(c);
  }
  return out;
}

/** Gift a rare boon to `left` more towers (the Hermit, R23's swap). */
export function pickGift(r: Run, left: number, exclude: TowerId[]) {
  const towers = r.loadout.towers.filter((t) => !exclude.includes(t) && boonOffers(r, [t], "rare").length);
  if (!towers.length || left <= 0) return;
  pick(r, "gift-tower", left > 1 ? `Choose a tower for a rare boon (${left} to go)` : "Choose a tower for a rare boon",
    towers.map((t) => towerOption(r, t)), { left, exclude });
}

// ---------------------------------------------------------------- handlers
type Handler = (r: Run, o: PickOption, p: Pick) => void;

const D = <T>(p: Pick, k: string, d: T): T => (p.data?.[k] as T) ?? d;

export const PICKS: Record<string, Handler> = {
  card: (r, o) => o.card && gainCard(r, o.card),
  temper: (r, o, p) => { temper(r, o.boon!); pickTemper(r, D(p, "left", 1) - 1); },
  lift: (r, o) => liftCurse(r, o.curse as CurseId),
  "supply-drop": (r, o, p) => {
    // keep everything but the chosen one: the new supply replaces the dropped slot
    const s = D<SupplyId>(p, "supply", "flare");
    const slots = r.loadout.supplies;
    if (o.supply === s && !slots.includes(s)) return;
    const i = slots.indexOf(o.supply!);
    if (i >= 0) slots[i] = s;
  },
  "hone-tower": (r, o) => pickCard(r, `Hone: ${TOWERS[o.tower!].name}`, honeCards(r, o.tower!)),
  "recast-old": (r, o) => {
    const g = rng(r, "forge");
    const c = g.shuffle(r.book.unlocked.towers.filter((t) => blueprintFits(r, t))).slice(0, FORGE.recast);
    pick(r, "recast-new", `Recast ${TOWERS[o.tower!].name} as`, c.map((t) => towerOption(r, t)), { old: o.tower! });
  },
  "recast-new": (r, o, p) => replaceTower(r, D<TowerId>(p, "old", "archer"), o.tower!),
  "tinker-give": (r, o) => {
    const b = BOON[o.boon!]!, t = r.loadout.boonOn?.[b.id] ?? b.tower!;
    loseBoon(r, b.id);
    const up: Rarity = b.rarity === "common" ? "uncommon" : "rare";
    const cs = rareBoons(r, 2, [t], up).filter((c) => c.rarity === up);
    pickCard(r, "The tinker's work: choose one", cs);
  },
  sphinx: (r, o) => {
    const g = rng(r, "events");
    for (let i = 0; i < 2; i++) { const c = randomBoon(r, g, [o.tower!], { common: 60, uncommon: 35, rare: 5 }); if (c) gainCard(r, c); }
    const others = r.loadout.towers.filter((t) => t !== o.tower && boonsOf(r, t).length);
    if (others.length) loseBoon(r, g.pick(boonsOf(r, g.pick(others))));
  },
  "hermit-remove": (r, o) => { removeTower(r, o.tower!, false); pickGift(r, 2, []); },
  "gift-tower": (r, o, p) => {
    pickCard(r, `A rare boon for ${TOWERS[o.tower!].name}`, rareBoons(r, 3, [o.tower!]));
    pickGift(r, D(p, "left", 1) - 1, [...D<TowerId[]>(p, "exclude", []), o.tower!]);
  },
  "tower-boon": (r, o, p) => {
    const c = randomBoon(r, rng(r, "events"), [o.tower!], { [D(p, "rarity", "uncommon")]: 1 });
    if (!c || c.kind !== "boon") return;
    gainCard(r, c);
    if (D(p, "temper", false)) temper(r, c.boon);
  },
  "sell-tower": (r, o, p) => { removeTower(r, o.tower!, false); crowns(r, D(p, "crowns", 70)); },
  "feed-boon": (r, o) => {
    loseBoon(r, o.boon!);
    const [rel] = rollRelics(r, rng(r, "events"), 1, { rare: 1 });
    if (rel) gainRelic(r, rel);
  },
  swap: (r, o) => {
    removeTower(r, o.tower!, false);
    pickGift(r, 1, []);
  },
};

export const relicDig = (r: Run) => {
  const [rel] = rollRelics(r, rng(r, "rest"), 1, RELIC_RARITY.dig);
  if (rel) gainRelic(r, rel);
  return rel;
};
