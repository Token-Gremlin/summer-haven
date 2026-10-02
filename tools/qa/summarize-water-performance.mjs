import fs from 'node:fs';
const dir='docs/gauntlet/evidence/water-10/';
const baseline=JSON.parse(fs.readFileSync(dir+'performance-baseline-paired.json','utf8'));
const candidate=JSON.parse(fs.readFileSync(dir+'performance-candidate-clean.json','utf8'));
for(const data of [baseline,candidate]){
  if(data.running||data.error||data.profilerEnabled)throw new Error('Incomplete or instrumented sample is not a production benchmark');
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const summarize=runs=>{
  const all=runs.flatMap(r=>r.samples),sorted=[...all].sort((a,b)=>a-b),mean=all.reduce((a,b)=>a+b,0)/all.length;
  const q=n=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*n))];
  let maxBurst=0;for(const run of runs){let burst=0;for(const n of run.samples){burst=n>50?burst+1:0;maxBurst=Math.max(burst,maxBurst);}}
  return {runs:runs.length,seconds:all.reduce((a,b)=>a+b,0)/1000,meanMs:mean,fps:1000/mean,p95:q(.95),p99:q(.99),max:sorted.at(-1),over50:all.filter(x=>x>50).length,over100:all.filter(x=>x>100).length,maxConsecutiveOver50:maxBurst,perRun:runs.map(r=>({fps:r.stats.fps,p95:r.stats.p95,max:r.stats.max,laps:r.laps,inputRecoveries:r.inputRecoveries,internal:r.render,targets:r.targets}))};
};
const comparisons=[...new Set(baseline.runs.map(r=>r.scene))].map(scene=>{
  const a=baseline.runs.filter(r=>r.scene===scene),b=candidate.runs.filter(r=>r.scene===scene);
  if(!same(a.map(r=>r.settings),b.map(r=>r.settings))||!same(a.map(r=>r.render),b.map(r=>r.render))||
    !same(a.map(r=>r.targets),b.map(r=>r.targets))||!same(a.map(r=>r.cameraAspect),b.map(r=>r.cameraAspect)))throw new Error('Settings/resolution mismatch: '+scene);
  const before=summarize(a),after=summarize(b);
  return {scene,before,after,meanMsChangePercent:(after.meanMs/before.meanMs-1)*100};
});
const result={baselineBuild:baseline.build,candidateBuild:candidate.build,hardware:baseline.hardware,
  match:{hardware:same(baseline.hardware,candidate.hardware),appearance:same(baseline.appearance,candidate.appearance),viewport:same(baseline.viewport,candidate.viewport),dpr:baseline.dpr===candidate.dpr,routes:same(baseline.routes,candidate.routes)},comparisons,
  limitation:'Sequential populated-route measurements on one integrated GPU. Not randomized/interleaved, native1080p/High or a universal performance-neutrality guarantee. No screenshots, recording, build or tests during timing.'};
if(Object.values(result.match).some(value=>!value))throw new Error('Hardware, appearance or route metadata mismatch');
fs.writeFileSync(dir+'performance-summary.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
