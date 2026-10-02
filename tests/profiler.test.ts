import { test } from 'node:test';
import assert from 'node:assert/strict';
import type * as THREE from 'three';
import { Profiler } from '../src/render/profiler.ts';

function fixture(supported = true) {
  let serial = 0;
  const deleted = new Set<object>();
  const state = { available: false, disjoint: false, lost: false, result: 2_000_000, created: 0, queries: 0 };
  const ext = { TIME_ELAPSED_EXT: 1, GPU_DISJOINT_EXT: 2 };
  const gl = {
    QUERY_RESULT_AVAILABLE: 3, QUERY_RESULT: 4,
    getExtension: () => supported ? ext : null,
    createQuery: () => { state.created++; return { id: ++serial }; },
    deleteQuery: (q: object) => deleted.add(q),
    beginQuery: () => { state.queries++; },
    endQuery: () => {},
    isContextLost: () => state.lost,
    getParameter: () => state.disjoint,
    getQueryParameter: (_q: object, kind: number) => kind === 3 ? state.available : state.result,
  };
  const renderer = { getContext: () => gl, info: { render: { calls: 0, triangles: 0 } } } as unknown as THREE.WebGLRenderer;
  const profiler = new Profiler(renderer, true);
  const pass = (name = 'scene') => {
    profiler.begin(name, renderer);
    renderer.info.render.calls += 3;
    renderer.info.render.triangles += 200;
    profiler.end(name, renderer);
  };
  return { profiler, renderer, state, deleted, pass };
}

test('unsupported GPU timers still report CPU and draw counts without fabricated GPU zeros', () => {
  const { profiler, pass } = fixture(false);
  pass();
  const report = profiler.report();
  assert.equal(report.gpuStatus, 'unsupported');
  assert.deepEqual(report.gpuMs, {});
  assert.equal(report.calls.scene, 3);
  assert.equal(report.tris.scene, 200);
  assert.equal(report.samples.cpuMs['pass:scene'].samples, 1);
});

test('asynchronous queries remain bounded while the driver withholds every result', () => {
  const { profiler, state, pass } = fixture();
  for (let i = 0; i < 500; i++) pass();
  assert.equal(state.created, 128);
  assert.equal(profiler.report().gpuQueries.pending, 128);
  assert.equal(profiler.report().gpuQueries.skipped, 372);
});

test('disjoint drops unavailable pending queries instead of admitting them on a later poll', () => {
  const { profiler, state, pass, deleted } = fixture();
  pass();
  state.disjoint = true;
  profiler.poll();
  assert.equal(deleted.size, 1);
  assert.equal(profiler.report().gpuQueries.disjointEvents, 1);
  state.disjoint = false;
  state.available = true;
  profiler.poll();
  assert.deepEqual(profiler.report().gpuMs, {});
  pass();
  profiler.poll();
  assert.equal(profiler.report().samples.gpuMs.scene.samples, 1);
  assert.equal(profiler.report().gpuMs.scene, 2);
});

test('reset removes outstanding results and resets RAF window provenance', () => {
  const { profiler, renderer, state, pass, deleted } = fixture();
  profiler.frameBegin(100);
  pass();
  profiler.frameEnd(renderer);
  profiler.reset();
  assert.equal(deleted.size, 1);
  state.available = true;
  profiler.frameBegin(1_000);
  profiler.frameEnd(renderer);
  const report = profiler.report();
  assert.deepEqual(report.gpuMs, {});
  assert.deepEqual(report.samples.frameIntervalMs, {});
  assert.equal(report.frames, 1);
});

test('stale unavailable queries expire without waiting or unbounded memory', () => {
  const { profiler, renderer, pass, deleted } = fixture();
  profiler.frameBegin(0);
  pass();
  profiler.frameEnd(renderer);
  for (let i = 1; i <= 241; i++) {
    profiler.frameBegin(i * 16);
    profiler.frameEnd(renderer);
  }
  assert.equal(profiler.report().gpuQueries.pending, 0);
  assert.equal(profiler.report().gpuQueries.discarded, 1);
  assert.equal(deleted.size, 1);
});

test('loss of context prevents reuse of invalid query handles', () => {
  const { profiler, state, pass } = fixture();
  pass();
  state.lost = true;
  profiler.poll();
  state.lost = false;
  pass();
  profiler.poll();
  assert.equal(state.created, 1);
  assert.equal(profiler.report().gpuStatus, 'context-lost-reload-required');
  assert.deepEqual(profiler.report().gpuMs, {});
});

test('completed query handles are recycled and disposal releases all handles', () => {
  const { profiler, state, pass, deleted } = fixture();
  state.available = true;
  for (let i = 0; i < 5; i++) { pass(); profiler.poll(); }
  assert.equal(state.created, 1);
  assert.equal(profiler.report().samples.gpuMs.scene.samples, 5);
  profiler.dispose();
  assert.equal(deleted.size, 1);
  assert.equal(profiler.report().gpuQueries.pending, 0);
  assert.equal(profiler.report().gpuQueries.pooled, 0);
});

test('disabled profiler never touches the renderer context', () => {
  const renderer = { getContext: () => { throw new Error('disabled profiler touched renderer'); } } as unknown as THREE.WebGLRenderer;
  const profiler = new Profiler(renderer, false);
  profiler.frameBegin(0);
  profiler.cpuBegin('unused');
  profiler.begin('unused', renderer);
  profiler.end('unused', renderer);
  profiler.frameEnd(renderer);
  assert.equal(profiler.report().frames, 0);
  assert.deepEqual(profiler.report().cpuMs, {});
});
