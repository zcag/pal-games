// The story on the page (game/story.ts has what is said): the opening, played
// over the map the first time it opens (the phone lights up, her texts come
// in, you answer, the trip's sign), and the texts as the cards show them.
// Each beat of the opening waits for a key, so nothing goes by unread.
import { HER, OPENING, PEOPLE, type Text, type Who } from "../game/story.ts";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
export const face = (who: Who) => new URL(`./story/${who}.webp`, import.meta.url).href;

/** Texts as the phone shows them, one under another: who, then what. */
export const textsHtml = (texts: Text[], cls = "") => texts.length
  ? `<div class="texts ${cls}">${texts.map((t) => `<div class="txt"><img src="${face(t.from)}" alt=""><div><div class="who">${esc(PEOPLE[t.from].name)}${t.to ? ` → ${esc(t.to)}` : ""}<i>now</i></div><div class="msg">${esc(t.text)}</div></div></div>`).join("")}</div>`
  : "";

let root: HTMLElement | null = null, beat = -1, answered = false, done: () => void = () => {}, timers: number[] = [];
const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));

export const playing = () => beat >= 0;

/** Play the opening over what is on the page; `then` once it is through (or skipped). */
export function playOpening(then: () => void) {
  if (!root) {
    root = document.createElement("div");
    root.id = "story";
    document.body.append(root);
    root.addEventListener("click", (e) => {
      const r = (e.target as HTMLElement).closest<HTMLElement>("[data-reply]");
      if (r) answer(+r.dataset.reply!); else openingKey("enter");
    });
  }
  done = then;
  show(0);
}

function show(b: number) {
  timers.forEach(clearTimeout); timers = [];
  beat = b; answered = false;
  const r = root!;
  r.className = `on beat-${b}`;
  if (b === 0) r.innerHTML = `<div class="lock"><div class="clock">07:12</div><div class="day">Saturday</div>
      <div class="note"><img src="${face("lina")}" alt=""><div><b>${HER}</b><i>now</i><div>${esc(OPENING.hook)}</div></div></div></div>
    <div class="go"><kbd>enter</kbd> open</div>`;
  if (b === 1) {
    r.innerHTML = `<div class="phone"><div class="ph-head"><img src="${face("lina")}" alt=""><div><b>${HER}</b><span>online</span></div></div><div class="feed"></div><div class="replies"></div></div>`;
    let t = 300;
    for (const line of OPENING.hers) { later(t, () => typed(line)); t += 1500; }
    later(t, () => {
      r.querySelector(".replies")!.innerHTML = OPENING.replies.map((x, i) => `<button data-reply="${i}"><kbd>${i + 1}</kbd>${esc(x.you)}</button>`).join("");
    });
  }
  if (b === 2) r.innerHTML = `<div class="sign title"><div class="eyebrow">Highway · the road trip</div><div class="big">${esc(OPENING.title)}</div>
      <p>${esc(OPENING.about)}</p>
      <div class="facts"><div><b>412 km</b><span>to her door</span></div><div><b>5</b><span>stretches</span></div><div><b>23:40</b><span>they land</span></div></div>
      <div class="getin"><kbd>enter</kbd>Get in the car</div></div>`;
}

/** Her next text in the chat: dots first, as if typed. */
function typed(line: string, me = false) {
  const feed = root!.querySelector(".feed")!;
  if (me) { feed.insertAdjacentHTML("beforeend", `<div class="b me">${esc(line)}</div>`); return; }
  feed.insertAdjacentHTML("beforeend", `<div class="b her typing"><i></i><i></i><i></i></div>`);
  const dots = feed.lastElementChild!;
  later(900, () => { dots.outerHTML = `<div class="b her">${esc(line)}</div>`; });
}

function answer(i: number) {
  if (beat !== 1 || answered || !root!.querySelector(".replies button")) return;
  answered = true;
  const x = OPENING.replies[i];
  root!.querySelector(".replies")!.innerHTML = "";
  typed(x.you, true);
  later(500, () => typed(x.her));
  // her answer read, Enter goes on
  later(1700, () => root!.insertAdjacentHTML("beforeend", `<div class="go"><kbd>enter</kbd> go</div>`));
}

/** A key while the opening plays: Enter goes on (or answers), 1 and 2 answer her. True when it was the opening's. */
export function openingKey(k: string) {
  if (beat < 0) return false;
  if (beat === 1) {
    if (answered) { if ((k === "enter" || k === " ") && root!.querySelector(".go")) show(2); }
    else if (k === "1" || k === "2") answer(+k - 1);
    else if (k === "enter" || k === " ") answer(0);
    return true;
  }
  if (k === "enter" || k === " ") {
    if (beat === 0) show(1);
    else { timers.forEach(clearTimeout); beat = -1; root!.className = ""; root!.innerHTML = ""; done(); }
  }
  return true;
}
