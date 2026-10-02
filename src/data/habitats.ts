import { regionRiverSample } from './regions';
export type HabitatSpecies = 'deer' | 'terrapin' | 'songbird';
export interface HabitatPoint {
  x: number;
  z: number;
  water?: boolean;
  perchHeight?: number;
  /** Candidate 05 contact, retained only for migration after clearing the trail. */
  previousPosition?: { x: number; z: number };
}
export interface HabitatDefinition {
  id: string;
  species: HabitatSpecies;
  points: readonly HabitatPoint[];
  count: number;
  radius: number;
  speed: number;
}
const riverPoint = (z: number, offset: number): HabitatPoint => ({
  x: regionRiverSample(z).x + offset,
  z,
  water: true,
});
/** Small connected foraging patches, away from the main trail and waterfall drop.
 * Every edge is checked against live terrain/water/obstacles before travel. */
export const HABITATS: readonly HabitatDefinition[] = [
  {
    id: 'mosswood-glade',
    species: 'deer',
    count: 3,
    radius: 0.38,
    speed: 0.7,
    points: [
      { x: 207, z: -507 },
      { x: 215, z: -515 },
      { x: 220, z: -509 },
      { x: 212, z: -503 },
      { x: 202, z: -510 },
    ],
  },
  {
    id: 'silver-river-pool',
    species: 'terrapin',
    count: 3,
    radius: 0.22,
    speed: 0.22,
    points: [
      riverPoint(-577, -1.8),
      riverPoint(-581, -1.5),
      riverPoint(-584, 1.4),
      riverPoint(-579, 1.7),
      { x: regionRiverSample(-580).x + regionRiverSample(-580).halfWidth + 0.5, z: -580 },
      { x: regionRiverSample(-584).x + regionRiverSample(-584).halfWidth + 0.5, z: -584 },
    ],
  },
  {
    id: 'mosswood-songbirds',
    species: 'songbird',
    count: 4,
    radius: 0.13,
    speed: 3.8,
    points: [
      { x: 208, z: -499, perchHeight: 0.42, previousPosition: { x: 204, z: -500 } },
      { x: 220, z: -510, perchHeight: 0.42 },
      { x: 214, z: -524, perchHeight: 0.42 },
      { x: 198, z: -519, perchHeight: 0.42 },
    ],
  },
  {
    id: 'crownreach-songbirds',
    species: 'songbird',
    count: 4,
    radius: 0.13,
    speed: 4.6,
    points: [
      { x: 465, z: -982, perchHeight: 0.42, previousPosition: { x: 465, z: -985 } },
      { x: 480, z: -980, perchHeight: 0.42, previousPosition: { x: 480, z: -977 } },
      { x: 475, z: -963, perchHeight: 0.42 },
      { x: 460, z: -970, perchHeight: 0.42 },
    ],
  },
];
