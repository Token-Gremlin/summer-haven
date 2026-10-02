import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { angularSectors } from '../src/render/angular-sectors';
import { Sky } from '../src/world/sky';
import { LAYER_REFLECT, LAYER_SHADOW } from '../src/render/lightpasses';

const triangles = (g: THREE.BufferGeometry) => {
  const a = g.index?.array ?? Array.from({ length: g.attributes.position.count }, (_, i) => i);
  return Array.from({ length: a.length / 3 }, (_, i) => `${a[i * 3]},${a[i * 3 + 1]},${a[i * 3 + 2]}`);
};

test('whole triangles cross angular seams without changed winding, duplicate faces or copied attributes', () => {
  const source = new THREE.BufferGeometry();
  source.setAttribute('position', new THREE.Float32BufferAttribute([
    -.1, 1, -10, .1, 1, -10, 0, 2, -9.9,
    10, 0, .1, 10, 0, -.1, 9.9, 1, 0,
    0, 0, 10, 1, 0, 9.9, -.1, 1, 10,
  ], 3));
  source.setAttribute('color', new THREE.Uint8BufferAttribute([1, 23, 254, 7, 2, 99, 2, 4, 6], 1, true));
  source.setAttribute('aWind', new THREE.Float32BufferAttribute(new Float32Array(9), 1));
  source.setIndex([2, 1, 0, 3, 4, 5, 6, 8, 7, 0, 1, 2]);
  const before = triangles(source).sort();
  const sectors = angularSectors(source);
  assert.deepEqual(sectors.flatMap(triangles).sort(), before);
  for (const sector of sectors) {
    for (const key of Object.keys(source.attributes))
      assert.equal(sector.getAttribute(key), source.getAttribute(key));
    for (const vertex of sector.index!.array) {
      const p = new THREE.Vector3().fromBufferAttribute(source.attributes.position, vertex);
      assert(sector.boundingBox!.containsPoint(p));
      assert(sector.boundingSphere!.containsPoint(p));
    }
  }
  assert.deepEqual(triangles(source).sort(), before);
});

test('nonindexed geometry retains every face and unsupported grouped geometry is rejected', () => {
  const source = new THREE.BoxGeometry(10, 2, 10).toNonIndexed();
  source.clearGroups();
  const output = angularSectors(source, 8);
  assert.deepEqual(output.flatMap(triangles).sort(), triangles(source).sort());
  assert.throws(() => angularSectors(source, 0), /sector count/);
  source.addGroup(0, 3, 1);
  assert.throws(() => angularSectors(source), /single-material/);
});

test('bounds include a conservative envelope for shader wind and player push', () => {
  const source = new THREE.BufferGeometry();
  source.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -10, .1, 0, -10, 0, .1, -10], 3));
  source.setAttribute('aWind', new THREE.Float32BufferAttribute([2, 1, .5], 1));
  const [sector] = angularSectors(source);
  for (let i = 0; i < 3; i++) {
    const w = source.attributes.aWind.getX(i);
    const p = new THREE.Vector3().fromBufferAttribute(source.attributes.position, i);
    // Worst shader k, arbitrary unit wind direction, and simultaneous maximum player push.
    for (let step = 0; step < 36; step++) {
      const az = step / 36 * Math.PI * 2;
      const horizontal = 1.24 * .34 * w + .45 * Math.min(w, 1);
      const deformed = p.clone().add(new THREE.Vector3(
        Math.sin(az) * horizontal,
        -w * 1.24 ** 2 * .08 - .12 * Math.min(w, 1),
        Math.cos(az) * horizontal,
      ));
      assert(sector.boundingBox!.containsPoint(deformed));
      assert(sector.boundingSphere!.containsPoint(deformed));
    }
  }
});

// Captured from the unpartitioned ridge generator before this experiment. Hash includes every
// attribute's name and exact typed bytes in name order; the original indices are 0..N-1.
const baseline = [
  [67120, '58a71a432e8571ddce1db9bfce54eab9c841ba0525932d97c127aa5546054a5c'],
  [67360, '0cf11770615ba1b313758f5e54788872234b0788233902b4b6bae0b88ebd76ff'],
  [2000, '9b74fc7cf20f284b83a2fd883d31059e1be4dd1ad17016df55ab932c36231ef6'],
  [2000, '9355e93cbde424b26623d2843d632a9ec1b1ca79c6e0c865d284c9d13e20f650'],
  [2000, 'a94728e96e6676936b11e5d261be95075c18ae86392dab24361b92176de03f6e'],
] as const;
let sky: Sky;
const getSky = () => sky ??= new Sky();
const ridgeMeshes = () => getSky().group.children.filter(o => o.name.startsWith('Distant ridge')) as THREE.Mesh[];

test('all five authored ridge layers retain exact attribute bytes and every original triangle once', () => {
  const meshes = ridgeMeshes();
  assert.equal(meshes.length, 60);
  baseline.forEach(([count, hash], layer) => {
    const sectors = meshes.filter(o => o.name.startsWith(`Distant ridge ${layer + 1} `));
    assert.equal(sectors.length, 12);
    const source = sectors[0].geometry;
    const h = createHash('sha256');
    for (const key of Object.keys(source.attributes).sort()) {
      const a = source.attributes[key] as THREE.BufferAttribute;
      h.update(key);
      h.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength));
    }
    assert.equal(h.digest('hex'), hash);
    const seen = new Uint8Array(count);
    let actualCount = 0;
    for (const mesh of sectors) {
      assert.equal(mesh.material, sectors[0].material);
      assert.equal(mesh.frustumCulled, true);
      assert(mesh.layers.isEnabled(LAYER_REFLECT));
      assert(!mesh.layers.isEnabled(LAYER_SHADOW));
      assert.deepEqual(mesh.position.toArray(), [0, 0, 0]);
      assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]);
      for (const key of Object.keys(source.attributes))
        assert.equal(mesh.geometry.getAttribute(key), source.getAttribute(key));
      const index = mesh.geometry.index!;
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i);
        assert.equal(a % 3, 0);
        assert.equal(index.getX(i + 1), a + 1);
        assert.equal(index.getX(i + 2), a + 2);
        assert.equal(seen[a / 3]++, 0);
        actualCount++;
      }
      for (const vertex of index.array) {
        const p = new THREE.Vector3().fromBufferAttribute(source.attributes.position, vertex);
        assert(mesh.geometry.boundingBox!.containsPoint(p));
        assert(mesh.geometry.boundingSphere!.containsPoint(p));
      }
    }
    assert.equal(actualCount, count);
    assert(seen.every(n => n === 1));
  });
});

test('translated sky and reflected views retain visible seam vertices during a full camera rotation', () => {
  const sky = getSky();
  const meshes = ridgeMeshes();
  const camera = new THREE.PerspectiveCamera(58, 920 / 668, .15, 4200);
  const frustum = new THREE.Frustum();
  const projection = new THREE.Matrix4();
  const point = new THREE.Vector3();
  const origin = new THREE.Vector3(355, 56, -746);
  sky.follow(origin);
  sky.group.updateMatrixWorld(true);
  for (const y of [2, 56, 180, -56.38]) {
    camera.position.set(origin.x, y, origin.z);
    camera.up.set(0, y < 0 ? -1 : 1, 0);
    // Sector seams and positions immediately to either side, plus their midpoints.
    for (let step = 0; step < 24; step++) for (const epsilon of [-1e-6, 0, 1e-6]) {
      const yaw = step * Math.PI / 12 + epsilon;
      camera.lookAt(origin.x + Math.sin(yaw) * 1000, y, origin.z - Math.cos(yaw) * 1000);
      camera.updateMatrixWorld(true);
      frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      const visible = meshes.filter(mesh => frustum.intersectsObject(mesh));
      assert(visible.length > 0 && visible.length < meshes.length);
      for (const mesh of meshes) {
        const index = mesh.geometry.index!;
        const position = mesh.geometry.attributes.position;
        for (let i = 0; i < index.count; i += Math.max(1, Math.floor(index.count / 40))) {
          point.fromBufferAttribute(position, index.getX(i)).applyMatrix4(mesh.matrixWorld);
          if (frustum.containsPoint(point)) assert(visible.includes(mesh), `${mesh.name} culled a visible vertex`);
        }
      }
    }
  }
});
