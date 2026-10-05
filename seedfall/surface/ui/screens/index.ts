// Every screen the panel host can open, by id.
import type { ScreenDef, ScreenId } from "../panel.ts";
import { workshop } from "./workshop.ts";
import { supply, rigs, market, fuel } from "./town.ts";
import { lab } from "./lab.ts";
import { launch } from "./launch.ts";
import { log, achievements, settings, offline, cargo, pause } from "./meta.ts";

export const SCREENS: Record<ScreenId, ScreenDef> = { workshop, supply, lab, rigs, launch, market, fuel, log, achievements, settings, offline, cargo, pause };
