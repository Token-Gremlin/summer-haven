# Living water playtest

This water-only round starts from merged PR #4 (`e2f3072`). The world, routes,
terrain support, characters, vegetation and save format retain their existing
contracts. Use branch `polish/living-water`, then `npm ci` and `npm run dev`.

## What changed

- Rivers and the receiving pool have actual GPU vertex displacement. Their wave
  speeds follow gravity-wave dispersion with a uniform mean drift. Fine detail
  follows the local channel current. Banks,
  the waterfall lip and impact seams have bounded displacement.
- The village river is subdivided inside its original polygonal footprint. The
  bank builder retains the exact original station mesh; it does not interpret
  dense surface vertices as new bank edges.
- Reflective water uses depth absorption, analytic refracted-bed shading,
  caustics, filtered small ripples and wave-aligned normals. Water bypasses the
  paint flattening filter while the rest of the game's art direction is retained.
- The existing reflection pass follows the nearby water elevation, including
  regional rivers and the plunge pool. It is still one reflected scene per
  refresh, with a height/confidence fade to sky reflection elsewhere.
- The falling sheet deforms in space. GPU droplets follow the authored 36m drop
  under 9.81m/s² gravity, with impact spray, localized mist and advected foam.
- Low / Medium / High / Ultra select **2,048 / 8,192 / 32,768 / 131,072** droplets.
  The fixed 1.5MiB seed buffer is reused. There is no per-drop JavaScript object,
  CPU particle integration or per-frame vertex upload; distant spray is culled.
- Low reuses vertex wave derivatives for shading and omits capillary texture
  samples, bed texture noise and fine caustics; pool foam uses one flow layer.
  Medium/High/Ultra retain per-pixel wave derivatives and caustics. Foam work is
  restricted to rapids and the receiving pool; quiet water avoids those samples.
- Two overlapping eight-second flow phases prevent indefinite stretching in
  curved/accelerating current. An earlier long-session capture exposed striping;
  its recording remains in the evidence, before the phase correction.

These effects are physically inspired approximations. There is no particle
fluid solver, fluid mass conservation, submerged-mesh refraction or ray tracing.
More than one hundred thousand particles are reserved for Ultra and the waterfall;
continuous river surfaces provide the reflection and flow across the world.

## Validation

- All **150 tests pass** (`evidence/water-10/tests.txt`). They cover existing
  gameplay/collision plus shared animated seam parameters, unchanged river
  footprint, pool ownership, ballistic agreement with the actual waterfall,
  quality bounds and seed-buffer reuse.
- TypeScript and production build passed: `CWGZkIaU` (`evidence/water-10/build.txt`).
  The full 150-test run precedes the final shader-only cost reduction. Its
  geometry, collision and particle-buffer contracts did not change afterward;
  actual rendering and timing are checked against the final shader build.
- The first full test run exposed a test assumption about coarse vertices. Its
  failed log is retained; the repaired test compares every new station with the
  actual previous polygonal level/edge instead of assuming all intermediate
  samples are perfectly flat. The ground's previous measured contact remains.
- Early captures A predate the bank reader correction and are diagnostic only.
  The first shader compile error (a reserved GLSL identifier) was corrected
  before the subsequent runtime inspection.
- Early performance files with `prof=1` are retained as diagnostic data, not
  production timing. The shared sampler now rejects that accidental combination.
- The complete first production candidate (`CCCs0OgV`) is retained in
  `performance-candidate-c1-clean.json`. Its waterfall cost prompted the final
  shader optimization; it is not substituted for final-build timing.
- `performance-candidate-resolution-mismatch.json` rendered at 896×504 despite
  reporting DPR1.25. It is excluded from the paired comparison. The sampler now
  validates actual canvas, scene and post-processing dimensions before timing.
  `performance-candidate-matched-attempt.json` was aborted after movement stopped;
  it is retained without treating the incomplete run as an acceptance result.

Runtime images, movement recordings and timing records are in
[water-10](evidence/water-10/). Their metadata identifies the exact build,
camera, settings, resolution and diagnostic placement. The source of the
inspection/recording routine is `tools/qa/water-inspection.js`.

## Visual review

Water captures cover the [fall in Ultra](evidence/water-10/final-falls-ultra.jpg),
[Low](evidence/water-10/final-falls-low.jpg), [impact](evidence/water-10/final-impact.jpg),
[headwater](evidence/water-10/final-headwater.jpg), [forest brook](evidence/water-10/final-brook.jpg),
[village](evidence/water-10/final-village.jpg), [evening](evidence/water-10/final-village-evening.jpg)
and [paddies](evidence/water-10/final-paddies.jpg). JSON companions record actual
camera, appearance, time, quality overrides and target dimensions. These are
diagnostic placements, not proof of walking the whole watercourse. The captures
use controlled effects settings rather than untouched preset defaults.
The High views and motion recordings use `PiuA5jB-`, immediately before the last
Low-only texture-budget reduction. The High shading calculations and all geometry
remain the same; final Low and Ultra stills are checked again on `CWGZkIaU`.

The waterfall now has changing folds, separate falling droplets and local impact
spray. Its pool reflects the gorge and trees, while upstream and village water
have rolling, distorted reflections. Quiet flooded fields retain much smaller
waves. The original broad falling silhouette and angular banks are still visible;
this is a stronger water treatment, not a completed photorealistic world.

The [long-phase check](evidence/water-10/final-village-one-hour-phase.jpg) explicitly
sets only the water shader clock to 3,600 seconds, then restores normal time. The
earlier accumulated striping is absent. This is not an hour-long play session.
The [fall recording](evidence/water-10/final-falls-motion.webm) lasts about 12 seconds;
the [river recording](evidence/water-10/final-village-motion.webm) lasts about 18.
Both include a scripted camera sweep and have no audio. Sampled frames were
inspected, including changing reflection shapes and the connected river edge;
they do not certify every frame or fluidity on every GPU. Recordings are not
performance samples.

The first impact placement was outside the supported trail and exposed an
existing rock/terrain support mismatch. The first paddy placement was mistakenly
inside Sora's house and forced the camera too close. Both diagnostic captures are
retained; the final views use the lower trail and field approach. No land or
camera repair is claimed by changing those inspection points. Earlier baseline
screenshots have a different captured viewport width and are contextual examples,
not a pixel-identical comparison.

## Performance result

The final comparison uses Intel UHD 0x9BC4 / ANGLE D3D11, a 1280×720 viewport
at DPR 1.25 and **1120×630 internal rendering**, Low, nearby 90m, shadows 512,
vegetation 0.3, FXAA, reflections/post off. For each build, two 30-second walking
samples per route follow 10-second warmups. Actual scene and post targets,
appearance, route, camera aspect and settings match. Each sample completes one
fall-route lap or two village laps; no input recovery was needed. No screenshots,
recordings, builds or tests run during the timing windows.

| Route | Reference FPS | Final FPS | p95 before → after | Worst frame before → after |
| --- | ---: | ---: | ---: | ---: |
| Silverveil approach | 50.60 | 50.45 | 27.8 → 27.8ms | 111.1 → 631.8ms |
| Village riverside | 44.84 | 47.59 | 27.9 → 27.8ms | 506.8 → 138.9ms |

FPS is pooled from all retained frame intervals. The fall average is effectively
unchanged in this sample and the village average improves, but **tail latency is
not resolved**: fall p99 rises from 34.7 to 55.5ms, with 33 frames over 50ms and 11
over 100ms. Its two runs vary from 44.99 to 55.92 FPS. These are sequential samples
on one integrated GPU, not randomized trials, native 1080p/High measurements or
a guarantee of zero cost/60 FPS. Earlier attempts remain in the directory; none
is silently substituted or discarded from its original record.

Recompute with `node tools/qa/summarize-water-performance.mjs`. The authoritative
inputs are `performance-baseline-paired.json` and `performance-candidate-clean.json`;
the output is [performance-summary.json](evidence/water-10/performance-summary.json).
The exploratory per-water-draw GPU diagnostic belongs to the earlier `WeyO88U-`
build and is not a final-build FPS measurement.

## Scope and limits

Water collision still uses its stable mean level. Boat/creature physics are not
rebuilt as a buoyancy solver. Reflection fallback is deliberately limited by
surface height, and the existing regional bank/pool land geometry remains.
Earlier camera, seating and whole-world journey issues are not repaired by this
water-only round. Visual samples and passing tests do not certify an AAA result,
60 FPS on all hardware or complete-world acceptance.
