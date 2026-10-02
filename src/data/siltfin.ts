import { regionSurfaceWater } from './regions';

export type SiltfinPhase = 'rest' | 'swim' | 'alert';
export interface SiltfinSnapshot { version:1; encounters:number; lastEncounter:number; alertUntil:number }
export const SILTFIN_WATERLINE = 1.0377006202936172;
// Conservative union of every authored posed clip, with extra margin for blends.
export const SILTFIN_ENVELOPE = { min:[-1.3,-.03,-5.6], max:[1.3,2.5,3.7] } as const;
export const SILTFIN_TERRITORY = { x:366,z:-742,across:.8,along:4,period:120,rest:30 } as const;
export const SILTFIN_BANK = { x:356,z:-742,radius:2.2 } as const;
const smooth = (t:number) => t*t*(3-2*t);
export function siltfinRoutine(elapsedSeconds:number,waterline=SILTFIN_WATERLINE) {
  const clock=Math.max(0,Number.isFinite(elapsedSeconds)?elapsedSeconds:0);
  const r=SILTFIN_TERRITORY,cycle=clock%r.period;
  const progress=Math.max(0,(cycle-r.rest)/(r.period-r.rest));
  const angle=Math.PI+Math.PI*2*smooth(progress);
  const x=r.x+r.across*Math.cos(angle),z=r.z+r.along*Math.sin(angle);
  const yaw=Math.atan2(-r.across*Math.sin(angle),r.along*Math.cos(angle));
  const water=regionSurfaceWater(x,z);
  if(water===null)throw new Error('Vesper territory no longer has a water surface.');
  return {x,y:water-waterline,z,yaw,phase:(cycle<r.rest?'rest':'swim') as SiltfinPhase,cycle,clock};
}
export function restoreSiltfin(value?:Partial<SiltfinSnapshot>):SiltfinSnapshot {
  const empty:SiltfinSnapshot={version:1,encounters:0,lastEncounter:-1e9,alertUntil:0};
  if(!value||value.version!==1)return empty;
  const bounded=(n:unknown,min:number,max:number,fallback:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max?n:fallback;
  return {version:1,encounters:Math.floor(bounded(value.encounters,0,1e6,0)),lastEncounter:bounded(value.lastEncounter,-1e9,1e10,-1e9),alertUntil:bounded(value.alertUntil,0,1e10,0)};
}
