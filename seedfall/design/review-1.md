# Seedfall: design review 1

Reviewer: independent critic. Read against BRIEF.md, DESIGN.md (wins conflicts)
and the four parts. Numbers below are recomputed from the parts' own formulas;
section references are to the part named.

## Verdict

The minute-to-minute dig is well specified and the art plan is the strongest
document here. The game it describes is not yet top notch. Four problems
undercut the brief's main promise, "every dive is a bet". (1) The ripcords are
cheaper than the risk: a tow costs 15% of the cargo and also skips the climb,
so running dry beats turning back. (2) Late dives are about 70% falling and
holding Up. (3) The deep biomes do not contain enough ore for the economy the
timeline assumes. (4) The prestige targets keep every run at 60-110 bot
minutes, so run 2 to run 10 replay the same staircase at the same speed, and
the planet run 2 is spent on (Cinder) cannot be finished. The shop also needs
work: past Crystal it is a gate checklist that the suggestion card and the B
key play for you. Fix the ripcords, transit, ore supply and prestige pacing
before anyone tunes a price. Most of the rest is consolidation: several specs
exist twice with different numbers, and DESIGN.md has not settled them.

## Findings, by severity

### 1. Critical: the tow is the best way home, so the dive is not a bet

- **Problem.** Core-loop "Empty tank": a tow keeps all the cargo, takes a 3 s
  skippable animation, and costs 15% of the cargo value. Climbing home costs
  the fuel reserved for the climb plus the climb's time: 93 s in the magma
  example (core-loop "A magma dive"), about 150 s from the Core (see 2). So
  the best play at every depth is to spend the whole tank mining, run dry and
  tow. A Core haul of about $180k pays a $27k tow and saves 2.5 minutes, which
  is worth about $100k at $40k/min. The teleporter (k = 12, $71k in the Core)
  is also cheaper than the time it saves, so carrying one on every dive is the
  dominant late strategy. The struggle guard's free tow makes it cheaper still.
- **Why it matters.** It removes pillar 1 and the reason for the fuel tick.
  Players find this within an hour and can't unsee it.
- **Change.** Tow returns the pod only. The cargo stays where it ran dry as a
  crate, using the existing wreck-crate rule. The fee is one full tank. Running
  dry then costs the haul until a recovery dive, which is a sting without any
  permanent loss (pillar 4 holds). Keep the teleporter as the one paid
  ripcord, priced as a share of the haul it rescues: `max(k x U, 0.35 x cargo
  value)`. Fix 2 first: once transit is short, the teleporter's time value
  falls and this price is enough. Bot check: no strategy that ends dives on a
  tow or a teleport should earn more per minute than turning back at the tick.

### 2. Critical: transit dominates late dives (the real boring stretch)

- **Problem.** The fall cap is 12 tiles/s, and the climb cap is
  `min(14, 7 + 0.35L) x k_m^-0.5`. In the magma example: 35 s falling, about
  55 s mining, 93 s climbing, so 30% of the dive is mining. For a Core dive
  (engine L16, 45 Heartstone at D3's mass of 2.4 each, k_m about 6.3): a 64 s
  fall plus a 770 / (12.6 / 2.5) = 154 s climb is about 3.6 minutes of transit
  in a dive progression lists as 4.2 to 4.75 minutes. Shaft Lift (x1.4) barely
  helps, and the Waystation (L3, 500 data) is not in run 1's research order
  (progression section 6). That means 60 minutes of Magma-to-Core play spent
  holding Up.
- **Why it matters.** Motherload's worst flaw is the long climb, and every
  modern take (SteamWorld Dig's tubes, Dome Keeper's short shafts) designs
  around it. At this rate the "one more dive" pull dies in Magma.
- **Change.** Separate the time a trip takes from what it costs in fuel.
  (a) Hold the thrust burn per *row* constant and let the climb cap reach
  30 tiles/s at engine L20, so a loaded Core climb takes about 60 s while the
  fuel tick math stays the same. (b) Make the **Shaft Lift** a run-1 workshop
  purchase rather than research. It is an elevator in your main column, built
  one biome segment at a time (each segment costs about one gate level), and
  it moves at 40 tiles/s both ways. Riding it is safe, so the bet moves to the
  frontier: the fuel tick measures the way to the lift head, not to the
  surface. (c) In a column you have already dug, holding Down drops at
  25 tiles/s and brakes on its own 3 tiles above the floor. Target, checked by
  the bot: transit is at most 30% of any dive and late transit is at most 45 s.

### 3. Critical: the deep biomes run out of ore

- **Problem.** World section 4 claims ore shares of Magma 6%, Ruins 7% and
  Core 5%, but its own vein table produces about 140 ore tiles in Magma
  (2.6%), about 157 in Ruins (2.9%, vaults included) and about 80 in the Core
  (1.9%: Heartstone 12 x 4.5, Stellite 8 x 2.5, Seedglass 6). One tile is one
  piece (core-loop "Pickups"). Progression's timeline sells about 208 pieces
  in Magma (about $100k at about $480 each), about 311 in Ruins (about $420k
  at $1,350) and about 260 or more in the Core, before counting the 5
  Heartstone the lance eats. The model assumed an 18% hit rate on an infinite
  world. The real world is finite, persistent and smaller than the model
  needs. The last 30 minutes of run 1 would be spent hunting the last tiles.
- **Change.** (a) Ore tiles yield `1 + floor(b / 2)` pieces (Core: 4). That
  quadruples deep supply without more clutter on screen, and it makes cargo
  slots matter late again (see 7). (b) Raise vein counts in biomes 4 to 6 by
  about 1.5x, so the table actually produces the stated shares. (c) The bot
  must play the real finite world from day one and report ore remaining per
  biome at launch, with a target of at least 30% left. D17 already defers the
  hit rate to the bot. Treat it as the top risk: at a 7% hit rate instead of
  18%, every time in progression's timeline grows about 2.5x.

### 4. High: prestige is flat, and runs 2 to 10 repeat run 1

- **Problem.** Progression section 5 sets the simulator target "at every age
  from 1 to 12, a run lasts 60-110 bot min" (90 to 150 human minutes), and
  run 2 comes in at 82% of run 1. Seed age raises hardness by 1.12^n, which
  cancels the perks. Each new planet is the same seven layers with a palette,
  one ore, one hazard and a stretched biome. Shard income barely moves (37,
  44, 51 ... 113 at run 10, under a square root), and the perks are +10% steps.
  The perk shop holds about 2,100 shards, which is about 25 runs of 2 hours.
  Drill Mastery is "**needed** to reach the chamber from Seed age 9". A
  mandatory purchase hidden in a perk shop is a designed dead wall.
- **Why it matters.** Idle and prestige games hook on compression: content
  that took an hour now takes ten minutes, and the new part sits at the end.
  This design makes the second run feel like a reset rather than a power trip.
- **Change.** Targets for humans: run 2 at no more than 60% of run 1 (about
  80 minutes), run 4 at no more than 45 minutes, a replayed planet at no more
  than 30 minutes. Levers: Seed age multiplies value only (drop the hardness
  scaling, or stop it at n = 3; Drill Mastery then becomes optional
  comfort). Head Start gets 5 levels reaching the Ruins gates. Market
  Contacts becomes x1.25 compounding. Shards grow with `E^0.6`, not
  `sqrt(E)`. Each planet's novelty is concentrated in one *new* biome inserted
  mid-column with its unique ore, hazard and 6 to 8 relics, so the fast part
  is familiar and the slow part is new.

### 5. High: run 2 on Cinder cannot reach the chamber

- **Problem.** Cinder has "heat +30% (all radiator gates +1)". The chamber
  needs R10 on Vell (485 C against R10 = 520), and the radiator cap is 10. On
  Cinder that becomes R11, which needs Radiator Mastery I (40 shards). The
  first launch pays 37 shards, and the planned spend (26) leaves 11. Read as
  +30% on temperature, the chamber is about 630 C, beyond even R12 (600). The
  timeline's run 2 *is* Cinder, and it launches at about 228 minutes. That
  cannot happen.
- **Change.** Apply Cinder's heat modifier to rows 300 to 540 only (its
  stretched Magma), which leaves the Ruins and Core gates as on Vell. Then add
  a simulator assertion that every planet offered at launch has a reachable
  chamber with the shards the player can have at that point.

### 6. High: the end of run 1 is about 45% frozen depth and still has the lance wait

- **Problem.** In the timeline, the deepest row does not move for 21:00-30:30
  (9.5 min), 41:18-47:24 (6), 60:18-67:06 (7), 79:00-95:48 (17, the Ruins
  floor) and 109:30-123:42 (14). That totals about 53 of 124 bot minutes, or
  65 to 75 human minutes of re-mining the same floor. Splitting the lance into
  three parts did not remove the final wait: the head ($400k) is still bought
  at 123:42, 14 minutes after reaching the Seed. The whole $800k is about 18
  minutes of Core income on top of R10 ($285k) and Drill 17 ($111k). Core
  Lance Plans (300 data) is required to launch. At Core entry, cumulative data
  is about 2,000 against about 1,830 spent on the listed order, so 170 is
  free. Data comes from finite sources plus a lab trickle of 0.5 to 2.5 per
  minute. A player who spent data differently can wait an hour or more for a
  required node.
- **Change.** (a) Radiator: 20 levels of +20 C at growth 1.4 instead of 10
  lumpy levels at 1.95, so the heat frontier moves 10 to 15 rows per purchase
  and depth keeps advancing ("one more dive, 15 rows deeper"). (b) Lance total
  about $380k (60k, 120k, 200k), with the head sized to be affordable by the
  time a typical player reaches the chamber. The 5 Heartstone become the real
  gate. (c) Lance Plans becomes free, unlocked when Sefa reads A18 (Seed husk)
  or A19. Never put a required node behind a soft currency. Target:
  depth-frozen time at most 20% of a run, and no single freeze over 6 bot
  minutes.

### 7. High: the shop is a checklist with no builds

- **Problem.** Drill and radiator are hard gates, and hull and tank are soft
  gates. The suggestion card picks "the cheapest missing gate", and the next
  biome bar lists them. B (or the Express Pad) buys the suggestion. Cargo is
  dead late, because "late dives end on fuel" with 70 to 90% of the bay used
  (D16, progression Q1), so Cargo L10 to L20 and Dense Packing are traps.
  Past the first ten minutes there is no fork where two players would buy
  differently. Dome Keeper and Nodebuster live on that fork.
- **Change.** Turn existing research effects into **pod modules** with
  limited slots: 2 at the start, +1 at Fungal, +1 from research. Module
  candidates: Magnet Coil, Heat Sink, Dense Packing, Afterburner, Smelter,
  Helper Drone, Prospector's Ear, Overcharge. Swapping is free in town. This
  adds no new content: it turns nodes into loadout choices, and planets (Glaze
  wants fuel, Ferrum wants cargo) make the choice matter. Keep the suggestion
  card for gates only. Never auto-suggest a module.

### 8. High: explosives and Overcharge bypass the gates

- **Problem.** Drilling is limited to H <= 2.5P. Dynamite clears H <= 4P (2
  drill levels early) and the big charge clears H <= 8P, which is 5.2 levels
  (1.25^5.2 = 3.2), not the "two drill levels early" the item table claims.
  Overcharge (E6) digs "the next 8 tiles at ratio 0.25" whatever the
  hardness: vault seals (95) and the core shell, every 45 s, forever after run
  1.
- **Change.** Dynamite H <= 2.5P (it saves time and covers area, it does not
  raise the gate). Big charge H <= 3.2P (one level early, which is what the
  text promises). Overcharge: `ratio := max(0.25, ratio / 4)` and only where
  ratio <= 5. It never touches seals or the core shell.

### 9. High: no audio design exists

- **Problem.** Nobody owns sound or music. Core-loop lists sound intents, art
  section 9.4 cites "the audio doc", and BRIEF says everything is synthesised.
  The juice tables lean on audio throughout: the value-tier chime, the streak
  pitch, the sale chord, the hiss tells, the "home" sting. Pillar 3 depends on
  audible tells such as the gas hiss within 3 tiles and the relic chime. With
  no owner, these get built last and badly.
- **Change.** Add `design/audio.md` before building. It should cover one
  synth voice set per material; a pentatonic chime ladder by tier, so streaks
  always sound consonant; a music layer per biome that thins as fuel nears the
  tick, so the bet is heard; a mix budget (tells above music, always); and
  a mute-music option separate from the master.

### 10. Medium: thin short-term hooks and little variety within a biome

- **Problem.** A biome lasts 15 to 30 minutes with 3 or 4 ores, 1 or 2
  hazards and 1 to 3 named structures. Surprises are 9 jackpots and 19 relics
  per run (one every 8 to 17 minutes). Buried caches exist only in Topsoil.
  The daily contracts and market board are once per day. Between upgrades
  there is no reason why *this* dive differs from the last.
- **Change.** (a) **Ines' orders**: 2 orders on the depot card, refreshed
  every 3 docks, such as "6 Sapphire in one haul: x1.6 on them" or "a haul
  with no Lead: +20%". They replace daily contracts (a cut, see 14). (b)
  Extend caches to every biome, about 1 per 15 rows, each themed: a mine cart
  in Stone, a fossil geode in Crystal, a spore cache in Fungal, a Sower
  coffer in Ruins. They are cheap content and give a mid-frequency surprise.
  (c) A "rich pocket" each dive: one seeded vein per dive within 25 rows of
  your deepest point, rolled at x2 size, so every descent has something to
  find.

### 11. Medium: the readability bands overlap, against the doc's own rule

- **Problem.** Art section 6.1 sets back walls at L 0.05 to 0.14 and
  undiggable rock at 0.08 to 0.18, while also requiring a contrast ratio of at
  least 1.5 between layers. At the overlap (0.14 against 0.08) the ratio is
  0.68. A dark unbreakable wall then reads as open tunnel, which is the one
  confusion that strands a pod. Checking the band by *mean* per layer passes
  even when many pixels overlap. In the Core, "every solid tile gets a 1 px
  dark outline", which erases the outline cue that marks undiggable rock (rule
  6.2.1) in the most important biome. The ore shape table maps 18 ores
  including ruby, glowquartz and spore pearl, none of which are in world's 26.
  Gold `#d8a020` has the pod hull's hue (`#d8a030`). Art gives gold a glow,
  while world says nothing glows before Crystal.
- **Change.** Non-overlapping bands with a ratio of at least 1.5 at the
  edges: back wall 0.03-0.06, undiggable 0.12-0.16, diggable 0.27-0.38,
  ores and hazards 0.60-0.85. Test p90 of the lower layer against p10 of the
  upper layer, not means. In the Core, give undiggable rock a 2 px outline
  plus the diagonal hatch, so it still differs from diggable rock. Map the 26
  ores to shape classes explicitly, with distinct classes inside each biome.
  Shift gold to a greener `#e0c040`, or move the pod base off yellow-orange.

### 12. Medium: contradictions DESIGN.md has not settled

Each of these will be built twice or built wrong. Choose one owner per item.
- **Heat:** core-loop still defines `T_amb = 20 + 0.6 x row` and a table built
  from it, and its magma example uses that table. D2 replaced both. Delete
  them from core-loop.
- **Camera and shake:** core-loop has trauma² x 0.4 tile *plus 2 degrees of
  roll*; art has 4 art px and "no camera rotation or zoom ever", plus a
  different look-ahead. Art's rule wins: rotation breaks the pixel grid.
- **Gas:** core-loop has a 0.8 s fuse, a radius-2 blast and no push. World
  has 0.4 s, triggering on adjacent tiles, and a 1-tile shove. At 0.4 s the
  escape is impossible. Keep core-loop's version.
- **Lava speed:** core-loop says 4 tiles/s; world says 2 tiles/s down and
  0.67 sideways; D12 says only "fast/slow". Choose world's numbers, which are
  more readable.
- **Pulse:** world still describes a push. D7 removed it. Edit world.
- **Pod tiers:** progression gives 8 drill bits at gate levels with names;
  art gives 5 tiers per stat at level/5 with different names and colours.
  Adopt progression's gate-aligned table and have art draw it.
- **Lamp:** core-loop has `3.5 + 0.5L` to 10 tiles at L13 and a 100 degree
  cone. Art has 4.5 to 12 tiles over 8 levels and a 70 to 86 degree cone.
- **Depot against buildings:** core-loop's depot pad does fuel, market and
  repair. World and art build a separate Fuel station (Mo) and Market (Ines).
  Make the depot the forecourt both of them stand at.
- **Keys:** "W from the depot panel opens the workshop", but "any direction
  key closes and drives", and W is thrust. B appears in the base flow
  (progression section 11) but is also the Express Pad research (L1). Use 2 or
  Tab for the workshop, and decide whether B is base or research.
- **Hardness gates:** progression's drill gates assume a "hard rock" at 2x
  typical (core-loop's generic table). World's named materials top out at
  1.16 to 1.6x (mossbasalt 8.0, obsidian 17, concrete 30), and D1 makes
  world's table the source. Computed from world's table, the gates fall 1 or
  2 levels (Fungal L6, not L8; Ruins L12, not L14). Preferred fix: give each
  biome one "dense" material at 2.0x in about 10% of tiles. That keeps
  progression's gates and adds in-biome routing choices (dig around it or
  upgrade).
- **Ore mass:** D3's formula (kg / 10 x 1.12^b) makes Core ore about 2.4
  where the model used 3.8, so every late climb and fuel figure in the
  timeline is stale. Rerun the model.
- **Stale text:** world's `10 x 2.2^(T-1)` price formula (replaced by D4) and
  the jackpot multipliers of x20 to x30 (replaced by D5) are still in world.md.

### 13. Medium: feel risks

- **Constant drilling shake.** Continuous camera trauma while drilling, plus
  ±0.03 tile pod jitter, plus a 30 Hz tile jitter at crack stage 3+, for 2
  or more hours, is fatiguing and smears pixel art. Put drill vibration on the
  pod sprite and the tile only. Camera shake is for breaks, impacts and
  blasts.
- **Feathering every drop.** With a fall cap of 12 and a v_safe of 9, every
  drop longer than 2.5 tiles hurts, so each trip down your own shaft needs
  thrust taps near the floor (core-loop's magma example says so). Auto-brake
  in a dug column (see 2c) removes the chore.
- **Lamp at L0** is 3.5 tiles on a 22 x 12 tile screen. That is fine for
  mood, but scanner L1 does not arrive until 13 minutes. Ore Sense (G1, 20
  data, dive 3) is the right patch. Keep it guaranteed early.
- **Gas escape.** Backing off 2 tiles in a 0.8 s fuse after a reaction time
  of about 0.25 s works sideways (drive acceleration 40), but it is tight when
  drilling down (thrust acceleration 19 empty, 4.6 loaded). Scale the fuse
  with load, `0.8 x k_m^0.25`, or let the blast miss a pod directly above it.

### 14. Medium: v1 scope is too wide for this quality bar

- **Problem.** v1 includes 6 extra planets, each with a new physics system
  (geysers, icicles, flowing water, 0.6 g with floating rocks, magnetic
  storms, active wardens), 36 to 48 more relic texts, a 35-node tree, drones,
  daily contracts, handicap contracts, a supply crate, a rested bonus and 30
  achievements. The core feel (drilling, lighting, lava flow, the shaft
  economy) is what decides whether this is "top notch", and it will be
  starved.
- **Change (v1 cuts).** Ship Vell plus **2 planets**: Cinder (heat only) and
  Ferrum (modifiers only, no new physics). Defer water, low gravity and
  wardens. Cut the tree to about 20 nodes (fold the Waystation and Ore Chute
  into the Shaft Lift; move the Drone, Twin Drones and Contracts to later).
  Replace daily contracts with Ines' orders (10a). Keep the market board,
  offline card and silo, which are cheap and strong.

### 15. Low: the bot is a project of its own

A bot that flies, routes and judges risk well enough to stand in for a human
is as hard as the game. A weak bot tunes the economy to a weak player. Use two
levels: a scripted dive runner on the real rules to measure per-biome
statistics (pieces per minute, transit, damage), feeding the fast analytic
model for the 4-hour and 10-run curves. Validate both against two or three
human playtests before trusting either.

## Keep these

- The drilling rules: the 0.10 s engage delay, chain digs, the 0.15 s buffer,
  progress that decays at twice the rate it was gained, and corner
  forgiveness. Together they give the dig its Celeste-grade feel.
- The fuel-home tick computed by BFS, and the warning ladder.
- Lava as a fluid you plan around (the sump trick in the magma example). This
  is the best skill expression in the design. Build more of it.
- The wreck crate, with no permanent loss and recovery as a small goal.
- The anti-burst guards (biome-entry jump of at most 1.7x, price growth of
  at least 1.45, jackpot cap) and the next-goal line. Keep the guards. Give
  the player decisions under them (7).
- The story: Wren's thread, the Seed rising through *your own shaft*, Ida's
  line, the cradle list growing per launch. It is a real reason to prestige.
- Art: the lighting grid plus 24 dynamic lights, soft occlusion, the
  hue-preserving tone map, the luminance-band spec with a CI squint test, a
  pod that shows its build, and a Core that inverts to glare. Fix the band
  overlap (11) and keep the rest.
- The offline card, the silo capped in hours, and no streaks or guilt
  messages.
