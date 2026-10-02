import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {
  CLIMATE_BUDGET,
  DEFAULT_CLIMATE,
  ClimateModel,
  climateTarget,
  validateClimate,
  SEASONS,
  WEATHERS,
} from '../src/data/climate';
import { freshSave, validateSave } from '../src/core/save';
import { Collision } from '../src/world/collision';
import { WeatherSurface, precipitationHeight } from '../src/world/weather-surface';

test('old saves migrate to summer and corrupt weather input cannot poison the simulation', () => {
  const old = freshSave();
  delete (old as any).climate;
  assert.deepEqual(validateSave(old).climate, DEFAULT_CLIMATE);
  const bad = validateClimate({
    season: 'monsoon',
    weather: 'fire',
    wind: NaN,
    clouds: Infinity,
    intensity: -7,
    direction: 999,
    automatic: 'yes',
  });
  assert.deepEqual(bad, { ...DEFAULT_CLIMATE, intensity: 0, direction: 360 });
  for (const season of SEASONS)
    for (const weather of WEATHERS) {
      const save = freshSave();
      save.climate = { ...DEFAULT_CLIMATE, season, weather, wind: 0.72 };
      assert.deepEqual(validateSave(JSON.parse(JSON.stringify(save))).climate, save.climate);
    }
});
test('season changes blend continuously, keep normalized weights and leave summer reversible', () => {
  const model = new ClimateModel();
  const winter = { ...DEFAULT_CLIMATE, season: 'winter' as const, weather: 'snow' as const };
  model.update(1 / 60, winter, 0);
  assert.ok(model.state.season[3] > 0 && model.state.season[3] < 0.01);
  for (let i = 0; i < 3600; i++) {
    const s = model.update(1 / 60, winter, i / 60);
    assert.ok(Math.abs(s.season.reduce((a, b) => a + b, 0) - 1) < 1e-8);
    for (const value of [s.rain, s.snowfall, s.snow, s.coverage, s.overcast, s.wind, s.wetness])
      assert.ok(value >= 0 && value <= 1);
  }
  assert.ok(model.state.snow > 0.85 && model.state.season[3] > 0.99);
  for (let i = 0; i < 3600; i++) model.update(1 / 60, DEFAULT_CLIMATE, 60 + i / 60);
  assert.ok(model.state.snow < 0.001 && model.state.season[1] > 0.99);
});
test('weather fronts are repeatable and frame-rate independent within their integration tolerance', () => {
  const options = { ...DEFAULT_CLIMATE, weather: 'rain' as const, wind: 0.84 };
  const a = new ClimateModel(),
    b = new ClimateModel();
  for (let i = 0; i < 1800; i++) a.update(1 / 30, options, i / 30);
  for (let i = 0; i < 3600; i++) b.update(1 / 60, options, i / 60);
  for (const key of ['rain', 'snowfall', 'coverage', 'overcast', 'wetness', 'wind'] as const)
    assert.ok(Math.abs(a.state[key] - b.state[key]) < 0.002, key);
  const auto = { ...options, automatic: true };
  assert.deepEqual(climateTarget(auto, 520), climateTarget(auto, 520));
  assert.notDeepEqual(climateTarget(auto, 520), climateTarget(auto, 300));
});
test('rain wets surfaces and dries gradually; zero wind eventually stops transport', () => {
  const options = { ...DEFAULT_CLIMATE, weather: 'rain' as const, wind: 0 };
  const model = new ClimateModel(options);
  for (let i = 0; i < 600; i++) model.update(1 / 60, options, 0);
  const wet = model.state.wetness;
  assert.ok(wet > 0.6);
  assert.deepEqual(model.state.travel, [0, 0]);
  const clear = { ...options, weather: 'fair' as const };
  model.update(0.1, clear, 0);
  assert.ok(model.state.wetness > wet - 0.005);
  for (let i = 0; i < 12000; i++) model.update(1 / 60, clear, 0);
  assert.ok(model.state.wetness < 0.01);
});
test('wind direction takes the short arc across north and malformed deltas do not advance the clock', () => {
  const model = new ClimateModel({ ...DEFAULT_CLIMATE, direction: 355 });
  model.update(0.1, { ...DEFAULT_CLIMATE, direction: 5 }, 0);
  assert.ok(model.state.direction > (355 * Math.PI) / 180 && model.state.direction < (356 * Math.PI) / 180);
  const state = JSON.stringify(model.state);
  model.update(NaN, DEFAULT_CLIMATE, 0);
  assert.equal(JSON.stringify(model.state), state);
});
test('precipitation catchment stops at rotated roofs, raised decks and terrain without treating crowns or wildlife as solid roofs', () => {
  const roof = { x: 0, z: 0, w: 8, d: 3, yaw: Math.PI / 4, bottom: 2, height: 5 };
  const crown = { x: 0, z: 0, w: 10, d: 10, bottom: 8, height: 5, cameraOnly: true };
  const deer = { x: 0, z: 0, r: 2, height: 20, tag: 'deer' };
  assert.equal(precipitationHeight(0, 0, 1, [roof, crown, deer]), 7);
  assert.equal(precipitationHeight(3, 3, 1, [roof]), 1);
  assert.equal(precipitationHeight(3, -3, 1, [roof]), 1);
  assert.equal(precipitationHeight(1, -1, 1, [roof]), 7);
  assert.equal(precipitationHeight(0, 0, 12, [roof]), 12);
  const collision = new Collision();
  collision.add(roof);
  collision.add({ ...crown, tag: 'village-tree-canopy' });
  const surface = new WeatherSurface(collision, () => 1),
    eye = new T.Vector3(0, 2, 0),
    data = surface.data;
  assert.equal(surface.update(eye), true);
  assert.equal(surface.emitterCount, 1);
  assert.equal(surface.update(eye), false);
  eye.x = 0.4;
  assert.equal(surface.update(eye), false);
  eye.x = 5;
  assert.equal(surface.update(eye), true);
  assert.equal(surface.data, data);
  assert.equal(surface.rebuilds, 2);
  assert.ok(surface.data.every(Number.isFinite));
});
test('all presets have bounded sky and precipitation work with strictly increasing visual budgets', () => {
  const qualities = ['low', 'medium', 'high', 'ultra'] as const;
  for (let i = 0; i < qualities.length; i++) {
    const b = CLIMATE_BUDGET[qualities[i]];
    assert.ok(b.skySteps <= 32 && b.skyWidth <= 1536 && b.skyHz <= 6);
    assert.ok(b.rain + b.snow + b.drift + b.splashes < 15000);
    if (i > 0)
      for (const k of ['skyWidth', 'skySteps', 'rain', 'snow', 'drift', 'splashes'] as const)
        assert.ok(b[k] > CLIMATE_BUDGET[qualities[i - 1]][k]);
  }
});
