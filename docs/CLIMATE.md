# Weather and the four seasons

Press **K** while exploring, or open **Weather & seasons** from Pause or
Settings. Choose spring, summer, autumn or winter, then fair skies, overcast,
rain or snowfall. Cloud cover, precipitation intensity, wind strength and wind
direction are independent controls. **Choose the light** opens the existing
time-of-day controls. Your choices are saved in this browser.

Changes blend over a few seconds. Winter previews a settled snowy landscape;
snowfall adds a fresh layer. Rain gradually wets exposed surfaces, and they
dry after the rain stops. Optional automatic weather follows slow, repeatable
fronts while the world clock advances. Turning it off returns control to your
chosen conditions. Seasons remain a deliberate choice.

## One existing world, four appearances

- **Spring:** brighter greens, small ground flowers and drifting petals near
  trees.
- **Summer:** the existing full green canopies and warm landscape.
- **Autumn:** varied copper and golden deciduous foliage, straw-colored grass
  and rice, ground litter and wind-carried leaves.
- **Winter:** bare deciduous branches, evergreen pines, quieter insects,
  snow on upward-facing roofs, stones, ground, bushes and branches. Tall grass
  settles lower and flowers recede.

The river continues to flow, with existing waterfall, ferry and wildlife.
Rain adds ripples and disturbs reflections. No terrain, town, path, tree
placement or navigable boundary is enlarged by this system.

## Rendering and motion

The sky uses a procedural volumetric cloud slab with low cloud masses and
thin high filaments. A bounded hemisphere texture caches radiance and
transmittance. Both the sky and water sample it, so reflections do not
raymarch the cloud volume again. Lighting, horizon haze, evening color and
overcast transition with the weather.

Rain and snow use seeded GPU instances. Rain falls at terminal speed with
wind-aligned streaks; snow falls more slowly and flutters. Impact droplets
follow short gravity arcs. A small reusable height texture samples terrain,
water and simplified building/prop collision roofs around the camera.
Seasonal particles originate near existing tree crowns.

Tree leaves, trunks, grass, rice and wind-weighted props share the same wind
direction and continuous phase. Reflections and vegetation shadows use the
same displacement. Zero wind stops transport after a short fade. Wind toward
north means toward the northern valley, not an ambiguous meteorological
“from” direction.

## Quality budgets

| Preset | Cloud cache | Steps | Maximum refresh | Rain | Snow | Petals / leaves | Impacts |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Low | 384² | 12 | 3 Hz | 700 | 350 | 80 | 90 |
| Medium | 640² | 18 | 4 Hz | 1,800 | 850 | 160 | 220 |
| High | 896² | 24 | 5 Hz | 4,200 | 2,100 | 320 | 450 |
| Ultra | 1280² | 32 | 6 Hz | 8,500 | 4,400 | 520 | 800 |

Particle counts are maxima at full intensity; rain and snow are mutually
exclusive except during their brief transition. The four instance buffers
are allocated once. Quality switches change draw counts and resize only
the cloud render target. Existing resolution, shadow, reflection, vegetation
and distance controls still apply. High and Ultra refresh four disjoint bands
of the cache across frames; the table gives the maximum whole-cache refresh
rate. This spreads GPU work while retaining spatial detail. First use and
large lighting changes refresh the complete image. On slower devices the
cloud cache refreshes less often as frame delivery permits.
Entire landscape mode keeps the existing
distant world; precipitation is always a local volume with distance fades.

## Implementation

- `src/data/climate.ts`: validated options, smooth state, deterministic fronts
  and bounded budgets.
- `src/world/climate.ts`: live lighting and render-system coordination.
- `src/render/atmosphere.ts`: cloud-volume cache.
- `src/render/climate-uniforms.ts`: shared wind and seasonal surfaces.
- `src/render/precipitation.ts`, `src/world/weather-surface.ts`: GPU weather
  and local collision catchment.
- `src/ui/climate-panel.ts`: live controls.
- `src/sound/weather.ts`: synthesized stereo rain, muted indoors.
- `tests/climate.test.ts`, `tests/weather-browser.js`: migration,
  transitions, budgets, catchment, gameplay checks and performance samples.

This is a real-time visual climate model, not a fluid or snow-mass solver.
Snow is a normal-aware material layer, not deep geometry, and does not add
footprints or change movement collision. Roof interception uses simplified
proxies, so small eaves and open-sided structures can be approximate. Cloud
detail and update rate are deliberately bounded, especially on Low. No new
external service, downloadable weather asset or personal data is required.
