import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HabitatLife } from '../src/world/habitat-life';
import { terrainHeight } from '../src/data/world';
import { regionSurfaceWater } from '../src/data/regions';
import { HABITATS } from '../src/data/habitats';
test('authored habitats reach multiple contacts on actual world terrain without water or ground penetration', () => {
  const waterHeight = regionSurfaceWater;
  const life = new HabitatLife({ terrainHeight, waterHeight, blocked: () => false }),
    visits = new Map<string, Set<number>>();
  for (let i = 0; i < 4000; i++) {
    life.update(0.1, 0.5, { x: 0, y: 0, z: 0 });
    for (const a of life.inspect().animals) {
      if (!visits.has(a.id)) visits.set(a.id, new Set());
      visits.get(a.id)!.add(a.node);
      assert.ok(
        a.position.y >= terrainHeight(a.position.x, a.position.z) - 0.021,
        `${a.id} penetrates terrain`,
      );
    }
  }
  for (const [id, nodes] of visits) assert.ok(nodes.size >= 2, `${id} remains stuck at ${[...nodes]}`);
  assert.equal(
    life.inspect().animals.length,
    HABITATS.reduce((n, h) => n + h.count, 0),
  );
});

import { readFileSync } from 'node:fs';
import { Collision } from '../src/world/collision';
test('all habitat residents find routes against captured world solid obstacles', () => {
  const fixture = JSON.parse(
    readFileSync(new URL('../docs/gauntlet/evidence/habitat-collision-integrated-06.json', import.meta.url), 'utf8'),
  );
  const collision = new Collision();
  collision.bounds = fixture.bounds;
  collision.obstacles = Object.values(fixture.obstacles);
  const blocked = (x: number, y: number, z: number, r: number) =>
    [...collision.query(x - r, z - r, x + r, z + r)].some(
      (o) =>
        !o.cameraOnly &&
        y <= (o.bottom ?? 0) + o.height &&
        y + 0.8 >= (o.bottom ?? 0) &&
        collision.contains(o, x, z, r),
    );
  const waterHeight = regionSurfaceWater;
  const life = new HabitatLife({ terrainHeight, waterHeight, blocked });
  const visited = new Map<string, Set<number>>();
  for (let i = 0; i < 4000; i++) {
    life.update(0.1, 0.5, { x: 0, y: 0, z: 0 });
    for (const a of life.inspect().animals) {
      if (!visited.has(a.id)) visited.set(a.id, new Set());
      visited.get(a.id)!.add(a.node);
      const habitat = HABITATS.find((h) => a.id.startsWith(h.id + '-'))!;
      assert.ok(
        !blocked(
          a.position.x,
          a.position.y + 0.12,
          a.position.z,
          habitat.species === 'deer' ? 1.6 : habitat.radius,
        ),
        `${a.id} overlaps solid at ${JSON.stringify(a.position)}`,
      );
    }
    const ground = life.inspect().animals.filter((a) => !a.id.includes('songbirds'));
    for (let j = 0; j < ground.length; j++)
      for (let k = j + 1; k < ground.length; k++) {
        const a = ground[j],
          b = ground[k];
        const radius =
          (a.id.startsWith('mosswood') ? 1.6 : 0.5) + (b.id.startsWith('mosswood') ? 1.6 : 0.5);
        assert.ok(
          Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z) >= radius,
          `${a.id} and ${b.id} overlap at elapsed ${life.inspect().elapsed}`,
        );
      }
  }
  for (const [id, nodes] of visited) assert.ok(nodes.size >= 2, `${id} blocked at ${[...nodes]}`);
});

test('authored terrapins reach dry basking banks and bird feet sit on supported stone tops', () => {
  const waterHeight = regionSurfaceWater;
  const life = new HabitatLife({ terrainHeight, waterHeight, blocked: () => false });
  const dry = new Set<string>();
  for (let i = 0; i < 6000; i++) {
    life.update(0.1, 0.5, { x: 0, y: 0, z: 0 });
    for (const a of life.inspect().animals) {
      if (a.id.startsWith('silver') && waterHeight(a.position.x, a.position.z) === null) dry.add(a.id);
      if (a.id.includes('songbirds') && a.state === 'perch')
        assert.ok(Math.abs(a.position.y - terrainHeight(a.position.x, a.position.z) - 0.42) < 1e-6);
    }
  }
  assert.equal(dry.size, 3);
});

test('ground residents clear the rendered bird perch clusters, including old overlapping saves', () => {
  const options = { terrainHeight, waterHeight: regionSurfaceWater, blocked: () => false };
  const life = new HabitatLife(options);
  assert.ok(life.group.children.some((o) => o.name === 'mosswood-songbirds perch stones'));
  const stones = HABITATS.filter((h) => h.species === 'songbird').flatMap((h) =>
    Array.from({ length: h.count }, (_, i) =>
      h.points.map((p) => ({ x: p.x + (i % 2) * 0.7, z: p.z + Math.floor(i / 2) * 0.7 })),
    ).flat(),
  );
  const check = (world: HabitatLife) => {
    for (const a of world.inspect().animals.filter((a) => a.id.startsWith('mosswood-glade'))) {
      for (const s of stones)
        assert.ok(
          Math.hypot(a.position.x - s.x, a.position.z - s.z) >= 1.99,
          `deer full envelope overlaps perch stone: ${a.id} at ${a.position.x},${a.position.z}`,
        );
    }
  };
  check(life);
  const old = life.snapshot();
  const r = old.animals.find((a) => a.id === 'mosswood-glade-2')!;
  r.node = r.target = 2;
  r.position = { x: 220, y: terrainHeight(220, -509), z: -509 };
  r.origin = { ...r.position };
  r.state = 'feed';
  const restored = new HabitatLife({ ...options, saved: old });
  check(restored);
  for (let i = 0; i < 4000; i++) {
    life.update(0.1, 0.5, { x: 0, y: 0, z: 0 });
    check(life);
  }
  restored.reset();
  check(restored);
});

test('public support descriptors cover actual perch mesh vertices and remain stable across reset', () => {
  const life = new HabitatLife({ terrainHeight, waterHeight: regionSurfaceWater, blocked: () => false });
  const solids = life.supportObstacles;
  assert.equal(solids.length, 32);
  assert.equal(new Set(solids.map((s) => s.tag)).size, solids.length);
  assert.ok(Object.isFrozen(solids) && solids.every((s) => Object.isFrozen(s)));
  for (const mesh of life.group.children.filter((o) => o.name.endsWith('perch stones'))) {
    const position = (mesh as import('three').Mesh).geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i),
        y = position.getY(i),
        z = position.getZ(i);
      assert.ok(
        solids.some(
          (s) =>
            Math.hypot(x - s.x, z - s.z) <= s.r + 0.0001 &&
            y >= s.bottom - 0.0001 &&
            y <= s.bottom + s.height + 0.0001,
        ),
        'visible perch vertex outside registered solids',
      );
    }
  }
  life.update(30, 0.5, { x: 0, y: 0, z: 0 });
  life.reset();
  assert.equal(life.supportObstacles, solids);
});
