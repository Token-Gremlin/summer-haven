/** Short, repeatable populated-scene samples. These are not a hardware certification. */
export async function measurePerformance() {
  const g = window.__haven,
    original = JSON.parse(JSON.stringify(g.save));
  const { PRESETS } = await import('/src/core/save.ts');
  const { Profiler } = await import('/src/render/profiler.ts');
  const prof = new Profiler(g.renderer, true);
  g.post.prof = prof;
  const next = () => new Promise((r) => requestAnimationFrame(r));
  const scenes = [
    ['town walk', 0, 26, 0, 'walk'],
    ['garden foliage', 16, 2, -0.6, 'still'],
    ['villagers', 7, 15, 0, 'still'],
    ['river', 39, -26, -1.45, 'still'],
    ['home interior', 0, 0, 0, 'inside'],
    ['fast cycling', 0, 43, 0, 'bike'],
    ['Hibiscus lane', 0, 100, 0, 'walk'],
    ['orchard neighborhood', 81, 72, 0, 'still'],
  ];
  const results = [];
  g.start();
  g.setTime(0.2);
  try {
    for (const quality of ['low', 'medium', 'high']) {
      g.settings({ ...g.save.settings, ...PRESETS[quality], quality });
      for (const [name, x, z, yaw, action] of scenes) {
        g.input.clear();
        g.player.cycling = false;
        g.teleport(x, z);
        g.camera.yaw = yaw;
        g.camera.distance = 5.2;
        g.camera.pitch = 0.19;
        if (action === 'inside') g.enter('home');
        if (action === 'bike') {
          g.player.recoverBike(g.village.collision);
          g.player.bike.rotation.y = Math.PI;
          g.player.toggleBike(g.village.collision);
        }
        for (let i = 0; i < 10; i++) await next();
        if (action === 'walk' || action === 'bike') g.input.keys.add('KeyW');
        if (action === 'bike') g.input.keys.add('ShiftLeft');
        prof.reset();
        const samples = [];
        let previous = await next(),
          start = previous;
        while (previous - start < 2600) {
          const now = await next();
          samples.push(now - previous);
          previous = now;
          prof.poll();
        }
        g.input.clear();
        const sorted = [...samples].sort((a, b) => a - b),
          mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        results.push({
          quality,
          scene: name,
          display: [innerWidth, innerHeight],
          render: [g.renderer.domElement.width, g.renderer.domElement.height],
          frames: samples.length,
          meanMs: +mean.toFixed(2),
          medianMs: +sorted[Math.floor(sorted.length * 0.5)].toFixed(2),
          p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
          averageFps: +(1000 / mean).toFixed(1),
          passes: prof.report(),
          drawCalls: g.stats().calls,
          triangles: g.stats().triangles,
        });
        window.__havenPerformanceProgress = { quality, scene: name, completed: results.length };
      }
    }
  } finally {
    g.post.prof = null;
    g.input.clear();
    if (g.stats().inside) g.leave();
    g.player.cycling = false;
    Object.assign(g.save, original);
    g.teleport(...original.position);
    g.settings(original.settings);
    g.resume();
  }
  const gl = g.renderer.getContext(),
    ext = gl.getExtension('WEBGL_debug_renderer_info');
  const report = {
    date: new Date().toISOString(),
    renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable',
    method:
      '2600 ms populated-scene requestAnimationFrame samples after ten warmup frames; no screenshots during measurement',
    results,
  };
  window.__havenPerformance = report;
  return report;
}
