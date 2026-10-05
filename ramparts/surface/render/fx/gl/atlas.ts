// The sprite atlas, drawn once at load: 8 x 8 cells of 128 px. Channel use: R = "heat"
// (the sprite shader mixes colour2 -> colour by it, so one cell can carry a hot core and a
// cooler edge), A = coverage. Pip cells are "baked": their RGB is the final colour.
import * as THREE from "../../../vendor/three.js";

export const C = {
  GLOW: 0, DOT: 1, RING: 2, SPARK: 3, STAR: 4, DIAMOND: 5, RUNE: 6, /* 6..8 */ FLAME: 9, SMOKE: 10,
  SHARD: 11, CHUNK: 12, COIN: 13, EYE: 14, STREAK: 15, HEX: 16, VINE: 17, CHEVRON: 18, BANG: 19,
  WING: 20, SNOW: 21, LEAF: 22, HEART: 23,
  PIP_FROZEN: 24, PIP_BURN: 25, PIP_HEX: 26, PIP_OIL: 27, PIP_MARK: 28, PIP_SHRED: 29, PIP_REVEAL: 30, PIP_PLUS: 31,
  RAY: 32, DROP: 33, HAMMER: 34, THORN: 35, PENNANT: 36, BURST: 37, BUBBLE: 38, SKULL: 39, SHELL: 40,
} as const;
export const BAKED = new Uint8Array(64);
for (const c of [C.PIP_FROZEN, C.PIP_BURN, C.PIP_HEX, C.PIP_OIL, C.PIP_MARK, C.PIP_SHRED, C.PIP_REVEAL, C.PIP_PLUS, C.PENNANT]) BAKED[c] = 1;

const N = 8, S = 128, SIZE = N * S;

type Ctx = CanvasRenderingContext2D;

function cell(ctx: Ctx, i: number, draw: (c: Ctx) => void): void {
  ctx.save();
  ctx.translate((i % N) * S + S / 2, Math.floor(i / N) * S + S / 2);
  ctx.beginPath();
  ctx.rect(-S / 2 + 2, -S / 2 + 2, S - 4, S - 4);
  ctx.clip();
  draw(ctx);
  ctx.restore();
}

/** Per-pixel cell: f(x, y) in -1..1 returns [heat, alpha]. */
function field(img: ImageData, i: number, f: (x: number, y: number) => [number, number]): void {
  const ox = (i % N) * S, oy = Math.floor(i / N) * S;
  for (let py = 4; py < S - 4; py++) for (let px = 4; px < S - 4; px++) {
    const [h, a] = f(((px + 0.5) / S) * 2 - 1, ((py + 0.5) / S) * 2 - 1);
    const o = ((oy + py) * SIZE + ox + px) * 4;
    const hh = Math.max(0, Math.min(1, h)), aa = Math.max(0, Math.min(1, a));
    img.data[o] = hh * 255; img.data[o + 1] = hh * 255; img.data[o + 2] = hh * 255; img.data[o + 3] = aa * 255;
  }
}

function hash(n: number): number { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function noise1(a: number, seed: number): number {
  // smooth periodic noise round a circle (angle a)
  let v = 0;
  for (let k = 1; k <= 4; k++) v += Math.sin(a * (k * 2 + 1) + hash(seed + k) * 6.28) / (k * 1.6);
  return v;
}

function star(c: Ctx, n: number, r0: number, r1: number): void {
  c.beginPath();
  for (let k = 0; k < n * 2; k++) {
    const r = k % 2 ? r1 : r0, a = (k / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
}

function pip(c: Ctx, bg: string, glyph: (c: Ctx) => void): void {
  c.fillStyle = "#1C1512";
  c.beginPath(); c.roundRect(-58, -58, 116, 116, 26); c.fill();
  c.fillStyle = bg;
  c.beginPath(); c.roundRect(-48, -48, 96, 96, 18); c.fill();
  glyph(c);
}

let tex: THREE.Texture | null = null;
export function atlas(): THREE.Texture {
  if (tex) return tex;
  const cv = document.createElement("canvas");
  cv.width = cv.height = SIZE;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(SIZE, SIZE);
  // procedural cells
  field(img, C.GLOW, (x, y) => { const r = Math.hypot(x, y); const a = Math.exp(-r * r * 5.5) * (1 - r * r) ** 2; return [Math.exp(-r * r * 14), r < 1 ? a : 0]; });
  field(img, C.DOT, (x, y) => { const r = Math.hypot(x, y); return [1 - r * 0.6, 1 - smooth(0.82, 0.95, r)]; });
  field(img, C.RING, (x, y) => { const r = Math.hypot(x, y); const d = Math.abs(r - 0.82); return [1 - d * 8, 1 - smooth(0.05, 0.12, d)]; });
  field(img, C.FLAME, (x, y) => {
    // teardrop: round bottom, pointed top (y up = -y)
    const yy = -y, w = yy < -0.3 ? Math.sqrt(Math.max(0, 1 - ((yy + 0.3) / 0.62) ** 2)) * 0.62 : 0.62 * (1 - (yy + 0.3) / 1.25) ** 1.4;
    const d = Math.abs(x) / Math.max(1e-3, w);
    const a = (1 - smooth(0.55, 1, d)) * (1 - smooth(0.85, 0.95, yy)) * (yy > -0.93 ? 1 : 0);
    const heat = (1 - d) * (1 - Math.max(0, yy + 0.2) * 0.9);
    return [heat * 1.4, a];
  });
  field(img, C.SMOKE, (x, y) => {
    const r = Math.hypot(x, y), a = Math.atan2(y, x);
    const edge = 0.78 + noise1(a, 3) * 0.08;
    const inner = 0.5 + 0.5 * Math.sin(x * 9 + Math.cos(y * 7) * 2) * Math.cos(y * 8 - x * 3);
    return [0.55 + 0.45 * (1 - r) - inner * 0.15, (1 - smooth(edge * 0.55, edge, r)) * (0.82 + inner * 0.18)];
  });
  field(img, C.STREAK, (x, y) => { const a = Math.exp(-y * y * 30) * (1 - x * x) ** 1.5; return [Math.exp(-y * y * 120) * (1 - x * x), a]; });
  field(img, C.RAY, (x, y) => { const a = Math.exp(-x * x * 9) * (1 - smooth(0.7, 1, Math.abs(y))); return [Math.exp(-x * x * 40), a]; });
  field(img, C.BUBBLE, (x, y) => { const r = Math.hypot(x, y); return [1, r < 0.92 ? 0.06 + 0.9 * r ** 6 : 1 - smooth(0.92, 0.98, r)]; });
  ctx.putImageData(img, 0, 0);

  // drawn cells (white = heat 1)
  const W = "#fff";
  cell(ctx, C.SPARK, (c) => {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 60);
    g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(160,160,160,0)");
    c.fillStyle = g; star(c, 4, 60, 9); c.fill();
  });
  cell(ctx, C.STAR, (c) => { c.fillStyle = W; star(c, 5, 54, 23); c.fill(); c.lineWidth = 6; c.strokeStyle = "#777"; c.stroke(); });
  cell(ctx, C.DIAMOND, (c) => {
    c.strokeStyle = W; c.lineWidth = 11; c.beginPath(); c.moveTo(0, -52); c.lineTo(40, 0); c.lineTo(0, 52); c.lineTo(-40, 0); c.closePath(); c.stroke();
    c.fillStyle = W; c.beginPath(); c.arc(0, 0, 8, 0, 7); c.fill();
  });
  const runes: ((c: Ctx) => void)[] = [
    (c) => { c.moveTo(-22, -46); c.lineTo(-22, 46); c.moveTo(-22, -46); c.lineTo(26, -10); c.lineTo(-22, 10); c.moveTo(-22, 10); c.lineTo(28, 46); },
    (c) => { c.moveTo(0, -48); c.lineTo(0, 48); c.moveTo(-30, -24); c.lineTo(30, 6); c.moveTo(30, -24); c.lineTo(-30, 6); },
    (c) => { c.moveTo(-28, 46); c.lineTo(0, -46); c.lineTo(28, 46); c.moveTo(-16, 10); c.lineTo(16, 10); c.moveTo(0, -46); c.lineTo(0, -20); },
  ];
  runes.forEach((r, k) => cell(ctx, C.RUNE + k, (c) => {
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = "rgba(140,140,140,0.6)"; c.lineWidth = 22; c.beginPath(); r(c); c.stroke();
    c.strokeStyle = W; c.lineWidth = 11; c.beginPath(); r(c); c.stroke();
  }));
  cell(ctx, C.SHARD, (c) => { c.fillStyle = W; c.beginPath(); c.moveTo(0, -60); c.lineTo(14, -6); c.lineTo(4, 58); c.lineTo(-12, 8); c.closePath(); c.fill(); c.fillStyle = "#999"; c.beginPath(); c.moveTo(0, -60); c.lineTo(4, 58); c.lineTo(-12, 8); c.closePath(); c.fill(); });
  cell(ctx, C.CHUNK, (c) => { c.fillStyle = "#aaa"; c.beginPath(); c.moveTo(-40, -30); c.lineTo(30, -44); c.lineTo(46, 20); c.lineTo(-10, 44); c.lineTo(-46, 10); c.closePath(); c.fill(); c.fillStyle = W; c.beginPath(); c.moveTo(-40, -30); c.lineTo(30, -44); c.lineTo(10, 0); c.lineTo(-46, 10); c.closePath(); c.fill(); });
  cell(ctx, C.COIN, (c) => {
    c.fillStyle = "#666"; c.beginPath(); c.arc(0, 0, 56, 0, 7); c.fill();
    c.fillStyle = W; c.beginPath(); c.arc(0, 0, 44, 0, 7); c.fill();
    c.fillStyle = "#bbb"; c.font = "bold 58px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("♛", 0, 4);
  });
  cell(ctx, C.EYE, (c) => {
    c.strokeStyle = W; c.lineWidth = 10; c.beginPath(); c.moveTo(-54, 0); c.quadraticCurveTo(0, -50, 54, 0); c.quadraticCurveTo(0, 50, -54, 0); c.stroke();
    c.fillStyle = W; c.beginPath(); c.arc(0, 0, 16, 0, 7); c.fill();
  });
  cell(ctx, C.HEX, (c) => {
    c.strokeStyle = W; c.lineWidth = 10; c.beginPath();
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; c.lineTo(Math.cos(a) * 50, Math.sin(a) * 50); }
    c.closePath(); c.stroke(); c.fillStyle = "rgba(200,200,200,0.35)"; c.fill();
  });
  cell(ctx, C.VINE, (c) => {
    c.lineCap = "round"; c.strokeStyle = "#999"; c.lineWidth = 14; c.beginPath(); c.moveTo(-50, 50); c.bezierCurveTo(-60, -10, 40, 20, 20, -50); c.stroke();
    c.strokeStyle = W; c.lineWidth = 6; c.stroke();
    c.fillStyle = W; for (const [x, y] of [[-40, 18], [-6, 4], [18, -22]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 16, y - 10); c.lineTo(x + 4, y + 6); c.fill(); }
  });
  cell(ctx, C.CHEVRON, (c) => { c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = W; c.lineWidth = 18; c.beginPath(); c.moveTo(-40, 24); c.lineTo(0, -20); c.lineTo(40, 24); c.stroke(); });
  cell(ctx, C.BANG, (c) => { c.fillStyle = W; c.beginPath(); c.roundRect(-11, -54, 22, 72, 10); c.fill(); c.beginPath(); c.arc(0, 42, 13, 0, 7); c.fill(); });
  cell(ctx, C.WING, (c) => {
    c.fillStyle = W; c.beginPath(); c.moveTo(0, 10); c.quadraticCurveTo(-30, -40, -60, -20); c.quadraticCurveTo(-36, -4, -40, 20); c.quadraticCurveTo(-18, 6, 0, 22);
    c.quadraticCurveTo(18, 6, 40, 20); c.quadraticCurveTo(36, -4, 60, -20); c.quadraticCurveTo(30, -40, 0, 10); c.fill();
  });
  cell(ctx, C.SNOW, (c) => {
    c.lineCap = "round"; c.strokeStyle = W; c.lineWidth = 9;
    for (let k = 0; k < 3; k++) { c.save(); c.rotate((k * Math.PI) / 3); c.beginPath(); c.moveTo(0, -52); c.lineTo(0, 52); for (const s of [-1, 1]) { c.moveTo(0, s * 30); c.lineTo(14, s * 44); c.moveTo(0, s * 30); c.lineTo(-14, s * 44); } c.stroke(); c.restore(); }
  });
  cell(ctx, C.LEAF, (c) => { c.fillStyle = W; c.beginPath(); c.moveTo(0, -54); c.quadraticCurveTo(40, 0, 0, 54); c.quadraticCurveTo(-40, 0, 0, -54); c.fill(); c.strokeStyle = "#888"; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -44); c.lineTo(0, 50); c.stroke(); });
  cell(ctx, C.HEART, (c) => { c.fillStyle = W; c.beginPath(); c.moveTo(0, 46); c.bezierCurveTo(-70, -6, -34, -64, 0, -24); c.bezierCurveTo(34, -64, 70, -6, 0, 46); c.fill(); });
  cell(ctx, C.DROP, (c) => { c.fillStyle = W; c.beginPath(); c.moveTo(0, -54); c.bezierCurveTo(30, -10, 40, 14, 0, 50); c.bezierCurveTo(-40, 14, -30, -10, 0, -54); c.fill(); });
  cell(ctx, C.HAMMER, (c) => { c.fillStyle = "#aaa"; c.fillRect(-7, -20, 14, 74); c.fillStyle = W; c.beginPath(); c.roundRect(-46, -52, 92, 34, 6); c.fill(); });
  cell(ctx, C.THORN, (c) => { const g = c.createLinearGradient(0, 54, 0, -56); g.addColorStop(0, "#666"); g.addColorStop(1, "#fff"); c.fillStyle = g; c.beginPath(); c.moveTo(-22, 56); c.quadraticCurveTo(-6, 0, 4, -58); c.quadraticCurveTo(10, 0, 24, 56); c.closePath(); c.fill(); });
  cell(ctx, C.BURST, (c) => {
    for (let k = 0; k < 12; k++) {
      c.save(); c.rotate((k / 12) * Math.PI * 2);
      const g = c.createLinearGradient(0, 0, 0, -60); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.35, "#fff"); g.addColorStop(1, "rgba(120,120,120,0)");
      c.fillStyle = g; c.beginPath(); c.moveTo(-5, -14); c.lineTo(0, -62); c.lineTo(5, -14); c.fill(); c.restore();
    }
  });
  cell(ctx, C.SKULL, (c) => { c.fillStyle = W; c.beginPath(); c.arc(0, -8, 40, 0, 7); c.fill(); c.fillRect(-22, 20, 44, 26); c.fillStyle = "#000"; c.globalCompositeOperation = "destination-out"; c.beginPath(); c.arc(-15, -6, 11, 0, 7); c.arc(15, -6, 11, 0, 7); c.fill(); });
  // shield shell: a tight hexagon outline with a faint hex lattice inside (no translucent sphere)
  cell(ctx, C.SHELL, (c) => {
    const hex = (r: number) => { c.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + Math.PI / 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); };
    // three faint facet lines from the centre, so it reads as a hex shield, not a grid
    c.strokeStyle = "rgba(150,150,150,0.35)"; c.lineWidth = 3;
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + Math.PI / 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 56, Math.sin(a) * 56); c.stroke(); }
    c.strokeStyle = W; c.lineWidth = 6; hex(58); c.stroke();
  });
  // baked pips (final colours)
  cell(ctx, C.PIP_FROZEN, (c) => pip(c, "#5AB8E8", (c) => { c.save(); c.scale(0.72, 0.72); c.lineCap = "round"; c.strokeStyle = "#fff"; c.lineWidth = 12; for (let k = 0; k < 3; k++) { c.save(); c.rotate((k * Math.PI) / 3); c.beginPath(); c.moveTo(0, -46); c.lineTo(0, 46); c.stroke(); c.restore(); } c.restore(); }));
  cell(ctx, C.PIP_BURN, (c) => pip(c, "#FF8A2A", (c) => { c.fillStyle = "#FFE6A0"; c.beginPath(); c.moveTo(0, -36); c.bezierCurveTo(26, -6, 26, 30, 0, 34); c.bezierCurveTo(-26, 30, -26, -6, 0, -36); c.fill(); }));
  cell(ctx, C.PIP_HEX, (c) => pip(c, "#B26BFF", (c) => { c.strokeStyle = "#fff"; c.lineWidth = 9; c.beginPath(); c.moveTo(-34, 0); c.quadraticCurveTo(0, -30, 34, 0); c.quadraticCurveTo(0, 30, -34, 0); c.stroke(); c.fillStyle = "#fff"; c.beginPath(); c.arc(0, 0, 10, 0, 7); c.fill(); }));
  cell(ctx, C.PIP_OIL, (c) => pip(c, "#3A3028", (c) => { c.fillStyle = "#8C7A68"; c.beginPath(); c.moveTo(0, -36); c.bezierCurveTo(22, -6, 30, 12, 0, 34); c.bezierCurveTo(-30, 12, -22, -6, 0, -36); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(-8, 10, 6, 0, 7); c.fill(); }));
  cell(ctx, C.PIP_MARK, (c) => pip(c, "#3A2E14", (c) => { c.strokeStyle = "#FFD36B"; c.lineWidth = 10; c.beginPath(); c.moveTo(0, -34); c.lineTo(28, 0); c.lineTo(0, 34); c.lineTo(-28, 0); c.closePath(); c.stroke(); }));
  cell(ctx, C.PIP_SHRED, (c) => pip(c, "#4A4E55", (c) => { c.fillStyle = "#B7C0CC"; c.beginPath(); c.moveTo(-30, -28); c.lineTo(6, -28); c.lineTo(-6, 0); c.lineTo(10, 28); c.lineTo(-30, 28); c.fill(); c.beginPath(); c.moveTo(16, -28); c.lineTo(30, -28); c.lineTo(30, 28); c.lineTo(22, 28); c.lineTo(8, 0); c.fill(); }));
  cell(ctx, C.PIP_REVEAL, (c) => pip(c, "#3A2E14", (c) => { c.strokeStyle = "#FFD36B"; c.lineWidth = 9; c.beginPath(); c.moveTo(-36, 0); c.quadraticCurveTo(0, -32, 36, 0); c.quadraticCurveTo(0, 32, -36, 0); c.stroke(); c.fillStyle = "#FFD36B"; c.beginPath(); c.arc(0, 0, 11, 0, 7); c.fill(); }));
  cell(ctx, C.PIP_PLUS, (c) => pip(c, "#2C2622", (c) => { c.fillStyle = "#F1EADB"; c.fillRect(-7, -30, 14, 60); c.fillRect(-30, -7, 60, 14); }));
  cell(ctx, C.PENNANT, (c) => { c.fillStyle = "#5E574C"; c.fillRect(-36, -56, 8, 112); c.fillStyle = "#3F78D6"; c.beginPath(); c.moveTo(-28, -52); c.lineTo(50, -30); c.lineTo(-28, -6); c.fill(); c.fillStyle = "#E3B655"; c.fillRect(-28, -52, 8, 46); });

  tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  return tex;
}

function smooth(a: number, b: number, x: number): number { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

/** GLSL: uv of a cell. */
export const ATLAS_GLSL = /* glsl */ `
  vec2 cellUv(float cell, vec2 uv) {
    float cx = mod(cell, 8.0), cy = floor(cell / 8.0);
    return vec2((cx + uv.x) / 8.0, 1.0 - (cy + 1.0 - uv.y) / 8.0);
  }
`;
