// Wave generation from the threat budget (content.md 6, systems 9.5, R2/R13/R24/R26).
import type { Act, BattleKind, BossId, EnemyId, WaveGroup, WavePlan } from "../types.ts";
import { Rng } from "../rng.ts";
import { ACTS, floorFactor } from "../content/battle/acts.ts";
import { ENEMIES, ELITE_AFFIXES, ELITES, WAVE_ROLES } from "../content/battle/enemies.ts";
import { BOSSES } from "../content/battle/bosses.ts";
import { ACT1_BAT_CAP, ARCHETYPES, ARCH_WEIGHTS, themeArchetypes, unlockWave, type ArchId } from "../content/battle/waves.ts";
import { T } from "./internal.ts";

export interface WaveInput {
  rng: Rng;
  act: Act;
  kind: BattleKind;
  floor: number;
  lanes: number;            // ground lanes (2 = merge/fork)
  boss?: BossId;
  /** The battle theme's archetype ids (x3 weight). */
  archetypes?: string[];
  elite?: EnemyId;
  eliteAffixes?: string[];
  fewerWaves?: number;
  champion?: boolean;
  asc: number;
  threatMul: number;        // Seven Bells
  haunted: boolean;
  firstBattle: boolean;
  seen?: EnemyId[];
}

export interface WaveOutput { waves: WavePlan[]; threat: number[]; roster: EnemyId[] }

const AIR: ArchId[] = ["airswarm", "skyraid"];
const ARMOUR: ArchId[] = ["armoured", "shieldwall", "siege"];
const WARD: ArchId[] = ["warded", "healer"];
const STEALTH: ArchId[] = ["stealth", "shieldwall"];

/** Waves in a battle (R13). */
export function waveCount(act: Act, kind: BattleKind, firstBattle: boolean, champion: boolean): number {
  if (firstBattle) return 6;
  if (champion) return 6;
  const w = ACTS[act].waves;
  return kind === "boss" ? w.boss : kind === "elite" ? w.elite : w.battle;
}

export function budget(act: Act, kind: BattleKind, floor: number, w: number, n: number, mul: number): number {
  const node = kind === "elite" ? 1.15 : kind === "boss" ? 0.9 : 1.0;
  const last = kind !== "boss" && w === n;
  const shape = last ? 1.3 : w === 4 || w === 8 ? 1.2 : w === 5 || w === 9 ? 0.85 : 1.0;
  return ACTS[act].B * (1 + 0.15 * (w - 1)) * node * floorFactor(act, floor, kind === "boss") * shape * mul;
}

function unlocked(inp: WaveInput, role: EnemyId, w: number): boolean {
  if (inp.firstBattle && ENEMIES[role].flying) return false;
  const f = inp.kind === "boss" ? 9 : inp.floor;
  return unlockWave(inp.act, f, role) <= w;
}

function eligible(inp: WaveInput, a: ArchId, w: number): boolean {
  const d = ARCHETYPES[a];
  if (a === "grand") return false;
  if (a === "twofronts") return inp.lanes > 1 && w >= 2;
  if (!d.core || !unlocked(inp, d.core, w)) return false;
  if (inp.act === 1 && inp.floor <= 1 && inp.kind !== "boss" && a === "swarm") return false;
  if (inp.act === 1 && AIR.includes(a)) return false; // act I air comes only from its guarantee
  return true;
}

/** Fill a budget with an archetype's roles (content 6.1 steps 1-5). */
export function fill(inp: WaveInput, a: ArchId, T0: number, w: number): { role: EnemyId; n: number }[] {
  const d = ARCHETYPES[a];
  const roles = (Object.keys(d.weights) as EnemyId[]).filter((r) => unlocked(inp, r, w)
    && !(inp.act === 1 && r === "bat" && a !== "airswarm")
    && !(inp.act === 1 && inp.floor <= 1 && inp.kind !== "boss" && r === "swarmling" && a !== "rush"));
  if (!roles.length) return [];
  const wsum = roles.reduce((s, r) => s + d.weights[r]!, 0);
  const exact = roles.map((r) => ({ role: r, x: (T0 * d.weights[r]!) / wsum / ENEMIES[r].threat, w: d.weights[r]! }));
  const out = exact.map((e) => ({ role: e.role, n: Math.floor(e.x), f: e.x - Math.floor(e.x), w: e.w }));
  const total = () => out.reduce((s, o) => s + o.n * ENEMIES[o.role].threat, 0);
  for (const o of [...out].sort((p, q) => q.f - p.f || q.w - p.w)) {
    if (total() + ENEMIES[o.role].threat <= 1.05 * T0 + 1e-9) o.n++;
  }
  const core = d.core && out.find((o) => o.role === d.core);
  if (core && core.n < d.min) {
    core.n = d.min;
    const others = out.filter((o) => o !== core).sort((p, q) => ENEMIES[p.role].threat - ENEMIES[q.role].threat);
    for (const o of others) while (o.n > 0 && total() > 1.05 * T0 + 1e-9) o.n--;
  }
  // small-body caps (swarmlings, bats; act I floors 2-3 bats max 10, R2)
  for (const o of out) {
    const cap = o.role === "bat" && inp.act === 1 && inp.kind !== "boss" && inp.floor <= 3 ? ACT1_BAT_CAP
      : o.role === "swarmling" || o.role === "bat" ? ACTS[inp.act].smallCap : Infinity;
    if (o.n > cap) {
      const over = (o.n - cap) * ENEMIES[o.role].threat;
      o.n = cap;
      const other = out.filter((p) => p !== o && p.role !== "bat" && p.role !== "swarmling").sort((p, q) => q.w - p.w)[0];
      if (other) other.n += Math.round(over / ENEMIES[other.role].threat);
    }
  }
  const order = [...out].filter((o) => o.n > 0).sort((p, q) => (p.role === d.core ? -1 : q.role === d.core ? 1 : q.w - p.w));
  return order.map((o) => ({ role: o.role, n: o.n }));
}

interface Part { role: EnemyId; n: number; intro: boolean; lane: number; spacing: number; gap: number; elite?: boolean; affixes?: string[] }

/** Lay groups out in time; returns WaveGroups with delays. */
function schedule(parts: Part[][], laneMode: "alternate" | "fixed", lanes: number): WaveGroup[] {
  const out: WaveGroup[] = [];
  for (const seq of parts) {
    // split into groups of <= 16
    const groups: Part[] = [];
    for (const p of seq) { let n = p.n; while (n > 0) { const k = Math.min(16, n); groups.push({ ...p, n: k }); n -= k; } }
    const span = (sc: number, gc: number) => groups.reduce((s, g, i) => s + (g.n - 1) * Math.max(0.25, g.spacing * sc) + (i ? Math.max(1.5, g.gap * gc) : 0), 0);
    let sc = 1, gc = 1;
    const len = span(1, 1);
    if (len > 10) {
      const lo = (k: number) => span(k, 1);
      let a = 0, b = 1;
      for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (lo(m) > 10) b = m; else a = m; }
      sc = a;
      if (span(sc, 1) > 10.01) { let c = 0, d = 1; for (let i = 0; i < 30; i++) { const m = (c + d) / 2; if (span(sc, m) > 10) d = m; else c = m; } gc = c; }
    } else if (len < 5 && groups.some((g) => g.n > 1)) {
      let a = 1, b = 8;
      for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (span(m, 1) < 5) a = m; else b = m; }
      sc = b;
    }
    let t = 0;
    groups.forEach((g, i) => {
      if (i) t += Math.max(1.5, g.gap * gc);
      const spacing = Math.max(0.25, g.spacing * sc);
      const lane = laneMode === "alternate" && lanes > 1 ? i % lanes : g.lane;
      const wg: WaveGroup = { kind: g.role, count: g.n, lane, spacing: T(spacing), delay: T(t) };
      if (g.elite) wg.elite = true;
      if (g.affixes?.length) wg.affixes = g.affixes;
      out.push(wg);
      t += (g.n - 1) * spacing;
    });
  }
  return out.sort((p, q) => p.delay - q.delay);
}

function rollAffixes(rng: Rng, kind: EnemyId, n: number): string[] {
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    const pool = ELITE_AFFIXES.filter((a) => !out.includes(a) && !(a === "brood" && kind === "matron")
      && !(a === "plated" && out.includes("runed")) && !(a === "runed" && out.includes("plated")));
    if (pool.length) out.push(rng.pick(pool));
  }
  return out;
}

/** The run's pre-rolled affixes, topped up to the required count (A6: at least 2). */
function eliteAff(rng: Rng, kind: EnemyId, n: number, given?: string[]): string[] {
  if (!given) return rollAffixes(rng, kind, n);
  const out = [...given];
  while (out.length < n) {
    const more = rollAffixes(rng, kind, out.length + 1).filter((a) => !out.includes(a) && !(a === "plated" && out.includes("runed")) && !(a === "runed" && out.includes("plated")));
    if (!more.length) break;
    out.push(more[0]!);
  }
  return out;
}

export function rollElite(rng: Rng, act: Act): EnemyId {
  const w = { 1: [35, 35, 30], 2: [33, 33, 34], 3: [33, 33, 34], 4: [34, 33, 33] }[act];
  return rng.weighted(ELITES, (e) => w[ELITES.indexOf(e)]!);
}

export function generateWaves(inp: WaveInput): WaveOutput {
  const { rng, act, kind } = inp;
  const champion = inp.champion ?? (kind === "boss" && act === 4 && !!inp.boss && inp.boss !== "tyrant");
  const N = Math.max(1, waveCount(act, kind, inp.firstBattle, champion) - (inp.fewerWaves ?? 0));
  const bossKind: BattleKind = kind;
  const isBoss = kind === "boss";
  const theme = themeArchetypes(inp.archetypes);
  // ascension 3: one wave carries an affix
  let affixWave = -1, affix = "";
  if (inp.asc >= 3 && N >= 4) { affixWave = rng.int(3, N - 1); affix = rng.pick(["hasted", "plated", "runed", "many"]); }
  const Tw: number[] = [];
  for (let w = 1; w <= N; w++) Tw.push(budget(act, bossKind, inp.floor, w, N, inp.threatMul * (w === affixWave && affix === "many" ? 1.3 : 1)));
  // archetype per wave
  const arch: (ArchId | null)[] = new Array(N).fill(null);
  if (!isBoss) arch[N - 1] = "grand";
  const can = (a: ArchId, w: number) => (act === 1 ? a === "airswarm" && unlocked(inp, "bat", w) : eligible(inp, a, w)) && arch[w - 2] !== a && arch[w] !== a;
  const placeOne = (cat: ArchId[], from: number, to: number) => {
    const ws: number[] = [];
    for (let w = from; w <= to; w++) if (!arch[w - 1] && cat.some((a) => can(a, w))) ws.push(w);
    if (!ws.length) return;
    const w = rng.pick(ws);
    arch[w - 1] = rng.weighted(cat.filter((a) => can(a, w)), (a) => (ARCH_WEIGHTS[act][a] ?? 1) * (theme.includes(a) ? 3 : 1));
  };
  const lastPre = isBoss ? N : N - 1;
  if (act === 1) {
    if ((inp.floor >= 2 || isBoss) && !inp.firstBattle) placeOne(["airswarm"], 4, lastPre);
  } else {
    placeOne(ARMOUR.filter((a) => a !== "shieldwall"), 1, lastPre);
    placeOne(WARD, 1, lastPre);
    placeOne(AIR, 1, lastPre);
    if (act === 4) placeOne(AIR, 1, lastPre);
    placeOne(STEALTH, 1, lastPre);
  }
  for (let w = 1; w <= N; w++) {
    if (arch[w - 1]) continue;
    const opts = (Object.keys(ARCH_WEIGHTS[act]) as ArchId[]).filter((a) => eligible(inp, a, w) && arch[w - 2] !== a && arch[w] !== a);
    arch[w - 1] = opts.length ? rng.weighted(opts, (a) => (ARCH_WEIGHTS[act][a] ?? 0) * (theme.includes(a) ? 3 : 1)) : "march";
  }
  // intro groups: roles not yet seen this run
  const seen = new Set<EnemyId>(inp.seen ?? defaultSeen(act, inp.floor, inp.firstBattle));
  const waves: WavePlan[] = [];
  const roster = new Set<EnemyId>();
  const eliteKind = inp.elite ?? (kind === "elite" ? rollElite(rng, act) : undefined);
  const nAff = Math.max(inp.asc >= 6 ? 2 : 0, act === 1 ? 0 : act === 4 ? 2 : 1);
  for (let w = 1; w <= N; w++) {
    const a = arch[w - 1]!;
    const T0 = Tw[w - 1]!;
    let parts: Part[][] = [];
    let laneMode: "alternate" | "fixed" = "alternate";
    const mk = (aa: ArchId, budgetT: number, lane: number, spacing?: number): Part[] => {
      const d = ARCHETYPES[aa];
      return fill(inp, aa, budgetT, w).map((f) => ({ role: f.role, n: f.n, intro: false, lane, spacing: spacing ?? d.spacing, gap: d.gap ?? 2.0 }));
    };
    if (a === "grand") {
      const pool = (Object.keys(ARCH_WEIGHTS[act]) as ArchId[]).filter((x) => eligible(inp, x, w) && x !== "twofronts");
      if (act === 1 && (inp.floor >= 2 || isBoss) && !inp.firstBattle && !arch.includes("airswarm") && unlocked(inp, "bat", w)) pool.push("airswarm");
      const three: ArchId[] = [];
      while (three.length < 3 && pool.length) {
        const x = rng.weighted(pool, (q) => (ARCH_WEIGHTS[act][q] ?? 5) * (theme.includes(q) ? 3 : 1));
        three.push(x); pool.splice(pool.indexOf(x), 1);
      }
      const sub = three.map((x) => mk(x, T0 / 3, 0, 0.6));
      // interleave group by group
      const inter: Part[] = [];
      for (let i = 0; i < Math.max(...sub.map((s) => s.length)); i++) for (const s of sub) if (s[i]) inter.push(s[i]!);
      parts = [inter];
    } else if (a === "twofronts") {
      const pool = (Object.keys(ARCH_WEIGHTS[act]) as ArchId[]).filter((x) => eligible(inp, x, w) && x !== "twofronts");
      const p1 = rng.weighted(pool, (q) => ARCH_WEIGHTS[act][q] ?? 1);
      const p2 = rng.weighted(pool.filter((q) => q !== p1), (q) => ARCH_WEIGHTS[act][q] ?? 1);
      parts = [mk(p1, T0 / 2, 0), mk(p2 ?? p1, T0 / 2, 1)];
      laneMode = "fixed";
    } else parts = [mk(a, T0, 0)];
    // intro groups
    for (const seq of parts) {
      for (let i = 0; i < seq.length; i++) {
        const p = seq[i]!;
        if (seen.has(p.role)) continue;
        seen.add(p.role);
        if (p.n > 4) { seq.splice(i, 0, { ...p, n: 4, intro: true }); p.n -= 4; i++; } else p.intro = true;
      }
    }
    // the elite on top of the budget
    const elites: Part[] = [];
    if (eliteKind && kind === "elite" && (w === Math.ceil(N / 2) || w === N)) {
      const n = w === N && act >= 3 ? 2 : 1;
      for (let k = 0; k < n; k++) elites.push({ role: eliteKind, n: 1, intro: false, lane: k % inp.lanes, spacing: 1, gap: 2, elite: true, affixes: eliteAff(rng, eliteKind, nAff, inp.eliteAffixes) });
    } else if (eliteKind && kind !== "elite" && kind !== "boss" && w === N) {
      elites.push({ role: eliteKind, n: 1, intro: false, lane: 0, spacing: 1, gap: 2, elite: true, affixes: [] });
    }
    if (elites.length) parts[0]!.push(...elites);
    if (inp.haunted && (w === 3 || w === 6 || w === 9)) parts[0]!.push({ role: "shade", n: 1, intro: false, lane: 0, spacing: 1, gap: 2, affixes: ["haunted"] });
    if (w === affixWave && affix !== "many") for (const seq of parts) for (const p of seq) if (!p.elite) p.affixes = [...(p.affixes ?? []), affix];
    capWave(inp, parts);
    const groups = schedule(parts, laneMode, inp.lanes);
    const threat = groups.reduce((s, g) => s + (g.elite ? 0 : ENEMIES[g.kind].threat * g.count), 0);
    for (const g of groups) roster.add(g.kind);
    waves.push({ index: w - 1, archetype: a, threat, groups, badges: badges(groups, w === affixWave ? affix : "", parts.flat()) });
  }
  if (isBoss) {
    const boss = inp.boss ?? ACTS[act].bosses[0]!;
    const escortT = 0.6 * ACTS[act].B;
    const def = BOSSES[boss];
    const roles = (Object.keys(def.escort) as EnemyId[]);
    const wsum = roles.reduce((s, r) => s + def.escort[r]!, 0);
    const esc: Part[] = roles.map((r) => ({ role: r, n: Math.max(0, Math.round((escortT * def.escort[r]!) / wsum / ENEMIES[r].threat)), intro: false, lane: 0, spacing: 0.8, gap: 1.5 })).filter((p) => p.n > 0);
    const groups = schedule([esc], "alternate", inp.lanes).map((g) => ({ ...g, delay: g.delay + T(3) }));
    const all: WaveGroup[] = [{ kind: boss, count: 1, lane: 0, spacing: 1, delay: 0 }, ...groups];
    for (const g of all) roster.add(g.kind);
    waves.push({ index: N, archetype: "boss", threat: groups.reduce((s, g) => s + ENEMIES[g.kind].threat * g.count, 0), groups: all, boss, badges: ["boss", ...badges(groups, "", [])] });
    Tw.push(escortT);
  }
  return { waves, threat: Tw, roster: [...roster] };
}

/** Per-wave small-body caps across every part (Grand assault, Two fronts). */
function capWave(inp: WaveInput, parts: Part[][]) {
  for (const k of ["swarmling", "bat"] as EnemyId[]) {
    const cap = k === "bat" && inp.act === 1 && inp.kind !== "boss" && inp.floor <= 3 ? ACT1_BAT_CAP : ACTS[inp.act].smallCap;
    let n = 0;
    for (const seq of parts) for (const p of seq) if (p.role === k) { const take = Math.max(0, Math.min(p.n, cap - n)); p.n = take; n += take; }
    for (const seq of parts) for (let i = seq.length - 1; i >= 0; i--) if (seq[i]!.n <= 0) seq.splice(i, 1);
  }
}

function badges(groups: WaveGroup[], affix: string, parts: Part[]): string[] {
  const out = new Set<string>();
  for (const g of groups) {
    for (const t of ENEMIES[g.kind].traits) if (t !== "elite" && t !== "boss") out.add(t);
    if (g.elite) out.add("elite");
  }
  if (parts.some((p) => p.intro)) out.add("new");
  if (affix) out.add(affix);
  return [...out];
}

/** Without the run's seen list: roles available on the previous floor count as seen. */
function defaultSeen(act: Act, floor: number, first: boolean): EnemyId[] {
  if (first) return [];
  const pa = floor > 1 ? act : ((act - 1) || 1) as Act;
  const pf = floor > 1 ? floor - 1 : act === 1 ? 0 : 9;
  if (pf <= 0) return [];
  return WAVE_ROLES.filter((r) => unlockWave(pa, pf, r) < 99);
}
