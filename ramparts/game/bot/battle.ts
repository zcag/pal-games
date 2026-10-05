// The battle bot: plays one battle like a person of knowledge k (run-meta 9). It reads only what a
// player sees (map, roster, next-wave skull, the field), acts through `command`, thinks a few times
// a second with a reaction delay and an actions-per-second cap, and its mistakes shrink with k.
import type { BattleArgs, BattleResult, Battle, Command, EnemyId, Pad, SpecId, TowerId, Vec } from "../types.ts";
import { Rng, hash } from "../rng.ts";
import { ACTS } from "../content/battle/acts.ts";
import { TOWERS, SPEC_OF } from "../content/battle/towers.ts";
import { ENEMIES } from "../content/battle/enemies.ts";
import { newBattle, step, command, priceOf } from "../battle/index.ts";
import { battleResult, buildCost, livesAtRisk, nextWaves, towerRange } from "../battle/query.ts";
import { X, alive, enemies, towers, type EnemyX, type TowerX } from "../battle/internal.ts";
import { laneAt } from "../map.ts";
import { expectRoles } from "./expect.ts";
import { cover, foe, geo, shape, towerVec, type Foe, type Geo } from "./model.ts";

export interface BattleBotOpts {
  k: number;
  seed: number;
  /** Collect a decision trace (sim-trace). */
  trace?: boolean;
  /** Hard stop in ticks (safety). */
  maxTicks?: number;
}

export interface TraceLine { tick: number; wave: number; gold: number; lives: number; cmd: string; why: string }

export interface BattleLog {
  result: BattleResult;
  /** Lives lost per wave index (the wave whose enemies leaked, by the wave running when they leaked). */
  waveLeaks: number[];
  /** Gold held at each wave start. */
  goldAt: number[];
  built: { kind: TowerId; level: number; spec: SpecId | null; damage: number; invested: number }[];
  casts: number;
  supplies: number;
  /** Lives lost to each enemy kind. */
  leakBy: Record<string, number>;
  calls: number;
  actions: number;
  trace: TraceLine[];
}

interface Plan { t: "build"; pad: Pad; kind: TowerId; cost: number; gain: number; why: string }
interface Up { t: "upgrade" | "spec"; tower: TowerX; spec?: SpecId; cost: number; gain: number; why: string }
type Buy = Plan | Up;

/** A virtual tower for valuing a layout. */
interface VT { kind: TowerId; level: number; spec: SpecId | null; pad: Pad; rally?: Vec }

/** Calibration: the share of a tower's measured stream rate it really gets on a passing group. */
const CAL = Number(process.env.BOTCAL ?? 1);

/** The smallest column each role comes in (archetype minimums, content waves), x1.5. */

const SINGLE = new Set<TowerId>(["archer", "mage", "ballista"]);
const DAMAGE_SPELLS = new Set(["meteor", "firebomb", "bramblesurge"]);

export class BattleBot {
  readonly b: Battle;
  readonly k: number;
  readonly rng: Rng;
  readonly g: Geo;
  private next = 0;          // next think tick
  private ready = 0;         // next tick an action may happen (APM)
  private gap: number;       // ticks between actions
  private period: number;    // ticks between thinks
  private react: number;     // reaction delay in ticks
  private intents: { due: number; cmd: Command; why: string }[] = [];
  private lastWaveLeak = 0;
  private leakAt: number[] = [];
  private rallied = new Map<number, string>();
  private ghostTried = false;
  log: BattleLog;
  private vecs = new Map<string, number[]>();
  private vecFoes: Foe[] | null = null;
  private ranges = new Map<string, number>();

  private range(kind: TowerId, level: number, spec: SpecId | null, pad: Pad): number {
    const k = `${kind}${level}${spec}@${pad.id}`;
    let r = this.ranges.get(k);
    if (r === undefined) this.ranges.set(k, (r = towerRange(this.b, kind, level, spec, pad)));
    return r;
  }

  constructor(b: Battle, o: BattleBotOpts) {
    this.b = b; this.k = o.k; this.rng = new Rng(hash(o.seed, 0xb07));
    this.g = geo(b);
    this.gap = Math.round(30 / (0.6 + 1.6 * o.k));
    this.period = Math.round(30 * (0.9 - 0.5 * o.k));
    this.react = Math.round(30 * (1.3 - 1.0 * o.k));
    this.log = { result: undefined as never, waveLeaks: [], goldAt: [], built: [], casts: 0, supplies: 0, leakBy: {}, calls: 0, actions: 0, trace: o.trace ? [] : (null as never) };
  }

  // ---------------------------------------------------------------- helpers
  private say(cmd: Command, why: string): boolean {
    const r = command(this.b, cmd);
    if (!r.ok) return false;
    this.log.actions++;
    if (this.log.trace) this.log.trace.push({ tick: this.b.tick, wave: this.b.next, gold: this.b.gold, lives: this.b.lives, cmd: fmt(this.b, cmd), why });
    if (this.b.phase === "running") this.ready = this.b.tick + this.gap;
    return true;
  }
  private noise(): number { return Math.exp(this.rng.range(-1, 1) * 1.1 * (1 - this.k)); }
  private chance(p: number) { return this.rng.chance(p); }

  /** What the bot expects to face, as groups of each role (total health and column length): the
   *  roster (if it reads it) sized like the battle's big waves, and the next wave(s) on the skull. */
  private foes(): Foe[] {
    const b = this.b, act = ACTS[b.act], out: Foe[] = [];
    const hp = (k: EnemyId) => ENEMIES[k].hp * (ENEMIES[k].fixedHp ? 1 : act.hpMul);
    const gap = (k: EnemyId) => (ENEMIES[k].size === "S" ? 0.35 : 0.8);
    // each roster role is its own group; the roles of one previewed wave arrive together (shared attention)
    const group = (k: EnemyId, n: number, wave: number, mul = 1) => { const f = foe(b, k, n * hp(k) * mul, Math.max(0, n - 1) * gap(k) * ENEMIES[k].speed); f.wave = wave; f.lives = n * ENEMIES[k].leak * mul; out.push(f); };
    if (this.k >= 0.35) {
      // each roster role as one column of its usual size, carrying the lives it usually puts at stake in a battle
      const ex = expectRoles(b.act, b.kind, b.floor, b.map.lanes.length, b.loadout.ascension);
      b.roster.filter((r) => !ENEMIES[r].boss && ENEMIES[r].threat > 0).forEach((r, i) => {
        const e = ex.get(r) ?? { total: 2, column: 2 };
        const n = Math.max(1, Math.round(e.column));
        group(r, n, -1 - i);
        out[out.length - 1]!.lives = e.total * ENEMIES[r].leak;
      });
      for (const r of b.roster) if (ENEMIES[r].boss) { const f = foe(b, r, hp(r), 0); f.wave = -99; f.lives = 10; out.push(f); }
    } else group("footman", Math.round(act.B * (1 + 0.15 * b.next)), 0);
    if (this.k >= 0.45) for (const w of nextWaves(b, this.k >= 0.75 ? 2 : 1)) {
      const sum = new Map<EnemyId, number>();
      for (const g of w.groups) if (!ENEMIES[g.kind].boss) sum.set(g.kind, (sum.get(g.kind) ?? 0) + g.count);
      for (const [k, n] of sum) group(k, n, w.wave + 100, this.k >= 0.6 ? 1.25 : 1);
    }
    return out;
  }

  /** Value of a whole layout: how much of what is coming it removes (soft-capped per role, so a gap,
   *  such as no air reach, is worth more than piling onto what is already covered). */
  private value(ts: VT[], foes: Foe[]): number {
    const C = this.capacity(ts, foes);
    let v = 0;
    // lives saved: each group's lives at stake times the share of its health the layout can take
    foes.forEach((f, k) => { v += f.lives * (1 - Math.exp(-CAL * C[k]! / Math.max(1e-6, f.w))); });
    for (const t of ts) if (t.spec === "treasury") v += 0.3;
    return v;
  }

  /** Health the layout can take from each coming group. */
  private capacity(ts: VT[], foes: Foe[]): number[] {
    const b = this.b, g = this.g;
    const beacon = ts.some((t) => t.kind === "beacon");
    const C = foes.map(() => 0);
    const near = (a: Pad, c: Pad, r: number) => (a.x - c.x) ** 2 + (a.y - c.y) ** 2 <= r * r;
    const S = ts.map((t) => shape(t.kind, t.level, t.spec)), R = ts.map((t) => this.range(t.kind, t.level, t.spec, t.pad));
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i]!;
      const sh = S[i]!;
      if (sh.support) continue;
      const vk = `${t.kind}${t.level}${t.spec}@${t.pad.id}${beacon ? "b" : ""}`;
      let vec = this.vecs.get(vk);
      if (!vec || this.vecFoes !== foes) { if (this.vecFoes !== foes) { this.vecs.clear(); this.vecFoes = foes; } vec = towerVec(b, g, t.kind, t.level, t.spec, t.pad, foes, beacon); this.vecs.set(vk, vec); }
      let m = 1;
      let aura = 0, mark = 0;
      for (let j = 0; j < ts.length; j++) {
        if (i === j) continue;
        const o = ts[j]!;
        if (o.kind === "banner" && near(o.pad, t.pad, o.level >= 4 ? 2.8 : 2.6)) aura = Math.max(aura, [0.1, 0.14, 0.18, o.spec === "wardrums" ? 0.25 * 1.15 + 0.15 : 0.18][o.level - 1]!);
        if (o.kind === "beacon" && near(o.pad, t.pad, 3.2)) mark = Math.max(mark, [0.04, 0.06, 0.08, o.spec === "huntersmark" ? 0.15 : 0.14][o.level - 1]! + (o.spec === "huntersmark" && t.spec === "marksmen" ? 0.3 : 0));
        const os = S[j]!;
        if (os.slow > 0 && near(o.pad, t.pad, 4.0)) {
          let s = os.slow * 0.7;
          if (o.kind === "frost" && t.kind === "pyre") { s = 0; m *= 0.8; }
          m *= 1 + s;
        }
        if (o.kind === "alchemist" && (t.kind === "pyre" || t.spec === "firestorm") && near(o.pad, t.pad, 4.0)) m *= o.spec === "naphtha" ? 1.45 : 1.25;
        if (o.spec === "shatter" && sh.type === "phys" && near(o.pad, t.pad, 4.5)) m *= 1.3;
        if (o.kind === "barracks" && o.rally && (o.rally.x - t.pad.x) ** 2 + (o.rally.y - t.pad.y) ** 2 <= R[i]! ** 2)
          m *= sh.area > 1.5 ? 1.3 : 1.12;
      }
      const mul = Math.min(2.2, m) * (1 + aura) * (1 + mark);
      // one tower's attention is shared by everything it can reach, in proportion to their health
      const W = new Map<number, number>();
      vec.forEach((v, f) => { if (v > 0) W.set(foes[f]!.wave, (W.get(foes[f]!.wave) ?? 0) + foes[f]!.w); });
      vec.forEach((v, f) => (C[f]! += v > 0 ? v * mul * foes[f]!.w / W.get(foes[f]!.wave)! : 0));
    }
    return C;
  }

  /** The next wave is covered with room to spare (so banking gold is safe). */
  private covered(): boolean {
    const b = this.b, act = ACTS[b.act];
    const w = nextWaves(b, 1)[0];
    if (!w) return true;
    const sum = new Map<EnemyId, number>();
    for (const g of w.groups) sum.set(g.kind, (sum.get(g.kind) ?? 0) + g.count);
    const foes = [...sum].map(([k, n]) => foe(b, k, n * ENEMIES[k].hp * (ENEMIES[k].fixedHp ? 1 : act.hpMul), Math.max(0, n - 1) * 0.8 * ENEMIES[k].speed));
    const C = this.capacity(this.layout(), foes);
    return foes.every((f, k) => C[k]! >= 1.6 * f.w);
  }

  private layout(): VT[] {
    return towers(this.b).map((t) => ({ kind: t.kind, level: t.level, spec: t.spec, pad: this.b.map.pads[t.pad]!, rally: t.rally }));
  }

  private freePads(): Pad[] {
    const used = new Set(towers(this.b).map((t) => t.pad));
    return this.b.map.pads.filter((p) => !used.has(p.id) && !p.rubble);
  }

  /** Default rally of a pad: nearest road point (as the rules do). */
  private rallyFor(p: Pad): Vec {
    let best: Vec = { x: p.x, y: p.y }, bd = Infinity;
    for (const q of this.g.ground) { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; best = q; } }
    return { x: best.x, y: best.y };
  }

  // ---------------------------------------------------------------- what to buy
  private options(foes: Foe[]): Buy[] {
    const b = this.b, now = this.layout(), v0 = this.value(now, foes);
    const out: Buy[] = [];
    const wide = this.k < 0.35; // novices spread: they look at new towers first
    const pads = this.freePads();
    const known = this.k >= 0.35;
    const p_best = Math.min(1, Math.max(0, 0.1 + 1.5 * (this.k - 0.2)));
    const padPick = pads.length && !this.chance(p_best) ? [this.rng.pick(pads)] : pads;
    for (const p of padPick) for (const kind of b.loadout.towers) {
      if ((kind === "barracks" || kind === "thornwood") && cover(this.g, p.x, p.y, kind === "barracks" ? 2.5 : 2.0) <= 0) continue;
      const cost = buildCost(b, kind);
      const vt: VT = { kind, level: 1, spec: null, pad: p, rally: kind === "barracks" ? this.rallyFor(p) : undefined };
      const gain = this.value([...now, vt], foes) - v0;
      out.push({ t: "build", pad: p, kind, cost, gain: gain * (wide ? 1.6 : 1), why: "" });
    }
    for (const t of towers(b)) {
      const i = now.findIndex((v) => v.pad.id === t.pad);
      if (t.level < 3) {
        const cost = priceOf(b, t.kind, t.level + 1, null, t);
        const nv = [...now]; nv[i] = { ...nv[i]!, level: t.level + 1 };
        out.push({ t: "upgrade", tower: t, cost, gain: (this.value(nv, foes) - v0) * (this.k >= 0.45 && this.k < 0.75 ? 1.15 : 1), why: `${TOWERS[t.kind].name} to L${t.level + 1}` });
      } else if (t.level === 3) {
        for (const s of TOWERS[t.kind].specs) {
          const cost = priceOf(b, t.kind, 4, s.id, t);
          const nv = [...now]; nv[i] = { ...nv[i]!, level: 4, spec: s.id };
          let gain = this.value(nv, foes) - v0;
          if (known) gain *= this.specFit(t.kind, s.id, foes);
          else gain *= this.rng.range(0.6, 1.4);
          out.push({ t: "spec", tower: t, spec: s.id, cost, gain: gain * (this.k >= 0.75 ? 1.15 : 1), why: `${TOWERS[t.kind].name} specialises: ${s.name}` });
        }
      }
    }
    return out;
  }

  /** Situational read of a spec beyond raw numbers (what the roster and the war table ask for). */
  private specFit(_kind: TowerId, spec: SpecId, foes: Foe[]): number {
    const w = (p: (f: Foe) => boolean) => foes.filter(p).reduce((s, f) => s + f.w, 0) / Math.max(1e-9, foes.reduce((s, f) => s + f.w, 0));
    const has = (k: TowerId) => this.b.loadout.towers.includes(k);
    const boss = this.b.kind === "boss" || this.b.kind === "elite";
    const small = w((f) => f.small), big = w((f) => f.big), air = w((f) => f.air), armour = w((f) => f.armour >= 25), shield = w((f) => f.shield || f.healer);
    switch (spec) {
      case "marksmen": return 1 + (has("beacon") ? 0.35 : 0) + big * 0.6 + (boss ? 0.2 : 0);
      case "volley": return 1 + small * 0.8;
      case "paladins": return 1.05 + small * 0.3;
      case "blademasters": return 1 + armour * 0.5;
      case "arcanist": return 1 + small * 0.6;
      case "hexer": return 1 + shield * 1.5 + (boss ? 0.25 : 0) + big * 0.3;
      case "mortar": return 1 + small * 0.3;
      case "shrapnel": return 1 + armour * 0.7;
      case "glacier": return 1 + small * 0.4;
      case "shatter": return 1 + (has("archer") || has("ballista") || has("bombard") ? 0.35 : 0);
      case "acid": return 1 + armour * 0.6 + w((f) => f.ward >= 25) * 0.4;
      case "naphtha": return 1 + (has("pyre") ? 0.35 : 0);
      case "inferno": return 1 + big * 0.6;
      case "firestorm": return 1 + air * 1.5;
      case "tempest": return 1 + air * 1.2 + small * 0.3;
      case "overload": return 1 + big * 0.4;
      case "lighthouse": return 1.1;
      case "huntersmark": return 1 + (has("archer") ? 0.2 : 0) + (boss ? 0.2 : 0);
      case "wardrums": return 1.1;
      case "treasury": return 0.9;
      case "harpoon": return 1 + air * 0.8;
      case "siegebolt": return 1 + small * 0.4;
      case "bramble": return 1 + small * 0.3;
      case "treant": return 1.05 + big * 0.2;
    }
  }

  /** Gold the bot wants to keep: interest banking (experts) and leftover crowns at the end. */
  private reserve(calm: boolean): number {
    const b = this.b;
    // banking for interest (5%, capped at 20-35 a wave) loses more than it earns while waves grow; the
    // one thing worth holding is leftover gold for crowns once the last wave is out and the field is calm
    if (this.k < 0.7 || !calm || !X(b).lastWaveStarted) return 0;
    return 120;
  }

  private shop(): boolean {
    const b = this.b;
    // nothing is affordable: no need to think about it
    let cheapest = Infinity;
    if (this.freePads().length) for (const k of b.loadout.towers) cheapest = Math.min(cheapest, buildCost(b, k));
    for (const t of towers(b)) if (t.level < 4) cheapest = Math.min(cheapest, t.level < 3 ? priceOf(b, t.kind, t.level + 1, null, t) : Math.min(...TOWERS[t.kind].specs.map((s) => priceOf(b, t.kind, 4, s.id, t))));
    if (b.gold < cheapest) return false;
    const foes = this.foes();
    const opts = this.options(foes).filter((o) => o.gain > 0);
    if (!opts.length) return false;
    for (const o of opts) o.gain *= this.noise();
    const calm = this.calm() && (this.k < 0.7 || this.covered());
    const reserve = this.reserve(calm);
    const ratio = (o: Buy) => o.gain / Math.max(1, o.cost);
    opts.sort((p, q) => ratio(q) - ratio(p));
    const best = opts[0]!;
    if (process.env.BOTDEBUG && this.log.trace) this.log.trace.push({ tick: b.tick, wave: b.next, gold: b.gold, lives: b.lives, cmd: "?", why: [...opts.slice(0, 5), ...opts.filter((o) => o.t === "build" && o.kind === "beacon").slice(0, 1)].map((o) => `${o.t === "build" ? `${o.kind}@${o.pad.id}` : o.why} ${o.gain.toFixed(1)}/${o.cost}`).join(" | ") + " foes " + foes.map((f) => `${f.kind}:${Math.round(f.w)}`).join(",") });
    const can = (o: Buy) => o.cost <= b.gold - (o === best && !calm ? 0 : reserve);
    let pick: Buy | undefined;
    if (can(best)) pick = best;
    else if (this.k < 0.45) pick = opts.find((o) => o.cost <= b.gold);
    else {
      // save for the best one when it is close; else take a nearly-as-good affordable one
      const alt = opts.find((o) => can(o) && ratio(o) >= ratio(best) * (b.gold + 60 >= best.cost ? 0.85 : 0.6));
      pick = alt;
    }
    if (!pick) return false;
    if (pick.t === "build") { const p = pick.pad; return this.say({ t: "build", pad: p.id, tower: pick.kind }, `${TOWERS[pick.kind].name} on pad ${p.id} (${p.tier}, covers ${cover(this.g, p.x, p.y, this.range(pick.kind, 1, null, p)).toFixed(1)} u)`); }
    if (pick.t === "upgrade") return this.say({ t: "upgrade", tower: pick.tower.id }, pick.why);
    return this.say({ t: "specialise", tower: pick.tower.id, spec: pick.spec! }, pick.why);
  }

  /** Nothing is close to our gate and nothing leaked lately. */
  private calm(): boolean {
    const b = this.b;
    if (b.tick - (this.leakAt[this.leakAt.length - 1] ?? -1e9) < 30 * 25) return false;
    return b.pressure < 0.3 && this.front() < 0.65;
  }

  /** How far along its road the most advanced enemy is (0..1). */
  private front(): number {
    let f = 0;
    for (const e of enemies(this.b)) if (alive(e) && !e.boss) f = Math.max(f, e.s / Math.max(1, e.laneLen));
    return f;
  }

  // ---------------------------------------------------------------- rally, modes
  private rally(): boolean {
    if (this.k < 0.5) return false;
    const b = this.b, ts = towers(b);
    for (const t of ts) {
      if (t.kind !== "barracks" || t.building > 0) continue;
      const sig = ts.filter((o) => o !== t).map((o) => `${o.pad}:${o.level}`).join(",");
      if (this.rallied.get(t.id) === sig) continue;
      this.rallied.set(t.id, sig);
      // the road point in reach that most damage towers cover; ties go to later (deeper) points
      let best: Vec | null = null, bv = -1;
      for (const q of this.g.ground) {
        if ((q.x - t.x) ** 2 + (q.y - t.y) ** 2 > 2.5 * 2.5) continue;
        let v = 0;
        for (const o of ts) {
          if (o === t) continue;
          const sh = shape(o.kind, o.level, o.spec);
          if (sh.support || sh.dps <= 0) continue;
          const r = towerRange(b, o.kind, o.level, o.spec, b.map.pads[o.pad]);
          if ((o.x - q.x) ** 2 + (o.y - q.y) ** 2 <= r * r) v += sh.dps * sh.area;
        }
        v += q.s * 0.01;
        if (v > bv) { bv = v; best = q; }
      }
      if (!best || !t.rally) continue;
      if ((best.x - t.rally.x) ** 2 + (best.y - t.rally.y) ** 2 < 0.8) continue;
      if (this.say({ t: "rally", tower: t.id, x: best.x, y: best.y }, "move soldiers where the most towers can hit what they hold")) return true;
    }
    return false;
  }

  /** Experts set Frost Spires to the newest enemy in reach; while a boss walks, every other single-target
   *  tower focuses the strongest enemy (the boss) and the rest keep clearing its adds. */
  private modes(): boolean {
    if (this.k < 0.7) return false;
    const boss = !!this.boss();
    const single = towers(this.b).filter((t) => SINGLE.has(t.kind)).sort((p, q) => q.level - p.level || p.id - q.id);
    for (const t of towers(this.b)) {
      const def = t.spec && TOWERS[t.kind].specs[SPEC_OF[t.spec].index].mode ? TOWERS[t.kind].specs[SPEC_OF[t.spec].index].mode! : TOWERS[t.kind].mode;
      let want = t.kind === "frost" ? "last" : def;
      if (boss && single.indexOf(t) >= 0 && single.indexOf(t) % 2 === 0) want = "strong";
      if (t.mode !== want) return this.say({ t: "mode", tower: t.id, mode: want }, want === "strong" && boss ? "focus the boss" : t.kind === "frost" ? "frost on the newest arrivals: they stay in reach long enough to freeze" : "back to its usual target");
    }
    return false;
  }

  // ---------------------------------------------------------------- spells and supplies
  private visible(): EnemyX[] { return enemies(this.b).filter((e) => alive(e) && !(e.boss?.burrowed) && (!e.stealth || e.st.revealed > 0)); }

  /** Where a clump of enemies is (or will be after `ahead` seconds), and how much HP is in it. */
  private clump(r: number, ahead: number, ground = false): { x: number; y: number; hp: number; n: number } | null {
    const es = this.visible().filter((e) => !ground || !e.air);
    let best: { x: number; y: number; hp: number; n: number } | null = null;
    const v = { x: 0, y: 0 };
    const pos = (e: EnemyX) => {
      if (ahead <= 0 || e.speed <= 0) return { x: e.x, y: e.y };
      const lane = e.onAir ? this.b.map.air[e.airLane]! : this.b.map.lanes[e.groundLane]!;
      laneAt(lane, e.s + e.speed * ahead, v);
      return { x: v.x, y: v.y };
    };
    const ps = es.map((e) => ({ e, p: pos(e) }));
    for (const a of ps) {
      let hp = 0, n = 0;
      for (const c of ps) if ((c.p.x - a.p.x) ** 2 + (c.p.y - a.p.y) ** 2 <= r * r) { hp += c.e.hp + c.e.shield; n++; }
      if (!best || hp > best.hp) best = { x: a.p.x, y: a.p.y, hp, n };
    }
    return best;
  }

  private leader(): EnemyX | null {
    let best: EnemyX | null = null;
    for (const e of this.visible()) if (!e.air && (!best || e.s / e.laneLen > best.s / best.laneLen)) best = e;
    return best;
  }

  private boss(): EnemyX | null { return enemies(this.b).find((e) => alive(e) && !!e.boss) ?? null; }

  private trouble(): boolean { return this.b.pressure > 0.55 || this.front() > 0.78 || livesAtRisk(this.b) >= Math.max(3, this.b.lives * 0.25); }

  private intend(cmd: Command, why: string) {
    if (this.intents.some((i) => i.cmd.t === cmd.t && (cmd.t !== "cast" || (i.cmd as typeof cmd).spell === cmd.spell) && (cmd.t !== "supply" || (i.cmd as typeof cmd).slot === cmd.slot))) return;
    const jitter = Math.round(this.rng.range(0, 0.5) * this.react);
    this.intents.push({ due: this.b.tick + this.react + jitter, cmd, why });
  }

  private spells() {
    const b = this.b, k = this.k;
    const bossBattle = b.kind === "boss";
    const boss = this.boss();
    const sm = ACTS[b.act].hpMul;
    for (const s of b.spells) {
      if (s.cooldown > 0 || process.env.BOTNOSPELL === s.key) continue;
      const key = s.key;
      // experts keep the damage spell for the boss in a boss battle
      if (k >= 0.75 && bossBattle && !boss && DAMAGE_SPELLS.has(s.id) && !this.trouble()) continue;
      const novice = k < 0.4;
      const lead = this.leader();
      const ahead = k >= 0.7 ? (s.id === "meteor" ? 1.0 + this.react / 30 : this.react / 30) : 0;
      switch (s.id) {
        case "meteor": case "firebomb": case "bramblesurge": {
          if (boss && k >= 0.6 && !boss.boss?.burrowed && !boss.boss?.flying) { this.intend({ t: "cast", spell: key, x: boss.x, y: boss.y }, `${s.id} on the boss`); break; }
          const c = this.clump(s.radius, ahead, s.id === "bramblesurge");
          if (!c) break;
          const need = novice ? 0 : 260 * sm;
          if (c.hp >= need || (!novice && this.trouble() && c.n >= 2)) this.intend({ t: "cast", spell: key, x: c.x, y: c.y }, novice ? `${s.id} at once on an enemy` : `${s.id} on a clump of ${c.n} (${Math.round(c.hp)} health)`);
          break;
        }
        case "tarpit": {
          const c = this.clump(s.radius, ahead, true);
          if (!c) break;
          if (novice || c.n >= 4 || (boss && this.trouble()) || this.trouble()) this.intend({ t: "cast", spell: key, x: c.x, y: c.y }, `tar pit on ${c.n} enemies`);
          break;
        }
        case "reinforcements": case "barrier": {
          if (!lead) break;
          const f = lead.s / lead.laneLen;
          if (novice || f > 0.6 || this.trouble()) {
            const v = { x: 0, y: 0 };
            laneAt(b.map.lanes[lead.groundLane]!, Math.min(lead.laneLen, lead.s + (k >= 0.5 ? 1.2 + lead.speed * this.react / 30 : 0)), v);
            this.intend({ t: "cast", spell: key, x: v.x, y: v.y }, novice ? `${s.id} on the leading enemy` : `${s.id} ahead of the leader (${Math.round(f * 100)}% down the road)`);
          }
          break;
        }
        case "stillness": {
          const tele = boss?.boss?.tele;
          if (novice ? this.visible().length > 0 : (this.trouble() || (tele && k >= 0.7 && ["charge", "leap", "leap3", "stomp", "breath", "breath3"].includes(tele.ability))))
            this.intend({ t: "cast", spell: key }, tele ? `stillness against ${tele.ability}` : "stillness: they are too close");
          break;
        }
        case "judgement": {
          const big = this.visible().reduce<EnemyX | null>((a, e) => (!a || e.hp > a.hp ? e : a), null);
          if (big && (novice || big.hp >= 300 * sm || big.boss || big.elite)) this.intend({ t: "cast", spell: key }, `judgement on ${big.kind}`);
          break;
        }
        case "requisition": {
          const t = towers(b).filter((q) => q.level < 3 && q.building <= 0).sort((p, q) => q.stats.damage - p.stats.damage)[0];
          if (t && b.gold >= priceOf(b, t.kind, t.level + 1, null, t) / 2 + 5) this.intend({ t: "cast", spell: key, tower: t.id }, `requisition: ${TOWERS[t.kind].name} to L${t.level + 1} at half price`);
          break;
        }
        case "rally": {
          if (novice ? this.visible().length > 0 : this.trouble() || (boss && k >= 0.6)) this.intend({ t: "cast", spell: key }, "rally: everyone faster now");
          break;
        }
      }
    }
  }

  private supplies() {
    const b = this.b, k = this.k, sl = X(b).supplies;
    const boss = this.boss();
    const novice = k < 0.4;
    const trouble = this.trouble();
    sl.forEach((id, slot) => {
      if (!id) return;
      if (b.phase !== "running") return;
      const lead = this.leader();
      const hold = k >= 0.75 && b.kind === "boss" && !boss;
      switch (id) {
        case "gold-cache": this.intend({ t: "supply", slot }, "gold cache: gold now"); break;
        case "lifeblood": if (novice || b.lives <= b.loadout.maxLives - 3) this.intend({ t: "supply", slot }, "lifeblood: lives are down"); break;
        case "masons-kit": if (towers(b).filter((t) => t.disabled > 0).length >= (novice ? 1 : 2)) this.intend({ t: "supply", slot }, "mason's kit: towers are down"); break;
        case "flare": if (enemies(b).some((e) => alive(e) && e.stealth && e.st.revealed <= 0) && (novice || !towers(b).some((t) => t.kind === "beacon"))) this.intend({ t: "supply", slot }, "flare: shades on the road"); break;
        case "heavy-bolt": { const big = this.visible().find((e) => e.boss || e.elite); if (big || (novice && lead)) this.intend({ t: "supply", slot }, "heavy bolt on the biggest"); break; }
        case "war-horn": case "bell": if (!hold && (novice ? !!lead : trouble || (boss && k >= 0.6))) this.intend({ t: "supply", slot }, `${id} in trouble`); break;
        case "oil-barrel": case "frost-flask": {
          if (hold || !(novice ? !!lead : trouble || (boss && k >= 0.6))) break;
          const c = boss && k >= 0.6 ? { x: boss.x, y: boss.y } : this.clump(id === "oil-barrel" ? 1.2 : 1.5, 0, true);
          if (c) this.intend({ t: "supply", slot, x: c.x, y: c.y }, `${id} on a clump`);
          break;
        }
        case "spike-trap": {
          if (hold || !(novice ? !!lead : trouble) || !lead) break;
          const v = { x: 0, y: 0 };
          laneAt(b.map.lanes[lead.groundLane]!, Math.min(lead.laneLen, lead.s + 2), v);
          this.intend({ t: "supply", slot, x: v.x, y: v.y }, "spike trap ahead of the leader");
          break;
        }
      }
    });
  }

  // ---------------------------------------------------------------- calling early
  private callEarly(): boolean {
    const b = this.b, k = this.k;
    if (k < 0.4 || b.phase !== "running" || b.countdown <= 0 || X(b).spawning || X(b).mods.noCall) return false;
    if (b.next >= b.waves.length) return false;
    if (b.tick - (this.leakAt[this.leakAt.length - 1] ?? -1e9) < 30 * (k >= 0.75 ? 20 : 40)) return false;
    const nw = nextWaves(b, 1)[0];
    if (nw?.boss && k < 0.75) return false;
    const risk = livesAtRisk(b);
    const ok = k >= 0.75 ? b.pressure < 0.3 && this.front() < 0.5 && risk <= 6 : b.pressure < 0.15 && this.front() < 0.45 && risk <= 3;
    if (!ok) return false;
    return this.say({ t: "call" }, `call early: the field is quiet (pressure ${b.pressure.toFixed(2)}), ${Math.ceil(b.countdown / 30)} s left`);
  }

  // ---------------------------------------------------------------- the loop
  setup() {
    const b = this.b;
    if (!this.ghostTried) {
      this.ghostTried = true;
      if (this.k < 0.45 && b.loadout.ghost?.length) this.say({ t: "ghost" }, "accept last battle's layout");
    }
    for (let i = 0; i < 12; i++) if (!this.shop()) break;
    this.rally();
    this.say({ t: "call" }, "start wave 1");
  }

  tick() {
    const b = this.b;
    if (b.phase === "setup") { this.setup(); return; }
    if (b.phase !== "running") return;
    // leaks seen
    if (b.stats.livesLost > this.lastWaveLeak) { this.leakAt.push(b.tick); this.lastWaveLeak = b.stats.livesLost; }
    // due intents (stale aims: the reaction delay)
    for (let i = 0; i < this.intents.length; i++) {
      const it = this.intents[i]!;
      if (b.tick < it.due) continue;
      if (b.tick < this.ready) break;
      this.intents.splice(i--, 1);
      const ok = this.say(it.cmd, it.why);
      if (ok && it.cmd.t === "cast") this.log.casts++;
      if (ok && it.cmd.t === "supply") this.log.supplies++;
    }
    if (b.tick < this.next) return;
    this.next = b.tick + this.period + (this.k < 0.4 ? this.rng.int(0, 10) : 0);
    if (process.env.BOTNOSPELL !== "1") this.spells();
    this.supplies();
    if (b.tick < this.ready) return;
    if (this.shop()) return;
    if (this.rally()) return;
    if (this.modes()) return;
    if (this.callEarly()) this.log.calls++;
  }
}

function fmt(b: Battle, c: Command): string {
  const tw = (id: number) => { const t = b.towers.find((q) => q.id === id); return t ? `${t.kind}#${t.id}` : `#${id}`; };
  switch (c.t) {
    case "build": return `build ${c.tower} @pad${c.pad}`;
    case "upgrade": return `upgrade ${tw(c.tower)}`;
    case "specialise": return `spec ${tw(c.tower)} -> ${c.spec}`;
    case "sell": return `sell ${tw(c.tower)}`;
    case "mode": return `mode ${tw(c.tower)} ${c.mode}`;
    case "rally": return `rally ${tw(c.tower)} (${c.x.toFixed(1)},${c.y.toFixed(1)})`;
    case "call": return "call";
    case "cast": return `cast ${c.spell}${c.x !== undefined ? ` (${c.x.toFixed(1)},${c.y!.toFixed(1)})` : ""}${c.tower ? ` ${tw(c.tower)}` : ""}`;
    case "supply": return `supply ${c.slot}${c.x !== undefined ? ` (${c.x.toFixed(1)},${c.y!.toFixed(1)})` : ""}`;
    case "clear": return `clear pad${c.pad}`;
    case "ghost": return "ghost layout";
  }
}

/** Play one battle start to finish. */
export function playBattle(args: BattleArgs, o: BattleBotOpts): BattleLog {
  const b = newBattle({ ...args, quiet: false });
  const bot = new BattleBot(b, o);
  const max = o.maxTicks ?? 30 * 60 * 20;
  let w = -1, lost = 0;
  while ((b.phase === "setup" || b.phase === "running") && b.tick < max) {
    bot.tick();
    step(b);
    for (const e of b.events) if (e.e === "leak") bot.log.leakBy[e.kind] = (bot.log.leakBy[e.kind] ?? 0) + e.lives;
    b.events.length = 0;
    if (b.next - 1 !== w) { w = b.next - 1; bot.log.goldAt[w] = b.gold; }
    if (b.stats.livesLost > lost) { const i = Math.max(0, b.next - 1); bot.log.waveLeaks[i] = (bot.log.waveLeaks[i] ?? 0) + b.stats.livesLost - lost; lost = b.stats.livesLost; }
  }
  const log = bot.log;
  log.result = battleResult(b);
  log.built = towers(b).map((t) => ({ kind: t.kind, level: t.level, spec: t.spec, damage: t.stats.damage, invested: t.invested }));
  return log;
}
