// Measures every piece of music and every effect in headless Chromium, rendered
// offline through the real graph, and checks them against the mix targets.
//   bun ramparts/scripts/audio-check.ts              full run
//   bun ramparts/scripts/audio-check.ts --quick      shorter music renders
//   bun ramparts/scripts/audio-check.ts --calibrate  also rewrites LEVEL in sfx.ts so each effect peaks at its category's target
//   bun ramparts/scripts/audio-check.ts --only=sfx|music|stress|journey|sting
//   bun ramparts/scripts/audio-check.ts --wav=DIR [--items=a,b]   writes WAVs (and spectrograms when ffmpeg is there) to listen to or look at
import { chromium } from "playwright-core";

// The songs reach the page's audio graph (DOM types), so they are loaded by path: the repo's scripts typecheck without the DOM.
const { ALL_SONGS, chord, degree, tokens } = await import(`${import.meta.dir}/../surface/audio/songs.ts`);
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const args = new Set(process.argv.slice(2));
const quick = args.has("--quick"), calibrate = args.has("--calibrate");
const only = [...args].find((a) => a.startsWith("--only="))?.slice(7);

type Stats = { tail: number; peak: number; rms: number; lufs: number; dc: number; nan: number; clip: number; silent: boolean; windows?: number[]; bands?: number[]; peakVoices?: number };

const built = await Bun.build({ entrypoints: [`${import.meta.dir}/../surface/audio/measure.ts`], target: "browser", format: "esm" });
if (!built.success) { console.error(built.logs.join("\n")); process.exit(1); }
const js = await built.outputs[0].text();

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--mute-audio"] });
const page = await browser.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.setContent("<!doctype html><html><body></body></html>");
await page.addScriptTag({ content: js, type: "module" });
await page.waitForFunction(() => !!(globalThis as { __measure?: unknown }).__measure);

const fails: string[] = [], warns: string[] = [];
const call = <T>(fn: string, ...a: unknown[]) =>
  page.evaluate(([f, xs]) => (globalThis as unknown as { __measure: Record<string, (...x: unknown[]) => unknown> }).__measure[f as string](...(xs as unknown[])), [fn, a] as const) as Promise<T>;

const wavDir = [...args].find((a) => a.startsWith("--wav="))?.slice(6);
if (wavDir) {
  const items = [...args].find((a) => a.startsWith("--items="))?.slice(8).split(",");
  const music: [string, string, number, number, unknown][] = [
    ["title", "title", 1, 40, 0], ["map1", "map", 1, 30, 0], ["map2", "map", 2, 30, 0], ["map3", "map", 3, 30, 0], ["map4", "map", 4, 30, 0],
    ...[1, 2, 3, 4].map((a) => [`battle${a}`, "battle", a, 60, [[0, 0], [12, 0], [14, 0.4], [28, 0.4], [30, 0.7], [44, 0.7], [46, 1], [60, 1]]] as [string, string, number, number, unknown]),
    ...[1, 2, 3, 4].map((a) => [`boss${a}`, "boss", a, 30, 0.9] as [string, string, number, number, unknown]),
    ["shop", "shop", 1, 30, 0], ["camp", "camp", 1, 30, 0], ["victory", "victory", 1, 30, 0], ["defeat", "defeat", 1, 30, 0],
  ];
  await Bun.$`mkdir -p ${wavDir}`;
  const save = async (name: string, b64: string) => {
    const path = `${wavDir}/${name}.wav`;
    await Bun.write(path, Buffer.from(b64, "base64"));
    await Bun.$`ffmpeg -y -loglevel error -i ${path} -lavfi showspectrumpic=s=1400x500:legend=0:scale=log:fscale=log:color=intensity ${wavDir}/${name}.png`.nothrow();
    console.log(`wrote ${path}`);
  };
  for (const [name, scene, act, secs, inten] of music) if (!items || items.includes(name)) await save(name, await call<string>("musicWav", scene, act, secs, inten));
  const names = await page.evaluate(() => (globalThis as unknown as { __measure: { names: string[] } }).__measure.names);
  for (const n of names) if (items?.includes(n)) await save(`sfx-${n}`, await call<string>("sfxWav", n));
  await browser.close();
  process.exit(0);
}

const pad = (s: unknown, n: number) => String(s).padEnd(n);
const num = (x: number, n = 7) => x.toFixed(1).padStart(n);
const sanity = (name: string, s: Stats) => {
  if (s.nan) fails.push(`${name}: ${s.nan} NaN samples`);
  if (s.silent) fails.push(`${name}: silent (peak ${s.peak} dBFS)`);
  if (s.peak > -1) fails.push(`${name}: peak ${s.peak} dBFS > -1`);
  if (s.clip) fails.push(`${name}: ${s.clip} clipped samples`);
  if (Math.abs(s.dc) > 0.005) fails.push(`${name}: DC offset ${s.dc}`);
};
const t0 = performance.now();

console.log(`songs: ${(await call<string[]>("songs")).join(", ")}`);

// Harmony: the share of melody notes on the beat that are tones of the chord under them (passing tones
// between beats are normal; a tune much under 60% on the beat is fighting its chords).
{
  const pc = (x: number) => ((x % 12) + 12) % 12, out: string[] = [];
  for (const s of ALL_SONGS()) {
    let on = 0, hit = 0;
    s.melody.forEach((line: string, bar: number) => {
      const ts = tokens(line), segs = s.chords[bar].split(/\s+/).map((c: string) => chord(s.mode, c).map(pc));
      const per = ts.length === 12 ? 3 : ts.length === 6 ? 2 : ts.length / 4;
      ts.forEach((t: "-" | "." | { d: number; acc: number }, i: number) => {
        if (t === "-" || t === "." || i % per) return;
        on++;
        if (segs[Math.min(segs.length - 1, Math.floor((i / ts.length) * segs.length))].includes(pc(degree(s.mode, t.d) + t.acc))) hit++;
      });
    });
    const pct = Math.round((100 * hit) / Math.max(1, on));
    out.push(`${s.id} ${pct}%`);
    if (pct < 60) warns.push(`harmony ${s.id}: only ${pct}% of on-beat melody notes are chord tones`);
  }
  console.log(`harmony (on-beat melody notes that are chord tones): ${out.join(", ")}`);
}

// ---- music
if (!only || only === "music") {
  const secs = quick ? 12 : 20;
  const jobs: [string, string, number, number | [number, number][], boolean?][] = [
    ["title", "title", 1, 0],
    ...[1, 2, 3, 4].map((a) => [`map ${a}`, "map", a, 0] as [string, string, number, number]),
    ...[1, 2, 3, 4].flatMap((a) => [0, 0.45, 0.7, 1].map((i) => [`battle ${a} @${i}`, "battle", a, i] as [string, string, number, number])),
    ...[1, 2, 3, 4].map((a) => [`boss ${a} @0.8`, "boss", a, 0.8] as [string, string, number, number]),
    ["battle 1 low lives @0.7", "battle", 1, 0.7, true],
    ["shop", "shop", 1, 0], ["camp", "camp", 1, 0], ["victory", "victory", 1, 0], ["defeat", "defeat", 1, 0],
  ];
  console.log(`\nMUSIC (${secs} s each, measured from 1 s; RMS and LUFS integrated)`);
  console.log(`${pad("piece", 26)}   peak     rms    lufs      dc  windows(rms per 5 s)   | octave balance minus a typical mix (63..16k, dB)`);
  for (const [name, scene, act, inten, low] of jobs) {
    const s = await call<Stats>("music", scene, act, secs, inten, !!low);
    const ref = [3, 2.5, 1.5, 0, -2.5, -5, -8, -12, -19], tilt = (s.bands ?? []).map((b, i) => Math.round(b - ref[i]));
    console.log(`${pad(name, 26)}${num(s.peak)}${num(s.rms, 8)}${num(s.lufs, 8)}${s.dc.toFixed(4).padStart(8)}  ${pad((s.windows ?? []).join(" "), 22)} | ${tilt.map((x) => String(x).padStart(4)).join("")}`);
    sanity(`music ${name}`, s);
    const loud = typeof inten === "number" && inten >= 0.7 || ["title", "shop", "camp", "victory", "boss"].includes(scene);
    if (loud && (s.rms < -25 || s.rms > -16)) warns.push(`music ${name}: RMS ${s.rms} dBFS (target about -20)`);
  }
  // Intensity rising over 40 s: the layers should come in one by one.
  const ramp = await call<Stats>("music", "battle", 2, 45, [[0, 0], [8, 0], [12, 0.4], [22, 0.4], [26, 0.7], [34, 0.7], [38, 1], [45, 1]]);
  console.log(`${pad("battle 2 ramp 0>.4>.7>1", 26)}${num(ramp.peak)}${num(ramp.rms, 8)}${num(ramp.lufs, 8)}${ramp.dc.toFixed(4).padStart(8)}  ${(ramp.windows ?? []).join(" ")}`);
  sanity("music ramp", ramp);
}

// ---- stingers on the music route
if (!only || only === "music" || only === "sting") {
  console.log("\nSTINGERS (music route, alone; median peak of 3, target -8 dBFS)");
  const row: string[] = [];
  for (const n of ["wave", "elite", "boss", "victory", "defeat", "unlock", "relic", "phase"]) {
    const runs: Stats[] = [];
    for (let k = 0; k < 3; k++) { const r = await call<Stats>("sting", n); sanity(`stinger ${n}`, r); runs.push(r); }
    runs.sort((a, b) => a.peak - b.peak);
    row.push(`${pad(n, 9)}${num(runs[1].peak, 6)}`);
    if (Math.abs(runs[1].peak + 8) > 3) fails.push(`stinger ${n}: peak ${runs[1].peak} dBFS, target -8 +-3`);
  }
  console.log("  " + row.join("   "));
}

// ---- a journey through the scenes, for the crossfades and stingers
if (!only || only === "music" || only === "journey") {
  const s = await call<Stats>("journey", 75);
  console.log(`\nJOURNEY title > map > battle (rising) > boss > phase > pause > victory > shop > defeat, 75 s`);
  console.log(`  peak ${s.peak} dBFS  rms ${s.rms}  windows ${(s.windows ?? []).join(" ")}`);
  sanity("journey", s);
}

// ---- effects
if (!only || only === "sfx") {
  const { names, meta, target, level } = await page.evaluate(() => {
    const m = (globalThis as unknown as { __measure: { names: string[]; meta: Record<string, { cat: string }>; target: Record<string, number>; level: Record<string, number> } }).__measure;
    return { names: m.names, meta: m.meta, target: m.target, level: m.level };
  });
  const res: Record<string, Stats> = {};
  console.log("\nEFFECTS (alone, through the master; median peak dBFS of 5 plays)");
  const cats: Record<string, number[]> = {};
  for (const n of names) {
    // Five renders (random pitch and noise vary each play): the median by peak, checked for sanity one by one.
    const runs: Stats[] = [];
    for (let k = 0; k < 5; k++) {
      const r = await call<Stats>("sfx", n);
      sanity(`sfx ${n}`, r);
      if (r.tail > -70) fails.push(`sfx ${n}: still sounding at the end of its render (${r.tail} dB)`);
      runs.push(r);
    }
    runs.sort((a, b) => a.peak - b.peak);
    const s = runs[2];
    res[n] = s;
    (cats[meta[n].cat] ??= []).push(s.peak);
  }
  for (const c of Object.keys(cats)) {
    const ns = names.filter((n) => meta[n].cat === c);
    console.log(`\n  ${c} (target ${target[c]} dBFS)`);
    for (let i = 0; i < ns.length; i += 4) console.log("  " + ns.slice(i, i + 4).map((n) => `${pad(n, 15)}${num(res[n].peak, 6)}`).join("   "));
    const ps = cats[c], spread = Math.max(...ps) - Math.min(...ps);
    console.log(`  spread ${spread.toFixed(1)} dB (${Math.min(...ps).toFixed(1)} .. ${Math.max(...ps).toFixed(1)})`);
    if (spread > 6) fails.push(`sfx ${c}: peaks spread ${spread.toFixed(1)} dB > 6`);
  }
  if (calibrate) {
    const next: Record<string, number> = {};
    for (const n of names) {
      next[n] = Math.round(((level[n] ?? 0) + (target[meta[n].cat] - res[n].peak)) * 10) / 10;
    }
    const path = `${import.meta.dir}/../surface/audio/sfx.ts`, src = await Bun.file(path).text();
    const body = Object.entries(next).map(([k, v]) => `${k}: ${v}`);
    const lines: string[] = [];
    for (let i = 0; i < body.length; i += 8) lines.push("  " + body.slice(i, i + 8).join(", ") + ",");
    const block = `export const LEVEL: Partial<Record<Sfx, number>> = {\n${lines.join("\n")}\n};`;
    const out = src.replace(/export const LEVEL: Partial<Record<Sfx, number>> = \{[\s\S]*?\};/, block);
    await Bun.write(path, out);
    console.log("\ncalibrated: LEVEL rewritten in sfx.ts (run again to verify)");
  }
}

// ---- stress
if (!only || only === "stress") {
  const s = await call<Stats>("stress", 200, 4);
  console.log(`\nSTRESS: 200 battle events in 1 s over act-4 battle music at full intensity`);
  console.log(`  peak ${s.peak} dBFS  rms ${s.rms}  peak voices ${s.peakVoices} (cap 24)  clipped ${s.clip}  NaN ${s.nan}`);
  sanity("stress", s);
  if ((s.peakVoices ?? 0) > 24) fails.push(`stress: ${s.peakVoices} voices > 24`);
}

await browser.close();
for (const e of errors) fails.push(`page error: ${e}`);
console.log(`\n${((performance.now() - t0) / 1000).toFixed(0)} s`);
for (const w of warns) console.log(`warn  ${w}`);
for (const f of fails) console.log(`FAIL  ${f}`);
console.log(fails.length ? `\n${fails.length} failures` : "\nall checks passed");
process.exit(fails.length ? 1 : 0);
