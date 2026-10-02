# Independent sustained-performance review 07

2026-09-30 UTC. **Narrow measurement accepted; full P1–P4 approval withheld.** The integrated build delivers 33.09–42.04 aggregate FPS on four declared Low-mode routes. Every run misses 60 FPS. The measured routes meet the numeric 30 FPS / p95 ≤40 ms aims, with one isolated 111.2 ms interval, but do not establish busy-city, whole-journey, high-quality or retention performance.

This fresh critic read the objective, frozen acceptance, archived sampler, raw intervals and position/resource traces; independently recalculated distributions before checking the generated summary. No game, build, test, browser capture or Blender work was run by this critic. Evaluation is unblinded: filenames/build identity, configuration caveats and later runtime notes were visible. No visual, motion or audio approval is inferred from these counters.

## Evidence and exact conditions

- [Raw record](../evidence/performance-integrated-06.json), [summary](../evidence/performance-integrated-06-summary.json), [archived method](../evidence/performance-method-integrated-06.js), [hashes](../evidence/performance-integrated-06-hashes.json), [hardware](../evidence/hardware-05.json).
- Build `index-DC1G58qr.js`, SHA-256 `D9775A3C7BC638B6440BC29989E28C6B5DF7694F967C791BF33E70A1B8BC6F94`; sampler hash `3869C9BFF052D1850826877BA3A43EF515A38695F877A16875168F70E784425B`. Both independently checked while the measured bundle was still in dist. The measured build remains frozen at `.cache/releases/candidate-06-integrated`; subsequent trail build `rs5CDbKv` is outside this record. Encounter-save hash is retained in provenance; raw timing does not embed its initial full state.
- Intel i5-10300H, 4 cores / 8 logical processors; Windows 11 Home Single Language 10.0.26200, OS visible RAM 16,604,212 KiB. Browser reports 16 GB and Chrome/154.0.0.0. Actual WebGL renderer is Intel UHD `0x00009BC4`, ANGLE Direct3D11; hardware record lists Intel driver `31.0.101.2141`. The installed GTX 1650 is not the recorded rendering device. Embedded-browser refresh/vsync remains unverified despite the adapter's reported 144 Hz.
- Viewport **1280×720, DPR 1.25, internal 1120×630**, Low, resolution `.7`, shadows `512`, vegetation `.3`, reflections off, AA `1`, post off, distance `90`, nearby visibility; time `.12` frozen. Camera pitch `.22`, distance `6.2`, scripted yaw toward route waypoints. All 12 runs have identical recorded render dimensions/settings. Profiler off; no screenshots/video during timing. Concurrent heavy-work exclusion is the coordinator's recorded procedure, not something these timestamps independently prove.
- 01:27:49.324–01:41:50.004 UTC: four scenes × three repetitions, each ≥60 s after a 10 s warmup. **27,309 intervals / 720.1715 measured seconds.** Each raw sample sum equals its run's `actualMs`; independent aggregate results agree with the summary. This is RAF delivery timing, not GPU execution time.

## Measured distributions

Milliseconds except FPS. Counts use strict `>33.3`, `>50`, `>100` thresholds. Aggregate FPS is total frames divided by total elapsed time, not the best run.

| Scene | Individual run FPS | Aggregate FPS | Mean / median | p95 / p99 | Min / max | >33.3 / >50 / >100 |
|---|---|---:|---|---|---|---|
| Aldermere market | 33.07 / 33.06 / 33.15 | 33.09 | 30.22 / 27.9 | 34.8 / 34.9 | 6.9 / 111.2 | 2257 / 4 / 1 |
| Mosswood glade detour | 35.44 / 35.29 / 35.07 | 35.27 | 28.36 / 27.8 | 34.7 / 34.8 | 6.8 / 55.6 | 856 / 6 / 0 |
| Silverveil lower approach | 42.36 / 41.82 / 41.94 | 42.04 | 23.79 / 21.0 | 27.9 / 28.0 | 6.9 / 55.5 | 18 / 1 / 0 |
| Vesper upper bank | 41.47 / 41.05 / 41.34 | 41.28 | 24.22 / 21.1 | 27.9 / 28.0 | 6.9 / 48.6 | 49 / 0 / 0 |

The single >100 ms interval occurs in market repeat 2, ending at 17.8784 s. Eleven intervals exceed 50 ms overall; some forest events cluster around 32–33 s or 47–48 s. This sample shows no recurring >100 ms pattern. Causes are unmeasured; do not attribute them to uploads, GC, shaders or simulation without further instrumentation.

All runs finish without a movement-watchdog error. Position traces contain 58–59 points each, maximum spacing 1.035 s, and approximately 124.8–132.3 m of summed horizontal sample-to-sample displacement per run. They traverse the expected short corridors. Two tiny net displacements occur near turnarounds; adjacent movement and nonzero speeds do not support a sustained stop. These coarse samples cannot certify input responsiveness or camera motion. Reported `laps` are start-line crossings after timing begins: waypoint progress is not reset after warmup, so a first crossing can finish a lap partly walked during warmup.

## Memory and resource evidence

Observed used JS heap spans **241,885,189–297,127,642 bytes**; final sample is **270,918,920 bytes**. Every sampled value is below the frozen 350 MB settled / 450 MB peak allowances. This supports only a sampled-heap subcheck: roughly one-second counters omit between-sample peaks, and neither initial nor final samples establish post-cleanup settled memory. No forced cleanup or three repeated complete journeys occurred.

| Scene | Observed heap MB, decimal | Renderer geometries | Textures | Draw calls | Triangles |
|---|---:|---:|---:|---:|---:|
| Market | 241.89–297.13 | 528–548 | 90–94 | 171–437 | 353,826–1,073,761 |
| Forest | 242.60–272.79 | 619–651 | 99 | 201–601 | 394,942–1,006,992 |
| Falls | 247.59–273.17 | 673–698 | 99 | 87–239 | 166,313–511,070 |
| Bank | 244.55–274.10 | 701 | 99 | 158–429 | 286,781–601,079 |

Counts stabilize within later repeats of each scene, while first exposure adds resources. The overall 528→701 geometries and 90→99 textures are not themselves a demonstrated leak, but this one-way scene sequence cannot demonstrate a world-loop plateau either. Final-versus-initial heap percentages would be misleading retention evidence.

The later paused [geometry inventory with rower](../evidence/runtime-geometry-memory-with-rower-06.json) counts **151,046,764 unique backing-buffer bytes**, 2,514 CPU geometry objects and 24 instantiated characters, with city resident Bram not instantiated. It was collected outside timing and cannot establish timed resident visibility/activity. The preserved earlier inventory counted 23 characters because its character list omitted the rower; rower buffers were already counted under the ferry, so the global byte union is unchanged. Overlapping inclusive root totals must not be summed. This excludes textures, skeleton/animation allocations, unknown caches, ordinary objects and transient peaks; it is neither process nor GPU memory, nor additional bytes to blindly add to the heap counter.

## Comparability and gate decisions

Older sustained `performance-05` records used build `7hgK5CKM`, viewport **920×668**, internal **805×584**. Paired diagnostic `profile-control-06` / `profile-sector-06` used `EN8KKUz1` / `CeBVBOAx`, that same smaller configuration, profiler **on**, and only **one 30 s run** per scene. Current internal pixel count is about **50.1% larger**. Content/build and instrumentation also differ. Thus current lower FPS neither disproves sector optimization nor establishes regression; current lower observed heap does not prove a particular fix eliminated the prior peak. The old forest aborted attempt remains a retained failure; this declared detour's completion does not erase that obstruction or certify every approach.

| Frozen gate | Decision | Remaining evidence |
|---|---|---|
| P1 | UNVERIFIED overall | Hardware/configuration provenance substantially improved; refresh/vsync, representative busy-city baseline and complete required scene/loading budgets remain open. |
| P2 | FAIL for 60 FPS target; narrow sampling contribution accepted | All four routes meet three × 60 s protocol, but none reaches 60 FPS. No matched baseline/candidate at this resolution, and current market is not a busy-workload certification. |
| P3 | UNVERIFIED overall | Numeric weaker-mode aims supported on these routes, with the isolated stall disclosed. Busy activity, meaningful dragon coverage, actual input responsiveness and matched High/usable-mode fidelity/system preservation remain unverified. |
| P4 | UNVERIFIED overall | Sampled heap is within allowance; true peak, settled three-journey retention, process/GPU usage, cold/warm loading limits, shader/upload logs and save/context integrity are not established. |

The sampler sets `.12`; `cityActivityAt` places residents in **home/rest**, with exterior rendering still possible. It does not exercise settled work contacts or an errand transition. Resetting world elapsed time and scene placement before each run also prevents a continuous journey claim. The bank route is one short Vesper scene, not both dragons' full encounters; home and high-quality performance are absent here. No acceptance criterion is relaxed.

**Largest remaining performance-evidence gap:** the functioning living world has not been measured under its active city workload and repeated continuous travel. The 60 FPS shortfall is real, but further optimization needs a representative baseline first.

**Next bounded experiment:** on one frozen build/configuration, run the separately disclosed work `.30` and errand-transition `.52` fixtures specified in [journey protocol 07](../journey-protocol-07.md): three 60 s market walks each, 10 s warmups, fixed settling/restoration procedure, raw intervals/resources and before/after resident activity/visibility/blocked counts. Preserve `.12` as a different workload; reject “busy” labeling when residents fail to arrive or finish traveling early. Then use the accepted contiguous journey route for three-loop post-cleanup retention and cold/warm budgets. Do not spend the next cycle comparing FPS across unmatched resolutions.

