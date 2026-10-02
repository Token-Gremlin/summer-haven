# Aurelian Reedwing — candidate asset contract

2026-09-29, revision 3. Original Summer Haven river guardian, authored through the connected Blender MCP (Blender 5.2.1 LTS, add-on 1.7, protocol 11). Revisions 1 and 2 remain unapproved (`reviews/creature-01.md`, `reviews/creature-02.md`); the blinded second review preferred revision 2 while failing hero close-craft. This revision is a **candidate for independent review**, not an acceptance decision. D1, D2, B2 and Q4 remain unapproved until the relevant runtime and moving evidence is reviewed. This first creature does not satisfy D1's second distinct dragon requirement.

## Files and reproduction

- `tools/blender/dragons/aurelian.py`: authored anatomy, topology, material regions, skeleton and six clips; deterministic source, no third-party assets or generators.
- `tools/blender/dragons/meshcraft.py`: spline loft and scale surface helpers.
- `tools/blender/dragons/review.py`: eight original matched diagnostic views plus seven joint/fold/clip views.
- `tools/blender/dragons/inspect.py`: binary export inspection, sampled deformed bounds, per-foot contact and matched-view provenance.
- `tools/blender/dragons/aurelian-reedwing.blend`: editable `Haven_Dragons` scene, rig, meshes, actions and review studio.
- `public/assets/creatures/aurelian-reedwing.glb`: runtime export, 1,520,876 bytes; SHA256 `5750f01b81c8bcc18fe8418cf6b0abf3f07432f24562c57e43188d272ff5c00b`.
- `public/assets/creatures/aurelian-reedwing.json`: build metrics, sample frames/bounds, export names, source/image hashes, exact camera settings and UTC timestamps.

Run `aurelian.py` in Blender with its absolute path provided as `__file__`, then `review.py` and `inspect.py` similarly. The builder replaces only `Haven_Dragons` and its owned data. Other scenes are preserved: `Scene` 3 objects, `Haven_Architecture` 211 and `Haven_Transport` 36. Revision 2's exact GLB, JSON, Blender scene and source files are preserved under `tools/blender/dragons/revision-2/`; do not execute that historical builder from its archive path without restoring its original project-root resolution. Review camera/lights/ground are excluded from the GLB. Source was executed and exported repeatedly through MCP; API enums and shader input schema were inspected on the connected version before authoring.

## Runtime coordinate and topology contract

Units are metres. Blender is Z-up, **-Y forward**. Export converts to glTF/Three **Y-up, +Z forward**. Instantiate at unit scale with no corrective X rotation. Rotate the root about Three Y to face a route tangent (`atan2(direction.x, direction.z)`). Rig origin is the ground reference below the torso, not the mesh centre. Root translation is controlled by the world simulation; clips have no translational root motion.

Bind-pose Blender bounds: min `[-8.507281, -6.057142, -0.015510]`; max `[8.507474, 8.241859, 6.880441]`. Thus Three bounds: min `[-8.507281, -0.015510, -8.241859]`; max `[8.507474, 6.880441, 6.057142]`. Wingspan **17.014755m**, nose-tail extent **14.299001m**, maximum crown height **6.880441m**. Place root Y at sampled terrain height **plus 0.01550956m** for lowest forefoot contact on flat ground, unchanged from final revision 2. This supersedes both revision 1's negative offset and the provisional revision 2 offset of +0.013337. The rear foot minima are 0.01465142m above this contact plane. Uneven ground still requires runtime contact/IK or a suitable flat resting platform.

Idle frame 1 Blender bounds: min `[-2.277846, -6.047046, -0.015510]`, max `[3.027030, 8.188280, 6.892187]`; full-asset folded width **5.304875m** (the curved tail contributes the positive-X extent). Idle and alert foot minima are constant at every inspected integer frame: fore L/R **-0.01550955884m**, rear L/R **-0.00085814297m**. Grounded chest rotation remains zero so that neck/head/tail motion does not rotate the forelegs away from their resting plane.

The final authored geometry contains **39,356 triangles**, **21,384 source vertices**, **9 material meshes**, **45 bones** and one skin, below the frozen 40,000-triangle hero limit. A binary GLB read confirmed nine meshes each with exactly one primitive and one material, one skin with 45 joints, all six animation names, and unchanged revision 2 bone/mesh names. There are **no morph targets**, new shader requirements, subdivisions or external textures. The live review scene has 15 objects including its excluded studio. The broader Blender session can contain earlier orphan data; those are not exported.

Revision 2 changes: transported loft frames across vertical limb sections; continuous elbow/hock sections with blended joint weights; widened wing-root volume; modeled orbital volume and tapered upper/lower eyelids; head-conforming low-relief muzzle/forehead plates; pointed shoulder/flank plates; varied swept reed spines; shallow membrane folds; and a narrower grounded wing-finger fan. Bone hierarchy, mesh names, material prefixes and clip names/durations are unchanged. Limb/wing tessellation was reduced after a provisional 41,756-triangle export; the preserved revision 2 PNGs used its final 39,564-triangle geometry.

Revision 3 supersedes the revision 2 geometry and fold: torso faces were opened at each wing shoulder and joined through a continuous 20-vertex scapular perimeter to the arm surface; the arm is no longer a separate capped tube intersecting the torso. The rest upper arm goes back/down along the flank and the forearm returns forward/up toward the shoulder. World-oriented finger targets layer the folded fan beside the hip. Membrane boundary positions and weights now use the exact same Catmull-Rom finger curves as the spars; the earlier independently parameterized membrane boundaries were removed. A tapered carpal volume and fine membrane veins complete the affected geometry. Skinning alone drives all poses. All current images and the final export use the 39,356-triangle revision.

Rest left-wing joint coordinates in Blender: shoulder `[.770,-1.020,3.650]`, elbow `[1.475526,.542236,3.166211]`, wrist `[1.739297,-1.326141,4.331199]`; right wing mirrors X. Bone rest positions and hierarchy are unchanged. Exact pose coordinates are in `rest_wing_joints_blender` in the manifest.

## Material and object mapping

All mesh objects are direct children of `RIG_Aurelian_Reedwing`; preserve skeletal deformation with `SkeletonUtils.clone` when creating instances. Shader replacement must preserve each material's exported `baseColor`. Names can have Blender's numeric suffixes; classify by prefix.

| Object | Material prefix/name | Intended runtime treatment |
|---|---|---|
| Aurelian_Slate | skin_ReedwingSlate | muted teal smooth skin |
| Aurelian_Scales | skin_DorsalScales | darker low-relief plates |
| Aurelian_Belly | skin_IvoryScutes | warm pale ventral field and transverse ridges |
| Aurelian_Crown | hair_ReedCrown | amber horn, crown, claws and reed spines |
| Aurelian_Sail | skin_WingSail | green translucent-looking **opaque** membrane; double-sided rendering |
| Aurelian_Edge | skin_WingEdge | ochre wing spars and rolled trailing edge |
| EYE_Aurelian_Iris | iris_Amber | amber eye, lacquer/clean shading |
| EYE_Aurelian_Ink | ink_Details | pupil, nostril and mouth; clean dark shading |
| EYE_Aurelian_Glint | eye_Highlight | warm tiny eye reflection |

The existing `Assets.toon(root,true)` preserves these colors and recognizes the `EYE_` object names. `toon(root,false)` assigns the generic house mask and does not treat the iris/ink materials as lacquer. A dedicated creature classification is preferable for integrated outline treatment. Materials are deliberately separated because the existing importer keeps only the first material and clears geometry groups. Vertex-color detail is not relied on.

## Rig and clips

Skeleton: root; pelvis/chest; neckBase/neckMid/head/jaw; six tail joints; upper/lower/foot chains for four legs; wing arm/hand plus four two-joint wing fingers per side. Membrane weights interpolate between adjacent fingers, tip joints and the inner flank; no cloth solver is needed at runtime.

| Name | Duration | Use |
|---|---:|---|
| idle | 5s | grounded neck/head movement, folded/back-swept wings and tail movement |
| flight | 2s | powered wing beat, leg tuck, finger flex and tail follow-through |
| glide | 4s | open wings with small corrections and tucked legs |
| alert | 3s | grounded head turn and slight jaw opening |
| takeoff | 3s | deploy wings and tuck limbs; play once while simulation supplies ascent |
| landing | 3s | extend feet and fold wings; play once while simulation supplies descent |

Loop idle/flight/glide. Alert can play once or return to idle. Takeoff and landing require LoopOnce with clamp and a short crossfade. Resetting/replacing clips without blending is not an approved animation integration. The source contains no sound; territorial behavior, sound, bank/turn, navigation, obstacle avoidance, root flight path and player interaction are runtime responsibilities.

Evaluated Blender Z bounds sampled at every integer frame including both endpoints (30fps; exact frame lists and per-foot ranges in JSON):

| Clip | Lowest sampled Z | Highest sampled Z |
|---|---:|---:|
| idle | -0.015510 | 6.919751 |
| flight | 0.337497 | 7.600857 |
| glide | 0.337497 | 6.973648 |
| alert | -0.015510 | 7.023414 |
| takeoff | -0.015510 | 7.411016 |
| landing | -0.015510 | 7.411016 |

These are full-asset extrema over each sampled clip, relative to an untranslated root. Flight/glide rear-foot minima remain 0.337497m; fore-foot minima range 0.617169–0.685713m. Takeoff begins at the grounded plane and landing ends there. Samples support contact placement but do not prove every interpolated frame or contiguous motion quality.

## Actual evidence and remaining review

`docs/gauntlet/evidence/dragon-aurelian-{three-quarter,front,side,face,rest,flight-up,flight-down,alert}.png` are Blender Eevee diagnostic renders at 1080×810 (1440×1080 at 75%), orthographic review cameras and explicit three-light studio. They show candidate topology, eye/jaw/crown, membrane fingers and sampled deformed poses. The review script records their reproducible camera/clip/frame settings. They are **not gameplay captures or contiguous motion evidence**. Blender viewport screenshots and scene-info calls were also inspected after changes.

The original revision 1 images are preserved as `dragon-aurelian-r1-{same eight suffixes}.png`, and revision 2 as `dragon-aurelian-r2-{same eight suffixes}.png`. Current matched images use the same camera position, target, orthographic scale, frame, resolution, lights and studio. Revision 3 also supplies `rest-side`, `wing-close`, `wing-flight-up`, `wing-flight-down`, `glide`, `takeoff-middle` and `landing-middle` diagnostic suffixes. The JSON records all 15 current PNG hashes, render timestamps and exact cameras/clip frames. The final GLB was exported again after inspection of all six clip families, with the same resulting SHA256.

Known review needs: full wing/shoulder and limb motion; fold silhouette and membrane intersections at intermediate frames; silhouette at player height; palette/surface survival under the custom runtime renderer; actual height and ground contacts; warm-world integration; sustained flight/landing/reaction with appropriate sound. Front/side images deliberately expose geometry that the three-quarter image might hide. No claim of AAA parity, D2 completion or independent approval is made by this builder.
