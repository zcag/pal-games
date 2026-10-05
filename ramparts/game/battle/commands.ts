// Player commands (systems 13.1): validated, applied at once (logged by tick, so deterministic).
// Costs route through one `cost` pool with a -50% floor per purchase (R3).
import type { Battle, Command, SpecId, TowerId } from "../types.ts";
import { ACTS } from "../content/battle/acts.ts";
import { TOWERS, SPEC_OF, purchaseCost } from "../content/battle/towers.ts";
import { bv, has, hasB } from "./mods.ts";
import { T, X, emit, towers, soldiers, type TowerX } from "./internal.ts";
import { onTowerChanged } from "./towers.ts";
import { removeSoldier, rallyRange, setRally, snapToRoad, syncSoldiers } from "./soldiers.ts";
import { cast, useSupply, skipCooldowns } from "./spells.ts";
import { startWave } from "./sim.ts";

type R = { ok: boolean; reason?: string };

/** Price of the purchase that takes `kind` to `level` (2 = upgrade to L2...), with every modifier. */
export function priceOf(b: Battle, kind: TowerId, level: number, spec: SpecId | null, t?: TowerX, extra = 0): number {
  const x = X(b), m = x.mods;
  let base = purchaseCost(kind, level, spec);
  let pct = m.t[kind].cost + extra;
  const build = level === 1;
  if (has(m, "masons-seal")) pct += level >= 4 ? 0.5 : -0.25;
  if (build) {
    pct += m.l1Cost;
    if (has(m, "cold-hands") && x.built === 0) pct += 0.5;
    const l2 = purchaseCost(kind, 2, null);
    // Veteran / Siege Engine (R3): built at L2 for L1 + half L2, through the pool
    if (hasB(m, kind, "veteran") || has(m, "siege-engine")) { base += l2; pct -= (0.5 * l2) / base; }
  }
  if (level === 3) {
    if (has(m, "rust")) pct += 0.2;
    if (hasB(m, kind, "overseer")) pct -= 0.4;
    pct -= bv(m, kind, "veteran", 0, 0.2);
  }
  if (level >= 4) pct -= bv(m, kind, "overseer", 0, 0.15);
  let price = Math.round(base * (1 + Math.max(-0.5, pct)));
  if (build && has(m, "spare-planks") && x.built === 0) price = Math.max(0, price - Math.min(100, price));
  if ((level === 2 || level === 3) && t && has(m, "drillmaster") && !x.drill && extra === 0) price = 0;
  return price;
}

/** Level a fresh build starts at (Veteran, Siege Engine: L2). */
export function buildLevel(b: Battle, kind: TowerId): 1 | 2 {
  const m = X(b).mods;
  return hasB(m, kind, "veteran") || has(m, "siege-engine") ? 2 : 1;
}

export function sellValue(b: Battle, t: TowerX): number {
  if (b.phase === "setup") return t.invested;
  return Math.round(t.invested * 0.7);
}

/** Final-wave sell lock (content Reconciliations 57). */
export function sellLocked(b: Battle): boolean { return b.phase === "running" && X(b).lastWaveStarted; }

export function command(b: Battle, c: Command): R {
  const r = apply(b, c);
  if (!r.ok) emit(b, 0, 0, { e: "deny", reason: r.reason ?? "no" });
  return r;
}

function over(b: Battle) { return b.phase === "won" || b.phase === "lost"; }

function apply(b: Battle, c: Command): R {
  if (over(b)) return { ok: false, reason: "The battle is over." };
  const x = X(b);
  switch (c.t) {
    case "build": return build(b, c.pad, c.tower);
    case "upgrade": {
      const t = towers(b).find((q) => q.id === c.tower);
      if (!t) return { ok: false, reason: "No tower there." };
      if (t.level >= 3) return { ok: false, reason: "Choose a specialisation." };
      return upgradeTower(b, t, 0);
    }
    case "specialise": return specialise(b, c.tower, c.spec);
    case "sell": {
      const t = towers(b).find((q) => q.id === c.tower);
      if (!t) return { ok: false, reason: "No tower there." };
      if (sellLocked(b)) return { ok: false, reason: "No selling in the last wave." };
      const g = sellValue(b, t);
      b.gold += g;
      for (const s of soldiers(b).filter((q) => q.tower === t.id)) removeSoldier(b, s);
      b.towers.splice(b.towers.indexOf(t), 1);
      b.stats.sold++;
      x.sold++;
      if (b.bounty?.id === "no-sell") b.bounty.ok = false;
      emit(b, t.x, t.y, { e: "sell", tower: t.id, pad: t.pad, kind: t.kind, level: t.level, gold: g });
      return { ok: true };
    }
    case "mode": {
      const t = towers(b).find((q) => q.id === c.tower);
      if (!t) return { ok: false, reason: "No tower there." };
      t.mode = c.mode;
      return { ok: true };
    }
    case "rally": {
      const t = towers(b).find((q) => q.id === c.tower);
      if (!t || !(t.kind === "barracks" || (t.kind === "thornwood" && t.spec === "treant"))) return { ok: false, reason: "Only soldiers have a rally point." };
      const p = snapToRoad(b, c.x, c.y);
      if (!p) return { ok: false, reason: "Rally points go on the road." };
      const r = rallyRange(b, t);
      if ((p.x - t.x) * (p.x - t.x) + (p.y - t.y) * (p.y - t.y) > r * r) return { ok: false, reason: "Too far from the tower." };
      setRally(b, t, p);
      return { ok: true };
    }
    case "call": return call(b);
    case "cast": return cast(b, c);
    case "supply": return useSupply(b, c);
    case "clear": {
      const p = b.map.pads[c.pad];
      if (!p || !p.rubble) return { ok: false, reason: "Nothing to clear." };
      if (b.gold < p.rubble) return { ok: false, reason: "Not enough gold." };
      b.gold -= p.rubble;
      p.rubble = 0;
      emit(b, p.x, p.y, { e: "gold", amount: -0, reason: "clear" });
      return { ok: true };
    }
    case "ghost": return ghost(b);
  }
}

function build(b: Battle, pad: number, kind: TowerId): R {
  const x = X(b);
  const p = b.map.pads[pad];
  if (!p) return { ok: false, reason: "No build spot there." };
  if (p.rubble) return { ok: false, reason: "Clear the rubble first." };
  if (towers(b).some((t) => t.pad === pad)) return { ok: false, reason: "That spot is taken." };
  if (!b.loadout.towers.includes(kind)) return { ok: false, reason: "That tower is not on your war table." };
  const price = priceOf(b, kind, 1, null);
  if (b.gold < price) return { ok: false, reason: "Not enough gold." };
  b.gold -= price;
  const level = buildLevel(b, kind);
  const t: TowerX = {
    id: x.nextId++, pad, kind, level, spec: null, mode: TOWERS[kind].mode, cooldown: 0, target: 0, aimX: p.x, aimY: p.y,
    building: T(0.6), disabled: 0, invested: price, shots: 0, heat: 0, stats: { damage: 0, kills: 0 },
    x: p.x, y: p.y, spec2: null, aspd: 0, dealt: 0, rangeMul: 1, critAdd: 0, soldierDmg: 0, regenMul: 1, banner: 0, treasury: 0,
    lighthouse: false, braveHearts: 0, t1: 0, t2: 0, t3: 0, coneDx: 1, coneDy: 0, coneTgt: 0, heatT: 0, rain: null, puddles: [],
    soldierIds: [], waves: 0, high: !!p.high, firstShot: false,
  };
  b.towers.push(t);
  x.built++;
  if (!x.padsUsed.includes(pad)) x.padsUsed.push(pad);
  if (!x.kindsUsed.includes(kind)) x.kindsUsed.push(kind);
  b.stats.maxPads = Math.max(b.stats.maxPads, towers(b).length);
  if (b.bounty?.id === "few-hands" && x.padsUsed.length > 5) b.bounty.ok = false;
  if (b.bounty?.id === "single-file" && x.kindsUsed.length > 3) b.bounty.ok = false;
  onTowerChanged(b, t);
  emit(b, t.x, t.y, { e: "build", tower: t.id, pad, kind, level: t.level, gold: price });
  return { ok: true };
}

/** Upgrade one level (L1->L2, L2->L3); Requisition passes -0.5 into the cost pool (R11). */
export function upgradeTower(b: Battle, t: TowerX, poolExtra: number): R {
  const x = X(b);
  if (t.level >= 3) return { ok: false, reason: "Choose a specialisation." };
  const lv = (t.level + 1) as 2 | 3;
  const price = priceOf(b, t.kind, lv, null, t, poolExtra);
  if (b.gold < price) return { ok: false, reason: "Not enough gold." };
  b.gold -= price;
  if (has(x.mods, "drillmaster") && poolExtra === 0) x.drill = true;
  t.level = lv;
  t.invested += price;
  t.building = Math.max(t.building, T(0.4));
  onTowerChanged(b, t);
  emit(b, t.x, t.y, { e: "upgrade", tower: t.id, pad: t.pad, kind: t.kind, level: t.level, gold: price });
  return { ok: true };
}

function specialise(b: Battle, id: number, spec: SpecId): R {
  const x = X(b);
  const t = towers(b).find((q) => q.id === id);
  if (!t) return { ok: false, reason: "No tower there." };
  if (SPEC_OF[spec]?.tower !== t.kind) return { ok: false, reason: "That is not this tower's." };
  if (t.level < 3) return { ok: false, reason: "Reach level III first." };
  if (t.level === 4) {
    // Twin Crests: the first tower you specialise may buy the other spec at full price
    if (!has(x.mods, "twin-crests") || x.twin || t.spec2 || spec === t.spec || x.twinTower !== t.id) return { ok: false, reason: "Already specialised." };
    const price = purchaseCost(t.kind, 4, spec);
    if (b.gold < price) return { ok: false, reason: "Not enough gold." };
    b.gold -= price;
    x.twin = true;
    t.spec2 = spec;
    t.invested += price;
    onTowerChanged(b, t);
    emit(b, t.x, t.y, { e: "specialise", tower: t.id, pad: t.pad, kind: t.kind, level: 4, gold: price });
    return { ok: true };
  }
  const price = priceOf(b, t.kind, 4, spec, t);
  if (b.gold < price) return { ok: false, reason: "Not enough gold." };
  b.gold -= price;
  t.level = 4;
  t.spec = spec;
  t.invested += price;
  t.building = Math.max(t.building, T(0.4));
  const d = TOWERS[t.kind].specs[SPEC_OF[spec].index];
  if (d.mode) t.mode = d.mode;
  if (x.twinTower === 0) x.twinTower = t.id;
  if (t.kind === "barracks") syncSoldiers(b, t);
  onTowerChanged(b, t);
  emit(b, t.x, t.y, { e: "specialise", tower: t.id, pad: t.pad, kind: t.kind, level: 4, gold: price });
  return { ok: true };
}

/** Gold the call-early bonus pays right now (0 outside a countdown). */
export function callBonus(b: Battle): number {
  const m = X(b).mods;
  if (b.phase !== "running" || b.countdown <= 0 || m.noCall) return 0;
  let bonus = Math.ceil((b.countdown / 30) * 3 * ACTS[b.act].bountyMul * m.callBonusMul);
  if (has(m, "signal-horn") && b.next >= 1 && b.next <= 3) bonus *= 2;
  return bonus;
}

function call(b: Battle): R {
  const x = X(b), m = x.mods;
  if (b.phase === "setup") { startWave(b, false, 0); return { ok: true }; }
  if (b.next >= b.waves.length) return { ok: false, reason: "That was the last wave." };
  if (x.spawning) return { ok: false, reason: "The wave is still coming." };
  if (m.noCall) return { ok: false, reason: "Siege Engine: no calling early." };
  const left = Math.max(0, b.countdown);
  const bonus = callBonus(b);
  skipCooldowns(b, left);
  b.stats.calledEarly++;
  startWave(b, true, bonus);
  return { ok: true };
}

function ghost(b: Battle): R {
  if (b.phase !== "setup") return { ok: false, reason: "Only during setup." };
  const g = b.loadout.ghost;
  if (!g || !g.length) return { ok: false, reason: "No last battle to copy." };
  let placed = 0;
  for (const it of g) {
    if (!b.loadout.towers.includes(it.tower)) continue;
    const free = b.map.pads.filter((p) => p.tier === it.tier && !p.rubble && !towers(b).some((t) => t.pad === p.id))
      .sort((p, q) => q.score - p.score || p.id - q.id);
    if (!free.length) continue;
    const pad = free[Math.min(it.rank, free.length - 1)]!;
    // rebuilt at L1; upgrades stay the player's to buy (content 2.1)
    if (build(b, pad.id, it.tower).ok) placed++;
  }
  return placed ? { ok: true } : { ok: false, reason: "Not enough gold for any of them." };
}
