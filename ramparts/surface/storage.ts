// The one place the game persists anything: pal's storage for the extension (`pal.storage`, synced
// by the rules in pal.json; the keys are progress.ts's KEYS). Its calls are async, the game's reads are not, so `load` reads every key
// once at start into memory; `get` reads that copy and `set` writes it and pal's. Values are JSON;
// a failed write is logged and never breaks the game.
import type { SurfaceKit } from "@zcag/pal";

declare const pal: SurfaceKit;
const cache = new Map<string, unknown>();

export const storage = {
  /** Read `keys` from pal into memory; call once before the first `get`. */
  async load(keys: readonly string[]): Promise<void> {
    await Promise.all(keys.map(async (k) => { cache.set(k, await pal.storage.get(k).catch(() => null)); }));
  },
  get<T>(key: string, fallback: T): T {
    const v = cache.get(key);
    return v == null ? fallback : (structuredClone(v) as T);
  },
  set(key: string, value: unknown): void {
    cache.set(key, value);
    pal.storage.set(key, value).catch((e: unknown) => console.error("ramparts: save", key, e));
  },
  remove(key: string): void {
    cache.delete(key);
    pal.storage.set(key, null).catch((e: unknown) => console.error("ramparts: save", key, e));
  },
  /** A value sync brought in: kept here, then `fn` (the game takes what it keeps in memory). */
  onChange(fn: (key: string, value: unknown) => void): void {
    pal.storage.onChange((k, v) => { cache.set(k, v); fn(k, v); });
  },
};
