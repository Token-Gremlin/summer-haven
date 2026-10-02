import * as T from 'three';
import type { Settings } from '../core/save';

export function sceneryRanges(settings: Pick<Settings, 'visibility' | 'distance' | 'vegetation'>) {
  const full = settings.visibility === 'full';
  const end = full ? 1600 : settings.distance;
  const foliage = full ? 1600 : Math.min(end, 32 + settings.vegetation * 58);
  return {
    end,
    start: Math.max(25, end - 28),
    foliage,
    foliageStart: Math.max(15, foliage - 18),
    lodStart: 16 + settings.vegetation * 20,
    lodEnd: 28 + settings.vegetation * 24,
  };
}

/** Coarse rejection happens only after the shader's distance fade is complete. Collision stays live. */
export class SceneryVisibility {
  readonly entries: { object: T.Mesh; bounds: T.Sphere }[] = [];
  constructor(root: T.Object3D, excluded: Set<T.Object3D>) {
    root.updateMatrixWorld(true);
    root.traverse((object) => {
      if (!(object instanceof T.Mesh) || object instanceof T.InstancedMesh || object instanceof T.SkinnedMesh)
        return;
      for (let p: T.Object3D | null = object; p; p = p.parent) if (excluded.has(p)) return;
      object.geometry.computeBoundingSphere();
      const bounds = object.geometry.boundingSphere!.clone().applyMatrix4(object.matrixWorld);
      if (bounds.radius > 65) return; // Terrain, paths and water remain continuous.
      this.entries.push({ object, bounds });
    });
  }
  update(origin: T.Vector3, end: number) {
    for (const { object, bounds } of this.entries)
      object.visible = end >= 1000 || bounds.center.distanceTo(origin) - bounds.radius < end + 1;
  }
}
