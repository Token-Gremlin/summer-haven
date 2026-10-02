import * as T from 'three';
import { ClimateModel, type ClimateOptions } from '../data/climate';
import type { Settings } from '../core/save';
import { G } from '../render/materials';
import { CLIMATE } from '../render/climate-uniforms';
import { Precipitation } from '../render/precipitation';
import { WeatherSurface } from './weather-surface';
import type { Collision } from './collision';

/** Coordinates atmospheric light, surface response and precipitation. Terrain/asset
 * geometry remains unchanged, including when jumping directly between seasons. */
export class Climate {
  readonly model: ClimateModel;
  readonly precipitation: Precipitation;
  private readonly grey = new T.Color();
  constructor(
    options: ClimateOptions,
    worldSeconds: number,
    collision: Collision,
    ground: (x: number, z: number) => number,
  ) {
    this.model = new ClimateModel(options, worldSeconds);
    this.precipitation = new Precipitation(new WeatherSurface(collision, ground));
  }
  advance(dt: number, options: ClimateOptions, worldSeconds: number, outside: boolean) {
    const s = this.model.update(dt, options, worldSeconds);
    CLIMATE.uSeason.value.fromArray(s.season);
    CLIMATE.uClimateOutside.value = outside ? 1 : 0;
    CLIMATE.uWetness.value = s.wetness;
    CLIMATE.uSnowCover.value = outside ? s.snow : 0;
    CLIMATE.uRain.value = s.rain;
    CLIMATE.uSnowfall.value = s.snowfall;
    CLIMATE.uCloudCover.value = s.coverage;
    CLIMATE.uOvercast.value = s.overcast;
    CLIMATE.uWindStrength.value = outside ? s.wind : 0;
    CLIMATE.uWindPhase.value = s.windPhase;
    CLIMATE.uWindTravel.value.fromArray(s.travel);
    CLIMATE.uWeatherTime.value = s.clock;
    G.uWindDir.value.set(Math.sin(s.direction), -Math.cos(s.direction));
    if (!outside) return;
    // TimeOfDay rewrites the base light immediately before this; never compound a tint.
    const cloud = s.overcast,
      night = G.uNight.value;
    const neutral = 1 - night * 0.72;
    const winter = s.season[3];
    G.uSkyZenith.value.lerp(this.grey.setRGB(0.12, 0.24, 0.39), 0.38 * (1 - night));
    G.uSkyMid.value.lerp(this.grey.setRGB(0.28, 0.43, 0.59), 0.32 * (1 - night));
    for (const [key, factor] of [
      ['uSkyZenith', 0.31],
      ['uSkyMid', 0.42],
      ['uSkyHorizon', 0.57],
    ] as const) {
      G[key].value.lerp(
        this.grey.setRGB(factor * neutral * 0.91, factor * neutral * 0.97, factor * neutral),
        cloud * 0.86,
      );
    }
    G.uSunColor.value.lerp(this.grey.setRGB(0.61 * neutral, 0.66 * neutral, 0.7 * neutral), cloud * 0.8);
    G.uCloudLow.value.lerp(
      this.grey.setRGB(0.3 * neutral, 0.36 * neutral, 0.43 * neutral),
      0.68 * (1 - night * 0.5),
    );
    G.uCloudMid.value.lerp(
      this.grey.setRGB(0.62 * neutral, 0.68 * neutral, 0.73 * neutral),
      0.4 * (1 - night * 0.5),
    );
    G.uShadowTint.value.lerp(this.grey.setRGB(0.43, 0.47, 0.51), cloud * 0.75);
    G.uRimColor.value.multiplyScalar(1 - cloud * 0.83);
    G.uSunDisk.value.multiplyScalar(1 - cloud * 0.94);
    G.uSunGlowAmt.value.multiplyScalar(1 - cloud * 0.88);
    G.uHorizGlowK.value.x *= 1 - cloud * 0.8;
    G.uGlint.value *= 1 - cloud * 0.92;
    G.uFogColor.value.lerp(this.grey.setRGB(0.49 * neutral, 0.55 * neutral, 0.59 * neutral), cloud * 0.75);
    G.uFogDensity.value += s.rain * 0.0032 + s.snowfall * 0.004 + cloud * 0.001;
    G.uWorldTint.value.lerp(this.grey.setRGB(0.93, 0.97, 1), winter * 0.1 * (1 - night));
  }
  update(settings: Settings, outside: boolean, eye: T.Vector3) {
    this.precipitation.update(this.model.state, settings.quality, outside, eye);
  }
  stats() {
    return { state: this.model.state, ...this.precipitation.stats() };
  }
}
