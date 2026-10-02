# Rowan close-neighbor recovery

Source contribution following the separate [entry-road clearance fix](roadside-clearance-08.md). Runtime approval and independent review remain with the coordinating agent. These tests do not certify moving appearance, crowd animation, or sustained runtime performance.

## Captured defect

`evidence/journey-07/rowan-blocked.json` records Rowan at `(26.25317463907161,-302.7260252965229)` at natural time `0.39633258333329974`, still traveling with zero completed tasks. Settled Mara is at `(26.17548609730272,-302.0964980139004)`, only **0.634302853 m** away. The earlier `city-arrival.json` records the same stalled position while all nine other residents work.

Two source rules prevent recovery:

1. Replanning omits settled residents within `0.7 m`, so the same path through Mara is selected repeatedly. Simply removing that omission would also fail: navigation's `0.69 m` crowd check rejects every initial grid link when the resident already starts inside that margin.
2. Movement chooses only one perpendicular passing side. Rowan's preferred side runs toward Mara's actual solid work-frame collision at `(26.66,-302.1)`, width `0.95`, depth `0.2`, yaw `π/2`, height `1.45`. The other side is free.

## Bounded correction

Only `src/world/city-life.ts` changes. Settled neighbors always participate in route searches. Initial links may leave an already-close neighbor only along a sweep that never decreases their initial separation and finishes outside the existing `0.69 m` navigation margin. Other grid links retain that full margin. Static sweeps still check every link, including the escape.

Movement checks a swept segment against every resident and the player, and tests both perpendicular passing sides when the forward step is blocked. It retains the usual `0.64 m` resident and `0.83 m` player distances; the previous weaker `0.61/0.8 m` sidestep exceptions are removed. An already-close pair can separate without moving farther into one another. Static navigation clearance and physical collision remain active. Sideways movement that does not approach the waypoint eventually triggers the existing replan interval instead of endlessly resetting the stall timer.

The single active navigation job and **70 expanded nodes per frame** budget remain unchanged. No destination, schedule, teleport, speed, collision radius, work-object placement or saved consequence is changed. Actual frame-time impact remains unmeasured.

## Regression evidence

`tests/city-crowd-escape.test.ts` restores the captured state, route and neighboring residents, uses the complete captured city collision fixture, and supplements it with the exact local `rowan-blocked` obstacles. Production `CityLife.update`, `CityNavigation` and `Collision` perform movement. Characters remain offscreen, so no rendering or animation claim follows.

Before the correction: **0/3 passed**. The replan could not find an initial link while including close Mara; both movement runs remained trapped after four seconds.

After the correction: **3/3 passed**.

| Update step | Bakery arrival after captured stall | Work progress at elapsed 50 s |
|---|---:|---:|
| 1/60 s | 42.316667 s | 7.7 s |
| 0.08 s | 43.68 s | 6.4 s |

Both runs move more than `0.5 m` from the stall within four seconds. Every step remains within Rowan's ordinary speed, statically swept, outside solid collision, and never closer to Mara than the initial recorded separation. Mara stays at her working location.

The captured natural clock continues advancing by `dt/1200`. Only approximately **52.4 s of morning work remain** at the capture time; Rowan resumes work but correctly cannot complete a 24-second item before the normal errand transition. The test does not freeze or extend the schedule to claim that he completes an item.

Combined new regression and existing `city-life.test.ts`: **11/11 passed**, including actual rig contact, daily destinations, wall safety, collision invalidation, offscreen work/meetings/persistence, all ten residents' ordinary 1200-second schedules and return home, and New Visit reset. Typecheck and whitespace checks passed. A final focused rerun confirmed the arrival/progress numbers above.

No browser, game bundle build, Blender operation, publish, or push was performed by this contribution.
