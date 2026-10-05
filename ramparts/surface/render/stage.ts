// The Stage (api.ts): renderer, camera fit, lights, post, shake, picking, systems, world build, frame.
import * as THREE from "../vendor/three.js";
import type { Battle, BattleMap, Theme, Vec } from "../../game/types.ts";
import { GROUND_Y, toWorld, type Insets, type RenderSystem, type Stage } from "./api.ts";
import { LOOKS, type Look } from "./palette.ts";
import { Post } from "./post.ts";
import { U } from "./mats.ts";
import { buildWorld, type WorldView } from "./world.ts";
import { skyQuad, setSky } from "./world/sky.ts";
import { createUnits, type Units } from "./units.ts";
import { createTowers, type Towers } from "./towers.ts";

const PITCH = THREE.MathUtils.degToRad(47);
const FOV = 34;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export interface RampartsStage extends Stage {
  readonly units: Units;
  readonly towers: Towers;
  readonly look: Look;
  /** Post controls: pause 0..1 (desaturate/darken), danger 0..1 (low-lives pulse), red 0..1 (leak edge tint), dim 0..1. */
  readonly fx: { pause: number; danger: number; red: number; dim: number };
  /** Rendering stats from the last frame. */
  readonly stats: { calls: number; triangles: number; ms: number; scale: number; dpr: number };
  /** Skip the slab-rise intro (click or Enter). */
  skipIntro(): void;
  /** True once the intro has finished (screenshots wait for it). */
  readonly settled: boolean;
  /** World view: pad heights and other world facts other systems may read. */
  readonly worldView: WorldView | null;
  /** Shake scale from settings (0..1). */
  shakeScale: number;
  /** Camera breathing on/off (R33: automatically off below 900 px width). */
  breathing: boolean;
  /** Menu backdrop orbit speed multiplier (title). */
  orbit: number;
}

export function createStage(canvas: HTMLCanvasElement): RampartsStage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.autoClear = true;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 1, 400);
  const world = new THREE.Group();
  world.name = "world";
  scene.add(world);

  // lights (art 6.1)
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xbfd4ff, 0.4);
  scene.add(fill, fill.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(hemi);
  const sky = skyQuad();
  scene.add(sky.mesh);

  const post = new Post(renderer);
  const systems: RenderSystem[] = [];
  const fx = { pause: 0, danger: 0, red: 0, dim: 0 };
  const stats = { calls: 0, triangles: 0, ms: 16, scale: 1, dpr: 1 };

  let insets: Insets = { top: 30, right: 0, bottom: 0, left: 0 };
  let insetsSet = false;
  let cssW = 720, cssH = 390, dpr = 1, scale = 1;
  let look: Look = LOOKS.meadow;
  let worldView: WorldView | null = null;
  let trauma = 0;
  let introT = 1, introDur = 1.1;
  const base = { target: new THREE.Vector3(), dist: 40 };
  let menu = false, orbitA = 0;
  const seen = new WeakSet<object>();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND_Y);
  const v3 = new THREE.Vector3();
  let slowT = 0, fastT = 0, lowTier = false, drops = 0;

  const units = createUnits();
  const towers = createTowers();

  function applyLook(theme: Theme | "title") {
    look = LOOKS[theme];
    const el = THREE.MathUtils.degToRad(look.sun.elev), az = THREE.MathUtils.degToRad(look.sun.az);
    // azimuth (art 2.x): 90 = from the left, 180 = from the top (map north, -Z), 270 = from the right
    const dir = new THREE.Vector3(-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    sun.position.copy(dir).multiplyScalar(40);
    sun.target.position.set(0, 0, 0);
    sun.color.set(look.sun.color);
    sun.intensity = look.sun.intensity;
    sun.shadow.radius = theme === "peaks" ? 7 : 3.5;
    fill.position.set(-dir.x * 40, 18, -dir.z * 40);
    fill.intensity = 0.85;
    hemi.color.set(look.hemi.sky); hemi.groundColor.set(look.hemi.ground); hemi.intensity = look.hemi.intensity;
    U.uFogCol.value.set(look.fog);
    U.uRimCol.value.set(look.rim.color); U.uRimStr.value = look.rim.strength;
    setSky(sky.u, look);
    post.setGrade(look.grade, look.fog, look.exposure);
  }

  function fitShadow(w: number, h: number) {
    const s = sun.shadow.camera;
    // the light looks at the origin; cover the slab plus dressing with a little room for tall things
    const r = Math.max(w, h) / 2 + 4;
    s.left = -r; s.right = r; s.top = r; s.bottom = -r; s.near = 1; s.far = 100;
    s.updateProjectionMatrix();
  }

  /** Camera placement for distance d around a target (pitch 57, yaw 0, map north up). */
  function place(target: THREE.Vector3, d: number, pitch = PITCH, yaw = 0) {
    camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * d, target.y + Math.sin(pitch) * d, target.z + Math.cos(yaw) * Math.cos(pitch) * d);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }

  /** Fit rule (revised after the critic): frame the content (lanes, pads, gates + margin), not the
   *  whole slab, inside the viewport minus the HUD insets plus a 16 px safe band. Tall things at the
   *  far edge (towers, our castle) are kept below the top band too. */
  function fit() {
    camera.aspect = cssW / cssH;
    camera.updateProjectionMatrix();
    const safe = 16;
    const L = -1 + (2 * insets.left) / cssW, R = 1 - (2 * insets.right) / cssW;
    const T = 1 - (2 * (insets.top + safe)) / cssH, B = -1 + (2 * (insets.bottom + (insets.bottom > 0 ? safe : 0))) / cssH;
    const aw = R - L, ah = T - B, acx = (L + R) / 2, acy = (T + B) / 2;
    const pts = worldView?.content ?? [new THREE.Vector3(-17, 0, -9), new THREE.Vector3(17, 0, -9), new THREE.Vector3(17, 0, 9), new THREE.Vector3(-17, 0, 9)];
    let sx = 1, sz = 1;
    { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const p of pts) { a = Math.min(a, p.x); b = Math.max(b, p.x); c = Math.min(c, p.z); d = Math.max(d, p.z); } sx = b - a; sz = d - c; }
    const target = new THREE.Vector3();
    const measure = (d: number) => {
      target.set(0, 0, 0);
      let bw = 0, bh = 0;
      for (let it = 0; it < 5; it++) {
        place(target, d);
        let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
        for (const p of pts) {
          v3.copy(p).project(camera);
          x0 = Math.min(x0, v3.x); x1 = Math.max(x1, v3.x); y0 = Math.min(y0, v3.y); y1 = Math.max(y1, v3.y);
        }
        bw = x1 - x0; bh = y1 - y0;
        const ex = acx - (x0 + x1) / 2, ey = acy - (y0 + y1) / 2;
        target.x -= (ex * sx) / bw;
        target.z += (ey * sz) / bh;
      }
      return bw <= aw && bh <= ah;
    };
    let lo = 5, hi = 300;
    for (let i = 0; i < 26; i++) { const mid = (lo + hi) / 2; if (measure(mid)) hi = mid; else lo = mid; }
    measure(hi);
    base.dist = hi; base.target.copy(target);
  }

  function setSize() {
    const capped = cssW * cssH > 1.6e6 ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
    stats.dpr = capped * scale;
    renderer.setPixelRatio(capped * scale);
    renderer.setSize(cssW, cssH, true);
    const W = Math.round(cssW * capped * scale), H = Math.round(cssH * capped * scale);
    post.setSize(W, H, !lowTier);
    U.uRes.value.set(cssW, cssH);
    // outlines: 1.0-1.6 px at 720x390, scaled with uiScale above it
    const ui = Math.min(1.5, Math.max(1, Math.min(cssW / 720, cssH / 390)));
    U.uOutline.value = 1.35 * ui;
    fit();
  }

  const stage: RampartsStage = {
    renderer, scene, camera, world,
    map: null,
    theme: "meadow",
    units, towers,
    get look() { return look; },
    fx, stats,
    shakeScale: 1,
    breathing: true,
    orbit: 1,
    get settled() { return introT >= 1; },
    get worldView() { return worldView; },
    skipIntro() { introT = 1; },
    setInsets(i) { insets = { ...i }; insetsSet = true; fit(); },
    resize(w, h, d) {
      cssW = Math.max(1, w); cssH = Math.max(1, h); dpr = d;
      if (!insetsSet) {
        const ui = Math.min(1.5, Math.max(1, Math.min(cssW / 720, cssH / 390)));
        insets = { top: 30 * ui, right: 0, bottom: 0, left: 0 };
      }
      setSize();
    },
    toScreen(x, y, z = 0) {
      const m = stage.map ?? { w: 32, h: 18 };
      v3.set(...toWorld(m, x, y, z)).project(camera);
      if (v3.z > 1) return null;
      return { x: ((v3.x + 1) / 2) * cssW, y: ((1 - v3.y) / 2) * cssH };
    },
    pick(cx, cy): Vec | null {
      const m = stage.map ?? { w: 32, h: 18 };
      ray.setFromCamera(new THREE.Vector2((cx / cssW) * 2 - 1, 1 - (cy / cssH) * 2), camera);
      const hit = ray.ray.intersectPlane(plane, v3);
      if (!hit) return null;
      return { x: hit.x + m.w / 2, y: hit.z + m.h / 2 };
    },
    shake(t) { trauma = Math.min(0.6, trauma + t); },
    add(sys) { systems.push(sys); if (worldView) sys.onMap?.(stage, stage.map, stage.theme); },
    setMap(map: BattleMap | null, theme: Theme) {
      // dispose the previous world
      world.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      world.clear();
      stage.map = map; stage.theme = theme;
      menu = !map;
      const lookKey = !map && theme === "meadow" ? "title" : theme;
      applyLook(lookKey);
      worldView = buildWorld(stage, map, lookKey);
      world.add(worldView.group);
      fitShadow(worldView.field.W2 * 2, worldView.field.H2 * 2);
      fit();
      introT = map ? 0 : 1;
      for (const s of systems) s.onMap?.(stage, map, theme);
    },
    frame(b: Battle | null, alpha: number, dt: number, t: number) {
      const t0 = performance.now();
      renderer.info.reset();
      U.uTime.value = t;
      U.uCloudOff.value.set(t * 0.25 * 0.055 * U.uWind.value.x, t * 0.25 * 0.055 * U.uWind.value.y);
      // camera: fit, intro, breathing, shake (or the menu orbit)
      if (menu) {
        orbitA += dt * 0.015 * stage.orbit;
        const title = stage.theme === "meadow";
        if (title) {
          // the castle and the waterfall frame the right two-thirds; a slow sway, not a full orbit
          const wide = cssW / cssH;
          const d = wide > 1.7 ? 27 : 31;
          place(new THREE.Vector3(6.6, 0.6, 1.9), d, THREE.MathUtils.degToRad(32), -0.24 + Math.sin(orbitA * 6) * 0.1);
        } else place(new THREE.Vector3(base.target.x, 0, base.target.z), base.dist * 0.9, THREE.MathUtils.degToRad(lookKeyPitch()), orbitA);
        // the title keeps its left third for the name and menu (art 7.11)
        const shift = title && cssW / cssH > 1.3 ? -0.17 : 0;
        if (shift) camera.setViewOffset(cssW, cssH, shift * cssW, 0, cssW, cssH); else camera.clearViewOffset();
        post.u.leftShade!.value = title ? 1 : 0;
      } else {
        if (camera.view?.enabled) camera.clearViewOffset();
        post.u.leftShade!.value = 0;
        introT = Math.min(1, introT + dt / introDur);
        const e = easeOutCubic(introT);
        const pitch = PITCH + THREE.MathUtils.degToRad(10) * (1 - e);
        const tg = base.target.clone();
        let yaw = 0;
        if (stage.breathing && cssW >= 900) {
          tg.x += Math.sin((t * 2 * Math.PI) / 14) * 0.12;
          tg.z += Math.sin((t * 2 * Math.PI) / 19 + 1) * 0.12;
          yaw = THREE.MathUtils.degToRad(0.3) * Math.sin((t * 2 * Math.PI) / 19);
        }
        place(tg, base.dist + 8 * (1 - e) / Math.sin(pitch), pitch, yaw);
        if (worldView) worldView.group.position.y = -6 * (1 - e);
        trauma = Math.max(0, trauma - dt * 1.6);
        const k = trauma * trauma * stage.shakeScale;
        if (k > 0) {
          const n = (s: number) => Math.sin(t * 37 + s) * 0.6 + Math.sin(t * 59 + s * 2.1) * 0.4;
          camera.position.x += n(1) * 0.3 * k; camera.position.y += n(2) * 0.3 * k; camera.position.z += n(3) * 0.3 * k;
          camera.rotateZ(THREE.MathUtils.degToRad(0.5) * k * n(4));
          camera.updateMatrixWorld();
        }
      }
      worldView?.update(t, dt, b);
      if (b) {
        const fresh = b.events.filter((e) => !seen.has(e));
        for (const e of fresh) seen.add(e);
        if (fresh.length) {
          units.onEvents(stage, fresh, b);
          towers.onEvents(stage, fresh, b);
          for (const s of systems) s.onEvents?.(stage, fresh, b);
        }
      }
      towers.update(stage, b, alpha, dt, t);
      units.update(stage, b, alpha, dt, t);
      for (const s of systems) s.update(stage, b, alpha, dt, t);
      post.u.pause!.value = fx.pause; post.u.danger!.value = fx.danger; post.u.red!.value = fx.red; post.u.dim!.value = fx.dim;
      post.render(scene, camera, t);
      stats.calls = renderer.info.render.calls;
      stats.triangles = renderer.info.render.triangles;
      // dynamic resolution (art 6.4): measured on real frame intervals
      stats.ms = stats.ms * 0.95 + Math.min(100, dt * 1000) * 0.05;
      if (stats.ms > 18.5) { slowT += dt; fastT = 0; } else if (stats.ms < 13) { fastT += dt; slowT = 0; } else { slowT = 0; fastT = 0; }
      if (slowT > 1 && scale > 0.7) { scale = scale > 0.9 ? 0.85 : 0.7; if (scale === 0.7 && ++drops >= 2) { lowTier = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.map?.dispose(); sun.shadow.map = null; } slowT = 0; stats.scale = scale; setSize(); }
      if (fastT > 5 && scale < 1) { scale = scale < 0.8 ? 0.85 : 1; fastT = 0; stats.scale = scale; setSize(); }
      void t0;
    },
  };
  function lookKeyPitch() { return 30; }
  renderer.info.autoReset = false;
  applyLook("meadow");
  return stage;
}
