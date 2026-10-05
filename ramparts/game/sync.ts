// How pal's sync merges two machines' saves (pal.json `sync`; pal's docs/extensions.md, "Syncing
// storage"): built here from the content, so every tower, boon, relic, enemy, boss, event and
// commander the codex can record has its rule, and `scripts/sync-rules.ts` writes it into pal.json
// (a test fails when the two differ). Counts add up (`sum`), records keep the best (`max`), what
// was opened or seen is kept from both (`union`), and a keyed map with no rules of its own
// (`{ fields: {} }`) merges key by key, so neither machine's entries are lost.
import type { SyncMerge, SyncRule } from "@zcag/pal";
import { TOWER_IDS } from "./content/run/towers.ts";
import { BOONS } from "./content/run/boons.ts";
import { RELICS } from "./content/run/relics.ts";
import { ENEMY_IDS } from "./content/battle/enemies.ts";
import { BOSS_INFO } from "./content/run/map.ts";
import { EVENTS } from "./content/run/events.ts";
import { COMMANDER_IDS } from "./content/run/commanders.ts";

/** A rule below the top level, where `local` is not one. */
type Rule = SyncMerge | { fields: Record<string, Rule> };
const each = (ids: readonly string[], rule: Rule): Rule => ({ fields: Object.fromEntries(ids.map((id) => [id, rule])) });
const keyed: Rule = { fields: {} };
const bosses = Object.keys(BOSS_INFO);

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
        ascension: each(COMMANDER_IDS, "max"),
        blessingRare: keyed,
        reachedAct3: "latest",
        furthest: "latest",
        codex: {
          fields: {
            towers: each(TOWER_IDS, { fields: { built: "sum", kills: "sum", damage: "sum", topWins: "sum", specs: "union" } }),
            boons: each(BOONS.map((b) => b.id), { fields: { seen: "sum", taken: "sum", tempered: "sum" } }),
            relics: each(RELICS.map((r) => r.id), { fields: { seen: "sum", taken: "sum", wins: "sum" } }),
            enemies: each([...ENEMY_IDS, ...bosses.filter((b) => !(ENEMY_IDS as string[]).includes(b))], { fields: { met: "sum", killed: "sum", leaked: "sum", worstLeak: "max" } }),
            bosses: each(bosses, { fields: { met: "sum", defeated: "sum", fastest: "latest", ascBeaten: "max" } }),
            events: each(EVENTS.map((e) => e.id), { fields: { seen: "sum", choices: "union" } }),
            commanders: each(COMMANDER_IDS, { fields: { runs: "sum", wins: "sum", best: "max", towers: each(TOWER_IDS, "sum") } }),
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
