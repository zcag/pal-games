// Low-poly geometry kit: primitives with flat normals, per-face colour, a part id + pivot for vertex
// animation, an emissive strength, and a hull normal (outward from the primitive's centre) that the
// inverted-hull outline extrudes along without cracking at hard edges.
import * as THREE from "../../vendor/three.js";
import { mergeGeometries } from "../../vendor/three.js";

export type V3 = [number, number, number];
export interface PrimOpts {
  at?: V3;
  rot?: V3;
  scale?: V3;
  color: string | THREE.Color;
  /** Animation part id (models decide meaning) and its pivot in model space. */
  part?: number;
  pivot?: V3;
  /** Emissive strength (colour x emit is added as light; > 1 blooms). */
  emit?: number;
  /** Vertex noise amplitude (u), consistent across shared vertices so faces stay closed. */
  jitter?: number;
  /** Per-face value variation (0..1), the hand-painted look. */
  shade?: number;
  seed?: number;
  /** Build-order height override (towers: parts that drop in together share one). */
  ord?: number;
}

const col = new THREE.Color();
function h3(x: number, y: number, z: number, s: number) {
  const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.19) * 43758.5453;
  return v - Math.floor(v);
}

export class Kit {
  private geos: THREE.BufferGeometry[] = [];

  add(src: THREE.BufferGeometry, o: PrimOpts): this {
    let g = src.index ? src.toNonIndexed() : src.clone();
    for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const seed = o.seed ?? 1;
    if (o.jitter) {
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const j = o.jitter;
        pos.setXYZ(i, x + (h3(x, y, z, seed) - 0.5) * 2 * j, y + (h3(y, z, x, seed + 1) - 0.5) * 2 * j, z + (h3(z, x, y, seed + 2) - 0.5) * 2 * j);
      }
    }
    // hull normal: outward from the primitive's own centre (before placement)
    g.computeBoundingBox();
    const c = g.boundingBox!.getCenter(new THREE.Vector3());
    const hull = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i) - c.x, pos.getY(i) - c.y, pos.getZ(i) - c.z);
      if (v.lengthSq() < 1e-8) v.set(0, 1, 0);
      v.normalize();
      hull.set([v.x, v.y, v.z], i * 3);
    }
    g.setAttribute("aHull", new THREE.BufferAttribute(hull, 3));
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...(o.at ?? [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.rot ?? [0, 0, 0]))),
      new THREE.Vector3(...(o.scale ?? [1, 1, 1])),
    );
    g.applyMatrix4(m);
    // hull normals rotate with the primitive (not scaled: keeps the outline even)
    const rq = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...(o.rot ?? [0, 0, 0]))));
    const ha = g.attributes.aHull as THREE.BufferAttribute;
    for (let i = 0; i < ha.count; i++) { v.fromBufferAttribute(ha, i).applyMatrix3(rq).normalize(); ha.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); // non-indexed: flat
    { const na = g.attributes.normal as THREE.BufferAttribute; for (let i = 0; i < na.count; i++) if (na.getX(i) === 0 && na.getY(i) === 0 && na.getZ(i) === 0) na.setXYZ(i, 0, 1, 0); }
    const n = pos.count;
    const colors = new Float32Array(n * 3);
    const base = typeof o.color === "string" ? new THREE.Color(o.color) : o.color.clone();
    const shade = o.shade ?? 0.06;
    for (let f = 0; f < n; f += 3) {
      const k = 1 + (h3(f, seed, 3.3, seed) - 0.5) * 2 * shade;
      col.copy(base).multiplyScalar(k);
      for (let j = 0; j < 3; j++) colors.set([col.r, col.g, col.b], (f + j) * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const part = new Float32Array(n * 4);
    const pv = o.pivot ?? [0, 0, 0];
    for (let i = 0; i < n; i++) part.set([o.part ?? 0, pv[0], pv[1], pv[2]], i * 4);
    g.setAttribute("aPart", new THREE.BufferAttribute(part, 4));
    g.setAttribute("aEmit", new THREE.BufferAttribute(new Float32Array(n).fill(o.emit ?? 0), 1));
    // build order: the primitive's centre height (towers stack in bottom to top)
    g.computeBoundingBox();
    g.setAttribute("aOrd", new THREE.BufferAttribute(new Float32Array(n).fill(o.ord ?? (g.boundingBox!.min.y + g.boundingBox!.max.y) / 2), 1));
    this.geos.push(g);
    return this;
  }

  box(w: number, h: number, d: number, o: PrimOpts) { return this.add(new THREE.BoxGeometry(w, h, d), o); }
  /** Cylinder / frustum; `seg` sides. */
  cyl(rt: number, rb: number, h: number, seg: number, o: PrimOpts) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg, 1), o); }
  cone(r: number, h: number, seg: number, o: PrimOpts) { return this.add(new THREE.ConeGeometry(r, h, seg, 1), o); }
  ico(r: number, detail: number, o: PrimOpts) { return this.add(new THREE.IcosahedronGeometry(r, detail), o); }
  dodeca(r: number, o: PrimOpts) { return this.add(new THREE.DodecahedronGeometry(r, 0), o); }
  octa(r: number, o: PrimOpts) { return this.add(new THREE.OctahedronGeometry(r, 0), o); }
  sphere(r: number, ws: number, hs: number, o: PrimOpts) { return this.add(new THREE.SphereGeometry(r, ws, hs), o); }
  capsule(r: number, len: number, seg: number, o: PrimOpts) { return this.add(new THREE.CapsuleGeometry(r, len, 2, seg), o); }
  torus(r: number, tube: number, rs: number, ts: number, o: PrimOpts, arc = Math.PI * 2) { return this.add(new THREE.TorusGeometry(r, tube, rs, ts, arc), o); }
  /** A flat shape extruded `depth` along z (centred). */
  extrude(shape: THREE.Shape, depth: number, o: PrimOpts) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 3 });
    g.translate(0, 0, -depth / 2);
    return this.add(g, o);
  }
  /** A two-sided flat quad (w x h) facing +z, centred. */
  quad(w: number, h: number, o: PrimOpts) {
    const g = new THREE.PlaneGeometry(w, h);
    const back = g.clone().rotateY(Math.PI);
    return this.add(mergeGeometries([g.toNonIndexed(), back.toNonIndexed()])!, o);
  }
  /** A tapered tube through points (roots, tails, horns). */
  tube(pts: V3[], r0: number, r1: number, seg: number, o: PrimOpts) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const tg = new THREE.TubeGeometry(curve, Math.max(2, pts.length * 2), 1, seg, false);
    const p = tg.attributes.position as THREE.BufferAttribute;
    const steps = Math.max(2, pts.length * 2);
    // taper: scale each ring's offset from the curve
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, r = r0 + (r1 - r0) * t, cp = curve.getPointAt(t);
      for (let j = 0; j <= seg; j++) {
        const k = i * (seg + 1) + j;
        p.setXYZ(k, cp.x + (p.getX(k) - cp.x) * r, cp.y + (p.getY(k) - cp.y) * r, cp.z + (p.getZ(k) - cp.z) * r);
      }
    }
    return this.add(tg, o);
  }

  /** Merge another kit's primitives in, moved/rotated/scaled. */
  merge(other: Kit, m?: THREE.Matrix4): this {
    for (const g of other.geos) {
      const c = g.clone();
      if (m) {
        c.applyMatrix4(m);
        const r = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().extractRotation(m));
        const ha = c.attributes.aHull as THREE.BufferAttribute, v = new THREE.Vector3();
        for (let i = 0; i < ha.count; i++) { v.fromBufferAttribute(ha, i).applyMatrix3(r).normalize(); ha.setXYZ(i, v.x, v.y, v.z); }
        const oa = c.attributes.aOrd as THREE.BufferAttribute | undefined;
        if (oa) { const ty = m.elements[13]!; for (let i = 0; i < oa.count; i++) oa.setX(i, oa.getX(i) + ty); }
        const pa = c.attributes.aPart as THREE.BufferAttribute;
        for (let i = 0; i < pa.count; i++) { v.set(pa.getY(i), pa.getZ(i), pa.getW(i)).applyMatrix4(m); pa.setXYZW(i, pa.getX(i), v.x, v.y, v.z); }
      }
      this.geos.push(c);
    }
    return this;
  }

  get empty() { return this.geos.length === 0; }

  build(): THREE.BufferGeometry {
    if (!this.geos.length) return new THREE.BufferGeometry();
    const g = mergeGeometries(this.geos)!;
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export const kit = () => new Kit();
export const TAU = Math.PI * 2;
