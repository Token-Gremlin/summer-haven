import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { frameDelta, integrateVelocity, LOCOMOTION } from '../src/player/motion';
import { gaitProfile, sampleFoot } from '../src/character/gait';
import { PathSurfaces } from '../src/world/path-surface';
import { SceneryVisibility, sceneryRanges } from '../src/render/visibility';
import { freshSave, validateSave, hasSavedSettings } from '../src/core/save';

test('graphics chosen before creating a character are not overridden by automatic GPU quality', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let value: string | null = null;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => value } });
  try {
    assert.equal(hasSavedSettings(), false);
    value = 'corrupt';
    assert.equal(hasSavedSettings(), false);
    const save = freshSave();
    save.settings.quality = 'high';
    save.settings.visibility = 'full';
    save.settings.distance = 500;
    value = JSON.stringify(save);
    assert.equal(save.created, false);
    assert.equal(hasSavedSettings(), true);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('travel and stopping distance remain identical from 5 to 144 FPS', () => {
  for (const target of [LOCOMOTION.walk, LOCOMOTION.run]) {
    const distances = [];
    for (const fps of [5, 15, 30, 60, 144]) {
      let velocity = 0,
        distance = 0;
      for (let i = 0; i < fps * 4; i++) {
        const step = integrateVelocity(velocity, target, LOCOMOTION.acceleration, 1 / fps);
        velocity = step.velocity;
        distance += step.distance;
      }
      for (let i = 0; i < fps; i++) {
        const step = integrateVelocity(velocity, 0, LOCOMOTION.braking, 1 / fps);
        velocity = step.velocity;
        distance += step.distance;
      }
      assert.ok(velocity < 1e-5);
      distances.push(distance);
    }
    assert.ok(Math.max(...distances) - Math.min(...distances) < 1e-8);
  }
});
test('normal slow frames retain elapsed time, suspension gaps do not launch the player', () => {
  assert.equal(frameDelta(0.2), 0.2);
  assert.equal(frameDelta(1 / 60), 1 / 60);
  for (const gap of [0.5, 8, NaN, Infinity, -1]) assert.equal(frameDelta(gap), 0);
});
test('feet oppose travel during stance and meet swing without a position jump', () => {
  for (const speed of [0.8, 2.35, 3.6, 4.8]) {
    const { stride, stance } = gaitProfile(speed),
      dt = 0.001;
    const p = sampleFoot(0.05, speed),
      q = sampleFoot(0.05 + (speed * dt) / stride, speed);
    assert.ok(Math.abs(q.z - p.z + speed * dt) < 1e-9);
    for (const boundary of [0, stance, 1]) {
      const a = sampleFoot(boundary - 1e-7, speed),
        b = sampleFoot(boundary + 1e-7, speed);
      assert.ok(Math.abs(a.z - b.z) < 1e-5);
      assert.ok(Math.abs(a.lift - b.lift) < 1e-5);
    }
  }
});
const quad = (x = 0, z = 0, w = 4, d = 4) =>
  new T.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(x, 0.035, z);
function surfaceArea(g: T.BufferGeometry) {
  const p = g.attributes.position,
    ids = g.index!;
  let total = 0;
  for (let i = 0; i < ids.count; i += 3) {
    const [a, b, c] = [0, 1, 2].map((j) => ids.getX(i + j));
    total +=
      Math.abs(
        (p.getX(b) - p.getX(a)) * (p.getZ(c) - p.getZ(a)) - (p.getZ(b) - p.getZ(a)) * (p.getX(c) - p.getX(a)),
      ) * 0.5;
  }
  return total;
}
test('crossing roads share no double surface while conserving exposed area', () => {
  const s = new PathSurfaces();
  const road = s.add(quad(0, 0, 2, 10)),
    side = s.add(quad(0, 0, 10, 2));
  assert.ok(Math.abs(surfaceArea(road) - 20) < 1e-6);
  assert.ok(Math.abs(surfaceArea(side) - 16) < 1e-6);
  for (const g of [road, side])
    for (const attr of Object.values(g.attributes)) assert.ok(Array.from(attr.array).every(Number.isFinite));
});
test('coincident and touching path edges do not create thin duplicate triangles', () => {
  const s = new PathSurfaces();
  s.add(quad());
  assert.equal(surfaceArea(s.add(quad())), 0);
  assert.ok(Math.abs(surfaceArea(s.add(quad(4, 0))) - 16) < 1e-6);
  const overlap = s.add(quad(0, 2));
  assert.ok(Math.abs(surfaceArea(overlap) - 8) < 1e-6);
});
test('partial surfaces retain their UV and slope interpolation', () => {
  const s = new PathSurfaces();
  s.add(quad());
  const source = quad(2, 0),
    p = source.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, 0.035 + p.getX(i) * 0.1);
  const clipped = s.add(source),
    v = clipped.attributes.position;
  assert.ok(Math.abs(surfaceArea(clipped) - 8) < 1e-6);
  for (let i = 0; i < v.count; i++) assert.ok(Math.abs(v.getY(i) - 0.035 - v.getX(i) * 0.1) < 1e-6);
});
test('full scenery retains distant objects; nearby mode keeps a fade buffer before culling', () => {
  const s = freshSave().settings;
  const scene = new T.Group(),
    near = new T.Mesh(new T.BoxGeometry(2, 2, 2)),
    far = near.clone();
  far.position.x = 350;
  scene.add(near, far);
  const visibility = new SceneryVisibility(scene, new Set());
  const ranges = sceneryRanges({ ...s, visibility: 'nearby', distance: 90 });
  assert.ok(ranges.start < ranges.end);
  visibility.update(new T.Vector3(), ranges.end);
  assert.equal(near.visible, true);
  assert.equal(far.visible, false);
  visibility.update(new T.Vector3(), sceneryRanges({ ...s, visibility: 'full' }).end);
  assert.equal(far.visible, true);
});
test('visibility and graphics choices survive reload with safe legacy defaults', () => {
  const s = freshSave();
  s.settings.visibility = 'full';
  s.settings.aa = 1;
  s.settings.distance = 500;
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(s))), s);
  assert.equal(
    validateSave({ version: 1, settings: { visibility: 'garbage' } }).settings.visibility,
    'nearby',
  );
  assert.equal(validateSave({ version: 1, settings: { distance: 99999 } }).settings.distance, 500);
});
