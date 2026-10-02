import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Assets } from '../src/game/assets';
import { addCityInteriors, CITY_INTERIOR_LAYOUT, type CityInteriorRoom } from '../src/world/city-interiors';
import { CITY_BUILDINGS } from '../src/data/city';

// Mechanical evidence uses the real Blender furniture geometry. This canvas stub
// only permits text-plane construction in Node; it provides no visual approval.
async function build() {
  const file = readFileSync('public/assets/world/village-kit.glb');
  const gltf = await new GLTFLoader().parseAsync(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    '',
  );
  const assets = new Assets();
  assets.library = gltf.scene;
  assets.toon(assets.library, false);
  const old = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: (tag: string) => {
        assert.equal(tag, 'canvas');
        return { width: 0, height: 0, getContext: () => ({ fillRect() {}, strokeRect() {}, fillText() {} }) };
      },
    },
  });
  const group = new T.Group(),
    rooms = new Map<string, CityInteriorRoom>();
  try {
    addCityInteriors(assets, group, rooms);
  } finally {
    if (old) Object.defineProperty(globalThis, 'document', old);
    else Reflect.deleteProperty(globalThis, 'document');
  }
  return { assets, group, rooms };
}
const fixture = build();

test('all three room programs fit their authored shell family and preserve existing rooms on repeated registration', async () => {
  const { assets, group, rooms } = await fixture;
  assert.deepEqual([...rooms.keys()], ['aldermere-market', 'aldermere-workshop', 'aldermere-canal']);
  assert.equal(group.children.length, 3);
  for (const layout of CITY_INTERIOR_LAYOUT) {
    const room = rooms.get(layout.id)!;
    assert.ok(CITY_BUILDINGS.some((b) => b.interior === layout.id));
    assert.deepEqual(room.collision.bounds, {
      x0: layout.x - layout.width / 2,
      x1: layout.x + layout.width / 2,
      z0: -layout.depth / 2,
      z1: layout.depth / 2,
    });
    assert.equal(room.origin.y, 0);
    assert.ok(!room.collision.blocked(room.origin.x, room.origin.z, 0.27, 0));
    assert.equal(room.interactions.filter((i) => i.kind === 'exit').length, 1);
    assert.ok(room.interactions.every((i) => i.inside === layout.id));
    const root = group.children.find((o) => o.userData.interiorId === layout.id)!;
    assert.equal(root.name, CITY_BUILDINGS.find((b) => b.interior === layout.id)!.name);
    let furniture = 0;
    root.traverse((o) => {
      if (o.userData.interiorFurniture) furniture++;
      if (o instanceof T.Mesh) {
        assert.ok(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite));
        assert.ok(!o.name.startsWith('COL_'));
      }
    });
    assert.ok(furniture >= 3);
  }
  const originals = [...rooms.values()];
  addCityInteriors(assets, group, rooms);
  assert.equal(group.children.length, 3);
  assert.deepEqual([...rooms.values()], originals);
});

test('each inspection, exit and rest approach is reachable through real furniture collision at player radius', async () => {
  const { rooms } = await fixture;
  for (const [id, room] of rooms) {
    const c = room.collision,
      b = c.bounds,
      step = 0.12,
      radius = 0.27;
    const width = Math.floor((b.x1 - b.x0) / step) + 1,
      height = Math.floor((b.z1 - b.z0) / step) + 1;
    const point = (i: number) => ({ x: b.x0 + (i % width) * step, z: b.z0 + Math.floor(i / width) * step });
    const gridId = (x: number, z: number) =>
      Math.round((x - b.x0) / step) + Math.round((z - b.z0) / step) * width;
    const start = gridId(room.origin.x, room.origin.z),
      queue = [start],
      visited = new Set([start]);
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head],
        p = point(current);
      for (const delta of [-1, 1, -width, width]) {
        const next = current + delta;
        if (next < 0 || next >= width * height || visited.has(next)) continue;
        const q = point(next);
        if (Math.hypot(q.x - p.x, q.z - p.z) > step * 1.01 || c.blocked(q.x, q.z, radius, 0)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
    for (const interaction of room.interactions) {
      assert.ok(
        !c.blocked(interaction.x, interaction.z, radius, 0),
        `${id}: blocked target ${interaction.id}`,
      );
      assert.ok(visited.has(gridId(interaction.x, interaction.z)), `${id}: unreachable ${interaction.id}`);
      if (interaction.seat) {
        const [x, z] = interaction.seat;
        assert.ok(!c.blocked(x, z, radius, 0), `${id}: sitting traps the player`);
        const standing = { x, z };
        c.move(standing, 0, 0.85, radius, 0);
        assert.ok(standing.z > z + 0.8, 'the seated player can stand and walk into the room');
      }
    }
  }
});

test('door voids remain open while adjacent walls and ceilings stop the camera', async () => {
  const { rooms } = await fixture;
  for (const layout of CITY_INTERIOR_LAYOUT) {
    const c = rooms.get(layout.id)!.collision,
      z = layout.depth / 2,
      x = layout.x + layout.doorX;
    // Test physical door panels independently of the room's intentional transition boundary.
    const physical = c.obstacles.filter((o) => !o.cameraOnly);
    assert.ok(!physical.some((o) => c.contains(o, x, z, 0.27) && 1.5 > (o.bottom ?? 0)));
    assert.ok(
      c.cameraDistance({ x: layout.x, y: 1.25, z: 0 }, { x: 0, y: 1, z: 0 }, 5, () => 0) < layout.height,
    );
    assert.ok(
      c.cameraDistance({ x: layout.x, y: 1.25, z: 0 }, { x: 0, y: 0, z: -1 }, 8, () => 0) < layout.depth / 2,
    );
    assert.ok(c.obstacles.some((o) => o.tag === 'FURN_table' && Math.max(o.w!, o.d!) > 1 && o.height > 0.7));
  }
});

test('civic, craft and domestic interactions offer different specific English information', async () => {
  const { rooms } = await fixture;
  const market = rooms
    .get('aldermere-market')!
    .interactions.map((i) => i.data ?? '')
    .join(' ');
  const craft = rooms
    .get('aldermere-workshop')!
    .interactions.map((i) => i.data ?? '')
    .join(' ');
  const home = rooms
    .get('aldermere-canal')!
    .interactions.map((i) => i.data ?? '')
    .join(' ');
  assert.match(market, /western switchbacks/);
  assert.match(market, /Iona/);
  assert.match(market, /Mira/);
  assert.match(craft, /opposite spokes/);
  assert.match(craft, /second row/);
  assert.match(home, /Lio/);
  assert.match(home, /Mara/);
  for (const room of rooms.values())
    for (const i of room.interactions) {
      assert.ok(i.label.length > 5);
      if (i.kind === 'inspect') assert.ok(i.data!.length > 120);
      assert.ok(!/[\u3040-\u30ff\u3400-\u9fff]/.test(i.label + (i.data ?? '')));
    }
});
