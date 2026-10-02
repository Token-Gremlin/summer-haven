import * as T from 'three';
import { HABITATS } from '../data/habitats';
import { regionRouteSample } from '../data/regions';
import { terrainHeight } from '../data/world';
import { mulberry32 } from '../core/rng';
import { shortGrass, floretCluster } from './vegetation';
import { ID } from './geo';
import { uber, surfaceBits } from '../render/materials';

/** An irregular opening gives the deer a feeding habitat and a view through the
 * tree line. The same footprint controls canopy clearance and ground colour. */
export function mosswoodGlade(x: number, z: number) {
  const a = Math.hypot((x-211)/22, (z+511)/18);
  const b = Math.hypot((x-222)/12, (z+515)/13);
  const t = T.MathUtils.clamp((Math.min(a,b)-.83)/.45,0,1);
  return 1-t*t*(3-2*t);
}

export class HabitatScenery {
  readonly group = new T.Group();
  private patches: T.InstancedMesh[] = [];
  constructor() {
    this.group.name = 'Mosswood feeding glade';
    const random = mulberry32(52219), marker = new T.Object3D();
    const contacts = HABITATS.find(h=>h.id==='mosswood-glade')!.points;
    const grasses: T.Matrix4[] = [], clover: T.Matrix4[] = [];
    for (const p of contacts) for (let i=0;i<64;i++) {
      const a=random()*Math.PI*2, r=Math.sqrt(random())*2.8;
      const x=p.x+Math.cos(a)*r, z=p.z+Math.sin(a)*r;
      const path=regionRouteSample(x,z);
      if(path.distance<path.width/2+.28)continue;
      const flower=i%4===0, scale=flower?.32+random()*.25:.48+random()*.50;
      marker.position.set(x,terrainHeight(x,z)+.01,z);
      marker.rotation.set(0,random()*Math.PI*2,0);
      marker.scale.setScalar(scale);marker.updateMatrix();
      (flower?clover:grasses).push(marker.matrix.clone());
    }
    for(const [geometry, transforms] of [[shortGrass(415),grasses],[floretCluster(992,12,.38,.06),clover]] as const) {
      const mesh=new T.InstancedMesh(geometry,uber(ID.grass,0,T.DoubleSide,surfaceBits(geometry)),transforms.length);
      transforms.forEach((m,i)=>mesh.setMatrixAt(i,m));
      mesh.userData.total=transforms.length;mesh.computeBoundingSphere();
      this.group.add(mesh);this.patches.push(mesh);
    }
  }
  update(position: T.Vector3, range: number, density: number) {
    this.group.visible=Math.hypot(position.x-212,position.z+511)<range+30;
    for(const mesh of this.patches)mesh.count=Math.max(1,Math.floor(mesh.userData.total*density));
  }
}
