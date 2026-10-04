# pal-games

The games of [pal](https://github.com/zcag/pal), the keyboard launcher for
macOS and Linux. Each one is a pal extension: it opens in pal's panel from
a search or its hotkey, keeps its game across restarts, syncs to every
machine you sign in on, and posts to leaderboards. Most can also be played
in a browser at play.cagdas.io. In pal they live on the **Games** shelf
(the `games` extension in [pal-extensions](https://github.com/zcag/pal-extensions)),
which installs them from pal's registry; none comes built into the app.

**Who made them.** These games are almost entirely written by Claude, with
a person deciding what to make, playing them, and saying what feels off.
Most are reworks or clones of classic games, and the list below names the
original each one follows. None is affiliated with the originals' makers.

## The games

| Game | What it is | Play in a browser |
| --- | --- | --- |
| [Snake II](snake/) | The Snake II of the Nokia 3310, read off the phone's real firmware (6.07) in an emulator: its 84×48 screen, menus, nine levels, five mazes and buzzer, checked frame by frame against 123 recorded runs. | [play.cagdas.io/snake](https://play.cagdas.io/snake) |
| [Minesweeper](minesweeper/) | Minesweeper as Windows shipped it, played with the mouse or one-handed on the arrows; best times per size. | [play.cagdas.io/minesweeper](https://play.cagdas.io/minesweeper) |
| [Solitaire](solitaire/) | Klondike solitaire, the one Windows Solitaire made famous: draw one or three, undo, drag or play from the keys. | [play.cagdas.io/solitaire](https://play.cagdas.io/solitaire) |
| [Blackjack](blackjack/) | The casino card game on felt, with a real shoe, against the dealer; the bankroll persists. | [play.cagdas.io/blackjack](https://play.cagdas.io/blackjack) |
| [Yahtzee](yahtzee/) | Solo Yahtzee, the dice game: thirteen rounds, three rolls each, the card showing what every category would score. | [play.cagdas.io/yahtzee](https://play.cagdas.io/yahtzee) |
| [2048](2048/) | Gabriele Cirulli's sliding-tile game, keyboard only. | in pal |
| [Wordle](wordle/) | Josh Wardle's five-letter word game: a daily puzzle, the same everywhere, then practice words. | in pal |
| [Sudoku](sudoku/) | The number puzzle, generated on your machine: a daily puzzle in four difficulties, notes, and hints that explain in plain words. | in pal |
| [Crossword](crossword/) | Daily crosswords: Crosshare's English minis, in the manner of the NYT Mini, and the Turkish papers' kare bulmaca (HaberTürk, Cumhuriyet, Sabah). | in pal |
| [Typing](typing/) | A typing test in the manner of monkeytype: timed or word-count tests, wpm, accuracy, consistency and personal bests. | [play.cagdas.io/typing](https://play.cagdas.io/typing) |
| [Vortex](vortex/) | In the manner of Terry Cavanagh's Super Hexagon: turn round the centre and slip through walls closing in on the beat, six stages to their own songs. | [play.cagdas.io/vortex](https://play.cagdas.io/vortex) |
| [Highway](highway/) | A traffic racer after SK Games' Traffic Racer: weave through highway traffic in 3D, near misses and nitro, a garage of seventeen cars. | [play.cagdas.io/highway](https://play.cagdas.io/highway) |
| [Night Parade](night-parade/) | A survivors game, the genre Vampire Survivors started, set in Japanese folklore's Night Parade of One Hundred Demons: six heroes, evolving weapons, a fifteen-minute night. | [play.cagdas.io/night-parade](https://play.cagdas.io/night-parade) |

Each game's own README says how it plays and how it is built; Vortex,
Highway and Night Parade have a DESIGN.md with the reasons behind
the rules and the numbers. The art and sound that are not drawn in code
come from free packs (Kenney's cards, the Ninja Adventure pack, CC0
recordings), credited in the game's README beside the files.

## Running one

pal loads games like any extension. With pal installed, open the Games
shelf (or search for the game) and install it from pal's registry. To run
your working copy instead, add this checkout to `extension_dirs` in pal's
config.toml ([docs/config.md](https://github.com/zcag/pal/blob/main/docs/config.md));
a debug build of pal reads `../pal-games` beside its checkout by itself.

A game with a page of its own (a `surface/`) also runs in a plain browser,
with the kit's stand-in for pal:

```sh
bun .pal/host/src/surface.ts snake    # then open http://<host>:<port>/surface/index.html
```

## Testing

Everything is tested against a checkout of pal in `.pal/`: its SDK, its
extension host and test harness, its gallery.

```sh
git clone https://github.com/zcag/pal ../pal   # once, beside this repo (or clone it into .pal)
make test                                      # typechecks, pal's contract tests over the games, every game's tests
make test NAMES="snake wordle"                 # pal's contract tests and those games' tests
make shots EXT=snake                           # the store screenshots, both themes
```

`make setup` (run by both) links `../pal` as `.pal`, installs pal's
dependencies there and each game's own. The tests run through pal's host on
a fake clock and in parallel, under a time budget; pal's
[host/test/README.md](https://github.com/zcag/pal/blob/main/host/test/README.md)
has the rules a test keeps. CI runs `make test` on macOS and Linux against
pal's main on every push.

## How a change reaches players

1. A push to main whose tests pass builds every game whose package changed
   (`pal-pack`, from the pal checkout the tests ran against), uploads it to
   pal.cagdas.io and hands it to pal's registry signer
   (`.github/workflows/ci.yml`, `publish`).
2. pal's `extensions.yml` builds it again from this commit, checks it is
   the same package, signs it and adds it to the **edge** index.
3. `make ext-release NAMES="snake"` in pal promotes it to **stable**, the
   index every pal follows, and every app release promotes everything on
   edge. Installed games update themselves within hours.

Send changes here as pull requests; a commit subject is
`<game>: what changed`, which is what the store's notes on each build
read. A change that needs something new in the SDK or the kit goes to
[zcag/pal](https://github.com/zcag/pal) first.

## Accounts, sync and leaderboards

Signed in to pal, a game's saved state follows the player to every
machine, and its scores go to leaderboards. A game declares both in its
`pal.json`:

- **`sync`**: a merge rule for every storage key it writes (the newest
  wins, a best is the max, a record keeps its rows, and so on), so two
  machines that both played combine instead of one overwriting the other.
  pal's tests fail a game that writes a key without a rule.
- **`leaderboards`**: the boards it posts to, each with its order and how
  a value reads; the server takes a score only for a declared board.

pal's docs have the whole of it:
[Syncing storage](https://github.com/zcag/pal/blob/main/docs/extensions.md#syncing-storage),
[Leaderboards](https://github.com/zcag/pal/blob/main/docs/extensions.md#leaderboards),
[accounts](https://github.com/zcag/pal/blob/main/docs/accounts.md), and the
design with the merge rules,
[design/accounts.md](https://github.com/zcag/pal/blob/main/docs/design/accounts.md).
Writing a game: [docs/extensions.md](https://github.com/zcag/pal/blob/main/docs/extensions.md)
(the SDK and the manifest) and
[design/game-surface.md](https://github.com/zcag/pal/blob/main/docs/design/game-surface.md)
(a game's page and the kit).

## License

MIT, as pal. Each game's README names the licenses of the art and sound
it ships.
