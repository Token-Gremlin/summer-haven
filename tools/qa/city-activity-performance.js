/* Local QA injection only. Source-bound to CityLife/CityNavigation in this build.
 * Ordinary RAF-driven game simulation and player collision; no fast-forward.
 * Do not capture screenshots/video or run other hardware work while active.
 * Export before leaving this page. See docs/gauntlet/city-workload-08.md.
 */
window.beginCityActivityPerformance = function (options = {}) {
  const g = window.__haven, copy = value => structuredClone(value);
  const fail = message => { throw new Error(message); };
  const provenance = copy(options.provenance ?? {});
  for (const name of ['commit', 'dirtyManifestSha256', 'bundleSha256', 'samplerSha256', 'hardwareRecord', 'exclusiveLock', 'saveDisclosure'])
    if (typeof provenance[name] !== 'string' || !provenance[name].trim()) fail('Supply provenance.' + name);
  if (!g?.ready || g.ui.mode !== 'play' || g.stats().inside || g.village.slice) fail('Start the full QA world outdoors in play.');
  if (g.profiler?.enabled) fail('Profiler must be off, including ?prof=1.');
  if (document.hidden || g.camera.photo || g.player.cycling || g.player.seated || g.player.transition || g.ferry?.riding)
    fail('Use visible ordinary on-foot play with no photo/seat/transfer.');
  for (const name of ['__worldPerformance', '__journeyObserver', '__cityActivityPerformance'])
    if (window[name]?.running) fail(name + ' is already running.');
  if (g.input.keys.size || g.input.drag) fail('Release all input before starting.');
  const city = g.cityLife, habitat = g.habitatLife;
  if (!city || city.residents.length !== 10 || !habitat || !g.siltfin || !g.ferry || !g.reedwing)
    fail('Expected all ten city residents and full-world systems.');
  // Guard private adapter shape rather than silently omitting changed runtime state.
  for (const key of ['job', 'cursor', 'talking']) if (!(key in city)) fail('City adapter mismatch: ' + key);
  for (const key of ['cells', 'weights', 'edges', 'revision', 'worldRevision']) if (!(key in city.nav)) fail('Navigation adapter mismatch: ' + key);
  if (!Array.isArray(habitat.animals) || typeof habitat.poseNow !== 'function' || !('remainder' in habitat)) fail('Habitat adapter mismatch.');
  const route = [[20, -300], [20, -318], [20, -300]];
  const durationMs = 60000, warmupMs = 10000, settleSeconds = 180, repeats = 3;
  const limits = { framesPerRun: 36000, tracePerRun: 65, totalWallMs: 900000, frameGapMs: 500, movementStallMs: 6000 };
  const storageKey = 'summer-haven.save.v1';
  const scripts = () => [...document.scripts].map(script => script.src);
  const memory = () => ({ observedJSHeapBytes: performance.memory?.usedJSHeapSize ?? null,
    allocatedJSHeapBytes: performance.memory?.totalJSHeapSize ?? null,
    geometries: g.renderer.info.memory.geometries, textures: g.renderer.info.memory.textures,
    calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles });
  const cameraRecord = () => ({ yaw: g.camera.yaw, pitch: g.camera.pitch, distance: g.camera.distance,
    photo: g.camera.photo, target: g.camera.target.toArray(), photoOffset: g.camera.photoOffset.toArray(),
    boom: g.camera.boom, ready: g.camera.ready, position: g.camera.camera.position.toArray(),
    quaternion: g.camera.camera.quaternion.toArray() });
  const playerFields = ['yaw', 'speed', 'cycling', 'mountBlend', 'transition', 'seated', 'seatHeightOffset',
    'inside', 'steer', 'wheel', 'crank', 'lastState', 'turnLean'];
  const residentFields = ['status', 'moving', 'retry', 'stuck', 'animationDt', 'greeting', 'greetingCooldown', 'handContactError'];
  const fields = (object, names) => Object.fromEntries(names.map(name => [name, object[name]]));
  const playerRecord = () => ({ ...fields(g.player, playerFields), position: g.player.position.toArray(),
    velocity: g.player.velocity.toArray(), bikePosition: g.player.bike.position.toArray(), bikeQuaternion: g.player.bike.quaternion.toArray() });
  const liveSave = () => {
    const save = copy(g.save);
    save.world.cityLife = copy(city.state);
    save.world.habitatLife = habitat.snapshot();
    save.world.siltfin = g.siltfin.snapshot();
    return save;
  };
  const residentRecords = () => city.residents.map(r => {
    const destination = r.data.destinations[r.state.activity], group = r.character?.group;
    return { id: r.data.id, state: copy(r.state), position: r.position.toArray(), ...fields(r, residentFields),
      route: copy(r.route), destination: copy(destination), destinationDistance: Math.hypot(r.position.x - destination.point[0], r.position.z - destination.point[1]),
      validPosition: city.nav.valid([r.position.x, r.position.z]), validDestination: city.nav.valid(destination.point),
      instantiated: !!group, renderEligible: !g.player.inside && r.position.distanceTo(g.player.position) <
        Math.max(25, Math.min(135, g.save.settings.visibility === 'full' ? 1600 : g.save.settings.distance)),
      groupVisible: group?.visible ?? false, ancestorsVisible: !!group && visibleAncestry(group),
      characterState: r.character?.state ?? null };
  });
  function visibleAncestry(object) { for (let p = object; p; p = p.parent) if (!p.visible) return false; return true; }
  const counts = () => {
    const result = { total: city.residents.length, instantiated: 0, visible: 0, workingVisible: 0,
      traveling: 0, blocked: 0, working: 0, resting: 0, waiting: 0, socializing: 0, greeting: 0 };
    for (const r of city.residents) {
      result[r.status]++;
      if (r.character) result.instantiated++;
      if (r.character?.group.visible && visibleAncestry(r.character.group)) {
        result.visible++; if (r.status === 'working') result.workingVisible++;
      }
    }
    return result;
  };
  let heapPrototype = null;
  const navigation = () => {
    let job = null;
    if (city.job) {
      const s = city.job.search;
      heapPrototype = Object.getPrototypeOf(s.open);
      if (!Array.isArray(s.open.data)) fail('Heap adapter mismatch.');
      job = { id: city.job.resident.data.id, search: { ...copy(fields(s, ['avoid', 'from', 'to', 'end', 'start', 'revision', 'done', 'result'])),
        open: copy(s.open.data), cost: [...s.cost], came: [...s.came], closed: [...s.closed] } };
    }
    return { cursor: city.cursor, talking: city.talking?.data.id ?? null, job,
      cells: Array.from(city.nav.cells), weights: Array.from(city.nav.weights), edges: [...city.nav.edges],
      revision: city.nav.revision, worldRevision: city.nav.worldRevision };
  };
  const loaded = () => ({ ready: g.ready, slice: g.village.slice,
    assets: { library: !!g.assets.library, wardrobes: Object.keys(g.assets.characters), architecture: !!g.assets.architecture,
      transport: !!g.assets.transport, wildlife: Object.keys(g.assets.wildlife), gorge: !!g.assets.gorge,
      reedwing: !!g.assets.reedwing, siltfin: !!g.assets.siltfinModel },
    roots: ['scene', 'village', 'regions', 'cityLife', 'habitatLife'].map(name => {
      const root = name === 'scene' ? g.scene : g[name]?.group;
      return { name, children: root?.children.length ?? null, visible: root?.visible ?? null };
    }), cityCharacterIds: city.residents.filter(r => r.character).map(r => r.data.id),
    villageCharacterIds: g.villagers.actors.map(a => a.data.id), habitatCount: habitat.animals.length,
    collisionRevision: g.village.collision.revision, navigation: { cells: city.nav.cells.length, edges: city.nav.edges.size,
      jobResident: city.job?.resident.data.id ?? null, cursor: city.cursor }, memory: memory(),
    limitation: 'Presence and renderer counts; no GPU residency, pending upload or cold-load completion assertion.' });
  const behavior = () => ({ utc: new Date().toISOString(), performanceMs: performance.now(), save: liveSave(),
    player: playerRecord(), camera: cameraRecord(), residents: residentRecords(), counts: counts(),
    villagers: g.villagers.actors.map(a => ({ id: a.data.id, position: a.position.toArray(), route: copy(a.route),
      stage: a.stage, room: a.room, wait: a.wait, animationDt: a.animationDt, quaternion: a.character.group.quaternion.toArray(), visible: a.character.group.visible })),
    habitatRuntime: { elapsed: habitat.elapsed, remainder: habitat.remainder,
      previous: habitat.animals.map(a => ({ id: a.record.id, position: copy(a.previous), quaternion: a.root.quaternion.toArray() })) },
    siltfinRuntime: fields(g.siltfin, ['active', 'clipStartedAt', 'previousClock', 'clock', 'phase']),
    reedwingRuntime: fields(g.reedwing, ['alert', 'previousYaw', 'phase']),
    ferry: { riding: g.ferry.riding, transfer: !!g.ferry.transfer, route: copy(g.ferry.route) },
    loaded: loaded(), mode: g.ui.mode, render: [g.renderer.domElement.width, g.renderer.domElement.height] });
  const original = { storageRaw: localStorage.getItem(storageKey), saveObject: copy(g.save), behavior: behavior(), navigation: navigation() };
  const settings = Object.freeze({ ...original.saveObject.settings, quality: 'low', resolution: .7, shadows: 512,
    vegetation: .3, reflections: false, aa: 1, post: false, distance: 90, visibility: 'nearby', freezeTime: true, timeSpeed: 1 });
  const gl = g.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
  const record = { version: 1, method: 'city-activity-performance-08', started: new Date().toISOString(),
    provenance, scripts: scripts(), location: location.href, timeOrigin: performance.timeOrigin,
    hardware: { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
      userAgent: navigator.userAgent, logicalProcessors: navigator.hardwareConcurrency, deviceMemoryGB: navigator.deviceMemory ?? null },
    configuration: { viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, settings, route,
      pitch: .22, distance: 6.2, scenarios: ['work-.30', 'errand-transition-.52'], repeats, durationMs, warmupMs, settleSeconds, limits,
      profiler: false, screenshots: false, video: false, movement: 'Synthetic W through ordinary player controller/collision; camera yaw steers toward waypoints.',
      settle: '180 active-world seconds at frozen .30 from fresh city reset; one shared settled fixture restored before all six repeats.',
      timing: 'RAF delivery intervals. One-second bounded scalar population/resource/position observations. No scene traversal, nav validity checks, fixture serialization or profiler during timing.',
      memory: 'Observed JS heap only; not true peak, cleanup-settled, process, GPU or leak/retention evidence.',
      visibility: 'Group/ancestor visibility is render-enabled population, not proof of frustum inclusion, pixel visibility or lack of occlusion.' },
    original, initialFixture: null, settledFixture: null, runs: [], error: null, restoration: null };
  const settingsKeys = Object.keys(settings);
  let running = true, stopping = null, stage = 'setup', current = null, pendingReject = null, raf = 0;
  let ownInput = false, lastFrameWall = performance.now(), frozenRender = null, activeMovement = null;
  const listeners = [], startWall = performance.now();
  const key = (type, code) => { ownInput = true; try { window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true })); } finally { ownInput = false; } };
  const release = () => { key('keyup', 'KeyW'); g.input.clear(); };
  const stop = reason => {
    if (!running || stopping) return;
    stopping = String(reason || 'Operator stop'); release();
    if (pendingReject) { cancelAnimationFrame(raf); const reject = pendingReject; pendingReject = null; reject(new Error(stopping)); }
  };
  const frame = () => new Promise((resolve, reject) => {
    if (stopping) return reject(new Error(stopping));
    pendingReject = reject;
    raf = requestAnimationFrame(now => { pendingReject = null; lastFrameWall = performance.now(); resolve(now); });
  });
  const listen = (target, type, callback) => { target.addEventListener(type, callback); listeners.push(() => target.removeEventListener(type, callback)); };
  listen(document, 'visibilitychange', () => { if (document.hidden) stop('Document hidden; invalid attempt.'); });
  listen(window, 'blur', () => stop('Window blurred; invalid attempt.'));
  listen(window, 'resize', () => stop('Viewport changed; invalid attempt.'));
  listen(g.renderer.domElement, 'webglcontextlost', () => stop('WebGL context lost; invalid attempt.'));
  for (const name of ['keydown', 'keyup', 'pointerdown', 'wheel'])
    listen(window, name, () => { if (!ownInput) stop('External ' + name + '; invalid attempt.'); });
  const watchdog = setInterval(() => {
    if (performance.now() - startWall > limits.totalWallMs) stop('15-minute session cap.');
    else if (performance.now() - lastFrameWall > 2500) stop('RAF absent for 2.5 seconds.');
  }, 1000);
  const check = time => {
    if (stopping) fail(stopping);
    if (window.__journeyObserver?.running || window.__worldPerformance?.running)
      fail('Another observation/performance sampler started; invalid attempt.');
    if (g.ui.mode !== 'play' || g.player.inside || g.player.cycling || g.player.seated || g.ferry.riding || g.camera.photo || !g.input.active)
      fail('Gameplay/controller interrupted.');
    if (g.profiler.enabled || g.save.time !== time) fail('Profiler/time changed.');
    if (innerWidth !== record.configuration.viewport[0] || innerHeight !== record.configuration.viewport[1] || devicePixelRatio !== record.configuration.dpr)
      fail('Viewport/DPR changed.');
    for (const name of settingsKeys) if (g.save.settings[name] !== settings[name]) fail('Setting changed: ' + name);
    if (frozenRender && (g.renderer.domElement.width !== frozenRender[0] || g.renderer.domElement.height !== frozenRender[1])) fail('Internal resolution changed.');
    if (g.camera.pitch !== .22 || g.camera.distance !== 6.2) fail('Camera configuration changed.');
    if (city.residents.length !== 10) fail('Resident population changed.');
  };
  function restoreNavigation(snapshot) {
    city.cursor = snapshot.cursor; city.talking = city.residents.find(r => r.data.id === snapshot.talking) ?? null;
    city.nav.cells.set(snapshot.cells); city.nav.weights.set(snapshot.weights); city.nav.edges = new Map(snapshot.edges);
    city.nav.revision = snapshot.revision; city.nav.worldRevision = snapshot.worldRevision;
    city.job = null;
    if (snapshot.job) {
      const s = snapshot.job.search, open = Object.create(heapPrototype); open.data = copy(s.open);
      city.job = { resident: city.residents.find(r => r.data.id === snapshot.job.id), search: {
        ...copy(fields(s, ['avoid', 'from', 'to', 'end', 'start', 'revision', 'done', 'result'])),
        open, cost: new Map(s.cost), came: new Map(s.came), closed: new Set(s.closed) } };
    }
  }
  function restoreBehavior(snapshot, nav) {
    release();
    const saved = copy(snapshot.save);
    Object.assign(g.save, saved); g.save.world.cityLife = city.state;
    for (const r of city.residents) {
      const s = snapshot.residents.find(s => s.id === r.data.id);
      Object.assign(r.state, copy(s.state)); r.position.fromArray(s.position); r.route = copy(s.route);
      Object.assign(r, fields(s, residentFields));
      if (r.character) { r.character.group.position.copy(r.position); r.character.group.rotation.y = r.state.yaw; }
    }
    restoreNavigation(nav);
    habitat.elapsed = snapshot.habitatRuntime.elapsed; habitat.remainder = snapshot.habitatRuntime.remainder;
    for (const a of habitat.animals) {
      a.record = copy(saved.world.habitatLife.animals.find(s => s.id === a.record.id));
      const previous = snapshot.habitatRuntime.previous.find(s => s.id === a.record.id);
      a.previous = copy(previous.position); a.root.quaternion.fromArray(previous.quaternion);
      // Rebuild a valid current pose; this is not an exact animation-mixer checkpoint.
      a.mixer?.stopAllAction(); a.action = undefined; a.clipState = undefined; a.deerGait?.reset(); habitat.poseNow(a);
    }
    g.siltfin.state = copy(saved.world.siltfin); Object.assign(g.siltfin, snapshot.siltfinRuntime);
    g.siltfin.previousClock = null; // Source update explicitly resynchronizes clips after a clock reset.
    Object.assign(g.reedwing, snapshot.reedwingRuntime);
    g.villagers.release();
    for (const a of g.villagers.actors) {
      const s = snapshot.villagers.find(s => s.id === a.data.id);
      a.position.fromArray(s.position); a.route = copy(s.route);
      Object.assign(a, fields(s, ['stage', 'room', 'wait', 'animationDt']));
      a.character.group.position.copy(a.position); a.character.group.quaternion.fromArray(s.quaternion);
    }
    Object.assign(g.player, fields(snapshot.player, playerFields));
    g.player.position.fromArray(snapshot.player.position); g.player.velocity.fromArray(snapshot.player.velocity);
    g.player.bike.position.fromArray(snapshot.player.bikePosition); g.player.bike.quaternion.fromArray(snapshot.player.bikeQuaternion);
    g.player.character.group.position.copy(g.player.position); g.player.character.group.rotation.y = g.player.yaw;
    Object.assign(g.camera, fields(snapshot.camera, ['yaw', 'pitch', 'distance', 'photo', 'boom', 'ready']));
    g.camera.target.fromArray(snapshot.camera.target); g.camera.photoOffset.fromArray(snapshot.camera.photoOffset);
    g.camera.camera.position.fromArray(snapshot.camera.position); g.camera.camera.quaternion.fromArray(snapshot.camera.quaternion);
  }
  function resetRoute() {
    g.teleport(...route[0]); g.player.yaw = 0; g.player.velocity.set(0, 0); g.player.speed = 0;
    g.camera.yaw = 0; g.camera.pitch = .22; g.camera.distance = 6.2;
    return { index: 1, crossings: 0, best: Infinity, progressAt: performance.now(), timedFullLaps: 0, firstTimedCrossing: false, timedWaypoints: [] };
  }
  function steer(state, now, timedStart = null) {
    let target = route[state.index], dx = target[0] - g.player.position.x, dz = target[1] - g.player.position.z;
    let distance = Math.hypot(dx, dz);
    if (distance < .4) {
      if (timedStart !== null) {
        if (state.timedWaypoints.length >= 64) fail('Waypoint event cap exceeded; invalid attempt.');
        state.timedWaypoints.push({ ms: now - timedStart, waypoint: state.index, position: g.player.position.toArray() });
      }
      state.index++;
      if (state.index === route.length) {
        state.index = 1; state.crossings++;
        if (timedStart !== null) { if (state.firstTimedCrossing) state.timedFullLaps++; state.firstTimedCrossing = true; }
      }
      target = route[state.index]; dx = target[0] - g.player.position.x; dz = target[1] - g.player.position.z;
      distance = Math.hypot(dx, dz); state.best = Infinity; state.progressAt = now;
    }
    if (distance < state.best - .15) { state.best = distance; state.progressAt = now; }
    if (now - state.progressAt > limits.movementStallMs) fail('Market route stalled for six seconds.');
    g.camera.yaw = Math.atan2(-dx, -dz);
  }
  const statistics = samples => {
    if (!samples.length) return null;
    const sorted = [...samples].sort((a, b) => a - b), total = samples.reduce((a, b) => a + b, 0);
    const q = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    return { frames: samples.length, totalMs: total, fps: samples.length * 1000 / total, mean: total / samples.length,
      median: q(.5), p95: q(.95), p99: q(.99), min: sorted[0], max: sorted.at(-1),
      over33: samples.filter(n => n > 33.3).length, over50: samples.filter(n => n > 50).length, over100: samples.filter(n => n > 100).length };
  };
  function assess(run) {
    const invalid = run.before.residents.filter(r => !r.validPosition || !r.validDestination).map(r => r.id);
    const invalidEnd = run.after?.residents.filter(r => !r.validPosition || !r.validDestination).map(r => r.id) ?? null;
    const failedWorkArrivals = run.before.residents.filter(r => r.state.activity !== 'work' || r.destinationDistance > .025).map(r => r.id);
    return { invalidResidents: invalid, invalidResidentsAtEnd: invalidEnd, failedWorkArrivals: run.scenario === 'work-.30' ? failedWorkArrivals : null,
      fullySettledWork: run.scenario === 'work-.30' && !invalid.length && !failedWorkArrivals.length,
      startCounts: run.before.counts, endCounts: run.after?.counts ?? null,
      note: 'An incomplete work arrival remains a measured failed-arrival workload. Errand transition may finish during timing; do not label it sustained crowds.' };
  }
  const api = window.__cityActivityPerformance = {
    get running() { return running; },
    poll: () => ({ running, stage, scenario: current?.scenario ?? null, repeat: current?.repeat ?? null,
      seconds: current?.actualMs != null ? current.actualMs / 1000 : null, completedRuns: record.runs.filter(r => r.completed).length,
      stopping, error: record.error }),
    stop: reason => { stop(reason); return { stopRequested: true }; },
    export: () => { if (running) fail('Stop and wait for restoration before export; no serialization during timing.'); return JSON.stringify(record); },
  };
  api.finished = (async () => {
    try {
      g.settings(settings); g.setTime(.30); g.save.world.elapsedSeconds = 0;
      city.reset(); habitat.reset(); g.siltfin.reset();
      g.save.world.reedwingSeen = false;
      resetRoute();
      frozenRender = [g.renderer.domElement.width, g.renderer.domElement.height];
      record.configuration.render = frozenRender;
      record.initialFixture = { behavior: behavior(), navigation: navigation() };
      stage = 'settling';
      const settleWall = performance.now(), settleClock = g.save.world.elapsedSeconds;
      while (g.save.world.elapsedSeconds - settleClock < settleSeconds) { await frame(); check(.30); }
      record.settling = { actualWallMs: performance.now() - settleWall,
        activeWorldSeconds: g.save.world.elapsedSeconds - settleClock, requestedSeconds: settleSeconds };
      record.settledFixture = { behavior: behavior(), navigation: navigation() };
      for (const scenario of record.configuration.scenarios) for (let repeat = 1; repeat <= repeats; repeat++) {
        stage = 'restoring-fixture';
        const restoreStart = performance.now();
        restoreBehavior(record.settledFixture.behavior, record.settledFixture.navigation);
        const movement = resetRoute(), time = scenario === 'work-.30' ? .30 : .52;
        activeMovement = movement;
        g.setTime(time);
        current = { scenario, repeat, completed: false, invalid: false, restoreMs: performance.now() - restoreStart,
          fixture: 'settledFixture', restored: behavior(), samples: [], rafTimestamps: [], trace: [], actualMs: 0 };
        record.runs.push(current);
        current.restoreCheck = {
          worldMatches: JSON.stringify(current.restored.save.world) === JSON.stringify(record.settledFixture.behavior.save.world),
          navigationMatches: JSON.stringify(navigation()) === JSON.stringify(record.settledFixture.navigation),
          residentLogicMatches: current.restored.residents.every((resident, i) => {
            const expected = record.settledFixture.behavior.residents[i];
            return resident.id === expected.id && JSON.stringify([resident.state, resident.position, resident.route, fields(resident, residentFields)]) ===
              JSON.stringify([expected.state, expected.position, expected.route, fields(expected, residentFields)]);
          }),
          limitation: 'Checks saved world, navigation and resident logical state. Loaded characters, mixers and internal shader clock remain warm; visibility updates on the next ordinary frame.' };
        if (!current.restoreCheck.worldMatches || !current.restoreCheck.navigationMatches || !current.restoreCheck.residentLogicMatches)
          fail('Settled logical fixture restoration mismatch.');
        stage = 'warmup';
        let now = await frame(), start = now;
        const warmupWorldStart = g.save.world.elapsedSeconds;
        key('keydown', 'KeyW');
        while (now - start < warmupMs) { check(time); steer(movement, now); now = await frame(); }
        current.warmup = { startRafMs: start, actualMs: now - start, crossings: movement.crossings,
          startWorldElapsed: warmupWorldStart, worldElapsed: g.save.world.elapsedSeconds };
        // Deep reads end before acquiring the timing anchor; record the intervening frame explicitly.
        stage = 'boundary-snapshot';
        current.before = behavior();
        current.boundaryReadFinishedMs = performance.now();
        now = await frame(); check(time); steer(movement, now);
        start = now; let previous = now, sampledAt = now;
        current.startRafMs = now; current.startUTC = new Date(performance.timeOrigin + now).toISOString();
        current.startWorldElapsed = g.save.world.elapsedSeconds; current.startPosition = g.player.position.toArray();
        current.snapshotToAnchorMs = now - current.before.performanceMs;
        current.startCounts = counts(); current.startMemory = memory();
        movement.firstTimedCrossing = false; stage = 'timing';
        while (now - start < durationMs) {
          now = await frame();
          const delta = now - previous; previous = now;
          if (current.samples.length >= limits.framesPerRun) fail('Frame sample cap exceeded; invalid attempt.');
          current.samples.push(delta); current.rafTimestamps.push(now); current.actualMs = now - start;
          check(time);
          if (delta >= limits.frameGapMs) fail('Frame gap >=500 ms; game excludes this gap from active simulation.');
          steer(movement, now, start);
          if (now - sampledAt >= 1000) {
            if (current.trace.length >= limits.tracePerRun) fail('Trace cap exceeded; invalid attempt.');
            sampledAt = now;
            current.trace.push({ ms: now - start, worldElapsed: g.save.world.elapsedSeconds, time: g.save.time,
              position: g.player.position.toArray(), speed: g.player.speed, counts: counts(), ...memory() });
          }
        }
        release(); stage = 'boundary-snapshot';
        current.endRafMs = now; current.endWorldElapsed = g.save.world.elapsedSeconds;
        current.after = behavior(); current.endUTC = new Date(performance.timeOrigin + now).toISOString();
        current.route = { fullTimedLaps: movement.timedFullLaps, startLineCrossingsIncludePartialFirst: movement.timedWaypoints.filter(p => p.waypoint === 2).length,
          waypoints: movement.timedWaypoints, endTarget: movement.index, endPosition: g.player.position.toArray() };
        current.stats = statistics(current.samples); current.assessment = assess(current);
        current.invalid = current.assessment.invalidResidents.length > 0 || current.after.residents.some(r => !r.validPosition || !r.validDestination);
        current.completed = true;
      }
      if (JSON.stringify(scripts()) !== JSON.stringify(record.scripts)) fail('Script inventory changed.');
    } catch (error) {
      record.error = String(error);
      if (current && !current.completed) {
        current.invalid = true; current.abortReason = record.error; current.stats = statistics(current.samples);
        current.endWorldElapsed = g.save.world.elapsedSeconds;
        current.route = activeMovement ? { fullTimedLaps: activeMovement.timedFullLaps,
          waypoints: activeMovement.timedWaypoints, endTarget: activeMovement.index, endPosition: g.player.position.toArray() } : null;
        try { current.after = behavior(); if (current.before) current.assessment = assess(current); } catch (snapshotError) { current.snapshotError = String(snapshotError); }
      }
    } finally {
      stage = 'restoring-original'; clearInterval(watchdog); listeners.forEach(remove => remove()); release();
      try {
        record.beforeRestoration = behavior();
        g.ui.pause();
        g.settings(original.saveObject.settings);
        restoreBehavior(original.behavior, original.navigation);
        // settings() persists; restore original byte storage last, then disclose later autosave risk.
        if (original.storageRaw === null) localStorage.removeItem(storageKey); else localStorage.setItem(storageKey, original.storageRaw);
        record.restoration = { immediate: behavior(), storageRawImmediatelyMatches: localStorage.getItem(storageKey) === original.storageRaw,
          settingsImmediatelyMatch: JSON.stringify(g.save.settings) === JSON.stringify(original.saveObject.settings),
          requiresReload: true, mode: g.ui.mode,
          limitation: 'Provisional in-place logical restoration only. Animation mixers, caches, internal shader clock, autosave timer and loaded allocations are not rewound. Paused rendering can advance navigation; autosave/beforeunload can overwrite storage. After export, use a script-free same-origin recovery page to install original.storageRaw (persisted entry) or original.behavior.save with actual initial player X/Z (live entry), then reload the game.' };
      } catch (error) { record.restoration = { error: String(error), requiresReload: true }; }
      record.completed = new Date().toISOString(); record.actualWallMs = performance.now() - startWall;
      record.timingComplete = !record.error && record.runs.length === 6 && record.runs.every(run => run.completed);
      record.invalidRunCount = record.runs.filter(run => run.invalid).length;
      running = false; stage = record.error ? 'aborted' : 'complete';
    }
    return api.poll();
  })();
  return api.poll();
};
