// Persistent storage is pal's kit: the extension's storage, synced to the player's other machines by pal.json's
// `sync` rules (localStorage in a plain browser). The kit answers asynchronously, so the keys the game starts from
// are read once before it starts and kept here; writes go to the kit directly (`pal.storage.set` in main.ts, each
// with its key written out, so pal's checks see every key that is stored).
import type { SurfaceKit } from "@zcag/pal";

declare const pal: SurfaceKit;

const read = new Map<string, unknown>();

export const storage = {
  /** Read these keys from the kit; the game starts after this. */
  async load(keys: readonly string[]) {
    await Promise.all(keys.map(async (k) => { read.set(k, await pal.storage.get(k).catch(() => null)); }));
  },
  /** A key as it was when the game started. */
  get(key: string): unknown { return read.get(key) ?? null; },
};
