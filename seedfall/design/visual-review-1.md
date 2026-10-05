# Seedfall visual review 1

Fresh critique from the 38 gallery screenshots in `shots-tmp/gallery/` only (no code or design docs read). "720" means the 720x390 panel and "1440" the 1440x900 window, both at 2x. Pod mid-air poses and depth/goal numbers are ignored as staging.

## Verdict

**It is not awe-inspiring yet, and underground it is not readable.** The surface town is good, close to great at sunset and night. The crystal cave is the one underground scene that shows what the game could be. Everywhere else, 70 to 90% of the frame is near-black, and I can't separate dug void from solid rock from rock you cannot dig. Ores show up as glyphs floating in the dark, with no tile behind them. Two places where the game should hit hardest, the lava lake and the Seed chamber, have the opposite problem: they blow out so badly that the pod turns into a white or beige ghost. The game has two lighting extremes and very little in between.

| Scene | Awe (1-10) | Readable (1-10) | One-line reason |
|---|---|---|---|
| Town noon | 6 | 8 | Clean, charming silhouettes; the ground falls to black within 3 tiles |
| Town sunset | 8 | 8 | Best shot in the set: warm grade, sun glow, layered hills |
| Town night | 7 | 6 | Moon and lit signs are lovely; the ground and the pit vanish |
| Topsoil | 2 | 3 | A brown-black field; one lit patch around the pod |
| Stone / old mines | 3 | 3 | Nice props (beams, lanterns, bricks) lost in grey murk; chains of ore read as ladders |
| Crystal caves (star geode) | 7 | 7 | Saturated rim-lit crystal; flat empty void inside, dead cobble outside |
| Geode | 5 | 5 | Blue shell reads; the purple ore sinks into the blue; ore floats in the dark |
| Fungal hollows | 4 | 3 | Mushroom landmark is good; the rest is green-black with no shapes |
| Magma (lava lake) | 5 | 2 | Lava is vivid, but the pod is a white blob inside it and the lava texture is noisy |
| Magma plain rock | 2 | 2 | Pure black with ember specks and floating outlines |
| Kiln | 3 | 3 | Brick ledge and kiln tile read; everything else is black with orange noise |
| Ruins room | 4 | 3 | Glyphs and moss have mood; rows of empty olive squares read as UI |
| Vault | 5 | 4 | Gold ore block pops; glyphs floating in open air look like debug text |
| Core | 5 | 5 | Red ore and the contour texture are distinctive; a milky grey fog washes the edges |
| Core chamber (Seed) | 3 | 4 | Flat peach disc on a beige box in brown fog; the pod is bleached |
| Workshop | 6 | 7 | Clear, well-set table; translucent panel lets the town bleed through; empty preview |
| Lab / research | 6 | 8 | Tidy tree, good locked/owned states; half the panel is empty |
| Launch site | 7 | 8 | Planet sprite and the shard callout are strong |
| Collection log | 4 | 5 | Undiscovered silhouettes are nearly invisible; feels like an empty spreadsheet |

Averages: **awe about 5, readability about 5**. Surface plus UI score about 7/7; underground scores about 4/3.

## Findings, ordered by impact

### 1. Underground is too dark: tile shape disappears 2 to 3 tiles from the lamp
**Shots:** topsoil-720/1440, stone-720/1440, fungal-720/1440, magma-plain-720/1440, kiln-720/1440, ruins-1440, geode-1440.

Outside the lamp cone, rock sits at roughly 3 to 8% brightness. At 720 the pod sees about a 2-tile lit disc and then nothing. In topsoil-1440, dug tunnels (pure black rectangles) and solid dirt (black-brown at maybe 6%) differ by only a few levels of value, so I can't tell where I've been or where I can go. Fungal-1440 is the worst: three-quarters of the frame is a single #0a1410-ish green-black, and the ledges only show up as faint outlines. Magma-plain-1440 is essentially a black screen with confetti.

**Fix:**
- Set an ambient floor per biome so every solid tile on screen shows its silhouette and top edge at about 15 to 25% brightness, and dug or air space is clearly darker than that (or tinted with a background wall, see #6). The lamp should add detail and colour, not decide whether a tile exists at all.
- Give every solid tile a 1px lighter top/edge highlight where it borders air, drawn at ambient strength. Then the cave outline reads at any distance, as in Terraria and SteamWorld Dig.
- Keep the darkness as a vignette at the screen edge, not a wall 3 tiles from the pod.

### 2. Rock you cannot dig is not identifiable anywhere
**Shots:** all underground shots.

I could not find, in any biome, a tile that clearly says "not diggable". Candidates are the dark cobble around the crystal ring (crystal-1440), the speckled grey block under the pod in stone-1440, and the hex-plated slab in magma, but each one looks like a darker version of ordinary rock. For a Motherload-like this is the single most important read after the pod itself.

**Fix:** one cross-biome language for undiggable rock that never changes:
- a heavy dark outline;
- a cool, desaturated, flat-faced block with bevelled plate edges or a riveted / crosshatched pattern;
- no ore glyphs, ever;
- noticeably higher contrast between its edge and face than ordinary rock.

Give it the same silhouette in every biome and recolour it only slightly. Test: in each biome screenshot, a stranger should be able to point at it in one second.

### 3. Glow effects draw over the pod and bleach it
**Shots:** magma-720 (the pod is a white-pink blob centre-left in the lake), magma-1440 (the pod is a ghost inside the lava), chamber-720/1440 (the pod is desaturated beige and its cyan dome and yellow stripe are gone).

This breaks the owner's rule that effects stay behind and dimmer. The bloom or additive light is composited on top of the player sprite.

**Fix:**
- Draw the pod after all light, glow and bloom passes, or exclude it from them. Cap any tint on the pod at about 20% so its yellow body, cyan dome and dark outline always survive.
- Give the pod a 1px dark outline plus a faint 1px light rim, so it reads against both black rock and white-hot lava.
- If the pod is meant to be inside lava, show that with a heat shimmer and a red hull flash, not by erasing it.

### 4. Ore glyphs and fossils float in the dark with no tile
**Shots:** magma-plain-1440 (grey and orange line drawings scattered across black), kiln-720/1440, magma-1440 lower half, geode-720 left (silver star ore with nothing around it), topsoil-1440 right (grey nugget clusters on invisible dirt).

Outlined ore icons drawn at full contrast on top of rock drawn at about 3% read as scribbles, noise or UI. The orange ember particles share a hue and size with the ore outlines and the hazard dashes, which makes it worse.

**Fix:**
- Either fade an ore out with its tile, or, if the scanner reveals it beyond the lamp, draw it as a soft coloured pip *inside a visible tile silhouette* (which #1 provides).
- Cut ember particle count by about 60%, make them smaller and dimmer, and push them behind tiles in the draw order. Keep orange-red reserved for heat hazards and lava.

### 5. Hazard markers compete with ore and props
**Shots:** fungal-720 (red dashed box around a green spore pod and around a block at the top right), magma-plain-720 (red dashed boxes around yellow "Y" glyph tiles), magma-1440 (bottom).

The red dashed square reads like a UI selection box and is used on things that look like ores. At 720 the dash is only 2 to 3 px, and the hazard's own art (a dull green sphere, a dim yellow crack) is weaker than ore art.

**Fix:**
- Make hazards louder than ore in their own art: a pulsing core, a saturated warning colour (hot magenta or acid), a 2px solid outline, and a small idle animation.
- Drop the dashed overlay box. If a marker is needed, use a solid corner-bracket in a hazard-only colour that no ore uses.

### 6. No background layer: every cave is a flat black or navy void
**Shots:** crystal-720/1440 (big flat navy rectangle), geode-1440, fungal-1440, chamber-1440, stone-1440.

Open caverns are the landmark moments, and they are drawn as empty fill. This is the biggest gap between "competent" and "awe".

**Fix:** add a 2-layer parallax back wall per biome, at about 25 to 35% of foreground brightness and lower contrast so it never competes with tiles:
- **Topsoil:** roots, buried pipes, bones, worm burrows. Warm brown.
- **Stone / old mines:** old timbered shafts, rails, hanging lanterns, faint distant headframes. Cool grey with warm lantern pools.
- **Crystal:** huge out-of-focus crystal spires glowing teal and violet, with slow sparkle motes. Signature light is cyan rim light.
- **Fungal:** giant mushroom silhouettes, hanging mycelium threads, drifting bioluminescent spores. Signature light is mint and magenta glow pools.
- **Magma:** distant lava falls and heat haze, with a red underglow on the undersides of ledges. Signature light comes from below.
- **Ruins:** colossal carved faces and columns, collapsed arches, glyph bands that glow faintly in sequence. Signature light is jade.
- **Core:** pulsing veins converging on one direction (the Seed), with a slow heartbeat brightness cycle.

### 7. The Seed chamber is the climax, and it is flat
**Shots:** chamber-720/1440.

The Seed is a smooth peach gradient disc with three white arcs. It doesn't look like pixel art: soft gradients clash with the crisp tiles. The pedestal is a greyed-out beige box with a hole. The room is a big flat brown fog with no walls, so there's no sense of scale. The pod sits on top, bleached (#3).

**Fix:**
- Redraw the Seed as hand-pixelled art at 2 to 3x its current size. Give it a dark-to-hot core with a visible inner structure (a seed coat, glowing cracks, roots sprouting into the floor), a rim of bright pixels, and a dark outline, plus a 3 to 4 frame pulse.
- Glow should be stepped pixel rings (dithered bands), not a Gaussian blur.
- Frame it with architecture: ruin arches from the biome above, root tendrils from the ceiling converging on it, and a floor of vein lines leading in.
- Use god-rays from the Seed upward at 15 to 20% opacity, behind the tiles.
- Keep the pod at full colour.
- The Seed should be the brightest object on screen, and nothing else in the chamber should be above about 40% brightness.

### 8. Ruins and vault: empty olive squares and floating glyphs read as UI
**Shots:** ruins-720/1440, vault-720/1440.

Grids of 1px olive-outlined empty squares fill the walls. They look like inventory slots or a selection grid, not carved stone. Jade glyphs float in open air (vault-1440 top half), unattached to any surface, and read as debug labels.

**Fix:**
- Fill the squares as carved recessed panels: a darker inset face, a lit top-left edge and a shadowed bottom-right, with a low-contrast pattern inside.
- Put glyphs only *on* tiles (engraved, glowing faintly), or on the back wall layer at low alpha.
- Make the gold vault ore and the green chest the brightest things in the room; they already are, so keep that.

### 9. Core: a milky grey fog washes the edges
**Shots:** core-720 (right third), core-1440 (right edge and bottom-right).

A semi-transparent light-grey haze sits on the frame edges and desaturates the red ore and contour rock into pink-grey. It looks like a rendering bug, not atmosphere.

**Fix:** if it's heat haze or a vignette, make it dark and hue-matched (deep crimson or black), not additive grey. Never lift blacks towards grey at the edges.

### 10. Lava lake texture is noisy and has no depth
**Shots:** magma-720/1440, magma-plain-720.

The lava is a busy mosaic of dark polygons with bright-yellow outlines at the same value everywhere. There's no hot-to-cool gradient, no surface line, and no glow onto the rock above. It reads as cracked tiles rather than liquid. The top surface edge in magma-1440 is the best part.

**Fix:**
- Give the lava a clear bright surface band (1 to 2 tiles of near-white yellow, with a slow animated wave), deepening to orange and then dark red with depth.
- Make the crust islands fewer and larger, and have them drift.
- Cast a red-orange bounce light onto the underside of the ledges above and onto nearby rock, reaching 3 to 4 tiles.
- Keep the lava less bright than the pod's outline (#3).

### 11. Topsoil and town: the ground goes black almost immediately
**Shots:** town-noon-1440, town-sunset-1440, town-night-1440, topsoil-1440.

At noon the dirt reads well for about 2 tiles and is black by tile 4. The first dig should feel inviting, not like a void. At night the shaft and ground are invisible. The first underground biome is also the darkest-feeling one, which is backwards for onboarding.

**Fix:**
- Make daylight reach about 8 tiles down in town, fading gradually.
- Make the topsoil ambient the brightest of all underground biomes (about 30%).
- Give the night ground a cool moonlit rim on the grass line and on the top 2 tiles.

### 12. Stone: ore patterns read as other objects
**Shots:** stone-720/1440.

The copper ore is a row of orange oval rings stacked vertically, which reads as a chain or ladder. The grey-white "Y" fork glyphs (stone-1440 bottom-left) read as cracks or twigs. The lit grey slab (1440 right) is a big flat featureless area.

**Fix:**
- Make ore nuggets chunky filled clusters with a highlight pixel, not hollow rings or line glyphs.
- Give each ore one distinct silhouette and hue, and keep line-art glyphs for fossils and relics only.
- Add face texture (strata, small pebbles) to the large stone areas so lit rock has some interest.

### 13. UI modals: translucency lets the world and the HUD bleed through
**Shots:** shop-workshop-720/1440, shop-lab-720/1440, shop-launch-720/1440, log-720/1440.

The panel background is about 85 to 90% opaque, so the headframe tower, buildings and pod outline show through behind the text. At 720 the HUD numbers ("5,000", "400,000", the goal line) show through the panel header and look doubled.

**Fix:**
- Make panels fully opaque, or blur and darken the world behind them to about 30%.
- At 720, hide the HUD while a modal is open, or have the modal show the money and resource line itself, which it partly does already.

### 14. UI: dead space and an invisible collection log
**Shots:** shop-workshop-1440 (left preview pane: a tiny pod sprite in a big empty box, then 300 px of nothing), shop-lab-1440 (the right detail column is 80% empty), log-720/1440 (undiscovered silhouettes at about 8% contrast; the detail pane says only "Not found yet").

**Fix:**
- **Workshop:** show the pod at 4x in the preview, with the selected part highlighted, and a before/after stat bar.
- **Lab:** show the node's art large, plus its prerequisites.
- **Log:** draw undiscovered ores as clear silhouettes at about 25% with a "?", and tint each row by biome colour. In the detail pane give a hint ("found in Crystal caves, 2,000 m+").

### 15. The 1440 minimap reads as a broken black box
**Shots:** every *-1440 shot (top right).

It's a dark rectangle with a tiny blob. In town it is entirely empty.

**Fix:** give it a frame and a biome-tinted background, show the explored tunnels in a light colour, and mark the pod with a bright blinking dot. Hide it on the surface.

### 16. Pixel-style consistency
The Seed, the lamp cone, the lava bloom and the geode glow use smooth gradients and blurs. Tiles, the town and the UI icons are crisp pixel art. The mismatch makes the important objects look the cheapest.

**Fix:** dither or step all glows and light falloffs into 3 to 5 bands, snapped to the pixel grid.

## What would make each biome breathtaking (keeping readability)
The rule for every biome: **the foreground tiles always win on value contrast; the background and effects carry the mood at under 35% brightness.**

- **Topsoil:** warm sunlight shafts from the surface that fade over 8 tiles, roots and buried junk in the back wall, worm and beetle critters. Landmark: a buried old drill rig.
- **Stone / old mines:** amber lantern pools along old timbered tunnels, rails, a collapsed elevator cage. Signature: warm lantern light against cool grey stone. Landmark: a giant abandoned bucket wheel in the background.
- **Crystal caves:** already closest. Add background crystal spires, cyan caustic light that sways slowly, and refracted colour spots on nearby rock. Landmark: the star geode as a cathedral, with crystal pillars catching the lamp and each one flaring when lit.
- **Fungal hollows:** raise the ambient green, add drifting spores (behind tiles), mycelium threads hanging from ceilings, and mushroom caps that glow and dim slowly. Landmark: a hollow with a mushroom forest of varied heights and colours (mint, magenta, amber), not one flat cap shape.
- **Magma:** underglow from below on every ledge, heat shimmer above lava, distant lavafalls. Keep plain rock at 20% ambient in a deep red-brown, not black. Landmark: the lava lake with a readable surface, crusts and bounce light.
- **Ruins:** jade glyph bands that pulse in sequence across the back wall, colossal carved silhouettes, moss and hanging vines. Landmark: the vault door as a big framed set piece.
- **Core:** veins that flow and pulse towards the Seed's direction, with a heartbeat brightness pulse every few seconds (subtle, about 10%). Red ore keeps the highest saturation.
- **Seed chamber:** see #7. It needs scale, framing, stepped god-rays and silence: one hero object.

## What already works and must be kept
- **The town at sunset and night.** The colour grade, the layered hill silhouettes, the cloud shapes, the headframe as the anchor, and the lit shop signs at night. This is the quality bar for the rest.
- **The pod sprite** (when not bleached): a clear silhouette, a cyan dome, a yellow stripe and visible drill. It reads well at 720.
- **The crystal and geode colour language:** saturated blue and green gems, rim glow along cave edges, small coloured stalagmites. Ore against host rock is excellent here.
- **The core's red ore and contour-line rock:** distinctive and unlike anything else.
- **The gold ore in the vault and the glowing green chest:** strong value hierarchy.
- **Stone biome props:** brick and timber supports, hanging lanterns, chests with warm glow.
- **The lava surface edge** in magma-1440 (bright crenellated top line).
- **UI typography and structure:** crisp text, clear hotkey hints, yellow price chips, good owned/locked states in the lab, and the Launch site planet sprite and shard callout. The NPC one-liners in the headers add character.
- **The HUD layout:** compact top-left bars and a top-right money/depth/data line that never cover the pod. The thin biome-coloured depth gauge on the right edge is a nice touch.
