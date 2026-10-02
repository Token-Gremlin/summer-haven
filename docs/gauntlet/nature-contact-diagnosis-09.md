# Existing water/terrain contacts — nature 09

Read-only diagnosis, 2026-09-30. Inspected actual `candidate-c-river-join.png`,
`candidate-c-falls-impact.png`, and `candidate-e-falls-lip.png`, their recorded
cameras, and production terrain, water, pool and gorge geometry. Those captures
are builds `D_QWdtrh` and `CxmM6m5Y`; later shader revisions were not judged here.
No world expansion is proposed.

## Measured causes

Rendered terrain was reconstructed with the production triangle diagonal and
vertex stations: village 390×327 m / 160×134 segments, regional 32 m cells /
16 segments. Vertex Y is `terrainHeight(x,z,false)-.045`. Cross sections compare
that interpolation to the unchanged analytic height function and actual village
water vertices. Crossing searches use 0.005 m steps; values are not exact roots.

| West bank station Z | Water edge X | Existing ground/water crossing X | Analytic crossing X | Main cause |
|---|---:|---:|---:|---|
| −120 | 46.12160 | 44.30160 | 45.96160 | coarse village triangles |
| −124 | 46.15925 | 44.16425 | 46.05925 | coarse village triangles, 1.895 m excess |
| −128 | 45.96032 | 44.03032 | 45.93532 | coarse village triangles, 1.905 m excess |
| −132 | 45.61641 | 43.96141 | 45.61641 | portal row sampling |
| −138 | 47.53786 | 44.33286 | 44.84286 | physical legacy/region blend plus 0.51 m sampling error |
| −738 | 356.92308 | 358.40808 | 358.20308 | smooth upper bank, 0.205 m sampling error |
| −742 | 357.38462 | 358.86962 | 358.66462 | smooth upper bank, 0.205 m sampling error |
| −746 | 357.84615 | 359.08615 | 359.12615 | smooth upper bank, −0.04 m sampling error |
| −750 | 358.30769 | 359.37769 | 359.58769 | smooth upper bank, −0.21 m sampling error |

The village has a true analytic step at `abs(x-riverX(z))=5.1`: inside is −1.1 m,
outside is the original land height. A regular finer grid alone can miss it.
At Z−128 a 0.5 m grid still leaves 0.405 m of crossing error. At Z−124 water
Y−0.15996 ends over rendered ground Y−1.07438: the cut is a real exposed mesh
edge above the coarse bank, not merely paint. Near the portal the water halfwidth
is 4.9→5.1, while the legacy exclusion is 5.7. That already blocked interval
permits a small visual bank bevel without moving a walkable height sample.

The upper lip is different. At Z−746 the water boundary is under terrain:
Y54.08 water versus Y55.9188 rendered ground. The visible shoreline is about
1.24 m inward from the water mesh boundary. Refining the existing smooth bank
sampling can improve its angular outline; widening water cannot help this cut.
The separate mottled shader strip is addressed in `nature-bank-diagnosis-09.md`.

## Receiving pool and authored rock

The 72-sided pool approximates its physical ellipse closely: at Z−688 its actual
west edge is X351.72608 versus ellipse X351.70745 (0.01863 m); at Z−692 the
difference is 0.00829 m. Polygon count is not the main contact problem.
At the actual Z−688 edge, analytic ground is Y17.94611 while water is Y18.08.
At `(348,−698)`, rendered ground is Y17.35136 under water Y18.08: a 0.72864 m
gap. The unchanged analytic basin is already low at its finite water boundary.
At Z−698 its analytic ground/water crossing is approximately X344.03, nearly
4 m outside the water edge. More terrain samples cannot remove that mismatch.

Rays through the actual impact camera identify the large upper-left angular
faces as authored `GEO_Silverveil_stone`: image `(650,150)` hits it at
`(351.53137,18.22290,−698.72552)` before water; `(550,115)` hits it at
`(349.91861,18.62230,−700.87287)`. Their broad faceted silhouettes are original
rock forms, not a second flat water sheet. Foreground pool-edge rays instead
hit the pool then lower terrain: `(900,370)` hits pool at
`(351.18283,18.08,−689.17320)` and terrain farther along the ray. The procedural
green bank boulders are also separate existing assets, not pool tessellation.

Extending the pool or regional water to the analytic terrain crossing would
visually flood currently walkable ground. Raising that walkable ground visually
could bury feet. Neither is authorized by the present no-physics-change scope.
Keep this residual explicit; do not mask it with a painted stripe or coplanar
bank overlay.

## Bounded repair proposal and cost

Prioritize the village join: replace only the bank portions of existing terrain
triangles, inserting stations along the real bank curve and a small bevel inside
the already excluded interval. Keep all original physical queries, routes,
trees, world bounds and draw count. Do not add a second surface over the old one.
Preserve the original triangle plane and normals outside the edited narrow band.

A deliberately broader count-only prototype over X36..66/Z−148..−112 split
238 original triangles using 0.5 m rows and bank cuts, adding 3,622 triangles.
That is an upper planning example, not a production measurement or performance
result. The approved first edit is narrower and village-only, favoring fewer
polygons. Actual implementation counts must be recorded separately.

The portal Z−132 joins two different X grids (2.4375 m and 2 m). A future shared
seam correction must use one edge polyline, including both grid stations and
explicit bank breakpoints, on both owners. Independently resampling that edge
on only one side risks a crack. The village-only repair should keep its existing
portal edge intact and taper to it until the regional side is coordinated.
Z−138's physical residual remains outside that first edit.

The coordinator authorized the narrow village-only repair after this diagnosis.
Production geometry measurements and limitations will be appended after its
focused verification. Runtime appearance and performance remain separate gates.

## Initial H replacement — visually rejected

This section records the first H implementation, not the current source.
The coordinator's actual `candidate-h-river-join.png` (`BREv_8qC`) revealed a
new dark retaining-wall appearance. Inspection against the actual G capture
confirmed a regression despite passing contact tests. The exact H helper is
preserved at `.cache/nature-09/village-ground-h.ts`; the matched H images/JSON
remain evidence of the rejected experiment. The revision below supersedes it.

`src/world/village-ground.ts` now produces the ground used by `Village.ground`.
The isolated reference slice explicitly requests the original base geometry;
its index and all vertex attributes are checked byte-for-byte by the test.
It retains the original indexed plane and replaces only triangle pieces near
the two banks in Z−132..−112. Clipping stations are 0.75 m apart plus actual
water-mesh corners and taper stations. Within each station interval, bank cuts
follow the sampled river curve. The visual adjustment is confined to signed
bank distance 4.45..5.69 m, inside the unchanged 5.7 m collision exclusion.
The 0.01 m outer margin also accommodates the short linear curve segments.

The bevel runs from the unchanged submerged bed to a toe 0.06 m inside the
actual water edge and 0.04 m below its actual Y, then the physical dry break at
5.1001 m, then rejoins the original triangle plane at 5.69 m. The short exposed
bank therefore meets the existing finite water surface without widening it.
This is replacement topology: no original surface remains underneath a new
coplanar surface. Original physical height functions are never changed.

Influence fades over Z−132..−130 and Z−114..−112. The original Z−132 portal
edge, ground outside the bank strip, and all walkable samples retain their
original triangle height. Unmodified triangles retain their indices and vertex
normals. Cut vertices interpolate the original attributes; only displaced
vertices receive local bank slope normals. Existing ground coloring and the
single material/draw owner are reused.

Actual geometry measurements from `tests/village-bank.test.ts`:

| Measure | Original | Replacement | Delta |
|---|---:|---:|---:|
| Ground triangles | 42,880 | 44,224 | +1,344 (3.13%) |
| Ground vertices | 21,735 | 22,540 | +805 |
| Position/normal/UV/index storage | — | — | +33,824 bytes |
| Prepared ground storage including color/material/wind | — | — | +49,924 bytes |
| Ground draw calls/materials | 1 | 1 | 0 |

The mesh remains below the existing 42,000-vertex static-batching threshold.
Storage above is the standalone geometry payload, not total GPU memory or
frame cost. No texture, shader sample, population or other world mesh is added.

| West-bank Z | Water Y | Original ground at finite water edge | Replacement ground there | Replacement crossing inward from edge |
|---|---:|---:|---:|---:|
| −128 | −0.10664 | −0.98435 | −0.06481 | 0.02958 m |
| −124 | −0.15996 | −1.07438 | −0.13207 | 0.02439 m |
| −120 | −0.21341 | −1.05636 | −0.18464 | 0.02492 m |
| −116 | −0.23996 | −0.92842 | −0.20921 | 0.02525 m |

The finite edge is now embedded in the bank by roughly 3–4 cm in these west
sections instead of suspended above the coarse terrain. These are undeformed
mesh measurements; the parent must still inspect the current water shader in
motion. The test uses both actual before/after indexed meshes, checks 3,229
protected samples, original bounds, up-facing nondegenerate topology and
unchanged total projected area; it rejects conflicting surface heights at
sampled positions. It also samples water contact on both banks throughout the
fully influenced interval and records the geometry payload cost.

Intentional limits: the coarse portal edge itself remains unchanged, with a
two-metre fade toward it. The parent must coordinate the regional and village
edge before removing that residual seam. Regional Z−138's approximately
2.695 m physical mismatch, the receiving pool's finite boundary, authored
gorge silhouettes, and upper-lip geometry are untouched. No runtime visual,
motion or performance approval is claimed from these focused geometry tests.

## Revised dry ground after H rejection

H's preserved coarse visual floor was the problem: at Z−124 on the west bank,
its new dry break was approximately Y−0.022, but the return at distance 5.69 m
was still Y−0.757. That created a roughly 0.735 m landward drop across 0.59 m,
an artificial ridge backed by steep/dark normals. The narrow-band tests had
incorrectly protected this coarse visual error as a requirement.

The current revision retains the same selected original triangles and same
Z−132..−112 limits, water mesh, toe, dry break and portal taper. It removes the
5.69 m return cut. The dry portions of those triangles now sample the unchanged
physical terrain with the existing 0.045 m rendering offset. Where an original
triangle edge has two dry endpoints, cut vertices keep its original plane so
external neighbour triangles meet exactly; mixed wet/dry edges are refined
from both sides. There is no separate overlay. This explicitly changes visual
dry ground outside the former 5.69 m band, without modifying physical heights,
collisions, routes, population or world bounds.

Measured changed vertices reach bank distance 7.34981 m, with X43.88619..58.32110.
The maximum dry lift relative to the former coarse surface is 1.09213 m; this
restores the existing physical support instead of raising the support. Ground
outside the selected original triangles and outside the Z interval is retained.
The untouched portal edge and isolated reference slice remain exact.

| Z−124 west distance from river center | Original coarse visual Y | Revised visual Y | Unchanged physical Y |
|---|---:|---:|---:|
| 5.1001 m | −1.02889 | −0.02228 | 0.02286 |
| 5.69 m | −0.75749 | −0.02338 | 0.02158 |
| 6.2 m | −0.52383 | −0.02436 | 0.02051 |
| 7 m | −0.15731 | −0.02590 | 0.01892 |

Dry normals now use the smooth physical terrain gradient, with the existing
Z taper, rather than differentiating the artificial return ramp or crossing
its discontinuous normal blend. Bevel normals transition to the dry ground
normal at the dry break. Across 127 new dry vertices in the fully influenced
interval, minimum normal Y is 0.9997067. This verifies upward dry-ground normals;
it is not a promise that all lighting/shadows in the next capture will pass.

Focused test result: **5/5 passing**. Across 7,636 actual rendered dry samples
(both banks, Z−129.931..−114, distance 5.12..8.9), maximum error relative to
physical height minus 0.045 m is **0.001262 m**. Every measured dry point remains
at least **0.043738 m below** physical support. Maximum landward drop between
0.083 m samples is **0.000574 m**, replacing H's ridge. Another 2,593 external,
portal and unaffected samples retain baseline heights. The tests still check
actual water contact, exact slice geometry, bounds, projected area and winding.

| Current geometry cost | Original | Revision | Delta |
|---|---:|---:|---:|
| Triangles | 42,880 | 44,018 | +1,138 (2.65%) |
| Vertices | 21,735 | 22,435 | +700 |
| Raw position/normal/UV/index payload | — | — | +29,228 bytes |
| Prepared geometry payload | — | — | +43,228 bytes |
| Draw/material delta | — | — | 0 |

This is 206 fewer added triangles than H. The previous west-water contact
measurements still hold. Z−132's coarse edge, Z−138's physical mismatch, the
pool boundary and the authored gorge are deliberately unchanged. No full
build, global suite, browser, Blender or performance run was performed by this
agent. Matched runtime pixels and motion remain the coordinator's acceptance
gate; H's failure demonstrates why the scalar checks alone are insufficient.
