// Painted terrain for the run map: per-act ground features, scattered props and fog, as SVG markup.
// Seeded, so a map always looks the same; props keep clear of the nodes and the trails.
import type { Act } from "../../../game/types.ts";

type P = { x: number; y: number };
export interface TerrainIn { act: Act; W: number; H: number; seed: number; nodes: P[]; trails: P[][]; fogFrom: number | null }

function rng(seed: number) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const f = (n: number) => n.toFixed(1);

export const TERRAIN_DEFS = `<defs>
  <filter id="mist" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  <linearGradient id="fogG" x1="0" x2="1"><stop offset="0" stop-color="#e9e4d8" stop-opacity="0"/><stop offset=".35" stop-color="#e9e4d8" stop-opacity=".42"/><stop offset="1" stop-color="#e9e4d8" stop-opacity=".55"/></linearGradient>
  <linearGradient id="fogN" x1="0" x2="1"><stop offset="0" stop-color="#14100e" stop-opacity="0"/><stop offset=".35" stop-color="#14100e" stop-opacity=".4"/><stop offset="1" stop-color="#14100e" stop-opacity=".55"/></linearGradient>
</defs>`;

/** Ground features under everything (fields, dunes, mountain masses, lava). */
export function ground(o: TerrainIn): string {
  const r = rng(o.seed * 31 + o.act);
  const { W, H } = o;
  let out = "";
  if (o.act === 1) {
    for (let i = 0; i < 9; i++) {
      const x = r() * W, y = r() * H, w = 60 + r() * 120, h = 30 + r() * 50, a = (r() - 0.5) * 30;
      out += `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="14" transform="rotate(${f(a)} ${f(x)} ${f(y)})" fill="${r() > 0.5 ? "#a7bd72" : "#7f9a55"}" opacity=".45" filter="url(#soft)"/>`;
    }
    for (let i = 0; i < 2; i++) { const x = r() * W, y = r() * H; out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(18 + r() * 14)}" ry="${f(9 + r() * 6)}" fill="#6fa3c2" stroke="#4f7f9c" stroke-width="1.5" opacity=".8"/>`; }
  } else if (o.act === 2) {
    for (let y = -10; y < H + 30; y += 26 + r() * 10) {
      let d = `M-10 ${f(y)}`;
      for (let x = 0; x <= W + 40; x += 40) d += ` Q${f(x + 20)} ${f(y - 8 - r() * 10)} ${f(x + 40)} ${f(y + (r() - 0.5) * 6)}`;
      out += `<path d="${d} L${W + 40} ${H + 40} L-10 ${H + 40}Z" fill="${r() > 0.5 ? "#d9bd85" : "#c9a96d"}" opacity=".35"/>`;
      out += `<path d="${d}" fill="none" stroke="#f3e2b8" stroke-width="1.2" opacity=".6"/>`;
    }
  } else if (o.act === 3) {
    for (let i = 0; i < 7; i++) {
      const x = r() * W, y = H * (0.15 + r() * 0.8), w = 70 + r() * 90, h = 40 + r() * 50;
      out += `<path d="M${f(x - w / 2)} ${f(y)} L${f(x)} ${f(y - h)} L${f(x + w / 2)} ${f(y)}Z" fill="#8f9eab" opacity=".55"/>`;
      out += `<path d="M${f(x - w * 0.16)} ${f(y - h * 0.68)} L${f(x)} ${f(y - h)} L${f(x + w * 0.16)} ${f(y - h * 0.68)} L${f(x + w * 0.05)} ${f(y - h * 0.6)} L${f(x - w * 0.05)} ${f(y - h * 0.66)}Z" fill="#fbfdff" opacity=".85"/>`;
    }
  } else {
    for (let i = 0; i < 4; i++) {
      let d = `M${f(r() * W)} -10`;
      let x = r() * W;
      for (let y = 0; y <= H + 20; y += 30) { x += (r() - 0.5) * 50; d += ` L${f(x)} ${f(y)}`; }
      out += `<path d="${d}" fill="none" stroke="#ff7a2a" stroke-width="6" opacity=".5" filter="url(#glow)"/><path d="${d}" fill="none" stroke="#ffb05a" stroke-width="1.6" opacity=".9"/>`;
    }
  }
  return out;
}

/** Trails between nodes: a worn road under the inked status line. */
export function trailPath(a: P, b: P): string {
  const mx = (a.x + b.x) / 2;
  return `M${f(a.x)},${f(a.y)} C${f(mx)},${f(a.y)} ${f(mx)},${f(b.y)} ${f(b.x)},${f(b.y)}`;
}
export function bezierPoints(a: P, b: P, n = 10): P[] {
  const mx = (a.x + b.x) / 2, out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({ x: u * u * u * a.x + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * b.y });
  }
  return out;
}

/** Scattered props in the act's style, clear of nodes and trails. */
export function props(o: TerrainIn): string {
  const r = rng(o.seed * 7 + o.act * 13);
  const { W, H } = o;
  const near = (x: number, y: number) => o.nodes.some((p) => Math.hypot(p.x - x, p.y - y) < 30) || o.trails.some((t) => t.some((p) => Math.hypot(p.x - x, p.y - y) < 13));
  let out = "";
  const n = Math.round((W * H) / 2600);
  for (let i = 0; i < n; i++) {
    const x = 6 + r() * (W - 12), y = 10 + r() * (H - 16), k = r();
    if (near(x, y)) continue;
    const sh = `<ellipse cx="${f(x + 2)}" cy="${f(y + 1.5)}" rx="${f(4 + k * 3)}" ry="${f(2 + k)}" fill="#000" opacity=".18"/>`;
    if (o.act === 1) {
      if (k < 0.75) out += sh + `<circle cx="${f(x)}" cy="${f(y - 4)}" r="${f(4 + k * 3)}" fill="#4f7a3a"/><circle cx="${f(x - 1.5)}" cy="${f(y - 5.5)}" r="${f(2.4 + k * 1.6)}" fill="#6f9a4c"/>`;
      else out += `<path d="M${f(x - 5)} ${f(y)}l3 -3h4l3 3z" fill="#9a8a72"/>`;
    } else if (o.act === 2) {
      if (k < 0.45) out += sh + `<rect x="${f(x - 1.5)}" y="${f(y - 9 - k * 5)}" width="3" height="${f(9 + k * 5)}" fill="#bfa77c" stroke="#8a7350" stroke-width=".6"/><rect x="${f(x - 3)}" y="${f(y - 10 - k * 5)}" width="6" height="1.6" fill="#a8916a"/>`;
      else if (k < 0.8) out += `<path d="M${f(x - 5)} ${f(y)}q5 -6 10 0z" fill="#a98a5c" opacity=".8"/>`;
      else out += sh + `<path d="M${f(x)} ${f(y)}v-8M${f(x)} ${f(y - 5)}h-3v-3M${f(x)} ${f(y - 4)}h3v-3" stroke="#6f8a4a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    } else if (o.act === 3) {
      if (k < 0.7) out += sh + `<path d="M${f(x)} ${f(y - 11 - k * 4)}l${f(4 + k * 2)} ${f(8 + k * 3)}h-2l3 4h${f(-(10 + k * 4))}l3 -4h-2z" fill="#3f5a52"/><path d="M${f(x)} ${f(y - 11 - k * 4)}l2 3h-4z" fill="#f4f8fb"/>`;
      else out += `<path d="M${f(x - 5)} ${f(y)}l2 -4 4 -1 4 5z" fill="#7d8a94"/>`;
    } else {
      if (k < 0.55) out += sh + `<path d="M${f(x - 3)} ${f(y)}l1.5 ${f(-9 - k * 8)}l1.5 -2l1.5 2l1.5 ${f(9 + k * 8)}z" fill="#1e1614" stroke="#4a3430" stroke-width=".6"/>`;
      else out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1 + k)}" fill="#ff9a4a" opacity=".85"/>`;
    }
  }
  return out;
}

/** Mist over the floors you can't reach yet (from x = fogFrom to the right). */
export function fog(o: TerrainIn): string {
  if (o.fogFrom == null || o.fogFrom >= o.W) return "";
  const r = rng(o.seed + 99);
  const x0 = o.fogFrom, dark = o.act === 4;
  let out = `<rect x="${f(x0)}" y="0" width="${f(o.W - x0)}" height="${f(o.H)}" fill="url(#${dark ? "fogN" : "fogG"})"/>`;
  for (let i = 0; i < 16; i++) {
    const x = x0 + 30 + r() * (o.W - x0), y = r() * o.H, rr = 26 + r() * 34;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${dark ? "#2a1e1a" : "#f2eee6"}" opacity="${f(0.18 + r() * 0.18)}" filter="url(#mist)"/>`;
  }
  return out;
}
