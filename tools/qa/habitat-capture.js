/* Inject only into the local ?qa=1 candidate through the browser development tool.
 * Records actual elapsed gameplay. It never advances clocks, moves residents or
 * alters rendering. Read window.__habitatCapture after completion and save the
 * blob/metadata through the same browser tool. Canvas excludes the HTML HUD.
 */
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
