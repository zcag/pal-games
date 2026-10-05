// The live world: tile edits with dirty tracking, loose tiles that wobble and fall, timber cave-ins, lava flow and
// crust, gas fuses and blasts, spore vents, arc pylons, false floors, the core pulse, nugget piles, the crate,
// caches, the Lift column, the scanner and map memory. Pure rules: time comes in through step(dt).
import { W, H, FLAG, HAZ, type WorldData, type Entity, type EntityKind } from "./types.ts";
import { hash } from "./rng.ts";
import { MAT, MATERIALS, FINDS, LIFT_X, CHAMBER, piecesPerTile, tileHardness, findById } from "./content/world.ts";
import type { Game } from "./game.ts";

export const I = (x: number, y: number) => y * W + x;
export const inb = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H;

/** An entity with the rules' extra fields (count of a pile, a crate's cargo, a wobbling tile's index). */
export interface Ent extends Entity {
  /** Pieces in a nugget pile. */
  n?: number;
  /** A crate's contents: find id -> pieces, and ingots. */
  cargo?: Record<number, number>;
  ingots?: Record<number, number>;
  /** A wobbling loose tile's index (-1 once it falls). */
  i?: number;
  /** A placed charge's item: dynamite or charge. */
  item?: string;
}

/** Wobble before a loose tile falls (core-loop: boulders 0.6 s; sand slides sooner). */
const WOBBLE = { boulder: 0.6, sand: 0.3, rubble: 0 };
const GRAV = 16, FALL_CAP = 12;
const LAVA_DOWN = 0.5, LAVA_SIDE = 1.5, LAVA_CRUST = 15, LAVA_MIN = 32;
const VENT_PERIOD = [6, 12], VENT_TELL = 1, CLOUD_LIFE = 5, CLOUD_R = 2, CLOUD_RISE = 0.5;
const ARC_PERIOD = 4, ARC_CHARGE = 0.4, ARC_FIRE = 1;
const GEYSER_PERIOD = 8, GEYSER_TELL = 1, GEYSER_FIRE = 1.5;
const FLOOR_DELAY = 0.8, TIMBER_DELAY = 1;
export const PULSE_PERIOD = 10, PULSE_SPEED = 40, PULSE_HEAT = 1.5;
/** Rows around the pod in which timed hazards tell and act (they are time-based, so nothing is lost off screen). */
const NEAR = 30;

export const isLoose = (m: number) => MATERIALS[m]?.kind === "loose";
const isBoulder = (m: number) => isLoose(m) && m !== MAT.SAND;

export interface Pylon { a: number; b: number; tiles: number[]; phase: number }

export class Live {
  w: WorldData;
  ents: Ent[] = [];
  nextId = 1;
  /** Gas fuses: tile, seconds left. */
  fuses: { i: number; t: number }[] = [];
  /** Timber cave-ins: the tiles that will collapse, seconds left. */
  timbers: { tiles: number[]; t: number }[] = [];
  /** False floors that were stepped on: tile, seconds left. */
  floors: { i: number; t: number }[] = [];
  /** Lava that may move, in a stable order; its move timers; flowed tiles and when they last changed. */
  lavaActive = new Set<number>();
  lavaT = new Map<number, number>();
  flowed = new Map<number, number>();
  /** Recently traced or scanned tiles that stay bright on screen until a time. */
  reveals: { tiles: number[]; until: number }[] = [];
  vents: number[] = [];
  geysers: number[] = [];
  pylons: Pylon[] = [];
  private dmark: Uint8Array;
  private dlist: number[] = [];

  constructor(w: WorldData) {
    this.w = w;
    this.dmark = new Uint8Array(W * H);
    this.index();
  }

  /** Lists of timed hazards (vents, pylon pairs), rebuilt from the tiles. */
  index() {
    const { mat, haz } = this.w;
    this.vents = [];
    this.geysers = [];
    this.pylons = [];
    const used = new Set<number>();
    for (let i = 0; i < W * H; i++) {
      if (haz[i] === HAZ.SPORE_VENT) this.vents.push(i);
      if (mat[i] === MAT.GEYSER) this.geysers.push(i);
      if (mat[i] !== MAT.PYLON || used.has(i)) continue;
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const tiles: number[] = [];
        let found = -1;
        for (let k = 1; k <= 7; k++) {
          const xx = x + dx * k, yy = y + dy * k;
          if (!inb(xx, yy)) break;
          const j = I(xx, yy);
          if (mat[j] === MAT.PYLON) { found = j; break; }
          tiles.push(j);
        }
        if (found >= 0 && tiles.length && !used.has(found)) {
          used.add(i); used.add(found);
          this.pylons.push({ a: i, b: found, tiles, phase: hash(x, y, this.w.seed, 7) * ARC_PERIOD });
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------- tiles

  mat(x: number, y: number) { return inb(x, y) ? this.w.mat[I(x, y)] : MAT.BEDROCK; }
  /** Solid for the pod: out of bounds sideways and below is solid, the sky is open. */
  solid(x: number, y: number) {
    if (x < 0 || x >= W || y >= H) return true;
    if (y < 0) return false;
    const m = this.w.mat[I(x, y)];
    return m !== 0 && MATERIALS[m].kind !== "liquid";
  }
  lava(x: number, y: number) { return inb(x, y) && this.w.mat[I(x, y)] === MAT.LAVA; }
  dirty(i: number) { if (!this.dmark[i]) { this.dmark[i] = 1; this.dlist.push(i); } }
  takeDirty(): number[] {
    const out = this.dlist;
    this.dlist = [];
    for (const i of out) this.dmark[i] = 0;
    return out;
  }
  setFlag(i: number, f: number) { if ((this.w.flag[i] & f) !== f) { this.w.flag[i] |= f; this.dirty(i); } }

  /** Hardness of a tile for the drill and blasts (vault seals drop to 25 with the door-key, D9). */
  hardness(i: number, key: boolean) {
    const m = this.w.mat[i];
    if (m === MAT.VAULT_SEAL && key) return 25;
    return tileHardness(m, this.w.find[i]);
  }

  /** Remove a solid tile: it becomes air with its old material as the back wall. Returns what was there. */
  clear(g: Game, i: number, flag: number = FLAG.DUG) {
    const w = this.w;
    const was = { mat: w.mat[i], find: w.find[i], haz: w.haz[i] };
    if (w.mat[i] !== 0 && MATERIALS[w.mat[i]].kind !== "liquid") w.back[i] = w.mat[i];
    w.mat[i] = 0; w.find[i] = 0; w.haz[i] = 0; w.fluid[i] = 0; w.flag[i] = (w.flag[i] & ~FLAG.RICH) | flag;
    this.dirty(i);
    this.fuses = this.fuses.filter((f) => f.i !== i);
    this.lavaActive.delete(i); this.lavaT.delete(i); this.flowed.delete(i);
    this.opened(g, i);
    return was;
  }

  /** A tile just opened: wake loose tiles and lava around it. */
  opened(g: Game, i: number) {
    const x = i % W, y = (i / W) | 0;
    if (y > 0) {
      const up = i - W;
      if (isLoose(this.w.mat[up])) this.loosen(g, up);
      if (this.w.mat[up] === MAT.LAVA) this.wake(up);
    }
    if (x > 0 && this.w.mat[i - 1] === MAT.LAVA) this.wake(i - 1);
    if (x < W - 1 && this.w.mat[i + 1] === MAT.LAVA) this.wake(i + 1);
    // nugget piles and the crate resting on this tile fall to the next floor
    if (y > 0) for (const e of [...this.ents]) if (Math.floor(e.x) === x && Math.floor(e.y) === y - 1) {
      if (e.kind === "nugget") this.settlePile(e);
      else if (e.kind === "crate") this.settle(e);
    }
  }

  /** A loose tile lost its support: it wobbles, then falls (core-loop "Loose boulder / cave-in"). */
  loosen(g: Game, i: number) {
    if (this.ents.some((e) => e.kind === "boulder" && e.i === i)) return;
    const m = this.w.mat[i], x = i % W, y = (i / W) | 0;
    const t = m === MAT.SAND ? WOBBLE.sand : WOBBLE.boulder;
    this.ents.push({ id: this.nextId++, kind: "boulder", x: x + 0.5, y: y + 0.5, vy: 0, mat: m, t, i });
    g.emit({ t: "wobble", x, y, mat: m });
  }

  wake(i: number) { if (this.w.mat[i] === MAT.LAVA) this.lavaActive.add(i); }

  // ---------------------------------------------------------------- entities

  add(kind: EntityKind, x: number, y: number, extra: Partial<Ent> = {}): Ent {
    const e: Ent = { id: this.nextId++, kind, x, y, ...extra };
    this.ents.push(e);
    return e;
  }
  remove(e: Ent) { const k = this.ents.indexOf(e); if (k >= 0) this.ents.splice(k, 1); }

  /** Drop loose pieces at a tile: one pile per find per tile, on the tile's floor. */
  drop(tx: number, ty: number, find: number, n: number) {
    if (n <= 0) return;
    let y = ty;
    while (y + 1 < H && !this.solid(tx, y + 1)) y++;
    const pile = this.ents.find((e) => e.kind === "nugget" && e.find === find && Math.floor(e.x) === tx && Math.floor(e.y) === y);
    if (pile) pile.n = (pile.n ?? 0) + n;
    else this.add("nugget", tx + 0.5, y + 0.8, { find, n });
  }
  /** A crate drops to the floor below it (QA Q26: crates fall like nuggets). */
  settle(e: Ent) {
    const tx = Math.floor(e.x);
    let y = Math.max(0, Math.floor(e.y));
    while (y + 1 < H && !this.solid(tx, y + 1)) y++;
    e.y = y + 0.5;
  }
  /** Town ground (QA Q20): the depot forecourt's row-0 tiles and the mine mouth's lining can't be dug or blasted. */
  townGround(i: number) {
    const x = i % W, y = (i / W) | 0, sx = this.w.spawnX;
    return (y === 0 && x >= sx - 1 && x <= sx + 6 && x !== sx) || (y <= 3 && Math.abs(x - sx) === 1);
  }
  private settlePile(e: Ent) {
    const tx = Math.floor(e.x);
    let y = Math.floor(e.y);
    while (y + 1 < H && !this.solid(tx, y + 1)) y++;
    e.y = y + 0.8;
    const other = this.ents.find((o) => o !== e && o.kind === "nugget" && o.find === e.find && Math.floor(o.x) === tx && Math.floor(o.y) === y);
    if (other) { other.n = (other.n ?? 0) + (e.n ?? 0); this.remove(e); }
  }

  // ---------------------------------------------------------------- blasts (gas, dynamite, big charge)

  /** Clear tiles within r whose hardness is at most hcap; ore drops as loose pieces; gas in range is lit. */
  explode(g: Game, cx: number, cy: number, r: number, kind: "gas" | "dynamite" | "charge", hcap: number) {
    // blasts are tile-centred: dynamite's radius 1 is a 3x3, a big charge's 2.5 is 21 tiles, gas's 2 is 13
    const tx = Math.floor(cx), ty = Math.floor(cy), reach = kind === "dynamite" ? 2 : r * r, R = Math.ceil(r);
    cx = tx + 0.5; cy = ty + 0.5;
    g.emit({ t: "explode", x: cx, y: cy, r, kind });
    const w = this.w, key = g.hasKey();
    let cleared = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = tx + dx, y = ty + dy;
      if (dx * dx + dy * dy > reach || x < 1 || x > W - 2 || y < 0 || y >= H) continue;
      const i = I(x, y), m = w.mat[i];
      if (w.flag[i] & FLAG.LIFT || this.townGround(i)) continue; // the casing: blasts never pass the Lift (core-loop)
      if (m === 0 || MATERIALS[m].kind === "liquid" || MATERIALS[m].kind === "unbreakable" || m === MAT.VAULT_SEAL) continue;
      const own = kind === "gas" && dx === 0 && dy === 0;
      if (w.haz[i] === HAZ.GAS && !own) { this.light(g, i, 0.25); continue; }
      if (!own && this.hardness(i, key) > hcap) continue;
      const was = this.clear(g, i);
      cleared++;
      g.emit({ t: "break", x, y, mat: was.mat, find: was.find, by: "blast" });
      this.spill(g, i, was.mat, was.find);
    }
    if (kind !== "gas") g.s.stats.blastTiles += cleared;
    g.blastPod(cx, cy, kind);
  }

  /** What a tile held goes loose (a blast or a falling crush): ore pieces, a jackpot, an artifact, a cache's contents. */
  spill(g: Game, i: number, mat: number, find: number) {
    const x = i % W, y = (i / W) | 0;
    if (find) {
      const f = FINDS[find];
      this.drop(x, y, find, f.kind === "ore" ? piecesPerTile(this.w.biome[i]) : 1);
    }
    if (MATERIALS[mat]?.cache) g.openCache(i, x, y, false);
    if (mat === MAT.TIMBER) this.timberCollapse(g, i);
  }

  /** Light a gas tile (drilling it, or a blast in range). */
  light(g: Game, i: number, fuse: number) {
    if (this.fuses.some((f) => f.i === i)) return;
    this.fuses.push({ i, t: fuse });
    g.emit({ t: "gas_fuse", x: i % W, y: (i / W) | 0 });
  }

  // ---------------------------------------------------------------- timber posts (world.md: the 2 tiles above collapse after 1 s)

  timberCollapse(g: Game, i: number) {
    const tiles: number[] = [];
    for (let k = 1; k <= 2; k++) {
      const j = i - k * W;
      if (j < 0) break;
      const m = this.w.mat[j];
      if (m === 0 || MATERIALS[m].kind === "unbreakable" || MATERIALS[m].kind === "liquid" || MATERIALS[m].cache || (this.w.flag[j] & FLAG.LIFT) || this.w.find[j]) break;
      tiles.push(j);
      g.emit({ t: "wobble", x: j % W, y: (j / W) | 0, mat: m });
    }
    if (tiles.length) this.timbers.push({ tiles, t: TIMBER_DELAY });
  }

  // ---------------------------------------------------------------- the Lift column (R2b)

  /** Carve the column from row top to end (exclusive) through anything and case it. */
  buildLift(g: Game, top: number, end: number) {
    const w = this.w, x = w.spawnX;
    for (let y = top; y < end && y < H; y++) {
      const i = I(x, y);
      if (w.mat[i] !== 0 && MATERIALS[w.mat[i]].kind !== "liquid") w.back[i] = w.mat[i];
      w.mat[i] = 0; w.find[i] = 0; w.haz[i] = 0; w.fluid[i] = 0;
      w.flag[i] |= FLAG.LIFT | FLAG.DUG;
      this.lavaActive.delete(i); this.lavaT.delete(i); this.flowed.delete(i);
      this.fuses = this.fuses.filter((f) => f.i !== i);
      this.dirty(i);
      this.opened(g, i);
    }
    this.ents = this.ents.filter((e) => !(e.kind === "nugget" && Math.floor(e.x) === x && e.y >= top && e.y < end));
  }

  // ---------------------------------------------------------------- scanner and map memory

  /** Mark tiles within r of (cx, cy) as seen in lamp light (map memory). */
  see(cx: number, cy: number, r: number) {
    const r2 = r * r;
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 1, Math.floor(cy + r)); y++)
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.floor(cx + r)); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r2) this.setFlag(I(x, y), FLAG.SEEN);
      }
  }

  /** A scanner pulse: outlines what the level shows within r (core-loop "Scanner"). Returns the tiles revealed. */
  scan(cx: number, cy: number, r: number, level: number, pockets: Set<number>): number[] {
    const w = this.w, out: number[] = [], r2 = r * r;
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 1, Math.floor(cy + r)); y++)
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.floor(cx + r)); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy > r2) continue;
        const i = I(x, y), m = w.mat[i];
        const show =
          (level >= 1 && (w.find[i] !== 0 || !!MATERIALS[m]?.cache || pockets.has(i))) ||
          (level >= 2 && (w.haz[i] === HAZ.GAS || w.haz[i] === HAZ.LAVA_POCKET || m === MAT.LAVA)) ||
          (level >= 3 && (isLoose(m) || m === MAT.TIMBER)) ||
          (level >= 8 && (m === MAT.VAULT_SEAL || w.haz[i] === HAZ.FALSE_FLOOR));
        if (show) { this.setFlag(i, FLAG.SCANNED); out.push(i); }
      }
    return out;
  }

  /** Deep Survey: caches and rich-pocket tiles within `rows` rows of a row. */
  survey(cy: number, rows: number, pockets: Set<number>): number[] {
    const w = this.w, out: number[] = [];
    for (let y = Math.max(0, Math.floor(cy - rows)); y <= Math.min(H - 1, Math.floor(cy + rows)); y++)
      for (let x = 0; x < W; x++) {
        const i = I(x, y);
        if (MATERIALS[w.mat[i]]?.cache || pockets.has(i)) { this.setFlag(i, FLAG.SCANNED); out.push(i); }
      }
    return out;
  }

  /** The rest of an ore vein (same find, 8-connected, unopened) from a broken tile (Vein Tracer). */
  vein(i: number, find: number): number[] {
    const w = this.w, out: number[] = [], seen = new Set([i]), q = [i];
    while (q.length && out.length < 64) {
      const j = q.shift()!, x = j % W, y = (j / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!inb(x + dx, y + dy)) continue;
        const k = I(x + dx, y + dy);
        if (seen.has(k) || w.find[k] !== find) continue;
        seen.add(k); q.push(k); out.push(k);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- the step

  step(g: Game, dt: number) {
    this.stepFalling(g, dt);
    this.stepTimers(g, dt);
    this.stepLava(g, dt);
    this.stepVents(g, dt);
    this.stepPylons(g, dt);
    this.stepGeysers(g, dt);
    this.stepEnts(g, dt);
  }

  private stepFalling(g: Game, dt: number) {
    const w = this.w;
    for (const e of [...this.ents]) {
      if (e.kind !== "boulder") continue;
      if ((e.t ?? 0) > 0) {
        e.t! -= dt;
        // the support came back (a boulder settled under it): stay put
        const below = (e.i ?? 0) + W;
        if (below < W * H && this.solid(below % W, (below / W) | 0) && w.mat[below] !== MAT.LAVA) { this.remove(e); continue; }
        if (e.t! > 0) continue;
        // it lets go: the tile becomes air and the entity falls
        const i = e.i!;
        if (w.mat[i] !== e.mat) { this.remove(e); continue; }
        w.mat[i] = 0; w.fluid[i] = 0; w.find[i] = 0; w.haz[i] = 0;
        this.dirty(i);
        e.i = -1; e.t = 0; e.vy = 0;
        this.opened(g, i);
        continue;
      }
      e.vy = Math.min(FALL_CAP, (e.vy ?? 0) + GRAV * dt);
      const ny = e.y + e.vy * dt;
      const tx = Math.floor(e.x);
      // the pod in the way: a boulder hits it and shatters; sand crumbles over it
      if (g.podOverlaps(tx, ny - 0.5, tx + 1, ny + 0.5)) {
        if (isBoulder(e.mat!)) g.hurt(10 * g.hazardScale(Math.floor(ny)), "boulder");
        g.emit({ t: "break", x: tx, y: Math.floor(ny), mat: e.mat!, find: 0, by: "fall" });
        this.remove(e);
        continue;
      }
      const rowBelow = Math.floor(ny + 0.5);
      if (rowBelow >= H || this.solid(tx, rowBelow) || w.mat[I(tx, rowBelow)] === MAT.LAVA) {
        const row = rowBelow - 1;
        this.remove(e);
        if (rowBelow < H && w.mat[I(tx, rowBelow)] === MAT.LAVA) { g.emit({ t: "break", x: tx, y: rowBelow, mat: e.mat!, find: 0, by: "fall" }); continue; }
        if (row >= 0 && w.mat[I(tx, row)] === 0) {
          const i = I(tx, row);
          w.mat[i] = e.mat!; w.flag[i] |= FLAG.DUG;
          this.dirty(i);
          // piles under it are buried into the tile above it
          for (const p of this.ents) if (p.kind === "nugget" && Math.floor(p.x) === tx && Math.floor(p.y) === row) this.liftPile(p);
          g.emit({ t: "fall_land", x: tx, y: row, mat: e.mat! });
          if (rowBelow < H && !this.solid(tx, rowBelow + 1)) { /* settled on a ledge */ }
        }
        continue;
      }
      e.y = ny;
    }
  }
  /** A pile under a settling tile moves up out of it. */
  private liftPile(p: Ent) {
    let y = Math.floor(p.y);
    while (y > 0 && this.solid(Math.floor(p.x), y)) y--;
    p.y = y + 0.8;
  }

  private stepTimers(g: Game, dt: number) {
    const w = this.w, P = g.power();
    for (const f of [...this.fuses]) {
      f.t -= dt;
      if (f.t > 0) continue;
      this.fuses.splice(this.fuses.indexOf(f), 1);
      if (w.haz[f.i] !== HAZ.GAS && w.mat[f.i] !== 0) continue;
      w.haz[f.i] = 0;
      this.explode(g, (f.i % W) + 0.5, ((f.i / W) | 0) + 0.5, 2, "gas", P);
    }
    for (const c of [...this.timbers]) {
      c.t -= dt;
      if (c.t > 0) continue;
      this.timbers.splice(this.timbers.indexOf(c), 1);
      // bottom first, so the upper tile has room to follow
      for (const j of [...c.tiles]) {
        const m = w.mat[j];
        if (m === 0 || MATERIALS[m].kind === "unbreakable") continue;
        w.back[j] = m; w.mat[j] = 0; w.find[j] = 0; w.haz[j] = 0;
        this.dirty(j);
        this.ents.push({ id: this.nextId++, kind: "boulder", x: (j % W) + 0.5, y: ((j / W) | 0) + 0.5, vy: 0, mat: MAT.RUBBLE, t: 0, i: -1 });
        this.opened(g, j);
      }
    }
    for (const f of [...this.floors]) {
      f.t -= dt;
      if (f.t > 0) continue;
      this.floors.splice(this.floors.indexOf(f), 1);
      if (w.mat[f.i] === 0) continue;
      const was = this.clear(g, f.i);
      g.emit({ t: "break", x: f.i % W, y: (f.i / W) | 0, mat: was.mat, find: was.find, by: "fall" });
    }
    if (this.reveals.length) this.reveals = this.reveals.filter((r) => r.until > g.time);
  }

  /** Something rests on a false floor: it crumbles after 0.8 s. */
  stepOn(g: Game, i: number) {
    if (this.w.haz[i] !== HAZ.FALSE_FLOOR || this.floors.some((f) => f.i === i)) return;
    this.floors.push({ i, t: FLOOR_DELAY });
    g.emit({ t: "wobble", x: i % W, y: (i / W) | 0, mat: this.w.mat[i] });
  }

  // ---------------------------------------------------------------- lava (D12, R12): down 1 tile per 0.5 s, sideways 1 per 1.5 s, crust after 15 s still

  private lavaOpen(i: number) {
    if (i < 0 || i >= W * H) return false;
    const x = i % W;
    if (x < 1 || x > W - 2) return false;
    return this.w.mat[i] === 0 && !(this.w.flag[i] & FLAG.LIFT);
  }

  private stepLava(g: Game, dt: number) {
    const w = this.w;
    for (const i of [...this.lavaActive]) {
      if (w.mat[i] !== MAT.LAVA) { this.lavaActive.delete(i); this.lavaT.delete(i); continue; }
      const below = i + W;
      const canDown = this.lavaOpen(below) || (below < W * H && w.mat[below] === MAT.LAVA && w.fluid[below] < 255);
      const sides = [i - 1, i + 1].filter((j) => this.lavaOpen(j));
      const canSide = !canDown && sides.length > 0 && w.fluid[i] >= 2 * LAVA_MIN && (below >= W * H || w.mat[below] !== 0);
      if (!canDown && !canSide) { this.lavaActive.delete(i); this.lavaT.delete(i); continue; }
      const need = canDown ? LAVA_DOWN : LAVA_SIDE;
      const t = (this.lavaT.get(i) ?? 0) + dt;
      if (t < need - 1e-9) { this.lavaT.set(i, t); continue; }
      this.lavaT.delete(i);
      if (canDown) {
        if (w.mat[below] === 0) {
          this.fill(below, w.fluid[i], g);
          this.drain(g, i, w.fluid[i]);
          this.lavaT.set(below, Math.max(0, t - need)); // a falling blob keeps its pace
        } else {
          const move = Math.min(255 - w.fluid[below], w.fluid[i]);
          w.fluid[below] += move; this.dirty(below); this.touch(g, below);
          this.drain(g, i, move);
        }
      } else {
        // alternate sides by tile and time so a pool spreads both ways
        const j = sides.length === 1 ? sides[0] : sides[(hash(i, Math.floor(g.time * 4), w.seed) * 2) | 0];
        const half = w.fluid[i] >> 1;
        this.fill(j, half, g);
        this.drain(g, i, half);
      }
    }
    // crust: lava that flowed and then stood still for 15 s turns to basalt
    if (this.flowed.size && Math.floor(g.time * 4) !== Math.floor((g.time - dt) * 4)) {
      for (const [i, since] of [...this.flowed]) {
        if (w.mat[i] !== MAT.LAVA) { this.flowed.delete(i); continue; }
        if (this.lavaActive.has(i) || g.time - since < LAVA_CRUST) continue;
        w.mat[i] = MAT.BASALT; w.back[i] = MAT.BASALT; w.fluid[i] = 0;
        this.flowed.delete(i);
        this.dirty(i);
      }
    }
  }
  private fill(j: number, amount: number, g: Game) {
    const w = this.w;
    w.mat[j] = MAT.LAVA; w.fluid[j] = Math.max(1, Math.min(255, amount)); w.flag[j] |= FLAG.DUG;
    this.dirty(j);
    this.touch(g, j);
    // anything lying there is lost in the lava
    this.ents = this.ents.filter((e) => !(e.kind === "nugget" && Math.floor(e.x) === j % W && Math.floor(e.y) === ((j / W) | 0)));
  }
  private touch(g: Game, j: number) { this.flowed.set(j, g.time); this.lavaActive.add(j); }
  private drain(g: Game, i: number, amount: number) {
    const w = this.w;
    const left = w.fluid[i] - amount;
    if (left <= 0) {
      w.mat[i] = 0; w.fluid[i] = 0;
      this.flowed.delete(i);
      this.lavaActive.delete(i);
      this.dirty(i);
      this.opened(g, i); // the lava above and beside follows
    } else {
      w.fluid[i] = left;
      this.touch(g, i);
      this.dirty(i);
      if (i >= W && w.mat[i - W] === MAT.LAVA) this.wake(i - W);
    }
  }

  // ---------------------------------------------------------------- spore vents (world.md: every 6-12 s a cloud that drifts up)

  private stepVents(g: Game, dt: number) {
    const w = this.w, py = g.pod.y, t0 = g.time - dt, t1 = g.time;
    for (const i of this.vents) {
      const y = (i / W) | 0;
      if (Math.abs(y - py) > NEAR || w.haz[i] !== HAZ.SPORE_VENT) continue;
      const x = i % W;
      // the cloud comes out of an open neighbour; a vent sealed in rock stays quiet
      const out = [i - W, i - 1, i + 1, i + W].find((j) => j >= 0 && j < W * H && w.mat[j] === 0);
      if (out === undefined) continue;
      const p = VENT_PERIOD[0] + (VENT_PERIOD[1] - VENT_PERIOD[0]) * hash(x, y, w.seed, 3);
      const ph = hash(x, y, w.seed, 4) * p;
      const a = (t0 + ph) / p, b = (t1 + ph) / p;
      if (Math.floor(a - VENT_TELL / p) !== Math.floor(b - VENT_TELL / p)) g.emit({ t: "spore_charge", x, y });
      if (Math.floor(a) !== Math.floor(b)) {
        this.add("cloud", (out % W) + 0.5, ((out / W) | 0) + 0.5, { r: CLOUD_R, t: CLOUD_LIFE });
        g.emit({ t: "spore", x, y });
      }
    }
  }

  // ---------------------------------------------------------------- arc pylons (world.md: every 4 s, 0.4 s charge, 1 s arc)

  /** Arc state of a pair at a time: 0 idle, 1 charging, 2 firing. */
  arcState(p: Pylon, t: number) {
    const l = (t + p.phase) % ARC_PERIOD;
    if (l < ARC_CHARGE) return 1;
    if (l < ARC_CHARGE + ARC_FIRE) return 2;
    return 0;
  }
  private stepPylons(g: Game, dt: number) {
    const py = g.pod.y;
    for (const p of this.pylons) {
      const ay = (p.a / W) | 0;
      if (Math.abs(ay - py) > NEAR) continue;
      const s0 = this.arcState(p, g.time - dt), s1 = this.arcState(p, g.time);
      const ax = p.a % W, bx = p.b % W, by = (p.b / W) | 0;
      if (s1 !== s0 && s1 > 0) g.emit({ t: "arc", x1: ax + 0.5, y1: ay + 0.5, x2: bx + 0.5, y2: by + 0.5, phase: s1 === 1 ? "charge" : "fire" });
      if (s1 !== 2) continue;
      for (const j of p.tiles) {
        if (this.w.mat[j] !== 0) continue; // a wall in the gap takes the arc
        const x = j % W, y = (j / W) | 0;
        if (g.podOverlaps(x + 0.1, y + 0.1, x + 0.9, y + 0.9)) { g.hurt(8 * g.hazardScale(y), "arc"); break; }
      }
    }
  }

  // ---------------------------------------------------------------- geysers (Cinder, world.md 7): every 8 s a 1.5 s fire column up to 6 tiles, told 1 s before

  /** A geyser's state at a time: 0 idle, 1 charging (the tell), 2 erupting. */
  geyserState(i: number, t: number) {
    const l = (t + hash(i % W, (i / W) | 0, this.w.seed, 11) * GEYSER_PERIOD) % GEYSER_PERIOD;
    return l >= GEYSER_PERIOD - GEYSER_TELL ? 1 : l < GEYSER_FIRE ? 2 : 0;
  }
  /** The open tiles of a geyser's fire column (up to 6, stopping at the first solid tile). */
  geyserColumn(i: number) {
    const out: number[] = [];
    for (let j = i - W, k = 0; k < 6 && j >= 0 && this.w.mat[j] === 0; j -= W, k++) out.push(j);
    return out;
  }
  private stepGeysers(g: Game, dt: number) {
    const py = g.pod.y;
    for (const i of this.geysers) {
      const x = i % W, y = (i / W) | 0;
      if (Math.abs(y - py) > NEAR || this.w.mat[i] !== MAT.GEYSER) continue;
      const s0 = this.geyserState(i, g.time - dt), s1 = this.geyserState(i, g.time);
      if (s1 !== s0 && s1 > 0) g.emit({ t: "geyser", x, y, phase: s1 === 1 ? "charge" : "fire" });
      if (s1 !== 2) continue;
      for (const j of this.geyserColumn(i)) {
        const jx = j % W, jy = (j / W) | 0;
        if (!g.podOverlaps(jx + 0.1, jy, jx + 0.9, jy + 1)) continue;
        g.pod.heat = Math.min(1, g.pod.heat + 0.4 * dt);
        // Flame Skimmer: the fire costs heat, not hull
        if (g.has("P1")) g.pod.heat = Math.min(1, g.pod.heat + 0.4 * dt);
        else g.hurt(8 * g.hazardScale(jy), "geyser");
        break;
      }
    }
  }

  // ---------------------------------------------------------------- clouds and charges

  private stepEnts(g: Game, dt: number) {
    for (const e of [...this.ents]) {
      if (e.kind === "cloud") {
        e.t! -= dt;
        e.y -= CLOUD_RISE * dt;
        if (e.t! <= 0) this.remove(e);
      } else if (e.kind === "charge") {
        e.t! -= dt;
        if (e.t! > 0) continue;
        this.remove(e);
        const big = e.item === "charge", P = g.power();
        this.explode(g, e.x, e.y, big ? 2.5 : 1, big ? "charge" : "dynamite", (big ? 3.2 : 2.5) * P);
      }
    }
  }

  /** Lava tiles within 2 tiles of a point (heat, D2: +60 each, max 3). */
  lavaNear(cx: number, cy: number) {
    let n = 0;
    const tx = Math.floor(cx), ty = Math.floor(cy);
    for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) if (this.lava(x, y) && ++n >= 3) return 3;
    return n;
  }

  /** Is (x, y) inside the core chamber's ellipse? */
  static inChamber(x: number, y: number) {
    const dx = (x - CHAMBER.cx) / CHAMBER.rx, dy = (y - CHAMBER.cy) / CHAMBER.ry;
    return dx * dx + dy * dy <= 1;
  }
}

/** The find's display name (for toasts). */
export const findName = (id: number) => findById(id)?.name ?? "?";
export { LIFT_X };
