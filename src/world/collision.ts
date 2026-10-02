export interface Obstacle {
  x: number;
  z: number;
  w?: number;
  d?: number;
  r?: number;
  yaw?: number;
  bottom?: number;
  height: number;
  tag?: string;
  cameraOnly?: boolean;
  /** Optional convex camera envelope: each normalized plane's inside is <= 0.
   * Its ordinary box/circle remains the spatial-index broad phase. */
  cameraHull?: ReadonlyArray<{x:number;y:number;z:number;constant:number}>;
}
export class Collision {
  private readonly cellSize = 8;
  private buckets = new Map<string, Set<Obstacle>>();
  private membership = new Map<Obstacle, string[]>();
  private cellRevisions = new Map<string,number>();
  private spatialClock = 0;
  private tracked = new WeakMap<Obstacle, Obstacle>();
  private _obstacles = this.trackArray([]);
  revision = 0;
  get obstacles(): Obstacle[] {
    return this._obstacles;
  }
  set obstacles(value: Obstacle[]) {
    const copy = [...value];
    this.touch([...this.buckets.keys()]);
    this.buckets.clear();
    this.membership.clear();
    this._obstacles = this.trackArray([]);
    this._obstacles.push(...copy);
    this.revision++;
  }
  bounds = { x0: -126, x1: 126, z0: -132, z1: 124 };
  water: (x: number, z: number) => boolean = () => false;
  add(o: Obstacle) {
    this.obstacles.push(o);
    return o;
  }
  /** Mutate the returned handle or use update when retaining the original input object. */
  update(o: Obstacle, change: Partial<Obstacle>) {
    Object.assign(this.tracked.get(o) ?? o, change);
  }
  remove(o: Obstacle) {
    const handle = this.tracked.get(o) ?? o;
    this.obstacles = this.obstacles.filter((item) => item !== handle);
  }
  /** Rebuild after bulk edits through external, untracked input references. */
  reindex() {
    this.touch([...this.buckets.keys()]);
    this.buckets.clear();
    this.membership.clear();
    for (const o of this.obstacles) if (o) this.index(o);
    this.revision++;
  }
  /** Local route caches ignore moving creatures in distant regions. Deleted cells retain their stamp. */
  revisionForBounds(bounds:{x0:number;x1:number;z0:number;z1:number}) {
    let revision=0;
    for(const key of this.keys(bounds.x0,bounds.z0,bounds.x1,bounds.z1))revision=Math.max(revision,this.cellRevisions.get(key)??0);
    return revision;
  }
  private touch(keys:string[]) {
    const revision=++this.spatialClock;
    for(const key of keys)this.cellRevisions.set(key,revision);
  }
  private keys(x0: number, z0: number, x1: number, z1: number) {
    const keys: string[] = [];
    for (let x = Math.floor(x0 / this.cellSize); x <= Math.floor(x1 / this.cellSize); x++)
      for (let z = Math.floor(z0 / this.cellSize); z <= Math.floor(z1 / this.cellSize); z++)
        keys.push(`${x},${z}`);
    return keys;
  }
  private index(o: Obstacle) {
    const c = Math.abs(Math.cos(o.yaw || 0)),
      s = Math.abs(Math.sin(o.yaw || 0));
    const hx = o.r ?? (c * (o.w || 0) + s * (o.d || 0)) / 2;
    const hz = o.r ?? (s * (o.w || 0) + c * (o.d || 0)) / 2;
    const keys = this.keys(o.x - hx, o.z - hz, o.x + hx, o.z + hz);
    this.touch(keys);
    this.membership.set(o, keys);
    for (const key of keys) {
      let bucket = this.buckets.get(key);
      if (!bucket) this.buckets.set(key, (bucket = new Set()));
      bucket.add(o);
    }
  }
  private unindex(o: Obstacle) {
    this.touch(this.membership.get(o) ?? []);
    for (const key of this.membership.get(o) ?? []) {
      const bucket = this.buckets.get(key)!;
      bucket.delete(o);
      if (!bucket.size) this.buckets.delete(key);
    }
    this.membership.delete(o);
  }
  private track(o: Obstacle): Obstacle {
    const existing = this.tracked.get(o);
    if (existing) return existing;
    // Preserve add(original) semantics: callers may keep and move the original
    // object instead of the returned proxy. Spatial field writes must hit the index.
    for (const field of ['x', 'z', 'w', 'd', 'r', 'yaw', 'bottom', 'height', 'cameraOnly'] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(o, field);
      let value = o[field];
      Object.defineProperty(o, field, {
        configurable: true,
        enumerable: descriptor?.enumerable ?? false,
        get: () => value,
        set: (next: number | boolean | undefined) => {
          if(Object.is(value,next))return;
          const indexed = this.membership.has(handle);
          if (indexed) this.unindex(handle);
          value = next;
          if (!descriptor) Object.defineProperty(o, field, { enumerable: true });
          if (indexed) {
            this.index(handle);
            this.revision++;
          }
        },
      });
    }
    const handle = new Proxy(o, {
      set: (target, field, value) => {
        if(Object.is(Reflect.get(target,field),value))return true;
        const indexed = this.membership.has(handle);
        if (indexed) this.unindex(handle);
        const changed = Reflect.set(target, field, value);
        if (indexed) {
          this.index(handle);
          this.revision++;
        }
        return changed;
      },
      deleteProperty: (target, field) => {
        const indexed = this.membership.has(handle);
        if (indexed) this.unindex(handle);
        const changed = Reflect.deleteProperty(target, field);
        if (indexed) {
          this.index(handle);
          this.revision++;
        }
        return changed;
      },
    });
    this.tracked.set(o, handle);
    this.tracked.set(handle, handle);
    return handle;
  }
  private trackArray(initial: Obstacle[]) {
    return new Proxy(initial, {
      get: (target, field, receiver) => {
        if (field === 'push')
          return (...items: Obstacle[]) => {
            for (const item of items) {
              const handle = this.track(item);
              target.push(handle);
              this.index(handle);
              this.revision++;
            }
            return target.length;
          };
        if (
          typeof field === 'string' &&
          ['pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin'].includes(field)
        ) {
          return (...args: unknown[]) => {
            const method = Reflect.get(Array.prototype, field) as (...args: unknown[]) => unknown;
            const result = method.apply(target, args);
            for (let i = 0; i < target.length; i++) if (target[i]) target[i] = this.track(target[i]);
            this.reindex();
            return result === target ? receiver : result;
          };
        }
        return Reflect.get(target, field, receiver);
      },
      set: (target, field, value) => {
        if (field === 'length') {
          const changed = Reflect.set(target, field, value);
          this.reindex();
          return changed;
        } else if (typeof field === 'string' && /^\d+$/.test(field)) {
          value = this.track(value as Obstacle);
          const changed = Reflect.set(target, field, value);
          this.reindex();
          return changed;
        }
        return Reflect.set(target, field, value);
      },
      deleteProperty: (target, field) => {
        if (typeof field === 'string' && /^\d+$/.test(field) && target[Number(field)]) {
          const changed = Reflect.deleteProperty(target, field);
          this.reindex();
          return changed;
        }
        return Reflect.deleteProperty(target, field);
      },
    });
  }
  /** Conservative candidates; rotated-box/circle and height tests remain unchanged. */
  query(x0: number, z0: number, x1: number, z1: number) {
    const found = new Set<Obstacle>();
    for (const key of this.keys(x0, z0, x1, z1)) for (const o of this.buckets.get(key) ?? []) found.add(o);
    return found;
  }
  blocked(x: number, z: number, r = 0.28, y = 0): boolean {
    if (
      x < this.bounds.x0 + r ||
      x > this.bounds.x1 - r ||
      z < this.bounds.z0 + r ||
      z > this.bounds.z1 - r ||
      this.water(x, z)
    )
      return true;
    for (const o of this.query(x - r, z - r, x + r, z + r)) {
      if (o.cameraOnly) continue;
      if (y > (o.bottom || 0) + o.height || y + 1.5 < (o.bottom || 0)) continue;
      if (this.contains(o, x, z, r)) return true;
    }
    return false;
  }
  contains(o: Obstacle, x: number, z: number, r: number) {
    const dx = x - o.x,
      dz = z - o.z;
    if (o.r !== undefined) return dx * dx + dz * dz < (o.r + r) ** 2;
    const c = Math.cos(o.yaw || 0),
      s = Math.sin(o.yaw || 0),
      u = dx * c - dz * s,
      v = dx * s + dz * c;
    const qx = Math.max(Math.abs(u) - (o.w || 0) / 2, 0),
      qz = Math.max(Math.abs(v) - (o.d || 0) / 2, 0);
    return qx * qx + qz * qz < r * r;
  }
  move(pos: { x: number; z: number }, dx: number, dz: number, r = 0.28, y = 0) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.1));
    let hit = false;
    for (let i = 0; i < steps; i++) {
      const x = pos.x + dx / steps,
        z = pos.z + dz / steps;
      if (!this.blocked(x, z, r, y)) {
        pos.x = x;
        pos.z = z;
        continue;
      }
      hit = true;
      if (!this.blocked(x, pos.z, r, y)) pos.x = x;
      if (!this.blocked(pos.x, z, r, y)) pos.z = z;
    }
    return hit;
  }
  cameraDistance(
    start: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    distance: number,
    ground: (x: number, z: number) => number,
  ) {
    const endX = start.x + dir.x * distance,
      endZ = start.z + dir.z * distance;
    const candidates = this.query(
      Math.min(start.x, endX) - 0.2,
      Math.min(start.z, endZ) - 0.2,
      Math.max(start.x, endX) + 0.2,
      Math.max(start.z, endZ) + 0.2,
    );
    let allowed=distance;
    for(const o of candidates)if(o.cameraHull){
      let enter=0,leave=allowed;
      for(const p of o.cameraHull){
        const side=p.x*start.x+p.y*start.y+p.z*start.z+p.constant-.2;
        const along=p.x*dir.x+p.y*dir.y+p.z*dir.z;
        if(Math.abs(along)<1e-8){if(side>0){enter=Infinity;break;}continue;}
        const hit=-side/along;
        if(along<0)enter=Math.max(enter,hit);else leave=Math.min(leave,hit);
        if(enter>leave)break;
      }
      if(enter<=leave&&leave>=0)allowed=Math.min(allowed,Math.max(.28,enter-.04));
    }
    for (let t = 0.18; t < allowed; t += 0.12) {
      const x = start.x + dir.x * t,
        y = start.y + dir.y * t,
        z = start.z + dir.z * t;
      if (
        x < this.bounds.x0 + 0.15 ||
        x > this.bounds.x1 - 0.15 ||
        z < this.bounds.z0 + 0.15 ||
        z > this.bounds.z1 - 0.15
      )
        return Math.max(0.28, t - 0.18);
      if (y < ground(x, z) + 0.15) return Math.max(0.28, t - 0.18);
      for (const o of candidates)
        if (
          !o.cameraHull &&
          y > (o.bottom || 0) - 0.12 &&
          y < (o.bottom || 0) + o.height + 0.12 &&
          this.contains(o, x, z, 0.16)
        )
          return Math.max(0.28, t - 0.2);
    }
    return allowed;
  }
}
