# Climate validation — October 1, 2026

This round changes sky, weather, seasonal materials and wind within the
existing map. It does not add regions or replace the previous woodland assets.
See [CLIMATE.md](CLIMATE.md) for controls, rendering budgets and approximations.

## Checks

- 161 automated tests passed, including seven climate tests covering old-save
  migration, invalid values, all season/weather combinations, continuous
  transitions, wetting/drying, wind, roof catchment and quality budgets.
- TypeScript, the production build and the current-file publication scan passed.
- 23 browser checks passed. They cover the four seasons reaching live materials,
  persisted options, every quality preset, reusable particle geometry, sheltered
  interiors, neutral character creation, still air, wind direction, live rain,
  movement and shader diagnostics.
- The real game loop jogged 10.62 m in rain, recovered and mounted the bicycle,
  rode 8.56 m and dismounted. The catchment followed the moving player and the
  camera stayed finite.

An initial movement run was invalidated by browser frame throttling. It was
repeated with active frame delivery; the successful results above are saved in
[browser.json](qa/weather/browser.json). This is a focused regression smoke
test, not another complete traversal of the entire world.

## Measured performance

The available machine has Intel UHD Graphics through ANGLE/D3D11. Samples
use a 920×668 CSS viewport at DPR 1.25, 24 warmup frames and three seconds
of frame intervals per populated view. The diagnostic profiler is active.
There are no concurrent screenshots or test processes during measurement.

| Preset | Internal resolution | Summer village | Autumn river / rain | Winter woodland / snow |
| --- | --- | ---: | ---: | ---: |
| Low | 805×584 | 34.3 FPS | 38.4 FPS | 44.0 FPS |
| Medium | 977×709 | 22.8 FPS | 22.2 FPS | 21.6 FPS |
| High | 1150×835 | 12.1 FPS | 11.5 FPS | 11.0 FPS |
| Ultra | 1380×1002 | 8.7 FPS | 6.9 FPS | 6.7 FPS |

The [raw record](qa/weather/performance.json) includes camera positions,
quality settings, actual particle counts, cloud budgets, frame percentiles and
per-pass diagnostics. No recorded final sample contains a suspended frame
of 500 ms or more. Low p95 frame intervals range from 27.9 to 41.7 ms; Ultra
from 139.2 to 173.6 ms. These are short local measurements, not a 60 FPS claim,
a 1080p gaming-GPU certification, or an isolated weather-only benchmark.

Use **Low** on this integrated GPU. High and Ultra retain more cloud detail,
particles, vegetation, shadows and reflection work. Cloud radiance is shared
with water and refreshed in bands on the expensive presets to spread its cost.
An initial Ultra run was discarded after browser throttling; its 1 FPS values
were not game-performance measurements. The table uses the repeat run.

## Visual review

Real gameplay captures and their camera/settings metadata are in
[the gallery](GALLERY.md). Review includes open summer sky, rain on autumn
streets, spring vegetation, the snowy village and woodland, and evening light.
Snow changes exposed surfaces without recoloring the player's skin or clothes.
Deciduous trees lose their foliage; conifers retain it. Rain and snow stay out
of the separately rendered interiors and character presentation scene.

The review led to deeper cloud shading, higher angular resolution, distributed
cloud updates, consistent northward wind, snowfall clipping after flutter,
seasonal distant rice, and reduced wet sheen on porous grassy ground.

Remaining limits are explicit: snow is a material layer without deep drifts
or footprints; interception uses terrain and simplified roof proxies; particles
occupy a fading local volume; distant vegetation uses the existing detail
levels. Clouds remain softer at Low and update at a bounded rate. Their slow
movement makes the incremental High/Ultra cache useful, but it is not a
full-screen atmospheric simulation recomputed at 60 Hz.
