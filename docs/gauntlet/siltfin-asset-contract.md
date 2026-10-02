# Vesper Siltfin — candidate 01 asset contract

Original wingless river dragon candidate, awaiting gameplay inspection and fresh independent critique. The diagnostic images and numerical checks below do not constitute approval of D1/D2/B1/B2 or the quality gates.

## Files and reproduction

- Runtime: `public/assets/creatures/vesper-siltfin.glb` and adjacent `.json`.
- Editable source: `tools/blender/siltfin/vesper-siltfin.blend`, scene `Haven_Siltfin`.
- Reproduction: execute `tools/blender/siltfin/vesper.py`, then `review.py`, then `inspect.py` in connected Blender 5.2.1, setting each script's `__file__` to its absolute path. The local `siltfin_meshcraft.py` contains the mesh construction helpers. The builder replaces only `Haven_Siltfin`; the review script produces the saved studio scene and 13 images; inspection adds measured clip bounds, contacts, hashes and exported-channel checks to JSON.
- No downloaded models, generated textures, external services, corrective morphs or runtime IK dependency.
- Final GLB: **1,036,992 bytes**, SHA256 **`ed1037ae7b43b059a236feec4c2fc60bb38d043cf8687760aac8fc54fba45905`**.

## Geometry and coordinates

GLB metres, +Y up, +Z forward. Root `RIG_Vesper_Siltfin` has identity transform. Do not center the bounding box or apply a forward offset: nose is at positive Z and the long tail extends behind the origin. Neutral soles are at local Y=0 within 0.0000001m. The internal `root` bone retains its authored bind offset; do not reset individual bone translations.

**22,054 indexed triangles, 40 bones, eight meshes, one material per mesh.** No subdivision modifiers, morph targets or root translation animation channels are required. Fin material is double sided. Neutral dimensions are 2.414000m wide × 2.185585m high × 8.941402m long.

| Pose envelope | Minimum XYZ | Maximum XYZ |
|---|---|---|
| Neutral | −1.207000, 0, −5.421062 | 1.207000, 2.185585, 3.520340 |
| All six clips, sampled every integer frame | −1.207653, −0.000006544, −5.429688 | 1.208023, 2.421233, 3.524908 |
| Swim | −1.133723, 0.084986426, −5.429688 | 1.173880, 2.185585, 3.519999 |

Allow the oriented full envelope when choosing territory and yaw, or approximately 5.57m radius around the root for conservative horizontal rotation clearance. There are no collision proxy meshes; the runtime should use the supplied envelope rather than the decorative fin tips as physical obstacles.

The body, neck, head and tapering tail form one connected loft; limb branches bridge actual openings in the body surface. Articulated toes and web patches share foot weights. Separate facial regions include a volumetric lower jaw, curved lip and brow, inset amber eyes, upper eyelids, swept crown flutes, cheek fins and chin barbels. Pearl flanks, indigo dorsal surface, raised river scales and copper fin rays provide distinct material regions.

## Water and ground placement

Recommended local waterline: **1.0377006202936172m**. The visible regional water surface is `regionRiverSample(worldZ).y + 0.08`, so place the object at:

`rootY = regionRiverSample(worldZ).y + 0.08 - 1.0377006202936172`

During swim, the lowest geometry is approximately 0.952714m below that surface. Runtime owns horizontal travel and any vertical depth change. Submerge and surface are skeletal gestures without root motion; the upper river's shallow channel does not automatically provide enough depth for complete submersion. Keep bank and bed clearance against the animated envelope.

For flat ground, root Y equals ground Y. Neutral fore soles are approximately −0.000000089m and hind soles −0.000000091m; idle/alert numerical contact drift remains under 0.0000066m. Crawl sole minima stay positive, with lift up to approximately 0.131m. Ground clips assume a flat local support plane; arbitrary steep slopes need runtime placement or contact adaptation.

## Animation

| Exact clip | Seconds | Intended use |
|---|---:|---|
| `idle` | 4.0 | Loop; breathing, face and tail motion with grounded feet |
| `swim` | 2.4 | Loop; lateral axial flex and folded paddling limbs |
| `alert` | 3.0 | One-shot head/jaw/cheek response, returning to neutral |
| `submerge` | 2.4 | One-shot neck/chest diving gesture, returning to swim pose |
| `surface` | 2.4 | One-shot raised-head gesture, returning to swim pose |
| `crawl` | 3.2 | Loop; diagonal stance/swing sequence |

All clips have finite evaluated geometry at every integer frame, and matching endpoint bone matrices (maximum measured error zero). No clip has root travel. Crawl has a 0.40m step and 60% stance period; a starting runtime forward speed of **0.2083333333m/s** approximately cancels planted-foot travel. Exact per-clip envelopes and foot-height ranges are in `deformation` in the manifest. Skeletal joint translations are intentionally baked; preserve them alongside rotations.

## Mesh and material routing

| Mesh | Material prefix | Authored base color |
|---|---|---|
| `Vesper_Pearl` | `skin_SiltfinPearl` | #a8bbc0 |
| `Vesper_Belly` | `skin_SiltfinBelly` | #d1d0b8 |
| `Vesper_Indigo` | `skin_SiltfinIndigo` | #45516b |
| `Vesper_Fin` | `skin_SiltfinFin` | #6d93a1 |
| `Vesper_Copper` | `hair_SiltfinCopper` | #bb865d |
| `EYE_Vesper_Ink` | `ink_Siltfin` | #192b38 |
| `EYE_Vesper_Iris` | `iris_Siltfin` | #deaf56 |
| `EYE_Vesper_Glint` | `eye_Siltfin` | #f3e4c1 |

Materials may receive Blender numeric suffixes after regeneration; match stable prefixes. Preserve authored color regions and the `EYE_` distinction in runtime shading. Rig bone names and exported mesh names are recorded verbatim in JSON.

## Evidence and preserved scenes

`docs/gauntlet/evidence/siltfin/` contains `three-quarter`, `front`, `side`, `face`, `limbs`, `swim-left`, `swim-right`, `alert`, `submerge`, `surface`, `crawl-a`, `crawl-b`, and `tail` PNGs. These are actual posed 1080×810 Blender diagnostic renders. Camera positions, frame numbers and image hashes are in `review.views` in JSON. Final front, side, swim and close views were visually inspected, in addition to per-frame numerical deformation checks and the connected Blender viewport/scene inspection.

Unrelated scene object counts remain unchanged: `Scene` 3, `Haven_Dragons` 15, `Haven_Architecture` 211, `Haven_Transport` 36, `Haven_Geology` 34, `Haven_Wildlife` 98. `Haven_Siltfin` contains 14 objects including its diagnostic floor, camera and lights; only the creature rig and eight skinned meshes are exported.
