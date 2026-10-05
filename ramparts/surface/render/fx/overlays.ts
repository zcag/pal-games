// Per-enemy overlays synced by id: HP bars with chip drain, armour/ward strips, shield segment,
// elite frame and status pips (art 3.5, 3.6), plus the status body treatments: ice shell, chill
// motes, flames, hex runes, oil skirt, mark diamond, shield bubble, stun stars, root vines,
// revealed eye, war-cry chevron. Soldiers get the green bar only when damaged.
import * as THREE from "../../vendor/three.js";
import type { Battle, Enemy } from "../../../game/types.ts";
import type { Ctx } from "./core.ts";
import { C } from "./gl/atlas.ts";
import { Bars } from "./gl/bars.ts";
import { D } from "./gl/decals.ts";
import { K } from "./palette.ts";
import { emit, rnd } from "./particles.ts";
import { P } from "./presets.ts";
import { BAR, bodyOf } from "./sizes.ts";

export interface EState {
  id: number; seen: number;
  shown: number;        // displayed hp fraction
  chip: number;         // chip end fraction
  chipFrom: number; chipT: number;  // chip drain start
  lastDmg: number;      // fx time of last damage (-1 = never)
  barA: number;         // bar alpha (fades in 80 ms)
  frozenAt: number; thawAt: number; wasFrozen: boolean;
  shieldHit: number;    // ripple time
  markFlash: number;
  flash: number;        // body hit flash time
  emitT: number;        // next status particle time
  wasShield: boolean;
  big: boolean;
  z: number; h: number;  // last height and body height (for bursts after death)
}

const pool: EState[] = [];
const states = new Map<number, EState>();
const soldierHp = new Map<number, { lastDmg: number; seen: number }>();
let frame = 0;
const pos = { x: 0, y: 0 };

function get(id: number, e: Enemy | null, T: number): EState {
  let s = states.get(id);
  if (!s) {
    s = pool.pop() ?? ({} as EState);
    const f = e ? e.hp / Math.max(1, e.maxHp) : 1;
    Object.assign(s, { id, seen: frame, shown: f, chip: f, chipFrom: f, chipT: -9, lastDmg: -1, barA: 0, frozenAt: -9, thawAt: -9, wasFrozen: false, shieldHit: -9, markFlash: -9, flash: -9, emitT: T + rnd() * 0.3, wasShield: false, z: 0, h: 0.75, big: false });
    states.set(id, s);
  }
  return s;
}
export function enemyState(id: number, T: number): EState { return get(id, null, T); }
export function peekState(id: number): EState | undefined { return states.get(id); }
let lastT = 0;
/**
 * Body hooks for the renderer's instanced enemies (art 5.3): white hit flash 0..1 (decays over
 * 70 ms, at most once per 100 ms) and the squash amount 0..0.15 (60 ms). Read per instance.
 */
export const bodyFx = {
  flash(id: number): number { const s = states.get(id); return s ? Math.max(0, 1 - (lastT - s.flash) / 0.07) * 0.8 : 0; },
  squash(id: number): number { const s = states.get(id); return s ? Math.max(0, 1 - (lastT - s.flash) / 0.06) * (s.big ? 0.15 : 0.08) : 0; },
  frozen(id: number): boolean { return states.get(id)?.wasFrozen ?? false; },
};

export function clearOverlays(): void { for (const s of states.values()) pool.push(s); states.clear(); soldierHp.clear(); }

/** Called from hit events: start the chip drain, flash, bar fade-in. */
export function noteHit(c: Ctx, id: number, e: Enemy | null, shieldDmg: number, big: boolean): boolean {
  const s = get(id, e, c.T);
  s.lastDmg = c.T;
  const fresh = c.T - s.flash >= 0.1;
  if (fresh) { s.flash = c.T; s.big = big; }
  if (shieldDmg > 0) s.shieldHit = c.T;
  return fresh;
}
export function noteSoldierHit(id: number, T: number): void { const s = soldierHp.get(id); if (s) s.lastDmg = T; else soldierHp.set(id, { lastDmg: T, seen: frame }); }

export const bars = new Bars(700);

// ---------------------------------------------------------------- bar placement
// Candidates are collected, then placed by priority on a coarse screen grid: a bar whose
// cell, or the cell right above or below it, is taken is dropped, so stacked units never
// build a ladder of bars. Elites always show.
const SWARM = new Set(["swarmling", "bat", "slimelet", "shard", "brood", "pup", "sandling"]);
const CAND = 700;
const CX = new Float32Array(CAND), CY = new Float32Array(CAND), CZ = new Float32Array(CAND), CW = new Float32Array(CAND), CH = new Float32Array(CAND);
const CF = new Float32Array(CAND), CC = new Float32Array(CAND), CS = new Float32Array(CAND), CA = new Float32Array(CAND), CPR = new Float32Array(CAND);
const CFL = new Uint8Array(CAND), CN = new Uint8Array(CAND), CP = new Float32Array(CAND * 4);
const ORD = new Uint16Array(CAND);
let nc = 0;
const GW = 96, GH = 96;
const grid = new Uint8Array(GW * GH);
const pv = new THREE.Vector3();
function placeBars(c: Ctx): void {
  const ord = ORD.subarray(0, nc);
  ord.sort((a, b) => CPR[b]! - CPR[a]!);
  grid.fill(0);
  const cw = 22 * c.ui, ch = 7 * c.ui, cam = c.stage.camera;
  for (let q = 0; q < nc; q++) {
    const k = ord[q]!;
    pv.set(CX[k]!, CY[k]!, CZ[k]!).project(cam);
    const sx = (pv.x + 1) * 0.5 * c.vw, sy = (1 - pv.y) * 0.5 * c.vh;
    const gx = Math.floor(sx / cw), gy = Math.floor(sy / ch);
    const inside = gx >= 0 && gy >= 1 && gx < GW && gy < GH - 1;
    const elite = (CFL[k]! & 8) !== 0;
    if (inside) {
      const i = gy * GW + gx;
      if (!elite && (grid[i] || grid[i - GW] || grid[i + GW])) continue;
      grid[i] = 1;
    }
    bars.add(CX[k]!, CY[k]!, CZ[k]!, CW[k]!, CH[k]!, CF[k]!, CC[k]!, CS[k]!, CA[k]!, CFL[k]! & 3, (CFL[k]! & 4) !== 0, elite, false,
      CN[k]!, CP[k * 4]!, CP[k * 4 + 1]!, CP[k * 4 + 2]!, CP[k * 4 + 3]!);
  }
  nc = 0;
}

const PIPS: number[] = [0, 0, 0, 0];
let np = 0;
function pip(cell: number): void { if (np < 4) PIPS[np] = cell; np++; }
export function drawOverlays(c: Ctx, b: Battle): void {
  frame++;
  lastT = c.T;
  const T = c.T, ox = c.ox, oz = c.oz, ui = c.ui;
  bars.begin();
  nc = 0;
  for (let i = 0; i < b.enemies.length; i++) {
    const e = b.enemies[i];
    if (e.hp <= 0) continue;
    const s = get(e.id, e, T);
    s.seen = frame;
    c.epos(e, pos);
    const bd = bodyOf(e);
    const wx = pos.x + ox, wz = pos.y + oz, gy = Math.max(0, e.z);
    const st = e.st;
    s.z = gy; s.h = bd.h;
    const frac = Math.max(0, Math.min(1, e.hp / Math.max(1, e.maxHp)));
    // chip drain: lost hp shows gold and drains over 350 ms (ease-in)
    if (frac < s.shown - 1e-4) {
      s.chipFrom = Math.max(s.chip, s.shown); s.chipT = T; s.shown = frac;
      if (s.lastDmg < 0) s.lastDmg = T;
    } else if (frac > s.shown) { s.shown = frac; }
    const ct = Math.min(1, (T - s.chipT) / 0.35);
    s.chip = s.chipFrom + (s.shown - s.chipFrom) * ct * ct;

    // ---------------- body treatments
    const hx = wx, hy = gy + bd.h, hz = wz;
    const frozen = st.frozen > 0;
    if (frozen && !s.wasFrozen) { s.frozenAt = T; }
    if (!frozen && s.wasFrozen) { s.thawAt = T; emit(P.steam, 3, wx, gy + bd.h * 0.5, wz, bd.h); }
    s.wasFrozen = frozen;
    const fw = bd.foot * 0.62 * 1.15, fh = bd.h * 0.58 * 1.15;
    if (frozen || T - s.thawAt < 0.2) {
      const grow = frozen ? Math.min(1, (T - s.frozenAt) / 0.15) : 1;
      const fade = frozen ? 1 : 1 - (T - s.thawAt) / 0.2;
      c.ice.add(wx, gy + fh * 0.98, wz, e.id * 1.7, 0, 0, fw, fh, fw, K.ice[0] * 0.8, K.ice[1] * 0.85, K.ice[2] * 0.9, 0.8 * fade, 0.05, 0.9, 0.6, grow);
      // pale blue blob shadow
      c.ground.add(wx, 0.015, wz, bd.foot * 0.9, bd.foot * 0.9, D.SOFT, 0, K.frost[0], K.frost[1], K.frost[2], 0.25 * fade, 1, 1.2);
    } else if (st.chill > 0) {
      if (T > s.emitT) { emit(P.frostMote, 1, wx, gy + bd.h * 0.8, wz, Math.max(0.8, bd.h)); s.emitT = T + 0.35 + rnd() * 0.2; }
      c.ground.add(wx, 0.015, wz, bd.foot * 0.8, bd.foot * 0.8, D.SOFT, 0, K.chill[0], K.chill[1], K.chill[2], 0.11, 1, 1.2);
    }
    if (st.burnT > 0 && !frozen) {
      // 2-3 flame cards on the body, flickering
      const n = bd.h > 1 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const ph = T * 9 + e.id * 1.3 + k * 2.1;
        const fl = 0.8 + 0.2 * Math.sin(ph) * Math.sin(ph * 1.7);
        const off = (k - (n - 1) / 2) * bd.foot * 0.42;
        const sz = bd.h * (k === 1 ? 0.62 : 0.46) * fl;
        c.body.add(hx + off, gy + bd.h * (k === 1 ? 0.42 : 0.3) + sz * 0.35, hz + off * 0.3, sz * 0.66, sz, C.FLAME,
          K.fireCore[0] * 1.5, K.fireCore[1] * 1.5, K.fireCore[2] * 1.5, 0.85, 0.15, Math.sin(ph * 0.7) * 0.25 + off * 0.6, 0, K.fireDeep[0] * 1.1, K.fireDeep[1] * 1.1, K.fireDeep[2] * 1.1);
      }
      if (T > s.emitT) { emit(P.ember, 1, wx, gy + bd.h * 0.7, wz, Math.max(0.8, bd.h)); s.emitT = T + 0.18 + rnd() * 0.12; }
    }
    if (st.hexed > 0) {
      for (let k = 0; k < 3; k++) {
        const a = T * 2.4 + (k * Math.PI * 2) / 3 + e.id;
        const r = bd.foot * 0.75 + 0.12;
        c.body.add(wx + Math.cos(a) * r, gy + bd.h * 0.55 + Math.sin(a * 2) * 0.04, wz + Math.sin(a) * r, 0.2, 0.2, C.RUNE + k,
          K.hex[0] * 1.4, K.hex[1] * 1.4, K.hex[2] * 1.4, 0.95, 0.2);
      }
    }
    if (st.oiled > 0) {
      const sh = bd.h * 0.42;
      c.oil.add(wx, gy + sh * 0.5, wz, 0, 0, 0, bd.foot * 0.56, sh, bd.foot * 0.56, K.oil[0], K.oil[1], K.oil[2], 0.88, 0, 1.6, 0);
      if (rnd() < c.dt * 1.5) emit(P.oilSplash, 1, wx, gy + 0.1, wz, 0.4);
    }
    if (st.marked > 0) {
      const fl = T - s.markFlash < 0.2 ? 2.2 : 1.2;
      const spin = Math.cos(T * Math.PI);
      c.body.add(wx, hy + 0.32 + (st.hexed > 0 ? 0.0 : 0), wz, 9 * Math.max(0.25, Math.abs(spin)), 11, C.DIAMOND,
        K.mark[0] * fl, K.mark[1] * fl, K.mark[2] * fl, 1, 0.3, 0, 1);
    }
    if (e.maxShield > 0 && e.shield > 0) {
      // a tight hex outline at ~1.1x the body, low alpha, flashing on hits
      const rip = Math.max(0, 1 - (T - s.shieldHit) / 0.25);
      const d = Math.max(bd.foot, bd.h) * 1.1 * (1 + rip * 0.06), i = 1 + rip * 1.4;
      c.body.add(wx, gy + bd.h * 0.5, wz, d, d, C.SHELL, K.shield[0] * i, K.shield[1] * i, K.shield[2] * i, 0.38 + rip * 0.5, 0.35);
      s.wasShield = true;
    }
    if (st.stun > 0) {
      for (let k = 0; k < 3; k++) {
        const a = (T / 0.8) * Math.PI * 2 + (k * Math.PI * 2) / 3;
        c.body.add(wx + Math.cos(a) * 0.25, hy + 0.12 + Math.sin(a) * 0.04, wz + Math.sin(a) * 0.25, 0.14, 0.14, C.STAR,
          K.stun[0] * 1.5, K.stun[1] * 1.5, K.stun[2] * 1.5, 1, 0.5, a);
      }
    }
    if (st.root > 0) {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + e.id;
        const r = bd.foot * 0.4;
        c.body.add(wx + Math.cos(a) * r, gy + 0.16, wz + Math.sin(a) * r, 0.3, 0.3, C.VINE,
          K.root[0] * 1.3, K.root[1] * 1.3, K.root[2] * 1.3, 1, 1, a * 0.3 - 0.4, 0, K.thorn[0], K.thorn[1], K.thorn[2]);
      }
    }
    if (st.revealed > 0 && e.stealth) {
      c.body.add(wx, hy + 0.3, wz, 0.3, 0.3, C.EYE, K.gold[0] * 1.3, K.gold[1] * 1.3, K.gold[2] * 1.3, 1, 0.4);
    }
    if (st.warcry > 0) {
      c.body.add(wx, hy + 0.22 + Math.sin(T * 6) * 0.03, wz, 7, 6, C.CHEVRON, 1.4, 0.15, 0.08, 1, 0.6, 0, 1);
    }
    if (st.slow > 0 && st.slowT > 0 && st.chill <= 0 && !frozen && e.speed > 0 && rnd() < c.dt * 6) {
      emit(P.dust, 1, wx, 0.05, wz, 0.4, 0, 0, 0, K.chill);
    }

    // ---------------- hp bar (bosses use the HUD bar)
    if (e.boss) continue;
    const swarm = SWARM.has(e.kind) && !e.elite;
    // swarm-class units: a thin bar only for a moment after a hit, never a standing one
    const show = (frac < 0.999 || e.shield < e.maxShield) && (!swarm || T - s.lastDmg < 1.2) || e.elite;
    if (!show) { s.barA = 0; continue; }
    s.barA = Math.min(1, s.barA + c.dt / 0.08);
    const settled = s.lastDmg >= 0 && T - s.lastDmg > 2.5 && !e.elite ? 0.45 : swarm ? Math.max(0, 1 - (T - s.lastDmg - 0.8) / 0.4) : 1;
    const bw = swarm ? 12 : BAR[bd.cls][0], bh = swarm ? 2 : BAR[bd.cls][1];
    np = 0;
    PIPS[0] = PIPS[1] = PIPS[2] = PIPS[3] = 0;
    if (frozen) pip(C.PIP_FROZEN);
    if (st.burnT > 0) pip(C.PIP_BURN);
    if (st.hexed > 0) pip(C.PIP_HEX);
    if (st.oiled > 0) pip(C.PIP_OIL);
    if (st.marked > 0) pip(C.PIP_MARK);
    if (st.shred > 0 || st.corrode > 0) pip(C.PIP_SHRED);
    if (st.revealed > 0 && e.stealth) pip(C.PIP_REVEAL);
    if (np > 3) { PIPS[2] = C.PIP_PLUS; np = 3; }
    const shieldFrac = e.maxShield > 0 ? Math.min(1, e.shield / e.maxHp) : 0;
    const strip = e.armour > 0 ? 1 : e.ward > 0 ? 2 : 0;
    if (nc >= CAND) continue;
    const k = nc++;
    CX[k] = wx; CY[k] = hy + 0.25 * (bd.h > 1 ? 1.3 : 1); CZ[k] = wz; CW[k] = bw * ui; CH[k] = bh * ui;
    CF[k] = frac; CC[k] = Math.max(frac, s.chip); CS[k] = shieldFrac; CA[k] = s.barA * settled;
    CFL[k] = strip | (st.shred > 0 || st.corrode > 0 ? 4 : 0) | (e.elite ? 8 : 0); CN[k] = np;
    CP[k * 4] = PIPS[0]; CP[k * 4 + 1] = PIPS[1]; CP[k * 4 + 2] = PIPS[2]; CP[k * 4 + 3] = PIPS[3];
    // priority: elites, then the most hurt, then the freshly hit
    CPR[k] = (e.elite ? 10 : 0) + (1 - frac) + (T - s.lastDmg < 0.4 ? 0.5 : 0);
    ORD[k] = k;
  }
  placeBars(c);
  // soldiers: green bar only when damaged
  for (const so of b.soldiers) {
    if (so.state === "dead" || so.hp >= so.maxHp) continue;
    const x = so.px + (so.x - so.px) * c.alpha + ox, z = so.py + (so.y - so.py) * c.alpha + oz;
    bars.add(x, 0.95, z, 14 * ui, 2 * ui, so.hp / so.maxHp, so.hp / so.maxHp, 0, 0.9, 0, false, false, true, 0, 0, 0, 0, 0);
  }
  bars.end();
  // drop states of enemies that are gone
  if (frame % 30 === 0) for (const [id, s] of states) if (s.seen !== frame) { states.delete(id); pool.push(s); }
}
