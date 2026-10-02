import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { uber, surfaceBits } from './materials';
/** Static props share draw calls within spatial cells, preserving frustum culling. */
export function batchStatic(root: T.Object3D, excluded: Set<T.Object3D> = new Set()) {
  root.updateMatrixWorld(true);
  const groups = new Map<string, T.Mesh[]>();
  root.traverse((o) => {
    if (!(o instanceof T.Mesh) || o instanceof T.InstancedMesh || o instanceof T.SkinnedMesh) return;
    for (let a: T.Object3D | null = o; a; a = a.parent) if (excluded.has(a)) return;
    const mat = o.material as T.ShaderMaterial,
      info = mat.userData.uber;
    if (!info || o.geometry.attributes.position.count > 42000) return;
    const p = o.getWorldPosition(new T.Vector3()),
      key = `${Math.floor(p.x / 22)},${Math.floor(p.z / 22)}|${info.id}|${o.layers.mask}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(o);
  });
  for (const [key, meshes] of groups) {
    if (meshes.length < 2) continue;
    const parts = meshes.map((o) => o.geometry.clone().applyMatrix4(o.matrixWorld));
    const geometry = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!geometry) continue;
    const info = (meshes[0].material as T.Material).userData.uber,
      mesh = new T.Mesh(geometry, uber(info.id, info.mask, T.DoubleSide, surfaceBits(geometry) | 1));
    mesh.name = 'Village cell ' + key;
    mesh.layers.mask = meshes[0].layers.mask;
    root.add(mesh);
    meshes.forEach((o) => o.removeFromParent());
  }
}
