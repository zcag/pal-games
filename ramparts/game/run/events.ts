// The event engine: an EventCtx that event content calls to apply outcomes, and the flow
// (start, choices with greyed reasons, resolve, multi-step events).
import type { Rng } from "../rng.ts";
import type { CurseId, EventId, RelicId, RunScreen, SupplyId, TowerId } from "../types.ts";
import { EVENT, type EventChoice } from "../content/run/events.ts";
import { CURSES } from "../content/run/curses.ts";
import { RELIC } from "../content/run/relics.ts";
import { BOON } from "../content/run/boons.ts";
import { SUPPLY } from "../content/run/supplies.ts";
import { TOWERS } from "../content/run/towers.ts";
import { MAX_TOWERS, type Weights } from "../content/run/economy.ts";
import { blueprintFits, boonOffers, randomBoon, rareBoons, rollRelics } from "./rewards.ts";
import { cardName, pick, pickBoonOf, pickCard, pickGift, pickHone, pickLift, pickTemper, pickTower } from "./picks.ts";
import { openShop } from "./shop.ts";
import {
  boonsOf, crowns, cursed, gainBoon, gainCard, gainCurse, gainRelic, gainSupply, gainTower, has, heal,
  liftCurse, loseLives, maxLives, owns, randomSupply, revealNext, revealUnknown, rng, temper, untempered, type Run,
} from "./state.ts";

type EventScreen = Extract<RunScreen, { s: "event" }>;

export class EventCtx {
  g: Rng;
  /** Set by keep(): the event stays open at this step. */
  kept: { step: number; data: number } | null = null;
  constructor(public r: Run, public id: EventId, public step: number, public data: number) { this.g = rng(r, "events"); }

  get name() { return EVENT[this.id]!.name; }
  owns(t: TowerId) { return owns(this.r, t); }
  has(relic: RelicId) { return has(this.r, relic); }
  get crownsHeld() { return this.r.crowns; }
  get towers() { return this.r.loadout.towers; }
  get curses() { return this.r.loadout.curses; }

  // reasons a choice is greyed
  needCrowns(n: number) { return this.r.crowns >= n ? null : "Not enough crowns"; }
  needBoons() { return untempered(this.r).length ? null : "No boons to temper"; }
  needCurse() { return this.r.loadout.curses.length ? null : "You have no curse"; }

  crowns(n: number) { crowns(this.r, n); }
  pay(n: number) { crowns(this.r, -n); }
  lives(n: number) { if (n < 0) loseLives(this.r, -n, this.name); else heal(this.r, n); }
  maxLives(n: number, healToo = false) { maxLives(this.r, n, healToo); }

  relic(table: Weights): string {
    const [id] = rollRelics(this.r, this.g, 1, table);
    if (!id) { this.crowns(25); return "Nothing there; you take 25 crowns instead."; }
    gainRelic(this.r, id);
    return `You gain ${RELIC[id]!.name}.`;
  }
  relicId(id: RelicId) { gainRelic(this.r, id); }
  curse(id: CurseId) { gainCurse(this.r, id); }
  randomCurses(n: number): string[] {
    const free = CURSES.filter((c) => !cursed(this.r, c.id));
    const got = this.g.shuffle(free).slice(0, n);
    for (const c of got) gainCurse(this.r, c.id);
    return got.map((c) => c.name);
  }
  /** Lift one curse (asks which when there are several). */
  liftOne() { pickLift(this.r); }
  liftAll(): number { const n = this.r.loadout.curses.length; for (const c of [...this.r.loadout.curses]) liftCurse(this.r, c); return n; }

  tower(t: TowerId) { gainTower(this.r, t, "gain"); }
  /** The blueprint, or a random boon for it if you own it. */
  towerOrBoon(t: TowerId): string {
    if (!this.owns(t)) {
      if (!this.r.book.unlocked.towers.includes(t)) return this.boons(this.towers, 1, { common: 60, uncommon: 35, rare: 5 });
      this.tower(t); return `${TOWERS[t].name} joins your war table.`;
    }
    return this.boons([t], 1, { common: 60, uncommon: 35, rare: 5 });
  }
  randomBlueprint(): TowerId | null {
    const c = this.r.book.unlocked.towers.filter((t) => blueprintFits(this.r, t));
    return c.length ? this.g.pick(c) : null;
  }
  /** `n` random boons, each for a random one of `towers`. */
  boons(towers: TowerId[], n: number, table: Weights): string {
    const got: string[] = [];
    for (let i = 0; i < n; i++) {
      const live = towers.filter((t) => boonOffers(this.r, [t]).length);
      if (!live.length) break;
      const c = randomBoon(this.r, this.g, [this.g.pick(live)], table);
      if (c) { gainCard(this.r, c); got.push(cardName(c)); }
    }
    return got.length ? `You gain ${got.join(" and ")}.` : "Nothing fits your towers.";
  }
  /** Choose 1 of n boons of a rarity for your towers. */
  chooseBoon(rarity: "rare" | "uncommon", n = 3, towers = this.towers) {
    pickCard(this.r, rarity === "rare" ? "Choose a rare boon" : "Choose a boon", rareBoons(this.r, n, towers, rarity));
  }
  temperPick(n: number) { pickTemper(this.r, n, n > 1 ? "Temper a boon" : "Temper a boon"); }
  temperRandom(n: number): string {
    const got: string[] = [];
    for (let i = 0; i < n; i++) {
      const u = untempered(this.r);
      if (!u.length) break;
      const b = this.g.pick(u); temper(this.r, b); got.push(b);
    }
    return got.length ? `Tempered: ${got.length}.` : "Nothing to temper.";
  }
  supplies(n: number, ids?: SupplyId[]): string {
    const got = ids ?? Array.from({ length: n }, () => randomSupply(this.g));
    for (const s of got) gainSupply(this.r, s);
    return `You gain ${got.map((s) => SUPPLY[s].name).join(", ")}.`;
  }
  revealUnknown() { revealUnknown(this.r); }
  revealNext() { revealNext(this.r); }
  shop(mirage: boolean) { this.r.book.pending.push(openShop(this.r, { mirage })); }
  hone() { pickHone(this.r); }
  leap(): number[] {
    const r = this.r, here = r.map.nodes[r.at]!;
    const two = new Set<number>();
    for (const c of here.next) for (const d of r.map.nodes[c]!.next) if (r.map.nodes[d]!.floor <= 6) two.add(d);
    r.book.leap = [...two].sort((a, b) => a - b);
    return r.book.leap;
  }
  walk() { this.r.book.walk = true; }
  bossHp(pct: number) { this.r.book.bossHp += pct; }
  nextGold(n: number) { this.r.book.nextGold += n; }
  chooseTower(act: string, title: string, data: Record<string, unknown> = {}, ok?: (t: TowerId) => string | null) { pickTower(this.r, act, title, data, ok); }
  chooseOwnBoon(act: string, title: string, filter: (b: string) => boolean = () => true) { pickBoonOf(this.r, act, title, filter); }
  gift(n: number) { pickGift(this.r, n, []); }
  boonCount(t: TowerId) { return boonsOf(this.r, t).length; }
  boonRarity(b: string) { return BOON[b]?.rarity; }
  /** Is there still a boon (of this rarity) that could go on this tower? */
  canBoon(t: TowerId, rarity?: "common" | "uncommon" | "rare") { return boonOffers(this.r, [t], rarity).length > 0; }
  /** Keep the event open at another step (multi-step events). */
  keep(step: number, data = this.data) { this.kept = { step, data }; }
  pick = pick;
  gainBoon = gainBoon;
  max = MAX_TOWERS;
}

export function startEvent(r: Run, id: EventId): EventScreen {
  if (!r.seenEvents.includes(id)) r.seenEvents.push(id);
  return { s: "event", event: id, step: 0 };
}

export function eventChoices(r: Run, s: EventScreen): { choice: EventChoice; disabled: string | null }[] {
  const ev = EVENT[s.event]!;
  const c = new EventCtx(r, s.event, s.step, s.data ?? 0);
  const list = typeof ev.choices === "function" ? ev.choices(c) : ev.choices;
  return list.map((choice) => ({ choice, disabled: choice.need?.(c) ?? null }));
}

/** Apply a choice. Returns the event screen to show next (with the outcome note), or null when done. */
export function resolveEvent(r: Run, s: EventScreen, choiceId: string): EventScreen | null {
  const ev = EVENT[s.event]!;
  const c = new EventCtx(r, s.event, s.step, s.data ?? 0);
  const list = typeof ev.choices === "function" ? ev.choices(c) : ev.choices;
  const ch = list.find((x) => x.id === choiceId);
  if (!ch) throw new Error(`no choice ${choiceId} in ${s.event}`);
  const why = ch.need?.(c);
  if (why) throw new Error(`${s.event}/${choiceId}: ${why}`);
  const key = `${s.event}/${ch.id}`;
  if (!r.book.choices.includes(key)) r.book.choices.push(key);
  const note = ch.run(c) ?? "";
  if (c.kept) return { s: "event", event: s.event, step: c.kept.step, data: c.kept.data, ...(note ? { note } : {}) };
  return note ? { s: "event", event: s.event, step: s.step, note, done: true } : null;
}
