// Tower throughput table: health removed per second by one tower (every level and spec) on a
// reference pad, against a steady stream of one enemy role at its wave spacing. The bot reads the
// table as an expert's feel for each tower (game/bot/thru.ts); it is also a balance report.
// `bun scripts/balance/thru.ts [--write]` (about 20 s).
import type { EnemyId, SpecId, TowerId } from "../../game/types.ts";
import { arena, put } from "../../game/battle/testkit.ts";
import { step, command } from "../../game/battle/index.ts";
import { towers } from "../../game/battle/internal.ts";
import { TOWERS, purchaseCost } from "../../game/content/battle/towers.ts";
import { ENEMIES } from "../../game/content/battle/enemies.ts";
import { cover, geo } from "../../game/bot/model.ts";
import { towerRange } from "../../game/battle/query.ts";
import { applyTune } from "./tasks.ts";
applyTune();

export const ROLES: [EnemyId, number][] = [["footman", 0.8], ["runner", 0.4], ["brute", 1.0], ["acolyte", 0.9], ["swarmling", 0.25], ["bat", 0.4], ["shieldbearer", 0.9], ["drake", 1.5]];
const KINDS = (process.env.KINDS ? process.env.KINDS.split(",") : Object.keys(TOWERS)) as TowerId[];
const SECS = 45, WARM = 12;
/** Enemy health x2.5 (late-act bodies) so strong towers are not capped by the stream's supply. */
const HPX = 2.5;

function measure(kind: TowerId, level: number, spec: SpecId | null, role: EnemyId, gap: number, seed: number): { dps: number; cov: number } {
  const b = arena({ seed, loadout: { towers: [kind] } });
  b.lives = 1e9;
  const g = geo(b);
  // reference pad: the best-covering pad within 3 u of the middle of the road
  const pads = [...b.map.pads].sort((p, q) => q.score - p.score);
  const pad = pads[1]!;
  const r = command(b, { t: "build", pad: pad.id, tower: kind });
  if (!r.ok) throw new Error(r.reason);
  const t = towers(b)[0]!;
  while (t.level < Math.min(3, level)) command(b, { t: "upgrade", tower: t.id });
  if (level >= 4) command(b, { t: "specialise", tower: t.id, spec: spec! });
  t.building = 0;
  const every = Math.max(1, Math.round(gap * 30));
  // spawn just before the stretch the pad covers: since 87f80f6 roads span the board, and a stream
  // spawned at the gate reached a mid-road pad only after the warm-up (slow roles measured ~idle)
  const reach = (kind === "barracks" ? 2.6 : towerRange(b, kind, level, spec, pad)) + 0.5;
  const near = (ENEMIES[role].flying ? g.air : g.ground).filter((q) => q.lane === 0 && (q.x - pad.x) ** 2 + (q.y - pad.y) ** 2 <= reach * reach);
  const s0 = Math.max(0, (near.length ? Math.min(...near.map((q) => q.s)) : 0) - 1.5);
  let d0 = 0;
  for (let i = 0; i < SECS * 30; i++) {
    if (i % every === 0) { const e = put(b, role, s0); e.hp = e.maxHp = e.maxHp * HPX; }
    if (i === WARM * 30) d0 = t.stats.damage;
    step(b);
    b.events.length = 0;
  }
  const range = towerRange(b, kind, level, spec, pad);
  return { dps: (t.stats.damage - d0) / (SECS - WARM), cov: cover(g, pad.x, pad.y, kind === "barracks" ? 2.6 : range, ENEMIES[role].flying) };
}

export function table() {
  const out: Record<string, { cost: number; cov: number; acov: number; hp: Record<string, number> }> = {};
  for (const kind of KINDS) {
    const lv: [number, SpecId | null][] = [[1, null], [2, null], [3, null], ...TOWERS[kind].specs.map((s) => [4, s.id] as [number, SpecId])];
    for (const [level, spec] of lv) {
      const key = spec ?? `${kind}${level}`;
      let cost = 0;
      for (let i = 1; i <= Math.min(3, level); i++) cost += purchaseCost(kind, i, null);
      if (spec) cost += purchaseCost(kind, 4, spec);
      const hp: Record<string, number> = {};
      // road in reach of the reference pad, ground and air apart: the bot scales a row by the road a
      // real pad covers over this (an air rate measured where the air lane barely passes is low)
      let cov = 0, acov = 0;
      const ground = ROLES.filter(([r]) => !ENEMIES[r].flying).length, air = ROLES.length - ground;
      for (const [role, gap] of ROLES) {
        let s = 0;
        for (const seed of [7, 11]) { const m = measure(kind, level, spec, role, gap, seed); s += m.dps / 2; if (ENEMIES[role].flying) acov += m.cov / (2 * air); else cov += m.cov / (2 * ground); }
        hp[role] = Math.round(s * 10) / 10;
      }
      out[key] = { cost, cov: Math.round(cov * 10) / 10, acov: Math.round(acov * 10) / 10, hp };
    }
  }
  return out;
}

if (import.meta.main) {
  const t = table();
  const roles = ROLES.map((r) => r[0]);
  console.log("key".padEnd(14), "cost".padStart(5), roles.map((r) => r.slice(0, 6).padStart(7)).join(""), "  mean/100g");
  for (const [k, v] of Object.entries(t)) {
    const mean = roles.reduce((s, r) => s + (v.hp[r] ?? 0), 0) / roles.length;
    console.log(k.padEnd(14), String(v.cost).padStart(5), roles.map((r) => String(v.hp[r]).padStart(7)).join(""), (mean / v.cost * 100).toFixed(1).padStart(10));
  }
  if (process.argv.includes("--write")) {
    const rows = Object.entries(t).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join("\n");
    await Bun.write(new URL("../../game/bot/thru.ts", import.meta.url),
      `// Generated by scripts/balance/thru.ts --write: health a tower removes per second on a reference pad\n// against a stream of one role (x2.5 health). Regenerate after changing tower or enemy numbers.\n` +
      `export const THRU: Record<string, { cost: number; cov: number; acov: number; hp: Record<string, number> }> = {\n${rows}\n};\n`);
  }
}
