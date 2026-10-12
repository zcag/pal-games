// The story on the page (game/story.ts has what is said): its scenes, played
// over whatever is up, and the texts as the cards show them. A scene is beats,
// each a full screen: the phone lighting up, a chat typed in (your answer
// picked, a notification dropping in after), a sign. The opening plays over
// the map the first time it opens; the ending over the last duel's results
// when it is won; the epilogue after it, or after whichever run took the last
// star. Each beat waits for a key, so nothing goes by unread.
import { HER, OPENING, ARRIVAL, ENDINGS, EPILOGUE, PEOPLE, TRIP_KM, type Text, type Who } from "../game/story.ts";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
export const face = (who: Who) => new URL(`./story/${who}.webp`, import.meta.url).href;

/** Texts as the phone shows them, one under another: who, then what. */
export const textsHtml = (texts: Text[], cls = "") => texts.length
  ? `<div class="texts ${cls}">${texts.map((t) => `<div class="txt"><img src="${face(t.from)}" alt=""><div><div class="who">${esc(PEOPLE[t.from].name)}${t.to ? ` → ${esc(t.to)}` : ""}<i>now</i></div><div class="msg">${esc(t.text)}</div></div></div>`).join("")}</div>`
  : "";

/** A chat beat: the lines typed in one by one, then your answer (the reply from the first line's sender), then a
 *  notification from someone else. In a `group`, each line has its sender's face and name. */
type Chat = { lines: Text[]; replies?: { you: string; her: string }[]; then?: Text; group?: boolean };
type Beat = { html: string; chat?: Chat; cls?: string };

let root: HTMLElement | null = null, beats: Beat[] = [], beat = -1, ready = false, done: () => void = () => {}, timers: number[] = [];
const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));

export const playing = () => beat >= 0;

function play(list: Beat[], then: () => void) {
  if (!root) {
    root = document.createElement("div");
    root.id = "story";
    document.body.append(root);
    root.addEventListener("click", (e) => {
      const r = (e.target as HTMLElement).closest<HTMLElement>("[data-reply]");
      if (r) answer(+r.dataset.reply!); else storyKey("enter");
    });
  }
  beats = list; done = then;
  show(0);
}

const go = (label: string) => `<div class="go"><kbd>enter</kbd> ${label}</div>`;
const phone = (head: string) => `<div class="phone"><div class="ph-head">${head}</div><div class="feed"></div><div class="replies"></div></div>`;
const person = (who: Who, status: string) => `<img src="${face(who)}" alt=""><div><b>${PEOPLE[who].name}</b><span>${status}</span></div>`;
const lock = (clock: string, day: string, t: Text, label: string) => `<div class="lock"><div class="clock">${clock}</div><div class="day">${day}</div>
    <div class="note"><img src="${face(t.from)}" alt=""><div><b>${esc(PEOPLE[t.from].name)}</b><i>now</i><div>${esc(t.text)}</div></div></div></div>${go(label)}`;
/** A sign: eyebrow, a big line, words, three numbers and the key that ends it; `extra` goes under the words. */
const sign = (eyebrow: string, big: string, words: string, facts: [string, string][], key: string, extra = "") => `<div class="sign title"><div class="eyebrow">${eyebrow}</div><div class="big">${esc(big)}</div>
      <p>${words}</p>${extra}
      <div class="facts">${facts.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("")}</div>
      <div class="getin"><kbd>enter</kbd>${key}</div></div>`;

function show(b: number) {
  timers.forEach(clearTimeout); timers = [];
  beat = b; ready = false;
  const x = beats[b], r = root!;
  r.className = `on ${x.cls ?? ""}`;
  r.innerHTML = x.html;
  if (!x.chat) { ready = true; return; }
  const c = x.chat;
  let t = 300;
  for (const line of c.lines) { later(t, () => typed(line, c.group)); t += 1500; }
  later(t, () => {
    if (c.replies) r.querySelector(".replies")!.innerHTML = c.replies.map((y, i) => `<button data-reply="${i}"><kbd>${i + 1}</kbd>${esc(y.you)}</button>`).join("");
    else after(c, 0);
  });
}

/** A chat's end, once the typing is through: the notification, then Enter goes on. */
function after(c: Chat, wait: number) {
  if (c.then) later(wait, () => root!.querySelector(".phone")!.insertAdjacentHTML("afterbegin", `<div class="ping">${textsHtml([c.then!])}</div>`));
  later(wait + (c.then ? 1600 : 0), () => { root!.insertAdjacentHTML("beforeend", go("go")); ready = true; });
}

/** A text in the chat: dots first, as if typed. Yours is a string, there at once. */
function typed(line: Text | string, group = false) {
  const feed = root!.querySelector(".feed")!;
  if (typeof line === "string") { feed.insertAdjacentHTML("beforeend", `<div class="b me">${esc(line)}</div>`); return; }
  const who = group ? `<img src="${face(line.from)}" alt="">` : "";
  const dots3 = "<i></i><i></i><i></i>";
  feed.insertAdjacentHTML("beforeend", group ? `<div class="b her typing in-group">${who}<span class="dots">${dots3}</span></div>` : `<div class="b her typing">${dots3}</div>`);
  const dots = feed.lastElementChild!;
  later(900, () => { dots.outerHTML = `<div class="b her${group ? " in-group" : ""}">${who}<div>${group ? `<small>${esc(PEOPLE[line.from].name)}</small>` : ""}${esc(line.text)}</div></div>`; });
}

function answer(i: number) {
  const c = beats[beat]?.chat;
  if (!c?.replies || !root!.querySelector(".replies button")) return;
  const x = c.replies[i];
  root!.querySelector(".replies")!.innerHTML = "";
  typed(x.you);
  later(500, () => typed({ from: c.lines[0].from, text: x.her }));
  after(c, 1700);
}

/** A key while a scene plays: Enter goes on (or answers), 1 and 2 answer. True when it was the scene's. */
export function storyKey(k: string) {
  if (beat < 0) return false;
  const enter = k === "enter" || k === " ";
  if (!ready) {
    if (k === "1" || k === "2") answer(+k - 1); else if (enter) answer(0);
    return true;
  }
  if (!enter) return true;
  if (beat + 1 < beats.length) { show(beat + 1); return true; }
  timers.forEach(clearTimeout); beat = -1; root!.className = ""; root!.innerHTML = ""; done();
  return true;
}

// ---------------------------------------------------------------- the scenes

/** The opening: her text on the lock screen, the chat, the trip's sign. */
export function playOpening(then: () => void) {
  play([
    { html: lock("07:12", "Saturday", { from: "lina", text: OPENING.hook }, "open") },
    { html: phone(person("lina", "online")), chat: { lines: OPENING.hers.map((text) => ({ from: "lina", text })), replies: OPENING.replies } },
    { html: sign("Highway · the road trip", OPENING.title, esc(OPENING.about), [[`${TRIP_KM} km`, "to her door"], ["5", "stretches"], ["23:40", "they land"]], "Get in the car") },
  ], then);
}

/** The trip in numbers, for the ending and the epilogue (surface/main.ts counts them). */
export type TripFacts = { time: string; stars: number; max: number; cars: number; allCars: number; legends: number; allLegends: number; km: number; misses: number; paint: string; paintName: string };
const of = (n: number, all: number) => `${n}<small>/${all}</small>`;

/** The ending: the arrival, her chat as you pull up, the trip in numbers. */
export function playEnding(trip: TripFacts, then: () => void) {
  const e = ENDINGS.won, left = trip.max - trip.stars;
  play([
    { cls: "arrive", html: `<div class="arrival"><div class="eyebrow">${e.eyebrow}</div><div class="big">${esc(e.title)}</div><p>${esc(e.text)}</p></div>${go("go")}` },
    { html: phone(person("lina", "online")), chat: { lines: ARRIVAL.hers.map((text) => ({ from: "lina", text })), replies: ARRIVAL.replies, then: ARRIVAL.then } },
    { html: sign("Highway · the road trip", "You made it.", `${TRIP_KM} km to ${HER}'s door, and your best times drive it in <b>${trip.time}</b>.`,
      [[of(trip.stars, trip.max), "stars"], [of(trip.cars, trip.allCars), "cars"], [of(trip.legends, trip.allLegends), "Legends"]],
      left ? "Keep driving" : "The morning after",
      left ? `<p class="left">${left} star${left === 1 ? "" : "s"} still out there. Take every one and there is a morning after.</p>` : "") },
  ], then);
}

/** The epilogue, every star: the morning after, everyone from the road in one chat, the whole road in numbers. */
export function playEpilogue(trip: TripFacts, then: () => void) {
  const faces = (["ines", "mika", "rook", "vega", "kaz"] as Who[]).map((w) => `<img src="${face(w)}" alt="">`).join("");
  play([
    { html: lock("09:14", "Sunday", { from: "lina", text: "wake up. everyone's in the group chat 💀" }, "open") },
    { html: phone(`<div class="faces">${faces}</div><div><b>${EPILOGUE.group}</b><span>6 people</span></div>`), chat: { lines: EPILOGUE.lines, group: true } },
    { cls: "whole", html: sign("Every star", "The whole road.", "Every stop, every duel and every Legend, three stars each.",
      [[`${trip.max}`, "stars"], [trip.km.toLocaleString("en-US"), "km driven"], [trip.misses.toLocaleString("en-US"), "near misses"]], "Back on the road",
      `<div class="paint-won"><i style="background:${trip.paint}"></i>${esc(trip.paintName)} is yours, for every car</div>`) },
  ], then);
}

/** The ending asked for before it is earned: where it is, no more. */
export function playNotYet(then: () => void) {
  play([{ html: sign("The ending", "Not yet.", `It is at ${HER}'s door, at the end of Night Run. Beat Kaz there.`, [[`${TRIP_KM} km`, "to her door"], ["5", "stretches"], ["23:40", "they land"]], "Back") }], then);
}
