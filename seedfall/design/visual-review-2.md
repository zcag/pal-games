# Seedfall: visual review 2

Independent pass, judged only from the gallery (`shots-tmp/gallery/*`, 720 = 720x390 panel, 1440 = 1440x900 window, both at 2x) and the seven UI captures in `screenshots/`. Staging artefacts (teleported pod, random pod tier, depth numbers) ignored.

## Verdict

The surface town and the crystal caves are close to the target. Everything below about 700 m is not. Each biome has a palette but no lighting structure, and the tiles are flat squares with no edges, so the main question in a digging game, "what can I dig and where is the empty space", gets a slow answer in Stone, Magma and Ruins. The pod is the one thing that reads instantly everywhere. Ores read in some biomes and get lost in others. The Seed, which should be the payoff of the whole descent, looks like a cracked orange ball. The UI is clean and legible, but it looks like a dark-mode web dashboard laid over a pixel-art game.

| Scene | Shots | Awe (1-10) | Readability (1-10) |
|---|---|---|---|
| Town, noon | town-noon-720/1440, ui-r2-hint-720 | 6 | 8 |
| Town, sunset | town-sunset-720/1440 | 8 | 8 |
| Town, night | town-night-720/1440 | 6 | 7 |
| Topsoil | topsoil-720/1440 | 4 | 6 |
| Stone / old mines | stone-720/1440 | 5 | 4 |
| Crystal caves | crystal-720/1440 | 7 | 7 |
| Geode (crystal set piece) | geode-720/1440 | 5 | 6 |
| Fungal hollows | fungal-720/1440 | 6 | 5 |
| Magma, lava pool | magma-720/1440 | 6 | 5 |
| Magma, plain | magma-plain-720/1440 | 3 | 3 |
| Kiln (magma set piece) | kiln-720/1440 | 4 | 6 |
| Ancient ruins | ruins-720/1440 | 4 | 4 |
| Vault (ruins set piece) | vault-720/1440 | 6 | 6 |
| Core | core-720/1440 | 6 | 5 |
| Seed chamber | chamber-720/1440 | 6 | 7 |
| Shops (workshop, lab, launch, market, depot) | shop-*, ui-r2-workshop/lab, ui-qa1-* | 4 | 8 |
| Collection log | log-720/1440, ui-r2-log-720 | 3 | 7 |
| Title / intro | ui-r2-intro-720 | 3 | 8 |

## Findings, by impact

1. **Solid and empty are separated by hue, not by value or edge, so dug space disappears.**
   *magma-plain-720, magma-plain-1440, kiln-1440, stone-720, ruins-1440.* In magma-plain-720 the tunnel the pod sits in is a maroon only a few percent darker than the maroon scale-pattern rock around it; the empty pocket at right (x≈930-1120, y≈450-640) can only be told apart by its outline. In stone-720 the mine tunnels are dark slate against dark slate. Tiles have no top highlight, no edge outline and no shading where they meet air.
   *Fix:* set a value contract per biome: empty space at least 35-40% darker in luminance than the darkest diggable tile, with a near-black backdrop tinted to the biome. Autotile every solid/air boundary with a 1 px dark outline, a 1-2 px lit lip on top faces and a soft inner shadow on the air side. Check by desaturating each 720 shot: tunnels should still be obvious.

2. **The dark horizontal "plank" band is an ambiguous tile that shows up in every biome.**
   *topsoil-720 (rows at y≈200, 580), topsoil-1440, stone-1440, fungal-1440 (pod stands on one), magma-720/1440, kiln-1440.* It is a near-black block with horizontal streaks. It could be hard rock, timber, a shadow, or a background element. Nothing says whether the drill gets through it. The riveted navy blocks clearly mean "can't dig", so this third dark tile works against that signal.
   *Fix:* pick one meaning. If it is hard but diggable, give it the biome's palette plus visible cracks or strata and a tougher-looking highlight, never near-black. Keep near-black plus rivets for undiggable only. Undiggable should be the only tile type that is darker than empty space.

3. **Ores that share hue and value with their host rock.**
   *stone-720/1440 (brown iron ovals on dark slate), ruins-720/1440 (grey-green blob ore on olive-grey), core-720/1440 (the red rock already has red pips the size of a cinnabar pellet; at 720 you cannot tell the ore clusters at x≈330-420 from the rock texture), magma-plain-1440 (white-grey bone-like ore reads as cracks).* Ores that do work: topsoil copper and coal, crystal sapphire and emerald, geode amethyst, vault gold, magma cinnabar.
   *Fix:* every ore sprite gets a 1 px dark outline, a bright specular pixel and saturation clearly above the host tile. Rock textures may never use any ore's hue. In the core, make the red rock a desaturated oxblood with dark cracks and keep saturated red for ore only. A slow 1-frame glint every few seconds on valuable ores would help them read at a glance without adding effects.

4. **Magenta corner brackets look like a debug selection box.**
   *fungal-720 (around the two green spore blobs), magma-plain-1440, geode-1440, vault-1440 (around the yellow-green shards).* Whatever they mark (hazard? scanner hit?), a pink dashed reticle is the only thing in the game drawn like an editor overlay, and it is the most saturated colour on screen.
   *Fix:* if it marks a hazard, build the warning into the sprite: a pulsing warm rim, a small hazard glyph, particles that leak toward the pod. If it is a scanner highlight, use a soft biome-tinted pulse behind the ore, not a box in front of it.

5. **Background and effect layers are brighter than gameplay tiles.**
   *crystal-720 (the pale-blue crystal rim around the cavern is the brightest surface, brighter than the pod), fungal-1440 (bottom-left glowing teal caps are saturated, lit and in front), magma-720 (lava at the top bleeds behind the HUD and is the brightest thing in frame), core-1440 (white ore halos).* The brief says effects stay behind and dimmer. Here, decoration wins the eye.
   *Fix:* clamp all background and parallax layers to at most about 60% of the brightest gameplay tile. Glowing fungi in the background get bloom but low-value cores. Crystal rim tiles: drop them one value step and put the sparkle on edges, not on the whole surface. The pod should always own the top luminance band, with lava as the only exception (it is a hazard and should shout).

6. **Backdrops are flat vector silhouettes, not pixel art.**
   *crystal-720/1440 (stalactites are single-colour triangles), fungal-720/1440 (giant mushrooms are one flat teal cap and a flat stem), chamber-720/1440 (radial lines are plain strokes).* Next to the hand-pixelled terrain these look like placeholders and flatten the depth.
   *Fix:* two or three parallax planes per biome. Far plane: dithered silhouettes with atmospheric fade. Mid plane: rim-lit shapes with 2-3 tones and texture (gills under mushroom caps, facets and inner glow on crystals). Add slow drift so depth reads when the pod moves.

7. **The Seed is not awe-inspiring.**
   *chamber-720, chamber-1440.* It is a perfect circle with an orange Voronoi crack pattern, so it reads as a basketball or a cracked egg. It has no organic quality and no sense of being alive or enormous. At 720 its lower half is cut off by the frame. Nothing in core-720/1440 hints that it is near: no warm glow rising from below and no tendrils.
   *Fix:* make it a living thing. Use an irregular seed or bulb shape, a translucent shell with a slow inner pulse, and roots or tendrils that reach into the chamber walls and, earlier, into the core biome's tiles so they foreshadow it. Shafts of light should fall onto the pedestal, with motes drifting toward it. Frame it at 720 so the whole Seed fits with headroom. Make the chamber walls part of it (veins that light up in time with the pulse).

8. **Magma is a single maroon wash.**
   *magma-plain-720/1440, kiln-720/1440, magma-720.* Rock, tunnels and the kiln interior are all the same red-brown, and the hex-scale texture repeats everywhere. The lava in magma-720 has floating dark blobs that read as sunset clouds rather than a crust.
   *Fix:* use near-black basalt with glowing orange crack lines for rock, cooled grey-brown for softer tiles, and keep orange-white for lava only. Give lava a moving surface (a crust that drifts, bright seams, a heat-shimmer band above it), lava falls in big rooms, and ember particles behind the terrain.

9. **Ruins texture is olive noise, and the glyphs read as garbled UI text.**
   *ruins-720/1440, vault-720/1440.* The speckled mustard fill dominates and makes the biome look dirty rather than ancient. The green glyph rows ("|=H+ UHU=") use the same stroke weight and size as text, so at a glance they look like a broken label.
   *Fix:* make dressed stone blocks with mortar the dominant tile and put the noise texture on rubble only. Turn glyphs into carved, inset reliefs that glow faintly and pulse when the pod passes, at a different scale from any HUD text, laid out as friezes on walls rather than floating in the air.

10. **Tile patchwork without autotiling makes biomes look like quilts.**
    *stone-1440, geode-1440, core-1440, topsoil-1440.* Each tile variant is a hard-edged square, so variants form a checkerboard collage (stone-1440 is the worst case). Square stair-step cave outlines (crystal-1440, geode-1440) look like a grid, not a cave.
    *Fix:* use fewer variants, grouped into veins and strata that run across many tiles, with blend or transition tiles between types. Round off corners where air meets rock.

11. **UI is a different art style, and it doesn't scale at 1440.**
    *shop-lab-1440, shop-launch-1440, shop-workshop-1440, log-1440, ui-r2-intro-720.* The modals use a system sans font, flat navy panels and hairline borders. They are clean, but they are a web dashboard. At 1440 the modal keeps its 720 content size, so more than a third of the panel is empty below the content (log-1440, shop-launch-1440), and the HUD still shows the same currencies above the modal. The title card is a thin letter-spaced sans in a translucent grey box that overlaps the headframe, which is the most iconic sprite in the game.
    *Fix:* use a pixel display font for titles and headers (body text can stay sans for legibility), panel frames drawn in the world's language (riveted plate for Workshop, a lab bench for Lab), and hide the HUD while a modal is open. At 1440, scale the content up or grow the grids rather than leaving empty space. Replace the title box with a pixel-art logo: the word SEEDFALL with a falling seed glyph, placed over open sky and clear of the headframe, with no box behind it.

12. **The intro hint sits over the thing it points to.**
    *town-noon-720, town-sunset-720, town-night-720, ui-r2-hint-720.* The "<- to the mine shaft, then hold v to dig" box covers the top of the shaft at 720. At 1440 it sits at the bottom, which is fine.
    *Fix:* anchor it above the pod or in the sky band, and draw a small bouncing arrow at the shaft mouth.

13. **Night town: the ground stays lit like daytime.**
    *town-night-720/1440.* The sky is night, but the dirt has the same mid-brown value as at noon, so it looks like a cut-and-paste. Building lights cast no pools.
    *Fix:* apply a night multiply to the terrain and buildings, add warm light pools under lamps and windows, and add a faint moon rim on the headframe.

14. **Town composition: about 60% of the frame is empty sky.**
    *town-noon-1440, town-sunset-1440.* All the buildings sit on one line along the bottom third.
    *Fix:* add distant mesas or a mountain range with parallax, birds, and a slowly turning headframe wheel. Optionally put a hint of the Seed's glow on the horizon at night to set up the mystery.

15. **Set pieces are small, empty rooms.**
    *kiln-720/1440 (a large flat red void framed by tan brick), geode-720/1440 (a cramped 3x3 cavity).* A set piece should be a "whoa" moment, but these read as a box with one object in it.
    *Fix:* give the kiln a fire-lit interior: a glowing hearth, chains, soot gradients, heat shimmer. Make the geode bigger, lined with crystal facets that catch the pod's lamp and reflect it.

16. **Smaller UI defects.**
    *ui-qa1-market-720:* cut-off row fragments ("·") at the top of each price column. Fade or mask the scroll edge.
    *ui-qa1-depot-720:* the world behind the depot is blurry upscaled low-res squares. If that render path still exists, it is a bug.
    *log-720/1440:* every locked ore is the same mid-grey silhouette, so the grid looks lifeless. Tint locked silhouettes faintly with their biome colour, and show the ore's real colours once it has been seen.
    *shop-lab-720/1440:* researched and available nodes both have gold borders, so it is hard to tell done from buyable. Fill completed nodes and outline buyable ones.
    *HUD at 720:* the top-left stats panel covers about 40% of the width and 18% of the height. In magma-720 it hides ore and lava. Shrink it, or make it more transparent when something interesting is underneath.

## From good to breathtaking, per biome

- **Town:** parallax mountains, a turning headframe wheel, chimney smoke, light pools at night, and a tiny Seed glow on the horizon after dark. The sunset version is already the best frame in the game, so extend that palette to the other times of day.
- **Topsoil:** strata. Make visible horizontal soil layers that change colour with depth, with roots and pebbles at the top and darker clay below. Drop in buried relics (bones, an old cart) as rare decoration so the first descent tells a story.
- **Stone / old mines:** the lantern-lit tunnels in stone-1440 are the seed of something great. Make them warm islands in a cold blue-grey world: lantern light falls off onto the surrounding rock, timber supports cast shadows, there are dust motes in the light and occasional rails or collapsed carts.
- **Crystal caves:** keep the palette. Add light refraction (pod-lamp hits on crystals cast coloured flecks on nearby walls), real faceted crystal backdrops instead of triangles, and a slow sparkle on the edges of crystal tiles.
- **Fungal hollows:** bioluminescence is the hook. Gills and spots on the giant caps, spores drifting upward, soft glow pools on the floor under caps, mycelium threads running through the soil tiles, and caps that pulse slowly, staying dimmer than the pod.
- **Magma:** contrast. Black basalt, glowing seams, rivers and falls of moving lava, heat shimmer, embers. The frame should feel dangerous through value contrast, not through a red tint on everything.
- **Ancient ruins:** architecture. Dressed stone, pillars, broken arches in the mid plane, carved glyph friezes that answer the pod's lamp, and a cold teal light from deep below.
- **Core:** the Seed's presence. Veins or roots of the Seed run through the purple rock, pulse slowly and get brighter as you go deeper. Warm light should rise from below the frame. The red rock becomes dark flesh-like tissue, and ore stays the only saturated red.
- **Seed chamber:** see finding 7. Scale, an organic shape, a pulse, roots into the walls, and full framing at 720.

## What works: keep it

- **The pod.** The white 1 px outline makes it the first thing you see in every frame, on every biome background, at both sizes. Do not lose that outline in any future pod tier.
- **Riveted navy blocks for undiggable.** They are consistent and instantly understood. Keep them as the only near-black tile (see finding 2).
- **The headframe and the town at sunset** (town-sunset-1440). This is the frame that sells the game.
- **Stone mine tunnels with lanterns and timber** (stone-1440). Good storytelling and lighting.
- **Crystal caves palette and mood** (crystal-1440). The blue-violet world with emerald and sapphire ore reads well.
- **Vault electric arc** (vault-1440). A hazard that reads instantly as "don't touch", with its glow kept local.
- **Gold ore's warm light spill** (vault-720/1440). Valuable ore lighting its surroundings is exactly the right way to make value readable. Extend it to the top tier of ore in every biome.
- **The core's purple topographic stone** (core-1440). A distinctive texture that reads as deep and alien.
- **The lava pool hazard** (magma-1440). Its bright top line and glow make it unmistakable. It just needs a real surface.
- **UI information design.** The workshop list (current to next value, price chip, number keys), the market grid with ore icons, and the lab tree with labelled rows are clear and fast to scan. Restyle them; don't restructure them.
- **The right-edge depth strip** coloured by biome. Unobtrusive and informative.
