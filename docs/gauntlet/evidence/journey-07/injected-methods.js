window.beginBicycleRoute = function (points) {
  const g = window.__haven;
  if (!g?.ready || !g.player.cycling || g.ui.mode !== 'play' || g.camera.photo)
    throw new Error('Start in ordinary mounted play.');
  if (!Array.isArray(points) || !points.length || points.length > 40 ||
      points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v))))
    throw new Error('Supply 1–40 finite [x,z] waypoints.');
  if (window.__bicycleRoute?.running) throw new Error('A bicycle route is already active.');
  const held = new Set(), start = performance.now();
  const run = window.__bicycleRoute = {
    running: true, started: start, points, index: 0, trace: [], reason: '',
    method: 'Synthetic W/S/A/D; actual bicycle controller/collision; camera follows actual heading.',
  };
  const set = (code, down) => {
    if (held.has(code) === down) return;
    if (down) held.add(code); else held.delete(code);
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
  };
  let timer, best = Infinity, progressAt = start, finishing = false;
  const stop = (reason) => {
    clearInterval(timer);
    for (const code of [...held]) set(code, false);
    run.running = false; run.reason = reason; run.durationMs = performance.now() - start;
  };
  run.stop = () => stop('caller stopped');
  timer = setInterval(() => {
    const now = performance.now(), p = g.player;
    if (g.ui.mode !== 'play' || !p.cycling || g.camera.photo) return stop('mode changed');
    if (document.hidden) return stop('document hidden');
    if (now - start > 180000) return stop('time limit');
    if (finishing) {
      set('KeyW', false); set('KeyA', false); set('KeyD', false);
      if (Math.abs(p.speed) < 0.1) return stop('arrived');
      set('KeyS', true); return;
    }
    const target = points[run.index], dx = target[0] - p.position.x, dz = target[1] - p.position.z;
    const distance = Math.hypot(dx, dz);
    const error = Math.atan2(Math.sin(Math.atan2(dx, dz) - p.yaw), Math.cos(Math.atan2(dx, dz) - p.yaw));
    run.trace.push({ ms: now - start, index: run.index, position: p.position.toArray(),
      speed: p.speed, yaw: p.yaw, distance, error });
    if (distance < 1.4) {
      run.index++; best = Infinity; progressAt = now;
      if (run.index === points.length) finishing = true;
      return;
    }
    if (distance < best - 0.25) { best = distance; progressAt = now; }
    if (now - progressAt > 6000) return stop('no progress; inspect collision/turn');
    const anticipated = error - p.steer * (0.7 + Math.abs(p.speed)) * 0.54 * 0.22;
    set('KeyA', anticipated > 0.035); set('KeyD', anticipated < -0.035);
    set('KeyS', false); set('KeyW', true);
    g.camera.yaw = p.yaw - Math.PI;
  }, 100);
  return { started: start, points, method: run.method };
};

window.beginHabitatCapture = function (name, durationMs = 75000) {
  const game = window.__haven;
  if (!game?.ready || game.ui.mode !== 'play') throw new Error('Start the local QA game first.');
  if (window.__habitatCapture?.recorder?.state === 'recording') throw new Error('Capture already active.');
  const canvas = game.renderer.domElement;
  const stream = canvas.captureStream(20);
  const audio = game.audio.context?.state === 'running' ? game.audio.context.createMediaStreamDestination() : null;
  if (audio) {
    game.audio.engine.output.connect(audio);
    for (const track of audio.stream.getAudioTracks()) stream.addTrack(track);
  }
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2600000 });
  const initial = {
    name, created: new Date().toISOString(), build: [...document.scripts].map(s => s.src),
    canvasOnly: true, continuousRealTime: true, performanceBenchmark: false,
    viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, render: [canvas.width, canvas.height],
    settings: structuredClone(game.save.settings), time: game.save.time,
    camera: { position: game.camera.camera.position.toArray(), target: game.camera.target.toArray(),
      yaw: game.camera.yaw, pitch: game.camera.pitch, distance: game.camera.distance,
      photo: game.camera.photo, offset: game.camera.photoOffset.toArray() },
    appearance: structuredClone(game.save.appearance), audioState: game.audio.context?.state ?? 'unavailable',
  };
  const capture = window.__habitatCapture = { recorder, initial, chunks: [], trace: [], started: performance.now(), done: false };
  recorder.ondataavailable = event => { if (event.data.size) capture.chunks.push(event.data); };
  const sample = () => capture.trace.push({ ms: performance.now() - capture.started,
    player: game.player.position.toArray(), mode: game.ui.mode,
    worldSeconds: game.save.world.elapsedSeconds,
    camera: { position: game.camera.camera.position.toArray(), target: game.camera.target.toArray() },
    siltfin: game.siltfin ? { phase: game.siltfin.phase, position: game.siltfin.group.position.toArray(),
      rotation: game.siltfin.group.rotation.y, state: game.siltfin.snapshot() } : null,
    wildlife: game.habitatLife.snapshot() });
  const timer = setInterval(sample, 250);
  sample();
  recorder.onstop = () => {
    clearInterval(timer); sample();
    capture.blob = new Blob(capture.chunks, { type: mime });
    capture.durationMs = performance.now() - capture.started;
    capture.done = true;
    stream.getTracks().forEach(track => track.stop());
    if (audio) game.audio.engine.output.disconnect(audio);
  };
  recorder.start(1000);
  setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, Math.min(180000, Math.max(1000, durationMs)));
  return initial;
};

window.beginJourneyObserver = function ({ label = 'J1 journey', setup = '', maxMinutes = 45 } = {}) {
  const g = window.__haven;
  if (!g?.ready) throw new Error('A ready local ?qa=1 game is required.');
  if (window.__worldPerformance?.running) throw new Error('Performance measurement is active.');
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
      if (window.__worldPerformance?.running) { api.stop('performance measurement started'); return; }
      try { sample(); } catch (e) { error(e); api.stop('sampling failed'); }
    }, 1000);
    capTimer = setTimeout(() => api.stop('duration cap'), maxMinutes * 60000);
  } catch (e) { error(e); api.stop('initial observation failed'); throw e; }
  return { started: result.started, label: result.label, method: result.method };
};

window.beginWalkingRoute = function (points, jog = true) {
  const g = window.__haven;
  if (!g?.ready || g.ui.mode !== 'play' || g.camera.photo) throw new Error('Use live walking mode.');
  const run = window.__walkingRoute = {
    started: performance.now(), points, index: 0, trace: [], done: false, reason: '',
  };
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  key('keydown', 'KeyW');
  if (jog) key('keydown', 'ShiftLeft');
  let progressAt = performance.now(), best = Infinity;
  const timer = setInterval(() => {
    const target = points[run.index], p = g.player.position;
    const dx = target[0] - p.x, dz = target[1] - p.z, distance = Math.hypot(dx, dz);
    const now = performance.now();
    run.trace.push({ ms: now - run.started, index: run.index,
      position: p.toArray(), speed: g.player.speed, mode: g.ui.mode, distance });
    if (distance < .45) {
      run.index++;
      progressAt = now; best = Infinity;
    } else {
      g.camera.yaw = Math.atan2(-dx, -dz);
      if (distance < best - .2) { best = distance; progressAt = now; }
    }
    const reason = run.index === points.length ? 'arrived'
      : g.ui.mode !== 'play' ? 'mode changed'
      : now - progressAt > 5000 ? 'stalled against collision'
      : now - run.started > 180000 ? 'time limit' : '';
    if (reason) {
      clearInterval(timer); key('keyup', 'KeyW'); key('keyup', 'ShiftLeft');
      run.done = true; run.reason = reason; run.durationMs = now - run.started;
    }
  }, 100);
  return { points, jog, method: 'scripted camera steering, ordinary keyboard movement and collision' };
};