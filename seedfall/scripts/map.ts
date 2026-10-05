// Renders a generated world to a PNG for visual checks, and prints per-biome stats.
//   bun scripts/map.ts --seed 1 --planet vell --out shots-tmp/map.png [--scale 3] [--strips 4] [--plain]
import { deflateSync } from "node:zlib";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { W, H, HAZ, FLAG, type PlanetId } from "../game/types.ts";
import { generate, worldStats } from "../game/gen.ts";
import { MATERIALS, FINDS, BIOMES, planetDef } from "../game/content/world.ts";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const seed = +opt("seed", "1"), planet = opt("planet", "vell") as PlanetId;
const out = opt("out", `shots-tmp/map-${planet}-${seed}.png`);
const S = +opt("scale", "3"), strips = +opt("strips", "4"), plain = args.includes("--plain"), classes = args.includes("--classes");
const [R0, R1] = opt("rows", `0:${H - 1}`).split(":").map(Number);

const t0 = performance.now();
const world = generate(seed, planet);
const ms = performance.now() - t0;

const rgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const pd = planetDef(planet);
const HAZC: Record<number, string> = { [HAZ.GAS]: "#c8e04a", [HAZ.SPORE_VENT]: "#b8f0a0", [HAZ.PYLON]: "#8ac8ff", [HAZ.FALSE_FLOOR]: "#ff4a3a", [HAZ.LAVA_POCKET]: "#ff8a2a" };

function tileColor(x: number, y: number): number[] {
  const i = y * W + x, m = MATERIALS[world.mat[i]], f = FINDS[world.find[i]];
  if (!plain) {
    if (f?.kind === "artifact") return rgb("#ff40ff");
    if (f?.kind === "jackpot") return rgb("#ffffff");
    if (f) return rgb(f.colors[1]);
    if (m.cache) return rgb("#00ffff");
    if (world.haz[i]) return rgb(HAZC[world.haz[i]] ?? "#ff0000");
    if (m.key === "boulder_stone" || m.pattern === "boulder") return rgb("#e8e0d0").map((v) => v * 0.8);
    if (m.key === "geyser") return rgb("#ff5a00");
  }
  if (classes) {
    if (world.mat[i] === 0) return world.flag[i] & FLAG.STRUCT ? [70, 70, 90] : [0, 0, 0];
    if (m.kind === "liquid") return [255, 100, 0];
    if (m.kind === "unbreakable") return [40, 60, 200];
    if (m.dense) return [170, 40, 40];
    if (world.flag[i] & FLAG.STRUCT) return [150, 120, 60];
    return [110, 110, 110];
  }
  if (world.mat[i] === 0) {
    const b = BIOMES[pd.biomes[world.biome[i]]];
    const c = rgb(b.backWall);
    return world.flag[i] & FLAG.STRUCT ? c.map((v) => v * 1.4 + 6) : c.map((v) => v * 0.35);
  }
  if (m.kind === "liquid") return rgb(m.palette[1]);
  if (m.kind === "unbreakable") return rgb(m.palette[1]).map((v) => v * 0.7);
  return rgb(m.palette[1]).map((v) => (m.dense ? v * 0.8 : v));
}

const rowsPer = Math.ceil((R1 - R0 + 1) / strips), gap = 6;
const iw = strips * (W * S + gap), ih = rowsPer * S;
const px = new Uint8Array(iw * ih * 3).fill(16);
for (let s = 0; s < strips; s++) for (let ry = 0; ry < rowsPer; ry++) {
  const y = R0 + s * rowsPer + ry;
  if (y > R1) break;
  for (let x = 0; x < W; x++) {
    const c = tileColor(x, y);
    for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
      const o = ((ry * S + dy) * iw + s * (W * S + gap) + x * S + dx) * 3;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
    }
  }
  // Biome boundary tick in the gap.
  if (ry > 0 && world.biome[y * W + 1] !== world.biome[(y - 1) * W + 1]) for (let dx = 0; dx < gap; dx++) for (let dy = 0; dy < S; dy++) {
    const o = ((ry * S + dy) * iw + s * (W * S + gap) + W * S + dx) * 3;
    px[o] = 255; px[o + 1] = 255; px[o + 2] = 255;
  }
}

// PNG: RGB8, filter 0 rows, zlib.
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Uint8Array) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type: string, data: Uint8Array) => {
  const b = new Uint8Array(12 + data.length), dv = new DataView(b.buffer);
  dv.setUint32(0, data.length); b.set(new TextEncoder().encode(type), 4); b.set(data, 8);
  dv.setUint32(8 + data.length, crc(b.subarray(4, 8 + data.length)));
  return b;
};
const raw = new Uint8Array(ih * (iw * 3 + 1));
for (let y = 0; y < ih; y++) raw.set(px.subarray(y * iw * 3, (y + 1) * iw * 3), y * (iw * 3 + 1) + 1);
const hdr = new Uint8Array(13), hv = new DataView(hdr.buffer);
hv.setUint32(0, iw); hv.setUint32(4, ih); hdr[8] = 8; hdr[9] = 2;
const png = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", hdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array())];
mkdirSync(dirname(out), { recursive: true });
await Bun.write(out, new Blob(png));

const pct = (a: number, b: number) => ((100 * a) / Math.max(1, b)).toFixed(1).padStart(5);
console.log(`${planet} seed ${seed}: ${ms.toFixed(1)} ms, ${world.structures.length} structures, ${world.caches?.length ?? 0} caches -> ${out}`);
console.log("biome            open%  unb% dense% ore% (of diggable)  ore tiles  pieces  top ores");
worldStats(world).forEach((s, slot) => {
  const b = BIOMES[pd.biomes[slot]];
  const top = Object.entries(s.byOre).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${v}`).join(", ");
  console.log(`${b.name.padEnd(16)} ${pct(s.open, s.tiles)} ${pct(s.unb, s.tiles)} ${pct(s.dense, s.diggable)} ${pct(s.ore, s.diggable)}             ${String(s.ore).padStart(5)}  ${String(s.pieces).padStart(6)}  ${top}`);
});
