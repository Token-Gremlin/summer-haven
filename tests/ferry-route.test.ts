import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { FERRY_LANDINGS,FERRY_PERIOD,FERRY_DWELL,FERRY_TRIP,ferryRoute,ferrySupportHeight,ferryGroundHeight,ferryOarPose } from '../src/data/ferry.ts';
import { regionRiverSample } from '../src/data/regions.ts';
import { WORLD_BOUNDS } from '../src/data/regions.ts';
import { ferryLandingObstacles, ferryLandingAt } from '../src/data/ferry.ts';
import { Collision } from '../src/world/collision.ts';

test('ferry completes the real river route continuously and dwells at both destinations',()=>{
  for(const clock of [0,FERRY_DWELL-1,FERRY_DWELL+FERRY_TRIP,FERRY_PERIOD-1,FERRY_PERIOD]) {
    const a=ferryRoute(clock),b=ferryRoute(clock+.001);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.005);
  }
  assert.equal(ferryRoute(0).z,-165);
  assert.equal(ferryRoute(FERRY_DWELL+FERRY_TRIP).z,-330);
  for(let t=0;t<FERRY_PERIOD;t+=.2) {
    const p=ferryRoute(t),river=regionRiverSample(p.z);
    assert.ok(Math.abs(p.x-river.x)+3.4<river.halfWidth,'hull/oar radial envelope stays in channel');
    assert.ok(Math.abs(p.y-river.y)<1e-8);
    const q=ferryRoute(t+.01);assert.ok(Math.hypot(q.x-p.x,q.z-p.z)/.01<2.4);
  }
  assert.deepEqual(ferryRoute(67),ferryRoute(67+FERRY_PERIOD*100));
});
test('stairs meet the bank with small real steps and rendering cut under visible planks',()=>{
  for(const d of FERRY_LANDINGS) {
    assert.ok((d.endY-d.deckY)/d.steps<=.16);
    assert.equal(ferrySupportHeight(d.endX,d.stairZ),d.endY);
    assert.equal(ferrySupportHeight(d.x,d.deckZ),d.deckY);
    for(let x=d.endX;x<d.x;x+=.1) {
      const y=ferrySupportHeight(x,d.stairZ)!;assert.ok(y!==null);
      assert.ok(ferryGroundHeight(x,d.stairZ,y+3)<=y-.21);
    }
  }
  assert.equal(ferrySupportHeight(0,0),null);
});
test('articulated oars stow aft and pass through water on the power cycle',()=>{
  for(const side of [1,-1]) {
    let min=Infinity,max=-Infinity;
    for(let t=0;t<2.8;t+=.01) {
      const p=ferryOarPose(t,1,side);
      const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),p.roll));
      const blade=new T.Vector3(-side*1.82,-.39,-.05).applyQuaternion(q);min=Math.min(min,blade.y+.57);max=Math.max(max,blade.y+.57);
    }
    assert.ok(min<0&&max>.4);
    const p=ferryOarPose(0,0,side);assert.equal(p.yaw,-side*Math.PI/2);assert.equal(Math.abs(p.roll),0);
  }
});

test('both landings leave a full adult-width route around the stair-to-gangway corner',()=>{
  for(const d of FERRY_LANDINGS){
    const c=new Collision();c.bounds={...WORLD_BOUNDS};
    c.obstacles=ferryLandingObstacles(d);
    c.water=(x,z)=>!ferryLandingAt(x,z)&&Math.abs(x-regionRiverSample(z).x)<regionRiverSample(z).halfWidth;
    const points=[[d.endX,d.stairZ],[d.x,d.stairZ],[d.x,d.deckZ],[d.x+.6,d.deckZ]];
    for(let j=1;j<points.length;j++){
      const [a,b]=[points[j-1],points[j]],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.1);
      for(let i=0;i<=steps;i++){
        const x=a[0]+(b[0]-a[0])*i/steps,z=a[1]+(b[1]-a[1])*i/steps,y=ferrySupportHeight(x,z)!;
        assert.notEqual(y,null);assert.equal(c.blocked(x,z,.32,y),false,`${d.id} corner at ${x},${z}`);
      }
    }
    // Behind a player at the lowest tread the rail must not form an invisible wall above their head.
    const focus=new T.Vector3(d.x,d.deckY+1.25,d.stairZ);
    assert.ok(c.cameraDistance(focus,new T.Vector3(0,.3,.954).normalize(),5,()=>d.deckY)>4.5);
  }
});
