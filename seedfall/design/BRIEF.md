# Deepcore: shared brief for the design team

Every designer reads this first. It holds the anchors everyone shares, so the
four design documents written in parallel fit together. If you need to break an
anchor, say so explicitly at the top of your document with the reason.

## The game

A standalone browser **mining incremental** in the manner of Motherload plus
idle/incremental games. You fly a drilling pod down through a planet, haul ore
back up, sell, upgrade, go deeper. Fuel, hull and cargo limits create the
tension on each dive ("can I make it back up?"). An incremental layer
(automation, research, prestige to new planets, achievements, a collection
log) gives long-term pull. It must be super addictive, with superb game feel,
and look awe-inspiring while staying readable at a glance.

The user's goals in his words: "top notch", "look absolutely awe-inspiring",
gameplay and game feel superb and super addictive.

## Platform and tech (fixed)

- Static web page, TypeScript, Vite, WebGL2. Later ported into a launcher
  ("pal") as a panel game: must play well at **720x390** and scale to a full
  window (1440x900). Keyboard-first (arrows/WASD to fly and drill, number keys
  for items, E to enter a building, Esc to close), mouse for menus.
- Pure rules in `src/game/` (no DOM), rendering/UI/audio in `src/surface/`.
  A headless bot plays the real rules to tune the economy.
- All audio synthesised (WebAudio). All art procedural (generated in code).
- Saves in localStorage, versioned, autosave; offline progress computed on
  return.
- UI text: plain, quiet words, no jargon.

## Anchors

- **Look:** lit pixel art. Each tile is 16x16 art pixels; the scene is
  rendered at low internal resolution with integer upscaling (crisp pixels),
  with dynamic lighting computed per art pixel (pod lamp cone with soft
  occlusion through rock, emissive ores, lava, bioluminescence), bloom,
  tone-mapping and colour grading on top. About 12 tiles tall visible at
  720x390, about 16 at 1440x900. Think Dome Keeper / Noita / lit Terraria.
- **World:** a grid 48 tiles wide (bedrock walls at both edges), about 770
  tiles deep to the core chamber. 1 tile = 10 m of displayed depth (so the
  core is at about 7.6 km). Surface is row 0; above it the sky and the town.
- **Biomes (top to bottom, rough row ranges, refine them):**
  0. Topsoil 0-60
  1. Stone (the old mines) 60-160
  2. Crystal caves 160-280
  3. Fungal / bioluminescent hollows 280-400
  4. Magma 400-540
  5. Ancient ruins 540-680
  6. The core 680-770 (the core chamber at the bottom is the goal)
- **Pod:** fits a 1-tile tunnel. Drills left, right and down (not up). Flies
  up with thrust. Motherload-style: drilling a tile takes time based on the
  tile's hardness vs drill power; the pod moves into the tile as it digs.
- **Stats you upgrade:** drill, engine (thrust), fuel tank, hull, cargo bay,
  radiator (heat), lamp (light radius), scanner (see ores/hazards through
  rock).
- **Currencies:** cash (sell ore), data (research), core shards (prestige).
- **Town on the surface:** fuel station, market, workshop (upgrades), supply
  store (consumables), lab (research), rig office (automation), launch site /
  observatory (prestige, planets).
- **Session shape targets (hard, verified later by a simulator):** first
  upgrade within ~1 minute; a meaningful purchase every few minutes early; a
  new biome roughly every 10-20 minutes early on; first prestige (reaching the
  core and launching it) around 2-4 hours; never a dead wall where nothing
  affordable feels worth it; no bursts (one dive buying ten upgrades is bad).
- **Readability is a firm rule:** the pod, diggable tiles vs rock you can't
  dig, ores, and hazards must read at a glance at 720x390. Effects stay behind
  and dimmer than the things you act on.

## Deliverables

Each designer writes ONE markdown file in `design/` (only that file) with real
numbers, formulas and names, written for the engineers who will build it.
Be concrete: tables, formulas, ranges, examples of a minute of play. Explain
the why behind each choice in a sentence. No fluff.
