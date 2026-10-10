// Uphill: a view palette whose body is the game's own page (surface/index.html).
// The page keeps everything (the run, the best distance in the extension's
// storage), so this side only opens it. The actions reach the page as
// `pal.onAction`. Escape is the panel's (it leaves, and leaving pauses).
import type { Action, Extension, View } from "@zcag/pal";

export const ACTIONS: Action[] = [
  { id: "again", title: "Drive again", shortcut: "r" },
  { id: "pause", title: "Pause or carry on", shortcut: "p" },
  { id: "mute", title: "Sound on or off", shortcut: "m" },
  { id: "look", title: "Next look", shortcut: "l" },
];

export default {
  palettes: {
    uphill: {
      title: "Uphill",
      view: async (): Promise<View> => ({ tree: { type: "surface", src: "surface/index.html" }, actions: ACTIONS, title: "Uphill" }),
      pick: () => {},
    },
  },
} satisfies Extension;
