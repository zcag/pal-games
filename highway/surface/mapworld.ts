// The road trip's map in the world itself (trip.ts draws the signs over it): the
// region's place seen from high above the highway, its nine stops spaced along
// the road, your car parked at the one picked and driven to the next, traffic
// going by. The camera glides along the road to keep the picked stop framed and
// never quite sits still. The page builds the world (World.build); this stages
// it and says where on screen each stop is, every frame.
import * as THREE from "./vendor/three.js";
import { Car } from "./car.ts";
import { Flow } from "./run.ts";
import type { World } from "./world.ts";
import type { Renderer } from "./render.ts";
import { bridgeNear } from "./terrain.ts";
import { laneX, type Layout } from "../game/layout.ts";
import { sprintsOf } from "../game/sprint.ts";

/** Metres between stops, and the extra run-up to each of the special ones at the end (the duel, the Legend). */
const GAP = 44, DUEL = 12;
/** A region's stops, as metres along its stretch of road. */
const offsetsOf = (region: number) => { let extra = 0; return sprintsOf(region).map((s, k) => { if (s.boss || s.legend) extra += DUEL; return k * GAP + extra; }); };
/** The camera: how high, how far back and out to the side of the stop it frames, and its lens. */
const HIGH = 100, BACK = 145, SIDE = -34, FOV = 30;

/** Where a region's road starts: a different stretch of land for each, its stops clear of the overpasses. */
function startOf(region: number) {
  let z = 700 + region * 2600;
  const clear = (z0: number) => offsetsOf(region).every((o) => Math.abs(bridgeNear(z0 + o) - (z0 + o)) > 30);
  while (!clear(z)) z += 20;
  return z;
}

export type Pin = { x: number; y: number; depth: number } | null;

export class MapWorld {
  private car: Car | null = null;
  private carKey = "";
  private flow: Flow | null = null;
  private lights: THREE.SpotLight[] = [];
  private stops: number[] = [];
  private region = -1;
  private at = 0; // the stop picked
  private focus = { z: 0, v: 0 }; // the camera's place along the road, on a spring
  private drive: { from: number; to: number; t: number; dur: number } | null = null;
  private carZ = 0;
  private t = 0;
  active = false;
  /** Where on the page the picked stop is framed, px (the room left of the card). */
  frame = { x: 0.4, y: 0.58 };

  constructor(private r: Renderer, private world: World) {}

  private get layout(): Layout { return this.world.road.layout; }
  private get lane() { return laneX(this.layout, 0); }

  /** Stage a region on the world as built: its stops, the car (none for a region not open), the traffic; `warm`
   *  compiles the scene's shaders once the car is in it and before the traffic takes cars from the pool. */
  async enter(region: number, stop: number, car: { id: string; paint: string } | null, warm?: () => Promise<void>) {
    const fresh = region !== this.region || !this.active;
    this.region = region;
    const z0 = startOf(region);
    this.stops = offsetsOf(region).map((o) => z0 + o);
    const key = car ? `${car.id}/${car.paint}` : "";
    if (key !== this.carKey) {
      this.car?.dispose(); this.car = null; this.carKey = key;
      this.clearLights();
      if (car) {
        const c = await Car.load(car.id, car.paint);
        if (this.carKey !== key) { c.dispose(); return; }
        this.car = c;
      }
    }
    if (this.car && !this.car.root.parent) this.world.scene.add(this.car.root);
    if (!this.world.night) this.clearLights();
    else if (this.car && !this.lights.length) this.headlights(this.car);
    await warm?.(); // the car and its lights in the scene, the traffic's cars all in the pool
    if (fresh || !this.flow) {
      this.flow?.dispose();
      this.flow = new Flow(this.world, this.layout, this.stops[0] - 160, this.stops[this.stops.length - 1] + 280, 1, this.layout.oncoming ? 16 : 22);
    }
    this.active = true;
    if (fresh) this.jump(stop);
    else this.pick(stop);
    // the land under the whole view built now, not streamed in over the first frames
    this.world.follow(this.focus.z - 60);
    this.world.land.ready(this.focus.z - 60);
    this.r.finish.cut = true;
  }

  /** At a stop at once: the camera and the car there. */
  jump(stop: number) {
    this.at = stop;
    this.focus = { z: this.stops[stop], v: 0 };
    this.carZ = this.stops[stop];
    this.drive = null;
  }

  /** A stop picked: the car drives there, the camera glides after it. */
  pick(stop: number) {
    if (stop === this.at && !this.drive) return;
    this.at = stop;
    const to = this.stops[stop], d = Math.abs(to - this.carZ);
    this.drive = { from: this.carZ, to, t: 0, dur: Math.min(1.3, 0.45 + d / 160) };
  }

  /** The world gone from the map: the car and traffic off the road, the camera free. */
  leave() {
    if (!this.active) return;
    this.active = false;
    this.flow?.dispose(); this.flow = null;
    this.car?.root.removeFromParent();
    this.r.camera.clearViewOffset();
    this.r.camera.updateProjectionMatrix();
  }

  /** Lose the car (a new world: its lights were made for the old one). */
  reset() {
    this.leave();
    this.car?.dispose(); this.car = null; this.carKey = "";
    this.clearLights();
    this.region = -1;
  }

  private clearLights() { for (const l of this.lights) { l.target.removeFromParent(); l.removeFromParent(); } this.lights = []; }

  /** At night, the headlamps' light on the road, as a run's car has (the same lights: the same shaders). */
  private headlights(car: Car) {
    for (const p of car.anchors.head.length ? car.anchors.head : [new THREE.Vector3(0.6, 0.7, 2), new THREE.Vector3(-0.6, 0.7, 2)]) {
      const spot = new THREE.SpotLight(0xfff1dc, 380, 110, 0.38, 0.85, 1.4);
      spot.position.copy(p);
      spot.target.position.set(p.x * 0.6 - 0.4, 0, p.z + 45);
      car.body.add(spot, spot.target);
      this.lights.push(spot);
    }
  }

  /** A frame: the car on its way, the traffic, the camera; drawn, `dim` darkening it (a region not open). */
  render(dt: number) {
    if (!this.active) return;
    this.t += dt;
    const cam = this.r.camera, car = this.car;
    // the car: eased from stop to stop, its wheels turning, brake lamps as it stops
    let speed = 0;
    if (this.drive) {
      const d = this.drive;
      d.t = Math.min(1, d.t + dt / d.dur);
      const e = d.t < 0.5 ? 4 * d.t ** 3 : 1 - (-2 * d.t + 2) ** 3 / 2;
      const z = d.from + (d.to - d.from) * e;
      speed = (z - this.carZ) / Math.max(dt, 1e-3);
      this.carZ = z;
      if (d.t >= 1) this.drive = null;
    }
    if (car) {
      car.root.position.set(this.lane, 0, this.carZ);
      car.root.rotation.y = 0;
      for (const w of car.wheels) w.spin.rotation.x += (speed / 0.33) * dt;
      car.light("head", this.world.night ? 3 : 0);
      car.light("brake", this.drive && this.drive.t > 0.55 ? 3.5 : this.world.night ? 0.9 : 0);
    }
    // the camera: on a spring to the stop (about 0.6 s), drifting a little all the while
    const w = 7.5, f = this.focus, goal = this.stops[this.at];
    f.v += (w * w * (goal - f.z) - 2 * w * f.v) * dt;
    f.z += f.v * dt;
    const t = this.t, sx = Math.sin(t * 0.13) * 3.5 + Math.sin(t * 0.31) * 1.2, sy = Math.sin(t * 0.17 + 1) * 2.2, sz = Math.sin(t * 0.11 + 2) * 3;
    const mid = this.lane + 3;
    cam.position.set(mid + SIDE + sx, HIGH + sy, f.z - BACK + sz);
    cam.lookAt(mid, 0, f.z);
    cam.fov = FOV;
    cam.far = 4000;
    // the stop framed left of the card: the picture's centre moved there
    const W = innerWidth, H = innerHeight;
    cam.setViewOffset(W, H, W / 2 - this.frame.x * W, H / 2 - this.frame.y * H, W, H);
    cam.updateProjectionMatrix();
    this.flow?.step(dt);
    this.world.follow(f.z - 60);
    this.r.finish.cut = true; // a glide is not motion to blur
    this.r.render(this.world.scene, {});
  }

  /** Where each stop is on the page now (CSS px) and how far from the camera, or null off the picture. */
  pins(): Pin[] {
    const cam = this.r.camera, v = new THREE.Vector3(), W = innerWidth, H = innerHeight;
    return this.stops.map((z) => {
      v.set(this.lane, 0, z);
      const depth = v.distanceTo(cam.position);
      v.project(cam);
      if (v.z > 1 || v.x < -1.3 || v.x > 1.3 || v.y < -1.3 || v.y > 1.3) return null;
      return { x: (v.x * 0.5 + 0.5) * W, y: (0.5 - v.y * 0.5) * H, depth };
    });
  }
}
