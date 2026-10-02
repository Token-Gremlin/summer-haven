import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { regionRiverSample, sampleRegionTerrain } from '../../../src/data/regions.ts';
const grid={x0:350,x1:361,z0:-801,z1:-735,step:.25};
const heights:number[][]=[];
for(let z=grid.z0;z<=grid.z1;z+=grid.step){
  const row:number[]=[];
  for(let x=grid.x0;x<=grid.x1;x+=grid.step)row.push(sampleRegionTerrain(x,z,0));
  heights.push(row);
}
writeFileSync(new URL('./bank-terrain.json',import.meta.url),JSON.stringify({grid,heights,
 source_sha256:createHash('sha256').update(readFileSync(new URL('../../../src/data/regions.ts',import.meta.url))).digest('hex'),
 water:Array.from({length:265},(_,i)=>({z:-801+i*.25,...regionRiverSample(-801+i*.25)}))}));
console.log('Sampled exact quarter-metre analytic bank terrain.');
