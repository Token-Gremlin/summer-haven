import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { REGION_ROUTE, REGION_RIVER, regionRiverSample, regionRouteSample, sampleRegionTerrain } from '../../../src/data/regions.ts';
const grid={x0:260,x1:480,z0:-805,z1:-620,step:1};
const heights:number[][]=[];
for(let z=grid.z0;z<=grid.z1;z+=grid.step){
  const row:number[]=[];
  for(let x=grid.x0;x<=grid.x1;x+=grid.step)row.push(+sampleRegionTerrain(x,z,0).toFixed(6));
  heights.push(row);
}
const reference=readFileSync(new URL('../../../src/data/regions.ts',import.meta.url));
writeFileSync(new URL('./terrain-samples.json',import.meta.url),JSON.stringify({
  created:new Date().toISOString(),source:'src/data/regions.ts',source_sha256:createHash('sha256').update(reference).digest('hex'),
  legacy_height_input:0,grid,heights,route:REGION_ROUTE,river:REGION_RIVER,
  water_profiles:Array.from({length:103},(_,i)=>{const z=-780+i;return {z,...regionRiverSample(z)};}),
  check_points:[[348,-688],[300,-715],[336,-737],[305,-766],[356,-814],[352,-720],[380,-720],[405,-720],[366,-730]].map(([x,z])=>({x,z,terrain:sampleRegionTerrain(x,z,0),route:regionRouteSample(x,z),river:regionRiverSample(z)}))
}));
console.log('Wrote actual 1m terrain samples from regions.ts');
