/* Local QA observation only. Load after the performance lock is released.
 * This logger never drives input, camera, time, player, UI, storage or rendering.
 * It supplements real motion/audio observation; samples cannot certify either.
 * Export before reloading: this deliberately writes no storage or download files.
 */
window.beginJourneyObserver = function ({ label = 'J1 journey', setup = '', maxMinutes = 45 } = {}) {
  const g = window.__haven;
  if (!g?.ready) throw new Error('A ready local ?qa=1 game is required.');
  if (window.__worldPerformance?.running || window.__cityActivityPerformance?.running)
    throw new Error('Performance measurement is active.');
  if (window.__journeyObserver?.running) throw new Error('Journey observation is already active.');
  if (!Number.isFinite(maxMinutes) || maxMinutes <= 0 || maxMinutes > 45)
    throw new Error('maxMinutes must be greater than zero and at most 45.');
  const start = performance.now(), saveKey = 'summer-haven.save.v1';
  const limits = { samples: 2702, inputs: 30000, marks: 300, lifecycle: 300, errors: 30 };
  const stamp = () => ({ ms: performance.now() - start, utc: new Date().toISOString() });
  const copy = value => structuredClone(value);
  const short = (value, length = 800) => String(value ?? '').slice(0, length);
  const text = selector => short(document.querySelector(selector)?.textContent);
  const exactSnapshot = () => ({
    ...stamp(), save: copy(g.save),
    storageRaw: localStorage.getItem(saveKey),
    world: {
      elapsedSeconds: g.save.world.elapsedSeconds, time: g.save.time,
      cityLife: g.cityLife ? copy(g.cityLife.state) : null,
      habitatLife: g.habitatLife?.snapshot() ?? null,
      siltfin: g.siltfin?.snapshot() ?? null,
      reedwingSeen: g.save.world.reedwingSeen,
    },
  });
  // Snapshot failures abort before listeners are installed; never silently omit setup.
  const initial = exactSnapshot();
  const result = {
    version: 1, label: short(label, 160), setup: short(setup, 4000),
    started: new Date().toISOString(), url: location.href,
    buildScripts: [...document.scripts].map(s => s.src).filter(Boolean),
    userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
    internalResolution: [g.renderer.domElement.width, g.renderer.domElement.height],
    settings: copy(g.save.settings), initial, final: null,
    method: {
      sampleMs: 1000, memoryMs: 10000, maxMinutes, limits,
      input: 'Observed DOM keydown/keyup, pointerdown/up, wheel, and UI clicks; isTrusted retained.',
      writesToGame: false, drivesInput: false, renders: false, video: false, audio: false,
      limitations: 'One-second snapshots miss intermediate motion. DOM isTrusted is recorded, not a claim of human input. Memory is JS heap and renderer counts, not process/GPU bytes. No intervention detection beyond logged events and caller disclosures.',
    },
    samples: [], inputs: [], memory: [], marks: [], lifecycle: [], errors: [],
    dropped: { samples: 0, inputs: 0, marks: 0, lifecycle: 0, errors: 0 },
  };
  let timer = null, capTimer = null, lastMemory = -Infinity;
  const listeners = [];
  const add = (name, item) => {
    if (result[name].length < limits[name]) result[name].push(item);
    else result.dropped[name]++;
  };
  const error = e => add('errors', { ...stamp(), message: short(e, 1200) });
  const memory = () => ({
    ...stamp(), usedJSHeapSize: performance.memory?.usedJSHeapSize ?? null,
    totalJSHeapSize: performance.memory?.totalJSHeapSize ?? null,
    jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit ?? null,
    geometries: g.renderer.info.memory.geometries, textures: g.renderer.info.memory.textures,
    calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles,
    internalResolution: [g.renderer.domElement.width, g.renderer.domElement.height],
  });
  const sample = () => {
    const p = g.player.position, stats = g.stats();
    const city = (g.cityLife?.residents ?? [])
      .filter(r => r.position.distanceTo(p) < 45).slice(0, 12)
      .map(r => ({ id: r.data.id, name: r.data.name, position: r.position.toArray(),
        status: r.status, moving: r.moving, visible: r.character?.group.visible ?? false,
        state: copy(r.state), destination: copy(r.data.destinations[r.state.activity]) }));
    const village = (g.villagers?.actors ?? [])
      .filter(a => a.position.distanceTo(p) < 25 && a.room === stats.inside).slice(0, 12)
      .map(a => ({ id: a.data.id, position: a.position.toArray(), room: a.room,
        stage: a.stage, wait: a.wait, animation: a.character.state }));
    const habitat = g.habitatLife?.snapshot();
    add('samples', {
      ...stamp(), worldElapsedSeconds: g.save.world.elapsedSeconds, time: g.save.time,
      mode: g.ui.mode, inside: stats.inside, position: p.toArray(), speed: g.player.speed,
      scene: { villageVisible: g.village.group.visible, regionsVisible: g.regions.group.visible,
        interiorsVisible: g.interiors.group.visible },
      animation: g.player.lastState, seated: g.player.seated,
      bike: { cycling: g.player.cycling, position: g.player.bike.position.toArray() },
      ferry: g.ferry ? { riding: g.ferry.riding, position: g.ferry.boat.position.toArray(),
        visible: g.ferry.boat.visible, passengerPrompt: g.ferry.interactions[2]?.label } : null,
      camera: { position: g.camera.camera.position.toArray(), yaw: g.camera.yaw,
        pitch: g.camera.pitch, distance: g.camera.distance, photo: g.camera.photo },
      hud: { location: text('#location'), clock: text('#clock'), prompt: text('#prompt'),
        speaker: text('.speaker'), words: text('.words'), toast: text('.toast') },
      discoveries: [...g.save.discoveries], city, village,
      wildlife: (habitat?.animals ?? []).filter(a =>
        Math.hypot(a.position.x - p.x, a.position.z - p.z) < 45).slice(0, 20),
      dragons: {
        aurelian: g.reedwing ? { phase: g.reedwing.phase,
          position: g.reedwing.group.position.toArray(), visible: g.reedwing.group.visible,
          interactionRadius: g.reedwing.interaction.radius } : null,
        vesper: g.siltfin ? { phase: g.siltfin.phase, position: g.siltfin.group.position.toArray(),
          visible: g.siltfin.group.visible, interactionRadius: g.siltfin.interaction.radius,
          state: g.siltfin.snapshot() } : null,
      },
    });
    const now = performance.now();
    if (now - lastMemory >= 10000) { result.memory.push(memory()); lastMemory = now; }
  };
  const api = {
    running: true,
    mark(label, detail = null) {
      if (!api.running) throw new Error('Observer has stopped.');
      const encoded = JSON.stringify(detail);
      if ((encoded?.length ?? 0) > 4000) throw new Error('Mark detail exceeds 4000 characters.');
      add('marks', { ...stamp(), label: short(label, 200), detail: copy(detail) });
      return result.marks.at(-1);
    },
    stop(reason = 'caller stopped') {
      if (!api.running) return { stopped: true, reason: result.stopReason, durationMs: result.durationMs };
      api.running = false;
      clearInterval(timer); clearTimeout(capTimer);
      for (const [target, type, listener] of listeners) target.removeEventListener(type, listener, true);
      try { result.final = exactSnapshot(); result.memory.push(memory()); } catch (e) { error(e); }
      result.completed = new Date().toISOString(); result.durationMs = performance.now() - start;
      result.stopReason = short(reason, 300);
      return { stopped: true, reason: result.stopReason, durationMs: result.durationMs,
        samples: result.samples.length, inputs: result.inputs.length, dropped: copy(result.dropped) };
    },
    export() {
      if (api.running) throw new Error('Stop first to capture an exact final snapshot.');
      return JSON.stringify(result);
    },
    status() { return { running: api.running, elapsedMs: api.running ? performance.now() - start : result.durationMs,
      samples: result.samples.length, inputs: result.inputs.length, dropped: copy(result.dropped) }; },
  };
  const listen = (target, type, listener) => {
    target.addEventListener(type, listener, { capture: true, passive: true });
    listeners.push([target, type, listener]);
  };
  const input = e => {
    if (!api.running) return;
    const target = e.target instanceof Element ? e.target : null;
    const action = target?.closest('[data-action]')?.getAttribute('data-action');
    if (e.type === 'click' && !action) return;
    add('inputs', { ...stamp(), type: e.type, code: e.code ?? null, key: e.key ?? null,
      repeat: e.repeat ?? false, isTrusted: e.isTrusted, button: e.button ?? null,
      deltaY: e.deltaY ?? null, action: action ?? null,
      target: target ? short(target.tagName + (target.id ? '#' + target.id : ''), 160) : null,
      mode: g.ui.mode });
  };
  window.__journeyObserver = api;
  try {
    for (const type of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'wheel', 'click'])
      listen(window, type, input);
    for (const type of ['blur', 'focus']) listen(window, type, () =>
      add('lifecycle', { ...stamp(), type, hidden: document.hidden }));
    listen(document, 'visibilitychange', () =>
      add('lifecycle', { ...stamp(), type: 'visibilitychange', hidden: document.hidden }));
    listen(window, 'beforeunload', () => api.stop('beforeunload; export should already have been retained'));
    sample();
    timer = setInterval(() => {
      if (window.__worldPerformance?.running || window.__cityActivityPerformance?.running) {
        api.stop('performance measurement started'); return;
      }
      try { sample(); } catch (e) { error(e); api.stop('sampling failed'); }
    }, 1000);
    capTimer = setTimeout(() => api.stop('duration cap'), maxMinutes * 60000);
  } catch (e) { error(e); api.stop('initial observation failed'); throw e; }
  return { started: result.started, label: result.label, method: result.method };
};
