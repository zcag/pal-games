// Saves: one versioned JSON object. The world is stored as its seed plus a compact difference from the generated
// world (per layer: varint gap + value pairs, base64). Round-trips exactly: save -> load gives the same state hash.
import { W, H, type PlanetId, type WorldData } from "./types.ts";
import { Live, type Ent } from "./world.ts";
import { SAVE_VERSION } from "./meta.ts";
import type { Game, GameState } from "./game.ts";

const LAYERS = ["mat", "find", "haz", "back", "flag", "fluid"] as const;

export interface SaveData {
  v: number;
  state: GameState;
  /** Per layer, the changed tiles against the generated world. */
  diff: Record<(typeof LAYERS)[number], string>;
  live: {
    ents: Ent[]; nextId: number;
    fuses: { i: number; t: number }[]; timbers: { tiles: number[]; t: number }[]; floors: { i: number; t: number }[];
    lavaActive: number[]; lavaT: [number, number][]; flowed: [number, number][];
    reveals: { tiles: number[]; until: number }[];
  };
}

// ---------------------------------------------------------------- base64 without Buffer (browser and bun)

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function toB64(bytes: number[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1] ?? 0, c = bytes[i + 2] ?? 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < bytes.length ? B64[n & 63] : "=");
  }
  return out;
}
function fromB64(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    const v = [0, 1, 2, 3].map((k) => (s[i + k] === "=" || s[i + k] === undefined ? -1 : B64.indexOf(s[i + k])));
    const n = (v[0] << 18) | (v[1] << 12) | (Math.max(0, v[2]) << 6) | Math.max(0, v[3]);
    out.push((n >> 16) & 255);
    if (v[2] >= 0) out.push((n >> 8) & 255);
    if (v[3] >= 0) out.push(n & 255);
  }
  return out;
}
const varint = (out: number[], n: number) => { while (n >= 128) { out.push((n & 127) | 128); n >>>= 7; } out.push(n); };

/** Changed tiles of one layer as (gap, value) pairs. */
export function encodeLayer(cur: Uint8Array, base: Uint8Array): string {
  const out: number[] = [];
  let last = -1;
  for (let i = 0; i < cur.length; i++) {
    if (cur[i] === base[i]) continue;
    varint(out, i - last - 1);
    out.push(cur[i]);
    last = i;
  }
  return toB64(out);
}
export function decodeLayer(into: Uint8Array, s: string) {
  const b = fromB64(s);
  let i = -1, k = 0;
  while (k < b.length) {
    let gap = 0, shift = 0, byte;
    do { byte = b[k++]; gap |= (byte & 127) << shift; shift += 7; } while (byte & 128);
    i += gap + 1;
    into[i] = b[k++];
  }
}

// ---------------------------------------------------------------- save and load

export function serialize(g: Game): SaveData {
  const s = g.s, live = g.live;
  const base = baseWorld(g);
  const diff = {} as SaveData["diff"];
  for (const l of LAYERS) diff[l] = encodeLayer(live.w[l], base[l]);
  const state = JSON.parse(JSON.stringify(s, (_k, v) => (v === Infinity ? null : v))) as GameState;
  return {
    v: SAVE_VERSION,
    state,
    diff,
    live: {
      ents: JSON.parse(JSON.stringify(live.ents)), nextId: live.nextId,
      fuses: live.fuses.map((f) => ({ ...f })), timbers: live.timbers.map((t) => ({ tiles: [...t.tiles], t: t.t })), floors: live.floors.map((f) => ({ ...f })),
      lavaActive: [...live.lavaActive], lavaT: [...live.lavaT], flowed: [...live.flowed],
      reveals: live.reveals.map((r) => ({ tiles: [...r.tiles], until: r.until })),
    },
  };
}

/** The generated world a save diffs against (cached per game: regenerating costs tens of ms). */
const bases = new WeakMap<Game, { key: string; w: WorldData }>();
function baseWorld(g: Game): WorldData {
  const s = g.s, key = `${s.worldSeed}:${s.planet}:${s.worldFound.join(",")}`;
  const c = bases.get(g);
  if (c && c.key === key) return c.w;
  const w = (g.opts.makeWorld ?? defaultMake)(s.worldSeed, s.planet, s.worldFound);
  bases.set(g, { key, w });
  return w;
}
let defaultMake: (seed: number, planet: PlanetId, found: number[]) => WorldData = () => { throw new Error("no world source"); };
/** game.ts registers gen's generate here (avoids an import cycle at module load). */
export const setDefaultWorld = (f: typeof defaultMake) => { defaultMake = f; };

/** Older saves are brought up to the current version here. */
export function migrate(obj: unknown): SaveData {
  const d = obj as SaveData;
  if (!d || typeof d !== "object" || typeof d.v !== "number" || !d.state) throw new Error("not a Seedfall save");
  // v1 is the first version; future migrations chain here: if (d.v === 1) { ...; d.v = 2; }
  // fields added within v1 (guards): default them
  const st = d.state as Partial<GameState>;
  st.divesAtBuy ??= 0; st.bandOre ??= []; st.mark ??= null;
  st.prevIn ??= { left: false, right: false, up: false, down: false }; st.warns ??= {}; st.boughtHere ??= [];
  return d;
}

export function deserialize(obj: unknown, makeWorld: (seed: number, planet: PlanetId, found: number[]) => WorldData): { s: GameState; live: Live } {
  const d = migrate(obj);
  const s = JSON.parse(JSON.stringify(d.state)) as GameState;
  if (s.pod.fuelHome === null) s.pod.fuelHome = Infinity;
  const w = makeWorld(s.worldSeed, s.planet, s.worldFound);
  if (w.mat.length !== W * H) throw new Error("world size changed");
  for (const l of LAYERS) decodeLayer(w[l], d.diff[l]);
  const live = new Live(w);
  const L = d.live;
  live.ents = JSON.parse(JSON.stringify(L.ents));
  live.nextId = L.nextId;
  live.fuses = L.fuses.map((f) => ({ ...f }));
  live.timbers = L.timbers.map((t) => ({ tiles: [...t.tiles], t: t.t }));
  live.floors = L.floors.map((f) => ({ ...f }));
  live.lavaActive = new Set(L.lavaActive);
  live.lavaT = new Map(L.lavaT);
  live.flowed = new Map(L.flowed);
  live.reveals = L.reveals.map((r) => ({ tiles: [...r.tiles], until: r.until }));
  live.takeDirty();
  return { s, live };
}
