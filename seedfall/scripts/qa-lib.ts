// QA kit: invariants checked every step, and a human-like autopilot that plays the real rules (dive, mine, come
// home by the open path, dock, shop through the real actions). Used by scripts/qa-soak.ts, scripts/qa-chaos.ts and
// test/qa-*.test.ts. Owned by QA; reads the game only through its public API.
import { W, H, FLAG, STATS, type GameEvent, type Input } from "../game/types.ts";
import { Game } from "../game/game.ts";
import { MATERIALS, FINDS } from "../game/content/world.ts";
import { HW } from "../game/pod.ts";
import { ITEM_KEYS, MODULES, RESEARCH, PERKS, type ItemId, type ModuleId } from "../game/content/economy.ts";

export const DT = 1 / 60;
export const I = (x: number, y: number) => y * W + x;
export const inp = (o: Partial<Input> = {}): Input => ({ left: false, right: false, up: false, down: false, ...o });

/** A seeded PRNG for the QA scripts (never the game's own streams). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// ---------------------------------------------------------------- invariants

export interface Issue { kind: string; detail: string; t: number }

const EVENT_KINDS = new Set([
  "dig_start", "dig_cancel", "break", "too_hard", "unbreakable", "pickup", "cargo_full", "nugget", "land", "bump", "damage", "wreck",
  "rescue", "gas_fuse", "explode", "wobble", "fall_land", "lava_touch", "spore", "arc", "pulse", "scan", "item", "teleport", "biome",
  "record", "surface", "dive", "warn", "lift", "spore_charge", "cache", "order", "dock", "buy", "find", "achievement", "toast", "storm",
  "geyser", "launch",
]);

/** Every number in an object tree is finite (Infinity allowed only at the listed keys). */
function finite(o: unknown, path: string, out: string[], allowInf: Set<string>, depth = 0) {
  if (depth > 6 || out.length > 5) return;
  if (typeof o === "number") { if (Number.isNaN(o) || (!Number.isFinite(o) && !allowInf.has(path.split(".").pop()!))) out.push(`${path}=${o}`); return; }
  if (!o || typeof o !== "object") return;
  for (const k in o as Record<string, unknown>) finite((o as Record<string, unknown>)[k], `${path}.${k}`, out, allowInf, depth + 1);
}
const INF_OK = new Set(["fuelHome"]);

/** The solid tiles the pod overlaps (minus the tile it is digging into). */
export function podInRock(g: Game): number[] {
  const p = g.pod;
  if (p.dead) return [];
  const e = 1e-4, out: number[] = [];
  for (let ty = Math.floor(p.y - HW + e); ty <= Math.floor(p.y + HW - e); ty++)
    for (let tx = Math.floor(p.x - HW + e); tx <= Math.floor(p.x + HW - e); tx++) {
      if (!g.live.solid(tx, ty) || ty < 0) continue;
      if (p.dig && p.dig.x === tx && p.dig.y === ty) continue;
      out.push(I(tx, ty));
    }
  return out;
}

/** How far the pod's box reaches into the given tiles (the smaller axis overlap, max over tiles). */
export function overlapDepth(g: Game, tiles: number[]) {
  const p = g.pod;
  let d = 0;
  for (const i of tiles) {
    const tx = i % W, ty = (i / W) | 0;
    const ox = Math.min(p.x + HW, tx + 1) - Math.max(p.x - HW, tx), oy = Math.min(p.y + HW, ty + 1) - Math.max(p.y - HW, ty);
    d = Math.max(d, Math.min(ox, oy));
  }
  return d;
}

export class Checker {
  issues: Issue[] = [];
  counts: Record<string, number> = {};
  private dryT = 0;
  private dryTold = false;
  private rockEp: { t: number; steps: number; depth: number; at: string } | null = null;
  constructor(public maxPerKind = 8) {}
  /** The last steps, attached to the first issue of each kind (QA_TRACE=1). */
  ring: string[] = [];
  add(kind: string, detail: string, t: number) {
    this.counts[kind] = (this.counts[kind] ?? 0) + 1;
    if (this.counts[kind] <= this.maxPerKind) this.issues.push({ kind, detail: this.counts[kind] === 1 && process.env.QA_TRACE ? `${detail}\n      ${this.ring.join("\n      ")}` : detail, t });
  }
  note(g: Game, i: Input, ev: GameEvent[]) {
    const p = g.pod;
    this.ring.push(`${g.s.time.toFixed(2)} in ${["left", "right", "up", "down"].filter((d) => i[d as "up"]).join("+") || "-"}${i.item ? " item" + i.item : ""} pos ${p.x.toFixed(3)},${p.y.toFixed(3)} v ${p.vx.toFixed(2)},${p.vy.toFixed(2)} g ${p.grounded} ride ${p.riding} dig ${p.dig ? `${p.dig.dir}@${p.dig.x},${p.dig.y} ${p.dig.progress.toFixed(2)} ${p.dig.held}` : "-"} ev ${ev.map((e) => e.t === "break" || e.t === "fall_land" ? `${e.t}(${e.x},${e.y})` : e.t).join(",")}`);
    if (this.ring.length > 24) this.ring.shift();
  }
  /** Check the state after a step and the events it returned. */
  step(g: Game, ev: GameEvent[]) {
    const s = g.s, p = g.pod, t = s.time;
    const bad: string[] = [];
    finite(p, "pod", bad, INF_OK);
    finite({ cash: s.cash, data: s.data, shards: s.shards, silo: s.silo, earned: s.earned, time: s.time, memory: s.memory }, "s", bad, INF_OK);
    if (bad.length) this.add("nan", bad.join(" "), t);
    if (s.cash < -1e-9) this.add("cash<0", `${s.cash}`, t);
    if (s.data < -1e-9) this.add("data<0", `${s.data}`, t);
    if (s.shards < 0 || s.shards !== Math.floor(s.shards)) this.add("shards", `${s.shards}`, t);
    if (p.fuel < -1e-9 || p.fuel > p.fuelMax + 1e-6) this.add("fuel-range", `${p.fuel}/${p.fuelMax}`, t);
    if (p.hull < -1e-9 || p.hull > p.hullMax + 1e-6) this.add("hull-range", `${p.hull}/${p.hullMax}`, t);
    if (p.heat < 0 || p.heat > 1) this.add("heat-range", `${p.heat}`, t);
    if (p.cargoUsed > p.cargoMax) this.add("cargo>max", `${p.cargoUsed}/${p.cargoMax} dense=${g.moduleOn("dense")}`, t);
    for (const k in p.cargo) if (!(p.cargo[k] > 0) || p.cargo[k] !== Math.floor(p.cargo[k])) this.add("cargo-count", `${k}:${p.cargo[k]}`, t);
    for (const id of ITEM_KEYS) if (p.items[id] < 0 || p.items[id] > g.carry(id)) this.add("items", `${id}=${p.items[id]} carry ${g.carry(id)}`, t);
    if (p.x < HW - 1e-3 || p.x > W - HW + 1e-3 || p.y > H) this.add("pod-oob", `${p.x.toFixed(2)},${p.y.toFixed(2)}`, t);
    const rock = podInRock(g);
    if (rock.length && !p.riding && !s.launch) {
      const depth = overlapDepth(g, rock);
      if (!this.rockEp) this.rockEp = { t, steps: 0, depth: 0, at: `pod ${p.x.toFixed(3)},${p.y.toFixed(3)} v ${p.vx.toFixed(2)},${p.vy.toFixed(2)} dig ${p.dig ? p.dig.dir + "@" + p.dig.x + "," + p.dig.y : "-"} in ${rock.map((i) => `${i % W},${(i / W) | 0}:${MATERIALS[g.world.mat[i]]?.key}`).join(" ")}` };
      this.rockEp.steps++; this.rockEp.depth = Math.max(this.rockEp.depth, depth);
    } else if (this.rockEp) {
      const e = this.rockEp; this.rockEp = null;
      if (e.depth > 0.02) this.add(e.steps > 30 ? "pod-stuck-in-rock" : "pod-clips-rock", `${e.steps} steps, ${e.depth.toFixed(3)} tile deep: ${e.at}`, e.t);
    }
    // soft locks: in town with an empty tank and nothing that will refill it
    if (g.inTown() && p.fuel <= 0) { this.dryT += DT; if (this.dryT > 30 && !this.dryTold) { this.dryTold = true; this.add("softlock-town-dry", `in town with 0 fuel for 30 s: cash ${s.cash.toFixed(1)} cargo ${p.cargoUsed} docked ${s.docked} brokeAt ${s.brokeAt.toFixed(0)} silo ${s.silo.toFixed(1)}`, t); } }
    else { this.dryT = 0; this.dryTold = false; }
    if (g.entities.length > 3000) this.add("ents", `${g.entities.length}`, t);
    for (const e of g.entities) if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { this.add("ent-nan", JSON.stringify(e), t); break; }
    for (const e of ev) {
      if (!EVENT_KINDS.has(e.t)) this.add("event-kind", JSON.stringify(e), t);
      const b: string[] = [];
      finite(e, e.t, b, new Set(["need"]));
      if (b.length) this.add("event-nan", `${b.join(" ")} ${JSON.stringify(e).slice(0, 200)}`, t);
      if (e.t === "toast" && (!e.text || /undefined|NaN|null|\[object/.test(e.text))) this.add("toast-text", e.text, t);
      if (e.t === "dock" && (e.sale.total !== e.sale.total)) this.add("dock-nan", JSON.stringify(e.sale), t);
      if (e.t === "pickup" && (e.count <= 0 || !(e.value >= 0))) this.add("pickup", JSON.stringify(e), t);
      if (e.t === "damage" && !(e.amount > 0)) this.add("damage", JSON.stringify(e), t);
      if (e.t === "too_hard" && !(e.need >= 0 && e.need < 99)) this.add("too_hard-need", JSON.stringify(e), t);
    }
  }
  report() {
    const out: string[] = [];
    for (const k in this.counts) out.push(`${k}: ${this.counts[k]}`);
    return out.join(", ") || "clean";
  }
}

/** Save -> JSON -> load gives the same hash, and both copies step the same for n steps under the same inputs. */
export function roundTrip(g: Game, inputs: (k: number) => Input, n = 120): string | null {
  const json = JSON.stringify(g.save());
  const b = Game.load(JSON.parse(json), undefined, g.opts);
  if (b.stateHash() !== g.stateHash()) return `hash after load differs (${diffState(g, b)})`;
  const a = Game.load(JSON.parse(json), undefined, g.opts); // a twin of the live game, so the live one is untouched
  for (let k = 0; k < n; k++) { const i = inputs(k); a.step(DT, i); b.step(DT, i); }
  // compare with the original as well: the live game must equal its own loaded twin
  if (a.stateHash() !== b.stateHash()) return `twins diverged after ${n} steps (${diffState(a, b)})`;
  return null;
}
/** Is the live game (with its unsaved private state) the same as its save? Steps both n times. */
export function liveVsLoaded(g: Game, inputs: (k: number) => Input, n = 120): string | null {
  const json = JSON.stringify(g.save());
  const b = Game.load(JSON.parse(json), undefined, g.opts);
  for (let k = 0; k < n; k++) { const i = inputs(k); g.step(DT, i); b.step(DT, i); }
  if (g.stateHash() !== b.stateHash()) return `live and loaded diverged after ${n} steps (${diffState(g, b)})`;
  return null;
}
export function diffState(a: Game, b: Game): string {
  const out: string[] = [];
  const walk = (x: unknown, y: unknown, path: string) => {
    if (out.length > 6) return;
    if (typeof x !== typeof y) { out.push(`${path}: ${String(x)} vs ${String(y)}`); return; }
    if (x && typeof x === "object") { const keys = new Set([...Object.keys(x), ...Object.keys(y as object)]); for (const k of keys) walk((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k], `${path}.${k}`); return; }
    if (x !== y && !(Number.isNaN(x) && Number.isNaN(y))) out.push(`${path}: ${String(x)} vs ${String(y)}`);
  };
  walk(a.s, b.s, "s");
  const wa = a.world, wb = b.world;
  for (const l of ["mat", "find", "haz", "flag", "fluid", "back"] as const) for (let i = 0; i < W * H; i++) if (wa[l][i] !== wb[l][i]) { out.push(`${l}[${i % W},${(i / W) | 0}] ${wa[l][i]} vs ${wb[l][i]}`); break; }
  if (JSON.stringify(a.entities) !== JSON.stringify(b.entities)) out.push(`ents ${a.entities.length} vs ${b.entities.length}`);
  return out.join("; ") || "no visible diff";
}

// ---------------------------------------------------------------- the autopilot

type Mode = "town" | "descend" | "mine" | "home" | "stuck";

/** A player who plays like a person: dives down a shaft, mines side tunnels and ore it sees, turns back on the fuel
 * tick, a full bay, low hull or heat, docks and spends through the real shop. `noise` adds human slop. */
export class Pilot {
  mode: Mode = "town";
  r: () => number;
  col = 0;
  goalRow = 0;
  side = 0;
  sideLeft = 0;
  lastPos = { x: 0, y: 0, t: 0 };
  stuckFor = 0;
  path: number[] = [];
  pathT = -1;
  log: string[] = [];
  homes = { dock: 0, tow: 0, wreck: 0, teleport: 0, stuck: 0 };
  scanT = 0;
  greedy = true;
  tick = 0;
  held: Input | null = null;
  constructor(seed: number, public noise = 0.02, public spend = true) { this.r = rng(seed); }

  /** Shopping between dives: B until it fails, research, modules, items, rigs, lab, lance. */
  shop(g: Game) {
    if (!this.spend || !g.inTown()) return;
    for (let k = 0; k < 20 && g.buySuggested().ok; k++);
    // the comfort stats a person buys too
    for (const st of ["cargo", "tank", "engine", "lamp", "scanner"] as const) if (g.s.cash > 3 * g.upgradePrice(st)) g.buyUpgrade(st);
    for (const r of RESEARCH) if (!g.has(r.id) && g.s.data >= r.cost) g.buyResearch(r.id);
    for (const id of Object.keys(MODULES) as ModuleId[]) if (!g.moduleUnlocked(id)) g.buyModule(id);
    const want: ModuleId[] = ["magnet", "heatsink", "dense", "drone", "smelter", "afterburner", "recycler", "tracer"];
    for (const id of want) if (g.moduleUnlocked(id) && !g.modules.includes(id)) {
      if (g.equipModule(id).ok) continue;
      // swap out the last one now and then, as a person trying modules would
      if (this.r() < 0.3 && g.modules.length) { const old = g.modules[g.modules.length - 1] as ModuleId; if (g.unequipModule(old).ok) g.equipModule(id); }
    }
    for (const id of ITEM_KEYS) if (g.itemOpen(id)) g.setLoadout(id, id === "fuel" || id === "repair" ? 1 : this.r() < 0.5 ? 1 : 0);
    for (let b = 0; b <= Math.min(6, g.s.reached); b++) if (g.rigsOpen() && g.s.cash > 4 * g.rigPrice(b)) g.buildRig(b);
    if (g.s.cash > 3 * g.labPrice()) g.buyLab();
    for (const pk of PERKS) g.buyPerk(pk.id);
    if (g.s.plans) for (const id of ["frame", "coil", "head"]) g.buyLancePart(id);
    if (g.s.offline) g.collectOffline();
  }

  /** Turn back? Fuel against the tick, a full bay, hull, heat. */
  private turnBack(g: Game) {
    const p = g.pod;
    if (p.fuel < p.fuelHome * 1.35 + 0.3) return "fuel";
    if (p.cargoUsed >= p.cargoMax) return "full";
    if (p.hull < 0.3 * p.hullMax) return "hull";
    if (p.heat > 0.6) return "heat";
    if (g.s.time - g.s.diveStart > 420) return "time";
    return null;
  }

  /** The open path home (BFS over open tiles to row < 0 or a Lift tile), as tile indices from the pod. */
  homePath(g: Game): number[] {
    const p = g.pod, w = g.world;
    const sx = Math.max(0, Math.min(W - 1, Math.floor(p.x))), sy = Math.max(0, Math.min(H - 1, Math.floor(p.y)));
    if (p.y < 0) return [];
    const prev = new Int32Array(W * H).fill(-2), q = [I(sx, sy)];
    prev[q[0]] = -1;
    let goal = -1;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % W, y = (i / W) | 0;
      if (y === 0 || (w.flag[i] & FLAG.LIFT)) { goal = i; break; }
      for (const j of [i - W, i - 1, i + 1, i + W]) {
        if (j < 0 || j >= W * H || prev[j] !== -2 || Math.abs((j % W) - x) > 1) continue;
        if (w.mat[j] !== 0 && MATERIALS[w.mat[j]].kind !== "liquid") continue;
        if (w.mat[j] !== 0) continue; // never path through lava
        prev[j] = i; q.push(j);
      }
    }
    if (goal < 0) return [];
    const out: number[] = [];
    for (let i = goal; i !== -1; i = prev[i]) out.push(i);
    return out.reverse();
  }

  /** Steer toward an open tile: centre on it sideways, thrust when it is above, hover when level. */
  steer(g: Game, ti: number): Input {
    const p = g.pod, tx = (ti % W) + 0.5, ty = ((ti / W) | 0) + 1 - HW - 0.02;
    const row = Math.floor(p.y), trow = (ti / W) | 0;
    // climbing: centre on the column first; sideways: head for the target tile
    const dx = (trow < row ? Math.floor(p.x) + 0.5 : tx) - p.x;
    const o = inp();
    if (Math.abs(dx) > (trow < row ? 0.2 : 0.12)) { if (dx > 0) o.right = true; else o.left = true; }
    if (trow < row) o.up = true;
    else if (trow === row) o.up = !p.grounded && p.vy > 0.5;
    else o.up = false;
    // a side move across an open column: hover at the target row
    if (Math.abs(dx) > 0.12 && trow <= row && p.y > ty + 0.05) o.up = true;
    return o;
  }

  input(g: Game, ev: GameEvent[]): Input {
    const p = g.pod, s = g.s;
    for (const e of ev) {
      if (e.t === "dock") this.homes.dock++;
      if (e.t === "rescue") this.homes[e.kind]++;
      if (e.t === "teleport" && e.phase === "done") this.homes.teleport++;
    }
    if (p.dead) return inp();
    if (s.launch) return inp();
    // a person holds a key for at least ~0.1 s: decide every 6 steps, hold the movement between
    this.tick++;
    let o: Input;
    if (this.tick % 6 && this.held) o = { ...this.held };
    else { o = this.drive(g); this.held = { left: o.left, right: o.right, up: o.up, down: o.down }; }
    // items and scanner like a person
    if (!o.item && p.y > 0) {
      if (p.hull < 0.25 * p.hullMax && p.items.repair) o.item = 2;
      else if (p.fuel < p.fuelHome * 1.05 && p.items.fuel) o.item = 1;
      else if (p.heat > 0.7 && p.items.coolant) o.item = 6;
      else if (g.modules.includes("overcharge") && this.r() < 0.002) o.item = 7;
    }
    if (p.y > 0 && g.levels.scanner > 0 && s.time - this.scanT > 9) { o.scan = true; this.scanT = s.time; }
    if (p.stranded) o.confirm = true;
    // slop: a wrong key now and then, a dump, a tap of another direction
    if (this.r() < this.noise) {
      const k = this.r();
      if (k < 0.25) o = { ...o, left: !o.left };
      else if (k < 0.5) o = { ...o, right: !o.right };
      else if (k < 0.65) o = { ...o, up: !o.up };
      else if (k < 0.8) o = { ...o, down: !o.down };
      else if (k < 0.83) o.dump = true;
      else if (k < 0.86) o.item = 1 + Math.floor(this.r() * 7);
    }
    return o;
  }

  private drive(g: Game): Input {
    const p = g.pod, s = g.s, w = g.world;
    // progress watch
    const moved = Math.hypot(p.x - this.lastPos.x, p.y - this.lastPos.y);
    if (moved > 0.3 || p.dig) { this.lastPos = { x: p.x, y: p.y, t: s.time }; this.stuckFor = 0; }
    else this.stuckFor = s.time - this.lastPos.t;

    // a dig under way: keep the key down until the tile breaks (a person commits to a tile)
    if (p.dig && p.dig.held && this.mode !== "home") return inp({ [p.dig.dir]: true });
    if (g.inTown()) {
      if (this.mode !== "town") { this.mode = "town"; this.shop(g); }
      if (!s.docked && g.building() !== "depot") {
        // get to the depot first (a tow or the Lift lands there; a drift may not)
        const dx = g.padX() + 0.5 - p.x;
        return inp({ left: dx < -0.2, right: dx > 0.2, up: !p.grounded && p.vy > 1 });
      }
      this.shop(g);
      // to the mine mouth, then down
      const mx = w.spawnX + 0.5, dx = mx - p.x;
      return inp({ left: dx < -0.1, right: dx > 0.1, down: Math.abs(dx) < 0.3 });
    }
    if (this.mode === "town") {
      this.mode = "descend";
      this.col = w.spawnX;
      this.goalRow = Math.max(8, s.deepest + 4 + Math.floor(this.r() * 20));
    }
    if (p.riding) {
      // ride the Lift down to the head when diving, up when going home
      if (this.mode === "home") return inp({ up: true });
      return inp({ down: true });
    }
    const why = this.mode !== "home" ? this.turnBack(g) : null;
    if (why) { this.mode = "home"; this.log.push(`${s.time.toFixed(0)}s home: ${why} row ${Math.floor(p.y)}`); }
    if (this.mode === "home") return this.goHome(g);

    const row = Math.floor(p.y), x = Math.floor(p.x);
    // ore beside or below: take it
    if (p.grounded && this.greedy) {
      for (const [dx, dir] of [[-1, "left"], [1, "right"]] as const) {
        const i = I(x + dx, row);
        if (x + dx > 0 && x + dx < W - 1 && w.find[i] && FINDS[w.find[i]].kind !== "artifact" && w.mat[i]) return inp({ [dir]: true });
      }
      const b = I(x, row + 1);
      if (row + 1 < H && w.find[b] && w.mat[b]) return inp({ down: true });
    }
    if (this.mode === "descend") {
      if (row >= this.goalRow) { this.mode = "mine"; this.side = this.r() < 0.5 ? -1 : 1; this.sideLeft = 3 + Math.floor(this.r() * 10); }
      else {
        const dx = this.col + 0.5 - p.x;
        if (Math.abs(dx) > 0.2 && p.grounded) return inp({ left: dx < 0, right: dx > 0 });
        if (this.stuckFor > 2) { this.col = Math.max(1, Math.min(W - 2, this.col + (this.r() < 0.5 ? -1 : 1))); this.lastPos.t = s.time; }
        return inp({ down: true });
      }
    }
    // mine: a side tunnel, then a few rows down, then another
    if (this.sideLeft > 0 && !this.stuckFor) {
      const nx = x + this.side;
      if (nx <= 0 || nx >= W - 1) { this.side = -this.side; this.sideLeft = 0; }
      else {
        if (Math.abs(p.x - (x + 0.5)) < 0.1 && x !== Math.floor(this.lastSideX)) { this.lastSideX = x; this.sideLeft--; }
        return inp({ [this.side < 0 ? "left" : "right"]: true });
      }
    }
    if (this.stuckFor > 1.5 || this.sideLeft <= 0) {
      this.side = this.r() < 0.5 ? -1 : 1; this.sideLeft = 2 + Math.floor(this.r() * 8);
      this.lastPos.t = s.time;
      if (this.stuckFor > 6) { this.mode = "home"; this.log.push(`${s.time.toFixed(0)}s home: stuck mining row ${row}`); }
      return inp({ down: true });
    }
    return inp({ down: true });
  }
  lastSideX = -1;

  private goHome(g: Game): Input {
    const p = g.pod, s = g.s;
    if (p.fuel <= 0) return inp({ confirm: true });
    this.path = this.homePath(g); this.pathT = s.time;
    if (!this.path.length) {
      // sealed in: blast up, else teleport, else wait for the tow
      if (p.items.dynamite && this.r() < 0.02) return inp({ item: 3 });
      if (p.items.teleport) return inp({ item: 5 });
      if (this.stuckFor > 20) { this.homes.stuck++; this.log.push(`${s.time.toFixed(0)}s sealed in at ${p.x.toFixed(1)},${p.y.toFixed(1)}`); this.lastPos.t = s.time; }
      // dig sideways and down to find air
      return inp({ [this.r() < 0.5 ? "left" : "right"]: true });
    }
    if (p.y < 1) return inp({ up: true, left: p.x < g.world.spawnX + 0.3 ? false : p.x > g.world.spawnX + 0.7, right: p.x < g.world.spawnX + 0.3 });
    const here = I(Math.floor(p.x), Math.floor(p.y));
    let k = this.path.indexOf(here);
    if (k < 0) k = 0;
    const next = this.path[Math.min(this.path.length - 1, k + 1)];
    if (this.stuckFor > 8) {
      this.homes.stuck++; this.log.push(`${s.time.toFixed(0)}s stuck going home at ${p.x.toFixed(2)},${p.y.toFixed(2)} v ${p.vx.toFixed(2)},${p.vy.toFixed(2)} fuel ${p.fuel.toFixed(2)} grounded ${p.grounded}`);
      this.lastPos.t = s.time;
      if (p.items.teleport) return inp({ item: 5 });
    }
    return this.steer(g, next);
  }
}

export { STATS, FINDS, MATERIALS, type ItemId };
