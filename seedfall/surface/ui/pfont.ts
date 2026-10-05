// The display font: a 5x7 bitmap face drawn in code, for titles, headers, the logo and big numbers. Body text
// stays system sans for legibility. Glyphs render into canvases at integer scale (crisp at any dpr).
import { h } from "./dom.ts";

/** 7 rows of 5 bits per glyph, top to bottom. Lowercase maps to uppercase. */
const GLYPHS: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11], B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e], D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f], F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f], H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e], J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11], L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11], N: [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d], R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e], T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a], X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04], Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e], "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f], "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02], "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e], "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e], "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0], ".": [0, 0, 0, 0, 0, 0x0c, 0x0c], ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0], "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04], "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x1f, 0, 0, 0], "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0], "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04], "%": [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02], ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "·": [0, 0, 0, 0x04, 0, 0, 0], "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
};
/** Narrow glyphs keep their own width so numbers and punctuation sit tight. */
const WIDTH: Record<string, number> = { " ": 3, ".": 2, ",": 2, ":": 2, "!": 1, "'": 2, "1": 3, I: 3, "·": 1, "(": 3, ")": 3 };
/** The first lit column of each narrow glyph. */
const COLS: Record<string, number> = { ".": 1, ",": 1, ":": 1, "!": 2, "'": 1, "·": 2, "1": 1, I: 1, "(": 1, ")": 1 };

/** Width of a string in font px (1 px gap between glyphs). */
export function textWidth(s: string) {
  let w = 0;
  for (const ch of s.toUpperCase()) w += (WIDTH[ch] ?? 5) + 1;
  return Math.max(0, w - 1);
}

export interface PxStyle { color: string; shade?: string; outline?: string }

/** Draw a string onto a 2d context at (x, y) in font px. `shade` colours the bottom row, `outline` rings each glyph. */
export function drawText(g: CanvasRenderingContext2D, s: string, x: number, y: number, st: PxStyle) {
  const bits: [number, number][] = [];
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const gl = GLYPHS[ch] ?? GLYPHS["?"];
    const off = COLS[ch] ?? 0, w = WIDTH[ch] ?? 5;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r] & (0x10 >> c)) bits.push([cx + c - off, y + r]);
    cx += w + 1;
  }
  if (st.outline) {
    g.fillStyle = st.outline;
    for (const [px, py] of bits) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) g.fillRect(px + dx, py + dy, 1, 1);
  }
  for (const [px, py] of bits) { g.fillStyle = st.shade && py - y >= 5 ? st.shade : st.color; g.fillRect(px, py, 1, 1); }
}

/**
 * A crisp pixel-text element that redraws only when its text changes (the HUD's numbers count every frame).
 * `scale` is CSS px per font px; the canvas is sized in device px so every font px is whole device pixels.
 */
export class PxText {
  el: HTMLCanvasElement = h("canvas.ptext");
  private text = "";
  constructor(private scale: number, private st: PxStyle) {}
  set(s: string, scale = this.scale) {
    if (s === this.text && scale === this.scale) return this.el;
    this.text = s; this.scale = scale;
    const pad = this.st.outline ? 1 : 0;
    const w = textWidth(s) + 2 * pad + 1, hh = 7 + 2 * pad + 1;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const k = Math.max(1, Math.round(scale * dpr));
    const c = this.el;
    c.width = w * k; c.height = hh * k;
    c.style.width = `${(w * k) / dpr}px`; c.style.height = `${(hh * k) / dpr}px`;
    const g = c.getContext("2d")!;
    g.setTransform(k, 0, 0, k, 0, 0);
    g.clearRect(0, 0, w, hh);
    drawText(g, s, pad, pad, this.st);
    return c;
  }
}

/** A one-off pixel-text element. */
export function ptext(s: string, scale: number, st: PxStyle, cls = ""): HTMLCanvasElement {
  const t = new PxText(scale, st);
  const el = t.set(s);
  if (cls) el.classList.add(...cls.split(" "));
  el.setAttribute("aria-label", s);
  return el;
}

/** The SEEDFALL logo: the word, and a seed falling between SEED and FALL with a short trail. */
export function logo(scale: number): HTMLCanvasElement {
  const word1 = "SEED", word2 = "FALL";
  const gap = 11;
  const w = textWidth(word1) + gap + textWidth(word2) + 4, hh = 20;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const k = Math.max(1, Math.round(scale * dpr));
  const c = h("canvas.logo");
  c.width = w * k; c.height = hh * k;
  c.style.width = `${(w * k) / dpr}px`; c.style.height = `${(hh * k) / dpr}px`;
  const g = c.getContext("2d")!;
  g.setTransform(k, 0, 0, k, 0, 0);
  const st: PxStyle = { color: "#fff2c0", shade: "#d8a050", outline: "#14100a" };
  const y = 8;
  drawText(g, word1, 1, y, st);
  const x2 = 1 + textWidth(word1) + gap;
  drawText(g, word2, x2, y, st);
  // the seed: a 5x5 glowing orb low between the words, falling, with a fading trail above it
  const sx = 1 + textWidth(word1) + Math.floor((gap - 5) / 2), sy = y + 4;
  const orb = ["01110", "12221", "12321", "12221", "01110"];
  const cols = ["", "#d8a050", "#fff2c0", "#ffffff"];
  g.fillStyle = "#14100a";
  for (let r = 0; r < 5; r++) for (let q = 0; q < 5; q++) if (orb[r][q] !== "0") for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.fillRect(sx + q + dx, sy + r + dy, 1, 1);
  for (let r = 0; r < 5; r++) for (let q = 0; q < 5; q++) { const v = +orb[r][q]; if (v) { g.fillStyle = cols[v]; g.fillRect(sx + q, sy + r, 1, 1); } }
  for (const [ty, a] of [[sy - 2, "cc"], [sy - 4, "88"], [sy - 6, "55"], [sy - 8, "2a"]] as const) { g.fillStyle = `#ffd870${a}`; g.fillRect(sx + 2, ty, 1, 1); }
  c.setAttribute("aria-label", "Seedfall");
  return c;
}
