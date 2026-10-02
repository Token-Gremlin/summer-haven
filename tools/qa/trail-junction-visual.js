/* Local diagnostic: isolate the added outside-corner trail patches in the actual
 * runtime. Both stills use the same simulation, camera, shadows and grade time.
 * This visibility comparison is not an old-build replay or motion approval.
 */
window.compareTrailJunctions = function (label) {
  const g = window.__haven;
  if (!g?.ready) throw new Error('A loaded local QA game is required.');
  if (window.__worldPerformance?.running) throw new Error('Finish performance sampling first.');
  const joins = [];
  g.regions.group.traverse(o => { if (o.isMesh && o.name.startsWith('Trail join ')) joins.push(o); });
  if (!joins.length) throw new Error('No trail junctions in this build.');
  const original = joins.map(o => o.visible);
  const canvas = g.renderer.domElement;
  const result = {
    label, created: new Date().toISOString(), build: [...document.scripts].map(s => s.src),
    viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
    render: [canvas.width, canvas.height], settings: structuredClone(g.save.settings),
    time: g.save.time, worldSeconds: g.save.world.elapsedSeconds,
    player: g.player.position.toArray(), appearance: structuredClone(g.save.appearance),
    camera: { position: g.camera.camera.position.toArray(), quaternion: g.camera.camera.quaternion.toArray(),
      target: g.camera.target.toArray(), yaw: g.camera.yaw, pitch: g.camera.pitch, distance: g.camera.distance },
    patches: joins.map(o => ({ name: o.name, vertices: o.geometry.attributes.position.count,
      triangles: (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 })),
    method: 'Same-frame actual rendering, added junction patches hidden then shown; fixed grade time. No other state change.',
    limits: 'Unblinded visual isolation of the correction, not an old-build comparison. No motion or performance approval.',
  };
  try {
    joins.forEach(o => o.visible = false);
    g.post.render(g.scene, g.camera.camera, 17);
    result.without = canvas.toDataURL('image/png');
    joins.forEach(o => o.visible = true);
    g.post.render(g.scene, g.camera.camera, 17);
    result.with = canvas.toDataURL('image/png');
  } finally {
    joins.forEach((o, i) => o.visible = original[i]);
  }
  return result;
};
