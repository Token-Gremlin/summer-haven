import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { woodlandTemplate } from '../src/world/woodland-catalog';
import { Woodland, treeLodLevels } from '../src/world/woodland';
import { alphaCoverage, preserveLeafCoverage } from '../src/render/leaf-mips';
import { canopyHullObstacle } from '../src/world/tree-canopy';
import { Collision } from '../src/world/collision';
import { DEFAULT_SETTINGS } from '../src/core/save';

test('botanical templates retain readable near branches, bounded distant geometry and safe camera clearance', () => {
  for (const [kind, seed] of [
    ['round', 11],
    ['tall', 14],
    ['cedar', 17],
    ['round', 20],
    ['tall', 23],
    ['cedar', 26],
    ['round', 184],
    ['round', 185],
    ['tall', 186],
    ['tall', 187],
    ['cedar', 188],
    ['cedar', 189],
  ] as const) {
    const t = woodlandTemplate(kind, seed);
    assert.equal(woodlandTemplate(kind, seed), t, 'shared prototype, not rebuilt per placement');
    assert.ok(t.triangles[0] > 6000 && t.triangles[0] <= 22000);
    assert.ok(t.triangles[3] < 700 && t.triangles[3] < t.triangles[0] * 0.1, 'distant geometry stays cheap');
    assert.ok(t.shadow.index!.count / 3 < 1100, 'bounded opaque shadow proxy');
    for (const index of t.shadow.index!.array)
      assert.ok(t.shadow.attributes.aMat.getX(index) >= 40, 'shadow clusters use opaque surfaces');
    for (let level = 0; level < 4; level++) {
      const g = t.levels[level];
      if (level > 0) assert.ok(t.triangles[level] < t.triangles[level - 1]);
      for (const v of g.attributes.position.array) assert.ok(Number.isFinite(v));
      for (const v of g.attributes.normal.array) assert.ok(Number.isFinite(v));
      for (let i = 0; i < g.attributes.position.count; i += 7)
        assert.ok(
          t.bounds.containsPoint(new T.Vector3().fromBufferAttribute(g.attributes.position, i)),
          'every LOD fits the shared frustum envelope',
        );
      assert.ok(g.boundingBox!.min.y > -0.3, 'no dangling distant leaf beneath terrain');
    }
    const matrix = new T.Matrix4().compose(
      new T.Vector3(17, 0.02, 4),
      new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), 0.8),
      new T.Vector3(0.8, 0.9, 0.8),
    );
    const proxy = canopyHullObstacle(t.canopy, matrix);
    assert.ok(proxy.bottom! > 2.1, 'follow camera fits below the limbed-up crown');
    assert.equal(proxy.cameraOnly, true);
    for (const g of t.levels.slice(0, 2))
      for (let i = 0; i < g.attributes.position.count; i += 5)
        if (g.attributes.aMat.getX(i) < 36) {
          const p = new T.Vector3().fromBufferAttribute(g.attributes.position, i).applyMatrix4(matrix);
          for (const plane of proxy.cameraHull!)
            assert.ok(
              plane.x * p.x + plane.y * p.y + plane.z * p.z + plane.constant < 1e-4,
              'near foliage inside camera hull',
            );
        }
    const c = new Collision();
    c.add(proxy);
    assert.equal(
      c.cameraDistance({ x: 10, y: 1.65, z: 4 }, { x: 1, y: 0, z: 0 }, 14, () => 0),
      14,
    );
  }
});

test('LOD membership covers transition bands on all presets, including fast cycling update slack', () => {
  for (const q of ['low', 'medium', 'high', 'ultra'] as const)
    for (let d = 0; d < 1600; d += 0.31) {
      const levels = treeLodLevels(d, q);
      assert.ok(levels.length >= 1 && levels.length <= 2, `${q} gap at ${d}`);
      if (q === 'low') assert.ok(!levels.includes(0));
      if (d > 400) assert.deepEqual(levels, [3]);
    }
});

test('full landscape keeps far trees at bounded detail; settings and camera changes reuse buffers', () => {
  const forest = new Woodland('test');
  for (const [x, z] of [
    [0, -12],
    [0, -65],
    [0, -260],
    [0, 90],
  ])
    forest.add('round', 11, new T.Matrix4().makeTranslation(x, 0, z));
  forest.build();
  const settings = { ...DEFAULT_SETTINGS, quality: 'high' as const, visibility: 'full' as const };
  const camera = new T.PerspectiveCamera(60, 1, 0.1, 1800);
  camera.position.set(0, 2, 0);
  camera.lookAt(0, 2, -1);
  forest.update(new T.Vector3(), settings, camera);
  assert.equal(forest.stats().visible, 4);
  assert.ok(forest.stats().levels[3] > 0);
  const meshes = forest.group.children as T.InstancedMesh[],
    buffers = meshes.map((m) => m.instanceMatrix);
  const versions = meshes.map((m) => m.instanceMatrix.version);
  forest.update(new T.Vector3(), settings, camera);
  assert.deepEqual(
    meshes.map((m) => m.instanceMatrix.version),
    versions,
    'stationary camera does not upload forests',
  );
  const old = forest.stats().levels;
  camera.lookAt(0, 2, 1);
  forest.update(new T.Vector3(), settings, camera);
  assert.notDeepEqual(forest.stats().levels, old, 'rotating in place refreshes visible trees');
  forest.update(new T.Vector3(), { ...settings, reflections: false }, camera);
  assert.ok(
    meshes.filter((m) => m.layers.mask === 4).every((m) => m.count === 0),
    'disabled reflections allocate no population',
  );
  forest.update(new T.Vector3(), { ...settings, visibility: 'nearby', distance: 90 }, camera);
  assert.ok(forest.stats().visible < 4);
  assert.deepEqual(
    meshes.map((m) => m.instanceMatrix),
    buffers,
    'quality and visibility reuse allocated buffers',
  );
  assert.ok(meshes.filter((m) => m.layers.mask === 2).every((m) => m.name.includes('shadow')));
});

test('alpha mip correction preserves thin-leaf coverage without changing colour or transparent holes', () => {
  const pixels = new Uint8ClampedArray(64 * 4);
  for (let i = 0; i < 64; i++) {
    pixels[i * 4] = 45;
    pixels[i * 4 + 1] = 120;
    pixels[i * 4 + 2] = 30;
    pixels[i * 4 + 3] = i < 16 ? 44 + i * 3 : 0;
  }
  preserveLeafCoverage(pixels, 0.25);
  assert.ok(Math.abs(alphaCoverage(pixels) - 0.25) <= 1 / 64);
  for (let i = 0; i < 64; i++) {
    assert.equal(pixels[i * 4 + 1], 120);
    if (i >= 16) assert.equal(pixels[i * 4 + 3], 0);
  }
});
