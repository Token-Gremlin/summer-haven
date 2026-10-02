import * as T from 'three';

/** Permanent canopy plus optional leaf cards. Trees keep their silhouette at every view distance. */
export function treeLayer(source: T.BufferGeometry, leaves: boolean) {
  const ids = source.index!,
    mat = source.attributes.aMat,
    p = source.attributes.position;
  const chosen: number[] = [],
    centers = new Map<number, T.Vector3>();
  for (let i = 0; i < ids.count; i += 3) {
    const id = mat.getX(ids.getX(i)),
      card = id === 17 || id === 21;
    if (card === leaves) chosen.push(ids.getX(i), ids.getX(i + 1), ids.getX(i + 2));
  }
  if (leaves)
    for (let i = 0; i < chosen.length; i += 6) {
      const indices = [...new Set(chosen.slice(i, i + 6))],
        center = new T.Vector3();
      for (const k of indices) center.add(new T.Vector3(p.getX(k), p.getY(k), p.getZ(k)));
      center.divideScalar(indices.length);
      for (const k of indices) centers.set(k, center);
    }
  const unique = [...new Set(chosen)],
    remap = new Map(unique.map((id, i) => [id, i]));
  const result = new T.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const values: number[] = [];
    for (const k of unique)
      for (let j = 0; j < attribute.itemSize; j++) values.push(attribute.array[k * attribute.itemSize + j]);
    result.setAttribute(name, new T.Float32BufferAttribute(values, attribute.itemSize, attribute.normalized));
  }
  if (leaves)
    result.setAttribute(
      'aLeafCenter',
      new T.Float32BufferAttribute(
        unique.flatMap((k) => centers.get(k)!.toArray()),
        3,
      ),
    );
  result.setIndex(chosen.map((k) => remap.get(k)!));
  return result;
}
