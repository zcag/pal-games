// Render contract (lead-owned). The renderer is split between agents; these are
// the seams. Each system is a plain object the stage calls every frame.
import type * as THREE from "../vendor/three.js";
import type { Battle, BattleEvent, BattleMap, Theme, Vec } from "../../game/types.ts";

/** Game (x, y) in u -> three (X, Y up, Z). The map's centre sits at the origin; y -> +Z. */
export function toWorld(map: { w: number; h: number }, x: number, y: number, z = 0): [number, number, number] {
  return [x - map.w / 2, z, y - map.h / 2];
}

/** Road and pads are flattened to Y = 0, so every ground unit stands at Y = 0. Terrain elsewhere may undulate. */
export const GROUND_Y = 0;

export interface Insets { top: number; right: number; bottom: number; left: number }

export interface Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  /** Per-battle content; cleared by setMap. */
  readonly world: THREE.Group;
  /** Current map, theme (null on menus that show a backdrop only). */
  map: BattleMap | null;
  theme: Theme;
  /** Screen-space HUD bands (css px) the camera fit keeps the playable rect out of. */
  setInsets(i: Insets): void;
  resize(w: number, h: number, dpr: number): void;
  /** css px from the canvas' top-left; null if behind the camera. */
  toScreen(x: number, y: number, z?: number): { x: number; y: number } | null;
  /** The game-space ground point under a css px position. */
  pick(cx: number, cy: number): Vec | null;
  /** Add camera trauma 0..1 (shake decays; settings scale it). */
  shake(trauma: number): void;
  /** Register a system; called in registration order each frame. */
  add(sys: RenderSystem): void;
  /** Rebuild the world for a battle map (or a menu backdrop with map = null). */
  setMap(map: BattleMap | null, theme: Theme): void;
  /** One frame: `alpha` is the interpolation fraction between the last two sim ticks; `dt` real seconds; `t` real time. */
  frame(b: Battle | null, alpha: number, dt: number, t: number): void;
  /** (renderer addition) Where units are drawn this frame: world pose (three coords, feet), hit flash. */
  readonly units?: {
    pose(id: number): { x: number; y: number; z: number; height: number; yaw: number; flyer: boolean } | null;
    flash(id: number, amount?: number): void;
    height(kind: string): number;
  };
  /** (renderer addition) Tower muzzles and tops in world coords; `kick` plays the firing recoil. */
  readonly towers?: {
    muzzle(id: number, out?: THREE.Vector3): THREE.Vector3 | null;
    top(id: number): number | null;
    kick(id: number): void;
  };
  /** (renderer addition) Post knobs: pause 0..1 desaturate/darken, danger 0..1 low-lives pulse, red 0..1 leak edge, dim 0..1. */
  readonly fx?: { pause: number; danger: number; red: number; dim: number };
  /** (renderer addition) Skip the slab-rise intro; `settled` is true once it has finished. */
  skipIntro?(): void;
  readonly settled?: boolean;
}

export interface RenderSystem {
  name: string;
  /** World rebuilt (new battle or menu). Recreate per-map objects here. */
  onMap?(stage: Stage, map: BattleMap | null, theme: Theme): void;
  /** Sim events drained this frame (already in tick order). */
  onEvents?(stage: Stage, evs: readonly BattleEvent[], b: Battle): void;
  update(stage: Stage, b: Battle | null, alpha: number, dt: number, t: number): void;
}

/** UI hover/selection state the renderer draws (range rings, pad highlights). Written by the UI, read by render. */
export interface Focus {
  pad: number | null;          // hovered / keyboard-focused pad id
  selectedPad: number | null;  // radial menu open on this pad
  tower: number | null;        // selected tower id
  /** Preview of a range ring: at pad, radius, ground-only ticks style, optional second (upgrade) radius. */
  ring: { x: number; y: number; r: number; ground: boolean; next?: number; accent: string } | null;
  /** Spell aiming reticle. */
  aim: { x: number; y: number; r: number; ok: boolean } | null;
  /** Rally edit mode for a barracks/treant: candidate point. */
  rally: Vec | null;
  /** Alt held: draw every built tower's range ring (R28). */
  allRanges?: boolean;
  /** (renderer addition) The focused pad came from the keyboard: draw the bracket corners (art 3.8). */
  keys?: boolean;
  /** (renderer addition) A tower kind being previewed on `selectedPad` (ghost at 35%, art 8 "hover a tower option"). */
  ghost?: { tower: import("../../game/types.ts").TowerId; pad: number } | null;
}
export const focus: Focus = { pad: null, selectedPad: null, tower: null, ring: null, aim: null, rally: null };
