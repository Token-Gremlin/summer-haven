# Entry-road clearance contribution

Recorded 2026-09-30 02:29 UTC. Source contribution only; the coordinating agent owns the subsequent built-game traversal and independent review. This does not pass J1/J2 or certify visual sign readability.

## Observed faults and correction

The coordinating agent observed a bicycle stall at `(10.826624, 1.533846, -179.4600)` in frozen build `rs5CDbKv`, with the milepost across the main road; evidence is `evidence/journey-07/road-obstacle.png`. The production milepost post and panel were centered at `(10,-180)` on the widening road from `(8,-164)` to `(20,-244)`.

`src/world/regions.ts` moves the complete milepost assembly, its collisions, lettering and interaction exactly **5 m east** to `(15,-180)`. The reading interaction is `(15,-178.8)`. The panel collision envelope has a minimum **0.482664 m** horizontal gap beyond the advertised road half-width plus the bicycle's actual `0.45 m` collision radius. The sign continues facing south toward arriving players. Its post/panel remain solid.

The slowdown near `(-3.088,-97.256)` corresponds to a village-generated cedar trunk at `(-3.7658710721880198,-97.72001838125288)`, radius `0.36 m`. Region trees start at `z=-132`, so they cannot cause that northern-village overlap. `Village.plants()` runs before `Regions.build()` adds the connecting road, leaving its tree-placement exclusion unaware of the road.

`src/world/village.ts` now reserves the exact first `REGION_ROUTE` segment, with its `5.2 m` width plus each existing tree camera-proxy radius and the bicycle radius. Filtering occurs only after the existing random transforms are consumed. The rendered connector also now reads these same existing route nodes. No route, terrain, collision behavior, canopy proxy size, or random seed changes.

Only four intersecting tree instances and their associated trunk/camera collisions are removed:

| x | z |
|---:|---:|
| -2.357667054981 | -84.475912422175 |
| 0.154874779982 | -125.295418899274 |
| -3.765871072188 | -97.720018381253 |
| 1.045650976012 | -116.391203220002 |

A production `Village.build()` before/after geometry probe counted **249 → 245 trees**. Every retained instance matrix was exactly equal to a baseline matrix: zero new positions, rotations, scales or changed variants. The west-verge tree at `(-6.579529,-119.497753)` remains. Probe snapshots are in local `.cache/roadside-before.json` and `.cache/roadside-after.json`.

## Verification

`tests/roadside-clearance.test.ts` executes actual `Village.build()`, `Regions.makePlaces()` and entry-region `makeCell()` generation. Only canvas painting and loaded decorative assets are stubbed. The test uses actual registered collisions and authored sign mesh vertices, not replacement obstacle placement formulas.

- Before editing, the new collision test failed at `(-2.551878,-83.776918)` on the entry-road edge, and the sign approach failed at `(10.4,-180)`.
- After editing, **3/3 tests pass**: more than 9,500 bicycle-radius samples across the complete advertised width from village entry to city gate; sign collisions and unobstructed reading approach; all physical sign and lettering vertices beyond the road plus bicycle radius.
- `npm run typecheck`: passed.
- `bank-trail`, `trail-junction`, and `world-regions`: **18/18 tests passed** together, preserving prior bank-trail, junction and terrain behavior.

No browser, Blender, whole-game bundle build, publication, or push was performed by this contribution. Actual approach readability, moving-camera behavior, and bicycle traversal await the coordinating agent's updated runtime evidence.
