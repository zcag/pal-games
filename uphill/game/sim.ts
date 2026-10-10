// Uphill's rules: a car of three bodies (a chassis with the driver on it and two
// sprung wheels) on endless ground, at a fixed step, so a seed and the same
// keys give the same run in the page and in the tests. The page steps it and
// draws it; everything it reacts to (a coin, a landing, a flip, the end) comes
// out as an event.
import { Box, Chain, Circle, Polygon, Vec2, World, WheelJoint, type Body, type Fixture } from "./vendor/planck.js";
import { PIT, START_FLAT, features, ground, pitAt, plain, profile } from "./terrain.ts";

export const DT = 1 / 60;
/** The one stage: the same road every run, so it can be learnt and the best flag means something. */
export const STAGE = 7;

/** Everything that decides how the car drives; tuned with the bot (scripts/feel.ts) and by watching runs. */
export const FEEL = {
  gravity: 10,
  /** Chassis: half length and height (m), density; the centre of mass pulled down, so it sits but still flips. */
  half: { w: 1.25, h: 0.24 },
  density: 2.2,
  comDrop: 0.12,
  wheel: { r: 0.46, density: 1.1, friction: 1.1, x: 0.92, y: -0.42 },
  /** Suspension: spring (Hz) and damping (1 is critical). */
  spring: { hz: 3.6, damping: 0.62 },
  /** The motor: top wheel speed (rad/s) and its torque per wheel (N m), rear wheel stronger. */
  top: 26,
  torque: { rear: 11, front: 4 },
  brake: 40,
  reverse: 12,
  /** Lean in the air: torque, and the spin it stops pushing past (rad/s). */
  lean: 19,
  leanCap: 4.4,
  /** A little lean on the ground too, as in the game this plays like: gas sits it back, brake tips it forward. */
  groundLean: 10,
  /** Fuel: a full tank lasts this many seconds with the gas held, a third longer coasting. */
  tank: 30,
  /** Where the fuel cans are: the first, then each a little further than the last. */
  can: { first: 190, gap: 210, grow: 22 },
};

export type Input = { gas: boolean; brake: boolean };
export type End = "crash" | "fuel" | "fell";
export type Event =
  | { type: "coin"; value: number; x: number; y: number }
  | { type: "fuel"; x: number; y: number }
  | { type: "land"; air: number; hit: number }
  | { type: "flip"; n: number; bonus: number }
  | { type: "air"; t: number; bonus: number }
  | { type: "end"; why: End };
export type Coin = { x: number; y: number; value: number; taken: boolean };
export type Can = { x: number; y: number; taken: boolean };

/** The parts of the car a renderer needs, as plain numbers. */
export type Pose = { x: number; y: number; a: number; wheels: { x: number; y: number; a: number }[]; head: { x: number; y: number } };

const CHUNK = 60;
const HEAD = { x: -0.18, y: 0.86, r: 0.25 };

export type State = {
  seed: number;
  world: World;
  chassis: Body;
  wheels: Body[];
  joints: WheelJoint[];
  head: Fixture;
  /** Chains built so far: [x0, x1, body] in order. */
  chunks: { x0: number; x1: number; body: Body }[];
  built: number;
  coins: Coin[];
  cans: Can[];
  fuel: number;
  coinsTaken: number;
  t: number;
  /** Furthest the car has been, in metres from the start. */
  dist: number;
  /** Whether each wheel is on the ground, and the time since neither was. */
  touching: boolean[];
  air: number;
  /** Rotation gathered in the air (rad), for flips. */
  spin: number;
  /** The fall speed just before touching down. */
  vyAir: number;
  /** The first gas or brake: fuel waits for it. */
  started: boolean;
  ended: End | null;
  endedAt: number;
  events: Event[];
};

/** Coins: a row of five every 40-ish metres, worth more the further out. */
function placeCoins(seed: number, from: number, to: number, out: Coin[]) {
  const fs = features(seed, to + 100);
  for (let g = Math.ceil(from / 37) * 37; g < to; g += 37) {
    if (g < 45) continue;
    if (fs.some((f) => g > f.x - 12 && g < f.end + 8)) continue;
    const value = g < 500 ? 5 : g < 1000 ? 25 : 100;
    for (let i = 0; i < 5; i++) {
      const x = g + i * 1.7;
      out.push({ x, y: ground(seed, x) + 1.15, value, taken: false });
    }
  }
}

function placeCans(seed: number, from: number, to: number, out: Can[]) {
  const fs = features(seed, to + 200);
  let x = FEEL.can.first, k = 0;
  while (x < to) {
    let at = x;
    for (const f of fs) if (at > f.x - 15 && at < f.end + 10) at = f.end + 12;
    if (at >= from && at < to) out.push({ x: at, y: ground(seed, at) + 0.9, taken: false });
    k++;
    x += FEEL.can.gap + FEEL.can.grow * k;
  }
}

function buildTo(s: State, x: number) {
  while (s.built < x) {
    let x1 = s.built + CHUNK;
    while (!plain(s.seed, x1)) x1 += 2;
    const pts = profile(s.seed, s.built, x1).map((p) => new Vec2(p.x, p.y));
    const body = s.world.createBody({ type: "static" });
    // Ghost vertices from the neighbours, so a wheel crossing a seam does not catch on it.
    const chain = new Chain(pts, false);
    const before = profile(s.seed, s.built - 0.5, s.built - 0.5)[0], after = profile(s.seed, x1 + 0.5, x1 + 0.5)[0];
    if (before) chain.setPrevVertex(new Vec2(before.x, before.y));
    if (after) chain.setNextVertex(new Vec2(after.x, after.y));
    body.createFixture(chain, { friction: 0.9, userData: "ground" });
    s.chunks.push({ x0: s.built, x1, body });
    const coinsFrom = s.built;
    s.built = x1;
    placeCoins(s.seed, coinsFrom, x1, s.coins);
    placeCans(s.seed, coinsFrom, x1, s.cans);
  }
  // The world behind the car goes: nothing rolls back 150 m.
  while (s.chunks.length > 3 && s.chunks[0].x1 < s.chassis.getPosition().x - 150) s.world.destroyBody(s.chunks.shift()!.body);
}

export function create(seed: number): State {
  const world = new World({ gravity: new Vec2(0, -FEEL.gravity) });
  const y0 = ground(seed, 8) + 1.1;
  const chassis = world.createBody({ type: "dynamic", position: new Vec2(8, y0) });
  const { w, h } = FEEL.half;
  // The tub, low and long; the roll cage and the driver above it (only the head can touch the ground).
  chassis.createFixture(new Box(w, h), { density: FEEL.density, friction: 0.5, userData: "body" });
  chassis.createFixture(new Polygon([new Vec2(-0.75, h), new Vec2(0.5, h), new Vec2(0.25, h + 0.42), new Vec2(-0.6, h + 0.42)]), { density: FEEL.density * 0.3, friction: 0.5, userData: "body" });
  // The helmet is solid: the run ends the moment it touches the ground, and a car on its roof rests on it, not through it.
  const head = chassis.createFixture(new Circle(new Vec2(HEAD.x, HEAD.y), HEAD.r), { density: 0.4, friction: 0.6, userData: "head" });
  const md = { mass: 0, center: new Vec2(), I: 0 };
  chassis.getMassData(md);
  md.I -= md.mass * Vec2.dot(md.center, md.center);
  md.center = new Vec2(md.center.x, md.center.y - FEEL.comDrop);
  md.I += md.mass * Vec2.dot(md.center, md.center);
  chassis.setMassData(md);

  const wheels: Body[] = [], joints: WheelJoint[] = [];
  for (const side of [-1, 1]) {
    const p = new Vec2(8 + side * FEEL.wheel.x, y0 + FEEL.wheel.y);
    const wheel = world.createBody({ type: "dynamic", position: p });
    wheel.createFixture(new Circle(FEEL.wheel.r), { density: FEEL.wheel.density, friction: FEEL.wheel.friction, restitution: 0.05, userData: "wheel" });
    const j = world.createJoint(new WheelJoint({ motorSpeed: 0, maxMotorTorque: 0, enableMotor: true, frequencyHz: FEEL.spring.hz, dampingRatio: FEEL.spring.damping }, chassis, wheel, p, new Vec2(0, 1)))!;
    wheels.push(wheel);
    joints.push(j);
  }
  const s: State = {
    seed, world, chassis, wheels, joints, head, chunks: [], built: -40, coins: [], cans: [], fuel: 1, coinsTaken: 0, t: 0, dist: 0,
    touching: [false, false], air: 0, spin: 0, vyAir: 0, started: false, ended: null, endedAt: 0, events: [],
  };
  buildTo(s, 8 + CHUNK * 2);
  return s;
}

const touchingGround = (b: Body) => {
  for (let e = b.getContactList(); e; e = e.next) {
    const c = e.contact;
    if (c.isTouching() && (c.getFixtureA().getUserData() === "ground" || c.getFixtureB().getUserData() === "ground")) return true;
  }
  return false;
};

function headDown(s: State) {
  for (let c = s.world.getContactList(); c; c = c.getNext()) {
    if (!c.isTouching()) continue;
    const a = c.getFixtureA(), b = c.getFixtureB();
    if ((a === s.head && b.getUserData() === "ground") || (b === s.head && a.getUserData() === "ground")) return true;
  }
  return false;
}

/** Speed along the car's own forward axis (m/s). */
export const forward = (s: State) => Vec2.dot(s.chassis.getLinearVelocity(), s.chassis.getWorldVector(new Vec2(1, 0)));

function end(s: State, why: End) {
  if (s.ended) return;
  // A wreck stays where it fell rather than rolling back onto its wheels.
  if (why === "crash") { s.chassis.setAngularDamping(5); s.chassis.setLinearDamping(0.8); }
  s.ended = why;
  s.endedAt = s.t;
  s.events.push({ type: "end", why });
}

/** One fixed step. Events since the last call to `drain` gather in s.events. */
export function step(s: State, input: Input) {
  const c = s.chassis;
  if (!s.started && (input.gas || input.brake)) s.started = true;
  const pos = c.getPosition();
  buildTo(s, pos.x + 120);
  const alive = !s.ended || s.ended === "fuel";
  const fueled = s.fuel > 0 && !s.ended;
  const gas = fueled && input.gas && !input.brake, brake = fueled && input.brake;
  const v = forward(s);
  const onGround = s.touching[0] || s.touching[1];

  // The motor: gas drives clockwise (to the right), brake holds the wheels, then backs up.
  s.joints.forEach((j, i) => {
    const t = i === 0 ? FEEL.torque.rear : FEEL.torque.front;
    if (gas) { j.setMotorSpeed(-FEEL.top); j.setMaxMotorTorque(t); }
    else if (brake && v > 0.8) { j.setMotorSpeed(0); j.setMaxMotorTorque(FEEL.brake * (i === 0 ? 0.6 : 0.4)); }
    else if (brake) { j.setMotorSpeed(FEEL.top * 0.4); j.setMaxMotorTorque(FEEL.reverse * (i === 0 ? 0.6 : 0.4)); }
    else { j.setMotorSpeed(0); j.setMaxMotorTorque(s.ended ? 1.2 : 0.35); }
  });

  // Lean: strong in the air (that is the skill), a little on the ground.
  if (alive && !s.ended) {
    const dir = (input.gas ? 1 : 0) - (input.brake ? 1 : 0);
    const w = c.getAngularVelocity();
    if (dir && !onGround && w * dir < FEEL.leanCap) c.applyTorque(dir * FEEL.lean, true);
    else if (dir && onGround && fueled) c.applyTorque(dir * FEEL.groundLean, true);
  }

  const vyBefore = c.getLinearVelocity().y;
  const aBefore = c.getAngle();
  s.world.step(DT, 8, 3);
  s.t += DT;

  const was = s.touching[0] || s.touching[1];
  s.touching = s.wheels.map(touchingGround);
  const now = s.touching[0] || s.touching[1];
  if (!now) {
    s.air += DT;
    s.spin += c.getAngle() - aBefore;
    s.vyAir = vyBefore;
  } else if (!was) {
    if (s.air > 0.18) s.events.push({ type: "land", air: s.air, hit: Math.max(0, -s.vyAir) });
    if (!s.ended) {
      const flips = Math.floor((Math.abs(s.spin) + 0.6) / (Math.PI * 2));
      if (flips > 0) { const bonus = 50 * flips * flips; s.coinsTaken += bonus; s.events.push({ type: "flip", n: flips, bonus }); }
      else if (s.air > 1.4) { const bonus = Math.round(s.air * 10) * 5; s.coinsTaken += bonus; s.events.push({ type: "air", t: s.air, bonus }); }
    }
    s.air = 0;
    s.spin = 0;
  }

  const p = c.getPosition();
  if (!s.ended) {
    if (headDown(s)) end(s, "crash");
    const pit = pitAt(s.seed, p.x);
    if (pit && p.y < pit.floor + PIT * 0.55) end(s, "fell");
  }
  if (!s.ended || s.ended === "fuel") {
    // Fuel burns with time, faster on the gas.
    if (s.fuel > 0 && s.started) s.fuel = Math.max(0, s.fuel - DT / FEEL.tank * (input.gas ? 1 : 0.75));
    const d = p.x - 8;
    // No 'stuck' ending: a stalled car can back up and try again, one on its side is righted by a lean or falls onto the helmet, and the fuel runs out anyway.
    if (d > s.dist) s.dist = d;
    for (const k of s.coins) if (!k.taken && Math.abs(k.x - p.x) < 1.5 && Math.abs(k.y - p.y) < 1.4) {
      k.taken = true; s.coinsTaken += k.value; s.events.push({ type: "coin", value: k.value, x: k.x, y: k.y });
    }
    for (const k of s.cans) if (!k.taken && Math.abs(k.x - p.x) < 1.6 && Math.abs(k.y - p.y) < 1.6) {
      k.taken = true; s.fuel = 1; s.events.push({ type: "fuel", x: k.x, y: k.y });
    }
    s.coins = s.coins.filter((k) => k.x > p.x - 60);
    s.cans = s.cans.filter((k) => k.x > p.x - 60);
  }
  // Out of fuel: the run ends once the car has rolled to a stop.
  if (s.fuel <= 0 && !s.ended) { s.ended = "fuel"; s.endedAt = -1; }
  if (s.ended === "fuel" && s.endedAt < 0 && Math.abs(v) < 0.25 && now) { s.endedAt = s.t; s.events.push({ type: "end", why: "fuel" }); }
}

/** Whether the run is over (out of fuel counts once the car stopped). */
export const over = (s: State) => !!s.ended && s.endedAt >= 0;

export function drain(s: State): Event[] {
  const e = s.events;
  s.events = [];
  return e;
}

export function pose(s: State): Pose {
  const c = s.chassis, p = c.getPosition();
  const h = c.getWorldPoint(new Vec2(HEAD.x, HEAD.y));
  return {
    x: p.x, y: p.y, a: c.getAngle(),
    wheels: s.wheels.map((w) => ({ x: w.getPosition().x, y: w.getPosition().y, a: w.getAngle() })),
    head: { x: h.x, y: h.y },
  };
}

/** Where the suspension sits: each wheel's travel along its axis (m, 0 at rest). */
export const travel = (s: State) => s.joints.map((j) => j.getJointTranslation());

export { START_FLAT };
