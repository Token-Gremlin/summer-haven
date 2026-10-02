/* Inject through local browser development tools only. Never certify performance
 * from this helper alone: retain raw samples, route completion and hardware data.
 * Do not record video, capture screenshots, render Blender, build or run tests
 * during timed intervals. Navigation uses the real player controller/collision.
 */
window.beginWorldPerformance = function ({ repeats = 3, durationMs = 60000, warmupMs = 10000, sceneNames = null, profile = false } = {}) {
  const g = window.__haven;
  if (!g?.ready || g.ui.mode !== 'play') throw new Error('Start the local QA game first.');
  if (window.__worldPerformance?.running) throw new Error('Measurement already active.');
  if (profile && !g.profiler?.enabled) throw new Error('Diagnostic mode requires ?prof=1.');
  if (!profile && g.profiler?.enabled) throw new Error('Production timing requires ?qa=1 without prof=1; GPU query instrumentation changes the workload.');
  const original = { settings: structuredClone(g.save.settings), time: g.save.time,
    position: g.player.position.toArray(), yaw: g.camera.yaw, pitch: g.camera.pitch, distance: g.camera.distance };
  const gl = g.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
  const result = window.__worldPerformance = {
    running: true, started: new Date().toISOString(), build: [...document.scripts].map(s => s.src),
    hardware: { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable',
      userAgent: navigator.userAgent, logicalProcessors: navigator.hardwareConcurrency,
      deviceMemoryGB: navigator.deviceMemory ?? null },
    viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
    appearance: structuredClone(g.save.appearance), profilerEnabled: g.profiler?.enabled ?? false,
    method: { repeats, durationMs, warmupMs, profile, lapsTimedOnly: true, movement: 'keyboard walk with scripted camera steering',
      screenshots: false, video: false, clockJumpsDuringSamples: false,
      input: 'Reassert held W after external focus loss; record each recovery. UI interruption still aborts.',
      note: 'Scene placement/reset precedes warmup. RAF intervals are frame delivery, not GPU timer measurements.' },
    runs: [], progress: null, error: null,
  };
  const scenes = [
    { name: 'Aldermere market', points: [[20,-300],[20,-318],[20,-300]] },
    // The direct centreline meets the current bird-perch rocks. This declared
    // detour is walked with real collision; the obstruction stays in the evidence.
    { name: 'Mosswood glade trail', points: [[196,-492],[201.8,-500.5],[206,-503.5],[214,-508.286],[206,-503.5],[201.8,-500.5],[196,-492]] },
    { name: 'Silverveil lower approach', points: [[348,-688],[320,-703.75],[348,-688]] },
    { name: 'Vesper upper bank', points: [[356,-746],[356,-760],[356,-746]] },
    { name: 'Village riverside', points: [[43,-128],[43,-116],[44,-112],[44,-128],[43,-128]] },
  ].filter(scene => !sceneNames || sceneNames.includes(scene.name));
  result.routes = structuredClone(scenes);
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const memory = () => ({ used: performance.memory?.usedJSHeapSize ?? null,
    total: performance.memory?.totalJSHeapSize ?? null, geometries: g.renderer.info.memory.geometries,
    textures: g.renderer.info.memory.textures });
  const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  result.finished = (async () => {
    try {
      g.settings({ ...original.settings, quality: 'low', resolution: .7, shadows: 512, vegetation: .3,
        reflections: false, aa: 1, post: false, distance: 90, visibility: 'nearby', freezeTime: true });
      const expectedRatio = Math.min(devicePixelRatio,1.5)*.7;
      if(Math.abs(g.renderer.getPixelRatio()-expectedRatio)>1e-6 ||
        g.renderer.domElement.width!==Math.floor(innerWidth*expectedRatio) ||
        g.renderer.domElement.height!==Math.floor(innerHeight*expectedRatio) ||
        g.post.mrt.width!==g.renderer.domElement.width || g.post.mrt.height!==g.renderer.domElement.height ||
        g.post.composer.readBuffer.width!==g.post.mrt.width || g.post.composer.readBuffer.height!==g.post.mrt.height)
        throw new Error('Actual internal resolution differs from the declared viewport/DPR. Reapply resolution after browser device emulation before measuring.');
      g.setTime(.12);
      for (const scene of scenes) for (let repeat = 0; repeat < repeats; repeat++) {
        if (profile) g.profiler.reset();
        g.input.clear(); g.camera.photo = false; g.player.cycling = false;
        g.teleport(...scene.points[0]); g.camera.pitch = .22; g.camera.distance = 6.2;
        g.save.world.elapsedSeconds = 0; g.habitatLife?.reset(); g.cityLife?.reset(); g.siltfin?.reset();
        let index = 1, laps = 0, inputRecoveries=0, best = Infinity, progressAt = performance.now();
        const steer = now => {
          if(!g.input.keys.has('KeyW')){inputRecoveries++;key('keydown','KeyW');}
          let target = scene.points[index], p = g.player.position;
          let dx = target[0] - p.x, dz = target[1] - p.z, distance = Math.hypot(dx, dz);
          if (distance < .4) {
            index++; if (index === scene.points.length) { index = 1; laps++; }
            target = scene.points[index]; dx = target[0] - p.x; dz = target[1] - p.z;
            distance = Math.hypot(dx,dz);
            best = Infinity; progressAt = now;
          }
          if (distance < best - .15) { best = distance; progressAt = now; }
          if (now - progressAt > 6000) throw new Error(scene.name + ': movement stalled; run invalid.');
          g.camera.yaw = Math.atan2(-dx,-dz);
          if (g.ui.mode !== 'play') throw new Error('Gameplay interrupted; run invalid.');
        };
        key('keydown','KeyW');
        let now = await frame(), start = now;
        while (now - start < warmupMs) { steer(now); now = await frame(); }
        const arrivalProfile = profile ? g.profiler.report() : null;
        if (profile) g.profiler.reset();
        const warmupLaps = laps;
        laps = 0;
        const samples = [], trace = [], initial = memory();
        let previous = now, sampleAt = now; start = now;
        result.progress = { scene: scene.name, repeat: repeat + 1, stage: 'timing', seconds: 0 };
        while (now - start < durationMs) {
          steer(now); now = await frame(); samples.push(now - previous); previous = now;
          result.progress.seconds = (now - start) / 1000;
          if (now - sampleAt >= 1000) {
            sampleAt = now;
            trace.push({ ms: now - start, position: g.player.position.toArray(), speed: g.player.speed,
              calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles, ...memory() });
          }
        }
        key('keyup','KeyW');
        const sorted = [...samples].sort((a,b) => a-b), mean = samples.reduce((a,b) => a+b,0)/samples.length;
        result.runs.push({ scene: scene.name, repeat: repeat + 1, actualMs: now-start, laps, warmupLaps,inputRecoveries,
          arrivalProfile, steadyProfile: profile ? g.profiler.report() : null,
          render: [g.renderer.domElement.width,g.renderer.domElement.height],
          targets:{scene:[g.post.mrt.width,g.post.mrt.height],post:[g.post.composer.readBuffer.width,g.post.composer.readBuffer.height]},
          cameraAspect:g.camera.camera.aspect,settings: structuredClone(g.save.settings),
          stats: { frames: samples.length, mean, fps: 1000/mean, median: quantile(sorted,.5),
            p95: quantile(sorted,.95), p99: quantile(sorted,.99), min: sorted[0], max: sorted.at(-1),
            over33: samples.filter(v=>v>33.3).length, over50: samples.filter(v=>v>50).length,
            over100: samples.filter(v=>v>100).length }, initialMemory: initial, finalMemory: memory(), samples, trace });
      }
    } catch (error) {
      result.error = String(error);
      result.failedAt = { position: g.player.position.toArray(), speed: g.player.speed,
        mode: g.ui.mode, clock: g.save.world.elapsedSeconds, memory: memory() };
    }
    finally {
      key('keyup','KeyW'); key('keyup','ShiftLeft'); g.input.clear();
      g.settings(original.settings); g.save.time=original.time;
      g.teleport(original.position[0],original.position[2]);
      g.camera.yaw=original.yaw;g.camera.pitch=original.pitch;g.camera.distance=original.distance;
      g.ui.pause();result.running=false;result.completed=new Date().toISOString();
    }
  })();
  return { started: result.started, method: result.method, hardware: result.hardware, scenes: scenes.map(s=>s.name) };
};
