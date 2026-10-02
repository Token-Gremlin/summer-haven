import * as THREE from 'three';

/**
 * Partition a static, single-material ring into whole triangles. Vertex buffers are shared:
 * no attribute, triangle, winding, shader coordinate or seam vertex is changed. Only indices
 * and conservative bounds differ. The returned geometries have a shared lifetime; dispose
 * them together because Three's renderer also shares their attribute buffers.
 *
 * Bounds cover the referenced vertices, not the complete shared position buffer. Wind padding
 * assumes the unit-scale, translation-only sky transform and materials.ts windOffset/uPush:
 * k <= 1.24, giving displacement < .45*aWind plus < .48*min(aWind, 1) for player push.
 */
export function angularSectors(source: THREE.BufferGeometry, count = 12): THREE.BufferGeometry[] {
  if (!Number.isInteger(count) || count < 1 || count > 256)
    throw new Error('Angular sector count must be an integer between 1 and 256.');
  if (source.groups.length || Object.keys(source.morphAttributes).length ||
      source.drawRange.start !== 0 || source.drawRange.count !== Infinity)
    throw new Error('Angular sectors require complete static single-material geometry.');
  const position = source.getAttribute('position');
  const index = source.getIndex();
  const n = index?.count ?? position.count;
  if (n % 3) throw new Error('Angular sectors require complete triangles.');
  const triangleSector = new Uint8Array(n / 3);
  const sizes = new Uint32Array(count);
  const vertexAt = (i: number) => index ? index.getX(i) : i;
  const tau = Math.PI * 2;
  for (let i = 0; i < n; i += 3) {
    const a = vertexAt(i), b = vertexAt(i + 1), c = vertexAt(i + 2);
    const x = position.getX(a) + position.getX(b) + position.getX(c);
    const z = position.getZ(a) + position.getZ(b) + position.getZ(c);
    const angle = (Math.atan2(x, -z) + tau) % tau;
    const sector = Math.min(count - 1, Math.floor(angle / tau * count));
    triangleSector[i / 3] = sector;
    sizes[sector] += 3;
  }
  const indices = Array.from(sizes, size => new Uint32Array(size));
  const bounds = Array.from({ length: count }, () => new THREE.Box3());
  const wind = source.getAttribute('aWind');
  const maxWind = new Float64Array(count);
  const cursor = new Uint32Array(count);
  const point = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    const sector = triangleSector[i / 3];
    for (let j = 0; j < 3; j++) {
      const vertex = vertexAt(i + j);
      indices[sector][cursor[sector]++] = vertex;
      point.fromBufferAttribute(position, vertex);
      bounds[sector].expandByPoint(point);
      if (wind) maxWind[sector] = Math.max(maxWind[sector], wind.getX(vertex));
    }
  }
  const result: THREE.BufferGeometry[] = [];
  for (let sector = 0; sector < count; sector++) {
    if (!sizes[sector]) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.name = `${source.name || 'ridge'} sector ${sector + 1}/${count}`;
    for (const [name, attribute] of Object.entries(source.attributes))
      geometry.setAttribute(name, attribute);
    geometry.setIndex(new THREE.BufferAttribute(indices[sector], 1));
    const w = maxWind[sector];
    bounds[sector].expandByScalar(.45 * w + .48 * Math.min(w, 1) + 1e-4);
    geometry.boundingBox = bounds[sector];
    geometry.boundingSphere = bounds[sector].getBoundingSphere(new THREE.Sphere());
    result.push(geometry);
  }
  return result;
}
