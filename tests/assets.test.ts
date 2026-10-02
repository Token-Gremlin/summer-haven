import { HAIR, TOPS, BOTTOMS, SHOES, ACCESSORIES } from '../src/data/appearance';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
function glb(path: string) {
  const b = readFileSync(path);
  assert.equal(b.toString('utf8', 0, 4), 'glTF');
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
}
test('both complete modular wardrobes export with compatible rigs and ten actions', () => {
  const rigs: string[][] = [];
  for (const body of ['feminine', 'masculine']) {
    const g = glb(`public/assets/characters/${body}.glb`);
    assert.equal(g.skins.length, 1);
    const names = g.nodes.map((n: { name: string }) => n.name);
    assert.ok(!names.includes('Cube'));
    rigs.push(g.skins[0].joints.map((i: number) => g.nodes[i].name));
    for (const [prefix, count] of [
      ['HAIR', HAIR.length],
      ['TOP', TOPS.length],
      ['BOTTOM', BOTTOMS.length],
      ['SHOE', SHOES.length],
      ['ACC', ACCESSORIES.length],
    ] as const)
      for (let i = 0; i < count; i++)
        assert.ok(
          names.some((n: string) => n.startsWith(`${prefix}_${i}_`)),
          `${body}: ${prefix} ${i}`,
        );
    assert.deepEqual(
      g.animations.map((a: { name: string }) => a.name).sort(),
      ['idle', 'walk', 'jog', 'cycle', 'sit', 'interact', 'mount', 'dismount', 'brake', 'turn'].sort(),
    );
    for (const a of g.accessors)
      if (a.type === 'VEC3' && a.min) assert.ok([...a.min, ...a.max].every(Number.isFinite));
  }
  assert.deepEqual(rigs[0], rigs[1]);
  assert.equal(rigs[0].length, 22);
});
test('village kit includes production hero assets and articulated bicycle parts', () => {
  const g = glb('public/assets/world/village-kit.glb'),
    names = g.nodes.map((n: { name: string }) => n.name);
  for (const n of [
    'BLD_home',
    'BLD_cafe',
    'BLD_shop',
    'BICYCLE_town',
    'wheel_front',
    'wheel_rear',
    'crank',
    'steering',
    'grip_L',
    'grip_R',
    'pedal_L',
    'pedal_R',
    'FURN_wardrobe',
    'FURN_bed',
    'FURN_bench',
    'PROP_cat',
    'PROP_pergola',
    'PROP_market_stall',
    'PROP_garden_pump',
  ])
    assert.ok(names.includes(n), n);
});
