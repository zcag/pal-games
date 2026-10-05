// Reads of the player's profile (game/meta) shaped for the title, commander select and codex.
import type { CommanderId } from "../../game/types.ts";
import { codexCompletion, nextUnlock, type Profile } from "../../game/meta.ts";
import { LEVELS, UNLOCKS } from "../../game/content/run/unlocks.ts";
import { COMMANDER_IDS } from "./content.ts";

export interface ProfileView {
  renown: number; level: number; nextAt: number; levelAt: number;
  nextUnlock?: { name: string; glyph: string; need: number };
  commanders: Record<CommanderId, { unlocked: boolean; maxAscension: number; wins: number; runs: number; best: number }>;
  last: CommanderId;
  codex: { pct: number; seen: Record<string, Set<string>> };
  notesSeen: Set<string>;
}

export function unlockGlyph(name: string): string {
  const u = UNLOCKS.find((x) => x.name === name)?.item;
  if (!u) return "star";
  if (u.kind === "tower") return u.tower;
  if (u.kind === "commander") return u.commander === "alchemist" ? "c-alchemist" : u.commander;
  if (u.kind === "relics") return "r-gem";
  if (u.kind === "events") return "event";
  if (u.kind === "perk") return "star";
  return "renown";
}

export function profileView(p: Profile): ProfileView {
  const nu = nextUnlock(p);
  const commanders = Object.fromEntries(COMMANDER_IDS.map((c) => {
    const cx = p.codex.commanders[c];
    return [c, { unlocked: p.unlocked.commanders.includes(c), maxAscension: p.ascension[c] ?? 0, wins: cx?.wins ?? 0, runs: cx?.runs ?? 0, best: cx?.best ?? 0 }];
  })) as ProfileView["commanders"];
  const keys = <T>(r: Record<string, T | undefined>, ok: (v: T) => boolean) => new Set(Object.entries(r).filter(([, v]) => v && ok(v)).map(([k]) => k));
  return {
    renown: p.renown, level: p.level,
    levelAt: p.level > 0 ? LEVELS[p.level - 1]! : 0, nextAt: LEVELS[p.level] ?? p.renown,
    nextUnlock: nu ? { name: nu.name, glyph: unlockGlyph(nu.name), need: nu.need } : undefined,
    commanders, last: p.lastCommander,
    codex: {
      pct: Math.round(codexCompletion(p) * 100),
      seen: {
        towers: keys(p.codex.towers, (t) => t.built > 0), boons: keys(p.codex.boons, (b) => b.seen > 0), relics: keys(p.codex.relics, (r) => r.seen > 0),
        enemies: keys(p.codex.enemies, (e) => e.met > 0), bosses: keys(p.codex.bosses, (b) => b.met > 0), events: new Set(Object.keys(p.codex.events)),
        commanders: new Set(p.unlocked.commanders),
      },
    },
    notesSeen: new Set(Object.keys(p.tutorial).filter((k) => p.tutorial[k])),
  };
}
