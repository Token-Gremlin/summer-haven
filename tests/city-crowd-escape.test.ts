import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from 'three';
import { CityLife } from '../src/world/city-life';
import { Collision } from '../src/world/collision';
import { Assets } from '../src/game/assets';
import { freshCityLifeState, type CityPoint } from '../src/data/city-residents';

const capture = JSON.parse(readFileSync('docs/gauntlet/evidence/journey-07/rowan-blocked.json', 'utf8'));
const arrival = JSON.parse(readFileSync('docs/gauntlet/evidence/journey-07/city-arrival.json', 'utf8'));

function fixture() {
  const snapshot = JSON.parse(readFileSync('docs/gauntlet/evidence/city-residents-collision.json', 'utf8'));
  const collision = new Collision();
  collision.bounds = snapshot.bounds;
  collision.obstacles = snapshot.obstacles.filter((o: { tag?: string }) => !o.tag?.startsWith('city-work-'));
  const state = freshCityLifeState();
  for (const resident of state.residents)
    Object.assign(resident, arrival.city.find((r: any) => r.id === resident.id).state);
  Object.assign(state.residents.find(r => r.id === 'rowan')!, capture.state);
  Object.assign(state.residents.find(r => r.id === 'mara')!, capture.neighbors.find((r: any) => r.id === 'mara').state);
  const life = new CityLife(new Assets(), new T.Scene(), collision, state);
  // Retain the complete city snapshot, supplemented by the exact local obstacle
  // capture, including the work frame that stopped the original sidestep.
  for (const o of capture.obstacles) {
    const fields = ['x', 'z', 'w', 'd', 'r', 'yaw', 'bottom', 'height', 'tag'];
    if (!collision.obstacles.some(p => fields.every(k => (p as any)[k] === o[k]))) collision.add({ ...o });
  }
  const rowan = life.residents.find(r => r.data.id === 'rowan')!;
  const mara = life.residents.find(r => r.data.id === 'mara')!;
  rowan.route = capture.route.map((p: CityPoint) => [...p]);
  return { life, collision, rowan, mara };
}

test('captured close-neighbor start can replan a separating route around solid work geometry', () => {
  const { life, rowan, mara } = fixture();
  const from: CityPoint = [rowan.position.x, rowan.position.z];
  const job = life.nav.begin(from, rowan.data.destinations.work.point, [[mara.position.x, mara.position.z]]);
  let frames = 0;
  while (!job.done && frames++ < 1000) life.nav.advance(job, 70);
  assert.ok(job.result?.length, 'already-close Mara must not make every start link unreachable');
  let previous = from;
  for (const p of job.result!) {
    assert.ok(life.nav.clear(previous, p), 'escape route must sweep clear of the actual work frame');
    const n = Math.ceil(Math.hypot(p[0] - previous[0], p[1] - previous[1]) / .02);
    const initial = Math.hypot(previous[0] - mara.position.x, previous[1] - mara.position.z);
    for (let i = 1; i <= n; i++) {
      const x = T.MathUtils.lerp(previous[0], p[0], i / n), z = T.MathUtils.lerp(previous[1], p[1], i / n);
      assert.ok(Math.hypot(x - mara.position.x, z - mara.position.z) >= Math.min(.69, initial) - 1e-9);
    }
    previous = p;
  }
});

for (const dt of [1 / 60, .08]) test(`captured Rowan stall recovers through normal updates at dt=${dt}`, t => {
  const { life, collision, rowan, mara } = fixture();
  const far = new T.Vector3(10000, 0, 10000), start = rowan.position.clone(), maraStart = mara.position.clone();
  const initialSpacing = Math.hypot(start.x - maraStart.x, start.z - maraStart.z);
  let arrivedAt: number | null = null;
  assert.ok(initialSpacing < .64 && initialSpacing > .63, 'fixture preserves the observed close-neighbor state');
  // The captured morning has only 52.4 seconds remaining before the ordinary
  // errand schedule begins. Keep that clock advancing; verify actual work resumes.
  for (let elapsed = 0; elapsed < 50; elapsed += dt) {
    const previous = rowan.position.clone();
    life.update(dt, capture.time + elapsed / 1200, capture.worldSeconds + elapsed, far, null, 45);
    if (rowan.status === 'working' && arrivedAt === null) arrivedAt = elapsed;
    const step = Math.hypot(rowan.position.x - previous.x, rowan.position.z - previous.z);
    assert.ok(step <= rowan.data.speed * dt + 1e-7, 'escape cannot teleport or increase walking speed');
    assert.ok(life.nav.clear([previous.x, previous.z], [rowan.position.x, rowan.position.z]), 'step crosses static geometry');
    assert.equal(collision.blocked(rowan.position.x, rowan.position.z, .32, rowan.position.y), false);
    const spacing = Math.hypot(rowan.position.x - mara.position.x, rowan.position.z - mara.position.z);
    assert.ok(spacing >= initialSpacing - 1e-7, 'escape cannot push farther into Mara');
    if (elapsed >= 4 && elapsed < 4 + dt) assert.ok(rowan.position.distanceTo(start) > .5, 'still trapped at work frame');
  }
  assert.ok(rowan.state.taskProgress > 4, `Rowan must reach the actual bakery job and resume work: ${JSON.stringify(rowan.state)}`);
  assert.equal(rowan.status, 'working');
  assert.ok(Math.hypot(mara.position.x - maraStart.x, mara.position.z - maraStart.z) < .03, 'Mara is not displaced');
  t.diagnostic(JSON.stringify({ arrivedAt, workSeconds: rowan.state.taskProgress, initialSpacing }));
});
