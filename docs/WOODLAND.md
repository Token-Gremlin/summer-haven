# Botanical woodlands

This round replaces the village and valley tree canopies with seeded trees
based on [Daniel Greenheck's EZ Tree](https://github.com/dgreenheck/ez-tree).
The existing terrain, roads, water, buildings, wildlife and character assets
are preserved: 245 village trees, 2,123 valley trees and 331 valley cells.

## What changes on screen

Oak, ash, aspen and pine have different branching and crown shapes. Detailed
leaf sprays replace solid canopy shells; trunks use photographed bark, subtle
moss and small buttress roots. Aspen foliage is tinted summer green and its
bark is lighter. Shared wind moves branches and leaves in the scene, reflected
image and sun shadow. Existing garden shrubs and groundcover are retained.

Near leaves use mipmapped cutouts with alpha-to-coverage when MSAA is enabled.
Custom mip levels preserve the coverage of thin leaves as they become smaller.
The four source photographs are packed into one runtime atlas to keep the
alpha-tested scene and shadow passes inexpensive on integrated GPUs. The
original image files are kept unchanged.

## Rendering budget

Each seeded skeleton creates four shared geometry levels. Close trees use
roughly 7,000–20,000 triangles; the most distant templates stay below 700.
Coarser levels reuse the same skeleton and leaf anchors, reduce branch rings,
omit subpixel twigs and use fewer, larger sprays. Complementary coverage over
short transition bands prevents two solid levels from fighting for depth.

| Preset | Detailed crown ends | Middle level ends | Distant level starts |
| --- | ---: | ---: | ---: |
| Low | middle level from the start | 12 m | 44 m |
| Medium | 7 m | 23 m | 70 m |
| High | 16 m | 38 m | 105 m |
| Ultra | 24 m | 52 m | 145 m |

These distances have overlap bands; they are not hard visibility cutoffs.
The same levels are used in Entire landscape mode. Full visibility retains
the trees out to the existing 1,600 m scenery range without drawing every
tree at its highest detail.

Instances share geometry/materials, are sorted front to back and culled against
a camera frustum with a guard band. Stationary views reuse instance buffers.
Shadows and reflections have their own lower-detail populations so a nearby
tree does not force the mirror to render its full leaf mesh. Far shadows use
opaque clusters fitted to the real crown; close shadows retain leaf cutouts,
with a short coverage transition between them. Wind remains on
the GPU. No per-leaf JavaScript simulation or additional world population is
introduced.

The camera hull follows the close-range crown and allows passage below it.
The enlarged sprays used far away do not create invisible walls around the
player. Ground collision remains a separate trunk proxy.

## Source and reproduction

- `src/vendor/ez-tree/`: pinned upstream source, presets and license.
- `src/world/woodland-catalog.ts`: species fitting, roots and shared geometry.
- `src/world/woodland.ts`: instancing, quality selection, culling and lighting populations.
- `src/render/woodland-material.ts`: leaf transmission, bark and MRT output.
- `src/render/leaf-mips.ts`: coverage-preserving mip generation.
- `tests/woodland.test.ts`: geometry budgets, camera clearance, quality changes and mip coverage.
- `tests/forest-performance.js`: repeatable populated-scene measurements from `?qa=1&prof=1`.

Run `npm ci`, `npm test` and `npm run build`. No runtime download from GitHub,
Blender installation or new service is required. Geometry generation is
deterministic and cached once per seed. See [attribution](ATTRIBUTION.md) for
the upstream MIT notices and ambientCG's CC0 bark texture.

See [the validation report](WOODLAND-QA.md) for real captures and measured limits.
