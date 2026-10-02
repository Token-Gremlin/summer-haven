# Water and nature runtime evidence — round09

Latest scope: improve the existing world's water, trees, grass and nature. No
world expansion. PR #3 is the complete previously published snapshot and was
merged by the owner; this round remains on local `polish/water-and-nature`.

## Retained versions and results

- Baseline `BoqztZFN`, source `59516f8` in owner merge `bbb185b`.
- C `D_QWdtrh`: connected/shared water family, varied existing tree crowns,
  curved grass/understory and baked shore color.136 tests passed in88.707s.
- E `CxmM6m5Y`: reflection taper at the village/valley transition, corrected
  paddy edge coordinates, quieter terrain stone near the upper bank. Strict
  TypeScript/production build passed. Matched C/E lip comparison independently
  approves removal of the fine mottled stripe **in that static view only**.
- F `r5qESWPu`: village birds/insects honor scenery draw distance, keep their
  simulation running, and remain available in full visibility. Daytime zero-alpha
  fireflies no longer draw; evening fireflies fade at the selected range. Two
  focused state/visibility tests and TypeScript/build passed.
- G `CJdJTmIC`: smaller, quieter interrupted water crests and more localized,
  broken impact foam, reusing the existing noise fields. TypeScript/build passed.
  Fresh independent neutral review prefers G in impact/join/upper-channel views,
  ties the complete fall view, and retains the geometric-bank/impact craft gap.

No new Blender source was authored in this round: the changes so far address
runtime water, existing vegetation geometry and terrain shading. Existing
authored gorge/creature assets remain integrated and unmodified.

## Static comparisons

`nature-09/comparison-b` retains eight neutral baseline/C pairs, with narrow
preferences documented in `reviews/nature-09-b.md`. `comparison-g` compares C or
E with G at four matching locations. Camera/target, viewport1280×720, internal
1600×900, DPR1.25, time.18, fixed shader clock84 and High overrides (AA1,
shadow1024, reflections off) match. Creature pose and residency are not matched.

G mapping, revealed after the independent preference: R19/R83/R25/R56 are G;
R48/R62/R71 are C and R34 is E. The full waterfall pair is a tie. Water is calmer;
the overall gorge remains below the complete artistic target.

Do not use invalid captures as comparisons: `invalid-delayed-upper-bank`,
the original occluded baseline impact/lip views (use the `-clear` versions),
`invalid-viewport-g-falls-impact` and `invalid-camera-g-falls-impact`. They are
retained with metadata rather than discarded. G's corrected capture guards the
declared camera during capture and restores its normal update afterward.

## Moving routes and recording limits

Four E recordings cover High daylight river, High evening falls, Low daylight
bank walk and Low evening forest walk. The last two use real keyboard movement
and collision after initial diagnostic placement: all four bank waypoints finish
in24.003s, all six forest waypoints in21.105s. Raw traces and WebM recordings are
retained. Static camera comparison placement is not a connected journey.

The C daylight river recording exposed a planar-reflection transition; the E
revision tapers the planar contribution into the analytically reflected regional
river. Videos and five-second contact sheets are retained. Root and independent
review inspected actual stills/sampled frames; **continuous playback and audio
listening were not completed**. No flicker-free, audio, whole-world collision or
complete-journey approval follows. G additionally records 22.028s of High daylight
water at the fall and 18.018s of Low evening upper-channel water, with scripted
camera sweeps and natural advancing shader time. Actual live screenshots and a
four-second contact sheet were inspected; no new browser console error was
recorded. These remain sampled visual inspections, not completed continuous
playback/audio approval or performance benchmarks.

## Rejected village-bank experiment H

Build `BREv_8qC` integrated a local replacement of village-ground triangle pieces
along the existing river at Z−132..−112. Four focused bank tests and 14 relevant
water/trail/wildlife checks passed; TypeScript/build passed. It closed the tested
water-edge gaps with no additional draw call and only 1,344 extra triangles.
However, actual `candidate-h-river-join.png` shows a conspicuous raised dark bank:
the refined dry edge drops back to the old coarse mesh too quickly. **Rejected
visually.** Passing numeric contact tests is not acceptance. A revision is in
progress to follow the unchanged dry physical surface inside the affected
triangles while preserving the external mesh and portal edge. Keep H's image,
metadata and test findings as failed-experiment evidence.

## Matched performance and follow-up

Original raw data is in `nature-09/performance-baseline.json` and
`performance-candidate.json`; `performance-summary.json` is reproducibly generated
by `tools/qa/summarize-nature-performance.mjs`. Same appearance, declared input
routes, hardware, viewport1280×720/DPR1.25 and Low internal1120×630. Nearby90m,
vegetation.3, shadow512, AA1, post/reflections off, clock.12 frozen. Three60s
windows after10s warmup per scene, one active game, no capture/build/test/Blender
work during timing. Occasional compact progress reads; one brief source read
during the original baseline window is disclosed. Baseline then candidate,
not randomized/interleaved. Resource residency and caches differ.

| Scene / build | Pooled FPS | p95 ms | Maximum ms | >50ms / >100ms |
|---|---:|---:|---:|---:|
| Forest baseline |36.389|34.7|124.9|2 /1|
| Forest E |36.506|34.6|326.3|5 /2|
| Falls baseline |43.975|27.9|138.8|3 /1|
| Falls E |43.886|27.9|76.4|1 /0|
| Forest F follow-up |37.179|28.0|62.5|4 /0|

E's original severe forest interval remains in the evidence. Separate instrumented
`diagnostic-forest-profile-e.json` localizes a later150ms CPU scene-pass maximum;
`diagnostic-forest-draw-e.json` records slow village bird/insect and initial
river/mist draw calls. `diagnostic-draw-scene-lookup.md` retains the subsequent
runtime geometry lookup and distinguishes source correspondence from observation.
Unchanged linked-program count does not rule out deferred driver work or establish
the unique cause of the original326.3ms RAF interval.

F then completed three fresh uninstrumented forest runs under matched settings,
three laps each, with maxima62.5/55.5/35.2ms and no >100ms interval. This supports
local recovery; four >50ms intervals remain, and it is not universal neutrality,
a controlled proof of exclusive cause, native1080p/High performance or60FPS.
Raw file: `nature-09/performance-forest-f.json`. The later G material revision
has not inherited a measured performance claim.

Original timed JS heaps remain below the350MB settled/450MB peak numerical
budgets in these samples, but sparse counters and two routes do not approve
loading peaks, GPU/process memory or full-journey retention. Hardware is Intel
UHD0x9BC4/ANGLE D3D11, with8 logical processors and a browser16GB memory hint;
the prior declared CPU is i5-10300H.

## Remaining bounded work

Repair visual bank/terrain contact where rendering diverges from the existing
physical surface, preserving paths, world bounds and populations. The regional
portal also has a physical water/ground mismatch, which a visual-only grid change
cannot fully erase. Keep it explicit rather than covering it with a decal or
extending water into walkable land. Verify the latest integrated revision in
motion and obtain further independent evidence; broad Q4 remains unapproved.

## Current handoff I/J — loop paused on 30 September 2026

The owner explicitly stopped the development loop and requested publication of
all current files. The Goal is paused, not complete. No further diagnostic or
polish iteration is authorized by this handoff. The preceding sections remain
historical records; the shipped runtime is **J `DMYTnp5a`**.

I replaces local village-ground triangle pieces at Z−132..−112 without an
overlay or a raised dike. Dry ground follows unchanged physical terrain with a
tested maximum sample error of 1.262mm. It adds 1,138 triangles, 700 vertices and
43,228 prepared bytes, with no extra draw call. Actual matched bank pixels were
preferred independently over G (neutral L38=I, L64=G), narrowly; craft remains
3/5. The rejected H ridge and its evidence are retained.

J derives camera envelopes from both detail meshes of the existing village
foliage. Six reusable convex hulls form 245 tree envelopes; trunk/player
collision and tree placement are unchanged. At player (43,−116), yaw−.7 and
pitch .5, the prior camera was almost entirely blocked by cedar leaves. J's
actual 1.382m distance makes the character and river visible, but crops the head
and feet. `reviews/canopy-j09.md` accepts this specific static fix only.
`invalid-stale-build-j-bank-south` is explicitly invalid: it captured I before
the new build was copied into the preview. Use `candidate-j-bank-south` instead.

### Validation and recorded movement

TypeScript and the production build passed. The current runtime passed all
146 tests in 97.337s (`nature-09/tests-j.txt`). A later test-only nonzero-wind
fixture passed all four focused canopy tests (`tests-canopy-j.txt`); no runtime
source changed after the full run. This does not claim a new full 147-test run.

The four-waypoint bank walk arrived in 15.453s. Its 22.008s WebM uses ordinary
movement/collision after initial QA placement; 90 sparse samples stayed at 6m
camera distance, so it is passage evidence, not camera-recovery evidence.
One 1.109m position step over a 108.7ms sample interval follows about 400ms of
unchanged positions. That pacing inconsistency is retained; it does not prove
teleportation or uninterrupted fluidity.

A separate 18.040s stationary orbit (yaw−.7→1→−.7) exercises normal camera
collision and smoothing. Its 74 samples span 1.382–6m and demonstrate recovery,
but the inward sweep contracts 3.677m in 255.9ms. Temporal camera comfort remains
unapproved. Actual stills, sampled video frames and raw traces were inspected;
continuous playback and audio listening were not completed.

### J measurements

Three 60s forest/falls windows after 10s warmup use the same hardware, routes,
appearance and Low settings described above: Intel UHD 0x9BC4/ANGLE D3D11,
1280×720 display, DPR1.25, 1120×630 internal, nearby90m, vegetation.3, shadow512,
AA1, post/reflections off and clock.12 frozen. One game ran without screenshots,
recording, builds, tests or Blender during timing. Baseline and J were not
interleaved; residency and caches differ. Village has three new 30s windows and
no matched older timing.

| Scene / J | Pooled FPS | p95 ms | Maximum ms | >50ms / >100ms |
|---|---:|---:|---:|---:|
| Mosswood |36.431|34.6|77.0|24 /0|
| Silverveil |43.940|27.9|62.6|1 /0|
| Village riverside |39.80|27.9|55.4|1 /0|

Forest repeat 2 contains **22 consecutive 69–77ms intervals over 1.65s**, which
the pooled mean hides. The cause and performance neutrality remain unresolved.
Sampled JS peaks of 301.685MiB/303.048MiB for forest/falls are not GPU/process,
loading-peak or repeated-journey memory certification. No 60 FPS, native1080p,
High or full-journey claim follows. Raw data, reproducible summaries and the
independent audit are included in `performance-candidate-j.json`,
`performance-summary-j.json`, `performance-village-j.json` and
`reviews/nature-verification-09.md`.

A separate 90.010s instrumented forest profile completed before the pause.
`diagnostic-forest-profile-j.json` preserves it as raw diagnostic evidence,
without a new performance verdict or a continued investigation.

### Remaining work, only if the owner resumes

Investigate the forest burst and abrupt inward camera correction; improve the
regional portal/bank mismatch and waterfall pool contact. The world remains the
same size. Broad artistic acceptance, continuous motion/audio and the complete
journey remain open. See [the handoff](../HANDOFF-09.md) for the delivery state.
