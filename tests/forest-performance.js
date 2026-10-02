/** Run from the local ?qa=1&prof=1 build. No screenshots during timed samples. */
export async function measureForestPerformance(qualities = ['low', 'medium', 'high', 'ultra']) {
  const g = window.__haven,
    original = JSON.parse(JSON.stringify(g.save));
  const { PRESETS } = await import('/src/core/save.ts');
  const next = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const results = [];
  g.start();
  g.setTime(0.2);
  try {
    for (const quality of qualities) {
      g.settings({ ...g.save.settings, ...PRESETS[quality], quality });
      for (const [name, x, z, yaw] of [
        ['village grove', 16, 2, -0.6],
        ['Mosswood path', 208, -500, -0.65],
        ['river approach', 266, -555, -1.1],
      ]) {
        g.input.clear();
        g.player.cycling = false;
        g.teleport(x, z);
        g.camera.yaw = yaw;
        g.camera.distance = 5.2;
        g.camera.pitch = 0.19;
        for (let i = 0; i < 24; i++) await next();
        g.profiler.reset();
        const samples = [];
        let previous = await next(),
          start = previous;
        while (previous - start < 2200) {
          const now = await next();
          samples.push(now - previous);
          previous = now;
        }
        const sorted = [...samples].sort((a, b) => a - b);
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        results.push({
          quality,
          name,
          display: [innerWidth, innerHeight],
          render: [g.renderer.domElement.width, g.renderer.domElement.height],
          samples: samples.length,
          meanMs: +mean.toFixed(2),
          p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
          averageFps: +(1000 / mean).toFixed(1),
          calls: g.stats().calls,
          triangles: g.stats().triangles,
          camera: g.camera.camera.position.toArray(),
          passes: g.profiler.report(),
          forest: g.village.woodland?.stats(),
          regionForest: g.regions.woodland?.stats(),
        });
        window.__forestProgress = { quality, name, completed: results.length };
      }
    }
  } finally {
    g.input.clear();
    Object.assign(g.save, original);
    g.teleport(...original.position);
    g.settings(original.settings);
    g.resume();
  }
  const gl = g.renderer.getContext(),
    ext = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    date: new Date().toISOString(),
    renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable',
    method:
      '2200ms rAF per populated view, 24 warmup frames, frozen afternoon; same viewport and presets before/after. Local browser, not hardware certification.',
    results,
  };
}
