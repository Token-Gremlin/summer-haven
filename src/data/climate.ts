import type { Quality } from '../core/save';

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export const WEATHERS = ['fair', 'cloudy', 'rain', 'snow'] as const;
export type Season = (typeof SEASONS)[number];
export type Weather = (typeof WEATHERS)[number];
export interface ClimateOptions {
  season: Season;
  weather: Weather;
  intensity: number;
  clouds: number;
  wind: number;
  direction: number;
  automatic: boolean;
}
export const DEFAULT_CLIMATE: ClimateOptions = {
  season: 'summer',
  weather: 'fair',
  intensity: 0.65,
  clouds: 0.46,
  wind: 0.35,
  direction: 125,
  automatic: false,
};
const unit = (v: unknown, fallback: number, max = 1) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : fallback;
export function validateClimate(value: unknown): ClimateOptions {
  const r =
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    season: SEASONS.includes(r.season as Season) ? (r.season as Season) : 'summer',
    weather: WEATHERS.includes(r.weather as Weather) ? (r.weather as Weather) : 'fair',
    intensity: unit(r.intensity, DEFAULT_CLIMATE.intensity),
    clouds: unit(r.clouds, DEFAULT_CLIMATE.clouds),
    wind: unit(r.wind, DEFAULT_CLIMATE.wind),
    direction: unit(r.direction, DEFAULT_CLIMATE.direction, 360),
    automatic: r.automatic === true,
  };
}
/** Bounded GPU work. The landscape itself is never rebuilt when weather/quality changes. */
export const CLIMATE_BUDGET: Record<
  Quality,
  {
    skyWidth: number;
    skySteps: number;
    skyHz: number;
    rain: number;
    snow: number;
    drift: number;
    splashes: number;
  }
> = {
  low: { skyWidth: 384, skySteps: 12, skyHz: 3, rain: 700, snow: 350, drift: 80, splashes: 90 },
  medium: { skyWidth: 640, skySteps: 18, skyHz: 4, rain: 1800, snow: 850, drift: 160, splashes: 220 },
  high: { skyWidth: 896, skySteps: 24, skyHz: 5, rain: 4200, snow: 2100, drift: 320, splashes: 450 },
  ultra: { skyWidth: 1280, skySteps: 32, skyHz: 6, rain: 8500, snow: 4400, drift: 520, splashes: 800 },
};

export interface ClimateState {
  season: [number, number, number, number];
  coverage: number;
  overcast: number;
  rain: number;
  snowfall: number;
  wetness: number;
  snow: number;
  wind: number;
  gust: number;
  direction: number;
  clock: number;
  windPhase: number;
  travel: [number, number];
}
const damp = (from: number, to: number, dt: number, seconds: number) =>
  from + (to - from) * (1 - Math.exp(-dt / seconds));
/** Slow, repeatable fronts are tied to the saved world clock, never to frame count. */
export function climateTarget(options: ClimateOptions, worldSeconds: number) {
  let { weather, clouds, intensity } = options;
  if (options.automatic) {
    const front = 0.5 + 0.33 * Math.sin(worldSeconds / 165 + 1.7) + 0.17 * Math.sin(worldSeconds / 57);
    clouds = 0.22 + front * 0.68;
    weather =
      front > 0.71 ? (options.season === 'winter' ? 'snow' : 'rain') : front > 0.49 ? 'cloudy' : 'fair';
    intensity *= Math.max(0.2, (front - 0.55) * 2.6);
  }
  const precipitation = weather === 'rain' || weather === 'snow';
  return {
    coverage: precipitation ? Math.max(0.85, clouds) : weather === 'cloudy' ? Math.max(0.72, clouds) : clouds,
    overcast: precipitation ? 0.88 : weather === 'cloudy' ? 0.68 : Math.max(0, clouds - 0.65) * 0.9,
    rain: weather === 'rain' ? intensity : 0,
    snowfall: weather === 'snow' ? intensity : 0,
    snow: options.season === 'winter' ? 0.83 : weather === 'snow' ? 0.55 : 0,
  };
}
export class ClimateModel {
  readonly state: ClimateState;
  constructor(options: ClimateOptions = DEFAULT_CLIMATE, worldSeconds = 0) {
    const target = climateTarget(options, worldSeconds);
    this.state = {
      ...target,
      season: SEASONS.map((s) => Number(s === options.season)) as ClimateState['season'],
      wetness: target.rain * 0.8,
      wind: options.wind,
      gust: 1,
      direction: (options.direction * Math.PI) / 180,
      clock: worldSeconds,
      windPhase: worldSeconds,
      travel: [0, 0],
    };
  }
  update(dt: number, options: ClimateOptions, worldSeconds: number) {
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
    const s = this.state,
      t = climateTarget(options, worldSeconds);
    s.clock += dt;
    for (let i = 0; i < 4; i++)
      s.season[i] = damp(s.season[i], Number(SEASONS[i] === options.season), dt, 2.4);
    for (const k of ['coverage', 'overcast', 'rain', 'snowfall'] as const) s[k] = damp(s[k], t[k], dt, 3.2);
    s.wetness = damp(s.wetness, s.rain > 0.02 ? Math.min(1, s.rain * 1.25) : 0, dt, s.rain > 0.02 ? 5 : 38);
    // Choosing a season previews its settled landscape; precipitation adds a softer fresh layer.
    s.snow = damp(s.snow, Math.min(1, t.snow + s.snowfall * 0.16), dt, 5);
    s.wind = damp(s.wind, options.wind, dt, 2);
    const angle = (options.direction * Math.PI) / 180;
    const delta = Math.atan2(Math.sin(angle - s.direction), Math.cos(angle - s.direction));
    s.direction += delta * (1 - Math.exp(-dt / 2));
    s.gust = 0.72 + 0.2 * Math.sin(s.clock * 0.31) + 0.08 * Math.sin(s.clock * 0.93 + 2);
    s.windPhase += dt * (0.35 + s.wind * 2.1);
    const speed = s.wind * (3 + 7 * s.gust);
    s.travel[0] += Math.sin(s.direction) * speed * dt;
    s.travel[1] -= Math.cos(s.direction) * speed * dt;
    return s;
  }
}
