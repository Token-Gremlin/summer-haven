import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DeerGait } from '../src/world/deer-gait';
import { HabitatLife } from '../src/world/habitat-life';
async function asset() {
  const b = readFileSync('public/assets/creatures/haven-wildlife.glb');
  const g = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
  return g.scene.getObjectByName('Wildlife_Deer')!;
}
function contact(hoof: T.Object3D, terrain: (x: number, z: number) => number) {
  let min = Infinity;
  hoof.updateWorldMatrix(true, true);
  hoof.traverse((o) => {
    if (o instanceof T.Mesh) {
      const p = o.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const v = new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        min = Math.min(min, v.y - terrain(v.x, v.z));
      }
    }
  });
  return min;
}
test('actual exported hoof surfaces stay on flat and sloped terrain at rest, walking and stopping', async () => {
  for (const slope of [0, 0.12, -0.12])
    for (const yaw of [0, Math.PI / 2, 0.7]) {
      const terrain = (x: number, z: number) => slope * z + 0.04 * x,
        model = await asset(),
        root = new T.Group();
      root.add(model);
      root.rotation.y = yaw;
      const gait = DeerGait.create(root, model, terrain)!;
      assert.ok(gait);
      const positions = model.getObjectByName('deer_Knee_FL')!.position.clone();
      let planted = 0,
        raised = 0,
        maxSlide = 0;
      const previous = new Map<string, { p: T.Vector3; c: number }>();
      const knees: number[] = [];
      for (let frame = 0; frame < 300; frame++) {
        const moving = frame >= 30 && frame < 220;
        if (moving) {
          root.position.x += Math.sin(yaw) / 60;
          root.position.z += Math.cos(yaw) / 60;
        }
        root.position.y = terrain(root.position.x, root.position.z);
        gait.update(1 / 60, moving, frame === 0);
        for (const code of ['FL', 'FR', 'BL', 'BR']) {
          const hoof = model.getObjectByName('deer_Hoof_' + code)!;
          const c = contact(hoof, terrain),
            p = hoof.getWorldPosition(new T.Vector3());
          assert.ok(c >= -0.003, `penetration ${c} slope ${slope} frame ${frame} ${code}`);
          assert.ok(c <= 0.069, `floating ${c} slope ${slope} frame ${frame} ${code}`);
          if (c < 0.0001) planted++;
          else raised++;
          const last = previous.get(code);
          if (last && c < 0.0001 && last.c < 0.0001)
            maxSlide = Math.max(maxSlide, Math.hypot(p.x - last.p.x, p.z - last.p.z));
          previous.set(code, { p, c });
          if (frame > 250) assert.ok(c < 0.0001, 'stopped hoof settles');
        }
        knees.push(model.getObjectByName('deer_Knee_FL')!.rotation.x);
      }
      assert.ok(planted > raised);
      assert.ok(raised > 0);
      assert.ok(maxSlide < 0.003, `stance slip ${maxSlide}`);
      assert.ok(Math.max(...knees) - Math.min(...knees) > 0.1, 'knee articulates');
      assert.deepEqual(
        model.getObjectByName('deer_Knee_FL')!.position,
        positions,
        'rest translation unchanged',
      );
    }
});
test('missing pivots are safe, and rendered gait preserves saved/offscreen simulation', async () => {
  assert.equal(
    DeerGait.create(new T.Group(), new T.Group(), () => 0),
    undefined,
  );
  const model = await asset();
  const options = {
    terrainHeight: (x: number, z: number) => 0.02 * x + 0.03 * z,
    waterHeight: () => null,
    blocked: () => false,
    assets: { deer: { scene: model } },
    habitats: [
      {
        id: 'test',
        species: 'deer' as const,
        count: 1,
        radius: 0.2,
        speed: 1,
        points: [
          { x: 0, z: 0 },
          { x: 4, z: 0 },
          { x: 4, z: 4 },
        ],
      },
    ],
  };
  const a = new HabitatLife({ ...options, drawDistance: 100 }),
    b = new HabitatLife({ ...options, drawDistance: 0 });
  for (let i = 0; i < 1000; i++) {
    a.update(0.05, 0.5, { x: 20, y: 0, z: 20 });
    b.update(0.05, 0.5, { x: 20, y: 0, z: 20 });
  }
  assert.deepEqual(a.snapshot(), b.snapshot());
  const saved = a.snapshot(),
    restored = new HabitatLife({ ...options, saved });
  assert.deepEqual(restored.snapshot(), saved);
  a.reset();
  for (const code of ['FL', 'FR', 'BL', 'BR'])
    assert.ok(
      Math.abs(contact(a.group.getObjectByName('deer_Hoof_' + code)!, options.terrainHeight)) < 0.003,
    );
});

import { terrainHeight } from '../src/data/world';
import { HABITATS } from '../src/data/habitats';
import { regionSurfaceWater } from '../src/data/regions';
import { Collision } from '../src/world/collision';
test('exported hooves on actual Mosswood routes including heading changes and feeding', async () => {
  const fixture = JSON.parse(readFileSync('docs/gauntlet/evidence/habitat-collision-05.json', 'utf8'));
  const collision = new Collision();
  collision.bounds = fixture.bounds;
  collision.obstacles = Object.values(fixture.obstacles);
  const blocked = (x: number, y: number, z: number, r: number) =>
    [...collision.query(x - r, z - r, x + r, z + r)].some(
      (o) =>
        !o.cameraOnly &&
        y <= (o.bottom ?? 0) + o.height &&
        y + 0.8 >= (o.bottom ?? 0) &&
        collision.contains(o, x, z, r),
    );
  const life = new HabitatLife({
    terrainHeight,
    waterHeight: regionSurfaceWater,
    blocked,
    assets: { deer: { scene: await asset() } },
    habitats: HABITATS,
  });
  const states = new Set<string>();
  let worst = 0,
    highest = 0,
    lowering = 0,
    envelope = 0;
  let deepest: unknown;
  for (let i = 0; i < 2400; i++) {
    life.update(0.05, 0.5, { x: 0, y: 0, z: 0 });
    for (const a of life.inspect().animals) states.add(a.state);
    for (const root of life.group.children.filter((r) => r.getObjectByName('deer_BodyPivot')))
      for (const code of ['FL', 'FR', 'BL', 'BR']) {
        if (0.93 - root.getObjectByName('deer_BodyPivot')!.position.y > lowering) {
          lowering = 0.93 - root.getObjectByName('deer_BodyPivot')!.position.y;
          deepest = {
            i,
            p: root.position.toArray(),
            yaw: root.rotation.y,
            state: life.inspect().animals,
            feet: ['FL', 'FR', 'BL', 'BR'].map((c) =>
              root
                .getObjectByName('deer_Hoof_' + c)!
                .getWorldPosition(new T.Vector3())
                .toArray(),
            ),
          };
        }
        if (i % 40 === 0 && code === 'FL')
          root.traverse((o) => {
            if (o instanceof T.Mesh) {
              o.updateMatrixWorld(true);
              if (o instanceof T.SkinnedMesh) o.skeleton.update();
              const p = o.geometry.getAttribute('position');
              for (let j = 0; j < p.count; j++) {
                const v = o.getVertexPosition(j, new T.Vector3()).applyMatrix4(o.matrixWorld);
                envelope = Math.max(envelope, Math.hypot(v.x - root.position.x, v.z - root.position.z));
              }
            }
          });
        const c = contact(root.getObjectByName('deer_Hoof_' + code)!, terrainHeight);
        worst = Math.min(worst, c);
        highest = Math.max(highest, c);
      }
  }
  assert.ok(worst > -0.005, `world penetration ${worst}`);
  assert.ok(highest < 0.075, `world lift ${highest}`);
  assert.ok(envelope <= 1.6, 'posed envelope ' + envelope);
  assert.ok(lowering < 0.15, 'body lowering ' + lowering + ' ' + JSON.stringify(deepest));
  assert.ok(states.has('wander') && states.has('feed') && states.has('rest'));
});

import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
test('connected deer skin has normalized weights and independent cloned articulation', async () => {
  const source = await asset();
  const model = cloneSkeleton(source);
  const skin = model.getObjectByName('deer_ConnectedSkin') as T.SkinnedMesh;
  assert.ok(skin?.isSkinnedMesh);
  assert.equal(skin.userData.authoredVertexColor, true);
  const g = skin.geometry,
    weights = g.getAttribute('skinWeight'),
    indices = g.index!;
  const colors = g.getAttribute('color');
  assert.equal(colors.count, g.getAttribute('position').count);
  const adjacency = Array.from({ length: weights.count }, () => new Set<number>());
  for (let i = 0; i < indices.count; i += 3) {
    const a = indices.getX(i),
      b = indices.getX(i + 1),
      c = indices.getX(i + 2);
    adjacency[a].add(b).add(c);
    adjacency[b].add(a).add(c);
    adjacency[c].add(a).add(b);
  }
  const visited = new Set<number>(),
    queue = [0];
  while (queue.length) {
    const v = queue.pop()!;
    if (visited.has(v)) continue;
    visited.add(v);
    for (const n of adjacency[v]) queue.push(n);
  }
  assert.equal(visited.size, weights.count, 'torso/neck/upper and lower limbs are one connected skin');
  let blended = 0;
  for (let i = 0; i < weights.count; i++) {
    const w = [weights.getX(i), weights.getY(i), weights.getZ(i), weights.getW(i)];
    assert.ok(w.every((v) => v >= 0 && Number.isFinite(v)));
    assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 0.0001);
    if (w.filter((v) => v > 0.02).length > 1) blended++;
  }
  assert.ok(blended > 200, 'junctions blend over volume rather than rigid capped segments');
  model.updateMatrixWorld(true);
  skin.skeleton.update();
  const before = Array.from({ length: weights.count }, (_, i) => skin.getVertexPosition(i, new T.Vector3()));
  model.getObjectByName('deer_Leg_FL')!.rotation.x += 0.35;
  model.getObjectByName('deer_NeckPivot')!.rotation.x += 1.1;
  model.position.set(212, 50, -505);
  model.updateMatrixWorld(true);
  skin.skeleton.update();
  let changed = 0;
  for (let i = 0; i < weights.count; i++) {
    const p = skin.getVertexPosition(i, new T.Vector3());
    assert.ok(p.toArray().every(Number.isFinite));
    assert.ok(p.length() < 3, 'skin positions remain local under large world translations');
    if (p.distanceTo(before[i]) > 0.01) changed++;
  }
  assert.ok(changed > 200);
  assert.equal(source.getObjectByName('deer_Leg_FL')!.rotation.x, 0, 'clones do not share bones');
  assert.ok(skin.skeleton.bones.every((b) => model.getObjectByName(b.name) === b));
});

test('terrapin and songbird geometry/materials remain identical to revision 1', async () => {
  const b = readFileSync('tools/blender/wildlife/revision-1/haven-wildlife.glb');
  const prior = await new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    '',
  );
  const c = readFileSync('public/assets/creatures/haven-wildlife.glb');
  const current = await new GLTFLoader().parseAsync(
    c.buffer.slice(c.byteOffset, c.byteOffset + c.byteLength),
    '',
  );
  for (const name of ['Wildlife_Terrapin', 'Wildlife_Songbird']) {
    const a = prior.scene.getObjectByName(name)!,
      now = current.scene.getObjectByName(name)!;
    a.traverse((o) => {
      const n = now.getObjectByName(o.name)!;
      assert.ok(n, o.name);
      assert.deepEqual(n.position.toArray(), o.position.toArray());
      assert.deepEqual(n.quaternion.toArray(), o.quaternion.toArray());
      if (o instanceof T.Mesh) {
        const m = n as T.Mesh;
        assert.deepEqual(Object.keys(m.geometry.attributes), Object.keys(o.geometry.attributes));
        for (const key of Object.keys(o.geometry.attributes))
          assert.deepEqual(
            m.geometry.getAttribute(key).array,
            o.geometry.getAttribute(key).array,
            o.name + ' ' + key,
          );
        assert.deepEqual(m.geometry.index!.array, o.geometry.index!.array);
        assert.deepEqual(
          (m.material as T.MeshStandardMaterial).color,
          (o.material as T.MeshStandardMaterial).color,
        );
        assert.equal(m.userData.authoredVertexColor, undefined);
      }
    });
  }
});
