/* Diagnostic A/B on the actual rendered frame: toggle only ridge frustum culling.
 * Geometry, camera, shadows, uniforms, simulation and grade time stay identical.
 * This is a still-image equivalence check, not a performance measurement or a
 * substitute for an uninterrupted camera orbit. All original flags are restored.
 */
window.compareSkyCulling = async function (label, keepImages = false) {
  const g = window.__haven;
  if (!g?.ready) throw new Error('The local QA game must be ready.');
  const ridges = [];
  g.scene.traverse(o => { if (o.isMesh && /^Distant ridge .* sector /.test(o.name)) ridges.push(o); });
  if (ridges.length !== 60) throw new Error(`Expected 60 ridge sectors, found ${ridges.length}.`);
  const original = ridges.map(o => o.frustumCulled);
  const initial = {
    label, created: new Date().toISOString(), build: [...document.scripts].map(s => s.src),
    viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
    render: [g.renderer.domElement.width, g.renderer.domElement.height],
    settings: structuredClone(g.save.settings), time: g.save.time,
    worldSeconds: g.save.world.elapsedSeconds, player: g.player.position.toArray(),
    camera: { position: g.camera.camera.position.toArray(), quaternion: g.camera.camera.quaternion.toArray(),
      target: g.camera.target.toArray(), yaw: g.camera.yaw, pitch: g.camera.pitch, distance: g.camera.distance },
    method: 'Same-frame real scene: all ridge sectors submitted versus normal frustum culling; fixed grade time; no other scene changes.',
  };
  let all, culled;
  try {
    ridges.forEach(o => o.frustumCulled = false);
    g.post.render(g.scene, g.camera.camera, 17);
    all = g.renderer.domElement.toDataURL('image/png');
    ridges.forEach(o => o.frustumCulled = true);
    g.post.render(g.scene, g.camera.camera, 17);
    culled = g.renderer.domElement.toDataURL('image/png');
  } finally {
    ridges.forEach((o, i) => o.frustumCulled = original[i]);
  }
  const pixels = async data => {
    const image = new Image(); image.src = data; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    return ctx.getImageData(0,0,image.width,image.height).data;
  };
  const a=await pixels(all), b=await pixels(culled);
  let differentPixels=0, maximumChannelDelta=0, totalChannelDelta=0;
  for(let i=0;i<a.length;i+=4) {
    let changed=false;
    for(let c=0;c<3;c++) { const d=Math.abs(a[i+c]-b[i+c]);changed ||= d>0;maximumChannelDelta=Math.max(maximumChannelDelta,d);totalChannelDelta+=d; }
    differentPixels+=Number(changed);
  }
  return {...initial,differentPixels,maximumChannelDelta,meanChannelDelta:totalChannelDelta/(a.length/4*3),
    ...(keepImages ? {all,culled} : {})};
};
