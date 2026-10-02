import { WORLD_BOUNDS } from '../data/regions';
import { DEFAULT_CLIMATE, validateClimate, type ClimateOptions } from '../data/climate';
import { freshCityLifeState, validateCityLifeState, type CityLifeState } from '../data/city-residents';
import { freshHabitatSave, validateHabitatSave, type HabitatSave } from '../data/habitat-save';
import { restoreSiltfin, type SiltfinSnapshot } from '../data/siltfin';
import {
  DEFAULT_APPEARANCE,
  copyAppearance,
  HAIR,
  TOPS,
  BOTTOMS,
  SHOES,
  type Appearance,
} from '../data/appearance';
export type Quality = 'low' | 'medium' | 'high' | 'ultra';
export interface Settings {
  quality: Quality;
  resolution: number;
  shadows: number;
  vegetation: number;
  reflections: boolean;
  aa: number;
  post: boolean;
  distance: number;
  visibility: 'nearby' | 'full';
  master: number;
  ambience: number;
  effects: number;
  sensitivity: number;
  invertY: boolean;
  freezeTime: boolean;
  timeSpeed: number;
  hints: boolean;
}
export const DEFAULT_SETTINGS: Settings = {
  quality: 'medium',
  resolution: 0.85,
  shadows: 1024,
  vegetation: 0.65,
  reflections: true,
  aa: 1,
  post: false,
  distance: 140,
  visibility: 'nearby',
  master: 0.65,
  ambience: 0.7,
  effects: 0.7,
  sensitivity: 1,
  invertY: false,
  freezeTime: false,
  timeSpeed: 1,
  hints: true,
};
export const PRESETS: Record<Quality, Partial<Settings>> = {
  low: {
    resolution: 0.7,
    shadows: 512,
    vegetation: 0.3,
    reflections: false,
    aa: 1,
    post: false,
    distance: 90,
  },
  medium: {
    resolution: 0.85,
    shadows: 1024,
    vegetation: 0.65,
    reflections: true,
    aa: 1,
    post: false,
    distance: 140,
  },
  high: { resolution: 1, shadows: 2048, vegetation: 1, reflections: true, aa: 4, post: true, distance: 240 },
  ultra: {
    resolution: 1.2,
    shadows: 4096,
    vegetation: 1,
    reflections: true,
    aa: 4,
    post: true,
    distance: 310,
  },
};
export interface Save {
  version: 1;
  created: boolean;
  appearance: Appearance;
  settings: Settings;
  climate: ClimateOptions;
  activities: Record<string, number>;
  position: [number, number];
  time: number;
  discoveries: string[];
  world: { elapsedSeconds: number; reedwingSeen: boolean; cityLife: CityLifeState; habitatLife: HabitatSave; siltfin:SiltfinSnapshot };
}
export const freshSave = (): Save => ({
  version: 1,
  created: false,
  appearance: copyAppearance(DEFAULT_APPEARANCE),
  settings: { ...DEFAULT_SETTINGS },
  climate: { ...DEFAULT_CLIMATE },
  activities: { cat: 0, delivery: 0, photo: 0 },
  position: [8, 16],
  time: 0.08,
  discoveries: [],
  world: { elapsedSeconds: 0, reedwingSeen: false, cityLife: freshCityLifeState(), habitatLife: freshHabitatSave(), siltfin:restoreSiltfin() },
});
const finite = (v: unknown, a: number, b: number, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d;
const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export function validateSave(raw: unknown): Save {
  const s = freshSave(),
    r = record(raw);
  if (r.version !== 1) return s;
  s.climate = validateClimate(r.climate);
  const a = record(r.appearance),
    c = record(r.settings);
  s.created = r.created === true;
  s.appearance.name =
    typeof a.name === 'string'
      ? a.name
          .replace(/[<>\x00-\x1f]/g, '')
          .trim()
          .slice(0, 24) || 'Haru'
      : 'Haru';
  s.appearance.body = a.body === 'masculine' ? 'masculine' : 'feminine';
  const limits = {
    skin: 4,
    hair: HAIR.length - 1,
    hairColor: 5,
    eyes: 4,
    face: 2,
    top: TOPS.length - 1,
    topColor: 5,
    bottom: BOTTOMS.length - 1,
    bottomColor: 5,
    shoes: SHOES.length - 1,
  };
  for (const [k, max] of Object.entries(limits)) {
    const key = k as keyof typeof limits;
    s.appearance[key] = Math.round(finite(a[k], 0, max, s.appearance[key]));
  }
  s.appearance.accessories = [0, 1, 2].map((i) => Array.isArray(a.accessories) && a.accessories[i] === true);
  const ranges: Record<string, [number, number]> = {
    resolution: [0.5, 1.5],
    shadows: [512, 4096],
    vegetation: [0.25, 1],
    aa: [0, 4],
    distance: [60, 500],
    master: [0, 1],
    ambience: [0, 1],
    effects: [0, 1],
    sensitivity: [0.25, 2],
    timeSpeed: [0.25, 4],
  };
  for (const [k, [min, max]] of Object.entries(ranges)) {
    (s.settings as unknown as Record<string, unknown>)[k] = finite(
      c[k],
      min,
      max,
      (s.settings as unknown as Record<string, number>)[k],
    );
  }
  s.settings.shadows = [512, 1024, 2048, 4096].reduce((a, b) =>
    Math.abs(b - s.settings.shadows) < Math.abs(a - s.settings.shadows) ? b : a,
  );
  s.settings.aa = [0, 1, 2, 4].reduce((a, b) =>
    Math.abs(b - s.settings.aa) < Math.abs(a - s.settings.aa) ? b : a,
  );
  for (const k of ['reflections', 'post', 'invertY', 'freezeTime', 'hints'] as const)
    if (typeof c[k] === 'boolean') s.settings[k] = c[k];
  if (['low', 'medium', 'high', 'ultra'].includes(String(c.quality)))
    s.settings.quality = c.quality as Quality;
  s.settings.visibility = c.visibility === 'full' ? 'full' : 'nearby';
  if (Array.isArray(r.position) && r.position.length === 2)
    s.position = [
      finite(r.position[0], WORLD_BOUNDS.x0 + 2, WORLD_BOUNDS.x1 - 2, 8),
      finite(r.position[1], WORLD_BOUNDS.z0 + 2, WORLD_BOUNDS.z1 - 2, 16),
    ];
  const acts = record(r.activities);
  for (const k of ['cat', 'delivery', 'photo']) s.activities[k] = Math.round(finite(acts[k], 0, 2, 0));
  s.time = finite(r.time, 0, 1, 0.08);
  const world = record(r.world);
  s.world.elapsedSeconds = finite(world.elapsedSeconds, 0, 1e10, 0);
  s.world.reedwingSeen = world.reedwingSeen === true;
  s.world.cityLife = validateCityLifeState(world.cityLife);
  s.world.habitatLife = validateHabitatSave(world.habitatLife);
  s.world.siltfin = restoreSiltfin(record(world.siltfin));
  s.discoveries = Array.isArray(r.discoveries)
    ? [
        ...new Set(
          r.discoveries.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 80),
        ),
      ].slice(0, 2048)
    : [];
  return s;
}
export const SAVE_KEY = 'summer-haven.save.v1';
export function hasSavedSettings(): boolean {
  try {
    const raw = record(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'));
    return raw.version === 1 && Object.hasOwn(PRESETS, String(record(raw.settings).quality));
  } catch {
    return false;
  }
}
export function readSave(): Save {
  try {
    return validateSave(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'));
  } catch {
    return freshSave();
  }
}
export function writeSave(s: Save): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
