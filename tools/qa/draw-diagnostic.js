/* Developer-only CPU draw diagnostic. Inject before a local QA route, save the
 * result, then call restore(). This instrumentation is not a performance score. */
window.beginDrawDiagnostic = function () {
  const g = window.__haven;
  if (!g?.ready) throw new Error('Wait for the QA game to load.');
  if (window.__drawDiagnostic?.running) throw new Error('Diagnostic already running.');
  const renderer = g.renderer, original = renderer.renderBufferDirect;
  const start = performance.now();
  const result = window.__drawDiagnostic = {
    running: true, thresholdMs: 8, started: new Date().toISOString(),
    initialPrograms: renderer.info.programs.length, draws: 0, slowDraws: [],
    restore() {
      renderer.renderBufferDirect = original;
      this.running = false;
      this.finalPrograms = renderer.info.programs.length;
      this.finished = new Date().toISOString();
    },
  };
  renderer.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const before = performance.now(), programs = renderer.info.programs.length;
    const returned = original.call(this, camera, scene, geometry, material, object, group);
    const ms = performance.now() - before;
    result.draws++;
    if (ms > result.thresholdMs && result.slowDraws.length < 500) {
      result.slowDraws.push({ atMs: before - start, ms, object: object.name,
        parent: object.parent?.name, geometry: geometry.id, material: material.name,
        defines: material.defines, position: g.player.position.toArray(),
        camera: camera.position.toArray(), programsBefore: programs,
        programsAfter: renderer.info.programs.length,
        scenePass: renderer.getRenderTarget()?.textures?.length === 2,
        indexedTriangles: (geometry.index?.count ?? geometry.attributes.position.count) / 3,
        instances: object.isInstancedMesh ? object.count : 1,
      });
    }
    return returned;
  };
  return { running: result.running, thresholdMs: result.thresholdMs };
};
