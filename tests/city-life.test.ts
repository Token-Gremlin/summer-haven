import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  CITY_RESIDENTS,
  freshCityLifeState,
  validateCityLifeState,
  CITY_LIFE_BOUNDS,
  type CityActivity,
} from '../src/data/city-residents';
import { CityLife, CityNavigation } from '../src/world/city-life';
import { Collision } from '../src/world/collision';
import { Assets } from '../src/game/assets';
import { terrainHeight } from '../src/data/world';
import { regionAt, regionRouteSample, regionRiverSample, regionBridgeAt } from '../src/data/regions';

function runtimeCollision() {
  const snapshot = JSON.parse(
    readFileSync(
      process.env.CITY_COLLISION_FIXTURE ?? 'docs/gauntlet/evidence/city-residents-collision.json',
      'utf8',
    ),
  );
  const c = new Collision();
  c.bounds = snapshot.bounds;
  // CityLife authors these once itself; a runtime capture includes the previous instance.
  c.obstacles = snapshot.obstacles.filter((o: { tag?: string }) => !o.tag?.startsWith('city-work-'));
  c.water = (x, z) => {
    const route = regionRouteSample(x, z);
    if (!regionAt(x, z) && route.distance > 23) return true;
    const r = regionRiverSample(z);
    if (z >= -910 && Math.abs(x - r.x) < r.halfWidth + 0.32 && !regionBridgeAt(x, z)) return true;
    if (route.distance > route.width / 2 + 0.7) {
      if (
        Math.hypot(
          terrainHeight(x + 0.4, z) - terrainHeight(x - 0.4, z),
          terrainHeight(x, z + 0.4) - terrainHeight(x, z - 0.4),
        ) > 0.66
      )
        return true;
    }
    return false;
  };
  return c;
}
test('old city layout saves migrate once on load, preserving identity and completed consequences', () => {
  const old = JSON.parse(JSON.stringify(freshCityLifeState()));
  delete old.layoutRevision;
  Object.assign(old.residents[0], {
    x: 6.3,
    z: -300.8,
    activity: 'work',
    settled: 14,
    taskProgress: 9,
    tasksCompleted: 18,
    conversations: 7,
    meetingsCompleted: 3,
    meetingProgress: 12,
    meetingCounted: true,
  });
  const migrated = validateCityLifeState(old),
    a = migrated.residents[0],
    home = freshCityLifeState().residents[0];
  assert.equal(migrated.layoutRevision, 2);
  assert.equal(a.id, old.residents[0].id);
  assert.equal(a.tasksCompleted, 18);
  assert.equal(a.conversations, 7);
  assert.equal(a.meetingsCompleted, 3);
  assert.equal(a.x, home.x);
  assert.equal(a.z, home.z);
  assert.equal(a.activity, 'home');
  assert.equal(a.settled, 0);
  assert.equal(a.taskProgress, 0);
  assert.equal(a.meetingProgress, 0);
  assert.equal(a.meetingCounted, false);
  a.x += 0.1;
  assert.equal(
    validateCityLifeState(migrated).residents[0].x,
    a.x,
    'current-layout loads must not repeatedly reset position',
  );
});
test('city state is JSON-safe, bounded, per-resident and rejects hostile/nonfinite values', () => {
  const fresh = freshCityLifeState();
  assert.equal(fresh.residents.length, 10);
  assert.equal(new Set(CITY_RESIDENTS.map((r) => JSON.stringify({ ...r.appearance, name: '' }))).size, 10);
  assert.deepEqual(validateCityLifeState(JSON.parse(JSON.stringify(fresh))), fresh);
  const bad = JSON.parse(JSON.stringify(fresh));
  Object.assign(bad.residents[0], {
    x: Infinity,
    z: 2,
    yaw: NaN,
    activity: 'fly',
    tasksCompleted: -1,
    conversations: 1e100,
    meetingProgress: NaN,
    route: [[999, 999]],
    extra: 'ignored',
  });
  const checked = validateCityLifeState(bad);
  assert.deepEqual(checked.residents[0], fresh.residents[0]);
  assert.equal('extra' in checked.residents[0], false);
  assert.deepEqual(validateCityLifeState({ version: 999, residents: [] }), fresh);
  for (const r of CITY_RESIDENTS) {
    assert.equal(CITY_RESIDENTS.find((o) => o.id === r.partner)?.partner, r.id);
    for (const d of Object.values(r.destinations)) {
      assert.ok(d.point[0] >= CITY_LIFE_BOUNDS.x0 && d.point[0] <= CITY_LIFE_BOUNDS.x1);
      assert.ok(d.point[1] >= CITY_LIFE_BOUNDS.z0 && d.point[1] <= CITY_LIFE_BOUNDS.z1);
    }
  }
});
test('every authored activity and daily leg clears the supplied city collision, water and terrain', () => {
  const life = new CityLife(new Assets(), new T.Scene(), runtimeCollision(), freshCityLifeState());
  const errors: string[] = [];
  for (const d of life.destinations())
    if (!d.clear) errors.push(`${d.id}/${d.activity} blocked at ${d.point}`);
  assert.deepEqual(errors, []);
  for (const r of life.residents) {
    const stages: CityActivity[] = ['home', 'work', 'errand', 'meeting', 'home'];
    for (let i = 1; i < stages.length; i++) {
      const from = r.data.destinations[stages[i - 1]].point,
        to = r.data.destinations[stages[i]].point,
        path = life.nav.route(from, to);
      assert.notEqual(path, null, `${r.data.id}: ${stages[i - 1]} → ${stages[i]}`);
      let previous = from;
      for (const p of path!) {
        assert.ok(life.nav.clear(previous, p), `${r.data.id} unsafe edge ${previous} → ${p}`);
        previous = p;
      }
      assert.ok(Math.hypot(previous[0] - to[0], previous[1] - to[1]) < 0.015);
    }
  }
});
test('navigation never snaps across a wall and invalidates jobs after collision changes', () => {
  const c = new Collision();
  c.bounds = { ...CITY_LIFE_BOUNDS };
  const nav = new CityNavigation(c, () => 0);
  c.add({ x: 0, z: -335, w: 0.2, d: 180, height: 3 });
  assert.equal(nav.route([-1, -300], [1, -300]), null);
  const job = nav.begin([-10, -300], [-20, -300]);
  c.add({ x: -15, z: -300, w: 1, d: 1, height: 2 });
  nav.advance(job);
  assert.equal(job.done, true);
  assert.equal(job.result, null);
  assert.equal(nav.route([1000, -300], [0, -300]), null);
  const distant = nav.begin([-10, -310], [-20, -310]);
  c.add({ x: 540, z: -970, r: 10, height: 18 });
  nav.advance(distant, 1);
  assert.equal(distant.done, false, 'distant creature must not abort a city search');
});

test('real adult rigs reach the authored work surfaces after settling', async () => {
  const assets = new Assets(),
    loader = new GLTFLoader();
  for (const body of ['feminine', 'masculine'] as const) {
    const f = readFileSync(`public/assets/characters/${body}.glb`);
    assets.characters[body] = await loader.parseAsync(
      f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength),
      '',
    );
  }
  const state = freshCityLifeState();
  for (const s of state.residents) {
    const d = CITY_RESIDENTS.find((r) => r.id === s.id)!.destinations.work;
    s.x = d.point[0];
    s.z = d.point[1];
    s.yaw = d.facing;
    s.activity = 'work';
    s.settled = 5;
  }
  const life = new CityLife(assets, new T.Scene(), runtimeCollision(), state),
    errors: { id: string; error: number | null }[] = [];
  for (const r of life.residents) {
    const player = r.position.clone().add(new T.Vector3(0, 0, 5));
    let error: number | null = null;
    for (let i = 0; i < 300; i++) {
      life.update(0.1, 0.3, i * 0.1, player, null, 30);
      if (r.handContactError !== null) error = Math.max(error ?? 0, r.handContactError);
    }
    errors.push({ id: r.data.id, error });
  }
  assert.deepEqual(
    errors.filter((r) => r.error === null || r.error > 0.06),
    [],
  );
});
test('daily motion progresses offscreen without teleporting; work and paired meetings persist', () => {
  const c = runtimeCollision(),
    life = new CityLife(new Assets(), new T.Scene(), c, freshCityLifeState()),
    far = new T.Vector3(10000, 0, 10000);
  const check = (seconds: number, time: number) => {
    for (let t = 0; t < seconds; t++) {
      const before = life.residents.map((r) => r.position.clone());
      life.update(1, time, t, far, null, 45);
      for (let i = 0; i < life.residents.length; i++) {
        const r = life.residents[i];
        assert.ok(r.position.distanceTo(before[i]) < 1.3, `${r.data.id} teleported`);
        assert.ok(
          !c.blocked(r.position.x, r.position.z, 0.3, r.position.y),
          `${r.data.id} intersects collision`,
        );
      }
    }
  };
  check(500, 0.3);
  assert.deepEqual(
    life.residents
      .filter((r) => r.state.tasksCompleted === 0)
      .map((r) => ({
        id: r.data.id,
        status: r.status,
        point: [r.position.x, r.position.z],
        route: r.route.length,
      })),
    [],
  );
  check(500, 0.51);
  check(550, 0.7);
  assert.deepEqual(
    life.residents
      .filter((r) => r.state.meetingsCompleted === 0)
      .map((r) => ({
        id: r.data.id,
        status: r.status,
        point: [r.position.x, r.position.z],
        route: r.route.length,
      })),
    [],
  );
  assert.ok(life.residents.every((r) => r.character === null));
  const saved = validateCityLifeState(JSON.parse(JSON.stringify(life.state)));
  assert.deepEqual(saved, life.state);
  const resumed = new CityLife(new Assets(), new T.Scene(), runtimeCollision(), saved);
  resumed.update(1, 0.7, 1600, far, null, 45);
  assert.deepEqual(
    resumed.state.residents.map((r) => r.meetingsCompleted),
    saved.residents.map((r) => r.meetingsCompleted),
  );
});

test('the normal 1200-second day leaves enough travel time for all ten jobs, paired meetings and return home', () => {
  const life = new CityLife(new Assets(), new T.Scene(), runtimeCollision(), freshCityLifeState()),
    far = new T.Vector3(10000, 0, 10000);
  for (let t = 0; t <= 6000; t++) life.update(0.2, t / 6000, t / 5, far, null, 45);
  assert.deepEqual(
    life.residents
      .filter((r) => !r.state.tasksCompleted || !r.state.meetingsCompleted)
      .map((r) => ({ id: r.data.id, jobs: r.state.tasksCompleted, meetings: r.state.meetingsCompleted })),
    [],
  );
  assert.deepEqual(
    life.residents
      .filter(
        (r) =>
          Math.hypot(
            r.position.x - r.data.destinations.home.point[0],
            r.position.z - r.data.destinations.home.point[1],
          ) > 0.2,
      )
      .map((r) => ({
        id: r.data.id,
        point: r.position.toArray(),
        target: r.data.destinations.home.point,
        status: r.status,
        route: r.route.slice(0, 3),
        clear: life.nav.clear([r.position.x, r.position.z], r.route[0] ?? r.data.destinations.home.point),
        stuck: r.stuck,
      })),
    [],
  );
});

test('New Visit resets records in place and subsequent updates keep the live save pointer coherent', () => {
  const life = new CityLife(new Assets(), new T.Scene(), runtimeCollision(), freshCityLifeState()),
    saved = life.state,
    entries = [...saved.residents],
    far = new T.Vector3(10000, 0, 10000);
  life.residents[0].state.tasksCompleted = 29;
  life.residents[1].state.meetingsCompleted = 7;
  life.talk(life.residents[0], far);
  life.update(0.2, 0.3, 1, far, null, 30);
  life.reset();
  assert.strictEqual(life.state, saved);
  assert.deepEqual(saved, freshCityLifeState());
  for (let i = 0; i < entries.length; i++) {
    assert.strictEqual(life.residents[i].state, entries[i]);
    assert.strictEqual(saved.residents[i], entries[i]);
    assert.equal(life.residents[i].route.length, 0);
  }
  life.update(0.2, 0.3, 2, far, null, 30);
  assert.ok(saved.residents.every((s) => s.activity === 'work'));
  assert.deepEqual(validateCityLifeState(JSON.parse(JSON.stringify(saved))), saved);
});
