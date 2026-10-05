# Ramparts: shared brief (lead's baseline; every designer reads this first)

A standalone browser **tower defense roguelike**: Kingdom Rush's tower feel (fixed build pads,
barracks soldiers that block, radial build menu, levels then a branching specialisation, commander
spells, a next-wave skull you can call early) inside a Slay-the-Spire run (branching act maps,
drafting, relics, shops, events, ascensions). The user wants it "top notch", awe-inspiring to look
at, superbly juicy and super addictive. Plain, quiet words in all UI text, no jargon.

## Hard constraints
- Static page, TypeScript, bun + Vite, three.js (lit low-poly 3D diorama). Builds to ONE self-contained HTML file.
- Pure rules in `game/` (deterministic, seeded, fixed 30 Hz step, no DOM), drawing/UI in `surface/`.
  The sim emits events (hit, kill, leak, build, shoot, freeze, boss ability...) the surface turns into FX/sound.
- Persistence through one tiny storage wrapper (localStorage). Later ported into a host app as a "surface" game.
- Must play well in a **720x390** panel and scale to **1440x900**. Mouse-first with full keyboard hotkeys:
  1-6 build/choose tower, Space next wave / call early, P/Esc pause, F speed 1x/2x/3x, Q/W commander spells,
  U upgrade, X sell, arrows/Tab move between pads, Enter confirm.
- All audio synthesised (WebAudio); adaptive music by wave pressure. No copyrighted assets. OFL fonts only (Cinzel, Nunito Sans installed).
- **Readability first** (a firm user rule): enemies, the path, towers, ranges and projectiles read at a glance on a calm
  background; effects stay behind and dimmer. Squint test at 720x390.
- Balance verified by a headless bot over `game/`: first run usually dies in act 1-2, a decent player wins around run 3-8,
  ascensions ramp, no dominant tower or relic, no dead picks. Run length 30-45 min.

## Baseline decisions (designers may refine, must justify changes)
- **Fixed pads**, not a grid: KR feel, big click targets at 720x390, no maze-degeneracy, the generator puts pads at
  bends so *which pad* is a real choice, adjacency matters for support auras. 9-14 pads per map; a relic can add pads.
- **Run**: 3 acts (Meadow -> Desert ruins -> Frozen peaks), each a branching map of ~6 floors ending in a boss,
  then a short act 4 (Volcanic citadel) with the final boss. Nodes: battle, elite, shop, event, forge, rest, boss.
  ~13 battles per run, battles ~2-3 min at 1x (8-12 waves). Each battle is a fresh generated map; towers are rebuilt
  each battle, what persists is the run's **war table** (tower blueprints owned, max 6 = keys 1-6), **boons**
  (per-tower run upgrades, like StS card upgrades), **relics**, **lives** and **crowns**.
- **Lives** are run HP (start 20): a leak costs 1-3 (bosses 10). 0 = run over. Rest nodes heal.
- **Two currencies**: battle **gold** (resets each battle; kills, wave income, call-early bonus, interest on banked gold
  at each wave start, capped) and run **crowns** (shops/events; earned per battle, bonus for no leaks, part of leftover gold).
- **Rewards**: battle -> pick 1 of 3 (new tower / boon / rarely relic) + crowns; elite -> relic pick + card;
  boss -> rare relic pick + heal + card.
- **Towers (12)**, each L1->L2->L3 for gold in battle, then a specialisation A or B (4th purchase):
  Archer (phys, air+ground; Marksmen / Volley), Barracks (blocking soldiers; Paladins / Blademasters),
  Mage (magic; Arcanist chains / Hexer +damage taken), Bombard (phys splash, ground only; Mortar / Shrapnel shred),
  Frost Spire (chill -> freeze; Glacier nova / Shatter: frozen take more phys + shatter burst),
  Alchemist (oil puddles slow+oiled, ground; Acid shred / Naphtha explosive oil), Pyre (flame cone, burn, ignites oil;
  Inferno / Firestorm), Storm Spire (chain lightning, x3 vs shields; Tempest / Overload stun), Beacon (support:
  reveals stealth, marks; Lighthouse aura / Hunter's Mark), War Banner (support: attack-speed aura; War Drums / Treasury),
  Ballista (long range armour pierce; Harpoon pull / Siege bolt pierce line), Thornwood Grove (roots + thorns aura;
  Bramble / Ancient Treant guardian).
- **Synergies**: frost + shatter + physical; oil + fire; beacon marks + crits; hex + everything; blockers holding enemies
  in splash/flame; banner aura positioning; shred + physical; storm vs shields and conductive chill.
- **Damage types**: physical (armour), magic (ward), fire (burn), pure. Statuses: slow, chill->frozen, burn, oiled,
  marked, hexed, shred, stun, revealed, shield.
- **Enemy roles** (silhouette = role across all acts, tint/name per act): footman, runner, brute (armoured),
  warded acolyte (magic resist), shieldbearer (shields allies), shaman (heals), splitter (slime), shade (stealth),
  swarmling, sapper (disables a tower), bat (flyer swarm), drake (big flyer), elites (juggernaut unblockable,
  warlock summoner, matron), 4 bosses with telegraphed mechanics: Gorrak the Warlord (war cry, summons),
  the Sand Wyrm (burrows), the Frost Colossus (stomp freezes towers), the Ember Tyrant (phases, takes wing).
- **Commanders** (meta unlock): starting towers + 2 spells (Q/W). Marshal (start), Alchemist, Seer, Quartermaster.
- **Meta**: renown per run unlocks towers (6 at start), relics, commanders, events and small permanent perks;
  ascensions 1-10 by winning; a codex of everything met.

## Files
Design docs go in `design/<topic>.md` (each designer owns exactly one file). The lead merges them into `DESIGN.md`.
Numbers will live in `game/content.ts` later; the content tables in `design/content.md` are their source.
