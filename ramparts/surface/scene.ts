// A staged picture for the store screenshots (fixture.ts): a battle built and played forward,
// read from the `scene` storage key at start (surface/main.ts). The game never writes it.
import type { Act, TowerId } from "../game/types.ts";

export type Scene = { battle: { act: Act; kind?: "battle" | "elite" | "boss"; seed: number; boss?: string; towers: [TowerId, number, string?][]; waves: number; ticks: number; lives?: number } };
