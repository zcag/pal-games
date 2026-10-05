// The game's storage keys, each with its rule in pal.json `sync` (game/sync.ts): every write goes
// through surface/storage.ts, which reads these once at start. pal's sync-declared test reads them here.
export const KEYS = ["profile", "run", "settings", "scene"] as const;
