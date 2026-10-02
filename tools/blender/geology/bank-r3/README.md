# Silverveil observation bank correction — candidate r3

The decorative r2 plateau cap buried the player at (356,−742): runtime evidence measured moss Y56.55025 over analytic ground Y56. This revision fits the existing visual stone/moss/wet cap below the terrain in a continuous bank corridor. It does not change terrain, player movement, creature placement, the waterfall profile or collision proxies.

## Final files

- `public/assets/fantasy/silverveil-gorge.glb`: **1,038,204 bytes**, SHA256 `7557f4c608d6e7e549fc0f33adac394ae7417724e9c96f7ee374492a5deeb8ec`.
- **18,590 visual triangles**, nine material meshes; **18,734 total** including 12 unchanged optional collision proxy boxes. One material primitive per mesh.
- Same identity visual root `GEO_Silverveil`, metre units, Y up, placement `(366,0,−713)`.
- Editable final scene: `../silverveil-gorge.blend`, `Haven_Geology`.
- Prior source, samples, GLB/JSON, blend and original r2 evidence are archived in `../revision-2/`. Restore archived files to their original relative locations before reproducing r2.

## Contact measurements

The full-strength fit covers world X353.4..357.8, Z−797..−737.2. A smooth transition extends to X352..359, Z−799..−735.8. Existing faces are split locally on a 0.5m grid and lowered toward analytic terrain minus 0.18m. No vertices move horizontally; geometry south of Z−735.8, including the falling lip, is untouched. Raised portions of the neighboring boulder remain within its existing proxy.

At (356,−742), final exported moss and wet triangles intersect the vertical test ray at **Y55.8199997**, while analytic terrain is **Y56** and water is absent. This also places these triangles below the earlier runtime-rendered terrain hit Y55.955.

- Actual Blender visual polygons, 0.1m test grid X353.7..356.9/Z−792..−737: **zero raised samples**; closest visual surface is 0.12184m below terrain, at the southern transition.
- Observation disc expanded from 2.2m to **2.47m** for the player's 0.27m radius: **zero unblocked raised samples**. This includes the formerly raised X354 edge strip.
- Independent exported-GLB raycast using Three.js, **3,080 samples**: zero raised samples; closest surface 0.15063m below analytic terrain on that grid.
- Target to nearest proxy: **2.63044m**. Central route band X355.5..356.5 minimum distance to a proxy: **1.90173m**, before subtracting the player's 0.27m radius.
- Existing switchback route proxy clearance remains **2.99460m** minimum beyond its half-width.
- All nine existing `tests/siltfin.test.ts` tests pass, including the creature's full turning envelope, terrain/proxy route and dry target.

Exact rays and source hashes are in `contact-measurements.json`, `export-measurements.json`, and the runtime JSON's `bank_fit` entry. These are sampled geometry checks; root still owns ordinary keyboard traversal, camera contact and gameplay acceptance.

## Render evidence

`bank-contact.png`, `bank-approach.png`, `bank-overhead.png`, and `bank-lip.png` are actual Blender renders, visually inspected. The orange survey marker at (356,−742) has a 0.27m ground disc and ticks through 1.7m height. It is diagnostic context and is not exported. Terrain/water context is sampled and simplified, so these images are not screenshots of gameplay. Blender's viewport screenshot tool returned a blank view on this scene; the saved camera renders and scene inspection are the visual evidence.

The unrelated scene object counts remain Scene3, Dragons15, Architecture211, Transport36, Wildlife98 and Siltfin14. The final geology scene has 40 objects including diagnostics; no diagnostic context is in the GLB.

## Reproduction

1. Run `node --import tsx tools/blender/geology/sample-terrain.ts` and `sample-bank.ts` to sample current analytic terrain.
2. Execute `silverveil.py` through connected Blender with its absolute `__file__`; it invokes `bank_fit.py` before exporting.
3. Execute `bank_review.py`, `inspect.py`, then `bank_inspect.py` similarly.
4. Run `node --import tsx tools/blender/geology/verify-bank-export.ts` and the focused Siltfin test suite.

The broader gorge quality review remains open. This is a targeted contact correction, not independent artistic or gameplay approval.
