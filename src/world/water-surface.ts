import * as T from 'three';
import { regionRiverSample } from '../data/regions';
import { riverX, terrainHeight } from '../data/world';
import { FALL_FORWARD_SPEED } from '../render/water-motion';

function channel(z:number) {
  if(z < -132){const r=regionRiverSample(z);return {...r,y:r.y+.08};}
  const join=regionRiverSample(-132),t=T.MathUtils.clamp((-z-116)/16,0,1),blend=t*t*(3-2*t);
  return {x:riverX(z),y:T.MathUtils.lerp(-.24,join.y+.08,blend),halfWidth:T.MathUtils.lerp(4.9,join.halfWidth,blend)};
}

/** World-space parameters agree on independently owned mesh seams. */
export function waterSurfaceAt(x: number, y: number, z: number, paddy = false) {
  if (paddy) return [.22, 0, .10, .055] as const;
  const r=channel(z),a=channel(z-.25),b=channel(z+.25);
  const dx = b.x - a.x, length = Math.hypot(dx, .5);
  const slope = Math.max(0, (a.y - b.y) / length);
  const edge = Math.abs(x - r.x) / r.halfWidth;
  const basin = Math.hypot((x - 370) / 22, (z + 698) / 18);
  const inBasin = basin < 1 && Math.abs(y - 18.08) < .3;
  let shore = 1 - T.MathUtils.smoothstep(inBasin ? Math.min(edge, basin) : edge, .72, 1);
  // Both meshes keep their shared clipped boundary still, preventing animated
  // T-junction cracks without overlapping surfaces or a visible cover strip.
  if(inBasin)shore*=T.MathUtils.smoothstep(Math.abs(Math.abs(x-r.x)-r.halfWidth),0,1.1);
  let speed = T.MathUtils.clamp(Math.sqrt(.36 + 9.81 * 4 * slope), .6, 2.2);
  if(z<=-730)speed=T.MathUtils.lerp(speed,FALL_FORWARD_SPEED,T.MathUtils.smoothstep(z,-748,-730));
  const depth = T.MathUtils.clamp(y - terrainHeight(x,z), .12, 4.5);
  return [depth, dx / length, inBasin ? .6 : speed, shore * (inBasin ? 1 : .72)] as const;
}

export function prepareWaterSurface(geometry: T.BufferGeometry, offsetX = 0, offsetZ = 0, paddy = false) {
  const p = geometry.getAttribute('position'), data = new Float32Array(p.count * 4);
  for (let i=0;i<p.count;i++) data.set(waterSurfaceAt(p.getX(i)+offsetX,p.getY(i),p.getZ(i)+offsetZ,paddy),i*4);
  geometry.setAttribute('aWater',new T.BufferAttribute(data,4));
  geometry.computeBoundingSphere();geometry.boundingSphere!.radius += .2;
  return geometry;
}

/** Interior wave vertices do not change a reach's footprint. The clipping
 * system needs only its exact boundary stations, not thousands of interior triangles.
 */
export function waterFootprint(source:T.BufferGeometry){
  const p=source.getAttribute('position'),uv=source.getAttribute('uv');
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let i=0;i<p.count;i++)if(uv.getX(i)===0||uv.getX(i)===1){
    positions.push(p.getX(i),p.getY(i),p.getZ(i));uvs.push(uv.getX(i),uv.getY(i));
  }
  const rows=positions.length/6;
  for(let i=0;i<rows-1;i++){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);return g;
}

/** Clip first, subdivide afterwards: the pool Boolean never handles dense waves. */
export function subdivideWater(source: T.BufferGeometry, maxEdge = 1.65) {
  const p=source.getAttribute('position'),uv=source.getAttribute('uv'),indices=source.getIndex();
  const positions:number[]=[], uvs:number[]=[];
  type Vertex = number[];
  function split(a:Vertex,b:Vertex,c:Vertex,depth=0) {
    const edge=(u:Vertex,v:Vertex)=>Math.hypot(u[0]-v[0],u[1]-v[1],u[2]-v[2]);
    const ab=edge(a,b),bc=edge(b,c),ca=edge(c,a);
    if(Math.max(ab,bc,ca)<=maxEdge||depth>=12){
      for(const v of [a,b,c]){positions.push(...v.slice(0,3));uvs.push(v[3],v[4]);}return;
    }
    const mid=(u:Vertex,v:Vertex)=>u.map((n,i)=>(n+v[i])*.5);
    if(ab>=bc&&ab>=ca){const m=mid(a,b);split(a,m,c,depth+1);split(m,b,c,depth+1);}
    else if(bc>=ca){const m=mid(b,c);split(a,b,m,depth+1);split(a,m,c,depth+1);}
    else{const m=mid(c,a);split(a,b,m,depth+1);split(m,b,c,depth+1);}
  }
  for(let i=0;i<(indices?.count??p.count);i+=3){
    const vs=[0,1,2].map(j=>{const k=indices?indices.getX(i+j):i+j;return [p.getX(k),p.getY(k),p.getZ(k),uv.getX(k),uv.getY(k)];});
    split(vs[0],vs[1],vs[2]);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();source.dispose();return g;
}
