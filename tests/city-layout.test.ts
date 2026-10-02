import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Assets } from '../src/game/assets';
import { City } from '../src/world/city';
import { Collision } from '../src/world/collision';
import { CityLife } from '../src/world/city-life';
import { freshCityLifeState, type CityActivity } from '../src/data/city-residents';
import { CITY_BUILDINGS, CITY_ARCADES } from '../src/data/city';
import {
  REGION_ROUTE,
  WORLD_BOUNDS,
  regionRouteSample,
  regionAt,
  regionRiverSample,
  regionBridgeAt,
} from '../src/data/regions';
import { terrainHeight } from '../src/data/world';
import type { Village } from '../src/world/village';

async function fixture() {
  const loader = new GLTFLoader(),
    assets = new Assets();
  for (const [field, file] of [
    ['library', 'world/village-kit.glb'],
    ['architecture', 'fantasy/architecture.glb'],
  ] as const) {
    const f = readFileSync('public/assets/' + file);
    assets[field] = (
      await loader.parseAsync(f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength), '')
    ).scene;
  }
  assets.toon(assets.library, false);
  for (const child of [...assets.architecture.children]) {
    if (child.name.startsWith('COL_')) child.removeFromParent();
    else if (child.name.startsWith('BLD_')) assets.toon(child, false);
  }
  assets.architectureData = JSON.parse(readFileSync('public/assets/fantasy/architecture.json', 'utf8'));
  const c = new Collision();
  c.bounds = { ...WORLD_BOUNDS };
  c.water = (x, z) => {
    const road = regionRouteSample(x, z),
      river = regionRiverSample(z);
    return (
      (!regionAt(x, z) && road.distance > 23) ||
      (Math.abs(x - river.x) < river.halfWidth + 0.32 && !regionBridgeAt(x, z)) ||
      (road.distance > road.width / 2 + 0.7 &&
        Math.hypot(
          terrainHeight(x + 0.4, z) - terrainHeight(x - 0.4, z),
          terrainHeight(x, z + 0.4) - terrainHeight(x, z - 0.4),
        ) > 0.66)
    );
  };
  const village = { collision: c, interactions: [] } as unknown as Village;
  const old = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ fillRect() {}, strokeRect() {}, fillText() {} }),
      }),
    },
  });
  const city = new City(assets, village);
  try {
    city.build();
  } finally {
    if (old) Object.defineProperty(globalThis, 'document', old);
    else Reflect.deleteProperty(globalThis, 'document');
  }
  const life = new CityLife(assets, new T.Scene(), c, freshCityLifeState());
  return { city, life, c, village, assets };
}
const built = fixture();
test('compact city keeps all architecture identities and three interior entrances with bounded merged detail', async () => {
  const { city, c } = await built;
  assert.equal(CITY_BUILDINGS.length, 24);
  assert.equal(new Set(CITY_BUILDINGS.map((b) => b.id)).size, 24);
  assert.deepEqual([...city.doors.keys()].sort(), [
    'aldermere-canal',
    'aldermere-market',
    'aldermere-workshop',
  ]);
  for (const [id, d] of city.doors)
    assert.ok(!c.blocked(d.x, d.z, 0.3, terrainHeight(d.x, d.z)), `${id} blocked`);
  assert.equal(CITY_ARCADES.length, 4);
  let meshes = 0;
  city.group.traverse((o) => {
    if (o instanceof T.Mesh) meshes++;
  });
  assert.ok(meshes < 160, `${meshes} static mesh draws exceeds composition envelope`);
  writeFileSync(
    'docs/gauntlet/evidence/city-layout-node-audit.json',
    JSON.stringify(
      {
        source: 'Node composition preflight; object counts are not measured renderer draws or frame times',
        buildings: CITY_BUILDINGS.length,
        interiorEntrances: city.doors.size,
        coveredFrontages: CITY_ARCADES.length,
        staticMeshObjectsAfterBatching: meshes,
        collisionObstacles: c.obstacles.length,
      },
      null,
      2,
    ),
  );
});
test('city architecture preserves the entire main road width at adult radius', async () => {
  const { c } = await built;
  const errors: unknown[] = [];
  for (let i = 1; i < REGION_ROUTE.length; i++) {
    const a = REGION_ROUTE[i - 1],
      b = REGION_ROUTE[i];
    const dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz);
    if (a.z > -244 || b.z < -416) continue;
    for (let s = 0; s <= len; s += 0.5) {
      const t = s / len,
        w = a.width + (b.width - a.width) * t;
      for (let lane = -1; lane <= 1; lane += 0.25) {
        const x = a.x + dx * t - (dz / len) * w * 0.5 * lane,
          z = a.z + dz * t + (dx / len) * w * 0.5 * lane;
        if (c.blocked(x, z, 0.3, terrainHeight(x, z))) errors.push([x, z]);
        if (Math.abs(terrainHeight(x, z) - regionRouteSample(x, z).height) > 0.001)
          errors.push(['changed road elevation', x, z]);
      }
    }
  }
  assert.deepEqual(errors.slice(0, 12), []);
});
test('new courts, stations and entries support every authored resident journey', async () => {
  const { life, c, village } = await built;
  assert.deepEqual(
    life.destinations().filter((d) => !d.clear),
    [],
  );
  const failures: unknown[] = [];
  for (const r of life.residents) {
    const stages: CityActivity[] = ['home', 'work', 'errand', 'meeting', 'home'];
    for (let i = 1; i < stages.length; i++) {
      const path = life.nav.route(
        r.data.destinations[stages[i - 1]].point,
        r.data.destinations[stages[i]].point,
      );
      if (!path) failures.push([r.data.id, stages[i - 1], stages[i]]);
    }
  }
  for (const d of village.interactions.filter((i) => i.kind === 'door'))
    if (!life.nav.route([20, -278], [d.x, d.z])) failures.push(['door', d.id]);
  assert.deepEqual(failures, []);
  // Architecture-only audit output is not a replacement for the coordinator's full terrain/tree capture.
  mkdirSync('.cache', { recursive: true });
  writeFileSync(
    '.cache/city-layout-collision.json',
    JSON.stringify({
      bounds: c.bounds,
      obstacles: c.obstacles,
      source: 'Node composition preflight; architecture and authored detail, no procedural trees',
    }),
  );
});

test('real walking arrivals align all work hands, including after a player greeting', async () => {
  const { life, assets } = await built,
    loader = new GLTFLoader(),
    far = new T.Vector3(10000, 0, 10000);
  for (const body of ['feminine', 'masculine'] as const) {
    const f = readFileSync(`public/assets/characters/${body}.glb`);
    assets.characters[body] = await loader.parseAsync(
      f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength),
      '',
    );
  }
  for (let i = 0; i < 2500; i++) life.update(0.2, 0.3, i * 0.2, far, null, 30);
  assert.deepEqual(
    life.residents
      .filter((r) => r.status !== 'working')
      .map((r) => ({ id: r.data.id, status: r.status, position: r.position.toArray() })),
    [],
  );
  const errors: { id: string; max: number }[] = [];
  for (const r of life.residents) {
    assert.ok(
      Math.hypot(
        r.position.x - r.data.destinations.work.point[0],
        r.position.z - r.data.destinations.work.point[1],
      ) <= 0.025,
    );
    const player = r.position.clone().add(new T.Vector3(0, 0, 5));
    let max = 0,
      contact = false;
    for (let i = 0; i < 300; i++) {
      life.update(0.1, 0.3, 500 + i * 0.1, player, null, 30);
      if (r.handContactError !== null) {
        contact = true;
        max = Math.max(max, r.handContactError);
      }
    }
    assert.ok(contact, `${r.data.id} never contacts station`);
    errors.push({ id: r.data.id, max });
  }
  assert.deepEqual(
    errors.filter((r) => r.max > 0.06),
    [],
  );
  const r = life.residents[0];
  r.greetingCooldown = 0;
  life.update(0.1, 0.3, 900, r.position.clone().add(new T.Vector3(1, 0, 0)), null, 30);
  assert.equal(r.status, 'greeting');
  assert.equal(r.handContactError, null);
  for (let i = 0; i < 60; i++)
    life.update(0.1, 0.3, 900 + i * 0.1, r.position.clone().add(new T.Vector3(0, 0, 5)), null, 30);
  assert.equal(r.status, 'working');
  assert.ok(r.handContactError !== null && r.handContactError <= 0.06);
});
