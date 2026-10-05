// Seedfall's renderer (design/art.md): a lit pixel-art pipeline in WebGL2.
//
//   const r = new Renderer(canvas);            // content from src/game/content/world.ts, or r.setContent(...)
//   r.resize();                                // on window resize (frame() also notices size changes)
//   r.frame(game, camera, fx, extras);         // once per animation frame; sets camera.tilePx / w / h
//   r.buildingAt(cssX, cssY)                   // which town building is under a click, or null
//
// Passes (all at art resolution until the last): sky -> G-buffer (terrain, sprites) -> light (base + dynamic)
// -> resolve -> particles -> bloom -> final (sub-pixel upscale, haze, aberration, tone map, grade, vignette).
import { H, SKY_ROWS, W, type GameView, type Stat, type WorldData } from "../../game/types.ts";
import { STRIDE, type Camera, type Light, type Particles, type PostFx } from "../view.ts";
import { FS_VS } from "./glsl.ts";
import { buildTables, KIND, MF, type RenderContent, type Tables, MAT_ROWS, FIND_ROWS, TABLE_W } from "./content.ts";
import { GRID_ROWS, Grids } from "./grids.ts";
import { BIOME_LOOK, LIFT_LIGHT, LIFT_SEGMENTS, PLANETS, SKY_KEYS, hex, hexLin, lin, mixc, scale, smooth, type RGB } from "./look.ts";
import { ADAPT_FS, DOWN_FS, FINAL_FS, LIGHT_BASE_FS, LIGHT_FS, LIGHT_VS, LUM_FS, PART_FS, PART_VS, PREFILTER_FS, RESOLVE_FS, SKY_FS, SPRITE_FS, SPRITE_VS, UP_FS } from "./passes.ts";
import { buildPod, flameTier, lampTint, FLAME_COLORS, type PodSprites } from "./pod.ts";
import { Atlas, buildObjects, type ObjectSprites, type Spr } from "./sprites.ts";
import { TERRAIN_FS } from "./terrain.ts";
import { buildTown, type Town } from "./town.ts";

/** Per-frame cosmetic state the integration hands the renderer (all optional). */
export interface RenderExtras {
  /** Pod look: squash 0..1 (landing, art.md 5.3), hit flash 0..1 (white), hurt 0..1 (red mix), riding the Lift, fast drop. */
  pod?: { squash?: number; flash?: number; hurt?: number; riding?: boolean; drop?: boolean; brakeRow?: number };
  /** The last scanner pulse: centre (tiles), radius (tiles) and its age in seconds. */
  scan?: { x: number; y: number; r: number; age: number } | null;
  /** Timed hazard tells from events: gas fuse, spore vent charge, arc pylons, a false floor under the pod (k 0..1). */
  tells?: Tell[];
  /** Seconds since the last core pulse (GameEvent "pulse"); omit or negative when none. */
  pulse?: number;
  /** Building the pod stands at (its door glows), and the depot pad's lit marks 0..1. */
  door?: string | null;
  pad?: number;
  /** Debug view (F9): 0 off, 1 layers (G0.a), 2 squint (grey + 3x3 blur). */
  debug?: number;
}
export interface Tell { kind: "fuse" | "spore" | "arc_charge" | "arc" | "floor" | "geyser"; x: number; y: number; k: number; x2?: number; y2?: number }

/** Plain rock per biome slot: saturation, value (review 2: magma grey-brown and near-black, ruins grey stone, core oxblood). */
const ROCK_GRADE = new Float32Array([1, 1, 0.85, 1, 1, 1, 0.9, 1, 0.55, 1.05, 0.55, 0.95, 0.5, 0.95, 0.9, 1, 0.9, 1, 0.9, 1]);
const TELL_KIND = { fuse: 1, spore: 2, arc_charge: 3, arc: 4, floor: 5, geyser: 6 } as const;
const FLOOR_K = [0, 0.02, 0.028, 0.034, 0.05, 0.05, 0.55, 0.3];
const MAX_LIGHTS = 24, MAX_SPRITES = 512, SPRITE_F = 20, LIGHT_F = 12;

type Prog = ReturnType<typeof prog>;
function prog(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const sh = (t: number, src: string) => {
    const s = gl.createShader(t)!; gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("shader: " + gl.getShaderInfoLog(s) + "\n" + src.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n"));
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(p));
  const u: Record<string, WebGLUniformLocation | null> = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i)!; u[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

interface Tgt { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number }

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  /** Art-buffer geometry after the last resize (art.md 1.1). */
  S = 1; devW = 1; devH = 1; artW = 1; artH = 1; dpr = 1; cssW = 1; cssH = 1;
  /** Measured timings (ms): CPU for frame(), GPU from the timer query when the driver offers one. */
  stats = { cpu: 0, gpu: 0 };
  debug = 0;

  private hdr: boolean;
  private P!: Record<string, Prog>;
  private vao: WebGLVertexArrayObject;
  private tex: Record<string, WebGLTexture> = {};
  private gb: Tgt & { t1: WebGLTexture; t2: WebGLTexture } | null = null;
  private light: Tgt | null = null;
  private scene: Tgt | null = null;
  private mips: Tgt[] = [];
  private lum: Tgt | null = null;
  private adapt: Tgt | null = null;

  private tables: Tables | null = null;
  private world: WorldData | null = null;
  private grids: Grids | null = null;
  private typical = new Int32Array(10);
  private atlas = new Atlas();
  private obj: ObjectSprites;
  private town: Town;
  private pod: PodSprites | null = null;

  private spriteBuf: WebGLBuffer; private spriteVao: WebGLVertexArrayObject; private spriteData = new Float32Array(MAX_SPRITES * SPRITE_F); private nSprites = 0;
  private lightBuf: WebGLBuffer; private lightVao: WebGLVertexArrayObject; private lightData = new Float32Array(MAX_LIGHTS * LIGHT_F);
  private partBuf: WebGLBuffer; private partVao: WebGLVertexArrayObject;
  private extraParts: Float32Array = new Float32Array(256 * STRIDE); private nExtra = 0;

  private lampDir = 0; private lastT = -1; private treadX = 0; private treadF = 0;
  private timer: { ext: any; q: WebGLQuery | null; pending: WebGLQuery[] } = { ext: null, q: null, pending: [] };
  private buildingRects: { id: string; x: number; y: number; w: number; h: number }[] = [];
  private org = [0, 0]; private off = [0, 0];

  constructor(readonly canvas: HTMLCanvasElement, content?: RenderContent) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 is not available");
    this.gl = gl;
    this.hdr = !!gl.getExtension("EXT_color_buffer_float");
    gl.getExtension("OES_texture_float_linear");
    this.timer.ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    this.vao = gl.createVertexArray()!;
    this.P = {
      terrain: prog(gl, FS_VS, TERRAIN_FS), sky: prog(gl, FS_VS, SKY_FS), lbase: prog(gl, FS_VS, LIGHT_BASE_FS), light: prog(gl, LIGHT_VS, LIGHT_FS),
      resolve: prog(gl, FS_VS, RESOLVE_FS), sprite: prog(gl, SPRITE_VS, SPRITE_FS), part: prog(gl, PART_VS, PART_FS),
      pre: prog(gl, FS_VS, PREFILTER_FS), down: prog(gl, FS_VS, DOWN_FS), up: prog(gl, FS_VS, UP_FS), lumP: prog(gl, FS_VS, LUM_FS), adaptP: prog(gl, FS_VS, ADAPT_FS), fin: prog(gl, FS_VS, FINAL_FS),
    };
    // Instanced sprite quads.
    this.spriteBuf = gl.createBuffer()!; this.spriteVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.spriteVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.spriteData.byteLength, gl.DYNAMIC_DRAW);
    ["aDst", "aSrc", "aA", "aB", "aC"].forEach((n, i) => { const l = gl.getAttribLocation(this.P.sprite.p, n); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.FLOAT, false, SPRITE_F * 4, i * 16); gl.vertexAttribDivisor(l, 1); });
    this.lightBuf = gl.createBuffer()!; this.lightVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.lightVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.lightBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.lightData.byteLength, gl.DYNAMIC_DRAW);
    ["aL0", "aL1", "aL2"].forEach((n, i) => { const l = gl.getAttribLocation(this.P.light.p, n); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.FLOAT, false, LIGHT_F * 4, i * 16); gl.vertexAttribDivisor(l, 1); });
    // Particles straight from the shared buffer layout (view.ts P): stride 16 floats.
    this.partBuf = gl.createBuffer()!; this.partVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.partVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
    gl.bufferData(gl.ARRAY_BUFFER, 4096 * STRIDE * 4, gl.DYNAMIC_DRAW);
    const pa = (n: string, size: number, off: number) => { const l = gl.getAttribLocation(this.P.part.p, n); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, STRIDE * 4, off * 4); };
    pa("aPos", 2, 0); pa("aLife", 2, 4); pa("aSize", 1, 6); pa("aCol", 4, 7); pa("aHF", 2, 11);
    gl.bindVertexArray(null);
    this.obj = buildObjects(this.atlas);
    this.town = buildTown(this.atlas);
    if (content) this.setContent(content);
    this.resize();
  }

  /** Materials and finds to draw with (palettes, patterns, glows come from here). */
  setContent(c: RenderContent) {
    this.tables = buildTables(c);
    const gl = this.gl;
    this.tex.mat = this.mkTex(TABLE_W, MAT_ROWS, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.tables.mat, gl.NEAREST);
    this.tex.find = this.mkTex(TABLE_W, FIND_ROWS, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.tables.find, gl.NEAREST);
    const st = this.tables.stamps;
    this.tex.stamp = this.mkTex(st.w, st.h, gl.R8UI, gl.RED_INTEGER, gl.UNSIGNED_BYTE, st.data, gl.NEAREST);
    this.world = null;
  }

  private mkTex(w: number, h: number, ifmt: number, fmt: number, type: number, data: ArrayBufferView | null, filter: number) {
    const gl = this.gl, t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  private mkTgt(w: number, h: number, hdr: boolean, filter: number): Tgt {
    const gl = this.gl;
    const tex = this.mkTex(w, h, hdr && this.hdr ? gl.RGBA16F : gl.RGBA8, gl.RGBA, hdr && this.hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null, filter);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w, h };
  }
  private freeTgt(t: Tgt | null) { if (t) { this.gl.deleteTexture(t.tex); this.gl.deleteFramebuffer(t.fb); } }

  /** Resize the canvas to its CSS box at min(dpr, 2) and pick the integer scale (art.md 1.1). */
  resize() {
    const gl = this.gl, c = this.canvas;
    const r = c.getBoundingClientRect();
    this.cssW = Math.max(1, r.width || c.clientWidth || 720); this.cssH = Math.max(1, r.height || c.clientHeight || 390);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.devW = Math.round(this.cssW * this.dpr); this.devH = Math.round(this.cssH * this.dpr);
    c.width = this.devW; c.height = this.devH;
    const target = Math.min(16, Math.max(12, 12 + 4 * (this.cssH - 390) / (900 - 390)));
    const S0 = this.devH / (target * 16);
    const cands = [Math.max(1, Math.floor(S0)), Math.max(1, Math.ceil(S0))];
    this.S = cands.reduce((b, s) => (Math.abs(this.devH / s / 16 - target) < Math.abs(this.devH / b / 16 - target) ? s : b));
    this.artW = Math.ceil(this.devW / this.S) + 2; this.artH = Math.ceil(this.devH / this.S) + 2;
    // Targets.
    if (this.gb) { gl.deleteTexture(this.gb.tex); gl.deleteTexture(this.gb.t1); gl.deleteTexture(this.gb.t2); gl.deleteFramebuffer(this.gb.fb); }
    const t0 = this.mkTex(this.artW, this.artH, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, null, gl.NEAREST);
    const t1 = this.mkTex(this.artW, this.artH, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, null, gl.NEAREST);
    const t2 = this.mkTex(this.artW, this.artH, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, null, gl.NEAREST);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t0, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, t1, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, t2, 0);
    this.gb = { tex: t0, t1, t2, fb, w: this.artW, h: this.artH };
    this.freeTgt(this.light); this.light = this.mkTgt(this.artW, this.artH, true, gl.NEAREST);
    this.freeTgt(this.scene); this.scene = this.mkTgt(this.artW, this.artH, true, gl.LINEAR);
    this.mips.forEach((m) => this.freeTgt(m)); this.mips = [];
    let mw = this.artW >> 1, mh = this.artH >> 1;
    for (let i = 0; i < 5 && mw > 2 && mh > 2; i++, mw >>= 1, mh >>= 1) this.mips.push(this.mkTgt(mw, mh, true, gl.LINEAR));
    if (!this.lum) {
      this.lum = this.mkTgt(64, 32, true, gl.LINEAR);
      gl.bindTexture(gl.TEXTURE_2D, this.lum.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      this.adapt = this.mkTgt(1, 1, true, gl.NEAREST);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** CSS px per tile and the canvas size, written into the camera (the renderer owns the canvas size). */
  private size(cam: Camera) { cam.tilePx = 16 * this.S / this.dpr; cam.w = this.cssW; cam.h = this.cssH; }

  /** The town building under a CSS point, or null (doors and signs are clickable). */
  buildingAt(sx: number, sy: number): string | null {
    const ax = (sx * this.dpr + this.off[0]) / this.S + 1 + this.org[0], ay = (sy * this.dpr + this.off[1]) / this.S + 1 + this.org[1];
    for (const b of this.buildingRects) if (ax >= b.x && ax < b.x + b.w && ay >= b.y && ay < b.y + b.h) return b.id;
    return null;
  }

  // ---------------------------------------------------------------- world upload

  private setWorld(w: WorldData) {
    const gl = this.gl, t = this.tables!;
    this.world = w;
    const n = W * (H + SKY_ROWS);
    const A = new Uint8Array(n * 4), B = new Uint8Array(n * 4), D = new Uint8Array(n);
    for (let i = 0; i < W * H; i++) {
      const o = i + W * SKY_ROWS;
      A[o * 4] = w.mat[i]; A[o * 4 + 1] = w.find[i]; A[o * 4 + 2] = w.haz[i]; A[o * 4 + 3] = w.back[i];
      B[o * 4] = w.flag[i]; B[o * 4 + 1] = w.biome[i]; B[o * 4 + 2] = w.fluid[i];
      D[o] = Math.round((t.matInfo[w.mat[i]]?.density ?? 0) * 255);
    }
    this.tex.tA = this.mkTex(W, H + SKY_ROWS, gl.RGBA8UI, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, A, gl.NEAREST);
    this.tex.tB = this.mkTex(W, H + SKY_ROWS, gl.RGBA8UI, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, B, gl.NEAREST);
    this.tex.dens = this.mkTex(W, H + SKY_ROWS, gl.R8, gl.RED, gl.UNSIGNED_BYTE, D, gl.LINEAR);
    // Typical rock per biome: the commonest plain diggable material (caches and back walls fall back to it).
    const counts = Array.from({ length: 10 }, () => new Map<number, number>());
    for (let i = 0; i < W * H; i++) { const m = w.mat[i], mi = t.matInfo[m]; if (mi && mi.kind === KIND.DIG && !mi.dense && !mi.glow) counts[w.biome[i]].set(m, (counts[w.biome[i]].get(m) ?? 0) + 1); }
    for (let b = 0; b < 10; b++) { let best = 0, bn = -1; counts[b].forEach((c, m) => { if (c > bn) { bn = c; best = m; } }); this.typical[b] = best || this.typical[Math.max(0, b - 1)]; }
    // Ambient per row: the biome's ambient, blended over 10 rows at each boundary; Topsoil fades with depth, the Core climbs into the chamber.
    const amb = new Float32Array((H + SKY_ROWS) * 4);
    const rowBiome = (y: number) => lookIndex(w.biome[Math.min(H - 1, Math.max(0, y)) * W + w.spawnX], w.planet);
    const ambOf = (b: number, y: number): RGB => {
      const L = BIOME_LOOK[b];
      let k = L.amb;
      if (b === 0) k = L.amb + (L.ambDeep - L.amb) * Math.min(1, Math.max(0, y / 59));
      if (b === 6) return mixc(scale(hexLin(L.ambient), L.amb * 0.6), scale(hexLin("#ffd8b0"), 0.12), smooth(738, 768, y));
      return scale(hexLin(L.ambient), k * 0.6);
    };
    for (let y = 0; y < H; y++) {
      let c: RGB = [0, 0, 0], wsum = 0;
      for (let k = -5; k <= 5; k++) { const b = rowBiome(y + k), wk = 1 - Math.abs(k) / 6; const a = ambOf(b, y); c = [c[0] + a[0] * wk, c[1] + a[1] * wk, c[2] + a[2] * wk]; wsum += wk; }
      const o = (y + SKY_ROWS) * 4; amb[o] = c[0] / wsum; amb[o + 1] = c[1] / wsum; amb[o + 2] = c[2] / wsum; amb[o + 3] = 1;
    }
    this.tex.amb = this.mkTex(1, H + SKY_ROWS, this.hdr ? gl.RGBA16F : gl.RGBA8, gl.RGBA, gl.FLOAT, amb, gl.LINEAR);
    // The ambient floor (visual review #1): light every solid tile at least to ~15-25 % display brightness, whatever
    // its palette, so cave shapes read anywhere on screen. Per biome, scaled by the typical rock's darkness; Topsoil brightest.
    const floor = new Float32Array((H + SKY_ROWS) * 4);
    const target = [0.042, 0.036, 0.027, 0.028, 0.034, 0.027, 0.04, 0.028, 0.028];
    const floorOf = (slot: number): RGB => {
      const b = lookIndex(slot, w.planet), m = this.typical[slot];
      const base = lin(hex(t.matHex[m]?.[1] ?? "#606060"));
      const k = Math.min(1.4, Math.max(0.08, target[b] / Math.max(0.01, 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2])));
      const amb = hexLin(BIOME_LOOK[b].ambient), al = Math.max(1e-3, 0.2126 * amb[0] + 0.7152 * amb[1] + 0.0722 * amb[2]);
      return mixc([k, k, k], scale(amb, k / al), 0.15);
    };
    for (let y = 0; y < H; y++) {
      let c: RGB = [0, 0, 0], wsum = 0;
      for (let k = -4; k <= 4; k++) { const f = floorOf(w.biome[Math.min(H - 1, Math.max(0, y + k)) * W + w.spawnX]); const wk = 1 - Math.abs(k) / 5; c = [c[0] + f[0] * wk, c[1] + f[1] * wk, c[2] + f[2] * wk]; wsum += wk; }
      const o = (y + SKY_ROWS) * 4; floor[o] = c[0] / wsum; floor[o + 1] = c[1] / wsum; floor[o + 2] = c[2] / wsum; floor[o + 3] = 1;
    }
    this.tex.floor = this.mkTex(1, H + SKY_ROWS, gl.RGBA16F, gl.RGBA, gl.FLOAT, floor, gl.LINEAR);
    if (!this.hdr) { gl.bindTexture(gl.TEXTURE_2D, this.tex.amb); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1, H + SKY_ROWS, 0, gl.RGBA, gl.FLOAT, amb); }
    this.grids = new Grids(t);
    this.tex.skyG = this.mkTex(W, GRID_ROWS, gl.RGBA16F, gl.RGBA, gl.FLOAT, null, gl.LINEAR);
    this.tex.emitG = this.mkTex(W, GRID_ROWS, gl.RGBA16F, gl.RGBA, gl.FLOAT, null, gl.LINEAR);
  }

  private uploadDirty(dirty: number[]) {
    const gl = this.gl, w = this.world!, t = this.tables!;
    if (!dirty.length) return;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const a = new Uint8Array(4), b = new Uint8Array(4), d = new Uint8Array(1);
    for (const i of dirty) {
      const x = i % W, y = Math.floor(i / W) + SKY_ROWS;
      a[0] = w.mat[i]; a[1] = w.find[i]; a[2] = w.haz[i]; a[3] = w.back[i];
      b[0] = w.flag[i]; b[1] = w.biome[i]; b[2] = w.fluid[i]; b[3] = 0;
      d[0] = Math.round((t.matInfo[w.mat[i]]?.density ?? 0) * 255);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.tA); gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, 1, 1, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, a);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.tB); gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, 1, 1, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, b);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.dens); gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, 1, 1, gl.RED, gl.UNSIGNED_BYTE, d);
    }
  }

  // ---------------------------------------------------------------- the frame

  frame(view: GameView, cam: Camera, fx: { lights: Light[]; particles: Particles; post: PostFx; shake?: { x: number; y: number } }, extras: RenderExtras = {}) {
    const t0 = performance.now();
    const gl = this.gl;
    if (!this.tables) throw new Error("Renderer: no content (setContent first)");
    const r = this.canvas.getBoundingClientRect();
    if ((r.width && Math.abs(r.width - this.cssW) > 0.5) || (r.height && Math.abs(r.height - this.cssH) > 0.5) || Math.min(window.devicePixelRatio || 1, 2) !== this.dpr) this.resize();
    this.size(cam);
    const w = view.world;
    if (w !== this.world) this.setWorld(w);
    const dirty = view.takeDirty();
    this.uploadDirty(dirty);
    const time = view.time;
    const dt = this.lastT < 0 ? 1 / 60 : Math.min(0.1, Math.max(0, time - this.lastT));
    this.lastT = time;
    const pod = view.pod;
    const debug = extras.debug ?? this.debug;

    // Camera split (art.md 1.2).
    const visW = this.devW / this.S, visH = this.devH / this.S;
    // Shake is added to the camera by the integration (fx.shake, tiles); frame() never applies it again.
    const tlx = cam.x * 16 - visW / 2, tly = cam.y * 16 - visH / 2;
    let cix = Math.floor(tlx), ciy = Math.floor(tly);
    let ox = Math.round((tlx - cix) * this.S), oy = Math.round((tly - ciy) * this.S);
    if (ox >= this.S) { ox -= this.S; cix++; } if (oy >= this.S) { oy -= this.S; ciy++; }
    const org = [cix - 1, ciy - 1];
    this.org = org; this.off = [ox, oy];
    const camRow = cam.y;

    // Look at this depth: biome blend by the pod's row (exposure, grade, fog, bloom, haze).
    const look = this.lookAt(w, Math.max(0, pod.y), w.planet);
    const sky = this.skyAt(view.dayPhase, w.planet);
    const surfaceK = 1 - smooth(4, 12, camRow);

    // Light grids.
    if (this.grids!.update(w, camRow, visH / 16, scale(sky.hor, 0.9 * sky.bright), time, view.liftDepth, dirty)) {
      gl.bindTexture(gl.TEXTURE_2D, this.tex.skyG); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, GRID_ROWS, gl.RGBA, gl.FLOAT, this.grids!.sky);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.emitG); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, GRID_ROWS, gl.RGBA, gl.FLOAT, this.grids!.emit);
    }

    // The core's beat.
    const pt = extras.pulse ?? -1;
    const beat = pt >= 0 ? Math.exp(-pt * 2.5) + (pt > 9.5 ? (pt - 9.5) * 2 : 0) : 0.25 + 0.25 * Math.sin(time * 0.6);

    // Sprites: town, entities, the Seed, the pod.
    this.nSprites = 0; this.nExtra = 0;
    this.buildingRects = [];
    if (camRow < 30) this.drawTown(view, org, sky.night, time, extras);
    this.drawEntities(view, org, time, beat);
    this.drawPod(view, org, time, dt, extras);
    if (this.atlas.dirty) this.uploadAtlas();

    // GPU timer.
    const tq = this.timer.ext;
    let q: WebGLQuery | null = null;
    if (tq && this.timer.pending.length < 3) { q = gl.createQuery(); gl.beginQuery(tq.TIME_ELAPSED_EXT, q!); }

    gl.bindVertexArray(this.vao);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    const A = this.artW, Hh = this.artH;
    const bindT = (p: Prog, name: string, unit: number, tex: WebGLTexture) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(p.u[name], unit); };
    const common = (p: Prog) => { gl.useProgram(p.p); if (p.u.org) gl.uniform2i(p.u.org, org[0], org[1]); if (p.u.artH) gl.uniform1i(p.u.artH, Hh); if (p.u.art) gl.uniform2f(p.u.art, A, Hh); if (p.u.time) gl.uniform1f(p.u.time, time); };

    // 1. Sky into the scene (only while a sky row is on screen).
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene!.fb); gl.viewport(0, 0, A, Hh);
    if (org[1] < 2 * 16) {
      const p = this.P.sky; common(p);
      gl.uniform3fv(p.u.zen, sky.zen); gl.uniform3fv(p.u.hor, sky.hor); gl.uniform3fv(p.u.sunC, sky.sunC); gl.uniform3fv(p.u.moonC, hexLin("#e8eef8"));
      gl.uniform3fv(p.u.cloudDay, sky.cloud); gl.uniform3fv(p.u.fogC, look.fog);
      gl.uniform2f(p.u.sunP, sky.sunX * visW + 1, sky.sunY - org[1]); gl.uniform2f(p.u.moonP, sky.moonX * visW + 1, sky.moonY - org[1]);
      gl.uniform1f(p.u.sunK, sky.sunK); gl.uniform1f(p.u.moonK, sky.moonK); gl.uniform1f(p.u.starK, sky.night); gl.uniform1f(p.u.night, sky.night);
      gl.uniform1f(p.u.camX, cam.x); gl.uniform1f(p.u.fogK, smooth(0, 8, camRow) * 0.9); gl.uniform1f(p.u.moonPh, (time / 600 / 8) % 1);
      const sp = (time % 70) / 70; gl.uniform1f(p.u.shoot, sp > 0.97 ? (sp - 0.97) / 0.03 : 0);
      const mb = (c: string, k: number) => mixc(scale(hexLin(c), sky.bright * 0.9 + 0.08), sky.hor, k);
      gl.uniform3fv(p.u.mtn0, mb("#3a4a6a", 0.6)); gl.uniform3fv(p.u.mtn1, mb("#2e3a50", 0.4)); gl.uniform3fv(p.u.mtn2, mb("#222a38", 0.2)); gl.uniform3fv(p.u.ridge, scale(mixc(sky.sunC, sky.hor, 0.5), 1 - sky.night * 0.9));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }

    // 2. Terrain into the G-buffer.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.gb!.fb);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    {
      const p = this.P.terrain; common(p);
      bindT(p, "tA", 0, this.tex.tA); bindT(p, "tB", 1, this.tex.tB); bindT(p, "stampT", 2, this.tex.stamp); bindT(p, "matT", 3, this.tex.mat); bindT(p, "findT", 4, this.tex.find);
      gl.uniform1f(p.u.beat, beat);
      const d = pod.dig;
      gl.uniform3i(p.u.dig, d ? d.x : -999, d ? d.y : -999, d ? (d.dir === "left" ? 0 : d.dir === "right" ? 1 : 2) : 0);
      gl.uniform1f(p.u.digP, d ? d.progress : 0);
      gl.uniform2f(p.u.pod, pod.x, pod.y);
      gl.uniform1i(p.u.drillB, Math.round(Math.log2(2.5 * Math.pow(1.25, view.levels.drill)) * 20 + 60));
      gl.uniform2fv(p.u.rockGrade, ROCK_GRADE);
      { const k = w.structures.find((st) => st.kind === "kiln" && Math.abs(st.y + st.h / 2 - cam.y) < 30); gl.uniform4f(p.u.kiln, k?.x ?? 0, k?.y ?? 0, k?.w ?? 0, k?.h ?? 0); }
      gl.uniform2f(p.u.camC, cam.x * 16, cam.y * 16);
      { const sp = this.seedPos(view) ?? [23.5, 761]; gl.uniform2f(p.u.seedW, sp[0] * 16, sp[1] * 16); }
      gl.uniform1i(p.u.planet, w.planet === "cinder" ? 1 : w.planet === "ferrum" ? 2 : 0);
      gl.uniform1i(p.u.liftX, w.spawnX); gl.uniform1i(p.u.liftDepth, view.liftDepth);
      gl.uniform1iv(p.u.typical, this.typical);
      const sc = extras.scan; gl.uniform4f(p.u.scan, sc ? sc.x : 0, sc ? sc.y : 0, sc ? sc.r : 0, sc ? sc.age : -1);
      const tl = (extras.tells ?? []).slice(0, 8), T1 = new Float32Array(32), T2 = new Float32Array(32);
      tl.forEach((v, i) => { T1.set([v.x, v.y, v.k, TELL_KIND[v.kind]], i * 4); T2.set([v.x2 ?? v.x, v.y2 ?? v.y, 0, 0], i * 4); });
      gl.uniform4fv(p.u.tells, T1); gl.uniform4fv(p.u.tells2, T2); gl.uniform1i(p.u.nTells, tl.length);
      gl.uniform1iv(p.u.segEnd, new Int32Array(LIFT_SEGMENTS));
      gl.uniform3fv(p.u.segCol, new Float32Array(LIFT_LIGHT.flatMap((c) => hex(c))));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // 3-4. Sprites into the G-buffer.
    if (this.nSprites) {
      const p = this.P.sprite; common(p);
      bindT(p, "albT", 0, this.tex.atA); bindT(p, "emiT", 1, this.tex.atE); bindT(p, "nrmT", 2, this.tex.atN); bindT(p, "matT", 3, this.tex.mat); bindT(p, "findT", 4, this.tex.find);
      gl.uniform1f(p.u.night, sky.night);
      gl.bindVertexArray(this.spriteVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.spriteData, 0, this.nSprites * SPRITE_F);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.nSprites);
      gl.bindVertexArray(this.vao);
    }
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    // 5. Light: base (ambient, skylight, emitters, sun, pulse) then dynamic lights, additive.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.light!.fb);
    {
      const p = this.P.lbase; common(p);
      bindT(p, "g0T", 0, this.gb!.tex); bindT(p, "g2T", 1, this.gb!.t2); bindT(p, "skyG", 2, this.tex.skyG); bindT(p, "emitG", 3, this.tex.emitG); bindT(p, "ambT", 4, this.tex.amb); bindT(p, "floorT", 5, this.tex.floor);
      gl.uniform3fv(p.u.dayAmb, sky.dayAmb); gl.uniform1f(p.u.nightK, sky.night); gl.uniform2f(p.u.podT, pod.x, pod.y);
      gl.uniform4f(p.u.grid, 0, this.grids!.top, W, GRID_ROWS);
      gl.uniform3fv(p.u.sunCol, sky.sunLight); gl.uniform3fv(p.u.sunDir, sky.sunDir); gl.uniform1f(p.u.sunK, surfaceK > 0 ? 1 : 0);
      const inCore = pod.y > 660;
      const prow = pt >= 0 ? 761 - 40 * pt : -999;
      const pre = pt > 9.5 ? (pt - 9.5) * 2 : 0;
      gl.uniform3f(p.u.pulse, prow, inCore && pt >= 0 && prow > 640 ? 1 : 0, inCore ? (pre * 0.25 + Math.exp(-Math.max(0, pt) * 3) * 0.15) * smooth(700, 750, pod.y) : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    const nl = this.collectLights(view, fx.lights, cam, time, dt, beat, sky.night);
    if (nl) {
      const p = this.P.light; common(p);
      bindT(p, "g2T", 0, this.gb!.t2); bindT(p, "densT", 1, this.tex.dens);
      gl.uniform1f(p.u.mu, 0.05); gl.uniform1f(p.u.r0, 2.0); gl.uniform1i(p.u.maxSteps, 12);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(this.lightVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lightBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.lightData, 0, nl * LIGHT_F);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, nl);
      gl.bindVertexArray(this.vao);
      gl.disable(gl.BLEND);
    }

    // 6. Resolve over the sky.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene!.fb);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    {
      const p = this.P.resolve; gl.useProgram(p.p);
      bindT(p, "g0T", 0, this.gb!.tex); bindT(p, "g1T", 1, this.gb!.t1); bindT(p, "g2T", 2, this.gb!.t2); bindT(p, "lightT", 3, this.light!.tex); bindT(p, "floorT", 4, this.tex.floor);
      gl.uniform2i(p.u.org, org[0], org[1]); gl.uniform1i(p.u.artH, Hh);
      gl.uniform1fv(p.u.floorK, FLOOR_K); gl.uniform3fv(p.u.airK, scale(mixc(look.fog, [1, 1, 1], 0.6), 0.007)); gl.uniform1f(p.u.backK, 0.12);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // 7. Particles (shared buffer, then the renderer's own: clouds, speed lines).
    {
      const p = this.P.part; common(p);
      bindT(p, "g0T", 0, this.gb!.tex); bindT(p, "lightT", 1, this.light!.tex);
      gl.bindVertexArray(this.partVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
      const ps = fx.particles;
      if (ps.n) { gl.bufferSubData(gl.ARRAY_BUFFER, 0, ps.data, 0, ps.n * STRIDE); gl.drawArrays(gl.POINTS, 0, ps.n); }
      if (this.nExtra) { gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.extraParts, 0, this.nExtra * STRIDE); gl.drawArrays(gl.POINTS, 0, this.nExtra); }
      gl.bindVertexArray(this.vao);
    }
    gl.disable(gl.BLEND);

    // 8. Bloom.
    const pass = (p: Prog, src: WebGLTexture, sw: number, shh: number, dst: Tgt, vals?: Record<string, number>) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, dst.w, dst.h); gl.useProgram(p.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform1i(p.u.src, 0);
      if (p.u.texel) gl.uniform2f(p.u.texel, 1 / sw, 1 / shh);
      if (vals) for (const k in vals) gl.uniform1f(p.u[k], vals[k]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    pass(this.P.pre, this.scene!.tex, A, Hh, this.mips[0], { threshold: 1.0 });
    for (let i = 1; i < this.mips.length; i++) pass(this.P.down, this.mips[i - 1].tex, this.mips[i - 1].w, this.mips[i - 1].h, this.mips[i]);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = this.mips.length - 1; i > 0; i--) pass(this.P.up, this.mips[i].tex, this.mips[i].w, this.mips[i].h, this.mips[i - 1], { gain: 0.7 });
    gl.disable(gl.BLEND);

    // 9. Final, at device resolution.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.devW, this.devH);
    {
      const p = this.P.fin; gl.useProgram(p.p);
      bindT(p, "scene", 0, this.scene!.tex); bindT(p, "bloom", 1, this.mips[0].tex); bindT(p, "g0T", 2, this.gb!.tex); bindT(p, "g1T", 5, this.gb!.t1); bindT(p, "g2T", 6, this.gb!.t2); bindT(p, "adaptT", 3, this.adapt!.tex); bindT(p, "raysT", 4, this.mips[Math.min(2, this.mips.length - 1)].tex);
      gl.uniform2f(p.u.dev, this.devW, this.devH); gl.uniform2f(p.u.art, A, Hh); gl.uniform1f(p.u.S, this.S); gl.uniform2f(p.u.off, ox, oy);
      const post = fx.post;
      const podA = [pod.x * 16 - org[0], pod.y * 16 - org[1]];
      gl.uniform2f(p.u.podA, podA[0], podA[1]);
      gl.uniform1f(p.u.exposure, look.ev * (surfaceK > 0 ? 1 + 0.25 * sky.night * surfaceK : 1));
      gl.uniform1f(p.u.bloomK, look.bloom + (surfaceK * sky.night * 0.15));
      gl.uniform1f(p.u.haze, Math.min(1, look.haze + post.haze));
      gl.uniform1f(p.u.aberr, post.aberration);
      gl.uniform1f(p.u.flash, post.flash); gl.uniform3fv(p.u.flashC, post.flashColor);
      gl.uniform1f(p.u.wash, post.wash); gl.uniform1f(p.u.dim, post.dim); gl.uniform1f(p.u.vpulse, post.vignettePulse);
      gl.uniform1f(p.u.time, time); gl.uniform1f(p.u.adaptK, 0); gl.uniform1f(p.u.keyL, 0.1);
      gl.uniform3fv(p.u.fogC, look.fog); gl.uniform3fv(p.u.liftC, look.lift); gl.uniform3fv(p.u.gainC, look.gain); gl.uniform3fv(p.u.shadowC, look.shadow); gl.uniform3fv(p.u.highC, look.high);
      const seed = this.seedPos(view);
      const sa = seed ? [seed[0] * 16 - org[0], seed[1] * 16 - org[1]] : [0, 0];
      gl.uniform2f(p.u.seedA, sa[0], sa[1]);
      gl.uniform1f(p.u.raysK, seed && sa[1] > -100 && sa[1] < Hh + 100 ? 0.35 : 0);
      gl.uniform4f(p.u.capK, 0.075, 0.42, 0.2, 0.25);
      gl.uniform1i(p.u.debug, debug);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindVertexArray(null);
    if (q) { gl.endQuery(tq.TIME_ELAPSED_EXT); this.timer.pending.push(q); }
    if (tq) {
      const head = this.timer.pending[0];
      if (head && gl.getQueryParameter(head, gl.QUERY_RESULT_AVAILABLE)) {
        if (!gl.getParameter(tq.GPU_DISJOINT_EXT)) this.stats.gpu = this.stats.gpu * 0.9 + (gl.getQueryParameter(head, gl.QUERY_RESULT) / 1e6) * 0.1;
        gl.deleteQuery(head); this.timer.pending.shift();
      }
    }
    this.stats.cpu = this.stats.cpu * 0.9 + (performance.now() - t0) * 0.1;
  }

  private uploadAtlas() {
    const gl = this.gl, a = this.atlas;
    if (!this.tex.atA) {
      this.tex.atA = this.mkTex(a.size, a.size, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, a.alb, gl.NEAREST);
      this.tex.atE = this.mkTex(a.size, a.size, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, a.emi, gl.NEAREST);
      this.tex.atN = this.mkTex(a.size, a.size, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, a.nrm, gl.NEAREST);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.tex.atA); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, a.size, a.size, gl.RGBA, gl.UNSIGNED_BYTE, a.alb);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.atE); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, a.size, a.size, gl.RGBA, gl.UNSIGNED_BYTE, a.emi);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.atN); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, a.size, a.size, gl.RGBA, gl.UNSIGNED_BYTE, a.nrm);
    }
    a.dirty = false;
  }

  // ---------------------------------------------------------------- sprites

  /** Queue a sprite. (x, y) is the anchor in world art px. */
  private put(s: Spr, x: number, y: number, o: { flip?: boolean; layer?: number; emis?: number; pal?: number; palId?: number; tint?: RGB; tintK?: number; flags?: number; sw?: number; shh?: number; seed?: number } = {}) {
    if (this.nSprites >= MAX_SPRITES) return;
    const org = this.org;
    const sw = o.sw ?? s.r.w, shh = o.shh ?? s.r.h;
    const ax = o.flip ? s.r.w - s.ox : s.ox;
    const dx = Math.round(x - ax * sw / s.r.w) - org[0], dy = Math.round(y - s.oy * shh / s.r.h) - org[1];
    if (dx > this.artW + 2 || dy > this.artH + 2 || dx + sw < -2 || dy + shh < -2) return;
    const d = this.spriteData, i = this.nSprites++ * SPRITE_F;
    d[i] = dx; d[i + 1] = dy; d[i + 2] = sw; d[i + 3] = shh;
    d[i + 4] = s.r.x; d[i + 5] = s.r.y; d[i + 6] = s.r.w; d[i + 7] = s.r.h;
    d[i + 8] = o.flip ? 1 : 0; d[i + 9] = o.layer ?? 2; d[i + 10] = o.emis ?? 1; d[i + 11] = o.pal ?? 0;
    const tc = o.tint ?? [1, 1, 1];
    d[i + 12] = tc[0]; d[i + 13] = tc[1]; d[i + 14] = tc[2]; d[i + 15] = o.tintK ?? 0;
    d[i + 16] = o.palId ?? 0; d[i + 17] = o.flags ?? 0; d[i + 18] = o.seed ?? 0; d[i + 19] = 0;
  }

  private drawTown(view: GameView, org: number[], night: number, time: number, extras: RenderExtras) {
    const T = this.town;
    for (const b of T.items) {
      const fps = b.id === "headframe" ? (view.entities.some((e) => e.kind === "lift" && Math.abs(e.vy ?? 0) > 0.1) || extras.pod?.riding ? 10 : 1.2) : (b.fps ?? 4);
      const fr = b.frames ? b.frames[Math.floor(time * fps) % b.frames.length] : b.s;
      const x = b.x, y = b.y;
      const door = extras.door && b.id === extras.door ? 1 : 0;
      const emis = b.id === "pad" ? (extras.pad ?? 0) : b.id === "floods" ? night : door;
      this.put(fr, x, y, { layer: b.layer ?? 2, emis, seed: b.seed ?? 0 });
      if (b.hit) this.buildingRects.push({ id: b.id, x: x - fr.ox, y: y - fr.oy, w: fr.r.w, h: fr.r.h });
    }
    void view; void org;
  }

  private seedPos(view: GameView): [number, number] | null {
    const e = view.entities.find((e) => e.kind === "seed");
    if (e) return [e.x, e.y];
    const ch = view.world.structures.find((s) => /chamber/.test(s.kind));
    return ch ? [23.5 + 0.5, 761] : null;
  }

  private drawEntities(view: GameView, _org: number[], time: number, beat: number) {
    const O = this.obj;
    const seed = this.seedPos(view);
    if (seed && Math.abs(seed[1] - view.pod.y) < 30) {
      this.put(O.seed[Math.min(3, Math.floor(beat * 3.99))], seed[0] * 16, seed[1] * 16, { layer: 7, emis: 0.8 + 0.2 * beat });
      // Motes drifting in toward the Seed.
      for (let k = 0; k < 36; k++) {
        const ph = (time * 0.05 + k * 0.137) % 1, a = k * 2.399;
        const r = 12 * (1 - ph) + 3.6;
        this.extra(seed[0] + Math.cos(a + ph * 1.5) * r, seed[1] + Math.sin(a + ph * 1.5) * r * 0.6, [1, 0.85, 0.55], 0.6 * Math.sin(ph * Math.PI), 0.7, 1, 1);
      }
      if (!view.entities.some((e) => e.kind === "seed")) { this.put(O.cradle, seed[0] * 16, seed[1] * 16 + 58, { layer: 2 }); this.put(O.podFrame, (seed[0] + 9) * 16, 768 * 16, { layer: 7 }); }
    }
    for (const e of view.entities) {
      const x = e.x * 16, y = e.y * 16;
      switch (e.kind) {
        case "boulder": {
          const wob = e.t && e.t > 0 ? (Math.floor(time * 20) % 2 ? 1 : -1) : 0;
          this.put(O.boulder[e.id & 1], x + wob, y, { layer: 5, pal: 1, palId: e.mat ?? this.typical[1] });
          break;
        }
        case "nugget": this.put(O.nugget[0], x, y + Math.round(Math.sin(time * 4 + e.id) * 0.6), { layer: 7, pal: 2, palId: e.find ?? 1 }); break;
        case "crate": this.put(O.crate, x, y + 8, { layer: 7 }); this.put(O.beacon, x, y - 5, { layer: 7, emis: Math.floor(time) % 2 ? 1 : 0.15 }); break;
        case "charge": this.put((e.r ?? 1) > 1.5 ? O.bigCharge : O.dynamite, x, y + 8, { layer: 7, emis: Math.floor(time * 12) % 2 ? 1 : 0.4 }); break;
        case "drone": this.put(O.drone, x, y + Math.round(Math.sin(time * 3) * 1), { layer: 7, flip: (e.vx ?? 0) < 0 }); break;
        case "lift": {
          this.put(O.cage, x, y, { layer: 7 });
          const top = 0 * 16 - 64, len = Math.max(0, y - 9 - top);
          this.put(O.cable, x, top, { layer: 1, sw: 1, shh: len });
          break;
        }
        case "cloud": this.cloud(e.x, e.y, e.r ?? 2, e.mat === 1 ? [0.78, 0.88, 0.29] : [0.72, 0.94, 0.63], time); break;
        default: break;
      }
    }
  }

  private cloud(x: number, y: number, r: number, c: RGB, time: number) {
    for (let k = 0; k < 5; k++) {
      if (this.nExtra >= 256) return;
      const o = this.nExtra++ * STRIDE, d = this.extraParts;
      d.fill(0, o, o + STRIDE);
      const a = k * 1.3 + time * 0.3;
      d[o] = x + Math.cos(a) * r * 0.35; d[o + 1] = y + Math.sin(a) * r * 0.25;
      d[o + 4] = 1; d[o + 5] = 1; d[o + 6] = r * 16 * (k ? 1.1 : 1.6);
      d[o + 7] = c[0]; d[o + 8] = c[1]; d[o + 9] = c[2]; d[o + 10] = 0.22; d[o + 11] = 0.35; d[o + 12] = 4;
    }
  }

  private drawPod(view: GameView, org: number[], time: number, dt: number, extras: RenderExtras) {
    const pod = view.pod;
    if (pod.dead) return;
    const key = JSON.stringify([view.levels, view.modules]);
    if (!this.pod || this.pod.key !== key) this.pod = buildPod(this.atlas, view.levels as Record<Stat, number>, view.modules);
    const P = this.pod, ex = extras.pod ?? {};
    const f = pod.facing < 0;
    let x = pod.x * 16, y = pod.y * 16;
    // Treads roll 1 step per 4 art px moved; drilling vibrates the sprite (never the camera); 1 px bob on the surface.
    this.treadX += Math.abs(pod.vx) * 16 * dt;
    if (this.treadX >= 4) { this.treadX %= 4; this.treadF ^= 1; }
    const dig = pod.dig;
    if (dig) { const hz = 18; const v = Math.floor(time * hz * 2) % 2 ? 1 : -1; if (dig.dir === "down") x += v; else y += v; }
    else if (pod.grounded && pod.y < 1 && Math.abs(pod.vx) < 0.1) y += Math.floor(time / 0.8) % 2;
    const sq = ex.squash ?? 0;
    const shh = Math.round(14 - 2 * sq) + 5, flash = ex.flash ?? 0, hurt = ex.hurt ?? 0;
    const tint: RGB = flash > 0 ? [1, 1, 1] : [1, 0.29, 0.29];
    const tintK = flash > 0 ? 1 : hurt * 0.5;
    const flags = 0;
    const body = P.body[this.treadF];
    const bh = body.r.h;
    this.put(body, x, y + (bh - Math.round(bh - 2 * sq) ? 2 * sq : 0), { flip: f, layer: 6, tint, tintK, flags, shh: Math.round(bh - 2 * sq) });
    void shh;
    // Drill: side bit (3 frames at 30 Hz), or the down cone with the side bit folded.
    const df = dig ? Math.floor(time * 30) % 3 : 0;
    const emisTip = dig ? 1 : 0.15;
    if (dig && dig.dir === "down") {
      this.put(P.drillDown[df], x, y + 7, { layer: 6, emis: emisTip, tint, tintK });
      this.put(P.drillFold, x + (f ? -5 : 4), y - 1, { flip: f, layer: 6, tint, tintK });
    } else {
      this.put(P.drillSide[df], x + (f ? -4 : 4), y + 0, { flip: f, layer: 6, emis: emisTip, tint, tintK });
    }
    // Thrust flame from both vents, 3-6 px by thrust, 3 frames at 20 Hz.
    if (pod.thrusting && !ex.riding) {
      const hgt = Math.max(0, Math.min(3, Math.round(1 + Math.min(1, Math.abs(pod.vy) / 6) * 2 + (Math.floor(time * 20) % 2))));
      const fr = Math.floor(time * 20) % 3;
      for (const vx of P.vents) { const lx = f ? 15 - vx : vx; this.put(P.flame[fr][hgt], x - 8 + lx + 0.5, y + 7, { layer: 6 }); }
    }
    // Heat: fins blend to orange, the hull tints toward #ff5a1a over 80 %.
    if (pod.heat > 0.3) this.put(P.heat, x, y, { flip: f, layer: 6, emis: Math.min(1, (pod.heat - 0.3) / 0.6) });
    // Fast drop: two speed lines above the pod.
    if (ex.drop) for (const lx of [-4, 4]) for (let k = 0; k < 8; k++) this.extra(pod.x + lx / 16, pod.y - (10 + k) / 16, [0.91, 0.93, 0.96], 0.3 * (1 - k / 8), 0, 1);
    void org;
  }

  private extra(x: number, y: number, c: RGB, a: number, hdr: number, size: number, flags = 0) {
    if (this.nExtra >= 256) return;
    const o = this.nExtra++ * STRIDE, d = this.extraParts;
    d.fill(0, o, o + STRIDE);
    d[o] = x; d[o + 1] = y; d[o + 4] = 1; d[o + 5] = 1; d[o + 6] = size; d[o + 7] = c[0]; d[o + 8] = c[1]; d[o + 9] = c[2]; d[o + 10] = a; d[o + 11] = hdr; d[o + 12] = flags;
  }

  // ---------------------------------------------------------------- lights

  private collectLights(view: GameView, fxl: Light[], cam: Camera, time: number, dt: number, beat: number, night: number): number {
    const pod = view.pod, L = view.levels.lamp;
    const d = this.lightData;
    let n = 0;
    const push = (x: number, y: number, r: number, I: number, c: RGB, half: number, dir: number, or: number, oi: number) => {
      if (n >= MAX_LIGHTS) return;
      const o = n++ * LIGHT_F;
      d[o] = x; d[o + 1] = y; d[o + 2] = r; d[o + 3] = I; d[o + 4] = c[0]; d[o + 5] = c[1]; d[o + 6] = c[2]; d[o + 7] = half; d[o + 8] = dir; d[o + 9] = or; d[o + 10] = oi; d[o + 11] = 0;
    };
    // Slot 0: the pod lamp, cone + omni (art.md 5.5).
    if (!pod.dead) {
      const down = (pod.dig && pod.dig.dir === "down") || pod.vy > 6;
      const target = down ? Math.PI / 2 : pod.facing > 0 ? 15 * Math.PI / 180 : Math.PI - 15 * Math.PI / 180;
      let dd = target - this.lampDir; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
      this.lampDir += dd * Math.min(1, dt / 0.04);
      const fuelK = pod.fuelMax > 0 ? pod.fuel / pod.fuelMax : 1;
      let I = 1.3;
      if (fuelK < 0.15 && fuelK > 0) I *= (Math.floor(time * 4) % 2 === 0 && Math.sin(time * 13) > 0.3) ? 0.9 : 1;
      let R = Math.min(10, 3.5 + 0.5 * L);
      if (fuelK <= 0) R *= 0.5;
      const half = (40 + 1.5 * L) * Math.PI / 180;
      const lc = hexLin(lampTint(L));
      const lx = pod.x + pod.facing * 0.3, ly = pod.y - 0.15;
      push(lx, ly, R, I, lc, half, this.lampDir, Math.min(3.3, 2 + 0.1 * L), 0.6);
      // The thrust flame lights the rock under it.
      if (pod.thrusting) { const fc = hexLin(FLAME_COLORS[flameTier(view.levels.engine)].m); push(pod.x, pod.y + 0.7, 0, 0, fc, 0, 0, 1.6, 0.8 + 0.2 * Math.sin(time * 40)); }
    }
    // The Seed lights its chamber (and its own launch).
    const seed = this.seedPos(view);
    if (seed && Math.abs(seed[1] - cam.y) < 30) push(seed[0], seed[1], 0, 0, hexLin("#ffd8a0"), 0, 0, 20, 2.0 * (0.8 + 0.2 * beat));
    // Launch-site floodlights at night, and the market and fuel canopies.
    if (night > 0.2 && cam.y < 14) {
      const fl = hexLin("#fff4e0");
      push(1.9, -5.2, 7, 1.4 * night, fl, 0.55, Math.PI / 2 + 0.25, 0, 0);
      push(3.3, -5.2, 7, 1.4 * night, fl, 0.55, Math.PI / 2 - 0.1, 0, 0);
      push(21.5, -1.4, 0, 0, hexLin("#fff0d8"), 0, 0, 3.5, 0.8 * night);
      for (const [dx] of Object.values(this.town.doors)) push(dx / 16, -0.6, 0, 0, hexLin("#ffc670"), 0, 0, 2.6, 0.75 * night);
    }
    // The Kiln's hearth lights its hall.
    const kiln = view.world.structures.find((st) => st.kind === "kiln" && Math.abs(st.y + st.h / 2 - cam.y) < 30);
    if (kiln) push(kiln.x + kiln.w / 2, kiln.y + kiln.h - 0.8, 0, 0, hexLin("#ff8a3a"), 0, 0, Math.max(5, kiln.w * 0.6), 1.8 * (0.9 + 0.1 * Math.sin(time * 7)));
    // The drone's lamp.
    for (const e of view.entities) if (e.kind === "drone") push(e.x, e.y, 0, 0, hexLin("#e8fbff"), 0, 0, 2, 0.5);
    // FX lights: forced first, then by I * R^2 / (1 + dist / 8).
    const rank = fxl.map((l) => ({ l, s: l.force ? 1e9 : l.i * l.r * l.r / (1 + Math.hypot(l.x - cam.x, l.y - cam.y) / 8) })).sort((a, b) => b.s - a.s);
    for (const { l } of rank) {
      if (n >= MAX_LIGHTS) break;
      if (l.half !== undefined && l.dir !== undefined) push(l.x, l.y, l.r, l.i, l.color, l.half, l.dir, 0, 0);
      else push(l.x, l.y, 0, 0, l.color, 0, 0, l.r, l.i);
    }
    return n;
  }

  // ---------------------------------------------------------------- the band check (art.md 6.1, 6.4)

  /** Luminance (Rec.709 weights on the final, display-encoded frame) per layer: p10/p50/p90 near the pod in its light,
   *  far rock outside all light, and the p90 < p10 pairs back wall < undiggable < diggable < ores/hazards. */
  bands(view: GameView) {
    const gl = this.gl, A = this.artW, Hh = this.artH, S = this.S;
    const fin = new Uint8Array(this.devW * this.devH * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, this.devW, this.devH, gl.RGBA, gl.UNSIGNED_BYTE, fin);
    const g0 = new Uint8Array(A * Hh * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.gb!.fb); gl.readBuffer(gl.COLOR_ATTACHMENT0); gl.readPixels(0, 0, A, Hh, gl.RGBA, gl.UNSIGNED_BYTE, g0);
    const g2 = new Uint8Array(A * Hh * 4);
    gl.readBuffer(gl.COLOR_ATTACHMENT2); gl.readPixels(0, 0, A, Hh, gl.RGBA, gl.UNSIGNED_BYTE, g2); gl.readBuffer(gl.COLOR_ATTACHMENT0);
    const lt = new Float32Array(A * Hh * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.light!.fb); gl.readPixels(0, 0, A, Hh, gl.RGBA, gl.FLOAT, lt);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const near: number[][] = Array.from({ length: 8 }, () => []), far: number[] = [];
    const sq: number[][] = Array.from({ length: 8 }, () => []);
    const Lart = new Float32Array(A * Hh);
    const pod = view.pod, [ox, oy] = this.off, org = this.org;
    for (let ay = 1; ay < Hh - 1; ay++) for (let ax = 1; ax < A - 1; ax++) {
      const dx = Math.floor((ax - 1 + 0.5) * S - ox), dy = Math.floor((ay - 1 + 0.5) * S - oy);
      if (dx < 0 || dy < 0 || dx >= this.devW || dy >= this.devH) continue;
      const fi = ((this.devH - 1 - dy) * this.devW + dx) * 4;
      const L = (0.2126 * fin[fi] + 0.7152 * fin[fi + 1] + 0.0722 * fin[fi + 2]) / 255;
      Lart[ay * A + ax] = L;
      const gi = ((Hh - 1 - ay) * A + ax) * 4;
      const layer = Math.round(g0[gi + 3] / 255 * 8);
      if (g2[gi + 2] & 8) continue; // never-lit outlines are measured as outlines, not as their layer
      const light = 0.2126 * lt[gi] + 0.7152 * lt[gi + 1] + 0.0722 * lt[gi + 2];
      const d = Math.hypot((ax + org[0]) / 16 - pod.x, (ay + org[1]) / 16 - pod.y);
      if (d <= 4 && light > 0.5) near[layer].push(L);
      else if ((layer === 2 || layer === 3) && light < 0.02) far.push(L);
    }
    // Squint: the same pixels after a 3x3 box blur of the final frame (art.md 6.4.1).
    for (let ay = 2; ay < Hh - 2; ay++) for (let ax = 2; ax < A - 2; ax++) {
      const gi = ((Hh - 1 - ay) * A + ax) * 4;
      if (g2[gi + 2] & 8) continue;
      const layer = Math.round(g0[gi + 3] / 255 * 8);
      const light = 0.2126 * lt[gi] + 0.7152 * lt[gi + 1] + 0.0722 * lt[gi + 2];
      if (light <= 0.5 || Math.hypot((ax + org[0]) / 16 - pod.x, (ay + org[1]) / 16 - pod.y) > 4) continue;
      let sum = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) sum += Lart[(ay + j) * A + ax + i];
      sq[layer].push(sum / 9);
    }
    const pct = (a: number[], p: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
    const st = (a: number[]) => ({ n: a.length, p10: +pct(a, 0.1).toFixed(3), p50: +pct(a, 0.5).toFixed(3), p90: +pct(a, 0.9).toFixed(3) });
    // Ores and hazards are measured on their light and glint px: the upper half of their pixels.
    const ores = [...near[4], ...near[5]].sort((x, y) => x - y); const oreLit = ores.slice(Math.floor(ores.length / 2));
    const layers = { back: st(near[1]), undiggable: st(near[3]), diggable: st(near[2]), ores: st(oreLit), pod: st(near[6]), far: st(far) };
    const pair = (lo: { p90: number }, hi: { p10: number }) => ({ ok: !(lo.p90 >= hi.p10), ratio: +((hi.p10 + 0.05) / (lo.p90 + 0.05)).toFixed(2) });
    const sqs = { back: st(sq[1]), undiggable: st(sq[3]), diggable: st(sq[2]), ores: st([...sq[4], ...sq[5]].sort((x, y) => x - y).slice(Math.floor((sq[4].length + sq[5].length) / 2))) };
    const squint = { "back<undig": pair(sqs.back, sqs.undiggable), "undig<dig": pair(sqs.undiggable, sqs.diggable), "dig<ore": pair(sqs.diggable, sqs.ores) };
    return { layers, squint, pairs: { "back<undig": pair(layers.back, layers.undiggable), "undig<dig": pair(layers.undiggable, layers.diggable), "dig<ore": pair(layers.diggable, layers.ores) } };
  }

  // ---------------------------------------------------------------- looks

  private lookAt(w: WorldData, row: number, planet: string) {
    const b0 = w.biome[Math.min(H - 1, Math.floor(row)) * W + w.spawnX];
    let acc = { ev: 0, bloom: 0, haze: 0 } as Record<string, number>, fog: RGB = [0, 0, 0], lift: RGB = [0, 0, 0], gain: RGB = [0, 0, 0], shadow: RGB = [0, 0, 0], high: RGB = [0, 0, 0];
    let ws = 0;
    for (let k = -5; k <= 5; k++) {
      const b = lookIndex(w.biome[Math.min(H - 1, Math.max(0, Math.floor(row) + k)) * W + w.spawnX] ?? b0, planet);
      const L = BIOME_LOOK[b], wk = 1 - Math.abs(k) / 6, pl = PLANETS[planet]?.grade;
      acc.ev += L.ev * wk; acc.bloom += L.bloom * wk; acc.haze += L.haze * wk;
      const add = (a: RGB, h: string) => { const c = hex(h); a[0] += c[0] * wk; a[1] += c[1] * wk; a[2] += c[2] * wk; };
      add(fog, L.fog); add(lift, L.lift); add(gain, pl?.gain ?? L.gain); add(shadow, pl?.shadow ?? L.shadow); add(high, pl?.high ?? L.high);
      ws += wk;
    }
    const nz = (a: RGB): RGB => [a[0] / ws, a[1] / ws, a[2] / ws];
    let ev = acc.ev / ws;
    if (row > 740) ev = 0.8 + (0.55 - 0.8) * smooth(740, 760, row);
    return { ev, bloom: acc.bloom / ws, haze: acc.haze / ws, fog: lin(nz(fog)), lift: nz(lift), gain: nz(gain), shadow: nz(shadow), high: nz(high) };
  }

  private skyAt(phase: number, planet: string) {
    const p = ((phase % 1) + 1) % 1;
    let i = 0; while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1].p <= p) i++;
    const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], t = (p - a.p) / Math.max(1e-6, b.p - a.p);
    let zen = mixc(hexLin(a.zenith), hexLin(b.zenith), t), hor = mixc(hexLin(a.horizon), hexLin(b.horizon), t);
    const pl = PLANETS[planet];
    if (pl && planet !== "vell") {
      const v = PLANETS.vell;
      const rz = hexLin(pl.noonZ).map((c, k) => c / Math.max(1e-3, hexLin(v.noonZ)[k])) as RGB;
      const rh = hexLin(pl.noonH).map((c, k) => c / Math.max(1e-3, hexLin(v.noonH)[k])) as RGB;
      zen = zen.map((c, k) => c * rz[k]) as RGB; hor = hor.map((c, k) => c * rh[k]) as RGB;
    }
    // Sun from 0.22 to 0.78 across the sky, the moon the other half.
    const sa = (p - 0.22) / 0.56, ma = (((p + 0.5) % 1) - 0.22) / 0.56;
    const sunUp = sa > 0 && sa < 1, moonUp = ma > 0 && ma < 1;
    const salt = sunUp ? Math.sin(sa * Math.PI) : 0, malt = moonUp ? Math.sin(ma * Math.PI) : 0;
    const warm = 1 - smooth(0.0, 0.45, salt);
    const sunC = mixc(mixc(hexLin("#fff4d6"), hexLin("#ffcf6a"), warm), hexLin("#ff8a3a"), Math.pow(1 - smooth(0, 0.3, salt), 2));
    const night = p < 0.2 ? 1 : p < 0.27 ? 1 - smooth(0.2, 0.27, p) : p < 0.76 ? 0 : p < 0.82 ? smooth(0.76, 0.82, p) : 1;
    const bright = Math.max(0.12, lumOf(hor) * 1.6 + lumOf(zen) * 0.5);
    const sunLight = scale(mixc(sunC, hexLin("#ff9a5a"), warm * 0.6), 1.1 * smooth(0, 0.15, salt) + 0.0) as RGB;
    const ang = sa * Math.PI;
    const sd = [-Math.cos(ang), -Math.max(0.2, Math.sin(ang)), 0.75]; const sl = Math.hypot(...sd);
    // At night the moon lights the town faintly.
    const moonLight = scale(hexLin("#9ab0e0"), 0.12 * smooth(0, 0.3, malt));
    const dayAmb = mixc(scale(mixc(hor, sunC, 0.3), 0.55 * Math.min(1, bright * 1.5)), scale(hexLin("#8aa0d8"), 0.06), night);
    return {
      dayAmb,
      zen, hor, sunC, night, bright,
      sunK: sunUp ? 1 : 0, moonK: moonUp ? 1 : 0,
      sunX: 0.06 + 0.88 * sa, sunY: -(16 + 170 * salt), moonX: 0.06 + 0.88 * ma, moonY: -(20 + 150 * malt),
      sunLight: sunUp ? sunLight : moonLight, sunDir: (sunUp ? sd.map((v) => v / sl) : [0.3, -0.8, 0.6]) as RGB,
      cloud: mixc(hexLin("#ffffff"), sunC, 0.3),
    };
  }
}

/** world.biome holds the slot; a planet's own biome replaces one slot (art.md 4.1). */
const lookIndex = (slot: number, planet: string) => (planet === "cinder" && slot === 3 ? 7 : planet === "ferrum" && slot === 2 ? 8 : slot);
const lumOf = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
void MF;
