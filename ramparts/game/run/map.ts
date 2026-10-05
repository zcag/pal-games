// Act map generation (run-meta.md 1, content.md 4.4/11, R21, R24, R26 A6, A1, A10).
// Acts I-III: 7 floors x 4 lanes walked by 5 paths, typed floor by floor, then repaired until every
// generator rule holds (mapProblems lists them; tests run it over thousands of seeds).
// Act IV: a fixed shape.
import { Rng } from "../rng.ts";
import type { Act, ActMap, BossId, EnemyId, MapNode, NodeKind } from "../types.ts";
import type { ArchId } from "../content/battle/waves.ts";
import { FLOOR_WEIGHTS } from "../content/run/economy.ts";
import {
  ACT4_NAMES, AFFIXES, ARCHETYPES, BATTLE_ELITE_CHANCE, BATTLE_THEMES, BOSSES_BY_ACT, BOUNTIES,
  ELITES, ELITE_AFFIXES_BY_ACT, ELITE_WEIGHTS, ROLE_FLOOR,
} from "../content/run/map.ts";

export const LANES = 4;
export const FLOORS = 7; // F6 camps, F7 boss

export interface GenOpts { ascension: number; boss?: BossId; champion?: BossId }

export function rollBoss(rng: Rng, act: Act): BossId {
  const bs = BOSSES_BY_ACT[act];
  return bs.length > 1 ? rng.pick(bs) : bs[0]!;
}

/** Elite count range per act (A1: one more). */
export function eliteRange(act: Act, asc: number): [number, number] {
  const a1 = asc >= 1 ? 1 : 0;
  return act === 1 ? [2 + a1, 2 + a1] : [2 + a1, 4 + a1];
}

export function generateAct(seed: number, act: Act, o: GenOpts): ActMap {
  const rng = new Rng(seed);
  const boss = o.boss ?? rollBoss(rng.fork(1), act);
  if (act === 4) return act4(rng, o, boss);
  let last: ActMap | null = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const m = attemptAct(rng.fork(100 + attempt), act, o.ascension, boss);
    if (!mapProblems(m, o.ascension).length) { decorate(m, rng.fork(7), o.ascension); return m; }
    last = m;
  }
  decorate(last!, rng.fork(7), o.ascension);
  return last!;
}

// ---------------------------------------------------------------- graph
interface Graph { nodes: MapNode[]; at: Map<string, MapNode>; paths: number[][] }

function walk(rng: Rng): Graph {
  const starts = rng.shuffle([0, 1, 2, 3]).slice(0, 3).sort();
  const edges = new Set<string>();
  const lanePaths: number[][] = [];
  for (let k = 0; k < 5; k++) {
    let lane = starts[k % 3]!;
    const path = [lane];
    for (let f = 1; f < 6; f++) {
      const opts = [-1, 0, 1].filter((d) => lane + d >= 0 && lane + d < LANES);
      let nl = lane + rng.pick(opts);
      // never cross an existing edge between the same floors
      for (const e of edges) {
        const [ef, a, b] = e.split(":").map(Number) as [number, number, number];
        if (ef === f && ((lane < a && nl > b) || (lane > a && nl < b))) { nl = lane; break; }
      }
      edges.add(`${f}:${lane}:${nl}`);
      path.push(nl);
      lane = nl;
    }
    lanePaths.push(path);
  }
  const nodes: MapNode[] = [];
  const at = new Map<string, MapNode>();
  for (let f = 1; f <= 6; f++) for (let l = 0; l < LANES; l++) {
    if (!lanePaths.some((p) => p[f - 1] === l)) continue;
    const n: MapNode = { id: nodes.length, floor: f, lane: l, kind: f === 6 ? "rest" : "battle", next: [] };
    nodes.push(n); at.set(`${f}:${l}`, n);
  }
  for (const e of edges) {
    const [f, a, b] = e.split(":").map(Number) as [number, number, number];
    const from = at.get(`${f}:${a}`)!, to = at.get(`${f + 1}:${b}`)!;
    if (!from.next.includes(to.id)) from.next.push(to.id);
  }
  const bossNode: MapNode = { id: nodes.length, floor: 7, lane: 1, kind: "boss", next: [] };
  for (const n of nodes) { if (n.floor === 6) n.next = [bossNode.id]; n.next.sort((x, y) => nodes[x]!.lane - nodes[y]!.lane); }
  nodes.push(bossNode);
  const paths = lanePaths.map((p) => p.map((l, i) => at.get(`${i + 1}:${l}`)!.id));
  return { nodes, at, paths };
}

export function parentsOf(nodes: MapNode[], id: number): MapNode[] {
  return nodes.filter((n) => n.next.includes(id));
}

function allowed(act: Act, floor: number): Partial<Record<NodeKind, number>> {
  const w = { ...FLOOR_WEIGHTS[floor] };
  if (act === 1 && floor === 2) { delete w.elite; delete w.forge; } // battles and events only
  return w;
}

/** Can node n take kind k given its already-typed parents and grandparents? */
function localOk(nodes: MapNode[], n: MapNode, k: NodeKind): boolean {
  const ps = parentsOf(nodes, n.id);
  if (k === "elite" && ps.some((p) => p.kind === "elite")) return false;
  if (k === "shop" && ps.some((p) => p.kind === "shop")) return false;
  if (k === "event" && ps.some((p) => p.kind === "event" && parentsOf(nodes, p.id).some((g) => g.kind === "event"))) return false;
  return true;
}

function attemptAct(rng: Rng, act: Act, asc: number, boss: BossId): ActMap {
  const { nodes, paths } = walk(rng);
  const roll = (n: MapNode, w: Partial<Record<NodeKind, number>>) => {
    const kinds = (Object.keys(w) as NodeKind[]).filter((k) => w[k]! > 0);
    for (let t = 0; t < 20; t++) {
      const k = rng.weighted(kinds, (x) => w[x]!);
      if (localOk(nodes, n, k)) return k;
    }
    return "battle" as NodeKind;
  };
  for (let f = 2; f <= 5; f++) for (const n of nodes.filter((x) => x.floor === f)) n.kind = roll(n, allowed(act, f));

  // F5 shop/forge needs a battle or elite sibling under a shared parent.
  for (const n of nodes.filter((x) => x.floor === 5 && (x.kind === "shop" || x.kind === "forge"))) {
    if (hasFightSibling(nodes, n)) continue;
    const w = allowed(act, 5); delete w.shop; delete w.forge;
    n.kind = roll(n, w);
  }

  // Treasure: exactly one F4 node, on a lane at least two paths share (the most shared one).
  const f4 = nodes.filter((n) => n.floor === 4);
  const share = (n: MapNode) => paths.filter((p) => p.includes(n.id)).length;
  const top = Math.max(...f4.map(share));
  rng.pick(f4.filter((n) => share(n) === top)).kind = "treasure";

  fixElites(rng, nodes, act, asc);
  fixFightPaths(rng, nodes, act, asc);
  ensureKind(rng, nodes, "forge", act);
  if (asc >= 1) hardRoads(rng, nodes, act); else ensureKind(rng, nodes, "shop", act);
  return { act, nodes, boss };
}

function hasFightSibling(nodes: MapNode[], n: MapNode): boolean {
  return parentsOf(nodes, n.id).some((p) => p.next.some((c) => c !== n.id && ["battle", "elite", "bounty"].includes(nodes[c]!.kind)));
}

const eliteFloor = (act: Act, f: number) => f >= (act === 1 ? 3 : 2) && f <= 5;
const canElite = (nodes: MapNode[], n: MapNode, act: Act) =>
  eliteFloor(act, n.floor) && n.kind !== "treasure" && n.kind !== "elite" &&
  !parentsOf(nodes, n.id).some((p) => p.kind === "elite") && !n.next.some((c) => nodes[c]!.kind === "elite") &&
  !((n.kind === "shop" || n.kind === "forge") && nodes.filter((x) => x.kind === n.kind).length === 1);

function fixElites(rng: Rng, nodes: MapNode[], act: Act, asc: number) {
  const [lo, hi] = eliteRange(act, asc);
  const elites = () => nodes.filter((n) => n.kind === "elite");
  let target = Math.min(hi, Math.max(lo, elites().length + (asc >= 1 ? 1 : 0)));
  while (elites().length > target) rng.pick(elites()).kind = "battle";
  for (let t = 0; t < 30 && elites().length < target; t++) {
    const c = nodes.filter((n) => canElite(nodes, n, act));
    if (!c.length) break;
    rng.weighted(c, (n) => (n.kind === "battle" ? 3 : 1)).kind = "elite";
  }
  void target;
}

/** Paths through the DAG from F1 to F6: min and max elites on any of them. */
export function eliteSpan(nodes: MapNode[]): { min: number; max: number } {
  const lo = new Map<number, number>(), hi = new Map<number, number>();
  for (const n of [...nodes].filter((x) => x.floor <= 6).sort((a, b) => b.floor - a.floor)) {
    const e = n.kind === "elite" ? 1 : 0;
    const kids = n.next.filter((c) => nodes[c]!.floor <= 6);
    lo.set(n.id, e + (kids.length ? Math.min(...kids.map((c) => lo.get(c)!)) : 0));
    hi.set(n.id, e + (kids.length ? Math.max(...kids.map((c) => hi.get(c)!)) : 0));
  }
  const starts = nodes.filter((n) => n.floor === 1);
  return { min: Math.min(...starts.map((n) => lo.get(n.id)!)), max: Math.max(...starts.map((n) => hi.get(n.id)!)) };
}

/** One route with two elites, one with none. */
function fixFightPaths(rng: Rng, nodes: MapNode[], act: Act, asc: number) {
  const [, hi] = eliteRange(act, asc);
  for (let t = 0; t < 12 && eliteSpan(nodes).max < 2; t++) {
    // add an elite next to the richest route by converting a candidate that shares a path with an elite
    const c = nodes.filter((n) => canElite(nodes, n, act) && connectsElite(nodes, n));
    if (!c.length) break;
    rng.pick(c).kind = "elite";
    const es = nodes.filter((n) => n.kind === "elite");
    if (es.length > hi) {
      const lone = es.filter((e) => !connectsElite(nodes, e));
      (lone.length ? rng.pick(lone) : rng.pick(es)).kind = "battle";
    }
  }
}

/** Does some F1-F6 route through n also pass another elite? */
function connectsElite(nodes: MapNode[], n: MapNode): boolean {
  const down = new Set<number>(), up = new Set<number>();
  const goDown = (id: number) => { for (const c of nodes[id]!.next) if (!down.has(c)) { down.add(c); goDown(c); } };
  const goUp = (id: number) => { for (const p of parentsOf(nodes, id)) if (!up.has(p.id)) { up.add(p.id); goUp(p.id); } };
  goDown(n.id); goUp(n.id);
  return [...down, ...up].some((id) => id !== n.id && nodes[id]!.kind === "elite");
}

function ensureKind(rng: Rng, nodes: MapNode[], kind: "shop" | "forge", act: Act) {
  if (nodes.some((n) => n.kind === kind)) return;
  const c = nodes.filter((n) => n.floor >= 3 && n.floor <= 5 && (n.kind === "battle" || n.kind === "event") &&
    (kind !== "shop" || localOk(nodes, n, "shop")) && (n.floor !== 5 || hasFightSibling(nodes, n)));
  if (c.length) rng.pick(c).kind = kind;
  void act;
}

/** Nodes you can reach from F1 without passing an elite. */
export function eliteFree(nodes: MapNode[]): Set<number> {
  const seen = new Set<number>();
  const go = (n: MapNode) => {
    if (n.kind === "elite" || seen.has(n.id)) return;
    seen.add(n.id);
    for (const c of n.next) go(nodes[c]!);
  };
  for (const n of nodes.filter((x) => x.floor === 1)) go(n);
  return seen;
}

/** A1: every route to a shop passes an elite; at least one shop stays behind an elite. */
function hardRoads(rng: Rng, nodes: MapNode[], act: Act) {
  const free = eliteFree(nodes);
  for (const n of nodes) if (n.kind === "shop" && free.has(n.id)) n.kind = "battle";
  if (nodes.some((n) => n.kind === "shop")) return;
  const c = nodes.filter((n) => n.floor >= 3 && n.floor <= 5 && !free.has(n.id) && (n.kind === "battle" || n.kind === "event") &&
    localOk(nodes, n, "shop") && (n.floor !== 5 || hasFightSibling(nodes, n)));
  if (c.length) rng.pick(c).kind = "shop";
  void act;
}

/** Every generator rule that fails on this map (empty = valid). */
export function mapProblems(m: ActMap, asc: number): string[] {
  const out: string[] = [];
  const { nodes, act } = m;
  if (act === 4) return out;
  const f1 = nodes.filter((n) => n.floor === 1);
  if (f1.length !== 3) out.push("F1 has 3 nodes");
  if (f1.some((n) => n.kind !== "battle")) out.push("F1 is battles");
  for (const n of nodes) {
    const ps = parentsOf(nodes, n.id);
    if (n.floor <= 6 && n.floor > 1 && !ps.length) out.push(`node ${n.id} unreachable`);
    if (n.floor < 7 && !n.next.length) out.push(`node ${n.id} dead end`);
    for (const c of n.next) if (Math.abs(nodes[c]!.lane - n.lane) > 1 && n.floor < 6) out.push(`edge ${n.id}>${c} jumps lanes`);
    if (n.floor === 6 && n.kind !== "rest") out.push("F6 is camps");
    if (n.kind === "elite" && ps.some((p) => p.kind === "elite")) out.push("elite after elite");
    if (n.kind === "shop" && ps.some((p) => p.kind === "shop")) out.push("shop after shop");
    if (act === 1 && n.floor === 2 && !["battle", "event"].includes(n.kind)) out.push("act I F2 is battles and events");
    if (n.kind === "event" && ps.some((p) => p.kind === "event" && parentsOf(nodes, p.id).some((g) => g.kind === "event"))) out.push("three events in a row");
    if (n.floor === 5 && (n.kind === "shop" || n.kind === "forge") && !hasFightSibling(nodes, n)) out.push("F5 prepare without a fight beside it");
  }
  // edges never cross
  for (const a of nodes) for (const b of nodes) if (a.floor === b.floor && a.floor < 6 && a.lane < b.lane)
    for (const x of a.next) for (const y of b.next) if (nodes[x]!.lane > nodes[y]!.lane) out.push("crossing edges");
  const treasures = nodes.filter((n) => n.kind === "treasure");
  if (treasures.length !== 1 || treasures[0]!.floor !== 4) out.push("one treasure on F4");
  const elites = nodes.filter((n) => n.kind === "elite").length;
  const [lo, hi] = eliteRange(act, asc);
  if (elites < lo || elites > hi) out.push(`elites ${elites} not in ${lo}-${hi}`);
  const span = eliteSpan(nodes);
  if (span.min > 0) out.push("no elite-free route");
  if (span.max < 2) out.push("no route with two elites");
  if (!nodes.some((n) => n.kind === "forge")) out.push("no forge");
  if (!nodes.some((n) => n.kind === "shop")) out.push("no shop");
  if (asc >= 1) {
    const free = eliteFree(nodes);
    if (nodes.some((n) => n.kind === "shop" && free.has(n.id))) out.push("A1: a shop without an elite before it");
  }
  return [...new Set(out)];
}

// ---------------------------------------------------------------- what nodes show
function rollElite(rng: Rng, act: Act, asc: number): { kind: EnemyId; affixes: string[] } {
  const w = ELITE_WEIGHTS[act];
  const kind = rng.weighted(ELITES, (e) => w[ELITES.indexOf(e)]!);
  const n = asc >= 6 ? 2 : ELITE_AFFIXES_BY_ACT[act];
  const affixes: string[] = [];
  while (affixes.length < n) {
    const a = rng.pick(AFFIXES.filter((x) => !x.notOn?.includes(kind) && !affixes.includes(x.id) &&
      !((x.id === "plated" && affixes.includes("runed")) || (x.id === "runed" && affixes.includes("plated")))));
    affixes.push(a.id);
  }
  return { kind, affixes };
}


/** The roles a node's theme leans on (shown by Foresight). */
export function themeRoles(act: Act, floor: number, archetypes: string[]): EnemyId[] {
  const out: EnemyId[] = [];
  for (const a of archetypes) for (const role of ARCHETYPES[a as ArchId]?.roles ?? [])
    if ((ROLE_FLOOR[act][role] ?? 99) <= floor && !out.includes(role)) out.push(role);
  return out;
}

export function decorateNode(rng: Rng, n: MapNode, act: Act, asc: number) {
  const info = (n.info ??= {});
  if (n.kind === "elite") { const e = rollElite(rng, act, asc); info.elite = e.kind; info.affixes = e.affixes; }
  if (n.kind === "bounty") info.bounty = rng.pick(BOUNTIES).id;
  if (n.kind === "battle" && (act >= 3 && n.floor >= 4 && n.floor <= 5 || act === 4 && n.floor === 1) && rng.chance(BATTLE_ELITE_CHANCE)) {
    info.elite = rollElite(rng, act, 0).kind; info.affixes = [];
  }
  if (n.kind === "battle" || n.kind === "elite" || n.kind === "bounty") {
    const t = rng.pick(BATTLE_THEMES[act]);
    info.theme = t.line; info.archetypes = [...t.archetypes];
  }
  if (!Object.keys(info).length) delete n.info;
}

function decorate(m: ActMap, rng: Rng, asc: number) {
  for (const n of m.nodes) {
    decorateNode(rng, n, m.act, asc);
    if (n.kind === "boss") (n.info ??= {}).boss = m.boss;
  }
}

function act4(rng: Rng, o: GenOpts, boss: BossId): ActMap {
  const road: MapNode = { id: 0, floor: 1, lane: 1, kind: "battle", next: [2], info: { name: ACT4_NAMES.road } };
  const gate: MapNode = { id: 1, floor: 1, lane: 2, kind: "elite", next: [2], info: { name: ACT4_NAMES.gate } };
  const camp: MapNode = o.ascension >= 10 && o.champion
    ? { id: 2, floor: 2, lane: 1, kind: "boss", next: [3], info: { boss: o.champion, champion: true } }
    : { id: 2, floor: 2, lane: 1, kind: "camp", next: [3], info: { name: ACT4_NAMES.camp } };
  const end: MapNode = { id: 3, floor: 3, lane: 1, kind: "boss", next: [], info: { boss } };
  const m: ActMap = { act: 4, nodes: [road, gate, camp, end], boss };
  const r = rng.fork(7);
  decorateNode(r, road, 4, o.ascension);
  decorateNode(r, gate, 4, o.ascension);
  return m;
}
