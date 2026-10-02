import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { fallingWaterAt,FALL_SECONDS,FALL_GRAVITY,FALL_FORWARD_SPEED,WATER_PARTICLES } from '../src/render/water-motion';
import { regionRiverSample } from '../src/data/regions';
import { prepareWaterSurface,subdivideWater,waterFootprint,waterSurfaceAt } from '../src/world/water-surface';
import { riverReach,waterfallPool } from '../src/world/region-water';
import { PathSurfaces } from '../src/world/path-surface';
import { WaterSpray } from '../src/world/water-spray';
import { DEFAULT_SETTINGS } from '../src/core/save';

test('ballistic droplets follow gravity and meet the actual authored lip and impact, without an independent fall path',()=>{
  for(let i=0;i<=100;i++){
    const age=FALL_SECONDS*i/100,p=fallingWaterAt(age);
    assert.ok(Math.abs(p.y-regionRiverSample(p.z).y-.08)<1e-10);
    assert.ok(Math.abs(p.verticalSpeed+FALL_GRAVITY*age)<1e-10);
  }
  assert.equal(fallingWaterAt(-1).z,-730);
  assert.equal(fallingWaterAt(99).z,-708);
  assert.equal(waterSurfaceAt(366,54.08,-730)[2],FALL_FORWARD_SPEED,'upstream current reaches the horizontal launch velocity');
});

test('clipped receiving water retains one footprint and bounded subdivided triangles and buffers',()=>{
  const clip=new PathSurfaces(),reach=riverReach(-676,-708);
  const footprint=waterFootprint(reach.geometry);
  assert.ok(footprint.getAttribute('position').count<reach.geometry.getAttribute('position').count/4,'clipping uses the exact boundary without dense interior vertices');
  clip.add(footprint).dispose();const pool=waterfallPool();
  pool.geometry=prepareWaterSurface(subdivideWater(clip.add(pool.geometry)));
  const p=pool.geometry.getAttribute('position'),a=pool.geometry.getAttribute('aWater');
  assert.ok(p.count<100000,'bounded pool memory/triangle count');
  for(let i=0;i<p.count;i++)for(let k=0;k<4;k++)assert.ok(Number.isFinite(a.getComponent(i,k)));
  const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
  for(let x=350.3;x<390;x+=1.37)for(let z=-706.7;z<-681;z+=1.19){
    if(Math.hypot((x-370)/22,(z+698)/18)>.96)continue;
    ray.ray.origin.set(x,25,z);
    const hits=ray.intersectObjects([pool,reach],false);
    assert.equal(new Set(hits.map(h=>h.object.uuid)).size,1,'no new missing/overlapping pool surface');
  }
  for(const m of [pool,reach]){m.geometry.dispose();(m.material as T.Material).dispose();}
});

test('quality changes select bounded GPU ranges without reallocating seeds or updating per-drop CPU buffers',()=>{
  const spray=new WaterSpray(),position=new T.Vector3(350,18,-690);
  const seeds=spray.drops.geometry.getAttribute('position'),array=seeds.array,version=(seeds as T.BufferAttribute).version;
  assert.equal(seeds.count,131072);assert.ok(seeds.array.byteLength<=1572864);
  for(const quality of ['low','medium','high','ultra'] as const){
    spray.update(position,{...DEFAULT_SETTINGS,quality},90);
    assert.equal(spray.drops.geometry.drawRange.count,WATER_PARTICLES[quality]);
    assert.equal(seeds.array,array);assert.equal((seeds as T.BufferAttribute).version,version);
    assert.equal(spray.group.visible,true);
  }
  spray.update(new T.Vector3(0,0,0),DEFAULT_SETTINGS,1600);assert.equal(spray.group.visible,false);
  spray.drops.geometry.dispose();spray.drops.material.dispose();spray.mist.geometry.dispose();(spray.mist.material as T.Material).dispose();
});
