import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { Regions } from '../src/world/regions';
import { Collision } from '../src/world/collision';
import { woodlandTemplate } from '../src/world/woodland-catalog';
import { grassClump, woodlandFloor } from '../src/world/vegetation';
import { REGIONS, regionAt, regionRouteSample, regionRiverSample, regionSurfaceWater } from '../src/data/regions';
import { BANK_TRAIL_WIDTH, bankTrailDistance } from '../src/data/bank-trail';
import { mosswoodGlade } from '../src/world/habitat-scenery';

// This is the production cell selection, not an enlarged/simplified vegetation fixture.
const regions = new Regions({} as any, { collision: new Collision() } as any);
for (let z = -132; z > -1160; z -= 32) for (let x = -160; x < 720; x += 32) {
  const route = regionRouteSample(x + 16, z - 16), region = regionAt(x + 16, z - 16);
  const touches = REGIONS.some(r => x < r.bounds.x1 && x + 32 > r.bounds.x0 && z > r.bounds.z0 && z - 32 < r.bounds.z1);
  if (!touches && route.distance > 65) continue;
  (regions as any).makeCell(x, z, region?.id ?? 'north-road');
}

test('botanical replacement preserves the finite terrain and groundcover budgets', (t) => {
  const trees = regions.treeCount;let floor = 0, triangles = 0, understory = 0, batches = 0;
  assert.equal(regions.cells.length, 331);
  for (const cell of regions.cells) {
    assert.ok(cell.foliage.length <= 2);
    for (const mesh of cell.group.children) if (mesh instanceof T.InstancedMesh) {
      if (mesh.userData.total !== undefined) {
        floor += mesh.count;triangles += mesh.count * mesh.geometry.index!.count / 3;batches++;
        if(mesh.geometry.index!.count/3===32)understory+=mesh.count;
      }
    }
  }
  // Placement candidates and terrain are unchanged. Different crown envelopes may reject
  // a handful of candidates along the bank; this is still the same finite wooded region.
  assert.equal(trees,2123,'the authored forest population is unchanged');
  assert.ok(floor <= 24891, `groundcover exceeds first candidate population: ${floor}`);
  assert.ok(triangles <= 27156 * 40, `floor triangle budget exceeded: ${triangles}`);
  t.diagnostic(JSON.stringify({cells:regions.cells.length,trees,floor,understory,triangles,batches}));
});

test('shared nature prototypes respect frozen triangle budgets and have finite geometry', () => {
  for (const [kind, seed] of [['round',184],['round',185],['tall',186],['tall',187],['cedar',188],['cedar',189]] as const) {
    const g = woodlandTemplate(kind, seed).levels[3];
    assert.ok(g.index!.count / 3 <= 700);
    for (const v of g.attributes.position.array) assert.ok(Number.isFinite(v));
  }
  for (const [g, budget] of [[grassClump(9383),40],[woodlandFloor(615),34]] as const) {
    assert.ok(g.index!.count / 3 <= budget);g.computeBoundingBox();
    assert.ok(g.boundingBox!.max.y < .65, 'groundcover must remain below wildlife silhouettes');
    assert.ok(g.boundingBox!.max.x - g.boundingBox!.min.x > .35, 'readable broad plant footprint');g.dispose();
  }
});

test('rendered floor vertices and their wind extremes stay off paths and out of water across the world', () => {
  const matrix = new T.Matrix4(), vertex = new T.Vector3();let checked = 0;
  for (const cell of regions.cells) for (const mesh of cell.foliage) {
    const p = mesh.geometry.attributes.position, wind = mesh.geometry.attributes.aWind;
    // Systematic sample of actual production matrices, every geometry vertex, four wind extremes.
    for (let instance = 0; instance < mesh.count; instance += 11) {
      mesh.getMatrixAt(instance, matrix);
      if(mesh.geometry.index!.count/3===32)assert.ok(mosswoodGlade(matrix.elements[12],matrix.elements[14])<.35,
        'broad plants must stay outside the low feeding footprint');
      for (let j = 0; j < p.count; j++) {
        vertex.fromBufferAttribute(p, j).applyMatrix4(matrix);
        const margin = .422 * wind.getX(j);
        for (const [dx,dz] of [[margin,0],[-margin,0],[0,margin],[0,-margin]]) {
          const x = vertex.x + dx, z = vertex.z + dz, route = regionRouteSample(x,z), river = regionRiverSample(z);
          assert.ok(route.distance >= route.width/2, `plant enters trail at ${x},${z}`);
          assert.ok(bankTrailDistance(x,z) >= BANK_TRAIL_WIDTH/2, `plant enters bank trail at ${x},${z}`);
          assert.ok(Math.abs(x-river.x) >= river.halfWidth, `plant enters river at ${x},${z}`);
          assert.equal(regionSurfaceWater(x,z), null, `plant enters surface water at ${x},${z}`);checked++;
        }
      }
    }
  }
  assert.ok(checked > 400000);
});
