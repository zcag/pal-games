// What the UI needs from the app shell (surface/app, the lead's). Kept small: the UI reads the
// state it is handed (Battle, RunState, Profile) and asks the host to do things; it never mutates
// game state. Run screens list `choices(run)` from game/run and send back the chosen key.
import type { Command, CommanderId, RunState, Vec } from "../../game/types.ts";
import type { Profile } from "../../game/meta.ts";

export type Nav =
  | { to: "title" }
  | { to: "continue" }                                  // resume the saved run
  | { to: "new"; commander: CommanderId; ascension: number }
  | { to: "codex" } | { to: "settings" }               // the host may also just call ui.showScreen itself
  | { to: "again" }                                     // summary: same commander and ascension, new seed
  | { to: "abandon" };                                  // quit the run from the pause menu (a loss; renown kept)

export interface Settings {
  master: number; music: number; sfx: number;           // 0..1
  muted: boolean;
  shake: number;                                        // 0..1 screen shake scale
  numbers: boolean;                                     // damage numbers
  speed: 1 | 2 | 3;                                     // starting battle speed
  tips: boolean;                                        // first-run notes
}

export interface UiHost {
  // ---- battle
  /** Queue a sim command (applied at the next tick). */
  command(c: Command): void;
  /** Ground point under a css px position (viewport), or null: stage.pick. */
  pick(cx: number, cy: number): Vec | null;
  /** Game point (u) to css px (viewport), or null when behind the camera: stage.toScreen. */
  toScreen(x: number, y: number, z?: number): { x: number; y: number } | null;
  setSpeed(s: 1 | 2 | 3): void;
  /** The pause menu opened/closed: stop/resume the sim (the UI muffles the music itself). */
  setPaused(p: boolean): void;
  // ---- run and meta
  /** A run choice: `run = choose(run, key)` (game/run), save, then `ui.showScreen` for the new state. */
  choose(key: string): void;
  nav(n: Nav): void;
  profile(): Profile;
  /** The saved run, if any (the title shows Continue). */
  savedRun(): RunState | null;
  /** Settings changed (saved and applied to audio by the UI already): apply shake, numbers, starting speed. */
  applySettings(s: Settings): void;
  /** A first-run note was dismissed: `seenTutorial(profile, id)` and save. */
  noteSeen(id: string): void;
}
