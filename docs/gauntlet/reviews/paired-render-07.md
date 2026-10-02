# Independent candidate06 paired rendering review

Reviewed 2026-09-30 UTC. Scope: read-only inspection of the supplied control/sector diagnostic records, frozen acceptance v1, reference evidence, implementation and tests. I did not build, run tests, open the game, inspect Blender, or observe motion/audio. The supplied files reveal identities, so this review is not blinded. No builder narrative was used.

**Decision: the records support a narrow, provisional rendering-cost improvement; candidate acceptance remains UNVERIFIED, and the recorded candidate memory peak FAILS the frozen numeric budget.** No visual, animation, simulation, integrated-world, or sustained-performance approval follows. Preserve the control and investigate memory before accepting the optimization as a completed contribution.

## Evidence integrity and method

I independently recomputed all frame distributions from `profile-control-06.json` and `profile-sector-06.json`, inspected both warmup and steady profiles, every memory trace, `profile-paired-method-06.js`, `draw-city-06.json`, `paired-builds-06-hashes.json`, `src/render/angular-sectors.ts`, `src/world/sky.ts`, the profiler, shader wind/push code, shadow scheduling, and `tests/angular-sectors.test.ts`. The requested sky implementation actually resides in `src/world`, not `src/render`.

All eight manifest byte lengths and SHA-256 hashes match the currently retained files, including both release bundles. The two raw records name their corresponding retained bundle filenames. The paired helper is byte-identical to the current `tools/qa/world-performance.js`. These checks establish file identity, not complete source/build provenance: a full common-source manifest, save snapshot attached to each run, or runtime state digest is absent. The minified bundle difference begins at the sector helper/sky implementation; I did not establish semantic equivalence of every other bundled module.

Both records completed with `running:false`, four runs, and `error:null`. Each timed window is 30.001–30.015 seconds after 10 seconds of warmup; one repetition only. Control ran first (01:00:35–01:03:16 UTC), sector second (01:04:35–01:07:15). Same routes, settings, viewport 920×668 CSS pixels, DPR 1.25, and **805×584 internal** render size. WebGL reports Intel UHD 0x00009BC4 / ANGLE Direct3D11, Chrome 154, eight logical processors and browser-reported 16 GB device memory. The separate hardware-05 record identifies i5-10300H, Windows 11, Intel driver 31.0.101.2141, and an adapter-reported 144 Hz; embedded-browser refresh/vsync remains unverified. This is not the old 896×504 baseline configuration.

Declared reductions: Low, resolution .7, shadow map 512, vegetation .3, reflections off, AA 1, post false, distance 90, nearby visibility. Post false still produces named ink/grade/FXAA diagnostic passes; it does not mean no postprocessing work. The helper sets time .12 and freezes day progression. It resets selected populations and elapsed world time before warmup, then uses keyboard movement and collision with scripted steering. No screenshots/video during timing are declared, but competing workloads and thermal/cache conditions are not independently logged.

## Independently calculated frame results

Every sample sum equals `actualMs`; sample count equals the steady profiler frame count. Quantiles use sorted samples at floor(N×q), matching the declared method. Values are control → sector; milliseconds except FPS/counts.

| Scene | Frames | Mean / FPS | Median | p95 / p99 | Min / max | Counts >33.3 / >50 / >100 ms |
|---|---:|---:|---:|---:|---:|---:|
| Aldermere | 1120 → 1279 | 26.787 / 37.33 → 23.467 / 42.61 | 27.7 → 20.9 | 34.7 / 34.8 → 27.9 / 28.0 | 13.9 / 48.5 → 13.6 / 34.8 | 109 / 0 / 0 → 7 / 0 / 0 |
| Mosswood | 1196 → 1396 | 25.084 / 39.87 → 21.501 / 46.51 | 27.7 → 20.8 | 27.9 / 28.0 → 27.8 / 27.9 | 7.0 / 104.1 → 7.0 / 90.3 | 9 / 1 / 1 → 2 / 1 / 0 |
| Silverveil | 1461 → 1708 | 20.539 / 48.69 → 17.569 / 56.92 | 20.8 → 20.7 | 27.7 / 27.9 → 21.0 / 21.1 | 7.1 / 55.5 → 6.9 / 28.0 | 4 / 1 / 0 → 0 / 0 / 0 |
| Vesper | 1407 → 1636 | 21.328 / 46.89 → 18.338 / 54.53 | 20.8 → 20.8 | 27.8 / 28.0 → 21.0 / 21.1 | 7.0 / 34.7 → 6.9 / 34.9 | 1 / 0 / 0 → 3 / 0 / 0 |

Mean interval reductions are 12.39%, 14.29%, 14.46%, and 14.02%; FPS increases are 14.14%, 16.67%, 16.91%, and 16.30%. These are descriptive effects in one ordered pair, not confidence intervals or repeatability estimates. All candidate scenes remain below 60 FPS. Their short-window means/p95 satisfy the numerical usable-mode targets, but P2/P3 are **UNVERIFIED** because diagnostic instrumentation, one 30-second run, missing high-mode evidence, and absent gameplay observation do not satisfy the frozen protocol.

The approximately 6.94 ms timing increments suggest refresh-quantized delivery, consistent with the separate 144 Hz adapter record; that is an inference, not proof of browser presentation mode. CPU, GPU and RAF values must not be added to infer FPS.

## CPU, GPU and counts

CPU/GPU files retain aggregate count/mean/min/max, not individual timing samples. I can audit arithmetic and compare aggregates but cannot independently reconstruct their percentiles or temporal correlation with stalls.

| Scene | CPU frame mean | CPU scene submission mean | GPU scene mean | Scene triangles/frame | Scene calls/frame |
|---|---:|---:|---:|---:|---:|
| Aldermere | 11.553 → 11.515 | 4.908 → 5.129 | 15.690 → 12.967 | 509,249 → 414,666 | 202.471 → 216.385 |
| Mosswood | 11.470 → 10.802 | 4.810 → 4.812 | 15.135 → 12.251 | 494,198 → 393,369 | 228.853 → 241.158 |
| Silverveil | 10.359 → 10.455 | 4.564 → 4.992 | 12.140 → 9.466 | 284,322 → 189,851 | 89.764 → 104.569 |
| Vesper | 10.868 → 11.093 | 4.932 → 5.514 | 13.087 → 10.374 | 417,083 → 323,566 | 198.929 → 213.839 |

GPU scene means fall 17.36–22.03%, while scene submission adds roughly 12–15 calls and CPU submission generally rises. The evidence supports reduced GPU scene work with a CPU/draw-call tradeoff, not a universal CPU optimization. Roughly 93,517–100,829 fewer submitted scene triangles is consistent with culling sectors of the 140,480-triangle ridge family; route/frame weighting prevents treating this as an exact matched-frame ridge count.

All steady GPU statuses are available, with zero skipped/discarded queries and disjoint events. However, 27–29 queries remain pending per window. Scene GPU sample counts equal frames minus six; shadow GPU samples lag submitted shadow passes by three to five. End-of-window results are censored, not zero-cost. Profiler reset discards outstanding warmup results before clearing the discard counter; zero steady discarded does not claim no warmup queries were thrown away. No drain or per-query raw timings are retained.

Shadow counts are lower than frame counts because low mode updates shadows at approximately 30 Hz. For example, Aldermere control has 895 shadow passes / 1120 frames, sector 899 / 1279. Frame-total draw means reconcile when shadow means are weighted by their pass count: control 202.471 + 102.979×895/1120 + 3 ≈ 287.762. Simply adding unweighted pass means is wrong. Shadow geometry/time per pass is essentially unchanged; its lower per-frame share partly follows increased FPS. Nested `pass:*` CPU timings are already included in main stages.

The separate city draw snapshot is **another bundle** (`index-BEBUlrp2.js`), not either retained paired bundle. It contains 117 shadow records totaling 490,505 triangles at frame 58706 and 147 scene records totaling 456,962 at frame 58707. Five ridge records total 140,480, or 30.74% of scene triangles. This is useful motivation, not paired proof or a GPU-cost attribution; record count includes zero-instance entries and is not automatically actual GL draw-call count. The two passes are from adjacent frames.

## Completion, stalls and biases

Reported lap crossings match (2, 1, 1, 3); all warmup lap counts are zero. One-second traces contain 29 records per scene, nonzero movement, closely matched start/end positions, and no six-second movement-stall error. This supports successful short routes. **Timed-only lap counters still count completion of a lap begun during warmup**, because the route index is not reset at timing start; they do not demonstrate 2/1/1/3 wholly timed complete laps. The forest route deliberately detours around perch rocks. It cannot clear the obstruction or certify the originally intended centerline.

Candidate forest still has a 90.3 ms steady frame; control forest has 104.1 ms. Warmup RAF maxima are control 256.8/388.9/41.6/28.0 ms, candidate 187.5/131.9/62.4/41.6 ms. These arrival stalls must remain reported. They are excluded from steady timing by design; source/data do not establish their cause. One short candidate window with no >100 ms frame is not evidence that recurring stalls are eliminated.

Fixed control-first order, fresh-build shader/cache differences, frame-dependent movement, and no repeated/reversed order weaken causal precision. The helper resets some state but does not capture all resident/wildlife/dragon/random state or simulation population counts per run; it also restores only selected original state afterward. Identical routes and matching lap crossings improve comparability, but are not exact per-frame workloads. Teleports and frozen time explicitly disqualify this as the J1 journey or schedule acceptance.

## Memory is the immediate blocker

Decimal MB, using initial + one-second traces + final observations; true within-second peaks may be higher.

| Scene | Observed peak control → sector | Final used heap control → sector | Final geometry count control → sector |
|---|---:|---:|---:|
| Aldermere | 424.29 → 727.12 | 346.68 → 702.75 | 442 → 477 |
| Mosswood | 353.09 → 730.54 | 351.65 → 715.79 | 555 → 610 |
| Silverveil | 357.83 → 383.05 | 353.94 → 378.41 | 607 → 663 |
| Vesper | 362.74 → 380.20 | 362.74 → 359.19 | 612 → 667 |

The candidate city/forest observed peaks exceed **450 MB** and increase 71.37%/106.90% over equivalent control peaks. Candidate final observations all exceed **350 MB**; control later scenes do too. End-of-run samples are not demonstrated settled/post-cleanup heap. The candidate drops from 715.79 MB at forest end to 377.58 MB at the next timed start: retained prior context/debug references or GC timing are plausible hypotheses, not established explanations. This packet cannot excuse or attribute the excess.

Sixty sector geometries replace five originals; the final Vesper difference of +55 is expected. Earlier counts grow as assets enter view, so they are not a plateau/leak test. Texture sequences agree (88, then 94→95, then 95). Attribute objects are shared, while new 32-bit indices add approximately 1.686 MB across 421,440 indices, plus object/bounds overhead. That expected overhead alone cannot explain hundreds of MB. Process memory, GPU bytes, full loading peaks, and three cleanup journey loops are absent. P4 numeric peak **FAILS for this measured record**; causality, settled memory and leak status remain **UNVERIFIED**.

## Source validity, visual limits and next test

The implementation partitions whole triangles by angular centroid and derives each bound from all referenced vertices. Shared attributes, preserved winding and unchanged shader coordinates are appropriate for the translation-only, unit-scale sky. Wind padding covers the inspected normalized direction and push amplitude ≤1; source changes to these assumptions need renewed validation. Shared geometry disposal requires the documented common lifetime. Tests cover exact ridge attribute hashes, each original triangle once, seam vertices, translation, reflected camera orientations, and a conservative wind envelope. The retained test log reports 117/117 passing; I inspected it but did not rerun it. The full-rotation test samples vertices and uses horizontal camera views; it is not exhaustive runtime raster, pitched-camera, reflective-water, or motion evidence.

Reference-evidence Z2 and the Summer Haven/Summer Cycle baseline make layered, stable ridge silhouettes materially important to Q1/B2. No current matched visual evidence was supplied, so preserved bytes and frustum mathematics cannot approve popping, skyline continuity, reflection appearance, or animation. No reference art gate is approved.

**Biggest remaining gap:** the unexplained candidate memory excess invalidates a clean performance-only acceptance, alongside missing runtime visual equivalence. **Next falsifiable test:** retain these records, then run both hashed releases in genuinely fresh isolated browser contexts with the same restored save, verified sole active workload, and alternated/reversed order; record heap from load through warmup, all scene windows and explicit cleanup, with process/resource counts and retained-context inspection if the >450 MB excess recurs. Collect at least three 60-second production-mode moving runs per required scene under the fixed P2 settings protocol; collect diagnostic pass timing separately. A repeat >450 MB peak or >10% post-cleanup growth over three journeys falsifies memory acceptance. If clean repeats remain within budget, retain the old failure and document the demonstrated contamination cause rather than deleting it. Separately capture matched continuous sky rotations, elevation/pitch changes and reflective-water views in low and high quality to falsify the claimed no-visible-loss optimization before a contribution pass.

## Separate follow-up — actual rendered still equivalence

Reviewed after receipt of `tools/qa/sky-culling-visual.js`, `evidence/sky-culling-06/rotation-pixels.json`, and ten saved A/B PNGs. This addendum narrows the earlier missing-visual-evidence finding; it does not erase the memory failure or approve the complete contribution. A means all sector meshes with frustum culling disabled; B means those same meshes with culling enabled. Identities were disclosed. This is an equivalence experiment, not a blinded aesthetic preference comparison or a control-release versus candidate-release screenshot comparison.

**Bounded finding: PASS for observed still-image equivalence in the supplied sampled conditions.** The JSON contains 48 completed comparisons and no error: 24 yaw positions at 15-degree intervals from 0 through 345 degrees for each of two configurations. Every result reports zero changed RGB pixels, zero maximum channel difference and zero mean channel difference, across 34,328,880 pixel comparisons. All name the retained candidate `index-CeBVBOAx.js`; all have player position [496, 89.98545, -960], time .12 and world elapsed time 40.0201 seconds. The records span 01:12:32.889–01:12:48.620 UTC. Low uses 805×584 and pitch −.14; high uses 1150×835 and pitch .32, resolution 1, vegetation 1, shadow map 1024, post true and distance 240. Both retain nearby visibility and disable reflections. This is two pitch/configuration combinations, not both pitches crossed with both quality levels, nor a sweep through elevations or animation times.

I independently compared the saved bytes of all five A/B pairs: high-yaw-6, high-yaw-12, low-yaw-6, low-yaw-12 and north. Every pair is byte-for-byte identical, stronger than RGB-only equality for those five saved pairs. I opened one member of each identical pair and inspected the actual pixels. The yaw-6/12 views visibly contain layered blue mountain silhouettes, nearer foliage and clouds, with no A/B difference possible given byte identity. They are substantive rendered scenes rather than blank frames. The north view is dominated by foreground trees, so it offers weaker ridge coverage. The north filenames do not have a matching named entry in the rotation JSON; I accept their binary equivalence but cannot assign them the JSON's exact camera metadata. Four of the 48 logged pairs are retained as pixels; the remaining 44 comparisons can be audited through the method and numeric record but cannot be independently re-decoded from saved images.

The method is appropriate for isolating this culling change: it requires all 60 ridge sectors, renders A and B consecutively without an intervening await or simulation tick, sets a fixed grade time, and restores original culling flags in a finally block. The inspected `post.render` explicitly clears/renders the scene target before composition; the comparison is not simply reading the same old canvas twice. PNG decoding occurs only after both captures. The helper compares RGB, excluding alpha; the five byte-identical saved pairs also rule out alpha differences there. It does not record actual rejected-sector or submitted-triangle counts per pair, so adding these would demonstrate that each comparison exercises culling rather than merely setting a flag. The source and prior geometric tests support that interpretation, but the new JSON does not directly measure it.

This verifies a useful part of B2/Q1 preservation: enabling culling did not change the sampled main-camera rendered stills. It does **not** prove the original unsplit mesh and the split mesh have identical rasterization everywhere, that 15-degree gaps contain no boundary defect, that temporal camera/sky updates never pop, or that the reflection pass is safe. The same-frame call uses existing shadow/reflection state, and reflections are disabled. No animation, traversal, original-world craft, sustained performance, high-mode FPS, memory, or full B2/Q1 gate is approved.

The largest overall remaining blocker remains unexplained measured memory excess. The next falsifiable **visual** test is a retained uninterrupted production-camera orbit with changing pitch/elevation and shader time, crossing sector boundaries in both quality modes; separately compare freshly rendered reflection passes on/off at water viewpoints. Log rejected-sector counts, save paired pixels around boundary crossings, and treat any missing ridge pixel, hole or temporal pop as a regression. The current still-equivalence result should be retained as positive evidence alongside those outstanding tests.
