import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, validateSave } from '../src/core/save';
import { Collision } from '../src/world/collision';
import { Navigation } from '../src/world/navigation';
import { BUILDINGS, PADDIES, riverX, terrainHeight } from '../src/data/world';
import { formatTime, clampTime } from '../src/data/time';

test('corrupt, old and missing saves produce a playable safe default', () => {
  for (const value of [
    null,
    [],
    {},
    'broken',
    { version: 18 },
    { version: 1, appearance: [], settings: null, position: [NaN, Infinity] },
  ]) {
    const s = validateSave(value);
    assert.equal(s.version, 1);
    assert.ok(Number.isFinite(s.time));
    assert.ok(s.position.every(Number.isFinite));
    assert.equal(s.appearance.body, 'feminine');
  }
});
test('save validation clamps settings and rejects invalid identity and wardrobe data', () => {
  const s = validateSave({
    version: 1,
    appearance: {
      name: '<Haru>\u0000',
      body: 'bad',
      hair: 99,
      skin: -2,
      top: NaN,
      accessories: ['yes', true, null],
    },
    settings: { master: 20, resolution: -1, aa: 3, shadows: 1200 },
    activities: { cat: 900 },
    discoveries: ['hill', 3],
  });
  assert.equal(s.appearance.name, 'Haru');
  assert.equal(s.appearance.hair, 7);
  assert.equal(s.appearance.skin, 0);
  assert.deepEqual(s.appearance.accessories, [false, true, false]);
  assert.equal(s.settings.master, 1);
  assert.equal(s.settings.resolution, 0.5);
  assert.equal(s.settings.shadows, 1024);
  assert.equal(s.activities.cat, 2);
  assert.deepEqual(s.discoveries, ['hill']);
});
test('a saved character and completed activities survive a serialization round trip', () => {
  const s = freshSave();
  s.created = true;
  s.appearance.body = 'masculine';
  s.appearance.hair = 7;
  s.appearance.top = 5;
  s.appearance.bottom = 3;
  s.appearance.shoes = 2;
  s.settings.timeSpeed = 0.5;
  s.appearance.accessories = [true, true, true];
  s.activities.delivery = 2;
  s.position = [81, 110];
  s.settings.freezeTime = true;
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(s))), s);
});
test('old saves retain their wardrobe and get a valid default time speed', () => {
  const s = validateSave({ version: 1, appearance: { hair: 3, top: 2, bottom: 2 }, settings: {} });
  assert.equal(s.appearance.hair, 3);
  assert.equal(s.appearance.top, 2);
  assert.equal(s.settings.timeSpeed, 1);
  assert.equal(validateSave({ version: 1, settings: { timeSpeed: 900 } }).settings.timeSpeed, 4);
  assert.equal(validateSave({ version: 1, settings: { timeSpeed: NaN } }).settings.timeSpeed, 1);
});
test('time controls have stable endpoints and cannot produce invalid clock text', () => {
  assert.equal(formatTime(0), '14:00');
  assert.equal(formatTime(1), '20:30');
  assert.equal(formatTime(0.5), '17:15');
  assert.equal(formatTime(2), '20:30');
  assert.equal(clampTime(NaN), 0.08);
});
test('collision substeps prevent a fast bicycle tunnelling through walls', () => {
  const c = new Collision();
  c.add({ x: 0, z: 0, w: 0.2, d: 10, height: 4 });
  const p = { x: -4, z: 0 };
  c.move(p, 12, 0, 0.45);
  assert.ok(p.x < -0.54);
  assert.ok(!c.blocked(p.x, p.z, 0.45));
});
test('diagonal movement slides along walls without penetrating them', () => {
  const c = new Collision();
  c.add({ x: 0, z: 0, w: 2, d: 10, height: 4 });
  const p = { x: -2, z: 0 };
  c.move(p, 3, 3, 0.28);
  assert.ok(p.x < -1.27);
  assert.ok(p.z > 2.9);
});
test('rotated collision and camera obstacles respect height and orientation', () => {
  const c = new Collision();
  c.add({ x: 0, z: 0, w: 8, d: 1, yaw: Math.PI / 2, height: 4 });
  assert.ok(c.blocked(0, 3, 0.28));
  assert.ok(!c.blocked(3, 0, 0.28));
  assert.ok(!c.blocked(0, 3, 0.28, 5));
  assert.ok(c.cameraDistance({ x: 0, y: 1, z: 6 }, { x: 0, y: 0, z: -1 }, 8, () => 0) < 2);
});
test('water excludes fields but permits the river bridge', () => {
  const c = new Collision();
  c.water = (x, z) => Math.abs(x - riverX(z)) < 5.7 && !(z > -28.8 && z < -23.2 && x > 36 && x < 57);
  assert.ok(c.blocked(riverX(0), 0));
  assert.ok(!c.blocked(45, -26));
  assert.ok(terrainHeight(45, -26) > 0);
});
test('navigation cannot jump a thin bridge rail between grid samples', () => {
  const c = new Collision();
  c.add({ x: 47, z: -28.15, w: 19, d: 0.13, height: 1.1 });
  const nav = new Navigation(c);
  const route = nav.route([51, -26], [51, -30]);
  assert.ok(route.length > 5);
  let previous: [number, number] = [51, -26];
  for (const next of route) {
    const n = 20;
    for (let i = 0; i <= n; i++) {
      const x = previous[0] + ((next[0] - previous[0]) * i) / n,
        z = previous[1] + ((next[1] - previous[1]) * i) / n;
      assert.ok(!c.blocked(x, z, 0.27, 0));
    }
    previous = next;
  }
});
test('villager navigation reaches every region without crossing water or houses', () => {
  const c = new Collision();
  for (const b of BUILDINGS)
    c.add({ x: b.x, z: b.z, w: b.w, d: b.d, yaw: b.yaw, height: b.h, bottom: terrainHeight(b.x, b.z) });
  c.water = (x, z) =>
    (Math.abs(x - riverX(z)) < 5.7 && !(z > -28.8 && z < -23.2 && x > 36 && x < 57)) ||
    PADDIES.some(([a, b, w, d]) => Math.abs(x - a) < w / 2 + 0.15 && Math.abs(z - b) < d / 2 + 0.15);
  const nav = new Navigation(c);
  for (const goal of [
    [-36, 18],
    [36, -26],
    [77, -62],
    [-61, -83],
    [-30, 95],
    [81, 88],
    [0, 113],
  ] as [number, number][]) {
    const route = nav.route([0, 17], goal);
    assert.ok(route.length > 0, `route to ${goal}`);
    assert.ok(route.every(([x, z]) => !c.blocked(x, z, 0.3, terrainHeight(x, z))));
    assert.ok(Math.hypot(route.at(-1)![0] - goal[0], route.at(-1)![1] - goal[1]) < 2);
  }
});
