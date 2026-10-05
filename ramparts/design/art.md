# Ramparts: art direction

Owner: art director. Scope: how everything looks and moves, what the renderer, VFX and UI engineers
build, and what a critic checks screenshots against. Numbers here are targets; where a number has to
be tuned on screen, the rule that decides it is stated next to it. Mechanics (radii, timings, counts)
come from `systems.md` and `content.md`; where this file draws a mechanic, it uses their numbers.
DESIGN.md's Revision 1 rulings (R1-R34) are applied here.

## 0. The one-paragraph target

**A lit, hand-made war table.** Each battle is a small floating slab of land, cut out of the world
like a museum diorama: a calm, softly lit, low-saturation landscape with a clear road through it,
earth and rock strata showing on its cut edges, and a soft painted sky behind. On that calm stage the
things that matter are the only loud things: crisp, outlined, saturated enemies; sturdy towers with
one bright accent each; projectiles that glow. Warm like Kingdom Rush, lit like Bad North and
Townscaper (one low warm sun, cool soft fill, long gentle shadows), with Islanders' restraint in the
ground palette. Our own touches: the slab's cut edge with layered strata and hanging roots, the war
table framing that carries into the run map, and an enamel-and-brass UI that never sits on top of the
play area.

### The four rules every screenshot is judged on
1. **Calm stage, loud actors.** The ground, props and sky stay inside the value and saturation band in
   section 3.1. Only units, projectiles, statuses and UI may leave it.
2. **The road reads first.** In a 1-second glance a stranger can trace the route from spawn to gate.
3. **Effects live behind and below.** Ground decals, smoke, ambient particles and aura fills are drawn
   before units, never brighter than a unit's body, never above 55% opacity over a unit.
4. **Nothing gets lost at 720x390.** Every rule below has a 720x390 number; that size is the one we
   design for, 1440x900 is the one we polish for.

---

## 1. Overall look and framing

### 1.1 The slab
- The battle map is a rectangular slab, **32 x 18 world units** of playable top (1 u is about a metre;
  the generator may vary it 30-34 x 17-19). The top is gently undulating (height noise amplitude
  0.25 u, never under the road or a pad, which are flattened with a 1.2 u falloff).
- The slab extends **1.5 u** beyond the playable rect on every side as non-playable dressing (trees,
  rocks, a stream), then ends in a **cut edge**: a near-vertical cliff 4.5 u deep made of 3-4 strata
  bands (each band 0.8-1.6 u, its top edge jittered by 0.15 u, slightly inset 0.05-0.2 u so bands
  catch light differently). Under the bottom band the slab tapers into a rough rock root (a cone of
  noisy faceted rock, 3 u, fading into fog). Hanging roots/icicles/vines per act dangle from the top
  lip (instanced, 20-40, 0.4-1.5 u long, swaying on a 1.5 s period).
- Waterfalls: where a stream or the act's water reaches the edge, it pours off the slab as a ribbon
  (scrolling foam shader) that dissolves into mist particles 3 u below. One per map at most. This is
  the "awe" detail that costs nothing to readability because it is off the playable area.
- Spawn: the road enters from the slab edge through an act-themed **horde gate** (broken arch,
  obelisk pair, ice teeth, lava portal) with a dark swirling mouth. Exit: the road ends at **our gate**,
  a little castle gatehouse with blue-and-gold banners standing on the slab edge. It is the hero of
  the map composition (lit, crisp, 2.5 u tall), and it reacts to leaks.

### 1.2 Background
- Behind the slab: a vertical sky gradient (two stops, per act) rendered as a full-screen quad, plus
  **two layers of distant silhouettes** (low-poly hills/dunes/peaks/spires) drawn as flat, unlit,
  fog-coloured shapes at 85% and 65% fog mix. They are pre-softened (vertex colour fades to fog at
  their base, no hard edges) so they read like a painted backdrop, never like level geometry.
- Slow drifting cloud puffs (low-poly, unlit, fog colour + 6% value) below the slab's rim at the
  slab's mid-depth, parallaxing 0.3x with camera breathing. They sell "floating" and hide the root.
- No tilt-shift or depth-of-field pass: the backdrop is soft by construction, which is cheaper and
  keeps the play area 100% sharp. (Rejected DoF: it blurs units at the slab's far edge.)

### 1.3 Camera
- Perspective camera, **vertical FOV 30 deg**, **pitch 57 deg below horizontal**, **yaw 0** (map north
  is screen up). The narrow FOV gives near-isometric readability (towers at the back are within 12% of
  the size of those at the front) while keeping the diorama's depth.
- **Fit rule**: compute the camera distance so the playable rect (not the dressing) fits inside the
  viewport minus the HUD insets (section 7.6), with 3% margin. At 720x390 (aspect 1.85) this binds on
  height; the extra width shows dressing and the slab's side edges. At 1440x900 (aspect 1.6) it binds
  on width; the extra height shows more sky above and the strata and root below. Both look intended
  because the slab always has dressing and cut edges to show.
- Target density: **at 720x390, >= 20 px per world unit at the map centre**; at 1440x900 about 38 px/u.
  If a generated map would fall below 20 px/u at 720x390 it is too big and the generator shrinks it.
- **Breathing**: during battle the camera drifts on a Lissajous path, 0.12 u amplitude, 14 s and 19 s
  periods, plus 0.3 deg yaw sway. Small enough to go unnoticed consciously, enough to make the
  diorama feel alive. **Off below 900 px canvas width** (R33): at 720x390 every pixel of aim matters
  more than the life it adds. Shake (5.4) is separate.
- No player-controlled zoom or rotation in battle (readability and click targets depend on the fit).
  The title and victory screens orbit (7.11, 7.12).
- Intro: on entering a battle the camera starts 8 u higher and 10 deg steeper, and eases
  (easeOutCubic, 1100 ms) into place while the slab rises (7.13).

---

## 2. Palettes per act

All colours are sRGB hex as they should appear on screen in direct sunlight after tone mapping
(neutral tone mapping, 6.2, keeps base colours faithful; tune material colours until a screenshot
colour-pick matches within 4 L*). L* is CIELAB lightness, used for the value budget.

### 2.1 Shared across acts
| Thing | Hex | Note |
|---|---|---|
| Our faction primary (banners, soldiers' tabards, our gate) | `#3F78D6` | royal blue |
| Our faction metal trim | `#E3B655` | warm gold |
| Our faction cloth light | `#F1EADB` | off-white |
| Pad stone (all acts, tinted 15% toward act ground) | `#A9A08F` | L* 66 |
| Pad rim groove | `#5E574C` | |
| Unit outline (all acts) | `#1C1512` | inverted hull, 3.2 |
| Blob shadow | `#000000` at 38% | multiplied into ground |

### 2.2 Act 1: Meadow
Mood: *bright late morning, hay and wildflowers, an old kingdom's farmland, the calm before.*

| Element | Hex | L* |
|---|---|---|
| Ground base | `#8C9E63` | 62 |
| Ground variation (noise, 20% of area) | `#7E9458` / `#9AA66E` | 58 / 66 |
| Road | `#C2AC80` | 71 |
| Road edge (0.25 u band, darker, trodden) | `#8E7A55` | 52 |
| Road kerb stones (sparse) | `#B3AB9A` | |
| Cliff strata (top to bottom) | `#6A5537` topsoil, `#8C7B66` sandstone, `#6F665E` grey rock, `#4E4744` deep rock | |
| Water deep / shallow / foam | `#4C8AA0` / `#7DB5B8` / `#E9F2EC` | |
| Foliage dark / mid / light | `#4F7A3E` / `#6E9549` / `#93B060` | |
| Flowers (tiny, sparse, < 2% of pixels) | `#E9DCA8`, `#D9A2A8`, `#C9C3E6` | |
| Sky top / horizon | `#8FBBD4` / `#F1E4C6` | |
| Fog colour / density | `#E6DCC0` / FogExp2 0.010 | |
| Sun colour / elevation / azimuth / intensity | `#FFE7BD` / 48 deg / from upper-left (az 135 deg) / 3.0 | |
| Hemisphere sky / ground / intensity | `#CFE2EF` / `#6F6B4C` / 1.0 | |
| Enemy key colour (act tint) | rust `#C2502E` | |

- Ambient particles: 40 pollen motes (`#FFF4D0`, 0.04 u, alpha 0.5, drifting 0.2 u/s on curl noise),
  6 butterflies (two quads, flapping 6 Hz, wandering in the dressing only, never over the road).
- Motion: grass tufts sway (vertex shader, 0.06 u at tip, 2.4 s period, wind direction shared with
  cloud drift), tree crowns sway 0.03 u at 3.5 s; water normal-scroll 0.08 u/s, shoreline foam pulses.
  Cloud shadows: a large soft generated noise texture scrolls across the slab at 0.25 u/s, darkening
  by at most 10% (a living ground, never dark enough to hide a unit).
- Signature props: hay bales, a windmill (blades turn 0.15 rev/s), split-rail fences, low stone walls,
  round deciduous trees (icosphere crowns, 2-3 lobes), a well, scattered boulders, a shrine stone.

### 2.3 Act 2: Desert ruins
Mood: *hot afternoon, bleached stone, a buried empire, wind and long blue shadows.*

| Element | Hex | L* |
|---|---|---|
| Ground base (sand) | `#C7AA7C` | 71 |
| Ground variation (ripple shading, dune crests) | `#B89A6C` / `#D3B98D` | 65 / 76 |
| Road (old paved way, cool flagstones) | `#9C9886` | 62 |
| Road edge (broken kerb, sand drift) | `#6E6656` | 43 |
| Cliff strata | `#C49A68` sand, `#B07A52` red sandstone, `#8A5E44` deep red, `#5C4438` dark | |
| Water (oasis, rare) deep / shallow | `#2F8C8A` / `#69B9A6` | |
| Foliage (palms, scrub) dark / mid / light | `#5C7A3C` / `#7E9450` / `#A7A868` | |
| Sky top / horizon | `#6FA3C8` / `#F3D9B0` | |
| Fog colour / density | `#EBD3AA` / 0.012 | |
| Sun | `#FFE2B0` / 62 deg / az 120 deg / 3.4 | |
| Hemisphere sky / ground / intensity | `#BFD6E8` / `#9E7B55` / 0.9 | |
| Enemy key colour | teal `#2E8C86` | |

The road here is darker and cooler than the ground (the opposite of Meadow) because sand is light.
The rule in every act: road vs ground contrast >= 9 L* plus a hue shift, with the darker edge band
always present.

- Ambient particles: 60 sand streaks (stretched quads, `#F6E3C0` alpha 0.3, moving with the wind at
  1.2 u/s, only across the dressing and the slab's top third), heat shimmer above the cliff edges only
  (screen-space refraction in a mask; never over the playable rect).
- Motion: palm fronds sway 0.05 u at 3 s; sand trickles off the slab edge (particle ribbon); cloth on
  ruins flaps.
- Signature props: broken columns and colonnades, half-buried giant statue heads, obelisks, palm
  clusters, sun-faded canvas awnings (`#B65A42`, `#3E7B8C`), clay pots, a dry wadi bed.

### 2.4 Act 3: Frozen peaks
Mood: *thin cold air, a pale noon, wind-scoured snow, pines, silence.*

| Element | Hex | L* |
|---|---|---|
| Ground base (packed snow, kept mid) | `#B4C2CB` | 78 |
| Ground variation (wind-carved, blue shadows) | `#A2B3C0` / `#C6D1D7` | 72 / 83 |
| Road (trodden slush and stone) | `#7A746E` | 49 |
| Road edge (dirty snow berm with ruts) | `#9AA2A6`, ruts `#5C5650` | |
| Cliff strata | `#D7E1E6` snow cap, `#7D8791` granite, `#5D6672` slate, `#3F4552` deep | |
| Water / ice | frozen lake `#8EB9CF` with crack lines `#E4F2F8`; open water `#3E6F8A` | |
| Foliage (pines) dark / mid / snow-laden tip | `#2F4F44` / `#41665A` / `#DCE6EA` | |
| Sky top / horizon | `#7C9CC0` / `#DCE6EE` | |
| Fog colour / density | `#D4DEE6` / 0.016 | |
| Sun | `#FFF1DC` / 34 deg / az 150 deg / 2.6 | |
| Hemisphere sky / ground / intensity | `#C6D8EC` / `#7D8796` / 1.25 | |
| Enemy key colour | crimson `#B8323A` | |

Snow is the brightest ground in the game (L* 78). It is allowed because enemies here are dark-bodied
with crimson cloth and carry the dark outline; the grade (6.3) pulls highlights down 4%.

- Ambient particles: 120 snowflakes (`#FFFFFF` alpha 0.7, 0.03-0.06 u, falling 0.5 u/s, tumbling);
  a wind gust every 9-14 s turns them sideways for 1.5 s and lifts a spindrift ribbon off the slab edge.
- Motion: pines barely sway (0.015 u); a frozen waterfall with a thin trickle; breath puffs from
  footman-class enemies (a tiny white quad every 1.2 s, only while < 80 enemies are on screen).
- Signature props: snow-laden pines, ice crystal clusters (non-emissive, `#BFE6F5`), a ruined frozen
  watchtower, rope bridges, cairns, mammoth bones, a frozen lake.

### 2.5 Act 4: Volcanic citadel
Mood: *dusk under an ash sky, obsidian and basalt, slow rivers of lava, the enemy's home.*

| Element | Hex | L* |
|---|---|---|
| Ground base (ashen basalt, lifted to mid-dark) | `#6B605C` | 41 |
| Ground variation (ash drifts / cooled lava) | `#7C716B` / `#564C4A` | 48 / 33 |
| Road (pale ash causeway, the brightest ground) | `#A39488` | 62 |
| Road edge (dark obsidian kerb) | `#3A3133` | 21 |
| Cliff strata | `#4A3F3E` basalt, `#2E2628` obsidian, `#5A2E22` scorched, glowing seams `#FF7A2A` | |
| Lava (emissive, dressing and channels only) | core `#FFB347` (emissive 2.2), crust `#C2401C`, dark crust `#3A1E18` | |
| Foliage (dead trees, ember moss) | wood `#3B3230`, moss `#7A4A2E` | |
| Sky top / horizon | `#3A2C3E` / `#C2704A` | |
| Fog colour / density | `#7A4C3E` / 0.014 | |
| Sun (a red low sun through ash) | `#FFB27A` / 28 deg / az 210 deg (from upper-right, a change of mood) / 2.4 | |
| Hemisphere sky / ground / intensity | `#8A6A7C` / `#FF8A4A` (lava bounce) / 0.9 | |
| Enemy key colour | bone `#E2D6C0` on obsidian bodies | |

Lava is the one place the background may bloom. Rules: never within 2 u of the road, at most 6% of
the playable rect, emissive <= 2.2 so it blooms softly but stays dimmer than fire projectiles (3.0+).

- Ambient particles: 80 embers (`#FFB060`, additive, rising 0.4 u/s with flicker, dying at 2-4 u
  height) and 60 ash flakes (`#4A4040` alpha 0.5, falling). Embers stay out of the playable rect's
  lower 60% (the bottom of the screen, nearest the camera).
- Motion: lava surface flows (two scrolling noise layers, crust cracks pulse on 3 s), masked heat
  shimmer over lava channels, a distant volcano with a slow smoke column in the backdrop.
- Signature props: obsidian spires, chained braziers, the black citadel in the backdrop with one lit
  line of windows, iron cages, skull-faced gates, basalt columns (hex prisms).

### 2.6 Title screen
Mood: *golden hour over our own castle, the last light before the war.*
- A unique slab: our castle on a hill ringed by walls (the ramparts), a road winding up to it, the
  Meadow palette shifted warm. Sun `#FFC98A` at 14 deg elevation (long shadows), intensity 2.8; hemi
  `#B9C8E8` / `#6A5A44` 0.8; sky top `#5E7FB6`, horizon `#F5C08A`; fog `#E7B98C` 0.012.
- Castle windows (`#FFCF7A`, emissive 1.6) light one by one over the first 4 s.
- Ambient: pollen, 6 far-away birds (flocking boids), banners flapping.

### 2.7 Run map (the war table)
- The act's map is **a flat painted map of the whole act, all of it visible at once in 2D** (R31):
  floors left to right, 4 lane rows, in that act's ground palette **desaturated 35% and lifted 8
  L***, like a campaign map drawn on vellum, with roads replaced by inked paths and the act's props
  as small painted glyphs.
- It lies on the war table: a dark walnut `#3A2A20` frame with brass corner fittings round the
  map, lit by a soft lamp gradient from the upper-left (`#FFD9A0` at 18%), vignette 0.35. The frame
  is drawn in the screen margin, never over a node.
- Node tokens (7.10) sit on the map; no camera, no scrolling. Z zooms 1.6x on the current floors.

---

## 3. Readability spec

### 3.1 Value and saturation budget
Measured on a screenshot after the grade, in L* (lightness) and HSL saturation S.

| Layer | L* range | S max | Bloom | Notes |
|---|---|---|---|---|
| Sky/backdrop | any | 35% | never | soft, no edges |
| Ground, cliffs, props | 33-83 (per act table) | 30% | never (lava excepted) | within ±12 L* of the act ground, except the road band and edge |
| Road | >= 9 L* from ground, plus a hue shift | 30% | never | edge band always darker than both |
| Pads (empty) | ground +4 to +10 | 15% | never | |
| Tower bodies | 30-80 | 35% | never | only the accent part may reach 75% S |
| Tower accent (one per tower) | 55-90 | 85% | emissive allowed, <= 1.6 | |
| Enemy bodies | 15-45 (acts 1-3), 60-85 (act 4) | 70% (key colour) | never | must differ from the local ground by >= 22 L* |
| Enemy status treatments | any | 90% | allowed (fire, ward glow) | |
| Projectiles | 70-100 | 100% | yes, emissive 2-4 | the brightest moving things |
| Ground VFX (puddles, scorch, aura and range fills) | any | 60% | no | fill opacity <= 30%; drawn before units |
| Air VFX (smoke, dust, explosion bodies) | any | 50% | flash core only, 120 ms | <= 55% opacity over a unit |
| UI | any | any | n/a | never covers the playable rect except the radial menu and tooltips |

**What may be brighter than what** (top wins): UI text > projectile cores > hit flashes > enemy status
glows > tower accents > enemies' key colour > road > ground > props > backdrop.
The one hard pair: **no effect may be brighter than an enemy it overlaps for longer than 150 ms.**

### 3.2 How every enemy is drawn
- Low-poly, flat-shaded with a soft wrap term (lambert wrapped 0.3 so shadow sides stay readable),
  plus a **fresnel rim** (`#FFF1DA`, strength 0.25, power 3) that separates them from the ground.
  In act 4 the rim is `#FFC79A` at 0.4.
- **Inverted-hull outline** on every enemy, soldier and boss: back faces, extruded along normals in
  view space, screen-constant at 1.0-1.6 px at 720x390 (scaled by uiScale above it), colour
  `#1C1512`. Towers and props have **no** outline (keeps the stage calm and the actors distinct); a
  tower gets a gold outline (`#FFD36B`, 0.05 u) only when hovered or selected.
- Bodies are 3-7 primitive parts (capsules, boxes, cones, low icospheres) in one instanced mesh per
  role. Walk animation is procedural in the vertex shader (bob, waddle, limb swing by part id); no
  skeletons.
- **Facing**: enemies face their direction of travel (yaw lerp 120 ms). Size classes read at a glance:
  S (0.45 u tall), M (0.75 u), L (1.2 u), XL (1.8 u), Boss (2.6-3.4 u).
- Every ground unit has a **blob shadow** (soft ellipse decal, footprint x 1.3) besides the shadow map.
  Flyers have **only** a blob shadow, sized and softened by altitude.
- Colour coding by role is **shape plus one marker colour**, never colour alone:

| Marker | Colour | Means |
|---|---|---|
| Steel plates (boxy plates on shoulders/chest, bright specular) | `#8E98A6`, spec `#FFFFFF` | armoured (physical resist) |
| Violet rune halo (thin floating ring at chest height, emissive 1.4) | `#A472FF` | warded (magic resist) |
| Ground shadow offset below, wings | n/a | flying |
| Green glow on a staff | `#5FD08A` | healer |
| Pale cyan hex bubble | `#BFF6FF` | shielded (by a shieldbearer) |
| Gold crown rim, 1.15x scale | `#E8C15A` | elite |

Our side is blue, white and gold; enemy colour logic never uses blue, and our units never use red.

### 3.3 Enemy silhouettes
Heights in world units (u); at 720x390, 1 u is about 20 px. Body = act key colour cloth over a dark
body (`#2E2622` in acts 1-3; obsidian `#1E1A1C` with bone `#E2D6C0` armour and masks in act 4). One
name per role in every act (R32): the act changes only the key colour and one trim (content.md 4.3:
I leather and straw, II bronze plates and wraps, III fur collars and frosted metal, IV bone on
obsidian), never the silhouette.

| Role | Size / height | Shape language | The read | Motion |
|---|---|---|---|---|
| Footman | M 0.75 u, footprint 0.5 | upright capsule, round helmet, small round shield on the left | the baseline: "a little soldier" | steady march bob 2 Hz |
| Runner | S-M 0.6 u, leaning 25 deg | thin wedge, long legs, trailing scarf in key colour | forward lean + scarf streak | scurry 4 Hz, dust puff every 300 ms |
| Brute (armoured) | L 1.2 u, footprint 0.9 | wide trapezoid, tiny head, huge steel shoulder plates | steel plates dominate the silhouette | heavy stomp 1.2 Hz, dust at the feet |
| Warded acolyte | M 0.8 u | tall hooded cone robe (a triangle), hands together | violet rune halo at the chest | glides, robe hem sways, no bob |
| Shieldbearer | L- 1.0 u | footman frame behind a tall rectangular tower shield with a cyan gem | big rectangle in front, cyan gem | slow march; shielding raises the shield and a cyan pulse rings out |
| Shaman | M 0.85 u | hunched, antler headdress, crooked staff with a green light | green light above the head | shuffle; healing sends green motes up from allies |
| Splitter (slime) | M 0.7 u, wide | squashed sphere of translucent key-coloured jelly, darker core | jiggling blob, no limbs | squash-stretch hop 1.6 Hz; splits into 2 S blobs |
| Shade (stealth) | M 0.8 u | ragged cloak with no feet, two eye dots | a ghost, tattered hem | floats, tatters wave |
| Swarmling | S 0.45 u, footprint 0.3 | tiny beetle-imp, 4 legs, oversized head | small and many, always in clumps | skitter 6 Hz |
| Sapper | M 0.7 u | crouched, a big bomb pack (sphere) on the back with a lit fuse `#FFD27A` | the bomb on the back | sneaky crouched run |
| Bat (flyer) | S 0.5 u, wingspan 0.8 | wide V wings, tiny body | V shape at altitude 1.4 u | flap 7 Hz, weaves ±0.3 u |
| Drake (flyer) | L 1.4 u, wingspan 2.4 | long neck, big membrane wings, tail | big wings and tail at altitude 2.0 u | flap 1.4 Hz with glides, banks on turns |
| Juggernaut (elite) | XL 1.8 u | siege golem with a ram head, banded steel, crown rim | biggest non-boss, ram plough; soldiers bounce off | ground dust per step |
| Warlock (elite) | L 1.3 u | tall robed figure, floating grimoire and skull lantern, crown rim | lantern and book in orbit | glides; summoning = it stops, a violet rune circle turns for the 1.5 s channel, then 3 grey cracked Risen claw up out of it |
| Matron (elite) | XL 1.6 u, footprint 1.4 | swollen brood mother: big abdomen sack, small head | a huge pulsing rear sack | slow crawl; births swarmlings from the sack |

**Flyers**: a blob shadow directly below (alpha 0.45 at altitude 1.4 u, 0.32 at 2.0 u, blur growing
with altitude). While a ground-only tower is being placed or hovered, flyers also get a faint drop line
(`#1C1512` alpha 0.18, 0.02 u wide) from body to shadow, which makes "this one can't be hit by it"
visible. Flyers draw after ground units; the camera pitch keeps them from fully covering one.

**Shade (stealth)**: drawn at 30% alpha with ordered dither (no sorting issues), outline at 40%, a
slow refractive shimmer, eyes at full opacity (`#E6F0FF`). The player always sees them (no hidden
information) but they look untouchable. **Revealed**: full opacity over 150 ms, a beacon-gold outline
`#FFD36B` and a gold eye sigil above the head.

### 3.4 Bosses
All bosses: Boss class 2.6-3.4 u, a unique mesh, rim 0.4, outline, no HP bar over the head (the
boss bar in the HUD's top band instead, 7.6), and a nameplate banner on entry (Cinzel, 1600 ms).
Telegraphs follow 5.6 and use the mechanic's own radius and time (content.md 5); every windup is at
least 1.5 s. Seven bosses: acts I-III show one of two on the run map from the act's first second
(R21), each with its own portrait token (7.10).

| Boss | Look | Signature telegraphs |
|---|---|---|
| Gorrak the Warlord (act 1) | a huge warlord on foot, rust cloth, horned helm, a war banner on his back, a cleaver; 2.8 u | **War Cry**: axe raised 1.5 s while a rust-red ring grows to r 3.0 round him; buffed allies get a red chevron above the head. **Muster**: he plants his banner (2.0 s, the banner's cloth flares), then 4 footmen and 2 runners step out of its shadow. **Charge**: he scrapes the ground 1.5 s while an arrow decal runs 4 u ahead along the path |
| Sand Wyrm (act 2) | segmented sand-armoured worm with teal fins, 14 segments, head 3.0 u | **Burrow**: a 1.5 s dust spiral as it dives, then a sand ripple travels along the path; the **surfacing point** shows a pulsing teal ring **2.0 s** before it breaks out (Erupt: towers in r 1.5 get a sand-crust decal). **Sandstorm**: the sky darkens over 2.0 s, then ochre streaks cross the slab for 6 s |
| Frost Colossus (act 3) | a walking glacier giant: granite body, ice crystal growths, a pale-blue glowing chest core; 3.4 u | **Stomp**: lifts a foot for 2.0 s while a pale-blue ring grows to r 2.4; towers inside show a frost-crack decal on their pads during the windup. **Ice Armour**: a faceted ice shell frosts over the body in 2.0 s, the shield segment on the boss bar fills; it cracks open in cyan shards when broken. **Numb** at 800 chill: the chest core dims and frost creeps up the legs |
| Ember Tyrant (act 4) | obsidian dragon-lord, bone crown, magma veins (emissive 1.8, below projectile level); takes wing in phase 2, 3.2 u, wingspan 6 u | **Flame Breath**: head rears 1.5 s while an orange cone decal (3 u x 60 deg) fills toward the densest towers. **Takes Wing**: the phase roar, wings unfurl, it lifts to 2.4 u and follows the air route; its landing point (at most 6 u past take-off, R7) shows a shadow and a ring 2.0 s ahead. **Phase change**: veins flare, 120 ms hitstop. **Molten**: the armour plates fall away and the veins brighten to 1.8 |
| Hive Queen (act 1, alternative) | the Matron's body at boss size: a vast amber-veined brood sack, small crowned head, six legs, rust cloth; 2.9 u | **Brood**: the sack swells and glows green for 1.5 s with a ring r 1.2 at her side, then bats and swarmlings tumble out. **Buried Brood**: three earth mounds rise on the road ahead (rings r 0.8) for 2.0 s, then burst into broodlings (pale grubs, S size) |
| Lich (act 2, alternative) | the Warlock's body at boss size: tall, gaunt, teal-and-bone robes, a skull lantern on a staff, grimoire orbiting; 3.0 u | **Raise Dead**: staff raised 1.5 s while a violet ring r 3.0 (r 4.0 in phase 3) turns on the ground; the dead in it claw up as Risen. **Bone Ward**: ribs of bone knit round it over 2.0 s, a pale shield shell with bone struts (breaks into bone shards). **Grave Tide**: its rune halo dims (ward 65 to 45) |
| Pack-Lord (act 3, alternative) | the Runner's body at XL boss size: a lean wolf-masked raider on all fours, crimson cloth streaming, fur collar, long legs; 2.7 u | **Howl**: head thrown back 1.5 s, a crimson ring r 3.5 pulses out; hasted allies get a crimson streak; pups (runner bodies with wolf masks) bound out of the ring. **Leap**: it crouches 1.5 s while an arrow and a landing ring r 1.2 show 5 u ahead, then a long arc in 0.5 s and a snow burst where it lands |

**A boss that gets through** (R1): our gate flashes and the boss sinks into its own horde gate's
swirl, then walks back out of it 1 s later, its rim glowing hotter for each lap; the boss bar shows
a lap pip, and a small speed chevron (one per lap) sits over the nameplate.

### 3.5 HP bars
- Instanced billboard quads, drawn in a final overlay pass in the 3D scene (depth test off),
  screen-space sized, 0.25 u above the head (scaled by size class).
- **Shown only when damaged**, and always for elites. Fade in over 80 ms on the first damage; after
  2.5 s without new damage they settle to 60% opacity (they don't vanish while damaged).
- Sizes at 720x390 (x uiScale, 7.1): S 14x2 px, M 18x3 px, L 24x3 px, XL/elite 32x4 px.
- Colours: track `#1A1414` at 75%; fill `#E5483B` for every enemy (never green, so it never looks like
  ours); **chip**: lost HP shows `#FFD27A` and drains over 350 ms (ease-in). Armour: a 1 px steel strip
  `#B7C0CC` above the bar (dotted when shredded); ward: the same strip in `#A472FF`; shield: a pale
  cyan `#BFF6FF` segment over the fill's right end, sized to the shield's HP; elite: 1 px gold frame
  `#E8C15A`.
- Our soldiers: fill `#5FC46A`, 14x2 px, only when damaged.

### 3.6 Status indicators
Two channels per status: **a body treatment** (primary; readable even without the bar) and **a pip**
(6x6 px at 720x390, in a row above the HP bar, max 3 by priority, the rest collapse into a "+").

| Status | Body treatment | Pip | Priority |
|---|---|---|---|
| Frozen | encased in a faceted ice shell (instanced low icosahedron, 1.15x body, `#CFF1FF` at 75%, white fresnel rim, cold emissive 0.6); animation stops; blob shadow turns pale blue | snowflake, white on `#5AB8E8` | 1 |
| Chilled | body tint 35% toward `#8FD3FF`, animation slowed to match, 1-2 frost motes falling | none (the tint is enough) | n/a |
| Stunned | 3 yellow stars `#FFE45C` orbiting the head (r 0.25 u, 1 rev per 0.8 s), body tilted 10 deg | none | n/a |
| Burning | 2-3 flame cards on the body (`#FF8A2A` to a `#FFD27A` core, additive, emissive 1.8), rising embers, body 15% darker | flame, `#FF8A2A` | 2 |
| Hexed | 3 violet runes `#B26BFF` orbit at chest height, body tinted 20% toward `#6A4E7C`, violet sparks on every hit | hex eye, `#B26BFF` | 3 |
| Oiled | lower half glossy near-black `#2A2320` (high specular), drips, dark footprints for 400 ms | drop, `#3A3028` with a highlight | 4 |
| Marked | a gold diamond reticle `#FFD36B` above the head, rotating 0.5 rev/s, 1 px line; flashes on every crit | diamond, `#FFD36B` | 5 |
| Shredded | steel plates swapped for cracked darker plates (`#5C6168`), 2 falling shards when applied | broken plate, `#B7C0CC` | 6 |
| Shielded | pale cyan hex bubble `#BFF6FF` (fresnel: 35% at the edge, 5% in the centre), ripples on hit, breaks into hex shards | none (on the bar) | n/a |
| Slowed (not chill) | dust-blue drag streaks behind the feet | none | n/a |
| Rooted | brown roots wrapped round the legs (Thornwood) | none | n/a |
| Revealed | see Shade (3.3) | gold eye | 7 |
| Hard-CC immunity (1 s after any stun, root, freeze or pull, R9) | a pale 150 ms flash, then a faint white rim for the rest of the second | none | n/a |

Readability rule at 720x390: each **body treatment** must be identifiable by colour plus shape at a
16 px enemy height. The critic checks frozen (white-blue blocky shell), burning (orange flicker),
hexed (violet orbit), marked (gold diamond above) and oiled (black lower half). Treatments stack;
frozen stops animation, and freezing removes burning.

### 3.7 Range rings and auras
- Shown when hovering or selecting a tower, hovering a tower in the radial build menu (previewed at
  the pad), hovering an upgrade or spec (the new range as a second, dashed ring), and while aiming a
  commander spell (its area).
- Look: a ground decal ring, line 0.07 u (min 1.5 px), `#FFF6E2` at 80%, a fill disc of the tower's
  accent at 8%, and a soft inner edge glow 0.4 u wide at 18%. The line is dashed (24 dashes) and
  rotates at 0.04 rev/s. Drawn before units; units inside are untouched.
- Air-capable towers get a solid line; ground-only towers (Bombard, Alchemist, Pyre) get short ticks
  instead of dashes, so "ground only" is visible before building.
- Holding **Alt** shows every tower's range ring at once (R28), at 60% of the normal opacity.
- Support auras (Banner, Beacon, Thornwood): while one is selected or being placed, towers inside get
  a pulsing accent outline (0.04 u) so you see what it buffs. Always-on hint: a buffed tower's **pad
  rim** glows faintly in the aura's accent (emissive 0.6, no bloom), with 1-3 small chevrons on the
  rim for stacked buffs.
- Barracks rally point: a small blue `#3F78D6` flag on the road, shown while the barracks is selected,
  movable; its reach is a dotted circle.

### 3.8 Pads
A pad is a round flagstone disc **1.6 u across** (R4), 0.12 u high, with 4 notches and a stake with a
blue pennant (`#3F78D6`) on its side. Pads stand at least 2.0 u apart and 1.3 u from the road's centre
line. Empty pads are the only buttons on the map and must look clickable.

| State | Look |
|---|---|
| Empty | pad stone `#A9A08F`, a carved "+" in the groove colour, pennant flutters at 1.2 Hz |
| Hover (mouse or keyboard focus) | rises 0.08 u (120 ms easeOutBack), rim lit `#FFF1C9` (emissive 1.0, just under the bloom threshold), pennant snaps; keyboard focus adds 4 bracket corners `#FFD36B` |
| Selected (menu open) | gold dashed ring `#FFD36B` rotating 0.1 rev/s, pad stays raised; the rest of the screen dims 12% (an overlay that skips the pad and units) |
| Can't afford (in the radial menu) | the tower button desaturates 80%, cost in `#FF6B5B`; hovering it still previews the range |
| Disabled (sapper bomb) | tower greys 40%, a ticking bomb with a red `#FF4A3A` countdown arc above it |
| Built | the pad rim stays visible round the tower base; buffs glow on it as in 3.7 |
| **High ground** (R25) | the pad stands on a raised plinth of the act's top strata, 0.45 u high with two stone steps on the road side, rim in warm brass `#C9A45A`, and a small chevron-up glyph carved in the "+"; a tower on it shows +15% on its range ring as a second faint ring |
| **Rubble** (ascension 7) | the disc is buried under 6-9 broken stones and a snapped plank (pad stone darkened 20%), no pennant; hover shows a "Clear 60" gold chip; clearing (0.6 s) throws the stones off in a dust ring and the pennant pops up |
| **Ghost layout** (Setup, R13) | translucent towers (35%, accent colour only, no shadow) on the matched pads with the level notch they reached last time, and a "Enter: rebuild" chip under the wave counter; towers you can't afford show greyed |

### 3.9 Damage numbers
- **Only** for crits, single hits >= 25% of the target's max HP, shatter and explosion totals, and
  hits on a boss (aggregated per source per 250 ms). Ordinary hits show only as the bar's chip.
- Max **10 on screen** (the oldest fades early); a new number within 0.4 u of an existing one merges
  into it (adds and re-pops).
- Nunito Sans 900, tabular figures; 11 px base, 14 px crit, 16 px cap at 720x390 (x uiScale);
  2 px outline `#1C1512`.
- Colour by damage type: physical `#FFF6E8`, magic `#CDA8FF`, fire `#FFB15A`, pure `#FFFFFF` with a
  gold outline. Crits get a trailing "!" and a 1.4x pop.
- Pop 1.4 -> 1.0 in 90 ms (easeOutBack), rise 18 px over 650 ms (easeOutCubic), fade in the last
  200 ms. Real-time durations at 2x/3x speed.

### 3.10 Squint test (the critic runs this on every 720x390 screenshot)
Blur the screenshot (Gaussian 3 px) or squint:
1. The road is one continuous, traceable band from the horde gate to our gate.
2. Every enemy is a dark (act 4: light) blob distinct from the ground; S/M/L/XL are distinguishable.
3. Every tower reads as its own vertical mass with one bright accent; empty pads read as light discs.
4. Projectiles are the brightest moving specks; nothing in the background competes.
5. No effect cloud hides an enemy for more than a moment (in a big fight at most 10% of enemies are
   obscured at any time).
6. Flyers are distinguishable from ground units (the shadow offset is visible).
7. Frozen, burning, hexed and marked are identifiable on at least the M and larger enemies.
8. HUD: lives, gold and the wave counter are legible without zooming; no HUD over the road.
9. Grayscale: enemies still separate from the ground (>= 22 L*), the road still traceable.
10. Deuteranopia simulation: statuses still distinct by shape and motion.

---

## 4. Towers

### 4.1 Shared rules
- Footprint fits the pad (base **1.4 u** across, R4). Heights: **L1 1.7 u, L2 2.2 u, L3 2.7 u, spec 3.0 u**.
  Barracks, Bombard and Alchemist are squat (x0.75); Storm Spire and Beacon are tall (x1.15).
- **Materials by level** (shared, so the level reads on every tower):
  - L1: rough timber `#8A6A48`, thatch or plank roof `#B99A62`, rope lashings, a little crooked.
  - L2: rubble-stone base `#9A9286` up to 40% of the height, timber above, slate roof `#5E6670`.
  - L3: dressed stone `#B5AC9C` up to 60%, iron bands `#4A4E55` with rivets, gold trim `#E3B655` on
    the crown, a blue pennant `#3F78D6`.
  - Spec: the L3 body plus a unique crown module (4.3) in the spec's colour, a hanging banner with the
    spec glyph, and one emissive detail (<= 1.6).
- **Accent**: one part per tower (crystal, flame, lantern, banner cloth, coil) in the tower's accent
  colour; the only saturated part, always dimmer than its projectiles.
- **Idle**: every tower has a small life loop (4.2) with a random phase, so a row of the same tower
  never moves in sync.
- **Firing**: two beats, anticipation (60-120 ms) then release with recoil (80 ms out, 200 ms
  settle). Turrets and archers turn to aim (max 540 deg/s, eased).
- **Build** (520 ms): a scaffold frame pops up (0-120 ms), then the parts drop in from 1.5 u above,
  bottom to top, 140 ms each with easeOutBack and a 60 ms stagger; a dust ring on the pad (600 ms) and
  a gold spark burst at the crown at the end. The tower works from the moment the sim says, whatever
  the animation is doing.
- **Upgrade** L1->2 and L2->3 (600 ms): the tower squashes to 0.9 height (100 ms), the old top pops
  off as 6-10 chips, the new parts stack in (easeOutBack), a gold ring sweeps up the body, and a level
  notch (I, II, III) lights on the pad rim.
- **Specialise** (900 ms): a light column in the spec colour (0.6 u wide, alpha 0.5, under the bloom
  cap), the crown module descends and locks with a clank, the banner unfurls, the spec glyph flashes
  as a ring on the ground.
- **Sell**: the tower crumbles into 8-12 chunks that sink into the pad (500 ms); coins pop up and fly
  to the gold counter.

### 4.2 The twelve towers
Silhouette families, readable already at L1: **tall-thin = single target**, **squat-wide = splash**,
**round or organic = area and status**, **open-topped = siege and support**.

| Tower | Accent | Shape (L3) | Idle | Fire |
|---|---|---|---|---|
| Archer | amber `#E6B85C` | tall square tower, open crenellated top with 2 archers (3 at L3), a peaked hood roof on a pole | archers shift weight, scan left and right | archer draws (120 ms), releases, bow snaps |
| Barracks | blue `#4A86E0` | low wide gatehouse with a big arched door, two side merlons, a flag | flag flaps, torch by the door flickers | door swings open (180 ms) as a soldier deploys |
| Mage | violet `#8E6CF2` | tapering stone spire, a crystal floating above the tip inside a ring | crystal bobs 0.08 u and turns, 2 motes orbit | crystal charges (glow up 100 ms), bolt leaves it, ring spins up |
| Bombard | ember `#E2752F` | squat round drum fort, a stubby barrel on a turntable | a smoke wisp from the barrel every 3 s | barrel dips (80 ms), kicks back 0.15 u, grey muzzle puff, 60 ms flash |
| Frost Spire | ice `#86DBFF` | crystalline obelisk in a stone collar, 3 shards ringing it | shards bob, frost mist at the base (ground layer, 20%) | shards align, pulse, a shard flies; frost ring on the pad |
| Alchemist | acid `#A6E04A` | round workshop hut, copper alembic and a bubbling vat on the roof, a swinging ladle arm | vat bubbles, steam puffs | arm swings and lobs a flask |
| Pyre | flame `#FF5A2A` | stone stem with an iron cage basket of fire and a nozzle head | fire flickers (emissive 1.6), embers | basket flares, nozzle sweeps the cone |
| Storm Spire | electric `#7FA2FF` | tall thin metal rod wrapped in copper coils `#B8733A`, a floating ring at the tip | small arcs crawl up the coils every 1.5 s | ring spins, 80 ms bright gather, the bolt jumps |
| Beacon | lantern `#FFE6A0` | round lighthouse with a glass lantern room and a rotating beam head | beam sweeps slowly (soft cone decal on the ground, 10%) | beam snaps to the target, gold diamond appears |
| War Banner | scarlet `#D94A5E` | open pavilion on 4 posts, a huge banner on a central pole, a war drum | banner waves (cloth shader), drum pulses with the aura | drum strike on each aura pulse, a ripple ring on the ground |
| Ballista | steel `#B7C2CC` | open stone platform, a big crossbow on a swivel, a winch | operator cranks the winch | slow aim, crank back (200 ms), heavy release, platform recoils |
| Thornwood Grove | living green `#4FAE5C` | a ring of gnarled thorny roots round a small old tree | leaves rustle, petals fall | roots surge underground (a bulge line) and erupt under the target |

### 4.3 Specialisations
Each spec swaps the crown module and banner glyph and shifts the accent to its variant.

| Tower | Spec A | Spec B |
|---|---|---|
| Archer | **Marksmen**: one tall hooded sniper on a high narrow perch, longbow, green-gold cloak, a spyglass glint | **Volley**: wide fighting platform, 4 archers, a fire-arrow brazier, crossed-arrows banner |
| Barracks | **Paladins**: white-stone chapel gatehouse with a gold dome; soldiers in white plate `#E8E4DA` with gold | **Blademasters**: red-roofed training hall gate; soldiers in dark leather with crimson sashes `#B8323A`, twin blades |
| Mage | **Arcanist**: the crystal splits into 3 orbiting crystals, blue-white `#9FB8FF` | **Hexer**: the crystal becomes a dark violet eye `#B26BFF` in an iron cage |
| Bombard | **Mortar**: a tall heavy barrel pointing up, a stack of shells | **Shrapnel**: three short barrels on a turret, iron spikes round the drum |
| Frost Spire | **Glacier**: a big blocky ice monolith on a frozen floor ring | **Shatter**: the obelisk breaks into jagged shards hovering apart, sharp `#D8F4FF` |
| Alchemist | **Acid**: green glass dome, dripping pipes `#B6F24A` | **Naphtha**: black iron tanks with orange warning bands `#FF8A2A`, a pilot flame |
| Pyre | **Inferno**: a giant basket, a bigger red-orange fire `#FF4A1E` | **Firestorm**: a dragon-head nozzle on a swivel, a blue-hot core `#7FD0FF` in the flame |
| Storm Spire | **Tempest**: two rods with a storm-cloud orb between them, rain motes | **Overload**: one huge caged coil, white-violet arcs `#D8C8FF` |
| Beacon | **Lighthouse**: bigger lantern, wider beam, a warm white halo on the ground | **Hunter's Mark**: the lantern becomes a gold eye sigil, a hunting horn, red-gold banner |
| War Banner | **War Drums**: two giant drums with drummers, a pulse ring every beat | **Treasury**: a gold-roofed counting house with a chest, coin glints |
| Ballista | **Harpoon**: a barbed harpoon with a chain drum, the chain visible | **Siege bolt**: a longer frame, a giant iron bolt, counterweights |
| Thornwood | **Bramble**: thorn bushes with purple-red berries spread over the pad's edge | **Ancient Treant**: the tree becomes a sleeping giant face; its guardian walks out (4.4) |

### 4.4 Soldiers
- Barracks soldier: M 0.7 u, blue tabard `#3F78D6` over steel, round shield with a gold boss, short
  sword; outlined like enemies. They jog to the rally point in a triangle (0.6 u spacing).
- Paladins: white plate, gold trim, kite shields, a soft gold glint when healing (no bloom).
  Blademasters: dark leather, crimson sash, two blades, a quicker idle sway.
- Ancient Treant guardian: L 1.6 u, bark `#5A4632` with moss `#4FAE5C`, slow heavy walk.
- Fighting: a procedural two-beat swing (raise 120 ms, strike 80 ms), a little dust at contact.
- Death: falls back and fades into the ground colour over 500 ms; a small blue pennant marks the
  spot until the respawn; respawn: the barracks door opens and the soldier jogs out.

---

## 5. Projectiles and VFX

### 5.1 Projectile look
All projectiles: an emissive head in the projectile colour (blooms), a ribbon trail (6-12 segments,
fading along its length), no outline. Minimum head size at 720x390: 3 px. Speeds and flight times
are content.md's (R33); the renderer reads them from the sim's projectile, never from this file.

| Tower / spec | Projectile | Head | Trail | Impact |
|---|---|---|---|---|
| Archer | arrow, 0.5 u, slight arc | shaft `#8A6A48`, white-hot tip `#FFF4D6` emissive 2.5 | thin white streak 0.6 u, alpha 0.5 | arrow sticks in the target 300 ms, tiny spark |
| Marksmen | long arrow, straight | gold tip `#FFD36B` emissive 3 | long thin gold streak 2 u | crit: gold star burst 0.5 u |
| Volley | 3 arrows at once, fanning to 3 targets | amber tips (fire arrows: `#FF9A3A` plus an ember) | short | small sparks |
| Arrow Rain (Volley, every 5th) | 8 arrows falling over 1.0 s inside a gold dashed ring r 1.2 | amber tips | short vertical streaks | small sparks, arrows stick 300 ms |
| Mage | magic bolt, sphere 0.22 u | `#C8B8FF` core, `#8E6CF2` halo, emissive 3 | spiralling violet ribbon | violet ring pop 0.6 u |
| Arcanist | chain beam | white-violet line between targets, 2 hops (3 targets), 140 ms each | none | a small pop per hop; Arcane Burst every 4th: a violet ring r 1.0 |
| Hexer | dark orb with a violet rim | `#3A2A4E` core, `#B26BFF` rim 2.5 | smoky violet | a rune stamp on the ground under the target |
| Bombard | 0.3 u iron ball with a lit fuse | fuse spark `#FFD27A` emissive 3 | grey smoke puffs (not bright) | explosion (5.3) at splash radius |
| Mortar | big shell, higher arc; a landing ring (`#E2752F` at 40%) shows during flight | as Bombard | as Bombard | bigger explosion, crater decal |
| Shrapnel | one spiked shell | as Bombard | as Bombard | 6 steel spike shards fly out, then 4 bomblets pop within 1.2 u (small puffs) |
| Frost Spire | frost shard, long icosahedron 0.35 u | `#E4F7FF` core, `#86DBFF`, emissive 2.2 | glittering ice motes | ice burst, frost ring decal 0.8 u |
| Glacier | nova from the tower (no projectile) | an expanding ice ring decal, 400 ms | none | ice spikes pop up briefly along the ring |
| Shatter | shard volley | as Frost Spire | as Frost Spire | shatter on frozen targets (5.7) |
| Alchemist | tumbling flask | glass `#E8FFD0`, acid liquid `#A6E04A` emissive 1.4 | thin green drips | glass smash (5 shards) and a puddle |
| Firestorm | fireball, 0.3 u, high arc; a landing ring `#FF8A2A` at 40% during flight | `#FFD27A` core, `#FF5A2A` shell, emissive 3 | ember trail | small explosion r 0.8, burning-ground decal 3 s |
| Pyre | flame cone (continuous) | 40-80 billboards per tower, `#FFE6A0` core to `#FF8A2A` to `#FF4A1E` to smoke | heat shimmer at the cone's end (masked, low) | targets ignite |
| Storm Spire | chain lightning | jagged polyline (8-12 segments, regenerated every 40 ms), white core 0.04 u, `#7FA2FF` glow 0.15 u, emissive 4 (the brightest thing in the game, 120 ms life) | after-image 80 ms at 30% | a small burst and spark per hop; shields crack visibly |
| Beacon | marking beam | soft gold beam `#FFE6A0` at 40% from the lantern, 200 ms | none | gold diamond appears |
| Ballista | heavy bolt, 1.0 u | iron head, steel shaft, a sharp white tip emissive 2 | short dense streak | heavy thunk, dust; plate sparks on armoured targets |
| Harpoon | barbed bolt on a chain (catenary, 10 segments) | as Ballista | chain | target yanked back; chain reels in (500 ms) |
| Siege bolt | huge bolt through a line of enemies | as Ballista, larger | a long dust streak along the ground | every pierced enemy flashes; a gouge decal along the line |
| Thornwood | root eruption | brown roots `#5A4632` with thorn tips `#C7E07A` | a ground bulge line from the tower | target rooted (roots round the legs) |

### 5.2 Bloom policy
- Render to a half-float HDR target with MSAA; bloom is a mip-chain bloom (three's UnrealBloomPass or
  an equivalent): **threshold 1.0 linear (soft knee 0.5), strength 0.35, radius 0.45**, at half
  resolution (quarter on the low tier). (The sibling Highway game runs UnrealBloomPass at 0.12 on a
  photographic scene; we run hotter because only our emissives cross the threshold.)
- Only these may exceed 1.0: projectile heads and beams, lightning, fire cores, explosion flash cores
  (120 ms), frost shard cores, magic crystals (<= 1.6), lanterns and windows (<= 1.6), lava (<= 2.2),
  ward rune halos (<= 1.4). In-world UI (rings, pad hover) stays <= 1.0.
- Hard caps: nothing over emissive 4.0; only lightning reaches 4.0. Ground, props, unit bodies and the
  non-accent parts of towers are never emissive.
- The bloom input is clamped to 8.0 per pixel, so 30 overlapping fire cones can't white out the frame.

### 5.3 Hits, kills, explosions, leaks
- **Hit flash**: the enemy body flashes white (emissive add `#FFFFFF` 0.8, decaying over 70 ms) on
  each hit, at most once per 100 ms per enemy (more hits extend it); plus a 3-4 particle spark in the
  damage type's colour (physical white, magic violet, fire orange, pure white-gold).
- **Squash**: a hit enemy squashes 8% along the hit direction for 60 ms (big hits 15%).
- **Explosion** (Bombard): 0-60 ms a white-yellow flash sphere (emissive 3, radius 0.4x splash);
  0-300 ms a fireball of 10-16 billboards `#FFB347` to `#C2401C` to smoke `#3A3230` (smoke 40-55%
  alpha, lingering 800 ms, drifting with the wind); a scorch decal (`#2A221E` at 40%, fading over 6 s);
  a dust ring at the splash radius (shows the real hit area); 6 debris chunks.
- **Kill**: the enemy pops into 6-10 low-poly chunks in its body and key colours that fly out and fall
  (light physics, 600 ms, then sink into the ground), a dust puff, and a wisp in the act's key colour
  that rises 1 u and fades (250 ms). Elite kill: plus a gold ring burst, the crown flips off.
- **Leak**: the enemy runs into our gate; its banners whip, the gate flashes red (`#FF4A3A`, emissive
  1.2, 250 ms), the screen edge tints red (`#C0201A` at 25%, 300 ms in, 500 ms out), and the lives
  counter shakes and drops with a cracking heart (7.6).

### 5.4 Hitstop and screen shake
- **Hitstop** (the scene freezes, UI and audio continue): elite kill 50 ms, shatter of >= 5 frozen
  40 ms, boss phase change 120 ms, boss kill 220 ms, the run-ending leak 300 ms. Never on ordinary
  kills; at most one per 400 ms; halved at 2x/3x, where only boss events hitstop at all.
- **Screen shake**: trauma model (offset = max x trauma^2 x noise, trauma decays 1.6/s). Max offset
  0.30 u, max roll 0.5 deg. Trauma per event: bomb 0.08, mortar 0.12, boss stomp 0.35, boss roar 0.25,
  boss phase 0.45, leak 0.2, boss kill 0.6, specialise 0.05; juggernaut steps make dust, not shake.
  The sum is capped at 0.6. A settings slider (0-100%, default 100) scales it.

### 5.5 Coins in battle
- Per kill: 1-3 coins (`#FFD36B` faces, `#B88A2E` rims, 0.18 u, spinning) pop from the body, hop once
  (250 ms), then arc to the HUD gold counter (450 ms, easeInCubic). The counter ticks per coin and
  pulses (scale 1.12, 80 ms). Over 20 coins in flight, they merge into bigger coins.
- Wave income: a shower of 8 coins from our gate to the counter.
- Interest: a small "+N interest" chip slides out of the gold counter at wave start.
- Call-early bonus: coins burst out of the skull button itself.
- Treasury: at each wave start a small crown chip rises from every Treasury and slides to the
  crowns counter (one per wave, however many stand).

### 5.6 Telegraphs (bosses and elites)
- A ground decal ring, cone or stripe in the ability's colour, drawn before units: outline 0.1 u at
  90%, fill rising from 0 to 30% through the windup, plus an inner ring that shrinks toward the edge
  (or a stripe that fills) so the timing reads without a number.
- Windups are the mechanic's telegraph time: **at least 1.5 s** (1.5-2.0 s on every boss ability,
  content.md 5), and the decal uses the ability's real radius or cone. At the trigger the decal
  flashes to 60% for 80 ms, then fades.
- The boss's rim glows its signature colour during the windup (rim strength up to 0.8).
- A "!" flashes at the left of the HUD boss bar at the same time, so it reads at 720x390 even when the
  ring is in a busy spot.

### 5.7 Freeze, shatter, ignite, oil
- **Freeze**: ice grows over the body from the feet up in 150 ms (shell with a rising vertical mask),
  crackle particles, the blob shadow turns pale blue. **Thaw**: the shell drips and fades over 200 ms.
- **Shatter**: the shell explodes into 10-14 fresnel ice shards (`#E4F7FF`) flying 1.5 u, a 50 ms
  white flash (emissive 2.5), a frost ring decal 1 u. Several shatters in one tick merge into one
  white ring and one sound.
- **Ignite oil**: fire touching an oil puddle sends a ring of flame racing round its edge (200 ms),
  then a low flame field (flame cards over the puddle, 1.5 s), then a char decal. Naphtha's explosive
  oil adds a fireball like a bomb (radius = puddle) and trauma 0.1.
- **Oil puddle**: a dark glossy decal `#2A2320` with a thin-film rainbow sheen (20%), 0.9-1.4 u,
  75% alpha. Acid: a green-yellow `#B6F24A` puddle at 50% with bubbles.

### 5.8 Commander spells
- Aiming: a ground circle in the spell's colour in the 3.7 ring style following the cursor; it turns
  grey-red `#8A5A5A` over an invalid spot.
- Each spell keeps one colour; damage spells show their area for their warning time, then strike.

| Spell | Look |
|---|---|
| Reinforcements (Marshal Q) | a blue light column on the path point, 2 soldiers in blue tabards drop in with a dust ring; a thin blue timer ring under them empties over 10 s |
| Meteor (Marshal W) | an orange warning circle r 1.4 fills for 1.0 s while a glowing rock falls from the sky; impact flash, fireball, scorch decal, trauma 0.15 |
| Firebomb (Alchemist Q) | a flask arcs in, smashes into a dark puddle r 1.4 that lights at once (the 5.7 ignite ring), then a fire patch |
| Tar Pit (Alchemist W) | a glossy black pool r 2.0 spreads from the centre in 300 ms, bubbling, with slow ripples |
| Stillness (Seer Q) | a pale blue pulse sweeps the whole slab from the Seer's glyph in the HUD; every enemy frosts over (5.7 freeze) |
| Judgement (Seer W) | a gold shaft of light strikes the target from above, a gold ring on the ground, stars on the stunned |
| Requisition (Quartermaster Q) | the aimed tower gets a gold stamp seal above it and runs its upgrade animation (4.1) |
| Rally (Quartermaster W) | a horn blast ring from our gate, every tower's accent pulses and a small speed chevron hangs over each for 8 s |
| Barrier (Warden Q) | a wall of thick roots erupts across the path (400 ms), sways while it holds, withers at the end |
| Bramble Surge (Warden W) | thorny vines burst from the ground in r 2.2 and wrap the legs of everything inside (the 3.6 root look) |

- Circle spells over flyers: flyers flash and take the hit at half strength; roots and slows don't
  draw on them (R2).
- Cooldowns live in the HUD spell buttons (7.6), never in the world.

### 5.9 Wave preview, call early
- Before each wave: 12 glowing footstep dashes in the next wave's key colour run the road from the
  horde gate (1.4 s, alpha 50%), and a **skull button** bobs over the horde gate. Flying waves also
  show a dashed sky line along their flight path at 1.5 u with small wing glyphs.
- The horde gate's mouth swirls faster as the countdown runs out; at the wave start the gate flares
  in the act's key colour and horns blow.

### 5.10 War supplies (R20)
Each supply has a glyph (7.4) on its slot button and an in-world look when used; aimed ones use the
spell aim circle (5.8) in the supply's colour.

| Supply | Glyph | In the world |
|---|---|---|
| Oil Barrel | a barrel with a drip | a barrel tumbles in and bursts; a dark oil puddle r 1.2 (the 5.7 puddle look) |
| Frost Flask | a stoppered flask with a snowflake | the flask shatters into a white-blue burst r 1.5; everything inside frosts over |
| Gold Cache | a small chest with a coin | a chest pops open at our gate and 12 coins fly to the gold counter |
| Spike Trap | three spikes in a row | a line of iron spikes rises across the path; a small counter (8 pips) on it empties as enemies cross |
| War Horn | a curled horn | a deep horn ring from our gate; every tower and soldier gets a red speed chevron for 8 s |
| Mason's Kit | a hammer over a wedge | sparks and a hammer tap on each disabled tower; their grey lifts at once |
| Flare | a rising star | a red flare arcs up and hangs over the slab for 10 s, a red light pool on the ground; stealthed enemies turn revealed (3.3) |
| Heavy Bolt | a long iron bolt | a giant bolt drops from the sky onto the target, gold impact flash, a pure-damage number |
| Bell | a bronze bell | a bronze shockwave ring rolls across the slab; stars over every stunned enemy |
| Lifeblood | a red vial with a heart | a red mote rises from our gate to the lives counter; hearts fill |

---

## 6. Lighting and post

### 6.1 Lights
- One **DirectionalLight** (the sun, per act values in section 2) plus a **HemisphereLight**; no
  ambient light. Physically based units (three r155+), exposure 1.0.
- A weak second directional from the side opposite the sun (`#BFD4FF`, 0.4, no shadows) to sculpt
  tower silhouettes.
- No point lights in the main pass. Glows (lanterns, fires, windows, explosions) are emissive plus
  bloom, and the light they throw on the ground is a **fake light pool decal** (additive radial
  gradient, max 25%). This keeps the shader count and cost flat at 200 enemies.

### 6.2 Shadows and tone mapping
- Shadow map **2048 x 2048** (1024 on the low tier), `PCFSoftShadowMap`, the shadow camera fitted
  tightly to the slab plus dressing (about 38 x 24 u, ~54 texels per unit), bias -0.0004,
  normalBias 0.03. Penumbra reads ~0.15 u; shadows are ~35% darker than lit ground and blue-ish from
  the hemisphere fill, never black.
- Casters: towers, props, cliffs, trees, soldiers, enemies (instanced; on the low tier enemies don't
  cast and rely on blob shadows). Flyers never cast. Receivers: ground, road, pads, cliff tops.
- Contact shadow: a soft dark ring decal at every tower and prop base (`#000` at 25%, 0.4 u wide).
  No SSAO (cost, and haloing at small sizes).
- **Tone mapping: three's `NeutralToneMapping`** (Khronos PBR Neutral). Chosen over ACES because it
  keeps our hex palette faithful: ACES pushes saturated reds and oranges toward yellow and desaturates
  exactly the units we want punchy, while Neutral still rolls off bloom highlights. Exposure 1.0
  (title screen 1.05). Output `SRGBColorSpace`; every hex is converted to linear on load.

### 6.3 Grade, vignette, fog
Final pass after bloom: contrast, saturation, lift and gain, vignette, a 1/255 dither (no banding in
the sky gradients).

| Act | Contrast | Saturation | Lift (rgb) | Gain (rgb) | Vignette |
|---|---|---|---|---|---|
| Meadow | 1.05 | 1.04 | 0, .004, .008 | 1.02, 1.0, .97 | 0.18 |
| Desert | 1.06 | 1.0 | .006, .003, 0 | 1.03, 1.0, .94 | 0.20 |
| Frozen | 1.08 | 0.96 | 0, .004, .012 | .96, .98, 1.0 | 0.18 |
| Volcanic | 1.10 | 1.05 | .010, .002, .006 | 1.04, .97, .92 | 0.28 |
| Title | 1.06 | 1.08 | .006, .004, .010 | 1.05, 1.0, .92 | 0.30 |

- Vignette: elliptical, starting at 55% of the radius, toward the fog colour x 0.4 (not black), so the
  slab looks like a lit model on a dark table.
- Fog: `FogExp2` per act, applied only to the backdrop, clouds, the slab's root and anything below the
  rim. **The playable top is excluded** (its materials compile with `fog: false`), so the far edge of
  the map never washes out.
- Danger: with lives <= 5, a faint red vignette pulse (`#7A1A14`, +0.06, 2.4 s period) during waves.
  Pause: the scene desaturates to 30% and darkens 25% over 300 ms.

### 6.4 Performance budget
Target: **60 fps at 1440x900, DPR 2, on an M1-class laptop with 200 enemies, 14 towers, 150
projectiles and full particles**; 60 fps at 720x390 on integrated GPUs.

- **<= 150 draw calls per frame.** Enemies: one `InstancedMesh` per role (parts merged, a part-id
  vertex attribute drives the animation) plus one for its outline (same geometry, back faces,
  vertex-shader extrude), about 2 calls per role. Status shells (ice, bubble) are their own instanced
  meshes. HP bars and status pips: one instanced quad mesh. Damage numbers: an instanced glyph atlas
  generated from a canvas at load.
- Per-instance attributes: position, yaw, scale, phase, animation speed, flash, tint lerp, status
  bits. All animation in the vertex shader; no per-enemy `Object3D` in the scene graph.
- Static world (ground, road, props, cliffs) merged at map build into <= 8 meshes per material.
  Foliage instanced per species. Grass: one instanced tuft mesh, <= 6000 instances, kept out of a
  0.8 u band round the road and pads (keeps the road clean and the pads clickable).
- Particles: one GPU particle system (instanced quads; birth time, velocity and colour-ramp id as
  attributes), a pool of **6000** (2500 on the low tier), recycling the oldest. Trails: one ribbon
  buffer.
- Triangles: enemy 80-250 (boss 1500-3000), tower 400-1200, whole static map <= 120k.
- **DPR**: `min(devicePixelRatio, 2)`, capped to 1.5 when the canvas is over 1.6 M CSS px.
  **Dynamic resolution**: if the average frame time is over 18.5 ms for 1 s, drop the render scale
  1.0 -> 0.85 -> 0.7 (UI stays native); recover after 5 s under 13 ms. **Low tier** (automatic after
  hitting 0.7 twice): shadow 1024, enemies don't cast, bloom at quarter resolution, 2500 particles,
  no grass sway.
- MSAA x4 on the HDR target (WebGL2 multisampled render target); the low tier drops MSAA (outlines
  hide most aliasing).
- Compile every material during the slab-rise transition, so the first Pyre doesn't hitch.

---

## 7. UI

### 7.1 Scale and type
- `uiScale = clamp(min(w / 720, h / 390), 1, 1.5)`. All px values in this section are at uiScale 1
  (720x390). At 1440x900 uiScale is 1.5 and the layout also gains room (labels, strips), not only size.
- **Cinzel** (700, 900): titles, screen headers, boss names, tower names on cards, act titles,
  "Victory" and "The ramparts fell". Letter-spacing 0.04em, never below 13 px, never for HUD numbers.
- **Nunito Sans** (600 body, 800 labels, 900 numbers with tabular figures): everything else. Body
  12 px, small 10.5 px (the floor), HUD numbers 15 px, card body 11 px.
- Text sits on panels, or floats over the scene with a 2 px dark outline/shadow (`#0E0B12` at 70%).

### 7.2 Material: enamel and brass
One look: **deep night-blue enamel panels framed in thin brass**, like the inside of a general's map
case. Dark, so it never competes with the warm mid-value diorama, and text on it stays sharp at small
sizes. Parchment appears only as an inner paper surface (event text, codex pages), never as a panel.

| Token | Hex | Use |
|---|---|---|
| `--enamel-900` | `#141826` | deepest panel, full overlays at 88% |
| `--enamel-800` | `#1C2233` | panel |
| `--enamel-700` | `#262E44` | raised elements, card body |
| `--enamel-600` | `#334061` | hover |
| `--brass-500` | `#C9A45A` | frames, dividers |
| `--brass-300` | `#EBD08F` | frame highlight (top edge), active |
| `--brass-700` | `#8A6A30` | frame shadow (bottom edge) |
| `--ink-100` | `#F4EEDF` | primary text |
| `--ink-300` | `#C8C0AE` | secondary text |
| `--ink-500` | `#8C8678` | disabled |
| `--gold` | `#FFD36B` | gold (battle currency) |
| `--crown` | `#B89CFF` | crowns (run currency), a regal lilac kept distinct from gold |
| `--life` | `#FF5D5D` | lives |
| `--good` | `#6FD88A` | gains, heals, improved stats |
| `--bad` | `#FF6B5B` | can't afford, losses |
| `--focus` | `#7FC4FF` | keyboard focus ring |
| `--paper` | `#E9DEC4` | parchment insets; ink on paper `#3A2C20` |

- Panels: `--enamel-800` at 94%, a 1.5 px brass frame (gradient `--brass-300` at the top to
  `--brass-700` at the bottom), 4 px chamfered corners (clip-path), a 1 px inner shadow (`#000` 40%),
  and a faint generated noise at 3% so the enamel isn't flat. No backdrop blur (cost, and it smears
  the scene).
- Buttons: primary = brass fill (`--brass-500` to `--brass-300`), dark text `#1A140C` at 800, 28 px
  tall (28x28 minimum target at 720x390); secondary = enamel-700 with a brass frame. Hover: lift 1 px,
  8% brighter; press: down 1 px, 60 ms; focus: a 2 px `--focus` ring outside the frame; disabled: 45%
  opacity, flat. Any button with a hotkey shows a key chip (8 px, enamel-900, ink-300) on its right.

### 7.3 Cards (tower, boon, relic)
Card size at uiScale 1: **132 x 184 px** (three across with 16 px gaps at 720x390); 198 x 276 at
1440x900. With 4 cards they shrink to 124 px wide, with **5 to 116 px** (R30), gaps 8 px; heights
scale with them.

```
+--------------------------+   frame: rarity colour 3 px, brass inner line
| [glyph] TOWER NAME     ◆ |   Cinzel 13, glyph tile 20 px in the accent, rarity gem
|+------------------------+|
||                        ||   art window 120x72: the card's SVG glyph (7.4)
||    (glyph art)         ||   large, in its accent on a dark field, with a
||                        ||   slow light sweep on hover (R34)
|+------------------------+|
| Tower  ·  Physical       |   type line 10.5 px ink-300 + damage type chip
| Fast arrows that hit     |   body 11 px, at most 80 characters (R30); key
| air and ground.          |   words bold and in their status/damage colour;
|                          |   the full text lives in the hover/focus tooltip
|                          |
| ⚔ 12   ⟳ 0.8s   ◎ 6      |   stat row (towers): icon + number, Nunito 900
+--------------------------+
```
- Rarity frames: common `#9A9384` (pewter), uncommon `#5FA8D6` (blue steel), rare `#E3B655` (gold,
  with a shine sweeping across every 4 s), boss `#D96BFF` to `#FF9A5A` gradient with a slow shimmer.
  The gem at the top right matches.
- **Boon** cards: the art window shows the tower glyph with a glowing "+" over it, and a before ->
  after stat line (old in ink-300, new in `--good`).
- **Relic** cards: the art window is a dark velvet niche (`#2A1E2E`) with the relic's glyph under a
  soft spotlight gradient.
- **Supply** cards (shops, rewards): a smaller card (0.8 scale) on a leather-brown field
  `#4A3424` with the supply glyph.
- **Blessing** cards: rare-gold frame without the shine, a laurel over the glyph.
- Hover: lift 6 px, scale 1.04, frame brightens, 140 ms. Pick: the card flies to its slot (war table
  or relic tray) in 450 ms; the others fold down and fade (200 ms).

### 7.4 Icon set (procedural SVG)
24x24 viewBox, 2 px strokes (1.6 px when drawn at 16 px), round joins, `currentColor` plus an optional
accent fill layer, built from a small set of path builders; no files.

- **Towers (12)**: Archer (bow with a nocked arrow), Barracks (shield over crossed swords), Mage
  (crystal over a staff), Bombard (bomb with a fuse), Frost Spire (snowflake in a diamond),
  Alchemist (round flask with bubbles), Pyre (brazier with a flame), Storm Spire (bolt through a
  ring), Beacon (lighthouse with rays), War Banner (banner on a pole over a drum), Ballista (crossbow
  seen from the front), Thornwood (tree inside a thorn ring).
- **Specs (24)**: the tower glyph with a corner badge: Marksmen eye, Volley triple arrow, Paladins
  halo, Blademasters twin blades, Arcanist chain, Hexer eye in a hexagon, Mortar high arc, Shrapnel
  spikes, Glacier ring, Shatter broken shard, Acid drop, Naphtha flame drop, Inferno big flame,
  Firestorm spiral, Tempest cloud, Overload stars, Lighthouse beam, Hunter's Mark diamond, War Drums
  drum, Treasury coin, Harpoon hook, Siege bolt long bolt, Bramble thorn, Treant face.
- **Enemy roles (16)**: footman (helmet), runner (winged foot), brute (shoulder plate), acolyte (hood
  with a rune), shieldbearer (tower shield), shaman (antler staff), splitter (blob splitting), shade
  (ghost), swarmling (beetle), sapper (bomb on a back), bat, drake, juggernaut (ram head), warlock
  (book and lantern), matron (brood sack), boss (horned skull).
- **Bosses (7)**, for portrait tokens and the boss bar: Gorrak (horned helm over a cleaver), Sand Wyrm
  (finned coil), Frost Colossus (cracked crystal fist), Ember Tyrant (crowned dragon head), Hive
  Queen (crowned brood sack), Lich (skull lantern on a staff), Pack-Lord (wolf mask).
- **Statuses (12)**: slow (snail curl), chill (half snowflake), frozen (ice block), burn (flame), oiled
  (drop), marked (diamond), hexed (hex eye), shred (broken plate), stun (stars), revealed (eye), shield
  (hex shield), rooted (root coil).
- **Damage and defence (6)**: physical (sword), magic (four-point star), fire (flame), pure (diamond
  spark), armour (plate), ward (rune ring).
- **Currencies and run (6)**: gold (coin), crown (small crown), lives (heart), renown (laurel), wave
  (skull), interest (coin with an up arrow).
- **Map nodes (9)**: battle (crossed swords), **bounty (crossed swords with a wax seal)**, elite
  (horned helm), shop (coin purse), event (?), forge (anvil), rest (campfire), boss (the boss's
  glyph), treasure (chest).
- **Commanders (5)**: Marshal (baton), Alchemist (flask in a gear), Seer (eye in a moon),
  Quartermaster (crate with a coin), Warden (oak leaf over a shield).
- **Spells (10)**: Reinforcements (two helmets), Meteor (falling rock), Firebomb (flask with a flame),
  Tar Pit (bubbling pool), Stillness (snowflake in a circle), Judgement (beam of light), Requisition
  (stamped scroll), Rally (horn with chevrons), Barrier (root wall), Bramble Surge (thorn burst).
- **War supplies (10)**: as listed in 5.10.
- **Relics (45 + 2 event + 5 starting), boons, curses (8) and events (30)**: every card and event
  vignette is a glyph from the same path builders (R34): a base object (ring, horn, lantern, coin,
  feather, seal, candle, bell, vial, crown, eye...) plus a corner badge in its tag colour. Curse
  glyphs are drawn in `--bad` on a cracked frame.
- **UI (14)**: speed (1-3 chevrons), pause, settings (gear), upgrade (up chevron), sell (coin with a
  minus), rally (flag), info (i), close (x), codex (book), ascension (rising flame), targeting (cross
  hair), war table (tower in a frame), high ground (chevron up on a plinth), clear rubble (stones and
  a shovel).

### 7.5 Radial build and upgrade menu
- Opens on a pad click or Enter, centred on the pad (clamped to stay fully on screen with a 6 px
  margin). Ring radius **48 px**, buttons **30 px** circles (enamel-700, brass frame, 18 px glyph in
  the tower's accent), cost under each (Nunito 900 10.5 px, `--gold`, `--bad` when short), a 12 px
  hotkey badge at the top-left of each. Buttons fly out from the centre (160 ms, 20 ms stagger,
  easeOutBack) and fold back in (100 ms).
- Build ring: up to 6 slots at fixed clock positions (key 1 at 12 o'clock, then clockwise), so each
  key is always in the same place.
- Upgrade ring on a built tower: Upgrade at 12 (chevron + cost), Sell at 6 (refund in ink-300), Rally
  at 3 (Barracks only), Info at 9. On an L3 tower, Upgrade (or **U**) opens the specialisation choice
  inside the radial (R28): Spec A at 10 o'clock and Spec B at 2 o'clock, 34 px buttons with the spec
  glyph and cost, keys 1 / 2. Specs are chosen only there.
- Sell takes a second press (X or click) within 1.5 s (R28): the first turns the button `--bad` with
  "again" under it and a draining ring; letting it lapse cancels. Disabled (greyed, a lock) once the
  last wave has started.
- Esc closes in order: an aimed spell or supply, then the radial, then it pauses (R28).
- Hovering an option shows a compact tooltip (max 200 px wide) on the side toward the screen centre:
  name, one plain line of effect, the stat change, and the range previewed in the world.
- Spending: one click builds or upgrades when affordable (KR style). A spec takes two: the first
  shows its description, the second (the button now shows a brass check) confirms.

### 7.6 HUD layout
The HUD lives in thin bands at the edges and **never** over the playable rect (the camera fit reserves
the space; R29). At 720x390: a 30 px top band; the bottom has no band, controls sit in the corners over
dressing and cliff, which the fit guarantees are not playable.

720x390:
```
+--------------------------------------------------------------------------------+
| ♥18 ●245 ♛34 | 4/9 [☠+30] ▣▣▣▣▣▣ | ⚑ | 1x ⏸ |  <- 30 px band: skull, 6-icon strip, bounty chip
+--------------------------------------------------------------------------------+
|                                                                                |
|                       (diorama: playable rect fitted here)                    |
|                                                                                |
| [Q ◉][W ◉] [E ▢][D ▢]                                               [◇ 5 ▸]   |  <- corner controls
+--------------------------------------------------------------------------------+
```
- Left: lives (heart, `--life`), gold (`--gold`) with the interest chip, crowns (`--crown`); numbers
  15 px Nunito 900, icons 14 px.
- Centre: the wave counter, the **next-wave skull button** (it also bobs in the world over the horde
  gate; the HUD one is the reliable target; its brass ring fills as the countdown runs and the
  call-early bonus is printed on it) and the **next-wave strip**: up to 6 role icons (16 px) in spawn
  order with counts and **heart pips under each for its leak cost** (R29); trait badges on top.
  Hovering widens it with the role names. During a boss wave the strip's place holds the **boss bar**
  (180 x 8 px, the boss glyph at its left, phase notches, shield segment, lap pips, the telegraph "!").
- Then the **bounty chip** (bounty battles only): the seal glyph and the condition's short line on
  hover; it turns `--bad` the moment the condition fails.
- Right: speed (1x/2x/3x, current one lit), pause.
- Bottom-left: commander spells Q and W, 36 px round buttons, cooldown as a dark clockwise sweep with
  seconds in the middle; on ready the brass rim pulses once. Beside them the two **war-supply slots E
  and D** (30 px square, leather-brown, the supply glyph; empty slots are a dashed outline).
- Bottom-right: relics collapsed into one button with the count; hover expands a column of 22 px relic
  icons upward.

1440x900 (uiScale 1.5, more room):
```
+-----------------------------------------------------------------------------------------------------+
| ♥ 18 lives  ● 245 gold (+12)  ♛ 34  | WAVE 4/9 [☠ Call +30] 12 Runner·16 Swarmling·2 Footman | ⚑ Clean Sweep | 1x 2x 3x ⏸ ⚙ |
+-----------------------------------------------------------------------------------------------------+
|                                                                                                     |
|                                (diorama: extra sky above, strata and root below)                    |
|                                                                                                     |
|                                                                                                     |
| [Q Reinforcements ◉] [W Meteor ◉] [E Bell] [D -]  [ 1 Archer  2 Barracks  3 Mage  4 Frost  5 -  6 - ]  ◇◇◇◇◇ |
+-----------------------------------------------------------------------------------------------------+
```
(In a boss wave the top band's strip becomes "GORRAK THE WARLORD [▬▬▬▬|▬▬▬▬|▬▬▬] lap 1".)
- At 1440x900 the HUD adds labels next to numbers, spell names, a **war table strip** at the bottom
  centre (owned towers with hotkeys and current cost; hovering one shows its card) and the relic row
  expanded. The bottom strip sits over the slab's cut edge, never over the playable rect.
- No labels at 720x390: icons only, with tooltips on hover.

### 7.7 Tooltips and info
- Enemy hover or click: a small panel (max 180 px wide) anchored beside the enemy, away from it: role
  icon, name, HP bar, armour and ward values, statuses with time-left bars, one plain line about what
  it does ("Shields nearby allies."). The first time a role appears in a run, a "New enemy" card slides
  in at the top-left under the band for 2.5 s (non-blocking) with its silhouette and that line.
- Tower panel: name, level notches, stats, and targeting (First / Strongest / Last) as three small
  toggles (T cycles them).

### 7.8 Pause and settings
- Pause: the scene desaturates and darkens (6.3); a centred panel 320 x 220 px: Resume, Settings,
  Codex, Abandon run. Settings: volumes, screen shake, damage numbers on/off, default speed; all saved
  with the rest of the settings.

### 7.9 Reward, shop, event, forge, rest
These are moments on the general's table: the battle slab sinks (7.13) and the screen shows the run
map's walnut table, close and dim, with the panel content laid on it. No blur.
- **Blessing** (run start, R23): Cinzel header ("A blessing for the road"), 3 blessing cards (4 after
  a commander's first win) fanned on the table, keys 1-3.
- **Reward**: Cinzel header ("Choose one"), crowns earned counting up (a chime per tick), 3-5 cards
  fanned at -4 / 0 / 4 deg (7.3 sizes), and a secondary "Skip for +N crowns". A war supply won (elite)
  drops onto its slot under the cards.
- **Shop**: a merchant's velvet cloth (`#5A2E3A`) on the table with the cards in two rows (2
  blueprints, 3 boons, 3 relics) and a third short row of 2 war supplies; prices as crown chips;
  bought cards flip face-down with a "sold" stamp. Services on a brass rail at the side: **Mend**
  (5 lives), **Lift a curse**, **Restock**. A Toll curse shows its fee on the cloth's edge as you enter.
- **Event**: a parchment page (`--paper`) with an illustration window holding the event's **glyph
  vignette** (R22, R34: two or three glyphs from the 7.4 set composed into a small scene, in ink and one
  accent colour: a shrine, a caravan, a well), a Cinzel title, body in ink `#3A2C20` 12 px, and 2-3
  enamel choice buttons with plain hints of the outcome.
- **Forge**: an anvil vignette; choose a boon to improve, the card is struck 3 times (sparks, 200 ms
  each) and flips to its improved side.
- **Rest**: a campfire vignette at night (the only night lighting in the game: fire light pool
  `#FF9A50`, moonlit hemi `#3A4A6A`); heal (hearts fill one by one) or a small upgrade.

### 7.10 Run map
- The painted act map on the walnut table (2.7), **the whole act on screen at once in 2D** (R31):
  8 columns of ~80 px and 4 rows of ~70 px at 720x390. Nodes are **round tokens** (30 px at 720x390,
  wood `#7A5A3E` with a soft drop shadow) with the node glyph painted on top and an enamel rim per
  type: battle `#9A9384`, **bounty `#C9A45A` with a small red wax seal on the rim**, elite `#D9643A`,
  shop `#E3B655`, event `#5FA8D6`, forge `#B8733A`, rest `#6FD88A`, treasure `#E3B655`. Battle-type
  tokens carry their **theme** as a small ink label under them ("Raiders") and show its line on hover.
- The boss is a taller token (48 px) at the act's right edge with the rolled boss's portrait glyph
  in the act's enemy key colour; its two headline mechanics show on hover from the act's first second.
- Paths: dashed ink lines (`#2A2018` at 70%) painted on the map; paths still open have a slowly
  moving brass dash (`--brass-300`); taken paths are solid ink; closed ones fade to 30%.
- You: a blue flag pin (`#3F78D6`, gold finial) on the current node. Choosing a node: the pin hops
  along the path (arc jumps, 600 ms), then the transition starts. Visited tokens flip to a check side.
- Tiny painted props (trees, ruins, pines, spires) dot the map between nodes in the act's style.
- Top band: act name in Cinzel ("Act I: The Meadow"), lives, crowns, relics, supply slots, a war
  table button (V). Z zooms 1.6x on the current floors; nothing ever needs scrolling.

### 7.11 Title screen
- The golden-hour castle slab (2.6) fills the right two-thirds at 1440x900 (centred at 720x390), the
  camera orbiting slowly (0.015 rad/s) at a heroic 35 deg pitch.
- Left third (top at 720x390): **RAMPARTS** in Cinzel 900, 44 px at 720x390 and 72 px at 1440x900,
  filled with a brass gradient (`#FFE7A8` to `#C9A45A` to `#8A6A30`), a 1 px dark inner line and a
  soft drop shadow; a light glint sweeps across it every 6 s.
- Menu: a column of enamel buttons (Continue, New run, Commanders, Codex, Settings), 160 px wide at
  720x390; the ascension level as a flame chip next to New run.
- First load: the slab rises out of the clouds (1600 ms), the title fades in letter by letter (40 ms
  stagger), then the menu (200 ms).

### 7.12 Battle won, death, victory
- **Battle won**: the last enemy dies, 600 ms of slow motion (scene at 30% speed), a gold ring sweeps
  from our gate across the slab, little banners rise on every tower, "Battle won" in Cinzel over the
  top band; the reward screen 1.2 s later.
- **Run over**: on the last leak, 300 ms hitstop, the camera pushes in on our gate (900 ms), its
  banners fall, the scene desaturates to 20% over 1.2 s, dark cracks (`#1C1512`) run along the road and
  the slab sinks. Then a panel: Cinzel "The ramparts fell", the act and floor reached, a summary row
  (battles won, enemies slain, best tower, relics as icons), renown counting up with a laurel, new
  unlocks flipping face-up, buttons New run and Title.
- **Final victory**: 220 ms hitstop, the Ember Tyrant breaks into glowing obsidian chunks, the sky
  turns from ash to clear dawn over 3 s (horizon `#F5C08A`, top `#6E9CD0`, the sun goes golden),
  embers become falling gold petals, our banners rise on the gates, the camera starts orbiting; then
  the summary panel with "Victory" and the ascension unlock line.

### 7.13 Transitions
- **Slab rise** (entering a battle, 1100 ms): the slab rises through the clouds (easeOutCubic), fog
  clears from full to the act's density, pads pop in last with a 30 ms stagger. Click or Enter skips.
- **Slab sink** (leaving, 700 ms, easeInCubic) while the war table fades in.
- Run map to battle: the pin hops, then a **cloud wipe**: low-poly cloud puffs roll across the screen
  left to right (500 ms) and the battle slab rises behind them.
- Act change: a full act card ("Act II: The Desert Ruins") in Cinzel on enamel-900 for 1.6 s, with a
  thin line in the act's key colour under it.
- Panels: slide 12 px and fade, 180 ms in, 120 ms out. Nothing longer than 400 ms blocks input except
  the slab rise, which is skippable.

---

## 8. Juice list

Every moment and what it gets. The sound column names the hook for the audio designer.

| Moment | Visual | Sound hook |
|---|---|---|
| Hover empty pad | pad lifts 0.08 u, rim glows, pennant snaps (120 ms) | soft wood tick |
| Open radial menu | buttons fly out (staggered 160 ms), scene dims 12% | parchment flick |
| Hover a tower option | range ring preview, ghost tower at 35% on the pad | quiet tick |
| Build | scaffold and stack-in (520 ms), dust ring, crown sparkle, gold counter drops with a red flick | hammer, thud |
| Can't afford | button shakes 4 px twice (160 ms), cost flashes `--bad`, gold counter pulses red | dull click |
| Upgrade | squash, chips pop, stack-in, gold ring sweep, level notch lights (600 ms) | rising chime, clank |
| Specialise | light column, crown drop, banner unfurls, glyph ring (900 ms), trauma 0.05 | fanfare sting |
| Sell (first X) | the sell button turns red with "again" and a 1.5 s draining ring | soft warning tick |
| Sell | crumble into the pad, coins fly to the counter (500 ms) | coins spill |
| Ghost layout accepted | ghost towers solidify one by one in build order (80 ms stagger), the normal build stack-in | quick hammer roll |
| Clear rubble | stones thrown off in a dust ring, the pennant pops up (600 ms) | rubble scrape, thunk |
| Move rally point | flag drops with a bounce, soldiers jog over | short horn |
| Tower fires | per tower anticipation and recoil (4.2) | per tower |
| Projectile hits | white flash 70 ms, squash 8%, typed spark | per damage type |
| Crit | gold star burst, number with "!", marked diamond flashes | sharp ping |
| Enemy killed | chunk pop, dust, wisp, coins hop and fly | pop, coin |
| Elite killed | as kill, plus gold ring burst, crown flips off, 50 ms hitstop | heavier pop |
| Boss enters | horde gate flares, nameplate (1600 ms), boss bar slides in, roar with trauma 0.25 | boss music layer |
| Boss telegraph | ground decal windup and HUD "!" (5.6) | rising warning tone |
| Boss phase | veins flare, 120 ms hitstop, trauma 0.45, sky 10% darker for 1.5 s | roar, music shift |
| Boss killed | 220 ms hitstop, big chunk burst, gold shower to the counter, trauma 0.6, 600 ms slow motion | triumphant hit |
| Freeze | ice grows from the feet (150 ms) | crackle |
| Shatter | shard burst, white flash, frost ring | glass burst |
| Oil ignites | flame races round the puddle (200 ms), flame field | whoomph |
| Lightning chain | bolt, after-image, shields crack | zap per hop |
| Shield breaks | the hex bubble breaks into cyan hex shards | glassy snap |
| Splitter splits | squash, pops into 2 blobs that hop apart | wet pop |
| Shade revealed | fades in, gold outline, eye sigil | shimmer |
| Sapper plants a bomb | ticking bomb on the tower, red countdown arc, tower greys | ticking |
| Sapper bomb goes off | small blast, tower rattles, colour returns over 300 ms | bang |
| Warlock summons | violet rune circle for the 1.5 s channel, 3 Risen claw out | chant |
| Matron births | the sack pulses, 2 swarmlings tumble out | wet chitter |
| Shaman heals | green motes rise from healed allies | soft chime |
| Soldier blocks | clash spark at contact, both lean 60 ms | clang |
| Soldier dies / returns | falls and fades, pennant marker / door opens, jogs out | grunt / door |
| Leak | gate flashes red, red screen edge (800 ms), heart cracks, lives shake 6 px, trauma 0.2 | gate thud, heart crack |
| Lives low (<= 5) | slow red vignette pulse during waves | heartbeat in the music |
| Wave preview | footsteps run the road, skull bobs at the gate | distant drums |
| Call wave early | skull bursts, coins fly out of it, horde gate flares | horn, coins |
| Wave start | gate flare, wave number rolls (Cinzel, 300 ms) | war horn |
| Wave cleared | small gold ring from our gate, interest chip slides out | short chord |
| Speed change | the speed chip pops | gear click |
| Pause | desaturate (300 ms), panel slides in | music muffles |
| Spell ready | button rim pulses once | soft bell |
| Spell cast | aim ring locks, the spell plays (5.8), button sweeps into cooldown | per spell |
| Supply used | the slot's glyph flies from the HUD to the target, the supply plays (5.10), the slot goes dashed | per supply |
| Boss gets through | gate flashes red, the boss sinks into its horde gate's swirl and walks back out, a lap pip on the boss bar, trauma 0.3 | gate thud, low horn |
| Battle won | slow motion, gold ring sweep, banners on towers, header | victory sting |
| Card hover / pick | lift and shine / flies to its slot, others fold | swish / thump |
| Crowns gained | count-up, crown icon bounces per tick | chimes |
| Relic gained | the card spins into the relic tray, tray glints | mystic chime |
| Shop purchase | card flips face-down with a "sold" stamp, crowns fly out | coins, stamp |
| Forge | 3 hammer strikes with sparks, card flips improved | anvil |
| Rest heal | hearts fill one by one with a pop | warm chord |
| Map node chosen | pin hops along the path, token glows | wood knock |
| Blessing chosen | the card spins up and settles on the war table, a soft gold ring | choir chord |
| Act change | act card, palette shift | act motif |
| Run over | gate falls, slab cracks and sinks, summary | low drone |
| Final victory | dawn sky, gold petals, banners, orbit | full theme |
| New unlock | a face-down card flips with a gold sweep | reveal sting |

### 8.1 Limits that keep it readable
- At most **one** full-screen tint at a time (a leak overrides the low-lives pulse; pulses don't stack).
- Hitstops never within 400 ms of each other; at 3x only boss events hitstop.
- Kill effects scale with the crowd: above 60 live enemies the chunk count halves and wisps are
  dropped; above 120, a kill is one puff plus its coins.
- Ambient particles fade to 50% while more than 80 enemies are on screen.
- Smoke never sits over the road at more than 40% alpha for longer than 800 ms.

---

## 9. Critic's screenshot checklist (720x390 and 1440x900)
1. The squint test (3.10) passes at 720x390.
2. Colour-pick ground, road, road edge and sky against section 2 (within 4 L* and 10 deg of hue).
3. Nothing on the playable top is fogged; the backdrop has no hard edges.
4. Bloom only on the items in 5.2; no tower body or ground glows.
5. Each act's enemies contrast their ground in value (>= 22 L*) and hue (the key colour).
6. A tower's level is readable from its material alone (wood / stone base / banded stone with gold /
   crown module).
7. The HUD never overlaps the playable rect; no text under 10.5 px at 720x390; the next-wave strip,
   bounty chip and boss bar all sit in the top band.
8. Card rarity readable from the frame colour alone at 720x390.
9. A mid-fight shot with 150+ enemies: HP bars only on damaged enemies, <= 10 damage numbers, effects
   cover <= 10% of enemies.
10. At 1440x900 the diorama shows sky above and strata and root below the slab, not empty bands.
