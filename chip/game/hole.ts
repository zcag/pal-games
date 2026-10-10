// The hole: one hand-made par 4, metres, x to the right and y up.
//
// The tee sits on a rise at the left. A fairway runs down to a pond; past
// the pond a second fairway climbs to the foot of a cliff, and the green is
// on the mesa above it, behind the Needle: a spire of rock on the cliff's
// edge with an arch through its foot. The plain way round: over the pond to
// the cliff's foot, a high pitch over the Needle onto the green, a putt or
// two (four). The trick: from the tee, a full drive flat enough to go
// through the arch, which runs on into the backstop and drops at its foot,
// on the green (two or three). A bunker short of the green takes pitches
// that come up short.

export type Surface = "tee" | "fairway" | "rough" | "sand" | "green" | "rock";

/** How each surface plays. bounce: restitution; grip: friction, which is what turns spin into speed on landing;
 *  roll: how fast a rolling ball loses speed there, m/s each second (a slope steeper than asin(roll / g) keeps it rolling). */
export const SURFACES: Record<Surface, { bounce: number; grip: number; roll: number }> = {
  tee: { bounce: 0.3, grip: 0.5, roll: 3 },
  fairway: { bounce: 0.34, grip: 0.5, roll: 2.4 },
  rough: { bounce: 0.16, grip: 0.65, roll: 7.5 },
  sand: { bounce: 0.02, grip: 0.9, roll: 16 },
  green: { bounce: 0.22, grip: 0.55, roll: 1.15 },
  rock: { bounce: 0.12, grip: 0.3, roll: 1.6 },
};

export type Pt = [x: number, y: number];
export type Rect = { x0: number; x1: number; y0: number; y1: number };

export type Hole = {
  name: string;
  par: number;
  tee: Pt;
  /** The ground left to right: point i to i + 1 is surface `surfaces[i]`. */
  ground: Pt[];
  surfaces: Surface[];
  /** Solid shapes besides the ground (the Needle), each a closed loop of rock. */
  rocks: Pt[][];
  /** The cup: its centre on the green, its width and depth (cut into the ground). */
  cup: { x: number; y: number; w: number; d: number };
  water: Rect[];
  /** Where a ball that touches down is lost: on the Needle's top, on the backstop's. */
  lost: Rect[];
  /** Past these the ball is out, flying or not. */
  bounds: Rect;
};

const CUP = { x: 86.5, y: 14, w: 0.56, d: 0.5 };
const LIP = 0.08;

/** The ground as runs of one surface: each run lists its points after the previous run's last one. */
const RUNS: [Surface, Pt[]][] = [
  // The land runs on past both ends, so the walls read as the edges of high ground, not pillars.
  ["rock", [[-8, 22], [-8, 5]]],
  ["tee", [[6, 5]]],
  ["fairway", [[9, 3.6], [12, 1.4], [16, 0.2], [22, 0.5], [28, 0.1], [34, 0.4], [38, 0]]],
  ["rough", [[40, -1.2], [41.5, -4], [52.5, -4], [54, -1.2], [56.5, 1.8]]],
  // A rise past the pond, then a hollow of long grass at the cliff's foot that keeps what comes off the cliff.
  ["fairway", [[59, 3], [61.5, 2.3], [63, 1.4]]],
  ["rough", [[64.5, 0.8], [67.5, 0.7], [69.6, 1.8]]],
  ["rock", [[70.3, 9], [70.6, 14]]],
  ["fairway", [[75.2, 14]]],
  // A bunker short of the green: a pitch that comes up short sits in it.
  ["sand", [[75.8, 13.2], [77.6, 13.2], [78.2, 14]]],
  ["fairway", [[79, 14]]],
  // The cup, its rim bevelled: a ball over it too fast rides the bevel and hops out (a lip-out).
  ["green", [
    [CUP.x - CUP.w / 2 - LIP, 14], [CUP.x - CUP.w / 2, 14 - LIP], [CUP.x - CUP.w / 2, 14 - CUP.d],
    [CUP.x + CUP.w / 2, 14 - CUP.d], [CUP.x + CUP.w / 2, 14 - LIP], [CUP.x + CUP.w / 2 + LIP, 14], [94.8, 14],
  ]],
  ["rock", [[94.8, 19], [95.2, 27], [150, 27], [150, -12]]],
];

/** The Needle: the spire over the arch, which is the gap between the mesa and the spire's underside. */
export const NEEDLE: Pt[] = [[70.6, 16.8], [73.2, 16.8], [73.7, 18.2], [73.3, 24.6], [72.1, 26.4], [70.9, 24.8], [70.3, 18.2]];

function flatten(start: Pt, runs: [Surface, Pt[]][]): { ground: Pt[]; surfaces: Surface[] } {
  const ground: Pt[] = [start], surfaces: Surface[] = [];
  for (const [s, pts] of runs) for (const p of pts) { ground.push(p); surfaces.push(s); }
  return { ground, surfaces };
}

const [first, ...rest] = RUNS;
const { ground, surfaces } = flatten([-60, 22], [[first[0], first[1]], ...rest]);

export const HOLE: Hole = {
  name: "The Needle",
  par: 4,
  tee: [3, 5],
  ground,
  surfaces,
  rocks: [NEEDLE],
  cup: CUP,
  water: [{ x0: 40.5, x1: 53.5, y0: -4.2, y1: -1.5 }],
  lost: [{ x0: 70, x1: 74, y0: 24.4, y1: 80 }, { x0: 94.9, x1: 150, y0: 26.8, y1: 200 }, { x0: -60, x1: -7.9, y0: 21.8, y1: 200 }],
  bounds: { x0: -60, x1: 150, y0: -12, y1: 200 },
};

/** The ground's height under x (the first segment over it), for the camera and the bot. */
export function groundAt(h: Hole, x: number): number {
  const g = h.ground;
  for (let i = 0; i + 1 < g.length; i++) {
    const [x0, y0] = g[i], [x1, y1] = g[i + 1];
    if (x1 > x0 && x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return 0;
}
