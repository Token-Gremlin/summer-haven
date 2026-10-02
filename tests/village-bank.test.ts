import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { riverX, terrainHeight } from '../src/data/world';
import { villageGroundBase, villageGroundGeometry } from '../src/world/village-ground';
import { villageRiverGeometry } from '../src/world/village-water';
import { prep, M } from '../src/world/geo';

const before = villageGroundBase(), after = villageGroundGeometry();
function sampler(g: T.BufferGeometry) {
  const p = g.attributes.position, idx = g.index!, buckets = new Map<number, number[][]>();
  for (let k = 0; k < idx.count; k += 3) {
    const t = [0, 1, 2].flatMap(j => { const i = idx.getX(k+j); return [p.getX(i),p.getY(i),p.getZ(i)]; });
    for (let row = Math.floor(Math.min(t[2],t[5],t[8])); row <= Math.floor(Math.max(t[2],t[5],t[8])); row++) {
      if (!buckets.has(row)) buckets.set(row, []);
      buckets.get(row)!.push(t);
    }
  }
  return (x: number, z: number) => {
    const hits: number[] = [];
    for (const t of buckets.get(Math.floor(z)) ?? []) {
      const [ax,ay,az,bx,by,bz,cx,cy,cz] = t;
      if(x<Math.min(ax,bx,cx)-1e-6||x>Math.max(ax,bx,cx)+1e-6)continue;
      const det=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);
      if(Math.abs(det)<1e-10)continue;
      const a=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/det;
      const b=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/det, c=1-a-b;
      if(a>=-1e-7&&b>=-1e-7&&c>=-1e-7) hits.push(a*ay+b*by+c*cy);
    }
    assert.ok(hits.length,`no ground at ${x},${z}`);
    assert.ok(Math.max(...hits)-Math.min(...hits)<1e-4,`overlapping heights at ${x},${z}: ${hits}`);
    return hits[0];
  };
}
const oldY=sampler(before), newY=sampler(after);
test('isolated reference slice retains the exact original ground',()=>{
  const isolated=villageGroundGeometry(false);
  assert.deepEqual(isolated.index!.array,before.index!.array);
  for(const key of Object.keys(before.attributes)) assert.deepEqual(isolated.attributes[key].array,before.attributes[key].array);
  isolated.dispose();
});
const water=villageRiverGeometry(), wp=water.attributes.position;
const waterStride=Array.from({length:wp.count},(_,i)=>i).find(i=>wp.getZ(i)!==wp.getZ(0))!;
function edge(z:number,side:number){
  let i=0; while(i+waterStride<wp.count&&wp.getZ(i+waterStride)<z)i+=waterStride;
  const t=(z-wp.getZ(i))/(wp.getZ(i+waterStride)-wp.getZ(i)),k=side<0?0:waterStride-1;
  return {x:T.MathUtils.lerp(wp.getX(i+k),wp.getX(i+waterStride+k),t),y:T.MathUtils.lerp(wp.getY(i),wp.getY(i+waterStride),t)};
}

test('replacement preserves external ground, portal edge and bounds',()=>{
  let samples=0;
  for(let z=-135.17;z<-109;z+=.217) for(const side of [-1,1]) for(const d of [0,4.3,9,10,12]) {
    if(z < -132) continue; // regional ownership, not in this ground
    const x=riverX(z)+side*d;
    assert.ok(Math.abs(newY(x,z)-oldY(x,z))<.00003,`changed protected sample ${x},${z}`);samples++;
  }
  for(let x=34;x<68;x+=.071) { assert.ok(Math.abs(newY(x,-132)-oldY(x,-132))<.00003); samples++; }
  for(let x=-190;x<190;x+=11.31)for(let z=-110;z<190;z+=9.73) {
    assert.equal(newY(x,z),oldY(x,z));samples++;
  }
  before.computeBoundingBox(); after.computeBoundingBox();
  assert.deepEqual(after.boundingBox,before.boundingBox);
  console.log(`Protected rendered-ground samples: ${samples}`);
});

test('dry replacement follows physical support without a ridge or wall normals',()=>{
  let maxSupportError=0,maxRaisedAboveSupport=-Infinity,maxReverseDrop=0,samples=0;
  for(let z=-129.931;z<-114;z+=.193)for(const side of [-1,1]){
    let previous=newY(riverX(z)+side*5.12,z);
    for(let d=5.12;d<8.9;d+=.083){
      const x=riverX(z)+side*d,y=newY(x,z),physical=terrainHeight(x,z,false);
      maxSupportError=Math.max(maxSupportError,Math.abs(y-(physical-.045)));
      maxRaisedAboveSupport=Math.max(maxRaisedAboveSupport,y-physical);
      maxReverseDrop=Math.max(maxReverseDrop,previous-y);previous=y;samples++;
    }
  }
  console.log(JSON.stringify({drySamples:samples,maxSupportError,maxRaisedAboveSupport,maxReverseDrop}));
  assert.ok(maxSupportError<.012,'dry ground samples physical height with only smooth interpolation error');
  assert.ok(maxRaisedAboveSupport<-.03,'no dry ground raised above player support');
  assert.ok(maxReverseDrop<.01,'no landward drop into the former coarse-grid trench');
  const p=after.attributes.position,n=after.attributes.normal;
  let minDryNormalY=1,count=0;
  for(let i=before.attributes.position.count;i<p.count;i++){
    const z=p.getZ(i),d=Math.abs(p.getX(i)-riverX(z));
    if(z>-130&&z<-114&&d>5.12){minDryNormalY=Math.min(minDryNormalY,n.getY(i));count++;}
  }
  console.log(JSON.stringify({dryNormalVertices:count,minDryNormalY}));
  assert.ok(count>100&&minDryNormalY>.97,'new dry vertices use ground-facing normals');
  let maxChangedBankDistance=0,maxDryLift=0,minChangedX=Infinity,maxChangedX=-Infinity;
  for(let i=before.attributes.position.count;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),d=Math.abs(x-riverX(z));
    if(Math.abs(p.getY(i)-oldY(x,z))>.00003){
      maxChangedBankDistance=Math.max(maxChangedBankDistance,d);
      minChangedX=Math.min(minChangedX,x);maxChangedX=Math.max(maxChangedX,x);
      if(d>5.12)maxDryLift=Math.max(maxDryLift,p.getY(i)-oldY(x,z));
    }
  }
  console.log(JSON.stringify({maxChangedBankDistance,maxDryLift,minChangedX,maxChangedX,
    westAt124:[5.1001,5.69,6.2,7].map(d=>({d,old:oldY(riverX(-124)-d,-124),new:newY(riverX(-124)-d,-124),physical:terrainHeight(riverX(-124)-d,-124,false)}))}));
});

test('actual replacement mesh connects the blocked dry bank to the existing water edge',()=>{
  const sections=[];
  for(let z=-129.937;z<-114;z+=.193)for(const side of [-1,1]){
    const e=edge(z,side);
    assert.ok(newY(e.x,z)>=e.y-.015,`water-edge coverage ${z},${side}`);
  }
  for(const z of [-128,-124,-120,-116]) for(const side of [-1,1]) {
    const e=edge(z,side), dryX=riverX(z)+side*5.1001;
    const dryPhysical=terrainHeight(dryX,z,false)-.045;
    assert.ok(newY(e.x,z)>e.y-.015,`open water edge at ${z},${side}: ${newY(e.x,z)},water ${e.y}`);
    assert.ok(Math.abs(newY(dryX,z)-dryPhysical)<.03,`dry break sample at ${z},${side}`);
    let crossing=NaN;
    for(let d=4.4;d<5.69;d+=.001) {
      if(newY(riverX(z)+side*d,z)>=e.y){crossing=riverX(z)+side*d;break;}
    }
    assert.ok(Number.isFinite(crossing));
    assert.ok(side*(crossing-e.x)<.015,`ground should meet underneath finite water edge ${z},${side}`);
    sections.push({z,side,waterEdge:e.x,waterY:e.y,oldGroundAtWater:oldY(e.x,z),newGroundAtWater:newY(e.x,z),crossing});
  }
  console.log(JSON.stringify(sections));
});

test('local replacement has bounded cost and no duplicated surface area',()=>{
  const area=(g:T.BufferGeometry)=>{
    const p=g.attributes.position,idx=g.index!;let area=0;
    for(let k=0;k<idx.count;k+=3){
      const a=idx.getX(k),b=idx.getX(k+1),c=idx.getX(k+2);
      const signed=(p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a))-(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a));
      assert.ok(signed<0,'ground winding is up, without degenerates');area-=signed/2;
    }return area;
  };
  assert.ok(Math.abs(area(after)-area(before))<.003,'replacement covers original XZ area exactly once');
  const delta=after.index!.count/3-before.index!.count/3;
  assert.ok(delta<2400,`local triangle delta ${delta}`);
  assert.equal(after.groups.length,0);
  const bytes=(g:T.BufferGeometry)=>Object.values(g.attributes).reduce((sum,a)=>sum+a.array.byteLength,0)+g.index!.array.byteLength;
  const rawBytesDelta=bytes(after)-bytes(before), oldPrepared=prep(before.clone(),'#63874a',M.ground), newPrepared=prep(after.clone(),'#63874a',M.ground);
  assert.ok(newPrepared.attributes.position.count<42000,'preserve static-batching eligibility');
  console.log(JSON.stringify({beforeTriangles:before.index!.count/3,afterTriangles:after.index!.count/3,delta,beforeVertices:before.attributes.position.count,afterVertices:after.attributes.position.count,rawBytesDelta,preparedBytesDelta:bytes(newPrepared)-bytes(oldPrepared),drawDelta:0}));
  oldPrepared.dispose();newPrepared.dispose();
});
