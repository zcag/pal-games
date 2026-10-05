// The UI's pictograms: 7x7 pixel glyphs drawn in code, with a 1 px dark outline, shown at integer scale
// (image-rendering: pixelated). Ore icons repeat the ore's shape class (art.md 3.3) in its own colours.
import { h } from "./dom.ts";
import { findById, JACKPOT_IDS } from "../../game/content/world.ts";
import { buildStamps, cacheStampKey, CACHE_COLORS, JACKPOT_EXTRA, ATLAS_COLS, CELL, VARIANTS, type StampAtlas } from "../render/stamps.ts";
import { CLASSES, ORE_CLASS, type OreClass } from "../render/look.ts";

type Pal = Record<string, string>;
interface Glyph { px: string[]; pal: Pal }

const OUT = "#07090d";
const C = {
  text: "#e8ecf4", quiet: "#8a94a8", dim: "#4a5466", accent: "#ffd870", good: "#5ad88a", warn: "#ffb35c", bad: "#ff5a4a",
  cash: "#e0c040", data: "#7fe8ff", shard: "#c9a0ff", steel: "#9aa4b4", steelD: "#5c6678", steelL: "#d8dee8",
};

const G: Record<string, Glyph> = {
  fuel: { px: ["...a...", "..aaa..", "..aaa..", ".abaaa.", ".baaac.", ".aaacc.", "..ccc.."], pal: { a: "#ffb35c", b: "#ffe0a8", c: "#c8782c" } },
  hull: { px: [".aaaaa.", "abaaaac", "abaaaac", "abaaaac", ".baaac.", "..aac..", "...c..."], pal: { a: "#8ab4e8", b: "#d8ecff", c: "#4a6a98" } },
  cargo: { px: ["bbbbbbb", "baaaaac", "ba.a.ac", "baaaaac", "ba.a.ac", "baaaaac", "ccccccc"], pal: { a: "#b08a5a", b: "#e0c08a", c: "#6a4c2c" } },
  heat: { px: ["...a...", "..aba..", "..aba..", "..aba..", ".aabaa.", ".abbba.", "..aaa.."], pal: { a: "#c8ccd4", b: "#ff5a4a" } },
  cash: { px: ["..aaa..", ".abbba.", "abbcbba", "abcccba", "abbcbba", ".abbba.", "..aaa.."], pal: { a: "#a08420", b: "#e0c040", c: "#fff07a" } },
  data: { px: ["...a...", "..aba..", ".abcba.", "abcccba", ".abcba.", "..aba..", "...a..."], pal: { a: "#2a8aa0", b: "#7fe8ff", c: "#e0fbff" } },
  shard: { px: ["....a..", "...aba.", "..abba.", ".abbc..", ".abc...", "abc....", ".c....."], pal: { a: "#8a60c8", b: "#c9a0ff", c: "#f0e0ff" } },
  depth: { px: ["..aaa..", "..aaa..", "..aaa..", "aaaaaaa", ".aaaaa.", "..aaa..", "...a..."], pal: { a: C.quiet } },
  lock: { px: ["..aaa..", ".a...a.", ".a...a.", "bbbbbbb", "bbbcbbb", "bbbcbbb", "bbbbbbb"], pal: { a: "#6a7488", b: "#4a5466", c: "#1a1e28" } },
  check: { px: [".......", "......a", ".....aa", "a...aa.", "aa.aa..", ".aaa...", "..a...."], pal: { a: C.good } },
  // items
  fuelcell: { px: ["..aa...", ".abbbb.", "bbbbbbb", "bcbbbcb", "bbcbcbb", "bbbcbbb", "bbbbbbb"], pal: { a: "#c8ccd4", b: "#d8502c", c: "#ff9a6a" } },
  repair: { px: ["..aaa..", "..aba..", "aaabaaa", "abbbbba", "aaabaaa", "..aba..", "..aaa.."], pal: { a: "#d84a3a", b: "#ffffff" } },
  dynamite: { px: ["......c", ".....b.", "....aa.", "...aaa.", "..aaa..", ".aaa...", ".aa...."], pal: { a: "#d8402c", b: "#c8b090", c: "#fff07a" } },
  charge: { px: [".....cb", "....b..", ".aaaa..", "aabaaa.", "aaaaaa.", "aaaaaa.", ".aaaa.."], pal: { a: "#4a5466", b: "#c8b090", c: "#fff07a" } },
  teleport: { px: ["...a...", "..aaa..", ".a.a.a.", "...a...", ".bbbbb.", "b.....b", ".bbbbb."], pal: { a: "#c9a0ff", b: "#7fe8ff" } },
  coolant: { px: ["...a...", ".a.a.a.", "..aaa..", "aaabaaa", "..aaa..", ".a.a.a.", "...a..."], pal: { a: "#7fe8ff", b: "#ffffff" } },
  overcharge: { px: ["....aa.", "...aa..", "..aaaa.", ".aaaa..", "...aa..", "..aa...", ".a....."], pal: { a: "#ffd870" } },
  // stats
  drill: { px: [".......", "aa.....", "aabbc..", "aabbbcc", "aabbc..", "aa.....", "......."], pal: { a: "#d8a030", b: "#d8dee8", c: "#9aa4b4" } },
  engine: { px: ["...a...", "..aa...", "..aba..", ".abba..", ".abbba.", ".abcba.", "..aaa.."], pal: { a: "#ff8a2a", b: "#ffd870", c: "#ffffff" } },
  tank: { px: ["..aaa..", ".abbba.", ".a...a.", ".accca.", ".accca.", ".accca.", "..aaa.."], pal: { a: "#9aa4b4", b: "#d8dee8", c: "#ffb35c" } },
  radiator: { px: ["a.a.a.a", "a.a.a.a", "bbbbbbb", "a.a.a.a", "a.a.a.a", "bbbbbbb", "a.a.a.a"], pal: { a: "#7fb8e8", b: "#9aa4b4" } },
  lamp: { px: [".....b.", "aa..b..", "aaab...", "aaabbbb", "aaab...", "aa..b..", ".....b."], pal: { a: "#9aa4b4", b: "#ffe6a0" } },
  scanner: { px: ["..aaa..", ".a...a.", "a..b..a", "a.bcb.a", "a..b..a", ".a...a.", "..aaa.."], pal: { a: "#5ad8a8", b: "#7fe8ff", c: "#ffffff" } },
  lift: { px: ["abbbbba", "a.....a", "a.ccc.a", "a.ccc.a", "a.....a", "abbbbba", "a.....a"], pal: { a: "#9aa4b4", b: "#d8dee8", c: "#ffd870" } },
  // buildings and screens
  rig: { px: ["...a...", "..a.a..", "..aaa..", ".a.a.a.", ".aaaaa.", "a..a..a", "bbbbbbb"], pal: { a: "#c8a060", b: "#6a5a48" } },
  silo: { px: ["..aaa..", ".abbba.", ".abbba.", ".accca.", ".accca.", ".accca.", ".aaaaa."], pal: { a: "#9aa4b4", b: "#2a3242", c: "#e0c040" } },
  frame: { px: ["a.....a", "aa...aa", ".aa.aa.", "..aaa..", ".aa.aa.", "aa...aa", "a.....a"], pal: { a: "#9aa4b4" } },
  coil: { px: [".aaaaa.", "a.....b", ".aaaaa.", "a.....b", ".aaaaa.", "a.....b", ".aaaaa."], pal: { a: "#e0a040", b: "#8a5a20" } },
  head: { px: ["...a...", "...a...", "..aba..", "..aba..", ".abbba.", ".abbba.", "ccccccc"], pal: { a: "#ffffff", b: "#c9a0ff", c: "#9aa4b4" } },
  perk: { px: ["...a...", "...a...", "aaabaaa", ".abbba.", "..aaa..", ".aa.aa.", ".a...a."], pal: { a: "#c9a0ff", b: "#f0e0ff" } },
  medal: { px: [".a...a.", ".aa.aa.", "..aaa..", ".bbbbb.", ".bcccb.", ".bcccb.", ".bbbbb."], pal: { a: "#5a8ad8", b: "#c09030", c: "#ffd870" } },
  gear: { px: [".a.a.a.", "aaaaaaa", ".aa.aa.", "aa...aa", ".aa.aa.", "aaaaaaa", ".a.a.a."], pal: { a: "#9aa4b4" } },
  book: { px: ["aaa.aaa", "abbabba", "abbabba", "abbabba", "abbabba", "aaaaaaa", "...a..."], pal: { a: "#8a6a4a", b: "#e8dcc0" } },
  relic: { px: [".aaaaa.", "abbbbba", "ab.b.ba", "abbbbba", "ab.b.ba", "abbbbba", ".aaaaa."], pal: { a: "#8a7a4a", b: "#e8d8a0" } },
  pause: { px: [".......", ".aa.aa.", ".aa.aa.", ".aa.aa.", ".aa.aa.", ".aa.aa.", "......."], pal: { a: C.text } },
  planet: { px: ["..aaa..", ".abbaa.", "abbaaac", "abaaacc", "aaaaccc", ".aaccc.", "..ccc.."], pal: { a: "#6a9ad8", b: "#c8e0ff", c: "#2a4a78" } },
  seed: { px: ["..aaa..", ".abbba.", "abbcbba", "abcccba", "abbcbba", ".abbba.", "..aaa.."], pal: { a: "#c8a050", b: "#fff2c0", c: "#ffffff" } },
  pod: { px: [".......", "..aaa..", ".abbba.", "aaaaaac", "acaacac", ".......", "......."], pal: { a: "#d8a030", b: "#9ad8ff", c: "#5a3c18" } },
  away: { px: ["..aaa..", ".a.b.a.", "a..b..a", "a..bb.a", "a.....a", ".a...a.", "..aaa.."], pal: { a: "#9aa4b4", b: "#ffd870" } },
  order: { px: [".aaaaa.", "abbbbba", "abccbba", "abbbbba", "abcccba", "abbbbba", ".aaaaa."], pal: { a: "#8a6a4a", b: "#e8dcc0", c: "#6a5440" } },
  // modules
  magnet: { px: ["aa...aa", "bb...bb", "bb...bb", "bb...bb", ".bb.bb.", "..bbb..", "......."], pal: { a: "#d8dee8", b: "#d84a3a" } },
  heatsink: { px: ["a.a.a.a", "a.a.a.a", "a.a.a.a", "bbbbbbb", "bcccccb", "bbbbbbb", "......."], pal: { a: "#7fe8ff", b: "#9aa4b4", c: "#5a6478" } },
  afterburner: { px: ["..a.a..", ".aa.aa.", ".aa.aa.", "abaabaa", "abbabba", ".bc.bc.", "..c..c."], pal: { a: "#ff8a2a", b: "#ffd870", c: "#ffffff" } },
  recycler: { px: ["..aaa..", ".a...b.", "a...bbb", "a.....a", "bbb...a", ".b...a.", "..aaa.."], pal: { a: "#5ad88a", b: "#a8ffc8" } },
  smelter: { px: [".......", "...aaaa", "..abbba", ".abbbca", "abbbca.", "acccc..", "......."], pal: { a: "#c09030", b: "#ffd870", c: "#8a6420" } },
  packing: { px: ["aaa.bbb", "aca.bdb", "aaa.bbb", ".......", "aaa.bbb", "aca.bdb", "aaa.bbb"], pal: { a: "#b08a5a", b: "#b08a5a", c: "#6a4c2c", d: "#6a4c2c" } },
  tracer: { px: ["a......", ".a.....", "..a..b.", "...ab.b", "..b....", ".b.....", "b......"], pal: { a: "#7fe8ff", b: "#ffd870" } },
  ear: { px: ["..aaa..", ".a...a.", ".a.b..a", "...b..a", "..b..a.", "..b.a..", "...a..."], pal: { a: "#e8c8a8", b: "#ffd870" } },
  drone: { px: ["aa...aa", ".a...a.", "..bbb..", ".bcccb.", "..bbb..", "...d...", "......."], pal: { a: "#9aa4b4", b: "#d8a030", c: "#7fe8ff", d: "#ffd870" } },
  // branches of the research tree
  logistics: { px: ["abbbbba", "a.....a", "a.ccc.a", "a.ccc.a", "a.....a", "abbbbba", "a.....a"], pal: { a: "#9aa4b4", b: "#d8dee8", c: "#7fe8ff" } },
  geology: { px: ["...l...", "..lgl..", ".lllbb.", "lllbbbb", ".lbbbb.", "..bbb..", "...b..."], pal: { l: "#a8ecff", g: "#ffffff", b: "#3a9ad0" } },
  engineering: { px: [".a.a.a.", "aaaaaaa", ".aa.aa.", "aa...aa", ".aa.aa.", "aaaaaaa", ".a.a.a."], pal: { a: "#7fe8ff" } },
  automation: { px: ["...a...", "..a.a..", "..aaa..", ".a.a.a.", ".aaaaa.", "a..a..a", "bbbbbbb"], pal: { a: "#7fe8ff", b: "#4a8aa0" } },
  market: { px: ["..aaa..", ".abbba.", "abbcbba", "abcccba", "abbcbba", ".abbba.", "..aaa.."], pal: { a: "#2a8aa0", b: "#7fe8ff", c: "#e0fbff" } },
  expedition: { px: ["..aaa..", ".abbba.", "abbcbba", "abcccba", "abbcbba", ".abbba.", "..aaa.."], pal: { a: "#4aa0b8", b: "#a8ecff", c: "#ffffff" } },
};

/** Ore glyphs by shape class: b base, l light, g glint. */
const SHAPES: Record<string, string[]> = {
  Speck: [".l...b.", "....l..", ".b.....", "...lb..", "l......", "....b.l", ".l....."],
  Vein: [".....lb", "....lb.", "...lb..", "..lb...", ".lb..lb", "lb..lb.", "...lb.."],
  Dendrite: ["l......", ".l..l..", "..ll...", "..l.l..", ".l...ll", ".....l.", "....l.."],
  Nugget: [".......", ".bl....", ".bb..l.", "....bb.", ".lb....", ".bb.lb.", "....bb."],
  Band: [".......", ".bbbbb.", "blllllb", "bbbbbbb", "blllllb", ".bbbbb.", "......."],
  Block: [".......", "llb....", "lbb.llb", "bbb.lbb", "....bbb", ".llb...", ".lbb..."],
  Spike: ["l..g..l", ".l.l.l.", ".blblb.", "..bbb..", "..bbb..", ".bbbbb.", "......."],
  Ring: ["..lll..", ".lb.bl.", "lb...bl", "l.....l", "bl...lb", ".bb.bb.", "..bbb.."],
  Gem: ["...l...", "..lgl..", ".lllbb.", "lllbbbb", ".lbbbb.", "..bbb..", "...b..."],
  Orb: ["..bbb..", ".bllbb.", "bllglbb", "blllbbb", "bblbbbb", ".bbbbb.", "..bbb.."],
  Star: ["...l...", "...l...", "..lll..", "lllglll", "..lll..", "...l...", "...l..."],
  Plate: [".......", ".bbbbbb", "blllllb", "bbbbbbb", "bglllgb", ".bbbbb.", "......."],
  Drop: ["...l...", "..lbb..", ".llbbb.", ".lgbbb.", ".lbbbb.", "..bbb..", "......."],
  Relic: G.relic.px,
};

/** The 19 relics' own pictograms (art.md 3.4), plus the planets' relics mapped onto the nearest look. */
const RELIC: Record<string, string[]> = {
  A1: ["aaaaaaa", "abdbdba", "abdbdba", "abdbdba", "abbbbba", "aaaaaaa", ".a...a."],
  A2: ["..aaa..", "...a...", ".aaaaa.", ".bcccb.", ".bcccb.", ".aaaaa.", "..aaa.."],
  A3: [".......", "aaaaaaa", "abbbbba", "adbbbda", "abdbdba", "abbdbba", "aaaaaaa"],
  A4: ["...b...", "..bcb..", "..bcb..", ".abcba.", ".abbba.", "aaaaaaa", "......."],
  A5: [".bbbbb.", "bcbbbcb", "bdddddb", "bbbbbbb", "bdddddb", "bbbbbbb", ".bbbbb."],
  A6: ["aaaaa..", "....aa.", "...b.a.", "..b...a", ".b.....", "b......", "......."],
  A7: ["bababa.", "bababa.", "bbbbbb.", "bbbbbba", "bbbbbb.", ".bbbb..", ".bbbb.."],
  A8: ["c.....c", ".a...a.", "..aca..", "..cbc..", "..aca..", ".a...a.", "c.....c"],
  A9: [".aaaaa.", ".bbbbb.", ".bdddb.", ".bbbbb.", ".bddbb.", ".bbbbb.", ".aaaaa."],
  A10: ["..aaa..", "...a...", "..aaa..", ".abbba.", ".abbba.", "..aaa..", ".aaaaa."],
  A11: ["c..c..c", "...c...", "...c...", "..bbb..", ".bbcbb.", "aaaaaaa", ".a...a."],
  A12: ["..aaa..", ".abbba.", "abcbcba", "abbbbba", ".abbba.", "..a.a..", "..a...."],
  A13: ["..aaa..", ".a...a.", "a.....a", "a.....a", ".a...a.", "..aaa..", "......."],
  A14: ["...c...", "..ccc..", "a.a.a.a", "aaaaaaa", "a.a.a.a", "a.a.a.a", "bbbbbbb"],
  A15: [".aaaaa.", "abbbbba", "abcbcba", "abbcbba", "abcbcba", "abbbbba", ".aaaaa."],
  A16: ["b.....b", "ab...ba", "abbbbba", ".abbba.", "..aaa..", "..a.a..", "......."],
  A17: ["aaaaaa.", "abbbbba", "adddbba", "abbbbba", "addbbba", "abbbbba", "aaaaaaa"],
  A18: ["...aaa.", "..abba.", ".abba..", "abba...", "abba...", ".abba..", "..aaa.."],
  A19: ["aaaaaa.", "abbbbba", "adddbba", "abbbbba", "adbbcba", "abbbbba", "aaaaaaa"],
};
Object.assign(RELIC, { C1: RELIC.A1, C2: RELIC.A10, C3: RELIC.A8, C4: RELIC.A14, C5: RELIC.A16, C6: RELIC.A15, F1: ["...b...", "...a...", "...a...", "...a...", "...a...", "..aaa..", ".ddddd."], F2: RELIC.A7, F3: RELIC.A13, F4: RELIC.A1, F5: RELIC.A16, F6: RELIC.A16 });
const RELIC_PAL: Pal = { a: "#8a7a4a", b: "#e8d8a0", c: "#fff8e0", d: "#5a4a28" };
const SIL: Pal = { a: "#323b4c", b: "#3e4859", c: "#3e4859", d: "#323b4c", l: "#3e4859", g: "#3e4859" };

const cache = new Map<string, string>();

function draw(px: string[], pal: Pal, outline = true): string {
  const key = px.join("|") + JSON.stringify(pal) + outline;
  const hit = cache.get(key);
  if (hit) return hit;
  const w = px[0].length, hgt = px.length, o = outline ? 1 : 0;
  const c = document.createElement("canvas");
  c.width = w + 2 * o; c.height = hgt + 2 * o;
  const g = c.getContext("2d")!;
  const filled = (x: number, y: number) => y >= 0 && y < hgt && x >= 0 && x < w && px[y][x] !== "." && pal[px[y][x]] !== undefined;
  if (outline) {
    g.fillStyle = OUT;
    for (let y = -1; y <= hgt; y++) for (let x = -1; x <= w; x++) {
      if (filled(x, y)) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) g.fillRect(x + o, y + o, 1, 1);
    }
  }
  for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
    const col = pal[px[y][x]];
    if (px[y][x] === "." || !col) continue;
    g.fillStyle = col; g.fillRect(x + o, y + o, 1, 1);
  }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export type IconName = keyof typeof G;
export const hasIcon = (n: string): n is IconName => n in G;

/** An icon element: `scale` CSS px per glyph px (the outline adds one on each side). */
export function icon(name: string, scale = 2, tint?: Pal): HTMLElement {
  const g = G[name] ?? G.relic;
  return iconEl(draw(g.px, tint ? { ...g.pal, ...tint } : g.pal), 9, 9, scale);
}

/** The icon of a find: ores and jackpots by shape class in their colours, artifacts as a relic tablet. */
export function findIcon(id: number, scale = 2, silhouette = false, tint?: string): HTMLElement {
  const f = findById(id);
  if (silhouette && tint) {
    const t = (c: string, k: number) => mix(c, tint, k);
    const pal: Pal = { a: t("#262c38", 0.28), b: t("#323a48", 0.38), c: t("#3a4454", 0.4), d: t("#262c38", 0.28), l: t("#3e4859", 0.5), g: t("#3e4859", 0.5) };
    const px = f?.cls === "Relic" ? RELIC[f?.key ?? ""] ?? G.relic.px : SHAPES[f?.cls ?? "Nugget"] ?? SHAPES.Nugget;
    return iconEl(draw(px, pal), 9, 9, scale);
  }
  const cls = f?.cls ?? "Nugget";
  const [b, l, gl] = f?.colors ?? ["#8a9098", "#c8ccd4", "#ffffff"];
  if (cls === "Relic") return iconEl(draw(RELIC[f?.key ?? ""] ?? G.relic.px, silhouette ? SIL : RELIC_PAL), 9, 9, scale);
  return iconEl(draw(SHAPES[cls] ?? SHAPES.Nugget, silhouette ? SIL : { b, l, g: gl, a: b }), 9, 9, scale);
}

function iconEl(url: string, w: number, hgt: number, scale: number): HTMLElement {
  return h(`i.ic.s${scale}`, { style: { width: `${w * scale}px`, height: `${hgt * scale}px`, "background-image": `url(${url})` } });
}

/** A pixel-art disc for the launch site's planet (64 px): banded and lit from the top left. */
export function planetDisc(colors: { zenith: string; horizon: string; sunset: string }, size = 32, scale = 2): HTMLElement {
  const key = `planet${colors.zenith}${size}`;
  let url = cache.get(key);
  if (!url) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d")!;
    const r = size / 2 - 1, cx = size / 2, cy = size / 2;
    const cols = [colors.horizon, colors.zenith, colors.sunset];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
      if (d > r) continue;
      const band = Math.floor((Math.sin((y / size) * 9 + Math.sin(x * 0.4) * 0.6) + 1) * 1.5) % 3;
      const lit = (-dx - dy) / (r * 1.4) + 0.35;
      g.fillStyle = cols[band];
      g.globalAlpha = 1;
      g.fillRect(x, y, 1, 1);
      const shade = lit < -0.15 ? 0.55 : lit < 0.15 ? 0.3 : lit > 0.75 ? -0.18 : 0;
      if (shade > 0) { g.fillStyle = `rgba(4,6,12,${shade})`; g.fillRect(x, y, 1, 1); }
      if (shade < 0) { g.fillStyle = `rgba(255,255,255,${-shade})`; g.fillRect(x, y, 1, 1); }
      if (d > r - 1) { g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x, y, 1, 1); }
    }
    url = c.toDataURL();
    cache.set(key, url);
  }
  return iconEl(url, size, size, scale);
}

// ---------------------------------------------------------------- the pod preview (art.md 5.1), parts highlightable

/** art.md 5.1's 16x14 sprite at offset (4, 3) of a 22x19 grid, plus the back parts and the scanner antenna.
 * Each char is a colour; PART says which upgrade owns it. */
const POD = [
  ".........a............",
  ".........a............",
  ".........A............",
  "........OOOOO.........",
  ".......OgGGGGO........",
  "......OgGGGGGGO.......",
  "..ff.OOOOOOOOOOOO.....",
  "..ffOLLLLLLLLLlO......",
  ".kkcOHHHHHHHHHHOdO....",
  ".kkcOHhHHHHHHHHODDdO..",
  ".kkcOHHHHHHHHHHODDDD..",
  "..ccOHhHHHHHHHHODDdO..",
  "..ccOhmmmmmmmmhOdO....",
  "....OOOOOOOOOOOO......",
  "....OtTtTtTtTtTO......",
  "....OTtTtTtTtTtO......",
  ".....OOOOOOOOOO.......",
  ".......e....e.........",
  ".......E....E.........",
];
const POD_PAL: Pal = {
  O: "#0b0d12", g: "#e8fbff", G: "#5ac8ff", L: "#ffd870", H: "#d8a030", h: "#8a5a18", l: "#fff4c0", D: "#b8c0cc", d: "#6a7080",
  T: "#5a5e6a", t: "#2a2c34", m: "#5a3c18", a: "#9aa4b4", A: "#5ad8a8", f: "#7fb8e8", k: "#9aa4b4", c: "#b08a5a", e: "#ffd870", E: "#ff8a2a",
};
const PART: Record<string, string> = {
  D: "drill", d: "drill", H: "hull", h: "hull", L: "hull", l: "lamp", T: "engine", t: "engine", e: "engine", E: "engine",
  a: "scanner", A: "scanner", f: "radiator", k: "tank", c: "cargo", g: "lamp", G: "lamp",
};

/** The pod at `scale` CSS px per art px, with one part (a Stat) lit and the rest dimmed. */
export function podPreview(part: string | null, scale = 6): HTMLElement {
  const key = `podp:${part}`;
  let url = cache.get(key);
  if (!url) {
    const w = POD[0].length, hgt = POD.length;
    const c = document.createElement("canvas");
    c.width = w; c.height = hgt;
    const g = c.getContext("2d")!;
    for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
      const ch = POD[y][x];
      if (ch === ".") continue;
      const own = PART[ch];
      if ((ch === "e" || ch === "E") && part !== "engine") continue; // the flame shows only for the engine
      let col = POD_PAL[ch];
      if (part && own !== part && ch !== "O") col = mix(col, "#1a1e28", 0.55);
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    // the lit part gets a 1 px accent rim where it meets empty space
    if (part) {
      g.fillStyle = "#ffd870";
      for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
        if (POD[y][x] !== ".") continue;
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => PART[POD[y + dy]?.[x + dx] ?? "."] === part);
        if (near) g.fillRect(x, y, 1, 1);
      }
    }
    url = c.toDataURL();
    cache.set(key, url);
  }
  return h("i.ic.pod", { style: { width: `${POD[0].length * scale}px`, height: `${POD.length * scale}px`, "background-image": `url(${url})` } });
}

function mix(a: string, b: string, k: number) {
  const p = (s: string, i: number) => parseInt(s.slice(1 + 2 * i, 3 + 2 * i), 16);
  const v = [0, 1, 2].map((i) => Math.round(p(a, i) * (1 - k) + p(b, i) * k).toString(16).padStart(2, "0"));
  return `#${v.join("")}`;
}

// ---------------------------------------------------------------- the world's own ore sprites (render/stamps.ts)

let stampAtlas: StampAtlas | null = null;
const stamps = () => (stampAtlas ??= buildStamps(JACKPOT_IDS.map((id) => findById(id)!.key), []));
const keyOf = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "_");

/** The atlas cell the terrain shader draws for a find. */
function findCell(id: number): number | undefined {
  const f = findById(id);
  if (!f || f.kind === "artifact") return undefined;
  const A = stamps(), k = keyOf(f.key);
  if (f.kind === "jackpot") return A.special.get("j:" + k);
  const cls = ((f.cls && (CLASSES as readonly string[]).includes(keyOf(f.cls)) ? keyOf(f.cls) : undefined) ?? ORE_CLASS[k] ?? "nugget") as OreClass;
  return A.classCell[cls] + (id % VARIANTS); // copies = 1; the variant varies the jitter per ore
}

/** A 16x16 index cell of the stamp atlas, cropped to its content. */
function stampCell(cell: number | undefined): { px: Uint8Array; x0: number; y0: number; w: number; h: number } | null {
  if (cell === undefined) return null;
  const A = stamps();
  const ox = (cell % ATLAS_COLS) * CELL, oy = Math.floor(cell / ATLAS_COLS) * CELL;
  const px = new Uint8Array(256);
  let x0 = 16, y0 = 16, x1 = -1, y1 = -1;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const v = A.data[(oy + y) * A.w + ox + x];
    px[y * 16 + x] = v;
    if (v) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  return x1 < 0 ? null : { px, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * A find as the world draws it, at `scale` CSS px per art px. Unfound: a black silhouette with a faint rim and one
 * glint. Falls back to the pictogram when the renderer has no stamp for it (artifacts).
 */
export function oreSprite(id: number, scale: number, found: boolean): HTMLElement {
  const c = stampCell(findCell(id));
  if (!c) return findIcon(id, Math.max(2, scale), !found);
  const f = findById(id)!;
  const k = keyOf(f.key);
  const extra = f.kind === "jackpot" ? (JACKPOT_EXTRA[k] ?? ["#2a2018", f.colors[1], "#000000"]) : ["#14101c", f.colors[1], f.colors[0]];
  if (k.includes("copper")) extra[0] = "#4aa88a";
  if (k.includes("amber")) extra[0] = "#5cffc8";
  if (k.includes("seedglass")) extra[0] = "#fff2c0";
  return stampEl(`find:${id}`, c, ["", "#0b0d12", f.colors[0], f.colors[1], f.colors[2], ...extra], scale, found);
}

/** A cache as the world draws it (theme key: crate, cart, geode, spore, ember, coffer, seedpod, urn, strongbox). */
export function cacheSprite(theme: string, scale: number, found: boolean): HTMLElement {
  const t = cacheStampKey(theme), cc = CACHE_COLORS[t];
  const c = stampCell(stamps().special.get("c:" + t));
  if (!c || !cc) return icon("cargo", 2);
  return stampEl(`cache:${t}`, c, ["", "#0b0d12", ...cc.c], scale, found);
}

function stampEl(id: string, c: NonNullable<ReturnType<typeof stampCell>>, cols: string[], scale: number, found: boolean): HTMLElement {
  const key = `stamp:${id}:${found}`;
  let url = cache.get(key);
  if (!url) {
    const cv = document.createElement("canvas");
    cv.width = c.w + 2; cv.height = c.h + 2;
    const g = cv.getContext("2d")!;
    let glint: [number, number] | null = null;
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      const v = c.px[(c.y0 + y) * 16 + c.x0 + x];
      if (!v) continue;
      if (found) g.fillStyle = cols[v] || cols[2];
      else { g.fillStyle = v === 1 ? "#2c3444" : "#07090d"; if (v === 3 && !glint) glint = [x, y]; }
      g.fillRect(x + 1, y + 1, 1, 1);
    }
    if (!found) {
      // a thin rim so the shape reads on the dark cell, and one glint px where light would catch it
      const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < c.w && y < c.h && c.px[(c.y0 + y) * 16 + c.x0 + x] > 0;
      g.fillStyle = "#3a4458";
      for (let y = -1; y <= c.h; y++) for (let x = -1; x <= c.w; x++) if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) g.fillRect(x + 1, y + 1, 1, 1);
      if (glint) { g.fillStyle = "#c8d0dc"; g.fillRect(glint[0] + 1, glint[1] + 1, 1, 1); }
    }
    url = cv.toDataURL();
    cache.set(key, url);
  }
  return h(`i.ic.spr`, { style: { width: `${(c.w + 2) * scale}px`, height: `${(c.h + 2) * scale}px`, "background-image": `url(${url})` } });
}
