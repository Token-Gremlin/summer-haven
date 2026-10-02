# EZ Tree source snapshot

[Daniel Greenheck's EZ Tree](https://github.com/dgreenheck/ez-tree), MIT,
commit `dcf309bd86bd521083d9c70f01f2de45fdc7c457`.

This is `src/lib/` from that revision, excluding the unused barrel. JavaScript
and preset JSON are preserved except for the marked `minBranchRadius` guard in
`tree.js`: distant levels can omit subpixel twigs without changing leaf anchors.
`tree.d.ts` is Summer Haven's small typed
boundary. The full upstream license is alongside the source.

The npm 1.1.0 build predates the skeleton-preserving `createGeometry(detail)`
API. Pinning this source avoids silently using incompatible geometry or the
older package's embedded textures. Upgrades must preserve shared skeletons,
leaf anchoring, camera clearance and the measured forest budgets.

Summer Haven's adapters are `world/woodland-catalog.ts`, `world/woodland.ts`
and `render/woodland-material.ts`. They do not use EZ Tree's standard material,
camera or demo scene. Texture provenance is in `docs/ATTRIBUTION.md`.
