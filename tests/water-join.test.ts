import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { villageRiverGeometry } from '../src/world/village-water';
import { riverReach } from '../src/world/region-water';
import { regionRiverSample, REGION_WATER_LIFT } from '../src/data/regions';
import { riverX } from '../src/data/world';

test('the actual village and valley water meshes meet at one matching edge, without a hidden duplicate strip', () => {
  const village = new T.Mesh(villageRiverGeometry(), new T.MeshBasicMaterial({side:T.DoubleSide}));
  const valley = riverReach(-132, -164);
  const p=village.geometry.getAttribute('position'), r=valley.geometry.getAttribute('position');
  const join=regionRiverSample(-132);
  assert.equal(p.getZ(0), -132);
  for(let i=0;i<p.count;i++) assert.ok(p.getZ(i)>=-132,'village water must not continue under the valley');
  const villageEdge=Array.from({length:p.count},(_,i)=>i).filter(i=>p.getZ(i)===-132);
  const valleyEdge=Array.from({length:r.count},(_,i)=>i).filter(i=>r.getZ(i)===-132);
  assert.equal(villageEdge.length,valleyEdge.length,'same tessellation at the shared edge');
  assert.ok(villageEdge.length>2,'surface has interior vertices for real waves');
  for(const i of villageEdge) {
    assert.ok(Math.abs(p.getY(i)-join.y-REGION_WATER_LIFT)<1e-6);
    const u=village.geometry.getAttribute('uv').getX(i);
    assert.ok(Math.abs(p.getX(i)-(join.x+(u*2-1)*join.halfWidth))<3e-6);
    const j=valleyEdge[villageEdge.indexOf(i)];
    assert.ok(Math.abs(p.getX(i)-r.getX(j))<4e-6);
    for(let k=0;k<4;k++)assert.ok(Math.abs(village.geometry.getAttribute('aWater').getComponent(i,k)-valley.geometry.getAttribute('aWater').getComponent(j,k))<1e-4,'identical animated seam parameters');
  }
  for(const i of valleyEdge) {
    assert.equal(r.getZ(i),-132);
    assert.ok(Math.abs(r.getY(i)-p.getY(0))<1e-6);
    assert.ok(r.getX(i)>=p.getX(0)-1e-5&&r.getX(i)<=p.getX(villageEdge.at(-1)!)+1e-5);
  }
  const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
  for(let z=-145.13;z<-120;z+=.43) {
    const center=z<-132?regionRiverSample(z).x:riverX(z);
    for(const offset of [-3.1,-.73,2.19]) {
      ray.ray.origin.set(center+offset,10,z);
      const hits=ray.intersectObjects([village,valley],false);
      assert.equal(hits.length,1,`exactly one rendered surface at ${center+offset},${z}`);
    }
  }
  village.geometry.dispose();village.material.dispose();valley.geometry.dispose();valley.material.dispose();
});

test('the short join blends smoothly while retaining the existing bridge, paddies and village river level', () => {
  const g=villageRiverGeometry(),p=g.getAttribute('position');
  const coarse=villageRiverGeometry(true,false),c=coarse.getAttribute('position');
  const stride=Array.from({length:p.count},(_,i)=>i).find(i=>p.getZ(i)!==p.getZ(0))!;
  for(let i=stride;i<p.count;i+=stride) {
    const slope=Math.abs((p.getY(i)-p.getY(i-stride))/(p.getZ(i)-p.getZ(i-stride)));
    assert.ok(slope<.016,'no visible height step at the join');
    let row=0;while(row+4<c.count&&c.getZ(row+2)<p.getZ(i))row+=2;
    const t=(p.getZ(i)-c.getZ(row))/(c.getZ(row+2)-c.getZ(row));
    const expectedY=T.MathUtils.lerp(c.getY(row),c.getY(row+2),t);
    assert.ok(Math.abs(p.getY(i)-expectedY)<1e-6,'new vertices retain the actual former polygonal water level');
    for(const side of [0,1]){
      const expectedX=T.MathUtils.lerp(c.getX(row+side),c.getX(row+2+side),t);
      assert.ok(Math.abs(p.getX(i+side*(stride-1))-expectedX)<5e-6,'dense waves do not change the bank footprint');
    }
  }
  const isolated=villageRiverGeometry(false);
  assert.equal(isolated.getAttribute('position').getZ(0),-210,'isolated village still has its background river');
  g.dispose();isolated.dispose();coarse.dispose();
});
