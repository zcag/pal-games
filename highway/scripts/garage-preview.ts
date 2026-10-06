// The garage on its own (surface/garage.ts): a realistic mix of bays, arrows to look round, enter to reveal.
// Serve highway/ and open /scripts/garage-preview.html (`?focus=<id>` to start on a bay).
import { Renderer } from "../surface/render.ts";
import { Garage, type Bay } from "../surface/garage.ts";
import { CARS, classOf } from "../game/content.ts";

// the page's files (cars/, env/) are fetched relative to the page, as from surface/index.html
history.replaceState(null, "", `/surface/garage-preview${location.search}`);
const $ = (id: string) => document.getElementById(id)!;
const q = new URLSearchParams(location.search);
const r = new Renderer($("view") as HTMLCanvasElement);
const g = new Garage(r);
const OPENS = ["High Noon", "Coast Road", "Night Run", "The Pass", "Desert"];
const bays: Bay[] = CARS.map((c, i) => ({ id: c.id, paint: c.paint, state: i < 3 ? "owned" : i < 7 ? "for-sale" : "locked" }));
const tagOf = (b: Bay, i: number) => b.state === "owned" ? "Yours" : b.state === "for-sale" ? `$${CARS[i].price.toLocaleString("en-US")}` : i % 3 === 1 ? `Win it from Ines` : `Opens with ${OPENS[i % OPENS.length]}`;

let at = Math.max(0, CARS.findIndex((c) => c.id === q.get("focus")));
g.focus(CARS[at].id, true);
const tags = bays.map((b, i) => { const d = document.createElement("div"); d.className = "tag"; d.textContent = tagOf(b, i); $("tags").append(d); return d; });

function sign() {
  const c = CARS[at], b = bays[at];
  $("name").textContent = c.name;
  $("state").textContent = b.state === "owned" ? "Yours" : b.state === "for-sale" ? "For sale" : "Locked";
  $("cls").textContent = classOf(c).name;
  $("price").textContent = `$${c.price.toLocaleString("en-US")}`;
}
sign();

const go = (i: number) => { at = (i + CARS.length) % CARS.length; g.focus(CARS[at].id); sign(); };
const reveal = () => { const b = bays[at]; const p = g.reveal(b.id); b.state = "owned"; tags[at].textContent = "Yours"; sign(); return p; };
addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") go(at + 1);
  if (e.key === "ArrowLeft") go(at - 1);
  if (e.key === "Enter") reveal();
});

let last = performance.now(), frames = 0, worst = 0;
function loop() {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
  worst = Math.max(worst, now - last);
  last = now;
  g.frame(dt);
  frames++;
  for (const l of g.labels()) {
    const i = bays.findIndex((b) => b.id === l.id), t = tags[i];
    t.className = `tag ${bays[i].state === "locked" ? "locked" : bays[i].state === "for-sale" ? "sale" : ""}`;
    t.style.opacity = l.visible && i !== at ? "1" : "0";
    t.style.left = `${l.x}px`; t.style.top = `${l.y}px`;
  }
  requestAnimationFrame(loop);
}
const t0 = performance.now();
await g.build(bays);
(window as unknown as { gp: unknown }).gp = { g, go, reveal, r, ready: true, built: performance.now() - t0, frames: () => frames, worst: () => { const w = worst; worst = 0; return w; } };
loop();
