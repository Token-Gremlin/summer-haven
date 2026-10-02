# Aldermere residents: implementation and review contract

Status: integrated-system contribution ready for runtime review. Mechanical evidence below does **not** approve C1–C4, animation, artistic quality, crowd presentation, sound or performance. No browser or Blender session was used by this contributor.

## Owned files and API

- `src/data/city-residents.ts`: ten adult identities, appearances, relationships, exact destinations, contextual dialogue, `CityLifeState`, `freshCityLifeState()`, `validateCityLifeState(unknown)` and `CITY_LIFE_BOUNDS`.
- `src/world/city-life.ts`: `CityLife(assets, scene, collision, state)`, `update(dt, timeOfDay, elapsed, playerPosition, inside, drawDistance)`, `nearby(position, inside)`, `talk(resident, playerPosition)`, `release()`, `reset()`, `destinations()`; exported `CityResident` and bounded `CityNavigation`.
- `tests/city-life.test.ts`: eight mechanical regression tests.
- `docs/gauntlet/evidence/city-residents-collision.json`: the coordinator's refreshed compiled Bcrodwn1 layout-2 city snapshot, 1,233 obstacles, including procedural trees and ferry collision. Includes architecture proxies, portals, street props, gates and trees. Tests add this contribution's work objects and the actual region river/slope predicate.

The coordinator owns `main.ts`, `save.ts`, architecture, geography and integration. Construct after Regions/City collision has been installed. Assign the validated live `cityLife.state` to the save field after construction. `reset()` is the explicit New Visit operation: it keeps `state`, its resident array and all resident record identities, clears conversation/search/route/task/meeting state, and places the residents back at their authored homes. Reassign the live save pointer after resetting the outer save object.

## Exact geography

Coordinates are world X/Z metres; Y always comes from the common `terrainHeight` sampler. The city-local navigation envelope is X **−105…152**, Z **−422…−253**, with a fixed 1.5m grid: 172 × 113 = **19,436 cells**. It never grows with the global world bounds. Exterior activity positions are distinct from closed door leaves and do not require entering a decorative building shell.

| Resident | Occupation | Home X/Z | Work X/Z | Errand X/Z | Meeting X/Z |
|---|---|---|---|---|---|
| Iona | guild steward | 26.2, -300.2 | 15.8, -333.7 | 14, -276 | 16, -332 |
| Mira | cloth mender | -17.7, -335.5 | -17.6, -321.5 | 26, -290 | -20, -317 |
| Oren | wheelwright | -32.5, -292.3 | -27.4, -309.5 | -14.4, -321.5 | -29.5, -318.6 |
| Lio | Reedbank caretaker | 101.5, -325.3 | 104.7, -339.2 | 31.5, -322 | 106, -347.7 |
| Mara | valley mapmaker | 26.5, -298.4 | 26.2, -302.1 | 11.5, -330 | 17.8, -332 |
| Rowan | baker | 40.5, -348.7 | 15.3, -265.8 | 14, -274.5 | 26.2, -277 |
| Tamsin | lantern maker | 16.5, -320.6 | 16.5, -316.9 | -5, -314 | -21.8, -317 |
| Sela | potter | 15.5, -285.3 | -30.5, -321.5 | 14, -281 | -27.7, -318.6 |
| Neri | water gardener | 40.5, -345.5 | 77.5, -337 | 32, -326 | 28, -277 |
| Bram | boatbuilder | 119.5, -360.3 | 112.5, -347.6 | 107, -327 | 107.8, -347.7 |

Most home/work points are computed through `cityPoint` from the shared `CITY_BUILDINGS` registry, so a deliberate building move keeps its resident's local approach relationship. Errands and public rendezvous are authored street coordinates. A future layout edit must rerun the live collision export and route audit; an old captured fixture cannot certify changed live geometry.

## Daily behavior and continuity

The normalized daily schedule is home before .16; work .16–.44; errands .44–.61; social meetings .61–.83; home from .83 onward. With the existing 1,200-second normal day, the regression runs at a deliberately low 5Hz simulation cadence and verifies that everyone completes work and a shared meeting and returns home. Time changes select the new destination from the current position; they do not teleport residents. A 1-second update stress test separately verifies bounded movement, work/meeting progression and absence of obstacle penetration.

Travel speed is authored per adult at .93–1.08m/s. Jobs progress only after physical arrival. Every 24 seconds of work completes a piece; the partial piece persists. Meeting progress requires both named partners to be physically at their own rendezvous points. Each pair faces one another, converses and records a meeting once after 20 seconds together. The five pairs are Iona/Mara (route notes), Mira/Tamsin (lamp shade), Oren/Sela (wooden molds and clay), Lio/Bram (landing repairs), Rowan/Neri (herbs and bread). Waiting dialogue names the absent partner. Phase changes clear the current rendezvous timer; cumulative completed meetings remain saved.

Fresh appearances vary adult body family, skin, hair shape/color, clothing silhouette/palette, shoes and accessories. These reuse the existing authored Character rig and wardrobe, not new original character models. Work scenes have authored map/dispatch easels, cloth frame, wheel jig, rope coils, loaves, lamp, clay bowl, herb cuttings and boat rib. Work uses a small upper-body bend plus distinct hand trajectories constrained to the actual station via `Character.contactHands`, layered after the existing animation update. Social and greeting gestures use the existing interaction clip. At home, residents stand/rest with the existing idle breathing motion; this contribution does **not** claim seated rest, sleeping, interior occupancy, openable shop hours, physically carried goods or an economy.

Residents greet a nearby player with a short turn/gesture and 35-second cooldown. Conversation pauses the selected resident until `release()`. Movement yields to nearby residents/player with collision-tested lateral steps. Blocked searches retry after eight seconds; failed movement requests a new path after two seconds. Per-search reservations route around settled residents and the player. Arrival settles within .025m, and work contact waits until station-facing alignment. No invalid waypoint is silently moved to a different side of a wall. A geometrically invalid in-bounds save position remains explicitly blocked for diagnosis rather than teleporting through a newly placed structure; An older or absent layoutRevision migrates once at load to the new homes while preserving completed consequences; current-layout loads keep positions. New Visit is the explicit supported runtime reset.

## Navigation and rendering contracts

The binary-heap A* prefers authored `CITY_PATHS` and the shared regional spine using cost 1 on roads and 1.8 elsewhere. It accepts only collision-clear adult-radius .34m samples, at most .22m apart; start/end connectors are swept too. Local grid simplification is capped below 4m and rechecked. The movement capsule is .32m and actual movement is additionally checked before using `Collision.move`. Cached nodes/edges are invalidated using `collision.revisionForBounds(CITY_LIFE_BOUNDS)` behind a cheap global revision guard. Distant moving dragons do not cancel city searches; a local obstacle edit does. One resumable search runs at a time, at most 70 expanded nodes per update, with round-robin resident requests.

All ten logical residents continue their activities offscreen and indoors. Character objects are created lazily, at most one per update; once created they are reused, with a finite upper bound of ten. This avoids growth on repeated district visits but is not a measured memory certification. Rendering obeys draw distance, capped at 135m, and is hidden inside rooms. Pose updates are full cadence within 18m, at most 20Hz through 55m, and 10Hz beyond; invisible rigs do not animate. Work props obey the same visibility range with a 12m margin. Logical population is never reduced by quality/draw-distance settings.

The JSON save contains version 1, layoutRevision 2 and ten whitelisted records: stable resident ID, bounded X/Z/yaw, activity, settled/task/meeting progress, capped integer completion and conversation counts, and a meeting-counted flag. Routes, Three objects and unrecognized fields are excluded. Nonfinite/out-of-range fields fall back safely. The runtime state is always a fresh validated object, so the outer save must point to `cityLife.state` after construction. Public resident records expose `status`, `route`, `position`, `character` and `handContactError`; `destinations()` returns exact activity points and current collision-clear booleans for live review.

## Evidence and remaining review

`npx tsx --test tests/city-life.test.ts` covers: JSON validation; all 40 captured-collision daily route legs and exact endpoints; wall barriers plus local/distant collision invalidation; actual feminine/masculine GLB work contact over a complete 24-second task cycle per resident; offscreen movement/work/paired meetings and reload; the normal complete day; identity-preserving reset. The work-contact test measures hand-bone origins against authored targets and requires maximum error ≤.06m over sampled cycles. This is an IK reach bound, not proof of finger/palm contact or a visual approval.

Live independent review must follow several residents continuously, inspect each task from the front/side, listen to the city, test greetings and conversation release, watch arrivals and all five paired meetings, obstruct a route, stand in a narrow crowd passage, leave/re-enter the city and reload. Inspect long clothing/hair during work and gait, station silhouette/placement, hand contact and foot grounding. Recheck all forty destinations against live collision after any architecture/path edit. Observe indoor identity continuity separately: these residents presently remain outside. Record populated city frame-time distributions and settled/peak memory on the declared hardware; automated Node timings are not gameplay performance measurements. No C/Q/P gate is marked passed by this document.


## Full runtime fixture validation — layout 2

The refreshed default Bcrodwn1 fixture passes the combined **12/12 city and resident tests**, with typecheck also passing. This includes all forty daily route legs, exact destinations, offscreen behavior, the normal full day, real rig contacts, migration and reset. The authored-geometry suite additionally checks the full-width road and all interior approaches. See `evidence/city-tests-runtime-02.json` for fixture hash and test record. The coordinator's captured reload record `evidence/city-layout-migration-02.json` preserves every resident's completed-task total and Lio's conversation count of 1. These records do not approve visual quality, live motion or performance.
