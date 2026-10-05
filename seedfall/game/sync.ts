// What a signed-in player's other machines share (pal.json `sync`, pal's docs/extensions.md "Syncing storage"). The
// save is one blob, the world and the run in it: the world, the pod, cash, upgrades and the silo go with whichever
// machine wrote last, while what a player keeps for good merges so neither machine loses it: achievements, the
// collection log, research and modules unlocked, perks and shards, records. pal.json's rules are SYNC (a test holds
// them equal), and `absorb` folds the same rules into a running game when a merged save arrives.
import type { GameState } from "./game.ts";

export type Rule = "max" | "min" | "union" | "sum" | "latest" | "local" | { fields?: Record<string, Rule>; each?: Rule };

export const STATE: Rule = {
  fields: {
    shards: "max",
    perks: { each: "max" },
    achievements: "union",
    research: "union",
    unlocked: "union",
    everReached: "max",
    log: {
      fields: {
        finds: { each: { fields: { n: "max" } } },
        caches: { each: "max" },
        places: "union", life: "union", planets: "union", read: "union", sets: "union",
      },
    },
    records: { fields: { richestHaul: "max", longestDive: "max", launches: "max" } },
    stats: { each: "max" },
  },
};

/** Every storage key the page writes, with its rule. `scene` is the store screenshots' staged moment. */
export const SYNC: Record<string, Rule> = {
  save: { fields: { v: "max", state: STATE, diff: "latest", live: "latest" } },
  hints: "union",
  mix: "latest",
  scene: "local",
};

/** `mine` and `theirs` merged by `rule`, the way pal's server does, with `latest` keeping mine. */
export function fold(rule: Rule | undefined, mine: unknown, theirs: unknown): unknown {
  if (mine === undefined || mine === null) return theirs === undefined ? mine : structuredClone(theirs);
  if (theirs === undefined || theirs === null) return mine;
  if (rule === "max" || rule === "min") return (rule === "max" ? Math.max : Math.min)(mine as number, theirs as number);
  if (rule === "union") {
    const seen = new Set((mine as unknown[]).map((x) => JSON.stringify(x)));
    return [...(mine as unknown[]), ...(theirs as unknown[]).filter((x) => !seen.has(JSON.stringify(x)))];
  }
  if (rule && typeof rule === "object") {
    const a = mine as Record<string, unknown>, b = theirs as Record<string, unknown>;
    return Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, fold(rule.fields?.[k] ?? rule.each, a[k], b[k])]));
  }
  return mine;
}

/** Another machine's progress folded into this game's state: what it keeps for good, never its world or its run. */
export function absorb(s: GameState, theirs: GameState): void {
  const merged = fold(STATE, s, theirs) as Record<string, unknown>;
  for (const k of Object.keys((STATE as { fields: Record<string, Rule> }).fields)) (s as unknown as Record<string, unknown>)[k] = merged[k];
}
