import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { LandmarksAudio, landmarkPlacement } from '../src/sound/landmarks';
import { ferryRoute } from '../src/data/ferry';

class Param {
  value = 0;
  calls: number[] = [];
  setTargetAtTime(v: number) { assert.ok(Number.isFinite(v)); this.calls.push(v); this.value = v; }
  cancelAndHoldAtTime() {}
  linearRampToValueAtTime(v: number) { this.setTargetAtTime(v); }
}
class Node {
  gain = new Param(); pan = new Param(); frequency = new Param(); Q = new Param(); playbackRate = new Param();
  buffer: { duration: number } | null = null; loop = false; stopped = false; disconnected = false;
  onended: (() => void) | null = null;
  connect(n: Node) { return n; }
  disconnect() { this.disconnected = true; }
  start() {}
  stop() { this.stopped = true; }
}
function setup() {
  const nodes: Node[] = [], sources: Node[] = [], buffers: Float32Array[] = [];
  const make = () => { const n = new Node(); nodes.push(n); return n; };
  const context = { currentTime: 0, sampleRate: 48000,
    createGain: make, createStereoPanner: make, createBiquadFilter: make,
    createBufferSource: () => { const n = make(); sources.push(n); return n; },
    createBuffer: (_channels: number, length: number, sr: number) => {
      const data = new Float32Array(length); buffers.push(data); return { duration: length / sr, getChannelData: () => data };
    } };
  const audio = new LandmarksAudio(context as unknown as AudioContext, new Node() as unknown as AudioNode);
  return { audio, nodes, sources, buffers };
}

test('landmarks have finite spatial attenuation, yaw-dependent pan, and silent distant bounds', () => {
  const listener = new Vector3();
  const near = landmarkPlacement(new Vector3(10, 0, 0), listener, 0, 240);
  const far = landmarkPlacement(new Vector3(150, 0, 0), listener, 0, 240);
  assert.ok(near.gain > far.gain && near.pan > 0);
  assert.ok(landmarkPlacement(new Vector3(10, 0, 0), listener, Math.PI, 240).pan < 0);
  assert.equal(landmarkPlacement(new Vector3(240, 0, 0), listener, 0, 240).gain, 0);
  assert.equal(landmarkPlacement(new Vector3(NaN, 0, 0), listener, 0, 240).gain, 0);
});

test('fixed synthesis budget, bounded strokes, mute, invalid input and disposal', () => {
  const { audio, nodes, sources, buffers } = setup();
  assert.equal(buffers.length, 5);
  assert.ok(buffers.reduce((sum, b) => sum + b.byteLength, 0) < 2_600_000);
  for (const data of buffers) for (const value of data) assert.ok(Number.isFinite(value) && Math.abs(value) < 1);
  const route = ferryRoute(28.7), listener = new Vector3(route.x, route.y + 1, route.z);
  audio.update(listener, 0, 28.6, false, 1, 1);
  audio.update(listener, 0, 28.71, false, 1, 1);
  assert.equal(sources.length, 4, 'one oar pull across the .7 phase; no startup stroke');
  const shot = sources[3]; shot.onended!(); assert.ok(shot.disconnected);
  audio.update(listener, 0, 31.4, false, 1, 1);
  assert.equal(sources.length, 4, 'clock jump does not catch up missed events');
  audio.update(listener, 0, 31.5, false, 0, 0);
  const count = nodes[0].gain.calls.length;
  audio.update(listener, 0, 31.6, false, 0, 0);
  assert.equal(nodes[0].gain.calls.length, count, 'mute ramp is not indefinitely restarted');
  assert.equal(nodes[0].gain.value, 0); assert.equal(nodes[1].gain.value, 0);
  audio.update(listener, 0, 32, true, 1, 1);
  assert.equal(nodes[0].gain.value, .07); assert.equal(nodes[1].gain.value, .1);
  audio.update(listener, NaN, Infinity, false, NaN, Infinity);
  assert.equal(nodes[0].gain.value, 0); assert.equal(nodes[1].gain.value, 0);
  audio.dispose(); audio.dispose();
  assert.ok(nodes.every(n => n.disconnected));
  audio.update(listener, 0, 34.31, false, 1, 1); assert.equal(sources.length, 4);
});

test('ferry remains quiet at a landing and one-shot concurrency stays bounded', () => {
  const { audio, sources } = setup();
  for (let t = 0; t < 80; t += .1) {
    const route = ferryRoute(t);
    audio.update(new Vector3(route.x, route.y, route.z), 0, t, false, 1, 1);
    if (t < 18) assert.equal(sources.length, 3);
  }
  assert.ok(sources.length <= 7, 'three fixed loops plus at most four unfinished one-shots');
  audio.dispose();
});
