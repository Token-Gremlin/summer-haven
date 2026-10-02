# Woodland validation — October 1, 2026

This focused round replaces the existing trees with EZ Tree geometry. It does
not add regions, change the river or replace character and wildlife assets.
There are still 245 village trees, 2,123 regional trees and 331 regional cells.
The implementation and upstream pin are documented in [WOODLAND.md](WOODLAND.md).

## Functional checks

- 154 automated tests pass, including four new tests for deterministic geometry,
  leaf coverage, LOD budgets, camera envelopes and quality transitions.
- Strict TypeScript and the production build pass.
- The browser fluency review passes 18 checks: both character presets, walk/jog
  rig states, the road surface, graphics controls, full/nearby visibility,
  shared instance buffers and camera wall clearance.
- A real game-loop smoke test jogs 9.05 m along the Mosswood path, recovers and
  mounts the bicycle, rides 10.43 m, then dismounts. The camera remains finite
  and all compiled shader programs report runnable status.
- Entire landscape mode retains all 2,368 trees in range. Actual drawing still
  uses frustum culling and distance detail; full visibility does not force
  every distant tree to render thousands of close-range leaf triangles.

Raw [fluency](qa/woodland/fluency.json) and
[traversal](qa/woodland/traversal-smoke.json) records are included. The short
traversal is a smoke test, not a new complete-world acceptance journey.

## Performance on the available machine

Measured in the local browser using Intel UHD Graphics through ANGLE/D3D11.
The viewport is 920×668 CSS pixels, device pixel ratio 1.25. Each populated
view uses 24 warmup frames and a 2.2-second frame interval sample, with frozen
afternoon light and no screenshots taken during measurement. Quality presets
also change the internal rendering resolution, shadows and reflection budget.

| Preset | Internal resolution | Village grove | Mosswood path | River approach |
| --- | --- | ---: | ---: | ---: |
| Low | 805×584 | 40.3 FPS | 43.9 FPS | 40.6 FPS |
| Medium | 977×709 | 23.0 FPS | 24.9 FPS | 23.6 FPS |
| High | 1150×835 | 13.4 FPS | 13.0 FPS | 13.2 FPS |
| Ultra | 1380×1002 | 9.8 FPS | 8.5 FPS | 8.6 FPS |

The preceding build measured 41.2/47.6 FPS at Low and 7.6/8.0 FPS at Ultra in
the village/Mosswood views. Those pairs use the same player positions, orbit
settings and presets, but the new crown collision can adjust the actual
camera. They are useful local diagnostics, not a controlled GPU certification
or a claim of uniform improvement. Low Mosswood is somewhat slower; Ultra
village is faster after the shadow and texture optimizations.

The baseline's third viewpoint was moved for the final test because its camera
retracted against a nearby prop. Do not compare that third before/after pair.
Raw [baseline](qa/woodland/baseline.json) and
[final measurements](qa/woodland/final-performance.json) include camera positions,
frame times, rendering passes and tree counts. Final p95 frame times range from
27.9–28.0 ms at Low to 111.2–173.7 ms at Ultra.

**Use Low on this integrated GPU.** Ultra screenshots show visual quality, not
smooth Ultra gameplay on this machine. These short samples do not establish
60 FPS at 1080p, long-session stability or performance on a discrete gaming GPU.
Hosting the demo does not move rendering away from the player's GPU.

## Visual review

Four captures from the final implementation are in the [gallery](GALLERY.md):

- [Village afternoon](screenshots/woodland/village-ultra.jpg): a broad, open
  crown beside the house; readable bark and irregular leaf edges.
- [Mosswood](screenshots/woodland/mosswood-ultra.jpg): pale trunks, darker
  conifers and overlapping leaf sprays retain views along the path.
- [Golden hour](screenshots/woodland/river-golden-ultra.jpg): the approach to
  Silverveil frames the existing distant landscape.
- [Evening](screenshots/woodland/mosswood-evening-ultra.jpg): foliage, trunks,
  player and deer remain readable under the time-of-day lighting.

All are actual gameplay renders, with metadata beside each image. No new
promotional imagery substitutes for the running game. Fine leaves still use
textured sprays, not separate simulated leaf bodies. Distant crowns and shadows
are deliberately simpler, and coverage transitions can remain visible under
close inspection without MSAA. Long moving-view and lower-end hardware reviews
remain useful follow-up tests. The broader known game issues in
[PLAYTEST.md](PLAYTEST.md) are unchanged by this tree-only round.
