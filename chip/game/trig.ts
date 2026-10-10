// sin and cos from + and * only, so a shot flies the same on every machine:
// Math.sin and Math.cos may round differently on macOS and Linux (highway's
// replays parted on that), while IEEE addition and multiplication do not.
// Reduced to [-pi/4, pi/4] and summed as Taylor series to 1e-16 there.

const HALF_PI = Math.PI / 2;

function poly(x: number, sin: boolean): number {
  const x2 = x * x;
  let term = sin ? x : 1, sum = term;
  for (let n = sin ? 2 : 1; n < 24; n += 2) {
    term = (-term * x2) / (n * (n + 1));
    sum += term;
  }
  return sum;
}

function sinCos(a: number): [number, number] {
  const k = Math.round(a / HALF_PI);
  const r = a - k * HALF_PI;
  const s = poly(r, true), c = poly(r, false);
  switch (((k % 4) + 4) % 4) {
    case 0: return [s, c];
    case 1: return [c, -s];
    case 2: return [-s, -c];
    default: return [-c, s];
  }
}

export const sin = (a: number) => sinCos(a)[0];
export const cos = (a: number) => sinCos(a)[1];
export const RAD = Math.PI / 180;
