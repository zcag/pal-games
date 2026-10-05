// Seedfall: a view palette whose body is the game's own page (surface/index.html). The page keeps everything (the
// world, the run, the save in the extension's storage), so this side only opens it. The actions reach the page as
// `pal.onAction`, never here. Escape is the panel's (it leaves, and the game is stored on the way); the page's back
// is Backspace and its pause menu P.
import type { Action, Extension, View } from "@zcag/pal";

export const ACTIONS: Action[] = [
  { id: "menu", title: "Pause menu", shortcut: "p" },
  { id: "workshop", title: "Workshop, in town", shortcut: "u" },
  { id: "cargo", title: "Cargo", shortcut: "tab" },
  { id: "log", title: "Collection log", shortcut: "l" },
  { id: "mute", title: "Sound on or off", shortcut: "shift+m" },
];

export default {
  palettes: {
    seedfall: {
      title: "Seedfall",
      view: async (): Promise<View> => ({ tree: { type: "surface", src: "surface/index.html" }, actions: ACTIONS, title: "Seedfall" }),
      pick: () => {},
    },
  },
} satisfies Extension;
