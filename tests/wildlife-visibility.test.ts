import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { Wildlife } from '../src/world/wildlife';

test('village wildlife leaves the render list in distant forests and returns under full visibility', () => {
  const life = new Wildlife(), forest = new Vector3(214, 12, -508);
  life.update(1 / 60, 1, .12, forest, 90);
  assert.ok(life.birds.every(b => !b.group.visible));
  assert.ok(life.flies.every(f => !f.visible));
  assert.equal(life.fireflies.visible, false);
  life.update(1 / 60, 2, .12, forest, 1600);
  assert.ok(life.birds.every(b => b.group.visible));
  assert.ok(life.flies.every(f => f.visible));
  assert.equal(life.fireflies.visible, false, 'daytime particles have zero visible contribution');
  life.update(1 / 60, 3, .92, forest, 90);
  assert.equal(life.fireflies.visible, false);
  life.update(1 / 60, 4, .92, new Vector3(76, 0, -60), 90);
  assert.equal(life.fireflies.visible, true);
});

test('a startled bird completes its flight while culled, then reappears at its home', () => {
  const life = new Wildlife(), bird = life.birds[0];
  life.update(.05, .05, .12, bird.perch.clone(), 90);
  assert.ok(bird.flight > 0);
  const far = new Vector3(214, 12, -508);
  life.update(.05, .1, .12, far, 90);
  assert.equal(bird.group.visible, false);
  assert.ok(bird.group.position.distanceTo(bird.perch) > .01);
  for (let i = 0; i < 120; i++) life.update(.05, .15 + i * .05, .12, far, 90);
  assert.equal(bird.flight, 0);
  assert.ok(bird.group.position.distanceTo(bird.perch) < 1e-8);
  const near = bird.perch.clone().add(new Vector3(8, 0, 0));
  life.update(.05, 7, .12, near, 90);
  assert.equal(bird.group.visible, true);
});
