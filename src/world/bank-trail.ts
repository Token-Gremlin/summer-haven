import * as T from 'three';
import { BANK_TRAIL,BANK_TRAIL_WIDTH } from '../data/bank-trail';
import { terrainHeight } from '../data/world';
/** Mitered continuous strip with dense cross samples; stays on the sampled ground. */
export function bankTrailGeometry() {
  const normals=BANK_TRAIL.slice(1).map((b,i)=>{const a=BANK_TRAIL[i],d=new T.Vector2(b[0]-a[0],b[1]-a[1]).normalize();return new T.Vector2(-d.y,d.x);});
  const offsets=BANK_TRAIL.map((_,i)=>{
    if(i===0)return normals[0].clone();if(i===BANK_TRAIL.length-1)return normals.at(-1)!.clone();
    const n=normals[i-1].clone().add(normals[i]).normalize();return n.multiplyScalar(1/n.dot(normals[i]));
  });
  const p:number[]=[],uv:number[]=[],indices:number[]=[];let length=0,rows=0;
  for(let i=1;i<BANK_TRAIL.length;i++){
    const a=BANK_TRAIL[i-1],b=BANK_TRAIL[i],distance=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(distance/.3);
    for(let j=i===1?0:1;j<=count;j++){
      const t=j/count,offset=offsets[i-1].clone().lerp(offsets[i],t);
      for(let k=0;k<=4;k++){
        const side=(k/4-.5)*BANK_TRAIL_WIDTH,x=a[0]+(b[0]-a[0])*t+offset.x*side,z=a[1]+(b[1]-a[1])*t+offset.y*side;
        p.push(x,terrainHeight(x,z)+.038,z);uv.push(side,length+distance*t);
        if(rows>0&&k<4){const n=rows*5+k;indices.push(n-5,n,n-4,n,n+1,n-4);}
      }
      rows++;
    }
    length+=distance;
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
