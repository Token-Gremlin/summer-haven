import * as T from 'three';
import { Assets } from '../game/assets';
import { Collision } from './collision';
import { BUILDINGS, PATHS, PADDIES, terrainHeight, riverX, type Building } from '../data/world';
import { REGION_ROUTE } from '../data/regions';
import { villageRiverGeometry } from './village-water';
import { prepareWaterSurface } from './water-surface';
import { villageGroundGeometry } from './village-ground';
import { colorShore } from './shore-color';
import { box, beam, prep, xf, merge, wire, ID, M } from './geo';
import { uber, waterMaterial, roadMaterial, specializeUber } from '../render/materials';
import { tree, house, pole, fence, postBox, bambooGrove, scarecrow } from './props';
import {
  shortGrass,
  hydrangea,
  grassClump,
  flower,
  floretCluster,
  leafPlant,
  riceTuft,
  boulder,
  butterfly,
} from './vegetation';
import {
  potRow,
  stoneLantern,
  shrine,
  jizo,
  vendingMachine,
  busStop,
  convexMirror,
  laundryPole,
  parkedBike,
  vegStand,
  drainCanal,
  bridgePlate,
} from './street';
import { mulberry32 } from '../core/rng';
import { paintedSign } from './signage';
import { poleLamp } from './lights';
import { neighborhoods } from './neighborhoods';
import { batchStatic } from '../render/batching';
import { SceneryVisibility, sceneryRanges } from '../render/visibility';
import { PathSurfaces } from './path-surface';
import { canopyHullObstacle } from './tree-canopy';
import { Woodland } from './woodland';
import { woodlandTemplate, type WoodlandKind } from './woodland-catalog';
import type { Settings } from '../core/save';
export interface Interaction {
  id: string;
  label: string;
  x: number;
  z: number;
  y?: number;
  radius: number;
  kind: 'door' | 'wardrobe' | 'sit' | 'inspect' | 'cat' | 'view' | 'exit' | 'ferry';
  data?: string;
  inside?: string;
  seat?: [x: number, z: number, yaw: number, heightOffset?: number];
}
export class Village {
  group = new T.Group();
  collision = new Collision();
  interactions: Interaction[] = [];
  water = new T.Group();
  vegetation: T.InstancedMesh[] = [];
  readonly woodland = new Woodland('Haven botanical groves');
  cat!: T.Object3D;
  inside: string | null = null;
  treeTick = 0;
  catAlarm = 0;
  private clearPaths: { points: [number, number][]; halfWidth: number }[] = [];
  private surfaces = new PathSurfaces();
  private paths = new Set<T.Object3D>();
  private visibility!: SceneryVisibility;
  private lastQuality = '';
  constructor(
    readonly assets: Assets,
    public slice = true,
  ) {
    this.group.name = 'Summer Haven';
  }
  mesh(g: T.BufferGeometry, id: number = ID.house, mask = 0.55) {
    const m = new T.Mesh(g, uber(id, mask, T.DoubleSide));
    m.layers.enable(1);
    m.layers.enable(2);
    this.group.add(m);
    return m;
  }
  prop(g: T.BufferGeometry, x: number, z: number, yaw = 0, id: number = ID.house, mask = 0.55) {
    const m = this.mesh(g, id, mask);
    m.position.set(x, terrainHeight(x, z), z);
    m.rotation.y = yaw;
    return m;
  }
  asset(name: string, x: number, z: number, yaw = 0) {
    const o = this.assets.get(name);
    o.position.set(x, terrainHeight(x, z), z);
    o.rotation.y = yaw;
    this.group.add(o);
    return o;
  }
  async build(progress: (s: string, n: number) => void) {
    progress('Laying the little streets…', 0.47);
    this.ground();
    const paths = PATHS.slice(0, this.slice ? 3 : PATHS.length);
    paths.sort((a, b) => Number(b.kind === 'road') - Number(a.kind === 'road'));
    for (const p of paths) this.path(p.points, p.width, p.kind);
    for (const b of BUILDINGS.slice(0, this.slice ? 2 : BUILDINGS.length)) this.building(b);
    this.details();
    if (!this.slice) neighborhoods(this);
    await new Promise((r) => setTimeout(r, 0));
    progress('Letting the gardens grow…', 0.59);
    this.plants();
    if (!this.slice) this.countryside();
    batchStatic(this.group, new Set([this.cat, ...this.paths]));
    specializeUber(this.group);
    this.visibility = new SceneryVisibility(this.group, new Set([this.water, this.cat, ...this.paths]));
    progress('Opening the windows…', 0.7);
  }
  ground() {
    // The original north skirt now belongs to the connected regional heightfield.
    const g = villageGroundGeometry(!this.slice),
      p = g.attributes.position;
    prep(g, '#63874a', M.ground);
    const colors=g.attributes.color,base=new T.Color('#63874a'),c=new T.Color();
    for(let i=0;i<p.count;i++) {
      colorShore(c.copy(base),p.getX(i),p.getY(i),p.getZ(i));
      colors.setXYZ(i,c.r,c.g,c.b);
    }
    this.mesh(g, ID.ground, 0);
    this.collision.water = (x, z) => {
      if (Math.abs(x - riverX(z)) < 5.7 && !(z > -28.8 && z < -23.2 && x > 36 && x < 57)) return true;
      return PADDIES.some(
        ([cx, cz, w, d]) => Math.abs(x - cx) < w / 2 + 0.15 && Math.abs(z - cz) < d / 2 + 0.15,
      );
    };
  }
  path(points: [number, number][], width: number, kind: string) {
    const curve = new T.CatmullRomCurve3(
      points.map(([x, z]) => new T.Vector3(x, 0, z)),
      false,
      'centripetal',
    );
    const length = curve.getLength();
    if (length < 0.05) return;
    this.clearPaths.push({
      points: curve.getSpacedPoints(Math.ceil(length / 2)).map((p) => [p.x, p.z]),
      halfWidth: width / 2 + 0.35,
    });
    const n = Math.max(1, Math.ceil(length * 1.5)),
      pos: number[] = [],
      uv: number[] = [],
      idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n,
        p = curve.getPoint(t),
        d = curve.getTangent(t);
      const side = new T.Vector3(-d.z, 0, d.x);
      for (const s of [-1, 1]) {
        const x = p.x + side.x * width * 0.5 * s,
          z = p.z + side.z * width * 0.5 * s;
        pos.push(x, terrainHeight(x, z) + 0.035, z);
        uv.push((s * width) / 2, t * length);
      }
      if (i < n) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    let g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    g = this.surfaces.add(g);
    const m =
      kind === 'road'
        ? new T.Mesh(g, roadMaterial())
        : new T.Mesh(
            prep(g, kind === 'stone' ? '#aaa58c' : '#b6a782', kind === 'stone' ? M.stone : M.ground),
            uber(ID.ground, 0, T.DoubleSide),
          );
    m.layers.enable(2);
    m.name = 'Continuous ' + kind + ' surface';
    this.paths.add(m);
    this.group.add(m);
  }
  building(b: Building) {
    if (b.asset) this.asset(b.asset, b.x, b.z, b.yaw);
    else
      this.prop(
        house({
          w: b.w,
          d: b.d,
          floors: b.floors || 1,
          seed: b.seed,
          finish: b.finish,
          shop: b.id === 'ren',
          ac: b.seed % 2 === 0,
          balcony: b.floors === 2,
        }),
        b.x,
        b.z,
        b.yaw,
      );
    this.collision.add({
      x: b.x,
      z: b.z,
      w: b.w,
      d: b.d,
      yaw: b.yaw,
      height: Math.max(b.h, b.floors === 2 ? 7.4 : 4.9),
      bottom: terrainHeight(b.x, b.z),
      tag: b.id,
    });
    const forward = new T.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw)),
      right = new T.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
    const door = new T.Vector3(b.x, 0, b.z)
      .addScaledVector(forward, b.d / 2 + 1.15)
      .addScaledVector(right, b.id === 'home' ? 0 : b.asset ? b.w * 0.22 : 0);
    if (b.interior)
      this.interactions.push({
        id: b.id,
        label: `Enter ${b.name}`,
        x: door.x,
        z: door.z,
        radius: 1.7,
        kind: 'door',
        data: b.interior,
      });
    else
      this.interactions.push({
        id: b.id,
        label: b.name,
        x: door.x,
        z: door.z,
        radius: 1.25,
        kind: 'inspect',
        data: b.story || 'The shutters are open to the breeze. Someone has left a pair of shoes by the door.',
      });
    let endpoint = new T.Vector3(),
      best = Infinity;
    for (const path of PATHS)
      for (let j = 1; j < path.points.length; j++) {
        const [ax, az] = path.points[j - 1],
          [bx, bz] = path.points[j],
          dx = bx - ax,
          dz = bz - az,
          t = T.MathUtils.clamp(((door.x - ax) * dx + (door.z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1),
          p = new T.Vector3(ax + t * dx, 0, az + t * dz),
          d = p.distanceTo(door);
        if (d < best) {
          best = d;
          endpoint = p;
        }
      }
    this.path(
      [
        [door.x, door.z],
        [endpoint.x, endpoint.z],
      ],
      1.7,
      'dirt',
    );
    const plant = new T.Vector3(b.x, 0, b.z)
      .addScaledVector(forward, b.d / 2 + 0.9)
      .addScaledVector(right, -b.w * 0.28);
    this.prop(potRow(b.seed, 3), plant.x, plant.z, b.yaw);
    const side = new T.Vector3(b.x, 0, b.z)
      .addScaledVector(forward, b.d / 2 + 1)
      .addScaledVector(right, b.w * 0.38);
    this.prop(box(0.65, 0.45, 0.65, '#8f7955', M.planks), side.x, side.z, b.yaw);
    this.prop(potRow(b.seed + 21, 2), side.x, side.z, b.yaw).position.y += 0.46;
    if (!b.asset && b.seed % 2 === 0) this.prop(laundryPole(b.seed), b.x + b.w * 0.65, b.z, 0.3);
    if (b.interior) {
      const text = paintedSign(
        [b.id === 'home' ? 'Welcome home' : b.name],
        b.id === 'cafe' ? 2.1 : 1.8,
        0.42,
      );
      text.position.set(door.x - forward.x * 0.8, 2.4, door.z - forward.z * 0.8);
      text.rotation.y = b.yaw;
      this.group.add(text);
    }
    if (b.id === 'home') {
      this.prop(postBox(), b.x - 4, b.z + 4, 0.1, ID.sign);
      this.collision.add({ x: b.x - 4, z: b.z + 4, r: 0.25, height: 1.4 });
      this.prop(laundryPole(19), b.x + 4, b.z - 1, Math.PI / 2);
    }
  }
  details() {
    this.prop(vendingMachine('vendDrink'), -6, -10, Math.PI / 2, ID.sign);
    this.collision.add({ x: -6, z: -10, w: 0.9, d: 0.85, height: 2 });
    this.prop(busStop(), -4, 37, 0.1);
    this.prop(convexMirror(), 3, -17, -0.7).scale.setScalar(0.72);
    const poleTips: T.Vector3[][] = [];
    for (const z of [31, 8, -15, -39, -63]) {
      const p = pole(7.7, z === -15),
        m = this.prop(p.geo, 3.7, z, 0, ID.pole);
      this.prop(poleLamp(), 3.7, z, 0, ID.pole);
      this.collision.add({ x: 3.7, z, r: 0.16, height: 7.7 });
      poleTips.push(p.tips.map((v) => v.clone().add(m.position)));
    }
    for (let i = 1; i < poleTips.length; i++)
      for (let j = 0; j < 3; j++)
        this.mesh(merge(wire(poleTips[i - 1][j], poleTips[i][j], 0.8, 0.009, '#383b38', 18)), ID.wire, 0.25);
    this.asset('FURN_bench', -5, 9, Math.PI / 2);
    this.interactions.push({
      id: 'village-bench',
      label: 'Sit for a moment',
      x: -5,
      z: 9,
      radius: 1.6,
      kind: 'sit',
    });
    this.cat = this.asset('PROP_cat', -7, -9, 1.9);
    this.interactions.push({
      id: 'cat',
      label: 'Say hello to Mikan',
      x: -7,
      z: -9,
      radius: 1.4,
      kind: 'cat',
    });
    this.prop(box(1.2, 0.45, 0.8, '#7d6146', M.planks), -7, -9);
    this.cat.position.y = 0.45;
    this.prop(parkedBike('#6d8697'), 15, 32, 1.0);
    this.prop(vegStand(20), 7, -25, -Math.PI / 2);
    for (const [x, z, lines] of [
      [-22, 19, ['← Mirror fields', 'Windbell hill ↖']],
      [32, -23, ['Cedar shrine →', 'Aonami bridge →']],
      [2, -33, ['↑ Ren’s workshop', '← The hill path']],
    ] as [number, number, string[]][]) {
      this.prop(box(0.09, 1.7, 0.09, '#776444', M.planks), x, z).position.y += 0.85;
      const sign = paintedSign(lines, 1.7, 0.64);
      sign.position.set(x, terrainHeight(x, z) + 1.43, z + 0.065);
      this.group.add(sign);
    }
    this.prop(drainCanal(25), -35, 36, 0, ID.ground, 0.1);
    this.prop(bridgePlate(), -35, 18, 0, ID.ground, 0.25);
  }
  instances(g: T.BufferGeometry, transforms: T.Matrix4[], id: number, mask = -1) {
    const m = new T.InstancedMesh(g, uber(id, mask, T.DoubleSide), transforms.length);
    transforms.forEach((matrix, i) => m.setMatrixAt(i, matrix));
    m.instanceMatrix.needsUpdate = true;
    m.layers.enable(2);
    m.frustumCulled = false;
    this.group.add(m);
    return m;
  }
  vegetationInstances(g: T.BufferGeometry, transforms: T.Matrix4[], id: number, minimumDensity = 0) {
    const chunks = new Map<string, T.Matrix4[]>();
    for (const matrix of transforms) {
      const e = matrix.elements,
        key = `${Math.floor(e[12] / 18)},${Math.floor(e[14] / 18)}`;
      if (!chunks.has(key)) chunks.set(key, []);
      chunks.get(key)!.push(matrix);
    }
    for (const matrices of chunks.values()) {
      const m = this.instances(g, matrices, id);
      m.name = id === ID.rice ? 'Rice patch' : 'Garden patch';
      m.layers.disable(2);
      m.frustumCulled = true;
      m.computeBoundingSphere();
      m.userData.max = matrices.length;
      m.userData.minimumDensity = minimumDensity;
      this.vegetation.push(m);
    }
  }
  plants() {
    const rng = mulberry32(804),
      mat = (x: number, z: number, s = 1) =>
        new T.Matrix4().compose(
          new T.Vector3(x, terrainHeight(x, z), z),
          new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rng() * Math.PI * 2),
          new T.Vector3(s, s, s),
        );
    const grasses: T.Matrix4[] = [],
      flowers: T.Matrix4[] = [],
      leaves: T.Matrix4[] = [],
      butterflies: T.Matrix4[] = [];
    const onPath = (x: number, z: number) =>
      this.clearPaths.some((p) =>
        p.points.some((a, j) => j > 0 && distanceSegment(x, z, p.points[j - 1], a) < p.halfWidth),
      );
    for (let i = 0; i < (this.slice ? 2200 : 24500); i++) {
      const x = (rng() - 0.5) * (this.slice ? 56 : 248),
        z = (rng() - 0.5) * (this.slice ? 90 : 246) - 10;
      const clear = onPath(x, z);
      if (clear || onBridge(x, z) || this.collision.blocked(x, z, 0.6, terrainHeight(x, z))) continue;
      grasses.push(mat(x, z, 0.75 + rng() * 0.8));
      if (i % 8 === 0) flowers.push(mat(x, z, 0.65 + rng() * 0.5));
      if (i % 38 === 0) leaves.push(mat(x, z, 0.65 + rng() * 0.4));
      if (i % 170 === 0) butterflies.push(mat(x, z, 0.55));
    }
    // Dense low verges and deliberate garden patches, with open short lawns between.
    for (const path of PATHS.slice(0, this.slice ? 3 : PATHS.length)) {
      const curve = new T.CatmullRomCurve3(
          path.points.map(([x, z]) => new T.Vector3(x, 0, z)),
          false,
          'centripetal',
        ),
        n = Math.ceil(curve.getLength() * 8);
      for (let i = 0; i < n; i++) {
        const p = curve.getPoint(i / n),
          d = curve.getTangent(i / n);
        for (const s of [-1, 1]) {
          const offset = path.width * 0.5 + 0.45 + rng() * 1.8,
            x = p.x - d.z * s * offset,
            z = p.z + d.x * s * offset;
          if (onPath(x, z) || onBridge(x, z) || this.collision.blocked(x, z, 0.2, terrainHeight(x, z)))
            continue;
          grasses.push(mat(x, z, 0.65 + rng() * 0.5));
          if (i % 13 === 0) flowers.push(mat(x, z, 0.75));
        }
      }
    }
    for (const b of BUILDINGS.slice(0, this.slice ? 2 : BUILDINGS.length))
      for (let j = 0; j < 78; j++) {
        const a = rng() * Math.PI * 2,
          r = 1 + rng() * 1.4,
          x = b.x + Math.sin(a) * r + b.w * 0.6,
          z = b.z + Math.cos(a) * r;
        if (!onPath(x, z) && !this.collision.blocked(x, z, 0.2, terrainHeight(x, z))) {
          grasses.push(mat(x, z, 1));
          if (j % 2 === 0) flowers.push(mat(x, z, 0.75 + rng() * 0.35));
        }
      }
    const shrubs: T.Matrix4[] = [];
    for (const b of BUILDINGS.slice(0, this.slice ? 2 : BUILDINGS.length)) {
      for (let k = 0; k < 6; k++) {
        const angle = (k / 6) * Math.PI * 2,
          x = b.x + Math.sin(angle) * (b.w / 2 + 2.5),
          z = b.z + Math.cos(angle) * (b.d / 2 + 2.5);
        if (!onPath(x, z) && !this.collision.blocked(x, z, 0.8, terrainHeight(x, z)))
          shrubs.push(mat(x, z, 0.38 + rng() * 0.24));
      }
    }
    for (let i = 0; i < 280; i++) {
      const z = -113 + rng() * 232,
        x = riverX(z) + (i % 2 ? 1 : -1) * (7.7 + rng() * 3);
      if (!onPath(x, z) && !this.collision.blocked(x, z, 0.7, terrainHeight(x, z)))
        shrubs.push(mat(x, z, 0.35 + rng() * 0.36));
    }
    this.vegetationInstances(tree('bush', 82, 1), shrubs, ID.grass, 0.5);
    const hydrangeas: T.Matrix4[] = [];
    for (const b of BUILDINGS.slice(0, this.slice ? 2 : BUILDINGS.length))
      for (let j = 0; j < 3; j++) {
        const side = -b.w * 0.46 - j * 0.57,
          front = b.d / 2 + 2.05;
        const x = b.x + Math.cos(b.yaw) * side + Math.sin(b.yaw) * front,
          z = b.z - Math.sin(b.yaw) * side + Math.cos(b.yaw) * front;
        if (!onPath(x, z) && !this.collision.blocked(x, z, 0.42, terrainHeight(x, z)))
          hydrangeas.push(mat(x, z, 0.66 + rng() * 0.2));
      }
    this.vegetationInstances(hydrangea(41), hydrangeas, ID.flower, 0.5);
    shuffle(grasses, rng);
    shuffle(flowers, rng);
    this.vegetationInstances(shortGrass(22), grasses, ID.grass);
    this.vegetationInstances(floretCluster(11, 10, 0.42, 0.035), flowers, ID.flower);
    this.vegetationInstances(leafPlant(71, 'lance'), leaves, ID.grass);
    this.instances(butterfly(), butterflies, ID.butterfly);
    const treePositions: [number, number][] = [
      [17, 4],
      [19, 25],
      [-14, -13],
      [-17, 2],
      [-8, 28],
      [8, -33],
      [-19, -39],
      [29, -17],
      [33, 9],
      [30, 35],
      [-21, 35],
      [-31, 43],
      [11, 42],
    ];
    if (!this.slice)
      treePositions.push(
        [64, -45],
        [70, -50],
        [67, -60],
        [70, -70],
        [84, -52],
        [89, -63],
        [88, -79],
        [72, -82],
        [64, -76],
        [93, -48],
        [92, -90],
        [58, -61],
        [82, -69],
        [83, -78],
      );
    if (!this.slice)
      for (let i = 0; i < 590; i++) {
        const x = (rng() - 0.5) * 247,
          z = (rng() - 0.5) * 249 - 3;
        if (
          (x > 55 || z < -61 || x < -92 || z > 63) &&
          !this.collision.blocked(x, z, 3, terrainHeight(x, z)) &&
          !treePositions.some((p) => Math.hypot(p[0] - x, p[1] - z) < 5) &&
          !onPath(x, z) &&
          !this.clearPaths.some((p) =>
            p.points.some((a, j) => j > 0 && distanceSegment(x, z, p.points[j - 1], a) < p.halfWidth + 1.4),
          )
        )
          treePositions.push([x, z]);
      }
    for (const [i, kind] of (['round', 'tall', 'cedar', 'round', 'tall', 'cedar'] as WoodlandKind[]).entries()) {
      const template = woodlandTemplate(kind, 11 + i * 3);
      // Fit both detail levels, including cards and wind, without filling the
      // opening below each crown with one full-height collision box.
      const leaves = template.canopy;
      const matrices = treePositions
        .filter(([x, z]) => !(Math.abs(x - 77) < 2.5 && z < -64 && z > -82))
        .filter((_, j) => j % 6 === i)
        .map(([x, z]) => mat(x, z, 0.7 + rng() * 0.4))
        .filter((matrix) => {
          // Regions lays this connecting road after the village has grown. Reserve
          // its full width plus the tree's camera proxy and bicycle radius here.
          // Draw every transform first so all retained trees keep their old variants,
          // positions, rotations and scales, including the next tree family.
          const [a, b] = REGION_ROUTE, e = matrix.elements;
          return distanceSegment(e[12], e[14], [a.x, a.z], [b.x, b.z]) >=
            Math.max(a.width, b.width) / 2 + (kind === 'cedar' ? 1.1 : 2) + .45;
        })
        .map((matrix) => {
          const x = matrix.elements[12], z = matrix.elements[14];
          this.collision.add({ x, z, r: 0.36, height: 7, bottom: terrainHeight(x, z) });
          this.collision.add(canopyHullObstacle(leaves, matrix));
          return matrix;
        });
      for (const matrix of matrices) this.woodland.add(kind, 11 + i * 3, matrix);
    }
    this.woodland.build();this.group.add(this.woodland.group);
  }
  countryside() {
    // Reflective paddies with irregular margins and a traversable network of banks.
    this.group.add(this.water);
    const rice: T.Matrix4[] = [];
    for (const [i, [x, z, w, d]] of PADDIES.entries()) {
      const water = new T.Mesh(prepareWaterSurface(new T.PlaneGeometry(w,d,Math.ceil(w/2),Math.ceil(d/2)).rotateX(-Math.PI/2),x,z,true),waterMaterial());
      water.position.set(x, -0.16, z);
      this.water.add(water);
      for (const [xx, zz, ww, dd] of [
        [x - w / 2 - 0.35, z, 0.7, d + 1],
        [x + w / 2 + 0.35, z, 0.7, d + 1],
        [x, z - d / 2 - 0.35, w + 1, 0.7],
        [x, z + d / 2 + 0.35, w + 1, 0.7],
      ])
        this.prop(box(ww, 0.2, dd, '#739155', M.ground), xx, zz).position.y = -0.03;
      for (let xx = -w / 2 + 0.5; xx < w / 2; xx += 0.7)
        for (let zz = -d / 2 + 0.5; zz < d / 2; zz += 0.66) {
          if (Math.sin(xx * 2 + zz + i) > 0.985) continue;
          rice.push(new T.Matrix4().makeRotationY(i * 0.35).setPosition(x + xx, -0.2, z + zz));
        }
    }
    shuffle(rice, mulberry32(713));
    this.vegetationInstances(riceTuft(17), rice, ID.rice);
    this.prop(scarecrow(21), -39, 27, 0);
    for (const z of [-8, 44])
      for (const g of fence(24, 0.85, '#76603c', 20, true)) this.prop(g, -53, z, 0, ID.fence, 0.4);
    // Meet the valley at one exact edge; the old strip continued beneath it for 78m.
    const river = new T.Mesh(villageRiverGeometry(!this.slice), waterMaterial(true));
    river.name = 'Aonami connected current';
    this.water.add(river);
    const rng = mulberry32(79);
    for (let i = 0; i < 90; i++) {
      const z = -109 + rng() * 191,
        x = riverX(z) + (i % 2 ? -1 : 1) * (5.5 + rng() * 2);
      if (Math.abs(z + 26) < 4) continue;
      this.prop(boulder(i + 1), x, z, 0, ID.ground, 0.15).scale.setScalar(0.35 + rng() * 0.7);
    }
    this.prop(box(19, 0.28, 4.5, '#9d8261', M.planks), 47, -26).position.y = 0.09;
    for (const z of [-28.15, -23.85]) {
      this.prop(box(19, 0.12, 0.12, '#755539', M.planks), 47, z).position.y = 1.02;
      for (let x = 38; x <= 56; x += 2) {
        this.prop(box(0.13, 0.88, 0.13, '#735b40', M.planks), x, z).position.y = 0.63;
        this.collision.add({ x, z, w: 0.17, d: 0.17, height: 1.1 });
      }
      this.collision.add({ x: 47, z, w: 19, d: 0.13, height: 1.1 });
    }
    this.asset('FURN_bench', 36, -34, -Math.PI / 2);
    this.interactions.push({
      id: 'river-bench',
      label: 'Listen to the river',
      x: 36,
      z: -34,
      radius: 1.6,
      kind: 'sit',
    });
    const shrineObj = shrine();
    this.prop(shrineObj.geo, 77, -71, 0);
    this.collision.add({
      x: 77,
      z: -77.38,
      w: 0.95,
      d: 0.85,
      height: 1.6,
      bottom: terrainHeight(77, -77.38),
    });
    for (const x of [75.7, 78.3])
      this.collision.add({ x, z: -71, r: 0.18, height: 3.7, bottom: terrainHeight(77, -71) });
    for (const x of [74.5, 79.5])
      for (const z of [-57, -63, -69]) {
        this.prop(stoneLantern(), x, z, 0, ID.house, 0.4);
        this.collision.add({ x, z, r: 0.25, height: 1.6, bottom: terrainHeight(x, z) });
      }
    this.prop(jizo(7), 81, -65, 0.3);
    this.prop(bambooGrove(90), 87, -60, 0, ID.tree, 0.1);
    this.interactions.push({
      id: 'shrine',
      label: 'Ring the shrine bell',
      x: 77,
      z: -66,
      radius: 2,
      kind: 'inspect',
      data: 'A clear note disappears between the cedars. For a moment, even the cicadas seem to listen.',
    });
    this.asset('FURN_bench', -61, -85, Math.PI);
    this.interactions.push({
      id: 'view',
      label: 'Take in the view',
      x: -61,
      z: -84,
      radius: 3,
      kind: 'view',
    });
  }
  update(dt: number, position: T.Vector3, settings: Settings, speed = 0, camera?: T.Camera) {
    this.treeTick += dt;
    const signature = `${settings.quality}/${settings.visibility}/${settings.distance}/${settings.vegetation}`;
    if (this.treeTick < 0.08 && signature === this.lastQuality) return;
    this.lastQuality = signature;
    const delta = this.treeTick;
    this.treeTick = 0;
    const density = settings.vegetation,
      ranges = sceneryRanges(settings);
    this.visibility.update(position, ranges.end);
    this.woodland.update(position,settings,camera);
    for (const m of this.vegetation) {
      if (!m.userData.max) m.userData.max = m.count;
      const sphere = m.boundingSphere;
      const d = sphere ? Math.max(0, sphere.center.distanceTo(position) - sphere.radius) : 0;
      m.visible = d < ranges.foliage + 1;
      // Preserve planted gardens on Low; thin distant grass where blades are subpixel.
      const minimum = m.userData.minimumDensity || 0;
      m.count = Math.floor(m.userData.max * (minimum + (1 - minimum) * density));
    }
    if (this.cat) {
      const d = this.cat.position.distanceTo(position);
      if (d < 2.3 && speed > 2) this.catAlarm = 6;
      this.catAlarm = Math.max(0, this.catAlarm - delta);
      if (this.catAlarm > 0) {
        this.collision.move(this.cat.position, 0, -delta * 0.55, 0.18, this.cat.position.y);
        this.cat.position.y = terrainHeight(this.cat.position.x, this.cat.position.z) + 0.03;
        this.cat.rotation.y = Math.PI;
      } else if (d < 3) {
        this.cat.rotation.y = Math.atan2(position.x - this.cat.position.x, position.z - this.cat.position.z);
      }
      this.cat.scale.y = 1 + Math.sin(performance.now() * 0.0014) * 0.018;
      this.cat.scale.z = d < 3 ? 1.06 : 1;
      const interaction = this.interactions.find((i) => i.id === 'cat')!;
      interaction.x = this.cat.position.x;
      interaction.z = this.cat.position.z;
    }
  }
}
export function distanceSegment(x: number, z: number, a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function shuffle<T>(a: T[], rng: () => number) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}
function onBridge(x: number, z: number) {
  return x > 36 && x < 57 && z > -29 && z < -23;
}
