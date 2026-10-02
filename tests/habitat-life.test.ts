import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HabitatLife } from '../src/world/habitat-life';
import type { HabitatDefinition } from '../src/data/habitats';
const far = { x: 1000, y: 0, z: 1000 };
const definition = (species: HabitatDefinition['species']): HabitatDefinition => ({
  id: species,
  species,
  count: 1,
  radius: 0.2,
  speed: 1,
  points: [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 4 },
    { x: 0, z: 4 },
  ],
});
const make = (species: HabitatDefinition['species'] = 'deer', blocked = () => false) =>
  new HabitatLife({
    terrainHeight: () => 0,
    waterHeight: () => (species === 'terrapin' ? 0.10 : null),
    blocked,
    habitats: [definition(species)],
  });
test('both ground and water species observe feed, rest, wander and moderate react cooldown', () => {
  for (const species of ['deer', 'terrapin'] as const) {
    const life = make(species),
      states = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      life.update(0.1, 0.5, far);
      const r = life.inspect().animals[0];
      states.add(r.state);
      assert.equal(r.position.y, 0);
      assert.ok(r.position.x >= 0 && r.position.x <= 4 && r.position.z >= 0 && r.position.z <= 4);
    }
    assert.deepEqual([...states].sort(), ['feed', 'rest', 'wander']);
    life.update(0.1, 0.5, life.inspect().animals[0].position);
    assert.equal(life.inspect().animals[0].state, 'react');
    for (let i = 0; i < 25; i++) life.update(0.1, 0.5, life.inspect().animals[0].position);
    assert.notEqual(life.inspect().animals[0].state, 'react');
    assert.ok(life.inspect().animals[0].cooldown > 0);
  }
});
test('birds take off, travel between different contacts, land, perch, and roost at night', () => {
  const life = make('songbird'),
    states = new Set<string>(),
    contacts = new Set<number>();
  for (let i = 0; i < 1600; i++) {
    life.update(0.1, 0.5, far);
    const r = life.inspect().animals[0];
    states.add(r.state);
    assert.ok(r.position.y >= 0 && r.position.y <= 5.01);
    if (r.state === 'perch') {
      assert.equal(r.position.y, 0);
      contacts.add(r.node);
    }
  }
  for (const state of ['takeoff', 'flock', 'land', 'perch']) assert.ok(states.has(state));
  assert.ok(contacts.size >= 3);
  life.update(80, 0, far);
  assert.equal(life.inspect().animals[0].state, 'perch');
});
test('swept route rejects thin obstacle between endpoints and water exclusion', () => {
  const life = make('deer', (x: number, _y: number, z: number) => x > 1.9 && x < 2.1 && z < 1);
  for (let i = 0; i < 1000; i++) {
    life.update(0.1, 0.5, far);
    const p = life.inspect().animals[0].position;
    assert.ok(!(p.x > 1.9 && p.x < 2.1 && p.z < 1));
  }
  const wet = new HabitatLife({
    terrainHeight: () => 0,
    waterHeight: (x) => (x > 1 ? 0.5 : null),
    blocked: () => false,
    habitats: [definition('deer')],
  });
  wet.update(200, 0.5, far);
  assert.ok(wet.inspect().animals[0].position.x <= 1);
});
test('absence and render culling preserve identical state and bounded population', () => {
  const a = make(),
    b = make();
  for (let i = 0; i < 1200; i++) {
    a.update(0.1, 0.5, { x: 30, y: 0, z: 30 });
    b.update(0.1, 0.5, far);
  }
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.equal(a.group.children.length, 1);
  assert.equal(b.group.children[0].visible, false);
});
test('valid save resumes continuously while malformed and floating records are rejected', () => {
  const a = make();
  a.update(12, 0.5, far);
  const save = a.snapshot();
  const options = {
    terrainHeight: () => 0,
    waterHeight: () => null,
    blocked: () => false,
    habitats: [definition('deer')],
  };
  const b = new HabitatLife({ ...options, saved: save });
  assert.deepEqual(b.snapshot(), save);
  a.update(1, 0.5, far);
  b.update(1, 0.5, far);
  assert.deepEqual(a.snapshot(), b.snapshot());
  for (const change of [
    { position: { x: 0, y: 900, z: 0 } },
    { node: 999 },
    { duration: NaN },
    { state: 'flock' },
    { position: { x: 900, y: 0, z: 0 } },
  ]) {
    const invalid = structuredClone(save);
    Object.assign(invalid.animals[0], change);
    const c = new HabitatLife({ ...options, saved: invalid });
    assert.equal(c.inspect().animals[0].state, 'rest');
    assert.equal(c.inspect().animals[0].position.y, 0);
  }
});

import { Group } from 'three';
test('paused load and reset apply folded rig pose immediately while zero-dt updates refresh culling only', () => {
  const scene = new Group(),
    wing = new Group();
  wing.name = 'songbird_Wing_L';
  scene.add(wing);
  const life = new HabitatLife({
    terrainHeight: () => 0,
    waterHeight: () => null,
    blocked: () => false,
    habitats: [definition('songbird')],
    assets: { songbird: { scene } },
  });
  const clone = life.group.getObjectByName('songbird_Wing_L')!;
  assert.equal(clone.rotation.y, -1.2);
  assert.equal(clone.rotation.z, 0.25);
  const before = life.snapshot();
  life.update(0, 0.5, far);
  assert.deepEqual(life.snapshot(), before);
  assert.equal(life.group.children[0].visible, false);
  life.update(12, 0.5, { x: 20, y: 0, z: 20 });
  life.reset();
  assert.equal(clone.rotation.y, -1.2);
  assert.equal(clone.rotation.z, 0.25);
  life.dispose();
});
