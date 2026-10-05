// Ramparts: a view palette whose body is the game's own page (surface/index.html).
// The page keeps everything (the run, the profile in the extension's storage), so
// this side only opens it. The actions reach the page as `pal.onAction`, never
// here. Escape is the panel's (it leaves, and leaving pauses a battle); the
// page's back is Backspace.
import type { Action, Extension, View } from "@zcag/pal";

export const ACTIONS: Action[] = [
  { id: "pause", title: "Pause or carry on", shortcut: "p" },
  { id: "speed", title: "Battle speed", shortcut: "f" },
  { id: "mute", title: "Sound on or off", shortcut: "m" },
  { id: "quit", title: "Quit the run", style: "destructive", confirm: "Quit this run? It counts as a loss, and you keep the renown." },
];

export default {
  palettes: {
    ramparts: {
      title: "Ramparts",
      view: async (): Promise<View> => ({ tree: { type: "surface", src: "surface/index.html" }, actions: ACTIONS, title: "Ramparts" }),
      pick: () => {},
    },
  },
} satisfies Extension;
