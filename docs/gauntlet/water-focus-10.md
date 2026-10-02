# Moving water — bounded water-only round

The owner's 30 September request explicitly resumes development for water only,
starting from merged PR #4 (`e2f3072`). No new land, regions, vegetation, character
work, gameplay routes or save format. The prior pause does not block this round.

The problem is a largely static sheet with animated reflection normals. This
round uses metre-scale GPU displacement with gravity-wave dispersion, advection
along the channel, depth absorption, analytic refracted bed shading and local
caustics. The same wave field crosses reach boundaries and the village join.
It preserves the existing physical mean water level and water exclusion.

The waterfall's existing parabola corresponds to a 36m horizontal launch under
9.81m/s² gravity. A fixed seed buffer drives falling and impact droplets on the
GPU, plus localized mist. Quality budgets are 2,048 / 8,192 / 32,768 / 131,072
drops for Low / Medium / High / Ultra. This is a ballistic spray approximation,
not an SPH/Navier–Stokes solver or a mass-conservation claim. The continuous water
surface is still necessary for coherent reflection and bounded pixel cost.

Low reuses the already computed vertex derivatives for wave normals and omits
capillary texture noise, bed texture noise and fine caustics. Other presets keep
per-pixel derivatives, capillary ripples and bed caustics. All presets retain
geometric waves, absorption, pool/rapid foam and spray.

One existing reflected-scene pass follows the local water elevation. Regions
outside that plane's useful height use sky reflection. This does not provide
independent mirrors for every river elevation, ray tracing, or scene refraction.
The analytic bed is a shading approximation; it does not refract submerged meshes.

Technical basis: [NVIDIA's gravity-wave surface model](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models)
and the existing project's mirrored-camera pass (the same approach documented by
[Three.js Water](https://threejs.org/docs/pages/Water.html)). The implementation is
adapted to the existing river profile and multi-target renderer.

Validation requires actual rendered water at the fall, impact, headwater, village
join and fields; no shader errors; both Low and High plus an Ultra particle check;
daylight/evening; unchanged contact/footprint tests; and retained moving-camera
evidence. Performance is measured without capture/build/test work during samples,
with the same appearance, route, settings, viewport and internal resolution.
Preserve unfavorable samples and report limits. Neither compilation nor a large
particle count establishes AAA quality or performance neutrality.
