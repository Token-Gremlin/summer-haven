/** Metre-scale gravity waves, shared by vertex displacement and surface normals.
 * Confined rivers use a height field; spray uses ballistic particles on the GPU.
 */
export const WATER_MOTION = /* glsl */ `
vec3 gravityWave(vec2 p, vec2 direction, float wavelength, float amplitude) {
  float k = 6.2831853 / wavelength;
  // A uniform mean drift keeps wave phase coherent across a curved channel.
  // Spatially varying current * unbounded time would compress waves forever.
  float phase = dot(p, direction) * k - uTime * (sqrt(9.81 * k) + direction.y * .6 * k);
  return vec3(sin(phase), cos(phase) * k * direction) * amplitude;
}
// x = depth, y = downstream x direction, z = current speed, w = shore damping.
vec3 waterMotion(vec3 p, vec4 water) {
  float nearDetail = 1.0 - smoothstep(25.0, 90.0, distance(p, cameraPosition));
  vec3 wave = gravityWave(p.xz, vec2(.31623,.94868), 7.5, .095);
  wave += gravityWave(p.xz, vec2(-.8,.6), 3.6, .046);
  wave += gravityWave(p.xz, vec2(.89443,.44721), 1.65, .019 * nearDetail);
  float lip = smoothstep(0.0, 2.0, abs(p.z + 730.0));
  float landing = smoothstep(0.0, 1.1, abs(p.z + 708.0));
  return wave * water.w * lip * landing;
}
`;

export const FALL_GRAVITY = 9.81;
export const FALL_HEIGHT = 36;
export const FALL_SECONDS = Math.sqrt(2 * FALL_HEIGHT / FALL_GRAVITY);
export const FALL_FORWARD_SPEED = 22 / FALL_SECONDS;
export const WATER_PARTICLES = { low: 2048, medium: 8192, high: 32768, ultra: 131072 } as const;

/** The existing authored parabola is a horizontal launch under gravity. */
export function fallingWaterAt(age: number) {
  const t = Math.max(0, Math.min(FALL_SECONDS, age));
  return { y: 54.08 - .5 * FALL_GRAVITY * t * t, z: -730 + FALL_FORWARD_SPEED * t,
    verticalSpeed: -FALL_GRAVITY * t };
}
