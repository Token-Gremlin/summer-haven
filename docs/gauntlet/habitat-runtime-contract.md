# Habitat runtime contract — candidate, motion/art unverified

Owned implementation: `src/data/habitats.ts`, `src/world/habitat-life.ts`, `tests/habitat*.test.ts`. Legacy village `Wildlife` is unchanged.

## Integration

```ts
new HabitatLife({
  terrainHeight: (x, z) => number,
  waterHeight: (x, z) => number | null,
  blocked: (x, y, z, radius) => boolean,
  assets: { deer: { scene, animations?, contactY? }, terrapin: { scene, animations? }, songbird: { scene, animations? } },
  saved: optionalUnknownValue,
  drawDistance: 150,
});
```

`scene` is the corresponding `Wildlife_Deer`, `Wildlife_Terrapin`, or `Wildlife_Songbird` root extracted from the original artist GLB. Roots are independently cloned with shared immutable geometry/material resources. No placeholder animal meshes are created if an asset is unavailable. Optional asset `contactY` is subtracted from the cloned model position to normalize measured feet contact. Place `life.group` in the exterior scene. Apply existing stylized material conversion to assets before supplying roots. The class does not load assets or convert materials.

Call `life.update(dtSeconds, solarDay, playerPosition)` each exterior simulation update. Solar day means **0 midnight, .5 noon**. Current game `save.time` maps 14:00–20:30, so integration passes `(14 + save.time * 6.5) / 24`. Wildlife roosts/rests before .2 and after .82. `life.drawDistance` is mutable and should follow the scenery visibility preference; culling affects drawing and animation work, never state progression. `life.snapshot()` is the version-1 JSON-compatible persistence payload; `inspect()` returns the same detached records for diagnostics. Constructor validates a supplied saved payload and defaults malformed individual records independently. `dispose()` removes clones/stops mixers without disposing shared source resources.

The `blocked` callback must test **solid obstacles only**, using the spatial collision query and `contains`, with vertical filtering. `Collision.blocked` directly includes water and would strand terrapins. `waterHeight` must return null outside the actual river footprint, not a water level everywhere. Adapter must test relevant creature volume above the supplied Y (the runtime adds .12 clearance), not overhead scenery far above a bird or terrapin. No animal adds/removes/mutates world obstacles; moderate nearby avoidance is through reactions, not invisible collision walls.

## Simulation and asset motion

Population: 3 Bracken deer in Mosswood, 3 Reed terrapins in the river south of the forest water trail, 4 Coppercrest songbirds in Mosswood and 4 on Crownreach. Authored routes stay inside compact habitat patches. Birds use staggered, translated copies of one route graph, making small loose flocks with separate grounded contacts. Destinations change over successive cycles; they do not orbit one mathematical circle. Bird contacts have original low faceted stone supports, with .42m flat top above local terrain. The stones are combined into two static meshes (one per habitat), culled with scenery distance, and their owned geometry is disposed with the runtime. They provide visibly supported feet rather than unsupported branch positions.

Ground species run rest → wander → feed → rest with a separate timed react state and 18-second reaction cooldown. Deer travel faster and react at 4m; terrapins move slowly and react at 1.8m. Birds perch → takeoff → flock → land → perch, with 3.5m reactions. Route selection checks swept intermediate samples every <=.3m against solids, terrain, water exclusion and excessive surface discontinuity. Actual ground travel follows terrain; terrapins sit .16m below the water surface with a terrain floor clamp and traverse two dry bank stations for basking/feeding. Dry terrain is permitted for this amphibious species. Flight is a five-metre arcing path between tested landing contacts, including terrain clearance. A newly obstructed airborne step waits without teleporting; it can resume when clear.

State uses fixed .1-second steps regardless of distance, with interpolated rendered root positions. Each update accepts up to one hour of elapsed seconds; larger external offline intervals must be applied in <=3600-second chunks. This is elapsed runtime simulation, not wall-clock offline growth. State remains coherent while the player is elsewhere, and persistent movement origins, destinations, phase, cycle and reaction cooldown are retained. At most one substep of fractional timing is not retained across reload.

Optional animation clips use exact lower-case semantic names: `walk`, `feed`, `rest`, `react`, `perched`, `takeoff`, `fly`, `land`. Without clips, the original transform rig is animated using saved rest rotations: species-prefixed Neck/Head/Leg pivots, bird Wing and WingTip pivots. +Y up, +Z forward, metre units, origin at contact. Ground gait is local X; bird flap local Z, folded wing sweep local Y. No source geometry is synthesized. Wing fold signs and convincing foot motion require actual renderer review and may need refinement.

## Evidence and remaining validation

`npx tsx --test tests/habitat*.test.ts`: eight passing tests cover both ground/water state cycles and reactions, all bird flight phases and several landing destinations, swept collision/water rejection, offscreen state equivalence, save validation/continuity, actual terrain contact, route availability against the integrated candidate 05 runtime collision fixture, all three terrapins reaching dry banks, and bird feet matching authored perch stone heights. The fixture is `docs/gauntlet/evidence/habitat-collision-05.json`; it was captured from compiled candidate uyTwziAt with gorge revision 2 and 14 wildlife residents. These headless checks do not approve real motion.

TypeScript passes. These are state/contract checks, **not** motion, appearance, flock quality, integrated collision, or performance approval. Root integration must inspect original GLB clones in the actual renderer, observe full continuous wildlife cycles at forest/river/ridge, verify close player reactions, reload midflight and midwalk, verify current obstacle contacts and scenery settings, and benchmark populated habitat scenes. Terrain support is rooted contact, not leg inverse kinematics. Further authored feeding scenery and branch perches remain possible refinements after the first integrated review.

## Pure save boundary and reset

`src/data/habitat-save.ts` exports `freshHabitatSave(): HabitatSave` and `validateHabitatSave(raw: unknown): HabitatSave` without importing Three or render modules. Missing legacy payloads become `{version:1,elapsed:0,animals:[]}`; the runtime owns terrain-dependent fresh contact generation. The validator copies only whitelisted fields and known authored animal IDs, rejects duplicate IDs/nonfinite numbers/out-of-patch coordinates/incompatible species states, and bounds accepted population and elapsed values. Runtime restoration adds current terrain/solid checks and swept route validation; saved flight coordinates must match their stored arc phase. Invalid individual records remain at their fresh authored defaults.

`life.reset()` returns all residents and simulation time to their initial authored contacts/states and clears current animation actions; use this for the existing clear-save UI. Deer feeding now uses a smoothly blended 1.35-radian neck bend and .15-radian head baseline following the artist's anatomical guidance. This pose still requires actual renderer/motion review. Eleven habitat tests cover the earlier checks plus pure-validator JSON/whitelist tests, saved flight-phase validation, and reset after restore.

Paused construction/restoration/reset applies the initial rig pose and travel orientation immediately. update(0, solarDay, player) updates visibility without advancing simulation. Twelve habitat tests pass, including a transform-rig test for folded wings on paused load and after reset; this test does not establish visual quality.

Artist-confirmed Blender perch correction: resting bird wing sweep uses local Y = -side * 1.2 and local Z = side * .25, where left side is +1. The prior fold swept forward/up; the corrected signs sweep rear/down. Runtime motion remains unverified.

Candidate 05 fixture rerun: all 12 focused habitat tests pass. The current solid fixture serializes its proxy obstacle array as numeric object keys; the test normalizes it with Object.values. Over 400 simulated seconds, all 14 residents reached at least two contacts and none overlapped tested solid volumes at the 56,000 resident substep samples. This establishes the sampled state/collision result only; it does not approve live animation or rendered anatomy.

## Deer planted-foot solver — 2026-09-29 (candidate, motion review required)

`DeerGait.create(root, model, terrainHeight)` now installs a presentation-only solver only when the original deer BodyPivot and all four Leg_/Knee_/Hoof_ chains and hoof meshes exist. Missing/generic rigs safely retain their previous fallback. The supplied exported upper/lower rest vectors and quaternions define the two-link solve; no hierarchy, vertex, rest translation, asset, record, corridor reservation or save schema is changed. The joint collector now includes Knee_/Hoof_, and generic whole-leg oscillation is bypassed only for supported deer. Original Blender source and actual public GLB transforms were inspected.

Planted hoof anchors stay in world space against actual rendered root translation. Short eased swings rise at most 6.5cm; the initial diagonal-pair offset avoids all four starting together. Stops finish an active step and settle; feeding/rest keep support. Front knees and rear hocks retain different bend directions. Hooves counter-rotate to a five-sample local terrain support plane, with clearance measured from actual exported hoof vertices. This small-footprint plane approximation avoids a terrain evaluation for every vertex every frame; tests still evaluate every actual transformed hoof vertex against the full terrain function. The model body lowers initially by 6.5cm for extension reserve and further when needed for slope/turn reach (bounded 40cm). This is presentation support, not a change to saved root contact. Heading turns at up to 1.8 radians/second toward the simulation's heading. Sharp turns may consequently need noticeable corrective steps/crouch; renderer review must assess that tradeoff.

Solver updates also run for culled supported deer so returning visibility does not reuse stale planted contacts. Simulation remains independent of draw distance. Presentation anchors/heading are ephemeral and reconstructed grounded on load/reset; exact mid-swing pose persistence is not claimed. A displacement over .8m reconstructs support rather than trying to drag stale anchors across a catch-up jump. Optional authored clips still update first, with supported deer legs receiving the terrain solve afterward.

Validation: TypeScript passes. Three new tests in tests/deer-gait.test.ts use the actual public GLB: flat and +/-12% longitudinal slopes with 4% cross-slope at three headings; rest/walk/stop, actual vertex clearance, planted displacement below 3mm, articulated knees and unchanged rest translations; missing-rig safety, identical visible/culled snapshots and grounded reset; 120 simulated seconds across actual Mosswood routes, including wander/feed/rest and turns, checking every exported hoof vertex. Tested actual-world penetration is bounded below 5mm and lift below 7.5cm. The complete suite passed 87 tests before the final additional actual-world contact test and reach/heading refinements; final focused contact and habitat tests are recorded separately by the implementation run. No production bundle was built during this assignment.

These numeric checks do not approve visible gait quality, feeding anatomy, mesh seams, a trot/walk classification, ambient sound, sustained performance or AAA craft. The previous independent still review and forest-contact-after-05 recording remain unchanged and predate this work. Root must inspect continuous motion in the actual renderer and obtain a fresh independent critic; the implementer cannot approve this contribution.

Final focused verification after reach/heading/support-plane changes: **16/16** deer-gait and habitat life/save/terrain tests passed (9.39s); TypeScript passed. This includes the existing crowd-contact repair and save/offscreen checks. No real-time renderer motion approval has been performed by this implementer.

## Trail clearance and known-contact migration — candidate 06

The sustained candidate 05 forest walk exposed four perch stones across the main trail. The current Mosswood first contact moved from (204,-500) to (208,-499). Two Crownreach contacts also encroached on the walking corridor and moved from (465,-985) to (465,-982), and from (480,-977) to (480,-980). All translated flock contacts and their real collision solids move together. All 32 current supports clear the full authored trail width plus their radius and a 45cm player margin. The earlier fixture and failure recording remain preserved.

Each moved authored point retains its explicit previous coordinate. A resting/reacting saved bird matching that known contact moves onto the corresponding new support, retaining age, duration, cycle and reaction cooldown. A saved flight matching the previous authored arc and using a changed contact restarts on its departure support for five seconds, retaining cycle and cooldown; an unchanged or already-current flight retains its exact phase. Arbitrary unsupported positions do not qualify for migration. New non-flying bird saves must match their actual authored node in three dimensions, not just its height.

Five focused migration/clearance cases check all translated contacts, unchanged phases across 80 simulated seconds including takeoff and landing, known old-flight recovery, and rejection of an unsupported position. Combined with habitat life/terrain cases, 16 tests passed before the runtime capture. The updated actual compiled fixture is `evidence/habitat-collision-06.json`, captured from BEBUlrp2, with 6,016 world solid/camera descriptors. Runtime forest movement and any later fixture/test results are recorded separately; these state tests do not approve visual craft, motion smoothness or performance.
