// The speed rush's air: thin streaks of wind and grit rushing past the camera, real things in the world (so they
// have depth, parallax and the motion blur), drawn only while the rush is on. Each is a short line along the road,
// longer the faster you go, kept low and to the sides so none crosses the road ahead or reads as rain in the sky.
import * as THREE from "./vendor/three.js";

const N = 260, AHEAD = 60, BEHIND = 6, INNER = 2.6, OUTER = 11;

export class Streaks {
  private pos = new Float32Array(N * 6);
  private at = Array.from({ length: N }, () => new THREE.Vector3());
  private geo = new THREE.BufferGeometry();
  private mat = new THREE.LineBasicMaterial({ color: 0xe8eef6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  mesh = new THREE.LineSegments(this.geo, this.mat);
  private seed = 1;

  constructor() {
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
  }

  private rnd() { return (this.seed = (this.seed * 16807) % 2147483647) / 2147483647; }

  /** Put one somewhere beside the camera's path, `z` along it. */
  private place(p: THREE.Vector3, cam: THREE.Vector3, z: number) {
    // low, over the road and the verges: up in the sky a line of air reads as rain
    const side = this.rnd() < 0.5 ? -1 : 1, x = INNER + Math.sqrt(this.rnd()) * (OUTER - INNER);
    p.set(cam.x + side * x * 1.4, 0.1 + this.rnd() * this.rnd() * 2.2, cam.z + z);
  }

  /** Every frame: `speed` m/s along +z, `rush` 0..1 how much of it shows. */
  update(cam: THREE.Vector3, speed: number, rush: number) {
    this.mesh.visible = rush > 0.01;
    if (!this.mesh.visible) { for (const p of this.at) p.set(0, -999, 0); return; }
    this.mat.opacity = 0.32 * rush;
    const len = Math.min(6, speed * 0.05) * (0.4 + rush);
    for (let i = 0; i < N; i++) {
      const p = this.at[i];
      // the air stands still and you drive through it; one fallen behind (or never placed) goes back ahead
      if (p.y < -100 || p.z < cam.z - BEHIND) this.place(p, cam, p.y < -100 ? this.rnd() * AHEAD : AHEAD * (0.7 + this.rnd() * 0.3));
      this.pos.set([p.x, p.y, p.z, p.x, p.y, p.z - len], i * 6);
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
