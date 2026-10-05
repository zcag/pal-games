// HP bars and status pips (art 3.5, 3.6) in one instanced overlay draw: depth test off,
// css-px sized, snapped to device pixels so 2-3 px bars stay crisp.
import * as THREE from "../../../vendor/three.js";
import { atlas, ATLAS_GLSL } from "./atlas.ts";
import { dyn, flush, fxMaterial } from "./common.ts";
import { K } from "../palette.ts";

const VS = /* glsl */ `
  attribute vec3 iPos; attribute vec4 iBox; attribute vec4 iFill; attribute vec4 iFlag; attribute vec4 iPip;
  uniform vec2 uPx; uniform float uDpr;
  varying vec2 vL; varying vec4 vBox; varying vec4 vFill; varying vec4 vFlag; varying vec4 vPip;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(iPos, 1.0);
    // box: w, h, pip count, y offset (px). Quad spans the bar, frame, strip and the pip row.
    float W = iBox.x, H = iBox.y, np = iBox.z;
    float halfW = max(W * 0.5 + 1.0, np * 3.5 + 0.5);
    float bot = -H * 0.5 - 1.0, top = H * 0.5 + (np > 0.0 ? 10.0 : 3.0);
    vec2 l = vec2(position.x * 2.0 * halfW, mix(bot, top, position.y + 0.5));
    // snap the bar centre to device pixels
    vec2 c = clip.xy / clip.w / uPx;                // css px from centre
    c = floor(c * uDpr + 0.5) / uDpr;
    c.y += iBox.w;
    if (mod(H * uDpr, 2.0) > 0.5) c.y += 0.5 / uDpr; // odd device-px heights: keep edges on the grid
    if (mod(W * uDpr, 2.0) > 0.5) c.x += 0.5 / uDpr;
    gl_Position = vec4((c + l) * uPx * clip.w, 0.0, clip.w);
    if (clip.w < 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vL = l; vBox = iBox; vFill = iFill; vFlag = iFlag; vPip = iPip;
  }
`;
const FS = /* glsl */ `
  uniform sampler2D uMap; uniform vec3 cTrack, cHp, cChip, cShield, cSteel, cWard, cElite, cSoldier, cInk;
  varying vec2 vL; varying vec4 vBox; varying vec4 vFill; varying vec4 vFlag; varying vec4 vPip;
  ${ATLAS_GLSL}
  float inBox(vec2 p, vec2 lo, vec2 hi) { vec2 s = step(lo, p) * step(p, hi); return s.x * s.y; }
  void main() {
    float W = vBox.x, H = vBox.y, np = vBox.z;
    vec2 p = vL;
    float x0 = -W * 0.5, x1 = W * 0.5, y0 = -H * 0.5, y1 = H * 0.5;
    vec3 col = vec3(0.0); float a = 0.0;
    float alpha = vFill.w;
    // track
    if (inBox(p, vec2(x0, y0), vec2(x1, y1)) > 0.5) {
      float u = (p.x - x0) / W;
      col = cTrack; a = 0.75;
      vec3 fillC = vFlag.w > 0.5 ? cSoldier : cHp;
      if (u <= vFill.x) { col = fillC; a = 1.0; }
      else if (u <= vFill.y) { col = cChip; a = 1.0; }
      // shield: pale segment over the fill's right end, sized to the shield
      if (vFill.z > 0.0 && u <= max(vFill.x, vFill.z) && u >= max(vFill.x, vFill.z) - vFill.z) { col = mix(col, cShield, 0.9); a = 1.0; }
      // 1 px dark top edge for definition
      if (p.y > y1 - 0.5 && H >= 3.0) col *= 0.75;
    }
    // elite frame
    if (vFlag.z > 0.5 && a < 0.5 && inBox(p, vec2(x0 - 1.0, y0 - 1.0), vec2(x1 + 1.0, y1 + 1.0)) > 0.5) { col = cElite; a = 1.0; }
    // armour / ward strip (1 px above): dotted when shredded
    if (vFlag.x > 0.5 && inBox(p, vec2(x0, y1 + 1.0), vec2(x1, y1 + 2.0)) > 0.5) {
      float dotted = vFlag.y > 0.5 ? step(0.5, fract((p.x - x0) / 3.0)) : 1.0;
      col = vFlag.x > 1.5 ? cWard : cSteel; a = dotted;
    }
    // pips (6 x 6 px, 1 px apart, centred above)
    if (np > 0.0) {
      float pw = np * 7.0 - 1.0;
      float px0 = -pw * 0.5, py0 = y1 + 3.0;
      vec2 q = p - vec2(px0, py0);
      if (q.x >= 0.0 && q.x < pw && q.y >= 0.0 && q.y < 6.0) {
        float idx = floor(q.x / 7.0);
        float lx = q.x - idx * 7.0;
        if (lx < 6.0) {
          float cell = idx < 0.5 ? vPip.x : idx < 1.5 ? vPip.y : idx < 2.5 ? vPip.z : vPip.w;
          vec4 t = texture2D(uMap, cellUv(cell, vec2(lx / 6.0, q.y / 6.0)));
          col = pow(t.rgb, vec3(2.2)); a = t.a;
        }
      }
    }
    a *= alpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col * a, a);
    #include <colorspace_fragment>
  }
`;

const v3 = (c: readonly number[]) => ({ value: new THREE.Vector3(c[0], c[1], c[2]) });

export class Bars {
  readonly mesh: THREE.Mesh;
  private geo: THREE.InstancedBufferGeometry;
  private at: THREE.InstancedBufferAttribute[];
  private P: Float32Array; private Bx: Float32Array; private Fi: Float32Array; private Fl: Float32Array; private Pi: Float32Array;
  readonly uDpr = { value: 1 };
  n = 0;
  constructor(readonly cap: number) {
    const g = new THREE.InstancedBufferGeometry();
    const q = new THREE.PlaneGeometry(1, 1);
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const p = dyn(g, "iPos", 3, cap), b = dyn(g, "iBox", 4, cap), f = dyn(g, "iFill", 4, cap), fl = dyn(g, "iFlag", 4, cap), pi = dyn(g, "iPip", 4, cap);
    this.at = [p, b, f, fl, pi];
    this.P = p.array as Float32Array; this.Bx = b.array as Float32Array; this.Fi = f.array as Float32Array; this.Fl = fl.array as Float32Array; this.Pi = pi.array as Float32Array;
    g.instanceCount = 0;
    this.geo = g;
    const m = fxMaterial({ vs: VS, fs: FS, order: 50, depthTest: false, uniforms: {
      uMap: { value: atlas() }, uDpr: this.uDpr,
      cTrack: v3(K.track), cHp: v3(K.hp), cChip: v3(K.chip), cShield: v3(K.shield), cSteel: v3(K.steel), cWard: v3(K.ward), cElite: v3(K.elite), cSoldier: v3(K.soldierHp), cInk: v3(K.ink),
    } });
    m.toneMapped = false;
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 50;
    this.mesh.name = "fx-bars";
  }
  begin(): void { this.n = 0; }
  /** strip: 0 none, 1 armour, 2 ward. pips: atlas cells (up to 3 + plus), np = count. */
  add(x: number, y: number, z: number, w: number, h: number, hp: number, chip: number, shield: number, alpha: number,
      strip: number, shredded: boolean, elite: boolean, soldier: boolean, np: number, p0: number, p1: number, p2: number, p3: number, yOff = 0): void {
    const i = this.n;
    if (i >= this.cap) return;
    this.n++;
    this.P[i * 3] = x; this.P[i * 3 + 1] = y; this.P[i * 3 + 2] = z;
    this.Bx[i * 4] = w; this.Bx[i * 4 + 1] = h; this.Bx[i * 4 + 2] = np; this.Bx[i * 4 + 3] = yOff;
    this.Fi[i * 4] = hp; this.Fi[i * 4 + 1] = chip; this.Fi[i * 4 + 2] = shield; this.Fi[i * 4 + 3] = alpha;
    this.Fl[i * 4] = strip; this.Fl[i * 4 + 1] = shredded ? 1 : 0; this.Fl[i * 4 + 2] = elite ? 1 : 0; this.Fl[i * 4 + 3] = soldier ? 1 : 0;
    this.Pi[i * 4] = p0; this.Pi[i * 4 + 1] = p1; this.Pi[i * 4 + 2] = p2; this.Pi[i * 4 + 3] = p3;
  }
  end(): void {
    this.geo.instanceCount = this.n;
    flush(this.at, this.n);
  }
}
