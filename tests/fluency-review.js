/** Real-renderer comparisons: identical routes, viewport, warmup and sample duration. */
export async function measureFluency(
  modes = [
    ['low', 'nearby'],
    ['medium', 'nearby'],
  ],
  scenes = [
    ['town walk', 0, 42, 0, false],
    ['Hibiscus run', 0, 107, 0, true],
    ['river view', 39, -26, -1.45, null],
    ['home interior', 0, 0, 0, null],
  ],
  presetOverrides,
) {
  const g = window.__haven;
  const original = JSON.parse(JSON.stringify(g.save));
  const PRESETS = presetOverrides || (await import('/src/core/save.ts')).PRESETS;
  const next = () => new Promise((r) => requestAnimationFrame(r));
  const results = [];
  g.start();
  try {
    for (const [quality, visibility] of modes) {
      // Reapply the pixel ratio after a test viewport/DPR change, even if the stored scale is unchanged.
      g.settings({ ...g.save.settings, resolution: PRESETS[quality].resolution - 0.01 });
      g.settings({ ...g.save.settings, ...PRESETS[quality], quality, visibility, freezeTime: true });
      g.setTime(0.2);
      for (const [name, x, z, yaw, jog] of scenes) {
        g.input.clear();
        g.player.cycling = false;
        g.player.seated = false;
        g.teleport(x, z);
        if (name === 'home interior') g.enter('home');
        g.camera.yaw = yaw;
        g.camera.pitch = 0.19;
        g.camera.distance = 5.2;
        for (let i = 0; i < 24; i++) await next();
        const begin = g.player.position.clone();
        if (jog !== null) g.input.keys.add('KeyW');
        if (jog) g.input.keys.add('ShiftLeft');
        const samples = [],
          calls = [],
          triangles = [];
        let previous = await next(),
          start = previous;
        while (previous - start < 4000) {
          const now = await next();
          samples.push(now - previous);
          previous = now;
          calls.push(g.stats().calls);
          triangles.push(g.stats().triangles);
        }
        g.input.clear();
        const sorted = [...samples].sort((a, b) => a - b);
        const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
        results.push({
          quality,
          visibility,
          scene: name,
          viewport: [innerWidth, innerHeight],
          dpr: devicePixelRatio,
          render: [g.renderer.domElement.width, g.renderer.domElement.height],
          meanMs: mean(samples),
          p95Ms: sorted[Math.floor(sorted.length * 0.95)],
          fps: 1000 / mean(samples),
          drawCalls: mean(calls),
          triangles: mean(triangles),
          elapsedMs: previous - start,
          distance: begin.distanceTo(g.player.position),
          samples: samples.length,
        });
        window.__fluencyProgress = { completed: results.length, quality, visibility, scene: name };
      }
    }
  } finally {
    g.input.clear();
    if (g.stats().inside) g.leave();
    Object.assign(g.save, original);
    g.settings(original.settings);
    g.teleport(...original.position);
    g.resume();
  }
  const gl = g.renderer.getContext(),
    ext = gl.getExtension('WEBGL_debug_renderer_info');
  const report = {
    date: new Date().toISOString(),
    renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown',
    method: '4000 ms populated-scene RAF samples after 24 warmup frames. No screenshot during measurement.',
    results,
  };
  window.__fluencyLast = report;
  return report;
}
