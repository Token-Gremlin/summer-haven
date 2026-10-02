import type * as THREE from 'three';

interface Acc {
  sum: number;
  n: number;
  min: number;
  max: number;
}
interface Query {
  name: string;
  q: WebGLQuery;
  frame: number;
}

/**
 * Diagnostic only (?prof=1). CPU wall time, RAF delivery and asynchronous GPU elapsed time
 * are separate measurements, never added together. Main CPU stages contain pass CPU timings.
 * Pass counts include every attempted pass (including a reflection refresh that skips work).
 * Query latency and instrumentation overhead make this unsuitable as a production FPS baseline.
 */
export class Profiler {
  readonly on: boolean;
  private gl: WebGL2RenderingContext | null = null;
  private ext: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null = null;
  private pending: Query[] = [];
  private free: WebGLQuery[] = [];
  private open: Query | null = null;
  private gpu = new Map<string, Acc>();
  private cpu = new Map<string, Acc>();
  private calls = new Map<string, Acc>();
  private tris = new Map<string, Acc>();
  private interval = new Map<string, Acc>();
  private cpuT = 0;
  private cpuName: string | null = null;
  private pass: { name: string; start: number; calls: number; tris: number } | null = null;
  private frameT = 0;
  private lastRaf: number | null = null;
  private frames = 0;
  private frameSerial = 0;
  private since = 0;
  private disjoint = false;
  private disjointEvents = 0;
  private discarded = 0;
  private skipped = 0;
  private contextLost = false;
  private disposed = false;
  private readonly maxQueries = 128;
  private readonly maxQueryAge = 240;

  constructor(renderer: THREE.WebGLRenderer, on: boolean) {
    this.on = on;
    if (!on) return;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.gl = this.ext ? gl : null;
    this.since = performance.now();
  }

  private add(m: Map<string, Acc>, k: string, v: number): void {
    if (!Number.isFinite(v) || v < 0) return;
    let a = m.get(k);
    if (!a) {
      a = { sum: 0, n: 0, min: Infinity, max: -Infinity };
      m.set(k, a);
    }
    a.sum += v;
    a.n++;
    a.min = Math.min(a.min, v);
    a.max = Math.max(a.max, v);
  }

  /** GPU + CPU submission + renderer.info around one pass. Passes must not nest. */
  begin(name: string, renderer?: THREE.WebGLRenderer): void {
    if (!this.on || this.disposed || this.pass) return;
    this.pass = {
      name,
      start: performance.now(),
      calls: renderer?.info.render.calls ?? 0,
      tris: renderer?.info.render.triangles ?? 0,
    };
    if (!this.gl || !this.ext || this.disjoint || this.contextLost) return;
    if (!this.free.length && this.pending.length >= this.maxQueries) {
      this.skipped++;
      return;
    }
    const q = this.free.pop() ?? this.gl.createQuery();
    if (!q) {
      this.skipped++;
      return;
    }
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.open = { name, q, frame: this.frameSerial };
  }

  end(name: string, renderer?: THREE.WebGLRenderer): void {
    if (!this.on || !this.pass || this.pass.name !== name) return;
    this.add(this.cpu, `pass:${name}`, performance.now() - this.pass.start);
    if (renderer) {
      this.add(this.calls, name, renderer.info.render.calls - this.pass.calls);
      this.add(this.tris, name, renderer.info.render.triangles - this.pass.tris);
    }
    this.pass = null;
    if (!this.gl || !this.ext || !this.open) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.open);
    this.open = null;
  }

  /** Sequential main-thread stages: starting a new stage closes the preceding one. */
  cpuBegin(name: string): void {
    if (!this.on || this.disposed) return;
    const now = performance.now();
    if (this.cpuName !== null) this.add(this.cpu, this.cpuName, now - this.cpuT);
    this.cpuName = name;
    this.cpuT = now;
  }

  cpuEnd(): void {
    if (!this.on || this.cpuName === null) return;
    this.add(this.cpu, this.cpuName, performance.now() - this.cpuT);
    this.cpuName = null;
  }

  cpuMark(name: string, ms: number): void {
    if (this.on && !this.disposed) this.add(this.cpu, name, ms);
  }

  frameBegin(rafTimestamp: number): void {
    if (!this.on || this.disposed) return;
    this.frameT = performance.now();
    this.frameSerial++;
    if (this.lastRaf !== null) this.add(this.interval, 'raf', rafTimestamp - this.lastRaf);
    this.lastRaf = rafTimestamp;
    this.poll();
  }

  frameEnd(renderer: THREE.WebGLRenderer): void {
    if (!this.on || this.disposed) return;
    this.cpuEnd();
    this.add(this.cpu, 'frame-total', performance.now() - this.frameT);
    this.add(this.calls, 'frame-total', renderer.info.render.calls);
    this.add(this.tris, 'frame-total', renderer.info.render.triangles);
    this.frames++;
  }

  /** Never waits for GPU results. Disjoint invalidates every outstanding query. */
  poll(): void {
    if (!this.gl || !this.ext || this.disposed) return;
    const gl = this.gl;
    if (gl.isContextLost()) {
      this.contextLost = true;
      this.discarded += this.pending.length;
      this.pending.length = 0;
      this.free.length = 0;
      return;
    }
    // Query objects from a lost context cannot be reused, even after restoration.
    if (this.contextLost) return;
    const disjoint = !!gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    if (disjoint) {
      if (!this.disjoint) this.disjointEvents++;
      this.disjoint = true;
      this.clearPending();
      return;
    }
    this.disjoint = false;
    while (this.pending.length) {
      const p = this.pending[0];
      if (!gl.getQueryParameter(p.q, gl.QUERY_RESULT_AVAILABLE)) {
        if (this.frameSerial - p.frame <= this.maxQueryAge) break;
        gl.deleteQuery(p.q);
        this.discarded++;
        this.pending.shift();
        continue;
      }
      const ns = gl.getQueryParameter(p.q, gl.QUERY_RESULT) as number;
      this.add(this.gpu, p.name, ns / 1e6);
      this.free.push(p.q);
      this.pending.shift();
    }
  }

  private clearPending(): void {
    for (const p of this.pending) this.gl?.deleteQuery(p.q);
    this.discarded += this.pending.length;
    this.pending.length = 0;
  }

  /** Call between frames. No outstanding result from the old window enters the new one. */
  reset(): void {
    if (!this.on || this.disposed) return;
    if (this.open || this.pass) throw new Error('Reset the profiler between frames.');
    this.clearPending();
    this.gpu.clear();
    this.cpu.clear();
    this.calls.clear();
    this.tris.clear();
    this.interval.clear();
    this.cpuName = null;
    this.lastRaf = null;
    this.frames = 0;
    this.disjointEvents = 0;
    this.discarded = 0;
    this.skipped = 0;
    this.since = performance.now();
  }

  dispose(): void {
    if (this.open && this.gl && this.ext) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.gl.deleteQuery(this.open.q);
    }
    this.open = null;
    this.pass = null;
    this.clearPending();
    for (const q of this.free) this.gl?.deleteQuery(q);
    this.free.length = 0;
    this.disposed = true;
  }

  report() {
    const round = (n: number) => +n.toFixed(3);
    const avg = (m: Map<string, Acc>) =>
      Object.fromEntries([...m].map(([k, a]) => [k, round(a.sum / a.n)]));
    const details = (m: Map<string, Acc>) => Object.fromEntries([...m].map(([k, a]) => [k, {
      samples: a.n, mean: round(a.sum / a.n), min: round(a.min), max: round(a.max),
    }]));
    return {
      enabled: this.on,
      diagnostic: true,
      frames: this.frames,
      elapsedMs: this.on ? round(performance.now() - this.since) : 0,
      gpuStatus: this.disposed ? 'disposed' : !this.ext ? 'unsupported' : this.contextLost ? 'context-lost-reload-required' : this.disjoint ? 'disjoint' : 'available',
      gpuQueries: { pending: this.pending.length, pooled: this.free.length, limit: this.maxQueries,
        maxAgeFrames: this.maxQueryAge, skipped: this.skipped, discarded: this.discarded,
        disjointEvents: this.disjointEvents },
      gpuMs: avg(this.gpu), cpuMs: avg(this.cpu), calls: avg(this.calls), tris: avg(this.tris),
      samples: { gpuMs: details(this.gpu), cpuMs: details(this.cpu), calls: details(this.calls),
        tris: details(this.tris), frameIntervalMs: details(this.interval) },
      notes: [
        'CPU frame-total includes profiler overhead and GPU submission, not asynchronous GPU completion.',
        'pass:* CPU entries are nested within main CPU stages; do not sum them twice.',
        'GPU results are delayed; pending, discarded and unsupported samples are not zero milliseconds.',
        'RAF delivery intervals are separate from CPU execution and GPU pass durations.',
        'Reflection counts and times include attempts that reuse the preceding reflection.',
      ],
    };
  }
}
