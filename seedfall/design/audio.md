# Seedfall: audio

Owner: audio. Answers DESIGN R9. Everything here is synthesised with WebAudio
at runtime: no samples, no files. The code lives in `src/surface/audio/`; it
listens to `GameEvent`s and reads `PodView` and `WorldData` every frame. It
never reaches into `src/game/`.

Where this file disagrees with core-loop's Juice table, this file wins for
sound only. The only real change: the pickup streak climbs **pentatonic
steps**, not semitones (R9 asks for a pentatonic ladder, and semitone steps
clash with the music).

Notation used below:

- `osc(type, f)`: an OscillatorNode. `noise(white|pink|brown)`: a looping
  buffer from section 9. `BP/LP/HP(f, Q)`: BiquadFilter. `env(a, d, s, r)`:
  attack, decay and release in ms, sustain as a level; one-shots are
  `env(a, d)`, which decays exponentially to silence.
- Gains are dB relative to the voice's bus at full slider. "-6 dB per tile"
  means per tile of distance from the pod.
- `p` is dig progress 0..1 (`PodView.dig.progress`). `vy` is in tiles/s,
  positive down. `k` is the load factor `PodView.load`.
- Positional sounds pan `clamp((x - pod.x) / 8, -0.8, 0.8)` and lose 3 dB per
  tile beyond 1 tile, unless the sound says otherwise.

---

## 1. Files

| File | Holds |
| --- | --- |
| `graph.ts` | the context, the buses, the earth filter and reverb, the limiter, the settings, suspend and resume |
| `kit.ts` | noise buffers, IRs, the strip pool, envelope helpers, `bell`, `pluck`, `thump`, `crack` and the other building blocks |
| `drill.ts` | the drill voice (one persistent voice, nine families), breaks, clanks |
| `pod.ts` | engine, tread, wind, hull, heat, warnings, lift, teleport, scanner |
| `world.ts` | hazards, positional tells, cave ambience per biome, creatures |
| `town.ts` | town ambience, sale, shop, research, achievements, toasts, buttons |
| `score.ts` | the per-biome song data (keys, chords, patterns, motifs) |
| `music.ts` | the sequencer, the instruments, layers, tension, crossfades, cues |
| `events.ts` | the one switch from `GameEvent` to sounds (section 11) |

---

## 2. The mix

### 2.1 Buses

```
music ──┐
ambience┤→ earth (LP + low shelf) ─┐
        └→ reverb send ────────────┤
effects ─────────→ reverb send ────┤→ glue comp → master gain → limiter → out
tells ───────────(dry, never ducked)┤
ui ────────────────────(dry)────────┘
```

| Bus | Holds | Nominal peak (dBFS, sliders at 100) | Slider |
| --- | --- | --- | --- |
| tells | every hazard tell and warning: gas hiss and fuse, boulder rattle and wobble, arc charge, lava-pocket crackle, the fuel/hull/heat warnings, cargo full | -8 | effects (with the floor below) |
| effects | drill, breaks, pod, pickups, blasts, impacts, scanner, fanfares | -10 (blasts -3) | effects |
| ui | menus, sale, shop, toasts, stingers | -16 | effects |
| ambience | cave beds, creatures, town ambience | -26 | effects |
| music | the score | -18 peak, about -28 RMS | music |

**Mix budget, the firm rule.** At any moment a tell at full proximity must
read at least **6 dB above** the music bus's short-term level (300 ms RMS).
It is held three ways:

1. Tells are on their own bus, which nothing ducks.
2. While any tell voice sounds above -40 dB, the music bus ducks by
   **-6 dB** (attack 30 ms, release 600 ms) and gets a high shelf of -6 dB at
   5 kHz (the gas hiss lives up there; hats and bells must not mask it).
3. A slider floor: tells gain = `effects`, but when `effects < music` the
   tells bus takes `music - 6 dB`, unless effects is at 0, which the player
   chose. A player who turns effects down to enjoy the score still hears gas.

### 2.2 Ducking

| Trigger | Music | Ambience | Effects | Shape |
| --- | --- | --- | --- | --- |
| any tell active | -6 dB, shelf -6 at 5 kHz | -4 dB | 0 | 30 ms in, 600 ms out |
| blast within 6 tiles | -10 dB | -10 dB | 0 | 10 ms in, 1.2 s out |
| pod hit by a blast (muffled ears) | master LP 500 Hz Q 0.7, then back to 20 kHz | | | jump in 15 ms, hold 500 ms, open over 700 ms; plus a 4 kHz sine at -32 dB fading over 1.5 s |
| jackpot / artifact fanfare | -8 / -12 dB | -6 dB | -3 dB | 80 ms in, out after the fanfare over 1.5 s |
| sale chord | -6 dB | | | for the chord's length |
| biome stinger (first entry) | handled by the crossfade (section 8.7) | | | |
| wreck | master LP sweep 20 kHz to 400 Hz and -12 dB over the 1.2 s slow-mo, back over 1.5 s | | | matches the slow-mo |
| teleport channel | -3 dB per 0.25 of channel, max -9 dB | | | follows `PodView.channel` |

Ducks use one `GainNode` per bus driven by `setTargetAtTime`; overlapping
ducks take the deepest, not the sum.

### 2.3 Master chain

- **Glue comp:** DynamicsCompressor threshold -16 dB, ratio 2.5, knee 6,
  attack 10 ms, release 180 ms. Holds the drill and engine together.
- **Limiter:** DynamicsCompressor threshold -3 dB, ratio 20, knee 0, attack
  1 ms, release 80 ms. The big charge at point blank is the loudest event;
  it must reach the limiter with at most 4 dB of gain reduction (check it in
  the audio debug overlay, section 10).

### 2.4 Settings

Settings has **Master**, **Music** and **Effects** sliders (0-100) and a
**Mute** toggle, all live while playing; `M` toggles mute anywhere. Slider to
gain: `v = 0` is silence, else `dB = -40 x (1 - v/100)^1.6`; defaults master
80, music 60, effects 80. Mute ramps master to 0 over 40 ms (never a jump).
"Quiet when the window is in the background" is on by default: on
`visibilitychange` hidden, ramp master to 0 over 200 ms, then
`ctx.suspend()`; on return, resume and ramp back over 300 ms. The context is
created on the first key press or click (autoplay rules); the menu loop starts
then. All four values are saved with the settings.

### 2.5 Underground: the earth filter and the room

Music and ambience pass through an **earth filter**, a 12 dB/oct low-pass
plus a low shelf, set by the pod's row every frame (`setTargetAtTime`, tau
250 ms):

| Row | LP cutoff | Low shelf at 200 Hz | Why |
| --- | --- | --- | --- |
| above 0 (town) | 20 kHz (bypass) | 0 | open air |
| 0 to 30 | 20 kHz to 9 kHz | 0 to +2 dB | the sky closes over you |
| 30 to 400 | 9 kHz to 3.2 kHz (log scale) | +2 to +4 dB | the weight of rock |
| 400 to 680 | 3.2 kHz | +4 dB | held: Magma and Ruins already sound heavy |
| 680 to 770 | 3.2 kHz to 14 kHz | +4 to +6 dB | the Core inverts like its light: bright, huge, close |

Effects and tells do **not** pass the earth filter (the pod and the hazards
must stay crisp); effects get the room through the reverb send, tells and ui stay dry.

**The room.** Three generated IRs (section 9): *tunnel* 0.6 s, *cave* 1.6 s,
*hollow* 3.2 s. Two ConvolverNodes run at once and crossfade (equal power,
1.5 s) when the room changes. Every 0.25 s the surface counts open tiles in a
radius of 4 around the pod (`mat == 0`): under 12 is tunnel, 12-30 cave, over
30 hollow. The Fungal great hollow, the Ruins rooms and the Core chamber force
hollow. Send levels: effects -14 dB, ambience -8 dB, music -12 dB in the
music's own reverb (section 8.2), not this one. Town: send 0.

**Surfacing** (`surface`): the earth filter opens to bypass over **400 ms**
(the same 0.4 s the light floods in), the reverb send drops to -40 dB over
600 ms, the mine ambience fades out over 600 ms, the town ambience in over
400 ms, and the home sting plays (section 8). **Diving** (`dive`): the
reverse over 1.5 s, so the first rows still feel near the sky.

---

## 3. Drilling

### 3.1 The drill voice

One persistent voice, built at boot and never torn down: a **motor** layer
shared by every material plus a **family** layer per material sound family.

- **Motor:** `osc(saw, fm)` + `osc(saw, fm x 2.01)` at -8 dB, through
  `LP(700, 1.2)`, at -22 dB. `fm = 92 x 2^(floor(drillLevel / 3) / 12) Hz`,
  so the drill sounds a little higher every third upgrade.
- **Spin-up** on `dig_start`: motor gain env 80 ms, pitch from 0.7 fm to fm
  over 120 ms. **Spin-down** on `dig_cancel` or a break with no next dig
  within 120 ms: pitch glides down an octave over 250 ms, gain releases over
  250 ms.
- **Pitch over the dig:** every oscillator frequency, every filter centre
  and every grain rate in the voice is multiplied by `1 + 0.10 p` (core-loop:
  pitch up 10% over the dig), smoothed with tau 30 ms.
- **Family change** (a new `dig_start` with another family): equal-power
  crossfade 30 ms; the motor keeps running.
- **Ore tiles:** add a **singing ring**: `osc(sine, f_tier)` with 8 Hz
  tremolo depth 30%, gain rising from -34 dB at p = 0 to -22 dB at p = 1,
  where `f_tier` is the ore's chime note one octave down (section 4). The ore
  is heard before it breaks.
- Digs shorter than 120 ms skip the loop and play only the break.

### 3.2 Families

Families come from `Material.sound`. Gains are the family layer at p = 0.

| Family | Materials | Loop recipe | Break tail (after the shared crack) |
| --- | --- | --- | --- |
| **soft** | dirt, loam, sand, caches | `noise(brown) → LP(700, 0.7)` at -16 dB, amplitude grains at 14 Hz with random depth 0.4-1.0 (crumbs) | `noise(brown) → LP 900 to 300 Hz over 120 ms`, env(2, 120); `thump(90 to 50 Hz, 80 ms)` -10 dB |
| **wet** | clay, mud | `noise(pink) → BP(400, 3)` with the BP centre swept +-150 Hz by a 5 Hz LFO (squelch) at -17 dB; plus suck blips `osc(sine, 180 to 120 Hz)` env(3, 40) at a random 3-5 Hz, -22 dB | `noise(pink) → BP 800 to 200 Hz` over 150 ms, Q 4, -8 dB |
| **grit** | typical rock of every biome, stone, pressure stone | `noise(white) → HP(300) → BP(1800, 1.2)` at -16 dB, square AM at 22 Hz depth 40% (the teeth); body `noise(brown) → LP(250)` at -22 dB | `noise(white) → BP(1200, 0.8)` env(1, 180) -6 dB; `thump(70 Hz, 120 ms)` -8 dB |
| **hard** | each biome's dense material, ironstone neighbours, boulders | grit with BP 3200 and AM 30 Hz, -15 dB; metallic overtone `osc(sine, 2350)` + `osc(sine, 3410)` at -26 dB with random amplitude flicker (12 Hz noise); spark crackle: 1 ms clicks `HP(4000)`, Poisson 25/s, -24 dB | grit tail +2 dB, plus `bell(2350, partials 1/1.47/2.1, 220 ms)` -18 dB |
| **glass** | crystal rock, crystal lining | grit at -19 dB; tinks: `osc(sine)` on a random note of the biome's chime pentatonic in octaves 6-7, env(2, 180), every 90-160 ms, -22 dB (the walls answer the drill, in key) | 3-5 tinks in a quick falling run (25 ms apart), plus a glass shatter `noise(white) → HP(3000)` env(1, 90) -12 dB |
| **squish** | fungal mat, mushroom flesh | `noise(pink) → LP(900)`, a formant `BP(300 to 700 Hz, 4)` swept by a 3 Hz LFO, -18 dB; bubbles `osc(sine, 300 to 500 Hz over 30 ms)` at a random 6/s, -24 dB | wet pop: `osc(sine, 600 to 150 Hz over 60 ms)` -10 dB + `noise(pink) → BP(500)` env(5, 200) -14 dB |
| **rumble** | basalt, obsidian | `noise(brown) → LP(180)` -14 dB; sub `osc(sine, 45)` AM 9 Hz depth 50%, -18 dB; grit at BP 900, -22 dB; ember crackle clicks 12/s, -26 dB | `thump(55 to 30 Hz, 300 ms)` -6 dB, `noise(brown) → LP(200)` env(5, 1000) -14 dB (the deep tail) |
| **chisel** | ruin brick, vault seals | discrete knocks at 6 Hz (rising with p like the rest): each `noise(white) → BP(2200, 4)` env(1, 25) -12 dB + `osc(sine, 520)` env(1, 30) -16 dB, alternate knocks +-5% pitch; grit bed BP 900 at -26 dB | 3 knocks in 90 ms, then `noise(pink) → LP(1500)` env(2, 250) -12 dB (falling chips) |
| **hum** | core shell, core glass, heartrock | grit at -18 dB; the hum: `osc(sine, r)`, `osc(sine, 2r + 0.7 Hz)`, `osc(sine, 3r - 0.5 Hz)` at -16/-20/-26 dB (the detune beats), through `BP(2r, 8)`; `r` is the Core's root (A1, 55 Hz). The hum swells +8 dB over the dig | `bell(110, partials 1/2/3/4.2, 1400 ms)` -10 dB: the shell rings like the Seed |

**The shared crack** opens every break: `noise(white) → HP(2000)` env(0.5, 8)
at -6 dB, then the family tail. Breaks by hard materials add +2 dB. Each break
picks a random start offset in the noise buffer and +-3% pitch, so no two
breaks repeat. Breaks `by: "blast"` play no crack (the blast covers them);
`by: "drone"` play at -14 dB; `by: "fall"` (a boulder settling) use the
boulder land sound.

### 3.3 Too hard and unbreakable

- **Too hard, the dull clank:** `osc(sine, 180)` + `osc(sine, 270)` at -6 dB,
  env(1, 120), pitch dropping 10% over the 120 ms; a click `noise(white) →
  BP(1000, 2)` env(0.5, 15); all through `LP(1500)`; -8 dB. Dead and short:
  "not yet".
- **Unbreakable, the ring:** an inharmonic bell at 620 Hz, partials
  `1, 2.76, 5.40, 8.93` with decays 900/500/300/150 ms and gains
  0/-6/-12/-18 dB, plus the same click; -8 dB. Bright and long: "never".
- Panned to the side pressed. At most one clank per 400 ms however long the
  key is held.

---

## 4. Ore pickups

### 4.1 The chime ladder

Each biome has a **chime pentatonic**: five notes drawn from its mode
(section 8.1), so a chime is always consonant with the music playing.
`index = (tier - 1) + streak`, `note(index) = base x 2^(pent[index mod 5] +
12 x floor(index / 5)) / 12` with `pent` the biome's five offsets in
semitones. Index is capped at **15** (three octaves over base); streak steps
past the cap become a **harmony** note instead: the note two ladder steps
below plays with it at -6 dB. The top stays bright but never shrill.

Tiers also change the timbre, so tier reads even when two tiers share a note
across biomes:

| Tier | Voice | Envelope | Extra |
| --- | --- | --- | --- |
| 1-3 | `osc(sine, f)` + `osc(triangle, 2f)` -14 dB | env(2, 180) | none |
| 4-6 | FM bell: carrier `f`, modulator `2f`, index 1.5 falling to 0 over 120 ms | env(2, 220) | a fifth above at -12 dB |
| 7-9 | the tier 4-6 bell | env(2, 320) | octave shimmer `osc(sine, 4f)` -18 dB; reverb send +6 dB |
| 10-12 | the bell plus `osc(sine, 3f)` -14 dB | env(2, 450) | a single echo at 180 ms, -10 dB, panned opposite |

Pickup chimes sit at -14 dB on effects; notes above index 10 lose 1 dB per
step (equal loudness). A `pickup` with `count > 1` plays its notes 50 ms
apart, each one streak step up.

### 4.2 The streak

A pickup within **1.5 s** of the last raises `streak` by 1, up to +7; 1.5 s
without one resets it to 0. The streak climbs ladder steps, never semitones,
so a long seam is a rising pentatonic run. At streak 7 the chime also gets a
quiet `noise(white) → HP(8000)` sparkle env(1, 60) at -24 dB.

### 4.3 Fanfares and thuds

- **Jackpot** (`find` with a jackpot): 2.4 s. A stab of the biome's I chord on
  the music's pad instrument (section 8.2) at -8 dB, a sub `thump(50 Hz,
  400 ms)` -6 dB, then 8 ladder notes up from the jackpot's tier at 60 ms
  each on the 10-12 bell, then a held shimmer (the top two notes, 1.2 s
  release). Music ducks -8 dB.
- **Artifact** (`find` with an artifact): 3.5 s, hushed, not triumphant. A
  drone of the biome's root and fifth on two sines (env(400, 0, 1, 1500))
  under the **Seed motif** (section 8.4) played once on a glass bell (FM,
  modulator ratio 3.5, index 2, env(3, 900)), with long reverb. Music ducks
  -12 dB. The first find of an ore type plays the ordinary chime plus one
  extra ladder note on top at -6 dB.
- **Artifact near** (world.md): within 10 tiles of an unfound artifact, the
  first two notes of the Seed motif on the glass bell every 4 s; gain from
  -34 dB at 10 tiles to -18 dB at 1, pitch up one ladder step per 3 tiles
  closer. Ambience bus. Nothing else in the game uses a two-note pattern
  every 4 s, so it stays special.
- **Cargo full** (`cargo_full`): `thump(70 to 45 Hz, 180 ms)` -6 dB with
  `noise(brown) → LP(300)` env(2, 80), then two muted blips `osc(square,
  110) → LP(600)` env(2, 60), 90 ms apart. Tells bus. Once per fill; the
  rules already stop repeating it.
- **Nugget dropped** (`nugget`): a small bounce, `osc(sine, 900 to 600 Hz)`
  env(1, 50), then the same at -6 dB 140 ms later.

---

## 5. The pod

### 5.1 Continuous voices (read from PodView each frame)

| Voice | When | Recipe | Driven by |
| --- | --- | --- | --- |
| **Idle hum** | fuel > 0 | `osc(triangle, 55)` → `LP(300)`, -34 dB; a slow 0.2 Hz wobble of +-3 cents | at 0 fuel it winds down an octave over 1.2 s and stops (stranded) |
| **Thrust** | `thrusting` | rocket: `noise(pink) → BP(fc, 0.9) → LP(4000)` at -16 dB; turbine: `osc(saw, f0)` + `osc(saw, f0 + 1.5%)` → `LP(4 f0, 1.5)` at -20 dB | `f0 = 70 + 9 x max(0, -vy)` Hz, cap 340; `fc = 300 + 2 f0`; on: 40 ms, off: 120 ms release with a puff (`noise(pink) → LP(600)` env(2, 150) -20 dB). Engine level adds +1.5 dB and +10% LP per 4 levels |
| **Strain** | thrusting and `k > 4` | `osc(saw, 1.5 f0 + 3 Hz)` (beating against the turbine) and `noise(pink) → BP(180, 3)`; random AM at 11 Hz depth 30% (the flame flickers) | gain from -40 dB at k = 4 to -16 dB at k = 8 |
| **Tread** | grounded and `abs(vx) > 0.2` | clacks `noise(white) → BP(900, 3)` env(1, 6) at `3 x abs(vx)` per second; motor `osc(saw, 55 x (1 + abs(vx) / 8)) → LP(400)` | -24 dB; 60 ms release on stop, plus a short brake squeak `osc(sine, 1800 to 1500)` env(5, 80) -30 dB if `abs(vx) > 4` |
| **Fall wind** | `vy > 9` and not in an auto-braked drop (Down held in an open column) | `noise(white) → BP(600 + 120 (vy - 9), 6)` | gain -40 dB at vy 9 to -14 dB at 12: the whistle says "this will hurt" (core-loop). In the auto-braked drop: a soft rush instead, `noise(pink) → LP(300 + 40 vy)`, -26 dB, no whistle (it does not hurt) |
| **Heat ticks** | `heat > 0.75` | metal ticks: click env(0.5, 3) into `BP(3500, 10)` ringing 25 ms, -18 dB, random interval with mean 600 ms at 0.75 to 120 ms at 1.0 | at 1.0 add a boil hiss `noise(pink) → BP(2500, 1)` -24 dB. Tells bus |
| **Teleport channel** | `channel > 0` | `osc(saw, f)` + `osc(saw, f x 1.006)` → `BP(2f, 4)`, tremolo rate `4 + 12 c` Hz; shimmer `noise(white) → HP(5000)` | `f = 110 x 8^c` (110 to 880 Hz), gain -20 to -8 dB as c rises |

### 5.2 One-shots

- **Landing** (`land`, speed > 3): `thump(110 to 45 Hz, 90 ms)` with gain
  `min(-6, -24 + 2.2 x (speed - 3))` dB, plus `noise(brown) → LP(600)`
  env(1, 60) for the dust. With damage: add the **metal crunch** below.
- **Metal crunch** (fall damage, any `damage` from an impact): `noise(white) →
  BP(1500, 1)` env(1, 150) + sines 310, 467, 803 Hz env(1, 80/140/200) +
  `thump(60 Hz, 150 ms)`; gain `-12 + 10 x min(1, frac x 3)` dB.
- **Bump** (`bump`): no damage: a soft thud `thump(140 to 90 Hz, 50 ms)`
  -18 dB. With damage: a **clang**, the unbreakable bell at 400 Hz with
  decays halved, -8 dB, plus the crunch at -6 dB.
- **Hull hit from a hazard** (`damage`, source not impact): the crunch, with a
  source layer: lava adds the sizzle (section 6), arcs add the zap tail,
  spores add nothing (their damage is a slow drip: no sound per tick, the
  vignette carries it; at most one crunch per 0.4 s, matching the
  invulnerability window).
- **Wreck** (`wreck`): the crunch at 0 dB, a burst `noise(white) → LP 8k to
  200 Hz` over 1.2 s, `thump(40 Hz, 900 ms)`, and the master dip (2.2).
  Everything after it plays at 0.3x rate for the slow-mo: one-shots started
  during it get `playbackRate`/frequency x0.5.
- **Rescue** (`rescue`): tow: a cable winch, `osc(saw, 140 to 220 Hz)` over
  3 s through `LP(800)` -20 dB with a ratchet click every 120 ms.
- **Teleport** cancel: pitch drops an octave in 300 ms and the shimmer
  fizzles (`noise(white) → BP(3000)` env(1, 300)). Done: a **whoosh**,
  `noise(pink) → BP(4000 to 200 Hz, 2)` over 450 ms with gain env(300, 150),
  then the arrival `thump(80 Hz, 200 ms)`.
- **Scanner** (`scan`): the emit ping `osc(sine, 1760)` env(3, 400) -12 dB,
  and the sweep `noise(white) → BP(3000 to 600 Hz, 6)` over `r / 25` s (the
  ring's travel time), gain falling 12 dB across. As the ring crosses
  revealed things: ores ping on their chime note (sine only, env(2, 120),
  -26 dB, at most 8 per pulse, nearest first, panned); gas and lava pockets a
  low `osc(triangle, 330)` env(2, 90) pair 60 ms apart, -22 dB; artifacts and
  wreck crates the first Seed-motif note on the glass bell. The level-5
  passive pulse plays all of it 8 dB quieter.
- **Ferrum storm**: while the scanner is blind, a crackle bed `noise(white) →
  BP(1200, 0.7)` with random 40 Hz gating, -30 dB; Q during a storm gives a
  detuned buzz `osc(square, 220) + osc(square, 233)` env(5, 250).

### 5.3 Warnings (tells bus)

From core-loop's tables. Every warning tone is a pure, quiet beep: the HUD
does the shouting.

| Warning (`warn`) | Sound | Repeat |
| --- | --- | --- |
| home, fuel < need x 1.3 | double beep `osc(sine, 880)` env(5, 70), 90 ms apart, -16 dB | once |
| home, fuel < need x 1.05 | `osc(triangle, 988)` env(5, 90), -14 dB | every 2 s |
| home, fuel < need | low tone: `osc(sine, 220 to 196 Hz)` with `osc(sine, 165)` under it, env(20, 500), -12 dB | once |
| fuel < 15% of tank | `osc(sine, 1175)` env(3, 60), -14 dB | every 1 s (replaces the 2 s beep) |
| sealed in ("No way up") | `osc(sine, 147)` + `osc(sine, 156)` env(20, 700), -12 dB | once |
| hull < 25% | creak: `noise(pink) → BP(200 to 140 Hz, 12)` env(80, 650) + `osc(sine, 70)` FM by 3 Hz depth 6 Hz, -16 dB | every 3 s |
| hull < 10% | alarm chirp: `osc(square, 1320 to 990 Hz)` env(2, 70) twice, 40 ms gap, through `LP(3000)`, -14 dB | every 1.5 s (replaces the creak) |
| heat | the heat ticks (5.1) | continuous |

`level 0` clears a warning. The surface owns the repeat timers. Assumed
levels: home 1/2/3 = x1.3 / x1.05 / under need, home 4 = sealed in; fuel 1 =
under 15%; hull 1/2 = 25% / 10%; heat 1 = over 75%. If the rules number them
differently, only the table in `events.ts` changes.

### 5.4 The Lift

While riding (needs the `lift` event, section 11.3): motor `osc(saw, 82)` +
`osc(saw, 164)` → `LP(900)` -18 dB, cable whine `osc(sine, 1240)` -30 dB, a
rail clack (`noise(white) → BP(700, 3)` env(1, 20)) every 5 rows passed and
a soft ding (`osc(sine, 1568)` env(2, 300)) at each biome boundary passed.
Start: a clutch clunk `thump(120 Hz, 60 ms)` and a 400 ms spin-up; stop: a
brake squeal `osc(sine, 2100 to 1800 Hz)` env(10, 200) -24 dB, then a clunk.
Pitch of motor and whine x `speed / 40`.

---

## 6. Hazards and world

Tells keep their bus and their minimum lead time: each tell sound starts at
least as early as the visual tell.

| Hazard | Tell (before it hurts) | Trigger and hurt |
| --- | --- | --- |
| **Gas pocket** | Every frame the surface finds gas tiles (`haz == GAS`) within **3 tiles**, lit or not; the nearest two get a hiss voice: `noise(white) → HP(3500) → BP(6000, 0.8)`, gain -32 dB at 3 tiles, -24 at 2, -20 at 1, slow AM 0.3 Hz +-3 dB, panned. | `gas_fuse`: a **rising hiss**, `noise(white) → BP 1.5 to 7 kHz` with gain -18 to -6 dB, plus `osc(sine, 300 to 1200 Hz)` -18 dB, tremolo accelerating 6 to 20 Hz, over the fuse `0.8 x k^0.25` s. `explode` gas: the **boom**, `osc(sine, 80 to 30 Hz)` env(2, 600) -2 dB at the centre, `noise(white) → LP 6 kHz to 300 Hz` over 700 ms -6 dB, debris clicks for 300 ms, reverb send +6 dB; distance falloff -3 dB per tile beyond 1 |
| **Loose boulder** | Within 3 tiles: pebble trickles, 2-4 clicks (`noise(white) → BP(2500, 2)` env(1, 10), 30-70 ms apart) every 1.5-3 s, plus a dust hiss `noise(pink) → HP(1500)` -34 dB. | `wobble`: 0.6 s rattle, grains of `noise(white) → BP(700, 2)` at 10 Hz (the visual's 10 Hz) and a groan `osc(sine, 60)` -14 dB, rising 6 dB across. `fall_land`: `thump(55 to 30 Hz, 300 ms)` -3 dB + `noise(brown) → LP(400)` env(2, 400) + debris clicks; shake-sized |
| **Lava** | Within 8 tiles of the nearest open lava: a bed of bubbles, `osc(sine, 120 to 260 Hz over 40 ms)` env(2, 60) at a random 3-8/s through `LP(900)`, plus a low roar `noise(brown) → LP(150)`; -36 dB at 8 tiles to -18 at 1. Lava-pocket tiles (`LAVA_POCKET`) within 2 tiles: an ember crackle, clicks `HP(2500)` at 8/s, -26 dB. | `lava_touch`: **sizzle**, `noise(white) → HP(2000)` with random AM 30 Hz, env(5, 400) -6 dB, then a steam tail `noise(pink) → BP(3000, 1)` env(10, 800) -14 dB; repeats every 400 ms while in contact. When lava enters a tile within 5 tiles of the pod (seen in `fluid`): a glug `osc(sine, 90 to 140 Hz)` env(5, 120) -18 dB, at most 3 per second |
| **Spore vent** | Vents within 5 tiles breathe: `noise(pink) → BP(300, 2)` swell env(800, 800) every 3 s, -30 dB. | `spore`: a puff, `noise(pink) → BP(500 to 250 Hz, 1.5)` env(20, 300) -10 dB, then an airy tail `noise(white) → HP(4000)` env(100, 1500) -26 dB. While the pod is inside a cloud: effects LP 2.5 kHz (the world goes dim and muffled with the lamp) |
| **Arc pylon** | `arc` charge (0.4 s): `osc(saw, 50 to 200 Hz) → BP(400, 5)` with crackle clicks rising from 5 to 40/s, gain -24 to -10 dB. | `arc` fire (1 s): the zap, `osc(square, 100)` + `noise(white)` through a hard-clip WaveShaper, random AM at 30 Hz, `BP(1800, 1)`, -6 dB, opening on a crack. Both positional; the charge is on the tells bus |
| **False floor** | When the pod rests on one: grit crumbles `noise(white) → BP(1500, 1)` 4 short grains over 0.8 s. | the break plays as a `soft` break |
| **The core pulse** | `pulse`: the Seed beats in the chamber; the surface computes when the ring reaches the pod (`(chamberRow - pod.y) / 40` s). At the beat: a **lub-dub**, `thump(48 Hz, 160 ms)` then `thump(42 Hz, 200 ms)` 140 ms later, -12 dB in the Core, -30 dB in the Ruins, -40 dB in Magma (the hum the old miners heard). | when the ring passes the pod: a whoomp `noise(pink) → LP 200 to 2000 Hz` env(50, 400) -8 dB with the heat sizzle at -18 dB |
| **Dynamite** | `item` dynamite ok: a 2 s sparkler fuse `noise(white) → BP(4000, 2)` with random crackle, -16 dB. | `explode` dynamite: the **crack-boom**, crack env(0.5, 5) `HP(1000)` -2 dB, then `osc(sine, 70 to 35 Hz)` env(2, 500) -3 dB and `noise(white) → LP 5 kHz to 250 Hz` over 500 ms |
| **Big charge** | `item` big charge ok: 3 s fuse with a beep `osc(sine, 660)` env(2, 40) from 2/s rising to 6/s, -16 dB. | `explode` charge: a **deep boom**, `osc(sine, 50 to 25 Hz)` env(3, 1200) 0 dB, `noise(brown) → LP(120)` rumble env(50, 1000) -6 dB, a 300 ms crack layer, reverb send +8 dB |

Cinder geysers (planet 2): 1 s before an eruption a rising
`noise(pink) → BP(200 to 600 Hz)` roar; the eruption is the boom without its
sub. Ferrum's Lodestone pull: a low `osc(sine, 40)` with 2 Hz AM while it pulls.

### 6.1 Cave ambience per biome

Ambience bus, behind everything, through the earth filter. Each biome has a
bed (a continuous voice) and **events** at random intervals from a list, never
two events within 1.5 s. Beds crossfade over the 10-row boundary band.

| Biome | Bed | Events (mean interval) |
| --- | --- | --- |
| Topsoil | `noise(pink) → LP(250)` -34 dB, very slow 0.05 Hz swell (wind above) | root creaks `osc(sine, 180 to 160) → BP` (20 s); a worm slither `noise → BP(2000)` 300 ms (40 s) |
| Stone | `noise(brown) → LP(120)` -36 dB | **drips**: `osc(sine, 900 to 1600 Hz over 15 ms)` env(1, 60) with a tunnel echo (6 s, from 3 nearby positions); timber creak (25 s); a bat flutter, 8 grains of `noise → BP(1200)` at 20 Hz, when the lamp first lights a bat |
| Crystal | `osc(sine)` drone on the chime pentatonic's root and fifth in octave 3, -38 dB, plus `noise(white) → BP(6000, 4)` air -40 dB | **wind chimes**: 3-6 notes of the chime pentatonic on the glass bell, 70-140 ms apart, when the pod passes within 3 tiles of a big cluster (and at random every 15 s); glass moth flutter (30 s) |
| Fungal | `noise(pink) → BP(400, 1)` breathing at 0.15 Hz, -34 dB | **crickets**: trains of `osc(sine, 4200)` env(2, 15) at 18 Hz for 300-600 ms (8 s, two voices answering); slow wet pops (12 s); a glowcap brightening plays a soft `osc(sine)` chime note when the pod is near (shares the art's 1 s brighten) |
| Magma | `noise(brown) → LP(90)` -28 dB with 0.1 Hz swell; far lava bubbling at -40 dB everywhere | the **far-off rumble** with the screen sway: `noise(brown) → LP(60)` env(800, 2500) -18 dB (60 s); cinderling skitters, 5 clicks `HP(3000)` (20 s); ember pops (6 s) |
| Ruins | near silence: `osc(sine, 55)` -42 dB | **glyph hums**: each glyph ripple (every 8 s) plays a `osc(sine)` + `osc(sine, x 1.5)` hum on the chime pentatonic, env(300, 0, 1, 900), -28 dB, the note walking up the pentatonic as the ripple travels; dust settling (20 s); a stopped water clock: one drop, then silence (90 s) |
| Core | `osc(sine, 27.5)` + `osc(sine, 55.4)` beating at 0.4 Hz, -30 dB, louder toward the chamber (+12 dB at row 760) | gravity motes: high soft `osc(sine, 2637 to 2960)` glides (10 s); the pulse (above) |

---

## 7. Town and UI

### 7.1 Town ambience (ambience bus, no earth filter)

Driven by the day phase (DESIGN D13, 10 min cycle; art 7.1 keyframes).

| Layer | Recipe | Level by phase |
| --- | --- | --- |
| Wind | `noise(pink) → LP(400)`, cutoff wandering 250-600 Hz over 8-20 s | -30 dB day, -26 dB night |
| Birds | three synth species: a chirp `osc(sine)` 3 to 5 kHz in 40 ms, x2-4; a warble 2.4 kHz with 25 Hz FM depth 400 Hz, 300 ms; a two-note whistle 2.2 then 1.8 kHz, 150 ms each. One call every 2-6 s, panned at random | phases 0.22-0.30 (dawn chorus) -22 dB and a call every 0.8-2 s; 0.30-0.75 -28 dB; off from 0.78 to 0.20 |
| Crickets | the Fungal cricket recipe at 4.6 kHz, two voices | fade in 0.75-0.82, -30 dB through the night, out by 0.22 |
| Generator | `osc(saw, 50)` + `osc(saw, 100.3)` → `LP(200)`, AM 0.5 Hz depth 10%: Mo's fuel station | always, -34 dB, panned by pod x relative to the station; +6 dB within 4 tiles |
| Night bird | two sines 400 and 380 Hz, env(40, 400), twice | one every 40-80 s at night |

### 7.2 UI sounds (ui bus)

| Event | Recipe | Gain |
| --- | --- | --- |
| Home sting (surfacing) | V then I on a soft pluck (section 8.2) in the town key, 160 ms apart, with a warm pad swell env(200, 0, 1, 900) | -14 dB |
| Sale row appears (every 60 ms) | that ore's tier chime, sine only, env(2, 90) | -22 dB |
| Sale count-up tick (per digit change) | `osc(sine, f)` env(1, 8); `f` walks up two octaves of the town pentatonic across the count-up's duration (art 9.4: `0.6 + 0.25 log10(total)` s, cap 1.6) | -24 dB, at most 25 ticks/s (drop the rest) |
| Sale final chord | sized by `s = total / median of the last 10 sales`: **small** (s < 0.7) a dyad I+V, 0.6 s; **normal** a triad plus octave, 1.2 s; **big** (s > 1.8) five voices I-V-I-III-V over a sub, a bell shimmer, 2 s; `best` adds a rising 6-note flourish and a coin shower (`osc(sine)` 3-6 kHz pings, 12 over 600 ms) | -10 dB, music -6 dB |
| Enter skips the count-up | jump straight to the chord | |
| Purchase (`buy`) | two notes, root then fifth, FM bell, 80 ms apart, env(2, 300) | -12 dB |
| Tier-up (`buy` with `tierUp`) | I-III-V-I' arpeggio 70 ms apart on the bell, a whoosh up (`noise → BP 300 to 3000 Hz`, 300 ms), a major pad chord 1.2 s | -10 dB |
| Research unlock | four pentatonic notes up on the glass bell, 90 ms apart, each with a ping-pong echo (240 ms, feedback 0.35) | -12 dB |
| Achievement | chime plus a IV-I cadence on the pad, 1.2 s | -12 dB |
| Biome entry stinger (`biome`, first) | in the new biome's key: its root drone fades in over 400 ms, then the biome's lead motif's first bar on its lead instrument, 3 s total, while the music crossfades | -12 dB |
| New record (`record`) | single soft chime: the ladder's index 7 on the sine voice | -22 dB, at most once per 20 s |
| Toast `good` / `warn` / `bad` / `quiet` | `osc(sine)` E6 then A6, 40 ms each / `osc(triangle, 660)` env(2, 80) / A5 then E5 / nothing | -26 dB |
| Button hover | click env(0.5, 1) + `osc(sine, 3000)` env(1, 15) | -36 dB, at most one per 60 ms |
| Button press / confirm | `osc(sine, 1200)` env(1, 25) | -28 dB |
| Panel open / close | `noise(pink) → BP(1500 / 1000, 1)` env(10, 120) | -30 dB |
| Item used (`item` ok) | per item: fuel cell `noise → BP(800)` gurgle 300 ms; repair kit ratchet x3; coolant `noise(white) → HP(3000)` hiss down 600 ms; dynamite and charge use their fuses | -16 dB |
| Item refused (`item` not ok) | `osc(square, 150) → LP(600)` env(2, 80) | -24 dB |

---

## 8. Music: the plan

An adaptive generative score: the music is written as data (keys, chord
pools, patterns, motifs) and a sequencer assembles it live, bar by bar, from
the pod's state. It is never a loop of a fixed recording.

### 8.1 Per biome

| Biome | Key / mode | Tempo | Chime pentatonic (base) | Mood and instruments |
| --- | --- | --- | --- | --- |
| Town (day) | D major | 80 | D E F# A B (D4 293.7 Hz) | warm: pluck guitar, soft pad, round bass, brushes; a hummed lead |
| Town (night) | D major | 60 | same | pad and sparse pluck, a bell, half density, long rests |
| 0 Topsoil | D major | 92 | D E F# A B (D4) | morning: pluck arp, warm saw pad, sine-triangle bass, shaker and woodblock; lead: whistled sine |
| 1 Stone | A Dorian | 84 | A C D E G (A3 220 Hz) | abandoned work: reed organ pad, plucked bass, drip-like percussion; lead: low triangle |
| 2 Crystal | E Lydian | 76 | E F# G# B C# (E4 329.6 Hz) | wonder: FM bell arp in 16ths with ping-pong delay, sine choir pad, soft sine bass, no drums, glass taps |
| 3 Fungal | B Aeolian | 70, swung 16ths (58%) | B D E F# A (B3 246.9 Hz) | alive and dark: detuned PWM pad, blooping filtered bass, marimba arp, woody clicks |
| 4 Magma | E Phrygian | 100 | E G A B D (E3 164.8 Hz) | danger: overdriven low saw pad, saw ostinato bass in 8ths, toms and a taiko, brass lead |
| 5 Ruins | G Dorian | 66 | G Bb C D F (G3 196 Hz) | awe and quiet: choir pad, glyph bells, water-clock tick, long rests |
| 6 Core | A Lydian | 96, locked to the pulse | A B C# E F# (A3 220 Hz) | arrival: everything warm and bright, sub heartbeat as the kick, the Seed motif as lead |

D major to A Dorian to E Lydian to B Aeolian keep many common tones, so the
upper crossfades are smooth; Magma's E Phrygian is a deliberate turn to the
dark, and A Lydian at the Core is the warmest key in the game (the Seed is not
a monster). Cinder's planet biome uses C Phrygian dominant at 104; Ferrum's
stretched Stone uses A Dorian with a metallic anvil percussion.

### 8.2 Instruments (recipes, shared across biomes)

| Instrument | Recipe |
| --- | --- |
| Pad | 3 voices per note: `osc(saw)` at -7, 0, +7 cents → `LP(cutoff, 0.8)`, env(600, 0, 1, 1800); cutoff per biome 900-2400 Hz, breathing +-20% at 0.07 Hz |
| Choir pad | per note 4 `osc(sine)` at f, 2f, 3f, 4f (-0/-8/-14/-20 dB) with 5 Hz vibrato of 6 cents, through `BP(800, 1)` + `BP(1200, 1)` formants, env(900, 0, 1, 2200) |
| Reed organ | `osc(square)` + `osc(sine, 2f)` → `LP(900)`, env(80, 0, 1, 400) |
| Pluck | `osc(triangle)` + `osc(saw, -12 dB)` → `LP` from 4000 to 600 Hz over 200 ms, env(2, 400) |
| Marimba | `osc(sine, f)` + `osc(sine, 4f)` env(1, 60) at -10 dB, main env(2, 350) |
| FM bell | carrier f, modulator 2f (glass bell: 3.5f), index 2 falling to 0.3 over 500 ms, env(2, 1200) |
| Bass | `osc(sine)` + `osc(triangle, -6 dB)` → `LP(400)`, env(5, 300, 0.6, 150); Magma: `osc(saw)` → WaveShaper tanh x2 → `LP(300 to 900 env)` |
| Bloop bass (Fungal) | `osc(sine)` with LP env 1200 to 200 Hz over 150 ms, pitch drop 1 semitone in 40 ms |
| Lead | `osc(triangle)` or `osc(sine)` (whistle) with 5.5 Hz vibrato fading in after 300 ms, portamento 40 ms; brass: `osc(saw) → LP(env 600 to 2400 to 1200)` |
| Kick / heartbeat | `thump`: `osc(sine, 120 to 45 Hz over 60 ms)` env(1, 250) |
| Toms / taiko | `thump` at 160/110/70 Hz start, plus `noise(pink) → BP(300)` env(1, 40) |
| Shaker, brushes | `noise(white) → HP(6000)` env(8, 50); brushes `noise(pink) → BP(3000, 0.6)` env(40, 120) |
| Woodblock, clicks | `osc(sine, 1100)` env(0.5, 25) + `BP(1100, 8)` noise click |
| Water-clock tick | `osc(sine, 1900)` env(0.5, 18) through the music reverb |

The music bus has its own reverb (a 2.4 s IR, high-passed at 300 Hz, send
-10 dB) and one ping-pong delay (dotted eighth of the biome tempo, feedback
0.35, band-passed 600-5000 Hz) for the bells and arps.

### 8.3 Layers and phrases

The sequencer schedules 100 ms ahead on a 25 ms timer (the AudioContext
clock), one sixteenth at a time. A biome song is built from **8-bar phrases**.
At each phrase start it picks:

- a chord progression from the biome's pool (6-10 progressions of 4 or 8
  chords in the mode, e.g. Topsoil `I V vi IV`, `I IV I V`, `vi IV I V`,
  `IV I ii V`), never one of the last two used;
- a bass pattern (4 per biome), an arp pattern (6 per biome: up, down,
  up-down, broken thirds, pedal-and-melody, sparse), a percussion pattern
  (4 per biome);
- which layers play, by the arrangement rules below.

Five layers plus the Seed:

| Layer | Plays | Density cap |
| --- | --- | --- |
| Pad | the chord, voiced within an octave of the biome's centre, smooth voice leading (each voice moves the smallest interval) | 4 notes |
| Bass | roots and fifths on the pattern | 1 note |
| Arp | chord tones on the pattern, sixteenths or eighths | 1 note per sixteenth |
| Percussion | the pattern; none in Crystal, sparse in Ruins | 2 hits per sixteenth |
| Lead motif | the biome's motif (4 bars), its variants (section 8.6) | 1 note |
| Seed motif | section 8.4 | 1 note |

### 8.4 The Seed motif

Five notes in scale degrees, so it fits every key and mode: degrees
**1 - 5 - 6 - 5 - 3**, durations 2, 1, 1, 2 and 4 beats. (In minor modes the
3 is a minor third on its own; in Phrygian the 6 is flat: the Seed sounds
darker through rock that is hostile and opens up in the Core's A Lydian.) It
is the artifact fanfare, the artifact-near chime (its first two notes), the
launch's peak, and it grows with depth:

| Biome | Chance per phrase | Instrument | Level vs lead | Reverb wet |
| --- | --- | --- | --- | --- |
| Topsoil, town | 0 (only in the menu loop and at the launch) | | | |
| Stone | 0.05 | a distant bell an octave up | -14 dB | 0.8 |
| Crystal | 0.10 | the glass bell, as if the walls sang it | -10 dB | 0.7 |
| Fungal | 0.15 | marimba, half time | -8 dB | 0.6 |
| Magma | 0.20 | low brass, two octaves down | -6 dB | 0.5 |
| Ruins | 0.35 | choir | -3 dB | 0.5 |
| Core | 0.6, and it replaces the lead | the lead itself, doubled at the octave by the bell | 0 dB | 0.3 |

Where it plays, the lead motif rests: the two never overlap.

### 8.5 The bet is heard: tension

Every bar the music reads one **tension** value `τ` (0..1) from the pod:

```
m      = fuel / fuelHome                        // the fuel tick margin
τfuel  = clamp((2.0 - m) / (2.0 - 1.05), 0, 1)  // 0 at twice home, 1 at the tick
τhull  = clamp((0.5 - hull/hullMax) / 0.4, 0, 1)
τheat  = clamp((heat - 0.5) / 0.5, 0, 1)
τ      = max(τfuel, 0.8 τhull, 0.8 τheat)
```

As `τ` rises the music thins in a fixed order (thresholds to drop / to come
back):

| τ | Change |
| --- | --- |
| 0.25 / 0.15 | the arp plays every other note |
| 0.40 / 0.30 | the arp stops; percussion falls to the kick or heartbeat only |
| 0.55 / 0.45 | the lead motif and the Seed motif stop; a **clock** enters: a muted click (`HP(5000)` env(0.5, 4)) on eighths, -28 dB rising to -20 at τ = 1 |
| 0.70 / 0.60 | the bass becomes a root pedal; the pad's LP closes toward 600 Hz (`2400 - 1800 τ`) |
| 0.85 / 0.75 | a low drone enters: root plus flat second (or tritone in Lydian keys), `osc(saw) → LP(300)`, -22 dB |
| fuel < fuelHome | everything except the drone and the clock stops; the drone wobbles +-10 cents at 0.3 Hz. Uneasy, not loud |

Changes land on the next bar line, except a drop that crosses 0.85, which
lands on the next beat. A layer comes back only after `τ` stays below its
return threshold for **2 bars** (no flapping when the margin hovers). When the
player turns home and the margin grows, the layers return in the reverse
order: the climb back sounds like relief. Tension is not shown anywhere else
in the mix: no alarms in the score, the warnings stay on the tells bus.

### 8.6 Avoiding fatigue over hours

- **Variation:** the lead motif is varied each time it plays: as written,
  transposed to the V, inverted, augmented (x2 durations), or its first half
  answered by a new 2-bar tail drawn from the pentatonic (weights 3/2/1/1/2).
  Velocity humanised +-1.5 dB, timing +-8 ms on pitched layers (never on the
  pulse-locked Core kick).
- **Rests:** every 3-5 phrases the song takes a **breath**: 8-16 bars of pad
  only, or full silence of 10-20 s where only the ambience plays. Ruins
  breathes every 2-3 phrases.
- **Suites:** the score plays in suites of 3-6 minutes, then **1-3 minutes
  of ambience only**, then a new suite (it starts with a pad fade, never on a
  hit). After 45 minutes of continuous play the ambience gaps lengthen to 2-5
  minutes. A biome entry or the surfacing always starts a suite.
- **Density:** at most 4 layers at once (the Seed counts as one), at most 6
  note-ons per beat across the music, no sixteenth arp for more than 16 bars
  in a row.
- **Never retrigger** the same stinger, fanfare or chord within 10 s of
  itself; a second jackpot within 10 s plays a short version (the 8-note run
  only).

### 8.7 Surface, crossfades, menus and the launch

- **Town:** on `surface` the mine song fades out over 2 s and the town theme
  starts on its next phrase, by day the 80 bpm theme, by night (phase 0.80 to
  0.20) the 60 bpm sparse one; day and night swap at a phrase end with a 4 bar
  crossfade. The town theme has a written 16-bar melody (its anchor: players
  hear it every 3-5 minutes for hours, so it is the most composed thing in
  the score, played in full at most every third visit and fragmented the
  rest). `τ` is 0 in town.
- **Diving:** on `dive` the town theme fades over 3 s; the Topsoil song
  starts at its first phrase, pad only for 4 bars.
- **Biome crossfades** (`biome`): the incoming song starts on its next bar
  line, pad and bass only; the outgoing song drops all but its pad and
  releases it over 6 s (equal power over the first 4 s). First entry plays
  the stinger over the crossfade (section 7.2). Bouncing across a boundary:
  a crossfade is not reversed within 8 s; the song follows the biome the pod
  spent the most of those 8 s in.
- **The Core and the pulse:** the Core song runs at 96 bpm with 4 bars to
  the 10 s beat. On each `pulse` the sequencer realigns its next downbeat to
  the beat's arrival at the pod (drift of at most one sixteenth per bar, never
  a jump), so the heartbeat lands on the one.
- **Menus and title:** a quiet loop: the town night material through the
  earth filter at 1.2 kHz, -6 dB, pad and pluck only, the Seed motif once
  every 90 s on the glass bell.
- **The launch** (`launch` phases; world.md section 5): *wake*: the music
  stops; the hum and the Core bed swell 12 dB over 3 s; a riser `noise →
  BP 200 to 4000 Hz` over 3 s. *Rise* (about 12 s, the camera passes every
  biome): every 1.7 s a one-bar fragment of each biome's lead motif in its
  own key and instrument, bottom to top (Core, Ruins, Magma, Fungal, Crystal,
  Stone, Topsoil), over a sustained A pedal and a choir pad rising in
  brightness; the earth filter opens progressively with the passing rows.
  *Break the surface*: a sub boom, then silence for one beat. *Climb*: the
  Seed motif in full, A Lydian, every instrument, at the town tempo 80: the
  only time the score plays it loudly. *Shards*: a chime per shard on the
  ladder's top pentatonic, rate-limited to 20/s, panned across. *Observatory*:
  the menu loop.

---

## 9. Building blocks (kit.ts)

- **Noise:** generated once at boot, 2 s each, mono: white (uniform),
  pink (Voss-McCartney or Paul Kellet's filter), brown (integrated white,
  normalised to peak 0.9). Played with a random start offset and `loop`.
- **IRs:** generated once: stereo decaying noise `(rand x 2 - 1) x (1 -
  i/len)^2.6`, decorrelated left and right, lengths 0.6 / 1.6 / 3.2 s for the
  rooms and 2.4 s for the music; each IR low-passed by a one-pole at 6 kHz
  while generating (rock rooms are dark).
- `thump(f0 to f1, ms)`: `osc(sine)` with an exponential pitch ramp and
  env(1, ms). `crack`, `bell(f, partials, ms)`, `pluck`, `fm(carrier,
  ratio, index)`: the helpers every recipe above names.
- **Envelopes:** all gain changes go through `setTargetAtTime` or ramps that
  start from the current value (`cancelAndHoldAtTime`, with a
  `cancelScheduledValues` + `setValueAtTime(current)` fallback). Attacks at
  least 1 ms (5 ms under 100 Hz), releases at least 10 ms. Nothing ever sets
  `.value` on a sounding parameter.

---

## 10. Performance

- **Voice limits:** at most **48** sounding source nodes in total. Caps per
  group, stealing the oldest (with a 10 ms release): pickup chimes 8, breaks
  4, impacts 4, tells 6 (stealing the farthest, never a fuse), ambience
  events 6, UI 6, music 24 (pads first lose their third voice, then drop the
  oldest note).
- **Persistent voices** (built once, gain 0 when silent, never rebuilt): the
  drill, idle, thrust, strain, tread, wind, heat, teleport, lift, two gas
  hisses, one lava bed, one boulder trickle, the biome bed, town layers. A
  persistent voice at gain 0 for 5 s disconnects its sources from the graph
  and stops them, and is rebuilt on demand (WebAudio still processes
  connected silent nodes).
- **One-shots:** oscillators and buffer sources are single-use by WebAudio's
  design and cheap; what is pooled is the **strip** behind them (gain, filter,
  panner): 32 strips, reused round-robin. Each source is `stop()`ped 20 ms
  after its envelope ends and disconnected in `onended`.
- **Coalescing:** events of one kind in one tick become one sound with a
  size: a blast that breaks 21 tiles plays one blast, not 21 breaks; 5
  pickups in a tick are a 50 ms-spaced run; sale rows use their own timing.
- **Clicks:** see the envelope rules; filters move with tau at least 15 ms;
  oscillator frequencies on continuous voices with tau 20-30 ms;
  WaveShaper curves are fixed at boot.
- **Budget:** the audio thread under **12% of one core** on an M1 at 48 kHz
  in the busiest scene (Magma, drilling, lava bed, a blast, full music);
  main-thread audio work under **0.3 ms per frame** (the world scan for tells
  runs every 0.25 s, not every frame, over at most 7 x 7 tiles). At most 2
  ConvolverNodes for the room plus 1 for the music, 2 DynamicsCompressors.
  If the context's `baseLatency` pushes underruns (audio debug shows
  them), drop the music's arp layer, then halve the pad voices.
- **Debug overlay** (with the art's F10): active voices per group, the
  limiter's reduction, `τ`, current song and phrase, bus levels.

---

## 11. Event to sound

### 11.1 GameEvent

| Event | Sound (section) |
| --- | --- |
| `dig_start` | drill voice spin-up, family for `mat`, ore ring if `find` is an ore (3.1) |
| `dig_cancel` | drill spin-down (3.1) |
| `break` | crack + family tail by `mat`; `by` blast silent, drone -14 dB, fall the boulder land (3.2) |
| `too_hard` | dull clank (3.3) |
| `unbreakable` | ringing clank (3.3) |
| `pickup` | chime ladder by tier and streak, `count` notes (4.1, 4.2) |
| `cargo_full` | cargo full thud (4.3) |
| `nugget` | nugget bounce (4.3) |
| `land` | landing thump, crunch if `damage > 0` (5.2) |
| `bump` | soft thud or clang (5.2) |
| `damage` | crunch with the source layer, one per 0.4 s; feeds `τhull` (5.2, 8.5) |
| `wreck` | wreck crunch, master dip, slow-mo rate (5.2, 2.2) |
| `rescue` | winch for a tow; wreck rescue plays the teleport whoosh (5.2) |
| `gas_fuse` | rising hiss over the fuse; music ducks (6) |
| `explode` | boom by `kind`: gas boom, dynamite crack-boom, charge deep boom; duck within 6 tiles; muffled ears if the pod took damage this tick (6, 2.2) |
| `wobble` | boulder rattle 0.6 s (6) |
| `fall_land` | boulder thud (6) |
| `lava_touch` | sizzle and steam (6) |
| `spore` | spore puff (6) |
| `arc` | `charge`: charge buzz (tells); `fire`: zap (6) |
| `pulse` | lub-dub now, whoomp when the ring passes the pod; Core music realigns (6, 8.7) |
| `scan` | ping, sweep and reveal pings (5.2) |
| `item` | per-item use sound, dynamite / charge fuses, or refused (7.2, 6) |
| `teleport` | `start` channel voice on, `cancel` fizzle, `done` whoosh + arrival (5.1, 5.2) |
| `biome` | music crossfade; `first`: stinger; ambience bed crossfade (8.7, 7.2, 6.1) |
| `record` | soft record chime (7.2) |
| `surface` | earth filter opens, town ambience, home sting, town theme (2.5, 7.1, 8.7) |
| `dive` | earth filter closes, mine ambience, Topsoil song (2.5, 8.7) |
| `warn` | the warning table by `what` and `level`; `level 0` stops its repeat (5.3) |
| `dock` | sale rows, count-up ticks, final chord sized by `sale.total` and `sale.best` (7.2) |
| `buy` | purchase chime, or tier-up sting when `tierUp` (7.2) |
| `find` | jackpot fanfare / artifact fanfare / first-of-kind extra note (4.3) |
| `achievement` | achievement chime and cadence (7.2) |
| `toast` | blip by `tone` (7.2) |
| `launch` | the launch cue by `phase` (8.7) |

### 11.2 Continuous (read every frame)

| Source | Drives |
| --- | --- |
| `PodView.dig.progress`, `.mat` | drill pitch `1 + 0.10 p`, ore ring swell |
| `PodView.thrusting`, `.vy` | thrust on/off, turbine and rocket pitch |
| `PodView.load` | strain overtone above 4 |
| `PodView.grounded`, `.vx` | tread clacks and motor |
| `PodView.vy` + input | fall wind whistle or the safe rush |
| `PodView.heat` | heat ticks above 0.75; `τheat` |
| `PodView.fuel`, `.fuelHome` | `τfuel`; idle hum stops at 0 |
| `PodView.hull`, `.hullMax` | `τhull` |
| `PodView.channel` | teleport channel pitch and duck |
| `PodView.y` | earth filter, ambience bed, Seed presence, pulse arrival time |
| `PodView.x`, world tiles near the pod | room size, gas hisses, boulder trickle, lava bed, spore vents, artifact near, crystal wind chimes |
| day phase | town layers, day or night town theme |

### 11.3 Wanted from the rules (additions to `types.ts`, nothing renamed)

- `{ t: "lift"; phase: "start" | "stop" }`: the Lift ride is otherwise
  invisible to the surface.
- `{ t: "spore_charge"; x; y }` 1 s before a vent releases, if the rules can
  give it: the breathing tell then gets a rising last breath instead of a
  fixed rhythm.
- `{ t: "cloud"; inside: boolean }` when the pod enters or leaves a spore
  cloud (for the muffle).
- The `warn` level numbering (5.3) confirmed or corrected.

Until they exist the surface degrades gracefully: the Lift is detected by a
`LIFT`-flagged column and `abs(vy) > 30`, the vents breathe on a fixed 3 s
rhythm, and the cloud muffle is skipped.
