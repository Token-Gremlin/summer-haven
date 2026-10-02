# Silverveil gorge — candidate asset contract

Original geological candidate, 2026-09-29. This contributes asset evidence for W5/Q1/Q2/B2; it does not approve integrated appearance, waterfall motion or traversal.

## Placement and terrain fit

Load `public/assets/fantasy/silverveil-gorge.glb`, retain visual root `GEO_Silverveil`, and place it at Three position **[366, 0, -713]**, identity rotation and unit scale. Metres, Y-up. Heights are already the intended world heights: do not lift the root to terrain height. There is no water or terrain context in the export.

The authoring sampler imports the actual `regionRiverSample` and `sampleRegionTerrain` from `src/data/regions.ts`. Sampled source SHA256: `48c55801696ec61c84fc5d933908ad09e4f4905ee82de6fe09c82e04d14c1d4a`. Inspection confirmed this source remained unchanged. The water descends from Y54 near Z-730 to Y18 at Z-708; the adjacent upper terrain reaches approximately Y56. The visual facing leaves the sampled river half-width plus .65m clear, with complete edge-cell rejection. Larger stone wedges, irregular shore boulders and seven supported shelves interrupt the ramp; shelf wedges extend down and into it rather than floating above it.

Visual local bounds: `[-90.857391,11.200499,-48.712059]` to `[94.599998,63.419998,26.371185]`. At the prescribed placement, world bounds are `[275.142609,11.200499,-761.712059]` to `[460.599998,63.419998,-686.628815]`.

## Export and collision

The visual has **13,115 triangles and seven material meshes**. Names are `GEO_Silverveil_{stone,warm,shadow,light,wet,moss,lichen}`; corresponding materials are `stone_Silverveil_...`. Each mesh has one primitive/material and requires its authored base color. No texture or transparent material is required. Low-contrast stone bands, dark fissure faces, chipped edges and restricted moss/lichen regions supply the surface hierarchy.

The file also contains **25 optional `COL_` box roots**, 300 triangles total. Remove these from the render tree before applying runtime materials. Blender's `hide_render` is not a runtime visibility contract. Use the JSON proxy bounds if collision is wanted; the mesh boxes are conservative and should not replace the existing traversable terrain. All exported roots have identity transforms.

File: **863,884 bytes**, SHA256 `61490c9063568d6aed49b2e8effd030dfad8a9edc59471df61917ba0319a97e3`. Detailed feature/proxy bounds, material list, cameras and source/image hashes are in the accompanying JSON.

The facing rejects cells within 2.4m beyond the route half-width. Outcrop footprint perimeter, centre and edge midpoint tests use 3.3m. A separate conservative check sampled the actual switchback route every .25m against all proxy AABBs: minimum distance beyond the path edge is **1.015680m**, for `COL_West_Lower` near `[311.076923,-708.769231]`. The next closest is `COL_West_Crown`, 3.073744m. This validates the sampled geometric separation, not runtime capsule motion, sliding, camera clearance or route continuity; those require the integrated game.

## Source and evidence

`tools/blender/geology/sample-terrain.ts` writes the terrain grid using the existing region functions. Run with `node --import tsx tools/blender/geology/sample-terrain.ts` from the repository. Then execute `silverveil.py`, `review.py`, and `inspect.py` in Blender, supplying each absolute path as `__file__`. `silverveil-gorge.blend` contains editable `Haven_Geology` geometry and diagnostic context. The builder replaces only that scene.

Four actual 1080×810 Blender renders are `docs/gauntlet/evidence/gorge-{wide,approach,close,upstream}.png`. Their simplified water, sampled ground and route guide are diagnostic context, not exported geometry or evidence of runtime water/route quality. The approach and close images use perspective cameras; wide and upstream use orthographic cameras. Exact cameras and timestamps are in the manifest. All four images were inspected.

After authoring, preserved scenes retain their object counts: default `Scene` 3, `Haven_Dragons` 15, `Haven_Architecture` 211, `Haven_Transport` 36. `Haven_Geology` has 45 objects including review context. Runtime material response, integration with spray/flow, west-route traversal and fresh independent visual critique remain unverified.
