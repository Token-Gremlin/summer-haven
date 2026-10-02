import * as T from 'three';
type Vertex = [number, number, number, number, number]; // x, y, z, u, v
type Polygon = Vertex[];
const cross = (a: Vertex, b: Vertex, p: Vertex) =>
  (b[0] - a[0]) * (p[2] - a[2]) - (b[2] - a[2]) * (p[0] - a[0]);
const area = (p: Polygon) =>
  Math.abs(
    p.reduce((s, a, i) => {
      const b = p[(i + 1) % p.length];
      return s + a[0] * b[2] - b[0] * a[2];
    }, 0),
  ) * 0.5;
function split(polygon: Polygon, a: Vertex, b: Vertex, sign: number): [Polygon, Polygon] {
  const inside: Polygon = [],
    outside: Polygon = [];
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i],
      q = polygon[(i + 1) % polygon.length];
    const dp = cross(a, b, p) * sign,
      dq = cross(a, b, q) * sign;
    const pin = dp >= -1e-8,
      qin = dq >= -1e-8;
    (pin ? inside : outside).push(p);
    if (pin !== qin) {
      const t = Math.max(0, Math.min(1, dp / (dp - dq)));
      const hit = p.map((v, j) => v + (q[j] - v) * t) as Vertex;
      inside.push(hit);
      outside.push(hit);
    }
  }
  return [inside, outside];
}
/** Difference of a convex source polygon and one triangle, preserving height and UV interpolation. */
function subtract(polygon: Polygon, triangle: Polygon) {
  const result: Polygon[] = [];
  const sign = Math.sign(cross(triangle[0], triangle[1], triangle[2]));
  if (!sign) return [polygon];
  let remaining = polygon;
  for (let i = 0; i < 3 && remaining.length >= 3; i++) {
    const [inside, outside] = split(remaining, triangle[i], triangle[(i + 1) % 3], sign);
    if (outside.length >= 3 && area(outside) > 1e-7) result.push(outside);
    remaining = inside;
  }
  return result;
}
const keys = (p: Polygon) => {
  const xs = p.map((v) => v[0]),
    zs = p.map((v) => v[2]),
    result: string[] = [];
  for (let x = Math.floor(Math.min(...xs) / 8); x <= Math.floor(Math.max(...xs) / 8); x++)
    for (let z = Math.floor(Math.min(...zs) / 8); z <= Math.floor(Math.max(...zs) / 8); z++)
      result.push(`${x},${z}`);
  return result;
};

/** A junction has one surface. Later side paths end at earlier roads instead of fighting their depth. */
export class PathSurfaces {
  private grid = new Map<string, Polygon[]>();
  add(source: T.BufferGeometry) {
    const position = source.getAttribute('position'),
      uv = source.getAttribute('uv'),
      index = source.getIndex()!;
    const triangles: Polygon[] = [],
      positions: number[] = [],
      uvs: number[] = [];
    for (let i = 0; i < index.count; i += 3) {
      const triangle = [0, 1, 2].map((j) => {
        const k = index.getX(i + j);
        return [position.getX(k), position.getY(k), position.getZ(k), uv.getX(k), uv.getY(k)] as Vertex;
      });
      if (area(triangle) < 1e-7) continue;
      triangles.push(triangle);
      const candidates = new Set(keys(triangle).flatMap((k) => this.grid.get(k) || []));
      let pieces = [triangle];
      for (const cover of candidates) {
        pieces = pieces.flatMap((piece) => subtract(piece, cover));
        if (!pieces.length) break;
      }
      for (const piece of pieces)
        for (let j = 1; j < piece.length - 1; j++)
          for (const v of [piece[0], piece[j], piece[j + 1]]) {
            positions.push(v[0], v[1], v[2]);
            uvs.push(v[3], v[4]);
          }
    }
    for (const t of triangles)
      for (const key of keys(t)) {
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key)!.push(t);
      }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(Array.from({ length: positions.length / 3 }, (_, i) => i));
    geometry.computeVertexNormals();
    source.dispose();
    return geometry;
  }
}
