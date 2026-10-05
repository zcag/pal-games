// Player settings: saved through storage, volumes applied to audio here, the rest handed to the host.
// The three volumes are pal's (the manifest's `volume`, `music` and `effects`, set in pal's Settings),
// so they are read from there and never stored with the rest.
import { audio } from "../audio/index.ts";
import { storage } from "../storage.ts";
import type { Settings } from "./host.ts";

export const DEFAULTS: Settings = { master: 0.8, music: 0.7, sfx: 0.8, muted: false, shake: 1, numbers: true, speed: 1, tips: true };

export function loadSettings(): Settings {
  const { master: _m, music: _u, sfx: _s, ...kept } = storage.get<Partial<Settings>>("settings", {});
  return { ...DEFAULTS, ...kept };
}

export function applyAudio(s: Settings) {
  try {
    audio.setMaster(s.master); audio.setMusic(s.music); audio.setSfx(s.sfx); audio.setMuted(s.muted);
  } catch { /* audio unavailable */ }
}

export function saveSettings(s: Settings) {
  const { master: _m, music: _u, sfx: _s, ...kept } = s;
  storage.set("settings", kept);
  applyAudio(s);
}

/** pal's settings for the game (0..100 each) into `s`, applied to the sound. */
export function palVolumes(s: Settings, p: Record<string, unknown>) {
  const v = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) ? Math.min(1, Math.max(0, x / 100)) : d);
  s.master = v(p.volume, DEFAULTS.master); s.music = v(p.music, DEFAULTS.music); s.sfx = v(p.effects, DEFAULTS.sfx);
  applyAudio(s);
}
