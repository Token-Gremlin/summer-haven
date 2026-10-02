# Wildlife revision 3 authoring handoff

Date: 2026-09-30 UTC. Base checkpoint: 3c0cd57 on feat/fantasy-gauntlet.
Owner: deer_artist_11. Scope: draft authoring only. No production/public asset,
runtime source, game save, browser or publication changes.

## Inputs and actual inspection

Read the complete user objective, frozen acceptance-v1.md, reference-evidence.md,
wildlife-10.md and the staged authoring/readme/tests. Applied N4's expressive
economy and grounded-placement principles as recorded in the reference study;
no new external reference pixel or motion inspection is claimed.

Blender MCP reports 5.2.1 LTS, protocol 11, add-on 1.7. Initial filepath was empty,
dirty=false. Scenes: Haven_Architecture 211 objects, Haven_Dragons 15,
Haven_Geology 40, Haven_Siltfin 14, Haven_Transport 36, Haven_Wildlife 70,
Scene 3. All seven were preserved in the draft's
session-preservation/pre-authoring-scenes.blend before mutation. The six other
scene object counts remain unchanged. Rebuild now refuses shared scene objects.

Inspected original staged face/side image pixels and live scene, then revised
the chest/brisket volume, shoulder loft silhouette, haunch integration, lower-leg
and pastern volume, nasal pad and mouth. Existing surface-conforming almond
eyes/lids and continuous vertex paint are retained. Named joints, axes and dark
cloven sole surfaces are preserved exactly.

After authoring, inspected actual neutral-light Blender side, front,
three-quarter, face and feeding pixels. The neck bends continuously and the
receiving plane makes sole placement visible. The feeding review initially
failed to change pose because quaternion mode ignored subsequent Euler values;
the preview now explicitly sets neck/head mode before applying feeding angles.
The corrected feeding image was rendered and inspected.

## Reproducibility and checks

Draft export: tools/blender/wildlife/revision-3-draft/export/haven-wildlife.glb.
Editable source: tools/blender/wildlife/revision-3-draft/haven-wildlife.blend.
Authoring: wildlife.py loads deer.py from the same directory; run in Blender with
its actual __file__. review.py isolates species and writes diagnostic images.
The Blender source is saved at neutral export pose; review posing does not
overwrite that source or the GLB.

Deer: 12,112 triangles, 15 meshes; connected skin 4,702 vertices. Terrapin:
3,446 triangles/16 meshes. Songbird: 2,520 triangles/14 meshes. No texture
downloads, generated third-party assets or paid services used.

Seven tests pass in tests.txt. The original six tests and their limits remain
unchanged: flat/sloped contact and stopping; simulation independence; actual
Mosswood routes; normalized connected skin/independent skeleton clones;
unchanged terrapin/songbird geometry/materials; exact revision 2 joint axes,
translations and cloven sole geometry. The new test adds connected coronet
terrain clearance and attachment throughout walking/stopping/feeding on three
slopes. Minimum skin clearance is 0.058682 m; maximum nearest skin/hoof vertex
distance is 0.007151 m against a 0.020 m attachment limit. This sampled
nearest-vertex check is support evidence, not proof of all surface contacts.

A second complete live Blender MCP rebuild reproduced the GLB byte-for-byte:
46e075749d14876c05d320327f6a1a3e181b92f3d8474fb97e766ba71d50a63e.
See repeat-export.json and hashes.json. Production revision 2 still hashes
7a36480abc2d184d6714e80e358e7ca7ec785b3473a78fa7ea16422fdf56ad99.

## Limits and next decision

These are authoring diagnostics, not B2/L1/Q4 approval. Runtime importer shader
replacement, actual temporal contact, ground material integration, normal-camera
approach, sound and independent comparison remain unverified by this author.
The face is still restrained from the front; shoulder/haunch shading has some
visible broad facets, and the unchanged paired sole forms remain simple.
The feeding muzzle is above the ground plane, suitable only for a grazing-height
assessment in the actual habitat; no vegetation contact is certified here.

Coordinator should compare staged revision 3 against preserved production
revision 2 under matched runtime front/side/three-quarter and distinct medium
approach views, then obtain a fresh critic. Follow with contiguous normal-camera
rest/start/walk/turn/stop/feed/react and unobstructed slope contact evidence.
No visual or simulation gate has been relaxed or marked passed by this record.
