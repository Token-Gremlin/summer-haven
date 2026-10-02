export const HAIR = [
  'Meadow bob',
  'Soft crop',
  'Summer ponytail',
  'Loose waves',
  'Side part',
  'Textured undercut',
  'Curly crop',
  'Swept quiff',
] as const;
export const TOPS = [
  'Everyday tee',
  'Linen shirt',
  'Summer cardigan',
  'Sleeveless blouse',
  'Open overshirt',
  'Camp collar shirt',
] as const;
export const BOTTOMS = ['Walking shorts', 'Wide trousers', 'Pleated skirt', 'Cuffed chinos'] as const;
export const SHOES = ['Canvas sneakers', 'Summer sandals', 'Suede loafers'] as const;
export const ACCESSORIES = ['Straw hat', 'Round glasses', 'Canvas satchel'] as const;
export const SKIN = ['#f1ccae', '#deb294', '#bc8d70', '#95684e', '#674739'];
export const HAIR_COLORS = ['#382c28', '#654333', '#a16c43', '#c6ac7a', '#293d43', '#843f3d'];
export const EYES = ['#6a4732', '#426b62', '#537a9d', '#9c7d41', '#555163'];
export const CLOTH = ['#eee4cb', '#819f91', '#be7967', '#6b8496', '#c5ae74', '#3e4e63'];
export interface Appearance {
  name: string;
  body: 'feminine' | 'masculine';
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  face: number;
  top: number;
  topColor: number;
  bottom: number;
  bottomColor: number;
  shoes: number;
  accessories: boolean[];
}
export const DEFAULT_APPEARANCE: Appearance = {
  name: 'Haru',
  body: 'feminine',
  skin: 1,
  hair: 0,
  hairColor: 0,
  eyes: 1,
  face: 0,
  top: 1,
  topColor: 0,
  bottom: 0,
  bottomColor: 3,
  shoes: 0,
  accessories: [false, false, true],
};
export const copyAppearance = (a: Appearance): Appearance => ({ ...a, accessories: [...a.accessories] });
