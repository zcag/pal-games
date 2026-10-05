// The pod (art.md 5): 16x14 art px from a character map, rebuilt whenever a level or a module changes.
// Parts that animate are separate sprites: two tread frames of the body, three drill frames each way,
// the folded side bit, flames by engine tier (3 frames x 4 heights), and a heat overlay for the fins.
import type { Stat } from "../../game/types.ts";
import { GF } from "./terrain.ts";
import { Atlas, GRP, Pix, spr, type Spr } from "./sprites.ts";

const MAP = [
  "....OOOOO.......",
  "...OgGGGGO......",
  "..OgGGGGGGO.....",
  "OOOOOOOOOOOO....",
  "OLLLLLLLLLlO....",
  "OHHHHHHHHHHOdO..",
  "OHhHHHHHHHHODDdO",
  "OHHHHHHHHHHODDDD",
  "OHhHHHHHHHHODDdO",
  "OhmmmmmmmmhOdO..",
  "OOOOOOOOOOOO....",
  "OtTtTtTtTtTO....",
  "OTtTtTtTtTtO....",
  ".OOOOOOOOOO.....",
];

const tier = (L: number, steps: number[]) => { let k = 0; for (let i = 0; i < steps.length; i++) if (L >= steps[i]) k = i; return k; };
const count = (L: number, steps: number[]) => steps.filter((s) => L >= s).length;

const PLATING = [
  { L: "#ffd870", H: "#d8a030", h: "#8a5a18", name: "bare" },
  { L: "#ffd870", H: "#d8a030", h: "#8a5a18", name: "riveted" },
  { L: "#ffb070", H: "#e07a30", h: "#8a4418", name: "plated" },
  { L: "#f4f6f8", H: "#d8dce0", h: "#8a8e96", name: "ceramic" },
  { L: "#5a5868", H: "#2a2834", h: "#16141c", name: "obsidian" },
  { L: "#86b4a2", H: "#4e7a6a", h: "#2a4a3e", name: "sower" },
  { L: "#fffaf0", H: "#f0e8d0", h: "#a89e88", name: "starhull" },
];
const BITS = [
  { c: "#8a8e96", d: "#4a4e56", tip: 3 },
  { c: "#b8c0cc", d: "#6a7280", tip: 3, stripe: true },
  { c: "#4a4e5a", d: "#2a2c34", tip: 4, stripe: true, hi: "#7a808c" },
  { c: "#b8c0cc", d: "#6a7280", tip: 4, stripe: true, tipC: "#bff8ff", tipE: 1.2 },
  { c: "#6a5a54", d: "#3a302c", tip: 4, tipC: "#ff8a2a", tipE: 1.5 },
  { c: "#5a9a8a", d: "#2e5a50", tip: 4, glyph: "#8affd0", tipE: 1.0 },
  { c: "#c9a0ff", d: "#7a5aaa", tip: 4, tall: true, tipC: "#f0e0ff", tipE: 2.0 },
  { c: "#fff2c0", d: "#c8a860", tip: 5, tipC: "#ffffff", tipE: 3.0 },
];
const FLAMES = [
  { i: "#ffd0a0", m: "#ff6a2a", t: "#c03a10", w: 2 },
  { i: "#fff0c0", m: "#ffa040", t: "#ff6a1a", w: 3 },
  { i: "#ffffff", m: "#fff4d0", t: "#ffa040", w: 3 },
  { i: "#ffffff", m: "#8ac8ff", t: "#4a7aff", w: 3 },
  { i: "#ffffff", m: "#c08aff", t: "#7a4aff", w: 3 },
];
const LAMP_TINT = ["#ffe0b0", "#ffe0b0", "#fff6e8", "#e8f4ff"];
const MODULE_COL: Record<string, string> = {
  magnet: "#c0602a", heat_sink: "#4a7aff", heatsink: "#4a7aff", dense: "#9aa2b4", packing: "#9aa2b4", afterburner: "#8ac8ff",
  smelter: "#ff8a2a", drone: "#5ad88a", ear: "#e0c040", prospector: "#e0c040", overcharge: "#c08aff", tracer: "#32e08a", vein: "#32e08a", recycler: "#5ad88a",
};
const modColor = (m: string) => { const k = m.toLowerCase(); for (const n in MODULE_COL) if (k.includes(n)) return MODULE_COL[n]; return "#9aa2b4"; };
const has = (mods: readonly string[], n: string) => mods.some((m) => m.toLowerCase().includes(n));

/** Lamp look by level (art.md 5.2, 5.5). */
export const lampTint = (L: number) => LAMP_TINT[tier(L, [0, 4, 8, 12])];
export const flameTier = (L: number) => tier(L, [0, 5, 10, 15, 20]);
export const FLAME_COLORS = FLAMES;

export interface PodSprites {
  key: string;
  body: Spr[]; drillSide: Spr[]; drillDown: Spr[]; drillFold: Spr; flame: Spr[][]; heat: Spr;
  /** Pod-local positions (art px from the sprite's top-left at map col 0) of the vents and the lamp. */
  vents: number[]; lamp: [number, number];
}

const BACK = 10, TOP = 4; // room behind and above the 16x14 map for back parts, tanks and the antenna

export function buildPod(atlas: Atlas, levels: Record<Stat, number>, modules: readonly string[]): PodSprites {
  const key = JSON.stringify([levels, modules]);
  const plate = PLATING[tier(levels.hull, [0, 3, 6, 9, 12, 15, 18])];
  const bit = BITS[tier(levels.drill, [0, 2, 5, 8, 11, 14, 17, 20])];
  const lampT = tier(levels.lamp, [0, 4, 8, 12]);
  const scanT = count(levels.scanner, [1, 4, 8]);
  const fins = count(levels.radiator, [4, 8, 12, 16, 20]);
  const tanks = count(levels.tank, [4, 8, 12, 16]);
  const cargo = count(levels.cargo, [5, 10, 15, 20]);
  const finT = Math.min(1, levels.radiator / 20);
  const sockets = [0, 1, 2, 3].map((i) => modules[i]);
  const POD = { flags: GF.SELFLIT };
  const OUT = { flags: GF.UNLIT };

  const body = [0, 1].map((frame) => {
    const p = new Pix(16 + BACK, 14 + TOP + 1);
    const X = (x: number) => x + BACK, Y = (y: number) => y + TOP;
    MAP.forEach((row, y) => [...row].forEach((ch, x) => {
      if (x >= 12 && y >= 5 && y <= 9) return; // the side drill is its own sprite
      const px = X(x), py = Y(y);
      switch (ch) {
        case "O": p.set(px, py, "#0b0d12", OUT); break;
        case "G": p.set(px, py, has(modules, "tracer") || has(modules, "vein") ? "#5ae8b0" : "#5ac8ff", { ...POD, n: [0.2, -0.4], e: 1.1 }); break;   // lit cockpit: the pod's guaranteed bright accent
        case "g": p.set(px, py, "#e8fbff", { ...POD, n: [-0.5, -0.5], e: 2.2 }); break;
        case "L": p.set(px, py, "#ffd870", { ...POD, n: [0, -0.6] }); break;
        case "l": p.set(px, py, lampTint(levels.lamp), { ...POD, e: 2.5 }); break;
        case "H": p.set(px, py, plate.H, POD); break;
        case "h": p.set(px, py, plate.h, POD); break;
        case "m": { const s = sockets[Math.floor((x - 2) / 2)]; p.set(px, py, s ? modColor(s) : plate.h, POD); break; }
        case "t": case "T": { const on = ((x + frame) & 1) === (ch === "t" ? 0 : 1); p.set(px, py, on ? "#5a5e6a" : "#2a2c34", POD); break; }
      }
    }));
    // Plating details.
    const pn = plate.name;
    if (pn === "riveted") for (let x = 2; x < 11; x += 3) { p.set(X(x), Y(5), plate.L, POD); p.set(X(x), Y(8), plate.L, POD); }
    if (pn === "plated") for (let y = 5; y <= 8; y++) { p.set(X(4), Y(y), plate.h, POD); p.set(X(8), Y(y), plate.h, POD); }
    if (pn === "ceramic") { for (let x = 1; x < 11; x++) p.set(X(x), Y(5), plate.L, POD); p.set(X(1), Y(8), "#ffd870", POD); }
    if (pn === "obsidian") { for (let x = 1; x < 11; x += 2) p.set(X(x), Y(5), "#e8e8f0", POD); p.set(X(9), Y(7), "#e8e8f0", POD); }
    if (pn === "sower") { for (let x = 1; x < 11; x++) if (x % 3 !== 0) p.set(X(x), Y(7), "#e0c040", POD); }
    if (pn === "starhull") { for (let x = 1; x < 11; x++) p.set(X(x), Y(8), x % 2 ? "#9a6aff" : plate.h, POD); p.set(X(5), Y(6), "#9a6aff", { ...POD, e: 0.6 }); }
    // Lamp housing grows: 1 px, 2 px, 2x2, 3x2 with a lens px.
    const lt = lampTint(levels.lamp);
    if (lampT >= 1) p.set(X(9), Y(4), lt, { ...POD, e: 2.5 });
    if (lampT >= 2) { p.set(X(10), Y(5), lt, { ...POD, e: 2.5 }); p.set(X(9), Y(5), "#ffd870", POD); }
    if (lampT >= 3) { p.set(X(8), Y(4), lt, { ...POD, e: 2.5 }); p.set(X(10), Y(4), "#ffffff", { ...POD, e: 3 }); }
    // Back parts: the cargo box widens 1 px per step; fuel tanks stack on the back; fin pairs above and below.
    for (let k = 1; k <= cargo; k++) for (let y = 5; y <= 9; y++) p.set(X(-k), Y(y), y === 5 ? plate.L : y === 9 ? plate.h : plate.H, POD);
    if (cargo) { for (let y = 4; y <= 10; y++) p.set(X(-cargo - 1), Y(y), "#0b0d12", OUT); for (let k = 1; k <= cargo; k++) { p.set(X(-k), Y(4), "#0b0d12", OUT); p.set(X(-k), Y(10), "#0b0d12", OUT); } }
    if (cargo >= 4) for (let y = 6; y <= 8; y++) p.set(X(-2), Y(y), "#ffd870", { ...POD, e: 0.6 });
    if (has(modules, "dense") || has(modules, "packing")) for (let y = 5; y <= 9; y++) p.set(X(-1 - ((y - 5) % 2)), Y(y), "#9aa2b4", POD);
    const tankAt = [[0, 0], [-3, 0], [0, -3], [-3, -3]];
    for (let k = 0; k < tanks; k++) {
      const [tx, ty] = tankAt[k];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const px = X(tx + i), py = Y(ty + j); if (!p.a(px, py)) p.set(px, py, j === 0 ? "#c8ccd2" : i === 2 ? "#5a5e6a" : "#8a9098", POD); }
      for (let i = -1; i <= 3; i++) { if (!p.a(X(tx + i), Y(ty - 1))) p.set(X(tx + i), Y(ty - 1), "#0b0d12", OUT); }
      for (let j = 0; j < 3; j++) if (!p.a(X(tx - 1), Y(ty + j))) p.set(X(tx - 1), Y(ty + j), "#0b0d12", OUT);
    }
    if (tanks >= 4) p.set(X(1), Y(1), "#5ad88a", { ...POD, e: 1.0 });
    // Radiator fins: a comb of 1x3 fins beside the treads, one per step; the glow tells the levels between.
    for (let k = 0; k < fins; k++) for (let j = 0; j < 3; j++) p.set(X(-1 - 2 * k), Y(10 + j), mixHex("#4a7aff", "#e8f4ff", finT), { ...POD, e: 0.4 + 0.05 * levels.radiator });
    // Modules' tells on the body.
    if (has(modules, "heat")) for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) p.set(X(1 + i), Y(5 + j), "#1a2240", { ...POD, e: 0.6, ec: "#4a7aff", grp: GRP.INST });
    if (has(modules, "afterburner")) { p.rect(X(-2), Y(11), 2, 2, "#5a5e6a", POD); p.set(X(-3), Y(11), "#0b0d12", OUT); p.set(X(-3), Y(12), "#0b0d12", OUT); }
    if (has(modules, "smelter")) { for (let j = 1; j <= 3; j++) p.set(X(2), Y(-j + 2 - 2), "#5a5e6a", POD); p.set(X(2), Y(-2), "#ff8a2a", { ...POD, e: 1.0 }); }
    if (has(modules, "ear") || has(modules, "prospector")) { p.set(X(7), Y(-1), "#e0c040", POD); p.set(X(8), Y(-2), "#e0c040", POD); }
    if (has(modules, "recycler")) for (let j = 0; j < 3; j++) { p.set(X(-4), Y(5 + j), "#3a5a48", POD); p.set(X(-5), Y(5 + j), "#5ad88a", { ...POD, e: 0.8, grp: GRP.INST }); }
    // Scanner: antenna with a blinking tip; dish; turning ring dish.
    if (scanT >= 1) { p.set(X(5), Y(-1), "#9aa2b4", POD); p.set(X(5), Y(-2), "#9aa2b4", POD); p.set(X(5), Y(-3), "#7fe8ff", { ...POD, e: 1.2, grp: GRP.INST }); }
    if (scanT >= 2) { p.set(X(4), Y(-2), "#c8ccd2", POD); p.set(X(6), Y(-2), "#c8ccd2", POD); }
    if (scanT >= 3) { p.set(X(3 + frame * 4), Y(-3), "#7fe8ff", { ...POD, e: 0.8 }); p.set(X(4), Y(-3), "#c8ccd2", POD); p.set(X(6), Y(-3), "#c8ccd2", POD); }
    p.outline();
    p.bevel(3);
    p.rim();
    return spr(atlas, p, BACK + 8, TOP + 7, `pod-body-${frame}`);
  });

  // Side drill: map cols 12-15, rows 5-9, 3 frames of the spiral stripe; the deeper tiers are longer or taller.
  const drillSide = [0, 1, 2].map((f) => {
    const len = bit.tip, tall = bit.tall ? 1 : 0;
    const p = new Pix(len + 3, 5 + tall * 2);
    const mid = 2 + tall;
    for (let x = 0; x < len + 1; x++) {
      const half = Math.max(0, Math.round((2 + tall) * (1 - x / (len + 0.5))));
      for (let dy = -half; dy <= half; dy++) {
        const stripe = bit.stripe && ((x + dy + f) % 3 === 0);
        const c = dy > 0 ? bit.d : stripe ? (bit.hi ?? bit.d) : bit.c;
        const tipPx = x >= len - 1 && bit.tipC;
        p.set(x, mid + dy, tipPx ? bit.tipC! : c, { flags: GF.SELFLIT, e: tipPx ? bit.tipE : bit.glyph && (x + f) % 3 === 1 && dy === 0 ? bit.tipE : 0, ec: bit.glyph && !tipPx ? bit.glyph : undefined, grp: tipPx ? GRP.INST : GRP.ALWAYS });
      }
    }
    p.outline(); p.bevel(2);
    return spr(atlas, p, -1, mid, `pod-drill-${f}`);
  });
  // Down drill: an 8x5 cone below the treads.
  const drillDown = [0, 1, 2].map((f) => {
    const p = new Pix(10, 7 + (bit.tall ? 2 : 0));
    const hgt = 5 + (bit.tall ? 2 : 0);
    for (let y = 0; y < hgt; y++) {
      const half = Math.max(0, 4 - Math.round(y * 4 / hgt));
      for (let x = -half; x < half || (half === 0 && x === 0); x++) {
        const stripe = bit.stripe && ((x + y + f) % 3 === 0);
        const tipPx = y >= hgt - 2 && bit.tipC;
        p.set(5 + x, y, tipPx ? bit.tipC! : x >= 0 ? bit.d : stripe ? (bit.hi ?? bit.d) : bit.c, { flags: GF.SELFLIT, e: tipPx ? bit.tipE : 0, grp: tipPx ? GRP.INST : GRP.ALWAYS });
      }
    }
    p.outline(); p.bevel(2);
    return spr(atlas, p, 5, 0, `pod-ddrill-${f}`);
  });
  const fold = new Pix(4, 5); fold.rect(0, 1, 2, 3, bit.c, { flags: GF.SELFLIT }); fold.set(1, 3, bit.d, { flags: GF.SELFLIT }); fold.outline(); fold.bevel(1);
  const drillFold = spr(atlas, fold, 0, 2, "pod-fold");
  // Flames: per frame, heights 3..6; inner HDR 3.0, mid 1.6, tip 0.8.
  const fc = FLAMES[flameTier(levels.engine)];
  const flame = [0, 1, 2].map((f) => [3, 4, 5, 6].map((h) => {
    const w = fc.w, p = new Pix(w + 2, h);
    for (let y = 0; y < h; y++) {
      const k = y / h, half = (w / 2) * (1 - k * 0.7) + ((f + y) % 2) * 0.3;
      for (let x = 0; x < w + 2; x++) {
        const dx = Math.abs(x + 0.5 - (w + 2) / 2);
        if (dx > half + 0.2) continue;
        const inner = k < 0.35 && dx < half * 0.6, tip = k > 0.7;
        p.set(x, y, inner ? fc.i : tip ? fc.t : fc.m, { e: inner ? 3.0 : tip ? 0.8 : 1.6, flags: GF.UNLIT });
      }
    }
    return spr(atlas, p, Math.floor((w + 2) / 2), 0, `pod-flame-${f}-${h}`);
  }));
  // Heat overlay: the fins blend to #ff5a1a and the hull tints (scaled per instance).
  const hp = new Pix(16 + BACK, 14 + TOP + 1);
  for (let k = 0; k < Math.max(1, fins); k++) for (let j = 0; j < 3; j++) hp.set(BACK - 1 - 2 * k, TOP + 10 + j, "#ff5a1a", { e: 1.5, grp: GRP.INST, flags: GF.SELFLIT });
  const heat = spr(atlas, hp, BACK + 8, TOP + 7, "pod-heat");
  return { key, body, drillSide, drillDown, drillFold, flame, heat, vents: [3, 8], lamp: [10, 4] };
}

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return "#" + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0");
}
