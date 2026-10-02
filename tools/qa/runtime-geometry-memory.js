/* Read-only diagnostic. Inject into a local ?qa=1 game, then call
 * window.inventoryGeometryMemory(). Never run during timed performance samples.
 * No render/update/compile/clone/dispose/cache-creation calls are made.
 */
window.inventoryGeometryMemory = function () {
  const g = window.__haven;
  if (!g?.ready) throw new Error('A loaded local QA game is required.');
  if (window.__worldPerformance?.running) throw new Error('Finish timed performance samples before inventorying memory.');
  const started = performance.now();
  const allGeometry = new Set(), allAttributes = new Set(), allBuffers = new Map();
  const rows = [], missing = [];
  let totalBytes = 0;
  const add = (label, roots = [], extraGeometry = [], filter = null) => {
    const objects = new Set(), geometry = new Set(extraGeometry.filter(Boolean)), attributes = new Set();
    const buffers = new Set();
    let meshes = 0, batchMeshes = 0, batchBytes = 0, newBytes = 0;
    const batchBuffers = new Set();
    const attribute = (a, selected = false) => {
      if (!a) return;
      attributes.add(a);
      const array = a.isInterleavedBufferAttribute ? a.data?.array : a.array;
      if (!ArrayBuffer.isView(array)) return;
      const buffer = array.buffer;
      buffers.add(buffer);
      if (selected) batchBuffers.add(buffer);
    };
    const geometryAttributes = (geo, selected = false) => {
      if (!geo) return;
      for (const a of Object.values(geo.attributes ?? {})) attribute(a, selected);
      attribute(geo.index, selected);
      for (const list of Object.values(geo.morphAttributes ?? {}))
        for (const a of list) attribute(a, selected);
    };
    for (const root of roots.filter(Boolean)) root.traverse(o => {
      if (objects.has(o) || filter && !filter(o)) return;
      objects.add(o);
      if (!o.geometry) return;
      meshes++;
      const selected = o.name.startsWith('DRAW_selected_');
      if (selected) batchMeshes++;
      geometry.add(o.geometry);
      // Instance capacity is retained even when mesh.count or visibility is reduced.
      attribute(o.instanceMatrix, selected); attribute(o.instanceColor, selected);
      if (selected) geometryAttributes(o.geometry, true);
    });
    for (const geo of geometry) geometryAttributes(geo);
    for (const buffer of buffers) {
      if (!allBuffers.has(buffer)) {
        allBuffers.set(buffer, { bytes: buffer.byteLength, firstRoot: label });
        newBytes += buffer.byteLength;
      }
    }
    for (const buffer of batchBuffers) batchBytes += buffer.byteLength;
    for (const geo of geometry) allGeometry.add(geo);
    for (const a of attributes) allAttributes.add(a);
    totalBytes += newBytes;
    rows.push({ root: label, meshes, geometries: geometry.size, attributes: attributes.size,
      backingBuffers: buffers.size, inclusiveBackingBytes: [...buffers].reduce((n, b) => n + b.byteLength, 0),
      exclusiveNewBackingBytes: newBytes,
      ...(batchMeshes ? { selectedBatches: batchMeshes, selectedBatchBackingBytes: batchBytes } : {}) });
  };
  const assets = g.assets;
  for (const body of ['feminine', 'masculine']) {
    const raw = assets.characters?.[body];
    add(`assets/raw-wardrobe/${body}`, [raw?.scene]);
    // TypeScript's private cache is an ordinary runtime WeakMap; get() is read-only.
    const prepared = assets.preparedCharacters?.get(raw);
    if (prepared) add(`assets/prepared-wardrobe/${body}`, [prepared.root]);
    else missing.push(`prepared wardrobe ${body} unavailable or not created`);
  }
  const otherAssets = [
    ['library', assets.library], ['architecture', assets.architecture], ['transport', assets.transport],
    ['gorge', assets.gorge], ['raw-reedwing', assets.reedwing?.scene], ['raw-siltfin', assets.siltfinModel?.scene],
    ...Object.entries(assets.wildlife ?? {}).map(([species, a]) => [`wildlife/${species}`, a.scene]),
  ];
  for (const [name, root] of otherAssets) add(`assets/${name}`, [root]);
  const characters = [
    ['player', g.player?.character], ['preview', g.preview],
    ['ferry/maren', g.ferry?.rower],
    ...(g.villagers?.actors ?? []).map(a => [`village/${a.data.id}`, a.character]),
    ...(g.cityLife?.residents ?? []).map(a => [`city/${a.data.id}`, a.character]),
  ];
  const seenCharacters = new Set();
  for (const [name, character] of characters) {
    if (!character) { missing.push(`character ${name} not instantiated`); continue; }
    if (seenCharacters.has(character)) continue;
    seenCharacters.add(character);
    add(`character/${name}`, [character.model]);
  }
  // Include explicitly retained geometry caches that need not be mounted in the scene.
  add('terrain/region-cells-and-high-cache', (g.regions?.cells ?? []).map(c => c.terrain),
    (g.regions?.cells ?? []).map(c => c.high));
  add('foliage/village-trees-and-LOD-cache', (g.village?.trees ?? []).flatMap(t => [t.near, t.far]),
    (g.village?.trees ?? []).flatMap(t => [t.baseHigh, t.baseLow]));
  add('foliage/village-vegetation', g.village?.vegetation ?? []);
  add('foliage/region-cells-and-cache', (g.regions?.cells ?? []).flatMap(c => c.foliage ?? []),
    [...(g.regions?.treeGeometry?.values() ?? []), g.regions?.grass, g.regions?.flowers]);
  // ID 1/3 are ground/berm; ID 4/5/6/16 are grass/rice/tree/flower in world/geo.ts.
  const worldRoots = [g.village?.group, g.regions?.group];
  const outlineId = o => !Array.isArray(o.material) ? o.material?.uniforms?.uId?.value : null;
  add('terrain/world-ground-and-paths', worldRoots, [], o => [1, 3].includes(outlineId(o)));
  add('foliage/world-shader-groups', worldRoots, [], o => [4, 5, 6, 16].includes(outlineId(o)));
  const sky = g.scene.children.find(root => root.children.some(o =>
    o.geometry?.type === 'SphereGeometry' && o.geometry.parameters?.radius === 2600));
  if (sky) add('sky/dome-clouds-ridges-disc', [sky]); else missing.push('sky root not identified');
  add('dragon/reedwing', [g.reedwing?.group]);
  add('dragon/siltfin', [g.siltfin?.group]);
  add('habitat/runtime', [g.habitatLife?.group]);
  add('transport/ferry', [g.ferry?.group]);
  add('interiors', [g.interiors?.group]);
  add('village/all', [g.village?.group]);
  add('regions/all', [g.regions?.group]);
  add('scene/all', [g.scene]);
  return {
    created: new Date().toISOString(), build: [...document.scripts].map(s => s.src),
    durationMs: +(performance.now() - started).toFixed(3),
    totals: { geometries: allGeometry.size, attributes: allAttributes.size,
      backingBuffers: allBuffers.size, uniqueBackingBytes: totalBytes, instantiatedCharacters: seenCharacters.size },
    roots: rows,
    largestBackingBuffers: [...allBuffers.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 10),
    missing,
    notes: [
      'Read-only JS geometry/index/morph/instance attribute backing-buffer inventory; no renderer calls or game mutations.',
      'Inclusive root bytes overlap: never sum them. ExclusiveNewBackingBytes assign each buffer to its first listed root; their sum equals totals.uniqueBackingBytes.',
      'Full backing ArrayBuffers are counted once by identity, including other slices retained by a GLB backing allocation. Shared sector attributes are not multiplied.',
      'Counts include hidden objects and allocated instance capacity, not only visible/submitted geometry. Instantiated character count includes player, preview, village/city actors and ferry rower.',
      'Only declared roots and known geometry caches are inspected. Unknown module/closure caches may retain additional buffers.',
      'Excludes textures, bone textures, separate skeleton/animation arrays, ordinary JS objects/arrays, GPU/process/whole-heap bytes and transient peaks. No attribution of any stall or peak.',
      'Diagnostic Set/Map traversal allocates temporary objects and must remain outside timed performance runs.',
    ],
  };
};
