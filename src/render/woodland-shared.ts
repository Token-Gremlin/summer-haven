import * as T from 'three';
import { leafMipmaps } from './leaf-mips';
import { SHARED_WIND } from './climate-uniforms';

/** Kept outside the 32-bit uber surface mask: woodland has its own MRT material. */
export const TREE_LEAF = 32;
export const TREE_BARK = 36;
export const TREE_TEXTURES = ['oak', 'ash', 'aspen', 'pine'] as const;
export const WOODLAND = {
  uTreeLeaves: { value: null as T.Texture | null },
  uTreeBark: { value: null as T.Texture | null },
  uTreeBands: { value: new T.Vector3(12, 48, 140) },
  uTreeShadowDistance: { value: 14 },
};

export async function loadWoodlandTextures() {
  const loader = new T.TextureLoader(),
    base = `${import.meta.env.BASE_URL}assets/nature/ez-tree/`;
  const leaves = await Promise.all(TREE_TEXTURES.map((name) => loader.loadAsync(`${base}${name}.png`)));
  const speciesMips = leaves.map((texture) => leafMipmaps(texture.image));
  // A single sampler prevents older integrated GPUs from evaluating four conditional
  // texture reads for every alpha-tested fragment, especially in the 4K shadow pass.
  const mipmaps = speciesMips[0].map((level, index) => {
    const atlas = document.createElement('canvas');
    atlas.width = atlas.height = level.width * 2;
    const ctx = atlas.getContext('2d')!;
    speciesMips.forEach((mips, i) =>
      ctx.drawImage(mips[index], (i % 2) * level.width, (1 - Math.floor(i / 2)) * level.height),
    );
    return atlas;
  });
  const last = document.createElement('canvas');
  last.width = last.height = 1;
  last.getContext('2d')!.drawImage(mipmaps.at(-1)!, 0, 0, 1, 1);
  mipmaps.push(last);
  const texture = new T.CanvasTexture(mipmaps[0]);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.mipmaps = mipmaps;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  WOODLAND.uTreeLeaves.value = texture;
  leaves.forEach((t) => t.dispose());
  const bark = await loader.loadAsync(`${base}bark-color.jpg`);
  bark.colorSpace = T.SRGBColorSpace;
  bark.wrapS = bark.wrapT = T.RepeatWrapping;
  bark.anisotropy = 4;
  WOODLAND.uTreeBark.value = bark;
}

/** Same displacement in the colour, mirror and shadow passes; roots stay fixed.
 * Maximum excursion fits the existing .422*w horizontal / .124*w vertical camera margin. */
export const TREE_WIND = /* glsl */ `
${SHARED_WIND}
vec3 woodlandWind(vec3 wp, float weight) {
  return climateWind(wp,weight);
}
`;

export const TREE_SAMPLERS = /* glsl */ `
uniform sampler2D uTreeLeaves;
vec4 treeLeaf(vec2 uv, int surface) {
  float species=clamp(float(surface-32),0.,3.);
  vec2 cell=vec2(mod(species,2.),floor(species/2.));
  return texture(uTreeLeaves,(cell+clamp(uv,.0005,.9995))*.5);
}
`;
