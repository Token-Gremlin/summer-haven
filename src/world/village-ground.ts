import * as T from 'three';
import { riverX, terrainHeight } from '../data/world';
import { villageRiverGeometry } from './village-water';

type Vertex = number[]; // x, y, z, nx, ny, nz, u, v; original triangle interpolation
const START = -132, END = -112, INNER = 4.45, OUTER = 5.69, DRY = 5.1001;

function clip(poly: Vertex[], distance: (p: Vertex) => number): Vertex[] {
  const out: Vertex[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = distance(a), db = distance(b);
    if (da >= -1e-9) out.push(a);
    if ((da > 1e-9 && db < -1e-9) || (da < -1e-9 && db > 1e-9)) {
      const t = da / (da - db);
      out.push(a.map((v, k) => v + (b[k] - v) * t));
    }
  }
  return out;
}

/** Original ground topology, retained for reproducible geometry regression measurements. */
export function villageGroundBase(): T.BufferGeometry {
  const g = new T.PlaneGeometry(390, 327, 160, 134).rotateX(-Math.PI / 2).translate(0, 0, 31.5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, terrainHeight(p.getX(i), p.getZ(i), false) - 0.045);
  g.computeVertexNormals();
  return g;
}

/** Replace bank triangle pieces, never overlay them. Physics and the portal edge stay unchanged. */
export function villageGroundGeometry(connectValley = true): T.BufferGeometry {
  if (!connectValley) return villageGroundBase();
  const g = villageGroundBase(), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  const positions = Array.from(p.array), normals = Array.from(n.array), uvs = Array.from(uv.array);
  const index: number[] = [], added = new Map<string, number>();
  // Read the real water mesh stations so the bevel follows its polygonal edge and Y.
  const water = villageRiverGeometry(true,false), wp = water.attributes.position;
  function waterAt(z: number, side: number): [number, number] {
    let row = 0;
    while (row + 2 < wp.count && wp.getZ(row + 2) < z) row += 2;
    const next = Math.min(row + 2, wp.count - 2), t = (z - wp.getZ(row)) / (wp.getZ(next) - wp.getZ(row));
    const k = side < 0 ? 0 : 1;
    return [T.MathUtils.lerp(wp.getX(row + k), wp.getX(next + k), t), T.MathUtils.lerp(wp.getY(row), wp.getY(next), t)];
  }
  // 0.75 m stations plus water corners: local refinement only, not a denser village grid.
  const stations = [START, -130, -114, END];
  for (let z = START + 0.75; z < END; z += 0.75) stations.push(z);
  for (let i = 0; i < wp.count; i += 2) if (wp.getZ(i) > START && wp.getZ(i) < END) stations.push(wp.getZ(i));
  stations.sort((a, b) => a - b);
  const cuts = [...new Set(stations)];
  const originalIndex = g.index!;
  function vertex(id: number): Vertex {
    return [p.getX(id), p.getY(id), p.getZ(id), n.getX(id), n.getY(id), n.getZ(id), uv.getX(id), uv.getY(id)];
  }
  function emit(poly: Vertex[], height?: (v: Vertex) => number, bankNormal?: (v: Vertex) => T.Vector3) {
    if (poly.length < 3) return;
    const ids = poly.map(v => {
      const y = height ? height(v) : v[1];
      const key = `${v[0].toFixed(7)},${y.toFixed(7)},${v[2].toFixed(7)}`;
      const found = added.get(key);
      if (found !== undefined) return found;
      const id = positions.length / 3;
      positions.push(v[0], y, v[2]);
      const normal = bankNormal ? bankNormal(v) : new T.Vector3(v[3], v[4], v[5]);
      normals.push(normal.x, normal.y, normal.z); uvs.push(v[6], v[7]); added.set(key, id);
      return id;
    });
    for (let i = 1; i + 1 < ids.length; i++) {
      const a = poly[0], b = poly[i], c = poly[i + 1];
      if (Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0])) > 1e-9)
        index.push(ids[0], ids[i], ids[i + 1]);
    }
  }
  for (let k = 0; k < originalIndex.count; k += 3) {
    const ids = [originalIndex.getX(k), originalIndex.getX(k + 1), originalIndex.getX(k + 2)];
    const tri = ids.map(vertex), minZ = Math.min(...tri.map(v => v[2])), maxZ = Math.max(...tri.map(v => v[2]));
    const distances = tri.map(v => v[0] - riverX(v[2]));
    const side = (Math.min(...distances) < -INNER && Math.max(...distances) > -OUTER) ? -1
      : (Math.min(...distances) < OUTER && Math.max(...distances) > INNER) ? 1 : 0;
    if (!side || maxZ <= START || minZ >= END) { index.push(...ids); continue; }
    // External dry/dry edges meet unchanged neighbouring triangles exactly.
    // A mixed wet/dry edge belongs to two selected triangles and is resampled on both.
    const dryEdges = tri.map((a, i) => [a, tri[(i + 1) % 3]])
      .filter(edge => edge.every(v => side * (v[0] - riverX(v[2])) >= DRY));
    const onDryEdge = (v: Vertex) => dryEdges.some(([a, b]) =>
      Math.abs((b[0] - a[0]) * (v[2] - a[2]) - (b[2] - a[2]) * (v[0] - a[0])) < 1e-7);
    emit(clip(tri, v => START - v[2]));
    emit(clip(tri, v => v[2] - END));
    for (let s = 0; s + 1 < cuts.length; s++) {
      const lo = cuts[s], hi = cuts[s + 1];
      if (hi <= minZ || lo >= maxZ) continue;
      const slab = clip(clip(tri, v => v[2] - lo), v => hi - v[2]);
      if (slab.length < 3) continue;
      const center = (z: number) => T.MathUtils.lerp(riverX(lo), riverX(hi), (z - lo) / (hi - lo));
      const d = (v: Vertex) => side * (v[0] - center(v[2]));
      const toe = (z: number) => side * (waterAt(z, side)[0] - center(z)) - 0.06;
      const boundaries = [(v: Vertex) => d(v) - INNER, (v: Vertex) => d(v) - toe(v[2]),
        (v: Vertex) => d(v) - DRY];
      let pieces = [slab];
      for (const boundary of boundaries) pieces = pieces.flatMap(poly => [clip(poly, boundary), clip(poly, v => -boundary(v))]).filter(poly => poly.length >= 3);
      const height = (v: Vertex) => {
        const distance = d(v), z = v[2];
        if (distance <= INNER || z <= START || z >= END) return v[1];
        const wet = waterAt(z, side)[1] - 0.04, toeD = toe(z);
        const dry = terrainHeight(riverX(z) + side * DRY, z, false) - 0.045;
        const physicalDryX = riverX(z) + side * Math.max(DRY, side * (v[0] - riverX(z)));
        const land = onDryEdge(v) ? v[1] : terrainHeight(physicalDryX, z, false) - 0.045;
        const target = distance < toeD ? T.MathUtils.lerp(v[1], wet, (distance - INNER) / (toeD - INNER))
          : distance < DRY ? T.MathUtils.lerp(wet, dry, (distance - toeD) / (DRY - toeD))
          : land;
        const fade = T.MathUtils.smoothstep(z, START, -130) * (1 - T.MathUtils.smoothstep(z, -114, END));
        return T.MathUtils.lerp(v[1], target, fade);
      };
      const bankNormal = (v: Vertex) => {
        const normal = new T.Vector3(v[3], v[4], v[5]), distance = d(v), z = v[2];
        if (distance <= INNER || z <= START || z >= END) return normal;
        // Dry normals describe physical ground, never the discarded coarse-grid trench.
        const x = riverX(z) + side * Math.max(DRY + 0.03, side * (v[0] - riverX(z)));
        const eps = 0.01;
        const nx = (terrainHeight(x + eps, z, false) - terrainHeight(x - eps, z, false)) / (2 * eps);
        const nz = (terrainHeight(x, z + eps, false) - terrainHeight(x, z - eps, false)) / (2 * eps);
        const dryNormal = new T.Vector3(-nx, 1, -nz).normalize();
        const toeD = toe(z), wet = waterAt(z, side)[1] - 0.04;
        const dry = terrainHeight(riverX(z) + side * DRY, z, false) - 0.045;
        const slope = side * (dry - wet) / (DRY - toeD);
        const centerSlope = (riverX(hi) - riverX(lo)) / (hi - lo);
        const bevel = new T.Vector3(-slope, 1, slope * centerSlope).normalize();
        const target = distance >= DRY ? dryNormal : bevel.lerp(dryNormal, T.MathUtils.smoothstep(distance, toeD, DRY));
        const fade = T.MathUtils.smoothstep(z, START, -130) * (1 - T.MathUtils.smoothstep(z, -114, END));
        return normal.lerp(target, fade * T.MathUtils.smoothstep(distance, INNER, toeD));
      };
      for (const poly of pieces) emit(poly, height, bankNormal);
    }
  }
  water.dispose();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}
