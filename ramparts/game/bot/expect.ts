// What an experienced player expects a battle to send: for each role, how many come over a whole
// battle and how big one column of it is, averaged over battles of the same act, floor and kind.
// Game knowledge, not this battle's hidden waves (it never reads b.waves).
import type { Act, BattleKind, EnemyId } from "../types.ts";
import { Rng, hash } from "../rng.ts";
import { generateWaves } from "../battle/waves.ts";

export interface Expect { total: number; column: number }

const cache = new Map<string, Map<EnemyId, Expect>>();

export function expectRoles(act: Act, kind: BattleKind, floor: number, lanes: number, asc: number): Map<EnemyId, Expect> {
  const key = `${act}/${kind}/${floor}/${lanes}/${asc}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const sum = new Map<EnemyId, { total: number; column: number; seen: number }>();
  const N = 24;
  for (let i = 0; i < N; i++) {
    const g = generateWaves({ rng: new Rng(hash(0xe7, i)), act, kind, floor, lanes, asc, threatMul: 1, haunted: false, firstBattle: false });
    const per = new Map<EnemyId, { total: number; column: number }>();
    for (const w of g.waves) {
      const inWave = new Map<EnemyId, number>();
      for (const gr of w.groups) inWave.set(gr.kind, (inWave.get(gr.kind) ?? 0) + gr.count);
      for (const [k, n] of inWave) { const p = per.get(k) ?? { total: 0, column: 0 }; p.total += n; p.column = Math.max(p.column, n); per.set(k, p); }
    }
    for (const [k, p] of per) { const s = sum.get(k) ?? { total: 0, column: 0, seen: 0 }; s.total += p.total; s.column += p.column; s.seen++; sum.set(k, s); }
  }
  const out = new Map<EnemyId, Expect>();
  for (const [k, s] of sum) out.set(k, { total: s.total / s.seen, column: s.column / s.seen });
  cache.set(key, out);
  return out;
}
