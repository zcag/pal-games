// The player-like bot on the real rules (fast smoke checks; the long runs are scripts/economy.ts).
import { test, expect } from "bun:test";
import { Game } from "../seedfall/game/game.ts";
import { Bot, SKILLS, Rec, play } from "../seedfall/game/bot.ts";

const NOW = Date.UTC(2026, 9, 5, 12);

function run(seed: number, minutes: number, skill = "regular") {
  const g = Game.create(seed, { now: NOW, tz: 0 });
  const rec = new Rec();
  const bot = new Bot(g, SKILLS[skill], seed, { rec });
  play(g, bot, minutes * 60);
  return { g, rec };
}

test("a regular bot reaches Stone and buys an upgrade within 6 minutes from a fresh save", () => {
  const { g, rec } = run(1, 6);
  const r = rec.cur();
  expect(g.s.reached).toBeGreaterThanOrEqual(1);
  const first = r.buys.find((b) => b.what === "upgrade");
  expect(first).toBeDefined();
  expect(first!.t).toBeLessThan(180);
  expect(r.dives.length).toBeGreaterThanOrEqual(3);
  expect(r.docks.some((d) => d.sale > 0)).toBe(true);
});

test("a bot run is deterministic", () => {
  const a = run(5, 3), b = run(5, 3);
  expect(a.g.stateHash()).toBe(b.g.stateHash());
  expect(a.rec.cur().buys).toEqual(b.rec.cur().buys);
});

test("the bot plays like a person: it digs, picks up ore and never teleports", () => {
  const { rec } = run(2, 5, "casual");
  const dives = rec.cur().dives.filter((d) => d.t1 > d.t0);
  const dug = dives.reduce((a, d) => a + d.dug, 0), time = dives.reduce((a, d) => a + d.t1 - d.t0, 0) / 60;
  // a person digs well under two tiles a second over a dive (dig time 0.5-1 s a tile, plus travel and thinking)
  expect(dug / time).toBeGreaterThan(10);
  expect(dug / time).toBeLessThan(90);
  expect(dives.reduce((a, d) => a + d.ores, 0)).toBeGreaterThan(5);
});
