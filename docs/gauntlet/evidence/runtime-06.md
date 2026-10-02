# Candidate 06 — integration evidence and paused playtest handoff

This is a local contribution checkpoint, not final world acceptance. Candidate
05 (`ac21d2b`, build `7hgK5CKM`) and its failures remain preserved. Measurements
were local; the owner subsequently requested this complete snapshot in a new
GitHub PR for testing, while pausing the development loop. Frozen criteria
remain unchanged and the requested publication does not imply world acceptance.

## Direct paths and retained wildlife state

Three authored bird-support stations moved out of the full trail width plus
player margin. All 32 per-bird supports pass that clearance check. Exact known
old contacts migrate to the corresponding current supports. Unchanged valid
flight state is retained; a flight using a moved contact deliberately restarts
at its departure perch with cycle/cooldown preserved. Arbitrary floating saved
positions are rejected. This is a deliberate phase repair, not continuous
preservation of a flight whose endpoint has moved.

Actual keyboard walking, with scripted camera steering and real collisions,
completed the direct forest centreline out-and-back in 38.0086 seconds and the
ridge out-and-back in 36.7097 seconds. The initial placements were diagnostic;
neither is the required full journey. The continuous recordings and route
traces are `forest-trail-clearance-06.*`, `forest-trail-route-06.json`,
`ridge-trail-clearance-06.*`, and `ridge-trail-route-06.json`. Their build was
`BEBUlrp2`, High with 1024 shadows, reflections off, FXAA/post on, nearby 240,
time .12 frozen, viewport 920×668/DPR1.25, internal1150×835. Concurrent authoring
and profiling make them unsuitable as performance evidence.

The start image revealed a sign obscuring the ordinary forest approach camera.
Its relocation and solid panel/pole proxies are a subsequent change; the
integrated check below must not be attributed to the earlier videos.

## Paired rendering diagnostic

Control `EN8KKUz1` and sector candidate `CeBVBOAx` contain identical current
assets and source except for the distant ridge sector partition. Frozen builds
are under `.cache/releases/candidate-06-{control,sector}`. Hashes are recorded
in `paired-builds-06-hashes.json`. The same disposable encounter save was
restored before each run from a script-free local page; the actual user save
on the development origin was preserved.

Each build used one 10-second warmup and 30-second measured walk per scene,
with the exact same archived `profile-paired-method-06.js`. These are diagnostic
runs with opt-in CPU/GPU instrumentation, not the three-by-60-second sustained
acceptance protocol. Intel UHD/ANGLE D3D11, natural920×668/DPR1.25,
internal805×584, Low/.7 resolution/512 shadows/.3 vegetation/no reflections,
FXAA/no post/nearby90/time.12 frozen. No screenshots, video recording,
Blender renders, builds or tests ran during the timed intervals.

| Scene | Control RAF FPS | Sector RAF FPS | Sector p95 ms |
|---|---:|---:|---:|
| Aldermere market | 37.33 | 42.61 | 27.9 |
| Mosswood glade | 39.87 | 46.51 | 27.8 |
| Silverveil lower approach | 48.69 | 56.92 | 21.0 |
| Vesper upper bank | 46.89 | 54.53 | 21.0 |

Raw samples: `profile-control-06.json`, `profile-sector-06.json`. Independent
review: `../reviews/paired-render-07.md`. All scenes remain below60FPS. The
review found 730.54MB observed peak JS heap in the sector run, exceeding the
450MB budget. Its cause is unverified. Scene GPU work falls, while draw-call
submission generally rises; neither triangle counts nor a single run prove
causal attribution to all observed frame-time differences. Fresh isolated,
reversed-order repeats and settled/peak memory tracing remain required.

Timed lap counts include a boundary crossing for a lap that may have started
during warmup; they are not exact completed timed travel distances. The original
forest detour is retained in this paired method for comparison, even though the
new direct route is separately passable. These traces are not a world journey.

## Same-frame ridge-culling image check

`tools/qa/sky-culling-visual.js` toggles only the 60 actual ridge sectors'
frustum-culling flags, renders the same scene/camera/uniforms/shadow map twice
synchronously with fixed grading time, and restores every flag. It changes no
geometry, simulation state, material, visible scene member or camera between
the two renders. The player was diagnostically placed at496,-960 beforehand.

All48 views (24 azimuths at each of two pitch/quality settings) produced zero
different pixels between submitting every ridge sector and normal culling.
Low uses pitch−.14/internal805×584, High pitch.32/internal1150×835; both retain
the natural viewport and use reflections off. Complete conditions and actual
camera transforms are in `sky-culling-06/rotation-pixels.json`; representative
A/B PNGs and the initial north view are alongside it. A means all sectors,
B means culled. This is an unblinded equivalence check, not an artistic vote.

It supports absence of missing visible ridge pixels in these sampled main
camera frames. It does not inspect a continuous orbit, reflection texture
updates, every terrain altitude, or the artistic quality of the world.

## Build and regression checks

The pre-sign/pre-wardrobe-memory candidate passes117/117 tests in65.1297721s
(`full-tests-06.txt`) and both control/sector production builds. These include
grounded habitat routes, explicit old-save cases, rig cloning, skin deformation,
profiler lifecycle, angular geometry preservation and camera-frustum tests.
No runtime warning/error appeared in the checked sector browser log after the
paired diagnostic. Later source changes require their own checks.

## Integrated build and wardrobe checks

Build `DC1G58qr` includes the sector rendering, revision 2 deer, shared wardrobe
geometry, support migration and forest sign correction. Its JavaScript SHA-256
is `D9775A3C7BC638B6440BC29989E28C6B5DF7694F967C791BF33E70A1B8BC6F94`.
It is frozen at `.cache/releases/candidate-06-integrated`. The production build
and strict TypeScript pass (`build-integrated-06.txt`); all 122 tests pass in
87.033434 seconds (`tests-integrated-06.txt`). The collision fixture contains
6,024 actual runtime proxies (`habitat-collision-integrated-06.json`).

Shared immutable wardrobe buffers replace repeated hidden wardrobe copies;
selected colored garments and independent rigs remain private. The reproducible
74-character accounting comparison measures 52,540,608 fewer backing-buffer
bytes, from 74,707,280 to 22,166,672. This is geometry accounting, not whole JS,
process or GPU memory. The defined population scope excludes the ferry rower.
All 74 recorded geometry/material/local-transform signatures match. Independent
review `../reviews/wardrobe-07.md` accepts the narrow change, without approving
all outfits in motion or repeated runtime lifecycles.

Actual creator controls were used for masculine / textured undercut / open
overshirt / chinos / loafers, then feminine / loose waves / cardigan / pleated
skirt / sandals. Both screenshots are retained. The latter was confirmed using
the UI and survived an actual page reload with identical player and saved
appearance (`appearance-confirmed-06.json`, `appearance-reloaded-06.json`).
These are two representative combinations, not complete character QA.

## Forest camera and junction finding

The ranger note moved from 193,-490 to 191,-494; four existing standing signs
now have separate panel and pole proxies (eight additional obstacles). At
196,-492, ordinary camera yaw -.835, pitch .22, distance 6.2, the relocated
sign no longer obscures the player (`forest-sign-cleared-06.png`).

`forest-camera-return-06.webm` records 48.015 seconds with audio. After 26.1831
seconds standing, real W movement with scripted camera steering completes the
two-waypoint return from 214,-508.286 to 196,-492 in 20.7252 seconds, ending
within the continuous capture. See `forest-camera-route-06.json` and the paired
capture JSON. High, 1024 shadows, reflections off, FXAA/post on, nearby240,
time .12 frozen; viewport920x668/DPR1.25, internal1150x835. Concurrent production
activity means this is not performance evidence. Audio was recorded but not
independently listened to; the route trace alone does not approve camera motion.

The same view exposed an outside-corner gap where independently ended trail
strips meet. Its source correction is a later draft, absent from `DC1G58qr` and
its 122-test record. It requires its own tests, runtime views and critic.

## Connected deer runtime and neutral review

The revision 2 wildlife GLB has SHA-256
`7A36480ABC2D184D6714E80E358E7CA7EC785B3473A78FA7EA16422FDF56AD99`.
`deer-runtime-r2-06.webm` records a 75.0065-second actual encounter with 302
state samples, VP9 video and Opus audio. No animal, clock, pose or player writes
occur during the capture. Initial diagnostic placement and camera settling are
disclosed in its JSON. Five extracted frames are sparse inspection evidence;
they do not substitute for watching the entire motion or listening to audio.

The neutral `deer-comparison-10` packet holds identical saved rest pose and
camera conditions, using the same `CeBVBOAx` runtime with only the old/new GLB
swapped. R is revision 2, U is revision 1; identities were revealed after the
critic's preference. Front, side and three-quarter are the valid views. The
nominal medium view is explicitly excluded because camera collision retained
the same position. Shader wind phase is not synchronized.

Fresh review `../reviews/wildlife-10.md` prefers R but scores current shape,
surface, lighting and coherence at 3/5, composition at 2/5. Eye/muzzle craft,
shoulder transition, slender legs/hoof weight and the repetitive forest canopy
remain material gaps. It grants neither the full artistic nor motion/audio gates.

## Completed sustained integrated measurement

A fresh browser tab began a profiler-OFF three-by-60-second run per scene at
2026-09-30T01:27:49.324Z, with ten-second warmups and the fixed encounter save
restored before boot. Unlike the older natural920x668 viewport, this tab uses
1280x720/DPR1.25 and Low internal1120x630. No viewport override was set. This
larger configuration is declared separately; its FPS cannot be used as a matched
causal comparison against the older 805x584 measurements. No heavy authoring,
builds, tests, recording or screenshots ran during timing.

The run finished at 01:41:50.004Z with all 12 samples complete and no reported
interruption: 27,309 intervals, 720.1715 measured seconds. Aggregate FPS:
city33.09, forest35.27, falls42.04, upper bank41.28. Corresponding p95 frame
intervals are34.8/34.7/27.9/27.9ms. A single city interval exceeds100ms
(111.2ms). All samples miss60FPS. Raw data and independent review are
`performance-integrated-06.json`, `performance-integrated-06-summary.json`
and `../reviews/performance-07.md`.

The frozen .12 city time places residents at exterior home/rest destinations.
It does not exercise busy working/commuting activity. Scene placement and
resets precede warmups; lap counts represent crossings and can include a lap
started during warmup. The original forest detour remains for comparability.
These are disclosed scene measurements, not the full journey.

Maximum observed timed used JS heap is297,127,642B; final value270,918,920B.
One-second counters omit instantaneous peaks, loading/warmup allocation and
post-cleanup retention. Renderer resources grow from528 to701 geometries and
90 to99 textures across initial exposures. P4's complete three-journey plateau
and process/GPU/loading evidence remain open.

After timing ended, the read-only geometry inventory measured151,046,764B of
unique backing buffers. Its first version counted23 enumerated characters but
included the ferry rower's geometry under transport. A corrected rerun lists
Maren explicitly (24 characters, Bram not yet instantiated), with the exact
same total bytes. Both raw records are retained; the corrected method is
`runtime-geometry-method-with-rower-06.js`. These bytes exclude textures,
ordinary JS/skeleton objects, GPU/process allocation and transient peaks.

## Final playtest package

The subsequent `rs5CDbKv` build adds17 outside-corner trail bevels (819 source
triangles) without changing terrain, collision or navigation. Three focused
coverage/ground tests pass, followed by all125 production tests in79.4748883s
and strict TypeScript/build. See `tests-trail-07.txt` and `build-trail-07.txt`.
The game loads and enters the world in the actual browser; its handoff view is
`playtest-handoff-06.png`. The owner paused further iteration before the planned
moving seam inspection, so that visual gate remains explicitly unverified.
The earlier sustained result belongs to `DC1G58qr`, not this later build.

Production assets retain deer revision2. The interrupted revision3 authoring
experiment is archived separately under `tools/blender/wildlife/revision-3-draft`
for the requested full handoff; it is not automatically loaded or approved.
`docs/PLAYTEST.md` describes setup, included content and open limitations.
