/* Local QA: synthetic keyboard steering through the ordinary bicycle controller.
 * No player coordinates, speed, heading, collision, clock or world state writes.
 * Camera yaw follows the actual bicycle heading; disclose this scripted camera.
 * Observation/recording may run alongside this helper; this is not a benchmark.
 */
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
      // S becomes reverse below 0.2 m/s; release even if a timer tick overshot zero.
      if (p.speed <= 0.2) return stop('arrived');
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
