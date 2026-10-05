// Persistent per-frame layers: zones (ground decals drawn before units), boss telegraphs from
// Enemy.boss.tele (art 5.6), disabled-tower smoke and sapper bombs, range rings / spell aim /
// rally reach from `focus` (art 3.7, 5.8), and the dotted air route before a flying wave.
import * as THREE from "../../vendor/three.js";
import type { Battle, BattleMap, Zone } from "../../../game/types.ts";
import { focus } from "../api.ts";
import type { Ctx, Timed } from "./core.ts";
import { C } from "./gl/atlas.ts";
import { D } from "./gl/decals.ts";
import type { RGB } from "./gl/common.ts";
import { BOSS, K, KEY } from "./palette.ts";
import { emit, rnd } from "./particles.ts";
import { P } from "./presets.ts";
import { lastTele } from "./spells.ts";
import { BODIES, towerTop } from "./sizes.ts";
import { rangeOf } from "../../../game/battle/query.ts";
import { TOWERS } from "../../../game/content/battle/towers.ts";
import type { Tower } from "../../../game/types.ts";

/** Exact range from the rules; the content table if the battle has no rules state (dev stand-in). */
function rangeSafe(b: Battle, t: Tower): number {
  try { return rangeOf(b, t); } catch {
    const d = TOWERS[t.kind];
    return t.spec ? d.specs.find((s) => s.id === t.spec)?.stats.range ?? 3 : d.levels[Math.min(2, t.level - 1)]!.range;
  }
}
function hitsAir(t: Tower): boolean {
  const d = TOWERS[t.kind];
  return t.spec ? d.specs.find((s) => s.id === t.spec)?.air ?? d.air : d.air;
}

// ---------------------------------------------------------------- zones
const zoneAngle = new Map<number, number>();
const zoneEmit = new Map<number, number>();

function pathAngle(map: BattleMap, x: number, y: number): number {
  let best = 1e9, ang = 0;
  for (const l of map.lanes) {
    for (let i = 0; i + 1 < l.points.length; i++) {
      const a = l.points[i], b = l.points[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
      const d = Math.hypot(a.x + dx * t - x, a.y + dy * t - y);
      if (d < best) { best = d; ang = Math.atan2(dy, dx); }
    }
  }
  return ang;
}

export function drawZones(c: Ctx, b: Battle): void {
  for (let i = 0; i < b.zones.length; i++) {
    const z = b.zones[i];
    const age = z.total - z.ticks;
    const a = Math.min(1, age / 5) * Math.min(1, z.ticks / 15);
    const X = c.wx(z.x), Z = c.wz(z.y), r = z.r, seed = (z.id * 7.31) % 50;
    switch (z.kind) {
      case "oil": c.ground.add(X, 0.008, Z, r, r, D.OIL, 0, K.oil[0], K.oil[1], K.oil[2], 0.75 * a, 1, 0, 0, 0, 0, 0, 0, 0, 0, seed); break;
      case "acid": c.ground.add(X, 0.008, Z, r, r, D.ACID, 0, K.acid[0] * 0.8, K.acid[1] * 0.8, K.acid[2] * 0.8, 0.5 * a, 1, 0, 0, 0, 0, 0.5, 0.6, 0.2, 0, seed); break;
      case "tar": c.ground.add(X, 0.008, Z, r, r, D.TAR, 0, K.tar[0], K.tar[1], K.tar[2], 0.85 * a, 1, 0, 0, 0, 0, 0, 0, 0, 0, seed); break;
      case "crater": c.ground.add(X, 0.008, Z, r, r, D.CRATER, 0, K.scorch[0], K.scorch[1], K.scorch[2], 0.5 * a, 1, 0, 0, 0, 0, K.dust[0], K.dust[1], K.dust[2], 0, seed); break;
      case "fire": case "burning": {
        c.ground.add(X, 0.009, Z, r, r, D.FIRE, 0, K.char[0], K.char[1], K.char[2], 0.55 * a, 1, 0.8, 0, 0, 0, K.fire[0] * 1.6, K.fire[1] * 1.6, K.fire[2] * 1.6, 1, seed);
        flames(c, z, X, Z, a);
        break;
      }
      case "bramble": {
        c.ground.add(X, 0.009, Z, r, r, D.BRAMBLE, 0, 0.05, 0.09, 0.04, 0.7 * a, 1, 0, 0, 0, 0, K.root[0], K.root[1], K.root[2], 1, seed);
        const n = Math.min(14, Math.round(r * r * 3));
        for (let k = 0; k < n; k++) {
          const an = k * 2.399 + seed, rr = r * 0.85 * Math.sqrt((k + 0.5) / n);
          const h = 0.28 * a * (0.7 + 0.3 * Math.sin(k * 1.7));
          c.spike.add(X + Math.cos(an) * rr, 0, Z + Math.sin(an) * rr, an, Math.sin(an) * 0.3, Math.cos(an) * 0.3, h * 0.2, h, h * 0.2, K.root[0], K.root[1], K.root[2], 1, 0, 0.5);
        }
        break;
      }
      case "barrier": {
        let ang = zoneAngle.get(z.id);
        if (ang === undefined) { ang = c.map ? pathAngle(c.map, z.x, z.y) + Math.PI / 2 : 0; zoneAngle.set(z.id, ang); }
        const half = Math.max(0.9, r);
        c.ground.add(X, 0.01, Z, half, 0.35, D.BARRIER, ang, K.root[0], K.root[1], K.root[2], 0.9 * a, 1, 0, 0, 0, 0, 0.12, 0.2, 0.05, 1, seed);
        const n = Math.round(half * 6);
        const grow = Math.min(1, age / 4);
        for (let k = 0; k < n; k++) {
          const u = (k / (n - 1)) * 2 - 1;
          const ox = Math.cos(ang) * u * half, oz = Math.sin(ang) * u * half;
          const j = Math.sin(k * 12.9 + seed) * 0.12;
          const h = (0.75 + 0.35 * Math.abs(Math.sin(k * 3.7 + seed))) * grow * Math.min(1, z.ticks / 8);
          c.spike.add(X + ox - Math.sin(ang) * j, 0, Z + oz + Math.cos(ang) * j, k, (rnd() - 0.5) * 0.02 + Math.sin(k) * 0.25, Math.cos(k * 1.3) * 0.25, h * 0.22, h, h * 0.22,
            K.root[0], K.root[1], K.root[2], 1, 0, 0.5);
        }
        break;
      }
    }
  }
  if (zoneAngle.size > 64) zoneAngle.clear();
}

function flames(c: Ctx, z: Zone, X: number, Z: number, a: number): void {
  const next = zoneEmit.get(z.id) ?? 0;
  if (c.T < next || c.dt <= 0) return;
  // ~14 flame cards per u^2 per second, capped
  const rate = Math.min(40, 10 * z.r * z.r * (z.kind === "burning" ? 1.4 : 1));
  zoneEmit.set(z.id, c.T + 1 / rate);
  const an = rnd() * Math.PI * 2, rr = z.r * 0.85 * Math.sqrt(rnd());
  emit(P.flame, 1, X + Math.cos(an) * rr, 0.04, Z + Math.sin(an) * rr, 0.85 * a + 0.15);
  if (rnd() < 0.15) emit(P.smokeThin, 1, X + Math.cos(an) * rr, 0.4, Z + Math.sin(an) * rr, 1.2);
  if (zoneEmit.size > 128) zoneEmit.clear();
}

// ---------------------------------------------------------------- telegraphs
export function drawTelegraphs(c: Ctx, b: Battle): void {
  for (const e of b.enemies) {
    const tl = e.boss?.tele;
    if (!tl || !e.boss) continue;
    const col = BOSS[e.boss.id] ?? K.warn;
    const prog = tl.total > 0 ? Math.max(0, Math.min(1, 1 - tl.ticks / tl.total)) : 0;
    const ab = tl.ability.toLowerCase();
    const dl = tl.dx !== undefined && tl.dy !== undefined ? Math.hypot(tl.dx, tl.dy) : 0;
    let shape = 0, rot = 0, len = 0, half = 0, sx = tl.x, sy = tl.y;
    if (dl > 0) {
      rot = Math.atan2(tl.dy!, tl.dx!);
      if (ab.includes("breath") || ab.includes("cone")) { shape = 1; len = tl.r; half = Math.PI / 6; }
      // a long (dx, dy) is the move itself (charge): (x, y) is where it ends, so the stripe runs up to it
      else if (dl > 1.5) { shape = 2; len = dl; sx = tl.x - tl.dx!; sy = tl.y - tl.dy!; }
      else { shape = 2; len = Math.max(tl.r, 2); }
    } else if (tl.r <= 0) continue;   // no area (ice armour, bone ward, sandstorm): the "!" and the boss pose say it
    // the windup pulse speeds up near the trigger
    const pulse = 0.85 + 0.15 * Math.sin(c.T * (6 + prog * 14));
    const w = shape === 2 ? 0.7 : tl.r;
    for (let pass = 0; pass < 2; pass++) {
      const g = pass ? c.groundTop : c.ground, a = pass ? pulse * 0.4 : pulse;
      if (shape === 0) g.add(c.wx(tl.x), 0.022, c.wz(tl.y), tl.r, tl.r, D.TELE, 0, col[0], col[1], col[2], a, 1, prog, 0, 0, 0);
      else if (shape === 1) g.add(c.wx(tl.x), 0.022, c.wz(tl.y), len, len, D.CONE, rot, col[0], col[1], col[2], a, 1, prog, 0, half, 0);
      else {
        const cx = sx + Math.cos(rot) * len * 0.5, cy = sy + Math.sin(rot) * len * 0.5;
        g.add(c.wx(cx), 0.022, c.wz(cy), len * 0.5, w, D.STRIPE, rot, col[0], col[1], col[2], a, 1, prog, 0, 0, 0);
      }
    }
    lastTele.set(e.id, { x: sx, y: sy, r: shape === 2 ? w : tl.r, shape, rot, len, half });
    // sand ripple / churn on burrow windups
    if (ab.includes("burrow") || ab.includes("emerge") || ab.includes("surface")) {
      if (c.dt > 0 && rnd() < 0.5) emit(P.sand, 1, c.wx(tl.x) + (rnd() - 0.5) * tl.r, 0.1, c.wz(tl.y) + (rnd() - 0.5) * tl.r, 0.7);
    }
  }
}

// ---------------------------------------------------------------- towers (disabled, sapper bombs)
const smokeAt = new Map<number, number>();
export const sapped = new Map<number, number>();   // tower id -> fx time planted
export function drawTowers(c: Ctx, b: Battle): void {
  for (const tw of b.towers) {
    if (tw.disabled <= 0) { sapped.delete(tw.id); continue; }
    const X = c.wx(c.tx(tw)), Z = c.wz(c.ty(tw)), top = towerTop(tw.kind, tw.level);
    const n = smokeAt.get(tw.id) ?? 0;
    if (c.T >= n && c.dt > 0) { smokeAt.set(tw.id, c.T + 0.22); emit(P.smoke, 1, X + (rnd() - 0.5) * 0.4, top * 0.8, Z + (rnd() - 0.5) * 0.4, 0.9); }
    if (sapped.has(tw.id)) {
      // a ticking bomb with a red countdown ring above the tower
      const y = top + 0.55, pulse = 0.5 + 0.5 * Math.sin(c.T * (8 + 10 / Math.max(1, tw.disabled / 10)));
      c.over.add(X, y, Z, 9, 9, C.DOT, 0.03, 0.025, 0.02, 1, 1, 0, 1);
      c.over.add(X, y, Z, 15, 15, C.RING, K.leak[0] * (1 + pulse), K.leak[1] * (1 + pulse), K.leak[2] * (1 + pulse), 0.9, 0.3, 0, 1);
      c.over.add(X + 0.08, y + 0.14, Z, 0.16, 0.16, C.SPARK, 2.6, 2.1, 1.2, 0.6 + 0.4 * pulse, 0, c.T * 9);
    }
  }
}

// ---------------------------------------------------------------- focus: range rings, aim, rally
const accentCache = new Map<string, RGB>();
const tmpC = new THREE.Color();
function cssCol(s: string): RGB {
  let v = accentCache.get(s);
  if (!v) { tmpC.set(s); v = [tmpC.r, tmpC.g, tmpC.b]; accentCache.set(s, v); }
  return v;
}

export function drawFocus(c: Ctx, b: Battle | null): void {
  const T = c.RT;
  // Alt held: every built tower's range, thin and faint in its accent (ticks = ground only)
  if (focus.allRanges && b) {
    for (const t of b.towers) {
      if (t.building > 0) continue;
      const r = rangeSafe(b, t);
      if (!(r > 0)) continue;
      const acc = cssCol((t.spec && TOWERS[t.kind].specs.find((s) => s.id === t.spec)?.accent) || TOWERS[t.kind].accent);
      const air = hitsAir(t);
      // faint fill + outline per tower; the hovered / selected tower's own ring lights up
      const hot = t.pad === focus.pad || t.id === focus.tower;
      c.ground.add(c.wx(c.tx(t)), hot ? 0.029 : 0.028, c.wz(c.ty(t)), r, r, D.RING, 0,
        hot ? K.ring[0] : acc[0] * 0.9, hot ? K.ring[1] : acc[1] * 0.9, hot ? K.ring[2] : acc[2] * 0.9, hot ? 0.85 : 0.4, 1,
        hot ? 0.06 : 0.04, air ? 0 : 32, T * 0.25, air ? 0 : 1, acc[0], acc[1], acc[2], hot ? 0.08 : 0.025);
    }
  }
  const rg = focus.ring;
  if (rg) {
    const acc = cssCol(rg.accent);
    const phase = T * 0.04 * Math.PI * 2;
    // line #FFF6E2 80%, 24 dashes rotating 0.04 rev/s (ticks for ground-only), accent fill 8% + inner glow
    c.ground.add(c.wx(rg.x), 0.03, c.wz(rg.y), rg.r, rg.r, D.RING, 0, K.ring[0], K.ring[1], K.ring[2], 0.8, 1,
      0.07, 24, phase, rg.ground ? 1 : 0, acc[0], acc[1], acc[2], 0.08);
    if (rg.next && rg.next > 0) {
      c.ground.add(c.wx(rg.x), 0.031, c.wz(rg.y), rg.next, rg.next, D.RING, 0, K.gold[0], K.gold[1], K.gold[2], 0.75, 1,
        0.06, 36, -phase * 1.5, 0, 0, 0, 0, 0);
    }
  }
  const aim = focus.aim;
  if (aim) {
    const col = aim.ok ? K.ring : K.invalid;
    const fill = aim.ok ? K.gold : K.invalid;
    c.ground.add(c.wx(aim.x), 0.032, c.wz(aim.y), aim.r, aim.r, D.RETICLE, 0, col[0], col[1], col[2], 0.85, 1, 0, 0, T * 0.6, 0, fill[0], fill[1], fill[2], 0.1);
  }
  // rally: the candidate point, or the selected barracks' current rally
  let rp = focus.rally;
  if (!rp && focus.tower != null && b) { const tw = c.tower(focus.tower); if (tw?.rally) rp = tw.rally; }
  if (rp) {
    c.ground.add(c.wx(rp.x), 0.03, c.wz(rp.y), 1.3, 1.3, D.RING, 0, K.ourBlue[0] * 1.4, K.ourBlue[1] * 1.4, K.ourBlue[2] * 1.4, 0.85, 1,
      0.06, 28, T * 0.5, 2, K.ourBlue[0], K.ourBlue[1], K.ourBlue[2], 0.06);
  }
}

// ---------------------------------------------------------------- air route before a flying wave
let stepsAt = -9;
const usedLanes = new Set<number>(), usedSpawns = new Set<number>();
export function drawAirRoute(c: Ctx, b: Battle): void {
  const map = c.map;
  if (!map) return;
  const between = b.phase === "setup" || b.countdown > 0;
  if (!between) { stepsAt = -9; return; }
  const w = b.waves[b.next];
  if (!w) return;
  // wave preview (art 5.9): footstep dashes run the road from the horde gate, every 4 s
  if (c.RT - stepsAt > 4) {
    stepsAt = c.RT;
    usedLanes.clear();
    for (const g of w.groups) if (!BODIES[g.kind]?.flyer) usedLanes.add(g.lane);
    for (const li of usedLanes) { const f = c.spawn(footsteps, 1.4, 0, 0); f.id = li; f.col = KEY[c.theme]; }
  }
  if (!map.air.length) return;
  let flyers = w.badges.includes("air");
  if (!flyers) for (const g of w.groups) if (BODIES[g.kind]?.flyer) { flyers = true; break; }
  if (!flyers) return;
  const used = usedSpawns;
  used.clear();
  for (const g of w.groups) { const lane = map.lanes[g.lane]; if (lane && BODIES[g.kind]?.flyer) used.add(lane.spawn); }
  const T = c.RT;
  for (const air of map.air) {
    if (used.size && !used.has(air.spawn)) continue;
    const step = 0.55, off = (T * 0.8) % step;
    let wingNext = 2;
    for (let s = off; s < air.length; s += step) {
      // walk the polyline
      let i = 0;
      while (i + 1 < air.cum.length && air.cum[i + 1] < s) i++;
      const a = air.points[i], bpt = air.points[Math.min(i + 1, air.points.length - 1)];
      const seg = (air.cum[i + 1] ?? air.length) - air.cum[i] || 1;
      const u = (s - air.cum[i]) / seg;
      const x = a.x + (bpt.x - a.x) * u, y = a.y + (bpt.y - a.y) * u;
      const fade = Math.min(1, s / 1.5, (air.length - s) / 1.5);
      c.over.add(c.wx(x), 1.5, c.wz(y), 3, 3, C.DOT, K.cloth[0], K.cloth[1], K.cloth[2], 0.4 * fade, 1, 0, 1);
      if (s > wingNext) {
        wingNext = s + 4;
        c.over.add(c.wx(x), 1.65, c.wz(y), 10, 7, C.WING, K.cloth[0], K.cloth[1], K.cloth[2], 0.45 * fade, 1, 0, 1);
      }
    }
  }
}

/** 12 glowing footstep dashes in the next wave's key colour running a lane (1.4 s, alpha 50%). */
function footsteps(c: Ctx, f: Timed, t: number): void {
  const lane = c.map?.lanes[f.id];
  if (!lane) return;
  const head = t * lane.length * 1.15;
  for (let k = 0; k < 12; k++) {
    const s = head - k * 0.55;
    if (s < 0 || s > lane.length) continue;
    let i = 0;
    while (i + 2 < lane.cum.length && lane.cum[i + 1]! < s) i++;
    const a = lane.points[i]!, bp = lane.points[i + 1]!;
    const seg = lane.cum[i + 1]! - lane.cum[i]! || 1, u = (s - lane.cum[i]!) / seg;
    const dx = (bp.x - a.x) / seg, dy = (bp.y - a.y) / seg, side = k % 2 ? 0.14 : -0.14;
    const x = a.x + (bp.x - a.x) * u - dy * side, y = a.y + (bp.y - a.y) * u + dx * side;
    const al = 0.5 * (1 - k / 12) * Math.min(1, (1 - t) * 4);
    c.ground.add(c.wx(x), 0.02, c.wz(y), 0.17, 0.09, D.SOFT, Math.atan2(dy, dx), f.col[0] * 1.3, f.col[1] * 1.3, f.col[2] * 1.3, al, 0.3, 1.2);
  }
}
