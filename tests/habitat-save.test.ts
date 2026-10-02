import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshHabitatSave, validateHabitatSave } from '../src/data/habitat-save';
import { HabitatLife } from '../src/world/habitat-life';
import { terrainHeight } from '../src/data/world';
import { regionRiverSample } from '../src/data/regions';
const options = {
  terrainHeight,
  waterHeight: (x: number, z: number) => {
    const r = regionRiverSample(z);
    return Math.abs(x - r.x) < r.halfWidth ? r.y : null;
  },
  blocked: () => false,
};
test('pure save validator migrates missing old fields and whitelists IDs, fields, finite numbers and population', () => {
  for (const raw of [undefined, null, {}, [], { version: 2 }, { version: 1, elapsed: Infinity, animals: [] }])
    assert.deepEqual(validateHabitatSave(raw), freshHabitatSave());
  const life = new HabitatLife(options);
  const save = life.snapshot();
  const polluted: any = structuredClone(save);
  polluted.surprise = 'discard';
  polluted.animals[0].surprise = 'discard';
  polluted.animals[0].position.surprise = 'discard';
  polluted.animals.push(polluted.animals[0], { ...polluted.animals[0], id: 'unknown' });
  assert.deepEqual(validateHabitatSave(polluted), save);
  assert.deepEqual(validateHabitatSave(JSON.parse(JSON.stringify(save))), save);
  for (const bad of [NaN, Infinity, -Infinity]) {
    const invalid = structuredClone(save);
    invalid.animals[0].position.x = bad;
    assert.equal(validateHabitatSave(invalid).animals.length, 13);
  }
  life.dispose();
});
test('midflight JSON save restores exact validated phase and rejects invented airborne location', () => {
  const life = new HabitatLife(options);
  life.update(12, 0.5, { x: 0, y: 0, z: 0 });
  const save = JSON.parse(JSON.stringify(life.snapshot()));
  const restored = new HabitatLife({ ...options, saved: save });
  assert.deepEqual(restored.snapshot(), save);
  const index = save.animals.findIndex((a: any) => ['takeoff', 'flock', 'land'].includes(a.state));
  assert.ok(index >= 0);
  save.animals[index].position.y += 0.5;
  const rejected = new HabitatLife({ ...options, saved: save });
  assert.equal(rejected.inspect().animals[index].state, 'perch');
  life.dispose();
  restored.dispose();
  rejected.dispose();
});

test('reset discards restored progress and returns every authored resident to fresh contacts', () => {
  const original = new HabitatLife(options),
    fresh = original.snapshot();
  original.update(35, 0.5, { x: 0, y: 0, z: 0 });
  const restored = new HabitatLife({ ...options, saved: original.snapshot() });
  restored.reset();
  assert.deepEqual(restored.snapshot(), fresh);
  original.dispose();
  restored.dispose();
});

test('old shared feeding contacts are repaired without resetting unrelated residents', () => {
  const life = new HabitatLife(options), save = life.snapshot();
  save.animals[1] = { ...save.animals[0], id: save.animals[1].id, position: { ...save.animals[0].position }, origin: { ...save.animals[0].origin } };
  const restored = new HabitatLife({ ...options, saved: save });
  const records = restored.snapshot().animals;
  assert.ok(Math.hypot(records[0].position.x-records[1].position.x,records[0].position.z-records[1].position.z) >= 2.5);
  assert.deepEqual(records.slice(2), save.animals.slice(2));
  restored.update(120, .5, {x:0,y:0,z:0});
  const settled = restored.snapshot();
  const again = new HabitatLife({...options, saved: settled});
  assert.deepEqual(again.snapshot(), settled);
  life.dispose(); restored.dispose(); again.dispose();
});
