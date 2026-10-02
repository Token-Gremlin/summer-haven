import * as T from 'three';
import { Tree, type LODDetail } from '../vendor/ez-tree/tree.js';
import oak from '../vendor/ez-tree/presets/oak_medium.json';
import ash from '../vendor/ez-tree/presets/ash_medium.json';
import aspen from '../vendor/ez-tree/presets/aspen_medium.json';
import pine from '../vendor/ez-tree/presets/pine_medium.json';
import { prep, merge, beam, M } from './geo';
import { leafHull, type LeafHull } from './tree-canopy';
import { TREE_BARK, TREE_LEAF } from '../render/woodland-shared';

export type WoodlandKind = 'round' | 'tall' | 'cedar';
export interface TreeTemplate {
  levels: T.BufferGeometry[];
  canopy: LeafHull;
  radius: number;
  height: number;
  species: string;
  triangles: number[];
  shadow: T.BufferGeometry;
  bounds: T.Sphere;
}
const cache = new Map<string, TreeTemplate>();
export const TREE_DETAILS: LODDetail[] = [
  {},
  { sectionStride: 2, segmentFactor: 0.65, leafStride: 2, leafScale: 1.38 },
  { sectionStride: 4, segmentFactor: 0.4, leafStride: 5, leafScale: 2.7, billboard: 'single' },
  { sectionStride: 8, segmentFactor: 0.3, leafStride: 14, leafScale: 4.6, billboard: 'single' },
];

/** One botanical skeleton per seeded archetype, shared across every instance and LOD. */
export function woodlandTemplate(kind: WoodlandKind, seed: number): TreeTemplate {
  const key = `${kind}/${seed}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const species = kind === 'cedar' ? 3 : kind === 'tall' ? (seed % 2 ? 2 : 1) : seed % 2 ? 0 : 1;
  const source = structuredClone([oak, ash, aspen, pine][species]);
  source.seed = seed * 7919 + 35729;
  // A denser central crown with restrained card size, rather than an opaque outer shell.
  source.leaves.size *= species === 2 ? 1.05 : 1.12;
  source.branch.radius['0'] *= species === 3 ? 1.35 : 1.25;
  source.bark.textureScale = { x: 1.5, y: 3 };
  const tree = new Tree();
  tree.options.copy(source);
  const raw = TREE_DETAILS.map((detail, level) =>
    tree.createGeometry({
      ...detail,
      minBranchRadius: source.branch.radius['0'] * (level === 3 ? 0.32 : level === 2 ? 0.13 : 0),
    }),
  );
  raw[0].leaves.computeBoundingBox();
  raw[0].branches.computeBoundingBox();
  const bounds = raw[0].leaves.boundingBox!.clone().union(raw[0].branches.boundingBox!);
  const targetHeight = kind === 'cedar' ? 10.6 : kind === 'tall' ? 10.2 : 8.6;
  const sy = targetHeight / bounds.max.y;
  const width = kind === 'cedar' ? 4.1 : kind === 'tall' ? (species === 2 ? 4.6 : 6.1) : 7.0;
  const sx = Math.min(sy * 1.35, width / Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z));
  const levels = raw.map(({ branches, leaves }) => {
    branches.scale(sx, sy, sx);
    leaves.scale(sx, sy, sx);
    // Village trees are limbed up above people and the follow camera. Preserve the root
    // ring while raising the shared branch skeleton, identically at every detail level.
    const lift = species === 2 ? 0.12 : 0.3;
    for (const geometry of [branches, leaves]) {
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++)
        if (geometry === leaves || p.getY(i) > 0.001) p.setY(i, targetHeight * lift + p.getY(i) * (1 - lift));
    }
    branches.computeVertexNormals();
    prep(branches, '#b2a18a', TREE_BARK + species);
    prep(leaves, '#ffffff', TREE_LEAF + species);
    for (const geometry of [branches, leaves]) {
      const p = geometry.attributes.position,
        w = geometry.attributes.aWind,
        color = geometry.attributes.color;
      for (let i = 0; i < p.count; i++) {
        const height = Math.max(0, p.getY(i)) / targetHeight;
        w.setX(i, Math.pow(height, 1.45) * 0.76);
        // Baked crown occlusion: outer branch sprays catch more sky, the center stays deep.
        if (geometry === leaves) {
          const radial = Math.min(1, Math.hypot(p.getX(i), p.getZ(i)) / (width * 0.46));
          const light = 0.7 + 0.3 * Math.min(1, radial * 0.6 + height * 0.65);
          color.setXYZ(i, light * (species === 3 ? 0.83 : 0.97), light, light * (species === 2 ? 0.88 : 0.9));
        }
      }
    }
    // Low buttress roots attach the trunk to the soil; only a few triangles per tree.
    const roots: T.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 + seed * 0.7,
        reach = 0.48 + (i % 3) * 0.09;
      const root = beam(
        new T.Vector3(Math.cos(a) * reach, -0.05, Math.sin(a) * reach),
        new T.Vector3(0, 0.37, 0),
        0.09,
        '#686852',
        M.bark,
        5,
      );
      prep(root, '#7c8062', TREE_BARK + species);
      roots.push(root);
    }
    const geometry = merge([branches, leaves, ...roots]);
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return geometry;
  });
  // Only close-range sprays can touch the follow camera. Enlarged distant cards must not
  // turn the empty space under a real crown into an invisible full-height collision wall.
  const canopy = leafHull(levels[0], levels[1]);
  // Far sun shadows need coverage, not thousands of overlapping transparent sprays.
  // Fit small opaque clusters to the real leaf cloud; retain cutout detail near the player.
  const cloud = new Map<string, T.Box3>(),
    p = levels[0].attributes.position,
    mt = levels[0].attributes.aMat;
  const crown = canopy.box,
    size = crown.getSize(new T.Vector3()),
    point = new T.Vector3();
  for (let i = 0; i < p.count; i++)
    if (mt.getX(i) < 36) {
      point.fromBufferAttribute(p, i);
      const x = Math.min(2, Math.floor(((point.x - crown.min.x) / size.x) * 3));
      const y = Math.min(1, Math.floor(((point.y - crown.min.y) / size.y) * 2));
      const z = Math.min(2, Math.floor(((point.z - crown.min.z) / size.z) * 3));
      const key = `${x}/${y}/${z}`;
      if (!cloud.has(key)) cloud.set(key, new T.Box3());
      cloud.get(key)!.expandByPoint(point);
    }
  const trunk = levels[3].clone(),
    index = trunk.index!,
    surface = trunk.attributes.aMat,
    kept: number[] = [];
  for (let i = 0; i < index.count; i += 3)
    if (surface.getX(index.getX(i)) >= 36) kept.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  trunk.setIndex(kept);
  for (let i = 0; i < surface.count; i++) surface.setX(i, 44 + species);
  const shadowParts = [trunk];
  for (const cell of cloud.values()) {
    const center = cell.getCenter(new T.Vector3()),
      s = cell.getSize(new T.Vector3());
    const cluster = prep(new T.IcosahedronGeometry(1, 0), '#ffffff', 40 + species, 0.45);
    cluster.scale(s.x * 0.48, s.y * 0.48, s.z * 0.48);
    cluster.translate(center.x, center.y, center.z);
    shadowParts.push(cluster);
  }
  const shadow = merge(shadowParts);
  shadow.computeBoundingSphere();
  const envelope = new T.Box3();
  for (const level of levels) envelope.union(level.boundingBox!);
  const sphere = envelope.getBoundingSphere(new T.Sphere());
  sphere.radius += 0.4;
  const template: TreeTemplate = {
    levels,
    canopy,
    radius: sphere.radius,
    bounds: sphere,
    height: targetHeight,
    species: ['Oak', 'Ash', 'Aspen', 'Pine'][species],
    triangles: levels.map((g) => g.index!.count / 3),
    shadow,
  };
  tree.branchesMesh.geometry.dispose();
  tree.leavesMesh.geometry.dispose();
  for (const mesh of [tree.branchesMesh, tree.leavesMesh]) {
    if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
    else mesh.material.dispose();
  }
  cache.set(key, template);
  return template;
}
