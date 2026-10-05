// Read-only helpers for the UI (radial menu, HUD, previews). Nothing here mutates a battle.
import type { Battle, BattleResult, EnemyId, Pad, SpecId, SpellId, Tower, TowerId } from "../types.ts";
import { ACTS } from "../content/battle/acts.ts";
import { ENEMIES } from "../content/battle/enemies.ts";
import { SPELLS } from "../content/battle/spells.ts";
import { TOWERS, SPEC_OF, statsOf, purchaseCost } from "../content/battle/towers.ts";
import { has } from "./mods.ts";
import { X, alive, enemies, towers, type TowerX } from "./internal.ts";
import { effRange, hitsAir } from "./towers.ts";
import { priceOf, sellLocked, sellValue as sellV } from "./commands.ts";

export interface TowerInfo {
  name: string;
  line: string;
  /** Damage per hit (or dps for cones/auras), attacks per second, range/radius, single-target dps. */
  damage: number;
  rate: number;
  range: number;
  dps: number;
  type: string;
  reach: "air + ground" | "ground" | "support";
  /** Extra numbers worth showing (chill, splash, burn, jumps...). */
  extra: { label: string; value: string }[];
}

export function towerInfo(kind: TowerId, level: number, spec?: SpecId | null): TowerInfo {
  const d = TOWERS[kind];
  const st = statsOf(kind, level, spec ?? null);
  const sp = level >= 4 && spec ? d.specs[SPEC_OF[spec].index] : null;
  const rate = st.int ? 1 / st.int : st.cone ? 5 : st.thorns ? 2 : 0;
  const dmg = st.dmg ?? st.thorns ?? st.soldiers?.dmg ?? 0;
  const dps = st.int ? dmg / st.int : st.cone || st.thorns ? dmg : st.soldiers ? (st.soldiers.dmg / st.soldiers.int) * st.soldiers.count : 0;
  const extra: TowerInfo["extra"] = [];
  if (st.splash) extra.push({ label: "Blast", value: `${st.splash}` });
  if (st.chill) extra.push({ label: "Chill", value: `${st.chill} a hit` });
  if (st.burn) extra.push({ label: "Burn", value: `${st.burn} a second for ${st.burnS} s` });
  if (st.targets && kind === "storm") extra.push({ label: "Jumps", value: `${st.targets - 1}` });
  if (st.pierce) extra.push({ label: "Pierce", value: `${st.pierce}%` });
  if (st.crit) extra.push({ label: "Critical hit", value: `${st.crit}% x${st.critM ?? 2}` });
  if (st.markPct) extra.push({ label: "Marks", value: `+${st.markPct}% taken` });
  if (st.aspd) extra.push({ label: "Attack speed", value: `+${st.aspd}%` });
  if (st.soldiers) extra.push({ label: "Soldiers", value: `${st.soldiers.count} x ${st.soldiers.hp} health` });
  if (st.rootEvery) extra.push({ label: "Roots", value: `every ${st.rootEvery} s for ${st.rootS} s` });
  if (st.puddle) extra.push({ label: "Oil", value: `${st.puddle} s` });
  if (sp) extra.push({ label: sp.name, value: sp.mechanic });
  return {
    name: sp ? sp.name : d.name, line: sp ? sp.line : d.line, damage: dmg, rate, range: st.range, dps, type: st.type ?? "none",
    reach: d.support ? "support" : (sp ? sp.air : d.air) ? "air + ground" : "ground", extra,
  };
}

export const buildCost = (b: Battle, kind: TowerId) => priceOf(b, kind, 1, null);

/** Next level's price, or null on L3 (specialise instead) and L4. */
export function upgradeCost(b: Battle, t: Tower): number | null {
  if (t.level >= 3) return null;
  return priceOf(b, t.kind, t.level + 1, null, t as TowerX);
}

export interface SpecOption { id: SpecId; name: string; line: string; mechanic: string; cost: number; twin?: boolean }

/** The two specialisations at L3; with Twin Crests the other one on the first specialised tower. */
export function specOptions(b: Battle, t: Tower): SpecOption[] {
  const d = TOWERS[t.kind];
  const x = X(b);
  if (t.level === 3) return d.specs.map((s) => ({ id: s.id, name: s.name, line: s.line, mechanic: s.mechanic, cost: priceOf(b, t.kind, 4, s.id, t as TowerX) }));
  const tx = t as TowerX;
  if (t.level === 4 && has(x.mods, "twin-crests") && !x.twin && !tx.spec2 && x.twinTower === t.id)
    return d.specs.filter((s) => s.id !== t.spec).map((s) => ({ id: s.id, name: s.name, line: s.line, mechanic: s.mechanic, cost: purchaseCost(t.kind, 4, s.id), twin: true }));
  return [];
}

export function sellValue(b: Battle, t: Tower): number | null { return sellLocked(b) ? null : sellV(b, t as TowerX); }

/** Current range of a built tower, with every range modifier. */
export function rangeOf(b: Battle, t: Tower): number { return effRange(b, t as TowerX); }

/** Range a tower would have (build menu preview), with run modifiers and the pad's high ground. */
export function towerRange(b: Battle, kind: TowerId, level: number, spec: SpecId | null, pad?: Pad): number {
  const m = X(b).mods;
  let pct = m.t[kind].range + (pad?.high ? 0.15 : 0);
  if (has(m, "spyglass") && (kind === "archer" || kind === "ballista")) pct += 0.15;
  return statsOf(kind, level, spec).range * (1 + Math.min(0.4, pct)) * (X(b).stormT > 0 ? 0.8 : 1) - (has(m, "overclock") ? 1 : 0);
}

export interface PreviewGroup { kind: EnemyId; name: string; count: number; elite: boolean; affixes: string[]; air: boolean; leak: number }
export interface WavePreview { wave: number; archetype: string; threat: number; maxThreat: number; groups: PreviewGroup[]; badges: string[]; leak: number; boss?: string }

/** Next waves for the skull (Foresight shows two). */
export function nextWaves(b: Battle, n?: number): WavePreview[] {
  const count = n ?? (has(X(b).mods, "foresight") ? 2 : 1);
  const maxThreat = Math.max(...b.waves.map((w) => w.threat), 1);
  const act = ACTS[b.act];
  const out: WavePreview[] = [];
  for (let i = b.next; i < Math.min(b.waves.length, b.next + count); i++) {
    const w = b.waves[i]!;
    const groups: PreviewGroup[] = [];
    for (const g of w.groups) {
      const prev = groups[groups.length - 1];
      if (prev && prev.kind === g.kind && prev.elite === !!g.elite) { prev.count += g.count; prev.leak += g.count * ENEMIES[g.kind].leak; continue; }
      groups.push({ kind: g.kind, name: act.names[g.kind] ?? ENEMIES[g.kind].name, count: g.count, elite: !!g.elite, affixes: g.affixes ?? [], air: ENEMIES[g.kind].flying, leak: g.count * ENEMIES[g.kind].leak });
    }
    out.push({ wave: i, archetype: w.archetype, threat: w.threat, maxThreat, groups, badges: w.badges, leak: groups.reduce((s, g) => s + g.leak, 0), boss: w.boss });
  }
  return out;
}

export function roster(b: Battle): { roles: { kind: EnemyId; name: string; line: string }[]; trait: string | null; theme?: string } {
  const act = ACTS[b.act];
  return {
    roles: b.roster.map((k) => ({ kind: k, name: act.names[k] ?? ENEMIES[k].name, line: ENEMIES[k].line })),
    trait: act.trait?.line ?? null,
    theme: b.theme,
  };
}

export function spellInfo(b: Battle): { id: SpellId; key: "Q" | "W"; name: string; line: string; ready: number; seconds: number; aim: string; radius: number }[] {
  return b.spells.map((s) => ({
    id: s.id, key: s.key, name: SPELLS[s.id].name, line: SPELLS[s.id].line, ready: s.total ? 1 - s.cooldown / s.total : 1,
    seconds: Math.ceil(s.cooldown / 30), aim: s.aim, radius: s.radius,
  }));
}

export function canBuild(b: Battle, pad: number, kind: TowerId): { ok: boolean; reason?: string; cost: number } {
  const p = b.map.pads[pad];
  const cost = buildCost(b, kind);
  if (!p) return { ok: false, reason: "No build spot there.", cost };
  if (b.phase === "won" || b.phase === "lost") return { ok: false, reason: "The battle is over.", cost };
  if (p.rubble) return { ok: false, reason: `Clear the rubble first (${p.rubble} gold).`, cost };
  if (towers(b).some((t) => t.pad === pad)) return { ok: false, reason: "That spot is taken.", cost };
  if (!b.loadout.towers.includes(kind)) return { ok: false, reason: "Not on your war table.", cost };
  if (b.gold < cost) return { ok: false, reason: "Not enough gold.", cost };
  return { ok: true, cost };
}

/** Towers a support tower buffs (banner aura, lighthouse). */
export function auraTargets(b: Battle, t: Tower): number[] {
  const tx = t as TowerX;
  if (t.kind === "banner") {
    const r = statsOf(t.kind, t.level, t.spec).range * (1 + Math.min(0.4, X(b).mods.t.banner.range));
    return towers(b).filter((o) => o !== tx && o.kind !== "banner" && ((o.x - tx.x) ** 2 + (o.y - tx.y) ** 2 <= r * r + 1e-9 || (o.rally && (o.rally.x - tx.x) ** 2 + (o.rally.y - tx.y) ** 2 <= r * r + 1e-9))).map((o) => o.id);
  }
  if (t.kind === "beacon" && (t.spec === "lighthouse" || tx.spec2 === "lighthouse"))
    return towers(b).filter((o) => o !== tx && (o.x - tx.x) ** 2 + (o.y - tx.y) ** 2 <= 9.0001).map((o) => o.id);
  return [];
}

/** Lives the enemies on the field would cost if they all got through. */
export function livesAtRisk(b: Battle): number {
  let n = 0;
  for (const e of enemies(b)) if (alive(e)) n += e.leakV;
  return n;
}

/** Whether a tower can hit flyers right now (spec-aware). */
export const towerHitsAir = (t: Tower) => hitsAir(t as TowerX);

/** What a finished battle reports to the run (types.ts BattleResult). */
export function battleResult(b: Battle): BattleResult {
  const x = X(b);
  const pads = b.map.pads;
  const rank = (p: Pad) => pads.filter((q) => q.tier === p.tier).sort((a, c) => c.score - a.score || a.id - c.id).indexOf(p);
  const ghost = [...towers(b)].sort((p, q) => q.invested - p.invested || p.id - q.id).map((t) => {
    const p = pads[t.pad]!;
    return { tower: t.kind, level: t.level, spec: t.spec, tier: p.tier, rank: rank(p) };
  });
  const boss = enemies(b).find((e) => e.boss && alive(e));
  const r: BattleResult = {
    won: b.phase === "won",
    livesLeft: Math.max(0, b.lives),
    leaked: b.stats.leaked,
    goldLeft: b.gold,
    stats: b.stats,
    bountyOk: !!b.bounty?.ok,
    elitesKilled: x.elitesKilled >= x.elites,
    ghost,
    supplies: [...x.supplies],
    phoenixUsed: x.phoenix,
    treasury: x.treasuryCrowns,
    ticks: b.tick,
    waveKills: Math.max(0, ...x.waveKills.filter((n) => n !== undefined)),
  };
  if (b.phase === "lost" && boss) r.bossHpLeft = Math.max(0, boss.hp / boss.maxHp);
  return r;
}

export { callBonus } from "./commands.ts";
/** The interest cap this battle (gold), as startWave applies it. */
export function interestCap(b: Battle): number {
  const m = X(b).mods;
  return Math.round(ACTS[b.act].interestCap * Math.max(0, 1 + m.interestCapPct));
}
/** Full countdown between waves in ticks (the skull ring's 100%). */
export function countdownTotal(b: Battle): number {
  return Math.round(Math.round(ACTS[b.act].countdown * 30) * X(b).mods.countdownMul);
}
