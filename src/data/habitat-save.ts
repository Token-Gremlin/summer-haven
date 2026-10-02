import { HABITATS, type HabitatDefinition } from './habitats';
export type HabitatState = 'wander' | 'feed' | 'rest' | 'react' | 'perch' | 'takeoff' | 'flock' | 'land';
export interface HabitatPosition {
  x: number;
  y: number;
  z: number;
}
export interface HabitatRecord {
  id: string;
  state: HabitatState;
  age: number;
  node: number;
  target: number;
  position: HabitatPosition;
  origin: HabitatPosition;
  duration: number;
  cycle: number;
  cooldown: number;
}
export interface HabitatSave {
  version: 1;
  elapsed: number;
  animals: HabitatRecord[];
}
const states: readonly string[] = ['wander', 'feed', 'rest', 'react', 'perch', 'takeoff', 'flock', 'land'];
/** Missing legacy saves defer fresh contacts to the terrain-aware runtime. */
export function freshHabitatSave(): HabitatSave {
  return { version: 1, elapsed: 0, animals: [] };
}
/** Pure data boundary. Only authored IDs and explicitly copied fields survive.
 * The optional definitions argument is for isolated runtime fixtures, never user save input. */
export function validateHabitatSave(
  raw: unknown,
  definitions: readonly HabitatDefinition[] = HABITATS,
): HabitatSave {
  const result = freshHabitatSave();
  if (!raw || typeof raw !== 'object') return result;
  const value = raw as Partial<HabitatSave>;
  if (
    value.version !== 1 ||
    !Array.isArray(value.animals) ||
    typeof value.elapsed !== 'number' ||
    !Number.isFinite(value.elapsed) ||
    value.elapsed < 0 ||
    value.elapsed > 1e9
  )
    return result;
  result.elapsed = value.elapsed;
  const allowed = new Map<string, HabitatDefinition>();
  for (const d of definitions) for (let i = 0; i < d.count; i++) allowed.set(`${d.id}-${i}`, d);
  const seen = new Set<string>();
  for (const rawAnimal of value.animals.slice(0, 256)) {
    if (!rawAnimal || typeof rawAnimal !== 'object') continue;
    const r = rawAnimal as HabitatRecord,
      d = allowed.get(r.id);
    if (!d || seen.has(r.id) || !states.includes(r.state)) continue;
    if (
      ![r.age, r.duration, r.cycle, r.cooldown, r.node, r.target].every(
        (n) => typeof n === 'number' && Number.isFinite(n),
      ) ||
      r.age < 0 ||
      r.age > 3600 ||
      r.duration <= 0 ||
      r.duration > 3600 ||
      r.cooldown < 0 ||
      r.cooldown > 18 ||
      !Number.isSafeInteger(r.cycle) ||
      r.cycle < 0 ||
      r.cycle > 1e9 ||
      ![r.node, r.target].every((n) => Number.isInteger(n) && n >= 0 && n < d.points.length)
    )
      continue;
    const birdStates = ['perch', 'takeoff', 'flock', 'land'];
    if (d.species !== 'songbird' && birdStates.includes(r.state)) continue;
    if (d.species === 'songbird' && ['wander', 'feed', 'rest'].includes(r.state)) continue;
    const contacts = d.points.flatMap((p) => (p.previousPosition ? [p, p.previousPosition] : [p]));
    const x0 = Math.min(...contacts.map((p) => p.x)) - 1,
      x1 = Math.max(...contacts.map((p) => p.x)) + 1.5,
      z0 = Math.min(...contacts.map((p) => p.z)) - 1,
      z1 = Math.max(...contacts.map((p) => p.z)) + 1.5;
    if (
      ![r.position, r.origin].every(
        (p) =>
          p &&
          [p.x, p.y, p.z].every((n) => typeof n === 'number' && Number.isFinite(n)) &&
          p.x >= x0 &&
          p.x <= x1 &&
          p.z >= z0 &&
          p.z <= z1 &&
          p.y >= -100 &&
          p.y <= 200,
      )
    )
      continue;
    seen.add(r.id);
    result.animals.push({
      id: r.id,
      state: r.state,
      age: r.age,
      node: r.node,
      target: r.target,
      position: { x: r.position.x, y: r.position.y, z: r.position.z },
      origin: { x: r.origin.x, y: r.origin.y, z: r.origin.z },
      duration: r.duration,
      cycle: r.cycle,
      cooldown: r.cooldown,
    });
  }
  return result;
}
