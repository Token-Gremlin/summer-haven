/* Local QA only. Follow declared waypoints through the real player controller.
 * One initial placement is performed by the caller before recording. This helper
 * never teleports, writes player coordinates, advances time or bypasses collision.
 * Camera steering is scripted; movement uses normal keyboard events.
 */
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
