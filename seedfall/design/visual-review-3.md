# Seedfall: visual review 3

Fresh critic, screenshots only (`shots-tmp/gallery/*` plus 8 UI captures in `screenshots/`). Mid-air poses, depth numbers and pod tier are ignored.

## Verdict

The set pieces are good now: the Seed chamber, the kiln, the crystal geode ring, the fungal mushroom forest, the lava pool and the town at sunset all have real atmosphere. The **ordinary rock between them does not**, and the ordinary rock fills about 80% of play time. Three biomes (stone, magma, core) fail the glance test: at 720 you cannot tell dug tunnels from solid rock, or ore from decoration. The core, which should be the climax, is the weakest-looking deep biome. The UI is clean and consistent but plain.

| Scene | Awe | Readability | One-line reason |
|---|---|---|---|
| topsoil | 4 | 6 | Ores pop; the dirt is muddy noise, and undiggable blocks look like holes |
| stone (old mines) | 3 | 4 | Grey on grey; ore is nearly invisible at 720; the patchwork texture reads as a grid |
| crystal | 8 | 7 | Best biome; the pale crystal veins outshine the pod |
| geode | 6 | 5 | The amethyst ore and the undiggable plates sink into the navy rock |
| fungal | 8 | 6 | Gorgeous caps; green ore on green moss is low contrast |
| magma | 6 | 3 | The lava pool is great; the cracks shout louder than the ore; dug and solid look the same |
| magma-plain | 4 | 3 | A sea of near-black with orange scribbles; you cannot find the tunnel |
| kiln | 7 | 5 | Strong set piece; the surrounding magma inherits all of magma's problems |
| ruins | 5 | 6 | Moody arches; everything is the same desaturated olive |
| vault | 6 | 7 | Frame and loot read well; the ore looks like recoloured topsoil copper |
| core | 4 | 4 | Purple noise and tan root lines; no hint of the Seed; roots cross the pod |
| chamber (Seed) | 8 | 7 | The awe moment works; the room around it is empty brown haze |
| town noon | 7 | 9 | Charming and clear |
| town sunset | 8 | 9 | The best-looking frame in the set |
| town night | 7 | 8 | Lovely; the top-right HUD loses its panel background |
| title (intro / shop-launch-720) | 6 | 8 | Nice logo; a haze washes out the whole frame |
| workshop | 6 | 9 | Clear and well built; generic dark-dashboard look |
| lab | 6 | 8 | The tree reads; the gold frames are loud and every node is the same tile |
| launch site (1440) | 5 | 8 | Empty left column; the planet art is the only flavour |
| modules | 6 | 7 | Cards are fine; the last row is clipped with no scroll cue |
| collection log | 4 | 6 | 28 tiny glyphs, several reused shapes, no sense of treasure |
| depot hint / sealed (qa2) | 2 | 5 | The world behind is giant blurry placeholder squares |

## Findings, by impact

1. **Dug space and solid rock look alike in the dark biomes** (magma-720, magma-plain-720/1440, kiln-1440, stone-720/1440, core-720). Magma's solid rock is roughly #1a0d08 and its open tunnel is roughly #0d0605. At 720 you cannot see where you can fly. Fix: open space has to be the darkest value, with a clear lit rim on every solid edge. Lift solid magma rock 2 to 3 value steps, so it reads as a warm mid-dark brown. Draw a 1 px highlight on every face of solid rock that borders air, which magma currently has only on top faces. Add a faint cool back-wall tint to tunnels so empty never looks like rock. Do the same for stone and core.

2. **Decoration outshouts ore and hazard** (magma-*, kiln-*, core-*). The glowing orange crack lines in magma are the most saturated thing on screen apart from the lava. They share the lava's hue, so they read as "hot / dangerous" and drown the pale ore. The tan root lines in core are as bright as the ruby ore and cross the pod (core-1440, under the pod). Fix: drop the cracks to a dim ember tone, about 40% of their current brightness, and reserve full orange for lava and real heat hazards. Push the roots behind the tiles at about 30% opacity. Rule: decor never brighter than ore.

3. **Core does not feel like the climax** (core-720/1440 against chamber-*). The chamber is awe-inspiring. The biome that leads to it is purple static with dotted swirls, and nothing on screen says "something huge is alive below". Fix: make the roots *the Seed's*, thicker and fewer, with a slow travelling pulse of the Seed's amber light, all converging downward. Add a low warm under-glow that rises as you descend, and give the rock a fleshy/organic texture with fewer contour dots. The dotted outline pattern is currently the noisiest texture in the game; cut it by about 70%.

4. **Stone is the dullest stretch of the descent, and its ore is invisible** (stone-720: no ore readable at all; stone-1440: brown iron blobs at about 10% contrast). Fix: give stone ore a bright rim or highlight pixel and a saturated core hue that does not occur in the biome, and lift the mine lanterns' warm pools so the old-mines identity carries. The rectangular texture-variant patches (stone-1440, centre and lower half) read as a quilt grid. Blend the variants per pixel, or use larger and more organic regions.

5. **The undiggable block is one riveted slate tile in every biome, and it vanishes where the rock is blue or purple** (geode-720 lower left, crystal-1440 right edge, core-720 left, ruins-1440 everywhere). In topsoil-720 the same near-black block looks like a dug hole. Fix: keep one shape language, which is good, but give it a constant high-contrast cue that survives every palette. For example: a light bevelled top edge, corner bolts in a fixed steel-white, and a value always 2 steps darker than the surrounding rock and never equal to air. Magma uses different purple stacked pillars (magma-*), so either unify those or make them carry the same bolts.

6. **Ore sinks into same-hue rock** (fungal-720/1440: green ore on green-speckled moss; geode-720/1440: purple amethyst on navy; crystal-720: blue sapphire on blue). Fix: give each ore a 1 px dark outline plus one near-white specular pixel, and pick ore hues complementary to the host rock. The crystal and vault ores already do this partly, which is why they read.

7. **Bright terrain and effects compete with the pod** (crystal-720/1440: pale cyan crystal vein column plus a white sparkle directly under the pod; chamber-*: the pod's dark body sits on the Seed's brightest area; fungal: the caps are brighter than the pod). The pod is a dark grey body with a thin white outline. That works on dark rock and loses on bright tiles. Fix: dim the crystal-vein tile about 25% and cap effect brightness below the pod's highlight. Give the pod a guaranteed bright accent, such as a lit cockpit glass or a warm headlamp cone, so it is the highest-contrast object in every frame.

8. **The qa2 captures show a placeholder renderer** (ui-qa2-depot-hint-720, ui-qa2-sealed-720). The world draws as huge blurry brown squares with tiny ore dashes, and the pod is a flat yellow box. If these are only stale captures, re-shoot them. If any code path (a texture load failure, the first frame, a zoom level) can still show this, it is the worst frame in the game. Fix: re-capture, and make that fallback impossible.

9. **Topsoil, the first impression underground, is muddy** (topsoil-720/1440). The brown base carries dithered tan/grey blobs that read as checkerboard static at 720, and the dirt has no layering. Fix: fewer, larger strata bands with clean value steps. Limit dither to 1-tile transitions. Add small surface-life details (roots, pebbles, worm tracks) at low contrast.

10. **The collection log feels like a spreadsheet** (log-720/1440). The glyphs are about 12 px inside 80 px tiles, and shapes repeat across biomes: stripe, ring, diamond and oval each appear 3 to 4 times, separated only by tint. Unfound items are dim, so the page is 28 grey-ish squares. Fix: show each ore at 2 to 3 times the size, use the in-world sprite (the topsoil copper slashes in the world do not match the log glyph), and silhouette unfound items as black shapes with a glint. Distinct silhouettes per ore matter more than tint.

11. **The title and town washes** (ui-r3-intro-720, shop-launch-720). A pale haze sits over the whole title frame, which flattens the logo and the town. The logo's seed is a square in one capture and a round glowing seed in the other. Fix: drop the haze, or keep it only behind the logo, and settle on the round glowing seed. Also, the `shop-launch-720` gallery shot is the title screen, not the launch site: the staging is wrong.

12. **Small UI inconsistencies.** town-night drops the dark panel behind the top-right counters. modules-720 clips the third row of cards with no fade or scroll arrow. The lab's gold node frames are louder than the selected-node highlight, so selection is not obvious (lab-720: the selected Geology 1 differs only by a thicker frame). The minimap at 1440 shows only a grey disc with a dot, which tells you nothing. Either show tiles in it or remove it.

## What works

- **Set pieces**: the Seed chamber (veined glowing egg, root tendrils, pedestal), the kiln (brick dome lit from the hearth), the crystal geode ring and the lava pool with floating rock and glowing crust are the "awe" the brief asks for. Build more of these, and build the moments that lead into them.
- **Fungal** has a real identity: glowing caps, lilac stems, depth layers of silhouetted giant mushrooms behind.
- **Town at every time of day** is charming, clear and well composed. The sunset palette is the best frame in the set.
- **Biome palettes are distinct**: brown, grey, blue, green, red, olive, purple. You always know where you are.
- **The pod outline** keeps it findable on dark rock, and its silhouette is consistent.
- **HUD** is compact, uses stable corners and has legible numbers. The depth strip on the right is a nice touch.
- **Shop UI**: hotkey hints, now/next panel and clear price chips. The workshop is the most readable screen in the game.
