// The foreground styles' shared tools: colours mixed in sRGB, a path that
// knows its bounds, and the three ways a part is finished. Parts are drawn in
// metres with y up, lit from the upper right (the looks' low sun), so a
// shape's lit edge is the one toward (+x, +y) whichever style draws it.
// Uphill keeps a copy of this file: each game is packaged on its own.

export type StyleId = "cartoon" | "soft" | "flat";
export const STYLES: StyleId[] = ["cartoon", "soft", "flat"];
export const STYLE_NAMES: Record<StyleId, string> = { cartoon: "Cartoon", soft: "Soft", flat: "Silhouette" };

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const to2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
/** a to b by t, in sRGB. */
export function mix(a: string, b: string, t: number): string {
  const A = hex(a), B = hex(b);
  return `#${A.map((v, i) => to2(v + (B[i] - v) * t)).join("")}`;
}
export function rgba(c: string, a: number): string {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
}

/** The light's direction, toward the upper right. */
export const LX = 0.6, LY = 0.8;

/** A Path2D that keeps its bounding box (control points count: close enough for gradients). */
export class Shape {
  p = new Path2D();
  x0 = Infinity; y0 = Infinity; x1 = -Infinity; y1 = -Infinity;
  private k(x: number, y: number) { if (x < this.x0) this.x0 = x; if (x > this.x1) this.x1 = x; if (y < this.y0) this.y0 = y; if (y > this.y1) this.y1 = y; }
  m(x: number, y: number) { this.p.moveTo(x, y); this.k(x, y); return this; }
  l(x: number, y: number) { this.p.lineTo(x, y); this.k(x, y); return this; }
  q(cx: number, cy: number, x: number, y: number) { this.p.quadraticCurveTo(cx, cy, x, y); this.k(cx, cy); this.k(x, y); return this; }
  c(ax: number, ay: number, bx: number, by: number, x: number, y: number) { this.p.bezierCurveTo(ax, ay, bx, by, x, y); this.k(ax, ay); this.k(bx, by); this.k(x, y); return this; }
  z() { this.p.closePath(); return this; }
  pts(ps: number[][]) { ps.forEach(([x, y], i) => (i ? this.l(x, y) : this.m(x, y))); return this.z(); }
  circle(x: number, y: number, r: number) { this.p.moveTo(x + r, y); this.p.arc(x, y, r, 0, Math.PI * 2); this.k(x - r, y - r); this.k(x + r, y + r); return this; }
  ellipse(x: number, y: number, rx: number, ry: number, rot = 0) { this.p.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); this.p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); const r = Math.max(rx, ry); this.k(x - r, y - r); this.k(x + r, y + r); return this; }
  rect(x: number, y: number, w: number, h: number, r = 0) { this.p.roundRect(x, y, w, h, r); this.k(x, y); this.k(x + w, y + h); return this; }
  /** A tube from a to b, `w` thick with round ends (a limb, a bar). */
  tube(ax: number, ay: number, bx: number, by: number, w: number) {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-6, nx = (-dy / len) * w / 2, ny = (dx / len) * w / 2;
    const a = Math.atan2(dy, dx);
    this.p.moveTo(ax + nx, ay + ny); this.p.lineTo(bx + nx, by + ny);
    this.p.arc(bx, by, w / 2, a + Math.PI / 2, a - Math.PI / 2, true);
    this.p.lineTo(ax - nx, ay - ny);
    this.p.arc(ax, ay, w / 2, a - Math.PI / 2, a + Math.PI / 2, true);
    this.p.closePath();
    this.k(ax - w, ay - w); this.k(ax + w, ay + w); this.k(bx - w, by - w); this.k(bx + w, by + w);
    return this;
  }
  get w() { return this.x1 - this.x0; }
  get h() { return this.y1 - this.y0; }
  moved(dx: number, dy: number) { const p = new Path2D(); p.addPath(this.p, new DOMMatrix().translate(dx, dy)); return p; }
}

/** How a style finishes parts: its outline (none for the flat and soft ones), and the device pixels per metre it is drawn at (blur is in pixels). */
export type Finish = { id: StyleId; ink: string; lw: number; px: number; shadowInk: string; lightInk: string };
export type Tone = { base: string; lit?: string; shade?: string };
type Opts = { rim?: number; cel?: number; gloss?: number; outline?: boolean; soft?: number; lw?: number };

// Parts are often several overlapping shapes (a bush of circles, a cage of tubes), so anything cut out of a part is
// cut on a scratch canvas with destination-out, never with evenodd, which would punch the overlaps out too.
const scratch = document.createElement("canvas");
function layer(g: CanvasRenderingContext2D, draw: (t: CanvasRenderingContext2D) => void, shadow?: (g: CanvasRenderingContext2D) => void) {
  const c = g.canvas as HTMLCanvasElement;
  if (scratch.width !== c.width || scratch.height !== c.height) { scratch.width = c.width; scratch.height = c.height; }
  const t = scratch.getContext("2d")!;
  t.setTransform(1, 0, 0, 1, 0, 0);
  t.globalCompositeOperation = "source-over";
  t.clearRect(0, 0, c.width, c.height);
  t.setTransform(g.getTransform());
  draw(t);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  shadow?.(g);
  g.drawImage(scratch, 0, 0);
  g.restore();
}

/** `s` minus itself moved by (dx, dy): the crescent along the edge facing away from the move. */
function crescent(g: CanvasRenderingContext2D, s: Shape, dx: number, dy: number, color: string) {
  layer(g, (t) => {
    t.fillStyle = color;
    t.fill(s.p);
    t.globalCompositeOperation = "destination-out";
    t.fillStyle = "#000";
    t.fill(s.moved(dx, dy));
  });
}

/**
 * One part, finished in the style: flat fills with a lit rim and a shade
 * crescent (Silhouette); the same crescents bolder, an outline and a gloss
 * (Cartoon); a gradient across the light, a blurred inner shade and a soft
 * highlight (Soft). `rim` and `cel` are the crescents' widths in metres.
 */
export function finish(g: CanvasRenderingContext2D, s: Shape, f: Finish, t: Tone, o: Opts = {}) {
  const lit = t.lit ?? mix(t.base, f.lightInk, 0.3), shade = t.shade ?? mix(t.base, f.shadowInk, 0.35);
  const size = Math.min(s.w, s.h);
  const rim = o.rim ?? Math.min(0.05, size * 0.12), cel = o.cel ?? size * 0.22;
  g.save();
  if (f.id === "soft") {
    const cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2, r = Math.hypot(s.w, s.h) / 2;
    const gr = g.createLinearGradient(cx + LX * r, cy + LY * r, cx - LX * r, cy - LY * r);
    gr.addColorStop(0, lit); gr.addColorStop(0.35, t.base); gr.addColorStop(0.6, t.base); gr.addColorStop(1, shade);
    g.fillStyle = gr;
    g.fill(s.p);
    g.clip(s.p);
    // A blurred shade inside the edges away from the light: the shadow of everything outside the part, thrown in.
    if (o.soft !== 0) {
      const d = o.soft ?? cel * 0.6, far = d * 3 + 0.2;
      layer(g, (t) => {
        t.fillStyle = "#000";
        t.fillRect(s.x0 - far, s.y0 - far, s.w + far * 2, s.h + far * 2);
        t.globalCompositeOperation = "destination-out";
        t.fill(s.p);
      }, (g) => {
        g.shadowColor = rgba(f.shadowInk, 0.6);
        g.shadowBlur = Math.max(1, d * f.px * 1.2);
        g.shadowOffsetX = LX * d * f.px;
        g.shadowOffsetY = -LY * d * f.px;
      });
    }
    if (o.gloss) {
      // A long soft highlight under the top edge, the shine on a curved surface.
      const rx = s.w * 0.3 * o.gloss, ry = Math.min(s.h * 0.12, rx * 0.5), hx = s.x0 + s.w * 0.6, hy = s.y1 - s.h * 0.16;
      g.save();
      g.translate(hx, hy); g.scale(1, ry / rx);
      const hg = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      hg.addColorStop(0, "rgba(255,255,255,0.6)"); hg.addColorStop(0.5, "rgba(255,255,255,0.22)"); hg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = hg;
      g.fillRect(-rx, -rx, rx * 2, rx * 2);
      g.restore();
    }
    crescent(g, s, -LX * rim * 0.7, -LY * rim * 0.7, rgba(f.lightInk, 0.3));
    g.restore();
    return;
  }
  if (f.id === "cartoon" && o.outline !== false) {
    // The outline is stroked under the fill, so only the outer edge of a part made of several shapes shows.
    g.strokeStyle = f.ink;
    g.lineWidth = f.lw * 2 * (o.lw ?? 1);
    g.stroke(s.p);
  }
  g.fillStyle = t.base;
  g.fill(s.p);
  g.clip(s.p);
  if (f.id === "cartoon") {
    crescent(g, s, LX * cel * 1.3, LY * cel * 1.3, shade);
    crescent(g, s, -LX * rim * 1.3, -LY * rim * 1.3, lit);
    if (o.gloss) {
      // A hard white streak along the top, the toy-paint shine.
      const gw = s.w * 0.5 * o.gloss, gh = Math.max(0.025, s.h * 0.09);
      g.fillStyle = "rgba(255,255,255,0.62)";
      g.beginPath();
      g.roundRect(s.x0 + s.w * 0.42, s.y1 - s.h * 0.22 - gh, gw, gh, gh / 2);
      g.roundRect(s.x0 + s.w * 0.42 + gw + gh * 1.2, s.y1 - s.h * 0.22 - gh, gh * 1.4, gh, gh / 2);
      g.fill();
    }
  } else {
    crescent(g, s, LX * cel, LY * cel, shade);
    crescent(g, s, -LX * rim, -LY * rim, lit);
  }
  g.restore();
}

/** A canvas `w` by `h` metres at `px` device pixels a metre, with the origin at (ox, oy) metres from its bottom left and y up. */
export function sprite(w: number, h: number, ox: number, oy: number, px: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * px); c.height = Math.ceil(h * px);
  const g = c.getContext("2d")!;
  g.setTransform(px, 0, 0, -px, ox * px, c.height - oy * px);
  g.lineCap = "round"; g.lineJoin = "round";
  draw(g);
  return { canvas: c, ox, oy, w, h, px };
}
export type Sprite = ReturnType<typeof sprite>;

/** A sprite drawn at (x, y) CSS pixels, turned by `a` (radians, y up) at `ppm` CSS pixels a metre. */
export function put(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, a: number, ppm: number, sx = 1) {
  const k = ppm / s.px;
  ctx.save();
  ctx.translate(x, y);
  if (a) ctx.rotate(-a);
  ctx.scale(k * sx, k);
  ctx.drawImage(s.canvas, -s.ox * s.px, -(s.canvas.height - s.oy * s.px));
  ctx.restore();
}

/** A stable hash of n to [0, 1). */
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
