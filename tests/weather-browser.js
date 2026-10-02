/** Browser QA entry points for the local ?qa=1&prof=1 build.
 * No external automation dependency; invoke these from the developer console. */
const next = () => new Promise((resolve) => requestAnimationFrame(resolve));
export function settleWeather(g, options) {
  g.ui.callbacks.climate({ ...g.save.climate, ...options, automatic: false });
  for (let i = 0; i < 600; i++) g.climate.model.update(0.1, g.save.climate, g.save.world.elapsedSeconds);
}
export async function checkWeather() {
  const g = window.__haven,
    original = JSON.parse(JSON.stringify(g.save)),
    checks = [];
  const { PRESETS } = await import('/src/core/save.ts');
  const { CLIMATE } = await import('/src/render/climate-uniforms.ts');
  const { readSave } = await import('/src/core/save.ts');
  const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
  const frames = async (n = 3) => {
    for (let i = 0; i < n; i++) await next();
  };
  g.start();
  try {
    g.settings({ ...g.save.settings, ...PRESETS.low, quality: 'low' });
    g.setTime(0.15);
    g.teleport(16, 2);
    const geometry = g.climate.precipitation.group.children.map((m) => m.geometry);
    for (const season of ['spring', 'summer', 'autumn', 'winter']) {
      settleWeather(g, {
        season,
        weather: season === 'winter' ? 'snow' : season === 'autumn' ? 'rain' : 'fair',
      });
      await frames();
      const s = g.climate.stats();
      check(
        season + ' state reaches the running shaders',
        CLIMATE.uSeason.value.getComponent(['spring', 'summer', 'autumn', 'winter'].indexOf(season)) > 0.99,
        s,
      );
      check(season + ' survives save validation', readSave().climate.season === season);
    }
    for (const quality of ['low', 'medium', 'high', 'ultra']) {
      g.settings({ ...g.save.settings, ...PRESETS[quality], quality });
      await frames();
      check(
        quality + ' has bounded live sky and snow',
        g.sky.atmosphere.stats().steps <= 32 && g.climate.stats().counts[1] > 0,
        { sky: g.sky.atmosphere.stats(), precipitation: g.climate.stats().counts },
      );
    }
    g.settings({ ...g.save.settings, ...PRESETS.low, quality: 'low' });
    check(
      'quality switches reuse precipitation geometry',
      g.climate.precipitation.group.children.every((m, i) => m.geometry === geometry[i]),
    );
    g.enter('home');
    await frames();
    check('interior is sheltered', !g.climate.stats().visible && CLIMATE.uClimateOutside.value === 0);
    g.leave();
    g.openCreator();
    await frames();
    check('creator has neutral climate', CLIMATE.uClimateOutside.value === 0);
    g.ui.callbacks.cancel();
    g.teleport(16, 2);
    settleWeather(g, { season: 'summer', weather: 'rain', wind: 0, direction: 0 });
    await frames();
    check('still air settles', CLIMATE.uWindStrength.value < 0.0001);
    settleWeather(g, { wind: 1, direction: 0 });
    await frames();
    const { G } = await import('/src/render/materials.ts');
    check('north wind points toward the northern valley', G.uWindDir.value.y < -0.99);
    check(
      'rain has real instances and wet surfaces',
      g.climate.stats().counts[0] > 0 && CLIMATE.uWetness.value > 0.5,
    );
    g.input.keys.add('KeyW');
    g.input.keys.add('ShiftLeft');
    const before = g.player.position.clone(),
      heightBuilds = g.climate.stats().catchmentRebuilds;
    const start = performance.now();
    while (performance.now() - start < 2300) await next();
    g.input.clear();
    check('jog works during rain', g.player.position.distanceTo(before) > 2, {
      distance: g.player.position.distanceTo(before),
      state: g.player.lastState,
    });
    g.teleport(0, 35);
    g.player.recoverBike(g.village.collision);
    g.player.toggleBike(g.village.collision);
    await frames(20);
    g.player.yaw = Math.PI;
    g.input.keys.add('KeyW');
    const bikeStart = g.player.position.clone(),
      riding = performance.now();
    while (performance.now() - riding < 2400) await next();
    g.input.clear();
    check('bicycle works during rain', g.player.cycling && g.player.position.distanceTo(bikeStart) > 1, {
      distance: g.player.position.distanceTo(bikeStart),
      state: g.player.lastState,
    });
    g.player.toggleBike(g.village.collision);
    await frames(8);
    check('moving rain refreshes catchment', g.climate.stats().catchmentRebuilds > heightBuilds);
    check(
      'all compiled shaders runnable',
      g.renderer.info.programs.every((p) => !p.diagnostics || p.diagnostics.runnable),
    );
    check('camera stays finite', g.camera.camera.position.toArray().every(Number.isFinite));
  } finally {
    g.input.clear();
    g.player.cycling = false;
    g.leave();
    g.resume();
    Object.assign(g.save, original);
    g.ui.callbacks.climate(original.climate);
    g.settings(original.settings);
    g.teleport(...original.position);
  }
  return { date: new Date().toISOString(), passed: checks.filter((c) => c.ok).length, checks };
}
export async function measureWeather(qualities = ['low', 'medium', 'high', 'ultra']) {
  const g = window.__haven,
    original = JSON.parse(JSON.stringify(g.save));
  const { PRESETS } = await import('/src/core/save.ts');
  const results = [];
  g.start();
  g.setTime(0.2);
  try {
    for (const quality of qualities) {
      g.settings({ ...g.save.settings, ...PRESETS[quality], quality });
      for (const [name, season, weather, x, z, yaw] of [
        ['village clear', 'summer', 'fair', 16, 2, -0.6],
        ['river rain', 'autumn', 'rain', 266, -555, -1.1],
        ['woodland snow', 'winter', 'snow', 208, -500, -0.65],
      ]) {
        settleWeather(g, { season, weather, intensity: 0.8, wind: 0.65 });
        g.input.clear();
        g.teleport(x, z);
        g.camera.yaw = yaw;
        g.camera.distance = 5.2;
        g.camera.pitch = 0.19;
        for (let i = 0; i < 24; i++) await next();
        g.profiler.reset();
        let previous = await next(),
          start = previous;
        const samples = [];
        while (previous - start < 3000) {
          const now = await next();
          samples.push(now - previous);
          previous = now;
        }
        const sorted = [...samples].sort((a, b) => a - b),
          mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        results.push({
          quality,
          name,
          display: [innerWidth, innerHeight],
          dpr: devicePixelRatio,
          render: [g.renderer.domElement.width, g.renderer.domElement.height],
          samples: samples.length,
          meanMs: +mean.toFixed(2),
          p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
          suspended: samples.some((ms) => ms >= 500),
          averageFps: +(1000 / mean).toFixed(1),
          camera: g.camera.camera.position.toArray(),
          climate: g.climate.stats(),
          sky: g.sky.atmosphere.stats(),
          passes: g.profiler.report(),
        });
        window.__weatherProgress = { quality, name, completed: results.length };
      }
    }
  } finally {
    Object.assign(g.save, original);
    g.ui.callbacks.climate(original.climate);
    g.settings(original.settings);
    g.teleport(...original.position);
  }
  const gl = g.renderer.getContext(),
    ext = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    date: new Date().toISOString(),
    renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable',
    method:
      '3000ms rAF per populated view; 24 warmup frames; frozen afternoon; no concurrent screenshots or tests; diagnostic profiler active.',
    results,
  };
}
