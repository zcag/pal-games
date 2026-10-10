// The ball and the hole, stepped at a fixed 120 Hz with planck.js (Box2D):
// the page and the tests run these same steps, so a shot is the same shot
// everywhere (the launch's sin and cos are trig.ts's, not Math's).
//
// Box2D bounces and spins the ball; what it lacks is added here: rolling
// resistance per surface (a ball on Box2D's ground rolls forever), the spin
// you put on in flight (a little lift or dip on the way, and the friction on
// landing turns it into a bite or a run), the pond, the cup and being lost.
import { ChainShape, Circle, Vec2, World, type Body, type Contact, type Fixture } from "./vendor/planck.js";
import { HOLE, SURFACES, type Hole, type Pt, type Rect, type Surface } from "./hole.ts";
import { RAD, cos, sin } from "./trig.ts";

export const DT = 1 / 120;
export const G = 12;
/** The ball's radius, m. It is drawn bigger than this on a small screen. */
export const R = 0.2;

/** How a shot feels. speed(p): launch speed at power p (0..1); squared in part so the bottom of the meter is a putt.
 *  spinRate: rad/s gained each second an arrow is held in flight, up to spinMax (a surface speed of spinMax * R m/s).
 *  magnus: lift (backspin) or dip (topspin) per rad/s of spin and m/s of speed, so a held arrow shows in the flight at once. */
export const FEEL = {
  vmax: 32,
  speed: (p: number) => 32 * (0.15 * p + 0.85 * p * p),
  spinRate: 110,
  spinMax: 40,
  magnus: 0.0004,
  /** The ball's moment of inertia, times m r^2 (a disc is 0.5): how much of the spin survives a landing. */
  inertia: 1.2,
  /** What is left of the spin after the ball hits a wall. */
  wallSpin: 0.25,
  /** A ball this slow (m/s), touching ground, for this long (s) has stopped. */
  restSpeed: 0.12,
  restFor: 0.3,
  /** Seconds a ball in the water or lost stays there before it comes back. */
  penaltyFor: 1.2,
  /** Seconds after a ball last moved before a shot that never stopped is called (it rocks in a hollow). */
  maxFlight: 30,
};

export type Phase = "aim" | "fly" | "penalty" | "holed";
export type Shot = { angle: number; facing: 1 | -1; power: number };
export type Ev =
  | { type: "hit"; power: number }
  | { type: "bounce"; surface: Surface; speed: number }
  | { type: "water"; x: number }
  | { type: "lost" }
  | { type: "back" }
  | { type: "rest"; surface: Surface }
  | { type: "cup"; speed: number };

export type State = {
  hole: Hole;
  world: World;
  ball: Body;
  phase: Phase;
  strokes: number;
  /** Where the ball was hit from; a penalty brings it back here. */
  lie: Pt;
  /** Seconds since the shot, and of the current phase's timer. */
  t: number;
  timer: number;
  /** Touching the ground now, and on what; whether it has touched since the shot (spin is put on only before). */
  touching: Surface | null;
  landed: boolean;
  /** Whether the ball has been off the ground since the shot (a putt never is). */
  left: boolean;
  /** The shot's spin input, +1 backspin, -1 topspin, 0 none. */
  spin: number;
  events: Ev[];
};

type FixtureData = { surfaces: Surface[] } | { surface: Surface };

const surfaceOf = (f: Fixture, child: number): Surface => {
  const d = f.getUserData() as FixtureData;
  return "surface" in d ? d.surface : d.surfaces[child] ?? "rock";
};

export function create(hole: Hole = HOLE): State {
  const world = new World({ gravity: new Vec2(0, -G) });
  const ground = world.createBody();
  ground.createFixture(new ChainShape(hole.ground.map(([x, y]) => new Vec2(x, y)), false), { friction: 0.5, restitution: 0, userData: { surfaces: hole.surfaces } });
  for (const loop of hole.rocks) ground.createFixture(new ChainShape(loop.map(([x, y]) => new Vec2(x, y)), true), { friction: 0.5, userData: { surface: "rock" } });
  const ball = world.createDynamicBody({ position: new Vec2(hole.tee[0], hole.tee[1] + R), bullet: true, allowSleep: false });
  ball.createFixture(new Circle(R), { density: 1, friction: 1, restitution: 0 });
  // Spin held like a heavier-rimmed ball's: friction on landing turns more of it into speed, so backspin bites.
  const m = ball.getMass();
  ball.setMassData({ mass: m, center: new Vec2(0, 0), I: FEEL.inertia * m * R * R });
  // Each contact plays its surface: the edge it touches names it.
  world.on("pre-solve", (c: Contact) => {
    const a = c.getFixtureA(), b = c.getFixtureB();
    const [f, child] = a.getBody() === ball ? [b, c.getChildIndexB()] : [a, c.getChildIndexA()];
    const s = SURFACES[surfaceOf(f, child)];
    c.setRestitution(s.bounce);
    c.setFriction(Math.sqrt(s.grip));
  });
  const s: State = { hole, world, ball, phase: "aim", strokes: 0, lie: [hole.tee[0], hole.tee[1] + R], t: 0, timer: 0, touching: "tee", landed: true, left: true, spin: 0, events: [] };
  hold(s);
  return s;
}

/** The ball laid at rest at `p` (the bot's start for a shot from a lie). */
export function place(s: State, p: Pt) {
  s.ball.setPosition(new Vec2(p[0], p[1]));
  hold(s);
}

function hold(s: State) {
  s.ball.setLinearVelocity(new Vec2(0, 0));
  s.ball.setAngularVelocity(0);
  s.ball.setGravityScale(0);
}

/** The launch velocity of a shot: angle in degrees above the horizontal, toward `facing`. */
export function launch(shot: Shot): Pt {
  const v = FEEL.speed(Math.min(1, Math.max(0, shot.power)));
  const a = shot.angle * RAD;
  return [shot.facing * v * cos(a), v * sin(a)];
}

export function hit(s: State, shot: Shot) {
  if (s.phase !== "aim") return;
  const [vx, vy] = launch(shot);
  const p = s.ball.getPosition();
  s.lie = [p.x, p.y];
  s.strokes++;
  s.phase = "fly";
  s.t = 0;
  s.timer = 0;
  s.landed = false;
  s.left = false;
  s.spin = 0;
  s.ball.setGravityScale(1);
  // Lifted off the ground by a hair, so the first step does not count as a landing.
  s.ball.setPosition(new Vec2(p.x, p.y + 0.01));
  s.ball.setLinearVelocity(new Vec2(vx, vy));
  s.ball.setAngularVelocity(0);
  s.events.push({ type: "hit", power: shot.power });
}

const inside = (r: Rect, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/** What the ball touches: the surface, and the contact's normal pointing out of the ground. */
function contact(s: State): { surface: Surface; nx: number; ny: number } | null {
  let best: { surface: Surface; nx: number; ny: number } | null = null;
  for (let e = s.ball.getContactList(); e; e = e.next ?? null) {
    const c = e.contact;
    if (!c.isTouching()) continue;
    const m = c.getWorldManifold(null);
    if (!m) continue;
    const ballIsA = c.getFixtureA().getBody() === s.ball;
    const [f, child] = ballIsA ? [c.getFixtureB(), c.getChildIndexB()] : [c.getFixtureA(), c.getChildIndexA()];
    // The manifold's normal points from A to B; out of the ground means toward the ball.
    const sign = ballIsA ? -1 : 1;
    const nx = m.normal.x * sign, ny = m.normal.y * sign;
    // The floor under the ball wins over a wall beside it.
    if (!best || ny > best.ny) best = { surface: surfaceOf(f, child), nx, ny };
  }
  return best;
}

/** One step of 1/120 s. `spin` is held during flight: +1 backspin, -1 topspin. */
export function step(s: State, spin = 0) {
  if (s.phase === "aim" || s.phase === "holed") return;
  if (s.phase === "penalty") {
    s.timer += DT;
    if (s.timer >= FEEL.penaltyFor) {
      s.strokes++;
      place(s, s.lie);
      s.phase = "aim";
      s.events.push({ type: "back" });
    }
    return;
  }
  const b = s.ball;
  const v = b.getLinearVelocity();
  const before = { x: v.x, y: v.y };
  // In flight, before it lands: the held arrow spins the ball, and the spin bends the flight.
  if (!s.landed) {
    s.spin = spin;
    if (spin) {
      const dir = v.x >= 0 ? 1 : -1;
      const w = b.getAngularVelocity() + spin * dir * FEEL.spinRate * DT;
      b.setAngularVelocity(Math.max(-FEEL.spinMax, Math.min(FEEL.spinMax, w)));
    }
    const w = b.getAngularVelocity();
    b.setLinearVelocity(new Vec2(v.x - FEEL.magnus * w * v.y * DT, v.y + FEEL.magnus * w * v.x * DT));
  }
  s.world.step(DT, 10, 4);
  s.t += DT;
  const p = b.getPosition();
  const h = s.hole;

  // Out past the edges, or into the pond: back to where it was hit, a stroke added.
  if (!inside(h.bounds, p.x, p.y)) return penalty(s, { type: "lost" });
  for (const w of h.water) if (inside(w, p.x, p.y)) return penalty(s, { type: "water", x: p.x });
  // In the cup: below the lip, between its walls.
  const cup = h.cup;
  if (Math.abs(p.x - cup.x) < cup.w / 2 && p.y < cup.y - R * 0.5) {
    s.phase = "holed";
    s.events.push({ type: "cup", speed: Math.hypot(before.x, before.y) });
    hold(s);
    b.setPosition(new Vec2(cup.x, cup.y - cup.d + R));
    return;
  }

  const c = contact(s);
  if (!c) s.left = true;
  if (c && !s.touching && s.left) {
    const speed = Math.abs(before.x * c.nx + before.y * c.ny);
    if (speed > 0.4) s.events.push({ type: "bounce", surface: c.surface, speed });
    // Off a wall the ball skids and loses most of its spin: backspin must not turn into a run back the way it came.
    if (c.ny < 0.5) b.setAngularVelocity(b.getAngularVelocity() * FEEL.wallSpin);
  }
  s.touching = c?.surface ?? null;
  if (c && (s.left || s.t > 0.15)) s.landed = true;
  if (c) {
    for (const l of h.lost) if (inside(l, p.x, p.y)) return penalty(s, { type: "lost" });
    roll(s, c.nx, c.ny, SURFACES[c.surface].roll);
  }
  const u = b.getLinearVelocity();
  const still = c && Math.hypot(u.x, u.y) < FEEL.restSpeed;
  s.timer = still ? s.timer + DT : 0;
  if (s.timer >= FEEL.restFor || s.t > FEEL.maxFlight) {
    hold(s);
    s.phase = "aim";
    s.timer = 0;
    s.events.push({ type: "rest", surface: c?.surface ?? "fairway" });
  }
}

/** Rolling resistance: the speed along the ground falls by `decel` m/s each second, the slip between the ball's
 *  spin and the ground kept as it was, so a spinning ball still bites or runs on through Box2D's friction. */
function roll(s: State, nx: number, ny: number, decel: number) {
  const b = s.ball, v = b.getLinearVelocity(), w = b.getAngularVelocity();
  const tx = ny, ty = -nx;
  const vt = v.x * tx + v.y * ty;
  const slip = vt + w * R;
  const cut = decel * DT;
  const vt2 = Math.abs(vt) <= cut ? 0 : vt - Math.sign(vt) * cut;
  b.setLinearVelocity(new Vec2(v.x + (vt2 - vt) * tx, v.y + (vt2 - vt) * ty));
  b.setAngularVelocity((slip - vt2) / R);
}

function penalty(s: State, ev: Ev) {
  s.phase = "penalty";
  s.timer = 0;
  s.events.push(ev);
  hold(s);
}

/** The ball's place and spin, for the page. */
export function ballOf(s: State) {
  const p = s.ball.getPosition(), v = s.ball.getLinearVelocity();
  return { x: p.x, y: p.y, vx: v.x, vy: v.y, angle: s.ball.getAngle(), w: s.ball.getAngularVelocity() };
}

/** Steps until the shot ends (at rest, holed, or back after a penalty), with the spin held throughout; for bots and tests. */
export function settle(s: State, spin = 0, maxSteps = 120 * 40) {
  for (let i = 0; i < maxSteps && (s.phase === "fly" || s.phase === "penalty"); i++) step(s, spin);
}

export const NAMES: Record<number, string> = { [-3]: "Albatross", [-2]: "Eagle", [-1]: "Birdie", 0: "Par", 1: "Bogey", 2: "Double bogey", 3: "Triple bogey" };
/** The score's name against par; a 1 is a hole in one whatever the par. */
export const scoreName = (strokes: number, par: number) => (strokes === 1 ? "Hole in one" : NAMES[strokes - par] ?? `${strokes - par > 0 ? "+" : ""}${strokes - par}`);
