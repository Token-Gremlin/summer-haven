import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DoubleSide,Raycaster,Vector3,Mesh} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {sampleRegionTerrain,regionSurfaceWater} from '../../../src/data/regions.ts';
const path=new URL('../../../public/assets/fantasy/silverveil-gorge.glb',import.meta.url);
const bytes=readFileSync(path);const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const visual=gltf.scene.getObjectByName('GEO_Silverveil')!;visual.position.set(366,0,-713);visual.updateMatrixWorld(true);
visual.traverse(o=>{if(o instanceof Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])m.side=DoubleSide;}});
const ray=new Raycaster(new Vector3(),new Vector3(0,-1,0),0,150);
let maxDelta=-Infinity;let failures=0;let sampled=0;let where:unknown=null;
for(let z=-792;z<=-737.01;z+=.25)for(let x=353.75;x<=357.01;x+=.25){
  ray.ray.origin.set(x,120,z);const hits=ray.intersectObject(visual,true);sampled++;
  if(hits.length){const delta=hits[0].point.y-sampleRegionTerrain(x,z,0);if(delta>maxDelta){maxDelta=delta;where={x,z,mesh:hits[0].object.name,y:hits[0].point.y};}if(delta>.001)failures++;}
}
ray.ray.origin.set(356,120,-742);const target=ray.intersectObject(visual,true).map(h=>({mesh:h.object.name,y:h.point.y}));
const result={mode:'Raycast final GLB in Three.js; visual meshes only, double sided conservative check',sampled,failures,maxDelta,where,target,targetTerrain:sampleRegionTerrain(356,-742,0),targetWater:regionSurfaceWater(356,-742),sha256:createHash('sha256').update(bytes).digest('hex')};
const manifest=new URL('../../../public/assets/fantasy/silverveil-gorge.json',import.meta.url);const json=JSON.parse(readFileSync(manifest,'utf8'));json.bank_fit.exported_triangle_verification=result;writeFileSync(manifest,JSON.stringify(json,null,2));
writeFileSync(new URL('./bank-r3/export-measurements.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
if(failures)process.exitCode=1;
