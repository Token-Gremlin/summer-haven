/** Metres/second, independent of rendering frame rate. */
export const LOCOMOTION = { walk: 2.35, run: 4.8, acceleration: 10, braking: 16 } as const;

/** Exact integral of an exponentially damped velocity (Euler integration changes travel with FPS). */
export function integrateVelocity(velocity: number, target: number, response: number, dt: number) {
  const decay = Math.exp(-response * dt);
  return {
    velocity: target + (velocity - target) * decay,
    distance: target * dt + ((velocity - target) * (1 - decay)) / response,
  };
}

/** Ignore suspended-tab gaps, while preserving ordinary slow frames instead of slowing the world. */
export function frameDelta(seconds: number) {
  return Number.isFinite(seconds) && seconds >= 0 && seconds < 0.5 ? seconds : 0;
}
