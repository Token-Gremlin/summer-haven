import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Collision, type Obstacle } from '../src/world/collision';
import { terrainHeight, riverX, PADDIES } from '../src/data/world';
import {
  LEGACY_BOUNDS,
  WORLD_BOUNDS,
  REGIONS,
  REGION_ROUTE,
  regionAt,
  regionRouteSample,
  regionRiverSample,
  REGION_BRIDGES,
  regionBridgeAt,
} from '../src/data/regions';
import { freshSave, validateSave } from '../src/core/save';
import { Navigation } from '../src/world/navigation';

// Frozen pre-expansion formula: this fixture must not call the new terrain sampler.
function legacyHeight(x: number, z: number, walkable: boolean) {
  let h =
    18 * Math.exp(-((x + 62) ** 2 / 900 + (z + 86) ** 2 / 660)) +
    3.8 * Math.exp(-((x - 80) ** 2 / 700 + (z + 73) ** 2 / 750));
  if (Math.abs(x) < 32 && z > -59) h = 0;
  if (Math.abs(x - riverX(z)) < 5.1) h = -1.1;
  for (const [cx, cz, w, d] of PADDIES) if (Math.abs(x - cx) < w / 2 && Math.abs(z - cz) < d / 2) h = -0.5;
  if (z > -29 && z < -23 && x > 36 && x < 56) h = 0.18;
  if (walkable) {
    const base = 3.8 * Math.exp(-(9 / 700 + 4 / 750));
    if (Math.abs(x - 77) < 0.87 && z < -71.67 && z > -75.58)
      h = Math.max(h, base + 0.19 * Math.min(9, 1 + Math.floor((-z - 71.67) / 0.42)));
    if (Math.abs(x - 77) < 1.62 && z <= -75.48 && z > -78.4) h = Math.max(h, base + 1.74);
  }
  return h;
}
test('every protected village ground sample retains the pre-expansion height, including steps and bridge', () => {
  for (const walkable of [true, false]) {
    for (let x = LEGACY_BOUNDS.x0; x <= LEGACY_BOUNDS.x1; x += 3)
      for (let z = LEGACY_BOUNDS.z0; z <= LEGACY_BOUNDS.z1; z += 2)
        assert.equal(terrainHeight(x, z, walkable), legacyHeight(x, z, walkable));
    for (let z = -78.5; z <= -71; z += 0.1)
      assert.equal(terrainHeight(77, z, walkable), legacyHeight(77, z, walkable));
    assert.equal(terrainHeight(47, -26, walkable), legacyHeight(47, -26, walkable));
  }
});
test('the journey has continuous bounded grades and destination heights shared by paths and terrain', () => {
  for (let i = 2; i < REGION_ROUTE.length; i++) {
    const a = REGION_ROUTE[i - 1],
      b = REGION_ROUTE[i];
    assert.ok(Math.abs(terrainHeight(b.x, b.z) - b.y) < 1e-8, b.id);
    const length = Math.hypot(b.x - a.x, b.z - a.z),
      steps = Math.ceil(length / 0.25);
    let previous = terrainHeight(a.x, a.z);
    for (let j = 1; j <= steps; j++) {
      const t = j / steps,
        x = a.x + (b.x - a.x) * t,
        z = a.z + (b.z - a.z) * t;
      const y = terrainHeight(x, z);
      const limit = b.mode === 'walk' ? 0.18 : 0.1;
      assert.ok(Math.abs(y - previous) / (length / steps) <= limit + 1e-6, `${b.id} grade at ${t}`);
      assert.ok(regionRouteSample(x, z).distance < 1e-8);
      previous = y;
    }
  }
  for (let x = -126; x <= 126; x += 2)
    assert.ok(Math.abs(terrainHeight(x, -132.001) - terrainHeight(x, -132)) < 0.002);
});
test('region identities and authored river remain finite and connect to the original river', () => {
  assert.equal(new Set(REGIONS.map((r) => r.id)).size, REGIONS.length);
  assert.equal(regionAt(0, -125)?.id, 'haven');
  assert.equal(regionAt(20, -300)?.id, 'aldermere');
  assert.equal(regionAt(542, -978)?.id, 'crownreach');
  assert.equal(regionRiverSample(-132).x, riverX(-132));
  for (let z = WORLD_BOUNDS.z0; z <= WORLD_BOUNDS.z1; z += 8)
    for (let x = WORLD_BOUNDS.x0; x <= WORLD_BOUNDS.x1; x += 8)
      assert.ok(Number.isFinite(terrainHeight(x, z)));
});
test('expanded saves retain distant coordinates and more than twenty discoveries without changing appearance', () => {
  const save = freshSave();
  save.created = true;
  save.position = [542, -978];
  save.appearance.hair = 6;
  save.discoveries = Array.from({ length: 70 }, (_, i) => `discovery-${i}`);
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(save))), save);
  const invalid = validateSave({ ...save, position: [Infinity, NaN], discoveries: ['hill', 42, 'hill'] });
  assert.deepEqual(invalid.position, [8, 16]);
  assert.deepEqual(invalid.discoveries, ['hill']);
});

function bruteBlocked(c: Collision, x: number, z: number, r: number, y: number) {
  return (
    x < c.bounds.x0 + r ||
    x > c.bounds.x1 - r ||
    z < c.bounds.z0 + r ||
    z > c.bounds.z1 - r ||
    c.water(x, z) ||
    c.obstacles.some(
      (o) =>
        !o.cameraOnly &&
        !(y > (o.bottom || 0) + o.height || y + 1.5 < (o.bottom || 0)) &&
        c.contains(o, x, z, r),
    )
  );
}
function bruteCamera(
  c: Collision,
  start: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  distance: number,
  ground: (x: number, z: number) => number,
) {
  for (let t = 0.18; t < distance; t += 0.12) {
    const x = start.x + dir.x * t,
      y = start.y + dir.y * t,
      z = start.z + dir.z * t;
    if (
      x < c.bounds.x0 + 0.15 ||
      x > c.bounds.x1 - 0.15 ||
      z < c.bounds.z0 + 0.15 ||
      z > c.bounds.z1 - 0.15 ||
      y < ground(x, z) + 0.15
    )
      return Math.max(0.28, t - 0.18);
    for (const o of c.obstacles)
      if (y > (o.bottom || 0) - 0.12 && y < (o.bottom || 0) + o.height + 0.12 && c.contains(o, x, z, 0.16))
        return Math.max(0.28, t - 0.2);
  }
  return distance;
}
test('spatial broadphase matches original brute force for rotations, radii, height, water and camera sweeps', () => {
  const c = new Collision();
  let seed = 271;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  c.water = (x, z) => Math.abs(x - 60) < 3 && Math.abs(z) < 30;
  for (let i = 0; i < 1600; i++) {
    const o: Obstacle = {
      x: random() * 240 - 120,
      z: random() * 240 - 120,
      height: random() * 8 + 0.1,
      bottom: random() * 5,
      cameraOnly: i % 11 === 0,
    };
    if (i % 3)
      Object.assign(o, { w: random() * 9 + 0.1, d: random() * 9 + 0.1, yaw: random() * Math.PI * 2 });
    else o.r = random() * 4 + 0.1;
    c.add(o);
  }
  for (let i = 0; i < 5000; i++) {
    const x = random() * 260 - 130,
      z = random() * 270 - 135,
      r = random() * 1.4 + 0.01,
      y = random() * 12;
    assert.equal(c.blocked(x, z, r, y), bruteBlocked(c, x, z, r, y));
    if (i % 10 === 0) {
      const yaw = random() * Math.PI * 2,
        pitch = random() * 0.9 - 0.2;
      const start = { x, y, z },
        dir = { x: Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) };
      const ground = (xx: number, zz: number) => Math.sin(xx * 0.07) * Math.cos(zz * 0.06) * 2;
      assert.equal(c.cameraDistance(start, dir, 9, ground), bruteCamera(c, start, dir, 9, ground));
    }
  }
  assert.ok(c.query(-1, -1, 1, 1).size < 60, 'local query does not scan all 1,600 obstacles');
  assert.deepEqual(c.bounds, LEGACY_BOUNDS, 'legacy navigation envelope is not expanded by the foundation');
});
test('mutable obstacle handles, array changes and bulk reindex keep the spatial index current', () => {
  const c = new Collision(),
    original = { x: 0, z: 0, r: 1, height: 3 };
  const handle = c.add(original);
  assert.equal(handle, original);
  original.x = 40;
  assert.equal(c.blocked(40, 0), true);
  assert.equal(c.blocked(0, 0), false);
  handle.x = 20;
  assert.equal(c.blocked(0, 0), false);
  assert.equal(c.blocked(20, 0), true);
  c.update(original, { x: 30 });
  assert.equal(c.blocked(20, 0), false);
  assert.equal(c.blocked(30, 0), true);
  c.obstacles.push({ x: 8, z: 0, w: 8, d: 0.1, yaw: Math.PI / 2, height: 3 });
  c.obstacles[1].yaw = 0;
  assert.equal(c.blocked(11, 0), true);
  c.obstacles.splice(0, 1);
  assert.equal(c.blocked(30, 0), false);
  assert.equal(c.blocked(11, 0), true);
  c.obstacles.unshift({ x: -20, z: 0, r: 1, height: 3 });
  c.obstacles.reverse();
  assert.equal(c.blocked(-20, 0), true);
  c.obstacles[0] = { x: 40, z: 0, r: 1, height: 3 };
  assert.equal(c.blocked(11, 0), false);
  c.obstacles.length = 0;
  assert.equal(c.blocked(40, 0), false);
  const second = { x: 0, z: 0, r: 1, height: 3 };
  c.add(second);
  second.x = 60;
  assert.equal(c.blocked(60, 0), true);
  assert.equal(c.blocked(0, 0), false);
  c.remove(second);
  assert.equal(c.blocked(60, 0), false);
});

test('junction road surfaces are continuous across the whole advertised width, including switchback bisectors', () => {
  const epsilon = 0.01;
  for (let i = 1; i < REGION_ROUTE.length - 1; i++) {
    const n = REGION_ROUTE[i];
    if (n.z > -156) continue;
    for (let dx = -7; dx <= 7; dx += 0.17)
      for (let dz = -7; dz <= 7; dz += 0.17) {
        const x = n.x + dx,
          z = n.z + dz;
        const s = regionRouteSample(x, z);
        if (s.distance > s.width / 2) continue;
        for (const [xx, zz] of [
          [x + epsilon, z],
          [x, z + epsilon],
        ]) {
          const q = regionRouteSample(xx, zz);
          if (q.distance > q.width / 2) continue;
          assert.ok(Math.abs(terrainHeight(xx, zz) - terrainHeight(x, z)) < 0.015, `${n.id}: ${x},${z}`);
        }
      }
  }
  assert.ok(Math.abs(terrainHeight(454.39, -994.54) - terrainHeight(454.38, -994.54)) < 0.015);
});

test('dragon shelf supports the full creature footprint and the falls basin stays below its receiving water', () => {
  for (let angle = 0; angle < Math.PI * 2; angle += 0.15)
    for (let r = 0; r <= 26; r += 2)
      assert.ok(Math.abs(terrainHeight(542 + Math.cos(angle) * r, -978 + Math.sin(angle) * r) - 92) < 1e-8);
  assert.equal(
    terrainHeight(529, -958),
    92,
    'the encounter approach shares the resting shelf instead of hiding the feet behind a ridge',
  );
  assert.ok(Math.abs(terrainHeight(370, -698) - 17.2) < 1e-8);
  assert.ok(regionRiverSample(-698).y > terrainHeight(370, -698));
});

test('the entire main trail width is dry and bank-clear, except for explicitly supported bridge decks', () => {
  let crossingSamples = 0;
  for (let i = 2; i < REGION_ROUTE.length; i++) {
    const a = REGION_ROUTE[i - 1],
      b = REGION_ROUTE[i];
    const dx = b.x - a.x,
      dz = b.z - a.z,
      length = Math.hypot(dx, dz),
      steps = Math.ceil(length / 0.25);
    for (let j = 0; j <= steps; j++) {
      const t = j / steps,
        width = a.width + (b.width - a.width) * t;
      for (let side = -1; side <= 1; side += 0.125) {
        const x = a.x + dx * t - (dz / length) * width * 0.5 * side;
        const z = a.z + dz * t + (dx / length) * width * 0.5 * side;
        if (z < -910 || z >= -132) continue;
        const river = regionRiverSample(z),
          y = terrainHeight(x, z);
        const bankGap = Math.abs(x - river.x) - river.halfWidth;
        if (bankGap <= 2) {
          const bridge = regionBridgeAt(x, z);
          assert.ok(bridge, `${b.id}: accidental water/bank crossing ${x},${z}`);
          assert.ok(y >= river.y + bridge.clearance, `${b.id}: submerged bridge ${x},${z}`);
          const bx = bridge.to.x - bridge.from.x,
            bz = bridge.to.z - bridge.from.z;
          const u = ((x - bridge.from.x) * bx + (z - bridge.from.z) * bz) / (bx * bx + bz * bz);
          const deck = bridge.from.y + (bridge.to.y - bridge.from.y) * u;
          assert.ok(Math.abs(y - deck) < 1e-8, 'authored deck and runtime support share their height');
          crossingSamples++;
        }
        const pool = Math.hypot((x - 370) / 22, (z + 698) / 18);
        if (pool < 1) assert.ok(y >= 18.35, `${b.id}: receiving-pool overlap ${x},${z}`);
      }
    }
  }
  assert.equal(REGION_BRIDGES.length, 1);
  assert.ok(crossingSamples > 0, 'the explicit headwater bridge is actually exercised');
});

test('all lanes across the advertised trail width retain maximum road and walking grades through junction landings', () => {
  for (let i = 2; i < REGION_ROUTE.length; i++) {
    const a = REGION_ROUTE[i - 1],
      b = REGION_ROUTE[i],
      dx = b.x - a.x,
      dz = b.z - a.z,
      length = Math.hypot(dx, dz);
    const steps = Math.ceil(length / 0.1),
      limit = b.mode === 'walk' ? 0.18 : 0.1;
    for (let side = -1; side <= 1; side += 0.125) {
      let px = a.x - (dz / length) * a.width * 0.5 * side,
        pz = a.z + (dx / length) * a.width * 0.5 * side,
        py = terrainHeight(px, pz);
      for (let j = 1; j <= steps; j++) {
        const t = j / steps,
          width = a.width + (b.width - a.width) * t;
        const x = a.x + dx * t - (dz / length) * width * 0.5 * side,
          z = a.z + dz * t + (dx / length) * width * 0.5 * side,
          y = terrainHeight(x, z);
        assert.ok(
          Math.abs(y - py) / Math.hypot(x - px, z - pz) <= limit + 1e-6,
          `${b.id} side ${side} at ${x},${z}`,
        );
        px = x;
        pz = z;
        py = y;
      }
    }
  }
});

test('the waterfall lip and upper current are supported by continuous high banks and a sculpted escarpment', () => {
  for (let z = -730; z >= -830; z -= 0.5) {
    const river = regionRiverSample(z);
    for (const side of [-1, 1]) {
      const x = river.x + side * (river.halfWidth + 10);
      assert.ok(terrainHeight(x, z) >= river.y, `unsupported lip/bank at ${x},${z}`);
      assert.ok(Math.abs(terrainHeight(x + 0.01, z) - terrainHeight(x, z)) < 0.06);
      assert.ok(Math.abs(terrainHeight(x, z + 0.01) - terrainHeight(x, z)) < 0.06);
    }
  }
  assert.ok(terrainHeight(390, -731) > terrainHeight(390, -705) + 25);
  assert.ok(Math.abs(terrainHeight(366, -740) - (regionRiverSample(-740).y - 1.6)) < 1e-8);
});

test('legacy navigation retains its coordinate mapping and reachable village route after world bounds expand', () => {
  const c = new Collision();
  c.add({ x: 12, z: 10, w: 5.4, d: 4.6, height: 4.3 });
  const nav = new Navigation(c);
  const ids = [
    [0, 17],
    [12, -21],
    [-26, 80],
    [80, 48],
  ].map(([x, z]) => nav.id(x, z));
  const points = ids.map((id) => nav.point(id));
  const width = nav.width,
    height = nav.height;
  c.bounds = { ...WORLD_BOUNDS };
  assert.equal(nav.width, width);
  assert.equal(nav.height, height);
  assert.deepEqual(
    ids.map((id) => nav.point(id)),
    points,
  );
  assert.deepEqual(
    [
      [0, 17],
      [12, -21],
      [-26, 80],
      [80, 48],
    ].map(([x, z]) => nav.id(x, z)),
    ids,
  );
  const route = nav.route([0, 17], [0, -55]);
  assert.ok(route.length > 0);
  assert.ok(Math.hypot(route.at(-1)![0], route.at(-1)![1] + 55) < 2);
  assert.ok(route.every(([x, z]) => !c.blocked(x, z, 0.38, terrainHeight(x, z))));
});
