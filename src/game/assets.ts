import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { prep, M, ID } from '../world/geo';
import { uber, surfaceBits, geologyMaterial, wildlifeMaterial, aquaticMaterial } from '../render/materials';
import type { CityAsset } from '../data/city';
import type { HabitatSpecies } from '../data/habitats';
import type { HabitatAsset } from '../world/habitat-life';
import { loadWoodlandTextures } from '../render/woodland-shared';

export interface ArchitectureData {
  assets:Record<CityAsset,{collisions_blender:{center:[number,number,number];size:[number,number,number]}[]}>;
}

export class Assets {
  library!: T.Group;
  characters = {} as Record<'masculine' | 'feminine', GLTF>;
  // Geometry is prepared once per loaded wardrobe. Character instances own their rigs and
  // colored selected batches; they must never recolor or dispose these shared templates.
  private preparedCharacters = new WeakMap<GLTF, {
    root: T.Group;
    baseColors: Map<T.BufferGeometry, T.Color>;
  }>();
  reedwing!: GLTF;
  siltfinModel!: GLTF;
  siltfinWaterline = 1.0377006202936172;
  architecture!: T.Group;
  architectureData!: ArchitectureData;
  transport!: T.Group;
  wildlife = {} as Record<HabitatSpecies, HabitatAsset>;
  gorge!: T.Group;
  gorgeData!: {collision_proxies:{name:string;bounds_world:{min:[number,number,number];max:[number,number,number]}}[]};
  async load(progress: (text: string, n: number) => void) {
    const loader = new GLTFLoader();
    for (const [i, body] of (['feminine', 'masculine'] as const).entries()) {
      progress(`Unpacking the ${body} wardrobe…`, 0.1 + i * 0.12);
      this.characters[body] = await loader.loadAsync(
        `${import.meta.env.BASE_URL}assets/characters/${body}.glb`,
      );
    }
    progress('Opening the village workshop…', 0.35);
    this.library = (await loader.loadAsync(`${import.meta.env.BASE_URL}assets/world/village-kit.glb`)).scene;
    this.toon(this.library, false);
    progress('Listening for wings above the valley…', .41);
    this.reedwing = await loader.loadAsync(`${import.meta.env.BASE_URL}assets/creatures/aurelian-reedwing.glb`);
    const [siltfin, siltfinData] = await Promise.all([
      loader.loadAsync(`${import.meta.env.BASE_URL}assets/creatures/vesper-siltfin.glb`),
      fetch(`${import.meta.env.BASE_URL}assets/creatures/vesper-siltfin.json`).then(r=>{
        if(!r.ok)throw new Error('The river guardian manifest could not be loaded.');
        return r.json();
      }),
    ]);
    if(!siltfin.scene.getObjectByName('RIG_Vesper_Siltfin') || !Number.isFinite(siltfinData.waterline_recommendation_local_y))
      throw new Error('The river guardian asset is incomplete.');
    this.siltfinModel=siltfin;this.siltfinWaterline=siltfinData.waterline_recommendation_local_y;
    progress('Opening Aldermere’s gates…', .44);
    const [architecture, metadata] = await Promise.all([
      loader.loadAsync(`${import.meta.env.BASE_URL}assets/fantasy/architecture.glb`),
      fetch(`${import.meta.env.BASE_URL}assets/fantasy/architecture.json`).then(r=>{
        if(!r.ok)throw new Error('The Aldermere asset manifest could not be loaded.');
        return r.json() as Promise<ArchitectureData>;
      }),
    ]);
    this.architecture=architecture.scene;
    this.architectureData=metadata;
    // Authoring proxies are collision data only. They never enter rendering or material conversion.
    for(const root of [...this.architecture.children]) {
      if(root.name.startsWith('COL_'))root.removeFromParent();
      else if(root.name.startsWith('BLD_'))this.toon(root,false);
    }
    this.transport=(await loader.loadAsync(`${import.meta.env.BASE_URL}assets/fantasy/reed-ferry.glb`)).scene;
    for(const root of [...this.transport.children]) {
      if(root.name.startsWith('COL_'))root.removeFromParent();
      else this.toon(root,false);
    }
    const [gorge,gorgeData]=await Promise.all([
      loader.loadAsync(`${import.meta.env.BASE_URL}assets/fantasy/silverveil-gorge.glb`),
      fetch(`${import.meta.env.BASE_URL}assets/fantasy/silverveil-gorge.json`).then(r=>{if(!r.ok)throw new Error('The Silverveil manifest could not be loaded.');return r.json();}),
    ]);
    this.gorge=gorge.scene;this.gorgeData=gorgeData;
    for(const root of [...this.gorge.children])if(root.name.startsWith('COL_'))root.removeFromParent();
    this.toon(this.gorge,false);
    this.gorge.traverse(o=>{if(o instanceof T.Mesh)o.material=geologyMaterial(surfaceBits(o.geometry));});
    progress('Listening to the forest…', .47);
    await loadWoodlandTextures();
    const [wildlife, wildlifeData] = await Promise.all([
      loader.loadAsync(`${import.meta.env.BASE_URL}assets/creatures/haven-wildlife.glb`),
      fetch(`${import.meta.env.BASE_URL}assets/creatures/haven-wildlife.json`).then(r => {
        if (!r.ok) throw new Error('The wildlife manifest could not be loaded.');
        return r.json() as Promise<{species:Record<HabitatSpecies,{root:string;contactY:number}>}>;
      }),
    ]);
    this.toon(wildlife.scene, false);
    wildlife.scene.traverse(o => {
      if(o instanceof T.Mesh)o.material=wildlifeMaterial(surfaceBits(o.geometry));
    });
    for (const species of ['deer','terrapin','songbird'] as const) {
      const data=wildlifeData.species[species], root=wildlife.scene.getObjectByName(data.root);
      if(!root || !Number.isFinite(data.contactY))throw new Error(`Incomplete wildlife asset: ${species}`);
      this.wildlife[species]={scene:root,contactY:data.contactY};
    }
  }
  toon(root: T.Object3D, character: boolean) {
    root.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      const old = (Array.isArray(o.material) ? o.material[0] : o.material) as T.MeshStandardMaterial;
      const label = old.name.toLowerCase();
      const mt = label.startsWith('skin')
        ? M.skin
        : label.startsWith('hair')
          ? M.hair
          : label.startsWith('wood')
            ? M.planks
            : label.startsWith('plaster')
              ? M.plaster
              : label.startsWith('roof')
                ? M.roof
                : label.startsWith('stone')
                  ? M.stone
                  : label.startsWith('metal')
                    ? M.metal
                    : label.startsWith('glow')
                      ? M.glow
                      : label.startsWith('glass')
                        ? M.glass
                        : character && /eye|iris|ink|lip/.test(label)
                          ? M.lacquer
                          : M.cloth;
      const id = character
        ? mt === M.skin
          ? ID.skin
          : mt === M.hair
            ? ID.hair
            : /EYE|lash|brow|mouth/.test(o.name)
              ? ID.eye
              : ID.rider
        : o.name.startsWith('BICYCLE') || o.parent?.name.startsWith('wheel')
          ? ID.bike
          : ID.house;
      o.geometry = o.geometry.clone();
      // Authored glTF colors are linear; retain them only on explicitly painted meshes.
      // Material base color multiplies COLOR_0 under the glTF material contract.
      const painted = o.userData.authoredVertexColor === true && o.geometry.getAttribute('color');
      if (painted) {
        const tint = old.color || new T.Color('white');
        const colors = new Float32Array(painted.count * 3);
        for (let i = 0; i < painted.count; i++) {
          colors[i * 3] = painted.getX(i) * tint.r;
          colors[i * 3 + 1] = painted.getY(i) * tint.g;
          colors[i * 3 + 2] = painted.getZ(i) * tint.b;
        }
        o.geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
      }
      prep(o.geometry, painted ? null : old.color || '#dddddd', mt);
      o.userData.baseColor = (old.color || new T.Color('white')).clone();
      o.userData.materialName = label;
      o.material = uber(id, character ? 0.7 : 0.5, T.DoubleSide, surfaceBits(o.geometry));
      o.layers.enable(1);
      o.layers.enable(2);
      if (character) o.frustumCulled = false;
    });
  }
  character(body: 'masculine' | 'feminine') {
    const source = this.characters[body];
    let prepared = this.preparedCharacters.get(source);
    if (!prepared) {
      const root = clone(source.scene) as T.Group;
      this.toon(root, true);
      const baseColors = new Map<T.BufferGeometry, T.Color>();
      root.traverse(o => {
        if (o instanceof T.Mesh) baseColors.set(o.geometry, o.userData.baseColor);
      });
      prepared = { root, baseColors };
      this.preparedCharacters.set(source, prepared);
    }
    const root = clone(prepared.root) as T.Group;
    root.traverse(o => {
      // Object3D cloning serializes userData; Color.toJSON quantizes it to an sRGB hex value.
      // Restore the exact linear base color so unchanged wardrobe pieces keep their palette.
      if (o instanceof T.Mesh) o.userData.baseColor = prepared.baseColors.get(o.geometry)!.clone();
    });
    return { root, clips: source.animations.filter((a) => !a.name.includes('.')), sharedGeometry: true };
  }
  get(name: string) {
    const source = this.library.getObjectByName(name);
    if (!source) throw new Error(`Missing asset: ${name}`);
    return source.clone(true);
  }
  dragon() {
    const root = clone(this.reedwing.scene) as T.Group;
    this.toon(root, true);
    return { root, clips: this.reedwing.animations };
  }
  siltfin() {
    const root=clone(this.siltfinModel.scene) as T.Group;
    this.toon(root,true);
    root.traverse(o=>{if(o instanceof T.Mesh)o.material=aquaticMaterial(surfaceBits(o.geometry));});
    return {root,clips:this.siltfinModel.animations,waterline:this.siltfinWaterline};
  }
  building(name:CityAsset) {
    const root=this.architecture.getObjectByName(name);
    if(!root)throw new Error(`Missing architecture: ${name}`);
    return root.clone(true);
  }
  ferry(name:string) {
    const root=this.transport.getObjectByName(name);
    if(!root)throw new Error(`Missing ferry asset: ${name}`);
    return root.clone(true);
  }
}
