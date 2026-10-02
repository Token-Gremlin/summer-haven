// Recompute the nature contribution comparison from retained browser RAF samples.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const directory = new URL('../../docs/gauntlet/evidence/nature-09/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, directory), 'utf8'));
const before = read('performance-baseline.json'), after = read(process.argv[2] ?? 'performance-candidate.json');
assert.deepEqual(before.hardware, after.hardware);
assert.deepEqual(before.viewport, after.viewport);
assert.equal(before.dpr, after.dpr);
assert.deepEqual(before.routes, after.routes);
assert.deepEqual(before.appearance, after.appearance);
assert.deepEqual(before.method, after.method);
for (const capture of [before, after]) {
  assert.equal(capture.running, false); assert.equal(capture.error, null);
  assert.equal(capture.runs.length, 6);
  for (const run of capture.runs) {
    assert.equal(run.samples.length, run.stats.frames);
    assert.ok(run.samples.every(v => Number.isFinite(v) && v > 0));
    assert.ok(run.actualMs >= 60000 && run.laps >= 2);
    assert.ok(Math.abs(run.samples.reduce((a,b) => a+b,0)-run.actualMs) < .01);
    assert.deepEqual(run.settings, before.runs[0].settings);
    assert.deepEqual(run.render, before.runs[0].render);
  }
}
const summarize = runs => {
  const samples=runs.flatMap(r=>r.samples).sort((a,b)=>a-b);
  const sum=samples.reduce((a,b)=>a+b,0), q=p=>samples[Math.floor((samples.length-1)*p)];
  const heaps=runs.flatMap(r=>[r.initialMemory.used,r.finalMemory.used,...r.trace.map(t=>t.used)]).filter(Number.isFinite);
  return { frames:samples.length, seconds:sum/1000, fps:1000*samples.length/sum,
    medianMs:q(.5),p95Ms:q(.95),p99Ms:q(.99),maxMs:samples.at(-1),
    over50:samples.filter(v=>v>50).length,over100:samples.filter(v=>v>100).length,
    peakSampledHeapMiB:Math.max(...heaps)/2**20,
    laps:runs.map(r=>r.laps),runFps:runs.map(r=>r.stats.fps) };
};
const scenes=before.routes.map(({name})=>{
  const baseline=summarize(before.runs.filter(r=>r.scene===name));
  const candidate=summarize(after.runs.filter(r=>r.scene===name));
  return {name,baseline,candidate,fpsChangePercent:(candidate.fps/baseline.fps-1)*100};
});
const result={created:new Date().toISOString(),baselineBuild:before.build,candidateBuild:after.build,
  hardware:before.hardware,viewport:before.viewport,dpr:before.dpr,render:before.runs[0].render,
  settings:before.runs[0].settings,method:before.method,scenes,
  limits:['Two existing populated routes, not whole-world acceptance.',
    'Sequential baseline then candidate, not interleaved; small differences are not a claimed speedup.',
    'One active game, no video/screenshot/build/test/Blender during timing; occasional compact progress reads.',
    'RAF delivery intervals and approximate sampled JS heap, not GPU timing or total memory.',
    'Low at1120x630 internal on Intel UHD; no1080p/High/60FPS certification.',
    'Initial QA placement, then ordinary keyboard movement and collision; not the complete journey.']};
fs.writeFileSync(new URL(process.argv[3] ?? 'performance-summary.json',directory),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({scenes,checks:'12 complete runs; settings/hardware/render/routes/appearance match'},null,2));
