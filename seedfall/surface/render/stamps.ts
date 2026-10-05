// Find stamps (art.md 3.3, 3.4): every ore shape class, jackpot, cache and artifact drawn once at boot
// as 16x16 cells of colour indices. The terrain shader picks a cell per tile and maps the indices
// through the find's palette, so a stamp carries the shape and content carries the colours.
//
// Index: 0 empty, 1 outline (host dark x0.6, or #0b0d12 for objects), 2 base, 3 light, 4 glint px,
//        5 c4 (dark centre, inclusion, patina), 6 c5 (emissive accent), 7 c6 (second accent).
import { rng } from "../../game/rng.ts";
import { CLASSES, type OreClass } from "./look.ts";

export const CELL = 16;
export const ATLAS_COLS = 32;
export const VARIANTS = 4;
export const COPIES = 3;

type Px = Uint8Array; // 16x16
const at = (c: Px, x: number, y: number) => (x >= 0 && y >= 0 && x < 16 && y < 16 ? c[y * 16 + x] : 0);
const put = (c: Px, x: number, y: number, v: number) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < 16 && y < 16) c[y * 16 + x] = v; };
type R = ReturnType<typeof rng>;

function disc(c: Px, cx: number, cy: number, r: number, v: number, lightV = 0) {
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    if (dx * dx + dy * dy <= r * r) put(c, x, y, lightV && dx + dy < -r * 0.25 ? lightV : v);
  }
}
function line(c: Px, x0: number, y0: number, x1: number, y1: number, v: number) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) put(c, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, v);
}
function rect(c: Px, x: number, y: number, w: number, h: number, v: number) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(c, x + i, y + j, v); }

/** Draw one copy of a class centred at (cx, cy), size factor s (1 = full, 0.7 = an extra piece). */
function drawClass(c: Px, cls: OreClass, cx: number, cy: number, s: number, r: R) {
  switch (cls) {
    case "speck": {
      // chunky 2x2 grains, each with a light corner
      const n = Math.round((6 + r.int(0, 2)) * s * s) + 1;
      for (let i = 0; i < n; i++) {
        const x = Math.round(cx + r.range(-5, 4) * s), y = Math.round(cy + r.range(-5, 4) * s);
        rect(c, x, y, 2, 2, 2); put(c, x, y, 3); if (r.chance(0.5)) put(c, x + 2, y + 1, 2);
      }
      break;
    }
    case "vein": {
      // a thick wandering seam of filled lumps, lit along its upper edge
      const n = s > 0.8 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 6 * s + r.range(-1, 1);
        for (let k = 0; k <= 10; k++) {
          const t = k / 10, x = cx - 6 * s + 12 * s * t + off * 0.6, y = cy + 5 * s - 11 * s * t + Math.sin(t * 5 + i) * 1.2 + off * 0.4;
          disc(c, x, y, 1.6 * Math.max(0.75, s), 2);
        }
        for (let k = 1; k < 10; k += 2) { const t = k / 10; put(c, cx - 6 * s + 12 * s * t + off * 0.6 - 1, cy + 5 * s - 11 * s * t + Math.sin(t * 5 + i) * 1.2 + off * 0.4 - 1, 3); }
        put(c, cx + off * 0.6 + 1, cy + 1, 5);
      }
      break;
    }
    case "dendrite": {
      // a chunky branching cluster (silver wire in a lump), 2 px limbs
      const limbs: [number, number, number, number][] = [[-5, 5, 0, 0], [0, 0, 5, -5], [0, 0, -4, -4], [0, 0, 4, 3]];
      for (const [x0, y0, x1, y1] of limbs) for (let k = 0; k <= 6; k++) { const t = k / 6; rect(c, Math.round(cx + (x0 + (x1 - x0) * t) * s), Math.round(cy + (y0 + (y1 - y0) * t) * s), 2, 2, 2); }
      for (const [, , x1, y1] of limbs) put(c, Math.round(cx + x1 * s), Math.round(cy + y1 * s), 3);
      rect(c, Math.round(cx - 1), Math.round(cy - 1), 3, 3, 3);
      break;
    }
    case "nugget": {
      const n = s > 0.8 ? r.int(3, 5) : 2;
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.283 + r.range(0, 1), d = i === 0 ? 0 : r.range(2.5, 4.5) * s;
        disc(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d, r.range(1.2, 2.1) * s, 2, 3);
      }
      break;
    }
    case "band": {
      // a filled pebble with one bright stripe across it
      const w = 5 * s, h = 3.4 * s;
      for (let y = -h - 1; y <= h + 1; y++) for (let x = -w - 1; x <= w + 1; x++) {
        const e = (x * x) / (w * w) + (y * y) / (h * h);
        if (e > 1) continue;
        put(c, cx + x, cy + y, Math.abs(y - x * 0.35) < 0.8 ? 3 : (x + y < -w * 0.7 ? 3 : 2));
      }
      break;
    }
    case "block": {
      const n = s > 0.8 ? r.int(2, 3) : 1;
      const spots = [[-3, -2], [2, -1], [-1, 3], [3, 3]];
      for (let i = 0; i < n; i++) {
        const z = Math.round((r.chance(0.5) ? 4 : 3) * Math.max(0.75, s));
        const x = Math.round(cx + spots[i][0] * s - z / 2), y = Math.round(cy + spots[i][1] * s - z / 2);
        rect(c, x, y, z, z, 2);
        for (let k = 0; k < z; k++) { put(c, x + k, y, 3); put(c, x, y + k, 3); }
        put(c, x + z - 1, y + z - 1, 5);
      }
      break;
    }
    case "spike": {
      const bx = Math.round(cx - 2), by = Math.round(cy + 4 * s);
      rect(c, bx, by, 4, 2, 2);
      const angs = [-0.55, 0, 0.55];
      for (const a of angs) {
        const len = 5 * s + (a === 0 ? 1 : 0);
        for (let k = 0; k <= len; k++) {
          const x = cx + Math.sin(a) * k, y = by - k;
          put(c, x - 0.5, y, k < len - 1 ? 3 : 2); put(c, x + 0.5, y, 2);
        }
      }
      break;
    }
    case "ring": {
      // a geode druse: a filled lump of crystal points around a dark heart
      disc(c, cx, cy, 4.2 * s, 2, 3);
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.55; put(c, cx + Math.cos(a) * 5 * s, cy + Math.sin(a) * 5 * s, 3); }
      rect(c, Math.round(cx - 1), Math.round(cy), 2, 2, 5);
      break;
    }
    case "gem": {
      const R = Math.round(3.5 * s);
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
        if (Math.abs(x) + Math.abs(y) > R) continue;
        const v = x <= 0 && y <= 0 ? 3 : x > 0 && y > 0 ? 5 : 2;
        put(c, cx + x, cy + y, v);
      }
      put(c, cx - 1, cy - 1, 3);
      break;
    }
    case "orb": {
      const R = 2.7 * s;
      disc(c, cx, cy, R, 2, 3);
      put(c, cx, cy, 3); put(c, cx - 1, cy, 3);
      break;
    }
    case "star": {
      // a chunky four-point star: 3x3 core, tapered 2 px rays
      const R = Math.round(4 * s + 0.5);
      rect(c, Math.round(cx - 1), Math.round(cy - 1), 3, 3, 3);
      for (let k = 2; k <= R; k++) {
        const wd = k < R - 1 ? 1 : 0;
        for (let j = -wd; j <= wd; j++) { put(c, cx + k, cy + j, 2); put(c, cx - k, cy + j, 2); put(c, cx + j, cy + k, 2); put(c, cx + j, cy - k, 3); }
      }
      break;
    }
    case "plate": {
      const w = Math.round(6 * s + 1), h = Math.round(4 * s + 1);
      const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!(x === w - 1 && y === 0) && !(x === 0 && y === h - 1)) put(c, x0 + x, y0 + y, y === 0 || x === 0 ? 3 : 2);
      line(c, x0 + 1, y0 + Math.floor(h / 2), x0 + w - 2, y0 + Math.floor(h / 2), 3);
      put(c, x0 + 1, y0 + 1, 5); put(c, x0 + w - 2, y0 + h - 2, 5);
      break;
    }
    case "drop": {
      const R = 2.5 * s;
      disc(c, cx, cy + 1 * s, R, 2, 3);
      for (let k = 1; k <= Math.round(3 * s); k++) put(c, cx - 0.4 + (k > 1 ? 0 : 0), cy + 1 * s - R - k + 1, k < 2 ? 3 : 2);
      put(c, cx, cy + 1 * s, 5);
      break;
    }
  }
}

/** Mark outline px (empty 4-neighbours of drawn px) and one glint px (the top-left-most light px). */
function finish(c: Px, glint = true) {
  const out: number[] = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (at(c, x, y)) continue;
    if (at(c, x - 1, y) > 1 || at(c, x + 1, y) > 1 || at(c, x, y - 1) > 1 || at(c, x, y + 1) > 1) out.push(y * 16 + x);
  }
  for (const i of out) c[i] = 1;
  if (!glint) return;
  let best = -1, bs = 1e9;
  for (let i = 0; i < 256; i++) if (c[i] === 3) { const s = (i >> 4) + (i & 15); if (s < bs) { bs = s; best = i; } }
  if (best >= 0) c[best] = 4;
}

// ---------------------------------------------------------------- specials

/** Jackpots (art.md 3.4): drawn by key; extra colours ride in c4..c6 of the find table. */
const JACKPOTS: Record<string, (c: Px) => void> = {
  fallen_star: (c) => { // a cracked lump in a scorched pocket, cracks glowing
    disc(c, 8, 8.5, 5, 2, 3);
    line(c, 5, 6, 8, 9, 6); line(c, 8, 9, 11, 7, 6); line(c, 8, 9, 7, 12, 6); put(c, 9, 5, 6);
  },
  strongbox: (c) => {
    rect(c, 2, 4, 12, 9, 2); rect(c, 2, 4, 12, 1, 3); rect(c, 2, 4, 1, 9, 3);
    for (const [x, y] of [[2, 4], [13, 4], [2, 12], [13, 12]]) put(c, x, y, 6);
    rect(c, 3, 7, 10, 1, 5); rect(c, 7, 8, 2, 2, 6);
  },
  motherlode: (c) => { const r = rng(7); for (let i = 0; i < 6; i++) { const a = i * 1.1; disc(c, 8 + Math.cos(a) * (i ? 3 : 0), 8 + Math.sin(a) * (i ? 2.3 : 0), i ? 2.2 : 3.2, 2, 3); } void r; },
  payroll: (c) => {
    rect(c, 2, 5, 12, 8, 2); rect(c, 2, 4, 12, 2, 3); rect(c, 2, 8, 12, 1, 5);
    put(c, 7, 8, 6); put(c, 8, 8, 6); put(c, 13, 13, 6); put(c, 14, 12, 6); put(c, 12, 13, 6);
  },
  starheart: (c) => { rect(c, 6, 6, 4, 4, 3); for (let k = 2; k <= 5; k++) { put(c, 8 + k, 8, 3); put(c, 7 - k, 8, 2); put(c, 8, 8 + k, 2); put(c, 7, 7 - k, 3); } for (let k = 1; k <= 2; k++) { put(c, 9 + k, 5 - k + 1, 2); put(c, 6 - k, 5 - k + 1, 2); put(c, 9 + k, 10 + k - 1, 2); put(c, 6 - k, 10 + k - 1, 2); } },
  moonpearl: (c) => { rect(c, 2, 3, 12, 3, 5); rect(c, 3, 2, 10, 1, 5); disc(c, 8, 9.5, 4, 2, 3); put(c, 8, 9, 3); },
  phoenix_diamond: (c) => { rect(c, 6, 6, 4, 4, 3); for (let k = 2; k <= 5; k++) { put(c, 8 + k, 8, 3); put(c, 7 - k, 8, 2); put(c, 8, 8 + k, 2); put(c, 7, 7 - k, 3); } put(c, 7, 7, 6); put(c, 8, 8, 6); },
  sower_crown: (c) => {
    rect(c, 2, 9, 12, 3, 2); rect(c, 2, 9, 12, 1, 3);
    for (const x of [2, 6, 9, 13]) { put(c, x, 8, 3); put(c, x, 7, 3); put(c, x, 6, 2); }
    for (const x of [4, 11]) { put(c, x, 8, 3); put(c, x, 7, 2); }
    put(c, 5, 10, 6); put(c, 8, 10, 6); put(c, 11, 10, 6);
  },
  seed_tear: (c) => { disc(c, 8, 10, 3.7, 2, 3); for (let k = 0; k < 5; k++) put(c, 8 - (k > 2 ? 0 : 0), 6 - k, k < 3 ? 3 : 2); put(c, 7, 9, 6); put(c, 8, 10, 6); },
  ember_heart: (c) => { disc(c, 8, 8.5, 4.5, 2, 3); line(c, 6, 7, 10, 10, 6); line(c, 9, 6, 7, 11, 6); },
  iron_seed: (c) => { disc(c, 8, 8, 4.6, 2, 3); line(c, 4, 8, 12, 8, 5); put(c, 6, 6, 3); },
};

/** Caches (art.md 3.4) by theme key; the palette is in CACHE_COLORS. */
const CACHES: Record<string, (c: Px) => void> = {
  crate: (c) => { rect(c, 1, 3, 14, 11, 2); rect(c, 1, 3, 14, 1, 3); rect(c, 1, 7, 14, 1, 5); rect(c, 1, 11, 14, 1, 5); line(c, 4, 3, 4, 13, 7); line(c, 11, 3, 11, 13, 7); },
  cart: (c) => { for (let y = 0; y < 8; y++) rect(c, 1 + Math.floor(y / 3), 4 + y, 13 - Math.floor(y / 2), 1, 2); rect(c, 1, 4, 13, 1, 3); disc(c, 5, 6, 2.5, 5, 0); disc(c, 9, 5.5, 2, 5, 3); disc(c, 11, 13, 1.7, 7); },
  geode: (c) => { disc(c, 8, 8.5, 6, 2, 3); disc(c, 8, 8.5, 3.6, 6); for (let k = 0; k < 6; k++) { const a = k * 1.2; put(c, 8 + Math.cos(a) * k * 0.5, 8.5 + Math.sin(a) * k * 0.5, 7); } },
  spore: (c) => { disc(c, 8, 9, 5.8, 2, 3); line(c, 3, 8, 13, 8, 6); for (let k = 0; k < 4; k++) put(c, 4 + k * 3, 11 + (k % 2), 5); },
  ember: (c) => { rect(c, 1, 4, 14, 10, 2); rect(c, 1, 4, 14, 2, 3); rect(c, 4, 9, 8, 1, 6); put(c, 1, 4, 5); put(c, 14, 4, 5); put(c, 1, 13, 5); put(c, 14, 13, 5); },
  coffer: (c) => { rect(c, 2, 5, 12, 8, 2); rect(c, 2, 5, 12, 2, 3); rect(c, 6, 8, 4, 3, 5); put(c, 7, 9, 6); put(c, 8, 9, 6); put(c, 7, 10, 6); },
  seedpod: (c) => { disc(c, 8, 8.5, 5.5, 2, 3); for (let y = 3; y < 14; y++) put(c, 8 + Math.round(Math.sin(y * 0.8) * 0.6), y, 6); },
  urn: (c) => { rect(c, 5, 3, 6, 2, 3); disc(c, 8, 9.5, 5, 2, 3); rect(c, 4, 9, 8, 1, 6); },
  strongbox: (c) => { rect(c, 1, 4, 14, 10, 2); rect(c, 1, 4, 14, 1, 3); rect(c, 1, 4, 1, 10, 3); rect(c, 3, 8, 10, 1, 5); rect(c, 7, 9, 2, 2, 7); },
};

/** Cache themes: base, light, glint, c4, c5 (emissive), c6, and the c5 HDR. */
export const CACHE_COLORS: Record<string, { c: string[]; hdr: number }> = {
  crate: { c: ["#7a5030", "#a87650", "#f0d8a8", "#4a2f1f", "#7a5030", "#c7a25a"], hdr: 0 },
  cart: { c: ["#6a6a70", "#9a9aa4", "#e0e8f0", "#8a4a32", "#c87a52", "#2a2c34"], hdr: 0 },
  geode: { c: ["#8a8070", "#b8ae98", "#ffffff", "#5a5248", "#a8dcea", "#e8dcc0"], hdr: 0.6 },
  spore: { c: ["#6a5a3a", "#9a8a5a", "#f0f0d0", "#3a3020", "#5cffc8", "#000000"], hdr: 0.7 },
  ember: { c: ["#3a2a2a", "#5a4444", "#ffd0b0", "#1a1010", "#ff8a2a", "#000000"], hdr: 0.9 },
  coffer: { c: ["#8a8270", "#b4ac98", "#fffbe0", "#5a5244", "#8affd0", "#000000"], hdr: 0.8 },
  seedpod: { c: ["#4a2a3a", "#6a4458", "#ffe0f0", "#2a1420", "#fff2c0", "#000000"], hdr: 0.9 },
  urn: { c: ["#4a4440", "#6e665e", "#f0e0d0", "#2a2624", "#ff6a1a", "#000000"], hdr: 0.6 },
  strongbox: { c: ["#4e3a30", "#7a5e4e", "#f0e0d0", "#2a201c", "#a85a30", "#c8d0d8"], hdr: 0 },
};

/** Jackpot extra colours (c4, c5 emissive, c6) by key; base/light/glint come from content. */
export const JACKPOT_EXTRA: Record<string, string[]> = {
  fallen_star: ["#2a1e18", "#fff0c0", "#000000"],
  strongbox: ["#2a2c34", "#e0c040", "#000000"],
  payroll: ["#3a2414", "#ffd84a", "#000000"],
  moonpearl: ["#7a6890", "#e8f0ff", "#000000"],
  phoenix_diamond: ["#c06020", "#fff4d0", "#000000"],
  sower_crown: ["#8a6a20", "#b080ff", "#000000"],
  seed_tear: ["#c0a060", "#ffffff", "#000000"],
  ember_heart: ["#3a1208", "#ffd27a", "#000000"],
  iron_seed: ["#1a1c22", "#8ac8ff", "#000000"],
};

/** Artifact icons, 7x7 (art.md 3.4), by a word in the artifact's key. */
const ICONS: [RegExp, string[]][] = [
  [/tally|count|chart|board/, ["LLLLLLL", "L.B.B.L", "L.B.B.L", "LBBBBBL", "L.B.B.L", "L.B.B.L", "LLLLLLL"]],
  [/lantern|lamp/, ["..LLL..", ".L...L.", "..LLL..", ".LBBBL.", ".LBWBL.", ".LBBBL.", "..LLL.."]],
  [/letter|note|page|journal|order|word|list/, ["LLLLLL.", "L....LL", "L.BBB.L", "L.....L", "L.BBBBL", "L.....L", "LLLLLLL"]],
  [/quartz|tablet|glass/, ["...L...", "..LWL..", "..LBL..", ".LBBBL.", ".LBBBL.", ".LBBBL.", ".LLLLL."]],
  [/pick|rod|key/, ["LLLLL..", ".LBL...", "..L.L..", "...L.L.", "....L.L", ".....LB", "......L"]],
  [/hand/, ["L.L.L.L", "L.L.L.L", "LLLLLLL", "LBBBBBL", "LBBBBBL", ".LBBBL.", "..LLL.."]],
  [/map|spore/, ["L..L..L", ".L.L.L.", "..LWL..", "LLWWWLL", "..LWL..", ".L.L.L.", "L..L..L"]],
  [/urn|bowl/, ["..LLL..", ".L...L.", "..LLL..", ".LBBBL.", "LBBBBBL", ".LBBBL.", "..LLL.."]],
  [/plate|frieze/, ["LLLLLLL", "L.B.B.L", "LBWBWBL", "L.B.B.L", "LBWBWBL", "L.B.B.L", "LLLLLLL"]],
  [/badge|ring|compass/, ["..LLL..", ".LBBBL.", "LB.W.BL", "LBWWWBL", "LB.W.BL", ".LBBBL.", "..LLL.."]],
  [/cradle/, [".......", "L.....L", "LL...LL", ".LBBBL.", ".LLLLL.", "..L.L..", ".LL.LL."]],
  [/husk|seed/, ["...L...", "..LBL..", ".LBWBL.", ".LBBBL.", "LBBWBBL", ".LBBBL.", "..LLL.."]],
];

function icon(c: Px, key: string) {
  const rows = (ICONS.find(([re]) => re.test(key)) ?? ICONS[0])[1];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    const ch = rows[y][x];
    if (ch !== ".") put(c, 4 + x, 5 + y, ch === "L" ? 3 : ch === "W" ? 3 : 2);
  }
}

// ---------------------------------------------------------------- atlas

export interface StampAtlas {
  data: Uint8Array; w: number; h: number;
  /** First cell of each ore class (VARIANTS x COPIES cells, copies-major). */
  classCell: Record<OreClass, number>;
  /** One cell each, by key. */
  special: Map<string, number>;
}

export function buildStamps(jackpotKeys: string[], artifactKeys: string[]): StampAtlas {
  const cells: Px[] = [];
  const classCell = {} as Record<OreClass, number>;
  for (const cls of CLASSES) {
    classCell[cls] = cells.length;
    for (let copies = 1; copies <= COPIES; copies++) for (let v = 0; v < VARIANTS; v++) {
      const c = new Uint8Array(256), r = rng(1000 + CLASSES.indexOf(cls) * 97 + v * 13 + copies);
      const jx = r.int(-2, 2), jy = r.int(-2, 2);
      if (copies === 1) drawClass(c, cls, 8 + jx, 8 + jy, 1, r);
      else {
        // The main copy plus extra pieces at 70 %, spread round it.
        const spots = [[-3, -3], [3, 3], [3, -4], [-4, 3]];
        drawClass(c, cls, 8 + jx * 0.5 - 1.5, 8 + jy * 0.5 - 1, 0.85, r);
        for (let k = 1; k < copies; k++) drawClass(c, cls, 8 + spots[(k + v) % 4][0] + 1, 8 + spots[(k + v) % 4][1] + 1, 0.62, r);
      }
      finish(c);
      cells.push(c);
    }
  }
  const special = new Map<string, number>();
  const add = (key: string, draw: (c: Px) => void, glint = true) => { const c = new Uint8Array(256); draw(c); finish(c, glint); special.set(key, cells.length); cells.push(c); };
  for (const k of jackpotKeys) {
    const d = JACKPOTS[k] ?? Object.entries(JACKPOTS).find(([n]) => k.includes(n) || n.includes(k))?.[1] ?? JACKPOTS.motherlode;
    add("j:" + k, d);
  }
  for (const k of Object.keys(CACHES)) add("c:" + k, CACHES[k]);
  for (const k of artifactKeys) add("a:" + k, (c) => icon(c, k));
  const rows = Math.ceil(cells.length / ATLAS_COLS);
  const w = ATLAS_COLS * CELL, h = Math.max(1, rows) * CELL;
  const data = new Uint8Array(w * h);
  cells.forEach((c, i) => {
    const ox = (i % ATLAS_COLS) * CELL, oy = Math.floor(i / ATLAS_COLS) * CELL;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) data[(oy + y) * w + ox + x] = c[y * 16 + x];
  });
  return { data, w, h, classCell, special };
}

/** Map a cache material's theme key to one of the drawn cache stamps. */
export function cacheStampKey(theme: string): string {
  const t = theme.toLowerCase();
  for (const k of Object.keys(CACHES)) if (t.includes(k)) return k;
  if (/box|chest/.test(t)) return t.includes("ember") ? "ember" : "strongbox";
  if (/fossil|geode/.test(t)) return "geode";
  return "crate";
}
