// What surface/vendor/fmath.js bundles (scripts/vendor.sh): the math functions the simulation uses, in plain JS
// (fdlibm's, by stdlib), so a run comes out the same to the last bit on every machine (game/fmath.ts).
export { default as sin } from "@stdlib/math-base-special-sin";
export { default as cos } from "@stdlib/math-base-special-cos";
export { default as tan } from "@stdlib/math-base-special-tan";
export { default as asin } from "@stdlib/math-base-special-asin";
export { default as atan } from "@stdlib/math-base-special-atan";
export { default as atan2 } from "@stdlib/math-base-special-atan2";
export { default as tanh } from "@stdlib/math-base-special-tanh";
export { default as exp } from "@stdlib/math-base-special-exp";
export { default as ln } from "@stdlib/math-base-special-ln";
export { default as pow } from "@stdlib/math-base-special-pow";
export { default as hypot } from "@stdlib/math-base-special-hypot";
