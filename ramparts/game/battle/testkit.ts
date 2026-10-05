// Helpers for tests and the balance bot: a quiet arena with no waves, enemies placed by hand,
// towers built ready to fire. Never used by the page.
import type { Act, Battle, EnemyId, Loadout, SpecId, TowerId } from "../types.ts";
import { laneAt } from "../map.ts";
import { newBattle, step } from "./sim.ts";
import { command } from "./commands.ts";
import { spawnEnemy, type SpawnOpts } from "./enemies.ts";
import { X, enemies, towers, placeAt, type EnemyX, type TowerX } from "./internal.ts";

export function loadout(over: Partial<Loadout> = {}): Loadout {
  return {
    commander: "marshal", towers: ["archer", "barracks", "mage", "bombard", "frost", "pyre"], boons: [], tempered: [], relics: [],
    curses: [], lives: 20, maxLives: 20, ascension: 0, supplies: [null, null], perks: [], ...over,
  };
}

/** A running battle with no waves queued and plenty of gold. */
export function arena(o: { act?: Act; seed?: number; loadout?: Partial<Loadout>; gold?: number } = {}): Battle {
  const all: TowerId[] = ["archer", "barracks", "mage", "bombard", "frost", "alchemist", "pyre", "storm", "beacon", "banner", "ballista", "thornwood"];
  const b = newBattle({ seed: o.seed ?? 7, act: o.act ?? 1, kind: "battle", floor: 3, loadout: loadout({ towers: all, ...o.loadout }), quiet: false });
  X(b).mods.l1Cost = 0; // every tower is on the table here; R18's surcharge would skew prices
  b.waves = [];
  b.phase = "running";
  b.gold = o.gold ?? 100000;
  return b;
}

/** Spawn an enemy `s` u along ground lane 0 (or the air route for flyers). */
export function put(b: Battle, kind: EnemyId, s: number, o: SpawnOpts = {}): EnemyX {
  const e = spawnEnemy(b, kind, 0, { ...o, wave: o.wave ?? -1 });
  placeAt(b, e, s);
  e.px = e.x; e.py = e.y;
  return e;
}

/** The free pad closest to the road point at distance s on lane 0. */
export function padNear(b: Battle, s: number): number {
  const v = { x: 0, y: 0 };
  laneAt(b.map.lanes[0]!, s, v);
  let best = -1, bd = Infinity;
  for (const p of b.map.pads) {
    if (towers(b).some((t) => t.pad === p.id) || p.rubble) continue;
    const d = (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
    if (d < bd) { bd = d; best = p.id; }
  }
  return best;
}

/** Road distance (lane 0) closest to a pad. */
export function sNear(b: Battle, pad: number): number {
  const p = b.map.pads[pad]!;
  const l = b.map.lanes[0]!;
  let best = 0, bd = Infinity;
  for (let s = 0; s <= l.length; s += 0.1) { const v = { x: 0, y: 0 }; laneAt(l, s, v); const d = (v.x - p.x) ** 2 + (v.y - p.y) ** 2; if (d < bd) { bd = d; best = s; } }
  return best;
}

/** Build a tower ready to fire at a level (4 = spec). */
export function tower(b: Battle, kind: TowerId, level: number, spec: SpecId | null = null, pad?: number): TowerX {
  const ph = b.phase;
  const p = pad ?? padNear(b, b.map.lanes[0]!.length * 0.5);
  const r = command(b, { t: "build", pad: p, tower: kind });
  if (!r.ok) throw new Error(`build ${kind}: ${r.reason}`);
  const t = towers(b)[towers(b).length - 1]!;
  while (t.level < Math.min(3, level)) if (!command(b, { t: "upgrade", tower: t.id }).ok) throw new Error("upgrade");
  if (level >= 4) { const r2 = command(b, { t: "specialise", tower: t.id, spec: spec! }); if (!r2.ok) throw new Error(`spec ${r2.reason}`); }
  t.building = 0;
  b.phase = ph;
  return t;
}

export function run(b: Battle, ticks: number) { for (let i = 0; i < ticks && b.phase !== "won"; i++) step(b); }

export function count(b: Battle, name: string): number { return b.events.filter((e) => e.e === name).length; }

export function live(b: Battle): EnemyX[] { return enemies(b).filter((e) => !e.dead && !e.gone); }

/** A stable digest of the state, for determinism checks. */
export function digest(b: Battle): string {
  const x = X(b);
  return JSON.stringify([b.tick, b.gold, b.lives, b.phase, x.combat, b.enemies.map((e) => [e.id, e.kind, +e.hp.toFixed(6), +e.s.toFixed(6)]),
    b.towers.map((t) => [t.id, t.level, t.cooldown, +t.stats.damage.toFixed(6)]), b.soldiers.map((s) => [s.id, +s.hp.toFixed(6), +s.x.toFixed(6)])]);
}
