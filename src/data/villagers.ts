import { DEFAULT_APPEARANCE, type Appearance } from './appearance';
export interface Stop {
  x: number;
  z: number;
  activity: string;
  room?: 'cafe' | 'shop';
}
export interface Villager {
  id: string;
  name: string;
  role: string;
  appearance: Appearance;
  stops: [Stop, Stop, Stop];
  lines: [string, string, string];
}
const look = (name: string, patch: Partial<Appearance>): Appearance => ({
  ...DEFAULT_APPEARANCE,
  name,
  accessories: [false, false, false],
  ...patch,
});
export const VILLAGERS: Villager[] = [
  {
    id: 'kaede',
    name: 'Kaede',
    role: 'the shared garden',
    appearance: look('Kaede', {
      hair: 0,
      hairColor: 2,
      top: 4,
      topColor: 1,
      bottom: 3,
      bottomColor: 4,
      shoes: 1,
      accessories: [true, false, false],
    }),
    stops: [
      { x: -27, z: 82, activity: 'Checking the garden beds' },
      { x: -30, z: 96, activity: 'Taking a basket home' },
      { x: -7, z: 85, activity: 'Waiting for the evening breeze' },
    ],
    lines: [
      'If you water a row, you can take a tomato. That is the whole arrangement.',
      'Someone left sunflower seeds last spring. Now look at the place.',
      'The pump always needs one extra turn. It likes to feel useful.',
    ],
  },
  {
    id: 'toma',
    name: 'Toma',
    role: 'the orchard keeper',
    appearance: look('Toma', {
      body: 'masculine',
      hair: 6,
      skin: 2,
      top: 5,
      topColor: 4,
      bottom: 3,
      bottomColor: 5,
      shoes: 2,
    }),
    stops: [
      { x: 81, z: 18, activity: 'Checking the fruit stall' },
      { x: 87, z: 65, activity: 'Resting beside the orchard' },
      { x: 74, z: 4, activity: 'Heading home with an empty basket' },
    ],
    lines: [
      'The fruit tastes sweeter after a walk across the bridge. I have tested this theory.',
      'The bees keep a much busier schedule than I do.',
      'Take the river path back. You will catch the last light between the trees.',
    ],
  },
  {
    id: 'nao',
    name: 'Nao',
    role: 'the seamstress',
    appearance: look('Nao', {
      hair: 2,
      hairColor: 4,
      top: 4,
      topColor: 2,
      bottom: 1,
      bottomColor: 0,
      accessories: [false, true, true],
    }),
    stops: [
      { x: 0, z: 84, activity: 'Carrying the morning’s mending' },
      { x: -4, z: 53, activity: 'Choosing fruit for the neighbors' },
      { x: 7, z: 85, activity: 'Opening the workshop window' },
    ],
    lines: [
      'I like clothes with enough room for a summer breeze.',
      'The new lane is lovely after the rain. Today we will have to settle for lovely sunshine.',
      'I can finish that last sleeve tomorrow. The light is too good to miss.',
    ],
  },
  {
    id: 'kei',
    name: 'Kei',
    role: 'the paper lantern maker',
    appearance: look('Kei', {
      body: 'masculine',
      hair: 7,
      hairColor: 1,
      top: 4,
      topColor: 3,
      bottom: 0,
      bottomColor: 4,
      shoes: 1,
    }),
    stops: [
      { x: 81, z: 62, activity: 'Sketching a new lantern' },
      { x: 86, z: 42, activity: 'Watching the orchard shadows' },
      { x: 76, z: 78, activity: 'Returning to the paper workshop' },
    ],
    lines: [
      'A lantern should look a little like a cloud, I think. Light enough to wander off.',
      'There is a vine-covered bench farther down the lane. A good place for a blank page.',
      'When the windows glow, I remember why I make these things.',
    ],
  },
  {
    id: 'aya',
    name: 'Aya',
    role: 'your neighbor',
    appearance: look('Aya', {
      hair: 3,
      top: 2,
      topColor: 2,
      bottom: 2,
      bottomColor: 0,
      accessories: [true, false, false],
    }),
    stops: [
      { x: 7, z: 12, activity: 'Tending the flowers' },
      { x: -4, z: -8, activity: 'Looking for Mikan' },
      { x: 10, z: 35, activity: 'Watering the garden' },
    ],
    lines: [
      'The hydrangeas drink before I do. Summer has its priorities.',
      'The café keeps a saucer of water behind the crates. Mikan knows, of course.',
      'The evening breeze is here. I think the laundry will be dry.',
    ],
  },
  {
    id: 'mori',
    name: 'Mori',
    role: 'general store',
    appearance: look('Mori', {
      body: 'masculine',
      hair: 4,
      hairColor: 4,
      skin: 2,
      top: 1,
      topColor: 1,
      bottom: 1,
      bottomColor: 4,
      accessories: [false, true, false],
    }),
    stops: [
      { x: 8, z: -20, room: 'shop', activity: 'Minding the store' },
      { x: 8, z: -20, activity: 'Closing the shutters' },
      { x: 27, z: 45, activity: 'Walking home' },
    ],
    lines: [
      'Cold barley tea is in the refrigerator. Help yourself to the shade.',
      'I count the empty crates when I close. Usually twice.',
      'Tomorrow will be warm again. That is the forecast I trust.',
    ],
  },
  {
    id: 'emi',
    name: 'Emi',
    role: 'Komorebi café',
    appearance: look('Emi', {
      hair: 2,
      hairColor: 2,
      top: 3,
      topColor: 1,
      bottom: 2,
      bottomColor: 3,
      shoes: 1,
    }),
    stops: [
      { x: -6, z: -6, room: 'cafe', activity: 'Making afternoon tea' },
      { x: -5, z: 0, activity: 'Taking a little break' },
      { x: -9, z: -27, activity: 'Walking to the inn' },
    ],
    lines: [
      'The window table gets the dappled light. It is my favorite.',
      'I can still hear the cups from out here. Habit, I suppose.',
      'We will open again tomorrow. There is always more tea.',
    ],
  },
  {
    id: 'ren',
    name: 'Ren',
    role: 'the woodworker',
    appearance: look('Ren', {
      body: 'masculine',
      hair: 5,
      hairColor: 0,
      skin: 3,
      top: 0,
      topColor: 4,
      bottom: 0,
      bottomColor: 1,
    }),
    stops: [
      { x: 8, z: -44, activity: 'Sanding a cedar shelf' },
      { x: 6, z: -39, activity: 'Taking the long way' },
      { x: 25, z: -47, activity: 'Heading home' },
    ],
    lines: [
      'Cedar smells best just after the plane passes over it.',
      'I repaired that bridge rail last spring. Still feels good to cross it.',
      'One more coat of oil can wait until tomorrow.',
    ],
  },
  {
    id: 'sora',
    name: 'Sora',
    role: 'a collector of views',
    appearance: look('Sora', {
      body: 'masculine',
      hair: 7,
      hairColor: 1,
      top: 1,
      topColor: 3,
      bottom: 1,
      bottomColor: 0,
      accessories: [false, false, true],
    }),
    stops: [
      { x: -9, z: 20, activity: 'Sketching the rooftops' },
      { x: -61, z: -83, activity: 'Waiting for the light' },
      { x: -8, z: 21, activity: 'Returning with a sketchbook' },
    ],
    lines: [
      'There is a path above the rice fields. At the top, the whole village fits into a photograph.',
      'I never quite get the color of the river right. Perhaps that is why I come back.',
      'The best part of drawing is how long it makes you look.',
    ],
  },
  {
    id: 'ichiro',
    name: 'Ichiro',
    role: 'by the river',
    appearance: look('Ichiro', {
      body: 'masculine',
      hair: 1,
      hairColor: 4,
      top: 2,
      topColor: 0,
      bottom: 1,
      bottomColor: 2,
      accessories: [true, true, false],
    }),
    stops: [
      { x: 35, z: -31, activity: 'Watching the river' },
      { x: 35, z: -30, activity: 'Listening to the water' },
      { x: 26, z: -46, activity: 'Going home for supper' },
    ],
    lines: [
      'This river has been telling the same story longer than I have lived here.',
      'The dragonflies arrive before the first evening star. Watch.',
      'Take care on the bridge. There is no need to hurry.',
    ],
  },
  {
    id: 'natsu',
    name: 'Natsu',
    role: 'the field gardener',
    appearance: look('Natsu', {
      hair: 0,
      hairColor: 3,
      skin: 2,
      top: 0,
      topColor: 2,
      bottom: 0,
      bottomColor: 4,
      accessories: [true, false, true],
    }),
    stops: [
      { x: -36, z: 24, activity: 'Checking the irrigation' },
      { x: -36, z: 53, activity: 'Putting the tools away' },
      { x: 27, z: -5, activity: 'Walking home' },
    ],
    lines: [
      'The water reaches the last row if you open this gate just a little.',
      'Frogs are good company when the work is quiet.',
      'The fields look like mirrors tonight. I almost hate to leave.',
    ],
  },
  {
    id: 'yuki',
    name: 'Yuki',
    role: 'shrine caretaker',
    appearance: look('Yuki', {
      body: 'feminine',
      hair: 2,
      hairColor: 0,
      skin: 0,
      top: 1,
      topColor: 0,
      bottom: 2,
      bottomColor: 2,
      shoes: 1,
    }),
    stops: [
      { x: 77, z: -62, activity: 'Sweeping the cedar path' },
      { x: 79, z: -59, activity: 'Lighting the lanterns' },
      { x: 80, z: -39, activity: 'Returning to the cottage' },
    ],
    lines: [
      'The leaves are generous. There are always a few more to sweep.',
      'You can ring the bell. A wish does not need to be very big.',
      'The lanterns will keep the path for you.',
    ],
  },
];
