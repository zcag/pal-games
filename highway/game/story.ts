// The road trip's story (DESIGN.md, "The story"): Lina texts that her parents
// are away and the house is empty, and she is 412 km off. It is told only in
// texts, on what the game already shows: the opening (surface/story.ts), the
// region's sign (the distance left, her latest text), a run's results (the
// texts it brought), a duel's card (the rival's message) and the last duel's
// end. Nothing of it is stored: what has been said comes from the best times,
// as everything else on the trip does.
import { REGIONS, sprintsOf, type Sprint } from "./sprint.ts";
import { won, bossOf, type Times } from "./trip.ts";

export const HER = "Lina";
export const TRIP_KM = 412;

export type Who = "lina" | "ines" | "mika" | "rook" | "vega" | "kaz";
/** Each person's name and who they are to her. Their pictures are surface/story/<who>.webp. */
export const PEOPLE: Record<Who, { name: string; role: string }> = {
  lina: { name: "Lina", role: "The house is empty tonight" },
  ines: { name: "Ines", role: "Her sister" },
  mika: { name: "Mika", role: "Her ex" },
  rook: { name: "Rook", role: "The neighbour" },
  vega: { name: "Vega", role: "Her cousin, with the spare key" },
  kaz: { name: "Kaz", role: "Her dad. His flight landed early" },
};

export type Text = { from: Who; text: string; to?: string }; // to: a group it went to, "family group"

/** The opening's chat: her three texts, then your reply and hers to it. */
export const OPENING = {
  hook: "you up? 👀",
  hers: ["parents are away tonight", "house is empty rn 👀", "come over?"],
  replies: [
    { you: "omw 🚗", her: "wait you're like 400 km away 😭 hurry" },
    { you: "i'm 412 km away??", her: "then you better hurry 😘" },
  ],
  title: "come over?",
  about: `${HER}'s place is ${TRIP_KM} km away. Her parents land tonight.`,
  coach: "Every stop is a stretch of the road to her. Finish them and the kilometres come down; your times earn the stars.",
};

/** What each region's duel rival says: on the card before, and after the race, won or lost. */
export const DUELS: Record<string, { who: Who; before: string; won: Text[]; lost: string }> = {
  "duel-ines": {
    who: "ines", before: "she said the house is MINE tonight. see you on the road 💅",
    won: [{ from: "ines", text: "fine. FINE. take the house. and the car, i'm not driving that thing home" }, { from: "lina", text: "did you just beat my sister 😭" }],
    lost: "lol. party's at mine. bring snacks",
  },
  "duel-mika": {
    who: "mika", before: "lol you're coming in THAT? see you there 👋",
    won: [{ from: "mika", text: "ok you're fast. tell her i said hi. actually don't" }, { from: "lina", text: "mika left me on read. iconic" }],
    lost: "beat you there. jk she won't open the door. or will she 👀",
  },
  "duel-rook": {
    who: "rook", before: "I have binoculars and your plate number.",
    won: [{ from: "rook", text: "Fine driving. I didn't see a thing." }, { from: "lina", text: "how did you get mr rook on your side 😳" }],
    lost: "Plate noted. Her father will hear about this.",
  },
  "duel-vega": {
    who: "vega", before: "first one there gets the couch 🔑",
    won: [{ from: "vega", text: "ok ok the couch is yours. key's under the mat 🔑" }, { from: "lina", text: "vega just texted me 'he's a keeper' ??" }],
    lost: "couch is mine. the drummer says hi 🥁",
  },
  "duel-kaz": {
    who: "kaz", before: "Whose car is that on our street?",
    won: [], lost: "Can I help you?",
  },
};

/** The texts a stop's first finish brings: four a region, the story moving on as the kilometres come down. */
export const TEXTS: Record<string, Text[]> = {
  // Countryside: morning, and her sister wants the house too
  "first-light": [{ from: "lina", text: "ok i can see you moving on find my friends 👀" }],
  commuters: [{ from: "lina", text: "my sister just asked if the house is free tonight" }, { from: "lina", text: "i said no. she said 'we'll see'" }],
  "farm-road": [{ from: "lina", text: "ines is getting in her car. she has a whole party planned 💀" }],
  squeeze: [{ from: "lina", text: "she's on the same road as you lol. don't let her get here first" }],
  // High Noon: the ex turns up
  "heat-haze": [{ from: "lina", text: "halfway-ish?? i'm making pasta 🍝" }],
  "old-road": [{ from: "lina", text: "mika just liked a story of mine from 2019. weird" }],
  "long-straight": [{ from: "lina", text: "mika: 'hey stranger, u home tonight?' 🙄" }],
  overtaker: [{ from: "lina", text: "he says he's 'just passing by'. he lives 300 km away mika" }],
  // Golden Hour: the neighbour has seen you
  "big-block": [{ from: "lina", text: "sun's going down. where r u" }],
  "head-on": [{ from: "lina", text: "mr rook from next door is watering his plants. at 7pm. in the dark" }],
  "the-mile": [{ from: "lina", text: "he just asked for my mum's number 'in case of burglars'" }],
  dust: [{ from: "lina", text: "pls don't park in front of his house. he WILL report it" }],
  // Grey Day: the cousin with the key
  overcast: [{ from: "lina", text: "it's raining here. drive careful. but fast" }],
  "b-road": [{ from: "lina", text: "my cousin vega has a spare key and 'might crash on the couch'" }],
  "grand-tour": [{ from: "lina", text: "vega's bringing her boyfriend. AND his band" }],
  "fog-line": [{ from: "lina", text: "if vega gets here first there will be a drum kit in the living room" }],
  // Night Run: her parents come home early
  neon: [{ from: "lina", text: "it's getting late 😴" }],
  "high-beams": [{ from: "lina", text: "their flight got moved up?? they land 23:40" }],
  "all-night": [{ from: "lina", text: "dad's at baggage claim. how far r u" }],
  graveyard: [{ from: "kaz", text: "Landed early 🙂 home in 40.", to: "family group" }, { from: "lina", text: "💀💀💀" }],
};

/** The trip's two ends, after the last duel. */
export const ENDINGS = {
  won: { eyebrow: "You made it · 23:38", title: "The lights are off.", text: `A taxi turns into the street two minutes later and keeps going. ${HER} opens the door before you knock.`, her: "that was fast 😳" },
  lost: { eyebrow: "Too slow · 23:44", title: "The porch light comes on.", text: "It's her dad, still holding his suitcase. \"Can I help you?\"", her: "too slow lol 😴" },
};
export const LAST_DUEL = "duel-kaz";

/** A stop's texts as they come: a duel's when it is won, any other's on its first finish. */
const said = (s: Sprint, times: Times) => (s.boss ? won(s.region, times) : !!times[s.id]);
const textsOf = (s: Sprint) => (s.boss ? DUELS[s.id]?.won ?? [] : TEXTS[s.id] ?? []);

/** Every stop in the trip's order, region by region (SPRINTS lists the duels apart). */
const TRIP = REGIONS.flatMap((_, r) => sprintsOf(r));
/** The road to her as stops: every region's Sprints and its duel (a Legend is a detour). */
const ROAD = TRIP.filter((s) => !s.legend);
/** How far she still is, km: the trip's length less a share for each stop of the road done. */
export const kmLeft = (times: Times) => Math.round(TRIP_KM * (1 - ROAD.filter((s) => said(s, times)).length / ROAD.length));

/** Everything said so far, in the trip's order. */
export const textsSoFar = (times: Times): Text[] => TRIP.filter((s) => said(s, times)).flatMap(textsOf);
/** Her latest text, for a region's sign: the last said in that region or before it. */
export function latest(times: Times, region: number): Text | undefined {
  const sofar = TRIP.filter((s) => s.region <= region && said(s, times)).flatMap(textsOf);
  return sofar.at(-1);
}
/** What a run brought: the texts said after it that were not before. */
export function brought(before: Times, after: Times): Text[] {
  return TRIP.filter((s) => said(s, after) && !said(s, before)).flatMap(textsOf);
}
/** What a run would bring if it finished: the stop's own texts, when they have not been said. */
export const pending = (s: Sprint, times: Times): Text[] => (said(s, times) ? [] : textsOf(s));
/** Whether the trip has ended, and how: the last duel won or not, once raced. */
export const ending = (times: Times) => (won(bossOf(4).region, times) ? ENDINGS.won : times[LAST_DUEL] ? ENDINGS.lost : null);
