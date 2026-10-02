import * as T from 'three';
import { regionBridgeAt, regionSurfaceWater, type RegionRouteNode } from '../data/regions';
import { terrainHeight } from '../data/world';

/** Close only the outside bevel between perpendicular-ended route strips. */
export function trailJunctionGeometry(a: RegionRouteNode, node: RegionRouteNode, b: RegionRouteNode) {
  const ax = node.x - a.x, az = node.z - a.z, bx = b.x - node.x, bz = b.z - node.z;
  const al = Math.hypot(ax, az), bl = Math.hypot(bx, bz), turn = ax * bz - az * bx;
  if (!al || !bl || Math.abs(turn / (al * bl)) < 1e-8) return null;
  const radius = node.width / 2, side = -Math.sign(turn);
  const u = [-az / al * radius * side, ax / al * radius * side];
  const v = [-bz / bl * radius * side, bx / bl * radius * side];
  // Convex combinations of these endpoints cannot exceed the supported node radius.
  // Subdivide across the width as well as along the bevel to follow sampled ground.
  const count = Math.ceil(Math.max(radius, Math.hypot(u[0] - v[0], u[1] - v[1])) / .35);
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const rows: number[][] = [];
  for (let i = 0; i <= count; i++) {
    rows[i] = [];
    for (let j = 0; j <= count - i; j++) {
      const dx = (u[0] * i + v[0] * j) / count, dz = (u[1] * i + v[1] * j) / count;
      const x = node.x + dx, z = node.z + dz;
      // Route nodes on a deck or wet footprint must never acquire a ground landing.
      if (regionBridgeAt(x, z) || regionSurfaceWater(x, z) !== null) return null;
      rows[i][j] = positions.length / 3;
      positions.push(x, terrainHeight(x, z) + .035, z);
      uvs.push(dx, dz);
    }
  }
  const triangle = (a: number, b: number, c: number) => {
    // Y-up winding, independent of which direction the trail turns.
    if (turn > 0) indices.push(a, c, b); else indices.push(a, b, c);
  };
  for (let i = 0; i < count; i++) for (let j = 0; j < count - i; j++) {
    triangle(rows[i][j], rows[i + 1][j], rows[i][j + 1]);
    if (j < count - i - 1) triangle(rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
