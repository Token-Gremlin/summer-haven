import * as T from 'three';
import type { Collision, Obstacle } from './collision';

export function underWeatherObstacle(o: Obstacle, x: number, z: number) {
  if (o.cameraOnly || /deer|bird|npc|dragon|siltfin/i.test(o.tag ?? '')) return false;
  if (o.r !== undefined) return o.r > 0.8 && (x - o.x) ** 2 + (z - o.z) ** 2 < o.r ** 2;
  const c = Math.cos(o.yaw ?? 0),
    s = Math.sin(o.yaw ?? 0),
    dx = x - o.x,
    dz = z - o.z;
  return (
    (o.w ?? 0) >= 1 &&
    (o.d ?? 0) >= 1 &&
    Math.abs(dx * c - dz * s) < (o.w ?? 0) / 2 &&
    Math.abs(dx * s + dz * c) < (o.d ?? 0) / 2
  );
}
export function precipitationHeight(x: number, z: number, ground: number, obstacles: Iterable<Obstacle>) {
  let height = ground;
  for (const o of obstacles)
    if (underWeatherObstacle(o, x, z)) height = Math.max(height, (o.bottom ?? 0) + o.height);
  return height;
}
/** A local catchment texture: terrain, water and simplified roof proxies. Rebuilt only
 * after moving four metres. Precipitation never needs thousands of CPU raycasts. */
export class WeatherSurface {
  static readonly size = 64;
  static readonly span = 96;
  readonly data = new Float32Array(WeatherSurface.size ** 2);
  readonly texture = new T.DataTexture(
    this.data,
    WeatherSurface.size,
    WeatherSurface.size,
    T.RedFormat,
    T.FloatType,
  );
  readonly area = new T.Vector4(0, 0, WeatherSurface.span, 0);
  readonly emitters = Array.from({ length: 24 }, () => new T.Vector4());
  emitterCount = 0;
  rebuilds = 0;
  private key = '';
  constructor(
    private collision: Collision,
    private ground: (x: number, z: number) => number,
  ) {
    this.texture.minFilter = this.texture.magFilter = T.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.name = 'Local precipitation catchment';
  }
  update(eye: T.Vector3) {
    const x = Math.round(eye.x / 4) * 4,
      z = Math.round(eye.z / 4) * 4,
      key = `${x}/${z}`;
    if (key === this.key) return false;
    this.key = key;
    const half = WeatherSurface.span / 2,
      n = WeatherSurface.size;
    this.area.set(x - half, z - half, WeatherSurface.span, 1);
    const candidates = [...this.collision.query(x - half, z - half, x + half, z + half)];
    const solid = candidates.filter(
      (o) => !o.cameraOnly && ((o.r ?? 0) > 0.8 || ((o.w ?? 0) >= 1 && (o.d ?? 0) >= 1)),
    );
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const px = x - half + ((i + 0.5) / n) * WeatherSurface.span,
          pz = z - half + ((j + 0.5) / n) * WeatherSurface.span;
        this.data[j * n + i] = precipitationHeight(px, pz, this.ground(px, pz), solid);
      }
    const crowns = candidates
      .filter((o) => o.cameraOnly && /tree-canopy/.test(o.tag ?? ''))
      .sort((a, b) => (a.x - x) ** 2 + (a.z - z) ** 2 - (b.x - x) ** 2 - (b.z - z) ** 2)
      .slice(0, 24);
    this.emitterCount = crowns.length;
    this.emitters.forEach((v, i) => {
      const o = crowns[i];
      v.set(
        o?.x ?? x,
        o ? (o.bottom ?? 0) + o.height * 0.35 : 0,
        o?.z ?? z,
        o ? Math.min(3, (o.w ?? 2) * 0.4) : 0,
      );
    });
    this.texture.needsUpdate = true;
    this.rebuilds++;
    return true;
  }
}
