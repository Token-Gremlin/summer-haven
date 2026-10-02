import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Character } from '../src/character/character.ts';
import { ferryOarPose, ferryFloorHeight } from '../src/data/ferry.ts';

test('boarding foot support meets the exported raised footboards and centre aisle',async()=>{
  const bytes=await readFile(new URL('../public/assets/fantasy/reed-ferry.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const boat=gltf.scene.getObjectByName('FERRY_Reed')!;boat.updateWorldMatrix(true,true);
  const ray=new T.Raycaster();
  for(const x of [-.67,-.56,-.45,0,.45,.56,.67])for(const z of [.96,1.07,1.18]) {
    ray.set(new T.Vector3(x,.56,z),new T.Vector3(0,-1,0));
    const hit=ray.intersectObject(boat,true)[0];
    assert.ok(hit,`no visible floor under ${x},${z}`);
    // The aisle crosses thin 1.65cm ribs; raised footboards require the tighter contact bound.
    const tolerance=x===0?.02:.008;
    assert.ok(Math.abs(hit.point.y-ferryFloorHeight(x,z))<tolerance,`foot support differs from the authored deck at ${x},${z}: ${hit.point.y}`);
  }
});

test('actual masculine rower rig reaches the moving oar wrists through a full cycle',async()=>{
  const bytes=await readFile(new URL('../public/assets/characters/masculine.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const group=new T.Group();group.add(gltf.scene);group.rotation.y=Math.PI;
  const bones=new Map<string,T.Bone>();gltf.scene.traverse(o=>{if(o instanceof T.Bone)bones.set(o.name,o);});
  const actor=Object.create(Character.prototype) as Character;Object.assign(actor,{group,bones});
  const mixer=new T.AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations.find(c=>c.name==='sit')!).play();
  const spineRest=bones.get('spine')!.quaternion.clone();
  let worst=0;
  for(let t=0;t<2.8;t+=.04) {
    bones.get('spine')!.quaternion.copy(spineRest);
    mixer.setTime(t);group.position.set(0,.608,-1.02);group.updateWorldMatrix(true,true);
    const hip=group.worldToLocal(bones.get('hips')!.getWorldPosition(new T.Vector3()));
    group.position.add(new T.Vector3(-hip.x,.07-hip.y,-hip.z).applyAxisAngle(new T.Vector3(0,1,0),Math.PI));
    const targets=[1,-1].map(side=>{
      const p=ferryOarPose(t,1,side),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),p.roll));
      return new T.Vector3(side*.58,.105,0).applyQuaternion(q).add(new T.Vector3(-side*.85,.645,-1.1));
    });
    actor.contactHands(targets[0],targets[1],1,.8);
    for(const [side,target] of [['L',targets[0]],['R',targets[1]]] as const)worst=Math.max(worst,bones.get('hand_'+side)!.getWorldPosition(new T.Vector3()).distanceTo(target));
  }
  assert.ok(worst<.035,`maximum wrist gap ${worst.toFixed(4)}m`);
});

test('both exported seated rigs place the actual shoe soles on the ferry floor',async()=>{
  for(const body of ['masculine','feminine']) {
    const bytes=await readFile(new URL(`../public/assets/characters/${body}.glb`,import.meta.url));
    const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    const group=new T.Group();group.add(gltf.scene);group.position.set(0,.638+.07-.88,.82);
    const bones=new Map<string,T.Bone>();gltf.scene.traverse(o=>{if(o instanceof T.Bone)bones.set(o.name,o);});
    const actor=Object.create(Character.prototype) as Character;Object.assign(actor,{group,bones});
    const mixer=new T.AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations.find(c=>c.name==='sit')!).play();mixer.update(.1);
    const soles:T.SkinnedMesh[]=[];gltf.scene.traverse(o=>{if(o instanceof T.SkinnedMesh&&o.name.startsWith('SHOE_0_sole'))soles.push(o);});
    assert.equal(soles.length,2);
    for(const [floor,z] of [[.2,1.17],[.43,1.07]]) {
      actor.contactFeet(new T.Vector3(.11,floor,z),new T.Vector3(-.11,floor,z));
      group.updateMatrixWorld(true);
      for(const sole of soles) {
      sole.skeleton.update();let min=Infinity;const v=new T.Vector3();
      for(let i=0;i<sole.geometry.attributes.position.count;i++) {
        v.fromBufferAttribute(sole.geometry.attributes.position,i);sole.applyBoneTransform(i,v);sole.localToWorld(v);min=Math.min(min,v.y);
      }
      assert.ok(Math.abs(min-floor)<.008,`${body} ${sole.name} sole ${min}, support ${floor}`);
      }
    }
  }
});
