import * as T from 'three';
import { CITY_BUILDINGS, CITY_DISTRICTS, CITY_ARCADES, cityPoint, type CityBuilding } from '../data/city';
import { terrainHeight } from '../data/world';
import { Assets } from '../game/assets';
import { Village, type Interaction } from './village';
import { box, beam, xf, merge, sphere, prep, M, ID } from './geo';
import { uber, surfaceBits, specializeUber } from '../render/materials';
import { SceneryVisibility } from '../render/visibility';
import { batchStatic } from '../render/batching';
import { paintedSign } from './signage';
import { potRow, vegStand, laundryPole } from './street';

/** Original authored architecture, with doors, furniture and street life placed for a reason. */
export class City {
  readonly group = new T.Group();
  readonly doors = new Map<string, Interaction>();
  private visibility!: SceneryVisibility;
  constructor(
    readonly assets: Assets,
    readonly village: Village,
  ) {
    this.group.name = 'Aldermere and Starroot';
  }
  build() {
    for (const b of CITY_BUILDINGS) this.building(b);
    this.frontages();
    this.streets();
    batchStatic(this.group);
    specializeUber(this.group);
    this.visibility = new SceneryVisibility(this.group, new Set());
  }
  private mesh(g: T.BufferGeometry, id: number = ID.house, outline = 0.35) {
    const o = new T.Mesh(g, uber(id, outline, T.DoubleSide, surfaceBits(g)));
    o.layers.enable(1);
    o.layers.enable(2);
    this.group.add(o);
    return o;
  }
  private placed(g: T.BufferGeometry, x: number, z: number, yaw = 0) {
    const o = this.mesh(g);
    o.position.set(x, terrainHeight(x, z), z);
    o.rotation.y = yaw;
    return o;
  }
  private building(b: CityBuilding) {
    const y = terrainHeight(b.x, b.z, false),
      model = this.assets.building(b.asset);
    model.name = b.name;
    model.position.set(b.x, y, b.z);
    model.rotation.y = b.yaw;
    this.group.add(model);
    for (const proxy of this.assets.architectureData.assets[b.asset].collisions_blender) {
      const [x, z, h] = proxy.center,
        [w, d, height] = proxy.size;
      // Low slabs are walkable support, tall walls/pillars retain their actual vertical intervals.
      if (h + height / 2 <= 0.72 && height < 0.4) continue;
      const p = cityPoint(b, x, -z);
      this.village.collision.add({
        x: p.x,
        z: p.z,
        w,
        d,
        height,
        bottom: y + h - height / 2,
        yaw: b.yaw,
        tag: b.id,
      });
    }
    if (b.asset === 'BLD_gate') return;
    if (b.asset === 'BLD_starroot') {
      const p = cityPoint(b, 0, -0.2);
      this.village.interactions.push({
        id: 'starroot-bell',
        kind: 'inspect',
        label: 'Ring the travelers’ bell',
        x: p.x,
        z: p.z,
        radius: 2.5,
        data: 'A low note rolls down the valley. Beneath the bell, generations of travelers have carved a leaf for every safe return.',
      });
      const q = cityPoint(b, -4.8, 2);
      this.village.interactions.push({
        id: 'starroot-history',
        kind: 'inspect',
        label: 'Trace the old route',
        x: q.x,
        z: q.z,
        radius: 2,
        data: 'The stone map shows a route from this sanctuary to a crown of mountains. Small wing marks circle the warm shelves above Silverveil. The guardians were travelers, too.',
      });
      return;
    }
    const offset = b.asset === 'BLD_canal_home' ? -1.74 : b.asset === 'BLD_workshop' ? -0.525 : 0;
    const front = b.asset === 'BLD_market' ? 2.48 : b.asset === 'BLD_workshop' ? 3.17 : 3.04;
    const doorPoint = cityPoint(b, offset, front),
      approach = cityPoint(b, offset, b.asset === 'BLD_market' ? 5.25 : 4.6);
    // Explicit closed portal prevents empty visual shells masquerading as usable rooms.
    const leaf = merge([
      box(b.asset === 'BLD_canal_home' ? 1.2 : 1.85, 2.35, 0.12, '#4f665f', M.planks),
      xf(box(0.52, 0.75, 0.04, '#dbcba2', M.shoji), 0, 0.28, 0.07),
      xf(sphere(0.045, '#bca475', M.metal, 8, 6), 0.37, -0.08, 0.12),
    ]);
    const door = this.mesh(leaf);
    door.position.set(doorPoint.x, y + 1.46, doorPoint.z);
    door.rotation.y = b.yaw;
    this.village.collision.add({
      x: doorPoint.x,
      z: doorPoint.z,
      w: b.asset === 'BLD_canal_home' ? 1.22 : 1.86,
      d: 0.15,
      height: 2.5,
      bottom: y + 0.25,
      yaw: b.yaw,
      tag: b.id + '-door',
    });
    const interaction: Interaction = {
      id: 'city-' + b.id,
      kind: b.interior ? 'door' : 'inspect',
      label: b.interior ? `Enter ${b.name}` : `Read the note at ${b.name}`,
      x: approach.x,
      z: approach.z,
      radius: 2,
      data: b.interior ?? b.story,
    };
    this.village.interactions.push(interaction);
    if (b.interior) this.doors.set(b.interior, interaction);
    const sign = paintedSign([b.name], 2.35, 0.48);
    const signPoint = cityPoint(b, 0, front + 0.13);
    sign.position.set(signPoint.x, y + 3.05, signPoint.z);
    sign.rotation.y = b.yaw;
    this.group.add(sign);
    const pots = cityPoint(b, b.asset === 'BLD_market' ? 3.6 : 1.8, 4.1);
    this.placed(potRow(b.id.length * 17, 2), pots.x, pots.z, b.yaw);
    if (b.district === 'craft' && b.id !== 'craft-home-c') {
      const p = cityPoint(b, 4.8, 1.4);
      this.placed(
        merge([
          xf(box(0.8, 0.7, 0.75, '#998160', M.planks), 0, 0.35, 0),
          xf(box(0.65, 0.45, 0.62, '#b09a72', M.planks), 0.05, 0.94, 0),
        ]),
        p.x,
        p.z,
        b.yaw,
      );
      this.village.collision.add({
        x: p.x,
        z: p.z,
        w: 1,
        d: 0.9,
        height: 1.2,
        bottom: terrainHeight(p.x, p.z),
        yaw: b.yaw,
        tag: 'craft-crates',
      });
    }
  }
  private streets() {
    const stalls: [[number, number, number], ...[number, number, number][]] = [
      [12.6, -278.5, Math.PI / 2],
      [28.1, -291, -Math.PI / 2],
      [34, -325, -Math.PI / 2],
    ];
    for (const [x, z, yaw] of stalls) {
      this.placed(vegStand(330 + x), x, z, yaw);
      this.village.collision.add({
        x,
        z,
        w: 2.3,
        d: 1.2,
        height: 2,
        bottom: terrainHeight(x, z),
        yaw,
        tag: 'market-stall',
      });
    }
    for (const [x, z, yaw] of [
      [-21, -318.3, 0],
      [23, -333, Math.PI / 2],
      [107, -349.1, 0],
      [28, -275.5, Math.PI],
    ]) {
      const bench = this.assets.get('FURN_bench');
      bench.position.set(x, terrainHeight(x, z), z);
      bench.rotation.y = yaw;
      this.group.add(bench);
      this.village.collision.add({
        x,
        z,
        w: 1.9,
        d: 0.65,
        height: 0.85,
        bottom: terrainHeight(x, z),
        yaw,
        tag: 'city-bench',
      });
      this.village.interactions.push({
        id: `city-seat-${x}`,
        label: 'Sit and watch the neighborhood',
        kind: 'sit',
        x,
        z: z + 0.6,
        radius: 1.5,
        seat: [x, z, yaw],
      });
    }
    for (const [x, z, yaw] of [
      [-14, -345, 0],
      [112, -365, Math.PI / 2],
      [81, -345, 0],
    ])
      this.placed(laundryPole(550 + x), x, z, yaw);
    for (const [x, z] of [
      [14, -258],
      [26, -308],
      [32, -332],
      [-5, -312],
      [-35, -317],
      [-7, -335],
      [88, -334],
      [116, -355],
      [65, -334],
    ]) {
      const y = terrainHeight(x, z);
      this.mesh(
        merge([
          xf(box(0.18, 3.3, 0.18, '#635341', M.planks), x, y + 1.65, z),
          beam(
            new T.Vector3(x, y + 3.18, z),
            new T.Vector3(x + 0.65, y + 3.18, z),
            0.085,
            '#736246',
            M.planks,
          ),
          xf(box(0.36, 0.47, 0.34, '#e9cc80', M.glow), x + 0.58, y + 2.92, z),
          xf(box(0.5, 0.12, 0.48, '#42605e', M.roof), x + 0.58, y + 3.22, z),
        ]),
        ID.pole,
        0.2,
      );
      this.village.collision.add({ x, z, r: 0.15, height: 3.4, bottom: y, tag: 'city-lantern' });
    }
    for (const d of CITY_DISTRICTS) {
      const [x, z] =
          d.id === 'lantern-market' ? [13, -256] : d.id === 'makers-court' ? [-5, -309] : [89, -330],
        y = terrainHeight(x, z);
      this.mesh(
        merge([
          xf(box(0.14, 1.8, 0.14, '#655440', M.planks), x, y + 0.9, z),
          xf(box(2, 0.58, 0.13, '#57665b', M.planks), x, y + 1.65, z),
        ]),
        ID.sign,
        0.3,
      );
      const label = paintedSign([d.name], 1.85, 0.45);
      label.position.set(x, y + 1.65, z + 0.08);
      this.group.add(label);
    }
    // A public water basin at the market edge leaves the through route open.
    const x = 9.5,
      z = -332,
      y = terrainHeight(x, z);
    this.mesh(
      merge([
        xf(box(2.6, 0.36, 1.75, '#829285', M.stone), x, y + 0.18, z),
        xf(box(2.18, 0.05, 1.3, '#699595', M.glass), x, y + 0.38, z),
        xf(box(0.28, 1.2, 0.28, '#6b8074', M.stone), x, y + 0.85, z - 0.5),
      ]),
    );
    this.village.collision.add({ x, z, w: 2.6, d: 1.75, height: 1.5, bottom: y, tag: 'market-basin' });
    this.village.interactions.push({
      id: 'market-water',
      x: x - 2,
      z,
      radius: 1.5,
      kind: 'inspect',
      label: 'Read the fountain plaque',
      data: '“Carried from Silverveil, shared by all.” The tiny leaf below the lettering matches the carvings at the sanctuary.',
    });
    const quaySign = paintedSign(['REED QUAY', 'River ferry →'], 1.6, 0.7);
    quaySign.position.set(103, terrainHeight(103, -323.5) + 1.8, -323.5);
    this.group.add(quaySign);
    this.placed(
      merge([
        xf(box(0.12, 1.9, 0.12, '#66563f', M.planks), 0, 0.95, 0),
        xf(box(1.75, 0.82, 0.09, '#4f716c', M.planks), 0, 1.8, -0.025),
      ]),
      103,
      -323.5,
    );
  }
  private frontages() {
    // Continuous arcades convert detached facades into deliberately bounded street edges.
    for (const a of CITY_ARCADES) {
      const y = terrainHeight(a.x, a.z),
        parts: T.BufferGeometry[] = [];
      for (let i = 0; i < a.bays; i++) {
        const x = -a.width / 2 + ((i + 0.5) * a.width) / a.bays;
        parts.push(xf(box(a.width / a.bays - 0.035, 0.12, a.depth, a.color, M.cloth), x, a.height, 0, -0.07));
        parts.push(
          xf(
            box(0.15, 0.17, a.depth + 0.2, '#675540', M.planks),
            -a.width / 2 + (i * a.width) / a.bays,
            a.height - 0.12,
            0,
          ),
        );
        // Cream valances and open brackets make the trade shade distinct from a solid annex.
        parts.push(
          xf(
            box(a.width / a.bays - 0.09, 0.24, 0.06, i % 2 ? '#d6c8a2' : a.color, M.cloth),
            x,
            a.height - 0.2,
            a.depth / 2,
          ),
        );
      }
      parts.push(xf(box(a.width + 0.18, 0.16, 0.16, '#675540', M.planks), 0, a.height - 0.13, a.depth / 2));
      for (let i = 0; i <= a.bays; i++) {
        const xx = -a.width / 2 + (i * a.width) / a.bays,
          zz = a.depth / 2 - 0.08,
          p = cityPoint(a, xx, zz),
          bottom = terrainHeight(p.x, p.z),
          height = y + a.height - 0.12 - bottom;
        parts.push(xf(box(0.14, height, 0.14, '#665540', M.planks), xx, bottom - y + height / 2, zz));
        parts.push(
          beam(
            new T.Vector3(xx, a.height - 0.8, zz),
            new T.Vector3(xx + (i === a.bays ? -0.48 : 0.48), a.height - 0.15, zz),
            0.085,
            '#806746',
            M.planks,
          ),
        );
        this.village.collision.add({ x: p.x, z: p.z, r: 0.115, height, bottom, tag: a.id + '-post' });
      }
      const mesh = this.mesh(merge(parts));
      mesh.position.set(a.x, y, a.z);
      mesh.rotation.y = a.yaw;
      mesh.name = a.id;
      this.village.collision.add({
        x: a.x,
        z: a.z,
        w: a.width,
        d: a.depth,
        bottom: y + a.height - 0.18,
        height: 0.3,
        yaw: a.yaw,
        tag: a.id + '-roof',
      });
    }
    // The civic roof lantern ends the approach view while the playable street bends around its east side.
    const hall = CITY_BUILDINGS.find((b) => b.id === 'guildhall')!,
      parts: T.BufferGeometry[] = [],
      timber = '#675643';
    parts.push(xf(box(2.5, 0.28, 2.5, '#887557', M.planks), 0, 8.55, 0));
    for (const x of [-0.82, 0.82])
      for (const z of [-0.82, 0.82]) parts.push(xf(box(0.16, 1.8, 0.16, timber, M.planks), x, 9.5, z));
    for (const z of [-0.87, 0.87]) parts.push(xf(box(1.9, 0.16, 0.14, timber, M.planks), 0, 10.27, z));
    for (const x of [-0.87, 0.87]) parts.push(xf(box(0.14, 0.16, 1.9, timber, M.planks), x, 10.27, 0));
    const bell = prep(
      new T.LatheGeometry(
        [
          new T.Vector2(0.38, 0),
          new T.Vector2(0.4, 0.08),
          new T.Vector2(0.26, 0.18),
          new T.Vector2(0.17, 0.5),
          new T.Vector2(0.05, 0.58),
        ],
        16,
      ),
      '#b89953',
      M.metal,
    );
    parts.push(xf(bell, 0, 9.05, 0), xf(box(0.055, 0.7, 0.055, timber, M.planks), 0, 9.8, 0));
    parts.push(xf(prep(new T.ConeGeometry(1.92, 1.15, 4), '#536d67', M.roof), 0, 10.92, 0, 0, Math.PI / 4));
    parts.push(
      xf(prep(new T.ConeGeometry(0.72, 0.55, 4), '#657f76', M.roof), 0, 11.58, 0, 0, Math.PI / 4),
      xf(sphere(0.12, '#c0a263', M.metal, 10, 7), 0, 11.91, 0),
    );
    const lantern = this.mesh(merge(parts));
    lantern.position.set(hall.x, terrainHeight(hall.x, hall.z, false), hall.z);
    lantern.name = 'Wayfarers civic roof lantern';
    this.village.collision.add({
      x: hall.x,
      z: hall.z,
      w: 2.5,
      d: 2.5,
      bottom: lantern.position.y + 8.4,
      height: 3.7,
      tag: 'guildhall-roof-lantern',
    });

    // A high market garland frames the street without narrowing the road or hiding the civic endpoint.
    const line: T.BufferGeometry[] = [];
    for (const x of [12.2, 28.4]) {
      const y = terrainHeight(x, -279);
      line.push(xf(box(0.15, 5.3, 0.15, timber, M.planks), x, y + 2.65, -279));
      this.village.collision.add({ x, z: -279, r: 0.12, bottom: y, height: 5.3, tag: 'market-garland-post' });
    }
    const base = terrainHeight(20, -279);
    for (let i = 0; i < 8; i++) {
      const x0 = 12.2 + i * 2.025,
        x1 = x0 + 2.025,
        curve = (x: number) => base + 5.3 - 0.6 * Math.sin(((x - 12.2) / 16.2) * Math.PI);
      line.push(
        beam(
          new T.Vector3(x0, curve(x0), -279),
          new T.Vector3(x1, curve(x1), -279),
          0.025,
          '#74694e',
          M.planks,
          5,
        ),
      );
    }
    for (const x of [15, 20, 25]) {
      const yy = base + 5.2 - 0.6 * Math.sin(((x - 12.2) / 16.2) * Math.PI);
      line.push(
        xf(box(0.24, 0.4, 0.24, '#e4c787', M.glow), x, yy - 0.28, -279),
        xf(box(0.35, 0.065, 0.35, '#536d67', M.roof), x, yy - 0.06, -279),
      );
    }
    this.mesh(merge(line), ID.pole, 0.2).name = 'Market hanging lights';

    // Enclosed gardens, not blank gaps: boundaries frame the route to Reedbank while keeping entrances open.
    for (const [ax, az, bx, bz] of [
      [49, -338, 66, -338],
      [86, -339, 90, -339],
      [65, -348, 86, -348],
      [-32, -337, -23, -337],
      [-8, -340, -8, -348],
    ]) {
      const dx = bx - ax,
        dz = bz - az,
        len = Math.hypot(dx, dz),
        yaw = Math.atan2(dx, dz),
        n = Math.ceil(len / 2.5),
        walls: T.BufferGeometry[] = [];
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n,
          x = ax + dx * t,
          z = az + dz * t,
          y = terrainHeight(x, z);
        walls.push(
          xf(box(0.26, 0.65, len / n - 0.025, '#c3bea4', M.plaster), x, y + 0.325, z, 0, yaw),
          xf(box(0.34, 0.09, len / n + 0.02, '#879080', M.stone), x, y + 0.68, z, 0, yaw),
        );
        this.village.collision.add({
          x,
          z,
          w: 0.28,
          d: len / n,
          height: 0.76,
          bottom: y,
          yaw,
          tag: 'city-garden-wall',
        });
      }
      this.mesh(merge(walls)).name = 'Neighborhood garden boundary';
    }
  }
  update(position: T.Vector3, distance: number) {
    this.visibility.update(position, distance);
  }
}
