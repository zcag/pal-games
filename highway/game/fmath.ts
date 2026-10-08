// The math a run is simulated with: fdlibm's, in plain JS (surface/vendor/fmath.js, scripts/vendor.sh). Math.sin and
// the rest are the system's own and round differently from one machine to another (Linux and macOS part at the last
// bit), and a run is chaotic enough that a bit becomes a crash a minute later: the best runs are searched on Linux and
// replayed on a Mac. Every function past + - * / and sqrt in the simulation is one of these.
export { sin, cos, tan, asin, atan, atan2, tanh, exp, ln, pow, hypot } from "../surface/vendor/fmath.js";
