// The keys that drive, by KeyboardEvent.code: up is the gas (and leans the nose
// up in the air), down the brake and reverse (and leans it down). The page reads
// these; the tests hold the manifest's key lists to them.
export const KEYS = { gas: ["ArrowUp", "KeyW"], brake: ["ArrowDown", "KeyS"] } as const;
