// A golfer that plays the hole through the sim, for the tests and the
// solver script: every shot it could take from a lie (the angle in whole
// degrees, the power in hundredths, spin held or not, either way), the best
// by where it leaves the ball, kept only if the shots a hand would actually
// play around it (a degree off, a few hundredths of power off) do almost as
// well: a route a person cannot repeat proves nothing.
import { HOLE, type Hole, type Pt } from "./hole.ts";
import { R, create, hit, place, settle, type Shot, type State } from "./sim.ts";

export type Play = Shot & { spin: -1 | 0 | 1 };
export type Outcome = { holed: boolean; at: Pt; penalty: boolean; strokes: number };

/** One shot from `lie` (the ball's centre), played out. */
export function play(hole: Hole, lie: Pt, shot: Play): Outcome {
  const s = create(hole);
  place(s, lie);
  hit(s, shot);
  settle(s, shot.spin);
  const p = s.ball.getPosition();
  return { holed: s.phase === "holed", at: [p.x, p.y], penalty: s.strokes > 1, strokes: s.strokes };
}

/** Strokes still to go from where a shot left the ball, roughly: 0 holed; a putt or two on the green; a pitch more below the mesa. */
export function cost(hole: Hole, o: Outcome): number {
  if (o.holed) return 0;
  const d = Math.hypot(o.at[0] - hole.cup.x, o.at[1] - (hole.cup.y + R));
  const onTop = o.at[1] > hole.cup.y - 0.5 && o.at[0] > 70.5;
  const base = (o.penalty ? 1 : 0) + (onTop ? (d < 1.5 ? 1 : d < 8 ? 1.4 : 2) : 3);
  return base + d / 200;
}

/** Plays around `shot` that a hand might make instead: their worst cost. */
export function robust(hole: Hole, lie: Pt, shot: Play, da = 1, dp = 0.02): number {
  let worst = 0;
  for (const a of [-da, 0, da]) for (const p of [-dp, 0, dp]) {
    const o = play(hole, lie, { ...shot, angle: shot.angle + a, power: Math.min(1, Math.max(0.02, shot.power + p)) });
    worst = Math.max(worst, cost(hole, o));
  }
  return worst;
}

/** The best shot from `lie`: the cheapest outcome among the top few by their own cost, judged by their neighbours. */
export function best(hole: Hole, lie: Pt, opts: { spins?: Play["spin"][]; top?: number; noHole?: boolean } = {}): { shot: Play; cost: number; outcome: Outcome } {
  const tried: { shot: Play; c: number }[] = [];
  for (const facing of [1, -1] as const) for (const spin of opts.spins ?? [0, 1, -1]) for (let angle = 0; angle <= 88; angle += 1) for (let p = 2; p <= 100; p += 2) {
    const shot: Play = { angle, facing, power: p / 100, spin };
    const o = play(hole, lie, shot);
    // Without luck: a long shot that happens to drop is not a plan.
    if (opts.noHole && o.holed) continue;
    tried.push({ shot, c: cost(hole, o) });
  }
  tried.sort((a, b) => a.c - b.c);
  let pick = tried[0], pickCost = Infinity;
  for (const t of tried.slice(0, opts.top ?? 40)) {
    const r = robust(hole, lie, t.shot);
    if (r < pickCost) { pickCost = r; pick = t; }
  }
  return { shot: pick.shot, cost: pickCost, outcome: play(hole, lie, pick.shot) };
}

/** Plays a list of shots from the tee: the state after them. */
export function replay(shots: Play[], hole: Hole = HOLE): State {
  const s = create(hole);
  for (const shot of shots) {
    if (s.phase !== "aim") break;
    hit(s, shot);
    settle(s, shot.spin);
  }
  return s;
}
