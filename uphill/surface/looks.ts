// The looks L cycles through. Forest, Desert and Dusk stand PWL's flat
// landscape layers (art/, CC0) behind the road as parallax, each layer
// recoloured from its tone mask (scripts/art.ts) into the look's palette, so
// one set of shapes gives any time of day. The foreground (the ground, the
// car, the pickups) is drawn in the style K picks (fore.ts), in the look's
// colours below: the ground's are taken from its landscape's nearest layers,
// and the car carries the scene's one strong colour. Classic is the first
// look, drawn as before, kept to compare.

export type LookId = "forest" | "desert" | "dusk" | "classic";
export const LOOKS: LookId[] = ["forest", "desert", "dusk", "classic"];

/** The colours of everything in front of the layers. */
export type Ink = {
  ground: string; edge: string; props: string;
  body: string; bodyDark: string; bodyLight: string; frame: string; tire: string; hub: string; driver: string; helmet: string; visor: string;
  coin: string; coinDark: string; can: string; canDark: string; post: string; sign: string; signText: string; flag: string; dust: string;
};
/** The ground's colours, light to dark: its top (grass, or the desert's packed sand), the earth under it, the stones in it. */
export type Land = {
  top: [string, string, string]; soil: [string, string, string, string]; stone: [string, string];
  /** What shade and light are mixed toward (shadows lean to the sky's blue or purple, light to the sun's colour), and the outline. */
  shadow: string; light: string; ink: string;
  /** What grows on the ground. */
  growth: "meadow" | "desert";
};
export type Scene = {
  name: string;
  set: "forest" | "desert";
  /** The sky, top to bottom. */
  sky: [string, string];
  /** A low sun or moon behind the far layers. */
  sun?: { x: number; y: number; r: number; color: string; glow: string };
  /** Each layer's tones, back to front (the tone mask's 0, 128, 255), and how far it moves for a metre the car does, in screen pixels per pixel of the ground. */
  layers: { tones: string[]; rate: number; alpha?: number }[];
  /** Props standing behind the road: pines or rocks. */
  props: "pines" | "rocks";
  ink: Ink;
  land: Land;
  /** How much lower than the others its layers stand, of the screen's height (the desert's buttes are tall). */
  drop?: number;
  /** The HUD's text over this sky. */
  hud: "light" | "dark";
};

export const SCENES: Record<Exclude<LookId, "classic">, Scene> = {
  forest: {
    name: "Forest",
    set: "forest",
    sky: ["#dbe4ec", "#eef1f4"],
    layers: [
      { tones: ["#ffffff"], rate: 0.015, alpha: 1 },
      { tones: ["#c2cfda", "#dbe3e9"], rate: 0.035 },
      { tones: ["#92a9bd", "#c2cfda"], rate: 0.07 },
      { tones: ["#587791"], rate: 0.12 },
      { tones: ["#3b4f61"], rate: 0.2 },
    ],
    props: "pines",
    ink: {
      ground: "#2a3946", edge: "#4c6578", props: "#33475a",
      body: "#e8573a", bodyDark: "#b23a22", bodyLight: "#f6886a", frame: "#1d262e", tire: "#1b2229", hub: "#c9d3db", driver: "#22303c", helmet: "#f4efe6", visor: "#1b2229",
      coin: "#f6b93b", coinDark: "#c98a16", can: "#38b58e", canDark: "#1f7a5e", post: "#22303c", sign: "#eef1f4", signText: "#2a3946", flag: "#e8573a", dust: "#7d93a6",
    },
    land: {
      top: ["#a9c372", "#7f9d58", "#5b7848"], soil: ["#6e625a", "#594e48", "#473e3b", "#352e2e"], stone: ["#a7aeb2", "#757f87"],
      shadow: "#18233a", light: "#fffbea", ink: "#18202a", growth: "meadow",
    },
    hud: "light",
  },
  desert: {
    name: "Desert",
    set: "desert",
    sky: ["#dcd8d2", "#ece7e0"],
    sun: { x: 0.72, y: 0.3, r: 0.07, color: "#f6efe4", glow: "#fff8ee" },
    layers: [
      { tones: ["#e0dcd6"], rate: 0.015 },
      { tones: ["#d9cdc0"], rate: 0.03 },
      { tones: ["#967c68", "#9e8674"], rate: 0.06 },
      { tones: ["#594236", "#614b3f", "#463a31"], rate: 0.11 },
      { tones: ["#41362d", "#463c33"], rate: 0.19 },
    ],
    props: "rocks",
    drop: 0.08,
    ink: {
      ground: "#30261f", edge: "#5b4535", props: "#3a2f27",
      body: "#1fa596", bodyDark: "#147569", bodyLight: "#5cc9bc", frame: "#211a15", tire: "#1e1814", hub: "#e6ddd1", driver: "#2a211b", helmet: "#f3ece2", visor: "#211a15",
      coin: "#f2b640", coinDark: "#b97d14", can: "#e4583b", canDark: "#9c3520", post: "#2a211b", sign: "#ece7e0", signText: "#30261f", flag: "#1fa596", dust: "#a08b78",
    },
    land: {
      top: ["#e6b47a", "#cc8f58", "#a46b3e"], soil: ["#88593e", "#704a34", "#583a2b", "#3e2a20"], stone: ["#c69d7b", "#8d6a51"],
      shadow: "#2b1610", light: "#fff3dc", ink: "#26170f", growth: "desert",
    },
    hud: "light",
  },
  dusk: {
    name: "Dusk",
    set: "forest",
    sky: ["#2a2b55", "#f0a079"],
    sun: { x: 0.68, y: 0.5, r: 0.09, color: "#ffd9a8", glow: "#ffb98a" },
    layers: [
      { tones: ["#ffc8b0"], rate: 0.015, alpha: 0.8 },
      { tones: ["#9a6a92", "#c08aa2"], rate: 0.035 },
      { tones: ["#6b4675", "#9a6a92"], rate: 0.07 },
      { tones: ["#4b3161"], rate: 0.12 },
      { tones: ["#33224a"], rate: 0.2 },
    ],
    props: "pines",
    ink: {
      ground: "#21173a", edge: "#3e2c5e", props: "#2a1d44",
      body: "#ffb84a", bodyDark: "#d9822a", bodyLight: "#ffd88c", frame: "#140e24", tire: "#140e24", hub: "#e9dcef", driver: "#1a1230", helmet: "#fff4e6", visor: "#140e24",
      coin: "#ffd166", coinDark: "#d39a2a", can: "#52e0c4", canDark: "#21917c", post: "#1a1230", sign: "#f7e6dd", signText: "#21173a", flag: "#ffb84a", dust: "#7c6496",
    },
    land: {
      top: ["#a7a46e", "#7c7d58", "#585a47"], soil: ["#56426c", "#453559", "#352947", "#261d36"], stone: ["#9c88af", "#6c5986"],
      shadow: "#170d2a", light: "#ffe2bc", ink: "#150d22", growth: "meadow",
    },
    hud: "dark",
  },
};

export type Band = { file: string; y0: number; y1: number; floor: boolean; tones: string[]; w: number };
type Art = { h: number; sets: Record<Scene["set"], Band[]> };

let art: Promise<{ meta: Art; images: Record<string, HTMLImageElement> }> | null = null;
function load() {
  art ??= (async () => {
    const meta = (await (await fetch(new URL("./art/art.json", import.meta.url))).json()) as Art;
    const images: Record<string, HTMLImageElement> = {};
    await Promise.all(Object.values(meta.sets).flat().map((b) => new Promise<void>((done) => {
      const img = new Image();
      // In pal the page's origin is opaque: loaded without CORS the masks would taint the canvas they are recoloured on (ext:// answers `Access-Control-Allow-Origin: *`).
      img.crossOrigin = "anonymous";
      img.onload = img.onerror = () => done();
      img.src = new URL(`./art/${b.file}`, import.meta.url).href;
      images[b.file] = img;
    })));
    return { meta, images };
  })();
  return art;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** A layer drawn in its look's colours, and how it stands in the 900-pixel-tall picture. */
export type Layer = { canvas: HTMLCanvasElement; band: Band; color: string; rate: number; alpha: number };
const baked = new Map<string, Promise<{ layers: Layer[]; h: number }>>();

/** The look's layers, recoloured once and kept. */
export function layers(id: Exclude<LookId, "classic">) {
  let p = baked.get(id);
  if (!p) {
    p = load().then(({ meta, images }) => {
      const scene = SCENES[id];
      const bands = meta.sets[scene.set];
      return {
        h: meta.h,
        layers: bands.map((band, i) => {
          const spec = scene.layers[i];
          const img = images[band.file];
          const c = document.createElement("canvas");
          c.width = img.naturalWidth || 1;
          c.height = img.naturalHeight || 1;
          const g = c.getContext("2d")!;
          g.drawImage(img, 0, 0);
          const data = g.getImageData(0, 0, c.width, c.height);
          const tones = (spec?.tones ?? band.tones).map(rgb);
          const d = data.data;
          for (let k = 0; k < d.length; k += 4) {
            const t = tones[Math.min(tones.length - 1, Math.round(d[k] / 127.5))] ?? tones[0];
            d[k] = t[0]; d[k + 1] = t[1]; d[k + 2] = t[2];
          }
          g.putImageData(data, 0, 0);
          return { canvas: c, band, color: spec?.tones[0] ?? band.tones[0], rate: spec?.rate ?? 0.1, alpha: spec?.alpha ?? 1 };
        }),
      };
    });
    baked.set(id, p);
  }
  return p;
}
