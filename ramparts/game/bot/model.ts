// The bot's picture of a battle: road geometry, pad coverage, and a rough "effective damage"
// value for a tower on a pad against the enemies it expects. A player's mental model, not the
// rules: it only decides what the bot builds, and it reads nothing a player can't see.
import type { Battle, EnemyId, Pad, SpecId, TowerId } from "../types.ts";
import { ENEMIES } from "../content/battle/enemies.ts";
import { TOWERS, SPEC_OF, statsOf } from "../content/battle/towers.ts";
import { laneAt } from "../map.ts";
import { towerRange } from "../battle/query.ts";
import { THRU } from "./thru.ts";

export interface Pt { x: number; y: number; s: number; lane: number }

export interface Geo {
  ground: Pt[];
  air: Pt[];
  step: number;
  cache: Map<number, number>;
}

const STEP = 0.25;

export function geo(b: Battle): Geo {
  const ground: Pt[] = [], air: Pt[] = [];
  const v = { x: 0, y: 0 };
  b.map.lanes.forEach((l, i) => { for (let s = 0; s <= l.length; s += STEP) { laneAt(l, s, v); ground.push({ x: v.x, y: v.y, s, lane: i }); } });
  b.map.air.forEach((l, i) => { for (let s = 0; s <= l.length; s += STEP) { laneAt(l, s, v); air.push({ x: v.x, y: v.y, s, lane: i }); } });
  return { ground, air, step: STEP, cache: new Map() };
}

/** Road length (u) within r of a point; merged lanes count once per lane (a merge pad sees both). */
export function cover(g: Geo, x: number, y: number, r: number, air = false): number {
  const key = ((Math.round(x * 50) * 2048 + Math.round(y * 50)) * 1024 + Math.round(r * 100)) * 2 + (air ? 1 : 0);
  const hit = g.cache.get(key);
  if (hit !== undefined) return hit;
  let n = 0;
  const r2 = r * r;
  for (const p of air ? g.air : g.ground) if ((p.x - x) ** 2 + (p.y - y) ** 2 <= r2) n++;
  const out = n * g.step;
  g.cache.set(key, out);
  return out;
}

// ---------------------------------------------------------------- what the bot expects to face
/** One role in a coming group: `w` is its total health, `spread` the column's length on the road (u). */
export interface Foe { kind: EnemyId; w: number; wave: number; lives: number; spread: number; speed: number; hp: number; armour: number; ward: number; air: boolean; stealth: boolean; small: boolean; big: boolean; shield: boolean; healer: boolean }

export function foe(b: Battle, kind: EnemyId, w: number, spread = 6): Foe {
  const d = ENEMIES[kind];
  let armour = d.armour;
  if (b.act === 2) { if (kind === "brute") armour = 65; if (kind === "shieldbearer") armour = 45; }
  return {
    kind, w, wave: 0, lives: Math.max(1, Math.round(w / Math.max(1, d.hp))) * d.leak, spread, speed: d.speed, hp: d.hp, armour, ward: d.ward, air: d.flying, stealth: kind === "shade", small: d.size === "S",
    big: d.size === "L" || d.size === "XL" || d.size === "boss", shield: kind === "shieldbearer", healer: kind === "shaman",
  };
}

// ---------------------------------------------------------------- tower numbers
export interface Shape {
  /** Single-target damage per second before resist. */
  dps: number;
  /** How many enemies a typical attack touches. */
  area: number;
  type: "phys" | "magic" | "fire" | "pure" | "none";
  pierce: number;
  air: boolean;
  ground: boolean;
  /** Fraction of enemy speed taken away while in range (control). */
  slow: number;
  /** Soldiers: count x hp, dps. */
  soldiers?: { n: number; hp: number; dps: number; holds: number };
  support: boolean;
}

const geom = (n: number, fall = 0.25) => { let s = 0, f = 1; for (let i = 0; i < n; i++) { s += f; f *= 1 - fall; } return s; };

const SHAPES = new Map<string, Shape>();
export function shape(kind: TowerId, level: number, spec: SpecId | null): Shape {
  const key = `${kind}${level}${spec}`;
  let v = SHAPES.get(key);
  if (!v) SHAPES.set(key, (v = shape0(kind, level, spec)));
  return v;
}

function shape0(kind: TowerId, level: number, spec: SpecId | null): Shape {
  const st = statsOf(kind, level, spec);
  const d = TOWERS[kind];
  const sp = level >= 4 && spec ? d.specs[SPEC_OF[spec].index] : null;
  const air = sp ? sp.air : d.air;
  let dps = st.int && st.dmg ? st.dmg / st.int : 0;
  let area = 1, slow = 0;
  const crit = (st.crit ?? 0) / 100 * ((st.critM ?? 2) - 1);
  dps *= 1 + crit;
  if (st.splash) area = 1 + st.splash * 1.4;
  if (st.targets && (kind === "storm" || spec === "arcanist")) area = 1 + (geom(st.targets, st.fall ?? 0.25) - 1) * 0.6;
  if (spec === "volley") { area = 2.2; dps += 8 * 12 / (5 * st.int!) ; }
  if (spec === "firestorm") { dps = (st.targets ?? 3) * st.dmg! / st.int!; area = 1.8; dps += (st.burn ?? 0) * 0.8; }
  if (kind === "pyre" && spec !== "firestorm") { dps = st.dmg! + (st.burn ?? 0) * 0.7; area = 2.2; if (spec === "inferno") { dps *= 1.6; area = 1.3; } }
  if (kind === "thornwood") { dps = st.thorns! * 1; area = 2.5; slow = 0.1 * (st.roots ?? 1); if (spec === "bramble") slow += 0.2; }
  if (kind === "frost") { slow = 0.3; if (spec === "glacier") { slow = 0.42; dps += 30 / 3.5; area = 1.6; } if (spec === "shatter") slow = 0.32; }
  if (kind === "alchemist") { slow = 0.15; if (spec === "acid") dps += 15 * 0.8; if (spec === "naphtha") dps += 90 / 4 / st.int! * 1.5; }
  if (spec === "mortar") slow = 0.1;
  if (spec === "shrapnel") dps += 4 * 18 / st.int!;
  if (spec === "arcanist") dps += 50 / 4 / st.int! * 1.5;
  if (spec === "overload") { dps += 40 / 3 / st.int! * 2; slow = 0.12; }
  if (spec === "tempest") dps += 0;
  if (spec === "harpoon") slow = 0.1;
  if (spec === "siegebolt") area = 2.0;
  let soldiers: Shape["soldiers"];
  if (st.soldiers) {
    const s = st.soldiers;
    soldiers = { n: s.count, hp: s.hp * (1 + s.armour / 100), dps: s.count * s.dmg / s.int, holds: s.count * s.holds };
    if (kind === "barracks") dps = soldiers.dps;
    else dps += soldiers.dps;
  }
  const type = (st.type ?? "none") as Shape["type"];
  return { dps, area, type, pierce: st.pierce ?? 0, air, ground: true, slow, soldiers, support: d.support };
}

/** The measured role a foe behaves like (game/bot/thru.ts streams). */
const ROLE: Partial<Record<EnemyId, string>> = {
  footman: "footman", runner: "runner", brute: "brute", acolyte: "acolyte", swarmling: "swarmling", bat: "bat", shieldbearer: "shieldbearer",
  drake: "drake", shaman: "acolyte", splitter: "footman", slime: "swarmling", slimelet: "swarmling", shade: "runner", sapper: "shieldbearer",
  brood: "swarmling", pup: "runner", sandling: "swarmling", shard: "swarmling", risen: "footman", skeleton: "footman",
  "ember-runner": "runner", "ember-drake": "drake",
};

/** What a stream test cannot see: soldiers get swarmed and die in a real wave, and their kills in
 *  battle come to about 0.4x their stream rate (scripts/sim.ts "dmg per gold"). Holding is valued
 *  separately, as the kill-box bonus it gives the towers around the rally point. Thornwood auras
 *  likewise see a packed stream in the test and a spread column in battle (0.6x). */
const FIELD: Partial<Record<TowerId, number>> = { barracks: 0.4, thornwood: 0.6 };

const keyOf = (kind: TowerId, level: number, spec: SpecId | null) => (level >= 4 && spec ? spec : `${kind}${Math.min(3, level)}`);

/** Health a tower on a pad can take from each coming group: its measured rate against that role,
 *  times the seconds the column spends in its reach ((road covered + column length) / speed). */
export function towerVec(b: Battle, g: Geo, kind: TowerId, level: number, spec: SpecId | null, pad: Pad, foes: Foe[], beacon: boolean): number[] {
  const s = shape(kind, level, spec);
  const row = s.support ? undefined : THRU[keyOf(kind, level, spec)];
  if (!row) return foes.map(() => 0);
  const r = kind === "barracks" ? 2.6 : towerRange(b, kind, level, spec, pad);
  const gc = cover(g, pad.x, pad.y, r);
  const ac = s.air ? cover(g, pad.x, pad.y, r, true) : 0;
  return foes.map((f) => {
    const c = f.air ? ac : gc;
    if (c <= 0) return 0;
    const role = f.big && !f.air ? "brute" : ROLE[f.kind] ?? (f.air ? "drake" : "brute");
    let v = (row.hp[role] ?? 0) * (FIELD[kind] ?? 1);
    if (s.type === "fire") v *= b.act === 4 ? 0.75 : b.act === 3 ? 1.2 : 1;
    if (f.stealth && !beacon) v *= kind === "thornwood" || spec === "glacier" ? 1 : s.area > 1.5 ? 0.25 : 0.03;
    // a tower that sees little road idles between targets: its rate scales with road in reach
    return v * Math.min(1.5, c / ((f.air ? row.acov : row.cov) || row.cov)) * (c + f.spread) / Math.max(0.3, f.speed);
  });
}
