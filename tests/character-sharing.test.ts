import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { Assets } from '../src/game/assets';
import { Character } from '../src/character/character';
import { DEFAULT_APPEARANCE, SKIN, type Appearance } from '../src/data/appearance';

// Captured from the unmodified renderer path using the actual two production GLBs.
// Each digest covers visible mesh names, all geometry/index bytes, materials and transforms.
const before: Record<string, string[]> = {
  "feminine": [
    "caafb3f880d3f47c17152ac25a32fea00aef579d80968a7b6a6c718de55fde56",
    "d40d2dc2d5fdb78dc66c16bcbfaaf8308e961a550deed3ae74cadc276a1e2717",
    "bb7fce8a13234f203ff989f34395c145ad47a43042984d15b98c8c173ccbb2db",
    "726b59215a152bda6542035f08645c2a821770bee7ea383c598d2dbd7f61556f",
    "7c1b64bb5c3317e6b15e9d1d73a4924664475caba50bc94bab20a064dfe55fac",
    "56fb619791fca97e5436690c31f194cbb28f87fa96a86f6b68323a9ae4a9c6c3",
    "cea0316d7deab46c9787fb1c333daa57eae54081d516ffdc671de74f73511304",
    "e816d230de1fe2da1085ba2b804ca7999aad3aa081da8f4922d53e600bf579c1",
    "2fec252a5585a61f6c0ba52371eab186fd72180ff85ecce13787a0fe51e8f9ea",
    "1ca9ae7ead885f61cec9ef06d6ae41e4cdcec34cc0e7954778ff07e1e714d16e",
    "7ab796f00b775f5522179600e791441cf8c44ac6213877d668021df9d9a3bc72",
    "4d7b745993598e1d4b039d95c9230f10a3fc171e37cb23da86eae0b4eb4adbc2",
    "e3779c98edcab77d915c85a687afe083696c0e7ee5382ea8a9832a330f6bb2c6",
    "2ab6d40d2ac3b0cb0983d8555444d0d1b196d150b6b79478b041e7eb7e1dae91",
    "75d732e041fb92f0188d4337e78d8344e67a00f70f99d906216d44d8d58973b5",
    "194e222e83c1613eaf7bc0ad2814e3635c101261953b0c02b4d595a7e7ba4e0f",
    "abd464e0b423453dab3ddbb31c4d97cc47585c60c4f7f9fec8368a1ad5dd81ca",
    "4a74debd912898fe1439a323118036d1db3c22c743ecc9d098129a78e07cb901",
    "2eb964ba7ef7ce1f24cb2098094a7feb8532547ebfe24ef8e54c9dd731bfebe5",
    "70eded5d8d911114fb1f51b4d44528622942235ca33e468d8a8b9b9a769e0ae5",
    "fccd13ad0aae1e2e2d13d07c3a768e05855bbe59a6113df8fd4d31bfe143a6f3",
    "4074954e4b11bccfc46695737896b6df071599402de450fe21044b9b5836ac76",
    "b192bd66e61aab64a52e2c480e9ca6fd10155a6d757386d5c9545276ef4f4a55",
    "d4dde5397369d16e757f1450625dbc4db66faea1ddac0f36c5ec701cf2164d9f",
    "60475ccb6726a7ca98f27372ffdb4d324f08ea41b3a5fb7f50de552348fa1d3e"
  ],
  "masculine": [
    "7272bddb47eac31556dd049b0f354416c4b1c6885a3d3867ca95dd980d8877cd",
    "9d4467a358dd215b8e8e4c519dffe85b0075ef305c1b1d9c5908ad0a1b391a88",
    "769a98a6df9d0d4b55861422412e6d316ae971795fe21dc3c6991ce7f1a65197",
    "e113368606ea6630d99b3603193802c9149e1e5b45a37ad355b081fa7173c4ef",
    "3344abb39090a6ab65420e1172c5f34298e835223f8f19023e15349365f104e7",
    "540d819bdfdccff6fae2657c1181e07150bfca0ae852f49b63e380fca942bd1f",
    "fb3667e3f3ad30d9e2a57f000f39b890152cbc888e9f2279f184b5a74237e715",
    "52a95978744de13cfe3adc13429b696d6772ba28dc6f0091c21a7ec4ba6e54dc",
    "b115b5a0956547de69a9c49e969a6d903b0b181ed7c2ebd84c70ec1cc0425ff1",
    "0954c077734811893c8f571743992cf6eb3347a72d737abfbee7d8335268bd51",
    "86db7d309b52a1c774e9c2f6d95934c30a7698550f34986a4bbea6313238a3ac",
    "15fbbf9853448b2dafeefb298faec3980a4bf34633a54c10fdf59e9b62ba12f9",
    "eacd9ec0fe07b79bcc41b68e04bdc44b78dfb1874925b6e16d85c02ffe9ef4a4",
    "7c4bf5a6508a1eca003ccb94e31c3c6d0b6349dea93cd9690dd922902b10cfe4",
    "e46f7d5de95683747df192f9bbfcb398bdb9b5e09c690b5de9df9654939abfda",
    "1c293793632ef9cf5d990ca8dc2d049f0a58c1ec76e4c6abc09e705209f2772b",
    "0c520a3ea3f80e5362b63a17ba5ac0e2982baa74b3b32138aa3a3376736e5786",
    "3ba32a8ffad692d0aefd840211c21937750adef1fa05ad17058d5af737806ce5",
    "87b1b98037a3c71bc59ddbcbb79bfe7eee053192221d65319b7ccf8da2131b39",
    "7d8b586923fdf5faf06f17c4d8824c020ace8262246cf28afda468dfd22552c9",
    "2e9b4e483d7212a7e4bf04f585f2989ad8953cb7423653687c7a75fb768fd197",
    "cf34956d4c15ec545c73e2c1fb4b3ac189f553ef8ff20a66a9bb89aa024ddddc",
    "216caaaae8c7cb55396b9fc8b159df33f11543fed823f62f9ff0771b16f8506b",
    "33cc40f837a916fd4c15480885bfc582f4c874d344107d635ba5d93d9bb713ad",
    "d5de33cca8c066d46adbc8348fed3798c19e169b9b2d302efa0694f08f39f638"
  ]
};

function appearance(body: Appearance['body'], i: number): Appearance {
  return i < 0 ? { ...DEFAULT_APPEARANCE, body } : { ...DEFAULT_APPEARANCE, body,
    hair: i % 8, top: i % 6, bottom: Math.floor(i / 6) % 4, shoes: i % 3,
    skin: i % 5, hairColor: Math.floor(i / 4) % 6, eyes: i * 3 % 5, face: Math.floor(i / 8) % 3,
    topColor: (i + 2) % 6, bottomColor: (i + 4) % 6,
    accessories: [!!(i & 1), !!(i & 2), !!(i & 4)],
  };
}
function meshes(root: T.Object3D): T.Mesh[] {
  const result: T.Mesh[] = [];
  root.traverse(o => { if (o instanceof T.Mesh) result.push(o); });
  return result;
}
function signature(model: T.Group): string {
  const hash = createHash('sha256');
  for (const o of meshes(model).filter(o => o.visible)) {
    hash.update(o.name);
    for (const key of Object.keys(o.geometry.attributes).sort()) {
      const a = o.geometry.attributes[key] as T.BufferAttribute;
      hash.update(key); hash.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength));
    }
    const a = o.geometry.index!;
    hash.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength));
    const mat = o.material as T.ShaderMaterial;
    hash.update(JSON.stringify([mat.userData.uber, mat.defines, o.matrix.toArray()]));
  }
  return hash.digest('hex');
}
let loaded: Promise<Assets> | undefined;
function assets(): Promise<Assets> {
  return loaded ??= (async () => {
    const result = new Assets();
    for (const body of ['feminine', 'masculine'] as const) {
      const b = readFileSync(`public/assets/characters/${body}.glb`);
      result.characters[body] = await new GLTFLoader().parseAsync(
        b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '',
      );
    }
    return result;
  })();
}

test('real GLBs preserve exact selected geometry across every appearance option value', async () => {
  const library = await assets();
  for (const body of ['feminine', 'masculine'] as const) {
    const person = new Character(library, appearance(body, -1));
    assert.equal(signature(person.model), before[body][0]);
    for (let i = 0; i < 24; i++) {
      person.apply(appearance(body, i));
      assert.equal(signature(person.model), before[body][i + 1], `${body} appearance ${i}`);
    }
  }
});

test('wardrobe buffers are shared while bones, skeletons, colors and face transforms stay independent', async () => {
  const library = await assets();
  const a = new Character(library, appearance('feminine', -1));
  const b = new Character(library, appearance('feminine', 20));
  const bBefore = signature(b.model);
  const sourceA = meshes(a.model).filter(o => !o.name.startsWith('DRAW_'));
  const sourceB = new Map(meshes(b.model).filter(o => !o.name.startsWith('DRAW_')).map(o => [o.name, o]));
  assert.equal(sourceA.length, 288);
  for (const p of sourceA) {
    const other = sourceB.get(p.name)!;
    assert.equal(p.geometry, other.geometry);
    assert.notEqual((p as T.SkinnedMesh).skeleton, (other as T.SkinnedMesh).skeleton);
    assert.notEqual((p as T.SkinnedMesh).skeleton.bones[0], (other as T.SkinnedMesh).skeleton.bones[0]);
  }
  assert.notEqual(a.bones.get('head'), b.bones.get('head'));
  const immutableColors = sourceA.map(p => (p.geometry.getAttribute('color').array as Float32Array).slice());
  a.apply(appearance('feminine', 9));
  a.setState('walk');
  a.update(.1, 1, 0, 0, 1);
  assert.equal(signature(b.model), bBefore);
  for (let i = 0; i < sourceA.length; i++)
    assert.deepEqual(sourceA[i].geometry.getAttribute('color').array, immutableColors[i]);
  const privateA = new Set(meshes(a.model).filter(o => o.name.startsWith('DRAW_')).map(o => o.geometry));
  for (const p of meshes(b.model).filter(o => o.name.startsWith('DRAW_'))) assert(!privateA.has(p.geometry));
});

test('repeated wardrobe/body changes dispose private batches and old rig textures, never shared geometry', async () => {
  const library = await assets();
  const a = new Character(library, appearance('feminine', -1));
  const b = new Character(library, appearance('feminine', -1));
  let sharedDisposals = 0;
  for (const p of meshes(a.model).filter(o => !o.name.startsWith('DRAW_')))
    p.geometry.addEventListener('dispose', () => sharedDisposals++);
  for (const body of ['feminine', 'masculine', 'feminine', 'masculine'] as const) {
    let disposed = 0;
    const batches = meshes(a.model).filter(o => o.name.startsWith('DRAW_'));
    for (const p of batches) p.geometry.addEventListener('dispose', () => disposed++);
    a.apply(appearance(body, 10));
    assert.equal(disposed, batches.length);
  }
  const skeleton = (meshes(a.model).find(o => o instanceof T.SkinnedMesh) as T.SkinnedMesh).skeleton;
  skeleton.boneTexture = new T.DataTexture(new Float32Array(16), 4, 1, T.RGBAFormat, T.FloatType);
  let textureDisposals = 0;
  skeleton.boneTexture.addEventListener('dispose', () => textureDisposals++);
  a.apply(appearance('feminine', -1));
  assert.equal(textureDisposals, 1);
  assert.equal(sharedDisposals, 0);
  assert.equal(signature(b.model), before.feminine[0]);
});

function syntheticLibrary(skinned: boolean): Assets {
  const library = new Assets();
  const scene = new T.Group(), bone = new T.Bone();
  bone.name = 'root'; scene.add(bone);
  const skeleton = new T.Skeleton([bone]);
  for (let i = 0; i < 2; i++) {
    const geometry = new T.BoxGeometry(.1, .1, .1);
    const material = new T.MeshStandardMaterial({ color: '#d8a588' });
    material.name = 'skin';
    let mesh: T.Mesh;
    if (skinned) {
      const n = geometry.attributes.position.count;
      geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(new Uint16Array(n * 4), 4));
      const weights = i ? new Uint16Array(n * 4) : new Float32Array(n * 4);
      for (let k = 0; k < n; k++) weights[k * 4] = i ? 65535 : 1;
      geometry.setAttribute('skinWeight', new T.BufferAttribute(weights, 4, !!i));
      const skin = new T.SkinnedMesh(geometry, material); skin.bind(skeleton); mesh = skin;
    } else mesh = new T.Mesh(geometry, material);
    mesh.name = `BODY_test_${i}`; scene.add(mesh);
  }
  const gltf = { scene, scenes: [scene], animations: [], asset: { version: '2.0' } } as unknown as GLTF;
  library.characters.feminine = gltf; library.characters.masculine = gltf;
  return library;
}
function fallbackOwnership(skinned: boolean): void {
  const library = syntheticLibrary(skinned);
  const sources = meshes(library.character('feminine').root).map(o => o.geometry);
  const a = new Character(library, { ...DEFAULT_APPEARANCE, skin: 0 });
  const b = new Character(library, { ...DEFAULT_APPEARANCE, skin: 4 });
  const selected = meshes(a.model);
  assert.equal(selected.length, 2);
  assert(selected.every(p => p.visible));
  let disposed = 0;
  for (let i = 0; i < 2; i++) {
    assert.notEqual(selected[i].geometry, sources[i]);
    assert.notEqual(selected[i].geometry, meshes(b.model)[i].geometry);
    selected[i].geometry.addEventListener('dispose', () => disposed++);
  }
  a.apply({ ...DEFAULT_APPEARANCE, skin: 2 });
  assert.equal(disposed, 2);
  const color = new T.Color(SKIN[2]);
  for (const p of meshes(a.model)) {
    const actual = p.geometry.getAttribute('color');
    assert(Math.abs(actual.getX(0) - color.r) < 1e-7);
    assert(Math.abs(actual.getY(0) - color.g) < 1e-7);
    assert(Math.abs(actual.getZ(0) - color.b) < 1e-7);
  }
}
test('selected non-skinned meshes use private colors and release them on reapply', () => fallbackOwnership(false));
test('incompatible batch fallback preserves selected pieces with private colors and ownership', () => {
  const original = console.error;
  let failures = 0;
  console.error = (...args) => {
    if (String(args[0]).includes('BufferGeometryUtils:')) failures++;
    else original(...args);
  };
  try { fallbackOwnership(true); } finally { console.error = original; }
  assert(failures > 0, 'fixture must exercise an actual failed merge');
});
