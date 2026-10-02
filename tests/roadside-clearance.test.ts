import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { Village } from '../src/world/village';
import { Regions } from '../src/world/regions';
import { REGION_ROUTE, WORLD_BOUNDS, regionAt, regionRouteSample } from '../src/data/regions';
import { terrainHeight } from '../src/data/world';

// Only canvas painting and loaded decorative assets are stubbed. All procedural
// geometry, placement, obstacle registration and collision use production code.
const previousDocument = globalThis.document;
globalThis.document = { createElement: () => ({ getContext: () => ({
  fillRect() {}, strokeRect() {}, fillText() {},
}) }) } as unknown as Document;
const assets = { get: () => new T.Group() } as any;
const village = new Village(assets, false);
await village.build(() => {});
village.collision.bounds = { ...WORLD_BOUNDS };
const regions = new Regions(assets, village);
(regions as any).makePlaces();
for (let x = -32; x <= 32; x += 32) for (let z = -132; z >= -228; z -= 32)
  (regions as any).makeCell(x, z, regionAt(x + 16, z - 16)?.id ?? 'north-road');
globalThis.document = previousDocument;

test('generated entry-road obstacles leave the full road width usable by a bicycle', () => {
  let samples = 0;
  for (let i = 1; i <= 3; i++) {
    const a = REGION_ROUTE[i - 1], b = REGION_ROUTE[i];
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    for (let distance = 0; distance <= length; distance += .15) {
      const t = distance / length, width = a.width + (b.width - a.width) * t;
      for (let lane = -1; lane <= 1; lane += .25) {
        const x = a.x + dx * t - dz / length * width / 2 * lane;
        const z = a.z + dz * t + dx / length * width / 2 * lane;
        assert.equal(village.collision.blocked(x, z, .45, terrainHeight(x, z)), false,
          `blocked bicycle on ${a.id} at ${x},${z}`);
        samples++;
      }
    }
  }
  assert.ok(samples > 9500);
});

test('milepost keeps its physical collisions and has a clear roadside reading approach', () => {
  const post = village.collision.obstacles.find(o => o.tag === 'milepost-post')!;
  const panel = village.collision.obstacles.find(o => o.tag === 'milepost-panel')!;
  assert.ok(post && panel);
  assert.equal(village.collision.blocked(post.x, post.z, .45, terrainHeight(post.x, post.z)), true);
  assert.equal(village.collision.blocked(panel.x, panel.z, .27, panel.bottom!), true);
  const interaction = regions.interactions.find(i => i.id === 'region-milepost')!;
  assert.equal(village.collision.blocked(interaction.x, interaction.z, .45,
    terrainHeight(interaction.x, interaction.z)), false);
  const start = { x: 10.4, z: -180 };
  const distance = Math.hypot(interaction.x - start.x, interaction.z - start.z);
  for (let t = 0; t <= 1; t += .05 / distance) {
    const x = T.MathUtils.lerp(start.x, interaction.x, t), z = T.MathUtils.lerp(start.z, interaction.z, t);
    assert.equal(village.collision.blocked(x, z, .45, terrainHeight(x, z)), false,
      `reading approach obstructed at ${x},${z}`);
  }
  assert.ok(Math.hypot(interaction.x - post.x, interaction.z - post.z) < interaction.radius);
});

test('the authored milepost mesh and lettering also clear the bicycle road envelope', () => {
  const post = village.collision.obstacles.find(o => o.tag === 'milepost-post')!;
  const signMeshes = regions.group.children.filter((o): o is T.Mesh => {
    if (!(o instanceof T.Mesh)) return false;
    const center = new T.Box3().setFromObject(o).getCenter(new T.Vector3());
    return Math.abs(center.x - post.x) < .01 && Math.abs(center.z - post.z) < .1;
  });
  assert.equal(signMeshes.length, 2, 'physical post/panel and painted lettering both located at the new verge');
  for (const mesh of signMeshes) {
    const positions = mesh.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const point = new T.Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      const route = regionRouteSample(point.x, point.z);
      assert.ok(route.distance > route.width / 2 + .45, 'rendered geometry enters bicycle road envelope');
    }
  }
});
