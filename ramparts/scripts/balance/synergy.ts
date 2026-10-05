// Synergy lift (systems 13.5): damage of a named pair placed together, against the same two towers
// each measured alone on the same pads (same gold, no interaction). Target 40-100%, above 120% a bug.
import type { EnemyId, SpecId, TowerId } from "../../game/types.ts";
import { arena, put } from "../../game/battle/testkit.ts";
import { step, command } from "../../game/battle/index.ts";
import { towers } from "../../game/battle/internal.ts";
import type { Pad } from "../../game/types.ts";
import { geo } from "../../game/bot/model.ts";

type Piece = [TowerId, number, SpecId | null];
const PAIRS: [string, Piece, Piece][] = [
  ["Shatterline (Shatter + Archer III)", ["frost", 4, "shatter"], ["archer", 3, null]],
  ["Shatterline (Shatter + Ballista III)", ["frost", 4, "shatter"], ["ballista", 3, null]],
  ["Wildfire (Naphtha + Pyre III)", ["alchemist", 4, "naphtha"], ["pyre", 3, null]],
  ["Wildfire (Alchemist III + Inferno)", ["alchemist", 3, null], ["pyre", 4, "inferno"]],
  ["Deadeye (Beacon III + Marksmen)", ["beacon", 3, null], ["archer", 4, "marksmen"]],
  ["Deadeye (Hunter's Mark + Marksmen)", ["beacon", 4, "huntersmark"], ["archer", 4, "marksmen"]],
];
const HPX = Number(process.env.HPX ?? 8);
const STREAM: [EnemyId, number][] = [["footman", 0.8], ["brute", 1.6], ["runner", 1.2]];

function measure(pieces: (Piece | null)[], seed: number): number {
  const b = arena({ seed });
  b.lives = 1e9;
  // two pads that watch the same stretch of road: the best pad and its partner sharing the most road
  const g = geo(b);
  const lane0 = g.ground.filter((s) => s.lane === 0);
  const shared = (p: Pad, q: Pad) => lane0.filter((s) => (s.x - p.x) ** 2 + (s.y - p.y) ** 2 <= 9 && (s.x - q.x) ** 2 + (s.y - q.y) ** 2 <= 9).length;
  const p1 = [...b.map.pads].sort((p, q) => shared(q, q) - shared(p, p))[0]!;
  const p2 = b.map.pads.filter((p) => p !== p1).sort((p, q) => shared(q, p1) - shared(p, p1))[0]!;
  [p1, p2].forEach((pad, i) => {
    const pc = pieces[i];
    if (!pc) return;
    command(b, { t: "build", pad: pad.id, tower: pc[0] });
    const t = towers(b).find((q) => q.pad === pad.id)!;
    while (t.level < Math.min(3, pc[1])) command(b, { t: "upgrade", tower: t.id });
    if (pc[1] >= 4) command(b, { t: "specialise", tower: t.id, spec: pc[2]! });
    t.building = 0;
  });
  let d0 = 0;
  const secs = 50, warm = 12;
  for (let i = 0; i < secs * 30; i++) {
    for (const [role, gap] of STREAM) if (i % Math.round(gap * 30) === 0) { const e = put(b, role, 0); e.hp = e.maxHp = e.maxHp * HPX; }
    if (i === warm * 30) d0 = towers(b).reduce((a, t) => a + t.stats.damage, 0);
    step(b);
    b.events.length = 0;
  }
  if (process.env.SYNDEBUG) console.log(pieces.map((p) => p?.[0]), towers(b).map((t) => `${t.kind}${t.level} pad${t.pad} ${Math.round(t.stats.damage)}`), [p1.id, p2.id]);
  return towers(b).reduce((a, t) => a + t.stats.damage, 0) - d0;
}

export function synergyLifts(say: (s: string) => void) {
  say("== Synergy lifts (pair together vs each alone, same pads and gold; target 40-100%) ==");
  for (const [name, a, c] of PAIRS) {
    let both = 0, alone = 0;
    for (const seed of [3, 7, 11, 19]) { both += measure([a, c], seed); alone += measure([a, null], seed) + measure([null, c], seed); }
    const lift = both / Math.max(1, alone) - 1;
    say(`  ${name.padEnd(40)} ${(100 * lift).toFixed(0).padStart(4)}%  ${lift < 0.4 ? "LOW" : lift > 1.2 ? "BUG (>120%)" : lift > 1 ? "high" : "ok"}`);
  }
}

if (import.meta.main) synergyLifts(console.log);
