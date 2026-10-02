# Silverveil gorge — revision 2 candidate contract

Original geological asset, 2026-09-29. This is asset evidence for W5/Q1/Q2/B2 and remains subject to runtime integration and fresh independent critique. No acceptance claim is made.

## Placement and water interface

Load `public/assets/fantasy/silverveil-gorge.glb`; retain `GEO_Silverveil` and place it at Three **[366,0,-713]**, identity rotation and unit scale. Units are metres, Y-up. Heights are already world heights. Do not add terrain height to the root.

The drop retains its exact X356–376 opening, from Z-730/Y54 to Z-708/Y18. The sampled profile is `Y=54-36*((Z+730)/22)^2`. Thin wet rock margins start .12m outside each half-width and .18m below the sampled water surface. They extend upstream to Z-763. Basin rim stones follow the existing pool centred at [370,-698], radii 22×18m, water Y18, with an open downstream exit. No water is exported.

Actual terrain sampling imports `regionRiverSample` and `sampleRegionTerrain` directly. Final source SHA256 is `885250421def6052f88244109a003ed7661ca0dbc830740b793e515b20d374da`, including the root author's additive `regionSurfaceWater` helper. Root confirmed that helper leaves the sampled profile and terrain values unchanged. The one-metre grid was regenerated after that change. Source equality was verified at inspection.

## Geometry and materials

Revision 2 replaces the separate wedge shelves with a continuous contour-fitted cross-section. Broad outcrops, three larger erosion alcoves and shallow connected bedding changes establish the main form. Fourteen local fracture paths, small spalled skins and five moss crack patches provide smaller detail. Rounded upstream shoulder stones lead toward the lip; discontinuous basin-rim stones and four talus clusters meet the lower banks. Soil pockets carry original broad-leaf vegetation. The diagonal all-rock runtime grain is not part of this asset and remains root-owned.

The final visual contains **17,106 triangles in nine single-material meshes**. Twelve separate optional collision boxes add 144 triangles; the complete file is **17,250 triangles**. No textures, skins or animation are required. Material names use `stone_Silverveil_` followed by `stone`, `warm`, `shadow`, `light`, `wet`, `moss`, `leaf`, `leaf_light`, or `earth`. Preserve their base colors; a numeric suffix on `light` is recorded in the manifest. Geometry names use the equivalent `GEO_Silverveil_` prefix. Vegetation is opaque two-sided leaf geometry; do not replace its green base colors with gray stone.

GLB: **958,024 bytes**, SHA256 `12ef8a9deceaf79af29bf55d0382fc7abfb926727170ed994acb67bf830d7d6d`.

Local bounds: `[-88,12.770434,-50]` to `[94.700012,59.266842,34.019600]`. World bounds at prescribed placement: `[278,12.770434,-763]` to `[460.700012,59.266842,-678.980400]`.

## Collision and route limits

All exported roots have identity transforms; every mesh has one primitive/material. Remove all **12 `COL_` roots** from the render tree before material replacement. Blender `hide_render` does not establish runtime visibility. Proxy world/local boxes are provided in the JSON. They cover selected upstream and basin rocks; they are not a replacement for the existing terrain collision.

Wall quads require all vertices more than 2.7m beyond the sampled route half-width. Block perimeters require 3m. A conservative independent proxy-AABB check samples the original switchback route every .25m: minimum clearance beyond its edge is **2.994603m**, `COL_Basin_Rim_1`. This is a sampled geometric check, not proof of capsule motion, camera clearance, overhang traversal or complete route continuity. Runtime collision and water/bank interaction remain unverified.

## Reproduction, archive and inspection

Run `node --import tsx tools/blender/geology/sample-terrain.ts` from the repository. Execute `silverveil.py`, `review.py`, and `inspect.py` through Blender MCP with each file's absolute path supplied as `__file__`. The builder replaces only `Haven_Geology`. The editable scene is saved to `tools/blender/geology/silverveil-gorge.blend`.

The prior scripts, source samples, GLB, manifest, blend, contract and four renders were archived before overwrite in `tools/blender/geology/revision-1`. Earlier evidence files remain intact. New evidence is `docs/gauntlet/evidence/gorge-r2-{wide,approach,close,upstream,three-quarter,base}.png`. All six actual 1080×810 renders were inspected, including the final fracture pass. The original four camera positions remain matched to r1; the two additional cameras expose the fall/basin relationship. Exact timestamps, cameras and file hashes are in the JSON.

Render-only sampled terrain, a plain water surface/pool and a route guide supply context; these are not exported. They do not certify runtime water flow, foam, lighting, route visuals or atmosphere. The live scene-info call confirmed `Haven_Geology` has 34 objects including diagnostic context. Viewport screenshot calls returned a blank field even after framing selected geometry, so visual inspection relies on the six actual renders rather than a claimed successful viewport image.

Other scenes remain preserved: default `Scene` 3 objects, `Haven_Dragons` 15, `Haven_Architecture` 211 and `Haven_Transport` 36. Fresh independent critique must judge the new integrated runtime result; this document does not assign artistic scores.