import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HABITATS } from '../src/data/habitats';
import { terrainHeight } from '../src/data/world';
import { regionSurfaceWater, regionRouteSample } from '../src/data/regions';
import { HabitatLife } from '../src/world/habitat-life';

const options = { terrainHeight, waterHeight: regionSurfaceWater, blocked: () => false };
const far = { x: 0, y: 0, z: 0 };
const previousHabitats = HABITATS.map((h) => ({
  ...h,
  points: h.points.map(({ previousPosition, ...p }) => ({ ...p, ...previousPosition })),
}));

test('every perch cluster clears the complete trail width and a player-sized margin', () => {
  const life = new HabitatLife(options);
  for (const stone of life.supportObstacles) {
    const route = regionRouteSample(stone.x, stone.z);
    assert.ok(
      route.distance >= route.width / 2 + stone.r + 0.45,
      `${stone.tag} blocks the authored path or its walking margin`,
    );
  }
});

test('old perched and reacting birds move to the relocated stone without losing their history', () => {
  const old = new HabitatLife({ ...options, habitats: previousHabitats });
  const snapshot = old.snapshot();
  const fresh = new HabitatLife(options).snapshot();
  for (const a of snapshot.animals.filter((a) => a.id.includes('songbirds'))) {
    a.cycle = 7;
    a.cooldown = 13;
    a.age = 0.2;
    a.state = a.id.endsWith('0') ? 'react' : 'perch';
  }
  const restored = new HabitatLife({ ...options, saved: snapshot });
  for (const r of restored.inspect().animals.filter((a) => a.id.includes('songbirds'))) {
    const saved = snapshot.animals.find((a) => a.id === r.id)!;
    assert.equal(r.cycle, saved.cycle);
    assert.equal(r.cooldown, saved.cooldown);
    assert.equal(r.age, saved.age);
    assert.equal(r.state, saved.state);
    assert.deepEqual(r.position, fresh.animals.find((a) => a.id === r.id)!.position);
  }
});

test('known old flights with moved contacts restart on a real perch and retain route history', () => {
  const old = new HabitatLife({ ...options, habitats: previousHabitats });
  old.update(12, 0.5, far);
  const snapshot = old.snapshot();
  const birds = snapshot.animals.filter((a) => a.id.includes('songbirds'));
  assert.ok(birds.every((b) => ['takeoff', 'flock', 'land'].includes(b.state)));
  const restored = new HabitatLife({ ...options, saved: snapshot });
  const initial = new HabitatLife(options).snapshot();
  for (const saved of birds) {
    const r = restored.inspect().animals.find((a) => a.id === saved.id)!;
    assert.equal(r.state, 'perch');
    assert.equal(r.age, 0);
    assert.equal(r.cycle, saved.cycle);
    assert.equal(r.cooldown, saved.cooldown);
    assert.deepEqual(r.position, initial.animals.find((a) => a.id === r.id)!.position);
    assert.deepEqual(r.origin, r.position);
  }
});

test('new saves preserve every valid bird phase exactly, including early takeoff and landing', () => {
  const life = new HabitatLife(options);
  const seen = new Set<string>();
  for (let step = 0; step < 800; step++) {
    life.update(0.1, 0.5, far);
    const saved = life.snapshot();
    const currentBirds = saved.animals.filter((a) => a.id.includes('songbirds'));
    const restored = new HabitatLife({ ...options, saved });
    assert.deepEqual(restored.snapshot().animals.filter((a) => a.id.includes('songbirds')), currentBirds);
    for (const r of currentBirds) seen.add(r.state);
    restored.dispose();
  }
  for (const state of ['perch', 'takeoff', 'flock', 'land']) assert.ok(seen.has(state), state);
});

test('old flights between unchanged contacts retain phase; incoming flights to a moved stone recover safely', () => {
  const old = new HabitatLife({ ...options, habitats: previousHabitats });
  let unchanged = false,
    incoming = false;
  for (let step = 0; step < 3000 && !(unchanged && incoming); step++) {
    old.update(0.1, 0.5, far);
    const save = old.snapshot();
    for (const bird of save.animals) {
      if (!bird.id.startsWith('mosswood-songbirds') || bird.state !== 'flock' || bird.node === 0) continue;
      const kind = bird.target === 0 ? 'incoming' : 'unchanged';
      if ((kind === 'incoming' && incoming) || (kind === 'unchanged' && unchanged)) continue;
      const restored = new HabitatLife({ ...options, saved: save });
      const r = restored.inspect().animals.find((a) => a.id === bird.id)!;
      if (kind === 'unchanged') {
        assert.deepEqual(r, bird);
        unchanged = true;
      } else {
        assert.equal(r.state, 'perch');
        assert.equal(r.node, bird.node);
        assert.equal(r.target, bird.node);
        assert.equal(r.age, 0);
        assert.equal(r.duration, 5);
        assert.equal(r.cycle, bird.cycle);
        assert.equal(r.cooldown, bird.cooldown);
        // Departure contact did not move: it is a known real support to resume from.
        assert.deepEqual(r.position, bird.origin);
        assert.deepEqual(r.origin, bird.origin);
        incoming = true;
      }
      restored.dispose();
    }
  }
  assert.ok(unchanged, 'observed an old flight between unaffected stones');
  assert.ok(incoming, 'observed an old flight arriving at a relocated stone');
});

test('an arbitrary unsupported bird position does not qualify as a known old contact', () => {
  const old = new HabitatLife({ ...options, habitats: previousHabitats });
  const saved = old.snapshot();
  const r = saved.animals.find((a) => a.id === 'mosswood-songbirds-0')!;
  r.position.x += 0.5;
  r.position.y = terrainHeight(r.position.x, r.position.z) + 0.42;
  r.cycle = 8;
  const restored = new HabitatLife({ ...options, saved });
  const reset = restored.snapshot().animals.find((a) => a.id === r.id)!;
  assert.equal(reset.cycle, 0);
  assert.notDeepEqual(reset.position, r.position);
});
