import * as T from 'three';
import { Character } from '../character/character';
import { Assets } from '../game/assets';
import { terrainHeight } from '../data/world';
import { CITY_PATHS } from '../data/city';
import { regionRouteSample } from '../data/regions';
import {
  CITY_LIFE_BOUNDS,
  CITY_RESIDENTS,
  cityActivityAt,
  validateCityLifeState,
  freshCityLifeState,
  type CityLifeState,
  type CityResidentDefinition,
  type CityResidentState,
  type CityPoint,
} from '../data/city-residents';
import { Collision } from './collision';
import { box, xf, merge, prep, M, ID } from './geo';
import { uber, surfaceBits } from '../render/materials';

const distance = (a: CityPoint, b: CityPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** A close starting pair may separate, but no sweep may deepen that overlap. */
function crowdSegmentClear(a: CityPoint, b: CityPoint, p: CityPoint, radius: number, retreat = false) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = dx * dx + dz * dz;
  const ax = a[0] - p[0], az = a[1] - p[1];
  const t = len ? Math.max(0, Math.min(1, -(ax * dx + az * dz) / len)) : 0;
  const clearance = retreat ? Math.min(radius * radius, ax * ax + az * az) : radius * radius;
  return (ax + t * dx) ** 2 + (az + t * dz) ** 2 >= clearance - 1e-10;
}
const angle = (target: number, current: number) =>
  Math.atan2(Math.sin(target - current), Math.cos(target - current));
type Search = {
  avoid: CityPoint[];
  from: CityPoint;
  to: CityPoint;
  open: MinHeap;
  cost: Map<number, number>;
  came: Map<number, number>;
  closed: Set<number>;
  end: number;
  start: number;
  revision: number;
  done: boolean;
  result: CityPoint[] | null;
};
class MinHeap {
  private data: { id: number; score: number }[] = [];
  get size() {
    return this.data.length;
  }
  push(id: number, score: number) {
    const v = { id, score };
    let i = this.data.length;
    this.data.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].score <= score) break;
      this.data[i] = this.data[p];
      i = p;
    }
    this.data[i] = v;
  }
  pop() {
    const top = this.data[0],
      last = this.data.pop()!;
    if (this.data.length) {
      let i = 0;
      while (i * 2 + 1 < this.data.length) {
        let c = i * 2 + 1;
        if (c + 1 < this.data.length && this.data[c + 1].score < this.data[c].score) c++;
        if (this.data[c].score >= last.score) break;
        this.data[i] = this.data[c];
        i = c;
      }
      this.data[i] = last;
    }
    return top.id;
  }
}

/** Fixed 1.5m city grid; all endpoint links and edges are swept at adult radius.
 * A* is resumable so a schedule change cannot issue ten unbounded searches in one frame. */
export class CityNavigation {
  readonly step = 1.5;
  readonly width = Math.floor((CITY_LIFE_BOUNDS.x1 - CITY_LIFE_BOUNDS.x0) / this.step) + 1;
  readonly height = Math.floor((CITY_LIFE_BOUNDS.z1 - CITY_LIFE_BOUNDS.z0) / this.step) + 1;
  readonly size = this.width * this.height;
  private cells = new Int8Array(this.size);
  private weights = new Float32Array(this.size);
  private edges = new Map<number, boolean>();
  private revision = -1;
  private worldRevision = -1;
  constructor(
    readonly collision: Collision,
    readonly ground: (x: number, z: number) => number = terrainHeight,
  ) {}
  point(id: number): CityPoint {
    return [
      CITY_LIFE_BOUNDS.x0 + (id % this.width) * this.step,
      CITY_LIFE_BOUNDS.z0 + Math.floor(id / this.width) * this.step,
    ];
  }
  private sync() {
    if (this.worldRevision === this.collision.revision) return;
    this.worldRevision = this.collision.revision;
    const localRevision = this.collision.revisionForBounds(CITY_LIFE_BOUNDS);
    if (this.revision !== localRevision) {
      this.revision = localRevision;
      this.cells.fill(0);
      this.edges.clear();
    }
  }
  valid(p: CityPoint) {
    const b = CITY_LIFE_BOUNDS;
    return (
      p.every(Number.isFinite) &&
      p[0] >= b.x0 &&
      p[0] <= b.x1 &&
      p[1] >= b.z0 &&
      p[1] <= b.z1 &&
      !this.collision.blocked(p[0], p[1], 0.34, this.ground(...p))
    );
  }
  clear(a: CityPoint, b: CityPoint) {
    const n = Math.max(1, Math.ceil(distance(a, b) / 0.22));
    let y = this.ground(...a);
    for (let i = 0; i <= n; i++) {
      const p: CityPoint = [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n],
        h = this.ground(...p);
      if (!this.valid(p) || Math.abs(h - y) > 0.29) return false;
      y = h;
    }
    return true;
  }
  private walkable(id: number) {
    if (id < 0 || id >= this.size) return false;
    if (!this.cells[id]) this.cells[id] = this.valid(this.point(id)) ? 1 : -1;
    return this.cells[id] === 1;
  }
  private crowdClear(a: CityPoint, b: CityPoint, avoid: CityPoint[], retreat = false) {
    return avoid.every(p => distance(b, p) >= .69 && crowdSegmentClear(a, b, p, .69, retreat));
  }
  private nearest(p: CityPoint, avoid: CityPoint[] = [], retreat = false) {
    let best = -1,
      d = Infinity;
    const col = Math.round((p[0] - CITY_LIFE_BOUNDS.x0) / this.step),
      row = Math.round((p[1] - CITY_LIFE_BOUNDS.z0) / this.step);
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++) {
        const x = col + dx,
          z = row + dz;
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) continue;
        const id = x + z * this.width,
          q = this.point(id),
          n = distance(p, q);
        if (n < d && this.walkable(id) && this.clear(p, q) && this.crowdClear(p, q, avoid, retreat)) {
          best = id;
          d = n;
        }
      }
    return best;
  }
  private costAt(id: number) {
    if (this.weights[id]) return this.weights[id];
    const p = this.point(id);
    let road = regionRouteSample(...p).distance < 4;
    for (const path of CITY_PATHS) {
      for (let i = 1; i < path.points.length && !road; i++) {
        const a = path.points[i - 1],
          b = path.points[i],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)));
        road = Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t) < path.width / 2;
      }
    }
    return (this.weights[id] = road ? 1 : 1.8);
  }
  begin(from: CityPoint, to: CityPoint, avoid: CityPoint[] = []): Search {
    this.sync();
    const start = this.valid(from) ? this.nearest(from, avoid, true) : -1,
      end = this.valid(to) ? this.nearest(to, avoid) : -1,
      open = new MinHeap();
    const job: Search = {
      avoid,
      from: [...from],
      to: [...to],
      open,
      cost: new Map(),
      came: new Map(),
      closed: new Set(),
      end,
      start,
      revision: this.revision,
      done: start < 0 || end < 0,
      result: null,
    };
    if (distance(from, to) < 0.15 && this.clear(from, to) && this.crowdClear(from, to, avoid)) {
      job.done = true;
      job.result = distance(from, to) > 0.001 ? [[...to]] : [];
      return job;
    }
    if (!job.done) {
      open.push(start, distance(from, to));
      job.cost.set(start, 0);
    }
    return job;
  }
  advance(job: Search, budget = 80) {
    this.sync();
    if (job.done) return job;
    if (job.revision !== this.revision) {
      job.done = true;
      return job;
    }
    while (job.open.size && budget-- > 0) {
      const id = job.open.pop();
      if (job.closed.has(id)) continue;
      if (id === job.end) {
        const ids = [id];
        let cur = id;
        while (cur !== job.start) {
          cur = job.came.get(cur)!;
          ids.push(cur);
        }
        const raw = [job.from, ...ids.reverse().map((i) => this.point(i)), job.to];
        // Only remove local collinear grid steps; never cut across an entire city block.
        const result: CityPoint[] = [];
        let current = raw[0];
        for (let i = 1; i < raw.length; i++) {
          while (
            i + 1 < raw.length &&
            distance(current, raw[i + 1]) < 4 &&
            this.clear(current, raw[i + 1]) &&
            this.crowdClear(current, raw[i + 1], job.avoid, current === raw[0])
          )
            i++;
          if (distance(current, raw[i]) > 0.015) {
            result.push(raw[i]);
            current = raw[i];
          }
        }
        job.result = result;
        job.done = true;
        return job;
      }
      job.closed.add(id);
      const p = this.point(id),
        col = id % this.width,
        row = Math.floor(id / this.width);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        const x = col + dx,
          z = row + dz;
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) continue;
        const next = x + z * this.width;
        if (job.closed.has(next) || !this.walkable(next)) continue;
        const q = this.point(next),
          key = Math.min(id, next) * this.size + Math.max(id, next);
        let clear = this.edges.get(key);
        if (clear === undefined) {
          clear = this.clear(p, q);
          this.edges.set(key, clear);
        }
        if (!clear || !this.crowdClear(p, q, job.avoid)) continue;
        const cost = job.cost.get(id)! + (distance(p, q) * (this.costAt(id) + this.costAt(next))) / 2;
        if (cost >= (job.cost.get(next) ?? Infinity)) continue;
        job.cost.set(next, cost);
        job.came.set(next, id);
        job.open.push(next, cost + distance(q, this.point(job.end)));
      }
    }
    if (!job.open.size) job.done = true;
    return job;
  }
  /** Synchronous audit helper; runtime calls begin/advance with a bounded budget. */
  route(from: CityPoint, to: CityPoint) {
    const job = this.begin(from, to);
    while (!job.done) this.advance(job, 1000);
    return job.result;
  }
}

export interface CityResident {
  data: CityResidentDefinition;
  state: CityResidentState;
  position: T.Vector3;
  character: Character | null;
  route: CityPoint[];
  status: 'traveling' | 'working' | 'resting' | 'waiting' | 'socializing' | 'greeting' | 'blocked';
  moving: boolean;
  retry: number;
  stuck: number;
  animationDt: number;
  greeting: number;
  greetingCooldown: number;
  handContactError: number | null;
}

export class CityLife {
  readonly state: CityLifeState;
  readonly residents: CityResident[];
  readonly nav: CityNavigation;
  readonly group = new T.Group();
  private talking: CityResident | null = null;
  private job: { resident: CityResident; search: Search } | null = null;
  private cursor = 0;
  private props = new Map<string, T.Group>();
  constructor(
    private assets: Assets,
    private scene: T.Scene,
    readonly collision: Collision,
    state: CityLifeState,
  ) {
    this.state = validateCityLifeState(state);
    this.nav = new CityNavigation(collision);
    this.group.name = 'Aldermere daily life';
    scene.add(this.group);
    this.residents = CITY_RESIDENTS.map((data, i) => {
      const s = this.state.residents[i];
      return {
        data,
        state: s,
        position: new T.Vector3(s.x, terrainHeight(s.x, s.z), s.z),
        character: null,
        route: [],
        status: 'resting',
        moving: false,
        retry: 0,
        stuck: 0,
        animationDt: 0,
        greeting: 0,
        greetingCooldown: 0,
        handContactError: null,
      };
    });
    for (const r of this.residents) this.workObject(r);
  }
  private workObject(r: CityResident) {
    const d = r.data.destinations.work,
      [x, z] = d.point,
      parts: T.BufferGeometry[] = [],
      wood = '#9d7952',
      paper = '#e6d6ad';
    const ring = (radius: number, tube: number, color: string) =>
      prep(new T.TorusGeometry(radius, tube, 6, 20), color, M.planks);
    if (['iona', 'mara'].includes(r.data.id)) {
      parts.push(
        xf(box(0.68, 0.48, 0.035, paper, M.cloth), 0, 1.12, 0),
        xf(box(0.045, 1.3, 0.05, wood, M.planks), -0.26, 0.65, 0),
        xf(box(0.045, 1.3, 0.05, wood, M.planks), 0.26, 0.65, 0),
      );
      for (let i = 0; i < 4; i++)
        parts.push(
          xf(box(0.38 - i * 0.05, 0.013, 0.012, '#627a75', M.cloth), -0.05, 1.25 - i * 0.085, 0.027),
        );
    } else if (r.data.id === 'mira') {
      parts.push(
        xf(box(0.75, 0.62, 0.045, '#678da1', M.cloth), 0, 0.97, 0),
        xf(box(0.045, 1.35, 0.055, wood, M.planks), -0.42, 0.675, 0),
        xf(box(0.045, 1.35, 0.055, wood, M.planks), 0.42, 0.675, 0),
      );
      for (let i = 0; i < 5; i++)
        parts.push(xf(box(0.012, 0.55, 0.012, paper, M.cloth), -0.3 + i * 0.15, 0.97, 0.03));
    } else if (r.data.id === 'oren') {
      parts.push(
        xf(ring(0.4, 0.055, wood), 0, 1, 0),
        xf(box(0.075, 0.8, 0.08, '#c2a777', M.planks), 0, 1, 0),
        xf(box(0.8, 0.075, 0.08, '#c2a777', M.planks), 0, 1, 0),
        xf(box(0.65, 0.15, 0.38, wood, M.planks), 0, 0.25, 0),
        xf(box(0.1, 0.8, 0.12, wood, M.planks), 0, 0.65, -0.1),
      );
    } else {
      parts.push(
        xf(box(0.74, 0.08, 0.43, wood, M.planks), 0, 0.88, 0),
        xf(box(0.08, 0.86, 0.08, wood, M.planks), -0.29, 0.43, -0.15),
        xf(box(0.08, 0.86, 0.08, wood, M.planks), 0.29, 0.43, 0.15),
      );
      if (r.data.id === 'lio')
        for (let i = 0; i < 3; i++)
          parts.push(xf(ring(0.17 + i * 0.035, 0.018, '#bda87a'), 0, 0.95 + i * 0.016, 0, Math.PI / 2, 0, 0));
      if (r.data.id === 'rowan')
        for (const xx of [-0.2, 0, 0.2])
          parts.push(xf(prep(new T.SphereGeometry(0.13, 10, 6), '#c39759', M.cloth), xx, 1, 0));
      if (r.data.id === 'tamsin')
        parts.push(
          xf(box(0.2, 0.3, 0.2, '#e7bc67', M.glow), 0, 1.1, 0),
          xf(box(0.28, 0.06, 0.28, '#425e5c', M.metal), 0, 1.28, 0),
          xf(ring(0.09, 0.013, '#9b854f'), 0, 1.4, 0),
        );
      if (r.data.id === 'sela')
        parts.push(
          xf(prep(new T.CylinderGeometry(0.2, 0.12, 0.17, 16, 1, true), '#b87760', M.stone), 0, 1, 0),
        );
      if (r.data.id === 'neri')
        for (const xx of [-0.22, 0, 0.22])
          parts.push(
            xf(prep(new T.CylinderGeometry(0.085, 0.05, 0.15, 8), '#a76f58', M.stone), xx, 1, 0),
            xf(box(0.025, 0.27, 0.04, '#718958', M.grass), xx, 1.2, 0),
          );
      if (r.data.id === 'bram')
        parts.push(
          xf(box(0.95, 0.06, 0.13, '#c2a777', M.planks), 0, 0.97, 0),
          xf(box(0.16, 0.08, 0.08, '#4c5755', M.metal), 0.08, 1.045, 0),
        );
    }
    const geometry = merge(parts),
      mesh = new T.Mesh(geometry, uber(ID.house, 0.3, T.DoubleSide, surfaceBits(geometry))),
      group = new T.Group();
    group.name = r.data.name + ' — ' + r.data.task;
    mesh.layers.enable(1);
    mesh.layers.enable(2);
    group.add(mesh);
    const px = x + Math.sin(d.facing) * 0.46,
      pz = z + Math.cos(d.facing) * 0.46;
    const lift = terrainHeight(x, z) - terrainHeight(px, pz);
    const vertices = geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const yy = vertices.getY(i);
      vertices.setY(i, yy + lift * Math.max(0, Math.min(1, yy / 0.35)));
    }
    geometry.computeVertexNormals();
    group.userData.workLift = lift;
    group.position.set(px, terrainHeight(px, pz), pz);
    group.rotation.y = d.facing;
    // A work object never creates a new blocked activity point or occupies an existing wall.
    if (!this.collision.blocked(px, pz, 0.46, terrainHeight(px, pz))) {
      this.group.add(group);
      this.props.set(r.data.id, group);
      this.collision.add({
        x: px,
        z: pz,
        w: 0.95,
        d: 0.2,
        yaw: d.facing,
        bottom: group.position.y,
        height: 1.45,
        tag: 'city-work-' + r.data.id,
      });
    } else geometry.dispose();
  }
  update(
    dt: number,
    timeOfDay: number,
    elapsed: number,
    playerPosition: T.Vector3,
    inside: string | null,
    drawDistance: number,
  ) {
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 1)) : 0;
    const activity = cityActivityAt(timeOfDay);
    for (const r of this.residents) {
      const s = r.state;
      r.moving = false;
      r.retry = Math.max(0, r.retry - dt);
      r.greetingCooldown = Math.max(0, r.greetingCooldown - dt);
      r.greeting = Math.max(0, r.greeting - dt);
      if (s.activity !== activity && r !== this.talking) {
        s.activity = activity;
        s.settled = 0;
        s.meetingProgress = 0;
        s.meetingCounted = false;
        r.route = [];
        r.retry = 0;
        if (this.job?.resident === r) this.job = null;
      }
      const target = r.data.destinations[s.activity],
        p: CityPoint = [r.position.x, r.position.z];
      if (!this.nav.valid(p)) {
        r.status = 'blocked';
        r.route = [];
        continue;
      } // Corrupt/obsolete saves stay put; no teleport across a changed wall.
      if (r === this.talking) {
        r.status = 'greeting';
        continue;
      }
      const remaining = distance(p, target.point);
      if (remaining > 0.025) {
        s.settled = 0;
        r.status = r.retry > 0 ? 'blocked' : 'traveling';
        if (r.route.length && r.greeting <= 0) this.move(r, dt, playerPosition, inside);
      } else {
        r.route = [];
        s.settled = Math.min(86400, s.settled + dt);
        r.status = s.activity === 'work' ? 'working' : s.activity === 'meeting' ? 'waiting' : 'resting';
        s.yaw += angle(target.facing, s.yaw) * (1 - Math.exp(-4 * dt));
        if (s.activity === 'work') {
          s.taskProgress += dt;
          if (s.taskProgress >= 24) {
            s.taskProgress -= 24;
            s.tasksCompleted = Math.min(1000000, s.tasksCompleted + 1);
          }
        }
        if (s.activity === 'meeting') {
          const other = this.residents.find((o) => o.data.id === r.data.partner)!;
          if (
            other.state.activity === 'meeting' &&
            distance([other.position.x, other.position.z], other.data.destinations.meeting.point) < 0.2
          ) {
            r.status = 'socializing';
            s.yaw = Math.atan2(other.position.x - r.position.x, other.position.z - r.position.z);
            s.meetingProgress = Math.min(86400, s.meetingProgress + dt);
            if (s.meetingProgress >= 20 && !s.meetingCounted) {
              s.meetingCounted = true;
              s.meetingsCompleted = Math.min(1000000, s.meetingsCompleted + 1);
            }
          }
        }
      }
      if (!inside && playerPosition.distanceTo(r.position) < 2.7 && r.greetingCooldown <= 0) {
        r.greeting = 1.5;
        r.greetingCooldown = 35;
      }
      if (r.greeting > 0) {
        r.status = 'greeting';
        s.yaw +=
          angle(Math.atan2(playerPosition.x - r.position.x, playerPosition.z - r.position.z), s.yaw) *
          (1 - Math.exp(-5 * dt));
      }
      s.x = r.position.x;
      s.z = r.position.z;
      r.position.y = terrainHeight(s.x, s.z) + 0.02;
    }
    // One search with at most 70 expanded nodes per frame; every resident gets a turn.
    if (!this.job)
      for (let n = 0; n < this.residents.length; n++) {
        const r = this.residents[this.cursor++ % this.residents.length];
        if (
          r !== this.talking &&
          !r.route.length &&
          r.retry <= 0 &&
          distance([r.position.x, r.position.z], r.data.destinations[r.state.activity].point) > 0.025
        ) {
          const avoid = this.residents
            .filter(
              (o) =>
                o !== r &&
                o.state.settled > 1,
            )
            .map((o) => [o.position.x, o.position.z] as CityPoint);
          if (!inside && Math.hypot(playerPosition.x - r.position.x, playerPosition.z - r.position.z) > 0.85)
            avoid.push([playerPosition.x, playerPosition.z]);
          this.job = {
            resident: r,
            search: this.nav.begin(
              [r.position.x, r.position.z],
              r.data.destinations[r.state.activity].point,
              avoid,
            ),
          };
          break;
        }
      }
    if (this.job) {
      const { resident: r, search } = this.job;
      this.nav.advance(search, 70);
      if (search.done) {
        r.route = search.result ?? [];
        r.retry = search.result ? 0 : 8;
        if (!search.result) r.status = 'blocked';
        this.job = null;
      }
    }
    this.render(dt, elapsed, playerPosition, inside, drawDistance);
  }
  private move(r: CityResident, dt: number, player: T.Vector3, inside: string | null) {
    const next = r.route[0],
      dx = next[0] - r.position.x,
      dz = next[1] - r.position.z,
      d = Math.hypot(dx, dz);
    if (d < 0.012) {
      r.route.shift();
      return;
    }
    const step = Math.min(d, r.data.speed * dt);
    const mx = (dx / d) * step,
      mz = (dz / d) * step;
    const crowd = this.residents.find(
      (o) => o !== r && Math.hypot(o.position.x - r.position.x - mx, o.position.z - r.position.z - mz) < 0.64,
    );
    const before = r.position.clone();
    const from: CityPoint = [before.x, before.z];
    const sign = crowd && r.data.id < crowd.data.id ? 1 : -1;
    // Keep the preferred passing side, but try its opposite when a work prop or
    // another person closes that side. Every candidate sweeps people and solids.
    for (const [sx, sz] of [[mx, mz], [-mz * sign, mx * sign], [mz * sign, -mx * sign]]) {
      const to: CityPoint = [before.x + sx, before.z + sz];
      if (this.residents.some(o => o !== r &&
        !crowdSegmentClear(from, to, [o.position.x, o.position.z], .64, true))) continue;
      if (!inside && !crowdSegmentClear(from, to, [player.x, player.z], .83, true)) continue;
      if (!this.nav.clear(from, to)) continue;
      this.collision.move(r.position, sx, sz, 0.32, r.position.y);
      break;
    }
    const traveled = Math.hypot(r.position.x - before.x, r.position.z - before.z);
    r.moving = traveled > 0.0001;
    if (r.moving) {
      r.state.yaw +=
        angle(Math.atan2(r.position.x - before.x, r.position.z - before.z), r.state.yaw) *
        (1 - Math.exp(-7 * dt));
    }
    // Replan even when repeated sideways motion fails to approach the waypoint.
    r.stuck = r.moving && distance([r.position.x, r.position.z], next) < d - .0001 ? 0 : r.stuck + dt;
    if (r.stuck > 2) {
      r.route = [];
      r.retry = 0.5;
      r.stuck = 0;
    }
  }
  private render(dt: number, elapsed: number, player: T.Vector3, inside: string | null, range: number) {
    let built = false;
    const radius = Math.max(25, Math.min(135, range));
    for (const r of this.residents) {
      const d = r.position.distanceTo(player),
        visible = !inside && d < radius;
      if (visible && !r.character && !built) {
        r.character = new Character(this.assets, r.data.appearance);
        r.character.group.name = 'Citizen: ' + r.data.name;
        this.group.add(r.character.group);
        built = true;
      }
      const c = r.character;
      if (!c) continue;
      c.group.visible = visible;
      c.group.position.copy(r.position);
      c.group.rotation.y = r.state.yaw;
      const moving = r.moving && r.greeting <= 0 && r !== this.talking,
        working =
          r.status === 'working' && Math.abs(angle(r.data.destinations.work.facing, r.state.yaw)) < 0.025,
        gesturing = r.status === 'greeting' || r.status === 'socializing';
      if (!working) r.handContactError = null;
      c.setState(moving ? 'walk' : gesturing ? 'interact' : 'idle', moving ? r.data.speed / 0.92 : 1);
      r.animationDt += dt;
      if (visible && r.animationDt >= (d < 18 ? 0 : d < 55 ? 1 / 20 : 1 / 10)) {
        c.update(
          Math.min(0.15, r.animationDt),
          moving ? r.data.speed : 0,
          0,
          0,
          elapsed,
          undefined,
          terrainHeight,
        );
        if (working) {
          const prop = this.props.get(r.data.id);
          if (prop) {
            // A small bend over the work is restored by Character.update next frame.
            c.bones
              .get('spine')
              ?.quaternion.multiply(
                new T.Quaternion().setFromAxisAngle(
                  new T.Vector3(1, 0, 0),
                  0.2 * Math.min(1, r.state.settled / 1.1),
                ),
              );
            const phase = (r.state.taskProgress * Math.PI) / 3,
              wave = Math.sin(phase),
              left = new T.Vector3(-0.17, 1.02, -0.12),
              right = new T.Vector3(0.17, 1.02, -0.12);
            if (r.data.id === 'iona' || r.data.id === 'mara') {
              left.set(-0.22, 1.05, -0.035);
              right.set(0.12 + wave * 0.09, 1.17, -0.035);
            } else if (r.data.id === 'mira') {
              left.set(-0.18, 1.03, -0.035);
              right.set(0.13, 1.075 + wave * 0.035, -0.035);
            } else if (r.data.id === 'oren') {
              left.set(-0.27, 1.23, -0.03);
              right.set(0.27, 1.23 + wave * 0.045, -0.03);
            } else if (r.data.id === 'lio') {
              left.set(-0.13, 0.99, -0.12);
              right.set(0.1 + Math.cos(phase) * 0.04, 1.06 + Math.sin(phase) * 0.02, -0.1);
            } else if (r.data.id === 'tamsin') {
              left.set(-0.13, 1.12, -0.08);
              right.set(0.13, 1.2 + wave * 0.03, -0.08);
            } else if (r.data.id === 'sela') {
              left.set(-0.17, 1.075, -0.08);
              right.set(0.17, 1.075, -0.08 + wave * 0.045);
            } else if (r.data.id === 'neri') {
              right.set(0.2, 1.14 + wave * 0.04, -0.07);
            } else if (r.data.id === 'bram') {
              right.set(0.1 + wave * 0.07, 1.11, -0.08);
              left.set(-0.25, 1.015, -0.08);
            } else {
              right.set(0.1 + wave * 0.09, 1.08, -0.08);
            }
            // Work surfaces are level with the worker; feet of the stand remain on the sampled ground.
            left.y += Number(prop.userData.workLift) || 0;
            right.y += Number(prop.userData.workLift) || 0;
            // Blender's left arm is +X in the authored character frame.
            left.x *= -1;
            right.x *= -1;
            prop.localToWorld(left);
            prop.localToWorld(right);
            c.contactHands(left, right, Math.min(1, r.state.settled / 1.1));
            r.handContactError = Math.max(
              c.bones.get('hand_L')!.getWorldPosition(new T.Vector3()).distanceTo(left),
              c.bones.get('hand_R')!.getWorldPosition(new T.Vector3()).distanceTo(right),
            );
          }
        }
        r.animationDt = 0;
      }
      if (!visible) r.animationDt = 0;
    }
    for (const prop of this.props.values())
      prop.visible = !inside && prop.position.distanceTo(player) < radius + 12;
  }
  nearby(position: T.Vector3, inside: string | null): CityResident | null {
    if (inside) return null;
    return (
      this.residents
        .filter((r) => r.character?.group.visible && r.position.distanceTo(position) < 2.3)
        .sort((a, b) => a.position.distanceToSquared(position) - b.position.distanceToSquared(position))[0] ??
      null
    );
  }
  talk(resident: CityResident, playerPosition: T.Vector3): { name: string; text: string } {
    this.talking = resident;
    resident.state.conversations = Math.min(1000000, resident.state.conversations + 1);
    resident.state.yaw = Math.atan2(
      playerPosition.x - resident.position.x,
      playerPosition.z - resident.position.z,
    );
    resident.character?.setState('interact');
    const activity = resident.state.activity,
      arrived =
        distance([resident.position.x, resident.position.z], resident.data.destinations[activity].point) <
        0.2;
    let text = resident.data.lines[activity];
    if (!arrived) text = `I’m on my way to ${resident.data.destinations[activity].label}. ${text}`;
    if (activity === 'meeting' && resident.status === 'waiting')
      text = `I’m waiting for ${CITY_RESIDENTS.find((d) => d.id === resident.data.partner)!.name}. ${text}`;
    if (activity === 'work' && resident.state.tasksCompleted > 0)
      text += ` I have finished ${resident.state.tasksCompleted === 1 ? 'one piece' : 'a few pieces'}; there is time to do the next one carefully.`;
    return { name: `${resident.data.name} · ${resident.data.role}`, text };
  }
  release() {
    this.talking = null;
  }
  /** Explicit New Visit resets the simulation in place, preserving the save's live reference. */
  reset() {
    const fresh = freshCityLifeState();
    this.release();
    this.job = null;
    this.cursor = 0;
    for (let i = 0; i < this.residents.length; i++) {
      const r = this.residents[i];
      Object.assign(r.state, fresh.residents[i]);
      r.position.set(r.state.x, terrainHeight(r.state.x, r.state.z) + 0.02, r.state.z);
      r.route = [];
      r.status = 'resting';
      r.moving = false;
      r.retry = 0;
      r.stuck = 0;
      r.animationDt = 0;
      r.greeting = 0;
      r.greetingCooldown = 0;
      r.handContactError = null;
      if (r.character) {
        r.character.group.position.copy(r.position);
        r.character.group.rotation.y = r.state.yaw;
        r.character.setState('idle');
      }
    }
  }
  /** Read-only diagnostic: invalid destinations remain failures, never silently moved. */
  destinations() {
    return this.residents.flatMap((r) =>
      Object.entries(r.data.destinations).map(([activity, d]) => ({
        id: r.data.id,
        activity,
        point: d.point,
        clear: this.nav.valid(d.point),
      })),
    );
  }
}
