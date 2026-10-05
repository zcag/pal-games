// Menu backdrops: a made-up map per look (no pads). The title's road winds up to our castle.
import type { BattleMap, Lane, Vec } from "../../../game/types.ts";

function lane(pts: Vec[]): Lane {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  return { id: 0, points: pts, cum, length: cum[cum.length - 1]!, spawn: 0, exit: 0 };
}

function smooth(pts: Vec[], n = 6): Vec[] {
  // Catmull-Rom through the control points
  const out: Vec[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    for (let s = 0; s < n; s++) {
      const t = s / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

export function vistaMap(key: string): BattleMap {
  const w = 32, h = 18;
  const title = key === "title";
  const ctrl: Vec[] = title
    ? [{ x: 0, y: 12.5 }, { x: 5, y: 13.5 }, { x: 9, y: 10 }, { x: 13, y: 13 }, { x: 17.5, y: 11.5 }, { x: 19.6, y: 9.4 }]
    : [{ x: 0, y: 6 }, { x: 6, y: 5 }, { x: 10, y: 11 }, { x: 16, y: 13 }, { x: 22, y: 8 }, { x: 27, y: 6 }, { x: 32, y: 9 }];
  const pts = smooth(ctrl);
  const L = lane(pts);
  const seed = { title: 11, meadow: 21, desert: 31, peaks: 41, citadel: 51 }[key] ?? 7;
  return {
    seed, act: 1, theme: title ? "meadow" : (key as BattleMap["theme"]), w, h, layout: "single",
    lanes: [L], air: [L], spawns: [pts[0]!], exits: [pts[pts.length - 1]!], pads: [],
    water: title ? [{ x: 4.5, y: 3.5, r: 1.8 }, { x: 28.5, y: 15.8, r: 1.3 }] : [{ x: 4, y: 15.5, r: 1.6 }, { x: 28, y: 2.5, r: 1.4 }],
  };
}
