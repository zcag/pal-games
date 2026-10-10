// Rebuilds surface/art/: PWL's flat landscape layers (CC0, surface/art/README.md)
// as tone masks the page recolours. Each layer keeps only its band: rows above
// it are empty and rows below it are solid, so the page fills those itself. A
// pixel's grey is which of the layer's tones it is (0, 128, 255: its first,
// second and third most common colour), its alpha the coverage; art.json
// lists each band, whether it stands on solid ground (`floor`: everything
// under the band is its first tone) and the tones it was drawn in.
//   bun uphill/scripts/art.ts <forest parts dir> <desert parts dir>
// (the unzipped "Seamless HD landscape in parts" and "Seamless desert
// background in parts"; magick on PATH.)
import { spawnSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dir, "../surface/art");
const H = 900;
const magick = (args: string[], input?: Uint8Array) => {
  const r = spawnSync("magick", args, { input, maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`magick ${args.join(" ")}: ${r.stderr}`);
  return r.stdout as Buffer;
};
const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

type Band = { file: string; y0: number; y1: number; floor: boolean; tones: string[] };
function layer(src: string, name: string, canvas: [number, number]): Band {
  // A part smaller than the picture sits on its bottom edge (the desert's are cut to their own height).
  const fit = [src, "-background", "none", "-gravity", "south", "-extent", `${canvas[0]}x${canvas[1]}`, "-resize", `x${H}`];
  const [w, h] = magick([...fit, "-format", "%w %h", "info:"]).toString().split(" ").map(Number);
  const px = magick([...fit, "-depth", "8", "rgba:-"]);
  // The tones: the most common colours of the solid pixels.
  const count = new Map<number, number>();
  // (A layer with no solid pixel, the clouds, counts the ones over half covered.)
  let solid = false;
  for (let i = 3; i < px.length && !solid; i += 4) solid = px[i] === 255;
  for (let i = 0; i < px.length; i += 4) if (solid ? px[i + 3] === 255 : px[i + 3] > 0) { const k = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]; count.set(k, (count.get(k) ?? 0) + 1); }
  const tones = [...count].sort((a, b) => b[1] - a[1]).filter(([, n]) => n > w).slice(0, 3).map(([k]) => [k >> 16, (k >> 8) & 255, k & 255]);
  // The band: from the first row with anything in it to the last row that is not solid all the way across.
  let y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) {
    let any = false, all = true;
    for (let x = 0; x < w; x++) { const a = px[(y * w + x) * 4 + 3]; if (a > 0) any = true; if (a < 255) all = false; }
    if (any && y < y0) y0 = y;
    if (any && !all) y1 = y + 1;
  }
  // Whether the rows under the band are solid (hills, trees) or empty (clouds).
  let floor = true;
  for (let x = 0; x < w; x++) if (px[((h - 1) * w + x) * 4 + 3] < 255) floor = false;
  if (y0 >= y1) { y0 = 0; y1 = 1; }
  const out = Buffer.alloc(w * (y1 - y0) * 2);
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, o = ((y - y0) * w + x) * 2;
    let best = 0, bd = Infinity;
    tones.forEach((t, k) => { const d = (px[i] - t[0]) ** 2 + (px[i + 1] - t[1]) ** 2 + (px[i + 2] - t[2]) ** 2; if (d < bd) { bd = d; best = k; } });
    out[o] = [0, 128, 255][best];
    out[o + 1] = px[i + 3];
  }
  const file = `${name}.png`;
  magick(["-size", `${w}x${y1 - y0}`, "-depth", "8", "graya:-", "-define", "png:compression-level=9", join(OUT, file)], out);
  return { file, y0, y1, floor, tones: tones.map(([r, g, b]) => hex(r, g, b)) };
}

const [forest, desert] = process.argv.slice(2);
if (!forest || !desert) throw new Error("bun uphill/scripts/art.ts <forest parts dir> <desert parts dir>");
const sets: Record<string, Band[]> = {};
for (const [set, dir] of [["forest", forest], ["desert", desert]] as const) {
  // Back to front: the files are numbered front to back.
  const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort().reverse();
  const sizes = files.map((f) => magick([join(dir, f), "-format", "%w %h", "info:"]).toString().split(" ").map(Number));
  const canvas: [number, number] = [Math.max(...sizes.map((s) => s[0])), Math.max(...sizes.map((s) => s[1]))];
  const w = Math.round((canvas[0] * H) / canvas[1]);
  // The backmost part is the sky, one flat colour: the page paints its own.
  sets[set] = files.slice(1).map((f, i) => layer(join(dir, f), `${set}-${i}`, canvas));
  (sets[set] as unknown as { w: number }[]).forEach((b) => (b.w = w));
}
writeFileSync(join(OUT, "art.json"), JSON.stringify({ h: H, sets }, null, 1) + "\n");
console.log(JSON.stringify(sets, null, 1));
