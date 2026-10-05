// ? nodes (content.md 11.8) and which event an event roll lands on (10, R22).
import type { EventId, NodeKind } from "../types.ts";
import { UNKNOWN } from "../content/run/economy.ts";
import { EVENTS, EVENT } from "../content/run/events.ts";
import { has, rng, type Run } from "./state.ts";

/** Events this run could still meet in this act. */
export function eventPool(r: Run): EventId[] {
  return EVENTS.filter((e) =>
    !r.seenEvents.includes(e.id) &&
    (!e.locked || r.book.unlocked.events.includes(e.id)) &&
    (!e.acts.length || e.acts.includes(r.act)),
  ).map((e) => e.id);
}

/** Roll what a ? holds, moving the pity counters. */
export function rollUnknown(r: Run): NodeKind {
  const u = r.book.unknown;
  const w = {
    event: eventPool(r).length ? UNKNOWN.event : 0,
    battle: UNKNOWN.battle.base + u.battle,
    shop: (UNKNOWN.shop.base + u.shop) * (has(r, "merchants-bell") ? UNKNOWN.bellMul : 1),
    treasure: UNKNOWN.treasure.base + u.treasure,
  };
  const k = rng(r, "unknown").weighted(["event", "battle", "shop", "treasure"] as const, (x) => w[x]);
  u.battle = k === "battle" ? 0 : u.battle + UNKNOWN.battle.step;
  u.shop = k === "shop" ? 0 : u.shop + UNKNOWN.shop.step;
  u.treasure = k === "treasure" ? 0 : u.treasure + UNKNOWN.treasure.step;
  return k;
}

/** Pick the event for an event roll: act events 40% of the time, unseen ones 2x, the Merchant 1 in 12. */
export function pickEvent(r: Run): EventId | null {
  const pool = eventPool(r);
  if (!pool.length) return null;
  const g = rng(r, "events");
  const merchant = "the-wandering-merchant";
  if (pool.includes(merchant) && g.chance(UNKNOWN.merchantShare)) return merchant;
  const rest = pool.filter((id) => id !== merchant);
  if (!rest.length) return merchant;
  const actOnes = rest.filter((id) => EVENT[id]!.acts.length === 1);
  const anyOnes = rest.filter((id) => EVENT[id]!.acts.length !== 1);
  const from = actOnes.length && (!anyOnes.length || g.chance(UNKNOWN.actEvent)) ? actOnes : anyOnes;
  return g.weighted(from, (id) => (r.book.codexEvents.includes(id) ? 1 : UNKNOWN.unseenMul));
}
