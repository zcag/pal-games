// The UI: DOM overlay over the three.js canvas. `mountUi` builds the root, owns every screen,
// the battle HUD and all input; the host (surface/app) feeds it state and carries out requests.
import type { Battle, BattleEvent, RunState } from "../../game/types.ts";
import type { Insets } from "../render/api.ts";
import { clamp, h, sfx } from "./dom.ts";
import { loadFonts } from "./fonts.ts";
import type { Settings, UiHost } from "./host.ts";
import { profileView, type ProfileView } from "./profile.ts";
import type { ApplyResult, Profile } from "../../game/meta.ts";
import { applyAudio, loadSettings, saveSettings } from "./settings.ts";
import { hide as hideTip, initTips } from "./tooltip.ts";
import { navKey, pickFirst, focus } from "./nav.ts";
import { Hud } from "./hud.ts";
import { Fx } from "./fx.ts";
import { SCREENS, runScreenKind } from "./screens/index.ts";
import { pauseMenu } from "./screens/pause.ts";
import { mute } from "./screens/common.ts";
import { audio } from "../audio/index.ts";

export type { UiHost, Nav, Settings } from "./host.ts";

/** What to show. Run screens are chosen from `run.screen`. */
export type ScreenSpec =
  | { s: "title" }
  | { s: "commander" }
  | { s: "run"; run: RunState }
  | { s: "battle"; battle: Battle; run?: RunState }
  | { s: "summary"; run: RunState; result: ApplyResult; before: Profile }
  | { s: "codex"; tab?: string }
  | { s: "settings" }
  | { s: "act"; act: 1 | 2 | 3 | 4 }
  | { s: "none" };

export interface Ui {
  showScreen(s: ScreenSpec): void;
  /** Every animation frame. `b` is the live battle (null outside battle); dt in real seconds. */
  frame(b: Battle | null, dt: number): void;
  /** Sim events drained this frame (gold ticks, banners, toasts, lives flash). */
  onEvents(evs: readonly BattleEvent[], b: Battle): void;
  /** HUD bands in css px for the camera fit. */
  insets(): Insets;
  /** Where coins fly to: the gold counter's centre in css px (viewport). */
  goldPoint(): { x: number; y: number };
  /** VFX: a coin landed on the gold counter (pop the counter). The counter carries `data-coin-target`. */
  coinLanded(value: number): void;
  /** Is the pause menu open (the host stops the sim while true). */
  readonly paused: boolean;
  /** Open or close the pause menu (pal: the panel hid, or the panel's Pause action). */
  pause(open: boolean): void;
  /** The screen showing ("title", "battle", "run:map", ...). */
  readonly kind: string;
  readonly settings: Settings;
  destroy(): void;
}

/** Internals shared by screens and the HUD. */
export interface Ctx {
  host: UiHost;
  root: HTMLElement;
  fx: Fx;
  settings: Settings;
  setSettings(p: Partial<Settings>): void;
  scale(): number;
  profile(): ProfileView;
  show(s: ScreenSpec): void;
  /** Open the pause menu (battle) or settings overlay. */
  pause(open: boolean): void;
  /** A modal overlay (pause, war table, confirm); returns a closer. Backspace closes the top one. */
  overlay(el: HTMLElement, key?: (e: KeyboardEvent) => boolean, onClose?: () => void): () => void;
  hud: Hud;
}

export interface Screen {
  el: HTMLElement;
  key?(e: KeyboardEvent): boolean;
  frame?(dt: number): void;
  destroy?(): void;
  /** Same screen kind shown again: update in place; return false to rebuild. */
  update?(spec: ScreenSpec): boolean;
  /** Skip auto-focusing the first control. */
  noAutoFocus?: boolean;
  kind?: string;
}

/** The UI is laid out for 720x390 and zoomed to the viewport: up to 1.5x on a big one, and down for pal's compact panel (560 wide), so it keeps its layout there. */
export function uiScaleFor(w: number, h: number) { return clamp(Math.min(w / 720, h / 390), 0.75, 1.5); }

export function mountUi(container: HTMLElement, host: UiHost): Ui {
  const root = h("div.rp");
  container.appendChild(root);
  let s = 1;
  const resize = () => {
    s = uiScaleFor(innerWidth, innerHeight);
    root.style.setProperty("--s", String(s));
    root.classList.toggle("roomy", innerWidth / s >= 900);
    root.classList.toggle("tall", innerHeight / s >= 520);
  };
  resize();
  addEventListener("resize", resize);
  void loadFonts();

  const settings = loadSettings();
  applyAudio(settings);
  const screenLayer = h("div.layer");
  const overlayLayer = h("div.layer");
  root.append(screenLayer, overlayLayer);
  initTips(root, () => s);

  const overlays: { el: HTMLElement; key?: (e: KeyboardEvent) => boolean; close: () => void; focusBack: Element | null }[] = [];
  let screen: Screen | null = null;
  let kind = "";
  let isPaused = false;
  let profileCache: ProfileView | null = null;

  const ctx: Ctx = {
    host, root, settings,
    fx: null as unknown as Fx,
    hud: null as unknown as Hud,
    scale: () => s,
    profile: () => (profileCache ??= profileView(host.profile())),
    setSettings(p) {
      Object.assign(settings, p); saveSettings(settings); host.applySettings({ ...settings });
      // Keep any open settings toggle in step (M mutes from anywhere).
      root.querySelectorAll<HTMLElement>("[data-set]").forEach((el) => el.querySelector(".tog")?.classList.toggle("on", !!settings[el.dataset.set as keyof Settings]));
    },
    show: (spec) => ui.showScreen(spec),
    pause(open) { setPause(open); },
    overlay(el, key, onClose) {
      const focusBack = document.activeElement;
      const wrap = h("div.layer.ovl.live", el);
      overlayLayer.appendChild(wrap);
      const rec = {
        el: wrap, key, focusBack,
        close: () => {
          const i = overlays.indexOf(rec);
          if (i < 0) return;
          overlays.splice(i, 1);
          wrap.classList.add("out");
          setTimeout(() => wrap.remove(), 130);
          hideTip();
          onClose?.();
          (rec.focusBack as HTMLElement | null)?.focus?.();
        },
      };
      overlays.push(rec);
      requestAnimationFrame(() => { if (!wrap.contains(document.activeElement)) focus(pickFirst(wrap)); });
      return rec.close;
    },
  };
  ctx.fx = new Fx(root, () => s);
  ctx.hud = new Hud(ctx);
  root.insertBefore(ctx.hud.el, overlayLayer);

  let closePause: (() => void) | null = null;
  function setPause(open: boolean) {
    if (open === isPaused) return;
    if (!open) { closePause?.(); return; }
    isPaused = true;
    host.setPaused(true);
    try { audio.paused(true); } catch { /* audio not ready */ }
    sfx("open");
    closePause = pauseMenu(ctx, () => {
      isPaused = false; closePause = null;
      host.setPaused(false);
      try { audio.paused(false); } catch { /* audio not ready */ }
      sfx("close");
    });
  }

  const ui: Ui = {
    get paused() { return isPaused; },
    pause: (open) => setPause(open),
    get kind() { return kind; },
    get settings() { return settings; },
    showScreen(spec) {
      profileCache = null;
      hideTip();
      const k = spec.s === "run" ? "run:" + runScreenKind(spec.run) : spec.s;
      // A different screen (or a new battle) closes whatever was open over the old one; closing the
      // pause menu resumes the host.
      if (k !== kind || spec.s === "battle") {
        for (const o of [...overlays].reverse()) o.close();
        if (isPaused) closePause?.();
      }
      if (spec.s === "battle") {
        ctx.hud.show(spec.battle, spec.run);
        if (screen) { leave(screen); screen = null; }
        kind = k;
        return;
      }
      ctx.hud.hide();
      if (screen && kind === k && screen.update?.(spec)) return;
      if (screen) leave(screen);
      kind = k;
      screen = null;
      if (spec.s === "none") return;
      const make = SCREENS[k];
      if (!make) { console.warn("ui: no screen", k); return; }
      screen = make(ctx, spec);
      screen.kind = k;
      screen.el.classList.add("scr", "in");
      screenLayer.appendChild(screen.el);
      if (!screen.noAutoFocus) requestAnimationFrame(() => { if (screen && !screen.el.contains(document.activeElement)) { const f = pickFirst(screen.el); f?.focus(); } });
    },
    frame(b, dt) {
      if (b) ctx.hud.frame(b, dt);
      screen?.frame?.(dt);
      ctx.fx.frame(dt);
    },
    onEvents(evs, b) { ctx.hud.onEvents(evs, b); },
    insets() { return ctx.hud.insets(s); },
    goldPoint() { return ctx.hud.goldPoint(s); },
    coinLanded(v) { ctx.hud.coinLanded(v); },
    destroy() { removeEventListener("resize", resize); removeEventListener("keydown", onKey, true); root.remove(); },
  };

  function leave(sc: Screen) {
    sc.destroy?.();
    sc.el.classList.remove("in");
    sc.el.classList.add("out");
    setTimeout(() => sc.el.remove(), 130);
  }

  function onKey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" && (t as HTMLInputElement).type === "text")) return;
    let used = false;
    const top = overlays[overlays.length - 1];
    if (top) {
      used = top.key?.(e) ?? false;
      if (!used && e.key === "Backspace") { top.close(); if (!isPaused) sfx("back"); used = true; }
      if (!used) used = navKey(top.el, e);
      if (!used && (e.key === "m" || e.key === "M")) { mute(ctx); used = true; }
      if (used || e.key !== "Alt") { if (used) { e.preventDefault(); e.stopPropagation(); } return; }
    }
    if (kind === "battle") used = ctx.hud.key(e);
    else if (screen) {
      used = screen.key?.(e) ?? false;
      if (!used) used = navKey(screen.el, e);
    }
    if (!used && (e.key === "m" || e.key === "M") && !e.repeat) { mute(ctx); used = true; }
    if (used) { e.preventDefault(); e.stopPropagation(); }
  }
  function onKeyUp(e: KeyboardEvent) {
    if (kind === "battle") ctx.hud.keyUp(e);
    if (e.key === " ") e.preventDefault();
  }
  addEventListener("keydown", onKey, true);
  addEventListener("keyup", onKeyUp, true);
  return ui;
}
