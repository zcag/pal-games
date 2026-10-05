// Screen registry: ScreenSpec kind -> builder.
import type { RunState } from "../../../game/types.ts";
import type { Ctx, Screen, ScreenSpec } from "../index.ts";
import { titleScreen } from "./title.ts";
import { commanderScreen } from "./commander.ts";
import { blessingScreen } from "./blessing.ts";
import { mapScreen } from "./map.ts";
import { rewardScreen, replaceScreen } from "./reward.ts";
import { shopScreen } from "./shop.ts";
import { eventScreen } from "./event.ts";
import { forgeScreen, pickScreen, restScreen, treasureScreen } from "./nodes.ts";
import { summaryScreen } from "./summary.ts";
import { codexScreen } from "./codex.ts";
import { settingsScreen } from "./settings.ts";
import { actScreen } from "./act.ts";

type Make = (ctx: Ctx, spec: ScreenSpec) => Screen;
const run = (f: (ctx: Ctx, run: RunState) => Screen): Make => (ctx, spec) => f(ctx, (spec as { run: RunState }).run);

/** Which run screen a RunState shows. */
export function runScreenKind(r: RunState): string {
  const s = r.screen;
  if (s.s === "reward" && !s.cards.length && s.relics?.length && s.source === "boss") return "bossrelic";
  if (s.s === "over") return "map";
  return s.s;
}

export const SCREENS: Record<string, Make> = {
  title: (ctx) => titleScreen(ctx),
  commander: (ctx) => commanderScreen(ctx),
  "run:blessing": run(blessingScreen),
  "run:map": run(mapScreen),
  "run:reward": run((c, r) => rewardScreen(c, r, false)),
  "run:bossrelic": run((c, r) => rewardScreen(c, r, true)),
  "run:replace": run(replaceScreen),
  "run:shop": run(shopScreen),
  "run:event": run(eventScreen),
  "run:forge": run(forgeScreen),
  "run:rest": run(restScreen),
  "run:treasure": run(treasureScreen),
  "run:pick": run(pickScreen),
  "run:battle": run(mapScreen),
  summary: (ctx, spec) => { const x = spec as Extract<ScreenSpec, { s: "summary" }>; return summaryScreen(ctx, x.run, x.result, x.before); },
  codex: (ctx, spec) => codexScreen(ctx, (spec as Extract<ScreenSpec, { s: "codex" }>).tab),
  settings: (ctx) => settingsScreen(ctx),
  act: (ctx, spec) => actScreen(ctx, (spec as Extract<ScreenSpec, { s: "act" }>).act),
};
