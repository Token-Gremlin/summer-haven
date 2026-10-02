# Reed Ferry — candidate asset contract

2026-09-29. Original Summer Haven passenger skiff, landing and gangway authored through the connected Blender MCP, Blender 5.2.1 LTS / add-on 1.7 / protocol 11. Candidate for fresh independent evaluation under T1, B1/B2 and Q2/Q4. This asset inspection does not approve a playable trip, rower animation, boarding, collisions, sound or integrated palette.

## Deliverables and reproduction

- `tools/blender/transport/reed_ferry.py`: original hull, fitted boards, benches, bent canopy frame/canvas, rope details, lanterns, oars and modular landing geometry; reproducible export.
- `tools/blender/transport/review.py`: nine diagnostic camera/pose renders and saved studio layout.
- `tools/blender/transport/inspect.py`: actual GLB root/pivot/primitive checks and geometric oar pose inspection.
- `tools/blender/transport/reed-ferry.blend`: editable `Haven_Transport` scene. The saved review layout positions the separate landing/gangway alongside the ferry and stows its oars; the GLB has identity roots and neutral oars.
- `public/assets/fantasy/reed-ferry.glb` and `.json`: visual kit and detailed runtime manifest.
- `docs/gauntlet/evidence/ferry-{three-quarter,front,side,close,boarding,oar-pull,oar-recover}.png`: actual Blender Eevee diagnostic views, 1080×810, three-light studio, floor at Blender Z=-0.43. These expose the whole hull rather than concealing it below a water surface.

Execute the three source scripts in the order above in Blender, with each absolute path passed as `__file__`. The builder replaces only `Haven_Transport`. After production, `Scene` still had 3 objects, `Haven_Dragons` 15, and `Haven_Architecture` 211. No downloaded or generated third-party content, external textures, paid services, runtime edits or Git operations were used.

## Export and material facts

Final GLB: **601.568 bytes**, SHA256 `f18e2fd565662f55af5c35b719b289122ce0f62c8a1467f5ec2fcf0e4a8279a4`.

| Root | Triangles | Material meshes | Origin |
|---|---:|---:|---|
| `FERRY_Reed` | 22.588 | 11 | hull centre at calm waterline |
| `LANDING_Reed` | 3,864 | 5 | centre of top walking plane |
| `GANGWAY_Reed` | 1,084 | 5 | near-end hinge, top walking plane |

All three exported roots have identity translation/rotation/scale. The complete file has 27.536 triangles; the ferry including its two oars remains below the 25,000-triangle vehicle budget. Every exported mesh has exactly one primitive/material. The ferry contains nine fixed material meshes and one wooden mesh below each movable oar group. The full kit shares nine materials.

Material prefixes are `wood_ReedFerry_{mahogany,cedar,pale}`, `roof_ReedFerry_teal`, `cloth_ReedFerry_{cream,rope}`, `metal_ReedFerry_{brass,dark}`, and `glow_ReedFerry_glow`. Preserve base colors through `Assets.toon`; `cloth` intentionally uses its default cloth branch. Blender number suffixes may occur after repeated builds, so classify by prefix. Runtime double-sided treatment is appropriate for the thin canvas. The hull and oar blades have modeled inner/back surfaces. Lantern faces are opaque warm material; no transparent glass or real runtime light is assumed.

## Coordinate, water and footprint contract

Metres, glTF/Three **Y-up, +Z forward**. Authoring is Blender Z-up/-Y forward; export performs the conversion. No corrective X rotation or rescale is needed. Place `FERRY_Reed.position.y` at the river water surface, then apply any small simulated buoyancy there.

The nominal hull is 4.5m long × 2.0m wide, bottom Y=-0.37m. Gunwales, rope fenders and stem caps extend beyond that nominal hull: fixed body bounds are `[-1.138997,-0.370000,-2.339029]` to `[1.138997,2.211435,2.364149]`. Neutral extended oars widen the full bounds to X=±2.671709m, a **5.343417m** rowing envelope. Their sweep and the boat's turning radius must be considered within the 10–14m river, rather than colliding only a centre point against the bank.

`hull_footprint_xz` in the manifest provides the original curved upper-hull outline. Use an appropriate navigation margin for the fenders and rowing envelope. No collision meshes are exported. Build runtime water-route collision from that footprint; build walkable deck/gangway collision from the rectangles below. A solid bounding box around the canopy and oars would block usable space.

## Passenger and rower attachments

Named empty nodes `ATT_passenger_left`, `ATT_passenger_right`, `ATT_rower`, `ATT_boarding`, `ATT_floor_arrival` are exported. Positions below are in ferry-local Three coordinates, before root yaw.

| Attachment | Position | Facing yaw | Interpretation |
|---|---|---:|---|
| passenger_left | `[-.56,.638,.82]` | 0 | individual passenger seat surface |
| passenger_right | `[.56,.638,.82]` | 0 | individual passenger seat surface |
| rower | `[0,.608,-1.02]` | π | rear bench surface, faces aft |
| boarding | `[1.045,.55,-.63]` | -π/2 | starboard edge of outer boarding tread |
| floor_arrival | `[.48,.20,-.63]` | 0 | inside the tread, feet plane |

Seat coordinates indicate the seat surface, **not a ready-made character root/hip transform**. Apply the character's measured seated-pose offset and retain hand/foot contact. Revision 2 splits both passenger seats and their backrests, leaving a .62m central opening (X=-.31 to +.31) with all supports outside the aisle. Boarding approaches through the open rear side behind the canopy support. The outer tread is Y=.55, the intermediate step top Y=.38, and fitted floor top Y≈.1975. The low canopy is designed for seated passengers; do not leave a standing passenger intersecting it.

## Movable oars

`oar_left` and `oar_right` are direct children of `FERRY_Reed`, each containing one mesh. Actual GLB node translations were checked:

| Node | Pivot in ferry-local Three | Handle in oar-local Three | Blade tip in oar-local Three |
|---|---|---|---|
| oar_left | `[-.85,.57,-1.10]` | `[.58,.105,0]` | `[-1.82,-.39,-.05]` |
| oar_right | `[.85,.57,-1.10]` | `[-.58,.105,0]` | `[1.82,-.39,-.05]` |

Neutral rotation is identity. Use `qYaw(Y).multiply(qRoll(Z))`, not an ambiguous mixed Euler order. The manifest contains these inspected diagnostic poses:

| Pose | Left yaw / roll | Right yaw / roll | Actual blade-tip Y |
|---|---|---|---:|
| neutral | 0 / 0 | 0 / 0 | .180000 |
| stroke | .36 / .14 | -.36 / -.14 | -.070153 |
| recovery | -.36 / -.14 | .36 / .14 | .437784 |
| stowed | -π/2 / 0 | π/2 / 0 | .180000 |

Stow before docking to keep the blades aft rather than across the landing. Stowed blade tips are approximately `[-.8,.18,-2.92]` and `[.8,.18,-2.92]`; allow that stern overhang. Drive the rower's hand targets from the moving local handle positions. These disconnected diagnostic poses verify pivots and water-relative positions, not a continuous convincing stroke. No skeletal rig or baked animation clips are exported; runtime owns the continuous rowing cycle, hull response, passenger animation, sounds and transitions.

## Landing and gangway

`LANDING_Reed` has a 2.60×3.20m walking deck at local Y=0. Supporting joists extend the overall depth to 3.45m. Posts extend down to Y≈-1.40 and above the deck to .7825. Rope rails occupy local -X and -Z sides; **+X and +Z are open** for the ferry and gangway. Adapt the piling depth/placement to the bank; do not float the posts above the shore.

`GANGWAY_Reed` is 1.10m wide and 2.40m long, extending from its origin along local +Z. Joists extend overall Z from -.05 to 2.45. Pitch about its local X hinge axis to follow the bank; walkable surface and collision must share that pitch. Hand ropes run along both sides. Its far end must visibly meet the bank/path.

The boarding render uses these **example** local placements: ferry `[0,0,0]` yaw0; landing `[2.45,.55,-.63]` yawπ; gangway `[2.45,.55,-2.23]` yawπ. This leaves a .105m gap between ferry tread and deck edge and joins the gangway to an open deck side. World integration can rotate/translate the complete relationship and slope the gangway to actual terrain. Docked oars are stowed in that image.

## Inspection and remaining acceptance

Blender viewport screenshots, scene info, nine renders and two articulated rowing poses were inspected. Initial fitted-board protrusion and a railing-blocked example gangway connection were corrected before the final export/renders. The manifest records final asset/source/image hashes, render timestamps, cameras, orthographic scale, pose names, exported nodes, finite-coordinate checks and exact geometry metrics.

Fresh independent critique still needs the actual runtime material result at approach, boarding and seated distance; a full trip and return; rower contact/weight; continuous stroke, turns, stopping, bank clearance, boarding/exiting and passenger transitions; night lantern/sound context; retained state; and measured performance. This asset-only delivery leaves those claims unverified.

## Revision 2 aisle repair

The previous full-width passenger bench and backrest blocked forward access from boarding. Revision 2 has two .50m-wide chairs centred at X=±.56m, with separate legs, braces and back supports. The seat surface remains Y=.639m; attachment surface Y=.638m is retained. The central .62m opening continues through the backrest. Rear rower seating, hull, canopy, oars, pivots, material/mesh names and dock geometry are unchanged. There are no cushions in this wooden-seat design.

A 507-ray check across X=±.30m, Z=-.63 to 1.25m, Y=.23 to 1.50m found no fixed mesh obstruction. This proves sampled clearance above the floor; it does not prove runtime capsule movement or standing head clearance under the low canopy. The new `ferry-forward-aisle.png` and `ferry-seating.png` diagnostic renders expose the repair. All seven prior views were rerendered from matched cameras. The first export, manifest, scripts, blend and contract remain in `tools/blender/transport/revision-1`; previous images are `ferry-r1-*.png`.

Revision 2 preserves `Haven_Geology` with 45 objects in addition to the other scenes. Runtime animation must use passenger attachments X=±.56 and measure its own feet/hips rather than assuming an attachment is a character root. Fresh boarding and seated-contact evidence remains required.
Each passenger has a flat pale-wood footboard centered at `[±.555,.43,1.07]`, .45m wide × .28m deep. Geometric board extents are X=.33 to .78 (mirrored left), Z=.93 to 1.21, Y=.38 to .43. The clear sole envelope is X=.395 to .725 (mirrored left), Z=.94 to 1.20. For example, place the left sole centres at X=-.45 and -.67, Z1.07, with actual soles at Y=.43; mirror for the right passenger. All 108 downward samples per side within that envelope meet Y=.430000007. These rays start at Y=.55, below the seat underside, and validate the seated foot space rather than standing clearance. Seat supports move aft by .10m to clear the heel envelope. Character sole corners must stay inside this envelope; the previous Z1.17 target pushes toes into the narrowing bow. The seat-to-footboard height is .209m and needs an actual runtime seated-pose check.

Rower sole-envelope corners at X=±.045/±.175, Z=-1.24/-1.50 remain on floor Y=.1975, compatible with a .20 runtime sole target. Three forward floorboards continue the central aisle from Z=.97 to 1.34, X≈±.2965, top Y=.214 (a 16.5mm rise from the main floor). All final matched renders include the broad footboards and shifted supports. There is no imported runtime character in these asset diagnostic renders; knee compression and character/hull clearance remain for runtime inspection.