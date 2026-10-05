// Internal sim state. The contract shapes (types.ts) are extended with fields the
// surface never needs; everything stays plain data so a battle can be cloned or hashed.
import type {
  Battle, BattleEvent, DamageType, Enemy, EnemyId, Lane, Projectile, SpecId, Soldier, SupplyId, Tower, Vec, Zone,
} from "../types.ts";
import { DT, HZ } from "../types.ts";
import { Rng } from "../rng.ts";
import { laneAt } from "../map.ts";
import type { Mods } from "./mods.ts";

export const T = (s: number) => Math.round(s * HZ);
export { DT, HZ };

export interface Burn { dps: number; t: number; src: number }

export interface EnemyX extends Enemy {
  dead: boolean;
  gone: boolean;            // removed (leaked or dead), awaiting cleanup
  leakV: number;
  threat: number;
  bountyV: number;
  noGold: boolean;
  summoned: boolean;
  freezeAt: number;
  noChill: boolean;
  melee: { dmg: number; int: number; magic: boolean; cleave: number } | null;
  meleeCd: number;
  pend: number;
  chillHold: number;        // ticks before chill decays (from the last chill source)
  chillIdle: number;        // ticks since last chill
  hexerT: number;           // hexed by a Hexer (cap +150%, R12)
  hexForever: number;       // Curse Engine: tower id whose hex never wears off (0 = none)
  markBy: number;
  brittleT: number;         // brittle ticks (shatter/glass bones)
  shatterPct: number;
  frozenBy: number;
  rootPct: number;          // Strangling Roots taken while rooted
  scorchPct: number;        // Scorching taken while burning
  burns: Burn[];            // Wildfire Crown extra burns
  burnSrc: number;
  burnAcc: number;          // ticks to next burn tick
  slip: number;
  heldT: number;            // ticks held continuously (Deep Roots)
  rootedBy: number;
  seg: number;
  laneLen: number;
  baseArmour: number;
  baseWard: number;
  hasted: number;           // speed bonus fraction from affix/wave
  warleader: boolean;
  regenIdle: number;
  broodStep: number;
  // role timers
  abilT: number;
  abilT2: number;
  channel: number;
  plant: number;            // sapper: ticks left planting (>0), -1 done
  plantTower: number;
  opened: number[];         // Opening Bolt: mage tower ids that already hit it
  acidAcc: number;
  shredAcc: number;
  lastBy: number;           // last tower id to hit it
  revealSrc: number;        // ticks revealed by a source (beacon/watchful/flare)
  airLane: number;          // index into map.air while flying
  groundLane: number;
  lap: number;
  spikeHit: number[];       // spike traps that already hit it
  killedBy: number;
  chain: number;            // shatter chain index that killed it
  howl: number;             // Pack-Lord howl haste ticks
  pullT: number;            // ticks of a harpoon pull left
  hatch: number;            // brood sac: ticks to hatch
  zslow: number;            // strongest zone/aura slow this tick
  onAir: boolean;           // moving on its air route (flyers, also while grounded)
  boss2?: BossX;
}

export interface BossX {
  timers: Record<string, number>;
  thresholds: number[];
  burrowT: number;          // ticks left underground
  flyT: number;
  flyS: number;             // path point it took off from (R7)
  chargeLeft: number;
  boneWardT: number;
  iceRegrow: number;
  iceMax: number;
  furyWing: boolean;
  stormT: number;
  speedMul: number;
  door: boolean;            // Lich Fury: Death's Door used
}

export interface TowerX extends Tower {
  x: number; y: number;
  spec2: SpecId | null;
  // per-tick buffs
  aspd: number; dealt: number; rangeMul: number; critAdd: number; soldierDmg: number; regenMul: number;
  banner: number;           // best banner tower id in reach
  treasury: number;         // treasury tower id in reach
  lighthouse: boolean;
  braveHearts: number;
  // timers
  t1: number; t2: number; t3: number;
  coneDx: number; coneDy: number; coneTgt: number; heatT: number;
  rain: { x: number; y: number; left: number; next: number; hits: number[] } | null;
  puddles: number[];
  soldierIds: number[];
  waves: number;            // waves stood through (Treasury crowns)
  high: boolean;
  firstShot: boolean;
}

export interface SoldierX extends Soldier {
  armour: number; ward: number; dmg: number; int: number; cd: number;
  holds: number; held: number[];
  idle: number;             // ticks out of combat
  lay: boolean;             // Lay on Hands used this life
  bond: boolean;            // Heartwood Bond used this life
  safe: number;             // untouchable ticks
  crit: number; dodge: number; whirl: number; slam: number;
  regen: number;            // fraction max HP per second
  rx: number; ry: number;   // rally slot target
  speed: number;
  frozen: number;
  knock: number[];          // enemy ids that knocked it recently (juggernaut)
  homeX: number; homeY: number;
  bondHeal: boolean;
  er: number;               // engage radius
}

export interface ProjX extends Projectile {
  dmg: number;
  type: DamageType;
  splash: number;
  pendAmt: number;
  kindOf: string;           // what resolves it: arrow, bolt, shell, flask, shard, fireball, siege, meteor, bomblet
  flags: number;
  speed: number;
  vx: number; vy: number;
  hit: number[];
  extra: number;            // kind-specific (spear hops left, chill...)
  air: boolean;             // may hit flyers
}

export interface ZoneX extends Zone {
  oil: boolean;
  lit: boolean;
  lightAt: number;          // tick at which it lights (chain), -1 none
  slow: number;
  dps: number;              // fire patch / acid dps
  acid: boolean;
  explosive: boolean;       // Naphtha
  patchDps: number;
  ls: number[];             // barrier: per-lane s
  charges: number;          // spike trap
  dmg: number;
  stop: number;             // barrier: ticks it held a boss/juggernaut
  tarBoss: number;
  roots: boolean;           // old oak seed bramble
}

export interface SpawnItem { tick: number; kind: EnemyId; lane: number; wave: number; elite: boolean; affixes: string[]; boss: boolean; noGold?: boolean; waveAffix?: string }

export interface Internal {
  combat: number;           // Rng state
  cos: number;
  nextId: number;
  mods: Mods;
  spawnQ: SpawnItem[];
  spawning: boolean;
  lastSpawnTick: number;
  lastWaveStarted: boolean;
  endTick: number;          // tick the battle stopped (defeat plays 60 ticks)
  built: number;            // towers built this battle
  drill: boolean;
  horseshoe: boolean;
  roof: number;
  phoenix: boolean;
  synergies: string[];
  echo: boolean;
  echoQ: { tick: number; spell: string; x: number; y: number }[];
  rallyT: number;
  hornT: number;
  flareT: number;
  stormT: number;
  pressRaw: number;
  supplies: (SupplyId | null)[];
  deathQ: number[];
  waveThreat: number[];
  waveOf: number;           // index of the wave currently spawning / last started
  graves: { x: number; y: number; tick: number }[];
  twin: boolean;            // Twin Crests used
  twinTower: number;        // the first tower specialised (Twin Crests)
  doubt: number;            // ticks until wave 1 starts by itself (-1 = untimed)
  padsUsed: number[];
  kindsUsed: string[];
  sold: number;
  hold: boolean;            // bounty hold-the-gate still holds
  treasuryCrowns: number;
  quiet: boolean;           // drop events (bot runs)
  champion: boolean;        // A10 Tyrant's Guard champion battle
  bossDead: boolean;
  elites: number;           // elites spawned
  elitesKilled: number;
  waveKills: number[];
}

export interface B extends Battle { x: Internal }

export const X = (b: Battle) => (b as B).x;
export const enemies = (b: Battle) => b.enemies as EnemyX[];
export const towers = (b: Battle) => b.towers as TowerX[];
export const soldiers = (b: Battle) => b.soldiers as SoldierX[];
export const projs = (b: Battle) => b.projectiles as ProjX[];
export const zones = (b: Battle) => b.zones as ZoneX[];

const R = new Rng(1);
/** A draw from the battle's combat stream (crits, picks). */
export function roll(b: Battle): number { const x = X(b); R.s = x.combat; const v = R.next(); x.combat = R.s; return v; }
export function rollInt(b: Battle, n: number): number { return Math.floor(roll(b) * n); }
export function cosmetic(b: Battle): number { const x = X(b); R.s = x.cos; const v = R.next(); x.cos = R.s; return v; }

export function nid(b: Battle): number { return X(b).nextId++; }

type EvBody = BattleEvent extends infer E ? E extends BattleEvent ? Omit<E, "tick" | "x" | "y"> : never : never;
export function emit(b: Battle, x: number, y: number, ev: EvBody): void {
  if (X(b).quiet) return;
  b.events.push({ tick: b.tick, x, y, ...ev } as BattleEvent);
  if (b.events.length > 20000) b.events.splice(0, 10000);
}

export function synergy(b: Battle, name: string, x: number, y: number) {
  const s = X(b).synergies;
  if (s.includes(name)) return;
  s.push(name);
  emit(b, x, y, { e: "synergy_first", name });
}

export const d2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.sqrt(d2(ax, ay, bx, by));

export function laneOf(b: Battle, e: EnemyX): Lane { return e.onAir ? b.map.air[e.airLane]! : b.map.lanes[e.groundLane]!; }

const tmp: Vec = { x: 0, y: 0 };
/** Put an enemy at distance s along its current route. */
export function placeAt(b: Battle, e: EnemyX, s: number) {
  const l = laneOf(b, e);
  e.s = Math.max(0, Math.min(l.length, s));
  e.seg = laneAt(l, e.s, tmp, e.seg);
  e.x = tmp.x; e.y = tmp.y;
  e.laneLen = l.length;
}

/** Remaining distance to the enemy's own exit ("First" targeting, pressure). */
export const remaining = (e: EnemyX) => e.laneLen - e.s;

export function enemyById(b: Battle, id: number): EnemyX | undefined {
  for (const e of b.enemies as EnemyX[]) if (e.id === id) return e;
  return undefined;
}
export function towerById(b: Battle, id: number): TowerX | undefined {
  for (const t of b.towers as TowerX[]) if (t.id === id) return t;
  return undefined;
}

export const alive = (e: EnemyX) => !e.dead && !e.gone;
/** Can damage reach it (not burrowed, not removed). */
export const hittable = (e: EnemyX) => alive(e) && !(e.boss?.burrowed);
export const isRevealed = (e: EnemyX) => !e.stealth || e.st.revealed > 0;
