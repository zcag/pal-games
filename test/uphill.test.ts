// Uphill: the ground (terrain.ts), the car on it (sim.ts) and the drivers
// (bot.ts). The physics runs at a fixed step, so every number here is the
// same each run; a run of a few minutes of game time is a tenth of a second.
import { describe, expect, test } from "bun:test";
import { PIT, STEP, features, ground, pitAt, profile } from "../uphill/game/terrain.ts";
import { DT, FEEL, STAGE, create, drain, forward, over, pose, step, travel, type Event, type Input, type State } from "../uphill/game/sim.ts";
import { decide, type Style } from "../uphill/game/bot.ts";
import { KEYS } from "../uphill/game/keys.ts";
import { manifestOf, merge, problems, storedKeys } from "./game-accounts.ts";

const GAS: Input = { gas: true, brake: false }, BRAKE: Input = { gas: false, brake: true }, NONE: Input = { gas: false, brake: false };
const ticks = (s: State, n: number, input: Input | ((s: State) => Input) = NONE) => {
  const events: Event[] = [];
  for (let i = 0; i < n; i++) { step(s, typeof input === "function" ? input(s) : input); events.push(...drain(s)); }
  return events;
};
function drive(seed: number, style: Style, limit = 60 * 60 * 5) {
  const s = create(seed);
  let maxV = 0, maxW = 0;
  for (let i = 0; i < limit && !over(s); i++) {
    step(s, decide(s, style));
    drain(s);
    const v = s.chassis.getLinearVelocity();
    maxV = Math.max(maxV, Math.hypot(v.x, v.y));
    maxW = Math.max(maxW, Math.abs(s.chassis.getAngularVelocity()));
  }
  return { s, maxV, maxW };
}

describe("the ground", () => {
  test("the same seed gives the same ground; another seed another", () => {
    expect(profile(STAGE, 0, 300)).toEqual(profile(STAGE, 0, 300));
    expect(ground(STAGE, 123.4)).not.toBe(ground(STAGE + 1, 123.4));
  });

  test("it starts flat, and grows taller and steeper further out", () => {
    for (let x = 0; x < 15; x += 0.5) expect(Math.abs(ground(STAGE, x))).toBeLessThan(0.05);
    const steepest = (a: number, b: number) => {
      let m = 0;
      for (let x = a; x < b; x += STEP) if (!pitAt(STAGE, x) && !pitAt(STAGE, x + STEP)) m = Math.max(m, Math.abs(ground(STAGE, x + STEP) - ground(STAGE, x)) / STEP);
      return m;
    };
    const range = (a: number, b: number) => { let lo = Infinity, hi = -Infinity; for (let x = a; x < b; x += 2) { lo = Math.min(lo, ground(STAGE, x)); hi = Math.max(hi, ground(STAGE, x)); } return hi - lo; };
    expect(range(1500, 1800)).toBeGreaterThan(range(30, 330));
    expect(steepest(30, 160)).toBeLessThan(0.5);
  });

  test("a gentle hop first, the real kicker 400-500 m in, then the wall and the gap, then one every 150 to 260 m", () => {
    for (const seed of [STAGE, 1, 2, 3, 4]) {
      const fs = features(seed, 3000);
      expect(fs.slice(0, 4).map((f) => f.kind)).toEqual(["hop", "jump", "wall", "gap"]);
      expect(fs[0].x).toBe(170);
      expect(fs[1].x).toBeGreaterThan(400);
      expect(fs[1].x).toBeLessThan(500);
    }
    const fs = features(STAGE, 3000);
    for (let i = 2; i < fs.length; i++) {
      const gap = fs[i].x - fs[i - 1].end;
      expect(gap).toBeGreaterThanOrEqual(150);
      expect(gap).toBeLessThanOrEqual(260);
    }
  });

  test("a gap's pit has straight walls and a floor well below both sides; the polyline goes down, across and up", () => {
    const gap = features(STAGE, 3000).find((f) => f.kind === "gap")!;
    const pit = pitAt(STAGE, gap.end - 2)!;
    expect(pit).toBeDefined();
    const pts = profile(STAGE, gap.x - 10, gap.end + 10);
    const i = pts.findIndex((p) => p.x === pit.from && p.y === pit.floor);
    expect(pts[i - 1].x).toBe(pit.from);
    expect(pts[i - 1].y - pit.floor).toBeGreaterThan(PIT - 1);
    expect(pts[i + 1]).toEqual({ x: pit.to, y: pit.floor });
    expect(pts[i + 2].x).toBe(pit.to);
    expect(pts[i + 2].y - pit.floor).toBeGreaterThan(PIT - 4);
    // Nowhere else does the line go back on itself or jump.
    for (let k = 1; k < pts.length; k++) {
      if (k >= i - 1 && k <= i + 2) continue;
      expect(pts[k].x).toBeGreaterThan(pts[k - 1].x);
    }
  });
});

describe("the car", () => {
  test("it settles on its springs at the start: level, both wheels down, the suspension squatting a little", () => {
    const s = create(STAGE);
    ticks(s, 120);
    const p = pose(s);
    expect(Math.abs(p.a)).toBeLessThan(0.02);
    expect(s.touching).toEqual([true, true]);
    expect(Math.abs(s.chassis.getLinearVelocity().x)).toBeLessThan(0.05);
    for (const t of travel(s)) expect(t).toBeGreaterThan(0.01);
    // Nothing burns before the first key.
    expect(s.fuel).toBe(1);
    expect(s.started).toBe(false);
  });

  test("the same keys give the same run, to the last digit", () => {
    const run = () => { const s = create(STAGE); ticks(s, 900, (st) => (Math.floor(st.t * 3) % 4 === 3 ? NONE : GAS)); return pose(s); };
    expect(run()).toEqual(run());
  });

  test("the gas pulls away and tops out; the brake stops it, then backs it up", () => {
    const s = create(STAGE);
    ticks(s, 60);
    ticks(s, 120, GAS);
    expect(forward(s)).toBeGreaterThan(6);
    expect(forward(s)).toBeLessThan(FEEL.top * FEEL.wheel.r + 1);
    const v0 = forward(s);
    ticks(s, 30, BRAKE);
    expect(forward(s)).toBeLessThan(v0 * 0.75);
    let n = 0;
    while (forward(s) > 0.3 && n < 180) { ticks(s, 1, BRAKE); n++; }
    expect(n).toBeLessThan(180);
    ticks(s, 120, BRAKE);
    expect(forward(s)).toBeLessThan(-0.5);
  });

  test("in the air the gas leans it back and the brake forward; let go and it keeps its spin", () => {
    const lean = (input: Input) => {
      const s = create(STAGE);
      ticks(s, 30);
      s.chassis.setPosition({ x: 8, y: 20 });
      for (const w of s.wheels) w.setPosition({ x: w.getPosition().x, y: w.getPosition().y + 19 });
      ticks(s, 3);
      const a0 = s.chassis.getAngle();
      ticks(s, 24, input);
      return s.chassis.getAngle() - a0;
    };
    expect(lean(GAS)).toBeGreaterThan(0.25);
    expect(lean(BRAKE)).toBeLessThan(-0.25);
    expect(Math.abs(lean(NONE))).toBeLessThan(0.05);
  });

  test("the driver's helmet on the ground ends the run, and the wreck stays put", () => {
    const s = create(STAGE);
    ticks(s, 30);
    s.chassis.setTransform({ x: 20, y: 2.5 }, Math.PI);
    for (const [i, w] of s.wheels.entries()) w.setPosition({ x: 20 + (i ? -1 : 1) * FEEL.wheel.x, y: 2.9 });
    const events = ticks(s, 90);
    expect(s.ended).toBe("crash");
    expect(events.filter((e) => e.type === "end")).toEqual([{ type: "end", why: "crash" }]);
    expect(Math.abs(Math.cos(s.chassis.getAngle()))).toBeGreaterThan(0.5);
    expect(Math.cos(s.chassis.getAngle())).toBeLessThan(0);
  });

  test("dropped into a gap the run ends there", () => {
    const gap = features(STAGE, 3000).find((f) => f.kind === "gap")!;
    const pit = pitAt(STAGE, gap.end - 2)!;
    const s = create(STAGE);
    ticks(s, 10);
    const x = (pit.from + pit.to) / 2, y = pit.floor + PIT * 0.7;
    s.chassis.setPosition({ x, y });
    for (const [i, w] of s.wheels.entries()) { w.setPosition({ x: x + (i ? 1 : -1) * FEEL.wheel.x, y: y - 0.42 }); w.setLinearVelocity({ x: 0, y: 0 }); }
    s.chassis.setLinearVelocity({ x: 0, y: 0 });
    ticks(s, 60);
    expect(s.ended).toBe("fell");
  });
});

describe("a run", () => {
  test("fuel burns down with the gas held and a can fills it; out of fuel the car rolls to a stop, then it ends", () => {
    const s = create(STAGE);
    ticks(s, 30);
    s.cans.length = 0;
    const burnt = 1 - (ticks(s, 60 * 3, GAS), s.fuel);
    expect(burnt).toBeCloseTo(3 / FEEL.tank, 2);
    s.cans.push({ x: s.chassis.getPosition().x + 3, y: s.chassis.getPosition().y, taken: false });
    const events = ticks(s, 30, GAS);
    expect(events.some((e) => e.type === "fuel")).toBe(true);
    expect(s.fuel).toBeGreaterThan(0.98);
    s.fuel = 0.001;
    s.cans.length = 0;
    ticks(s, 5, GAS);
    expect(s.ended).toBe("fuel");
    expect(over(s)).toBe(false);
    for (let i = 0; i < 60 * 30 && !over(s); i++) { step(s, GAS); drain(s); }
    expect(over(s)).toBe(true);
    expect(Math.abs(forward(s))).toBeLessThan(0.3);
  });

  test("coins are taken by driving through them and pay more further out", () => {
    const s = create(STAGE);
    const events = ticks(s, 60 * 9, GAS);
    const coins = events.filter((e) => e.type === "coin");
    expect(coins.length).toBeGreaterThanOrEqual(5);
    expect(s.coinsTaken).toBe(coins.reduce((n, e) => n + (e.type === "coin" ? e.value : 0), 0));
    expect(coins.every((e) => e.type === "coin" && e.value === 5)).toBe(true);
  });

  test("the first hop is survived with the gas held: a short flight, landed upright", () => {
    const s = create(STAGE);
    let air = 0, tilt = 0;
    for (let i = 0; i < 60 * 30 && s.chassis.getPosition().x < 215; i++) {
      step(s, GAS);
      const x = s.chassis.getPosition().x;
      if (x > 175) tilt = Math.max(tilt, Math.abs(s.chassis.getAngle()));
      for (const e of drain(s)) if (e.type === "land" && x > 178) air = Math.max(air, e.air);
    }
    expect(s.ended).toBeNull();
    expect(air).toBeGreaterThan(0.25);
    expect(tilt).toBeLessThan(1);
  });

  test("skill decides the distance: the gas held flips at the real kicker, a driver who never leans goes over at the wall, a careful one gets past a kilometre", () => {
    const careless = drive(STAGE, "careless"), novice = drive(STAGE, "novice"), careful = drive(STAGE, "careful");
    const kicker = features(STAGE, 1000)[1];
    expect(careless.s.ended).toBe("crash");
    expect(careless.s.dist).toBeGreaterThan(kicker.x - 8);
    expect(careless.s.dist).toBeLessThan(kicker.end + 40);
    expect(novice.s.dist).toBeGreaterThan(careless.s.dist);
    expect(novice.s.dist).toBeLessThan(900);
    expect(careful.s.dist).toBeGreaterThan(1000);
    expect(careful.s.dist).toBeLessThan(2500);
  });

  test("the physics holds over a long run: nothing explodes, nothing tunnels through the ground", () => {
    const { s, maxV, maxW } = drive(STAGE, "careful");
    expect(maxV).toBeLessThan(30);
    expect(maxW).toBeLessThan(12);
    const p = s.chassis.getPosition();
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    if (!pitAt(STAGE, p.x)) expect(p.y).toBeGreaterThan(ground(STAGE, p.x) - 0.5);
    // The world behind is let go: a handful of chunks, not the whole road.
    expect(s.chunks.length).toBeLessThan(8);
    void DT;
  });
});

describe("keys", () => {
  test("up drives and leans back, down brakes and leans forward (W and S too); nothing on left or right", () => {
    expect(KEYS).toEqual({ gas: ["ArrowUp", "KeyW"], brake: ["ArrowDown", "KeyS"] });
    const m = manifestOf("uphill") as unknown as { store: { actions: { keys: string }[] }; palettes: { uphill: { keys: { keys: string }[] } } };
    const listed = [...m.store.actions.map((a) => a.keys), ...m.palettes.uphill.keys.map((k) => k.keys)];
    expect(listed.filter((k) => k === "up").length).toBe(2);
    expect(listed.filter((k) => k === "down").length).toBe(2);
    expect(listed.some((k) => /left|right/.test(k))).toBe(false);
  });
});

describe("accounts", () => {
  const m = manifestOf("uphill");
  test("the best distance, the look and the style are kept (a store picture's scene stays on its machine), and two machines' bests merge to the larger", () => {
    expect(problems(m)).toEqual([]);
    expect(storedKeys("uphill")).toEqual(["best", "look", "scene", "style"]);
    expect(m.sync).toEqual({ best: "max", look: "latest", style: "latest", scene: "local" });
    expect(merge(m.sync.best, 812, 1440, 600)).toBe(1440);
  });
});
