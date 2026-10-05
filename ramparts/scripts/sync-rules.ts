// Writes pal.json's `sync` from game/sync.ts (the rules follow the content: every tower, boon,
// relic, enemy, boss, event and commander). Run after adding content:
//   bun ramparts/scripts/sync-rules.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { syncRules } from "../game/sync.ts";

const path = join(import.meta.dir, "..", "pal.json");
const m = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
const out: Record<string, unknown> = {};
for (const [k, v] of Object.entries(m)) { if (k === "sync") continue; out[k] = v; if (k === "settings") out.sync = syncRules(); }
writeFileSync(path, JSON.stringify(out, null, 2) + "\n");
console.log("pal.json: sync written");
