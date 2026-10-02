# Haven wildlife asset contract

Status: revision 2 deer authored/exported through active Blender MCP, inspected in isolated renders, and validated against the runtime gait/contact contract. Revision 2 runtime appearance, independent art criticism and uninterrupted behavior evidence remain pending. This is not L1/B1/B2 approval.

`tools/blender/wildlife/wildlife.py` rebuilds only the named `Haven_Wildlife` scene and exports `public/assets/creatures/haven-wildlife.glb` plus `.json`. The editable scene is saved beside the source as `haven-wildlife.blend`. `deer.py` authors the original connected anatomical deer skin, weights and paint. Authoring uses original anatomical loft sections, tapered relief leaves, shell topology/scutes and feather fans. Facial beads are used only for eyes/nose features, never body construction.

| Runtime species | Root | Intended form |
|---|---|---|
| deer | Wildlife_Deer | Bracken deer, large listening ears, elongated muzzle, cream throat, fine divided hooves, long hocks |
| terrapin | Wildlife_Terrapin | Reed terrapin, inlaid domed shell, striped neck, webbed clawed feet |
| songbird | Wildlife_Songbird | Coppercrest songbird, copper crown/breast, teal mantle, dark layered pinions and tail |

All roots export at origin, scale one, metres, +Y up and +Z forward. Contact is Y=0 (numerical lowest vertex is recorded as `contactY`). Never apply review arrangement positions to runtime. Each named species root may be cloned independently; meshes/materials may be shared across clones. Material base colors and separation must survive the game's stylized material conversion. Small facial meshes should remain visible at suitable close distances.

Pivots use globally aligned **glTF** rest axes and names prefixed by species, for example `deer_NeckPivot` and `songbird_Wing_L`. Revision 2 deer pivots are armature bones; terrapin/songbird retain transform parts. The JSON `species[key].pivots` maps stable semantic names to exact exported names. Runtime saves rest transforms before applying motion. Deer bones point along Blender +Z so the export retains identity rest rotations; do not change their authoring axes to Blender +Y. Clone a whole species root with SkeletonUtils so deer bones are independent.

Ground pivots: `BodyPivot`, `NeckPivot`, `HeadPivot`, `Leg_FL`, `Leg_FR`, `Leg_BL`, `Leg_BR`, `TailPivot`. Deer legs include child `Knee_*` and `Hoof_*`. Local X controls gait pitch and feeding neck bend. Terrapin feeding/reaction also permits small head extension. Neck/head look uses local Y yaw. Runtime owns coherent root travel, foot placement, transitions and habitat behavior.

Bird pivots: `BodyPivot`, `HeadPivot`, `Wing_L`, `Wing_R`, child `WingTip_L/R`, `TailPivot`, `Foot_L/R`. Wings are authored outstretched. Mirrored local Z flap moves wing tips vertically. Local Y wing sweep folds them against the flank; local Z secondary flex folds them down. Runtime provides perched, takeoff, fly, glide, land transitions and grounded foot/perch contact. Scale and foot contact stay separate from flight root lift.

No embedded clips are required; this asset intentionally exposes transform parts for runtime-controlled blending. Feed, rest, walk and react must remain distinguishable actual motion and not labels over static animals. JSON includes measured mesh/triangle totals and bounds. Budgets: deer <15,000 triangles; terrapin <7,000; songbird <5,000. Runtime and uninterrupted motion review remain required after Blender inspection.

## Revision 1 authoring evidence and handoff (historical)

Blender 5.2.1 LTS / MCP addon 1.7 protocol 11 inspected live before production. Root explicitly transferred ownership after gorge author released it. Prior scenes preserved with unchanged object counts: Haven_Architecture 211, Haven_Dragons 15, Haven_Geology 34, Haven_Transport 36, Scene 3. Source syntax compilation passed using bundled Python. Live source execution, export, measured bounds and isolated rendered review were performed; no standalone background Blender bypass was used.

Final candidate GLB: **248,228 bytes**, SHA256 `5B99D494154DBEDD0169BE29E0B4E26B2B119E7379BD7FDE73AC535FF9C93D74`. Deer **5,972 triangles / 28 meshes**, terrapin **3,446 / 16**, songbird **2,520 / 14**. ContactY values are respectively 0.0007148981, 0.0073212236, 0.0031848922 metres. Exported root/pivot rotations are identity and translations use the declared glTF basis.

Original isolated evidence in `evidence/wildlife/`: three-quarter deer, terrapin, songbird, side deer feeding and folded songbird. 1200×1000 Cycles, 32 samples, orthographic studio; these are **Blender authoring views**, not production gameplay or animation evidence. `review.py` reproduces them. Inspected defects fixed include floating flank patches, buried bird breast coloring, oversized rim scutes and shoulder contour. Markings now use shared original surface faces.

Pose inspection corrected the runtime wing-fold sign: for `side=+1` on L, `-1` on R, rest wing Euler **Y=-side*1.2, Z=side*.25** sweeps rear/down. The previously proposed Y=side*1.1/Z=-side*.7 raised and swept wings forward and must not be used. Deer feed NeckPivot X=1.35 plus HeadPivot X=.15 places the muzzle in low browsing range; contact/vegetation in the actual habitat still needs inspection.

Residual limitations: transform-part shoulders/hips have visible anatomical seams at extreme views; markings have geometric edges; feet do not supply inverse kinematics. Close moving anatomy, appropriate foliage contact, takeoff/landing continuity, runtime shader fidelity and independent artistic quality remain unverified. These assets are candidates for integrated criticism, not a claim of AAA acceptance.

## Revision 2 — connected Bracken skin, 2026-09-30

The revision-1 source, editable scene, review script, GLB and JSON are preserved in `tools/blender/wildlife/revision-1/`. Those source files are archival copies with their original relative path assumptions; use the preserved GLB for runtime comparisons and the preserved `.blend` for direct editing/inspection.

Original loft sections now distinguish forward ribs, a tucked loin, brisket, shoulder muscle and rounded haunch. A voxel union, relaxation and controlled reduction produce one connected exterior through torso, neck, head and four upper/lower limbs. A tiny enclosed remesh scrap is explicitly removed and a regression check verifies a single connected component. This is procedural sculptural authoring with reduced topology, not manual quad retopology. Ears, eyes, nose, tail and hoof details retain rigid attachments.

The 16 named joints preserve revision-1 translations, hierarchy and globally aligned glTF axes. Rigid hoof surfaces remain descendants of each `Hoof_*` joint; the existing `DeerGait` IK still measures their actual sole geometry. No gait solver, collision radius, behavior or acceptance threshold was changed. Skin weights blend at shoulder/hip/neck/knee junctions. CPU evidence must call `SkinnedMesh.updateMatrixWorld` and sample `getVertexPosition`; raw POSITION attributes cannot measure a posed skin's envelope.

The deer skin exports linear float RGB `COLOR_0`, an implicit white glTF base color and `extras.authoredVertexColor=true`. Its throat, underside, rump and faint flank markings share the surface. The narrow opt-in branch in `src/game/assets.ts` multiplies these colors by the material base color and preserves them through `prep`; all unflagged assets use the old import path. Keep `export_extras=True`, or the opt-in flag is lost. This export/import contract was inspected; actual in-game color fidelity still requires the coordinator's new build and visual review.

Measured export: **493,412 bytes**, SHA256 `7A36480ABC2D184D6714E80E358E7CA7EC785B3473A78FA7EA16422FDF56AD99`. Two consecutive live Blender MCP rebuilds yielded the same hash. Deer: **11,070 triangles / 16 meshes**, including **9,398 triangles / 4,701 vertices** in its connected skin. ContactY **0.00071489235 m**. Bounds in glTF metres: min **[-0.312689, 0.000715, -0.87]**, max **[0.312739, 1.985, 1.362679]**. Terrapin remains **3,446 triangles / 16 meshes** and songbird **2,520 / 14**; tests compare their geometry attributes, indices, local transforms and material colors exactly against revision 1.

Validation: `npx tsx --test tests/deer-gait.test.ts tests/wildlife-assets.test.ts` **6/6 pass**; `npx tsc --noEmit` passes. Tests cover exported sole contact on flat/sloped terrain, walking/stopping, actual Mosswood route poses and the existing 1.6 m envelope, saved/offscreen behavior, normalized weights, connected topology, cloned-bone independence and unchanged other wildlife. Tests do not approve animation or appearance. Dist was not rebuilt by the asset specialist.

Blender 5.2.1 LTS / addon 1.7 / protocol 11 was inspected through MCP. Preserved unrelated scene object counts: Architecture **211**, Dragons **15**, Geology **40**, Siltfin **14**, Transport **36**, Scene **3**. Only Haven_Wildlife was replaced. Repeat-export cleanup removes only unused wildlife-owned datablocks. Current wildlife scene contains **71 objects**.

Directly inspected authoring images in `evidence/wildlife-r2/`: `deer-side.png`, `deer-front.png`, `deer-threequarter.png`, and `deer-side-feed.png`. These use the reproducible `review.py`, 1200×1000, Cycles 32 samples, Standard view transform, orthographic studio, with no gameplay background. The feed image uses NeckPivot X=1.35 and HeadPivot X=.15. They show smoother shoulder/haunch continuity and a less uniform torso, but cannot establish runtime shader fidelity, hoof grounding or contiguous animation. The feed pose retains noticeable neck-base compression; the eye beads, thin ear shells and boot-like hoof/pastern transition remain stylized close-view limitations. Runtime movement, ordinary approach and a fresh independent critic remain required; revision 2 is an integration candidate, not Q4 approval.
