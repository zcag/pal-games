// What the effects read off the content: per-material debris looks, per-find colours, per-biome
// ambience. All derived from content/world.ts (data-driven); only the feel per sound family lives here.
import { BIOMES, FINDS, MATERIALS, planetDef } from "../../game/content/world.ts";
import type { Find, PlanetId } from "../../game/types.ts";

export type RGB = [number, number, number];

const cache = new Map<string, RGB>();
/** "#rrggbb" to sRGB 0..1 (particles carry sRGB; the renderer linearises). */
export const hex = (h: string): RGB => {
  let c = cache.get(h);
  if (!c) {
    const n = parseInt(h.slice(1, 7), 16);
    c = [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    cache.set(h, c);
  }
  return c;
};
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
/** Linear RGB for Light.color. */
export const lin = (c: RGB): RGB => [toLin(c[0]), toLin(c[1]), toLin(c[2])];
export const hexLin = (h: string): RGB => lin(hex(h));
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Fog per biome slot (art.md 4): dust is `mix(material.light, fog, .5)`. */
const FOG = ["#1a1420", "#121318", "#0d0e22", "#0a1214", "#1a0804", "#0b1012", "#fff0d8"];

/** Extra particles a material family throws while drilled (core-loop "Per-material feel"). */
export type Extra = "none" | "sparks" | "shards" | "embers" | "squares" | "violet" | "spores" | "clumps";

export interface MatFx {
  /** dark, base, base2, light */
  pal: RGB[];
  dust: RGB;
  extra: Extra;
  /** chip size bias (art px) */
  chip: number;
  dense: boolean;
  unbreakable: boolean;
  solid: boolean;
  liquid: boolean;
  glow?: RGB;
  name: string;
}

const extraOf = (sound: string, dense: boolean, biome: number): Extra => {
  if (sound === "hum") return "violet";
  if (dense || sound === "hard") return "sparks";
  if (sound === "glass") return "shards";
  if (sound === "rumble") return biome === 4 || biome === 7 ? "embers" : "none";
  if (sound === "chisel") return "squares";
  if (sound === "squish") return "spores";
  if (sound === "wet") return "clumps";
  return "none";
};

export const MAT_FX: MatFx[] = MATERIALS.map((m) => {
  const pal = m.palette.map(hex);
  const slot = Math.max(0, Math.min(6, m.biome === 7 ? 3 : m.biome === 8 ? 2 : m.biome));
  return {
    pal, dust: mix(pal[3], hex(FOG[slot]), 0.5), extra: extraOf(m.sound, !!m.dense, m.biome),
    chip: m.sound === "chisel" || m.sound === "wet" ? 2 : 1, dense: !!m.dense,
    unbreakable: m.kind === "unbreakable", solid: m.id !== 0 && m.kind !== "liquid", liquid: m.kind === "liquid",
    glow: m.glow ? hex(m.glow.color) : undefined, name: m.name,
  };
});
export const matFx = (id: number): MatFx => MAT_FX[id] ?? MAT_FX[0];

/** 1 where a tile stops particles (solid), indexed by material id. */
export const SOLID = new Uint8Array(256);
MAT_FX.forEach((m, i) => (SOLID[i] = m?.solid ? 1 : 0));
export const LAVA_ID = MATERIALS.find((m) => m?.key === "lava")?.id ?? -1;

export interface FindFx { base: RGB; light: RGB; glint: RGB; glow?: RGB; big: boolean; jackpot: boolean; name: string }
export const FIND_FX: (FindFx | undefined)[] = FINDS.map((f: Find | undefined) =>
  f && {
    base: hex(f.colors[0]), light: hex(f.colors[1]), glint: hex(f.colors[2]), glow: f.glow ? hex(f.glow.color) : undefined,
    // hitstop finds: jackpots, gems, stars, relics (art.md 8.2)
    big: f.kind !== "ore" || f.cls === "Gem" || f.cls === "Star" || f.shape === "gem",
    jackpot: f.kind === "jackpot", name: f.name,
  });
export const findFx = (id: number) => FIND_FX[id];
export const LODESTONE_ID = FINDS.find((f) => f?.key === "lodestone")?.id ?? -1;

/** Cache accent by theme (the material's light colour). */
export const CACHE_ACCENT: Record<string, RGB> = {};
for (const m of MATERIALS) if (m?.cache) CACHE_ACCENT[m.cache] = hex(m.palette[3]);

/** Biome def key for a slot on a planet ("topsoil", ..., "ash", "banded"). */
export const biomeKey = (planet: PlanetId, slot: number) => BIOMES[planetDef(planet).biomes[slot] ?? slot]?.key ?? "topsoil";
