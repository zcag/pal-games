# Seedfall: art direction and rendering

Owner: art. Written for the graphics engineer. DESIGN.md (D1-D20, R1-R15)
wins over this file; this revision implements R2, R6, R7, R10-R14. Numbers
marked *tune* are expected to move after the first playable.

One refinement of the brief: "about 12 tiles tall at 720x390" becomes exactly
195 art px (12.2 tiles), and 1440x900 becomes 257 art px (16.1 tiles), because
the scale has to be a whole number (1.1).

Units: **art px** = one pixel of the low-res scene; a tile is 16x16 art px.
**L** = relative luminance (Rec.709 Y) of the *final, tone-mapped* frame, 0..1.
**HDR** = linear scene value before tone mapping; 1.0 is the bloom threshold.
**Column** = tile x (0 and 47 are bedrock). **Row** = tile y, 0 at the surface.

---

## 1. Resolution and camera

### 1.1 Scale rule

```
cssH  = canvas CSS height, dpr = min(devicePixelRatio, 2)
devW, devH = round(cssW*dpr), round(cssH*dpr)
tilesTarget = clamp(lerp(12, 16, (cssH - 390) / (900 - 390)), 12, 16)
S0 = devH / (tilesTarget * 16)
S  = whichever of floor(S0), ceil(S0) (min 1) gives a tile count closer to tilesTarget
artW = ceil(devW / S) + 2, artH = ceil(devH / S) + 2     // +2: 1 px margin for sub-pixel scroll
```

| Window (CSS) | dpr | S | Art buffer (visible) | Tiles visible |
|---|---|---|---|---|
| 720x390 | 1 | 2 | 360x195 | 22.5 x 12.2 |
| 720x390 | 2 | 4 | 360x195 | 22.5 x 12.2 |
| 1440x900 | 1 | 4 | 360x225 | 22.5 x 14.1 |
| 1440x900 | 2 | 7 | 412x257 | 25.7 x 16.1 |

The art buffer stays 360-412 px wide whatever the window, so every per-pixel
effect costs the same and pixels are always whole squares.

### 1.2 Camera (owner of the camera rules, R12)

```
camI = floor(cam)           // the world is rendered with this: every tile and sprite on whole art px
camF = cam - camI           // 0..1 art px
offsetDev = round(camF * S) // whole device px
```

The final pass samples the art buffer **nearest**, shifted by `offsetDev`
device px (what the 1 px margin is for). Scrolling moves in 1/S art px steps
while the pixel grid never resamples.

| Rule | Value |
|---|---|
| Snapping | everything in the world (tiles, sprites, particles, lights) on whole art px in world space |
| Follow | critically damped spring, `omega = 9/s`, on the **unrounded** pod |
| Look-ahead | 1.5 tiles in the facing direction; 2 tiles down while falling faster than 6 tiles/s; 4 tiles in the ride direction on the Lift and in a fast drop (both up to 40 and 25 tiles/s) |
| Surface framing | in town the centre sits 3 tiles above the pod (shows the buildings) |
| Clamps | x within the 48 columns (bedrock half visible); y never above the sky panorama's top |
| Rotation, zoom | **never** (both break the grid) |
| Shake | offset only, added to `cam` before the split; **only for breaks, impacts and blasts** (8.2, R13) |
| Drilling | **never moves the camera**: it vibrates the pod sprite and the tile (5.3, 3.6) |
| The pulse (D7) | a sway, not shake: `cam.y += 2 art px x sin` over 0.6 s as the ring passes, once per beat |

---

## 2. Pipeline

All passes up to the final one run at art resolution. G-buffer RGBA8;
lighting and scene RGBA16F (`EXT_color_buffer_float`; fallback RGBA8 with HDR
/4, multiplied back in the final pass, as Vortex does with `this.hdr`).

| # | Pass | Target | What |
|---|---|---|---|
| 0 | CPU upload | textures | dirty rows of the tile texture; light grid; skylight grid (2.3) |
| 1 | Sky and parallax | `scene` | only while a sky row is on screen (cam above row 8) |
| 2 | Terrain | G-buffer (MRT) | one fullscreen triangle: back walls, solid tiles, ores, hazards, crack overlay, too-hard hatch |
| 3 | Decor | G-buffer | instanced quads from a decor atlas, only on back-wall px |
| 4 | Sprites | G-buffer | pod, Lift cage, pickups, boulders, caches, creatures, drone; atlas built at boot |
| 5 | Light accumulation | `light` RGBA16F | ambient + skylight + emitter grid (one pass), then each dynamic light as an additive quad |
| 6 | Resolve | `scene` | `albedo * light + emissive`, sky behind via G-buffer alpha |
| 7 | Particles | `scene` | instanced `GL_POINTS` (1-3 art px squares) |
| 8 | Bloom | 5 mips | prefilter, 13-tap down, tent up, gain 0.7 (Vortex's chain) |
| 9 | Final | canvas | sub-pixel upscale, heat haze, aberration, bloom, exposure, tone map, grade, vignette, flash, dither |

### 2.1 Tile data texture

`RGBA8UI`, 48 x 784 (world plus 14 sky rows), one texel per tile:

| Channel | Meaning |
|---|---|
| R | material id (0 air/dug, 1-39 diggable incl. dense, 40-47 undiggable kinds, 48-55 hazards, 56-63 built: Lift column, forecourt) |
| G | ore id (0 none, 1-26 Vell ores, 27-31 planet ores, 32-40 jackpots, 41-47 caches, 48-66 artifacts) |
| B | dig progress 0-255 (crack overlay) |
| A | bit0 dug, bit1-2 back-wall variant, bit3 scanned, bit4 hazard armed, bit5 rich pocket, bit6 lava fill level present, bit7 too hard for the current drill |

A second `R8` texture, **density**: 1.0 solid, 0.0 air, 0.25 lava, 0.6 crystal
lining and Core glass (translucent), sampled `LINEAR` so light falls off softly
across edges.

### 2.2 Terrain shader (pass 2), per art pixel

```
wp   = camI + fragCoord           // world art px (integer)
t    = wp >> 4,  lp = wp & 15      // tile, local px
T    = texelFetch(tiles, t)       // plus the 8 neighbours, fetched once
edge = distance in px to the nearest air neighbour's shared edge (0..8)
```

Outputs: `G0.rgb` albedo (sRGB in RGBA8), `G0.a` layer id / 8 (0 sky, 1 back
wall, 2 diggable, 3 undiggable, 4 ore/jackpot/cache, 5 hazard, 6 pod, 7
pickup), used by the debug views (6.4). `G1.rg` normal xy, `G1.b` emissive
strength (HDR = b * 8), `G1.a` emissive hue index into a 64-entry palette.

Noise is **world-space** (hash of `wp`, never `lp`), so rock reads as one
mass, not stamps. Every material has three ingredients:
1. **Body:** `fbm(wp * f, 3 octaves)` quantised to 4 bands -> dark, base,
   base2, light. Banding, not gradients.
2. **Detail:** per material (3.1).
3. **Bevel:** only where the tile touches air. `h = min(edge, 3) / 3`, normal
   from the 4 neighbours of `h`. Albedo: the first px facing air is `light` on
   top/left faces, `dark` on bottom/right. That 1 px lip says "you can dig
   here".

Back wall (dug tiles): the material's palette x0.42 value, x0.6 saturation,
half-frequency noise, no bevel, 2 px AO (x0.7) along edges touching rock.

### 2.3 Light grids (CPU, tile resolution)

Two RGB grids over the visible window plus 8 tiles margin (about 42 x 32),
`RGBA16F`, sampled **bilinear** at `wp / 16`:

- **Skylight.** Row 0 air seeded with `sky(dayTime)` (7.1 horizon x 0.9).
  Two-pass sweep: down through air x0.97 per tile, sideways x0.70, into solid
  x0.35, and x `exp(-row / 22)` once per row. A straight shaft stays lit for
  about 30 tiles. Recompute on a tile change in the window, or every 2 s for
  the day cycle (10 min, always running, D13).
- **Static emitters.** Every glowing tile (Crystal-and-deeper ores, jackpots,
  lava, glowcaps, lanterns, Lift segment lights, core seams) pushes colour x
  HDR into a BFS, x0.62 per air tile, x0.25 per solid tile, up to its radius
  (tables 3.2, 3.4). Up to ~400 in the window, recomputed on dirty.

### 2.4 Dynamic lights (pass 5)

At most **24** per frame, each an additive quad clipped to its radius:

```
d    = length(Lpos - wp) / 16                       // tiles
win  = pow(clamp(1 - pow(d / R, 4), 0, 1), 2)       // exactly 0 at R
att  = win / (1 + (d / r0) * (d / r0))              // r0 = 1.2 tiles
cone = smoothstep(cos(half + 8deg), cos(half), dot(dir, normalize(wp - Lpos)))   // 1 for omni
T    = exp(-mu * occl)                              // soft occlusion
ndl  = 0.55 + 0.45 * max(dot(N, normalize(vec3(Lpos - wp, 12))), 0)
light += color * I * att * cone * T * ndl
```

**Soft occlusion:** march toward the light, `steps = clamp(ceil(d * 2), 2,
12)`, sum linear-sampled `density` x step length, skip the first 2 px.
`mu = 0.05 / art px`: one tile of rock passes 45 %, two 20 %, three 9 %, so an
ore behind one tile of dirt is a dim promise.

Slot 0 is always the pod lamp (cone + omni = one light). Explosions and hit
flashes are forced. The rest are ranked by `I * R^2 / (1 + distToCam / 8)`; a
light losing its slot fades over 0.15 s.

### 2.5 Resolve (pass 6)

```
amb   = biome.ambient (blended by depth, section 4) * (0.6 + 0.4 * ao)
L     = amb + skyGrid + emitGrid + dynamic
color = albedo * L + emissive * 8 * palette[hue]
color = max(color, albedo * floorLum)            // floorLum per layer, 6.1
```

### 2.6 Final pass (pass 9), in order

1. `uvArt = (fragCoord + offsetDev) / S`, nearest sample of `scene`.
2. **Heat haze** (Magma, Core, near lava): shift whole art rows by
   `round(sin(row * 0.55 + t * 3.1) * A)` art px, `A` 0..1 with heat.
3. **Damage aberration:** R and B +-1 art px in x for 150 ms after a hit of
   10 %+ hull.
4. `+ bloom * bloomK`, bilinear; `bloomK` 0.35, 0.5 on the surface at night,
   0.55 in the Core.
5. Exposure `biome.ev * adapt`, `adapt` from the mean log luminance one frame
   late, within +-0.6 EV, time constant 1.2 s.
6. **Tone map:** hue-preserving ACES on luminance, 25 % toward per-channel:
   ```
   y  = dot(c, vec3(.2126,.7152,.0722)); ym = aces(y);
   c1 = c * (ym / max(y, 1e-4));  c2 = aces(c);
   c  = mix(c1, c2, 0.25);
   ```
7. **Grade** per biome (section 4): lift / gain, split tone (`shadowTint`
   below L 0.25, `highTint` above 0.6, 15 %).
8. **Vignette:** `v = smoothstep(0.45, 1.1, length((uv - podUv) * vec2(asp, 1)))`,
   `c *= 1 - 0.35 v`, pulled toward `biome.fog` by `0.25 v`. Centred on the pod.
9. Hit flash (`+0.12` for 2 frames), biome-entry wash.
10. 4x4 Bayer dither +-0.5/255. No film grain.

---

## 3. Tiles

### 3.1 Diggable materials (world.md owns the list and hardness)

Palettes dark / base / base2 / light. Detail in art px.

| Biome | Material | Palette | Detail |
|---|---|---|---|
| 0 | Loam | `#4a2f1f #7a5236 #8c6040 #a87650` | pebbles 2 px `#9a8a78` at hash > 0.985; root threads 1 px `#c7a25a` 3 %; grass lip `#5f9e3a`/`#8fc85a` 2 px on row 0 |
| 0 | Clay | `#5a3a2e #8a5442 #9a6250 #b8806a` | horizontal 1 px streaks every 4-6 px |
| 0 | Gravel | `#4e463e #74685a #82766a #9c9080` | 2-3 px pebbles at 20 %, each with a 1 px light top |
| 0 | Sand | `#8a7448 #b89a62 #c8aa72 #e0c890` | 1 px grain dither, no bevel shade on top (it slides) |
| 1 | Shale | `#34383c #5a5e64 #666a70 #80848a` | thin layer lines every 2-3 px |
| 1 | Limestone | `#5c564c #8a8276 #968e82 #b0a898` | soft pits: 2 px `dark` dots at 4 % |
| 1 | Granite | `#4a4446 #746c6e #827a7a #a09494` | speckle: `#b88a84` and `#2a2628` 1 px at 6 % each |
| 1 | Timber | `#3a2414 #6a4424 #7a5030 #96683e` | planks 4 px tall, nail heads `#9aa0aa` |
| 1 | Rubble | `#3a3634 #5e5854 #6a6460 #86807a` | 2-3 px chunks with `dark` gaps |
| 2 | Glassrock | `#2b2944 #4b4a6b #57567a #74739a` | 1 px glassy flecks `#9ad8ff` at 2 % |
| 2 | Quartzite | `#4a4a58 #747486 #828294 #a2a2b4` | blocky 5 px cells, `dark` seams |
| 2 | Crystal lining | `#3a5a6a #6a9aac #7aacbe #a8dcea` | translucent (density 0.6), self-light HDR 0.3 |
| 3 | Mycelium mat | `#2a2630 #4a4452 #6a6474 #b8b0c0` | off-white 1 px threads over dark soil |
| 3 | Rootstone | `#24181a #42302c #4e3a34 #6a5246` | pale root veins 1 px `#9a8070` |
| 3 | Mossbasalt | `#141816 #2a302c #343a34 #4a524a` | moss specks `#5a8a4a` 1 px at 8 % |
| 3 | Mushroom flesh | `#4a3a5a #7a6890 #8a78a0 #aa98c0` | soft vertical fibres |
| 4 | Scoria | `#3a1a12 #6a3426 #7a3e2e #94523c` | pores: 2 px `dark` holes at 10 % |
| 4 | Basalt | `#1e1414 #3a2a2a #47322e #5e4038` | hex columns (cell 6 px), ember cracks 1 px `#ff5a1a` HDR 0.6 at 1.5 % |
| 4 | Obsidian | `#0e0c12 #22202a #2c2a36 #4a4858` | 1 px white highlight `#e8e8f0` on lit diagonal facets |
| 4 | Crust | `#1a0e0a #34201a #3e2620 #5a3428` | crack network, cracks `#ff6a1a` HDR 0.9 |
| 5 | Packed rubble | `#4a3e28 #7a6842 #887650 #a8946a` | broken stone, 3-4 px chunks |
| 5 | Sower brick | `#5a5244 #8a8270 #968e7c #b4ac98` | running bond 8x4, mortar `dark`, faint glyph grooves |
| 5 | Old concrete | `#4a4844 #74706a #807c76 #9c9890` | inlay lines 1 px every 7 px |
| 5 | Vault seal | `#2a1e10 #5a4020 #6a4c28 #8a6838` | 14 px disc, gold ring inlay `#e0c040` (non-emissive) |
| 6 | Pressure stone | `#2e2438 #4a3c5a #5a4a6c #8a78a0` | compressed swirls; thin seams `#fff2c0` HDR 0.9 |
| 6 | Core glass | `#2a0810 #5a1420 #6a1a2a #8a2a3a` | translucent (0.6); inner glow HDR 0.3-0.9 with the beat |
| 6 | Heartrock | `#120c0a #2a2018 #34281e #4a3a2a` | gold veins 1 px `#e0c040`, HDR 0.5 |

### 3.2 Dense material (R12)

Each biome has one **dense** material (2.0x typical hardness, about 10 % of
tiles; world.md names it). It reads as denser by **value and texture, never by
hue alone**: same hue family as the biome's typical rock, so it never reads
as an ore.

| Mark | Rule |
|---|---|
| Value | palette shifted one band down (its `base` = typical `dark`+, its `light` = typical `base`): final L 0.24-0.30, the low half of the diggable band, never below its p10 |
| Texture | detail at 2x frequency, plus horizontal compression laminae: 1 px `dark` line every 3 px, offset by world-space noise |
| Grain | 1 px `light` specks at 3 % (it glints under the lamp, ordinary rock does not) |
| Bevel | 2 px lip (light + base2) instead of 1: harder edge, still a lip, still diggable |
| Crack overlay | crack px x0.15 instead of x0.25, stages show later (it resists) |

### 3.3 Ores: shape classes (R11)

**Shape carries identity; hue is a second channel.** Ore px are drawn
tile-local, centred, jittered +-2 px by tile hash, with a 1 px outline in the
host rock's `dark` x0.6. Light px are at least 40 % of an ore's drawn px.

| Class | Drawing (art px) |
|---|---|
| Speck | 8-12 specks of 1-2 px scattered over the tile, each with a 1 px `light` top-left |
| Vein | 2-3 diagonal streaks 1-2 px wide crossing the tile |
| Dendrite | one branching 1 px thread from a tile corner, 3-4 forks, fern-like |
| Nugget | 3-5 rounded blobs, 2-4 px |
| Band | one rounded 9x6 pebble with 2 concentric 1 px stripes |
| Block | 2-3 hard-cornered cubes 3x3-4x4, `light` top-left edges |
| Spike | 3 spikes 2x5 fanned from a 4 px base |
| Ring | an 8x8 ring of 1-2 px crystals around a dark 4x4 centre |
| Gem | one 6x6 faceted rhombus, 4 shades, top-left facet `light` |
| Orb | 5x5 disc with a 1 px bright core |
| Star | 7x7 four-point star, 1 px rays, 3x3 core |
| Plate | 6x4 angular sheet, one straight inlay line, 2 rivet px |
| Drop | 5x7 teardrop with a 1 px inclusion inside |

**Rule:** no two ores whose row bands overlap share a class. With world's
bands this holds for every pair (checked: each repeated class is used by ores
at least 40 rows apart), so ores that can share a screen always differ in
shape, and each biome's ores are all distinct classes.

| # | Ore | Rows | Biome | Class | Base | Light | Glint | Glow | HDR, radius |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Coal | 2-59 | Topsoil | Speck | `#2a2c36` | `#aab4c8` | `#e8f0ff` | no | - |
| 2 | Copper | 3-90 | Topsoil | Vein (1 patina px `#4aa88a` per streak) | `#b85a28` | `#ff9a5a` | `#ffe0c0` | no | - |
| 3 | Tin | 18-75 | Topsoil | Nugget | `#8a9098` | `#c8ccd2` | `#ffffff` | no | - |
| 4 | Iron | 55-160 | Stone | Band | `#8a4a32` | `#c87a52` | `#ffd8b8` | no | - |
| 5 | Lead | 70-160 | Stone | Block | `#5a6070` | `#9aa2b4` | `#e0e8f8` | no | - |
| 6 | Silver | 85-180 | Stone | Dendrite | `#a8b4c4` | `#e8f0fa` | `#ffffff` | no | - |
| 7 | Gold | 115-190 | Stone | Nugget | `#e0c040` | `#fff07a` | `#fffbe0` | no | - |
| 8 | Quartz | 160-250 | Crystal | Spike | `#b8c8d8` | `#f0f8ff` | `#ffffff` | faint white `#e8f4ff` | 0.5, 1.0 |
| 9 | Amethyst | 165-270 | Crystal | Ring | `#6a2aa8` | `#c080ff` | `#ecd0ff` | violet | 1.2, 1.5 |
| 10 | Sapphire | 200-280 | Crystal | Gem | `#1a3aa0` | `#5a9aff` | `#c0d8ff` | blue | 1.3, 1.5 |
| 11 | Emerald | 235-290 | Crystal | Block (step-cut) | `#128a50` | `#32e08a` | `#b0ffd8` | green | 1.4, 1.5 |
| 12 | Sporestone | 280-370 | Fungal | Vein | `#1a6a5a` | `#5cffc8` | `#e0fff4` | teal | 0.9, 1.5 |
| 13 | Jade | 290-400 | Fungal | Band | `#2a7a4a` | `#7ad8a0` | `#e0fff0` | no | - |
| 14 | Moonstone | 320-405 | Fungal | Orb (core drifts 1 px per 0.5 s) | `#6a8ab8` | `#d0e4ff` | `#ffffff` | pale blue | 1.6, 2.0 |
| 15 | Lumen amber | 350-410 | Fungal | Drop (inclusion `#5cffc8`) | `#b0701a` | `#ffc04a` | `#fff0c0` | amber | 1.8, 2.0 |
| 16 | Cinnabar | 400-490 | Magma | Spike | `#a01828` | `#ff7a6a` | `#ffd0c8` | no | - |
| 17 | Platinum | 420-540 | Magma | Nugget | `#8a98a6` | `#d8e8f4` | `#ffffff` | no | - |
| 18 | Fire opal | 450-545 | Magma | Orb | `#b04a10` | `#ff9a3a` | `#fff0b0` | orange | 2.0, 2.5 |
| 19 | Diamond | 490-550 | Magma | Star | `#a8c8d8` | `#f0fcff` | `#ffffff` | faint white | 0.8, 1.0 |
| 20 | Sower scrap | 540-640 | Ruins | Plate | `#5a6a6a` | `#a8bcb8` | `#e8fff8` | no | - |
| 21 | Orichalcum | 560-680 | Ruins | Vein | `#b0602a` | `#ffb050` | `#fff0c8` | dim gold `#ffc860` | 0.7, 1.0 |
| 22 | Voidstone | 600-690 | Ruins | Ring (centre `#14101c`, swallows lamp light: albedo x0.3) | `#3a2a5a` | `#b080ff` | `#f0e0ff` | violet, rim px only | 1.0, 1.0 |
| 23 | Sunglass | 570-680 | Ruins | Gem | `#c08a20` | `#ffe070` | `#fffbe0` | yellow | 1.8, 2.0 |
| 24 | Heartstone | 680-769 | Core | Orb | `#8a1020` | `#ff4a5a` | `#ffd0d0` | red, pulses with the beat | 1.0-2.2, 2.0 |
| 25 | Stellite | 700-769 | Core | Block | `#b8c0d0` | `#f4f8ff` | `#ffffff` | white | 2.0, 2.5 |
| 26 | Seedglass | 730-769 | Core | Drop (inclusion: a 1 px Seed-gold `#fff2c0`) | `#8ac8d8` | `#f0ffff` | `#ffffff` | prismatic: hue steps through 6 palette entries in 3 s | 2.5, 3.0 |

- **Glow:** nothing glows above row 160 except jackpots (R11). Glowing ores
  get `G1.b` on their `light` px only and one static emitter.
- **Gold** is `#e0c040`, greener than the pod's `#d8a030` (R11), and a
  Nugget: the pod is never confused with it by hue or by shape.
- **Glint:** every ore has one px per tile that flashes to `glint` HDR 2.2 for
  60 ms every 2-5 s, only while its lamp light is above 0.3. Coal, the one
  dark ore, reaches the ore band through its silver sheen px and glint.
- **Hazard tells stay apart:** gas is yellow-green on a crack, spore clouds
  pale green haze, lava orange whole-tile and moving. Fire opal is a 5 px orb,
  Sporestone a streak, never a crack or a cloud.
- **Pieces per tile** (R3, `1 + floor(b/2)`): a tile yielding 2+ pieces adds
  one extra copy of its shape at 70 % size per extra piece (max 3 copies; the
  Core's 4 draw as 3). More shapes = more pieces, at a glance.

**Scanner reveal (D10):** on a pulse (Q, passive every 10 s from level 5) ores,
hazards, caches, jackpots and artifacts in range but in darkness draw only
their outline px in `base` at HDR 0.35, with a 1.2 s ping (outline 2x, eases
out). Outlines persist on the minimap. Never the full sprite.

**Rich pocket (R10):** the seeded x2 vein (flag bit5) looks like any vein in
the lamp. In the scanner view only, its outlines carry a **shimmer**: a 2 px
diagonal highlight band (outline +60 %, HDR 0.6) sweeps across the vein's
tiles every 2.5 s, and the minimap draws its dots with a slow 1 px halo.

### 3.4 Jackpots, caches and artifacts

**Jackpots** (D5) are the only things that glow above row 160. Shared marks:
sprite 10-12 px (larger than any ore), 1 px outline `#0b0d12`, four 1 px
`#ffe890` dots orbiting the tile at 1 rev / 3 s, a 4-px cross sparkle every
1.2 s (HDR 2.5), static emitter. Scanner: a gold 5x5 star outline.

| Find | Biome | Sprite | Colours | HDR, radius |
|---|---|---|---|---|
| Fallen star | Topsoil | 10x10 cracked lump in a scorched pocket (back wall x0.5) | `#4a3a30` crust, cracks `#fff0c0` | 2.0, 3.0 |
| Buried strongbox | Topsoil | 12x9 iron box, brass corners | `#4a4e58`, `#e0c040` | 1.2, 2.0 |
| Motherlode nugget | Stone | 12x10 Nugget | `#e0c040` / `#fff07a` | 1.4, 2.5 |
| Payroll chest | Stone | 12x9 timber chest, 3 coin px spilling | `#6a4424`, `#ffd84a` | 1.2, 2.0 |
| Starheart | Crystal | 11x11 Star | `#bff8ff` / `#ffffff` | 3.0, 4.0 |
| Moonpearl | Fungal | 9x9 Orb in a cap | `#e8f0ff`, core drifts | 2.0, 3.0 |
| Phoenix diamond | Magma | 11x11 Star | `#ffb060` / `#fff4d0` | 2.5, 3.5 |
| Sower crown | Ruins | 12x8 six-point ring | `#e0c040`, gems `#b080ff` | 2.0, 3.0 |
| Seed tear | Core | 8x11 Drop | `#fff2c0`, inner motion | 3.0, 4.0 |

**Caches** (R10, about 1 per 15 rows in every biome): a 14x12 object sprite,
1 px `#0b0d12` outline (an object), lamp-lit glint, in the ore band (0.55-0.85
on its light px). No glow above row 160; deeper ones may carry a theme light
at HDR <= 0.9.

| Biome | Cache | Look |
|---|---|---|
| Topsoil | Crate | timber crate, 2 slats `#7a5030`, rope `#c7a25a` |
| Stone | Mine cart | tipped cart `#6a6a70`, ore heap `#8a4a32` in it, 1 wheel |
| Crystal | Fossil geode | split 12x10 stone, shell spiral `#e8dcc0` inside, crystal rim `#a8dcea` HDR 0.6 |
| Fungal | Spore cache | woven pod `#6a5a3a`, lid seam `#5cffc8` HDR 0.7 |
| Magma | Ember chest | iron chest `#3a2a2a`, slot `#ff8a2a` HDR 0.9 |
| Ruins | Sower coffer | 12x8 Plate box `#8a8270`, glyph `#8affd0` HDR 0.8 |
| Core | Seed pod | 10x12 husk `#4a2a3a`, seam `#fff2c0` HDR 0.9, slow beat |

**Artifacts** (19): the tile shows the item's own 7x7 icon (the same icon as
in the log: tally board, lantern, letter, quartz, tablet, pick, hand, map
node, journal page, urn, plate, badge, key ring, frieze, order, cradle, note,
husk, last note), drawn `#8a7a4a` / `#e8d8a0` / glint `#fff8e0`, 1 px outline,
inset into the host rock. In lamp light a slow gold glint (every 3 s, HDR
1.5). Artifacts on a pedestal (Crystal and deeper) add a soft light HDR 0.8,
radius 1.5. Scanner: a pale gold 5x5 diamond outline, drawn over ore dots.
Vault seals show as a gold outline from 20 tiles, sealed or not (world).

### 3.5 Undiggable rock

It must read "not this" across the screen by pattern and value. Shared marks
in every biome (world's rule, art's numbers):

- Albedo at 45 % of the biome's diggable rock: final L 0.10-0.16 (6.1).
- **No bevel lip.** A hard 1 px `#0a0b10` outline where it meets air.
- Large angular plates (Voronoi 12 px, across tile borders), 2 px seams.
- Diagonal hatch: every 4th diagonal px +1 shade.
- **Core:** 2 px outline plus the hatch at every 3rd diagonal, +2 shades
  (R11), because Core glare and the Core's 2 px diggable bevel would otherwise
  meet it halfway.
- Drilling it: no crack overlay, a dull clink, 4 grey sparks, the drill
  stops. Nothing else.

| Biome | Kind (world) | Palette | Own detail |
|---|---|---|---|
| Topsoil | Granite boulder | `#14161c #2a2e38 #343946 #4a5262` | round corners, no plates |
| Stone | Ironstone | `#12141a #24262e #2e3038 #40424c` | rust seams 1 px `#5a3020` |
| Crystal | Black prism | `#0e0e16 #1e1e2a #282836 #3a3a4c` | diagonal facets, never takes the lamp's glint |
| Fungal | Petrified root | `#16120e #2c2620 #36302a #4a4238` | twisting grain lines |
| Magma | Cold basalt column | `#16181e #2c3038 #363a44 #4a505c` | vertical lines every 4 px, cool against the reds |
| Ruins | Ward stone | `#0c1614 #1a2a28 #223430 #304642` | 1 px frame line `#6a5a34`, non-emissive (not ore gold) |
| Core | Null rock | `#060608 #121216 #18181e #24242c` | 1 px rim `#4a3a6a`, the darkest thing in the game |

**Too hard (D11):** diggable rock the current drill cannot dig keeps its look;
within 2 tiles of the pod it gets a sparse dot hatch (1 px every 4 px, `#000`
alpha 0.35). On contact: bounce, clank, sparks, label (core-loop).

### 3.6 Hazards

Every hazard but lava has a **dashed rim**: 1 px, 2 on / 2 off, marching 4
px/s around the tile, `#ff4a3a` HDR 1.1, visible when lit above 0.15 or
scanned. Dashes are the shape cue, red the second one. Hazards sit in the
0.55-0.85 band like ores; their tells come at least 1 s or 1 tile early
(pillar 3).

| Hazard | Look |
|---|---|
| Sand | Sand palette; when undermined, 0.3 s of 1 px grain trickle from its underside, then it slides as a tile sprite |
| Boulder | 14 px round rock in the host palette, 2 px dark ring, a crack, 1 px drop shadow; trembles 1 px + dust for 0.6 s before it falls |
| Timber collapse | the post's planks bow 1 px and drop 2 dust puffs during the 1 s before the 2 tiles above turn to rubble |
| Gas pocket | host rock with 1-2 hairline yellow-green cracks `#c8e04a` HDR 0.4 and a slow seep of 1 px motes in lamp light. Drilled: the fuse (`0.8 x k_m^0.25` s) swells a green glow from HDR 0.4 to 2.0 and draws a shrinking 1 px ring around the tile that closes at the blast. Blast radius 2, no push |
| Spore vent | swollen puffball, breathes 1 px over 2 s; 0.5 s before a release it brightens `#b8f0a0` HDR 0.9. Cloud: 2-tile pale green haze, lit from within, drawn behind tiles, drifts up |
| Lava | body `#ff6a1a` HDR 1.8, hot core `#ffd27a` HDR 3.0 in a domain-warped noise (3 px/s), drifting crust plates `#3a1208`, 1 px surface wobble. Emitter 2.5, radius 3.5. **Flow (R12):** a tile filling draws its level rising over the step (0.5 s down, 1.5 s sideways); after 12 s still, crust plates spread over it and it turns to basalt at 15 s. Hidden pocket tell: orange bleed `#ff6a1a` HDR 0.5 in the cracks of the tile above |
| Arc pylons | 6x12 posts, emitters `#8ac8ff`; 0.4 s charge-up glow before each 1 s arc; the arc is a jagged 1-2 px line, HDR 3.0, re-rolled every 2 frames |
| False floor | Sower brick with a faint 1 px seam; under the pod it cracks in 2 stages over 0.8 s, then falls |
| The pulse | the chamber brightens 0.5 s before the beat; a 3 px band of light `#ffd8a0` HDR 1.5 sweeps up the screen at 40 tiles/s, lighting rock as it passes; heat haze A +0.5 for 1.5 s. Camera: the sway in 1.2, no push (D7) |

### 3.7 Crack overlay (dig progress)

Four stages at progress 0.15 / 0.40 / 0.65 / 0.85. Per tile hash: 3 polylines
from the drill contact edge with 1-2 forks, length by stage. Crack px are
`albedo * 0.25` (dense x0.15) with a 1 px `light` upper side. **Stage 3+ jitters
the tile +-1 px at 30 Hz** (the drilling vibration, not the camera). At
progress 1 the tile pops: 6-14 debris (8.1), back wall the same frame, and a
small shake (8.2).

---

## 4. Biome palettes

Biomes blend over a 10-row band at each boundary (smoothstep on depth):
ambient, fog, grade, exposure. Tile materials do not blend.

| # | Biome (rows) | Ambient (light x) | Back wall | Accent / emissive | Fog | Grade: lift / gain / shadowTint / highTint | EV |
|---|---|---|---|---|---|---|---|
| 0 | Topsoil 0-59 | `#3a3550` x0.45 at row 0 to x0.20 at 59, plus skylight | `#2e2018` | roots `#c7a25a`, grass `#8fc85a` | `#1a1420` | `#000` / `#fff` / `#3a2418` / `#fff0d0` | 1.0 |
| 1 | Stone 60-159 | `#1d1e26` x0.18 | `#24221f` | lanterns `#ffb35c` HDR 1.3, timbers `#8a5a2b`, rails `#6a6a70` | `#121318` | `#04050a` / `#f4f6ff` / `#141820` / `#ffe6c0` | 1.1 |
| 2 | Crystal 160-279 | `#141530` x0.20 | `#1a1830` | `#7fe8ff`, `#c58cff` | `#0d0e22` | `#06081a` / `#e8f4ff` / `#101640` / `#d8f8ff` | 1.15 |
| 3 | Fungal 280-399 | `#10161a` x0.20 | `#181220` | `#5cffc8`, `#ff6ad5`, `#ffd84a` | `#0a1214` | `#04100e` / `#f8eaff` / `#0a2a26` / `#ffd8f4` | 1.2 |
| 4 | Magma 400-539 | `#2a0f08` x0.22 | `#170d0b` | lava `#ff6a1a`/`#ffd27a`, embers `#ffa040` | `#1a0804` | `#0c0200` / `#fff0e0` / `#2a0a04` / `#fff2c8` | 0.9 |
| 5 | Ruins 540-679 | `#0e1214` x0.18 | `#121815`, glyph tiles every 5-9 | glyphs `#8affd0`, ghost light `#9ab8ff` | `#0b1012` | `#020806` / `#e4fff4` / `#081814` / `#d0e8ff` | 1.2 |
| 6 | Core 680-769 | `#2a2236` x0.25 rising to x1.2 in the chamber | `#1c1424` | seams `#fff2c0`, Seed `#ffffff` HDR 6-12 | `#fff0d8` (bright) | `#0a0610` / `#ffffff` / `#1a1030` / `#fff4e0` | 0.8 to 0.55 |

Atmosphere (all within section 6's limits):
- **Topsoil:** sun shafts down open shafts (skylight grid), dust motes;
  earthworms curl from the lamp.
- **Stone:** timber frames and rails on back walls; surviving lanterns
  (radius 3) make warm islands; bats scatter from the lamp (D6).
- **Crystal:** back-wall shards re-emit 20 % of the lamp in their hue; glass
  moths orbit glowing ore. Coolest, cleanest light in the game.
- **Fungal:** glowcaps (radius 2, HDR 0.8, breathing 0.6-1.0 over 4-7 s)
  brighten 1.5x within 2 tiles of the pod; spores rise; crickets are sound.
- **Magma:** light from below, lava falls in back walls, embers, heat haze A
  0.5 (1.0 within 3 tiles of lava); cinderlings scatter. Far rumbles are
  sound plus falling dust, never camera motion.
- **Ruins:** low ambient, cold ghost light, glyph walls light in sequence
  (1-tile ripple every 8 s), desaturated except the glyph green.
- **Core:** the scheme inverts: ambient climbs, fog is bright, exposure
  drops. Diggable rock gets a **2 px bevel** (light lip + 1 px `dark` below
  it) so it holds against the glare; undiggable keeps its own mark (2 px
  outline + hatch, 3.5), so the two never meet. The chamber: the Seed, a
  radius-3-tile sphere HDR 12 on its cradle, radial god rays (Vortex's
  12-tap march on the `rays` mip). The pod keeps its dark outline.

### 4.1 Planets in v1 (R14)

Each planet keeps the readability bands and shape classes. It changes the sky
keyframes (tint applied to 7.1), the grade, a rock hue shift, and replaces
one mid-column biome with its own (R4; world.md owns the rows).

| Planet | Sky (noon zenith / horizon, sunset horizon) | Rock and grade | Its biome | Unique ore | Unique hazard |
|---|---|---|---|---|---|
| Vell | `#3f86e0` / `#a8d8f5`, `#ff7a3a` | baseline (section 4) | - | - | - |
| Cinder | `#c0503a` / `#ffb07a`, `#ff4a1a`; night `#1a0806` | soil `#1e1614` black; grade highTint `#ffd8a0`, shadowTint `#2a0a04`, gain `#fff0e0` | **Ash hollows**: rock `#2a2624 #4a4440 #57504a #6e665e`, ember specks `#ff6a1a` HDR 0.5 at 1 %, ash motes falling (not rising) | Sunstone: Gem, `#c86a10` / `#ffb040` / `#fff0c0`, gold glow 1.8, 2.0 | Geyser: a 6x4 vent; 1 s before eruption it glows `#ff8a2a` and spits 1 px sparks; the jet is a 4 px column of fire HDR 2.5 straight up, emitter radius 3 |
| Ferrum | `#6a7a8a` / `#c8b8a0`, `#c86a3a` | rock hue shift toward rust (+10 deg, sat x0.85); grade gain `#f0f4ff`, metallic highTint `#e0e8f0`, shadowTint `#1a1410` | **Iron reaches**: rock `#2a201c #4e3a30 #5a443a #7a5e4e`, rust streaks 1 px `#a85a30`, steel flecks `#c8d0d8` | Lodestone: Speck aligned on 2 arcs (iron filings), `#1a1c22` / `#8a94a8` / `#e0e8ff`, no glow; 1 px blue arc `#8ac8ff` HDR 0.8 when it pulls | Magnetic storm: 2 s before, the sky/ambient flickers violet `#9a6aff`; during it the scanner overlay shows static (1 px noise at 30 %) and the HUD scanner icon is struck through |

---

## 5. The pod

### 5.1 Sprite (facing right; mirrored for left)

16 x 14 art px (D20), fits a 16 px tunnel with 1 px headroom. Built at boot
into an atlas from character maps + per-tier palettes, normal map from a bevel
of the silhouette.

```
   0123456789ABCDEF
 0 ....OOOOO.......     O outline  #0b0d12 (always, every tier, unlit)
 1 ...OgGGGGO......     G glass    #5ac8ff   g glass highlight #e8fbff
 2 ..OgGGGGGGO.....     L hull light   H hull   h hull shade (plating palette)
 3 OOOOOOOOOOOO....     l lamp housing (emissive, HDR 2.5)
 4 OLLLLLLLLLlO....     D drill  d drill shade (bit palette)
 5 OHHHHHHHHHHOdO..     T t tread links #2a2c34 / #5a5e6a
 6 OHhHHHHHHHHODDdO
 7 OHHHHHHHHHHODDDD     drill tip col F, 4 px beyond the hull
 8 OHhHHHHHHHHODDdO
 9 OhmmmmmmmmhOdO..     m module sockets (5.4)
10 OOOOOOOOOOOO....
11 OtTtTtTtTtTO....
12 OTtTtTtTtTtO....
13 .OOOOOOOOOO.....     thruster vents under the treads at cols 3 and 8
```

Down drill: the side drill folds to 2 px; an 8x5 cone extends below the treads
(cols 2-9, rows 14-18), drawn into the tile below. Back parts (tank, cargo,
fins) attach at cols 0-1, drawn behind col 0's outline, up to 3 px out.

Trim colour `#ffd870` on the lamp housing and the hull's top row stays at
every tier: the pod's signature, and the HUD accent.

### 5.2 Visible upgrades (progression's gate-aligned table, R12)

| Part | Changes at level | Tiers and how they look |
|---|---|---|
| Drill bit | 0, 2, 5, 8, 11, 14, 17, 20 | **Iron bit** `#8a8e96`, plain 3 px tip. **Steel bit** `#b8c0cc`, spiral stripe. **Carbide auger** `#4a4e5a`, flute spiral, tip 4 px. **Diamond crown** steel with tip px `#bff8ff` glint. **Thermal drill** `#6a5a54`, tip `#ff8a2a` HDR 1.5 while drilling. **Sower-steel bit** `#5a9a8a`, glyph px `#8affd0` HDR 1.0. **Core breaker** `#c9a0ff`, tip HDR 2.0, 6 px tall. **Seed lance** `#fff2c0`, HDR 3.0, tip 5 px |
| Hull plating | 3, 6, 9, 12, 15, 18 | base: bare `#d8a030` / `#ffd870` / `#8a5a18`. **Riveted**: + rivet px every 3 px. **Plated** `#e07a30`, 1 px plate seams. **Ceramic** `#d8dce0`, yellow trim. **Obsidian-clad** `#2a2834`, white highlight px `#e8e8f0`, trim keeps it in the pod band. **Sower shell** `#4e7a6a`, gold inlay `#e0c040`. **Starhull** `#f0e8d0`, violet trim `#9a6aff` |
| Engine flame | 5, 10, 15, 20 | below 5: small red-orange (`#ff6a2a`, 3 px). **5** orange `#ffa040` (2 vents larger). **10** white `#fff4d0` core. **15** blue `#8ac8ff`. **20** violet `#c08aff` with white core |
| Radiator fins | 4, 8, 12, 16, 20 (20 levels, R6) | one fin pair per step (1x3 px each, on the back, 5 pairs at L20). Idle glow from blue `#4a7aff` (L4) toward white `#e8f4ff` (L20) at HDR 0.4; the level in between pairs is told by glow brightness (+0.05 HDR per level). With heat, fins blend to `#ff5a1a` up to HDR 1.5 |
| Fuel tank | 4, 8, 12, 16 | one side tank (3x3) added each time, stacked on the back; L16 adds a lit gauge px `#5ad88a` |
| Cargo bay | 5, 10, 15, 20 | the hull widens toward the back by 1 px per step (a rear box), L20 with a lit seam `#ffd870` HDR 0.6 |
| Lamp | 4, 8, 12 | housing 1 px -> 2 px -> 2x2 -> 3x2 with a lens px; beam tint warm `#ffe0b0`, then white `#fff6e8`, then cold `#e8f4ff` |
| Scanner | 1, 4, 8 | antenna 1x3 with a blinking tip; dish 3 px; ring dish that turns (2 frames) and pings |

When a part has more levels than visible steps (D20), the in-between levels
show as glow and colour on that part (fins above; the drill bit's glint rate
rises 10 % per level within a tier).

### 5.3 Animation

| What | How |
|---|---|
| Idle | 1 px bob every 0.8 s on the surface only |
| Tread roll | alternate `t`/`T`, 1 step per 4 art px moved |
| Drilling | bit: 3 frames at 30 Hz (spiral stripe shifts 1 px). **Pod sprite vibrates +-1 px x at 20 Hz**; the tile jitters at stage 3+ (3.7). The camera does not move (R13) |
| Thrust | flame 3-6 px tall by thrust, 3 frames at 20 Hz, inner HDR 3.0, mid 1.6, tip 0.8 (colours from 5.2); smoke after 0.3 s |
| Landing | squash 16x12 for 2 frames, 16x13 for 2, then normal; dust puff 6-10 px each side; only above 4 tiles/s |
| Hit | whole sprite `#ffffff` 2 frames, then `#ff4a4a` mix 0.5 for 120 ms |
| Low hull (< 25 %) | 1 px smoke puff every 0.4 s, a spark every 1.5 s |
| Overheat (> 80 %) | hull tint toward `#ff5a1a` 30 %, fins at max glow |
| Fuel low (< 15 %) | lamp flickers (10 % dips, 2 per second); at 0 fuel the lamp is 50 % radius |

### 5.4 Modules on the pod (R7)

Row 9 holds **4 module sockets**, 2 px each (cols 2-9). Empty: `h` shade.
Fitted: the module's colour, unlit; it lights (HDR 1.0) while the module acts.
Each module also has one small tell in the world:

| Module | Socket colour | Tell when it acts |
|---|---|---|
| Magnet Coil | `#c0602a` | pickups within range bend toward the pod along a faint 1 px blue arc `#8ac8ff` HDR 0.5 |
| Heat Sink | `#4a7aff` | a 2x3 dark block on the back glows blue HDR 0.6 as it soaks heat |
| Dense Packing | `#9aa2b4` | 2 px cross straps over the cargo box |
| Afterburner | `#8ac8ff` | a third 2x2 rear nozzle; blue flame on boost |
| Smelter | `#ff8a2a` | a 1x3 chimney on the top-back puffs smoke with an orange core |
| Helper Drone | `#5ad88a` | its own 5x4 sprite following 1.5 tiles behind, 1 px lamp (an extra omni light I 0.5, radius 2) |
| Prospector's Ear | `#e0c040` | a 1x2 ear horn on the cockpit; a 1 px ring pulses from it when it hears ore |
| Overcharge | `#c08aff` | a 1 px arc ring crackles round the bit while armed (key 7) |
| Vein Tracer | `#32e08a` | the glass `G` px take a green tint; traced vein outlines +30 % |
| Fuel Recycler | `#5ad88a` blink | a 2x3 cylinder under the tank, blinks while recovering |

### 5.5 Lamp and self-light (R12)

Dynamic light slot 0:
- **Cone:** from the lamp px, facing, tilted 15 deg down (straight down while
  drilling down); radius **`min(10, 3.5 + 0.5 L)` tiles**, half-angle **`40 +
  1.5 L` deg** (L0: 3.5 tiles, 40 deg; L13: 10 tiles, 59.5 deg). Colour by
  lamp tier (5.2), I = 2.2. Direction eases over 0.12 s when turning (the beam
  sweeps the rock).
- **Omni:** radius `2.0 + 0.1 L` tiles (max 3.3), `#ffe8c8`, I = 0.9: the
  tiles round the pod are always readable facing a wall.
- Spore clouds halve the cone radius (world).

Self-light: the pod's px get `max(lit, albedo * 0.55)` and a 1 px rim away
from the lamp at L 0.15. Its outline `#0b0d12` is never lit.

---

## 6. Readability spec (firm rule)

### 6.1 Luminance bands (R11)

Measured on the final frame, per layer (`G0.a`), at the biome's reference
exposure, in lamp light within 4 tiles of the pod unless stated. Ores,
hazards, caches and jackpots are measured on their `light` + glint px.

| Layer | L band | Unlit floor (`floorLum`) | Notes |
|---|---|---|---|
| Sky / parallax | 0.05-0.75 | n/a | surface only |
| Far rock (outside all light) | 0.02-0.05 | 0.02 | never pure black |
| Back wall (tunnel) | 0.03-0.06 | 0.03 | darkest thing you act near |
| Decor on back walls | <= 0.08 | 0.03 | no outline, HDR <= 0.9 except lanterns, Lift lights and glyph pulses (1.3) |
| Undiggable rock | 0.10-0.16 | 0.025 | 45 % albedo, hard outline, no lip |
| Diggable rock | 0.24-0.38 | 0.035 | lip on faces; dense 0.24-0.30 |
| Ores and hazards | 0.55-0.85 | scanner outline 0.12 | outlined, glint |
| Pod | highlights 0.60-0.95, outline 0.02 | 0.40 | the strongest light/dark pair on screen |

**Check: p90 of the lower layer < p10 of the upper layer**, for back wall <
undiggable < diggable < ores/hazards (not means). At the band edges that gives
contrast ratios `(L1 + 0.05) / (L2 + 0.05)` of 1.36, 1.38 and 1.40; the check
asserts at least 1.35.

### 6.2 Rules

1. **Outlines** mean "an object": the pod, ores, jackpots, caches, artifacts,
   pickups, boulders, the Lift cage, buildings (1 px dark). Undiggable rock
   has an outline against air (2 px in the Core). Diggable rock has the light
   lip instead. Nothing else is outlined.
2. **Glow cap:** non-interactive things (decor, spores, back-wall crystals,
   fog, glowcaps, embers) HDR <= 0.9; lanterns, Lift lights and glyph ripples
   1.3. Ores up to 2.5, jackpots 3.0, hazards 3.0, lamp and flame 3.0,
   explosions 6.0, the Seed 12. **No ore glows above row 160** (R11).
3. **Particles behind the action:** ambient particles alpha <= 0.5, HDR <=
   0.8, skipped within 10 art px of the pod's centre. Gameplay particles may
   pass over the pod for at most 0.25 s.
4. **Saturation:** back walls and far rock <= 35 % HSV after grade; ores and
   hazards >= 60 %; the pod's trim >= 70 %.
5. **Motion:** only the pod, Lift cage, falling things, hazards and pickups
   move more than 1 px/s.
6. **Post effects never cover the pod's 3-tile neighbourhood:** haze x
   `smoothstep(1.5, 3.0, distToPodTiles)`; vignette centred on the pod.

### 6.3 Colour-blind friendliness

- Ore identity is the **shape class** (3.3); co-occurring ores never share a
  class, and the UI icons repeat the shape. This is v1.
- Hazards are dashed rims plus their own animation, never "red means danger"
  alone. Lava differs from Fire opal by size (whole tile vs 5 px orb) and
  motion.
- HUD warnings use shape (border pulse, icon shake) as well as colour.
- Simulation filters (deuteranopia, protanopia, tritanopia) are later, not v1.

### 6.4 Squint test, per biome

Debug overlay (`F9` cycles) and a headless CI check on seeded scenes:
1. **Squint view:** final frame -> greyscale -> 3x3 box blur. Pass: pod, every
   ore and hazard a distinct blob; diggable and undiggable distinguishable;
   nothing in the background as bright as an ore.
2. **Layer view:** each art px coloured by `G0.a`.
3. **Band check (automated):** one seeded scene per biome and per v1 planet
   biome (noon and midnight for biome 0): the 6.1 bands and the p90/p10 pairs.
   A failure names the biome and the pair.
4. **Shape check:** for every biome, the set of ore classes on its rows has no
   duplicate (a unit test over world's band table and 3.3).
5. Run at 720x390 dpr 1 (S = 2, the smallest real pixels).

---

## 7. Surface, town and the Lift

### 7.1 Sky and day cycle

10 minutes, always running, also underground (D13). Keyframes, phase 0-1,
interpolated in linear light (Vell; planets tint them, 4.1):

| Phase | Zenith | Horizon | Sun/moon | Notes |
|---|---|---|---|---|
| 0.00 midnight | `#070a1a` | `#1a2140` | moon high | stars full |
| 0.20 pre-dawn | `#141a3a` | `#6a4a6e` | | stars fading |
| 0.25 sunrise | `#3a5a9a` | `#ff9a5a` | sun band `#ffcf6a` | longest shadows |
| 0.32 morning | `#4f8fd8` | `#bfe0f2` | | |
| 0.50 noon | `#3f86e0` | `#a8d8f5` | sun high | |
| 0.68 afternoon | `#4a86d0` | `#d8e6e8` | | |
| 0.75 sunset | `#3a3f7a` | `#ff7a3a` | sun band `#ffcf6a` | the money shot |
| 0.80 dusk | `#1f2350` | `#a04a6a` | | windows light |
| 0.88 night | `#0b1028` | `#24284a` | moon rising | |

Sky: `mix(horizon, zenith, pow(y, 0.6))` in 12 quantised steps with the Bayer
dither. Sun 12 px `#fff4d6` HDR 4.0 + halo; moon 8 px `#e8eef8` HDR 1.2, 2
crater px, phase per in-game day. Stars `hash(px) > 0.997`, twinkle
`0.6 + 0.4 sin(t (1 + 3 hash))`, visible below sky L 0.1, 1 in 40 is 2x2 and
tinted (`#ffd0a0`, `#a0c8ff`); a shooting star every 40-90 s at night.
Clouds: two thresholded fbm layers (2 px shade), drifting 2 and 4 art px/s,
`mix(white, horizon, 0.5)`, `#1a1e34` at night. Parallax mountains: 3 layers
at 0.15 / 0.30 / 0.50, heights 40 / 28 / 18 art px, bases `#3a4a6a`,
`#2e3a50`, `#222a38` mixed toward the horizon by 0.6 / 0.4 / 0.2; 1 px lit
ridge on the nearest.

### 7.2 Town layout (48 columns)

Buildings stand on row 0. The mine mouth and Lift share column **m** (24 per
core-loop; if world seeds 23, everything below shifts by -1).

| Columns | What | Size (W x H tiles) |
|---|---|---|
| 0 | bedrock | |
| 2-6 | **Launch site** (Ida): gantry, observatory dome with telescope on top | 5 x 6 |
| 8-10 | **Rig office** (Juno), derrick at 11 (1 x 5), **silo** at 12 | 3 x 3 |
| 13-15 | **Lab** (Sefa) | 3 x 4 |
| 16-19 | **Workshop** (Bram) | 4 x 3 |
| 20-22 | **Fuel station** (Mo): canopy reaches over the forecourt's left edge | 3 x 2 |
| 23-30 | **Depot forecourt** (R12): mine mouth and Lift head at 24 under the headframe (23-25, 5 tall); service pad 26-29 | 8 x 0 (apron) |
| 31-34 | **Market** (Ines): awning over the forecourt's right edge | 4 x 3 |
| 36-38 | **Supply store** (Pell) | 3 x 2 |
| 39-46 | open ground: windsock at 42, grass, the night fireflies | |
| 47 | bedrock | |

The busy loop (shaft, pad, fuel, market) spans 11 tiles; the workshop is one
key away anywhere in town (`U`).

### 7.3 Buildings

Built from code; corrugated metal and timber, 1 px dark outline (things you
act on), a lit **pictogram sign** (7x7 icon on an 11x9 board), a 6x9 door that
glows while the pod is in front of it. No painted text.

| Building | Silhouette | Sign | Accent |
|---|---|---|---|
| Fuel station | flat canopy on 2 posts, 2 pumps whose hoses face the pad | drop | `#e84a3a` |
| Market | wide striped awning, ore crates, a scale | coin | `#e0c040` |
| Workshop | roll-shutter door, crane arm, chimney | wrench | `#ff9a3a` |
| Supply store | shed, stacked crates, barrels | crate | `#8ac85a` |
| Lab | dome with a slit, blinking antenna | flask | `#7fe8ff` |
| Rig office | office block, derrick pumping slowly, silo tank 2 x 4 with a 1 px fill line | gear | `#c58cff` |
| Launch site | gantry tower holding the Core Lance as bought: frame, then coil, then head (D8); observatory dome on top; floodlights | rocket | `#ffffff` |
| Headframe | steel A-frame over the mouth, winch wheel at the top (turns while the Lift or a tow runs) | - | `#9aa4b4` |

**Depot forecourt:** concrete apron `#5a5652 #6a6460 #76706a #8a847c`, oil
stains, 1 px expansion joints. The service pad (26-29) is a painted box:
corner marks `#ffd870`, centre chevron. Landing on it: the marks light (HDR
1.0), Mo's hose arcs to the pod, Ines' scale tips, and the tally runs
(HTML). Mouth edge: 1 px yellow-black chevrons `#ffd870` / `#1a1a1a`.

Night: windows 2x3 `#ffc670` HDR 1.6 (some flick off/on every 20-60 s), signs
HDR 1.4, launch floodlights are dynamic lights. Day: signs are paint.
Ambient life: bird flocks by day, chimney smoke `#9a9aa0` alpha 0.4,
fireflies `#d8ff7a` HDR 0.8 at night, the windsock, grass tufts swaying 1 px.
Transition: sky and parallax fade to Topsoil fog over camera rows 0-8.

### 7.4 The Lift (R2b)

An elevator in column m, built one biome segment at a time. It must read as
**built, safe and not rock**: the only perfectly regular vertical structure
underground, steel blue-grey, steady lights, never a dashed rim.

| Part | Look |
|---|---|
| Column back wall | "built" back wall: steel plates `#22282e #2a3038 #343a44 #3e4650`, a 1 px bolt every 8 px, no rock noise. Back wall layer, band 0.03-0.06 |
| Rails | 2 px vertical rails at local px 1-2 and 13-14, `#6a7280` with a 1 px `#9aa4b4` lit edge (decor, <= 0.08) |
| Column edge | the tiles either side are cut clean: a 1 px straight `#3e4650` lining, no bevel lip (nothing to dig there) |
| Segment lights | paired 2x2 lamps on both rails every 4 rows, steady, static emitters HDR 1.3, radius 2, in the segment's biome colour: Topsoil `#ffd870`, Stone `#ffb35c`, Crystal `#7fe8ff`, Fungal `#5cffc8`, Magma `#ffd27a` (never lava orange), Ruins `#8affd0`, Core `#fff2c0` |
| Stations | at each segment end: a 1-tile gate frame with yellow-black chevrons and one green `#5ad88a` "ready" lamp HDR 1.3 |
| Lift head | the deepest built station: a 2 px yellow-black bumper beam and a floodlight pointing down (emitter HDR 1.0, radius 3). Below it, ordinary rock |
| Cage | 16 x 16 sprite: 1 px roof beam with a sheave, 2 px side bars, a cross brace on the back, `#9aa4b4` with `#0b0d12` outline; 1 px cable `#c8ccd2` straight up. The pod sits inside |
| Riding (40 tiles/s) | segment lamps draw as 1x6 px streaks; 1 px speed lines on the back wall (alpha 0.25); the headframe winch turns |
| Unbuilt segment | at the workshop: the pod preview shows the column with the next segment as a dashed `#2a3242` ghost |

### 7.5 Fast drop and auto-brake (R2c)

In a column open below the pod, holding Down drops at up to 25 tiles/s:
- **Drop:** treads tuck 1 px up, flame off, two 1 px speed lines `#e8ecf4`
  alpha 0.3, 6-10 px long, above the pod.
- **Brake marker:** as the drop starts, the floor where it will stop gets two
  3 px corner brackets `#ffd870` (alpha 0.4, rising to 0.9 as the pod closes):
  you see where it stops before it stops.
- **Brake (3 tiles above the floor):** both vents fire a `#8ac8ff` flame 4 px
  for 0.25 s, a dust ring kicks up from the floor, the brackets flash once.
  No squash, no shake (it is not an impact).

---

## 8. Particles and VFX

One instanced buffer, 4096 slots, `{pos f32x2, vel f32x2, life u8, size u8,
colorIdx u8, flags u8}`, simulated on the CPU, drawn as `GL_POINTS` sized in
whole art px.

### 8.1 Effects

| Effect | Spec |
|---|---|
| Drill debris | every dig tick (0.1 s): 1-2 px chips in the material's shades, from the contact edge, 20-50 art px/s away, gravity 300, bounce 0.3, life 0.6-1.2 s. Tile pop: 6-14 chips + 4 dust |
| Dust | 2-3 px puffs, `mix(material.light, fog, .5)`, alpha 0.35, grow 1 px, life 0.8 s |
| Sparks | clinks and metal hits: 1 px `#ffe0a0` HDR 2.0 -> `#ff6a1a` 0.6, 60-120 px/s, gravity 200, life 0.25 s, 4-8 |
| Ore pop | the ore's 5x5 class icon pops up 6 px with a 1 px white ring (0.25 s), flies to the pod on a magnet curve (`vel += (pod - p) * 14 dt`, cap 300 px/s), 3 px trail in its `light` HDR 1.2; one icon per piece, 40 ms apart; the cargo part flashes white 1 frame |
| Cache open | lid pops 2 px, 8 sparks in the cache's accent, contents fly as ore pops |
| Jackpot | hitstop 50 ms, a light pulse (I 3.0, radius 5, 0.6 s), 24 gold sparks `#ffe890`, the icon rises 10 px and hangs 0.4 s before flying |
| Thruster | 2 particles/frame in the flame's colours, life 0.15 s; smoke `#5a5a60` alpha 0.3 after 0.3 s |
| Explosion | light I 6.0 radius 5 tiles, `exp(-8t)`; 1 frame white disc radius 12 px HDR 4; 1 px shock ring to 40 px in 0.3 s; 30 debris, 20 sparks, 10 smoke (1.5 s) |
| Lava embers | 1 px `#ffa040` HDR 0.8 rising 8-16 px/s, sine drift, life 2-4 s, 1 per surface tile per 0.8 s |
| Spores | 1 px `#5cffc8` / `#ff6ad5` HDR 0.6, rising 3 px/s, 40 max |
| Gas release | `#c8e04a` cloud, 30 particles 3-4 px alpha 0.35 over 1.2 s, light radius 2 HDR 0.6 |
| Pickup | floating pickups bob 1 px, 1 px outline, omni HDR 0.6 radius 1.5 |
| Wreck crate | 14x12 crate `#4a4e58`, beacon `#ffb35c` HDR 1.3 blinking 1 Hz, emitter radius 2; an icon on the depth gauge and minimap until recovered |
| **Tow** (R1) | the cargo drops out as a wreck crate at the spot (the crate falls 1 tile, dust); a hook on a 1 px cable lowers from above the screen, latches (2 sparks), the pod rises out of view; cut to the headframe winch turning as the pod comes up the mouth and is set on the pad. 3 s, skippable |
| **Teleport** (R1) | 2.5 s channel: rising vertical light lines `#c9a0ff` round the pod. In the last 0.5 s **the lost 30 % leave**: their ore icons burst out of the pod, turn grey `#6a6a70` and crumble to 1 px dust that falls (cheapest first, so the dull icons go); a `-N` count in `#ff5a4a` under the cargo bar. White flash 0.5 alpha on warp, arrival on the pad with the same lines falling |

### 8.2 Screen shake (R13)

Offset only: `offset = 4 art px * trauma^2 * noise(t * 18 Hz)` per axis, trauma
decays 1.6/s, clamped to 1. **Only breaks, impacts and blasts.**

| Event | Trauma |
|---|---|
| Tile break (pop) | 0.08, dense 0.12 |
| Landing (impact) | `clamp((impactSpeed - 4) / 12, 0, 0.5)`, tiles/s |
| Damage | `0.2 + 0.6 x damageFraction` |
| Explosion, gas blast | 0.6 / `(1 + d / 4)` tiles |
| Boulder impact nearby | 0.25 |
| Drilling, auto-brake, Lift, upgrades | 0 |

Hitstop: 50 ms on damage > 15 % hull and on breaking a jackpot, gem or star
tile.

### 8.3 Celebrations and titles

**Upgrade** (panel open at the workshop): the part flashes white 2 frames,
swaps sprite, 16 sparks in the part's accent, the pod hops 2 px; the stat pip
fills (150 ms). A tier change (5.2) adds a light pulse (I 2.0, radius 3,
0.5 s) and a title line with the tier's name ("Carbide auger").
**Lift segment built:** the new segment's lamps light top to bottom at 40
tiles/s (the ride speed), then its station turns green.
**Biome entry** (first time): grade crossfade in the world; HTML title in the
upper third, biome name in small caps, letter-spacing 0.2 em, 18 / 28 px, a
growing 1 px line, depth under it; in 0.4 s, hold 1.8 s, out 0.6 s, 25 %
fog backdrop. Later entries: a toast.

---

## 9. UI (HTML over the canvas)

### 9.1 Style

- Fonts: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue",
  Arial, sans-serif`; `font-variant-numeric: tabular-nums`; weights 500 / 650.
- Base `clamp(11px, 1.6vh + 5px, 15px)`; labels 0.85 em, numbers 1.0-1.15 em.
- Colours: text `#e8ecf4`, quiet `#8a94a8`, panel `#0c0f16` at 0.86, border
  `#2a3242`, inner top highlight `#ffffff0f`, accent `#ffd870`, good
  `#5ad88a`, warn `#ffb35c`, bad `#ff5a4a`, cash `#e0c040`, data `#7fe8ff`,
  shards `#c9a0ff`.
- Panels: square with a 2 px stepped corner notch, 1 px border, no blur or
  gradients, a 2 px hard offset shadow `#00000066`. No pixel fonts.
- Icons: the world's 7x7 / 5x5 pictograms at integer scale,
  `image-rendering: pixelated`. Ore icons repeat the shape class.
- Bars: 6 px / 8 px tall, 1 px border, flat fill with a 1 px lighter top; the
  lost segment shows as a white ghost draining over 0.4 s.
- Words: plain and short, no exclamation marks.

### 9.2 HUD

```
+----------------------------------------------------------------------+
| [drop] Fuel ######--|--  [shield] Hull ########--     $ 12,480     ||<- depth gauge
| [box]  Cargo 14/20       (Heat ####-- when > 40 %)     1,240 m     ||   4 px wide:
|                                                                    ||   biome bands,
|                       (toasts, top centre)                         ||   Lift rail + head,
|                                                                    ||   pod marker,
|                  [1][2][3][4][5][6][7]  hotbar                     ||   home tick, crates
+----------------------------------------------------------------------+
```

- Margins 8 px; bars 96 px (160 px at 1440x900); top cluster on one panel at
  0.7 alpha.
- **Fuel bar tick:** a white tick at the fuel needed to reach the **Lift head**
  (or the surface before the first segment), per R2. Below it, the bar's
  outline blinks.
- **Depth gauge:** right edge, 4 px wide, biome bands at 40 %; the built Lift
  as a 1 px `#9aa4b4` rail down its left side ending in a 3 px head bracket;
  the pod a 6x3 `#ffd870` marker; wreck crates as 3x3 `#ffb35c` squares.
- Hotbar: hidden until the first item; slot 7 is Overcharge (D14).
- Warnings (fuel < 20 %, hull < 25 %, heat > 80 %): border pulses `#ff5a4a`
  at 1.5 Hz, the icon shakes 1 px, one toast per dive.
- 1440x900 adds a minimap (96 x 128 px, 2 px per tile): tunnels `#2a3242`,
  rock `#12141a`, the Lift `#9aa4b4`, scanned ores as 2 px dots in their
  colour, rich pocket haloed, the town strip on top. `M` toggles it.

### 9.3 Screens

Centred panel, max 640 x 360 at 720x390, 880 x 600 at 1440x900; the world
keeps running, dimmed 40 % and desaturated 50 %. Esc or any direction key
closes (and drives). Keys (R12): `B` buys the suggested upgrade, `U` opens
the workshop from anywhere in town, `Tab` the cargo panel.

- **Depot card** (on the pad): the tally (sell, fuel, repair, restock) and
  **Ines' 2 orders** as two rows, each with the ore icon, the target ("6 in
  one haul") and the bonus; a met order flashes `#5ad88a`.
- **Workshop:** eight upgrade rows (icon, name, pips, the change in plain
  numbers, price button; grey with "$ 1,200 more"); a **Modules** tab with the
  sockets as slots and the owned modules as cards, swapped by click or
  Enter, free; a **Lift** row showing the column with built segments lit and
  the next one dashed. Pod preview at 4x on the left at 1440x900. The
  suggestion card names gates only, never a module (R7).
- **Market (sell):** rows per ore appear every 60 ms; total counts up over
  `0.6 + 0.25 log10(total)` s (cap 1.6), ease-out cubic; the HUD cash counts
  in sync, 6-12 coin icons fly to it. Enter skips.
- **Supply:** 2 rows of items, owned count, price.
- **Lab:** tree left to right by tier, 32 px node tiles, 1 px `#2a3242` lines;
  bought `#7fe8ff`, available accent, locked dim with a lock.
- **Rig office:** rigs as rows with a live output bar and "Running" / "Full" /
  "Stopped"; the silo's fill.
- **Launch site:** the planet as a 64 px disc from the same shader, the lance
  parts owned, the shards in large type, what carries over, one button
  "Launch". The launch: the Seed rises up **your Lift column** (lamps
  flashing past, each biome's colours, about 12 s), breaks the surface at the
  mouth, white wash HDR 8 over 1.2 s.
- **Toasts:** top centre, max 2, 2.5 s, slide 6 px + fade 120 ms in, 200 ms out.

---

## 10. Performance budget

Target 60 fps at 1440x900 dpr 2 (2880 x 1800 canvas, art buffer 414 x 259),
M1-class GPU, 24 dynamic lights, 4096 particles, 400 grid emitters.

| Item | Budget | Why it fits |
|---|---|---|
| CPU per frame (sim + particles + grids + upload) | 4 ms | grids only on dirty (a dig changes ~1 tile); particles ~20 flops each |
| G-buffer (terrain + decor + sprites) | 0.5 ms | 107 k px, ~12 fetches each |
| Light accumulation | 1.5 ms | 24 lights x <= 12 occlusion steps on covered px only |
| Particles | 0.3 ms | one instanced draw |
| Bloom | 0.3 ms | tiny buffers |
| Final pass | 2.0 ms | 5.2 M px, the only device-res pass |
| Total GPU | <= 5 ms | room for older Intel Macs (30-60 fps; drop dpr to 1.5 first) |

One fullscreen triangle per pass; no per-frame allocation; atlases built once
(pod tiers and modules, ores, caches, jackpots, artifacts, decor, icons,
< 1 MB); tile updates by `texSubImage2D` rows; < 40 draw calls. `F10` shows
per-pass time (`EXT_disjoint_timer_query_webgl2`). Missing budget for 2 s:
dpr 1.5, occlusion steps 6, lights 12, particles 2048, in that order. Never
drop the lamp's occlusion or the readability layers.

---

## 11. Open questions

1. **Dense material names** per biome are world.md's; 3.2 is the look for
   whichever it picks.
2. **Ore bands:** if world.md moves a band, rerun the shape check (6.4.4); a
   new overlap between same-class ores needs a class swap here.
3. **Planet biome rows** for Cinder and Ferrum (R4) are world.md's; 4.1 gives
   their palettes.
4. **pal panel port:** at 720x390 inside pal, is dpr 2 guaranteed? At dpr 1
   S = 2, the readability test target (6.4).
5. **Accessibility:** a "reduce shake" slider (shake only; animations stay).
