import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import { BANK_TRAIL, BANK_TRAIL_WIDTH } from '../src/data/bank-trail';
import { bankTrailGeometry } from '../src/world/bank-trail';
import { canopyObstacle,leafBounds } from '../src/world/tree-canopy';
import { tree } from '../src/world/props';
import { M } from '../src/world/geo';
import { Collision } from '../src/world/collision';
import { Regions } from '../src/world/regions';
import { terrainHeight } from '../src/data/world';
import { regionAt,regionSurfaceWater,regionRiverSample,regionRouteSample,WORLD_BOUNDS } from '../src/data/regions';

function fixture() {
  const collision=new Collision();collision.bounds={...WORLD_BOUNDS};
  collision.water=(x,z)=>{
    const river=regionRiverSample(z),route=regionRouteSample(x,z);
    return regionSurfaceWater(x,z)!==null||Math.abs(x-river.x)<river.halfWidth+.32||
      route.distance>route.width/2+.7&&Math.hypot(terrainHeight(x+.4,z)-terrainHeight(x-.4,z),terrainHeight(x,z+.4)-terrainHeight(x,z-.4))>.66;
  };
  const regions=new Regions({} as any,{collision} as any);
  for(let x=320;x<=384;x+=32)for(let z=-708;z>=-868;z-=32)(regions as any).makeCell(x,z,regionAt(x+16,z-16)?.id??'north-road');
  const manifest=JSON.parse(fs.readFileSync(new URL('../public/assets/fantasy/silverveil-gorge.json',import.meta.url),'utf8'));
  for(const p of manifest.collision_proxies){const {min,max}=p.bounds_world;collision.add({x:(min[0]+max[0])/2,z:(min[2]+max[2])/2,w:max[0]-min[0],d:max[2]-min[2],bottom:min[1],height:max[1]-min[1],tag:p.name});}
  return {collision,regions};
}

test('actual generated trees and current gorge permit the whole optional walking strip',()=>{
  const {collision,regions}=fixture();let samples=0;
  for(let i=1;i<BANK_TRAIL.length;i++){
    const a=BANK_TRAIL[i-1],b=BANK_TRAIL[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    for(let d=0;d<=length;d+=.15)for(const side of [-BANK_TRAIL_WIDTH/2,0,BANK_TRAIL_WIDTH/2]){
      const x=a[0]+dx*d/length-dz*side/length,z=a[1]+dz*d/length+dx*side/length;
      assert.equal(collision.blocked(x,z,.45,terrainHeight(x,z)),false,`blocked ${x},${z}`);samples++;
    }
  }
  assert.ok(samples>2500);assert.ok(regions.treeCount>15,'surrounding grove retained');
  assert.equal(collision.blocked(366.746947,-839.26232,.45,56.98455),false,'reported trunk stall removed');
});
test('trail render mesh follows actual sampled dry ground including mitered corners',()=>{
  const {collision}=fixture(),g=bankTrailGeometry(),p=g.getAttribute('position');
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    assert.ok(Math.abs(y-terrainHeight(x,z)-.038)<.001,`ground contact ${i}`);
    assert.equal(collision.blocked(x,z,.45,terrainHeight(x,z)),false,`mesh promises blocked ground ${x},${z}`);
  }
  assert.ok(p.count<3000);g.dispose();
});
test('each generated leaf variant fits transformed camera-only bounds with wind margin',()=>{
  for(const kind of ['round','tall','cedar'] as const)for(let v=0;v<2;v++){
    const g=tree(kind,184+['round','tall','cedar'].indexOf(kind)*2+v,1),bounds=leafBounds(g);
    const matrix=new T.Matrix4().compose(new T.Vector3(4,7,-9),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),1.1),new T.Vector3(1.4,1.6,1.25));
    const proxy=canopyObstacle(bounds,matrix),p=g.getAttribute('position'),mat=g.getAttribute('aMat');
    assert.equal(proxy.cameraOnly,true);
    for(let i=0;i<p.count;i++)if([M.foliage,M.leafCard,M.fringeCard].includes(mat.getX(i) as any)){
      const point=new T.Vector3(p.getX(i),p.getY(i),p.getZ(i)).applyMatrix4(matrix);
      assert.ok(point.x>=proxy.x-proxy.w!/2&&point.x<=proxy.x+proxy.w!/2);
      assert.ok(point.z>=proxy.z-proxy.d!/2&&point.z<=proxy.z+proxy.d!/2);
      assert.ok(point.y>=proxy.bottom!&&point.y<=proxy.bottom!+proxy.height);
    }
    const collision=new Collision();collision.add(proxy);
    assert.equal(collision.blocked(proxy.x,proxy.z,.45,proxy.bottom!),false,'canopy never blocks player');
    const start={x:proxy.x-proxy.w!/2-2,y:proxy.bottom!+proxy.height/2,z:proxy.z};
    assert.ok(collision.cameraDistance(start,{x:1,y:0,z:0},proxy.w!+4,()=>-100)<2,'camera stops before leaf box');
    assert.equal(collision.cameraDistance({...start,y:proxy.bottom!-.5},{x:1,y:0,z:0},proxy.w!+4,()=>-100),proxy.w!+4,'camera can pass below crown');g.dispose();
  }
});
