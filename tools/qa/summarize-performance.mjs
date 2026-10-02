import { readFile, writeFile } from 'node:fs/promises';

// Keep the source records, including aborted attempts. This only aggregates
// completed timed intervals; it never promotes an incomplete route to a pass.
const [outputFile, ...files] = process.argv.slice(2);
if (!outputFile || !files.length) throw new Error('Usage: summarize-performance.mjs output.json input.json [input.json ...]');
if (files.includes(outputFile)) throw new Error('The summary must not replace a raw measurement record.');
const records = await Promise.all(files.map(async file => ({
  file, data: JSON.parse(await readFile(file, 'utf8')),
})));
const runs = records.flatMap(({ file, data }) => data.runs.map(run => ({ ...run, source: file })));
const quantile = (a, q) => a[Math.min(a.length - 1, Math.floor(a.length * q))];
const finiteRange = values => {
  const a = values.filter(Number.isFinite);
  return a.length ? [Math.min(...a), Math.max(...a)] : null;
};
const scenes = [...new Set(runs.map(run => run.scene))].map(name => {
  const selected = runs.filter(run => run.scene === name);
  const samples = selected.flatMap(run => run.samples).sort((a, b) => a - b);
  const totalMs = samples.reduce((sum, sample) => sum + sample, 0);
  const memories = selected.flatMap(run => [run.initialMemory, ...run.trace, run.finalMemory]);
  return {
    name,
    completedRuns: selected.length,
    runFps: selected.map(run => run.stats.fps),
    runP95Ms: selected.map(run => run.stats.p95),
    aggregate: { frames: samples.length, elapsedMs: totalMs, fps: samples.length * 1000 / totalMs,
      medianMs: quantile(samples, .5), p95Ms: quantile(samples, .95), p99Ms: quantile(samples, .99),
      minMs: samples[0], maxMs: samples.at(-1),
      over33ms: samples.filter(x => x > 33.3).length,
      over50ms: samples.filter(x => x > 50).length,
      over100ms: samples.filter(x => x > 100).length },
    measuredUsedHeapBytes: finiteRange(memories.map(x => x.used)),
    finalUsedHeapBytes: selected.map(run => run.finalMemory.used),
    geometries: finiteRange(memories.map(x => x.geometries)),
    textures: finiteRange(memories.map(x => x.textures)),
    calls: finiteRange(selected.flatMap(run => run.trace.map(x => x.calls))),
    triangles: finiteRange(selected.flatMap(run => run.trace.map(x => x.triangles))),
    render: selected.map(run => run.render),
    sources: [...new Set(selected.map(run => run.source))],
  };
});
const summary = {
  generatedAt: new Date().toISOString(),
  evidence: records.map(({ file, data }) => ({ file, started: data.started, completed: data.completed,
    build: data.build, hardware: data.hardware, viewport: data.viewport, dpr: data.dpr,
    method: data.method, visibility: data.visibility, error: data.error, routes: data.routes ?? null })),
  scenes,
  limits: [
    'RAF delivery intervals, not GPU timings. The actual embedded-browser refresh/vsync is unverified.',
    'Separate diagnostic scene placement/reset precedes warmup; this is not a whole-world journey.',
    'JavaScript heap is an approximate browser counter; process and GPU byte usage are not measured.',
    'No cold-load, three-journey retention, high-quality or native-1080p performance approval.',
    'Only complete runs appear in aggregates. Inspect retained failures and conditions before comparisons.',
  ],
};
await writeFile(outputFile, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
