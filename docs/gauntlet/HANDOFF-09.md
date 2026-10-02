# Water and nature playtest handoff

The owner requested stopping the development loop and publishing all work so far
on 30 September 2026. The Goal is **paused**, not complete. This branch is
`polish/water-and-nature`, based on the owner's merged PR #3 (`bbb185b`).
Deployment and merging main are not part of this handoff.

## Run this snapshot

```sh
git fetch origin
git switch --track origin/polish/water-and-nature
npm ci
npm run dev
```

Use `git switch polish/water-and-nature` if the branch already exists.
Open http://127.0.0.1:5173/. Node 22.12+ is required. Complete existing Blender
sources, exports, game source and lockfile remain included. No extra art download
or Blender run is needed to play. Browser saves and their format are unchanged.
Build with `npm run build`.

## Included changes

- Shared painterly river/paddy/waterfall materials; restrained current marks,
  localized impact foam and a tapered planar reflection.
- A single village/valley water join, localized shore color and smoother bank
  shading. Replacement ground triangles improve the village riverbank without
  overlays or changes to physical support/navigation.
- Varied existing crowns and curved, clustered grass/understory. The region
  retains 331 cells and 2,123 trees with every tree transform preserved; village
  trees remain 245. Groundcover population is reduced, not expanded.
- Distant village birds/insects skip drawing while behavior continues. Invisible
  daytime fireflies also skip drawing.
- Camera envelopes derived from both village-tree detail meshes fix the
  demonstrated view blocked by leaves. Trunk/player collision is unchanged.
- Tests, reproducible QA helpers, screenshots, recordings, raw measurements and
  independent reviews. Failed/invalid evidence is retained with explicit labels.

## Validation already completed

Production `DMYTnp5a` passed TypeScript and Vite. All 146 full-suite tests passed.
After a test-only nonzero-wind addition, all four focused canopy tests passed;
no runtime source changed after the full run. Logs: `tests-j.txt` and
`tests-canopy-j.txt` in [the evidence directory](evidence/nature-09/).

A four-waypoint bank walk completed in 15.453s with ordinary keyboard movement
and collision after initial QA placement. Its 22.008s recording and a separate
18.040s camera orbit are included. Sparse samples do not certify continuous
animation, audio or the full journey.

Measured Low performance: Intel UHD 0x9BC4/ANGLE D3D11, 1280×720 display,
DPR 1.25, **1120×630 internal**, nearby 90m, vegetation .3, shadows 512,
AA 1, post and reflections off.

| Route | Windows | Pooled FPS | p95 | Maximum |
|---|---|---:|---:|---:|
| Mosswood glade | 3×60s after 10s warmup |36.43|34.6ms|77.0ms|
| Silverveil approach | 3×60s after 10s warmup |43.94|27.9ms|62.6ms|
| Village riverside | 3×30s after 10s warmup |39.80|27.9ms|55.4ms|

Forest/falls hardware, settings, appearance and routes match the retained
baseline; nearly equal means are not a speedup claim. Village has no matched
old timing. These are screenshot-free RAF measurements, not native 1080p,
High, 60 FPS or whole-world certification. See [runtime evidence](evidence/runtime-nature-09.md)
and [independent verification](reviews/nature-verification-09.md).

## Known unfinished work

- Forest run 2 has 22 consecutive 69–77ms intervals over 1.65s. The cause and
  performance neutrality remain unresolved. A final 90s instrumented diagnostic
  had finished before the pause; its raw record is saved without new approval.
- The bank orbit recovers from 1.382m to 6m but contracts 3.677m in 256ms on the
  inward sweep. Close framing crops the character; temporal camera polish is open.
- One walking trace step is inconsistent with its sample interval. This does not
  establish teleportation, but prevents claiming uninterrupted pacing.
- Regional bank/portal and waterfall pool contact still need work. The village
  bank improvement is preferred in a neutral still comparison; terrain/material
  craft remains below the frozen 4/5 target.
- Continuous playback/audio, all-angle foliage behavior and complete-world
  acceptance remain open. Earlier wider-world issues, including the city bench
  get-up trap, remain in the playtest documentation.

The loop stays paused until the owner resumes it. Publication is a handoff for
testing, not a declaration that these gaps are fixed.
