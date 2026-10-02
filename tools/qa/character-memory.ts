/** Node-only accounting. Run: npx tsx tools/qa/character-memory.ts <output.json> */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Assets } from '../../src/game/assets';
import { Character } from '../../src/character/character';
import { DEFAULT_APPEARANCE, type Appearance } from '../../src/data/appearance';
import { VILLAGERS } from '../../src/data/villagers';
import { CITY_RESIDENTS } from '../../src/data/city-residents';

const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
function retained(roots: T.Object3D[], kind: 'all' | 'wardrobe' | 'batches' = 'all') {
  const geometries = new Set<T.BufferGeometry>(), buffers = new Set<ArrayBufferLike>();
  let meshes = 0;
  for (const root of roots) root.traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    const batch = o.name.startsWith('DRAW_selected_');
    if (kind === 'wardrobe' && batch || kind === 'batches' && !batch) return;
    meshes++; geometries.add(o.geometry);
  });
  for (const g of geometries) for (const a of [...Object.values(g.attributes), ...(g.index ? [g.index] : [])]) {
    const array = (a as T.InterleavedBufferAttribute).isInterleavedBufferAttribute
      ? (a as T.InterleavedBufferAttribute).data.array : (a as T.BufferAttribute).array;
    buffers.add(array.buffer);
  }
  return { meshes, geometries: geometries.size, uniqueBackingBytes: [...buffers].reduce((n, b) => n + b.byteLength, 0) };
}
function signature(model: T.Group): string {
  const hash = createHash('sha256');
  model.traverse(o => {
    if (!(o instanceof T.Mesh) || !o.visible) return;
    hash.update(o.name);
    for (const key of Object.keys(o.geometry.attributes).sort()) {
      const a = o.geometry.attributes[key] as T.BufferAttribute;
      hash.update(key); hash.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength));
    }
    const a = o.geometry.index!;
    hash.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength));
    const mat = o.material as T.ShaderMaterial;
    hash.update(JSON.stringify([mat.userData.uber, mat.defines, o.matrix.toArray()]));
  });
  return hash.digest('hex');
}
function variant(body: Appearance['body'], i: number): Appearance {
  return { ...DEFAULT_APPEARANCE, body, hair: i % 8, top: i % 6, bottom: Math.floor(i / 6) % 4,
    shoes: i % 3, skin: i % 5, hairColor: Math.floor(i / 4) % 6, eyes: i * 3 % 5,
    face: Math.floor(i / 8) % 3, topColor: (i + 2) % 6, bottomColor: (i + 4) % 6,
    accessories: [!!(i & 1), !!(i & 2), !!(i & 4)] };
}
const assets = new Assets(), files = [];
for (const body of ['feminine', 'masculine'] as const) {
  const b = readFileSync(`public/assets/characters/${body}.glb`);
  files.push({ body, bytes: b.byteLength, sha256: sha(b) });
  assets.characters[body] = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
}
const cases = [
  { id: 'player-default', appearance: DEFAULT_APPEARANCE },
  { id: 'preview-default', appearance: DEFAULT_APPEARANCE },
  ...VILLAGERS.map(p => ({ id: `village/${p.id}`, appearance: p.appearance })),
  ...CITY_RESIDENTS.map(p => ({ id: `city/${p.id}`, appearance: p.appearance })),
];
const people = cases.map(p => new Character(assets, p.appearance));
const roots = people.map(p => p.model), sources = Object.values(assets.characters).map(g => g.scene);
const population = {
  total: people.length, playerAndPreview: 2, villagers: VILLAGERS.length, city: CITY_RESIDENTS.length,
  feminine: cases.filter(p => p.appearance.body === 'feminine').length,
  masculine: cases.filter(p => p.appearance.body === 'masculine').length,
};
const accounting = {
  allWithRawAssets: retained([...sources, ...roots]), wardrobe: retained(roots, 'wardrobe'), batches: retained(roots, 'batches'),
};
const signatures = cases.map((p, i) => ({ id: p.id, appearance: p.appearance, sha256: signature(people[i].model) }));
for (const body of ['feminine', 'masculine'] as const) {
  const person = new Character(assets, { ...DEFAULT_APPEARANCE, body });
  signatures.push({ id: `${body}/default`, appearance: person.appearance, sha256: signature(person.model) });
  for (let i = 0; i < 24; i++) {
    person.apply(variant(body, i));
    signatures.push({ id: `${body}/variant-${i}`, appearance: person.appearance, sha256: signature(person.model) });
  }
}
const output = {
  created: new Date().toISOString(), files,
  sourceHashes: Object.fromEntries(['src/game/assets.ts', 'src/character/character.ts'].map(p => [p, sha(readFileSync(p))])),
  method: 'Node GLTFLoader + actual Character; all defined residents simultaneous, default player/preview. Full backing buffers deduplicated by identity. Population accounting precedes extra appearance probes.',
  limitations: 'No browser/rendering. Excludes JS object, skeleton and animation storage, GPU/process/whole-heap and transient peaks. Raw GLTF geometry views retain their complete backing buffers. No stall attribution or visual approval.',
  population, accounting, signatures,
};
const target = process.argv[2] ?? '.cache/character-memory.json';
writeFileSync(target, JSON.stringify(output, null, 2));
console.log(JSON.stringify({ output: target, population, accounting, signatures: signatures.length }));
