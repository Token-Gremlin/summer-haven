import { Collision } from './collision';
import { terrainHeight } from '../data/world';
export type Point = [number, number];
/** Cached walkability grid. A* routes are requested only when a schedule changes. */
export class Navigation {
  readonly step = 1.4;
  readonly width: number;
  readonly height: number;
  /** Grid coordinates are immutable even if outdoor collision grows after construction. */
  private readonly originX: number;
  private readonly originZ: number;
  private cells: Int8Array;
  private edges = new Map<number, boolean>();
  private collisionRevision = -1;
  private observedGlobalRevision = -1;
  private readonly cacheBounds:{x0:number;x1:number;z0:number;z1:number};
  constructor(readonly collision: Collision) {
    this.cacheBounds={...collision.bounds};
    this.originX = collision.bounds.x0 + 1;
    this.originZ = collision.bounds.z0 + 1;
    this.width = Math.floor((collision.bounds.x1 - collision.bounds.x0 - 2) / this.step) + 1;
    this.height = Math.floor((collision.bounds.z1 - collision.bounds.z0 - 2) / this.step) + 1;
    this.cells = new Int8Array(this.width * this.height);
  }
  point(id: number): Point {
    return [
      this.originX + (id % this.width) * this.step,
      this.originZ + Math.floor(id / this.width) * this.step,
    ];
  }
  id(x: number, z: number) {
    return (
      Math.round((x - this.originX) / this.step) + Math.round((z - this.originZ) / this.step) * this.width
    );
  }
  walkable(id: number) {
    this.syncCollision();
    if (id < 0 || id >= this.cells.length) return false;
    if (this.cells[id]) return this.cells[id] === 1;
    const [x, z] = this.point(id);
    const good = !this.collision.blocked(x, z, 0.38, terrainHeight(x, z));
    this.cells[id] = good ? 1 : -1;
    return good;
  }
  nearest(p: Point) {
    let best = -1,
      dist = Infinity;
    const origin = this.id(...p);
    for (let dz = -6; dz <= 6; dz++)
      for (let dx = -6; dx <= 6; dx++) {
        const id = origin + dx + dz * this.width;
        if (!this.walkable(id)) continue;
        const q = this.point(id),
          d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (d < dist) {
          dist = d;
          best = id;
        }
      }
    return best;
  }
  clearEdge(a: number, b: number) {
    this.syncCollision();
    const key = Math.min(a, b) * this.cells.length + Math.max(a, b),
      cached = this.edges.get(key);
    if (cached !== undefined) return cached;
    const p = this.point(a),
      q = this.point(b),
      n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.3);
    let clear = true;
    for (let i = 1; i < n; i++) {
      const x = p[0] + ((q[0] - p[0]) * i) / n,
        z = p[1] + ((q[1] - p[1]) * i) / n;
      if (this.collision.blocked(x, z, 0.38, terrainHeight(x, z))) {
        clear = false;
        break;
      }
    }
    this.edges.set(key, clear);
    return clear;
  }
  private syncCollision() {
    if(this.observedGlobalRevision===this.collision.revision)return;
    this.observedGlobalRevision=this.collision.revision;
    const revision=this.collision.revisionForBounds(this.cacheBounds);
    if(this.collisionRevision===revision)return;
    this.cells.fill(0);
    this.edges.clear();
    this.collisionRevision=revision;
  }
  route(from: Point, to: Point): Point[] {
    const start = this.nearest(from),
      end = this.nearest(to);
    if (start < 0 || end < 0) return [];
    const open = new Set([start]),
      came = new Map<number, number>(),
      cost = new Map([[start, 0]]),
      score = new Map([[start, 0]]);
    const target = this.point(end);
    let iterations = 0;
    while (open.size && iterations++ < this.cells.length) {
      let cur = -1,
        min = Infinity;
      for (const id of open) {
        const s = score.get(id)!;
        if (s < min) {
          min = s;
          cur = id;
        }
      }
      if (cur === end) {
        const route: Point[] = [];
        while (cur !== start) {
          route.push(this.point(cur));
          cur = came.get(cur)!;
        }
        return route.reverse();
      }
      open.delete(cur);
      const p = this.point(cur);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
      ]) {
        const next = cur + dx + dz * this.width;
        if (!this.walkable(next)) continue;
        const q = this.point(next);
        if (
          Math.abs(q[0] - p[0]) > this.step * 1.1 ||
          Math.abs(terrainHeight(...q) - terrainHeight(...p)) > 0.9
        )
          continue;
        if (dx && dz && (!this.walkable(cur + dx) || !this.walkable(cur + dz * this.width))) continue;
        if (!this.clearEdge(cur, next)) continue;
        const candidate = cost.get(cur)! + Math.hypot(dx, dz);
        if (candidate >= (cost.get(next) ?? Infinity)) continue;
        came.set(next, cur);
        cost.set(next, candidate);
        score.set(next, candidate + Math.hypot(target[0] - q[0], target[1] - q[1]) / this.step);
        open.add(next);
      }
    }
    return [];
  }
}
