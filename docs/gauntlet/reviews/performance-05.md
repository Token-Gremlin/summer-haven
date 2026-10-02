# Independent performance audit — candidate 05

Reviewed 2026-09-30 UTC against the authoritative world objective and frozen [acceptance v1](../acceptance-v1.md), including P1–P4, the evidence contract and Budget addendum A. This review does not change those gates or budgets. Scope is performance evidence and measurement method; no visual, audio, animation, human-input responsiveness or complete-world approval is given.

## Decision

**Narrow contribution accepted:** twelve retained 60-second moving diagnostic samples establish achieved frame-delivery distributions for four local routes at the declared reduced resolution. **Full performance acceptance is not achieved.** All twelve run means miss 60 FPS. The first city run contains a 1,152.4 ms frame and a sampled used-JavaScript-heap peak of 638,627,462 bytes, exceeding the frozen 450,000,000-byte peak ceiling by 41.92%.

| Frozen gate | Decision from this evidence | Reason |
|---|---|---|
| P1 | UNVERIFIED | Hardware/configuration substantially documented, but embedded-browser refresh/vsync, save/seed and fully comparable baseline protocol are absent. Home is not sampled here. Required first-integrated-scene baseline/budget timing cannot be established from these files. |
| P2 | FAIL for the 60 FPS target; sampling contribution accepted with limits below | Three completed ≥60 s runs per named route after stated 10 s warmups; all means below 60 FPS. No matched baseline/candidate experiment establishes an improvement. |
| P3 | UNVERIFIED as a complete gate | Every completed run has mean ≥30 FPS and p95 ≤40 ms. One >100 ms city stall occurred, with none in the other eleven completed runs; that is not evidence of recurring stalls, nor proof they never recur. High-quality comparison, fidelity/system-preservation and ordinary-input responsiveness evidence are absent. |
| P4 | FAIL for measured peak heap; other clauses UNVERIFIED | 638.63 MB sampled used heap breaches 450 MB. No three world journeys with settled cleanup, process/GPU bytes, cold/warm loading budgets/timings, shader/upload traces or save/context-loss validation. |

## Sources and independent calculation

Directly inspected [attempt 1 raw data](../evidence/performance-05-attempt1.json), [attempt 2 raw data](../evidence/performance-05.json), [hardware record](../evidence/hardware-05.json) and [measurement helper](../../../tools/qa/world-performance.js). Parsed every retained interval and memory/position trace; calculated counts, sums, mean/FPS, order statistics, threshold counts, resource ranges and movement independently **before** opening [the supplied summary](../evidence/performance-05-summary.json). The summary agrees with these calculations within floating-point rounding, including its city resource range from initial/final snapshots as well as traces. No builder explanation or claimed summary result was used as the numeric authority. There is no blinded old/new comparison here.

Both raw records identify `http://127.0.0.1:4175/assets/index-7hgK5CKM.js`. Attempt 1 ran 00:17:29.859–00:21:10.468 UTC; it retains three city runs and reports a forest movement-stall failure. Attempt 2 ran 00:24:37.661–00:35:08.057 UTC and retains the remaining nine runs using a declared forest detour. These are two diagnostic sessions on the same named bundle, not one uninterrupted world journey.

All 32,395 retained intervals are positive. Their per-run sums equal the recorded durations; total measured duration is **720.0809 s**. Each run lasts 60.0019–60.0162 s. FPS below is interval count divided by summed elapsed time, not the mean of instantaneous FPS. Quantiles use sorted index `floor(N × q)`, matching the disclosed helper convention; threshold counts use strict `>` comparisons.

| Scene / repeat | Frames | Mean ms / FPS | Median ms | p95 / p99 ms | Min / max ms | >33.3 / >50 / >100 ms |
|---|---:|---:|---:|---:|---:|---:|
| City 1 | 2,268 | 26.46 / 37.79 | 27.7 | 34.6 / 34.8 | 7.0 / 1,152.4 | 130 / 3 / 1 |
| City 2 | 2,300 | 26.09 / 38.33 | 27.7 | 34.7 / 34.8 | 13.7 / 35.0 | 157 / 0 / 0 |
| City 3 | 2,271 | 26.42 / 37.85 | 27.7 | 34.7 / 34.9 | 6.9 / 55.6 | 198 / 1 / 0 |
| Forest 1 | 2,557 | 23.47 / 42.62 | 20.9 | 27.9 / 28.0 | 6.9 / 48.5 | 15 / 0 / 0 |
| Forest 2 | 2,545 | 23.58 / 42.42 | 20.9 | 27.9 / 34.7 | 6.8 / 48.6 | 36 / 0 / 0 |
| Forest 3 | 2,568 | 23.37 / 42.79 | 20.9 | 27.9 / 28.0 | 6.7 / 41.7 | 8 / 0 / 0 |
| Waterfall 1 | 3,023 | 19.85 / 50.38 | 20.8 | 21.1 / 27.9 | 6.9 / 41.7 | 13 / 0 / 0 |
| Waterfall 2 | 3,041 | 19.73 / 50.68 | 20.8 | 21.0 / 27.8 | 6.8 / 41.8 | 4 / 0 / 0 |
| Waterfall 3 | 3,008 | 19.95 / 50.12 | 20.8 | 21.1 / 27.9 | 6.7 / 41.7 | 23 / 0 / 0 |
| Dragon bank 1 | 2,933 | 20.46 / 48.87 | 20.8 | 27.8 / 27.9 | 6.8 / 55.7 | 16 / 1 / 0 |
| Dragon bank 2 | 2,938 | 20.42 / 48.97 | 20.8 | 27.8 / 27.9 | 6.9 / 41.6 | 9 / 0 / 0 |
| Dragon bank 3 | 2,943 | 20.39 / 49.05 | 20.8 | 27.8 / 27.9 | 7.0 / 41.6 | 6 / 0 / 0 |

Scene names are Aldermere market, Mosswood glade trail, Silverveil lower approach and Vesper upper bank. Pooled scene FPS is respectively **37.99, 42.61, 50.39 and 48.96**. Pooled p95 is **34.7, 27.9, 21.1 and 27.8 ms**; pooled p99 is **34.8, 28.0, 27.8 and 27.9 ms**. Total counts are **615 >33.3 ms, five >50 ms and one >100 ms**. These are frame threshold counts; a separately defined stall-event/cluster metric is not recorded.

## Hardware and fidelity boundary

The actual WebGL renderer is **Intel UHD Graphics 0x00009BC4 through ANGLE Direct3D11**, browser UA Chrome 154.0.0.0 on Windows. Hardware inspection records Intel Core i5-10300H, four cores/eight logical processors, Windows 11 Home Single Language 10.0.26200, 16,604,212 KiB visible RAM (15.835 GiB) and Intel driver 31.0.101.2141. Installed GTX 1650 hardware does not establish any NVIDIA-rendered result. The adapter reports 144 Hz, but the embedded-browser display refresh/vsync remains unverified; the frame-interval pattern cannot substitute for that measurement.

Every retained run uses **920×668 CSS viewport, DPR 1.25, 805×584 internal canvas**: Low, resolution multiplier 0.7, shadow setting 512, vegetation 0.3, reflections off, AA setting 1, post off, distance 90, visibility nearby. The helper freezes the time setting and sets normalized time to 0.12. These are diagnostic settings, not native 720p/1080p or a high-quality result. Actual population counts, effective simulation/visibility reductions and fidelity equivalence are not logged, so preservation of essential world systems is not certified. Historical 896×504/1280×720 short samples differ in duration, scene/content and viewport; comparing their FPS directly would not demonstrate an optimization gain.

## Movement, repeatability and collection limitations

- All completed runs contain 58–59 roughly one-second position/memory records. Sampled displacement totals span 124.47–132.87 world units per run; no adjacent trace records are stationary within 0.01 unit. Most recorded speed is near 2.35 units/s, with slower turns. City run 1 records speed zero immediately after the long frame. Sparse traces support actual movement, but cannot prove uninterrupted collision-free motion, animation or response quality between records.
- City traces move on x≈20, z≈−300.3 to −317.7. Forest traces cover x≈196.3–213.7, z≈−492.4 to −508.1 along the detour. Waterfall traces cover x≈320.3–347.7, z≈−703.6 to −688.2. Dragon-bank traces stay x≈356, y=56.02, z≈−746.3 to −759.6. These are short local out-and-back routes, not broad scene coverage or proof of a complete dragon encounter/cycle.
- The helper teleports before each warmup, resets world elapsed time and selected city/habitat/creature systems, holds synthetic forward input and directly steers camera yaw. It leaves the player controller/collision active during route motion. Fixed time, resets and repeated routes reduce variation, but also omit natural arrival/loading and continuing offscreen simulation history. Simulation state/population and creature phase are not sampled, so deterministic intended inputs do not prove equivalent world workload.
- The first attempt explicitly aborts the forest run at reported timing progress 0.361 s for stalled movement. Its partial interval/position history and failure position are not retained. The replacement forest route detours through (201.8, −500.5) and (206, −503.5); it demonstrates traversal of that route, not repair of the obstructed direct route. Keep the failure visible. It must not be silently pooled as if both routes were equivalent.
- `laps` is initialized before warmup and never reset when timing begins. Reported counts (city 4, forest 3, waterfall 2, bank 6) therefore include warmup traversal and are not timed-interval lap counts.
- The current helper includes route and failure-position recording, but the first raw attempt lacks both fields. The exact injected helper version/hash is not preserved. Source inspection explains the intended method; it cannot retroactively fill absent run provenance. Save/seed, per-run clock and camera state are not serialized. The second file does preserve route coordinates; the current helper states pitch 0.22 and camera distance 6.2.
- There are raw RAF intervals and relative trace times, but no per-run wall-clock start, continuous focus/visibility history or independent background-work log. The records declare no screenshots/video during timing and visible/focused state. RAF intervals measure delivered frame cadence, not GPU execution time. The source adds steering, trace sampling and browser-counter overhead; this is part of the recorded workload.

## Memory and the strongest remaining engineering gap

The first city run begins at **633,866,274 used heap bytes** even after the stated warmup. The sixth timed interval lasts **1,152.4 ms**, ending at elapsed **1,270.5 ms**; the first trace at that instant records **638,627,462 used / 696,865,890 total heap bytes**. At 2,291.3 ms used heap is 334,510,898 bytes. A large heap release occurs around the stall, but these samples do **not** identify a garbage-collection, parsing, shader-compilation or upload cause. The run must remain in results. Merely extending warmup would hide the observed stall without showing that ordinary arrival is fixed.

Other sampled peaks are forest **345,177,981**, waterfall **351,435,634** and dragon bank **351,473,554 bytes**. Final used heap ranges by scene are city **338.50–339.92 MB**, forest **337.45–339.66 MB**, waterfall **344.39–347.72 MB**, bank **340.49–351.24 MB** (decimal MB). Some later snapshots exceed the 350 MB settled allowance, including bank run 2's final 351,243,302 bytes. They are not defined post-cleanup settled observations, so a settled-memory pass or definitive retained-growth diagnosis cannot be inferred.

City resource snapshots grow from **334 geometries / 82 textures** at run 1 start to **482 / 92** at its end and **484 / 92** in later runs. Forest has **608 / 96**; waterfall grows **636→651 / 96**; bank has **655 / 96**. Loading/resource creation therefore continues beyond warmup in some scenes, and repeat workloads are not fully settled equivalents. Resource-count plateaus within short repeated scenes are encouraging but do not establish the required three-journey retention plateau. Resource counts are not GPU-byte estimates; approximate browser heap counters are not process memory, and one-second sampling can miss larger peaks.

**Largest evidenced engineering gap:** control and explain the city arrival/resource-allocation burst that breaches peak heap and causes a severe frame interruption, while also reducing its ordinary 26.1–26.5 ms mean toward 16.67 ms. The frame traces alone do not identify CPU versus GPU bottlenecks. Next experiment: profile a reproducible city arrival with timestamped allocation/GC, asset decode/upload and shader events; retain failed and cold arrivals; compare the same build/save/route/camera/population/configuration before and after a targeted fix. Record initial, peak and settled heap plus process/resource measurements. Then perform the frozen three complete world journeys and lock/measure cold/warm loading budgets; do not replace those requirements with more local teleported loops. Recheck the original forest obstruction independently of the detour.
