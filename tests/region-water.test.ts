import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { regionRiverSample, regionSurfaceWater } from '../src/data/regions';
import { terrainHeight } from '../src/data/world';
import { riverReach, waterfallPool } from '../src/world/region-water';
import { PathSurfaces } from '../src/world/path-surface';
import { waterFootprint } from '../src/world/water-surface';
import { freshSave, validateSave } from '../src/core/save';

test('falling current leaves a level lip, accelerates downward and shares exact river seams', () => {
  assert.equal(regionRiverSample(-730).y, 54);
  assert.equal(regionRiverSample(-708).y, 18);
  assert.ok(54-regionRiverSample(-729.99).y < .0001, 'no angled ramp immediately at the lip');
  let previousDrop=0;
  for(let z=-730;z<-708;z+=.5){
    const drop=regionRiverSample(z).y-regionRiverSample(z+.5).y;
    assert.ok(drop>previousDrop);previousDrop=drop;
    assert.equal(regionRiverSample(z).halfWidth,10);
  }
  const fall=riverReach(-708,-730,true);
  const p=fall.geometry.attributes.position;
  for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i)+708)<1e-5||Math.abs(p.getZ(i)+730)<1e-5)
    assert.ok(Math.abs(p.getY(i)-regionRiverSample(p.getZ(i)).y-.08)<1e-4,'no gap or corrugated seam');
  fall.geometry.dispose();fall.material.dispose();
});

test('receiving pool covers the carved basin without a second coplanar river surface', () => {
  const surfaces=new PathSurfaces(),meshes:T.Mesh[]=[];
  for(const [a,b,fall] of [[-676,-708,false],[-708,-730,true]] as const){
    const mesh=riverReach(a,b,fall);surfaces.add(waterFootprint(mesh.geometry)).dispose();meshes.push(mesh);
  }
  const pool=waterfallPool();pool.geometry=surfaces.add(pool.geometry);meshes.push(pool);
  const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
  let samples=0;
  for(let x=349.31;x<391;x+=1.23)for(let z=-715.17;z<-681;z+=1.17){
    if(Math.hypot((x-370)/22,(z+698)/18)>.98)continue;
    ray.ray.origin.set(x,100,z);
    const hits=ray.intersectObjects(meshes,false);
    assert.ok(hits.length>0,`missing basin water at ${x},${z}`);
    assert.equal(new Set(hits.map(h=>h.object.uuid)).size,1,'one surface owns a water footprint');
    const surface=regionSurfaceWater(x,z);
    assert.notEqual(surface,null);
    if(surface===18.08)assert.ok(terrainHeight(x,z)<18);
    samples++;
  }
  assert.ok(samples>500);
  assert.equal(regionSurfaceWater(349,-698),18.08,'wide basin has collision beyond the narrow current');
  assert.equal(regionSurfaceWater(344,-698),null,'dry bank remains outside the pool');
  for(const mesh of meshes){mesh.geometry.dispose();(mesh.material as T.Material).dispose();}
});

test('legacy and malformed saves initialize bounded habitat state without losing appearance', () => {
  const old=freshSave();old.appearance.hair=6;
  const legacy=JSON.parse(JSON.stringify(old));delete legacy.world.habitatLife;
  const restored=validateSave(legacy);
  assert.deepEqual(restored.appearance,old.appearance);
  assert.deepEqual(restored.world.habitatLife,{version:1,elapsed:0,animals:[]});
  legacy.world.habitatLife={version:1,elapsed:Infinity,animals:Array(500).fill({id:'invalid'})};
  assert.deepEqual(validateSave(legacy).world.habitatLife,restored.world.habitatLife);
});
