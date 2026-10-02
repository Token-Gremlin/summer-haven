import * as T from 'three';
import { Assets } from '../game/assets';
import { terrainHeight } from '../data/world';
import { Collision, type Obstacle } from './collision';
import type { Interaction } from './village';

const REST = new T.Vector3(542,92+.01550956,-978);
const FLIGHT = new T.CatmullRomCurve3([
  REST.clone(),new T.Vector3(519,123,-949),new T.Vector3(421,130,-840),
  new T.Vector3(369,106,-725),new T.Vector3(318,94,-593),
  new T.Vector3(442,127,-685),new T.Vector3(610,158,-845),
  new T.Vector3(637,150,-1034),new T.Vector3(585,126,-1032),REST.clone(),
],false,'centripetal');
export type DragonPhase = 'rest'|'alert'|'takeoff'|'flight'|'glide'|'landing';
/** One resident creature has one continuous world clock, irrespective of render distance. */
export class Reedwing {
  readonly group:T.Group;
  readonly mixer:T.AnimationMixer;
  readonly actions = new Map<string,T.AnimationAction>();
  readonly interaction:Interaction = { id:'reedwing',kind:'inspect',label:'Watch the reedwing',x:537,z:-965,radius:8,data:'Aurelian lowers its reed-gold crown. Its amber eye follows the river below, then returns to you. The old guardians have never needed words to recognize a familiar face.' };
  phase:DragonPhase = 'rest';
  private clip='';
  private alert=0;
  private body:Obstacle;
  private previousYaw=-1.15;
  constructor(assets:Assets,collision:Collision) {
    const model=assets.dragon();this.group=model.root;this.group.name='Aurelian · guardian of Silverveil';
    this.group.position.copy(REST);this.group.rotation.y=-1.15;
    this.mixer=new T.AnimationMixer(this.group);
    model.clips.forEach(c=>this.actions.set(c.name,this.mixer.clipAction(c)));
    this.body=collision.add({x:REST.x,z:REST.z,r:2.6,bottom:REST.y,height:6.5,tag:'reedwing-body'});
    this.play('idle');
  }
  private play(name:string) {
    if(this.clip===name)return;
    const next=this.actions.get(name);if(!next)return;
    const previous=this.actions.get(this.clip);
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
    next.setLoop(name==='takeoff'||name==='landing'?T.LoopOnce:T.LoopRepeat,Infinity);
    next.clampWhenFinished=true;next.fadeIn(.55).play();previous?.fadeOut(.55);this.clip=name;
  }
  update(dt:number,clock:number,player:T.Vector3,speed:number,range:number) {
    const cycle=clock%210,near=this.group.position.distanceTo(player);
    this.alert=Math.max(0,this.alert-dt);
    if(cycle<42&&near<18&&speed>2.7)this.alert=4;
    let phase:DragonPhase;
    if(cycle<42) {
      this.group.position.copy(REST);
      phase=this.alert>0||near<12?'alert':'rest';
      const facing=phase==='alert'?Math.atan2(player.x-REST.x,player.z-REST.z):-1.15;
      const difference=Math.atan2(Math.sin(facing-this.previousYaw),Math.cos(facing-this.previousYaw));
      this.previousYaw+=difference*(1-Math.exp(-.55*dt));
      this.group.rotation.set(0,this.previousYaw,0);
    } else {
      const t=(cycle-42)/168;
      FLIGHT.getPoint(t,this.group.position);
      const tangent=FLIGHT.getTangent(Math.max(.001,Math.min(.999,t)));
      const yaw=Math.atan2(tangent.x,tangent.z);
      this.previousYaw=yaw;
      const bank=Math.sin(t*Math.PI*2)*.18*Math.sin(t*Math.PI);
      this.group.rotation.set(-Math.atan2(tangent.y,Math.hypot(tangent.x,tangent.z))*.4,yaw,bank);
      phase=t<.022?'takeoff':t>.978?'landing':t% .19<.085?'flight':'glide';
      // The terrain is static; retain a collision-clear flight floor except at the landing shelf.
      const clearance=Math.min(1,t*28,(1-t)*28);
      this.group.position.y=Math.max(this.group.position.y,terrainHeight(this.group.position.x,this.group.position.z)+clearance*15+.01550956);
    }
    this.phase=phase;this.play(phase==='rest'?'idle':phase);
    this.mixer.update(dt);
    this.group.visible=near<Math.max(350,range);
    this.body.x=this.group.position.x;this.body.z=this.group.position.z;this.body.bottom=this.group.position.y;
    this.interaction.radius=phase==='rest'||phase==='alert'?8:0;
  }
}
