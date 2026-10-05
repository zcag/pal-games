// How pal's sync merges two machines' saves (pal.json `sync`; pal's docs/extensions.md, "Syncing
// storage"); `scripts/sync-rules.ts` writes it into pal.json (a test fails when the two differ).
// Counts add up (`sum`), records keep the best (`max`), what was opened or seen is kept from both
// (`union`), the codex's maps by tower, boon, relic, enemy, boss, event and commander merge every
// entry by one rule (`each`), and a keyed map with no rules of its own (`{ each: "latest" }`)
// merges key by key, so neither machine's entries are lost.
import type { SyncFieldRule, SyncRule } from "@zcag/pal";

const keyed: SyncFieldRule = { each: "latest" };

/** The rules for the game's storage keys: `profile` (renown, unlocks, codex, history), `run` (the one in progress), `settings`, `scene` (screenshots only). */
export function syncRules(): Record<string, SyncRule> {
  return {
    profile: {
      fields: {
        version: "max",
        renown: "sum",
        level: "max",
        track: "max",
        unlocked: { fields: { towers: "union", commanders: "union", relics: "union", events: "union", titles: "union" } },
        perks: keyed,
        ascension: { each: "max" },
        blessingRare: keyed,
        reachedAct3: "latest",
        furthest: "latest",
        codex: {
          fields: {
            towers: { each: { fields: { built: "sum", kills: "sum", damage: "sum", topWins: "sum", specs: "union" } } },
            boons: { each: { fields: { seen: "sum", taken: "sum", tempered: "sum" } } },
            relics: { each: { fields: { seen: "sum", taken: "sum", wins: "sum" } } },
            enemies: { each: { fields: { met: "sum", killed: "sum", leaked: "sum", worstLeak: "max" } } },
            bosses: { each: { fields: { met: "sum", defeated: "sum", fastest: "latest", ascBeaten: "max" } } },
            events: { each: { fields: { seen: "sum", choices: "union" } } },
            commanders: { each: { fields: { runs: "sum", wins: "sum", best: "max", towers: { each: "sum" } } } },
          },
        },
        history: "union",
        totals: { fields: { runs: "sum", wins: "sum", streak: "latest", bestStreak: "max", fastestWin: "latest", mostLivesWin: "max" } },
        tutorial: keyed,
        lastCommander: "latest",
        settings: keyed,
      },
    },
    run: "latest",
    settings: keyed,
    scene: "local",
  };
}
