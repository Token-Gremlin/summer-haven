import type { ClimateState } from '../data/climate';
/** Filtered, decorrelated rain beds; no network assets, timers or per-drop voices. */
export class WeatherAudio {
  private rain: GainNode;
  private low: GainNode;
  private filter: BiquadFilterNode;
  constructor(
    private context: AudioContext,
    output: AudioNode,
  ) {
    this.rain = context.createGain();
    this.low = context.createGain();
    this.filter = context.createBiquadFilter();
    const buffer = context.createBuffer(2, context.sampleRate * 4, context.sampleRate);
    let seed = 18327;
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      let pink = 0;
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const white = (seed / 4294967296) * 2 - 1;
        pink = 0.94 * pink + 0.06 * white;
        data[i] = white * 0.42 + pink * 1.4;
      }
    }
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 6500;
    const high = context.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 1100;
    const lowFilter = context.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.value = 420;
    noise.connect(this.filter);
    this.filter.connect(high);
    high.connect(this.rain);
    this.rain.connect(output);
    noise.connect(lowFilter);
    lowFilter.connect(this.low);
    this.low.connect(output);
    this.rain.gain.value = this.low.gain.value = 0;
    noise.start();
  }
  update(state: ClimateState, volume: number, inside: boolean) {
    const now = this.context.currentTime;
    this.rain.gain.setTargetAtTime(state.rain * volume * (inside ? 0.025 : 0.1), now, 0.3);
    this.low.gain.setTargetAtTime(state.rain * volume * (inside ? 0.045 : 0.09), now, 0.5);
    this.filter.frequency.setTargetAtTime(inside ? 1100 : 5000 + state.rain * 3200, now, 0.4);
  }
}
