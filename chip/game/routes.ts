// Routes the bot found (scripts/solve.ts), replayed by the tests: the plain
// way (tee to the cliff's foot, a pitch over the Needle, a putt) and the
// trick (a full drive through the arch, which drops at the backstop's foot
// on the green). WINDOW: the angles a full-power drive goes through the arch.
import type { Play } from "./bot.ts";

export const PLAIN: Play[] = [{ angle: 42, facing: 1, power: 1, spin: 0 }, { angle: 82, facing: 1, power: 0.96, spin: 0 }, { angle: 0, facing: 1, power: 0.24, spin: 0 }];
export const TRICK: Play[] = [{ angle: 40, facing: 1, power: 1, spin: 0 }, { angle: 39, facing: -1, power: 0.48, spin: 0 }, { angle: 0, facing: 1, power: 0.08, spin: 0 }];
export const WINDOW = [37.5, 38, 38.5, 39, 39.5, 40, 40.5, 58.5, 59, 59.5, 60];
