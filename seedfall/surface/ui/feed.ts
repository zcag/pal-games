// Transient text: toasts (top centre, max 2), floating world labels, the biome title card, story beats and
// townspeople's lines, and the dive prompts (tow, wreck, sealed in, teleport channel).
import { worldToScreen, type Camera } from "../view.ts";
import { h, setText, toggle } from "./dom.ts";
import { icon, findIcon } from "./icons.ts";
import { ptext } from "./pfont.ts";

const BIG = { color: "#f6f2e6", shade: "#b8b0a0", outline: "#05070a" };
const big = () => innerHeight >= 700;

export type Tone = "good" | "warn" | "bad" | "quiet";

/** The fx module's floating labels (src/surface/fx): world position in tiles, age in seconds. */
/** When `alpha` is given the fx module animates the label (rise and fade) and the UI only places it. */
export interface FloatLabel { text: string; x: number; y: number; age: number; tone?: string; life?: number; alpha?: number; color?: string }

export class Toasts {
  el = h("div.toasts");
  private list: { el: HTMLElement; t: number; key: string }[] = [];

  push(text: string, tone: Tone = "good", ic?: HTMLElement | string, key = text) {
    const same = this.list.find((x) => x.key === key && x.t < 2);
    if (same) { same.t = 0; same.el.classList.remove("bump"); void same.el.offsetWidth; same.el.classList.add("bump"); return; }
    const el = h(`div.toast.pn.${tone}`, typeof ic === "string" ? icon(ic) : ic ?? null, h("span", text));
    this.el.append(el);
    this.list.push({ el, t: 0, key });
    while (this.list.length > 2) this.drop(this.list[0]);
  }
  /** Drop toasts of these tones (stale warnings on reaching town). */
  clear(tones: Tone[]) { for (const x of [...this.list]) if (tones.some((t) => x.el.classList.contains(t))) this.drop(x); }
  pushFind(id: number, text: string, tone: Tone = "good") { this.push(text, tone, findIcon(id), text); }

  private drop(x: { el: HTMLElement; t: number }) {
    this.list.splice(this.list.indexOf(x as never), 1);
    x.el.classList.add("out");
    setTimeout(() => x.el.remove(), 220);
  }
  update(dt: number) {
    for (const x of [...this.list]) if ((x.t += dt) > 2.5) this.drop(x);
  }
}

/** World-space labels from the fx module, positioned each frame with worldToScreen. Pooled. */
export class Labels {
  el = h("div.labels");
  private pool: HTMLElement[] = [];
  update(labels: readonly FloatLabel[], cam: Camera) {
    while (this.pool.length < labels.length) { const e = h("div.wl"); this.el.append(e); this.pool.push(e); }
    for (let i = 0; i < this.pool.length; i++) {
      const e = this.pool[i], l = labels[i];
      if (!l) { if (e.style.display !== "none") e.style.display = "none"; continue; }
      const s = worldToScreen(cam, l.x, l.y);
      const driven = l.alpha !== undefined;
      const k = l.age / (l.life ?? 1.2);
      const a = driven ? l.alpha! : k < 0.1 ? k / 0.1 : k > 0.7 ? Math.max(0, (1 - k) / 0.3) : 1;
      const rise = driven ? 0 : l.age * 14;
      e.style.display = "";
      e.style.transform = `translate(${s.x.toFixed(1)}px, ${(s.y - rise).toFixed(1)}px) translate(-50%, -100%)`;
      e.style.opacity = Math.max(0, Math.min(1, a)).toFixed(2);
      setText(e, l.text);
      if (e.dataset.tone !== (l.tone ?? "")) { e.dataset.tone = l.tone ?? ""; e.className = `wl ${l.tone ?? ""}`; }
      if ((e.dataset.color ?? "") !== (l.color ?? "")) { e.dataset.color = l.color ?? ""; e.style.color = l.color ?? ""; }
    }
  }
}

/** First entry into a biome: name in small caps, a growing line, the depth under it (art.md 8.3). */
export class TitleCard {
  el = h("div.title");
  private t = -1;
  show(name: string, sub: string) {
    this.el.textContent = "";
    this.el.append(h("div.tn", ptext(name, big() ? 5 : 3, BIG)), h("div.tl"), h("div.ts", sub));
    this.el.classList.remove("on"); void this.el.offsetWidth; this.el.classList.add("on");
    this.t = 0;
  }
  update(dt: number) {
    if (this.t < 0) return;
    this.t += dt;
    if (this.t > 2.2) { this.el.classList.remove("on"); this.t = -1; }
  }
}

/** One quiet line at a time: story beats (top, 4 s) and townspeople (who: "line"). */
export class Lines {
  el = h("div.lines");
  private q: { who?: string; text: string; secs: number }[] = [];
  private cur: { el: HTMLElement; t: number; secs: number } | null = null;
  say(text: string, who?: string, secs = 4) {
    if (this.q.some((x) => x.text === text) || this.cur?.el.dataset.text === text) return;
    this.q.push({ who, text, secs });
  }
  update(dt: number) {
    if (this.cur && (this.cur.t += dt) > this.cur.secs) {
      const e = this.cur.el; e.classList.remove("on"); setTimeout(() => e.remove(), 400); this.cur = null;
    }
    if (!this.cur && this.q.length) {
      const n = this.q.shift()!;
      const el = h("div.line", n.who ? h("span.who", n.who) : null, h("span.txt", n.text));
      el.dataset.text = n.text;
      this.el.append(el);
      void el.offsetWidth; el.classList.add("on");
      this.cur = { el, t: 0, secs: n.secs };
    }
  }
}

/** Bottom-centre prompts in the dive: out of fuel, wrecked, sealed in, the teleport channel. */
export class Prompt {
  el = h("div.prompt.pn");
  private txt = h("div.pt");
  private sub = h("div.ps");
  private chan = h("div.bar.chan", h("div.fill", { style: { "--c": "#c9a0ff" } }));
  private key = "";
  constructor() { this.el.append(this.txt, this.sub, this.chan); }
  set(p: { text: string; sub?: string; tone?: Tone; channel?: number } | null) {
    toggle(this.el, "on", !!p);
    if (!p) return;
    const key = `${p.text}|${p.sub}|${p.tone}`;
    if (key !== this.key) {
      this.key = key;
      setText(this.txt, p.text);
      this.sub.innerHTML = p.sub ?? "";
      this.el.dataset.tone = p.tone ?? "";
    }
    toggle(this.chan, "off", p.channel === undefined);
    if (p.channel !== undefined) (this.chan.firstChild as HTMLElement).style.transform = `scaleX(${p.channel})`;
  }
}

/** The launch: the Seed rises up the Lift column; biome names pass, then the town, then the shards. */
export class LaunchOverlay {
  el = h("div.launch");
  private big = h("div.lb");
  private small = h("div.ls");
  private shards = h("div.lsh.n");
  private t = -1;
  phase = "";
  private target = 0;
  private shown = 0;
  constructor() { this.el.append(this.big, this.small, this.shards); }
  get active() { return this.t >= 0; }
  start() { this.t = 0; this.el.classList.add("on"); this.phase = "wake"; this.bigText = "\u0000"; this.set("The Seed wakes", ""); setText(this.shards, ""); this.shown = 0; this.target = 0; }
  private bigText = "";
  set(bigText: string, small: string) {
    if (this.bigText === bigText && this.small.textContent === small) return;
    this.bigText = bigText;
    this.big.classList.remove("in"); void this.big.offsetWidth; this.big.classList.add("in");
    this.big.textContent = "";
    if (bigText) this.big.append(ptext(bigText, big() ? 5 : 3, BIG));
    setText(this.small, small);
  }
  count(n: number) { this.target = n; }
  end() { this.t = -1; this.el.classList.remove("on"); }
  update(dt: number) {
    if (this.t < 0) return;
    this.t += dt;
    if (this.target > 0) {
      this.shown = Math.min(this.target, this.shown + Math.max(1, this.target * dt * 0.8));
      this.shards.textContent = "";
      this.shards.append(icon("shard", 3), ptext(`+${Math.floor(this.shown)}`, big() ? 5 : 3, { color: "#e8d8ff", shade: "#9a70d8", outline: "#05070a" }), h("span", "shards"));
    }
  }
}
