// Run state helpers: cloning, seeded streams, and every mutation that moves crowns, lives,
// blueprints, boons, relics, curses and supplies. Everything else in game/run calls these, so a
// rule like "max lives grow, lives never pass max" lives in one place.
import { Rng, hash, hashStr } from "../rng.ts";
import type {
  BoonId, Card, CurseId, RelicId, RunBook, RunScreen, RunState, SupplyId, TowerId,
} from "../types.ts";
import { BOON } from "../content/run/boons.ts";
import { RELIC } from "../content/run/relics.ts";
import { CURSE } from "../content/run/curses.ts";
import { TOWERS } from "../content/run/towers.ts";
import { MAX_TOWERS, REPLACED_BOON_CROWNS } from "../content/run/economy.ts";
import { SUPPLIES, SUPPLY_RARITY, SUPPLY_SLOTS } from "../content/run/supplies.ts";
import { rollUnknown } from "./unknown.ts";

export type Run = RunState & { book: RunBook };

export function clone(run: RunState): Run {
  if (!run.book) throw new Error("not a run made by newRun");
  return structuredClone(run) as Run;
}

/** A persisted stream: its state is saved in the run after every draw, so a save mid-run replays. */
class Stream extends Rng {
  constructor(private store: Record<string, number>, private key: string, seed: number) { super(seed); this.s = seed; }
  override next(): number { const v = super.next(); this.store[this.key] = this.s; return v; }
}

export function rng(r: Run, name: string): Rng {
  const st = r.book.streams;
  if (st[name] === undefined) st[name] = hash(r.seed, hashStr(name)) || 1;
  return new Stream(st, name, st[name]!);
}

// ---------------------------------------------------------------- relics, curses, perks
export const has = (r: RunState, relic: RelicId) => r.loadout.relics.includes(relic);
export const cursed = (r: RunState, curse: CurseId) => r.loadout.curses.includes(curse);
export const perk = (r: Run, id: string) => r.book.perks.includes(id);
export const owns = (r: RunState, t: TowerId) => r.loadout.towers.includes(t);

// ---------------------------------------------------------------- crowns and lives
export function crowns(r: Run, n: number) {
  r.crowns = Math.max(0, r.crowns + n);
  if (n > 0) r.stats.crownsEarned += n;
  r.book.best.crowns = Math.max(r.book.best.crowns, r.crowns);
}

export function heal(r: Run, n: number): number {
  const before = r.loadout.lives;
  r.loadout.lives = Math.min(r.loadout.maxLives, r.loadout.lives + Math.max(0, n));
  return r.loadout.lives - before;
}

export function maxLives(r: Run, n: number, healToo = false) {
  r.loadout.maxLives = Math.max(1, r.loadout.maxLives + n);
  if (healToo && n > 0) r.loadout.lives += n;
  r.loadout.lives = Math.min(r.loadout.lives, r.loadout.maxLives);
}

/** Lose lives outside battle. At 0 the Phoenix Feather saves you once, otherwise the run ends. */
export function loseLives(r: Run, n: number, by: string) {
  r.loadout.lives -= n;
  if (r.act === 1) r.book.lostAct1 += n;
  if (r.loadout.lives <= 0) {
    if (has(r, "phoenix-feather")) { loseRelic(r, "phoenix-feather"); r.loadout.lives = 8; return; }
    r.loadout.lives = 0;
    end(r, false, by);
  }
}

export function end(r: Run, won: boolean, by?: string, extra: Partial<NonNullable<RunState["over"]>> = {}) {
  r.over = { won, act: r.act, floor: r.floor, ...(by ? { by } : {}), ...extra };
  r.screen = { s: "over" };
  r.book.after = [];
  r.book.pending = [];
}

// ---------------------------------------------------------------- war table
export function seeCard(r: Run, c: Card) {
  const s = r.book.seen;
  if (c.kind === "boon" && !s.boons.includes(c.boon)) s.boons.push(c.boon);
  if (c.kind === "relic" && !s.relics.includes(c.relic)) s.relics.push(c.relic);
  if (c.kind === "blueprint" && !s.towers.includes(c.tower)) s.towers.push(c.tower);
}

export function gainRelic(r: Run, id: RelicId) {
  if (has(r, id)) return;
  r.loadout.relics.push(id);
  seeCard(r, { kind: "relic", relic: id, rarity: RELIC[id]?.rarity ?? "common" });
  if (id === "pact-of-embers") { maxLives(r, 6); r.loadout.lives = r.loadout.maxLives; }
  if (id === "heartwood") maxLives(r, 6, true);
  if (id === "pilgrims-map") revealUnknown(r);
}

export function loseRelic(r: Run, id: RelicId) {
  r.loadout.relics = r.loadout.relics.filter((x) => x !== id);
}

export function gainCurse(r: Run, id: CurseId) {
  if (!CURSE[id] || cursed(r, id)) return;
  r.loadout.curses.push(id);
}

export function liftCurse(r: Run, id: CurseId) {
  r.loadout.curses = r.loadout.curses.filter((x) => x !== id);
}

export function boonTower(r: RunState, b: BoonId): TowerId | null {
  return BOON[b]?.tower ?? r.loadout.boonOn?.[b] ?? null;
}

export function boonsOf(r: RunState, t: TowerId): BoonId[] {
  return r.loadout.boons.filter((b) => boonTower(r, b) === t);
}

export function gainBoon(r: Run, b: BoonId, tower: TowerId | null) {
  if (r.loadout.boons.includes(b)) return;
  r.loadout.boons.push(b);
  const def = BOON[b];
  if (def && def.tower === null && tower) (r.loadout.boonOn ??= {})[b] = tower;
  seeCard(r, { kind: "boon", boon: b, tower, rarity: def?.rarity ?? "common" });
}

export function loseBoon(r: Run, b: BoonId) {
  r.loadout.boons = r.loadout.boons.filter((x) => x !== b);
  r.loadout.tempered = r.loadout.tempered.filter((x) => x !== b);
  if (r.loadout.boonOn) delete r.loadout.boonOn[b];
}

export const untempered = (r: RunState) => r.loadout.boons.filter((b) => !r.loadout.tempered.includes(b));

/** Temper a boon; Widow's Hammer tempers one random other as well. */
export function temper(r: Run, b: BoonId) {
  if (!r.loadout.boons.includes(b) || r.loadout.tempered.includes(b)) return;
  r.loadout.tempered.push(b);
  if (has(r, "widows-hammer")) {
    const rest = untempered(r);
    if (rest.length) r.loadout.tempered.push(rng(r, "forge").pick(rest));
  }
}

/** Add a blueprint. With six owned, raises the replace screen (`from` decides what a replace settles). */
export function gainTower(r: Run, t: TowerId, from: "reward" | "shop" | "gain" = "gain", price?: number, index?: number): boolean {
  if (owns(r, t)) return false;
  const card: Card = { kind: "blueprint", tower: t, rarity: TOWERS[t].rarity };
  seeCard(r, card);
  if (r.loadout.towers.length >= MAX_TOWERS) {
    r.book.pending.push({ s: "replace", card, from, ...(price !== undefined ? { price } : {}), ...(index !== undefined ? { index } : {}) });
    return false;
  }
  r.loadout.towers.push(t);
  return true;
}

/** Remove a blueprint and its boons; `pay` gives 10 crowns per boon lost (replace, recast). */
export function removeTower(r: Run, t: TowerId, pay: boolean): number {
  const lost = boonsOf(r, t);
  for (const b of lost) loseBoon(r, b);
  r.loadout.towers = r.loadout.towers.filter((x) => x !== t);
  if (pay && lost.length) crowns(r, lost.length * REPLACED_BOON_CROWNS);
  return lost.length;
}

/** Swap a blueprint in place (keeps the key). */
export function replaceTower(r: Run, old: TowerId, t: TowerId) {
  const i = r.loadout.towers.indexOf(old);
  removeTower(r, old, true);
  if (i >= 0) r.loadout.towers.splice(i, 0, t); else r.loadout.towers.push(t);
}

/** A random war supply: common 50, uncommon 35, rare 15. */
export function randomSupply(g: Rng, not: SupplyId[] = []): SupplyId {
  const pool = SUPPLIES.filter((s) => !not.includes(s.id));
  return g.weighted(pool, (s) => SUPPLY_RARITY[s.rarity] ?? 0).id;
}

export function gainSupply(r: Run, s: SupplyId) {
  const slots = r.loadout.supplies;
  while (slots.length < SUPPLY_SLOTS) slots.push(null);
  const i = slots.indexOf(null);
  if (i >= 0) { slots[i] = s; return; }
  r.book.pending.push({
    s: "pick", act: "supply-drop", title: "Your packs are full", text: "Choose one to leave behind.",
    options: [...slots.map((x) => ({ label: x!, supply: x! })), { label: s, supply: s }],
    data: { supply: s },
  });
}

/** Take any card (reward, shop, event, blessing). */
export function gainCard(r: Run, c: Card, from: "reward" | "shop" | "gain" = "gain", price?: number, index?: number) {
  seeCard(r, c);
  if (c.kind === "blueprint") gainTower(r, c.tower, from, price, index);
  else if (c.kind === "boon") gainBoon(r, c.boon, c.tower);
  else if (c.kind === "relic") gainRelic(r, c.relic);
  else gainSupply(r, c.supply);
}

// ---------------------------------------------------------------- map reveals
/** Roll what every unrevealed ? node on the current map holds (Pilgrim's Map, the Deserter). */
export function revealUnknown(r: Run) {
  for (const n of r.map.nodes) if (n.kind === "event" && !n.visited && !n.info?.revealed) (n.info ??= {}).revealed = rollUnknown(r);
}

/** See the next act's map now (the Bard, the Hermit, Scout). */
export function revealNext(r: Run) { if (r.act < 4) r.book.revealedNext = true; }

/** Card identity for banishing and de-duplication. */
export function cardKey(c: Card): string {
  return c.kind === "blueprint" ? `blueprint:${c.tower}` : c.kind === "boon" ? `boon:${c.boon}` : c.kind === "relic" ? `relic:${c.relic}` : `supply:${c.supply}`;
}

/** Push sub-screens raised during an action, then the continuation, then whatever was queued. */
export function settle(r: Run, cont: RunScreen | null) {
  if (r.over) { r.screen = { s: "over" }; return; }
  const q = [...r.book.pending, ...(cont ? [cont] : []), ...r.book.after];
  r.book.pending = [];
  if (q.length) { r.screen = q[0]!; r.book.after = q.slice(1); }
  else { r.book.after = []; r.screen = { s: "map" }; }
}
