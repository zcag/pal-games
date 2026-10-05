// Battle-level synergy lift: a named pair built on two pads that watch the same road, through a real
// battle's waves (enemy health xHPX so neither tower runs out of targets), against the same two
// towers each alone on the same pad (same gold, no interaction). Lift = together / (A alone + B alone) - 1.
// Target 40-100% (systems 13.5). No bot, no spells: only the pair acts.
//   ACT=2 HPX=3 SEEDS=8 bun scripts/balance/synergy-battle.ts
import type { Pad, SpecId, TowerId } from "../../game/types.ts";
import { newBattle, step, command } from "../../game/battle/index.ts";
import { enemies, towers, type EnemyX } from "../../game/battle/internal.ts";
import { loadout } from "../../game/battle/testkit.ts";
import { geo } from "../../game/bot/model.ts";
import { applyTune } from "./tasks.ts";
applyTune();

type Piece = [TowerId, number, SpecId | null];
export const PAIRS: [string, Piece, Piece][] = [
  ["Shatterline (Shatter + Archer III)", ["frost", 4, "shatter"], ["archer", 3, null]],
  ["Shatterline (Shatter + Ballista III)", ["frost", 4, "shatter"], ["ballista", 3, null]],
  ["Wildfire (Naphtha + Pyre III)", ["alchemist", 4, "naphtha"], ["pyre", 3, null]],
  ["Wildfire (Alchemist III + Inferno)", ["alchemist", 3, null], ["pyre", 4, "inferno"]],
  ["Deadeye (Beacon III + Marksmen)", ["beacon", 3, null], ["archer", 4, "marksmen"]],
  ["Deadeye (Hunter's Mark + Marksmen)", ["beacon", 4, "huntersmark"], ["archer", 4, "marksmen"]],
];
const ACT = +(process.env.ACT ?? 2) as 2, HPX = +(process.env.HPX ?? 3), SEEDS = +(process.env.SEEDS ?? 8);

function play(pieces: (Piece | null)[], seed: number): number {
  const kinds = [...new Set([...pieces.filter((p) => p).map((p) => p![0]), "archer", "frost", "ballista", "alchemist", "pyre", "beacon"])] as TowerId[];
  const b = newBattle({ seed, act: ACT, kind: "battle", floor: 3, loadout: loadout({ towers: kinds, lives: 1e9, maxLives: 1e9 }), quiet: false });
  b.gold = 1e6;
  const g = geo(b);
  const shared = (p: Pad, q: Pad, r = 3.2) => g.ground.filter((s) => (s.x - p.x) ** 2 + (s.y - p.y) ** 2 <= r * r && (s.x - q.x) ** 2 + (s.y - q.y) ** 2 <= r * r).length;
  const p1 = [...b.map.pads].sort((p, q) => shared(q, q) - shared(p, p))[0]!;
  const p2 = b.map.pads.filter((p) => p !== p1).sort((p, q) => shared(q, p1) - shared(p, p1))[0]!;
  [p1, p2].forEach((pad, i) => {
    const pc = pieces[i];
    if (!pc) return;
    if (!command(b, { t: "build", pad: pad.id, tower: pc[0] }).ok) throw new Error(`build ${pc[0]}`);
    const t = towers(b).find((q) => q.pad === pad.id)!;
    while (t.level < Math.min(3, pc[1])) command(b, { t: "upgrade", tower: t.id });
    if (pc[1] >= 4) command(b, { t: "specialise", tower: t.id, spec: pc[2]! });
    t.building = 0;
  });
  command(b, { t: "call" });
  const seen = new WeakSet<EnemyX>();
  for (let i = 0; i < 30 * 60 * 12 && b.phase === "running"; i++) {
    for (const e of enemies(b)) if (!seen.has(e)) { seen.add(e); if (!e.boss) { e.hp *= HPX; e.maxHp *= HPX; } }
    step(b);
    b.events.length = 0;
  }
  return towers(b).reduce((a, t) => a + t.stats.damage, 0);
}

export function battleLifts(say: (s: string) => void) {
  say(`== Synergy lifts in battle (act ${ACT} waves, health x${HPX}, ${SEEDS} seeds; together vs each alone, same pads and gold; target 40-100%) ==`);
  for (const [name, a, c] of PAIRS) {
    let both = 0, aa = 0, cc = 0;
    for (let s = 1; s <= SEEDS; s++) { both += play([a, c], s * 31); aa += play([a, null], s * 31); cc += play([null, c], s * 31); }
    const lift = both / Math.max(1, aa + cc) - 1;
    say(`  ${name.padEnd(38)} ${(100 * lift).toFixed(0).padStart(4)}%  (alone ${Math.round(aa / SEEDS)} + ${Math.round(cc / SEEDS)}, together ${Math.round(both / SEEDS)})  ${lift < 0.4 ? "LOW" : lift > 1.2 ? "BUG (>120%)" : lift > 1 ? "high" : "ok"}`);
  }
}

if (import.meta.main) battleLifts(console.log);
