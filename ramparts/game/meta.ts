// The profile: renown, the unlock track, perks, per-commander ascensions, the codex, run history.
// Pure; the surface persists it through surface/storage.ts (pal's storage, synced field by field by
// the rules in pal.json: run-meta.md 8, content.md 13, R26, R27).
import type {
  BoonId, BossId, CommanderId, EnemyId, EventId, RelicId, RunState, SpecId, TowerId,
} from "./types.ts";
import { LEVELS, PERKS, RENOWN, UNLOCKS, type UnlockDef } from "./content/run/unlocks.ts";
import { COMMANDERS } from "./content/run/commanders.ts";
import { START_TOWERS, TOWERS } from "./content/run/towers.ts";
import { ASCENSIONS, MAX_ASCENSION } from "./content/run/ascensions.ts";
import { BOSS_INFO } from "./content/run/map.ts";
import { BOONS } from "./content/run/boons.ts";
import { RELICS } from "./content/run/relics.ts";
import { EVENTS } from "./content/run/events.ts";
import { resultLine } from "./run/summary.ts";
import type { RunBook } from "./types.ts";

export const PROFILE_VERSION = 1;
export const HISTORY_MAX = 50;

export interface Codex {
  towers: Partial<Record<TowerId, { built: number; kills: number; damage: number; topWins: number; specs: SpecId[] }>>;
  boons: Record<BoonId, { seen: number; taken: number; tempered: number }>;
  relics: Record<RelicId, { seen: number; taken: number; wins: number }>;
  enemies: Partial<Record<EnemyId, { met: number; killed: number; leaked: number; worstLeak: number }>>;
  bosses: Partial<Record<BossId, { met: number; defeated: number; fastest: number | null; ascBeaten: number }>>;
  events: Record<EventId, { seen: number; choices: string[] }>;
  commanders: Partial<Record<CommanderId, { runs: number; wins: number; best: number; towers: Partial<Record<TowerId, number>> }>>;
}

export interface RunRecord {
  seed: number;
  commander: CommanderId;
  ascension: number;
  won: boolean;
  result: string;
  act: number;
  floor: number;
  ticks: number;
  towers: { tower: TowerId; boons: number }[];
  relics: RelicId[];
  top: TowerId | null;
  renown: number;
  /** Surface-supplied time (ms since epoch); rules never read a clock. */
  at?: number;
}

export interface Profile {
  version: number;
  renown: number;
  /** Renown levels reached (0-20). */
  level: number;
  /** Next index into UNLOCKS (skip-ahead keeps it past anything already unlocked). */
  track: number;
  unlocked: {
    towers: TowerId[];
    commanders: CommanderId[];
    /** Relics unlocked by the track (relics with unlock 0 are always in the pool). */
    relics: RelicId[];
    events: EventId[];
    titles: string[];
  };
  /** Unlocked perks and whether each is on. */
  perks: Record<string, boolean>;
  /** Highest ascension unlocked per commander (R26). */
  ascension: Partial<Record<CommanderId, number>>;
  /** R27: the next run with this commander offers a rare relic in its blessing. */
  blessingRare: Partial<Record<CommanderId, boolean>>;
  reachedAct3: boolean;
  furthest: { act: number; floor: number };
  codex: Codex;
  history: RunRecord[];
  totals: { runs: number; wins: number; streak: number; bestStreak: number; fastestWin: number | null; mostLivesWin: number };
  tutorial: Record<string, boolean>;
  lastCommander: CommanderId;
  /** The surface's settings, kept as-is. */
  settings: Record<string, unknown>;
}

export function newProfile(): Profile {
  return {
    version: PROFILE_VERSION, renown: 0, level: 0, track: 0,
    unlocked: { towers: [...START_TOWERS], commanders: ["marshal"], relics: [], events: [], titles: [] },
    perks: {}, ascension: {}, blessingRare: {}, reachedAct3: false, furthest: { act: 0, floor: 0 },
    codex: { towers: {}, boons: {}, relics: {}, enemies: {}, bosses: {}, events: {}, commanders: {} },
    history: [], totals: { runs: 0, wins: 0, streak: 0, bestStreak: 0, fastestWin: null, mostLivesWin: 0 },
    tutorial: {}, lastCommander: "marshal", settings: {},
  };
}

/** Everything unlocked, every perk on, every ascension open (bot personas, tests, the daily siege's base). */
export function fullProfile(): Profile {
  const p = newProfile();
  while (p.track < UNLOCKS.length) { unlock(p, UNLOCKS[p.track]!); p.track++; }
  p.level = LEVELS.length; p.renown = LEVELS[LEVELS.length - 1]!;
  for (const c of Object.keys(COMMANDERS) as CommanderId[]) { unlockCommander(p, c); p.ascension[c] = MAX_ASCENSION; }
  p.reachedAct3 = true;
  return p;
}

// ---------------------------------------------------------------- renown
export interface TallyLine { label: string; count: number; each: number; renown: number }
export interface RenownTally { lines: TallyLine[]; base: number; mult: number; total: number }

const book = (run: RunState): RunBook => run.book!;

/** Line-by-line renown for a finished (or abandoned) run (content.md 13.1). */
export function renownFor(run: RunState): RenownTally {
  const b = book(run);
  const lines: TallyLine[] = [];
  const add = (label: string, count: number, each: number) => { if (count > 0) lines.push({ label, count, each, renown: count * each }); };
  const final = run.over?.won ? 1 : 0;
  const actBosses = b.bossesWon.length - final;
  add("Floors cleared", b.floors, RENOWN.floor);
  add("Elites defeated", b.elitesWon, RENOWN.elite);
  add("Bosses defeated", actBosses, RENOWN.actBoss);
  add("The Ember Tyrant defeated", final, RENOWN.finalBoss);
  add("Bounties met", b.bounties, RENOWN.bounty);
  add("No lives lost in act I", run.act > 1 && b.lostAct1 === 0 ? 1 : 0, RENOWN.cleanActI);
  add("First meeting", b.bossesMet.filter((x) => !b.codexBosses.includes(x)).length, RENOWN.firstBoss);
  add(`First win with ${COMMANDERS[run.commander].name}`, run.over?.won && !b.codexWins.includes(run.commander) ? 1 : 0, RENOWN.firstWin);
  const base = lines.reduce((a, l) => a + l.renown, 0);
  const mult = 1 + 0.1 * run.ascension;
  return { lines, base, mult, total: Math.floor(base * mult + 0.5) };
}

// ---------------------------------------------------------------- unlocks
export interface UnlockNote { name: string; kind: string; level?: number }

export function isUnlocked(p: Profile, u: UnlockDef): boolean {
  const i = u.item;
  switch (i.kind) {
    case "tower": return p.unlocked.towers.includes(i.tower);
    case "relics": return i.relics.every((x) => p.unlocked.relics.includes(x));
    case "perk": return i.perk in p.perks;
    case "commander": return p.unlocked.commanders.includes(i.commander);
    case "events": return i.events.every((x) => p.unlocked.events.includes(x));
    case "title": return p.unlocked.titles.includes(i.title);
  }
}

function unlock(p: Profile, u: UnlockDef) {
  const i = u.item, add = <T>(xs: T[], x: T) => { if (!xs.includes(x)) xs.push(x); };
  switch (i.kind) {
    case "tower": add(p.unlocked.towers, i.tower); break;
    case "relics": for (const x of i.relics) add(p.unlocked.relics, x); break;
    case "perk": if (!(i.perk in p.perks)) p.perks[i.perk] = true; break;
    case "commander": unlockCommander(p, i.commander); break;
    case "events": for (const x of i.events) add(p.unlocked.events, x); break;
    case "title": add(p.unlocked.titles, i.title); break;
  }
}

/** A commander brings its starting towers (and the Seer the Beacon, the Warden the Grove). */
function unlockCommander(p: Profile, c: CommanderId) {
  if (!p.unlocked.commanders.includes(c)) p.unlocked.commanders.push(c);
  for (const t of [...COMMANDERS[c].towers, ...COMMANDERS[c].brings]) if (!p.unlocked.towers.includes(t)) p.unlocked.towers.push(t);
}

/** Take the next item on the track that isn't already unlocked (the skip-ahead rule). */
function takeTrack(p: Profile): UnlockDef | null {
  while (p.track < UNLOCKS.length && isUnlocked(p, UNLOCKS[p.track]!)) p.track++;
  const u = UNLOCKS[p.track];
  if (!u) return null;
  unlock(p, u);
  p.track++;
  return u;
}

/** The next thing the track will unlock and how much renown is left to it. */
export function nextUnlock(p: Profile): { name: string; level: number; need: number } | null {
  if (p.level >= LEVELS.length) return null;
  let t = p.track;
  while (t < UNLOCKS.length && isUnlocked(p, UNLOCKS[t]!)) t++;
  const u = UNLOCKS[t];
  if (!u) return null;
  return { name: u.name, level: p.level + 1, need: LEVELS[p.level]! - p.renown };
}

// ---------------------------------------------------------------- apply a run
export interface ApplyResult { profile: Profile; tally: RenownTally; unlocks: UnlockNote[]; lines: string[] }

export function applyRun(profile: Profile, run: RunState, at?: number): ApplyResult {
  const p = structuredClone(profile);
  const b = book(run);
  const won = !!run.over?.won;
  const tally = renownFor(run);
  const unlocks: UnlockNote[] = [];
  const lines: string[] = [];
  const furthestBefore = { ...p.furthest };
  const cmd = run.commander;

  // renown and the track
  p.renown += tally.total;
  while (p.level < LEVELS.length && p.renown >= LEVELS[p.level]!) {
    p.level++;
    const u = takeTrack(p);
    if (u) unlocks.push({ name: u.name, kind: u.item.kind, level: p.level });
  }

  // milestones (R27): the Seer on reaching act III; ascensions per commander on a win
  if (run.act >= 3 && !p.reachedAct3) {
    p.reachedAct3 = true;
    if (!p.unlocked.commanders.includes("seer")) { unlockCommander(p, "seer"); unlocks.push({ name: COMMANDERS.seer.name, kind: "commander" }); }
  }
  const c = (p.codex.commanders[cmd] ??= { runs: 0, wins: 0, best: -1, towers: {} });
  if (won) {
    if (c.wins === 0) p.blessingRare[cmd] = true;
    if (!b.seeded) {
      const next = Math.min(MAX_ASCENSION, run.ascension + 1);
      if (next > (p.ascension[cmd] ?? 0)) {
        p.ascension[cmd] = next;
        unlocks.push({ name: `${COMMANDERS[cmd].name}: Ascension ${next}`, kind: "ascension" });
      }
    }
    c.best = Math.max(c.best, run.ascension);
  }
  if (b.blessingRare) p.blessingRare[cmd] = false;

  // codex
  c.runs++;
  if (won) c.wins++;
  for (const t of run.loadout.towers) c.towers[t] = (c.towers[t] ?? 0) + 1;
  for (const id of run.seenEvents) (p.codex.events[id] ??= { seen: 0, choices: [] }).seen++;
  for (const k of b.choices) {
    const [ev, ch] = k.split("/") as [string, string];
    const e = (p.codex.events[ev] ??= { seen: 0, choices: [] });
    if (!e.choices.includes(ch)) e.choices.push(ch);
  }
  for (const boss of b.bossesMet) (p.codex.bosses[boss] ??= { met: 0, defeated: 0, fastest: null, ascBeaten: -1 }).met++;
  for (const boss of b.bossesWon) {
    const e = p.codex.bosses[boss]!;
    e.defeated++; e.ascBeaten = Math.max(e.ascBeaten, run.ascension);
  }
  for (const id of b.seen.boons) (p.codex.boons[id] ??= { seen: 0, taken: 0, tempered: 0 }).seen++;
  for (const id of run.loadout.boons) p.codex.boons[id]!.taken++;
  for (const id of run.loadout.tempered) p.codex.boons[id]!.tempered++;
  for (const id of b.seen.relics) (p.codex.relics[id] ??= { seen: 0, taken: 0, wins: 0 }).seen++;
  for (const id of run.loadout.relics) { const e = (p.codex.relics[id] ??= { seen: 0, taken: 0, wins: 0 }); e.taken++; if (won) e.wins++; }
  const top = topOf(run.stats.damageBy);
  for (const [t, d] of Object.entries(run.stats.damageBy) as [TowerId, number][]) towerEntry(p, t).damage += d;
  if (won && top) towerEntry(p, top).topWins++;

  // history and totals
  const ticks = run.stats.timeTicks;
  p.history.unshift({
    seed: run.seed, commander: cmd, ascension: run.ascension, won, result: resultLine(run),
    act: run.over?.act ?? run.act, floor: run.over?.floor ?? run.floor, ticks,
    towers: run.loadout.towers.map((t) => ({ tower: t, boons: run.loadout.boons.filter((x) => towerOfBoon(run, x) === t).length })),
    relics: [...run.loadout.relics], top, renown: tally.total, ...(at !== undefined ? { at } : {}),
  });
  p.history = p.history.slice(0, HISTORY_MAX);
  const T = p.totals;
  T.runs++;
  if (won) {
    T.wins++; T.streak++; T.bestStreak = Math.max(T.bestStreak, T.streak);
    if (ticks > 0) T.fastestWin = T.fastestWin === null ? ticks : Math.min(T.fastestWin, ticks);
    T.mostLivesWin = Math.max(T.mostLivesWin, run.loadout.lives);
  } else T.streak = 0;
  const reached = { act: run.over?.act ?? run.act, floor: run.over?.floor ?? run.floor };
  if (reached.act > p.furthest.act || (reached.act === p.furthest.act && reached.floor > p.furthest.floor)) {
    p.furthest = reached;
    if (!won && furthestBefore.act > 0) lines.push(`Your furthest yet: act ${roman(reached.act)}, floor ${reached.floor}.`);
  }
  p.lastCommander = cmd;

  const nu = nextUnlock(p);
  if (nu) lines.push(`${nu.need} renown to ${nu.name}.`);
  if (won) {
    const next = p.ascension[cmd] ?? 0;
    const a = ASCENSIONS[next - 1];
    if (a && next > run.ascension) lines.push(`Next: Ascension ${next}, ${a.name}.`);
  }
  return { profile: p, tally, unlocks, lines };
}

const roman = (n: number) => ["", "I", "II", "III", "IV"][n] ?? String(n);

function towerOfBoon(run: RunState, b: BoonId): TowerId | null {
  return run.loadout.boonOn?.[b] ?? (b in BOON_TOWER ? BOON_TOWER[b]! : null);
}
const BOON_TOWER: Record<string, TowerId> = Object.fromEntries(BOONS.filter((b) => b.tower).map((b) => [b.id, b.tower!]));

function topOf(d: Partial<Record<TowerId, number>>): TowerId | null {
  let best: TowerId | null = null, v = 0;
  for (const [t, x] of Object.entries(d) as [TowerId, number][]) if (x > v) { v = x; best = t; }
  return best;
}

function towerEntry(p: Profile, t: TowerId) {
  return (p.codex.towers[t] ??= { built: 0, kills: 0, damage: 0, topWins: 0, specs: [] });
}

// ---------------------------------------------------------------- codex helpers for battle data
export interface BattleCodex {
  met?: EnemyId[];
  killed?: Partial<Record<EnemyId, number>>;
  leaked?: Partial<Record<EnemyId, number>>;
  built?: Partial<Record<TowerId, number>>;
  towerKills?: Partial<Record<TowerId, number>>;
  specs?: { tower: TowerId; spec: SpecId }[];
  bossTicks?: { boss: BossId; ticks: number };
}

/** Fold one battle's codex facts into the profile (the surface calls it after each battle). */
export function codexRecord(profile: Profile, d: BattleCodex): Profile {
  const p = structuredClone(profile);
  const en = (e: EnemyId) => (p.codex.enemies[e] ??= { met: 0, killed: 0, leaked: 0, worstLeak: 0 });
  for (const e of d.met ?? []) en(e).met++;
  for (const [e, n] of Object.entries(d.killed ?? {}) as [EnemyId, number][]) en(e).killed += n;
  for (const [e, n] of Object.entries(d.leaked ?? {}) as [EnemyId, number][]) { const x = en(e); x.leaked += n; x.worstLeak = Math.max(x.worstLeak, n); }
  for (const [t, n] of Object.entries(d.built ?? {}) as [TowerId, number][]) towerEntry(p, t).built += n;
  for (const [t, n] of Object.entries(d.towerKills ?? {}) as [TowerId, number][]) towerEntry(p, t).kills += n;
  for (const { tower, spec } of d.specs ?? []) { const e = towerEntry(p, tower); if (!e.specs.includes(spec)) e.specs.push(spec); }
  if (d.bossTicks) {
    const e = (p.codex.bosses[d.bossTicks.boss] ??= { met: 0, defeated: 0, fastest: null, ascBeaten: -1 });
    e.fastest = e.fastest === null ? d.bossTicks.ticks : Math.min(e.fastest, d.bossTicks.ticks);
  }
  return p;
}

/** Settings and tutorial flags are the surface's; these keep the profile pure. */
export function withSettings(p: Profile, settings: Record<string, unknown>): Profile { return { ...structuredClone(p), settings: { ...settings } }; }
export function seenTutorial(p: Profile, id: string): Profile { const q = structuredClone(p); q.tutorial[id] = true; return q; }
export function setPerk(p: Profile, id: string, on: boolean): Profile {
  const q = structuredClone(p);
  if (id in q.perks) q.perks[id] = on;
  return q;
}

/** Codex completion 0..1 for the title screen (towers, relics met, enemies met, bosses, events, commanders). */
export function codexCompletion(p: Profile): number {
  const parts = [
    [Object.values(p.codex.towers).filter((t) => t!.built > 0).length, Object.keys(TOWERS).length],
    [Object.values(p.codex.relics).filter((x) => x.seen > 0).length, RELICS.length],
    [Object.values(p.codex.bosses).filter((x) => x!.met > 0).length, Object.keys(BOSS_INFO).length],
    [Object.keys(p.codex.events).length, EVENTS.length],
    [p.unlocked.commanders.length, Object.keys(COMMANDERS).length],
  ] as const;
  return parts.reduce((a, [n, d]) => a + Math.min(1, n / d), 0) / parts.length;
}

// ---------------------------------------------------------------- saved data
/** Bring any saved profile (older, partial, or junk) up to the current shape. */
export function migrate(raw: unknown): Profile {
  const d = newProfile();
  if (!raw || typeof raw !== "object") return d;
  const p = fill(d, raw as Record<string, unknown>) as Profile;
  // starting content is always there; commanders bring their towers
  for (const t of START_TOWERS) if (!p.unlocked.towers.includes(t)) p.unlocked.towers.push(t);
  if (!p.unlocked.commanders.includes("marshal")) p.unlocked.commanders.unshift("marshal");
  for (const c of p.unlocked.commanders) if (COMMANDERS[c]) unlockCommander(p, c);
  for (const k of Object.keys(p.perks)) if (!PERKS.some((x) => x.id === k)) delete p.perks[k];
  p.level = Math.min(p.level, LEVELS.length);
  // sync merges two machines' histories as a union: newest first again (by `at`), then the cap
  p.history = [...p.history].sort((a, b) => (b.at ?? 0) - (a.at ?? 0)).slice(0, HISTORY_MAX);
  p.version = PROFILE_VERSION;
  return p;
}

/** Deep fill: take raw values where they have the default's type, defaults elsewhere. */
function fill(def: unknown, raw: unknown): unknown {
  if (Array.isArray(def)) return Array.isArray(raw) ? raw : def;
  if (def && typeof def === "object") {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return def;
    const out: Record<string, unknown> = {};
    const d = def as Record<string, unknown>, r = raw as Record<string, unknown>;
    // keyed records (codex tabs, perks, ascension...) keep every raw key
    const open = Object.keys(d).length === 0;
    for (const k of new Set([...Object.keys(d), ...(open ? Object.keys(r) : [])])) out[k] = k in d ? fill(d[k], r[k]) : r[k];
    return out;
  }
  if (def === null) return raw === null || typeof raw === "number" ? raw : def;
  return typeof raw === typeof def ? raw : def;
}
