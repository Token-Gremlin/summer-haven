# Independent nature verification 09

Date: 2026-09-30. Independent audit of retained evidence, with no production-source, Git, runtime, browser, build, test or Blender changes. Scope follows `nature-focus-09.md` and the latest human instruction: improve water/trees/grass/nature inside the existing world; do not enlarge it. Read `OBJECTIVE.txt`, `acceptance-v1.md`, `reference-evidence.md` and the earlier independent `nature-09-b.md`. Reference principles here are taken from the documented observations; this reviewer did not newly view the remote reference pixels.

**Decision: the matched lip still supports a narrow static defect-correction pass. The complete nature contribution remains UNVERIFIED, with an actionable performance-tail regression in the retained measurements and missing continuous-motion/audio inspection. No full Q4, 60 FPS, journey or integrated-world approval follows.** Earlier neutral review B remains the authority for its broader old/new static preferences; I did not redo that entire packet or infer its result from filenames.

## Independent performance recomputation

Read the full raw `evidence/nature-09/performance-baseline.json` and `performance-candidate.json`; recomputed every distribution directly from `runs[].samples`, without using the helper summary. Each sample sum equals its run's `actualMs`. Quantiles below use sorted samples at zero-based `floor(N*q)`; FPS is 1000 divided by mean interval. Intervals measure RAF frame delivery, not GPU execution time.

| Scene/build/run | N | Mean ms | FPS | Median ms | p95 ms | p99 ms | Min ms | Max ms | >33.3 / >50 / >100 ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Forest baseline 1 | 2185 | 27.467 | 36.407 | 27.8 | 34.7 | 34.8 | 13.8 | 124.9 | 129 / 2 / 1 |
| Forest baseline 2 | 2182 | 27.508 | 36.353 | 27.8 | 34.7 | 34.8 | 20.6 | 35.0 | 131 / 0 / 0 |
| Forest baseline 3 | 2185 | 27.467 | 36.407 | 27.8 | 34.7 | 34.8 | 13.9 | 35.0 | 149 / 0 / 0 |
| Forest candidate 1 | 2182 | 27.502 | 36.361 | 27.8 | 34.7 | 34.8 | 7.1 | 326.3 | 134 / 3 / 2 |
| Forest candidate 2 | 2195 | 27.345 | 36.569 | 27.8 | 34.6 | 34.8 | 13.9 | 55.5 | 116 / 1 / 0 |
| Forest candidate 3 | 2196 | 27.333 | 36.586 | 27.8 | 34.4 | 34.8 | 20.6 | 55.6 | 110 / 1 / 0 |
| Falls baseline 1 | 2639 | 22.739 | 43.977 | 20.9 | 27.9 | 28.0 | 6.7 | 138.8 | 5 / 3 / 1 |
| Falls baseline 2 | 2642 | 22.719 | 44.017 | 20.9 | 27.9 | 28.0 | 13.7 | 34.7 | 2 / 0 / 0 |
| Falls baseline 3 | 2636 | 22.763 | 43.932 | 20.9 | 27.9 | 28.0 | 7.1 | 41.5 | 4 / 0 / 0 |
| Falls candidate 1 | 2634 | 22.782 | 43.893 | 20.9 | 27.9 | 27.9 | 7.0 | 76.4 | 2 / 1 / 0 |
| Falls candidate 2 | 2633 | 22.789 | 43.882 | 20.9 | 27.9 | 27.9 | 13.7 | 41.8 | 2 / 0 / 0 |
| Falls candidate 3 | 2633 | 22.788 | 43.882 | 20.9 | 27.9 | 27.9 | 13.7 | 34.7 | 1 / 0 / 0 |

Pooled forest mean is 27.481 → 27.393 ms (−0.32%; 36.389 → 36.506 FPS); pooled falls 22.740 → 22.787 ms (+0.20%; 43.975 → 43.886 FPS). These very small differences do not establish a meaningful speed gain or sustained extra rendering cost. They also do not excuse the worst frames: forest >50 ms counts rise **2 → 5**, >100 ms **1 → 2**, and maximum **124.9 → 326.3 ms**. Falls tails improve in this sample (>100 ms 1 → 0). Both scenes remain below the 60 FPS target; candidate forest p95 is about 34.6 ms and falls 27.9 ms.

The candidate forest's extra 326.3 ms interval is sample index 18, ending 909.4 ms into repeat 1, immediately after index 17's 124.9 ms interval ending 583.1 ms. Baseline repeat 1 also has index 17 = 124.9 ms, ending 576.2 ms, but no corresponding 326 ms interval. Nearest approximately one-second trace positions are very close: baseline (212.714, −507.516), candidate (212.750, −507.538). This is an early-route hitch under comparable placement, not an outlier that can be deleted to obtain approval. Neither build repeats >100 ms in forest runs 2/3, but candidate runs 2/3 each still contain a 55.5/55.6 ms frame where baseline maxima are 35 ms. The data do not identify compilation, loading, GC, driver work or outside-process activity as the cause. Unsynchronized draw counters cannot establish that cause either. Preserve this evidence and investigate with separately labeled diagnostics; an instrumented follow-up must not replace these original runs.

### Comparability and limits

- Baseline build `BoqztZFN`, candidate `CxmM6m5Y`. Baseline ran 03:22:17.568–03:29:17.945 UTC, then candidate 03:30:13.192–03:37:13.509 UTC. This is ordered baseline-then-candidate, not interleaved randomized testing. Thermal/cache/background drift remains possible.
- Root appearance, hardware, declared routes, method, viewport and DPR are identical by structured comparison. All corresponding run settings and internal render dimensions match. Same feminine Haru outfit/accessories; Windows Chrome 154; Intel UHD 0x00009BC4, ANGLE D3D11; reported deviceMemory 16 GB, 8 logical processors. Browser memory hint is not a measured exact RAM inventory; CPU model, driver version, exact refresh/vsync and process/GPU memory are absent.
- Display 1280×720, DPR 1.25, **internal 1120×630**. Low, nearby/distance 90, vegetation 0.3, AA 1, shadows 512, resolution 0.7, post/reflections off, freezeTime true. This is reduced-resolution Low evidence, not native display resolution or High performance.
- Each build has three 60-second runs per scene after declared 10-second warmup. Method declares keyboard walking with camera steering, no clock jumps, recording, screenshots or profiling. Coordinator reports one active game and no build/test/Blender activity during timing; occasional compact progress reads and a brief source read during baseline sample 1 are disclosed outside the raw capture. I did not supervise those timed windows.
- Both versions record three timed forest laps and two falls laps in every run. Routes and one-second sampled position ranges agree closely; traced travel is approximately 130–132 world units per forest run and 132 per falls run. First forest baseline ends slightly earlier along the route; sampled states are not perfectly synchronized. `warmupLaps: 0` and continuing geometry-count growth show that a ten-second warmup did **not** previsit/cache the complete scene route.
- Resource residency is not identical: forest baseline starts/ends at 369/521 geometries with 43 textures, candidate 282/423 with 35; candidate later reaches 43 textures in falls. Those counts do not prove missing content or identical residency. They weaken a strictly controlled resource-cost attribution. Population/settings claims need the separate state/contract evidence; this raw benchmark does not enumerate inhabitants or wildlife.
- Highest sampled used JS heap is 310.55 MB baseline / 315.55 MB candidate. Later candidate forest/falls values are roughly 249–255 MB versus baseline roughly 228–235 MB. Observed values fit the stated 350 MB settled / 450 MB peak budget, but sparse heap samples, different GC timing and geometry residency cannot prove a peak ceiling or absence of leaks. No three-world-journey cleanup test, loading budget or process/GPU-byte accounting is present.

**Performance disposition:** typical Low frame delivery is locally comparable and exceeds 30 FPS mean in both scenes, but the forest tail regression is actionable and unexplained. Check 5 cannot yet receive an unconditional neutrality pass. P2's 60 FPS target is missed; full P1/P3/P4 remain unverified by these two routes.

## Actual image inspection

Opened actual `candidate-c-falls-lip.png` and `candidate-e-falls-lip.png`. This is a disclosed chronological causal check, not blinded preference. JSON confirms identical camera, target, view, 1280×720 viewport, DPR 1.25, 1600×900 internal, High overrides (AA 1, shadows 1024, reflections off), time 0.18 and visualClock 84; builds differ `D_QWdtrh` → `CxmM6m5Y`. Creature pose/position and minor water-mark differences are excluded.

The earlier C image has a conspicuous fine speckled stripe along the sloped ground immediately left of the tan path, especially from upper-center down toward lower-left. E largely removes that noisy strip, leaving a smoother slope transition. The path remains legible and visible foliage is retained. **Narrow static lip-strip correction: PASS.** This does not prove the cause, remove the hard angular shore profile, or verify the actual upper-surface-to-falling-sheet transition, which this camera barely shows. Large folded leaf forms remain visible near the top of the path.

Opened all four E contact sheets, sampled at the supplied five-second intervals. The actual `.webm` files are retained, and their initial/trace JSON was read, but I did **not** play continuous video or listen to audio. I therefore cannot certify absence of crawling, brief overlap flashes, reflection clamp bands during movement, wind instability, shader errors, dropped-video frames, animation defects or audio mixing. `continuousRealTime: true`, advancing worldSeconds and `audioState: running` describe capture/state; they do not substitute for that inspection.

| Recording / metadata duration | Viewed sample observations |
|---|---|
| High daylight river / 26.04 s | Teal/blue river stays readable across the sampled camera positions, with broad pale surface curves. Near bank has a hard green vertical edge and the far bend exposes a conspicuously dark angular bank wedge in some views. Ground tufts remain sparse and evenly isolated. These are observable craft gaps, not proven new regressions without a matching old motion capture. |
| High evening falls / 22.04 s | Bright falling sheet reads as focal point against dark violet terrain; calmer teal pool is distinct. Impact is still a broad regular graphic band and the foreground water boundary is polygonally sharp. Dark scene lighting limits close ground/plant judgment. No convincing spray/impact dynamics can be approved from four sampled frames. |
| Low daylight bank walk / 30.04 s | Open path, water and avatar remain visible through both walking directions; the earlier dense lip stripe is not conspicuous in these samples. Smooth broad bank slopes still have abrupt facets and thin dark triangular cuts in oblique views. Water curves are oversized relative to the narrow route. |
| Low evening forest walk / 32.03 s | Route remains legible and wildlife visible as camera/player traverse the glade. Large dark canopy masses sit over a thinly dressed floor; foreground/midground natural grouping and shape variation remain limited. Wildlife location changes are visible between frames, but no behavior-cycle or contact approval follows. |

High recordings use AA 4/shadows 2048/reflections on, resolution 1, distance 240 and vegetation 1; Low recordings use the same Low settings as the performance runs. All use display 1280×720/DPR 1.25, High internal 1600×900 or Low 1120×630, build `CxmM6m5Y`. Daylight is 0.18, evening 0.92; world time-of-day is frozen while worldSeconds advances. High recordings rotate the camera around a stationary player; they are not travel evidence. These clips cover quality/day/evening combinations across different scenes, not every scene at every combination.

## Raw walking-route audit

Read all entries of `candidate-e-bank-walk.json` and `candidate-e-forest-walk.json`. Both end `done: true`, `reason: arrived`; every trace entry is `play`. Bank visits all four alternating endpoints (356, −760)/(356, −746) in 24.003 s across 240 entries; sampled horizontal path length 54.98, maximum adjacent step 0.343, ending 0.358 from final target. Forest visits all six prescribed points from the glade out to (214, −508.286) and back toward (196, −492) in 21.105 s across 211 entries; sampled length 49.04, maximum step 0.375, final target distance 0.384. No discontinuous position jump is visible in these sampled traces. Recordings continue after route completion, so video and route durations appropriately differ.

This supports completion of two short local input routes, consistent with the supplied keyboard method and viewed samples. It does not establish all collision contracts, save compatibility, a complete waterfall approach/outlet journey, or J1/J2 across the world. Initial diagnostic placement is separate from these local walks. I did not rerun tests or audit geometry/population budgets; focus checks 3/4 require their own retained evidence.

## Largest remaining gap and next evidence

The largest visible nature gap remains **water/terrain contact and localized waterfall structure**: planar bank cuts, the narrow upper-channel profile, broad generic surface curves and the regular impact strip. These prevent the coherent land/water hierarchy described by official reference N2. Preserve the calmer teal family and open navigation while refining those existing contacts; adding regions or increasing scatter density would not address the problem. The lip fix is a useful local contribution but does not lift the remaining bank/impact surface craft to Q4's 4/5 requirement. Q1/Q2 show local progress; complete W5/Q3/Q4 remain unverified or below target.

Next review needs actual continuous playback/listening of the retained recordings and connected close views of the existing upper river → lip → curtain → pool → outlet, including camera approach through the corrected stripe. Separately isolate the first-route forest hitch and the two later >50 ms frames with comparable fresh-load state and separately retained diagnostics. Do not average away these frame tails, treat a screenshot as motion proof, or convert the two short local routes into a full journey pass.

## Addendum A — separate diagnostic/source audit, 2026-09-30

After the preceding decision, the coordinator supplied `diagnostic-forest-profile-e.json`, `diagnostic-forest-draw-e.json`, a local Wildlife rendering fix and a report of passing build/tests for `r5qESWPu`. I read the diagnostic files, `tools/qa/draw-diagnostic.js`, `src/world/wildlife.ts`, relevant `src/main.ts`/material shader sections and `tests/wildlife-visibility.test.ts`. No test, build, runtime or browser was started by this reviewer. **This addendum does not replace the original twelve runs, and no new uninstrumented candidate result has yet been audited here.**

The profile is explicitly instrumented: its steady CPU scene-pass maximum is 150 ms, frame-total maximum 159.4 ms; GPU scene samples average 15.177 ms with maximum 29.125 ms. GPU results are delayed and pending queries remain; independently aggregated maxima are not a time-aligned causal trace. CPU submission/waiting and asynchronous GPU execution must not be summed into a fabricated frame breakdown.

The draw wrapper times actual `renderBufferDirect` calls and retains calls above 8 ms. It records 859,161 calls and five slow entries, without exhausting its 500-entry retention cap. Initial river and impact-mist draws cost 44.0 and 30.9 ms. Later anonymous geometry IDs 37184, 37221 and 37226 cost 78.1, 17.2 and 71.2 ms at 10.494, 10.573 and 14.266 seconds; the player is near the forest route turn/return. Program count remains 99 throughout. The coordinator identifies these later geometries through scene lookup as village bird wing, dragonfly body and firefly Points. Their counts/material masks are compatible with that reading and the source, but the retained draw file has empty names/parents and lacks object world positions or an ID-to-object manifest. Consequently the exact geometry association and approximately 500-unit object distance are **coordinator-reported**, not independently reconstructed from this file. Preserve the scene lookup if that attribution is used as durable causal evidence. The helper's `indexedTriangles` field is only count/3 and is misleading for Points; 16.667 means 50 point vertices here, not fractional triangles.

A slow CPU draw call may include driver waiting or resource setup; unchanged program count does not rule out upload, driver specialization/late compilation or other work. These diagnostics identify a plausible avoidable submission path, not proof that this path alone caused the original 326.3 ms interval. Initial slow river/mist draws also prevent attributing every delay to distant wildlife.

The local correction is appropriately narrow by source inspection. Existing birds and dragonflies use IDs 7 and 17, already subject to `uWorldRange` fragment coverage fade. `main.ts` now supplies `ranges.end`; coarse visibility is removed only beyond that end plus conservative object radius and one unit. `drawDistance >= 1000` preserves full visibility. Bird flight state and insect motion are updated before the visibility decision, so hiding does not stop their simulation. Firefly Points gain a matching horizontal range fade and a conservative sphere margin for shader sway; daytime invisibility skips a draw whose original night alpha would already discard it. The explicit reversed smoothstep is replaced with a well-defined inverse form. The source currently keeps the wildlife group/points at identity transform, consistent with using its local point coordinates as world coordinates.

The two tests check distant rendering suppression, full visibility/nearby restoration, day/night fireflies and a startled bird completing flight while culled then reappearing at home. These are useful behavior checks, not screenshot or motion approval. I inspected their assertions but did not independently rerun them. No obvious source-level regression was found in the narrow change. Boundary fade/pop appearance still needs actual moving inspection, and the reported passing build is not proof that the frame-tail problem is resolved. Await the separate three-run uninstrumented forest record before changing the performance disposition.

## Addendum B — uninstrumented forest F verification, 2026-09-30

Independently read and recomputed all raw samples in `performance-forest-f.json`, build `r5qESWPu`, recorded 03:48:38.401–03:52:08.533 UTC. The three original baseline and three E forest runs remain intact and remain reported above. F declares the same three 60-second runs after ten-second warmups, no profiling/recording/screenshots/clock jumps. It is complete, `running: false`, `error: null`, with three timed laps per run and null profile records. Coordinator reports no build/test/capture/Blender process during timing, only compact progress reads; this reviewer did not supervise the timed windows.

Structured comparison by field (ignoring JSON property order) confirms identical appearance, reported hardware, viewport/DPR, method, per-run settings and 1120×630 internal resolution to baseline. F's single route exactly equals the original Mosswood route. Trace positions/speeds agree with traversal of that route and the same turning area. This remains the same Low configuration, not High or native-resolution evidence.

| F forest run | N | Actual ms | Mean ms | FPS | Median ms | p95 ms | p99 ms | Min ms | Max ms | >33.3 / >50 / >100 ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 2219 | 60016.0 | 27.046 | 36.973 | 27.8 | 28.1 | 34.8 | 13.8 | 62.5 | 108 / 3 / 0 |
| 2 | 2228 | 60002.0 | 26.931 | 37.132 | 27.8 | 28.0 | 34.8 | 7.0 | 55.5 | 90 / 1 / 0 |
| 3 | 2246 | 60002.2 | 26.715 | 37.432 | 27.7 | 28.0 | 34.7 | 20.2 | 35.2 | 74 / 0 / 0 |

Raw sample sums agree with actual duration within floating-point rounding. Pooled F: 6,693 frames / 180.0202 s; **26.897 ms mean / 37.179 FPS**, p95 28.0 ms, p99 34.8 ms, max 62.5 ms. Mean is 2.13% lower than baseline and 1.81% lower than E. Pooled >33.3 ms count falls from baseline 409 / E 360 to F 272; >100 ms from baseline 1 / E 2 to **F 0**. Thus the E 326.3 ms severe hitch does **not** recur in these three F runs, and the measurements support local recovery after the fix.

Residual tails must remain explicit: F still has **four >50 ms frames**, compared with baseline two and E five. In F run 1 these are 55.6 ms at elapsed 583.3 ms, 62.5 ms at 2,985.6 ms and 55.4 ms at 3,041.0 ms; run 2 has 55.5 ms at 8,762.0 ms. Run 3 has none. p99 stays approximately 34.8 ms. A claim of perfect smoothness or elimination of all hitches is not supported.

Residency remains different: F has 26 textures throughout and geometry count grows from 273 initially to 360, then stays 360; E forest had 35 textures/423 final geometries and baseline 43/521. This is compatible with avoiding distant submissions, but resource counts alone neither prove that interpretation nor establish identical loaded content. Highest sampled F used heap is 322.89 MB; final used values are 309.99 / 255.82 / 260.08 MB. These samples fit the earlier stated heap budget, with clear GC/residency variation; they do not prove peak bounds or long-session leak safety.

**Updated performance disposition:** the large E forest-stall regression has measured local recovery in F, and no sustained mean-cost increase is observed on this particular Low forest route. The extra >50 ms tail relative to baseline, sequential run ordering and different resource residency remain qualifications. This is evidence for the focused rendering correction, not proof of exclusive causation, unconditional runtime neutrality, 60 FPS, other scenes or High performance. Falls results above still belong to E; F falls has not been measured in this packet. Existing continuous-motion/audio, close water-contact, integrated Q4 and journey gaps remain unchanged. The original opening verdict describes E; this addendum is the latest, narrower F performance finding.

## Addendum C — current J evidence verification, 2026-09-30

Current audited build is **`DMYTnp5a`**. Read and independently recomputed all raw intervals from `performance-candidate-j.json` and `performance-village-j.json`, plus all entries of `candidate-j-bank-route.json`, `candidate-j-low-bank-walk.json` and `candidate-j-low-canopy-orbit.json`. Read both camera summaries, the separate independent `canopy-j09.md` review and retained test-result records. No production edits, tests, browser, Blender, heavy workloads or fresh capture were performed. Earlier decisions and raw files remain intact; this addendum supersedes F's performance disposition for the current build.

### Matched forest/falls performance

J's forest/falls record runs 04:27:33.929–04:34:34.234 UTC: three 60-second samples after ten-second warmups per scene. All raw sample sums equal recorded duration within floating-point rounding. By structured field comparison, appearance, hardware, method, both route waypoint arrays, viewport/DPR, all per-run settings and internal dimensions match baseline exactly; forest also uses F's same route/settings. Low, 1280×720 display, DPR 1.25, **1120×630 internal**, distance 90, vegetation 0.3, shadows 512, AA 1, post/reflections off. All forest runs record three timed laps; falls two. Warmup laps remain zero. Completed records have no reported error or active profiling.

Coordinator reports one active game and no screenshots/video/build/test/Blender/authoring during timing, only compact progress reads; another reviewer only read/wrote its review. This is a disclosed execution report, not something independently monitored by this auditor. Sequential order and changed session/resource state remain comparison limitations.

| J scene/run | Frames | Mean ms / FPS | p95 / p99 ms | Max ms | >33.3 / >50 / >100 ms |
|---|---:|---|---|---:|---|
| Forest 1 | 2201 | 27.271 / 36.669 | 34.6 / 34.8 | 69.5 | 118 / 2 / 0 |
| Forest 2 | 2159 | 27.798 / 35.974 | 34.7 / **69.3** | 77.0 | 137 / **22** / 0 |
| Forest 3 | 2199 | 27.286 / 36.649 | 34.6 / 34.8 | 48.7 | 122 / 0 / 0 |
| Falls 1 | 2637 | 22.759 / 43.938 | 27.9 / 27.9 | 62.6 | 8 / 1 / 0 |
| Falls 2 | 2636 | 22.763 / 43.932 | 27.9 / 27.9 | 41.6 | 8 / 0 / 0 |
| Falls 3 | 2638 | 22.753 / 43.950 | 27.9 / 27.9 | 41.7 | 9 / 0 / 0 |

Pooled J forest is **6,559 frames / 180.041 s, 27.449 ms / 36.431 FPS**, median 27.8, p95 34.7, p99 34.8, min 13.8, max 77.0; >33.3/50/100 counts **377/24/0**. Its mean is approximately 0.11% lower than baseline 27.481 ms, but 2.05% higher than F 26.897 ms. This nearly unchanged baseline mean does not establish neutrality: **>50 ms intervals increase from baseline 2 and F 4 to J 24**.

Crucially, J forest run 2's 22 long intervals are contiguous, sample indices **1244–1265**, from interval start 34,090.6 ms to end 35,743.0 ms: approximately **1.65 seconds of consecutive 69.3–77.0 ms delivery**. This is a sustained local burst, not 22 widely scattered isolated frames. Nearby traces put the player from approximately (200.0, −497.9) to (201.4, −499.9), with speed about 2.35; geometries/textures remain 606/102. Pooled p99 masks the burst, whereas run 2 p99 exposes it. The original >100 ms E hitch does not recur, but current forest tail quality has an actionable unresolved increase. The records do not establish whether canopy work, terrain changes, garbage collection, driver state or unrelated system activity caused it. Do not remove this run or infer cause from the draw counters alone.

Pooled J falls is **7,911 frames / 180.041 s, 22.758 ms / 43.940 FPS**, median 20.9, p95/p99 27.9, min 6.8, max 62.6; counts **25/1/0**. Mean differs from baseline 22.740 ms by only about +0.08%; >50 ms is baseline 3 → J 1, while >33.3 ms is 11 → 25. There is no matched F falls record. These remain local Low measurements, with the 60 FPS target missed.

### Village performance and memory limits

The separate village record runs 04:35:05.630–04:37:05.785 UTC, **three 30-second samples** after ten-second warmups on a new riverside loop: (43,−128) → (43,−116) → (44,−112) → (44,−128) → (43,−128). Each records two timed laps. Same appearance/hardware/settings/render dimensions are confirmed. Duration and route intentionally differ from the older forest/falls protocol. There is no matched old village performance; this cannot quantify canopy-fix cost or satisfy P2's 60-second minimum for village.

| J village run | Frames | Mean ms / FPS | p95 / p99 ms | Max ms | >33.3 / >50 / >100 ms |
|---|---:|---|---|---:|---|
| 1 | 1195 | 25.111 / 39.823 | 27.9 / 28.1 | 41.5 | 9 / 0 / 0 |
| 2 | 1192 | 25.169 / 39.732 | 27.9 / 34.7 | 55.4 | 19 / 1 / 0 |
| 3 | 1196 | 25.102 / 39.838 | 27.9 / 28.0 | 34.8 | 8 / 0 / 0 |

Pooled village: **3,583 frames / 90.031 s, 25.127 ms / 39.797 FPS**, median 27.7, p95 27.9, p99 34.5, min 13.7, max 55.4; counts **36/1/0**. This is useful current-route evidence, not a before/after speed claim.

Observed used JS heap peaks are J forest 316.34 MB, falls 317.77 MB and village 322.30 MB, versus baseline's 310.55 MB and F forest's 322.89 MB. Forest ending used heap is 298.26/297.84/297.25 MB; falls 310.65/296.53/296.05 MB; village 315.09/288.65/292.95 MB. All observed used values fit the stated 350/450 MB limits, but these are sparse samples, not certified settled/peak values. Counts are materially different: J forest textures 102 and geometries 535→602 then 606; falls 119 and 670→696 then 705; village 120/751 stable. Baseline forest had 43/521 final and F 26/360. This is plainly unequal resource residency, even with equal visual settings. The data cannot identify loaded-resource equivalence, prove a leak, certify cleanup plateau or assign memory growth to a particular change. Exact CPU/RAM, GPU/process bytes, long-session cleanup and cold/warm load accounting remain incomplete.

### Bank route and camera trace limits

J's separate bank route reports arrival through all four waypoint indices in **15.453 s**, 154 trace entries, all `play`, ending 0.335 units from its final target. Sampled horizontal path length is about 35.21 units. One anomaly deserves qualification: at 2,400.6→2,509.3 ms the position moves **1.1094 units in 108.7 ms**, while both reported speeds are about 2.35 units/s (which would imply about 0.255 units). This is a timestamp/position inconsistency in the trace; it alone does not establish teleportation or a collision defect. Consequently this audit does not claim the trace proves physically continuous, correctly paced traversal. Route arrival remains supported, and the discrepancy should be reconciled before stronger timing/contact claims.

The 22.008-second bank recording contains 90 samples. Independent camera-to-target distance computation gives 6 m throughout, agreeing with its supplied summary. It therefore does not demonstrate walking-triggered canopy retraction/recovery. The 18.040-second orbit contains 74 samples with a stationary player; distance ranges from 1.381846 to 6 m and returns to the close starting distance. Independent recomputation confirms the largest inward sample transition: **6.0→2.323264 m between 13,534.6 and 13,790.5 ms**, a 3.676736 m correction in 255.9 ms. This warrants focused continuous inspection. Both traces identify J, daylight 0.18 and the same Low rendering settings. A sampled trace cannot certify comfortable motion or disprove intervening clipping. I did not play these videos or hear audio; the separate canopy critic's pixel findings remain attributed to that critic.

`tests-j.txt` reports 146 passing / zero failing tests. `tests-canopy-j.txt` reports four passing / zero failing tests after a nonzero-wind fixture was added. Coordinator reports that addition changes tests only, with build/typecheck passing; this auditor did not rerun or independently certify them. They support their stated contracts, not visual or movement approval.

**Current J disposition:** local static improvements and short-route arrival are supported by their respective evidence. Performance neutrality remains **UNVERIFIED**, with the contiguous forest tail burst requiring investigation. The largest outstanding nature gap remains authored bank/impact craft and the regional physical/contact gap; abrupt inward camera correction remains a concrete temporal concern. Broad Goal completion, Q4 ≥4, continuous motion/audio, full-world journeys, 60 FPS, native 1080p and general memory certification are **not established**. No expansion or publication is implied or authorized by this review.
