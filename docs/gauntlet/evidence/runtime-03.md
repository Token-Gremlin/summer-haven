# Integrated runtime observations — round 03

2026-09-29. Local candidate only; the published village remains preserved separately. This is an observation log, not a whole-world approval.

## Reproduction

Compiled candidate `index-BxWRsnDj.js`, served at `http://127.0.0.1:4175/?qa=1`. Browser viewport 1280×720, DPR approximately 1. The test character was the existing feminine Haru preset. Still captures use the settings recorded below. Initial positions and camera angles were set through the development-only QA API; movement, interaction and the ferry thereafter used the normal input handlers. This is focused component QA, **not** the no-teleport acceptance journey J1.

The earlier unresponsive development tab closed successfully during this round. Timing observed before that closure is not comparable to the later single-game-tab observations. No sustained performance gate is passed here.

## Ferry and shore route

Starting from the Haven stair top `(41.9374, -160.37)`, an initial keyboard-driven walk found two real failures: a continuous rail sealed the inside stair/gangway corner, and the conservative tall rail collider pulled the camera into the character. `ferry-stair-01.png` records the camera failure. The rail now ends before the turn; its collision follows the descending height in segments. A regression sweeps an adult capsule along both landing approaches and checks camera clearance above the low tread.

The repeated continuous walk reached the Haven deck at `(57.94372, -164.26301)` through the actual movement system. `ferry-stair-02.png` records the repaired route and contextual boarding prompt. Pressing E boarded the waiting boat. The player then stayed aboard during the Haven → Aldermere crossing; the world clock was not accelerated during travel. An input event requested departure from the boat at clock 354.0027, after docking. The player arrived on the destination deck at `(126.90652, 2.40043, -329.37)`.

`ferry-journey-01.json` contains 279 quarter-second samples, starting at clock 282.232 while already underway. `ferry-journey-01.webm` records that later portion of the crossing and disembarkation, approximately 74 seconds, **not the entire boarding-to-arrival sequence**. The earlier segment was observed live and in boarding/underway captures. The camera changed once for a clearer boat view. Low quality with a 140m distance override, resolution .7, 512 shadows, vegetation .3, FXAA, no reflections and no post-processing was used. Recording overhead prevents treating these samples as the controlled performance benchmark.

The stored safe return position remained on the Haven landing during the ride. After disembarking, keyboard movement traversed the destination deck and gangway and climbed the stairs to `(110.49882, 6.47845, -325.29110)`. See `ferry-climb-01.json` and `.png`. A later attempt to turn north while still standing between the stair rails was correctly blocked; leaving at the open bank end is required.

Visual and asset inspection found additional unresolved craft issues: the original full-width front bench blocked a believable walk to the passenger seat; the transfer repeatedly switched animation states; feet did not fit the curved hull. A centre-aisle asset revision, phased walking/seating and sole contact are being produced. The evidence above evaluates the **previous** transfer. Those revisions require a new complete motion inspection before T1/C2 can pass.

## City and interiors

`city-runtime-02.png` shows the initial populated layout; all ten resident records were in their work activities. `city-work-01.png` and `city-dialogue-01.png` record Lio at his work location and a successful contextual conversation opened with E. The dialogue mentions the common room, tea, Mara's letter and completed work. Conversation continuity and a complete daily live observation remain to verify.

The actual E door interaction entered The Wayfarers' Hall at its corrected spawn `(520,0,.15)`. `interior-guildhall-03.png` verifies the corrected header and entry position. The lower legs still crowd the frame, prompting a small indoor camera target adjustment in source; that new camera change is not certified by this image. Other new interiors still require equivalent moving inspection.

Live work-hand diagnostics showed greater reach error than the exact-placement unit test for several residents. Physical final arrival precision and the transition from greeting back to facing the work station are being corrected. The new compact city layout also requires renewed route/collision evidence and a saved-layout migration.

## Visual critique and corrections

`falls-iteration-04b.png` shows more varied flowing highlights than round 03 but a failed geological treatment: thin oval ledges float above an enormous smooth ramp. The independent `world-03.md` review rejects that composition and the sparse city street. The ledges were removed from source. An original Blender gorge is now being integrated; it must be inspected in the actual renderer before any improvement is asserted.

Blind creature comparison 03 prefers revision 3 to revision 2 but still rejects hero wing/anatomical craft. The independent scores and identity reveal remain in `reviews/creature-03.md`. No dragon motion, sound, second design or integrated encounter gate is approved.

## Test status at this observation

The first full run passed 50 of 51 tests; the work-contact test failed while its correction was being tightened. The updated isolated work-contact test then passed, the contributor's seven city-life tests passed, and the four updated ferry-route tests passed. These are bounded mechanical results. A final full test/build run must follow the pending asset and city integrations.
