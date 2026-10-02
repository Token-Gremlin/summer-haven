import * as T from 'three';
import type { Settings, Quality } from '../core/save';
import { woodlandMaterial } from '../render/woodland-material';
import { WOODLAND } from '../render/woodland-shared';
import { sceneryRanges } from '../render/visibility';
import { woodlandTemplate, type WoodlandKind, type TreeTemplate } from './woodland-catalog';

export const WOODLAND_BANDS: Record<Quality, [number, number, number]> = {
  low: [0, 12, 44],
  medium: [7, 23, 70],
  high: [16, 38, 105],
  ultra: [24, 52, 145],
};
/** CPU membership overlaps the shader transition by movement slack (10Hz updates). */
export function treeLodLevels(distance: number, quality: Quality): number[] {
  const b = WOODLAND_BANDS[quality],
    widths = [4, 7, 12],
    levels: number[] = [];
  for (let i = quality === 'low' ? 1 : 0; i < 4; i++) {
    const start = i === 0 ? 0 : b[i - 1] - widths[i - 1],
      end = i === 3 ? Infinity : b[i] + widths[i];
    if (distance >= start && distance <= end) levels.push(i);
  }
  return levels;
}
interface Placement {
  matrix: T.Matrix4;
  center: T.Vector3;
  sphere: T.Sphere;
  scale: number;
  tint: T.Color;
  distance: number;
}
interface Batch {
  template: TreeTemplate;
  placements: Placement[];
  meshes: T.InstancedMesh[];
  shadows: T.InstancedMesh[];
  mirrors: T.InstancedMesh[];
  visible: number;
}

/** Shared templates and compacted instance lists, not one Object3D/LOD per tree. */
export class Woodland {
  readonly group = new T.Group();
  private pending = new Map<string, { template: TreeTemplate; matrices: T.Matrix4[] }>();
  private batches: Batch[] = [];
  private lastPosition = new T.Vector3(Infinity, Infinity, Infinity);
  private signature = '';
  private frustum = new T.Frustum();
  private viewMatrix = new T.Matrix4();
  private lastView = new T.Matrix4();
  constructor(name: string) {
    this.group.name = name;
  }
  add(kind: WoodlandKind, seed: number, matrix: T.Matrix4) {
    const key = `${kind}/${seed}`;
    let entry = this.pending.get(key);
    if (!entry) {
      entry = { template: woodlandTemplate(kind, seed), matrices: [] };
      this.pending.set(key, entry);
    }
    entry.matrices.push(matrix.clone());
  }
  build() {
    for (const { template, matrices } of this.pending.values()) {
      if (!matrices.length) continue;
      const placements = matrices.map((matrix) => {
        const e = matrix.elements,
          variation = Math.sin(e[12] * 17.13 + e[14] * 9.27) * 0.5 + 0.5;
        const sphere = template.bounds.clone().applyMatrix4(matrix);
        return {
          matrix,
          center: new T.Vector3(e[12], e[13], e[14]),
          sphere,
          scale: Math.hypot(e[4], e[5], e[6]),
          distance: 0,
          tint: new T.Color().setRGB(0.9 + variation * 0.1, 0.94 + variation * 0.06, 0.86 + variation * 0.1),
        };
      });
      const meshes = template.levels.map((geometry, level) => {
        const mesh = new T.InstancedMesh(geometry, woodlandMaterial(level), matrices.length);
        mesh.name = `${template.species} · detail ${level}`;
        mesh.frustumCulled = false;
        mesh.count = 0;
        mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
        mesh.setColorAt(0, new T.Color());
        mesh.instanceColor!.setUsage(T.DynamicDrawUsage);
        this.group.add(mesh);
        return mesh;
      });
      // Stable middle-detail sun silhouette avoids double shadows during colour LOD transitions.
      const shadows = [2, 3].map((level) => {
        const mesh = new T.InstancedMesh(
          level === 3 ? template.shadow : template.levels[2],
          woodlandMaterial(-1),
          matrices.length,
        );
        mesh.name = `${template.species} · shadow ${level}`;
        mesh.layers.set(1);
        mesh.frustumCulled = false;
        mesh.count = 0;
        mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
        this.group.add(mesh);
        return mesh;
      });
      const mirrors = [2, 3].map((level) => {
        const mesh = new T.InstancedMesh(template.levels[level], woodlandMaterial(-1), matrices.length);
        mesh.name = `${template.species} · mirror ${level}`;
        mesh.layers.set(2);
        mesh.frustumCulled = false;
        mesh.count = 0;
        mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
        mesh.setColorAt(0, new T.Color());
        mesh.instanceColor!.setUsage(T.DynamicDrawUsage);
        this.group.add(mesh);
        return mesh;
      });
      this.batches.push({ template, placements, meshes, shadows, mirrors, visible: 0 });
    }
    this.pending.clear();
  }
  update(position: T.Vector3, settings: Settings, camera?: T.Camera) {
    const signature = `${settings.quality}/${settings.visibility}/${settings.distance}/${settings.reflections}`;
    if (camera) {
      camera.updateMatrixWorld();
      this.viewMatrix.copy((camera as T.PerspectiveCamera).projectionMatrix);
      // A generous guard band covers camera rotation between population updates.
      this.viewMatrix.elements[0] *= 0.78;
      this.viewMatrix.elements[5] *= 0.78;
      this.viewMatrix.multiply(camera.matrixWorldInverse);
    }
    // Wind stays entirely on the GPU; stationary forests need no recurring matrix uploads.
    if (
      signature === this.signature &&
      position.distanceToSquared(this.lastPosition) < 0.16 &&
      (!camera || this.lastView.equals(this.viewMatrix))
    )
      return;
    this.signature = signature;
    this.lastPosition.copy(position);
    if (camera) {
      this.frustum.setFromProjectionMatrix(this.viewMatrix);
      this.lastView.copy(this.viewMatrix);
    }
    WOODLAND.uTreeBands.value.fromArray(WOODLAND_BANDS[settings.quality]);
    const shadowDistance = settings.quality === 'low' ? 8 : settings.quality === 'medium' ? 14 : 24;
    WOODLAND.uTreeShadowDistance.value = shadowDistance;
    const end = sceneryRanges(settings).end;
    for (const batch of this.batches) {
      const counts = [0, 0, 0, 0],
        mirrorCounts = [0, 0],
        shadowCounts = [0, 0];
      batch.visible = 0;
      for (const p of batch.placements)
        p.distance = Math.hypot(p.center.x - position.x, p.center.z - position.z);
      batch.placements.sort((a, b) => a.distance - b.distance);
      for (const p of batch.placements) {
        const distance = p.distance;
        if (distance > end + batch.template.radius * p.scale + 4) continue;
        batch.visible++;
        if (!camera || distance < 35 || this.frustum.intersectsSphere(p.sphere)) {
          const levels = treeLodLevels(distance, settings.quality);
          for (const level of levels) {
            const mesh = batch.meshes[level],
              index = counts[level]++;
            mesh.setMatrixAt(index, p.matrix);
            mesh.setColorAt(index, p.tint);
          }
        }
        if (distance < 102 + batch.template.radius * p.scale) {
          if (distance < shadowDistance + 4) batch.shadows[0].setMatrixAt(shadowCounts[0]++, p.matrix);
          if (distance > shadowDistance - 4) batch.shadows[1].setMatrixAt(shadowCounts[1]++, p.matrix);
        }
        if (settings.reflections) {
          const i = distance < 48 ? 0 : 1,
            mesh = batch.mirrors[i],
            index = mirrorCounts[i]++;
          mesh.setMatrixAt(index, p.matrix);
          mesh.setColorAt(index, p.tint);
        }
      }
      batch.meshes.forEach((mesh, i) => {
        mesh.count = counts[i];
        mesh.visible = counts[i] > 0;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor!.needsUpdate = true;
      });
      batch.shadows.forEach((mesh, i) => {
        mesh.count = shadowCounts[i];
        mesh.visible = shadowCounts[i] > 0;
        mesh.instanceMatrix.needsUpdate = true;
      });
      batch.mirrors.forEach((mesh, i) => {
        mesh.count = mirrorCounts[i];
        mesh.visible = mirrorCounts[i] > 0;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor!.needsUpdate = true;
      });
    }
  }
  stats() {
    return {
      total: this.batches.reduce((s, b) => s + b.placements.length, 0),
      visible: this.batches.reduce((s, b) => s + b.visible, 0),
      levels: [0, 1, 2, 3].map((i) => this.batches.reduce((s, b) => s + b.meshes[i].count, 0)),
      shadows: this.batches.reduce((s, b) => s + b.shadows.reduce((n, m) => n + m.count, 0), 0),
      templates: this.batches.map((b) => ({ species: b.template.species, triangles: b.template.triangles })),
    };
  }
}
