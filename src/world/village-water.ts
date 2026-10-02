import * as T from 'three';
import { riverX } from '../data/world';
import { regionRiverSample, REGION_WATER_LIFT } from '../data/regions';
import { prepareWaterSurface } from './water-surface';

/** One owner on each side of the existing village/valley boundary. */
export function villageRiverGeometry(connectValley = true, detailed = true) {
  const start = connectValley ? -132 : -210, end = 214;
  const coarseRows=Math.ceil((end-start)/2.65), subdivisions=detailed?2:1;
  const rows=coarseRows*subdivisions,cols=detailed?16:1;
  const positions: number[] = [], uv: number[] = [], index: number[] = [];
  const join = regionRiverSample(-132);
  const station=(z:number)=>{
    const raw=connectValley?T.MathUtils.clamp((-z-116)/16,0,1):0,blend=raw*raw*(3-2*raw);
    return {x:riverX(z),y:T.MathUtils.lerp(-.24,join.y+REGION_WATER_LIFT,blend),w:T.MathUtils.lerp(4.9,join.halfWidth,blend)};
  };
  for (let i = 0; i <= rows; i++) {
    const z = T.MathUtils.lerp(start, end, i / rows);
    // Subdivide the original footprint, rather than resampling its curved banks.
    // The ground authoring reader can retain its exact two-vertex station mesh.
    const row=Math.min(Math.floor(i/subdivisions),coarseRows-1),f=i/subdivisions-row;
    const a=station(T.MathUtils.lerp(start,end,row/coarseRows)),b=station(T.MathUtils.lerp(start,end,(row+1)/coarseRows));
    const x=T.MathUtils.lerp(a.x,b.x,f),y=T.MathUtils.lerp(a.y,b.y,f),width=T.MathUtils.lerp(a.w,b.w,f);
    for (let j=0;j<=cols;j++) {
      const side=j/cols*2-1;
      positions.push(x + side * width, y, z);
      uv.push((side + 1) / 2, z);
    }
    if (i < rows) for(let j=0;j<cols;j++) {
      const k=i*(cols+1)+j;
      index.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return detailed?prepareWaterSurface(geometry):geometry;
}
