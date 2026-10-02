import { sampleRegionTerrain, regionRouteSample } from './regions';

export type CityAsset = 'BLD_market' | 'BLD_workshop' | 'BLD_canal_home' | 'BLD_gate' | 'BLD_starroot';
export type CityRoom = 'aldermere-market' | 'aldermere-workshop' | 'aldermere-canal';
export interface CityBuilding {
  id: string;
  name: string;
  asset: CityAsset;
  x: number;
  z: number;
  yaw: number;
  district: 'market' | 'craft' | 'canal' | 'sanctuary';
  interior?: CityRoom;
  story: string;
}
const halfTurn = Math.PI,
  quarter = Math.PI / 2;
export const CITY_BUILDINGS: readonly CityBuilding[] = [
  {
    id: 'south-gate',
    name: 'The Lantern Gate',
    asset: 'BLD_gate',
    x: 20,
    z: -244,
    yaw: 0,
    district: 'market',
    story: 'A leaf for every road, a light for everyone returning.',
  },
  {
    id: 'guildhall',
    name: 'The Wayfarers’ Hall',
    asset: 'BLD_market',
    x: 18,
    z: -340,
    yaw: 0,
    district: 'market',
    interior: 'aldermere-market',
    story: 'Valley maps, shared errands, and a seat for travelers.',
  },
  {
    id: 'bread-house',
    name: 'Rowan’s bakehouse',
    asset: 'BLD_market',
    x: 9,
    z: -268,
    yaw: quarter,
    district: 'market',
    story: 'The ovens are cooling. Rowan leaves the last loaf wrapped for the bridge keeper.',
  },
  {
    id: 'tea-exchange',
    name: 'The copper kettle',
    asset: 'BLD_market',
    x: 31,
    z: -268,
    yaw: -quarter,
    district: 'market',
    story: 'An afternoon gathering place. Today’s chalkboard recommends wild mint from Mosswood.',
  },
  {
    id: 'paper-house',
    name: 'Fable & Fold',
    asset: 'BLD_canal_home',
    x: 33,
    z: -300,
    yaw: -quarter,
    district: 'market',
    story:
      'Pressed leaves and folded maps dry in the window. Someone has illustrated a dragon in the margin.',
  },
  {
    id: 'orchard-store',
    name: 'The orchard exchange',
    asset: 'BLD_market',
    x: 39,
    z: -323,
    yaw: -quarter,
    district: 'market',
    story: 'Crates are marked with the farms they came from. Empty baskets go back on the evening cart.',
  },
  {
    id: 'lantern-home',
    name: 'Tamsin’s rooms',
    asset: 'BLD_canal_home',
    x: 10,
    z: -319,
    yaw: quarter,
    district: 'market',
    story: 'A lantern maker lives upstairs. The repaired lamps below are waiting for their owners.',
  },
  {
    id: 'garden-home',
    name: 'The green shutters',
    asset: 'BLD_canal_home',
    x: 47,
    z: -347,
    yaw: -quarter,
    district: 'market',
    story: 'Cuttings in old cups line the sill. Each has a neighbor’s name on a scrap of paper.',
  },
  {
    id: 'north-gate',
    name: 'The Mosswood Gate',
    asset: 'BLD_gate',
    x: 94,
    z: -416,
    yaw: -0.82,
    district: 'market',
    story: 'The path narrows beyond the gate. Forest wardens keep this road open through the winter.',
  },
  {
    id: 'weavers',
    name: 'The Thread & Timber studio',
    asset: 'BLD_workshop',
    x: -16,
    z: -327,
    yaw: 0,
    district: 'craft',
    interior: 'aldermere-workshop',
    story: 'Mira and Oren share a studio: one mends cloth, the other shapes wood.',
  },
  {
    id: 'pottery',
    name: 'Lowfire pottery',
    asset: 'BLD_workshop',
    x: -29,
    z: -327,
    yaw: 0,
    district: 'craft',
    story: 'Clay bowls cool beneath the awning. One small bowl has a bird’s footprints across the glaze.',
  },
  {
    id: 'wheelwright',
    name: 'Oren’s wheel yard',
    asset: 'BLD_workshop',
    x: -29,
    z: -304,
    yaw: halfTurn,
    district: 'craft',
    story: 'A chalk circle on the bench marks the next wheel. An unfinished spoke smells of fresh cedar.',
  },
  {
    id: 'dye-house',
    name: 'The indigo house',
    asset: 'BLD_canal_home',
    x: -16,
    z: -304,
    yaw: halfTurn,
    district: 'craft',
    story: 'Blue cloth dries in the garden. A sign asks visitors not to touch until the color has set.',
  },
  {
    id: 'bell-maker',
    name: 'The little bell foundry',
    asset: 'BLD_workshop',
    x: -39,
    z: -316,
    yaw: quarter,
    district: 'craft',
    story: 'Tiny wind bells are arranged from deepest to brightest. Their maker tests each one at dusk.',
  },
  {
    id: 'craft-home-a',
    name: 'Mira’s courtyard',
    asset: 'BLD_canal_home',
    x: -16,
    z: -342,
    yaw: 0,
    district: 'craft',
    story: 'Two chairs face a patch of late sunlight. The sewing basket has been left open.',
  },
  {
    id: 'craft-home-b',
    name: 'The herb window',
    asset: 'BLD_canal_home',
    x: 9,
    z: -287,
    yaw: quarter,
    district: 'market',
    story:
      'The potter lives above this market window. Bundles of mint, sage and mountain thyme hang above the sill.',
  },
  {
    id: 'craft-home-c',
    name: 'Oren’s house',
    asset: 'BLD_canal_home',
    x: -39,
    z: -294,
    yaw: quarter,
    district: 'craft',
    story: 'A wooden toy boat sits on the doorstep beside a pair of muddy boots.',
  },
  {
    id: 'canal-common',
    name: 'Reedbank common room',
    asset: 'BLD_canal_home',
    x: 98,
    z: -341,
    yaw: quarter,
    district: 'canal',
    interior: 'aldermere-canal',
    story: 'Lio keeps the kettle warm for everyone who lives along the water.',
  },
  {
    id: 'canal-home-a',
    name: 'Lio’s landing',
    asset: 'BLD_canal_home',
    x: 95,
    z: -327,
    yaw: quarter,
    district: 'canal',
    story: 'Coiled rope, a mended net and a flower growing through the landing stones.',
  },
  {
    id: 'canal-home-b',
    name: 'The swallow house',
    asset: 'BLD_canal_home',
    x: 33,
    z: -284,
    yaw: -quarter,
    district: 'market',
    story:
      'Swallows nest above the trading arcade. The upper window opens onto the sound of the morning market.',
  },
  {
    id: 'canal-home-c',
    name: 'The blue door',
    asset: 'BLD_canal_home',
    x: 113,
    z: -362,
    yaw: quarter,
    district: 'canal',
    story: 'The postbox holds a letter from the coast, still smelling faintly of salt.',
  },
  {
    id: 'canal-home-d',
    name: 'The water gardener',
    asset: 'BLD_canal_home',
    x: 79,
    z: -343,
    yaw: 0,
    district: 'canal',
    story: 'Someone has trained the climbing beans into a little green arch.',
  },
  {
    id: 'boat-shed',
    name: 'The reed boat shed',
    asset: 'BLD_workshop',
    x: 119,
    z: -346,
    yaw: -quarter,
    district: 'canal',
    story: 'A patchwork sail waits for a quieter wind. The boatbuilder has gone to the market.',
  },
  {
    id: 'starroot',
    name: 'Starroot Sanctuary',
    asset: 'BLD_starroot',
    x: 329,
    z: -846,
    yaw: 0.12,
    district: 'sanctuary',
    story: 'A shelter built around a bell, for travelers who needed somewhere to wait out the rain.',
  },
];

export const CITY_PATHS: { id: string; points: readonly (readonly [number, number])[]; width: number }[] = [
  {
    id: 'market-court',
    points: [
      [13.8, -278],
      [26.3, -278],
    ],
    width: 7,
  },
  {
    id: 'west-frontage',
    points: [
      [14.7, -262],
      [14.7, -299],
      [17, -312],
      [17, -330],
    ],
    width: 3,
  },
  {
    id: 'east-frontage',
    points: [
      [25.5, -262],
      [26, -307],
      [31.5, -322],
    ],
    width: 3,
  },
  {
    id: 'hall-court',
    points: [
      [9, -333],
      [23, -333],
    ],
    width: 7.8,
  },
  {
    id: 'craft-street',
    points: [
      [23, -312],
      [-34, -313],
    ],
    width: 4.8,
  },
  {
    id: 'craft-court',
    points: [
      [-32, -317],
      [-13, -317],
    ],
    width: 8,
  },
  {
    id: 'craft-loop',
    points: [
      [-35, -313],
      [-36, -335],
      [-8, -335],
      [-6, -314],
    ],
    width: 3.1,
  },
  {
    id: 'craft-yard',
    points: [
      [-34, -313],
      [-32, -290],
      [-8, -290],
      [-8, -313],
    ],
    width: 3.1,
  },
  {
    id: 'canal-link',
    points: [
      [31, -333],
      [61, -332],
      [88, -333],
      [108, -333],
    ],
    width: 4.2,
  },
  {
    id: 'reedbank',
    points: [
      [103, -320],
      [108, -333],
      [108, -351],
      [120, -359],
      [108, -375],
      [76, -399],
    ],
    width: 3.6,
  },
  {
    id: 'quay-landing',
    points: [
      [101, -325.37],
      [110.3065, -325.37],
    ],
    width: 2.2,
  },
  {
    id: 'quay-court',
    points: [
      [103.2, -341],
      [113.2, -341],
    ],
    width: 11.5,
  },
  {
    id: 'water-garden',
    points: [
      [34, -360],
      [63, -353],
      [86, -351],
      [108, -351],
    ],
    width: 3.2,
  },
];
/** Covered frontages join specific buildings; these footprints also reserve the ground from trees. */
export const CITY_ARCADES = [
  {
    id: 'bread-arcade',
    x: 12.6,
    z: -278.5,
    yaw: quarter,
    width: 12,
    depth: 3.8,
    color: '#bd8b68',
    bays: 4,
    height: 3.5,
  },
  {
    id: 'trading-arcade',
    x: 27.4,
    z: -286,
    yaw: -quarter,
    width: 22,
    depth: 3.2,
    color: '#6c8a87',
    bays: 4,
    height: 3.5,
  },
  {
    id: 'makers-canopy',
    x: -22.5,
    z: -322,
    yaw: 0,
    width: 24,
    depth: 2.4,
    color: '#6b7890',
    bays: 4,
    height: 3.6,
  },
  {
    id: 'reedbank-gallery',
    x: 101,
    z: -334,
    yaw: quarter,
    width: 7,
    depth: 2.2,
    color: '#a89470',
    bays: 2,
    height: 3.4,
  },
] as const;
export const CITY_DISTRICTS = [
  {
    id: 'lantern-market',
    name: 'Lantern Market',
    subtitle: 'Every road has a story to trade.',
    x: 20,
    z: -289,
    r: 35,
  },
  {
    id: 'makers-court',
    name: 'Makers’ Court',
    subtitle: 'Good things are made to be mended.',
    x: -22,
    z: -317,
    r: 30,
  },
  { id: 'reedbank', name: 'Reedbank', subtitle: 'Windows open toward the water.', x: 106, z: -340, r: 34 },
];
export const CITY_EXTENTS: Record<CityAsset, [number, number]> = {
  BLD_market: [11.5, 9.3],
  BLD_workshop: [8.4, 8],
  BLD_canal_home: [7.3, 9.4],
  BLD_gate: [20.5, 6.1],
  BLD_starroot: [18, 18],
};
export function cityLocal(b: Pick<CityBuilding, 'x' | 'z' | 'yaw'>, x: number, z: number) {
  const dx = x - b.x,
    dz = z - b.z,
    c = Math.cos(b.yaw),
    s = Math.sin(b.yaw);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}
export function cityPoint(b: Pick<CityBuilding, 'x' | 'z' | 'yaw'>, x: number, z: number) {
  const c = Math.cos(b.yaw),
    s = Math.sin(b.yaw);
  return { x: b.x + x * c + z * s, z: b.z - x * s + z * c };
}
export function cityPathDistance(x: number, z: number) {
  let distance = Infinity;
  for (const path of CITY_PATHS)
    for (let i = 1; i < path.points.length; i++) {
      const [ax, az] = path.points[i - 1],
        [bx, bz] = path.points[i],
        dx = bx - ax,
        dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      distance = Math.min(distance, Math.hypot(x - ax - dx * t, z - az - dz * t) - path.width / 2);
    }
  return distance;
}
export function cityOccupied(x: number, z: number, padding = 0) {
  return (
    CITY_BUILDINGS.some((b) => {
      const p = cityLocal(b, x, z),
        [w, d] = CITY_EXTENTS[b.asset];
      return Math.abs(p.x) < w / 2 + padding && Math.abs(p.z) < d / 2 + padding;
    }) ||
    CITY_ARCADES.some((a) => {
      const p = cityLocal(a, x, z);
      return Math.abs(p.x) < a.width / 2 + padding && Math.abs(p.z) < a.depth / 2 + padding;
    }) ||
    cityPathDistance(x, z) < padding
  );
}
const pads = CITY_BUILDINGS.filter((b) => b.asset !== 'BLD_gate').map((b) => ({
  b,
  y: sampleRegionTerrain(b.x, b.z, 0),
}));
/** Architectural foundations meet the ground; four-metre garden shoulders blend back into the hills. */
export function cityTerrain(x: number, z: number, height: number) {
  if (z > -255 || z < -875) return height;
  const route = regionRouteSample(x, z);
  if (route.distance < route.width / 2 + 0.8) return height;
  for (const { b, y } of pads) {
    if (Math.abs(x - b.x) > 18 || Math.abs(z - b.z) > 18) continue;
    const p = cityLocal(b, x, z),
      [w, d] = CITY_EXTENTS[b.asset];
    const distance = Math.max(Math.abs(p.x) - w / 2 - 0.5, Math.abs(p.z) - d / 2 - 0.5, 0);
    const t = Math.min(1, distance / 4),
      weight = 1 - t * t * (3 - 2 * t);
    height += (y - height) * weight;
  }
  return height;
}

/** Walkable support is separate from the bare soil beneath raised floors and the temple dais. */
export function cityFloor(x: number, z: number, ground: number) {
  for (const { b, y } of pads) {
    if (Math.abs(x - b.x) > 14 || Math.abs(z - b.z) > 14) continue;
    const p = cityLocal(b, x, z);
    if (b.asset === 'BLD_market' && Math.abs(p.x) < 5 && p.z > -2.9 && p.z < 4.3)
      ground = Math.max(ground, y + 0.28);
    if (b.asset === 'BLD_workshop' && Math.abs(p.x) < 2.7 && Math.abs(p.z) < 3.3)
      ground = Math.max(ground, y + 0.26);
    if (b.asset === 'BLD_canal_home' && Math.abs(p.x) < 3 && Math.abs(p.z) < 3)
      ground = Math.max(ground, y + 0.34);
    if (b.asset === 'BLD_canal_home' && p.x > -2.7 && p.x < -0.8 && p.z >= 3 && p.z < 3.6)
      ground = Math.max(ground, y + 0.2);
    if (b.asset === 'BLD_starroot' && Math.abs(p.x) < 8.4 && Math.abs(p.z) < 8.4) {
      ground = Math.max(ground, y + 0.14);
      const r = Math.hypot(p.x, p.z + 2.2);
      if (r < 2.2) ground = Math.max(ground, y + (r < 1.5 ? 0.68 : r < 1.87 ? 0.5 : 0.32));
      if (Math.abs(p.x) < 0.8 && p.z < 0.2 && p.z > -1.3)
        ground = Math.max(ground, y + 0.16 + ((0.2 - p.z) / 1.5) * 0.52);
    }
  }
  return ground;
}
