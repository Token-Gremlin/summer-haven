import { Group, BufferGeometry, Mesh } from 'three';
/** Typed boundary for the pinned upstream JavaScript, used only to build shared templates. */
export interface LODDetail {
  sectionStride?: number;
  segmentFactor?: number;
  leafStride?: number;
  leafScale?: number;
  billboard?: 'single' | 'double';
  minBranchRadius?: number;
}
export class Tree extends Group {
  options: { copy(source: unknown): void };
  branchesMesh: Mesh;
  leavesMesh: Mesh;
  createGeometry(detail?: LODDetail): { branches: BufferGeometry; leaves: BufferGeometry };
}
