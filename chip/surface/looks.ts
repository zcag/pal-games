// The looks L cycles through: three drawn over PWL's layered landscapes
// (art/, CC0: art/README.md), each layer recoloured into the look's palette,
// and the hand-drawn one the hole started with. A layer is one flat colour
// with a touch of shade; recolouring keeps that shade (its brightness against
// the layer's own colour) and swaps the colour, so one set of pictures makes
// a noon canyon, a dusk canyon and an alpine morning.
import type { Surface } from "../game/hole.ts";

export type LookId = "canyon" | "alpine" | "dusk" | "classic";
export const LOOK_IDS: LookId[] = ["canyon", "alpine", "dusk", "classic"];
export const LOOK_NAMES: Record<LookId, string> = { canyon: "Canyon", alpine: "Alpine", dusk: "Dusk", classic: "Classic" };

/** A landscape: its layers, nearest first, and the colour each was painted in. */
type Set = { files: string[]; base: string[] };
const SETS: Record<"canyon" | "alpine", Set> = {
  canyon: { files: [1, 2, 3, 4, 5].map((i) => `art/canyon-${i}.png`), base: ["#41362d", "#594236", "#967c68", "#d9cdc0", "#e0dcd6"] },
  alpine: { files: [1, 2, 3, 4, 5].map((i) => `art/alpine-${i}.png`), base: ["#3b4f61", "#587791", "#92a9bd", "#c2cfda", "#ffffff"] },
};

/** A look drawn over a landscape, flat: the sky, the layers' colours (nearest first), the hole's own ground. */
export type Flat = {
  set: "canyon" | "alpine";
  sky: [string, string];
  layers: string[];
  /** How far each layer moves against the hole (nearest first), and how much of the panel's height it is drawn. */
  rates: number[];
  /** The sun or moon, low behind the layers: colour, glow, and where (0..1 across, 0..1 down). */
  sun: { color: string; glow: string; x: number; y: number; r: number } | null;
  stars: boolean;
  earth: string; rock: string; rockLit: string;
  surface: Record<Surface, string>;
  water: [string, string];
  /** What shade and light lean toward in the foreground, and the golfer's shirt and trousers (fore.ts). */
  shade: string; light: string; shirt: string; trousers: string;
  /** The words over the sky: dark ink on a pale sky, white on a deep one. */
  ink: "dark" | "light";
};

/** The canyon at sunset: the same layers in rose and plum under a low sun. */
const DUSK: Flat = {
  set: "canyon", sky: ["#3b3566", "#f0a07a"], layers: ["#5c3a52", "#764a5f", "#9f606c", "#cc8a7b", "#e8ad8c"], rates: [0.34, 0.2, 0.12, 0.06, 0.03],
  sun: { color: "#ffe2b0", glow: "rgba(255, 196, 140, 0.55)", x: 0.66, y: 0.5, r: 0.11 }, stars: false,
  earth: "#1f1522", rock: "#3a2434", rockLit: "#4c2f40",
  surface: { tee: "#6c7446", fairway: "#6c7446", rough: "#4c5634", sand: "#d39a72", green: "#8a9550", rock: "" }, water: ["#c88a86", "#8f5e72"], ink: "light",
  shade: "#2a1638", light: "#ffd9b0", shirt: "#3fb5a3", trousers: "#2e2440",
};

const TURF_DAY = { tee: "#8a9a4e", fairway: "#8a9a4e", rough: "#5f6f3a", sand: "#e3c592", green: "#a8bb5c", rock: "" };

export const FLAT: Record<"canyon" | "alpine" | "dusk", { light: Flat; dark: Flat }> = {
  canyon: {
    light: {
      set: "canyon", sky: ["#e9e3da", "#f3ece2"], layers: ["#8f7260", "#a68a75", "#c0a894", "#ddd0c2", "#e9e1d7"], rates: [0.34, 0.2, 0.12, 0.06, 0.03],
      sun: { color: "#fbf3e4", glow: "rgba(255, 244, 222, 0.6)", x: 0.74, y: 0.2, r: 0.065 }, stars: false,
      earth: "#3a2b21", rock: "#5a4131", rockLit: "#6e513d",
      surface: TURF_DAY, water: ["#7fa7ad", "#5d8790"], ink: "dark",
      shade: "#3b2418", light: "#fff6e6", shirt: "#2f7fd0", trousers: "#f2ede4",
    },
    dark: {
      set: "canyon", sky: ["#141a2c", "#2d3047"], layers: ["#2e2a3a", "#3b3549", "#4f485e", "#655e76", "#77718c"], rates: [0.34, 0.2, 0.12, 0.06, 0.03],
      sun: { color: "#efe9da", glow: "rgba(200, 205, 255, 0.16)", x: 0.74, y: 0.2, r: 0.05 }, stars: true,
      earth: "#110e15", rock: "#211b27", rockLit: "#2c2433",
      surface: { tee: "#4d6040", fairway: "#4d6040", rough: "#36452f", sand: "#9a8a72", green: "#62784c", rock: "" }, water: ["#3d5a73", "#2a4157"], ink: "light",
      shade: "#07060c", light: "#c9d2ff", shirt: "#4a86c9", trousers: "#d7d3cc",
    },
  },
  alpine: {
    light: {
      set: "alpine", sky: ["#dfe8ef", "#f3f6f8"], layers: ["#7088a0", "#86a0b6", "#a6bccf", "#c8d4df", "#ffffff"], rates: [0.34, 0.2, 0.12, 0.06, 0.03],
      sun: null, stars: false,
      earth: "#23303d", rock: "#3e5164", rockLit: "#4d6378",
      surface: { tee: "#7c9c74", fairway: "#7c9c74", rough: "#58775a", sand: "#e0d6bf", green: "#97b98a", rock: "" }, water: ["#9fc0d4", "#7ea3bb"], ink: "dark",
      shade: "#1a2638", light: "#ffffff", shirt: "#e0573a", trousers: "#2f3a4a",
    },
    dark: {
      set: "alpine", sky: ["#0f1626", "#22304a"], layers: ["#222e3f", "#2c3c52", "#3e5169", "#566a86", "#3c4b66"], rates: [0.34, 0.2, 0.12, 0.06, 0.03],
      sun: { color: "#eef1f7", glow: "rgba(190, 210, 255, 0.18)", x: 0.22, y: 0.18, r: 0.05 }, stars: true,
      earth: "#0a0f16", rock: "#18212d", rockLit: "#212c3a",
      surface: { tee: "#3f5a46", fairway: "#3f5a46", rough: "#2d4234", sand: "#8d8a7c", green: "#52725a", rock: "" }, water: ["#3a5873", "#283f57"], ink: "light",
      shade: "#05080f", light: "#cbd8ff", shirt: "#d0563c", trousers: "#c9ccd4",
    },
  },
  // Dusk is dusk in either theme.
  dusk: { light: DUSK, dark: DUSK },
};

const hex = (c: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];

const images = new Map<string, Promise<HTMLImageElement>>();
function load(src: string) {
  let p = images.get(src);
  if (!p) {
    // CORS-clean (the scheme answers with Access-Control-Allow-Origin: *): pal's frame has an opaque origin, and a
    // picture loaded without it taints the canvas, so its pixels could not be read back to recolour.
    p = new Promise((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = () => rej(new Error(`chip: ${src}`)); im.src = src; });
    images.set(src, p);
  }
  return p;
}

/** The layers of a flat look, recoloured, `height` device pixels tall (nearest first). Cached per look and height. */
const tinted = new Map<string, Promise<HTMLCanvasElement[]>>();
export function layersFor(look: Flat, height: number): Promise<HTMLCanvasElement[]> {
  const key = `${look.set}:${look.layers.join()}:${height}`;
  let p = tinted.get(key);
  if (!p) {
    const set = SETS[look.set];
    p = Promise.all(set.files.map(load)).then((ims) => ims.map((im, i) => recolour(im, height, hex(set.base[i]), hex(look.layers[i]))));
    tinted.set(key, p);
  }
  return p;
}

function recolour(im: HTMLImageElement, height: number, from: [number, number, number], to: [number, number, number]): HTMLCanvasElement {
  const w = Math.round((im.width * height) / im.height);
  const c = document.createElement("canvas");
  c.width = w; c.height = height;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(im, 0, 0, w, height);
  let d: ImageData;
  try { d = x.getImageData(0, 0, w, height); } catch (e) {
    // Pixels that cannot be read: the layer in its new colour, flat, its shade lost.
    console.error("chip: layer recoloured flat", e);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = `rgb(${to.join(",")})`;
    x.fillRect(0, 0, w, height);
    return c;
  }
  const px = d.data;
  const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
  const base = Math.max(1, lum(...from));
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    // The pixel's shade against the layer's colour (1 is the colour itself), kept on the new colour.
    const k = lum(px[i], px[i + 1], px[i + 2]) / base;
    px[i] = Math.min(255, to[0] * k); px[i + 1] = Math.min(255, to[1] * k); px[i + 2] = Math.min(255, to[2] * k);
  }
  x.putImageData(d, 0, 0);
  return c;
}
