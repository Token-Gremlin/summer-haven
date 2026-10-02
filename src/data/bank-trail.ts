/** Optional dry route, surveyed against existing terrain; this never alters collision or heights. */
export const BANK_TRAIL = [[340,-846],[364,-846],[368,-842],[368,-806],[356,-792],[356,-742]] as const;
export const BANK_TRAIL_WIDTH=1.6;
export function bankTrailDistance(x:number,z:number) {
  let distance=Infinity;
  for(let i=1;i<BANK_TRAIL.length;i++){
    const a=BANK_TRAIL[i-1],b=BANK_TRAIL[i],dx=b[0]-a[0],dz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
    distance=Math.min(distance,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));
  }
  return distance;
}
