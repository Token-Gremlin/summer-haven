import * as T from 'three';
import type { Assets } from '../game/assets';
import { CITY_BUILDINGS } from '../data/city';
import { Collision } from './collision';
import type { Interaction } from './village';
import { box, cyl, sphere, beam, prep, merge, xf, M, ID } from './geo';
import { uber, surfaceBits, specializeUber } from '../render/materials';
import { paintedSign } from './signage';

export interface CityInteriorRoom {
  origin: T.Vector3;
  collision: Collision;
  interactions: Interaction[];
}
/** Interior dimensions fit the three authored shells; all support floors are at y=0. */
export const CITY_INTERIOR_LAYOUT = [
  { id: 'aldermere-market', x: 520, width: 9.6, depth: 5.2, height: 3.1, doorX: 0, doorWidth: 1.9 },
  { id: 'aldermere-workshop', x: 560, width: 5, depth: 6.2, height: 3.7, doorX: -0.525, doorWidth: 1.95 },
  { id: 'aldermere-canal', x: 600, width: 5.6, depth: 5.6, height: 3.05, doorX: -1.74, doorWidth: 1.28 },
] as const;
type Layout = (typeof CITY_INTERIOR_LAYOUT)[number];

class RoomBuilder {
  readonly root = new T.Group();
  readonly collision = new Collision();
  readonly interactions: Interaction[] = [];
  private detail: T.BufferGeometry[] = [];
  constructor(
    readonly assets: Assets,
    readonly layout: Layout,
  ) {
    this.root.name = CITY_BUILDINGS.find((b) => b.interior === layout.id)?.name ?? layout.id;
    this.root.userData.interiorId = layout.id;
    this.root.position.x = layout.x;
    this.collision.bounds = {
      x0: layout.x - layout.width / 2,
      x1: layout.x + layout.width / 2,
      z0: -layout.depth / 2,
      z1: layout.depth / 2,
    };
    this.interactions.push({
      id: `${layout.id}-exit`,
      label: 'Step outside',
      kind: 'exit',
      inside: layout.id,
      x: layout.x + layout.doorX,
      z: layout.depth / 2 - 0.42,
      radius: 0.95,
    });
  }
  part(g: T.BufferGeometry, x: number, y: number, z: number, yaw = 0) {
    this.detail.push(xf(g, x, y, z, 0, yaw));
  }
  block(
    x: number,
    z: number,
    w: number,
    d: number,
    height: number,
    bottom = 0,
    tag = 'interior-furniture',
    cameraOnly = false,
  ) {
    this.collision.add({ x: this.layout.x + x, z, w, d, height, bottom, tag, cameraOnly });
  }
  shell(wall: string, trim: string, floor: string, panel: string) {
    const { width: w, depth: d, height: h, doorX, doorWidth } = this.layout;
    this.part(box(w + 0.16, 0.14, d + 0.16, floor, M.planks), 0, -0.07, 0);
    // Ceiling stays visible but does not extinguish the custom directional room light.
    const ceilingGeo = xf(box(w + 0.16, 0.12, d + 0.16, '#d8cbb0', M.plaster), 0, h + 0.06, 0);
    const ceiling = new T.Mesh(ceilingGeo, uber(ID.house, 0, T.DoubleSide, surfaceBits(ceilingGeo)));
    ceiling.name = 'Continuous ceiling';
    this.root.add(ceiling);
    this.block(0, 0, w, d, 0.12, h, 'interior-ceiling', true);
    const wallParts: [number, number, number, number][] = [
      [-w / 2, 0, 0.16, d],
      [w / 2, 0, 0.16, d],
      [0, -d / 2, w, 0.16],
    ];
    const left = doorX - doorWidth / 2,
      right = doorX + doorWidth / 2;
    wallParts.push(
      [(-w / 2 + left) / 2, d / 2, left + w / 2, 0.16],
      [(right + w / 2) / 2, d / 2, w / 2 - right, 0.16],
    );
    for (const [x, z, ww, dd] of wallParts) {
      this.part(box(ww, h, dd, wall, M.plaster), x, h / 2, z);
      this.block(x, z, ww, dd, h, 0, 'interior-wall');
      this.part(box(ww + 0.02, 0.12, dd + 0.02, trim, M.planks), x, 0.08, z);
      this.part(box(ww + 0.025, 0.055, dd + 0.025, trim, M.planks), x, 0.9, z);
      this.part(box(ww + 0.012, 0.72, dd + 0.012, panel, M.planks), x, 0.47, z);
    }
    this.part(box(doorWidth, h - 2.65, 0.16, wall, M.plaster), doorX, 2.65 + (h - 2.65) / 2, d / 2);
    this.block(doorX, d / 2, doorWidth, 0.16, h - 2.65, 2.65, 'interior-lintel');
    for (const x of [left - 0.045, right + 0.045])
      this.part(box(0.09, 2.7, 0.2, trim, M.planks), x, 1.35, d / 2 - 0.02);
    this.part(box(doorWidth + 0.18, 0.1, 0.2, trim, M.planks), doorX, 2.68, d / 2 - 0.02);
    this.part(box(doorWidth - 0.12, 0.012, 0.7, '#8f8269', M.cloth), doorX, 0.008, d / 2 - 0.44);
    for (const z of [-d / 2 + 0.1, d / 2 - 0.1])
      this.part(box(w, 0.15, 0.16, trim, M.planks), 0, h - 0.08, z);
  }
  item(name: string, x: number, z: number, yaw = 0, solid = true) {
    const object = this.assets.get(name);
    object.position.set(x, 0, z);
    object.rotation.y = yaw;
    object.userData.interiorFurniture = name;
    this.root.add(object);
    this.root.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(object),
      size = bounds.getSize(new T.Vector3()),
      center = bounds.getCenter(new T.Vector3());
    if (solid)
      this.collision.add({
        x: center.x,
        z: center.z,
        w: size.x,
        d: size.z,
        bottom: bounds.min.y,
        height: size.y,
        tag: name,
      });
    return object;
  }
  sign(lines: string[], x: number, y: number, z: number, width: number, height: number, yaw = 0) {
    const sign = paintedSign(lines, width, height);
    sign.position.set(x, y, z);
    sign.rotation.y = yaw;
    sign.name = lines.join(' · ');
    this.root.add(sign);
  }
  inspect(id: string, label: string, x: number, z: number, text: string, radius = 1.15) {
    this.interactions.push({
      id: `${this.layout.id}-${id}`,
      label,
      kind: 'inspect',
      inside: this.layout.id,
      x: this.layout.x + x,
      z,
      radius,
      data: text,
    });
  }
  window(x: number, y: number, z: number, width: number, height: number, yaw = 0) {
    const pane = box(width, height, 0.055, '#acc6bf', M.glow);
    this.part(pane, x, y, z, yaw);
    const frame: T.BufferGeometry[] = [];
    for (const sx of [-width / 2, 0, width / 2])
      frame.push(xf(box(0.055, height + 0.13, 0.08, '#667b6b', M.planks), sx, 0, 0.035));
    for (const sy of [-height / 2, 0, height / 2])
      frame.push(xf(box(width + 0.11, 0.055, 0.08, '#667b6b', M.planks), 0, sy, 0.035));
    this.part(merge(frame), x, y, z, yaw);
    this.part(box(width + 0.24, 0.075, 0.27, '#937553', M.planks), x, y - height / 2 - 0.04, z + 0.04, yaw);
  }
  cup(x: number, y: number, z: number, color = '#b7c8b8') {
    const profile = [
      new T.Vector2(0.055, 0),
      new T.Vector2(0.074, 0.012),
      new T.Vector2(0.078, 0.11),
      new T.Vector2(0.067, 0.12),
      new T.Vector2(0.061, 0.025),
    ];
    this.part(prep(new T.LatheGeometry(profile, 16), color, M.plain), x, y, z);
    this.part(cyl(0.06, 0.06, 0.007, '#715743', M.plain, 16), x, y + 0.09, z);
    const handle = prep(new T.TorusGeometry(0.037, 0.009, 6, 12), '#d2c8a8', M.plain);
    this.part(handle, x + 0.079, y + 0.065, z);
  }
  lamp(x: number, z: number, y: number) {
    this.part(cyl(0.015, 0.015, 0.48, '#6c6251', M.metal, 6), x, y + 0.28, z);
    this.part(cyl(0.13, 0.2, 0.24, '#e8c87e', M.lantern, 8), x, y, z);
    this.part(cyl(0.07, 0.07, 0.12, '#ebd7a3', M.glow, 8), x, y - 0.15, z);
  }
  finish() {
    const g = merge(this.detail),
      mesh = new T.Mesh(g, uber(ID.house, 0.28, T.DoubleSide, surfaceBits(g)));
    mesh.name = 'Authored room structure and details';
    mesh.layers.enable(1);
    this.root.add(mesh);
    specializeUber(this.root);
    return {
      origin: new T.Vector3(this.layout.x + this.layout.doorX, 0, .15),
      collision: this.collision,
      interactions: this.interactions,
    };
  }
}

function market(r: RoomBuilder) {
  r.shell('#e3d5ad', '#796348', '#b49b70', '#728c7d');
  // Broad civic room: left route table, right dispatch counter, open central aisle.
  for (const x of [-4.55, 4.55]) r.window(x, 1.93, -0.4, 1.5, 1.45, x < 0 ? Math.PI / 2 : -Math.PI / 2);
  for (const x of [-3.8, -1.25, 1.25, 3.8]) r.part(box(0.105, 2.9, 0.1, '#a58758', M.planks), x, 1.5, -2.49);
  r.item('FURN_table', -2.6, -1.55);
  r.item('FURN_shelf', -4.42, -1.38, Math.PI / 2);
  r.item('FURN_counter', 2.85, -1.84);
  r.item('FURN_bench', 3.15, 1.58, Math.PI);
  r.part(box(1.5, 0.012, 0.86, '#d6c7a3', M.cloth), -2.6, 0.802, -1.55);
  for (let i = 0; i < 3; i++)
    r.part(
      prep(new T.CylinderGeometry(0.045, 0.045, 0.45, 12).rotateZ(Math.PI / 2), '#e8dbb7', M.plain),
      -3.07 + i * 0.16,
      0.847,
      -1.45,
    );
  r.cup(3.63, 1.058, -1.8);
  for (let i = 0; i < 4; i++)
    r.part(
      box(0.28, 0.018, 0.2, ['#e7dbb6', '#b3c0a0'][i % 2], M.plain),
      2.15 + i * 0.17,
      1.07 + i * 0.019,
      -1.82,
    );
  // A physical inlaid route chart: original regional shapes, river, road, and pins.
  r.part(box(3.8, 1.5, 0.075, '#e7dbb9', M.plain), -2.1, 1.94, -2.47);
  const chart = [
    [-3.48, 1.43],
    [-3.13, 1.73],
    [-2.6, 1.99],
    [-2.0, 2.17],
    [-1.46, 2.34],
    [-0.65, 2.49],
  ];
  for (let i = 1; i < chart.length; i++)
    r.part(
      beam(
        new T.Vector3(chart[i - 1][0], chart[i - 1][1], -2.414),
        new T.Vector3(chart[i][0], chart[i][1], -2.414),
        0.015,
        '#ad8150',
        M.planks,
        6,
      ),
      0,
      0,
      0,
    );
  for (const [x, y] of chart) r.part(sphere(0.047, '#b66d42', M.metal, 10, 6), x, y, -2.405);
  const river = [
    [-2.8, 1.31],
    [-2.5, 1.64],
    [-2.14, 1.9],
    [-1.89, 2.22],
    [-1.36, 2.53],
  ];
  for (let i = 1; i < river.length; i++)
    r.part(
      beam(
        new T.Vector3(river[i - 1][0], river[i - 1][1], -2.418),
        new T.Vector3(river[i][0], river[i][1], -2.418),
        0.022,
        '#659b98',
        M.plain,
        6,
      ),
      0,
      0,
      0,
    );
  r.sign(['THE VALLEY WAYS'], -2.1, 2.82, -2.37, 3.15, 0.27);
  r.sign(
    ['Haven · Aldermere · Mosswood', 'Silverveil · Starroot · Crownreach'],
    -2.1,
    1.03,
    -2.37,
    3.8,
    0.37,
  );
  r.sign(
    ['NEIGHBORS & DELIVERIES', 'Oren · wheel repairs', 'Mira · cloth mending', 'Lio · common-room tea'],
    2.8,
    2.0,
    -2.39,
    2.6,
    1.05,
  );
  for (const x of [-1.1, 1.1]) r.lamp(x, 0.1, 2.55);
  r.inspect(
    'route-chart',
    'Study the valley route chart',
    -2.6,
    -0.53,
    'Iona has marked the safe valley route in ochre. Lantern Road leads south to Haven. North of Aldermere, pass through the Mosswood Gate and keep to the riverbank trail. At Silverveil, the walking path climbs the western switchbacks; the water itself is not a shortcut. Starroot lies beyond the falls. The high bridge leads toward Crownreach. Leave the bicycle at the lower lookout before the steep walking trail.',
  );
  r.inspect(
    'delivery-board',
    'Read the neighbors’ delivery board',
    2.83,
    -0.7,
    'The Wayfarers’ Hall keeps errands together. Oren accepts worn wheels at Thread & Timber in Makers’ Court; Mira mends cloth in the same studio. Empty orchard baskets belong by the exchange. Lio asks visitors to bring borrowed cups back to Reedbank common room. A note from Iona reads: “Ask before borrowing a cart. A delivery is a promise to someone at the other end.”',
  );
}

function workshop(r: RoomBuilder) {
  r.shell('#d9bc8c', '#785a3e', '#a78b63', '#ac7752');
  r.window(-2.39, 2.15, 0.42, 1.5, 1.7, Math.PI / 2);
  r.window(2.39, 2.25, -1.4, 1.6, 1.5, -Math.PI / 2);
  for (const z of [-2.9, -0.5, 2.85]) r.part(box(4.9, 0.18, 0.16, '#76573c', M.planks), 0, 3.5, z);
  r.item('FURN_counter', 0, -2.58);
  r.item('FURN_table', 1.5, 0.15, Math.PI / 2);
  r.item('FURN_shelf', -2.05, -0.9, Math.PI / 2);
  // Wheelwright's repair jig: a shaped rim, hub, spokes and held timber blank.
  const wheel = prep(new T.TorusGeometry(0.48, 0.045, 8, 32), '#a87d46', M.planks);
  r.part(wheel, -0.55, 1.56, -2.38);
  r.part(
    prep(new T.CylinderGeometry(0.1, 0.1, 0.16, 12).rotateX(Math.PI / 2), '#745238', M.planks),
    -0.55,
    1.56,
    -2.38,
  );
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    r.part(
      beam(
        new T.Vector3(-0.55, 1.56, -2.38),
        new T.Vector3(-0.55 + Math.cos(a) * 0.45, 1.56 + Math.sin(a) * 0.45, -2.38),
        0.019,
        '#c5a370',
        M.planks,
        6,
      ),
      0,
      0,
      0,
    );
  }
  r.part(box(0.5, 0.07, 0.34, '#776249', M.planks), -0.55, 1.08, -2.4);
  r.part(box(0.1, 0.53, 0.09, '#806145', M.planks), -0.55, 1.3, -2.47);
  r.part(box(0.8, 0.12, 0.17, '#c5a575', M.planks), 0.68, 1.11, -2.42, 0.12);
  r.part(box(0.29, 0.045, 0.08, '#56666a', M.metal), 0.7, 1.19, -2.4, 0.12);
  // Tool rack and cloth corner describe two different, shared occupations.
  r.part(box(1.6, 0.8, 0.07, '#9a7b50', M.planks), 0.92, 2.18, -2.94);
  for (let i = 0; i < 5; i++) {
    r.part(cyl(0.018, 0.018, 0.27, '#bb955f', M.planks, 6), 0.28 + i * 0.29, 2.18, -2.87);
    r.part(box(0.095, 0.045, 0.028, '#596761', M.metal), 0.28 + i * 0.29, 2.04, -2.84);
  }
  for (let i = 0; i < 3; i++) {
    const cloth = prep(
      new T.CylinderGeometry(0.065, 0.065, 0.58, 12).rotateZ(Math.PI / 2),
      ['#8eaca4', '#cdb176', '#b78d80'][i],
      M.cloth,
    );
    r.part(cloth, 1.49, 0.84 + i * 0.075, -0.08 + i * 0.13);
  }
  r.part(box(0.52, 0.012, 0.37, '#e1d1a7', M.cloth), 1.52, 0.8, 0.44);
  const hoop = prep(new T.TorusGeometry(0.14, 0.012, 6, 24).rotateX(Math.PI / 2), '#8a6744', M.planks);
  r.part(hoop, 1.52, 0.825, 0.44);
  r.part(cyl(0.022, 0.027, 0.09, '#b56e54', M.cloth, 10), 1.82, 0.835, 0.52);
  r.sign(['THREAD & TIMBER', 'Mira mends. Oren makes.'], 0, 3.03, -2.95, 2.8, 0.43);
  r.sign(['Measure · Fit · Mend'], 0.93, 2.83, -2.88, 1.75, 0.25);
  r.lamp(-0.38, 0.1, 2.95);
  r.inspect(
    'wheel-jig',
    'Inspect Oren’s wheel-repair jig',
    0,
    -1.46,
    'The rim is held square while Oren checks each spoke against a wooden gauge. One pale replacement spoke is still untrimmed. His three marks read: measure the hub, fit opposite spokes together, then test the wheel under weight. On the order slip: “For the orchard cart. Keep the old rim if it can be saved.”',
  );
  r.inspect(
    'mending',
    'Examine Mira’s mending pattern',
    0.62,
    0.35,
    'Mira’s hoop holds a small tear open beside three matching threads. The paper pattern shows small stitches crossing the damaged edge, then a second row sharing the strain. Her note says: “A repair should remember the cloth it joins.” A blue swatch is labeled for Lio’s canal-room curtain.',
  );
}

function canal(r: RoomBuilder) {
  r.shell('#d6d8b6', '#857056', '#baa582', '#8aa28c');
  r.window(0.63, 1.94, -2.68, 2.7, 1.38);
  r.window(-2.69, 1.96, -0.15, 1.4, 1.34, Math.PI / 2);
  r.part(cyl(0.025, 0.025, 3.26, '#8b7757', M.metal, 8).rotateZ(Math.PI / 2), 0.63, 2.73, -2.52);
  for (const x of [-0.86, 2.12])
    for (let fold = 0; fold < 4; fold++)
      r.part(
        box(0.06, 1.35, 0.035, fold % 2 ? '#9babaa' : '#b2c1b7', M.cloth),
        x + (fold - 1.5) * 0.052,
        1.99,
        -2.5 + (fold % 2) * 0.026,
      );
  r.item('FURN_table', -1.55, -1.72);
  r.item('FURN_shelf', -2.24, 0.05, Math.PI / 2);
  r.item('FURN_counter', 1.05, 2.07);
  r.item('FURN_wardrobe', 2.13, -0.5, Math.PI / 2);
  r.item('FURN_bench', 0.85, -1.67, 0, false);
  // Seat top is a camera surface; legs/back remain physical while the open front permits standing up.
  r.block(0.85, -1.88, 1.8, 0.07, 0.95, 0, 'common-room-bench-back');
  for (const x of [0.13, 1.57])
    for (const z of [-1.84, -1.5]) r.block(x, z, 0.075, 0.075, 0.48, 0, 'common-room-bench-leg');
  r.block(0.85, -1.67, 1.8, 0.48, 0.08, 0.42, 'common-room-bench-seat', true);
  r.part(box(2.4, 0.012, 1.5, '#b8b18c', M.cloth), 0.08, 0.007, 0.15);
  for (let i = 0; i < 6; i++)
    r.part(box(2.25, 0.003, 0.018, '#8a9e90', M.cloth), 0.08, 0.015, -0.45 + i * 0.24);
  r.part(box(0.64, 0.032, 0.42, '#e4d7b4', M.plain), -1.53, 0.806, -1.73, -0.09);
  r.part(box(0.36, 0.015, 0.23, '#b2beb0', M.plain), -1.22, 0.831, -1.57, 0.16);
  r.part(cyl(0.04, 0.04, 0.018, '#a36d55', M.plain, 12), -1.22, 0.85, -1.57);
  r.cup(-1.99, 0.794, -1.66);
  // Kettle, bread board and cups belong to the common-room ritual, not a shop counter.
  const kettle = prep(
    new T.LatheGeometry(
      [
        new T.Vector2(0.07, 0),
        new T.Vector2(0.17, 0.035),
        new T.Vector2(0.2, 0.16),
        new T.Vector2(0.13, 0.27),
        new T.Vector2(0.1, 0.29),
      ],
      20,
    ),
    '#9c957b',
    M.metal,
  );
  r.part(kettle, 0.55, 1.06, 2.05);
  const arch = prep(new T.TorusGeometry(0.15, 0.022, 8, 20, Math.PI), '#605d50', M.metal);
  r.part(arch, 0.55, 1.3, 2.05);
  r.part(
    beam(new T.Vector3(0.67, 1.19, 2.05), new T.Vector3(0.88, 1.27, 2.05), 0.033, '#aaa187', M.metal, 8),
    0,
    0,
    0,
  );
  for (const x of [1.1, 1.38, 1.67]) r.cup(x, 1.06, 2.02);
  r.part(box(0.42, 0.025, 0.3, '#a38655', M.planks), 2.02, 1.07, 2.03);
  r.part(xf(sphere(0.13, '#c8a268', M.plain, 16, 10), 0, 0, 0, 0, 0, 0, 1.2, 0.55, 0.8), 2.01, 1.15, 2.03);
  r.sign(['REEDBANK', 'The kettle is for everyone.'], 0.63, 2.82, -2.57, 2.2, 0.28);
  r.sign(['Letters from the valley'], -1.57, 1.38, -2.61, 1.75, 0.26);
  for (const x of [-1.95, -1.32]) {
    r.part(box(0.4, 0.53, 0.055, '#7b795c', M.planks), x, 1.93, -2.64);
    r.part(box(0.33, 0.46, 0.025, '#b7c7b7', M.plain), x, 1.93, -2.596);
    r.part(
      beam(
        new T.Vector3(x - 0.12, 1.78, -2.57),
        new T.Vector3(x + 0.12, 2.05, -2.57),
        0.012,
        '#748f7c',
        M.foliage,
        5,
      ),
      0,
      0,
      0,
    );
  }
  r.lamp(0.14, 0.22, 2.55);
  r.inspect(
    'correspondence',
    'Read Lio’s open correspondence',
    -1.55,
    -0.67,
    '“Lio — the upper river is quieter than I expected. I have marked the walking switchbacks west of Silverveil; please copy them onto the common-room map. From Starroot, the headwater bridge is the safe way to Crownreach. Tell Mira the repaired curtain caught the morning light beautifully. I will bring the sketchbook back when the ridge lets me go. — Mara” Beneath it, Lio has written: “There will be tea.”',
  );
  r.inspect(
    'kettle',
    'Read the common-room welcome',
    1.18,
    1.1,
    'Lio keeps three cups beside the kettle: one for a neighbor, one for a traveler, and one for whoever arrives next. A penciled note asks everyone to rinse their cup, close the curtain after dusk, and leave the window bench for anyone who needs a quiet minute.',
  );
  r.interactions.push({
    id: 'aldermere-canal-window-seat',
    label: 'Rest on the window bench',
    kind: 'sit',
    inside: r.layout.id,
    x: r.layout.x + 0.85,
    z: -0.73,
    radius: 1,
    seat: [r.layout.x + 0.85, -1.55, 0, 0],
  });
}

/** Add three self-contained room scenes without altering village rooms or their saved identities. */
export function addCityInteriors(assets: Assets, group: T.Group, rooms: Map<string, CityInteriorRoom>): void {
  for (const layout of CITY_INTERIOR_LAYOUT) {
    if (rooms.has(layout.id)) continue;
    const room = new RoomBuilder(assets, layout);
    if (layout.id === 'aldermere-market') market(room);
    else if (layout.id === 'aldermere-workshop') workshop(room);
    else canal(room);
    const entry = room.finish();
    group.add(room.root);
    rooms.set(layout.id, entry);
  }
}
