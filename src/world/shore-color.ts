import * as T from 'three';
import { PADDIES, riverX } from '../data/world';
import { regionRiverSample, REGION_WATER_LIFT } from '../data/regions';

const wetMoss = new T.Color('#455c50');
const silt = new T.Color('#868368');
const smooth = (a:number,b:number,v:number) => T.MathUtils.smoothstep(v,a,b);

/** Baked into the existing ground vertices: damp, irregular bank contact without
 * another decal, coplanar surface, texture sample or runtime terrain change. */
export function colorShore(color:T.Color,x:number,y:number,z:number) {
  let distance=Infinity,waterY=0;
  if(z>=-910&&z<-132) {
    const river=regionRiverSample(z);
    distance=Math.abs(x-river.x)-river.halfWidth;
    waterY=river.y+REGION_WATER_LIFT;
    // Use the same receiving-pool footprint as collision and the actual mesh.
    const poolDistance=(Math.hypot((x-370)/22,(z+698)/18)-1)*18;
    if(poolDistance<distance&&Math.abs(y-18.08)<2.5) {
      distance=poolDistance;waterY=18+REGION_WATER_LIFT;
    }
  } else if(z>=-132&&z<=214) {
    const blend=1-smooth(-132,-116,z);
    distance=Math.abs(x-riverX(z))-(4.9+blend*.2);
    waterY=-.24+blend*.16;
    for(const [cx,cz,w,d] of PADDIES) {
      const dx=Math.abs(x-cx)-w/2,dz=Math.abs(z-cz)-d/2;
      const edge=Math.hypot(Math.max(dx,0),Math.max(dz,0))+Math.min(Math.max(dx,dz),0);
      if(edge<distance){distance=edge;waterY=-.16;}
    }
  }
  if(distance>3.5||Math.abs(y-waterY)>2.5)return color;
  const variation=.5+.25*Math.sin(z*.49+x*.28)+.25*Math.sin(x*.81-z*.16);
  const elevation=1-smooth(.3,2.1,y-waterY);
  const shoulder=(1-smooth(.1,2.5+variation*.65,distance))*elevation;
  const wet=(1-smooth(-.25,1.25+variation*.5,distance))*elevation;
  color.lerp(silt,shoulder*.24).lerp(wetMoss,wet*.65);
  return color;
}
