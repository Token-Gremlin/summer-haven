/* One diagnostic render inventory, installed through the own-app browser CDP.
 * Does not change visibility, material, geometry, pose or camera. Restores every
 * callback after four RAFs. Counts submitted triangles, not fragment/GPU cost. */
window.captureDrawInventory = async function () {
  const g = window.__haven;
  const records = [], originals = [];
  const path = object => {
    const names = [];
    for (let o = object; o && o !== g.scene; o = o.parent) names.unshift(o.name || `${o.type}#${o.id}`);
    return names.join(' / ');
  };
  g.scene.traverse(o => {
    if (!o.isMesh) return;
    const previous = o.onBeforeRender;
    originals.push([o, previous]);
    o.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
      previous.call(this, renderer, scene, camera, geometry, material, group);
      const total = geometry.index?.count ?? geometry.attributes.position.count;
      const start = Math.max(geometry.drawRange.start, group?.start ?? 0);
      const end = Math.min(total, geometry.drawRange.start + geometry.drawRange.count,
        group ? group.start + group.count : Infinity);
      records.push({ frame: renderer.info.render.frame, pass: camera.isOrthographicCamera ? 'shadow' : 'scene',
        path: path(this), id: this.id, instances: this.isInstancedMesh ? this.count : 1,
        triangles: Math.max(0,end-start) / 3 * (this.isInstancedMesh ? this.count : 1),
        material: material.name || material.type });
    };
  });
  try {
    for (let i=0; i<4; i++) await new Promise(requestAnimationFrame);
  } finally {
    for (const [o, original] of originals) o.onBeforeRender = original;
  }
  const first = new Map();
  for (const r of records) if (!first.has(r.pass)) first.set(r.pass,r.frame);
  return { created: new Date().toISOString(), build: [...document.scripts].map(s=>s.src),
    position: g.player.position.toArray(), settings: structuredClone(g.save.settings),
    note: 'One render per pass; submitted triangles do not measure visibility, fragments or GPU elapsed time.',
    records: records.filter(r=>r.frame===first.get(r.pass)) };
};
