import type { Vector3 } from 'three';
import { ferryRoute } from '../data/ferry';
import { mulberry32 } from './dsp';

const unit = (v: number) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
type Position = Pick<Vector3, 'x' | 'y' | 'z'>;

/** Finite, soft-edged spatial falloff; yaw follows the existing DragonVoice convention. */
export function landmarkPlacement(source: Position, listener: Position, yaw: number, radius: number) {
  const dx = source.x - listener.x, dy = source.y - listener.y, dz = source.z - listener.z;
  const distance = Math.hypot(dx, dy, dz);
  if (!Number.isFinite(distance) || !Number.isFinite(yaw)) return { gain: 0, pan: 0, near: 0 };
  const edge = unit(1 - distance / radius);
  return { gain: edge * edge / (1 + (distance / (radius * .28)) ** 2),
    pan: Math.max(-.85, Math.min(.85, (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(distance, 1))),
    near: unit(1 - distance / 75) };
}

interface WaterLayer { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode; pan: StereoPannerNode }

/** Local sounds join SoundEngine.output AFTER its master gain: caller supplies master × bus volumes. */
export class LandmarksAudio {
  private readonly waterBus: GainNode;
  private readonly ferryBus: GainNode;
  private readonly ferryPan: StereoPannerNode;
  private readonly layers: WaterLayer[] = [];
  private readonly oar: AudioBuffer;
  private readonly creak: AudioBuffer;
  private readonly active = new Map<AudioBufferSourceNode, GainNode>();
  private readonly volumeTargets = new Map<AudioParam, number>();
  private lastClock: number | null = null;
  private disposed = false;

  constructor(private readonly context: AudioContext, destination: AudioNode) {
    this.waterBus = context.createGain(); this.waterBus.gain.value = 0; this.waterBus.connect(destination);
    this.ferryBus = context.createGain(); this.ferryBus.gain.value = 0;
    this.ferryPan = context.createStereoPanner(); this.ferryBus.connect(this.ferryPan).connect(destination);
    // Three independent, warm noise bands: distant body, falling sheet, close spray.
    // Periodic crossfades remove the seam; the small fixed 24 kHz buffers are reused forever.
    for (let i = 0; i < 3; i++) {
      const source = context.createBufferSource(), filter = context.createBiquadFilter();
      const gain = context.createGain(), pan = context.createStereoPanner();
      source.buffer = this.noiseLoop(i); source.loop = true;
      filter.type = i === 0 ? 'lowpass' : 'bandpass'; filter.frequency.value = [340, 850, 2400][i]; filter.Q.value = .5;
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(pan).connect(this.waterBus); source.start();
      this.layers.push({ source, filter, gain, pan });
    }
    this.oar = this.ferryBuffer(false); this.creak = this.ferryBuffer(true);
  }

  private noiseLoop(layer: number) {
    const sr = 24000, size = sr * (7 + layer), overlap = sr / 2;
    const buffer = this.context.createBuffer(1, size, sr), data = buffer.getChannelData(0);
    const raw = new Float32Array(size + overlap), random = mulberry32(651 + layer);
    let low = 0;
    for (let i = 0; i < raw.length; i++) {
      const n = random() * 2 - 1; low = .94 * low + .06 * n;
      raw[i] = layer === 0 ? low * 3.2 : layer === 1 ? low * 1.8 + n * .22 : n * .55;
    }
    let peak = 1;
    for (let i = 0; i < size; i++) {
      const u = Math.min(1, i / overlap), blend = u * u * (3 - 2 * u);
      data[i] = i < overlap ? raw[size + i] * (1 - blend) + raw[i] * blend : raw[i];
      peak = Math.max(peak, Math.abs(data[i]));
    }
    for (let i = 0; i < size; i++) data[i] *= .85 / peak;
    return buffer;
  }

  private ferryBuffer(wood: boolean) {
    const sr = 24000, duration = wood ? .66 : .92;
    const buffer = this.context.createBuffer(1, Math.round(sr * duration), sr), data = buffer.getChannelData(0);
    const random = mulberry32(wood ? 323 : 924); let low = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / sr, u = t / duration, envelope = Math.sin(Math.PI * u) ** 2;
      low = low * .91 + (random() * 2 - 1) * .09;
      // A quiet wet pull or a short irregular wooden groan, with no sustained motor tone.
      data[i] = envelope * (wood
        ? .16 * Math.sin(2 * Math.PI * (155 * t - 28 * t * t) + .7 * Math.sin(t * 51)) + low * .13
        : low * (1.1 + .22 * Math.sin(t * 29)));
    }
    return buffer;
  }

  private glide(param: AudioParam, value: number, seconds = .18) {
    param.setTargetAtTime(value, this.context.currentTime, seconds);
  }

  private volume(param: AudioParam, value: number) {
    if (this.volumeTargets.get(param) === value) return;
    this.volumeTargets.set(param, value);
    const now = this.context.currentTime;
    if (value === 0) {
      // Exact silence, including an already playing one-shot, without a gain discontinuity.
      param.cancelAndHoldAtTime(now); param.linearRampToValueAtTime(0, now + .03);
    } else this.glide(param, value, .12);
  }

  update(listener: Vector3, yaw: number, clockSeconds: number, inside: boolean, ambienceVolume: number, effectsVolume: number) {
    if (this.disposed) return;
    const valid = Number.isFinite(clockSeconds) && [listener.x, listener.y, listener.z, yaw].every(Number.isFinite);
    const ambience = valid ? unit(ambienceVolume) : 0, effects = valid ? unit(effectsVolume) : 0;
    this.volume(this.waterBus.gain, ambience * (inside ? .07 : 1));
    this.volume(this.ferryBus.gain, effects * (inside ? .1 : 1));
    if (!valid) { this.lastClock = null; return; }
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const spatial = landmarkPlacement({ x: 366 + (i - 1) * 7, y: 18 + i * 12, z: -708 }, listener, yaw, 240);
      const swell = .94 + .06 * Math.sin(clockSeconds * (.27 + i * .09) + i * 2);
      this.glide(layer.gain.gain, spatial.gain * [.26, .16, .045][i] * swell * (i === 2 ? spatial.near : 1), .45);
      this.glide(layer.pan.pan, spatial.pan * .8, .18);
      this.glide(layer.filter.frequency, [260 + 180 * spatial.near, 480 + 700 * spatial.near, 1400 + 1700 * spatial.near][i], .4);
    }
    const route = ferryRoute(clockSeconds), spatial = landmarkPlacement(route, listener, yaw, 48);
    this.glide(this.ferryPan.pan, spatial.pan);
    const previous = this.lastClock; this.lastClock = clockSeconds;
    // Only crossings of the actual 2.8 s oar cycle play. Resume/teleport never catches up missed strokes.
    if (previous === null || clockSeconds <= previous || clockSeconds - previous > .5 || route.docked || route.rowing < .1 || effects === 0 || spatial.gain < .002) return;
    const stroke = Math.floor((clockSeconds - .7) / 2.8);
    if (stroke !== Math.floor((previous - .7) / 2.8)) {
      this.play(this.oar, spatial.gain * route.rowing * .16, 1 + .025 * Math.sin(stroke * 2.7));
      if (stroke % 3 === 0) this.play(this.creak, spatial.gain * route.rowing * .065, .98 + .04 * Math.sin(stroke));
    }
  }

  private play(buffer: AudioBuffer, volume: number, rate: number) {
    if (this.active.size >= 4) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer; source.playbackRate.value = rate; gain.gain.value = volume;
    source.connect(gain).connect(this.ferryBus); this.active.set(source, gain);
    source.onended = () => { source.disconnect(); gain.disconnect(); this.active.delete(source); };
    source.start(); source.stop(this.context.currentTime + buffer.duration / rate + .02);
  }

  dispose() {
    if (this.disposed) return; this.disposed = true;
    for (const layer of this.layers) {
      layer.source.stop(); layer.source.disconnect(); layer.filter.disconnect(); layer.gain.disconnect(); layer.pan.disconnect();
    }
    for (const [source, gain] of this.active) { source.onended = null; source.stop(); source.disconnect(); gain.disconnect(); }
    this.active.clear(); this.waterBus.disconnect(); this.ferryBus.disconnect(); this.ferryPan.disconnect();
  }
}
