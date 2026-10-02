# Nature refinement 09 — production record, not approval

Scope: [nature-focus-09.md](nature-focus-09.md). This contribution changes nature
inside existing world bounds. It adds no regions, terrain cells, trees, wildlife,
textures, shader samples, save fields or content downloads. The runtime and
independent critic must judge the candidate; this record certifies neither
appearance nor performance.

## Inspected evidence

The author opened actual historical PNGs `forest-trail-start-06.png`,
`forest-gait-glade-live-05.png`, `contact-comparison-08/bank-arrival-29.png`
under `evidence/`, and `../screenshots/polish/river.png`. These suggested repetitive
heavy upright crowns, isolated narrow grass spikes, exposed ground between them,
and abrupt planted/unplanted bank rhythms.

Before judging the production change, the author also opened the new actual
`evidence/nature-09/baseline-mosswood.png` and `baseline-upper-bank.png` pixels.
Those show the same thin isolated grass and upright crown issue. The coordinator
reports compiled baseline `BoqztZFN`, disposable origin 4176, High with explicit
1024 shadows/FXAA/reflections false/resolution 1/vegetation 1/nearby 240/time .18,
visual clock 84; accompanying JSON records are the source for exact captures.
The author did not control the game or independently measure that runtime.

## Authored change

- `props.ts`: reshape existing round/tall/cedar leaf vertices into unequal
  shoulders and an offset leader, with no additional cards or tessellation.
  Retain the original leaf bounding box exactly, preserving the canopy selection
  envelope and all tree instance transforms. Recompute normals and blend foliage
  normals toward the large crown shape. Bushes are unchanged. Geometry remains
  code-authored through the existing tree builder; no new Blender asset is claimed.
- `vegetation.ts`: regional grass keeps ten two-segment blades (40 triangles),
  with broader leaves, a lower curved silhouette and less wind displacement.
  Add a shared eight-leaf, folded understory plant (32 triangles), using opaque
  geometry and the existing grass material instead of an alpha texture.
- `regions.ts`: use a continuous world-space patch pattern on existing candidate
  points; no additional sampling population or random draws. Forest/rocky cells
  select low understory for their second existing vegetation batch, while open
  ground retains flowers. Keep the deer feeding opening low and free of broad
  plants. Existing flower origins are lifted to put their roots at ground height.
  Stronger full-footprint exclusions account for geometry and maximum horizontal
  wind at routes, the optional bank trail, buildings and water. Foliage culling
  spheres include an additional wind allowance.

No changes were made to route/terrain definitions, wildlife, saves, water shaders,
village countryside, renderer settings or quality/distance controls.

## Structural measurements

These are CPU-side geometry/placement inspections, not GPU or FPS measurements.
The complete production cell selection was generated before and after the patch.

| Metric | Baseline | Candidate |
|---|---:|---:|
| Region cells | 331 | 331 |
| Regional trees | 2,123 | 2,123 |
| Regional groundcover instances | 27,156 | 24,891 |
| Maximum groundcover batches per cell | 2 | 2 |
| Candidate all-world floor triangles before culling | — | 939,796 |
| Candidate all-world floor batches before culling | — | 661 |
| Low round/tall prototype triangles | 1,228 | 1,228 |
| Low cedar prototype triangles | 744 | 744 |
| Regional grass triangles | 40 | 40 |
| New understory triangles | — | 32 |

Groundcover population decreases 8.3%. The SHA256 of the complete ordered tree
instance-matrix buffers is identical before and after:
`ee60e1f256b9fba0d56dc6f5693e5c0c05925fe3cc256a0edff4727ff5ec5037`.
These counts do not include separate legacy village or feeding-contact patches,
which were not repopulated by this patch. Actual rendered draw calls also include
shadows, reflections and other passes and require runtime measurement.

## Checks performed

- TypeScript typecheck passed.
- Existing bank-trail, roadside-clearance and habitat-terrain tests: 11 passed.
- New `tests/nature-focus.test.ts`: 3 passed. It generates all production region
  cells, verifies the frozen baseline tree-transform digest and population
  limits, checks the actual shared geometry triangle budgets, and checks more
  than 400,000 transformed floor-vertex/wind-extreme samples against actual path
  and water contracts across the world.

The contribution author did not run the full build or full suite, commit/push,
mutate Blender, or control a game/browser tab. The coordinator owns integrated
builds and runtime review.

## Required runtime review and limits

Matched Mosswood, upper-bank and village views must judge whether the crown
shoulders read naturally and whether the lower broader plants provide enough
coverage at normal playing distance. The shape change is bounded rather than a
new botanical tree family. The forest is still produced from six shared region
tree prototypes. A periodic broad patch function is not a habitat simulation.

Inspect close/medium crowns and their LOD behavior, dry ground contact on slopes,
wildlife silhouette visibility, Low/High thinning, evening palette, camera motion,
wind, and the complete bank walk. Clear sampled geometry does not prove a clear
moving camera or pleasing composition. Frame-time comparisons, actual rendered
draw counts, memory/resource behavior and a fresh critic decision remain pending.

## Understory revision 2 — response to independent static review

Read `reviews/nature-09.md`, including the evidence-repair addendum, and opened
actual `candidate-upper-bank.png` (corrected Starroot view) and
`candidate-mosswood.png`. The corrected bank clearly shows regularly pointed,
folded rosettes. Mosswood's feeding opening still has broad clear ground, which
this revision deliberately preserves for the habitat and animal silhouettes.

Replaced the eight-leaf folded star with four unequal curved fronds. Their reach,
rise, curl, angle and width differ; each has four connected segments and smooth
normals, with a quieter tip color. It remains 32 triangles, uses the existing
grass material, and adds no texture or shader work. This is a simplified original
woodland frond fan, not a claim of botanically detailed fern leaflets.

Within forest/rocky cells, existing candidates now preferentially become fronds
in root skirts (1.1–5.2 m from trees in their source cell) and dry bank pockets,
with a minority of grass candidates retained. The existing continuous patch
mask still supplies gaps. No plants are moved into the feeding opening and no
new points are generated. Tree shapes/placement and water/terrain were untouched.
Root grouping uses the already available source-cell trees; it is not a new
cross-cell vegetation or ecology system.

| Metric | First candidate | Frond revision |
|---|---:|---:|
| Regional floor instances | 24,891 | 24,866 |
| Regional floor triangles before culling | 939,796 | 928,668 |
| Regional floor batches before culling | 661 | 661 |
| Frond instances | — | 7,360 |
| Cells / tree instances | 331 / 2,123 | 331 / 2,123 |

The full tree-transform digest remains identical. Typecheck and all three
focused nature tests passed. The population assertion now also prevents growth
above the first candidate, and rendered frond samples verify the glade exclusion.
No full suite, build, game/browser, performance, Blender or Git action was run by
the contribution author for this revision. Revised actual pixels and temporal
quality remain unverified until the coordinator captures and reviews them.
