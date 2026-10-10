// Chip: a view palette whose body is the game's own page (surface/index.html).
// The page keeps everything (the hole, the shot, the best score in the
// extension's storage), so this side only opens it. The actions reach the
// page as `pal.onAction`. Escape is the panel's (it leaves, and leaving
// pauses a shot in the air).
import type { Action, Extension, View } from "@zcag/pal";

export const ACTIONS: Action[] = [
  { id: "again", title: "Start the hole again", shortcut: "r" },
  { id: "look", title: "Change the look", shortcut: "l" },
];

export default {
  palettes: {
    chip: {
      title: "Chip",
      view: async (): Promise<View> => ({ tree: { type: "surface", src: "surface/index.html" }, actions: ACTIONS, title: "Chip" }),
      pick: () => {},
    },
  },
} satisfies Extension;
