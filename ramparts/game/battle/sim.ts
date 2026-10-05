// newBattle + the 30 Hz step (systems 1, 2, 13.4).
import type { Battle, BattleArgs, EnemyId } from "../types.ts";
import { Rng, hash } from "../rng.ts";
import { ACTS } from "../content/battle/acts.ts";
import { generateMap, pickLayout } from "../map.ts";
import { computeMods, has } from "./mods.ts";
import { T, X, alive, emit, enemies, remaining, towers, type B, type Internal } from "./internal.ts";
import { generateWaves } from "./waves.ts";
import { moveEnemies, processDeaths, runSpawner } from "./enemies.ts";
import { tickStatuses } from "./statuses.ts";
import { auraSlows, computeBuffs, updateProjectiles, updateTowers, watchers, addZone } from "./towers.ts";
import { updateSoldiers } from "./soldiers.ts";
import { initSpells, tickSpells } from "./spells.ts";

/**
 * What newBattle takes: the run's BattleArgs (types.ts). `elite` may also be a bare EnemyId,
 * and `quiet` drops events for headless bot runs.
 */
export type NewBattle = Omit<BattleArgs, "elite"> & { elite?: BattleArgs["elite"] | EnemyId; quiet?: boolean };

/** Stream seeds (systems 13.2). */
const STREAM = { map: 1, waves: 2, combat: 3, cosmetic: 4 } as const;

/** The waves a battle would get (shared by newBattle and rosterFor). */
function wavesFor(o: NewBattle, lanes: number) {
  const mods = computeMods(o.loadout, o.act);
  const act = ACTS[o.act];
  const elite = typeof o.elite === "string" ? { kind: o.elite, affixes: undefined } : o.elite;
  const boss = o.kind === "boss" ? o.boss ?? act.bosses[0] : undefined;
  const champion = o.champion ?? (o.kind === "boss" && o.act === 4 && !!boss && boss !== "tyrant");
  const gen = generateWaves({
    rng: new Rng(hash(o.seed, STREAM.waves)), act: o.act, kind: o.kind, floor: o.floor, lanes, boss,
    archetypes: o.archetypes, elite: elite?.kind, eliteAffixes: elite?.affixes, fewerWaves: o.fewerWaves, champion,
    asc: o.loadout.ascension, threatMul: mods.threatMul, haunted: has(mods, "haunted"), firstBattle: !!o.loadout.firstBattle,
    seen: o.loadout.seen,
  });
  return { mods, gen, boss, champion };
}

/** Every role a battle will send (Foresight on the run map), without building the map or the sim. */
export function rosterFor(o: NewBattle): EnemyId[] {
  const layout = pickLayout(new Rng(hash(hash(o.seed, STREAM.map), 0x6d6170)), o.act);
  return wavesFor(o, layout === "single" ? 1 : 2).gen.roster;
}

export function newBattle(o: NewBattle): Battle {
  const act = ACTS[o.act];
  const mods0 = computeMods(o.loadout, o.act);
  const map = generateMap(hash(o.seed, STREAM.map), o.act, {
    bonusPads: mods0.bonusPads, ninth: has(mods0, "ninth-pad"), rubble: o.loadout.ascension >= 7 ? 60 : 0,
  });
  const { mods, gen, champion } = wavesFor(o, map.lanes.length);
  mods.bossHp += (o.bossHpPct ?? 0) / 100;
  const gold = (o.loadout.firstBattle ? 320 : act.startGold) + mods.startGold + (o.gold ?? 0);
  const x: Internal = {
    combat: hash(o.seed, STREAM.combat), cos: hash(o.seed, STREAM.cosmetic), nextId: 1, mods,
    spawnQ: [], spawning: false, lastSpawnTick: 0, lastWaveStarted: false, endTick: -1, built: 0, drill: false,
    horseshoe: false, roof: 0, phoenix: false, synergies: [], echo: false, echoQ: [], rallyT: 0, hornT: 0, flareT: 0, stormT: 0,
    pressRaw: 0, supplies: [...(o.loadout.supplies ?? [])].slice(0, 2), deathQ: [], waveThreat: gen.threat, waveOf: -1, graves: [],
    twin: false, twinTower: 0, doubt: has(mods, "doubt") ? T(20) : -1, padsUsed: [], kindsUsed: [], sold: 0, hold: true,
    treasuryCrowns: 0, quiet: !!o.quiet, champion, bossDead: false, elites: 0, elitesKilled: 0, waveKills: [],
  };
  while (x.supplies.length < 2) x.supplies.push(null);
  const b: B = {
    seed: o.seed, act: o.act, kind: o.kind, floor: o.floor, map, loadout: o.loadout, tick: 0, phase: "setup",
    gold, lives: o.loadout.lives, waves: gen.waves, next: 0, countdown: -1, enemies: [], towers: [], soldiers: [],
    projectiles: [], zones: [], spells: [], events: [], pressure: 0,
    stats: { leaked: 0, livesLost: 0, kills: 0, goldEarned: 0, calledEarly: 0, spellsCast: 0, sold: 0, damageBy: {}, biggestHit: 0, maxPads: 0, maxGold: gold, treasuryCrowns: 0 },
    theme: o.theme, roster: gen.roster, x,
  };
  if (o.bounty) b.bounty = { id: o.bounty, ok: true };
  b.supplies = [...x.supplies];
  b.spells = initSpells(b);
  // Bubbling Retort: 3 oil puddles on the longest straight, until lit
  if (has(mods, "bubbling-retort")) retort(b);
  return b;
}

function retort(b: Battle) {
  const l = b.map.lanes[0]!;
  let best = 0, bi = 0;
  for (let i = 1; i < l.points.length; i++) { const s = l.cum[i]! - l.cum[i - 1]!; if (s > best) { best = s; bi = i; } }
  const a = l.points[bi - 1]!, c = l.points[bi]!;
  for (let k = 1; k <= 3; k++) {
    const f = k / 4;
    addZone(b, "oil", a.x + (c.x - a.x) * f, a.y + (c.y - a.y) * f, 0.9, 1e9, 0, { oil: true, slow: 0.25 });
  }
}

/** Start the next wave: interest first, then wave pay, then the call-early bonus (systems 2). */
export function startWave(b: Battle, early: boolean, bonus: number) {
  const x = X(b), m = x.mods, act = ACTS[b.act];
  const w = b.next;
  if (w >= b.waves.length) return;
  if (b.phase === "setup") b.phase = "running";
  let interest = 0, income = 0;
  if (w >= 1) {
    const cap = Math.round(act.interestCap * Math.max(0, 1 + m.interestCapPct));
    interest = Math.min(cap, Math.floor(b.gold * 0.05));
    b.gold += interest;
    income = Math.round(12 * act.bountyMul);
    b.gold += income;
    const tr = towers(b).filter((t) => t.spec === "treasury" && t.building <= 0);
    for (const t of tr) t.waves++;
    if (tr.length) x.treasuryCrowns++;
    b.stats.treasuryCrowns = x.treasuryCrowns;
  }
  b.gold += bonus;
  b.stats.goldEarned += interest + income + bonus;
  emit(b, 0, 0, { e: "wave_start", wave: w, early, bonus, interest, income });
  const plan = b.waves[w]!;
  const lanes = b.map.lanes.length;
  for (const g of plan.groups) for (let k = 0; k < g.count; k++)
    x.spawnQ.push({ tick: b.tick + g.delay + k * g.spacing, kind: g.kind, lane: g.lane % lanes, wave: w, elite: !!g.elite, affixes: g.affixes ?? [], boss: !!plan.boss, noGold: g.affixes?.includes("haunted") });
  x.spawnQ.sort((p, q) => p.tick - q.tick);
  x.spawning = true;
  x.waveOf = w;
  b.next = w + 1;
  b.countdown = -1;
  if (b.next >= b.waves.length) x.lastWaveStarted = true;
}

export function step(b: Battle): void {
  const x = X(b);
  if (b.phase === "won") return;
  if (b.phase === "lost") {
    if (b.tick >= x.endTick) return;
    b.tick++;
    moveQuiet(b);
    return;
  }
  b.tick++;
  if (b.phase === "setup") {
    if (x.doubt > 0 && --x.doubt === 0) startWave(b, false, 0);
    return;
  }
  // 2. spawners
  runSpawner(b);
  // 3. statuses, zones, spells
  tickSpells(b);
  tickStatuses(b);
  auraSlows(b);
  watchers(b);
  // 4. enemies (move, plant, channel, heal, shields, boss abilities); leaks happen here
  moveEnemies(b);
  if (b.phase !== "running") return;
  // 5. soldiers
  updateSoldiers(b);
  // 6. towers
  computeBuffs(b);
  updateTowers(b);
  // 7. projectiles
  updateProjectiles(b);
  // 8. deaths
  processDeaths(b);
  // cleanup
  const es = b.enemies;
  let n = 0;
  for (let i = 0; i < es.length; i++) if (!(es[i] as ReturnType<typeof enemies>[number]).gone) es[n++] = es[i]!;
  es.length = n;
  // 9. victory (a boss battle ends the tick the boss dies; the rest flee)
  if (x.bossDead || (x.lastWaveStarted && !x.spawning && x.spawnQ.length === 0 && !enemies(b).some(alive))) {
    b.phase = "won";
    if (b.bounty?.id === "quick-march" && b.stats.calledEarly < 5) b.bounty.ok = false;
    if (b.bounty?.id === "hold-the-gate" && !x.hold) b.bounty.ok = false;
    b.stats.phoenix = x.phoenix;
    emit(b, 0, 0, { e: "victory" });
    return;
  }
  // 10. wave timer
  if (b.countdown > 0 && --b.countdown === 0) startWave(b, false, 0);
  // bounty watch
  if (b.bounty) {
    const id = b.bounty.id, gm = ACTS[b.act].bountyMul;
    if (id === "lean-purse" && b.gold > Math.round(300 * gm)) b.bounty.ok = false;
    if (id === "hold-the-gate" && !x.hold) b.bounty.ok = false;
  }
  if (b.gold > b.stats.maxGold) b.stats.maxGold = b.gold;
  // 11. pressure (every 0.5 s, smoothed over ~1 s)
  if (b.tick % 15 === 0) {
    let p = 0;
    for (const e of enemies(b)) if (alive(e)) { const f = 1 - remaining(e) / Math.max(1, e.laneLen); p += Math.max(0.3, e.boss ? 10 : e.threat) * f * f; }
    const budget = x.waveThreat[Math.max(0, x.waveOf)] ?? 10;
    x.pressRaw = Math.min(1, p / Math.max(1, budget));
    b.pressure = b.pressure * 0.5 + x.pressRaw * 0.5;
    emit(b, 0, 0, { e: "pressure", value: b.pressure });
  }
}

/** After defeat: enemies keep walking for the slow-motion finish; nothing else happens. */
function moveQuiet(b: Battle) {
  for (const e of enemies(b)) { e.px = e.x; e.py = e.y; }
}
