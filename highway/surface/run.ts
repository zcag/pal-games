// One run, drawn: the rules are game/drive.ts; this puts your car and the
// traffic's in the world's scene where the simulation says (between its last
// two steps, so motion is smooth at any frame rate), with lamps, indicators
// and headlights, and lends the traffic its cars from a shared pool.
import * as THREE from "./vendor/three.js";
import { Car } from "./car.ts";
import type { World } from "./world.ts";
import type { Input } from "../game/vehicle.ts";
import { Drive, type DriveEvents, type Size, type SprintRoad } from "../game/drive.ts";
import { Traffic, heading, crossing } from "../game/traffic.ts";
import { TRAFFIC, FEEL, type ModeId, type PlayerCar } from "../game/content.ts";
import { laneX, oncomingX, type Layout } from "../game/layout.ts";

const rnd = Math.random;

// the traffic's cars, made once and shared by every run: idle ones wait here by model
const pool = new Map<string, Car[]>();
const sizes = new Map<string, Size>();
const loading = new Set<string>();

async function makeCar(id: string) {
  const t = TRAFFIC.find((x) => x.id === id)!;
  const color = t.livery ? "#ffffff" : t.colors![Math.floor(rnd() * t.colors!.length)];
  const c = await Car.load(id, color);
  return c;
}

/** Make two of every traffic model before the first run (`progress` 0..1 as they come in), so a
 *  run never stops to load one. */
export async function preloadTraffic(progress: (f: number) => void) {
  let done = 0;
  await Promise.all(TRAFFIC.map(async (t) => {
    if (sizes.has(t.id)) return;
    const cars = await Promise.all([makeCar(t.id), makeCar(t.id)]);
    sizes.set(t.id, cars[0].footprint);
    (pool.get(t.id) ?? pool.set(t.id, []).get(t.id)!).push(...cars);
    progress(++done / TRAFFIC.length);
  }));
}

/** Every traffic car drawn once, lined up in front of the camera, with the run's lights in the scene (a shader
 *  is made for a set of lights: a night run's headlamps add two): its shaders compile and its geometry and
 *  textures go to the GPU now, behind the loading sign, rather than the first time it drives into view. */
export async function warmTraffic(world: World, warm: (scene: THREE.Scene) => Promise<void>) {
  const parked = new THREE.Group();
  let i = 0;
  for (const list of pool.values()) for (const c of list) { lamps(c, true, true); c.root.position.set((i % 8) * 3 - 10.5, 0, -14 - Math.floor(i / 8) * 7); parked.add(c.root); i++; }
  world.scene.add(parked);
  await warm(world.scene);
  world.scene.remove(parked);
  for (const list of pool.values()) for (const c of list) c.root.removeFromParent();
}

/** Lamps for the time of day. */
function lamps(car: Car, night: boolean, braking: boolean) {
  car.light("head", night ? 3 : 0);
  car.light("brake", braking ? 3.5 : night ? 0.9 : 0);
}

export class Run {
  drive: Drive;
  private shown = new Map<number, Car>();
  private blink = 0;
  lights: THREE.SpotLight[] = [];
  /** Where the player's car is drawn: between the last two steps, so motion is smooth at any frame rate. */
  pose = { x: 0, z: 0, yaw: 0, u: 0, ax: 0, delta: 0 };
  private prev = { x: 0, z: 0, yaw: 0 };

  constructor(public world: World, public layout: Layout, public player: Car, car: PlayerCar, events: DriveEvents, density = 1, mode: ModeId = "endless", sprint?: SprintRoad, intro = 0, seed?: number) {
    this.drive = new Drive(layout, car, player.footprint, player.wheelbase, (id) => sizes.get(id), events, { density, mode, sprint, intro, seed });
    world.scene.add(player.root);
    player.hero = true;
    this.headlights();
    this.settle();
  }

  get veh() { return this.drive.veh; }
  get traffic() { return this.drive.traffic; }
  get director() { return this.drive.director; }
  get score() { return this.drive.score; }
  get over() { return this.drive.over; }
  get scraping() { return this.drive.scraping; }
  get car() { return this.drive.car; }

  /** At night, two real spotlights from the player's headlamps. */
  private headlights() {
    for (const l of this.lights) { l.target.removeFromParent(); l.removeFromParent(); }
    this.lights = [];
    const player = this.player;
    if (this.world.night) for (const p of player.anchors.head.length ? player.anchors.head : [new THREE.Vector3(0.6, 0.7, 2), new THREE.Vector3(-0.6, 0.7, 2)]) {
      // dipped beams: aimed well down the road and soft-edged, so the road lights from a few metres out to
      // about 40 m instead of a hot patch at the bumper
      // at 380 a car ahead lit up white as a lamp and bloomed into glare; at 140 it reads as a car in your lights
      const spot = new THREE.SpotLight(0xfff1dc, 140, 110, 0.38, 0.85, 1.4);
      spot.position.copy(p);
      spot.target.position.set(p.x * 0.6 - 0.4, 0, p.z + 45);
      player.body.add(spot, spot.target);
      this.lights.push(spot);
    }
  }

  /** Swap the car you drive, keeping where and how fast it goes (the garage's browsing). */
  setPlayer(player: Car, car: PlayerCar) {
    this.player.root.removeFromParent();
    this.player.hero = false;
    this.player = player;
    player.hero = true;
    this.drive.setCar(car, player.footprint, player.wheelbase);
    this.world.scene.add(player.root);
    this.headlights();
    this.settle();
  }

  /** Draw exactly where the simulation is (after a jump: a start, a fast-forward). */
  settle() {
    const v = this.veh;
    this.prev = { x: v.x, z: v.z, yaw: v.yaw };
    Object.assign(this.pose, { x: v.x, z: v.z, yaw: v.yaw, u: v.u, ax: v.ax, delta: v.delta });
  }

  step(dt: number, input: Input) {
    const v = this.veh;
    this.prev = { x: v.x, z: v.z, yaw: v.yaw };
    for (const n of this.traffic.cars) n.prev = { x: n.x, z: n.z, yaw: n.hit ? n.hit.yaw : 0 };
    this.drive.step(dt, input);
  }

  /** Put the cars where the simulation says, once a frame; `alpha` is how far into the next step (0..1). */
  draw(dt: number, alpha = 1) {
    const v = this.veh, p = this.player, a = alpha, b = 1 - alpha;
    const pose = this.pose;
    pose.x = this.prev.x * b + v.x * a; pose.z = this.prev.z * b + v.z * a; pose.yaw = this.prev.yaw * b + v.yaw * a;
    pose.u = v.u; pose.ax = v.ax; pose.delta = v.delta;
    p.root.position.set(pose.x, 0, pose.z);
    p.root.rotation.y = pose.yaw * FEEL.yaw;
    p.body.rotation.set(this.drive.spring.pitch, 0, -this.drive.spring.roll);
    for (const w of p.wheels) { w.spin.rotation.x = v.wheelSpin; if (w.front) w.pivot.rotation.y = v.delta; }
    lamps(p, this.world.night, v.braking > 0.1);
    this.blink += dt;
    const on = Math.floor(this.blink / 0.38) % 2 === 0;
    for (const [id, car] of this.shown) if (!this.traffic.cars.some((n) => n.id === id)) {
      car.root.removeFromParent();
      pool.get(car.kind)!.push(car);
      this.shown.delete(id);
    }
    for (const n of this.traffic.cars) {
      let car = this.shown.get(n.id);
      if (!car) {
        const list = pool.get(n.kind)!;
        if (!list.length) {
          if (!loading.has(n.kind)) { loading.add(n.kind); makeCar(n.kind).then((c) => { list.push(c); loading.delete(n.kind); }); }
          continue;
        }
        car = list.pop()!;
        this.shown.set(n.id, car);
        this.world.scene.add(car.root);
      }
      const at = (l: number) => (n.oncoming ? oncomingX(this.layout, l) : laneX(this.layout, l));
      const pv = n.prev ?? { x: n.x, z: n.z, yaw: n.hit?.yaw ?? 0 };
      car.root.position.set(pv.x * b + n.x * a, 0, pv.z * b + n.z * a);
      car.root.rotation.y = n.hit ? pv.yaw * b + n.hit.yaw * a : heading(n, at);
      car.setShadow(Math.abs(n.z - v.z) < 150); // as far as anything is still big enough for its shadow to read
      for (const w of car.wheels) w.spin.rotation.x += (n.v / 0.33) * dt;
      lamps(car, this.world.night, n.braking);
      const hazard = !!n.hit;
      car.light("left", (n.signal === 1 || hazard) && on ? 5 : 0);
      car.light("right", (n.signal === -1 || hazard) && on ? 5 : 0);
    }
  }

  /** Leave the road: the traffic's cars go back to the pool. */
  dispose() {
    this.player.root.removeFromParent();
    for (const car of this.shown.values()) { car.root.removeFromParent(); pool.get(car.kind)!.push(car); }
    this.shown.clear();
    for (const l of this.lights) { l.target.removeFromParent(); l.removeFromParent(); }
  }
}

/** Traffic going about its day on a stretch of road with no one racing it: the map's. The game's drivers (game/traffic.ts:
 *  following, changing lanes) in a fixed window of road, cars entering at its ends and leaving past them, drawn from
 *  the shared pool like a run's. `keep` lanes of ours, from the slow one, are left empty (a car parked there). */
export class Flow {
  traffic: Traffic;
  private shown = new Map<number, Car>();
  private blink = 0;
  private wait = 0;
  constructor(public world: World, public layout: Layout, private from: number, private to: number, private keep = 1, private n = 14) {
    this.traffic = new Traffic(layout.lanes - keep, layout.oncoming);
    // the road already busy: cars spread along all of it
    for (let i = 0; i < n * 4 && this.traffic.cars.length < n; i++) this.spawn(from + rnd() * (to - from));
  }

  /** A car into a lane with room for it at `z` (its direction's way in, unless given). */
  private spawn(z?: number) {
    const oncoming = this.layout.oncoming > 0 && rnd() < 0.4, lanes = oncoming ? this.layout.oncoming : this.layout.lanes - this.keep;
    const at = z ?? (oncoming ? this.to : this.from), lane = Math.floor(rnd() * lanes);
    const kinds = TRAFFIC.filter((t) => sizes.has(t.id)), heavy = rnd() < 0.15;
    const list = kinds.filter((t) => !!t.heavy === heavy);
    let w = rnd() * list.reduce((a, t) => a + t.weight, 0), kind = list[0];
    for (const t of list) if ((w -= t.weight) <= 0) { kind = t; break; }
    if (!kind) return;
    const size = sizes.get(kind.id)!;
    if (this.traffic.cars.some((c) => c.oncoming === oncoming && c.lane === lane && Math.abs(c.z - at) < 22)) return;
    // slower on the right, faster to the left, trucks slowest; the other way a little slower than ours
    const kmh = heavy ? 78 + rnd() * 10 : oncoming ? 85 + rnd() * 20 : 90 + (lane / Math.max(1, lanes - 1)) * 30 + rnd() * 12;
    const v = (kmh / 3.6) * FEEL.pace;
    this.traffic.add({ kind: kind.id, length: size.z, width: size.x, z: at, v, lane, v0: v, T: 1.2 + rnd() * 0.5, a: heavy ? 0.8 : 1.4, b: 2.5, oncoming,
      politeness: 0.3 + rnd() * 0.4, side: (rnd() * 2 - 1) * 0.3, phase: rnd() * 6.28, cooldown: 2 + rnd() * 6 });
  }

  step(dt: number) {
    const L = this.layout, t = this.traffic;
    t.step(dt, null);
    t.remove((c) => c.z < this.from - 5 || c.z > this.to + 5);
    if ((this.wait -= dt) <= 0 && t.cars.length < this.n) { this.spawn(); this.wait = 0.4 + rnd() * 1.2; }
    this.blink += dt;
    const on = Math.floor(this.blink / 0.38) % 2 === 0;
    for (const [id, car] of this.shown) if (!t.cars.some((c) => c.id === id)) { car.root.removeFromParent(); pool.get(car.kind)!.push(car); this.shown.delete(id); }
    for (const c of t.cars) {
      let car = this.shown.get(c.id);
      if (!car) {
        const list = pool.get(c.kind);
        if (!list?.length) continue;
        car = list.pop()!;
        this.shown.set(c.id, car);
        this.world.scene.add(car.root);
      }
      const at = (l: number) => (c.oncoming ? oncomingX(L, l) : laneX(L, l + this.keep));
      c.x = at(c.from) + (at(c.lane) - at(c.from)) * crossing(c) + c.side + 0.1 * Math.sin(this.blink * 0.35 + c.phase);
      car.root.position.set(c.x, 0, c.z);
      car.root.rotation.y = heading(c, at);
      car.setShadow(true);
      for (const w of car.wheels) w.spin.rotation.x += (c.v / 0.33) * dt;
      lamps(car, this.world.night, c.braking);
      car.light("left", c.signal === 1 && on ? 5 : 0);
      car.light("right", c.signal === -1 && on ? 5 : 0);
    }
  }

  /** Off the road: the cars back to the pool. */
  dispose() {
    for (const car of this.shown.values()) { car.root.removeFromParent(); pool.get(car.kind)!.push(car); }
    this.shown.clear();
    this.traffic.remove(() => true);
  }
}
