import { regionRiverSample, sampleRegionTerrain } from './regions';
import type { Obstacle } from '../world/collision';

const clamp = (v:number) => Math.max(0,Math.min(1,v));
const smooth = (v:number) => { v=clamp(v); return v*v*(3-2*v); };
export const FERRY_DWELL = 18;
export const FERRY_TRIP = 100;
export const FERRY_PERIOD = (FERRY_DWELL + FERRY_TRIP)*2;
export const FERRY_LANDINGS = [-165,-330].map((z,i)=>{
  const river=regionRiverSample(z), boatX=river.x-1.2;
  const x=boatX-2.45, deckY=river.y+.55, stairZ=z+.63+4;
  const length=16, endX=x-length;
  const endY=sampleRegionTerrain(endX,stairZ,0)+.035;
  const steps=Math.max(8,Math.ceil((endY-deckY)/.16));
  return { id:i===0?'haven':'aldermere', name:i===0?'Haven River Landing':'Aldermere Reed Quay',
    z,x,boatX,deckZ:z+.63,deckY,stairZ,length,endX,endY,steps };
});
export function ferrySupportHeight(x:number,z:number):number|null {
  for(const d of FERRY_LANDINGS) {
    if(Math.abs(x-d.x)<=1.3 && Math.abs(z-d.deckZ)<=1.6) return d.deckY;
    if(Math.abs(x-d.x)<=.55 && z>=d.deckZ+1.6 && z<=d.stairZ) return d.deckY;
    const t=(d.x-x)/d.length;
    if(t>=0 && t<=1 && Math.abs(z-d.stairZ)<=.85)
      return d.deckY+(d.endY-d.deckY)*Math.ceil(t*d.steps)/d.steps;
  }
  return null;
}
export const ferryLandingAt=(x:number,z:number)=>ferrySupportHeight(x,z)!==null;
/** Local support matches the authored treads, aisle and raised passenger footboards. */
export function ferryFloorHeight(x:number,z:number):number {
  if(z>=.93&&z<=1.21&&Math.abs(x)>=.33&&Math.abs(x)<=.78)return .43;
  if(z<-.4)return x>.77?.55:x>.53?.38:.20;
  return .20;
}
/** The open inside corner joins stairs to gangway without crossing a rail. */
export function ferryLandingObstacles(d:(typeof FERRY_LANDINGS)[number]):Obstacle[] {
  const obstacles:Obstacle[]=[];
  for(const side of [-1,1])for(let i=0;i<d.steps;i++){
    const y=d.deckY+(d.endY-d.deckY)*(i+.5)/d.steps;
    const x0=d.x-(i+1)*d.length/d.steps,x1=Math.min(d.x-.8,d.x-i*d.length/d.steps);
    if(x1>x0)obstacles.push({x:(x0+x1)/2,z:d.stairZ+side*.82,w:x1-x0,d:.08,bottom:y-.1,height:1.06,tag:'ferry-stair-rail'});
  }
  obstacles.push({x:d.x-1.25,z:d.deckZ,w:.1,d:3.2,bottom:d.deckY,height:1,tag:'ferry-deck-rail'});
  obstacles.push({x:d.x,z:d.deckZ-1.55,w:2.6,d:.1,bottom:d.deckY,height:1,tag:'ferry-deck-rail'});
  for(const side of [-1,1])obstacles.push({x:d.x+side*.54,z:d.deckZ+2.6,w:.06,d:2,bottom:d.deckY,height:1,tag:'ferry-gangway-rail'});
  return obstacles;
}
export function ferryGroundHeight(x:number,z:number,base:number) {
  const y=ferrySupportHeight(x,z);return y===null?base:Math.min(base,y-.22);
}
/** Clock determines route even while culled; no endpoint teleport. Turn in the channel. */
export function ferryRoute(clock:number) {
  const phase=((clock%FERRY_PERIOD)+FERRY_PERIOD)%FERRY_PERIOD;
  const leg=phase>=FERRY_DWELL+FERRY_TRIP?1:0;
  const local=phase-leg*(FERRY_DWELL+FERRY_TRIP);
  const from=FERRY_LANDINGS[leg], to=FERRY_LANDINGS[1-leg];
  const docked=local<FERRY_DWELL;
  const u=clamp((local-FERRY_DWELL)/FERRY_TRIP);
  // Constant cruise with finite acceleration/deceleration ramps.
  const a=.1;
  const travel=u<a?u*u/(2*a*(1-a)):u>1-a?1-(1-u)**2/(2*a*(1-a)):(u-a/2)/(1-a);
  const z=from.z+(to.z-from.z)*travel, river=regionRiverSample(z);
  const berth=1-smooth(u/.1)+smooth((u-.9)/.1);
  const direction=leg===0?-1:1;
  const before=regionRiverSample(z+.5),after=regionRiverSample(z-.5);
  const heading=Math.atan2((after.x-before.x)*-direction,direction);
  const movingYaw=heading<0?heading+Math.PI*2:heading;
  const yaw=Math.PI+(movingYaw-Math.PI)*(1-berth);
  return {x:river.x-1.2*berth,y:river.y,z,yaw,docked,landing:leg,
    departureIn:Math.max(0,FERRY_DWELL-local), rowing:docked?0:smooth(u/.08)*(1-smooth((u-.92)/.08))};
}
/** Yaw then roll; symmetric oars dip on the power stroke and lift on recovery. */
export function ferryOarPose(clock:number,rowing:number,side:number) {
  const phase=clock*Math.PI*2/2.8;
  return {yaw:side*((1-rowing)*-Math.PI/2+rowing*.36*Math.cos(phase)),roll:side*.14*Math.sin(phase)*rowing};
}
