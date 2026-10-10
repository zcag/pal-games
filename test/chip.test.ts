import { expect, test } from "bun:test";
import { HOLE } from "../chip/game/hole.ts";
import { R, create, hit, settle, scoreName } from "../chip/game/sim.ts";
import { play, replay } from "../chip/game/bot.ts";
import { PLAIN, TRICK, WINDOW } from "../chip/game/routes.ts";
import { cos, sin } from "../chip/game/trig.ts";
import { manifestOf, problems, storedKeys } from "./game-accounts.ts";

const TEE: [number, number] = [HOLE.tee[0], HOLE.tee[1] + R];
const onGreen = (at: number[]) => at[0] > 79 && at[0] < 94.8 && at[1] > 13.9;

test("trig.ts matches Math to the last bits that matter", () => {
  for (let a = -7; a < 7; a += 0.013) {
    expect(Math.abs(sin(a) - Math.sin(a))).toBeLessThan(1e-15);
    expect(Math.abs(cos(a) - Math.cos(a))).toBeLessThan(1e-15);
  }
});

test("a shot is the same shot every time", () => {
  const a = replay(PLAIN.slice(0, 1)), b = replay(PLAIN.slice(0, 1));
  expect(a.ball.getPosition().x).toBe(b.ball.getPosition().x);
  expect(a.ball.getPosition().y).toBe(b.ball.getPosition().y);
});

test("the plain way holes in par: tee to the cliff's foot, a pitch over the Needle, a putt", () => {
  const s = replay(PLAIN);
  expect(s.phase).toBe("holed");
  expect(s.strokes).toBeLessThanOrEqual(HOLE.par);
  // The tee shot and the pitch hold up a degree and a few hundredths of power off, as a hand plays them.
  for (const a of [-1, 0, 1]) for (const p of [-0.02, 0, 0.02]) {
    const o = play(HOLE, TEE, { ...PLAIN[0], angle: PLAIN[0].angle + a, power: PLAIN[0].power + p });
    expect(o.penalty).toBe(false);
    expect(o.at[0]).toBeGreaterThan(58);
    expect(o.at[0]).toBeLessThan(70.6);
  }
});

test("the trick: a full drive through the arch reaches the green in one, a stroke sooner than the plain way", () => {
  expect(WINDOW.filter((a) => a < 50).length).toBeGreaterThanOrEqual(6); // three degrees to find
  const o = play(HOLE, TEE, TRICK[0]);
  expect(onGreen(o.at)).toBe(true);
  // The plain way needs two shots to get there.
  expect(onGreen(play(HOLE, TEE, PLAIN[0]).at)).toBe(false);
  const s = replay(TRICK);
  expect(s.phase).toBe("holed");
  expect(s.strokes).toBeLessThanOrEqual(replay(PLAIN).strokes);
});

test("the pond costs a stroke and puts the ball back where it was hit", () => {
  const s = create();
  hit(s, { angle: 30, facing: 1, power: 0.86 });
  settle(s);
  expect(s.phase).toBe("aim");
  expect(s.strokes).toBe(2);
  expect(s.ball.getPosition().x).toBeCloseTo(TEE[0], 5);
});

test("a ball rolling over the cup drops when slow, and lips out when fast", () => {
  const roll = (power: number) => play(HOLE, [HOLE.cup.x - 3, 14 + R], { angle: 0, facing: 1, power, spin: 0 });
  const powers = Array.from({ length: 40 }, (_, i) => 0.1 + i * 0.01);
  const holed = powers.filter((p) => roll(p).holed);
  expect(holed.length).toBeGreaterThan(0);
  expect(roll(0.6).holed).toBe(false);
});

test("names a score", () => {
  expect(scoreName(1, 4)).toBe("Hole in one");
  expect(scoreName(3, 4)).toBe("Birdie");
  expect(scoreName(4, 4)).toBe("Par");
  expect(scoreName(5, 4)).toBe("Bogey");
});

test("every key the page writes has a sync rule", () => {
  const m = manifestOf("chip");
  expect(problems(m)).toEqual([]);
  expect(Object.keys(m.sync).sort()).toEqual(storedKeys("chip"));
});
