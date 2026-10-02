/** Metres, +Y up, -Z north. Data stays resident even when scenery is unloaded. */
export interface RegionBounds {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}
export const LEGACY_BOUNDS: RegionBounds = { x0: -126, x1: 126, z0: -132, z1: 124 };
export const WORLD_BOUNDS: RegionBounds = { x0: -320, x1: 760, z0: -1160, z1: 180 };
export const REGIONS = [
  { id: 'haven', name: 'Haven village', bounds: LEGACY_BOUNDS },
  { id: 'north-road', name: 'Lantern Road', bounds: { x0: -48, x1: 100, z0: -250, z1: -120 } },
  { id: 'aldermere', name: 'Aldermere', bounds: { x0: -125, x1: 170, z0: -430, z1: -235 } },
  { id: 'mosswood', name: 'Mosswood', bounds: { x0: 110, x1: 365, z0: -645, z1: -415 } },
  { id: 'silverveil', name: 'Silverveil Falls', bounds: { x0: 250, x1: 490, z0: -805, z1: -610 } },
  { id: 'starroot', name: 'Starroot Sanctuary', bounds: { x0: 230, x1: 435, z0: -950, z1: -790 } },
  { id: 'crownreach', name: 'Crownreach', bounds: { x0: 390, x1: 690, z0: -1100, z1: -855 } },
] as const;
export type RegionId = (typeof REGIONS)[number]['id'];
export function inBounds(x: number, z: number, b: RegionBounds) {
  return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
}
/** First match owns overlaps; this intentionally gives the old village precedence. */
export function regionAt(x: number, z: number) {
  return REGIONS.find((r) => inBounds(x, z, r.bounds)) ?? null;
}
export interface RegionRouteNode {
  id: string;
  x: number;
  z: number;
  y: number;
  width: number;
  mode: 'road' | 'cycle' | 'walk';
}
// The final legacy portal's exact old terrain sample (outside river/paddy overrides).
const portalY =
  18 * Math.exp(-(62 ** 2 / 900 + 46 ** 2 / 660)) + 3.8 * Math.exp(-(80 ** 2 / 700 + 59 ** 2 / 750));
export const REGION_ROUTE: readonly RegionRouteNode[] = [
  {
    id: 'haven-north',
    x: -6,
    z: -76,
    y: 18 * Math.exp(-(56 ** 2 / 900 + 10 ** 2 / 660)) + 3.8 * Math.exp(-(86 ** 2 / 700 + 3 ** 2 / 750)),
    width: 5.2,
    mode: 'road',
  },
  { id: 'haven-portal', x: 0, z: -132, y: portalY, width: 5.2, mode: 'road' },
  { id: 'road-bend', x: 8, z: -164, y: 1, width: 5.2, mode: 'road' },
  { id: 'city-south-gate', x: 20, z: -244, y: 4, width: 7, mode: 'road' },
  { id: 'city-market', x: 20, z: -300, y: 6, width: 7, mode: 'road' },
  { id: 'city-garden', x: 34, z: -360, y: 8, width: 5.5, mode: 'road' },
  { id: 'city-forest-gate', x: 94, z: -416, y: 9, width: 5.2, mode: 'road' },
  { id: 'forest-ranger', x: 196, z: -492, y: 12, width: 3.6, mode: 'cycle' },
  { id: 'forest-water', x: 280, z: -568, y: 16, width: 3, mode: 'cycle' },
  { id: 'falls-lower', x: 348, z: -688, y: 18, width: 3, mode: 'cycle' },
  { id: 'falls-switch-1', x: 300, z: -715, y: 23, width: 2.6, mode: 'walk' },
  { id: 'falls-switch-2', x: 336, z: -737, y: 29.4, width: 2.6, mode: 'walk' },
  { id: 'falls-switch-3', x: 305, z: -766, y: 35.9, width: 2.6, mode: 'walk' },
  { id: 'falls-upper', x: 356, z: -814, y: 47.3, width: 3, mode: 'walk' },
  { id: 'temple-court', x: 340, z: -846, y: 52, width: 3, mode: 'walk' },
  { id: 'ridge-gate', x: 414, z: -899, y: 64, width: 3, mode: 'walk' },
  { id: 'ridge-switch', x: 454, z: -996, y: 80.8, width: 3, mode: 'walk' },
  { id: 'dragon-lookout', x: 500, z: -960, y: 90, width: 3, mode: 'walk' },
  { id: 'dragon-shelf-entry', x: 518.11, z: -967.755, y: 92, width: 3, mode: 'walk' },
  { id: 'dragon-rest', x: 542, z: -978, y: 92, width: 3, mode: 'walk' },
];
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const smooth = (t: number) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};
/** Level junction landings keep the complete trail width within its walking grade. */
function routeSegmentHeight(a: RegionRouteNode, b: RegionRouteNode, t: number) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const start = Math.max(3, a.width / 2 + 0.2),
    end = Math.max(3, b.width / 2 + 0.2);
  const progress = clamp01((length * t - start) / (length - start - end));
  return a.y + (b.y - a.y) * progress;
}
export function regionRouteSample(x: number, z: number) {
  let distance = Infinity,
    height = 0,
    width = 0,
    segment = 0,
    t = 0;
  for (let i = 1; i < REGION_ROUTE.length; i++) {
    const a = REGION_ROUTE[i - 1],
      b = REGION_ROUTE[i];
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const u = clamp01(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz));
    const d = Math.hypot(x - a.x - dx * u, z - a.z - dz * u);
    if (d < distance) {
      distance = d;
      height = routeSegmentHeight(a, b, u);
      width = a.width + (b.width - a.width) * u;
      segment = i - 1;
      t = u;
    }
  }
  // Two connected road pieces share a smooth surface through their junction.
  // Inverse-distance interpolation is exact on either centreline and at the node;
  // only immediate neighbours may contribute, never a different switchback above/below.
  for (const joint of [segment, segment + 1]) {
    if (joint <= 0 || joint >= REGION_ROUTE.length - 1) continue;
    const p = REGION_ROUTE[joint - 1],
      n = REGION_ROUTE[joint],
      q = REGION_ROUTE[joint + 1];
    const ax = p.x - n.x,
      az = p.z - n.z,
      bx = q.x - n.x,
      bz = q.z - n.z;
    const al = Math.hypot(ax, az),
      bl = Math.hypot(bx, bz);
    const cos = Math.max(-1, Math.min(1, (ax * bx + az * bz) / (al * bl)));
    const support = Math.max(p.width, n.width, q.width) / 2 + 0.1;
    const reach = support / Math.max(0.05, Math.sqrt((1 - cos) / 2)) + 0.01;
    if (Math.hypot(x - n.x, z - n.z) > reach) continue;
    const u = clamp01(((x - n.x) * ax + (z - n.z) * az) / (al * al));
    const v = clamp01(((x - n.x) * bx + (z - n.z) * bz) / (bl * bl));
    const da = Math.hypot(x - n.x - ax * u, z - n.z - az * u);
    const db = Math.hypot(x - n.x - bx * v, z - n.z - bz * v);
    if (da >= support || db >= support) continue;
    const wa = (1 - da / support) ** 2 * db * db;
    const wb = (1 - db / support) ** 2 * da * da;
    height =
      wa + wb > 1e-18
        ? (wa * routeSegmentHeight(n, p, u) + wb * routeSegmentHeight(n, q, v)) / (wa + wb)
        : n.y;
    break;
  }
  return { distance, height, width, segment, t };
}
/** Downstream-to-upstream samples, including a narrow steep waterfall reach. */
export const REGION_RIVER = [
  { z: -132, x: 47 + Math.sin(-132 * 0.037) * 3 + Math.sin(-132 * 0.09) * 1.2, y: -0.16, halfWidth: 5.1 },
  { z: -230, x: 83, y: 0.7, halfWidth: 6 },
  { z: -345, x: 137, y: 2, halfWidth: 7 },
  { z: -460, x: 243, y: 9, halfWidth: 6 },
  { z: -570, x: 304, y: 15, halfWidth: 5 },
  { z: -690, x: 370, y: 18, halfWidth: 9 },
  { z: -708, x: 366, y: 18, halfWidth: 10 },
  { z: -730, x: 366, y: 54, halfWidth: 10 },
  { z: -756, x: 366, y: 54, halfWidth: 7 },
  { z: -820, x: 401, y: 55, halfWidth: 5 },
  { z: -910, x: 391, y: 61, halfWidth: 4 },
] as const;
export function regionRiverSample(z: number) {
  for (let i = 1; i < REGION_RIVER.length; i++) {
    const a = REGION_RIVER[i - 1],
      b = REGION_RIVER[i];
    if (z >= b.z) {
      const t = clamp01((a.z - z) / (a.z - b.z));
      // Gravity bends the falling reach away from its level upstream lip. Terrain,
      // wet rock margins and the rendered current all sample this same profile.
      const heightT = a.z === -708 && b.z === -730 ? t * (2 - t) : t;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * heightT,
        halfWidth: a.halfWidth + (b.halfWidth - a.halfWidth) * t,
      };
    }
  }
  return { ...REGION_RIVER[REGION_RIVER.length - 1] };
}
export const regionRiverX = (z: number) => regionRiverSample(z).x;
export const regionWaterHeight = (z: number) => regionRiverSample(z).y;
export const REGION_WATER_LIFT = .08;
/** Actual water footprint, including the plunge pool, shared by collision and wildlife. */
export function regionSurfaceWater(x: number, z: number): number | null {
  if (z < -910 || z > -132) return null;
  const river = regionRiverSample(z);
  if (Math.abs(x - river.x) <= river.halfWidth) return river.y + REGION_WATER_LIFT;
  return Math.hypot((x - 370) / 22, (z + 698) / 18) <= 1 ? 18 + REGION_WATER_LIFT : null;
}

/** Explicit decks, never inferred from a path merely being close to water. */
const bridgeApproach = REGION_ROUTE.find((node) => node.id === 'temple-court')!;
const bridgeDeparture = REGION_ROUTE.find((node) => node.id === 'ridge-gate')!;
export const REGION_BRIDGES = [
  {
    id: 'starroot-headwater-bridge',
    from: { x: 384.4, z: -877.8, y: routeSegmentHeight(bridgeApproach, bridgeDeparture, 0.6) },
    to: { x: 402.9, z: -891.05, y: routeSegmentHeight(bridgeApproach, bridgeDeparture, 0.85) },
    width: 3.8,
    clearance: 0.35,
  },
] as const;
export function regionBridgeAt(x: number, z: number) {
  return (
    REGION_BRIDGES.find((bridge) => {
      const dx = bridge.to.x - bridge.from.x,
        dz = bridge.to.z - bridge.from.z;
      const t = ((x - bridge.from.x) * dx + (z - bridge.from.z) * dz) / (dx * dx + dz * dz);
      if (t < 0 || t > 1) return false;
      return Math.hypot(x - bridge.from.x - dx * t, z - bridge.from.z - dz * t) <= bridge.width / 2;
    }) ?? null
  );
}
/** Bare expanded terrain; the existing world function provides exact legacy samples. */
export function sampleRegionTerrain(x: number, z: number, legacyHeight: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
  if (inBounds(x, z, LEGACY_BOUNDS) || z >= -132) return legacyHeight;
  const north = -z;
  let height = north < 430 ? (north - 132) * 0.034 : 10 + (north - 430) * 0.026;
  // Broad landforms, with a terraced waterfall wall and mountain shoulder.
  height += 24 * smooth((north - 710) / 75);
  height += 26 * smooth((north - 835) / 175);
  height += 30 * Math.exp(-((x - 600) ** 2 / 20000 + (z + 1040) ** 2 / 22000));
  height += Math.sin(x * 0.026) * Math.sin(z * 0.023) * (north < 430 ? 0.6 : 2.2);
  const river = regionRiverSample(z);
  // The waterfall is cut into a continuous landmass, with a supported upper lip.
  // Wide smooth shoulders blend into the forest below and sanctuary plateau above.
  const cliffMask =
    (1 - smooth((Math.abs(x - 366) - 90) / 40)) *
    smooth((north - 660) / 36) *
    (1 - smooth((north - 830) / 75));
  const cliffHeight = Math.max(18 + 38 * smooth((north - 706) / 24), river.y + 1.2);
  height += (cliffHeight - height) * cliffMask;
  if (z >= -910) {
    const riverDistance = Math.abs(x - river.x);
    const shoulder = 1 - smooth((riverDistance - river.halfWidth - 10) / 12);
    height += Math.max(0, river.y + 1.2 - height) * shoulder;
    const bank = 1 - smooth((riverDistance - river.halfWidth + 2.5) / 2.5);
    height += (river.y - 1.6 - height) * bank;
  }
  const basin = Math.hypot((x - 370) / 22, (z + 698) / 18);
  height += (17.2 - height) * (1 - smooth((basin - 1) / 0.55));
  const shelf = Math.hypot(x - 542, z + 978);
  height += (92 - height) * (1 - smooth((shelf - 26) / 12));
  const route = regionRouteSample(x, z);
  const road = 1 - smooth((route.distance - route.width / 2 - 0.8) / 9);
  height += (route.height - height) * road;
  // Blend beyond the old playable boundary; never perturb legacy positions.
  const seam = smooth((north - 132) / 24);
  return legacyHeight + (height - legacyHeight) * seam;
}
