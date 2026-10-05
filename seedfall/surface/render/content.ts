// Content -> GPU tables. Materials and finds (src/game/content/world.ts) carry palettes, patterns and glows;
// this turns them into two small RGBA8 lookup textures plus the CPU facts the light grids need.
import type { Find, Material } from "../../game/types.ts";
import { CACHE_COLORS, JACKPOT_EXTRA, buildStamps, cacheStampKey, type StampAtlas } from "./stamps.ts";
import { DETAIL, FIND_FX, ORE_CLASS, RECIPES, SHAPE_CLASS, UNDIGGABLE_PAL, hex, lin, type OreClass, type RGB, type Recipe } from "./look.ts";
import { CLASSES } from "./look.ts";

export interface RenderContent { materials: readonly Material[]; finds: readonly Find[] }

export const MAT_ROWS = 10, FIND_ROWS = 8, TABLE_W = 256;
/** Virtual find ids for cache stamps (caches are materials; their stamp and colours live here). */
const CACHE_FIND0 = 224;

export const KIND = { AIR: 0, DIG: 1, UNDIG: 2, LIQUID: 3 } as const;
export const MF = { DENSE: 1, TRANSLUCENT: 2, LOOSE: 4, CACHE: 8, GLOW: 16 } as const;

/** What the CPU side (light grids, density) knows per material id. */
export interface MatInfo { kind: number; density: number; glow?: { c: RGB; i: number; r: number }; biome: number; hard: number; dense: boolean }
export interface FindInfo { glow?: { c: RGB; i: number; r: number }; kind: number }

export interface Tables {
  mat: Uint8Array; find: Uint8Array; stamps: StampAtlas;
  matInfo: MatInfo[]; findInfo: FindInfo[];
  /** Palettes by material id (hex), for the renderer's CPU-side looks. */
  matHex: string[][];
}

const key = (s: string) => s.toLowerCase().replace(/[\s-]+/g, "_");

function recipeFor(m: Material): Recipe {
  const k = key(m.key), p = key(m.pattern ?? "");
  const und = m.kind === "unbreakable";
  if (k === "packed_rubble") return { d: DETAIL.CELLS };   // review 2 #9: dressed stone with mortar is the ruins' host
  const r = (und ? RECIPES["u_" + p] : undefined) ?? RECIPES[p] ?? RECIPES[k] ?? Object.entries(RECIPES).find(([n]) => k.includes(n) || (p && p.includes(n)))?.[1];
  if (r && (!und || r.d >= DETAIL.U_ROUND || r.d === DETAIL.PYLON || r.d === DETAIL.SEEDT || r.d === DETAIL.VENT)) return r;
  if (und) return { d: DETAIL.U_ROUND };
  if (r) return r;
  if (m.kind === "unbreakable") return { d: DETAIL.U_ROUND };
  if (m.kind === "liquid") return RECIPES.lava;
  if (m.kind === "loose") return RECIPES.sand;
  return { d: DETAIL.SPECKLE, a1: m.palette[3], a2: m.palette[0] };
}

const glowOf = (g?: { color: string; hdr: number; radius: number }) => (g ? { c: lin(hex(g.color)), i: g.hdr, r: g.radius } : undefined);

export function buildTables(c: RenderContent): Tables {
  const mat = new Uint8Array(TABLE_W * MAT_ROWS * 4);
  const find = new Uint8Array(TABLE_W * FIND_ROWS * 4);
  const setM = (row: number, id: number, v: [number, number, number, number]) => mat.set(v, (row * TABLE_W + id) * 4);
  const setF = (row: number, id: number, v: [number, number, number, number]) => find.set(v, (row * TABLE_W + id) * 4);
  const rgb8 = (h: string, a = 255): [number, number, number, number] => { const v = hex(h); return [Math.round(v[0] * 255), Math.round(v[1] * 255), Math.round(v[2] * 255), a]; };
  const hdr8 = (x = 0) => Math.max(0, Math.min(255, Math.round(x * 64)));

  const finds = c.finds.filter(Boolean), materials = c.materials.filter(Boolean);
  const jackpots = finds.filter((f) => f.kind === "jackpot").map((f) => key(f.key));
  // Artifact icons pick a drawing by the words in the name (keys are A1, C3, ...).
  const artifacts = finds.filter((f) => f.kind === "artifact").map((f) => key(f.key) + "|" + key(f.name));
  const stamps = buildStamps(jackpots, artifacts);

  // Finds.
  const findInfo: FindInfo[] = [];
  for (const f of finds) {
    if (f.id <= 0 || f.id >= CACHE_FIND0) continue;
    const k = key(f.key);
    const kind = f.kind === "ore" ? 0 : f.kind === "jackpot" ? 1 : 2;
    const extra = kind === 1 ? (JACKPOT_EXTRA[k] ?? Object.entries(JACKPOT_EXTRA).find(([n]) => k.includes(n) || n.includes(k))?.[1] ?? ["#2a2018", f.colors[1], "#000000"]) : kind === 2 ? ["#4a3a20", "#fff8e0", "#000000"] : ["#14101c", f.colors[1], f.colors[0]];
    // Copper's patina and Lumen amber's / Seedglass' inclusion ride on c4.
    if (k.includes("copper")) extra[0] = "#4aa88a";
    if (k.includes("amber")) extra[0] = "#5cffc8";
    if (k.includes("seedglass")) extra[0] = "#fff2c0";
    if (k.includes("voidstone")) extra[0] = "#14101c";
    const cols = [f.colors[0], f.colors[1], f.colors[2], ...extra];
    cols.forEach((h, i) => setF(i, f.id, rgb8(h)));
    let cell: number;
    if (kind === 0) {
      const cls: OreClass = (f.cls && (CLASSES as readonly string[]).includes(key(f.cls)) ? key(f.cls) as OreClass : undefined) ?? ORE_CLASS[k] ?? Object.entries(ORE_CLASS).find(([n]) => k.includes(n))?.[1] ?? SHAPE_CLASS[f.shape] ?? "nugget";
      cell = stamps.classCell[cls];
    } else cell = stamps.special.get(kind === 1 ? "j:" + k : "a:" + k + "|" + key(f.name)) ?? 0;
    const fx = Object.entries(FIND_FX).find(([n]) => k.includes(n))?.[1] ?? 0;
    setF(6, f.id, [cell & 255, cell >> 8, kind, fx]);
    // Jackpots always glow (the one exception before Crystal); artifacts get a soft gold glint, no light.
    const g = f.glow ?? (kind === 1 ? { color: extra[1], hdr: 2.0, radius: 3 } : undefined);
    if (g) setF(7, f.id, [...rgb8(g.color).slice(0, 3), hdr8(g.hdr)] as [number, number, number, number]);
    findInfo[f.id] = { glow: glowOf(g), kind };
  }
  // Cache themes as virtual finds.
  const themes = Object.keys(CACHE_COLORS);
  themes.forEach((t, i) => {
    const id = CACHE_FIND0 + i, cc = CACHE_COLORS[t];
    cc.c.forEach((h, j) => setF(j, id, rgb8(h)));
    const cell = stamps.special.get("c:" + t) ?? 0;
    setF(6, id, [cell & 255, cell >> 8, 3, 0]);
    setF(7, id, [...rgb8(cc.c[4]).slice(0, 3), hdr8(cc.hdr)] as [number, number, number, number]);
    findInfo[id] = { kind: 3, glow: cc.hdr > 0 ? { c: lin(hex(cc.c[4])), i: cc.hdr, r: 1.5 } : undefined };
  });

  // Materials.
  const matInfo: MatInfo[] = [];
  const matHex: string[][] = [];
  for (const m of materials) {
    if (m.id <= 0 || m.id > 255) continue;
    const k = key(m.key);
    const kind = m.kind === "air" ? KIND.AIR : m.kind === "liquid" ? KIND.LIQUID : m.kind === "unbreakable" || !isFinite(m.hardness) ? KIND.UNDIG : KIND.DIG;
    const pal = kind === KIND.UNDIG && !m.palette ? UNDIGGABLE_PAL[m.biome] ?? UNDIGGABLE_PAL[0] : m.palette;
    pal.forEach((h, i) => setM(i, m.id, rgb8(h)));
    matHex[m.id] = [...pal];
    const r = recipeFor(m);
    setM(4, m.id, rgb8(r.a1 ?? pal[3], hdr8(r.e1)));
    setM(5, m.id, rgb8(r.a2 ?? pal[0], hdr8(r.e2)));
    const translucent = r.d === DETAIL.CRYSTAL || r.d === DETAIL.GLASS;
    const glowK = r.d === DETAIL.CAP ? 2.2 : r.d === DETAIL.CRYSTAL ? 0.25 : 1;
    const dense = !!m.dense || k.includes("dense");
    const cache = !!m.cache;
    const flags = (dense ? MF.DENSE : 0) | (translucent ? MF.TRANSLUCENT : 0) | (m.kind === "loose" || r.d === DETAIL.GRAIN ? MF.LOOSE : 0) | (cache ? MF.CACHE : 0) | (m.glow ? MF.GLOW : 0);
    setM(6, m.id, [cache ? DETAIL.CACHE : r.d, kind, flags, m.biome]);
    const hb = kind === KIND.UNDIG ? 255 : Math.max(0, Math.min(254, Math.round(Math.log2(Math.max(0.05, m.hardness)) * 20 + 60)));
    const cacheFind = cache ? CACHE_FIND0 + Math.max(0, themes.indexOf(cacheStampKey(m.cache!))) : 0;
    setM(7, m.id, [hb, cacheFind, 0, 0]);
    if (m.glow) setM(8, m.id, [...rgb8(m.glow.color).slice(0, 3), hdr8(m.glow.hdr)] as [number, number, number, number]);
    const ownLight = r.d === DETAIL.SEEDT;
    matInfo[m.id] = {
      kind, biome: m.biome, hard: m.hardness, dense,
      density: kind === KIND.AIR || ownLight ? 0 : kind === KIND.LIQUID ? 0.25 : translucent ? 0.6 : 1,
      glow: ownLight ? undefined : (m.glow ? { ...glowOf(m.glow)!, i: m.glow.hdr * glowK, r: m.glow.radius * (r.d === DETAIL.CAP ? 1.6 : 1) } : undefined) ?? (cache && CACHE_COLORS[cacheStampKey(m.cache!)].hdr > 0 && m.biome >= 2 ? { c: lin(hex(CACHE_COLORS[cacheStampKey(m.cache!)].c[4])), i: CACHE_COLORS[cacheStampKey(m.cache!)].hdr * 0.6, r: 1.5 } : undefined),
    };
  }
  return { mat, find, stamps, matInfo, findInfo, matHex };
}
