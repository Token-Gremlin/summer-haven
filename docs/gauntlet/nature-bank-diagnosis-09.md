# Upper-bank mottling diagnosis — nature 09

Investigation: 2026-09-30. Scope: the speckled strip left of the player in actual
`evidence/nature-09/baseline-falls-lip-clear.png`. The author inspected that PNG,
its JSON camera record, production terrain/material/import code, the exported
gorge GLB, and its reproducible Blender sources. No game/browser, Blender scene,
build, test suite or performance run was controlled during the investigation.

## Reproduction of the geometry inspection

Load `public/assets/fantasy/silverveil-gorge.glb` using Three.js `GLTFLoader`,
select `GEO_Silverveil`, place it at `(366,0,-713)` and update world matrices.
Use double-sided raycasting conservatively. Do not run
`tools/blender/geology/verify-bank-export.ts` for a read-only inspection: that
existing script writes reports and the asset manifest.

Reconstruct the actual region terrain with 32 m `PlaneGeometry` cells, 16
segments per axis (2 m vertex spacing), rotated onto XZ. Set each vertex Y to
`terrainHeight(x,z,false)-0.045`, exactly as `Regions.terrain` does, and compute
normals. The inspected cells span X320..416 and Z−836..−708. This rendered
triangle surface matters: analytic terrain height alone does not establish
visual separation on a sloping, interpolated bank.

Use the recorded perspective camera: FOV48°, aspect1280/720, near0.15, far4200;
position `(356,60.65785484037021,-750.9520136894581)`, looking at
`(356,57.27,-746)`. Cast rays through these image-pixel coordinates, converting
to NDC with `(x/640-1,1-y/360)`:

`(580,200), (570,220), (564,244), (550,285), (540,340), (530,380), (520,425),
(500,480), (490,530), (475,590), (475,400), (510,330)`.

All twelve nearest hits were the rendered terrain. No gorge surface occupied
the visible mottled contact at those rays. The image therefore did not support
moving or biasing the authored gorge to resolve this particular strip.

## Measured separation

Vertical rays through the exported GLB and reconstructed terrain gave:

| World X,Z | Gorge surface Y | Rendered terrain Y | Gorge below terrain |
|---|---:|---:|---:|
| 356,−746 | moss 55.820000 | 55.955002 | 0.135002 m |
| 357,−746 | wet 54.908760 | 55.935390 | 1.026630 m |
| 357.5,−746 | wet 54.159084 | 55.925585 | 1.766501 m |

`bank_fit.py` lowers several source surfaces toward the same analytic-terrain
minus0.18 m target. The exported GLB consequently contains coincident buried
fitted surfaces. That is a real geometry property, but it was not exposed by
the inspected strip rays and was not established as this image defect's cause.
The earlier bank-fit verification compared mainly against analytic terrain;
this investigation additionally compared the actual rendered triangles.

## Material and lighting cause

`Regions.terrain` assigns sufficiently steep terrain vertices `M.stone`.
Before correction, those triangles used the generic stone branch in
`src/render/materials.ts`, without the gorge's `GEOLOGY` specialization.
Generic stone applies projected noise and `paint=1.4`, while retaining the
default narrow `soft=0.03`. `toonT()` adds
`(brush-0.5)*0.32*paint` to the surface/light dot product before evaluating the
cel-light transition. Strong brush variation can therefore alternate bright
and dark patches where the slope grazes that lighting threshold.

For the recorded world time0.18, reconstructing the existing afternoon-to-golden
light interpolation gave shading direction approximately
`(-0.784496,0.333342,0.522923)`. Interpolated terrain normals and the flat
provoking-vertex material assignment yielded:

| Image pixel | Surface | Normal · shading light |
|---|---|---:|
| 580,200 | stone | −0.04239 |
| 550,285 | stone | −0.03999 |
| 540,340 | stone | −0.00991 |
| 520,425 | stone | +0.01152 |
| 490,530 | ground | +0.00898 |
| 475,400 | stone | −0.14416 |
| 580,340 | stone | +0.12315 |

The narrow visible strip follows the near-zero lighting region, consistent
with a noisy lighting transition rather than coplanar visible geometry.
Shadow/postprocessing contributions were not independently isolated by this
author; the proposed minimal correction was a calm terrain-stone material,
preserving geometry, render identity, outline mask and shadow participation.
No Blender rebuild was indicated.

## Coordinator's runtime confirmation

After this read-only investigation, the coordinator reported implementing a
cached `TERRAIN_STONE` specialization with one low-frequency noise lookup,
`paint=.12` and `soft=.10`. The original ID/mask, vertices and shadow
participation remained unchanged. The coordinator reports that the exact lip
capture no longer shows the speckled band, saved as
`evidence/nature-09/candidate-e-falls-lip.png`, build `CxmM6m5Y`.

That runtime confirmation is attributed to the coordinator; this document's
author did not independently open the new capture or rerun its game state.
This is a narrow reproduced material defect and correction, not full motion,
performance, bank-topology or world-quality approval. No new measurement or
probing was performed while writing this record.
