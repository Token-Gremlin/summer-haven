import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import { siltfinRoutine,restoreSiltfin,SILTFIN_ENVELOPE,SILTFIN_BANK } from '../src/data/siltfin';
import { terrainHeight } from '../src/data/world';
import { regionSurfaceWater } from '../src/data/regions';
import { Siltfin } from '../src/world/siltfin';
const manifest=JSON.parse(fs.readFileSync(new URL('../public/assets/creatures/vesper-siltfin.json',import.meta.url),'utf8'));
const gorge=JSON.parse(fs.readFileSync(new URL('../public/assets/fantasy/silverveil-gorge.json',import.meta.url),'utf8'));

test('full authored posed bounds fit the validated conservative envelope',()=>{
  for(const pose of Object.values(manifest.deformation) as any[])for(let axis=0;axis<3;axis++){
    assert.ok(pose.union_bounds_three.min[axis]>=SILTFIN_ENVELOPE.min[axis]);
    assert.ok(pose.union_bounds_three.max[axis]<=SILTFIN_ENVELOPE.max[axis]);
  }
});
test('whole turning envelope stays wet, above ground and outside gorge proxies over a cycle',()=>{
  let clearance=Infinity;
  for(let time=0;time<=120;time+=.25){
    const p=siltfinRoutine(time),s=Math.sin(p.yaw),c=Math.cos(p.yaw);
    for(let a=-1.3;a<=1.3001;a+=.26)for(let b=-5.6;b<=3.7001;b+=.3){
      const x=p.x+a*c+b*s,z=p.z-a*s+b*c;
      assert.notEqual(regionSurfaceWater(x,z),null,`dry ${time}`);
      clearance=Math.min(clearance,p.y-.03-terrainHeight(x,z,false));
      for(const box of gorge.collision_proxies){const {min,max}=box.bounds_world;assert.ok(!(x>=min[0]&&x<=max[0]&&z>=min[2]&&z<=max[2]&&p.y+2.5>=min[1]&&p.y-.03<=max[1]),box.name);}
    }
  }
  assert.ok(clearance>.25,`minimum clearance ${clearance}`);
});
test('rest, patrol and cycle seams are continuous; elapsed clock reproduces offscreen state',()=>{
  for(const seam of [30,120,240]){const a=siltfinRoutine(seam-.001),b=siltfinRoutine(seam+.001);assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001);assert.ok(Math.abs(Math.sin(a.yaw-b.yaw))<.001);}
  assert.deepEqual(siltfinRoutine(1000),siltfinRoutine(1000));
});
test('bank target is dry, level and outside authored gorge collision',()=>{
  const {x,z}=SILTFIN_BANK;assert.equal(regionSurfaceWater(x,z),null);
  assert.ok(Math.hypot(terrainHeight(x+.4,z)-terrainHeight(x-.4,z),terrainHeight(x,z+.4)-terrainHeight(x,z-.4))<.66);
  for(const box of gorge.collision_proxies){const {min,max}=box.bounds_world;assert.ok(x<min[0]-.4||x>max[0]+.4||z<min[2]-.4||z>max[2]+.4);}
});
test('explicit encounters persist, respect cooldown, reject distant or swimming interactions',()=>{
  const create=(snapshot?:any)=>new Siltfin({root:new T.Group(),clips:['idle','swim','alert'].map(n=>new T.AnimationClip(n,4,[])),snapshot});
  const dragon=create(),bank=new T.Vector3(SILTFIN_BANK.x,terrainHeight(SILTFIN_BANK.x,SILTFIN_BANK.z),SILTFIN_BANK.z);
  dragon.update(.016,10,bank,0,100);assert.ok(dragon.interact(bank));assert.ok(dragon.interact(bank));assert.equal(dragon.snapshot().encounters,1);
  const restored=create(JSON.parse(JSON.stringify(dragon.snapshot())));restored.update(.016,11,bank,0,100);restored.interact(bank);assert.equal(restored.snapshot().encounters,1);
  restored.update(.016,23,bank,0,100);restored.interact(bank);assert.equal(restored.snapshot().encounters,2);
  restored.update(.016,40,bank,0,100);assert.equal(restored.interact(bank),null);
  assert.equal(dragon.interact(new T.Vector3()),null);
  dragon.update(.016,1000,new T.Vector3(),0,1);restored.update(.016,1000,bank,0,1000);assert.deepEqual(dragon.group.position.toArray(),restored.group.position.toArray());
  assert.deepEqual(restoreSiltfin({encounters:NaN,alertUntil:Infinity}),restoreSiltfin());
});

test('a dry terrain route joins temple court to the bank without authored gorge proxies',()=>{
  // This is a terrain/proxy reachability test, not proof against generated trees or visual mesh.
  const pass=(x:number,z:number)=>{
    if(regionSurfaceWater(x,z)!==null)return false;
    if(gorge.collision_proxies.some((box:any)=>{const {min,max}=box.bounds_world;return x>min[0]-.4&&x<max[0]+.4&&z>min[2]-.4&&z<max[2]+.4;}))return false;
    return Math.hypot(terrainHeight(x+.4,z)-terrainHeight(x-.4,z),terrainHeight(x,z+.4)-terrainHeight(x,z-.4))<=.66;
  };
  const queue=[[340,-846]],visited=new Set(['340,-846']);let found=false;
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];if(x===SILTFIN_BANK.x&&z===SILTFIN_BANK.z){found=true;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const a=x+dx,b=z+dz,key=`${a},${b}`;
      if(a<325||a>405||b< -858||b> -740||visited.has(key)||!pass(a,b))continue;
      visited.add(key);queue.push([a,b]);
    }
  }
  assert.ok(found,'no dry slope-safe terrain/proxy route from temple court');
});

test('save restoration rejects unsupported versions and values outside finite bounds',()=>{
  const empty=restoreSiltfin();
  assert.deepEqual(restoreSiltfin({version:2,encounters:42,lastEncounter:10,alertUntil:20} as any),empty);
  assert.deepEqual(restoreSiltfin({encounters:42} as any),empty);
  assert.deepEqual(restoreSiltfin({version:1,encounters:1e99,lastEncounter:1e99,alertUntil:1e99}),empty);
  assert.deepEqual(restoreSiltfin({version:1,encounters:-4,lastEncounter:-1e99,alertUntil:Infinity}),empty);
  assert.deepEqual(restoreSiltfin({version:1,encounters:1e6,lastEncounter:1e10,alertUntil:1e10}),{version:1,encounters:1e6,lastEncounter:1e10,alertUntil:1e10});
});
test('alert begins at local zero and clamps once while idle and swim repeat',()=>{
  const dragon=new Siltfin({root:new T.Group(),clips:['idle','swim','alert'].map(n=>new T.AnimationClip(n,3,[]))});
  const bank=new T.Vector3(SILTFIN_BANK.x,terrainHeight(SILTFIN_BANK.x,SILTFIN_BANK.z),SILTFIN_BANK.z);
  dragon.update(.1,7,bank,0,100);
  const alert=dragon.actions.get('alert')!;
  assert.equal(alert.loop,T.LoopOnce);assert.equal(alert.clampWhenFinished,true);assert.equal(alert.time,0);
  for(let step=1;step<=50;step++)dragon.update(.1,7+step*.1,bank,0,100);
  assert.equal(alert.time,3);assert.equal(alert.paused,true);
  dragon.update(.1,20,bank,0,100);assert.equal(alert.time,3);
  dragon.update(.1,40,bank,0,100);assert.equal(dragon.actions.get('swim')!.loop,T.LoopRepeat);
  dragon.update(.1,120,new T.Vector3(),0,100);assert.equal(dragon.actions.get('idle')!.loop,T.LoopRepeat);
  dragon.update(.1,127,bank,0,100);assert.equal(alert.time,0);
});

test('reset clears visits and cooldown and resynchronizes from the new world clock',()=>{
  const dragon=new Siltfin({root:new T.Group(),clips:['idle','swim','alert'].map(n=>new T.AnimationClip(n,3,[]))});
  const bank=new T.Vector3(SILTFIN_BANK.x,terrainHeight(SILTFIN_BANK.x,SILTFIN_BANK.z),SILTFIN_BANK.z);
  dragon.update(.1,10,bank,0,100);dragon.interact(bank);assert.equal(dragon.snapshot().encounters,1);
  dragon.reset();assert.deepEqual(dragon.snapshot(),restoreSiltfin());assert.equal(dragon.interact(bank),null);
  dragon.update(.1,0,bank,0,100);assert.equal(dragon.actions.get('alert')!.time,0);assert.ok(dragon.interact(bank));assert.equal(dragon.snapshot().encounters,1);
  assert.equal(dragon.group.position.z,siltfinRoutine(0).z);
});
