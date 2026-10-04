# pal-games: working rules

pal's games. The launcher, the SDK, the extension host, its test harness,
the gallery and the screenshot tools are pal's (zcag/pal); everything here
is tested and built against a pal checkout in `.pal/` (`make setup` links
`../pal` there; CI clones zcag/pal at main).

Read pal's docs before changing an area: `.pal/docs/extensions.md` (the
SDK and the manifest; "Syncing storage" and "Leaderboards"),
`.pal/docs/design/game-surface.md` (a game's page and the kit),
`.pal/docs/design/accounts.md` (sync and boards on the server),
`.pal/docs/registry.md` (packages, the index, how a build is published),
`.pal/docs/design/screenshots.md` and `.pal/host/test/README.md` (the test
rules: the fake clock, `writeTool`, the time budget). A game's own README
and DESIGN.md say how it plays and why.

## Layout

- `<name>/`: one game each (`pal.json`, `index.ts`, its `surface/` page,
  `fixture.ts` for its store screenshots).
- `test/`: the tests (`<name>.test.ts`, `<name>-*.test.ts`) and their
  mocks and fixtures; `test/shots/` the screenshot fixtures
  (`<name>.json`, `bar-<name>.json`) the fixtures write and pal's gallery
  reads; `test/game-accounts.ts` the games' shared check of `sync` and
  `leaderboards`.
- `registry-only.txt`: every game, since none comes with the app (pal's
  `app/bundled.txt` decides that). A new game is added here in the same
  change; a test fails otherwise.

## Principles

- Quiet, plain words over jargon; animations are fine, never add
  `prefers-reduced-motion` handling.
- `make test` before every push: it is what CI runs (on macOS and Linux),
  against pal's main, and a green run is what gets a commit published. `NAMES="snake"` narrows it to one game's tests while
  working; the push still needs the whole run.
- Commit subjects are `<name>: what changed`, one game a commit where you
  can: the store's per-build notes and pal-site's game pages read them.
- Design feel and progression yourself: measure and simulate end to end
  (the games' bots and sims), never hand the tuning to a playtester.
- Every storage key a game writes has a `sync` rule and every board it
  posts to is declared (pal's host/test/sync-declared.test.ts and
  `test/game-accounts.ts` check both).

## How a change reaches players

- A green push to main is published by pal's registry, which polls this
  repo: within about 15 minutes (or at once, run with `publish` in pal's
  Actions) its `extensions.yml` sees the commit, checks that this repo's CI
  run on it is green, builds every game at that commit itself and signs
  and publishes the changed ones to the **edge** index. A main whose CI is
  pending or red is not published. This repo's CI only tests, and nothing
  here holds a secret: never add one. Push game changes straight to
  edge; they are tried there.
- Players follow **stable**: `make ext-release NAMES="..."` in pal
  promotes edge's newest builds, and every app release promotes everything
  on edge. Promoting is a release decision, made after the change
  was tried. Auto-update is on by default, so a promoted build reaches
  everyone within hours; a bad one is pulled with pal's `yank` dispatch
  input (`.pal/docs/releasing.md`).
- **Compatibility.** A package is built with pal's main and stamped with
  its `PROTOCOL` (`.pal/sdk/src/protocol.ts`). A game that uses something
  new in the SDK or the kit needs it on pal's main first; the build is not
  offered to an app older than that.
- **Identity.** A build is its tree hash, ordered by its commit's time; the
  manifest's `version` is for humans only.
- A game with `store.play` is also played in a browser at
  `play.cagdas.io/<name>` (pal-site serves it).

## Shipping a game change

Beyond the code, unasked:
- its `pal.json` store block (tagline, description, features: plain,
  specific) and palette `title`s (registry listings and root search match
  on them; a test requires them);
- its icon: pal's glyph tiles (a product's real logo only for an
  extension that is that product);
- store screenshots (`<name>/fixture.ts`, `make shots EXT=<name>`, look at
  every PNG in both themes), committing the regenerated `test/shots/*.json`
  with them;
- the Games shelf (`games` in zcag/pal-extensions) keeps copies of some
  games' manifests for its tests (`test/games-shelf/`): copy one again when
  a shelf test needs what changed;
- pal-site: its `scripts/subset-font.py` when a manifest gains a Nerd
  glyph, then its `./deploy.sh`; the landing's hand-picked lists when the
  game deserves a slot.

## Usage data

pal's `docs/usage.md` is a promise: anonymous, first-party only, off with
one switch. A game counts nothing of its own; anything new pal counts is
listed there in the same change.
