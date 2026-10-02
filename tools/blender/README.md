# Original asset workshop

These Blender Python sources author the original Summer Haven meshes. They were run through the connected Blender MCP in Blender 5.2.1 LTS, inspected in Blender, exported to glTF, and inspected again in the live game.

- `characters.py`: two adult body silhouettes, 22 compatible joints, facial geometry, eight haircuts, six tops, four bottoms, three shoes, three accessories, ten skeletal actions.
- `world_assets.py`: town bicycle with separate wheel/steering/crank nodes, three buildings, eight furniture pieces, Mikan the cat, a vine pergola, fruit market stall and garden pump.
- `export_assets.py`: reproducible rebuild, finite-coordinate/unit-scale checks, duplicate-vertex cleanup, normals, source-file saving and GLB export.
- `hair.py`, `clothing.py`, and `garden_assets.py`: fitted locks, tailored wardrobe details and neighborhood hero props. Loaded by the main authoring scripts.
- `presentation.py`: a visible default masculine outfit and a separated grid of world assets for inspecting the source files. This layout runs **after** GLB export. World root offsets in the `.blend` are for presentation only; rerun the export script to rebuild origin-clean runtime assets.
- `characters.blend` and `world-assets.blend`: editable production scenes with organized collections. Other wardrobe modules are present and hidden in the character scene; switch visibility to inspect them.

Set `SUMMER_HAVEN_REPO` to the checkout path, then execute `export_assets.py` from Blender or MCP. A rebuild replaces only the named production scenes and the generated files in this repository. It does not reset the user's Blender scene.

Characters use metres, Blender Z up, and face -Y. The GLB export produces Y up and +Z forward. Mesh transforms are identity and wardrobe pieces share the rig's bind space. `HAIR_n_`, `TOP_n_`, `BOTTOM_n_`, `SHOE_n_`, and `ACC_n_` are the runtime selection contract. Covered torso, upper arm and leg meshes are hidden; selected pieces are merged by material into temporary draw batches without changing their shared skeleton. Hair and cloth attachment joints support restrained secondary motion. Runtime two-bone IK places bicycle hands and feet against the grips and crank.

The bicycle's `wheel_front`, `wheel_rear`, `steering`, `crank`, `pedal_L` and `pedal_R` nodes remain separate. `grip_L` and `grip_R` are exported hand targets under the steering assembly. Pedal platforms counter-rotate against the crank to stay level, and runtime IK uses the actual grip/pedal transforms. Architectural and furniture pieces are consolidated by material. Runtime collision uses simple circles and rotated boxes matched to the buildings and furniture; render meshes are never used as expensive per-triangle physics colliders.

The source scripts contain original geometry; no downloaded character models, textures or animations are required. Reference-derived vegetation, minor props, shaders and synthesized audio are credited separately in the repository's attribution document.
