import * as T from 'three';
import { siltfinRoutine, restoreSiltfin, SILTFIN_BANK, SILTFIN_WATERLINE, type SiltfinPhase, type SiltfinSnapshot } from '../data/siltfin';
import { terrainHeight } from '../data/world';
import type { Interaction } from './village';

export interface SiltfinOptions { root:T.Group; clips:readonly T.AnimationClip[]; waterline?:number; snapshot?:Partial<SiltfinSnapshot> }
/** One resident surface swimmer; visibility never owns its logical clock. */
export class Siltfin {
  readonly group=new T.Group();
  readonly mixer:T.AnimationMixer;
  readonly actions=new Map<string,T.AnimationAction>();
  readonly interaction:Interaction={id:'vesper-siltfin',kind:'inspect',label:'Watch Vesper from the bank',...SILTFIN_BANK,data:'Vesper rests against the current. Copper whiskers test the water while pale fins fold beneath the surface. The old river guardian notices your stillness.'};
  phase:SiltfinPhase='rest';
  private state:SiltfinSnapshot;
  private active='';
  private clipStartedAt=0;
  private previousClock:number|null=null;
  private clock=0;
  private readonly waterline:number;
  constructor(options:SiltfinOptions) {
    this.waterline=options.waterline??SILTFIN_WATERLINE;
    if(!Number.isFinite(this.waterline)||this.waterline<.9||this.waterline>1.12)throw new Error('Vesper waterline needs renewed terrain clearance validation.');
    this.state=restoreSiltfin(options.snapshot);
    this.group.name='Vesper · guardian of the upper current';this.group.add(options.root);
    this.mixer=new T.AnimationMixer(options.root);
    for(const clip of options.clips)this.actions.set(clip.name,this.mixer.clipAction(clip));
    for(const name of ['idle','swim','alert'])if(!this.actions.has(name))throw new Error(`Vesper is missing the ${name} clip.`);
    this.place(0);this.play('idle',0,true);
  }
  private place(clock:number) {
    const pose=siltfinRoutine(clock,this.waterline);
    this.group.position.set(pose.x,pose.y,pose.z);this.group.rotation.set(0,pose.yaw,0);return pose;
  }
  private play(name:string,clock:number,resync=false) {
    if(name===this.active&&!resync)return;
    const next=this.actions.get(name)!;
    if(name!==this.active||clock<this.clipStartedAt)this.clipStartedAt=clock;
    if(resync)this.mixer.stopAllAction();
    else this.actions.get(this.active)?.fadeOut(.7);
    const once=name==='alert';
    next.reset().setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity).setEffectiveTimeScale(1).setEffectiveWeight(1);
    next.clampWhenFinished=once;
    next.time=once?Math.min(next.getClip().duration,Math.max(0,clock-this.clipStartedAt)):clock%next.getClip().duration;
    next.play();if(!resync)next.fadeIn(.7);this.active=name;
  }
  update(dt:number,elapsedSeconds:number,player:T.Vector3,speed:number,range:number) {
    const pose=this.place(elapsedSeconds);this.clock=pose.clock;
    const jump=this.previousClock===null||Math.abs(this.clock-this.previousClock-Math.max(0,dt))>.5;
    const distance=this.group.position.distanceTo(player);
    if(pose.phase==='rest'&&distance<15&&speed>2.7)this.state.alertUntil=Math.max(this.state.alertUntil,this.clock+4);
    this.phase=pose.phase==='rest'&&(this.state.alertUntil>this.clock||distance<11)?'alert':pose.phase;
    this.play(this.phase==='rest'?'idle':this.phase,this.clock,jump);
    this.mixer.update(jump?0:Math.max(0,Math.min(.2,dt)));
    this.group.visible=distance<Math.max(65,range);
    this.interaction.radius=pose.phase==='rest'?SILTFIN_BANK.radius:0;
    this.previousClock=this.clock;
  }
  /** Call only for the inspect action; distant/programmatic calls cannot award encounters. */
  interact(player:T.Vector3):string|null {
    const bank=SILTFIN_BANK;
    if(this.interaction.radius===0||Math.hypot(player.x-bank.x,player.z-bank.z)>bank.radius||Math.abs(player.y-terrainHeight(bank.x,bank.z))>2)return null;
    this.state.alertUntil=Math.max(this.state.alertUntil,this.clock+6);
    if(this.clock-this.state.lastEncounter<12)return 'Vesper watches quietly, copper whiskers moving with the current.';
    this.state.lastEncounter=this.clock;this.state.encounters=Math.min(1e6,this.state.encounters+1);
    return this.state.encounters===1?this.interaction.data as string:'Vesper lifts its pearl brow. The river guardian remembers your patient visits.';
  }
  snapshot():SiltfinSnapshot { return {...this.state}; }
  /** Clear-save hook; next update supplies the reset world's elapsed clock. */
  reset() {
    this.state=restoreSiltfin();this.previousClock=null;this.clock=0;this.clipStartedAt=0;
    this.active='';this.phase='rest';this.mixer.stopAllAction();this.interaction.radius=0;
  }
  dispose() {this.mixer.stopAllAction();for(const child of this.group.children)this.mixer.uncacheRoot(child);this.group.removeFromParent();}
}
