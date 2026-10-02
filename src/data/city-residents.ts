import { DEFAULT_APPEARANCE, type Appearance } from './appearance';
import { CITY_BUILDINGS, cityPoint } from './city';

export const CITY_LIFE_BOUNDS = { x0: -105, x1: 152, z0: -422, z1: -253 } as const;
export type CityActivity = 'home' | 'work' | 'errand' | 'meeting';
export type CityPoint = [number, number];
export interface CityDestination {
  point: CityPoint;
  facing: number;
  label: string;
}
export interface CityResidentDefinition {
  id: string;
  name: string;
  role: string;
  home: string;
  workplace: string;
  partner: string;
  appearance: Appearance;
  speed: number;
  destinations: Record<CityActivity, CityDestination>;
  lines: Record<CityActivity, string>;
  task: string;
}
const look = (name: string, patch: Partial<Appearance>): Appearance => ({
  ...DEFAULT_APPEARANCE,
  name,
  accessories: [false, false, false],
  ...patch,
});
const front = (id: string, side = -1.7, depth = 6.5): CityDestination => {
  const b = CITY_BUILDINGS.find((b) => b.id === id)!;
  const p = cityPoint(b, side, depth);
  return { point: [p.x, p.z], facing: b.yaw + Math.PI, label: b.name };
};
const at = (x: number, z: number, label: string, facing = 0): CityDestination => ({
  point: [x, z],
  facing,
  label,
});

/** Adults with named relationships and actual places; schedule points are exterior activity spaces. */
export const CITY_RESIDENTS: readonly CityResidentDefinition[] = [
  {
    id: 'iona',
    name: 'Iona',
    role: 'guild steward',
    home: 'paper-house',
    workplace: 'guildhall',
    partner: 'mara',
    speed: 1.02,
    appearance: look('Iona', {
      skin: 3,
      hair: 3,
      hairColor: 0,
      top: 2,
      topColor: 1,
      bottom: 1,
      bottomColor: 5,
      accessories: [false, true, false],
    }),
    destinations: {
      home: front('paper-house', -0.2, 6.8),
      work: front('guildhall', -2.2, 6.3),
      errand: at(14, -276, 'Lantern Market'),
      meeting: at(16, -332, 'the travelers’ meeting place', Math.PI / 2),
    },
    task: 'sort the valley dispatches',
    lines: {
      home: 'Mara and I share the rooms above Fable & Fold. I leave the hall keys here, beside the spare paper.',
      work: 'Welcome to Aldermere. The hall’s route chart leads from Mosswood to Silverveil, then up the switchbacks to Starroot. The resident board keeps our smaller errands in order.',
      errand:
        'Rowan sets aside bread for the road wardens. I collect the list here before the baskets leave.',
      meeting:
        'Mara meets me here to compare the road notes. A map is more useful when someone has walked it this week.',
    },
  },
  {
    id: 'mira',
    name: 'Mira',
    role: 'cloth mender',
    home: 'craft-home-a',
    workplace: 'weavers',
    partner: 'tamsin',
    speed: 0.98,
    appearance: look('Mira', {
      skin: 2,
      hair: 2,
      hairColor: 2,
      top: 3,
      topColor: 2,
      bottom: 2,
      bottomColor: 0,
      shoes: 1,
    }),
    destinations: {
      home: front('craft-home-a'),
      work: front('weavers', -1.6, 5.5),
      errand: at(26, -290, 'the cloth stall'),
      meeting: at(-20, -317, 'Makers’ Court', -Math.PI / 2),
    },
    task: 'stitch the sail patch',
    lines: {
      home: 'I leave a little cloth in the courtyard for testing colors in the evening light.',
      work: 'This patch is for Bram’s sail. The small stitches carry the strain; the bright border helps him find the repair at sea.',
      errand: 'I’m choosing a warm lining for Tamsin’s lamp covers. Indigo looks lovely beside her brass.',
      meeting:
        'Tamsin brings her smallest lamp here. We check whether the shade casts a soft edge before I finish the seam.',
    },
  },
  {
    id: 'oren',
    name: 'Oren',
    role: 'wheelwright',
    home: 'craft-home-c',
    workplace: 'wheelwright',
    partner: 'sela',
    speed: 1.05,
    appearance: look('Oren', {
      body: 'masculine',
      skin: 1,
      hair: 7,
      hairColor: 1,
      top: 4,
      topColor: 4,
      bottom: 3,
      bottomColor: 5,
      face: 1,
    }),
    destinations: {
      home: front('craft-home-c'),
      work: front('wheelwright', -1.6, 5.5),
      errand: front('weavers', 1.6, 5.5),
      meeting: at(-29.5, -318.6, 'the pottery corner', Math.PI / 2),
    },
    task: 'check the wheel spokes',
    lines: {
      home: 'The toy boat on my step is for Lio’s collection. It sails in a very determined circle.',
      work: 'Turn a wheel slowly and listen. A loose spoke tells you where it needs attention before you can see it.',
      errand: 'Mira shares the studio with me. I am taking these shaped battens over for her sail repair.',
      meeting: 'Sela’s clay changes size in the kiln. We compare her measurements with my wooden molds here.',
    },
  },
  {
    id: 'lio',
    name: 'Lio',
    role: 'Reedbank caretaker',
    home: 'canal-home-a',
    workplace: 'canal-common',
    partner: 'bram',
    speed: 0.94,
    appearance: look('Lio', {
      body: 'masculine',
      skin: 4,
      hair: 6,
      hairColor: 0,
      top: 5,
      topColor: 1,
      bottom: 0,
      bottomColor: 0,
      shoes: 1,
    }),
    destinations: {
      home: front('canal-home-a'),
      work: front('canal-common', -1.8, 6.7),
      errand: at(31.5, -322, 'the orchard baskets'),
      meeting: at(106, -347.7, 'the Reedbank bench', Math.PI / 2),
    },
    task: 'coil the landing rope',
    lines: {
      home: 'The landing ropes dry here. I check them every morning before anyone takes a boat out.',
      work: 'The Reedbank common room is open. There is tea, a place to rest, and a letter from Mara beside the window.',
      errand:
        'These apples are for the common room. The empty basket goes back tomorrow; we have been sharing the same one for years.',
      meeting:
        'Bram brings news from the boat shed. We sit near the water and decide which repairs need a second pair of hands.',
    },
  },
  {
    id: 'mara',
    name: 'Mara',
    role: 'valley mapmaker',
    home: 'paper-house',
    workplace: 'paper-house',
    partner: 'iona',
    speed: 1.08,
    appearance: look('Mara', {
      skin: 0,
      hair: 0,
      hairColor: 5,
      top: 1,
      topColor: 3,
      bottom: 3,
      bottomColor: 0,
      accessories: [false, true, true],
    }),
    destinations: {
      home: front('paper-house', 1.6),
      work: front('paper-house', -2.1, 6.8),
      errand: at(11.5, -330, 'the fountain notes'),
      meeting: at(17.8, -332, 'the travelers’ meeting place', -Math.PI / 2),
    },
    task: 'ink the Silverveil contour',
    lines: {
      home: 'I share the paper house with Iona. My field sketches dry upstairs while she reads the dispatches.',
      work: 'Follow the bends drawn close together above Silverveil: those are the switchbacks. The wide shelf at Crownreach is a resting place, so approach it quietly.',
      errand:
        'The fountain’s water comes from Silverveil. I am comparing the old route inscription with my new survey.',
      meeting:
        'Iona catches the practical things I miss: a washed step, a late cart, a traveler who needs a gentler climb.',
    },
  },
  {
    id: 'rowan',
    name: 'Rowan',
    role: 'baker',
    home: 'garden-home',
    workplace: 'bread-house',
    partner: 'neri',
    speed: 0.97,
    appearance: look('Rowan', {
      body: 'masculine',
      skin: 2,
      hair: 4,
      hairColor: 2,
      top: 1,
      topColor: 0,
      bottom: 1,
      bottomColor: 2,
      accessories: [true, false, false],
    }),
    destinations: {
      home: front('garden-home'),
      work: front('bread-house', -2.2, 6.3),
      errand: at(14, -274.5, 'the bread stall'),
      meeting: at(26.2, -277, 'the market tea corner', Math.PI / 2),
    },
    task: 'wrap the road loaves',
    lines: {
      home: 'Neri keeps the herb pots by our green shutters. I bring home the day’s last loaf and she chooses the tea.',
      work: 'The road loaves get a thicker crust. They keep their warmth all the way to the forest gate.',
      errand:
        'This basket is for neighbors who missed the morning batch. There is always a small round loaf left for Lio.',
      meeting:
        'Neri tells me what is growing at the water garden. Tomorrow’s bread might have rosemary, if the new shoots are ready.',
    },
  },
  {
    id: 'tamsin',
    name: 'Tamsin',
    role: 'lantern maker',
    home: 'lantern-home',
    workplace: 'lantern-home',
    partner: 'mira',
    speed: 1.01,
    appearance: look('Tamsin', {
      skin: 1,
      hair: 5,
      hairColor: 4,
      top: 4,
      topColor: 5,
      bottom: 2,
      bottomColor: 4,
      accessories: [false, true, false],
    }),
    destinations: {
      home: front('lantern-home', 1.6),
      work: front('lantern-home', -2.1, 6.5),
      errand: at(-5, -314, 'the repaired street lamp'),
      meeting: at(-21.8, -317, 'Makers’ Court', Math.PI / 2),
    },
    task: 'fit a lantern shade',
    lines: {
      home: 'I keep the smallest light in my own window. It tells late walkers that someone is still awake.',
      work: 'A lantern needs a little air beneath its cap. Mira’s cloth shades soften the light without closing that gap.',
      errand: 'This street lamp used to rattle. Oren made a new peg and I have come to check the fit.',
      meeting:
        'Mira can tell which cloth will glow warmly just by holding it to the sky. I bring the lamp so we can be certain.',
    },
  },
  {
    id: 'sela',
    name: 'Sela',
    role: 'potter',
    home: 'craft-home-b',
    workplace: 'pottery',
    partner: 'oren',
    speed: 0.93,
    appearance: look('Sela', {
      skin: 4,
      hair: 1,
      hairColor: 3,
      top: 3,
      topColor: 4,
      bottom: 1,
      bottomColor: 3,
      shoes: 1,
      face: 2,
    }),
    destinations: {
      home: front('craft-home-b'),
      work: front('pottery', -1.5, 5.5),
      errand: at(14, -281, 'the bowl delivery'),
      meeting: at(-27.7, -318.6, 'the pottery corner', -Math.PI / 2),
    },
    task: 'smooth a clay bowl',
    lines: {
      home: 'The herbs above my window are for tea while the kiln cools. Waiting is part of pottery.',
      work: 'That little bowl has a bird’s footprints. I could smooth them away, but it seems a shame to erase a visitor.',
      errand:
        'Rowan needs a shallow bowl for rising dough. I made the rim broad enough to lift with floury hands.',
      meeting:
        'Oren makes the wooden guides for my bowls. We check the cooled clay together before he cuts another one.',
    },
  },
  {
    id: 'neri',
    name: 'Neri',
    role: 'water gardener',
    home: 'garden-home',
    workplace: 'canal-home-d',
    partner: 'rowan',
    speed: 0.95,
    appearance: look('Neri', {
      body: 'masculine',
      skin: 3,
      hair: 6,
      hairColor: 1,
      top: 5,
      topColor: 2,
      bottom: 0,
      bottomColor: 1,
      shoes: 1,
      accessories: [true, false, true],
    }),
    destinations: {
      home: front('garden-home', 1.5),
      work: front('canal-home-d', -1.5, 6),
      errand: at(32, -326, 'the orchard exchange'),
      meeting: at(28, -277, 'the market tea corner', -Math.PI / 2),
    },
    task: 'tend the herb cuttings',
    lines: {
      home: 'Rowan and I save cracked cups for cuttings. A plant does not mind an imperfect handle.',
      work: 'The beans climb toward the morning light. I tie them loosely so the stems can move in the wind.',
      errand:
        'These mint cuttings are for the tea house. The orchard keeper trades me a basket of leaf mulch.',
      meeting:
        'Rowan asks which herbs are ready before planning the next batch. Today I am voting for rosemary.',
    },
  },
  {
    id: 'bram',
    name: 'Bram',
    role: 'boatbuilder',
    home: 'canal-home-c',
    workplace: 'boat-shed',
    partner: 'lio',
    speed: 1.04,
    appearance: look('Bram', {
      body: 'masculine',
      skin: 0,
      hair: 5,
      hairColor: 5,
      top: 4,
      topColor: 3,
      bottom: 3,
      bottomColor: 4,
      face: 1,
      accessories: [false, false, true],
    }),
    destinations: {
      home: front('canal-home-c'),
      work: front('boat-shed', -1.6, 6.5),
      errand: at(107, -327, 'the landing deliveries'),
      meeting: at(107.8, -347.7, 'the Reedbank bench', -Math.PI / 2),
    },
    task: 'plane a boat rib',
    lines: {
      home: 'The letter in my blue-door postbox is from my sister on the coast. She still asks when I will build a boat large enough to visit.',
      work: 'A boat rib bends best when you stop fighting the grain. Mira is repairing the sail while I fit this piece.',
      errand: 'Lio keeps the landing clear for deliveries. I am bringing back the rope he lent me.',
      meeting:
        'Lio knows every loose board along the bank. We choose one small repair each evening; the whole landing stays sound that way.',
    },
  },
];

export interface CityResidentState {
  id: string;
  x: number;
  z: number;
  yaw: number;
  activity: CityActivity;
  settled: number;
  taskProgress: number;
  tasksCompleted: number;
  conversations: number;
  meetingProgress: number;
  meetingsCompleted: number;
  meetingCounted: boolean;
}
export interface CityLifeState {
  version: 1;
  layoutRevision: 2;
  residents: CityResidentState[];
}
export function cityActivityAt(time: number): CityActivity {
  const t = Number.isFinite(time) ? Math.max(0, Math.min(1, time)) : 0.3;
  return t < 0.16 || t >= 0.83 ? 'home' : t < 0.44 ? 'work' : t < 0.61 ? 'errand' : 'meeting';
}
export function freshCityLifeState(): CityLifeState {
  return {
    version: 1,
    layoutRevision: 2,
    residents: CITY_RESIDENTS.map((d) => ({
      id: d.id,
      x: d.destinations.home.point[0],
      z: d.destinations.home.point[1],
      yaw: d.destinations.home.facing,
      activity: 'home',
      settled: 0,
      taskProgress: 0,
      tasksCompleted: 0,
      conversations: 0,
      meetingProgress: 0,
      meetingsCompleted: 0,
      meetingCounted: false,
    })),
  };
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : fallback;
/** Whitelist every field; routes and Three.js instances are deliberately never serialized. */
export function validateCityLifeState(input: unknown): CityLifeState {
  const fresh = freshCityLifeState();
  if (!record(input) || input.version !== 1 || !Array.isArray(input.residents)) return fresh;
  const entries = input.residents;
  const migrated = input.layoutRevision !== 2;
  return {
    version: 1,
    layoutRevision: 2,
    residents: fresh.residents.map((base) => {
      const raw = entries.find((v: unknown) => record(v) && v.id === base.id);
      if (!record(raw)) return base;
      const validPosition =
        !migrated &&
        typeof raw.x === 'number' &&
        Number.isFinite(raw.x) &&
        raw.x >= CITY_LIFE_BOUNDS.x0 &&
        raw.x <= CITY_LIFE_BOUNDS.x1 &&
        typeof raw.z === 'number' &&
        Number.isFinite(raw.z) &&
        raw.z >= CITY_LIFE_BOUNDS.z0 &&
        raw.z <= CITY_LIFE_BOUNDS.z1;
      const activity =
        (['home', 'work', 'errand', 'meeting'] as const).find((a) => a === raw.activity) ?? 'home';
      return {
        ...base,
        x: validPosition ? (raw.x as number) : base.x,
        z: validPosition ? (raw.z as number) : base.z,
        yaw: migrated ? base.yaw : finite(raw.yaw, -Math.PI * 4, Math.PI * 4, base.yaw),
        activity: migrated ? 'home' : activity,
        settled: validPosition ? finite(raw.settled, 0, 86400, 0) : 0,
        taskProgress: migrated ? 0 : finite(raw.taskProgress, 0, 24, 0),
        tasksCompleted: Math.floor(finite(raw.tasksCompleted, 0, 1000000, 0)),
        conversations: Math.floor(finite(raw.conversations, 0, 1000000, 0)),
        meetingProgress: migrated ? 0 : finite(raw.meetingProgress, 0, 86400, 0),
        meetingsCompleted: Math.floor(finite(raw.meetingsCompleted, 0, 1000000, 0)),
        meetingCounted: !migrated && raw.meetingCounted === true,
      };
    }),
  };
}
