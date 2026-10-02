const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function gaitProfile(speed: number) {
  const run = smooth(2.4, 4.5, speed);
  return { run, stride: 1.5 + run * 1.5, stance: 0.5 - run * 0.26, lift: 0.09 + run * 0.15 };
}

/** One full left/right cycle. In stance, local foot velocity exactly opposes forward travel. */
export function sampleFoot(phase: number, speed: number) {
  const { stride, stance, lift } = gaitProfile(speed);
  const p = ((phase % 1) + 1) % 1;
  const front = stride * stance * 0.5;
  if (p < stance) return { z: front - stride * p, lift: 0, planted: true };
  const u = (p - stance) / (1 - stance),
    u2 = u * u,
    u3 = u2 * u;
  // Match stance velocity at both ends, then release it quickly after toe-off.
  // An unattenuated Hermite tangent overshoots behind the hips and locks the running knee.
  const tangent = -stride * (1 - stance);
  const release = Math.exp(-12 * u * (1 - u));
  const z =
    (2 * u3 - 3 * u2 + 1) * -front + (-2 * u3 + 3 * u2) * front + (2 * u3 - 3 * u2 + u) * tangent * release;
  return { z, lift: Math.pow(Math.sin(Math.PI * u), 1.5) * lift, planted: false };
}
