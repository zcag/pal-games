// The pod (core-loop.md): physics with mass, corner forgiveness, landing and bumps, the fast drop with auto-brake,
// riding the Lift, drilling (engage, chain, buffer, decay, too hard), fuel burn by state, heat, lava contact,
// items 1-6 and Overcharge, the Afterburner, the magnet, the crate, the drone, the Smelter, dumping.
import { W, H, FLAG, HAZ, type Input, type PodView } from "./types.ts";
import { MAT, MATERIALS, FINDS, tempAt, piecesPerTile } from "./content/world.ts";
import { STAT_FX, ITEMS, GUARDS, planetEcon, type ItemId } from "./content/economy.ts";
import { I, type Ent } from "./world.ts";
import type { Game } from "./game.ts";

export type Dir = "left" | "right" | "down";
export const HW = 0.4375; // half the pod's 0.875-tile box
export const M_EMPTY = 20;

export interface DigState {
  x: number; y: number; dir: Dir; progress: number; mat: number;
  dur: number; ratio: number; ox: number; oy: number; held: boolean; over: boolean;
}

/** The pod's full state: the PodView the surface reads plus the rules' timers. JSON-safe except fuelHome (Infinity). */
export interface PodState extends PodView {
  dig: DigState | null;
  engage: { dir: Dir; i: number; t: number } | null;
  queued: Dir | null;
  chain: number;
  riding: boolean;
  /** Left the Lift sideways: no clamping again until the pod is off the column. */
  unclamp: boolean;
  drop: boolean;
  dropLock: boolean;
  deadT: number;
  strandT: number;
  itemCd: number;
  overcharge: number;
  overchargeCd: number;
  burst: number;
  burstCd: number;
  lastUp: number;
  coolant: number;
  blind: number;
  pulseHeat: number;
  lavaT: number;
  magnetT: number;
  droneT: number;
  /** Lamp radius in tiles right now (halved at 0 fuel or in a spore cloud). */
  lamp: number;
  /** Fuel burn this tick, litres per second (HUD, bot). */
  burn: number;
  cargo: Record<number, number>;
  ingots: Record<number, number>;
  smelt: Record<number, number>;
  artifacts: number[];
  items: Record<ItemId, number>;
  told: { i: number; t: number }[];
  fullTold: boolean;
  /** Seconds the teleporter has been channelling (0 = none); `channel` is its 0..1 progress. */
  chanT: number;
}

export function freshPod(x: number, y: number): PodState {
  return {
    x, y, vx: 0, vy: 0, facing: 1, grounded: true, thrusting: false, dig: null,
    fuel: 10, fuelMax: 10, fuelHome: 0, hull: 40, hullMax: 40, heat: 0, temp: 15,
    cargoUsed: 0, cargoMax: 8, load: 1, invuln: 0, channel: 0, dead: false, stranded: false,
    engage: null, queued: null, chain: 0, riding: false, unclamp: false, drop: false, dropLock: false,
    deadT: 0, strandT: 0, itemCd: 0, overcharge: 0, overchargeCd: 0, burst: 0, burstCd: 0, lastUp: -9,
    coolant: 0, blind: 0, pulseHeat: 0, lavaT: 0, magnetT: 0, droneT: 0, lamp: 3.5, burn: 0,
    cargo: {}, ingots: {}, smelt: {}, artifacts: [],
    items: { fuel: 0, repair: 0, dynamite: 0, charge: 0, teleport: 0, coolant: 0 },
    told: [], fullTold: false, chanT: 0,
  };
}

const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
/** The lowest drill level whose power digs hardness h at ratio <= 2.5 (D11's label). */
export const needLevel = (h: number) => Math.max(0, Math.ceil(Math.log(h / 2.5) / Math.log(1.25) - 1e-9));

// ---------------------------------------------------------------- cargo

export const slotsUsed = (p: PodState) => {
  let n = 0;
  for (const k in p.cargo) n += p.cargo[k];
  for (const k in p.ingots) n += p.ingots[k];
  return n;
};
/** Cargo mass (D3); `mult` is the planet's ore mass (Ferrum x1.3). */
export const cargoMass = (p: PodState, mult = 1) => {
  let m = 0;
  for (const k in p.cargo) m += p.cargo[k] * FINDS[+k].mass;
  for (const k in p.ingots) m += p.ingots[k] * 5 * FINDS[+k].mass; // mass unchanged by smelting
  return m * mult;
};
export const addCargo = (rec: Record<number, number>, id: number, n: number) => {
  rec[id] = (rec[id] ?? 0) + n;
  if (rec[id] <= 0) delete rec[id];
};

// ---------------------------------------------------------------- collision

/** Is the pod's box free of solid tiles at (x, y)? */
export const boxFree = (g: Game, x: number, y: number) => !overlaps(g, x, y);
function overlaps(g: Game, x: number, y: number) {
  const e = 1e-6;
  const x0 = Math.floor(x - HW + e), x1 = Math.floor(x + HW - e), y0 = Math.floor(y - HW + e), y1 = Math.floor(y + HW - e);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (g.live.solid(tx, ty) || ty < -24) return { tx, ty };
  return null;
}
export function groundedAt(g: Game, x: number, y: number) {
  const ty = Math.floor(y + HW + 0.02);
  if (Math.floor(y + HW - 1e-6) === ty) return false;
  for (let tx = Math.floor(x - HW + 1e-6); tx <= Math.floor(x + HW - 1e-6); tx++) if (g.live.solid(tx, ty)) return true;
  return false;
}

/** A push-out never moves the pod further than its own step plus a sliver: an embedded pod stays put, never ratchets. */
const PUSH = 0.1;
function moveX(g: Game, p: PodState, d: number) {
  const x0 = p.x;
  p.x += d;
  const hit = overlaps(g, p.x, p.y);
  if (!hit) return;
  // a curb: a tile edge up to 0.2 above the pod's bottom is stepped onto (driving across a 1-wide hole never snags)
  const up = p.y + HW - hit.ty;
  if (up > 0 && up <= 0.2 && p.vy >= 0 && !overlaps(g, p.x, hit.ty - HW - 1e-6)) { p.y = hit.ty - HW - 1e-6; p.vy = 0; return; }
  p.x = d > 0 ? hit.tx - HW - 1e-6 : hit.tx + 1 + HW + 1e-6;
  if (Math.abs(p.x - x0) > Math.abs(d) + PUSH) p.x = x0;
  const v = Math.abs(p.vx);
  if (v > 7) {
    const dmg = 2 * (v - 7) * g.impactScale();
    g.hurt(dmg, "bump");
    g.emit({ t: "bump", speed: v, damage: dmg, axis: "x" });
    p.vx = -0.2 * p.vx;
  } else p.vx = 0;
}

function moveY(g: Game, p: PodState, d: number, dt: number) {
  const y0 = p.y;
  p.y += d;
  const hit = overlaps(g, p.x, p.y);
  if (!hit) return;
  // corner forgiveness: a 0.2-tile overlap on one side nudges the pod sideways at 6 tiles/s instead of stopping
  const left = p.x - HW, right = p.x + HW;
  const blockedL = g.live.solid(Math.floor(left + 1e-6), hit.ty), blockedR = g.live.solid(Math.floor(right - 1e-6), hit.ty);
  // (not when the pod is driving onto that side: then it lands on the edge and drives on)
  const onto = (blockedL && p.vx < -0.5) || (blockedR && p.vx > 0.5);
  if (blockedL !== blockedR && !onto) {
    const over = blockedL ? Math.floor(left + 1e-6) + 1 - left : right - Math.floor(right - 1e-6);
    if (over <= 0.2) {
      p.y = y0;
      const nx = p.x + (blockedL ? 1 : -1) * Math.min(over + 1e-4, 6 * dt);
      if (!overlaps(g, nx, p.y)) p.x = nx;
      return;
    }
  }
  if (d > 0) {
    p.y = hit.ty - HW - 1e-6;
    if (Math.abs(p.y - y0) > Math.abs(d) + PUSH) p.y = y0;
    land(g, p);
  } else {
    p.y = hit.ty + 1 + HW + 1e-6;
    if (Math.abs(p.y - y0) > Math.abs(d) + PUSH) p.y = y0;
    const v = Math.abs(p.vy);
    if (v > 7) {
      const dmg = 2 * (v - 7) * g.impactScale();
      g.hurt(dmg, "bump");
      g.emit({ t: "bump", speed: v, damage: dmg, axis: "y" });
      p.vy = 0.2 * v;
    } else p.vy = 0;
  }
}

function land(g: Game, p: PodState) {
  const v = p.vy;
  p.vy = 0;
  if (v <= 1.5) return;
  let dmg = 0;
  // a braked drop never deals fall damage (R2c)
  if (v > 9 && !p.drop) dmg = 5 * (v - 9) * Math.sqrt(p.load) * g.impactScale();
  g.emit({ t: "land", speed: v, damage: dmg });
  if (dmg > 0) g.hurt(dmg, "fall");
  p.drop = false;
}

// ---------------------------------------------------------------- the step

export function stepPod(g: Game, input: Input, dt: number) {
  const p = g.pod;
  const inp = toMouth(g, input);
  if (p.dead) {
    p.deadT -= dt;
    if (p.deadT <= 0) g.rebuild();
    return;
  }
  p.invuln = Math.max(0, p.invuln - dt);
  p.itemCd = Math.max(0, p.itemCd - dt);
  p.overchargeCd = Math.max(0, p.overchargeCd - dt);
  p.burstCd = Math.max(0, p.burstCd - dt);
  p.burst = Math.max(0, p.burst - dt);
  p.coolant = Math.max(0, p.coolant - dt);
  p.blind = Math.max(0, p.blind - dt);
  p.pulseHeat = Math.max(0, p.pulseHeat - dt);
  p.told = p.told.filter((t) => g.time - t.t < 5);

  updateLoad(g);
  if (inp.item) useItem(g, inp.item);
  if (inp.scan) g.scanPulse(false);
  if (inp.dump) dump(g);

  // the teleporter's channel: 2.5 s (1.5 with Recall Beacon), then home with the cargo
  if (p.chanT > 0) {
    p.chanT += dt;
    const need = g.has("L2") ? 1.5 : 2.5;
    p.channel = Math.min(1, p.chanT / need);
    if (p.chanT >= need) { p.chanT = 0; p.channel = 0; g.teleportHome(); return; }
  }

  // empty tank (R1): the engine cuts; with no fuel cells, a tow is offered after 1 s
  if (p.fuel <= 0) {
    p.fuel = 0;
    if (p.items.fuel > 0) { if (inp.confirm) useItem(g, 1); }
    else if (!g.inTown()) {
      p.strandT += dt;
      if (p.strandT >= 1 && !p.stranded) { p.stranded = true; g.emit({ t: "toast", text: "Out of fuel. Call a tow? (pod only)", tone: "bad" }); }
      if (p.stranded && inp.confirm) { g.tow(); return; }
    }
  } else if (p.fuelHome === Infinity && !g.inTown() && !p.riding && !p.items.dynamite && !p.items.charge && !p.items.teleport) {
    // sealed in with nothing to blast or jump out: the same tow (pod only, the cargo as a crate), no fuel burn needed
    p.strandT += dt;
    if (p.strandT >= 1 && !p.stranded) { p.stranded = true; g.emit({ t: "toast", text: "Sealed in. Call a tow? (pod only)", tone: "bad" }); }
    if (p.stranded && inp.confirm) { g.tow(); return; }
  } else { p.strandT = 0; p.stranded = false; }
  const engine = p.fuel > 0;

  // afterburner: double-tap Up
  if (g.edge.up && engine) {
    if (g.moduleOn("afterburner") && p.burstCd <= 0 && g.time - p.lastUp < 0.3 && !p.riding) {
      p.burst = 1.5; p.burstCd = 8; p.fuel = Math.max(0, p.fuel - 0.03 * p.fuelMax);
      g.emit({ t: "item", item: "afterburner", ok: true });
    }
    p.lastUp = g.time;
  }

  let state: "idle" | "drive" | "drill" | "thrust" | "drop" | "free" = "idle";
  p.thrusting = false;
  if (p.riding) ride(g, p, inp, dt);
  else {
    state = drill(g, p, inp, dt, engine) ? "drill" : physics(g, p, inp, dt, engine);
    tryClamp(g, p, inp);
  }
  if (p.y < 0 || p.riding) state = "free";

  // fuel burn by state (core-loop "Fuel")
  const k = p.load;
  let burn = 0;
  if (state === "idle") burn = 0.04;
  else if (state === "drive") burn = 0.1;
  else if (state === "drop") burn = 0.04;
  else if (state === "drill") burn = (0.12 + 0.04 * (p.dig?.ratio ?? 1)) * (g.moduleOn("recycler") ? 0.6 : 1);
  else if (state === "thrust") {
    const h = 0.04 + 0.21 * Math.sqrt(k);
    burn = Math.max(h, (h / vref(g, k)) * Math.max(0, -p.vy));
  }
  if (p.heat >= 1) burn *= 1.5;
  p.burn = burn;
  if (burn > 0 && p.fuel > 0) p.fuel = Math.max(0, p.fuel - burn * dt);

  heat(g, p, dt);
  contact(g, p, dt);
  pickups(g, p, dt);
  smelt(g, p, dt);
  drone(g, p, dt);
  p.lamp = STAT_FX.lamp(g.lampLevel()) * (p.fuel <= 0 || p.blind > 0 ? 0.5 : 1);
}

/** Down held on town ground (the depot pad, the mouth's lining) drives the pod toward the mine mouth; the last
 * tile and a half is the Down-easing's (physics), which drops it in, auto-braked. */
function toMouth(g: Game, inp: Input): Input {
  const p = g.pod;
  if (!inp.down || inp.left || inp.right || !g.inTown() || !p.grounded || p.riding) return inp;
  const sx = g.live.w.spawnX, row = Math.floor(p.y + HW + 0.02);
  if (row !== 0 || !g.live.townGround(I(Math.floor(p.x), 0))) return inp;
  const dx = sx + 0.5 - p.x;
  if (Math.abs(dx) <= 1.2) return inp;
  return { ...inp, down: false, left: dx < 0, right: dx > 0 };
}

export const vref = (g: Game, k: number) => STAT_FX.vref(g.s.levels.engine) * Math.pow(k, -0.5);
/** Litres to climb one row with load k (R2a). */
export const fuelRow = (g: Game, k: number) => (0.04 + 0.21 * Math.sqrt(k)) / vref(g, k);

export function updateLoad(g: Game) {
  const p = g.pod;
  p.cargoUsed = slotsUsed(p);
  p.load = (M_EMPTY + cargoMass(p, planetEcon(g.s.planet).mass)) / M_EMPTY;
}

// ---------------------------------------------------------------- physics

function physics(g: Game, p: PodState, inp: Input, dt: number, engine: boolean): "idle" | "drive" | "thrust" | "drop" | "free" {
  const k = p.load, L = g.s.levels.engine;
  const grav = 16 * g.gravity();
  const dirIn = engine ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;
  if (dirIn) p.facing = dirIn as 1 | -1;
  p.grounded = groundedAt(g, p.x, p.y);
  const maxV = STAT_FX.drive(L) * Math.pow(k, -0.25);
  const before = p.vx;
  // Down on the ground beside an open 1-wide column eases the pod over it, so it drops in: within 0.6 tile, or a
  // tile and a half when the ground under it can't be dug (the mouth's lining, the pad, unbreakable rock)
  if (p.grounded && inp.down && !dirIn) {
    const row = Math.floor(p.y + HW + 0.02), under = I(Math.floor(p.x), Math.max(0, row));
    const hard = row >= 0 && row < H && (MATERIALS[g.live.w.mat[under]]?.kind === "unbreakable" || g.live.townGround(under));
    const reach = hard ? 1.5 : 0.6;
    // the nearest open column first
    const cols: number[] = [];
    for (let c = Math.floor(p.x - reach); c <= Math.floor(p.x + reach); c++) cols.push(c);
    cols.sort((a, b) => Math.abs(a + 0.5 - p.x) - Math.abs(b + 0.5 - p.x));
    let eased = false;
    for (const c of cols) {
      const dx = c + 0.5 - p.x;
      if (Math.abs(dx) > reach || Math.abs(dx) < 0.01 || g.live.solid(c, row)) continue;
      p.vx = 0;
      p.x += Math.sign(dx) * Math.min(Math.abs(dx), 6 * dt);
      eased = true;
      break;
    }
    // straddling two diggable columns (off by more than the 0.45 a down dig allows): ease onto the nearer one
    const cx = Math.floor(p.x) + 0.5;
    if (!eased && !hard && Math.abs(p.x - cx) > 0.45 && Math.abs(p.vx) < 2) { p.vx = 0; p.x += Math.sign(cx - p.x) * Math.min(Math.abs(cx - p.x), 6 * dt); }
  }
  if (p.grounded) {
    if (dirIn) {
      if (p.vx * dirIn < 0) p.vx = Math.abs(p.vx) <= 60 * dt ? 0 : p.vx + dirIn * 60 * dt;
      else p.vx += (dirIn * 40 * dt) / Math.sqrt(k);
    } else p.vx = Math.abs(p.vx) <= 60 * dt ? 0 : p.vx - Math.sign(p.vx) * 60 * dt;
  } else {
    if (dirIn) p.vx += (dirIn * 14 * (p.vx * dirIn < 0 ? 1.5 : 1) * dt) / Math.sqrt(k);
    else p.vx *= Math.max(0, 1 - 2 * dt);
  }
  // above the cap (a heavier load, a bounce) the speed eases down; input never pushes past it
  if (Math.abs(p.vx) > maxV) p.vx = Math.sign(p.vx) * Math.max(maxV, Math.abs(before) - 20 * dt);

  // vertical
  let state: "idle" | "drive" | "thrust" | "drop" | "free" = p.grounded && dirIn && Math.abs(p.vx) > 0.05 ? "drive" : "idle";
  const up = inp.up && engine;
  if (!inp.down) p.dropLock = false;
  if (up) {
    const burst = p.burst > 0;
    const aUp = Math.max((STAT_FX.thrust(L) / (M_EMPTY * k)) - grav, 1.5) * (burst ? 1.5 : 1);
    const cap = Math.min(30, Math.max(1.5, STAT_FX.climb(L) * Math.pow(k, -0.5)) * (burst ? 1.6 : 1));
    p.vy -= aUp * dt;
    if (-p.vy > cap) p.vy = Math.min(-cap, p.vy + 20 * dt);
    p.thrusting = true;
    p.drop = false;
    state = "thrust";
  } else {
    const v0 = p.vy;
    p.vy += grav * dt;
    const col = Math.floor(p.x), below = Math.floor(p.y + HW + 0.05);
    const openBelow = !p.grounded && !g.live.solid(col, below);
    // the auto-brake (R2c) engages on a held Down over an open column, and on any fall in the mine-mouth / Lift
    // column (a first dive never costs hull); once engaged it stays until the pod lands or thrusts
    if (openBelow && !p.dropLock && (inp.down || col === g.live.w.spawnX)) p.drop = true;
    if (p.drop && !p.grounded) {
      state = "drop";
      let sy = below;
      while (sy < H && !g.live.solid(col, sy) && !g.live.lava(col, sy)) sy++;
      const overLava = sy < H && g.live.lava(col, sy);
      const dist = sy - (p.y + HW) - (overLava ? 1 : 0);
      const stopV = overLava ? 0 : 3;
      if (dist <= Math.max(3, (v0 * v0 - stopV * stopV) / 200 + v0 * dt)) {
        p.vy = v0 > stopV ? Math.max(stopV, v0 - 100 * dt) : Math.min(stopV, p.vy);
        if (overLava && (p.vy <= 0.01 || dist <= 0.02)) { p.vy = 0; p.drop = false; p.dropLock = true; }
      } else if (inp.down) p.vy = Math.min(25, p.vy + 24 * dt); // the fast drop: +24 tiles/s^2 to 25 tiles/s
      else p.vy = Math.min(25, p.vy); // released: free fall, still braked
    } else if (p.vy > 12) p.vy = Math.max(12, p.vy - 20 * dt);
  }

  // shaft centring: falling or thrusting in a 1-wide shaft eases x to the column centre at 8 tiles/s
  if (!dirIn && !p.grounded) {
    const col = Math.floor(p.x), row = Math.floor(p.y);
    if (g.live.solid(col - 1, row) && g.live.solid(col + 1, row)) {
      const dx = col + 0.5 - p.x;
      p.x += Math.sign(dx) * Math.min(Math.abs(dx), 8 * dt);
    }
  }

  const n = Math.max(1, Math.ceil((Math.max(Math.abs(p.vx), Math.abs(p.vy)) * dt) / 0.4));
  for (let s = 0; s < n; s++) { moveX(g, p, (p.vx * dt) / n); moveY(g, p, (p.vy * dt) / n, dt / n); }
  p.grounded = groundedAt(g, p.x, p.y);
  if (p.grounded) {
    const i = I(Math.floor(p.x), Math.floor(p.y + HW + 0.02));
    if (i >= 0 && i < W * H && g.live.w.haz[i] === HAZ.FALSE_FLOOR) g.live.stepOn(g, i);
  }
  return state;
}

// ---------------------------------------------------------------- the Lift (R2b): LIFT_V tiles/s both ways, safe

const LIFT_V = 60;

function tryClamp(g: Game, p: PodState, inp: Input) {
  const end = g.liftDepth, x = g.live.w.spawnX;
  if (Math.floor(p.x) !== x || p.y - HW >= end || p.y + HW <= 0.05) p.unclamp = false;
  if (Math.floor(p.x) !== x || !end || p.unclamp || p.dig) return;
  if (p.y + HW <= 0.05 || p.y - HW >= end) return;
  if (Math.abs(p.x - (x + 0.5)) > 0.3) return;
  // at the top landing the rail takes the pod only when it drops in (Down, or falling): driving across the mouth
  // carries on over the forecourt (QA N2)
  if (p.y < 0.5 && !inp.down && p.vy <= 1) return;
  p.riding = true; p.vx = 0; p.vy = 0; p.drop = false;
  g.emit({ t: "lift", phase: "start" });
}

function ride(g: Game, p: PodState, inp: Input, dt: number) {
  const x = g.live.w.spawnX, end = g.liftDepth;
  p.grounded = true;
  p.x += Math.sign(x + 0.5 - p.x) * Math.min(Math.abs(x + 0.5 - p.x), dt / 0.1);
  // leaving sideways where the side tile is open; drilling sideways from the rail is the drill's
  const dirIn = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  const leave = () => { p.riding = false; p.unclamp = true; g.emit({ t: "lift", phase: "stop" }); };
  if (p.dig) {
    const dug = drill(g, p, inp, dt, p.fuel > 0, true);
    if (Math.floor(p.x) !== x) leave();
    if (dug || !p.riding) return;
  }
  if (dirIn) {
    p.facing = dirIn as 1 | -1;
    const row = Math.floor(p.y), rest = row + 1 - HW - 1e-6;
    if (!g.live.solid(x + dirIn, row) && Math.abs(rest - p.y) < 0.3 && Math.abs(p.vy) < 6) {
      p.y = rest; p.vy = 0; p.vx = dirIn * 2;
      leave();
      return;
    }
    if (g.live.solid(x + dirIn, row) && Math.abs(p.vy) < 1) {
      // align to the row; the rail counts as ground for a side dig
      p.vy = 0;
      p.y += Math.sign(rest - p.y) * Math.min(Math.abs(rest - p.y), 4 * dt);
      if (Math.abs(rest - p.y) < 0.02) { p.y = rest; drill(g, p, inp, dt, p.fuel > 0, true); }
      return;
    }
  }
  const want = inp.up ? -LIFT_V : inp.down ? LIFT_V : 0;
  p.vy += Math.sign(want - p.vy) * Math.min(Math.abs(want - p.vy), 2 * LIFT_V * dt);
  p.y += p.vy * dt;
  if (p.y - HW <= 0 && p.vy < 0) {
    // the top: set onto the depot forecourt
    p.riding = false; p.vy = 0; p.vx = 0;
    p.x = g.padX(); p.y = -HW - 1e-6;
    g.emit({ t: "lift", phase: "stop" });
    return;
  }
  const bottom = end - HW - 1e-6;
  if (p.y >= bottom) {
    p.y = bottom;
    if (inp.down) {
      // released below the head at a safe speed, auto-braked like the mouth
      p.riding = false; p.unclamp = true; p.vy = Math.min(p.vy, 3); p.drop = true;
      g.emit({ t: "lift", phase: "stop" });
    } else p.vy = 0;
  }
  g.liftCar(p.y);
}

// ---------------------------------------------------------------- drilling

/** The tile a direction would dig from the pod's position, or -1. */
function target(g: Game, p: PodState, dir: Dir, rail: boolean): number {
  const live = g.live;
  if (dir === "down") {
    if (!p.grounded || Math.abs(p.vx) >= 2) return -1;
    const col = Math.floor(p.x);
    if (Math.abs(p.x - (col + 0.5)) > 0.45) return -1;
    const row = Math.floor(p.y + HW + 0.02);
    if (row < 0 || row >= H || !live.solid(col, row)) return -1;
    return I(col, row);
  }
  if (!p.grounded && !rail) return -1;
  const s = dir === "right" ? 1 : -1;
  const edge = p.x + s * HW;
  // contact reach: 0.03 tile on foot; 0.1 from the Lift's rails (the pod rides centred, 0.06 from the wall)
  const reach = rail ? 0.1 : 0.03;
  const col = s > 0 ? Math.floor(edge + reach) : Math.floor(edge - reach);
  const row = Math.floor(p.y);
  if (row < 0 || col < 0 || col >= W) return -1;
  if ((s > 0 ? col - edge : edge - (col + 1)) > reach) return -1;
  if (!live.solid(col, row)) return -1;
  return I(col, row);
}

const held = (inp: Input, d: Dir) => (d === "down" ? inp.down : d === "left" ? inp.left && !inp.right : inp.right && !inp.left);

/** Returns true while the pod is digging (physics is off). */
function drill(g: Game, p: PodState, inp: Input, dt: number, engine: boolean, rail = false): boolean {
  if (!engine) {
    if (p.dig) {
      if (p.dig.held) { p.x = p.dig.ox; p.y = p.dig.oy; g.emit({ t: "dig_cancel", x: p.dig.x, y: p.dig.y }); }
      p.dig = null;
    }
    p.engage = null;
    return false;
  }
  const d = p.dig;
  // a released dig decays at 2x the rate it was gained; pressing again resumes it
  if (d && !d.held) {
    if (held(inp, d.dir) && !inp.up && target(g, p, d.dir, rail) === I(d.x, d.y)) {
      d.held = true; d.ox = p.x; d.oy = p.y;
      // resumed off the column centre: back to the bite (no slide) so the pod centres before it moves in
      if (d.dir === "down" && Math.abs(p.x - (d.x + 0.5)) > 0.02) d.progress = Math.min(d.progress, 0.15);
    }
    else {
      d.progress -= (2 * dt) / d.dur;
      if (d.progress <= 0) p.dig = null;
    }
  }
  if (d && d.held) {
    if (inp.up) { // thrust cancels
      g.emit({ t: "dig_cancel", x: d.x, y: d.y });
      d.held = false;
      p.x = d.ox; p.y = d.oy;
      return false;
    }
    if (!held(inp, d.dir)) {
      g.emit({ t: "dig_cancel", x: d.x, y: d.y });
      d.held = false;
      p.x = d.ox; p.y = d.oy;
      return false;
    }
    d.progress += dt / d.dur;
    // buffer: a direction pressed in the last 0.15 s is queued
    if ((1 - d.progress) * d.dur <= 0.15) {
      for (const q of ["down", "left", "right"] as Dir[]) if (q !== d.dir && pressed(g, q)) p.queued = q;
    }
    const off = smooth(0.15, 1, Math.min(1, d.progress));
    if (d.dir === "down") {
      const cx = d.x + 0.5;
      p.x += Math.sign(cx - p.x) * Math.min(Math.abs(cx - p.x), (0.45 / 0.08) * dt);
      p.y = d.oy + off;
    } else p.x = d.ox + (d.dir === "right" ? off : -off);
    p.vx = 0; p.vy = 0;
    if (d.progress >= 1) {
      breakDig(g, p, d);
      p.dig = null;
      // chain: the same direction held starts the next tile at once; else a queued one
      p.grounded = groundedAt(g, p.x, p.y);
      const next = held(inp, d.dir) ? d.dir : p.queued && held(inp, p.queued) ? p.queued : null;
      p.queued = null;
      if (next) {
        const t = target(g, p, next, rail);
        if (t >= 0) { p.chain++; attempt(g, p, next, t, true); return !!p.dig; }
      }
      p.chain = 0;
    }
    return true;
  }
  if (inp.up) { p.engage = null; return false; }
  const dir: Dir | null = inp.down && p.grounded && !rail ? "down" : held(inp, "left") ? "left" : held(inp, "right") ? "right" : null;
  if (!dir) { p.engage = null; return false; }
  if (dir !== "down") p.grounded = groundedAt(g, p.x, p.y) || rail;
  const t = target(g, p, dir, rail);
  if (t < 0) { p.engage = null; return false; }
  if (!p.engage || p.engage.i !== t || p.engage.dir !== dir) p.engage = { dir, i: t, t: 0 };
  p.engage.t += dt;
  if (p.engage.t < 0.1) return false;
  attempt(g, p, dir, t, false);
  return !!p.dig;
}

const pressed = (g: Game, d: Dir) => (d === "down" ? g.edge.down : d === "left" ? g.edge.left : g.edge.right);

/** Try to start a dig on tile t: too hard, unbreakable, or a dig (and a gas fuse). */
function attempt(g: Game, p: PodState, dir: Dir, t: number, chained: boolean) {
  const live = g.live, w = live.w, m = w.mat[t], mat = MATERIALS[m];
  const x = t % W, y = (t / W) | 0;
  if (mat.kind === "unbreakable" || (w.flag[t] & FLAG.LIFT) || live.townGround(t)) {
    // town ground is silent: Down there drives to the mine mouth instead
    if (!live.townGround(t) && !p.told.some((k) => k.i === t)) { p.told.push({ i: t, t: g.time }); g.emit({ t: "unbreakable", x, y }); }
    p.engage = null;
    return;
  }
  const h = live.hardness(t, g.hasKey());
  const ratio = h / g.power();
  let eff = ratio, over = false;
  const shell = m === MAT.VAULT_SEAL || m === MAT.HUSK || m === MAT.HEARTROCK;
  if (p.overcharge > 0 && ratio <= 5 && !shell) { eff = Math.max(0.25, ratio / 4); over = true; }
  if (eff > 2.5) {
    if (!p.told.some((k) => k.i === t)) { p.told.push({ i: t, t: g.time }); g.emit({ t: "too_hard", x, y, need: needLevel(h) }); }
    p.engage = null;
    return;
  }
  let dur = 0.25 + 0.4 * eff;
  if (chained && g.has("E1")) dur *= 1 - Math.min(0.32, 0.08 * p.chain);
  p.dig = { x, y, dir, progress: 0, mat: m, dur, ratio: eff, ox: p.x, oy: p.y, held: true, over };
  p.engage = null;
  g.emit({ t: "dig_start", x, y, dir, mat: m, find: w.find[t] });
  if (w.haz[t] === HAZ.GAS) live.light(g, t, 0.8 * Math.pow(p.load, 0.25));
}

function breakDig(g: Game, p: PodState, d: DigState) {
  const i = I(d.x, d.y);
  const was = g.live.clear(g, i);
  g.emit({ t: "break", x: d.x, y: d.y, mat: was.mat, find: was.find, by: "drill" });
  if (d.over) {
    p.overcharge = Math.max(0, p.overcharge - 1);
    if (d.ratio * 4 > 2.5) g.s.stats.overcharged++;
  }
  g.collect(i, was.mat, was.find);
  if (d.dir === "down") { p.x = d.x + 0.5; p.y = d.y + 1 - HW - 1e-6; }
  else { p.x = d.x + 0.5; }
}

// ---------------------------------------------------------------- heat (D2, R6) and contact

function heat(g: Game, p: PodState, dt: number) {
  const row = Math.floor(p.y);
  const pulse = p.pulseHeat > 0 && row >= 680 ? 80 : 0;
  p.temp = tempAt(Math.max(0, row), g.s.planet) + 60 * g.live.lavaNear(p.x, p.y) + pulse;
  const over = p.temp - STAT_FX.radiator(g.s.levels.radiator);
  const sink = g.moduleOn("heatsink");
  if (over > 0 && !p.riding && p.coolant <= 0) p.heat += ((over / 20) * (sink ? 0.7 : 1) * dt) / 100;
  else if (over <= 0 || p.riding) p.heat -= ((sink ? 16 : 8) * dt) / 100;
  p.heat = Math.max(0, Math.min(1, p.heat));
  if (p.heat >= 1) g.hurt(0.03 * p.hullMax * dt, "heat", false);
}

function contact(g: Game, p: PodState, dt: number) {
  const live = g.live;
  let lava = false;
  for (let ty = Math.floor(p.y - HW); ty <= Math.floor(p.y + HW - 1e-6); ty++)
    for (let tx = Math.floor(p.x - HW); tx <= Math.floor(p.x + HW - 1e-6); tx++) if (live.lava(tx, ty)) lava = true;
  if (lava && !p.riding) {
    if (p.lavaT === 0) g.emit({ t: "lava_touch" });
    p.lavaT += dt;
    if (p.coolant <= 0) p.heat = Math.min(1, p.heat + 0.4 * dt);
    // Flame Skimmer (Cinder): the first 2 s of contact cost heat, not hull
    if (!(g.has("P1") && p.lavaT <= 2)) g.hurt(9 * g.hazardScale(Math.floor(p.y)) * dt, "lava", false);
    else p.heat = Math.min(1, p.heat + 0.4 * dt);
  } else p.lavaT = 0;
  // spore clouds blind: the lamp drops to half for 4 s
  for (const e of live.ents) if (e.kind === "cloud" && Math.hypot(e.x - p.x, e.y - p.y) < (e.r ?? 2)) p.blind = 4;
  // the core pulse: every 10 s a ring travels up from the chamber at 40 tiles/s (D7: heat, no push)
  g.pulseCheck(dt);
}

// ---------------------------------------------------------------- pickups: magnet, crate; smelter; drone

export function freeSlots(g: Game) { return g.cargoMax() - slotsUsed(g.pod); }

function pickups(g: Game, p: PodState, dt: number) {
  const live = g.live;
  p.magnetT = Math.max(0, p.magnetT - dt);
  const r = g.moduleOn("magnet") ? 3 : 1.5;
  for (const e of [...live.ents]) {
    if (e.kind === "crate") {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 0.8 || (g.moduleOn("magnet") && d <= 3 && p.magnetT <= 0 && clearLine(g, p.x, p.y, e.x, e.y))) g.recoverCrate(e, d < 0.8);
      continue;
    }
    if (e.kind !== "nugget" || p.magnetT > 0) continue;
    const f = FINDS[e.find ?? 0];
    if (!f) continue;
    const isArt = f.kind === "artifact";
    if (!isArt && freeSlots(g) <= 0) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) > r || !clearLine(g, p.x, p.y, e.x, e.y)) continue;
    e.n = (e.n ?? 1) - 1;
    if (e.n <= 0) live.remove(e);
    g.gain(e.find!, 1, Math.floor(e.x), Math.floor(e.y));
    p.magnetT = 0.05;
  }
}

function clearLine(g: Game, x0: number, y0: number, x1: number, y1: number) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3);
  for (let k = 1; k < n; k++) {
    const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n;
    if (g.live.solid(Math.floor(x), Math.floor(y))) return false;
  }
  return true;
}

function smelt(g: Game, p: PodState, dt: number) {
  if (!g.moduleOn("smelter")) { p.smelt = {}; return; }
  for (const k in p.cargo) {
    const id = +k;
    // never Heartstone: the lance needs its pieces
    if (FINDS[id].kind !== "ore" || FINDS[id].key === "heartstone" || p.cargo[id] < 5) { delete p.smelt[id]; continue; }
    p.smelt[id] = (p.smelt[id] ?? 0) + dt;
    if (p.smelt[id] >= 2) {
      addCargo(p.cargo, id, -5);
      addCargo(p.ingots, id, 1);
      delete p.smelt[id];
      g.s.stats.ingots++;
    }
  }
}

function drone(g: Game, p: PodState, dt: number) {
  const live = g.live;
  let d = live.ents.find((e) => e.kind === "drone");
  if (!g.moduleOn("drone") || g.inTown()) { if (d) live.remove(d); return; }
  if (!d) d = live.add("drone", p.x, p.y - 1);
  const tx = p.x - p.facing * 1.2, ty = p.y - 1;
  d.x += (tx - d.x) * Math.min(1, 4 * dt);
  d.y += (ty - d.y) * Math.min(1, 4 * dt);
  p.droneT += dt;
  if (p.droneT < 6) return;
  // every 6 s: the nearest lit ore tile within 4 tiles the drill could dig, into the bay
  let best = -1, bd = 1e9;
  const P = g.power(), lamp = Math.max(4, p.lamp);
  for (let y = Math.floor(p.y) - 4; y <= Math.floor(p.y) + 4; y++) for (let x = Math.floor(p.x) - 4; x <= Math.floor(p.x) + 4; x++) {
    if (x < 1 || x > W - 2 || y < 0 || y >= H) continue;
    const i = I(x, y), f = live.w.find[i];
    if (!f || FINDS[f].kind !== "ore" || (live.w.flag[i] & FLAG.LIFT)) continue;
    const dd = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y);
    if (dd > 4 || dd > lamp || live.hardness(i, false) / P > 2.5) continue;
    if (dd < bd) { bd = dd; best = i; }
  }
  if (best < 0) return;
  p.droneT = 0;
  const was = live.clear(g, best);
  g.emit({ t: "break", x: best % W, y: (best / W) | 0, mat: was.mat, find: was.find, by: "drone" });
  g.collect(best, was.mat, was.find);
}

// ---------------------------------------------------------------- items (core-loop "Items")

export function useItem(g: Game, key: number) {
  const p = g.pod;
  const no = (item: string, why: string) => { g.emit({ t: "item", item, ok: false, why }); };
  if (key === 7) {
    if (!g.moduleOn("overcharge")) return no("overcharge", "No Overcharge module.");
    if (p.overchargeCd > 0) return no("overcharge", "Cooling down.");
    p.overcharge = 8; p.overchargeCd = 45;
    g.emit({ t: "item", item: "overcharge", ok: true });
    return;
  }
  const id = (Object.keys(ITEMS) as ItemId[]).find((k) => ITEMS[k].key === key);
  if (!id) return;
  if (p.itemCd > 0) return no(id, "Cooling down.");
  if (p.items[id] <= 0) return no(id, "None left.");
  switch (id) {
    case "fuel":
      if (p.fuel >= p.fuelMax - 1e-6) return no(id, "The tank is full.");
      p.fuel = Math.min(p.fuelMax, p.fuel + 0.5 * p.fuelMax);
      p.stranded = false; p.strandT = 0;
      break;
    case "repair":
      if (p.hull >= p.hullMax - 1e-6) return no(id, "The hull is fine.");
      p.hull = Math.min(p.hullMax, p.hull + 0.4 * p.hullMax);
      break;
    case "dynamite":
    case "charge":
      if (g.inTown()) return no(id, "Not in town.");
      g.live.add("charge", p.x, p.y, { t: id === "charge" ? 3 : 2, item: id, r: id === "charge" ? 2.5 : 1 });
      break;
    case "teleport":
      if (g.inTown()) return no(id, "Already home.");
      if (p.chanT > 0) return no(id, "Already jumping.");
      p.chanT = 1e-6;
      g.emit({ t: "teleport", phase: "start" });
      break;
    case "coolant":
      p.heat = 0; p.coolant = 20;
      break;
  }
  if (id !== "teleport") p.items[id]--;
  p.itemCd = 0.5;
  g.s.diveItems++;
  g.emit({ t: "item", item: id, ok: true });
}

/** X: drop the lowest-value piece (ties: heaviest); ingots last. It crumbles and is gone. */
export function dump(g: Game) {
  const p = g.pod;
  let best = -1, bv = Infinity, bm = -1;
  for (const k in p.cargo) {
    const id = +k, v = g.pieceValue(id), m = FINDS[id].mass;
    if (v < bv || (v === bv && m > bm)) { best = id; bv = v; bm = m; }
  }
  if (best >= 0) addCargo(p.cargo, best, -1);
  else {
    const ids = Object.keys(p.ingots).map(Number);
    if (!ids.length) { g.emit({ t: "item", item: "dump", ok: false, why: "The bay is empty." }); return; }
    ids.sort((a, b) => g.pieceValue(a) - g.pieceValue(b));
    addCargo(p.ingots, ids[0], -1);
  }
  p.fullTold = false;
  updateLoad(g);
  g.emit({ t: "item", item: "dump", ok: true });
}

/** The cargo panel: drop one (or all) of a find; pieces first, then its ingots. */
export function dumpFind(g: Game, find: number, all: boolean): boolean {
  const p = g.pod;
  const n = (p.cargo[find] ?? 0) + (p.ingots[find] ?? 0);
  if (!n) return false;
  if (all) { delete p.cargo[find]; delete p.ingots[find]; delete p.smelt[find]; }
  else if (p.cargo[find]) addCargo(p.cargo, find, -1);
  else addCargo(p.ingots, find, -1);
  p.fullTold = false;
  updateLoad(g);
  g.emit({ t: "item", item: "dump", ok: true });
  return true;
}

/** Teleporter losses (R1): ceil(30%) of the pieces, cheapest per piece first, an ingot ranked by its own value. */
export function teleportLoss(g: Game) {
  const p = g.pod;
  const units: { id: number; ingot: boolean; v: number }[] = [];
  for (const k in p.cargo) for (let n = 0; n < p.cargo[k]; n++) units.push({ id: +k, ingot: false, v: g.pieceValue(+k) });
  for (const k in p.ingots) for (let n = 0; n < p.ingots[k]; n++) units.push({ id: +k, ingot: true, v: g.pieceValue(+k) * 5.5 });
  units.sort((a, b) => a.v - b.v || a.id - b.id);
  const lose = Math.ceil(units.length * GUARDS.teleportLoss);
  for (let n = 0; n < lose; n++) addCargo(units[n].ingot ? p.ingots : p.cargo, units[n].id, -1);
  return lose;
}

export { piecesPerTile, type Ent };
