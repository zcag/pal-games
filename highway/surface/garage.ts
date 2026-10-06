// The garage: a round showroom. The cars stand on turntables in a ring around a dark drum, in the
// order you buy them (game/content.ts CARS), each class's bays marked in its own colour; the camera
// stands outside the ring and orbits to the car you look at, which turns slowly on its table. Yours
// stand lit with their running lamps on, the ones you can buy a little darker, the ones not open yet
// under a fitted cloth cover (only the shape shows). Buying or winning one pulls its cover off and
// sweeps a light over it.
//
// The light is the room's own: its strips and panels, baked once into the environment the cars
// reflect (PMREM of the room from the ring), the car you look at mirroring the real room live
// (Reflections in car.ts), one spot over its bay casting its shadow, and a polished floor that
// mirrors everything above it (a second, half-resolution view from under the floor).
import * as THREE from "./vendor/three.js";
import { Car } from "./car.ts";
import type { Renderer } from "./render.ts";
import type { SkyLook } from "./skylooks.ts";
import { CARS, CLASSES, classOf } from "../game/content.ts";

/** A showcase's moments, for the page to time a title card and sounds to: the cover starting off, the light
 *  sweeping the car (headlamps flash, the ring flares), the camera settling back. */
export type Beat = "reveal" | "sweep" | "settle";

/** The showcase's timeline, seconds. */
const SHOW = { cover: 0.15, light: 0.75, sweep: 1.05, settle: 3.35, end: 4.2 };

export type Bay = { id: string; state: "owned" | "for-sale" | "locked"; paint: string };

/** Each class's colour: the floor line, the drum's base strip, the ring round each table. */
const ACCENT: Record<string, number> = { city: 0x4aa8e8, sport: 0xe8483a, muscle: 0xf0a030, gt: 0x2fc49a, super: 0xa36bff };

const R = 17.6; // the ring of tables, metres from the middle
const DRUM = 13.4; // the drum's wall
const OUTER = 34; // the room's outer wall
const CEIL = 5.6;
const TABLE = 2.6; // a turntable's radius
const STEP = 6.0 / R; // radians between two bays
const GAP = 1.9 / R; // and the extra between two classes
const PARK = -0.62; // a parked car's yaw on its table: nose out and toward the camera's side
const SPIN = 0.22; // the car you look at turns this fast, radians a second

/** The camera, in the bay's frame (right, up, out from the drum), and how far right of centre the car sits. */
const CAM = { right: -5.0, up: 1.5, out: 5.5, lookUp: 0.7 };

/** The garage's look for the finishing (looks.ts): no haze, more bloom on the strips, a darker edge. */
const LOOK: SkyLook = {
  sunAngle: 0, exposure: 0.9, fog: 0, fogColor: 0x050607,
  grade: { haze: 0, hazeHeight: 60, contrast: 1.12, saturation: 1.06, warmth: 0.015, lift: [0.004, 0.005, 0.008], gain: [1, 1, 1.02], bloom: 0.32, glow: 0, vignette: 0.32 },
};

type Cover = { mesh: THREE.Mesh; pull: { value: number }; zMin: { value: number }; len: { value: number } };
type BayObj = Bay & {
  i: number; angle: number; accent: THREE.Color; size: THREE.Vector3;
  root: THREE.Group; // at the bay, +z out of the ring
  table: THREE.Group; // turns
  yaw: number; // the table's turn
  car: Car | null; loading: Promise<Car> | null;
  mats: [THREE.Material & { envMapIntensity: number }, number][]; // the car's own materials and their own reflection strength
  cover: Cover | null;
  ring: THREE.MeshBasicMaterial;
  lit: number; // how bright the bay stands, 0..1, eased to its state's
  lamps: number; // the running lamps' level, eased
  flash: number; // the reveal's added light, 0..1
};

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class Garage {
  scene = new THREE.Scene();
  /** CSS px on the left that the page's sign covers: the car is framed in the rest. */
  left = 280;
  /** Where the camera stands, in the bay's frame (right, up, out from the drum), and the height it looks at. */
  view = { ...CAM };
  private bays: BayObj[] = [];
  private byId = new Map<string, BayObj>();
  private sizes = new Map<string, THREE.Vector3>();
  private want = ""; // the bay looked at
  private key = new THREE.SpotLight(0xfff3e6, 0, 14, 0.62, 0.85, 2);
  private sweep = new THREE.SpotLight(0xdfeaff, 0, 16, 0.2, 0.6, 2);
  private mirror: Mirror;
  private env: THREE.Texture | null = null;
  private hidden: THREE.Object3D[] = []; // what the floor does not mirror (it and what lies flush on it)
  private disposables: { dispose(): void }[] = [];
  // the camera's orbit: the angle it is at and where it heads
  private cam = { angle: 0, from: 0, to: 0, t: 1, dur: 0.5 };
  private time = 0;
  private lastFrame = 0;
  private reveals: { bay: BayObj; t: number; done: () => void }[] = [];
  /** The showcase playing (showcase()): its bay, time, the way it sweeps round, where the camera was, and its beats. */
  private show: { bay: BayObj; t: number; dir: number; yaw0: number; from: { pos: THREE.Vector3; quat: THREE.Quaternion; fov: number }; beats: Set<Beat>; done: () => void } | null = null;
  private beatCbs: ((b: Beat) => void)[] = [];
  /** How far the room is dimmed for a showcase, 0..1 (eased). */
  private hush = 0;
  private glows: [THREE.MeshBasicMaterial, THREE.Color][] = [];
  private queue = false;
  private v = new THREE.Vector3();

  constructor(private r: Renderer) {
    this.mirror = new Mirror();
    this.scene.background = new THREE.Color(0x040506);
    this.scene.userData.look = LOOK;
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.bias = -0.0002;
    this.key.shadow.normalBias = 0.03;
    this.key.shadow.radius = 4;
    this.key.shadow.camera.near = 1;
    this.scene.add(this.key, this.key.target, this.sweep, this.sweep.target);
    // the floor's mirror and the live reflections of the car looked at (car.ts Reflections) see only its own
    // bay and the two beside it: the rest are too far off to tell apart there, and would double the draws
    const off: THREE.Object3D[] = [];
    this.scene.onBeforeRender = (_r, _s, camera) => {
      if (camera === this.r.camera) return;
      const at = this.byId.get(this.want);
      if (at) for (const b of this.bays) if (b.root.visible && this.dist(b, at) > 1) { b.root.visible = false; off.push(b.root); }
    };
    this.scene.onAfterRender = () => { for (const o of off) o.visible = true; off.length = 0; };
  }

  // ------------------------------------------------------------------ building

  async build(bays: Bay[]) {
    const order = new Map(CARS.map((c, i) => [c.id, i]));
    const list = [...bays].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
    const info: { id: string; size: [number, number, number] }[] = await fetch("./cars/cars.json").then((r) => r.json());
    for (const c of info) this.sizes.set(c.id, new THREE.Vector3(...c.size));

    // the bays round the ring, a wider step between two classes
    let a = 0, cls = "";
    const span: Record<string, [number, number]> = {};
    list.forEach((b, i) => {
      const car = CARS.find((c) => c.id === b.id);
      const k = car ? classOf(car).id : "city";
      if (i > 0) a += STEP + (k !== cls ? GAP : 0);
      cls = k;
      (span[k] ??= [a, a])[1] = a;
      const root = new THREE.Group(), table = new THREE.Group();
      root.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      root.rotation.y = a;
      root.add(table);
      this.scene.add(root);
      const ring = new THREE.MeshBasicMaterial({ color: 0 });
      const bay: BayObj = { ...b, i, angle: a, accent: new THREE.Color(ACCENT[k]), size: this.sizes.get(b.id)?.clone() ?? new THREE.Vector3(1.9, 1.4, 4.5), root, table, yaw: PARK, car: null, loading: null, mats: [], cover: null, ring, lit: 0, lamps: 0, flash: 0 };
      this.bays.push(bay);
      this.byId.set(b.id, bay);
      this.tableFor(bay);
      if (b.state === "locked") this.coverFor(bay, null);
      bay.lit = this.litFor(bay);
    });
    this.room(span);

    // where to look first: the bay asked for, else the first one owned
    const first = this.byId.get(this.want) ?? this.bays.find((b) => b.state === "owned") ?? this.bays[0];
    this.want = first.id;
    this.cam.angle = this.cam.from = this.cam.to = first.angle;

    // the room's light, baked from where the cars stand (no car in it yet)
    // (the spot's shadow map made first: a light's shadow sampled before its map exists is a GL error)
    this.r.gl.shadowMap.needsUpdate = true;
    const pmrem = new THREE.PMREMGenerator(this.r.gl);
    const rt = pmrem.fromScene(this.scene, 0.02, 0.1, 80, { size: 256, position: new THREE.Vector3(Math.sin(first.angle) * (R + 1), 1.3, Math.cos(first.angle) * (R + 1)) });
    pmrem.dispose();
    this.env = rt.texture;
    this.disposables.push(rt);
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 1;

    // the car looked at and its neighbours before anything is shown, then the rest as they come
    const near = this.bays.filter((b) => this.dist(b, first) <= 1);
    await Promise.all(near.map((b) => this.load(b)));
    this.place(0);
    this.r.upload(this.scene);
    await this.r.warm(this.scene);
    this.mirror.update(this.r, this.scene, this.hidden);
    this.pump();
  }

  /** Bays apart, round the ring. */
  private dist(a: BayObj, b: BayObj) { const n = this.bays.length, d = Math.abs(a.i - b.i); return Math.min(d, n - d); }

  /** Load the cars nearest the one looked at first, one at a time with a breath between (each is a few
   *  frames' work on the main thread), until all are in. */
  private pump() {
    if (this.queue) return;
    this.queue = true;
    const next = () => {
      const at = this.byId.get(this.want)!;
      const left = this.bays.filter((b) => !b.loading).sort((x, y) => this.dist(x, at) - this.dist(y, at));
      if (!left.length) { this.queue = false; return; }
      // not while the camera glides or a car is revealed: a hitch shows most then
      if (this.cam.t < 1 || this.reveals.length || this.show) { setTimeout(next, 120); return; }
      this.load(left[0]).finally(() => setTimeout(next, 60));
    };
    next();
  }

  private load(bay: BayObj): Promise<Car> {
    return (bay.loading ??= (async () => {
      const car = await Car.load(bay.id, bay.paint);
      car.root.updateMatrixWorld(true);
      if (bay.cover) this.coverFor(bay, car); // the cover fitted to the real car
      // its own copies of the materials it shares with other cars of its model, so dimming this one dims only it
      const seen = new Map<THREE.Material, THREE.Material>();
      car.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const own = (x: THREE.Material) => {
          const s = x as THREE.MeshStandardMaterial;
          if (!s.isMeshStandardMaterial) return x;
          if ((s as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) { if (!seen.has(x)) { seen.set(x, x); bay.mats.push([s, s.envMapIntensity]); } return x; } // paint and glass are the car's own already
          let c = seen.get(x);
          if (!c) {
            c = Object.assign(s.clone(), { onBeforeCompile: s.onBeforeCompile, customProgramCacheKey: s.customProgramCacheKey });
            // the room's light as its own map: three reads a material's envMapIntensity only then (lit by the
            // scene's environment it takes the scene's intensity), and dimming a bay is that intensity
            (c as THREE.MeshStandardMaterial).envMap ??= this.env;
            seen.set(x, c);
            bay.mats.push([c as THREE.MeshStandardMaterial, s.envMapIntensity]);
          }
          return c;
        };
        m.material = Array.isArray(m.material) ? m.material.map(own) : own(m.material);
      });
      car.setShadow(false);
      // its shaders before it is shown, as it draws both lit by the room and mirroring it live
      await this.r.reflections.warm(() => this.r.gl.compileAsync(car.root, this.r.camera, this.scene));
      this.r.upload(car.root as unknown as THREE.Scene);
      bay.car = car;
      car.root.rotation.y = 0;
      bay.table.add(car.root);
      this.apply(bay, true);
      return car;
    })());
  }

  /** The turntable: a dark steel disc flush with the floor, a thin ring of the class's colour round it. */
  private tableFor(bay: BayObj) {
    const disc = new THREE.Mesh(this.geo("disc", () => new THREE.CircleGeometry(TABLE, 72).rotateX(-Math.PI / 2)), this.mat("disc", () => {
      const m = floorMaterial(this.mirror, 0x15171b, 0.24, 0.55);
      return m;
    }));
    disc.position.y = 0.004;
    disc.receiveShadow = true;
    // the table's seams: a few radial lines that show it turning
    const seams = new THREE.Mesh(this.geo("seams", () => {
      const g: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 4; i++) g.push(new THREE.PlaneGeometry(0.012, TABLE * 2 - 0.08).rotateX(-Math.PI / 2).rotateY((i * Math.PI) / 4));
      g.push(new THREE.RingGeometry(TABLE - 0.12, TABLE - 0.1, 96).rotateX(-Math.PI / 2));
      return merge(g);
    }), this.mat("seams", () => new THREE.MeshBasicMaterial({ color: 0x050607, transparent: true, opacity: 0.6, depthWrite: false })));
    seams.position.y = 0.006;
    const ring = new THREE.Mesh(this.geo("ring", () => new THREE.RingGeometry(TABLE + 0.03, TABLE + 0.085, 128).rotateX(-Math.PI / 2)), bay.ring);
    ring.position.y = 0.006;
    bay.table.add(disc, seams);
    bay.root.add(ring);
    this.hidden.push(disc, seams, ring);
  }

  private geos = new Map<string, THREE.BufferGeometry>();
  private mats = new Map<string, THREE.Material>();
  private geo(k: string, make: () => THREE.BufferGeometry) { let g = this.geos.get(k); if (!g) { g = make(); this.geos.set(k, g); this.disposables.push(g); } return g; }
  private mat<T extends THREE.Material>(k: string, make: () => T): T { let m = this.mats.get(k) as T | undefined; if (!m) { m = make(); this.mats.set(k, m); this.disposables.push(m); } return m; }

  /** A cloth cover over the bay's car: fitted to its real shape once loaded, to a car of its size till then. */
  private coverFor(bay: BayObj, car: Car | null) {
    const geo = drape(car ? carField(car) : boxField(bay.size), bay.i * 7.13);
    const old = bay.cover;
    if (old) { old.mesh.geometry.dispose(); old.mesh.geometry = geo; return; }
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const pull = { value: 0 }, zMin = { value: bb.min.z }, len = { value: bb.max.z - bb.min.z };
    const m = clothMaterial(pull, zMin, len);
    this.disposables.push(m);
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = false; mesh.receiveShadow = true;
    bay.table.add(mesh);
    bay.cover = { mesh, pull, zMin, len };
  }

  /** The room: the floor, the drum with its strips and the classes' names, the ceiling's lights, the outer wall. */
  private room(span: Record<string, [number, number]>) {
    const S = this.scene, add = (o: THREE.Object3D) => { S.add(o); return o; };
    const glow = (c: THREE.ColorRepresentation, k: number) => {
      const m = this.keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }));
      this.glows.push([m, m.color.clone()]);
      return m;
    };

    // the floor: dark polished resin, mirroring what stands on it
    const floor = add(new THREE.Mesh(this.keep(new THREE.CircleGeometry(OUTER, 128).rotateX(-Math.PI / 2)), floorMaterial(this.mirror, 0x0a0b0d, 0.34, 1))) as THREE.Mesh;
    floor.receiveShadow = true;
    this.hidden.push(floor);

    // painted lines: a lane line round the front of the tables, the bays' dividers, each class's coloured edge
    const paint: THREE.BufferGeometry[] = [];
    paint.push(arcStrip(DRUM + 0.5, 0.05, 0, Math.PI * 2, 256));
    for (let i = 0; i <= this.bays.length; i++) {
      const b = this.bays[Math.min(i, this.bays.length - 1)], prev = this.bays[i - 1];
      if (i > 0 && i < this.bays.length && classOf(CARS.find((c) => c.id === b.id)!) !== classOf(CARS.find((c) => c.id === prev.id)!)) continue;
      const a = i === 0 ? b.angle - STEP / 2 : i === this.bays.length ? b.angle + STEP / 2 : (prev.angle + b.angle) / 2;
      paint.push(radial(a, DRUM + 0.9, R + TABLE + 0.6, 0.035));
    }
    const lines = add(new THREE.Mesh(this.keep(merge(paint)), this.keep(new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 })))) as THREE.Mesh;
    lines.position.y = 0.003; lines.receiveShadow = true;
    this.hidden.push(lines);

    // the drum: dark panels, a white slit between every two bays, a strip of the class's colour along its foot,
    // a cove of light round its top, and each class's name over its bays
    const drumMat = this.keep(new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.55, metalness: 0.3 }));
    add(new THREE.Mesh(this.keep(new THREE.CylinderGeometry(DRUM, DRUM, CEIL, 160, 1, true)), drumMat)).position.y = CEIL / 2;
    // panel grooves
    const grooves: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2; grooves.push(new THREE.PlaneGeometry(0.025, CEIL - 0.6).translate(0, CEIL / 2 - 0.1, DRUM + 0.004).rotateY(a)); }
    add(new THREE.Mesh(this.keep(merge(grooves)), this.keep(new THREE.MeshBasicMaterial({ color: 0x020203 }))));
    const slits: THREE.BufferGeometry[] = [];
    for (let i = 0; i < this.bays.length - 1; i++) slits.push(new THREE.BoxGeometry(0.05, 2.6, 0.04).translate(0, 1.75, DRUM + 0.02).rotateY((this.bays[i].angle + this.bays[i + 1].angle) / 2));
    add(new THREE.Mesh(this.keep(merge(slits)), glow(0xdfe8ff, 2.2)));
    add(new THREE.Mesh(this.keep(new THREE.CylinderGeometry(DRUM + 0.06, DRUM + 0.06, 0.08, 160, 1, true)), glow(0xfff1df, 5))).position.y = CEIL - 0.55;
    for (const [k, [a0, a1]] of Object.entries(span)) {
      const accent = new THREE.Color(ACCENT[k]);
      const strip = add(new THREE.Mesh(this.keep(arcBand(DRUM + 0.03, 0.06, a0 - STEP / 2 + 0.03, a1 + STEP / 2 - 0.03)), glow(accent, 2.4)));
      strip.position.y = 0.32;
      const floorLine = add(new THREE.Mesh(this.keep(arcStrip(R + TABLE + 0.45, 0.07, a0 - STEP / 2 + 0.02, a1 + STEP / 2 - 0.02, 64)), glow(accent, 0.6))) as THREE.Mesh;
      floorLine.position.y = 0.004;
      this.hidden.push(floorLine);
      const name = CLASSES.find((c) => c.id === k)!.name;
      const label = add(new THREE.Mesh(this.keep(new THREE.PlaneGeometry(3.2, 0.8)), this.keep(new THREE.MeshBasicMaterial({ map: this.keep(nameTexture(name, accent)), transparent: true, depthWrite: false }))));
      const am = (a0 + a1) / 2;
      label.position.set(Math.sin(am) * (DRUM + 0.03), 3.6, Math.cos(am) * (DRUM + 0.03));
      label.rotation.y = am;
    }

    // the ceiling: dark, a ring of light over the tables and a soft panel over each
    const ceil = add(new THREE.Mesh(this.keep(new THREE.RingGeometry(DRUM, OUTER, 128, 1).rotateX(Math.PI / 2)), this.keep(new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.9 }))));
    ceil.position.y = CEIL;
    const rings = add(new THREE.Mesh(this.keep(merge([arcStrip(R - 1.4, 0.16, 0, Math.PI * 2, 256), arcStrip(R + 1.4, 0.16, 0, Math.PI * 2, 256)]).rotateX(Math.PI)), glow(0xffffff, 6)));
    rings.position.y = CEIL - 0.02;
    const boxes: THREE.BufferGeometry[] = [];
    for (const b of this.bays) boxes.push(new THREE.PlaneGeometry(2.0, 3.6).rotateX(Math.PI / 2).translate(0, CEIL - 0.03, 0).rotateY(b.angle).translate(b.root.position.x, 0, b.root.position.z));
    add(new THREE.Mesh(this.keep(merge(boxes)), glow(0xfff6ea, 3.2)));

    // the outer wall, behind the camera: what the cars' paint mirrors on that side
    const outer = this.keep(new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.7, side: THREE.BackSide }));
    add(new THREE.Mesh(this.keep(new THREE.CylinderGeometry(OUTER, OUTER, CEIL, 128, 1, true)), outer)).position.y = CEIL / 2;
    const tall: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 40; i++) tall.push(new THREE.PlaneGeometry(0.5, CEIL - 1.2).translate(0, CEIL / 2, -(OUTER - 0.05)).rotateY((i / 40) * Math.PI * 2));
    add(new THREE.Mesh(this.keep(merge(tall)), glow(0xeef2ff, 1.6)));
    add(new THREE.Mesh(this.keep(new THREE.CylinderGeometry(OUTER - 0.05, OUTER - 0.05, 0.1, 128, 1, true)), glow(0xffe8d0, 2.5))).position.y = 0.4;
    // the drum's top, seen only in reflections
    add(new THREE.Mesh(this.keep(new THREE.CircleGeometry(DRUM, 64).rotateX(Math.PI / 2)), this.keep(new THREE.MeshBasicMaterial({ color: 0x050506 })))).position.y = CEIL;
  }

  private keep<T extends { dispose(): void }>(x: T): T { this.disposables.push(x); return x; }

  // ------------------------------------------------------------------ state

  focus(id: string, instant = false) {
    const bay = this.byId.get(id);
    this.want = id;
    if (!bay) return;
    this.pump();
    const c = this.cam;
    const to = c.angle + wrap(bay.angle - c.angle);
    if (instant) { c.angle = c.from = c.to = to; c.t = 1; this.r.finish.cut = true; return; }
    c.from = c.angle; c.to = to; c.t = 0;
    c.dur = 0.45 + Math.min(0.55, Math.abs(to - c.angle) * 0.9);
  }

  setState(id: string, state: Bay["state"]) {
    const bay = this.byId.get(id);
    if (!bay || bay.state === state) return;
    bay.state = state;
    if (state === "locked" && !bay.cover) { this.coverFor(bay, bay.car); bay.cover!.pull.value = 0; }
    if (state !== "locked" && bay.cover) { bay.cover.mesh.removeFromParent(); bay.cover.mesh.geometry.dispose(); bay.cover = null; }
    this.apply(bay, true);
  }

  /** A car just bought or won: its cover pulled off (if it has one), the bay's light coming up with a sweep
   *  across the car, its lamps flashing on. It stands owned after. */
  async reveal(id: string) {
    const bay = this.byId.get(id);
    if (!bay) return;
    await this.load(bay);
    bay.state = "owned";
    if (bay.car) bay.car.root.visible = true;
    await new Promise<void>((done) => this.reveals.push({ bay, t: 0, done }));
  }

  /** Whether a showcase is playing. */
  get showing() { return !!this.show; }

  /** Be told each beat of a showcase as it comes; returns the way to stop being told. */
  onBeat(cb: (b: Beat) => void) {
    this.beatCbs.push(cb);
    return () => { this.beatCbs = this.beatCbs.filter((x) => x !== cb); };
  }

  /** A new car's moment (~4 s), for a car just bought or won, in place of reveal(): the room dims to a spot on
   *  it, the camera leaves its place and flies low and slow round the car (front three-quarter, side, rear
   *  three-quarter) as its table turns it to face the arc; its cover comes off as it starts, a light runs down
   *  the body, the headlamps flash and its class ring flares; then the camera settles back to the bay's usual
   *  framing. It stands owned after. Resolves when settled (or skipped). */
  async showcase(id: string) {
    const bay = this.byId.get(id);
    if (!bay) return;
    this.skip();
    await this.load(bay);
    bay.state = "owned";
    // the car drawn for a couple of frames under its cover before anything moves: its first draws (the shadow's
    // shapes, the textures' first use) cost a frame's time, paid here where nothing is seen to stall
    if (bay.car) bay.car.root.visible = true;
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    // the bay becomes the one looked at; the camera flies from wherever it stands now
    this.want = id;
    const c = this.cam, cam = this.r.camera;
    c.angle = c.from = c.to = c.angle + wrap(bay.angle - c.angle); c.t = 1;
    // the arc starts on the camera's side (left of the bay, seen from outside) and runs right: the table turns
    // the car nose left to meet it
    const dir = 1;
    await new Promise<void>((done) => {
      this.show = { bay, t: 0, dir, yaw0: bay.yaw, from: { pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: cam.fov }, beats: new Set(), done };
    });
  }

  /** End a showcase at once, as it ends: the cover gone, the light back, the camera at the bay's framing. */
  skip() {
    const sh = this.show;
    if (!sh) return;
    const b = sh.bay;
    if (b.cover) { b.cover.mesh.removeFromParent(); b.cover.mesh.geometry.dispose(); b.cover = null; }
    b.flash = 0; this.sweep.intensity = 0; this.hush = 0;
    b.yaw = wrap(sh.dir * -Math.PI / 2);
    this.show = null;
    this.r.finish.cut = true;
    this.apply(b, true);
    this.beat(sh, "settle");
    sh.done();
  }

  private beat(sh: NonNullable<Garage["show"]>, b: Beat) {
    if (sh.beats.has(b)) return;
    sh.beats.add(b);
    for (const cb of this.beatCbs) try { cb(b); } catch (e) { console.error("garage: beat", e); }
  }

  paint(id: string, color: string) {
    const bay = this.byId.get(id);
    if (!bay) return;
    bay.paint = color;
    bay.car?.setColor(color);
  }

  /** How bright a bay stands in its state. */
  private litFor(b: BayObj) { return b.state === "owned" ? 1 : b.state === "for-sale" ? 0.5 : 0.4; }

  /** The bay's state on its car and cover; `now` without easing. */
  private apply(b: BayObj, now = false) {
    if (b.car) b.car.root.visible = !b.cover || b.cover.pull.value > 0;
    if (now) { b.lit = this.litFor(b); b.lamps = b.state === "owned" ? 1 : 0; }
    this.dim(b);
  }

  private dim(b: BayObj) {
    const shown = this.show?.bay === b;
    const k = Math.min(1.6, b.lit + b.flash * 0.6) * (shown ? 1 + 0.3 * this.hush : 1 - 0.6 * this.hush);
    for (const [m, base] of b.mats) m.envMapIntensity = base * k;
    if (b.car) {
      const l = b.lamps;
      b.car.light("head", 0.1 * l + b.flash * 1.2);
      b.car.light("brake", 0.08 * l);
    }
  }

  // ------------------------------------------------------------------ each frame

  frame(dt: number) {
    const now = performance.now();
    if (now - this.lastFrame > 400) this.r.finish.cut = true; // back from somewhere else: no blur across it
    this.lastFrame = now;
    this.time += dt;
    const focus = this.byId.get(this.want);

    // the camera's orbit, eased in and out
    const c = this.cam;
    if (c.t < 1) { c.t = Math.min(1, c.t + dt / c.dur); const e = c.t < 0.5 ? 4 * c.t ** 3 : 1 - (-2 * c.t + 2) ** 3 / 2; c.angle = c.from + (c.to - c.from) * e; }
    this.place(dt);

    // the bays out of sight behind the drum are not drawn (nor mirrored, nor in the car's reflections)
    const cp = this.r.camera.position;
    for (const b of this.bays) {
      const p = b.root.position, dx = p.x - cp.x, dz = p.z - cp.z, t = Math.max(0, Math.min(1, -(cp.x * dx + cp.z * dz) / (dx * dx + dz * dz)));
      b.root.visible = Math.hypot(cp.x + dx * t, cp.z + dz * t) > DRUM - 3;
    }

    // the bays: the one looked at turns, the others turn back to parked; light and lamps ease to their state
    for (const b of this.bays) {
      if (this.show?.bay === b) { /* the showcase turns it */ }
      else if (b === focus) b.yaw += SPIN * dt;
      else { const d = wrap(PARK - b.yaw); b.yaw += d * Math.min(1, dt * 2.2); }
      b.table.rotation.y = b.yaw;
      const lit = this.litFor(b) + (b === focus ? 0.12 : 0), lamps = b.state === "owned" ? 1 : 0;
      const k = Math.min(1, dt * 4);
      const was = b.lit + b.lamps + b.flash;
      b.lit += (lit - b.lit) * k; b.lamps += (lamps - b.lamps) * k;
      if (Math.abs(was - b.lit - b.lamps - b.flash) > 1e-4 || this.hush > 0) this.dim(b);
      const ring = b.state === "owned" ? 2.4 : b.state === "for-sale" ? 0.9 : 0.35;
      b.ring.color.copy(b.accent).multiplyScalar((ring * (b === focus ? 1.5 : 1) + b.flash * (this.show?.bay === b ? 3.5 : 6)) * (this.show?.bay === b ? 1 : 1 - 0.75 * this.hush));
      b.car?.setShadow(b === focus);
      if (b.cover) b.cover.mesh.castShadow = b === focus;
    }

    // reveals
    for (const rv of [...this.reveals]) {
      rv.t += dt;
      this.uncover(rv.bay, rv.t);
      this.lightUp(rv.bay, rv.t, 90);
      if (rv.t >= 1.25) { rv.bay.flash = 0; this.sweep.intensity = 0; this.dim(rv.bay); this.reveals.splice(this.reveals.indexOf(rv), 1); rv.done(); }
    }

    // the showcase: its light and the room dimmed round it (the camera is placed below)
    const sh = this.show;
    this.hush += ((sh && sh.t < SHOW.settle ? 1 : 0) - this.hush) * Math.min(1, dt * (sh && sh.t < SHOW.settle ? 3 : 2.2));
    if (this.hush < 1e-3) this.hush = 0;
    if (sh) {
      sh.t += dt;
      const t = sh.t, b = sh.bay;
      if (t >= SHOW.cover) { this.beat(sh, "reveal"); this.uncover(b, t - SHOW.cover); }
      if (t >= SHOW.sweep) this.beat(sh, "sweep");
      if (t >= SHOW.light) this.lightUp(b, t - SHOW.light, 120, 1.35);
      if (t >= SHOW.settle) this.beat(sh, "settle");
      // the table turns the car to face the arc, then drifts on with it
      b.yaw = sh.yaw0 + wrap(sh.dir * -Math.PI / 2 - sh.yaw0) * ease(t / 1.3) + sh.dir * 0.05 * Math.max(0, t - 1.3);
      b.table.rotation.y = b.yaw;
      if (t >= SHOW.end) {
        b.flash = 0; this.sweep.intensity = 0;
        this.show = null;
        this.dim(b);
        sh.done();
      }
    }
    for (const [m, c] of this.glows) m.color.copy(c).multiplyScalar(1 - 0.65 * this.hush);
    this.scene.environmentIntensity = 1 - 0.5 * this.hush;
    LOOK.grade.vignette = 0.32 + 0.16 * this.hush;

    // the key light over the bay looked at; for a showcase a tighter, brighter spot from in front
    if (focus) {
      const p = focus.root.position;
      this.key.target.position.copy(p);
      this.key.position.set(p.x, CEIL - 0.4, p.z).addScaledVector(this.v.set(Math.sin(focus.angle), 0, Math.cos(focus.angle)), -0.6 + 1.6 * this.hush);
      this.key.intensity = 45 + 45 * this.hush;
      this.key.angle = 0.62 - 0.12 * this.hush;
    }
    if (this.show) this.fly(this.show);

    // draw: the mirror under the floor, then the room through the finishing at the garage's exposure
    const gl = this.r.gl, exposure = gl.toneMappingExposure;
    gl.toneMappingExposure = LOOK.exposure;
    this.mirror.update(this.r, this.scene, this.hidden);
    this.r.render(this.scene, {});
    gl.toneMappingExposure = exposure;
  }

  /** A cover coming off, `t` seconds in. */
  private uncover(b: BayObj, t: number) {
    if (!b.cover) return;
    b.cover.pull.value = Math.min(1, t / 0.85);
    if (t >= 0.85) { b.cover.mesh.removeFromParent(); b.cover.mesh.geometry.dispose(); b.cover = null; }
  }

  /** The light coming up on a car, `t` seconds in: the bay's flash (headlamps, ring), and a narrow light run
   *  over the car from its nose to its tail; `slow` stretches it. */
  private lightUp(b: BayObj, t: number, power: number, slow = 1) {
    t /= slow;
    b.flash = Math.max(0, Math.sin(Math.min(1, Math.max(0, (t - 0.35) / 0.85)) * Math.PI)) ** 1.5;
    this.dim(b);
    const s = ease((t - 0.3) / 0.8);
    const fwd = this.v.set(Math.sin(b.yaw), 0, Math.cos(b.yaw)).applyQuaternion(b.root.quaternion);
    const half = b.size.z * 0.75;
    b.root.getWorldPosition(this.sweep.target.position).addScaledVector(fwd, half - 2 * half * s);
    this.sweep.position.copy(this.sweep.target.position).add(this.v.set(0, 4.2, 0));
    this.sweep.intensity = power * Math.max(0, Math.sin(Math.min(1, Math.max(0, (t - 0.25) / 0.95)) * Math.PI));
  }

  /** The showcase's camera: from where it stood round into a low arc about the car, then round into the bay's
   *  framing (which place() has just set). Every leg is an orbit about the bay (angle, distance, height, and
   *  the point looked at blended), so the camera never cuts across the car. */
  private fly(sh: NonNullable<Garage["show"]>) {
    const cam = this.r.camera, t = sh.t, b = sh.bay, a = b.angle;
    const out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), right = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const centre = b.root.position;
    // a pose as (angle from straight out, distance, height, the point looked at)
    type Pose = { beta: number; dist: number; h: number; look: THREE.Vector3; fov: number };
    const pose = (pos: THREE.Vector3, quat: THREE.Quaternion, fov: number): Pose => {
      const rel = pos.clone().sub(centre), x = rel.dot(right), z = rel.dot(out), dist = Math.hypot(x, z);
      const look = pos.clone().add(new THREE.Vector3(0, 0, -1).applyQuaternion(quat).multiplyScalar(dist));
      return { beta: Math.atan2(x, z), dist, h: pos.y, look, fov };
    };
    // the arc: -58 to +58 degrees round from the camera's side, closing in at the side view and rising a little
    const u = ease((t - 0.2) / (SHOW.settle + 0.5 - 0.2));
    const arc: Pose = { beta: THREE.MathUtils.degToRad(-58 + 116 * u), dist: 7.2 - 1.1 * Math.sin(u * Math.PI) - 0.3 * u, h: 0.6 + 0.45 * u, look: new THREE.Vector3(centre.x, 0.5 + 0.1 * u, centre.z), fov: 34 };
    const from = pose(sh.from.pos, sh.from.quat, sh.from.fov), settled = pose(cam.position, cam.quaternion, cam.fov);
    const into = ease(t / 1.0), back = ease((t - SHOW.settle) / (SHOW.end - SHOW.settle));
    const mix = (p: Pose, q: Pose, k: number): Pose => ({ beta: p.beta + wrap(q.beta - p.beta) * k, dist: p.dist + (q.dist - p.dist) * k, h: p.h + (q.h - p.h) * k, look: p.look.clone().lerp(q.look, k), fov: p.fov + (q.fov - p.fov) * k });
    const m = mix(mix(from, arc, into), settled, back);
    cam.position.copy(centre).addScaledVector(out, Math.cos(m.beta) * m.dist).addScaledVector(right, Math.sin(m.beta) * m.dist).setY(m.h);
    cam.lookAt(m.look);
    cam.fov = m.fov;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  /** The camera where the orbit has it: outside the ring, left of the bay, the car framed right of the sign. */
  private place(dt: number) {
    const cam = this.r.camera, a = this.cam.angle;
    cam.fov = 42; cam.near = 0.1; cam.far = 200;
    cam.updateProjectionMatrix();
    const out = this.v.set(Math.sin(a), 0, Math.cos(a)), right = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const bay = new THREE.Vector3(out.x * R, 0, out.z * R);
    // a slow breath, so the room is never a still picture
    const sway = Math.sin(this.time * 0.35) * 0.12, bob = Math.sin(this.time * 0.27) * 0.04;
    const V = this.view;
    cam.position.copy(bay).addScaledVector(right, V.right + sway).addScaledVector(out, V.out).setY(V.up + bob);
    // look so the car lands mid-way across what the sign leaves free, a little below centre
    const target = new THREE.Vector3(bay.x, V.lookUp, bay.z);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    const w = this.r.gl.domElement.clientWidth || innerWidth;
    const ndc = Math.min(0.6, Math.max(0, ((this.left + (w - this.left) / 2) / w) * 2 - 1));
    const tanX = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect;
    cam.rotateY(Math.atan(ndc * tanX));
    cam.rotateX(-0.04);
    cam.updateMatrixWorld();
    void dt;
  }

  labels() {
    const cam = this.r.camera, el = this.r.gl.domElement, w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
    const fwd = cam.getWorldDirection(new THREE.Vector3());
    // the bays round the one looked at: further ones stand too small and too close together for a tag
    const at = this.byId.get(this.want), near = (b: BayObj) => !at || this.dist(b, at) <= 1;
    return this.bays.map((b) => {
      const p = b.root.localToWorld(new THREE.Vector3(0, b.size.y + 0.45, 0));
      const ahead = p.clone().sub(cam.position).dot(fwd) > 0.5;
      // behind the drum: the line from the camera to the tag passes through it
      const c = cam.position, dx = p.x - c.x, dz = p.z - c.z, t = Math.max(0, Math.min(1, -(c.x * dx + c.z * dz) / (dx * dx + dz * dz)));
      const hid = Math.hypot(c.x + dx * t, c.z + dz * t) < DRUM;
      p.project(cam);
      const x = (p.x + 1) / 2 * w, y = (1 - p.y) / 2 * h;
      return { id: b.id, x, y, visible: !this.show && near(b) && ahead && !hid && p.x > -1.02 && p.x < 1.02 && p.y > -1 && p.y < 1.02 };
    });
  }

  dispose() {
    for (const b of this.bays) b.car?.dispose();
    for (const d of this.disposables) d.dispose();
    for (const g of this.geos.values()) g.dispose();
    this.mirror.dispose();
    this.skip();
    for (const rv of this.reveals) rv.done();
    this.reveals = [];
    this.bays = [];
    this.byId.clear();
  }
}

// ---------------------------------------------------------------------------- the floor's mirror

/** What is above the floor seen from under it, at half resolution: the floor (and the tables, flush with it)
 *  sample it through `matrix`, blurred by its mip levels. */
class Mirror {
  target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  cam = new THREE.PerspectiveCamera();
  matrix = new THREE.Matrix4();
  uniforms = { tMirror: { value: this.target.texture as THREE.Texture | null }, uMirrorM: { value: this.matrix } };
  private size = new THREE.Vector2();
  private v = new THREE.Vector3();

  update(r: Renderer, scene: THREE.Scene, hidden: THREE.Object3D[]) {
    const gl = r.gl, cam = r.camera;
    gl.getDrawingBufferSize(this.size);
    const W = Math.max(1, this.size.x >> 1), H = Math.max(1, this.size.y >> 1);
    if (this.target.width !== W || this.target.height !== H) this.target.setSize(W, H);
    cam.updateMatrixWorld();
    // the camera reflected in the floor (y = 0): its position, where it looks and its up
    this.cam.position.copy(cam.position).setY(-cam.position.y);
    const look = this.v.set(0, 0, -1).applyQuaternion(cam.quaternion).add(cam.position);
    look.y = -look.y;
    this.cam.up.set(0, 1, 0).applyQuaternion(cam.quaternion); this.cam.up.y = -this.cam.up.y;
    this.cam.lookAt(look);
    this.cam.projectionMatrix.copy(cam.projectionMatrix);
    this.cam.projectionMatrixInverse.copy(cam.projectionMatrixInverse);
    this.cam.updateMatrixWorld();
    this.matrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(this.cam.projectionMatrix).multiply(this.cam.matrixWorldInverse);
    const vis = hidden.map((o) => o.visible);
    for (const o of hidden) o.visible = false;
    const last = gl.getRenderTarget(), auto = gl.shadowMap.needsUpdate;
    gl.shadowMap.needsUpdate = false;
    gl.setRenderTarget(this.target);
    gl.clear();
    gl.render(scene, this.cam);
    gl.setRenderTarget(last);
    gl.shadowMap.needsUpdate = auto;
    hidden.forEach((o, i) => (o.visible = vis[i]));
  }

  dispose() { this.target.dispose(); }
}

/** Polished resin: a dark standard material that adds the mirror (by Fresnel, times `amount`), a little
 *  blurred and broken up by a faint grain. */
function floorMaterial(mirror: Mirror, color: number, roughness: number, amount: number) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, envMapIntensity: 0.45 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, mirror.uniforms, { uMirrorAmt: { value: amount } });
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform mat4 uMirrorM; varying vec4 vMirror; varying vec2 vFloor;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvec4 mw = modelMatrix * vec4(transformed, 1.0); vMirror = uMirrorM * mw; vFloor = mw.xz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform sampler2D tMirror; uniform float uMirrorAmt; varying vec4 vMirror; varying vec2 vFloor;
        float fh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float fn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(fh(i), fh(i + vec2(1, 0)), f.x), mix(fh(i + vec2(0, 1)), fh(i + vec2(1, 1)), f.x), f.y); }`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nfloat grain = fn(vFloor * 1.3) * 0.6 + fn(vFloor * 5.0) * 0.4; roughnessFactor = clamp(roughnessFactor + (grain - 0.5) * 0.18, 0.04, 1.0);")
      .replace("#include <opaque_fragment>", `
        vec2 muv = vMirror.xy / vMirror.w + (vec2(fn(vFloor * 3.0), fn(vFloor * 3.0 + 7.0)) - 0.5) * 0.0015;
        // a soft blur: 8 taps on a disc at the first mip level, a little wider for the grain
        vec3 mir = vec3(0.0);
        float rot = fh(gl_FragCoord.xy) * 6.2832;
        vec2 px = 1.0 / vec2(textureSize(tMirror, 0));
        for (int i = 0; i < 8; i++) {
          float a = rot + float(i) * 2.39996, rr = sqrt((float(i) + 0.5) / 8.0) * (2.5 + 2.0 * grain);
          mir += textureLod(tMirror, muv + vec2(cos(a), sin(a)) * rr * px, 1.0).rgb;
        }
        mir /= 8.0; mir = mir / (1.0 + 0.8 * mir); // bright lights come back soft, not as white shapes on the floor
        float nv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        float fr = 0.05 + 0.95 * pow(1.0 - nv, 5.0);
        outgoingLight += mir * fr * uMirrorAmt * (1.15 - grain * 0.4);
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => "garage-floor";
  return m;
}

// ---------------------------------------------------------------------------- the cover

/** A height field over a car seen from above, in its own frame: cells of 5 cm, a margin round it. */
type Field = { x0: number; z0: number; nx: number; nz: number; cell: number; h: Float32Array };
const CELL = 0.05, MARGIN = 0.55;

function field(w: number, l: number): Field {
  const nx = Math.ceil((w + 2 * MARGIN) / CELL), nz = Math.ceil((l + 2 * MARGIN) / CELL);
  return { x0: -(nx * CELL) / 2, z0: -(nz * CELL) / 2, nx, nz, cell: CELL, h: new Float32Array(nx * nz) };
}

/** The top of the real car: every triangle's height, the highest in each cell. */
function carField(car: Car): Field {
  // its parts' triangles in the car's frame (not its contact patch, shadow shapes or headlamp beams)
  car.root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(car.root.matrixWorld).invert(), mw = new THREE.Matrix4(), v = new THREE.Vector3();
  const tris: Float32Array[] = [], box = new THREE.Box3();
  car.root.traverse((o) => {
    const m = o as THREE.Mesh, type = (m.material as THREE.Material)?.type;
    if (!m.isMesh || !m.visible || type === "MeshBasicMaterial" || type === "ShaderMaterial") return;
    mw.multiplyMatrices(inv, m.matrixWorld);
    const pos = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : pos.count;
    const t = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { v.fromBufferAttribute(pos, idx ? idx.getX(k) : k).applyMatrix4(mw); v.toArray(t, k * 3); box.expandByPoint(v); }
    tris.push(t);
  });
  const f = field(Math.max(-box.min.x, box.max.x) * 2, Math.max(-box.min.z, box.max.z) * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const t of tris) for (let k = 0; k + 8 < t.length; k += 9) raster(f, a.fromArray(t, k), b.fromArray(t, k + 3), c.fromArray(t, k + 6));
  return settle(f);
}

/** One triangle into the field: in every cell its centre is over, the triangle's height there. */
function raster(f: Field, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
  const cx = (x: number) => (x - f.x0) / f.cell - 0.5, cz = (z: number) => (z - f.z0) / f.cell - 0.5;
  const ax = cx(a.x), az = cz(a.z), bx = cx(b.x), bz = cz(b.z), qx = cx(c.x), qz = cz(c.z);
  const i0 = Math.max(0, Math.floor(Math.min(ax, bx, qx))), i1 = Math.min(f.nx - 1, Math.ceil(Math.max(ax, bx, qx)));
  const j0 = Math.max(0, Math.floor(Math.min(az, bz, qz))), j1 = Math.min(f.nz - 1, Math.ceil(Math.max(az, bz, qz)));
  const top = Math.max(a.y, b.y, c.y);
  const d = (bz - qz) * (ax - qx) + (qx - bx) * (az - qz);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    let y = top;
    if (Math.abs(d) > 1e-9) {
      const l1 = ((bz - qz) * (i - qx) + (qx - bx) * (j - qz)) / d, l2 = ((qz - az) * (i - qx) + (ax - qx) * (j - qz)) / d, l3 = 1 - l1 - l2;
      if (l1 < -0.35 || l2 < -0.35 || l3 < -0.35) continue; // a little past the edge: thin parts still mark their cells
      y = Math.min(top, l1 * a.y + l2 * b.y + l3 * c.y);
    }
    const k = j * f.nx + i;
    if (y > f.h[k]) f.h[k] = y;
  }
}

/** A car-shaped field from its size alone (before its model is in): a low nose, the cabin, a tail. */
function boxField(size: THREE.Vector3): Field {
  const f = field(size.x, size.z), W = size.x / 2, L = size.z / 2, H = size.y;
  for (let j = 0; j < f.nz; j++) for (let i = 0; i < f.nx; i++) {
    const x = f.x0 + (i + 0.5) * f.cell, z = f.z0 + (j + 0.5) * f.cell, u = Math.abs(x) / W, v = z / L;
    if (u > 0.97 || Math.abs(v) > 0.98) continue;
    const cabin = v > -0.55 && v < 0.18 && u < 0.8;
    let y = v > 0.18 ? H * (0.66 - 0.12 * (v - 0.18)) : v < -0.55 ? H * 0.7 : H * 0.7;
    if (cabin) y = H * (0.98 - 0.25 * Math.max(0, u - 0.55) - 0.6 * Math.max(0, v - 0.0) - 0.4 * Math.max(0, -0.4 - v));
    f.h[j * f.nx + i] = y * (1 - 0.18 * Math.max(0, u - 0.8) / 0.2);
  }
  return settle(f);
}

/** Cloth over the field: lifted a little over every bump (the highest within ~10 cm), then smoothed, so it
 *  rests on the car's top, bridges its gaps and falls off its sides. */
function settle(f: Field): Field {
  const { nx, nz } = f;
  const pass = (src: Float32Array, r: number, op: "max" | "avg", dx: number, dz: number) => {
    const out = new Float32Array(src.length);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      let acc = op === "max" ? 0 : 0, n = 0;
      for (let s = -r; s <= r; s++) {
        const ii = i + s * dx, jj = j + s * dz;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) { n++; continue; }
        const v = src[jj * nx + ii];
        if (op === "max") acc = Math.max(acc, v); else acc += v;
        n++;
      }
      out[j * nx + i] = op === "max" ? acc : acc / n;
    }
    return out;
  };
  let h = f.h;
  h = pass(pass(h, 2, "max", 1, 0), 2, "max", 0, 1);
  for (let k = 0; k < 2; k++) h = pass(pass(h, 3, "avg", 1, 0), 3, "avg", 0, 1);
  f.h = h;
  return f;
}

function sample(f: Field, x: number, z: number) {
  const fx = (x - f.x0) / f.cell - 0.5, fz = (z - f.z0) / f.cell - 0.5;
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const at = (a: number, b: number) => (a < 0 || b < 0 || a >= f.nx || b >= f.nz ? 0 : f.h[b * f.nx + a]);
  return (at(i, j) * (1 - tx) + at(i + 1, j) * tx) * (1 - tz) + (at(i, j + 1) * (1 - tx) + at(i + 1, j + 1) * tx) * tz;
}

/** The cover's mesh: rings out from the middle of the roof to the hem, on rays round the car. Each ray
 *  follows the field down to the floor; the cloth's folds swing the lower part of each ray out and in,
 *  more the lower it hangs, so the hem waves. */
function drape(f: Field, seed: number): THREE.BufferGeometry {
  const S = 160, N = 44, W = -f.x0, L = -f.z0;
  const pos: number[] = [], idx: number[] = [];
  const rnd = (k: number) => { const s = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
  const waves = [0, 1, 2, 3, 4].map((k) => ({ f: [5, 9, 14, 21, 33][k] + Math.floor(rnd(k) * 3), p: rnd(k + 10) * 6.28, a: [0.05, 0.04, 0.03, 0.02, 0.012][k] }));
  const fold = (a: number) => waves.reduce((s, w) => s + w.a * Math.sin(w.f * a + w.p), 0);
  const top = (() => { let m = 0; for (const v of f.h) m = Math.max(m, v); return m; })();
  pos.push(0, sample(f, 0, 0) + 0.012, 0);
  for (let s = 0; s < S; s++) {
    const a = (s / S) * Math.PI * 2, dx = Math.sin(a) * W, dz = Math.cos(a) * L;
    // where the ray reaches the floor
    let hem = 1;
    for (let k = 0; k <= 240; k++) { const r = k / 240; if (sample(f, dx * r, dz * r) > 0.02) hem = r; }
    hem = Math.min(1, hem + 0.02);
    const out = new THREE.Vector2(dx, dz).normalize();
    const fa = fold(a);
    for (let n = 1; n <= N; n++) {
      const u = n / N, r = hem * (0.55 * u + 0.45 * (1 - (1 - u) ** 2));
      let x = dx * r, z = dz * r, y = sample(f, x, z) + 0.012;
      if (n === N) y = 0.008;
      const hang = Math.max(0, 1 - y / (top * 0.75)) ** 1.6; // the lower, the more the cloth swings
      const off = fa * hang + 0.05 * hang + Math.sin(a * 41 + n * 0.7 + seed) * 0.004;
      x += out.x * off; z += out.y * off;
      y += Math.sin(x * 11 + z * 3 + seed) * Math.sin(z * 7 - x * 2) * 0.006 * (1 - hang); // faint creases on top
      pos.push(x, Math.max(0.006, y), z);
    }
  }
  const at = (s: number, n: number) => 1 + (s % S) * N + (n - 1);
  for (let s = 0; s < S; s++) {
    idx.push(0, at(s, 1), at(s + 1, 1));
    for (let n = 1; n < N; n++) idx.push(at(s, n), at(s + 1, n + 1), at(s + 1, n), at(s, n), at(s, n + 1), at(s + 1, n + 1));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Cloth: matte with a sheen at the edges. `pull` 0..1 takes it off backwards: the tail end first, lifting
 *  over the car and gathering, then gone in a scatter of holes. */
function clothMaterial(pull: { value: number }, zMin: { value: number }, len: { value: number }) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x30343b, roughness: 0.92, sheen: 1, sheenColor: new THREE.Color(0x8d97a8), sheenRoughness: 0.45, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uPull: pull, uZMin: zMin, uLen: len });
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uPull, uZMin, uLen; varying vec3 vCloth; varying float vGone;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        float lag = clamp((position.z - uZMin) / uLen, 0.0, 1.0);
        float p = clamp(uPull * 1.6 - lag * 0.6, 0.0, 1.0), e = p * p * (3.0 - 2.0 * p);
        transformed.z -= e * uLen * 1.05;
        transformed.y += sin(e * 3.14159) * (0.55 + 0.25 * lag) + e * 0.3 + sin(position.x * 7.0 + uPull * 16.0) * 0.05 * sin(e * 3.14159);
        transformed.x *= 1.0 - 0.3 * e;
        vCloth = position; vGone = uPull;`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCloth; varying float vGone;\nfloat ch(vec3 p){ return fract(sin(dot(floor(p * 18.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }")
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (ch(vCloth) < (vGone - 0.62) / 0.33) discard;");
  };
  m.customProgramCacheKey = () => "garage-cloth";
  return m;
}

// ---------------------------------------------------------------------------- shapes

function merge(list: THREE.BufferGeometry[]) {
  const all = list.map((g) => {
    const out = new THREE.BufferGeometry();
    for (const n of ["position", "normal", "uv"]) if (g.attributes[n]) out.setAttribute(n, g.attributes[n]);
    out.setIndex(g.index ?? [...Array(g.attributes.position.count).keys()]);
    return out;
  });
  const g = THREE.BufferGeometryUtils.mergeGeometries(all, false)!;
  for (const x of list) x.dispose();
  return g;
}

/** A flat strip on the floor along a circle (radius r, width w) from angle a0 to a1. RingGeometry's angle runs
 *  from +x toward +y; laid flat that is our angle (from +z toward +x) less a quarter turn. */
function arcStrip(r: number, w: number, a0: number, a1: number, seg: number) {
  return new THREE.RingGeometry(r - w / 2, r + w / 2, seg, 1, a0 - Math.PI / 2, a1 - a0).rotateX(-Math.PI / 2);
}

/** A thin band round the drum's wall (radius r, height h) from angle a0 to a1. */
function arcBand(r: number, h: number, a0: number, a1: number) {
  // CylinderGeometry's theta starts at +z and runs toward +x: the bays' angle
  return new THREE.CylinderGeometry(r, r, h, Math.max(4, Math.ceil((a1 - a0) * 40)), 1, true, a0, a1 - a0);
}

/** A line on the floor out from the middle at angle a, from radius r0 to r1. */
function radial(a: number, r0: number, r1: number, w: number) {
  return new THREE.PlaneGeometry(w, r1 - r0).rotateX(-Math.PI / 2).translate(0, 0, (r0 + r1) / 2).rotateY(a);
}

/** A class's name for the drum's wall: white, its colour's bar under it. */
function nameTexture(name: string, accent: THREE.Color) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(235,238,242,0.9)";
  g.font = "700 150px Overpass, system-ui, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(name, 512, 112);
  g.fillStyle = `#${accent.getHexString()}`;
  g.fillRect(512 - 70, 214, 140, 14);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
