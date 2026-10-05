// How big things are on screen (art 3.3, 3.5, 4.1), so overlays sit on heads and bursts scale
// with the body. Cosmetic only; the rules never read this.
import type { EnemyId, Enemy, TowerId } from "../../../game/types.ts";

export type SizeClass = "S" | "M" | "L" | "XL" | "B";
export interface Body { cls: SizeClass; h: number; foot: number; flyer?: boolean }

const B = (cls: SizeClass, h: number, foot: number, flyer = false): Body => ({ cls, h, foot, flyer });
export const BODIES: Record<EnemyId, Body> = {
  footman: B("M", 0.75, 0.5), runner: B("M", 0.6, 0.42), brute: B("L", 1.2, 0.9), acolyte: B("M", 0.8, 0.5),
  shieldbearer: B("L", 1.0, 0.7), shaman: B("M", 0.85, 0.5), splitter: B("M", 0.7, 0.7), slime: B("M", 0.55, 0.55),
  slimelet: B("S", 0.4, 0.4), shade: B("M", 0.8, 0.5), swarmling: B("S", 0.45, 0.3), sapper: B("M", 0.7, 0.5),
  bat: B("S", 0.5, 0.8, true), drake: B("L", 1.4, 2.4, true), juggernaut: B("XL", 1.8, 1.4), warlock: B("L", 1.3, 0.7),
  matron: B("XL", 1.6, 1.4), skeleton: B("M", 0.75, 0.45), shard: B("S", 0.45, 0.35), risen: B("M", 0.75, 0.5),
  sandling: B("S", 0.5, 0.45), brood: B("S", 0.45, 0.35), pup: B("S", 0.5, 0.45), "ember-runner": B("M", 0.6, 0.42),
  "ember-drake": B("L", 1.4, 2.4, true),
  gorrak: B("B", 2.8, 1.8), wyrm: B("B", 3.0, 2.0), colossus: B("B", 3.4, 2.4), tyrant: B("B", 3.2, 2.4),
  hivequeen: B("B", 2.6, 2.4), lich: B("B", 2.8, 1.4), packlord: B("B", 2.6, 2.0),
};
const DEFAULT = B("M", 0.75, 0.5);
export const body = (k: EnemyId): Body => BODIES[k] ?? DEFAULT;

/** Elites draw 1.15x (art 3.2). */
export function bodyOf(e: Enemy): { h: number; foot: number; cls: SizeClass } {
  const b = body(e.kind), s = e.elite ? 1.15 : 1;
  return { h: b.h * s, foot: b.foot * s, cls: e.elite && (b.cls === "M" || b.cls === "L") ? "XL" : b.cls };
}

/** HP bar px at 720x390 (art 3.5). */
export const BAR: Record<SizeClass, [number, number]> = { S: [14, 2], M: [18, 3], L: [24, 3], XL: [32, 4], B: [40, 4] };

/** Kill burst size per class. */
export const BURST: Record<SizeClass, number> = { S: 0.6, M: 1, L: 1.5, XL: 2.1, B: 3.2 };

/** Tower heights by level (art 4.1) and shape factor. */
const SQUAT: Partial<Record<TowerId, number>> = { barracks: 0.75, bombard: 0.75, alchemist: 0.75, storm: 1.15, beacon: 1.15 };
export function towerTop(kind: TowerId, level: number): number {
  const h = [1.7, 1.7, 2.2, 2.7, 3.0][Math.max(0, Math.min(4, level))];
  return h * (SQUAT[kind] ?? 1);
}
