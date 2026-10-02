import * as T from 'three';
import { Assets } from '../game/assets';
import { Character } from '../character/character';
import { DEFAULT_APPEARANCE } from '../data/appearance';
import { FERRY_LANDINGS, ferryRoute, ferryOarPose, ferryLandingObstacles, ferryFloorHeight } from '../data/ferry';
import type { Player } from '../player/player';
import { Collision } from './collision';
import type { Interaction } from './village';
import { box, beam, xf, merge, M, ID } from './geo';
import { uber, surfaceBits } from '../render/materials';
import { paintedSign } from './signage';

const Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1);
const PASSENGER_SEAT=new T.Vector3(-.56,.638,.82);
const TRANSFER_WALK=3.15,TRANSFER_SIT=.75,TRANSFER_TIME=TRANSFER_WALK+TRANSFER_SIT;
const ease=(t:number)=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export class Ferry {
  readonly group=new T.Group();
  readonly boat:T.Object3D;
  readonly interactions:Interaction[]=[];
  readonly rower:Character;
  riding=false;
  private route=ferryRoute(0);
  private oars:T.Object3D[];
  private transfer:{time:number;exit:boolean;start:T.Vector3;path:T.Vector3[];lengths:number[];length:number}|null=null;
  private hidden=false;
  /** Recovery and a new save release passenger control before moving the player. */
  release() { this.riding=false;this.transfer=null; }
  constructor(assets:Assets,scene:T.Scene,private collision:Collision) {
    this.group.name='Reed ferry and river landings';scene.add(this.group);
    this.boat=assets.ferry('FERRY_Reed');this.group.add(this.boat);
    this.oars=['oar_left','oar_right'].map(n=>this.boat.getObjectByName(n)!);
    this.rower=new Character(assets,{...DEFAULT_APPEARANCE,name:'Maren',body:'masculine',hair:4,top:5,topColor:1,bottom:1,bottomColor:5,accessories:[true,false,false]});
    this.boat.add(this.rower.group);
    for(const d of FERRY_LANDINGS) {
      const landing=assets.ferry('LANDING_Reed');landing.position.set(d.x,d.deckY,d.deckZ);this.group.add(landing);
      const gangway=assets.ferry('GANGWAY_Reed');gangway.position.set(d.x,d.deckY,d.deckZ+1.6);this.group.add(gangway);
      const pieces:T.BufferGeometry[]=[];
      for(let i=0;i<d.steps;i++) {
        const x=d.x-(i+.5)*d.length/d.steps,y=d.deckY+(d.endY-d.deckY)*(i+1)/d.steps;
        pieces.push(xf(box(d.length/d.steps+.015,.22,1.7,'#9b7953',M.planks),x,y-.11,d.stairZ));
        if(i%3===0)for(const side of [-1,1]) {
          const z=d.stairZ+side*.76;
          pieces.push(xf(box(.12,Math.max(1.4,y+2.55),.12,'#665038',M.planks),x,(y-.65)/2,z));
        }
      }
      for(const side of [-1,1]) {
        const z=d.stairZ+side*.82;
        const openEnd=.8;
        pieces.push(beam(new T.Vector3(d.x-openEnd,d.deckY+.92+(d.endY-d.deckY)*openEnd/d.length,z),new T.Vector3(d.endX,d.endY+.92,z),.065,'#80634b',M.planks,6));
      }
      for(const obstacle of ferryLandingObstacles(d))collision.add(obstacle);
      const g=merge(pieces),mesh=new T.Mesh(g,uber(ID.house,.15,T.DoubleSide,surfaceBits(g)));mesh.layers.enable(1);mesh.layers.enable(2);this.group.add(mesh);
      const sign=paintedSign(['REED FERRY',d.id==='haven'?'TO ALDERMERE':'TO HAVEN'],2.1,.8);sign.position.set(d.endX,d.endY+1.5,d.stairZ-1.1);this.group.add(sign);
      this.interactions.push({id:'ferry-'+d.id,kind:'ferry',label:'Board the Reed Ferry',x:d.x+.65,z:d.deckZ,radius:1.15,y:d.deckY});
    }
    this.interactions.push({id:'ferry-passenger',kind:'ferry',label:'Leave at the landing',x:0,z:0,radius:2});
  }
  interact(player:Player):string|null {
    if(this.hidden)return null;
    if(this.transfer)return 'Mind the step — Maren is holding the boat.';
    if(this.riding) {
      if(!this.route.docked)return 'Maren: “We’ll put you ashore at the next landing.”';
      if(this.route.departureIn<TRANSFER_TIME+.2)return 'Maren: “Already casting off — the next landing won’t be long.”';
      const d=FERRY_LANDINGS[this.route.landing];
      if(this.collision.blocked(d.x+.6,d.deckZ,.27,d.deckY))return 'Maren: “Let’s wait for a little space on the landing.”';
      this.beginTransfer(player,true);return 'Maren: “Here we are. Mind the step.”';
    }
    const index=FERRY_LANDINGS.findIndex(d=>Math.hypot(player.position.x-(d.x+.65),player.position.z-d.deckZ)<1.5);
    if(index<0)return null;
    if(Math.abs(player.position.y-FERRY_LANDINGS[index].deckY)>.65)return 'Follow the wooden stairs down to the boarding deck.';
    if(player.cycling)return 'Park your bicycle before boarding. It will wait here for you.';
    if(!this.route.docked||this.route.landing!==index)return 'The Reed Ferry is on its way. Wait on the landing.';
    if(this.route.departureIn<5)return 'Maren: “Casting off! I’ll be back on the next crossing.”';
    this.riding=true;player.seated=false;player.speed=0;player.velocity.set(0,0);
    this.beginTransfer(player,false);
    return 'Maren: “Welcome aboard. Take the forward bench.”';
  }
  private beginTransfer(player:Player,exit:boolean) {
    const d=FERRY_LANDINGS[this.route.landing];
    const deck=exit?new T.Vector3(d.x+.6,d.deckY+.02,d.deckZ):player.character.group.position.clone();
    // Requires the authored split bench/backrest: a .60m centre aisle, not a path through a bench.
    const path=[deck,...[
      new T.Vector3(1.045,.55,-.63),new T.Vector3(.65,.38,-.63),
      new T.Vector3(.48,.20,-.63),new T.Vector3(0,.20,-.30),
      new T.Vector3(0,.20,1.07),new T.Vector3(PASSENGER_SEAT.x,.43,1.07),
    ].map(p=>this.boat.localToWorld(p))];
    if(exit)path.reverse();
    const lengths=path.slice(1).map((p,i)=>p.distanceTo(path[i]));
    this.transfer={time:0,exit,start:player.character.group.position.clone(),path,lengths,length:lengths.reduce((a,b)=>a+b,0)};
  }
  private seatRoot(character:Character,seat:T.Vector3,yaw:number) {
    character.group.updateWorldMatrix(true,true);
    const hips=character.bones.get('hips');
    const h=hips?character.group.worldToLocal(hips.getWorldPosition(new T.Vector3())):new T.Vector3(0,.88,0);
    return seat.clone().add(new T.Vector3(-h.x,.07-h.y,-h.z).applyAxisAngle(Y,yaw));
  }
  private seated(character:Character,local:T.Vector3,yaw:number,dt:number,clock:number) {
    character.group.rotation.set(0,yaw,0);character.setState('sit');character.update(dt,0,0,0,clock);
    character.group.position.copy(this.seatRoot(character,local,yaw));
  }
  private deckFeet(character:Character,seat:T.Vector3,yaw:number,weight=1) {
    const points=[.11,-.11].map(x=>{
      const passenger=seat.z>0;
      const p=new T.Vector3(x,0,passenger?.25:.35).applyAxisAngle(Y,yaw).add(seat);p.y=passenger?.43:.20;
      return this.boat.localToWorld(p);
    });
    character.contactFeet(points[0],points[1],weight);
  }
  update(dt:number,clock:number,player:Player,inside:boolean,range:number) {
    this.hidden=inside;this.route=ferryRoute(clock);
    const r=this.route;this.boat.position.set(r.x,r.y+Math.sin(clock*1.7)*.012*r.rowing,r.z);
    this.boat.rotation.set(Math.sin(clock*1.7)*.003*r.rowing,r.yaw,Math.sin(clock*1.1)*.008*r.rowing);
    this.boat.visible=this.riding||(!inside&&Math.hypot(player.position.x-r.x,player.position.z-r.z)<range+15);
    this.oars.forEach((o,i)=>{const p=ferryOarPose(clock,r.rowing,i===0?1:-1);o.quaternion.setFromAxisAngle(Y,p.yaw).multiply(new T.Quaternion().setFromAxisAngle(Z,p.roll));});
    this.seated(this.rower,new T.Vector3(0,.608,-1.02),Math.PI,dt,clock);
    this.boat.updateMatrixWorld(true);
    // Rig L is +X locally; facing aft maps it to the vessel's negative-X oar.
    // The rig's hand endpoint is its wrist; the palm extends 7.5cm below it.
    const handles=this.oars.map((o,i)=>o.localToWorld(new T.Vector3(i===0?.58:-.58,.105,0)).add(new T.Vector3(0,.075,0)));
    this.rower.contactHands(handles[0],handles[1],r.rowing,.8*r.rowing);
    this.deckFeet(this.rower,new T.Vector3(0,.608,-1.02),Math.PI);
    const item=this.interactions[2];item.x=this.riding?player.position.x:1e6;item.z=this.riding?player.position.z:1e6;
    item.label=r.docked?'Step onto the landing':'Ask about the next landing';
    if(!this.riding)return;
    const chr=player.character, seat=this.boat.localToWorld(PASSENGER_SEAT.clone());
    if(this.transfer) {
      const tr=this.transfer;tr.time=Math.min(TRANSFER_TIME,tr.time+dt);
      const walking=tr.exit?tr.time>=TRANSFER_SIT:tr.time<TRANSFER_WALK;
      if(walking) {
        const t=T.MathUtils.clamp((tr.time-(tr.exit?TRANSFER_SIT:0))/TRANSFER_WALK,0,1);
        // Ease only starts/stops. Distance remains continuous through the intermediate treads.
        const ramp=.12;
        const progress=t<ramp?t*t/(2*ramp*(1-ramp)):t>1-ramp?1-(1-t)**2/(2*ramp*(1-ramp)):(t-ramp/2)/(1-ramp);
        let distance=progress*tr.length,segment=0;
        while(segment<tr.lengths.length-1&&distance>tr.lengths[segment])distance-=tr.lengths[segment++];
        const a=tr.path[segment],b=tr.path[segment+1],u=distance/tr.lengths[segment];
        const previous=chr.group.position.clone();chr.group.position.lerpVectors(a,b,u);
        const speed=previous.distanceTo(chr.group.position)/Math.max(dt,.001);
        const yaw=Math.atan2(b.x-a.x,b.z-a.z);
        chr.group.rotation.y+=Math.atan2(Math.sin(yaw-chr.group.rotation.y),Math.cos(yaw-chr.group.rotation.y))*(1-Math.exp(-14*dt));
        chr.setState('walk',Math.max(.2,speed/1.5));
        chr.update(dt,speed,0,0,clock,undefined,(x,z)=>{
          const local=this.boat.worldToLocal(new T.Vector3(x,r.y,z));
          return r.y+ferryFloorHeight(local.x,local.z);
        });
      } else {
        const t=ease((tr.time-(tr.exit?0:TRANSFER_WALK))/TRANSFER_SIT);
        chr.setState(tr.exit?'idle':'sit');chr.update(dt,0,0,0,clock);
        const stand=tr.exit?tr.path[0]:tr.path[tr.path.length-1];
        const target=this.seatRoot(chr,seat,r.yaw);
        chr.group.position.lerpVectors(tr.exit?tr.start:stand,tr.exit?stand:target,t);
        chr.group.rotation.y+=Math.atan2(Math.sin(r.yaw-chr.group.rotation.y),Math.cos(r.yaw-chr.group.rotation.y))*(1-Math.exp(-10*dt));
        this.deckFeet(chr,PASSENGER_SEAT,0,tr.exit?1-t:t);
      }
      if(tr.time===TRANSFER_TIME){this.transfer=null;if(tr.exit){this.riding=false;player.seated=false;player.transition=.25;chr.setState('idle');}}
    } else {this.seated(chr,seat,r.yaw,dt,clock);this.deckFeet(chr,PASSENGER_SEAT,0);}
    player.position.copy(chr.group.position);player.yaw=chr.group.rotation.y;player.speed=0;player.velocity.set(0,0);player.lastState=chr.state;
  }
}
