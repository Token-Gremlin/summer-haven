import * as T from 'three';
import type { Village } from './village';
import { BUILDINGS, terrainHeight } from '../data/world';
import { box, cyl, blob, merge, prep, xf, M, ID } from './geo';
import { fence, postBox } from './props';
import { parkedBike, potRow, laundryPole } from './street';
import { paintedSign } from './signage';

/** Deliberate yards and gathering places, built before plants so collision keeps paths clear. */
export function neighborhoods(v: Village) {
  for (const b of BUILDINGS) {
    const f = new T.Vector2(Math.sin(b.yaw), Math.cos(b.yaw));
    const r = new T.Vector2(Math.cos(b.yaw), -Math.sin(b.yaw));
    const spot = (side: number, front: number) =>
      new T.Vector2(b.x, b.z).addScaledVector(r, side).addScaledVector(f, front);
    // Low stone planters beside the entrance, leaving a generous central passage.
    const p = spot(b.w * 0.34, b.d / 2 + 1.8);
    v.prop(planter(b.seed), p.x, p.y, b.yaw);
    v.collision.add({
      x: p.x,
      z: p.y,
      w: 1.65,
      d: 0.63,
      yaw: b.yaw,
      height: 0.48,
      bottom: terrainHeight(p.x, p.y),
    });
    if (b.seed % 3 !== 0) {
      const q = spot(-b.w * 0.55, b.d / 2 + 1.65);
      v.prop(postBox(), q.x, q.y, b.yaw, ID.sign).scale.setScalar(0.72);
    }
    if (b.seed % 3 === 0) {
      const q = spot(b.w * 0.65, -b.d * 0.28);
      v.prop(parkedBike(b.seed % 2 ? '#8da294' : '#aa755d'), q.x, q.y, b.yaw + 0.18);
    }
    if (b.seed > 130) {
      const p = spot(0, -b.d / 2 - 1.45);
      for (const g of fence(b.w + 1, 0.74, '#8c7955', Math.ceil(b.w / 0.65), true))
        v.prop(g, p.x, p.y, b.yaw, ID.fence, 0.25);
      v.collision.add({
        x: p.x,
        z: p.y,
        w: b.w + 1,
        d: 0.12,
        yaw: b.yaw,
        height: 0.8,
        bottom: terrainHeight(p.x, p.y),
      });
      if (b.seed % 2) {
        const q = spot(-b.w * 0.68, -0.3);
        v.prop(laundryPole(b.seed), q.x, q.y, b.yaw + Math.PI / 2);
      }
    }
  }
  for (const [x, z, yaw] of [
    [-37, 93, 0],
    [91, 65, Math.PI / 2],
    [-18, 7, 0.2],
  ]) {
    v.asset('PROP_pergola', x, z, yaw);
    // Open-sided: posts and bench legs keep the center aisle traversable.
    for (const sx of [-1.9, 1.9])
      for (const sz of [-1.5, 1.5]) {
        const xx = x + sx * Math.cos(yaw) + sz * Math.sin(yaw),
          zz = z - sx * Math.sin(yaw) + sz * Math.cos(yaw);
        v.collision.add({ x: xx, z: zz, r: 0.18, height: 3, bottom: terrainHeight(x, z) });
      }
    for (const sx of [-1.1, 1.1])
      for (const sz of [-1.2, 1.2]) {
        const xx = x + sx * Math.cos(yaw) + sz * Math.sin(yaw),
          zz = z - sx * Math.sin(yaw) + sz * Math.cos(yaw);
        v.collision.add({ x: xx, z: zz, r: 0.095, height: 0.5, bottom: terrainHeight(x, z) });
      }
    v.interactions.push({
      id: `pergola-${x}`,
      label: 'Rest in the vine shade',
      x: x - 1,
      z,
      radius: 1.8,
      kind: 'sit',
      seat: [x + Math.sin(yaw) * 0.95, z + Math.cos(yaw) * 0.95 - 0.13, yaw + Math.PI, 0.1],
    });
  }
  for (const [x, z, yaw] of [
    [-6, 55, Math.PI / 2],
    [76, 18, Math.PI / 2],
  ]) {
    v.asset('PROP_market_stall', x, z, yaw);
    v.collision.add({ x, z, w: 2.6, d: 1.25, yaw, height: 1.2, bottom: terrainHeight(x, z) });
    v.interactions.push({
      id: `market-${x}`,
      label: 'Read the market note',
      x: x + 1.7,
      z,
      radius: 1.8,
      kind: 'inspect',
      data: 'Picked this morning. Leave a coin in the little box, or bring something from your garden tomorrow.',
    });
  }
  v.asset('PROP_garden_pump', -34, 83);
  v.collision.add({ x: -34, z: 83, w: 0.8, d: 1.1, height: 1.2 });
  v.interactions.push({
    id: 'garden',
    label: 'The community garden',
    x: -34,
    z: 84.3,
    radius: 1.7,
    kind: 'inspect',
    data: 'Tomatoes, beans, and a few sunflowers that nobody remembers planting. Everyone has a row. Visitors can take what they need.',
  });
  // Raised vegetable plots arranged around a cross-shaped working aisle.
  for (const x of [-40, -35])
    for (const z of [85, 89, 99, 103]) {
      v.prop(vegetableBed(Math.round(x + z)), x, z);
      v.collision.add({ x, z, w: 2.5, d: 1.7, height: 0.4 });
    }
  v.prop(potRow(111, 5), -40, 94);
  for (const [x, z, lines] of [
    [-3, 49, ['Hibiscus lane ↓', 'Community garden ↙']],
    [73, -17, ['Apricot neighborhood ↓', 'Orchard picnic walk →']],
    [80, 88, ['The long way home', 'Bridge & village ↑']],
    [-29, 80, ['The shared garden', 'Water. Grow. Share.']],
  ] as [number, number, string[]][]) {
    v.prop(box(0.1, 1.6, 0.1, '#7c6645', M.planks), x, z).position.y += 0.8;
    const sign = paintedSign(lines, 1.8, 0.62);
    sign.position.set(x, terrainHeight(x, z) + 1.37, z + 0.08);
    v.group.add(sign);
  }
}

function planter(seed: number) {
  const out = [
    xf(box(1.65, 0.32, 0.63, '#999583', M.stone), 0, 0.16, 0),
    xf(box(1.47, 0.025, 0.46, '#574d35', M.ground), 0, 0.33, 0),
  ];
  for (let j = 0; j < 6; j++) {
    const x = -0.65 + j * 0.26,
      h = 0.49 + 0.08 * Math.sin(j * 3 + seed);
    out.push(xf(cyl(0.014, 0.014, h - 0.3, '#496240', M.foliage, 5), x, 0.32 + (h - 0.3) / 2, 0));
    const foliage = prep(blob(0.17, 1, 0.15, j + seed), '#52764a', M.foliage);
    foliage.scale(1, 0.6, 0.9).translate(x, 0.4, 0);
    out.push(foliage);
    for (let k = 0; k < 4; k++) {
      const bloom = prep(blob(0.059, 0, 0.07, k + j), ['#d8a3b8', '#b8bbdf', '#ead186'][seed % 3], M.foliage);
      bloom.translate(x + Math.sin(k * 2.4) * 0.07, h, Math.cos(k * 2.4) * 0.07);
      out.push(bloom);
    }
  }
  return merge(out);
}
function vegetableBed(seed: number) {
  const out = [
    xf(box(2.5, 0.22, 1.7, '#8d7550', M.planks), 0, 0.11, 0),
    xf(box(2.34, 0.025, 1.54, '#766046', M.ground), 0, 0.23, 0),
  ];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 3; j++) {
      const x = -0.85 + i * 0.55,
        z = -0.52 + j * 0.5;
      const leaf = prep(blob(0.24, 1, 0.22, seed + i * 7 + j), i % 2 ? '#547b39' : '#67904a', M.foliage);
      leaf.scale(1, 0.55, 1).translate(x, 0.37, z);
      out.push(leaf);
      if (i % 2 === 0)
        out.push(
          xf(cyl(0.018, 0.02, 0.83, '#957449', M.planks, 5), x, 0.62, z),
          xf(prep(blob(0.065, 0, 0.03, i), '#c57545', M.plain), x + 0.1, 0.65, z),
        );
    }
  return merge(out);
}
