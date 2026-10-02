import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { REGION_BRIDGES, REGION_ROUTE, regionBridgeAt, regionSurfaceWater, type RegionRouteNode } from '../src/data/regions';
import { terrainHeight } from '../src/data/world';
import { PathSurfaces } from '../src/world/path-surface';
import { trailJunctionGeometry } from '../src/world/trail-junction';

function area(g: T.BufferGeometry) {
  const p = g.getAttribute('position'), index = g.getIndex()!;
  let result = 0;
  for (let i = 0; i < index.count; i += 3) {
    const [a, b, c] = [0, 1, 2].map(j => index.getX(i + j));
    result += Math.abs((p.getX(b) - p.getX(a)) * (p.getZ(c) - p.getZ(a)) -
      (p.getZ(b) - p.getZ(a)) * (p.getX(c) - p.getX(a))) / 2;
  }
  return result;
}

function contains(g: T.BufferGeometry, x: number, z: number) {
  const p = g.getAttribute('position'), index = g.getIndex()!;
  for (let i = 0; i < index.count; i += 3) {
    const corners = [0, 1, 2].map(j => index.getX(i + j));
    const crosses = corners.map((a, j) => {
      const b = corners[(j + 1) % 3];
      return (p.getX(b) - p.getX(a)) * (z - p.getZ(a)) - (p.getZ(b) - p.getZ(a)) * (x - p.getX(a));
    });
    if (crosses.every(c => c >= -1e-8) || crosses.every(c => c <= 1e-8)) return true;
  }
  return false;
}

// The same finite, perpendicular end planes used by Regions.makeRoute, independent of the fix.
function ribbon(a: RegionRouteNode, b: RegionRouteNode) {
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz), positions: number[] = [];
  for (const node of [a, b]) for (const side of [-1, 1]) {
    const x = node.x - dz / length * node.width / 2 * side;
    const z = node.z + dx / length * node.width / 2 * side;
    positions.push(x, terrainHeight(x, z) + .035, z);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  return g;
}

test('Mosswood seam is missing finite-ribbon coverage, closed with the exact outside bevel', () => {
  const [a, n, b] = REGION_ROUTE.slice(6, 9);
  const ax = n.x - a.x, az = n.z - a.z, bx = b.x - n.x, bz = b.z - n.z;
  const al = Math.hypot(ax, az), bl = Math.hypot(bx, bz), radius = n.width / 2;
  // Analytic barycentre of the outside wedge, not a render or helper-derived sample.
  const x = 196.76103678790275, z = -491.0739488359577;
  const incoming = ((x - n.x) * ax + (z - n.z) * az) / al;
  const outgoing = ((x - n.x) * bx + (z - n.z) * bz) / bl;
  assert.ok(incoming > .0569, 'point is beyond the incoming ribbon end plane');
  assert.ok(outgoing < -.0569, 'point is before the outgoing ribbon start plane');
  const expectedArea = radius * radius * Math.abs(ax * bz - az * bx) / (2 * al * bl);
  assert.ok(Math.abs(expectedArea - .15380295436919034) < 1e-12);
  const surfaces = new PathSurfaces(), first = surfaces.add(ribbon(a, n)), second = surfaces.add(ribbon(n, b));
  assert.equal(contains(first, x, z) || contains(second, x, z), false);
  const source = trailJunctionGeometry(a, n, b)!;
  const join = surfaces.add(source);
  assert.equal(contains(join, x, z), true);
  assert.ok(Math.abs(area(join) - expectedArea) < .0001, 'added area is only the missing bevel');
  const duplicate = surfaces.add(trailJunctionGeometry(a, n, b)!);
  assert.ok(area(duplicate) < 1e-7, 'the junction participates in existing surface ownership');
  for (const g of [first, second, join, duplicate]) g.dispose();
});

test('every current route bevel stays within supported dry ground and follows the existing surface height', () => {
  let junctions = 0, samples = 0;
  for (let i = 2; i < REGION_ROUTE.length - 1; i++) {
    const node = REGION_ROUTE[i], g = trailJunctionGeometry(REGION_ROUTE[i - 1], node, REGION_ROUTE[i + 1]);
    if (!g) continue;
    junctions++;
    const previous = REGION_ROUTE[i - 1], next = REGION_ROUTE[i + 1];
    const incoming = new T.Vector2(node.x - previous.x, node.z - previous.z).normalize();
    const outgoing = new T.Vector2(next.x - node.x, next.z - node.z).normalize();
    const p = g.getAttribute('position'), normal = g.getAttribute('normal'), index = g.getIndex()!;
    for (let j = 0; j < p.count; j++) {
      assert.ok(Math.hypot(p.getX(j) - node.x, p.getZ(j) - node.z) <= node.width / 2 + .00005, node.id);
      assert.ok(Math.abs(p.getY(j) - terrainHeight(p.getX(j), p.getZ(j)) - .035) < .00002, node.id);
      assert.ok(normal.getY(j) > .99, `upward landing ${node.id}`);
    }
    for (let j = 0; j < index.count; j += 3) {
      const [a, b, c] = [0, 1, 2].map(k => index.getX(j + k));
      const center = new T.Vector2((p.getX(a) + p.getX(b) + p.getX(c)) / 3 - node.x,
        (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3 - node.z);
      assert.ok(center.dot(incoming) >= -.00005, `beyond incoming end ${node.id}`);
      assert.ok(center.dot(outgoing) <= .00005, `before outgoing start ${node.id}`);
      // Independently inspect vertices, edges and face interiors, not only builder vertices.
      for (let u = 0; u <= 4; u++) for (let v = 0; v <= 4 - u; v++) {
        const weights = [u / 4, v / 4, 1 - (u + v) / 4];
        const x = [a, b, c].reduce((sum, k, t) => sum + p.getX(k) * weights[t], 0);
        const z = [a, b, c].reduce((sum, k, t) => sum + p.getZ(k) * weights[t], 0);
        const y = [a, b, c].reduce((sum, k, t) => sum + p.getY(k) * weights[t], 0);
        assert.equal(regionSurfaceWater(x, z), null, `water ${node.id}`);
        assert.equal(regionBridgeAt(x, z), null, `bridge ${node.id}`);
        assert.ok(Math.abs(y - terrainHeight(x, z) - .035) < .0001, `terrain conformity ${node.id}`);
        samples++;
      }
    }
    assert.ok(p.count <= 231, 'bounded additional geometry');
    g.dispose();
  }
  assert.equal(junctions, 17);
  assert.ok(samples > 5000);
});

test('straight, duplicate, wet and bridge nodes do not gain junction geometry', () => {
  const node = { ...REGION_ROUTE[7] };
  assert.equal(trailJunctionGeometry(node, node, REGION_ROUTE[8]), null);
  assert.equal(trailJunctionGeometry({ ...node, x: node.x - 5 }, node, { ...node, x: node.x + 5 }), null);
  const wet = { ...node, x: 370, z: -698 };
  assert.equal(trailJunctionGeometry({ ...wet, x: wet.x - 5 }, wet, { ...wet, z: wet.z - 5 }), null);
  const bridge = REGION_BRIDGES[0];
  const deck = { ...node, x: (bridge.from.x + bridge.to.x) / 2, z: (bridge.from.z + bridge.to.z) / 2 };
  assert.equal(trailJunctionGeometry({ ...deck, x: deck.x - 5 }, deck, { ...deck, z: deck.z - 5 }), null);
});
