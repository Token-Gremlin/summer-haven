# Integrated runtime observations — round 04

2026-09-29, local `feat/fantasy-gauntlet` candidate. Full world goal remains incomplete. The existing village PR #1 is independently confirmed merged at `570ca10fe8b84601798ab48f988637760a783b76`, with successful GitHub workflow `36624543948`. These expansion files have not been pushed or merged.

## City, state and geography

Production preview `index-Bcrodwn1.js`, diagnostic `?qa=1`, browser-reported 1280×720 viewport / DPR approximately 1. The screenshot surface captured 992×720 PNGs, so they must not be called full 1280-wide captures. Existing feminine Haru appearance. High settings with explicit overrides: resolution 1, shadow 1024, vegetation 1, FXAA, post-processing enabled, reflections disabled, nearby distance 240m. Time .12 (14:47). Camera and initial position used the QA API; this is component inspection, not J1 traversal.

The compact market approach was captured from player `(20,-273)`, camera yaw −.2, pitch .16, distance 6 in `city-runtime-03.png`. Covered frontages now frame an identifiable civic endpoint. Resident silhouettes and work locations are present; a still cannot certify a busy city or a daily routine.

The new gorge appears in `falls-iteration-05.png`, player `(344,-677)`, yaw −.62, pitch −.32, distance 8. Blender volume survives the runtime material replacement and replaces the thin floating shelves. Broad rock faces, repetitive grain and the sheet-like water remain below the visual criterion. Actual upstream/base traversal and wet interfaces need the next experiment.

The actual loaded layout migrated to revision 2. `city-layout-migration-02.json` compares the pre-migration backup with live state: all ten completed-task counts and Lio's conversation count 1 survived. The old development save remains backed up separately. A fresh live collision capture contains 1,233 obstacles around the city, including generated trees and ferry pieces. `city-tests-runtime-02.json` records 12 passing city/layout/resident tests against this capture, including all forty route legs, a simulated normal day, offscreen progress, actual-rig contacts and migration. These tests do not replace a real-time daily observation.

## Ferry recording

`ferry-journey-02.webm` is now a continuous recording from boarding through the Haven → Aldermere trip and disembarkation, about 122 seconds. It contains VP9 video at the actual internal 896×504 render size, requested 20 capture frames/sec, plus stereo Opus at 48kHz. `ferry-journey-02.json` contains 459 quarter-second observations and the final safe deck position `(126.90652,2.40043,-329.37)`. Recording began before the ordinary E boarding input. A normal E input was automatically dispatched after the live boat docked at the other landing. World time was not accelerated during travel. Initial player positioning and docking clock were diagnostic setup; this does not satisfy the whole-world no-teleport journey.

Settings: Low with 140m distance override, .7 resolution, 512 shadows, .3 vegetation, FXAA, no reflections/post-processing. Camera began yaw −1.7, pitch .4, distance 5, then changed to lower side/front views to inspect the passenger. The canvas video excludes the HTML HUD; companion screenshots record the prompts. Recording and screenshot overhead prevent treating the observed frame times as a performance run. The audio track is recorded evidence; it has not yet received an independent listening verdict.

The revised aisle supports the transfer and the passenger remains aboard during the entire route. At elevated side angles the canopy hides much of the passenger; the lower view is legible. This camera occlusion/framing issue remains open. Four `ferry-transfer-02-*.png` frames extracted from the recording expose the transfer rather than assuming unit tests approve it. No final animation or T1/C2 artistic pass is claimed.

One discarded recording setup incorrectly passed only a partial settings object into the QA callback, leaving the audio category settings undefined and interrupting HUD refresh. Supplying the full settings object restored the game. This was a diagnostic-harness mistake; it is not claimed as a production-game defect. The invalid clip is not the delivered journey recording.

## Subsequent correction and validation

Inspection of the final walking step found that the raised footboard still used the low central floor for foot planting. The runtime now samples the authored .43m support there. A geometry-based test checks real GLB hit heights. The shader brush function also now uses a single initialized return, retaining its Low/High formulas while avoiding the D3D11 conditional-return compiler warning.

The complete suite passes **62/62** tests in 62.81 seconds. Strict TypeScript checking and the production build pass; resulting script `index-CLsWHzg_.js`. The build retains the existing large-bundle advisory. The reloaded compiled candidate enters the world. New-build console observations and short transfer verification are recorded separately from the earlier Bcrodwn1 journey. No measured sustained 60 FPS, memory plateau, entire-world journey or artistic completion is implied.

## Fresh independent verdict

`reviews/world-04.md` independently inspected official Bandai N1/N2 pixels and four neutrally labeled captures. It preferred the new market and gorge while rejecting the frozen Q4 floor: visible scores remain 2–3. Labels were per pair: J-street is compact layout 2, K-street is prior layout; J-falls is prior shelves/wall, K-falls is the Blender gorge. Camera framing is comparable but older time/notification/NPC differences limit blinding. Largest remaining gap: source → lip → fall → impact basin → downstream route must read as a coherent place, with wet rock and a less uniform water sheet.

The next round must address that gap, keep the city as a control view, inspect the other rooms and inhabitants in motion, improve ferry visibility, and continue the broader wildlife/second-dragon/discoveries/journey/performance work. This is a recoverable candidate checkpoint, not an approved expanded-world release.

## Final compiled-candidate observations

CLsWHzg_ transfer verification is recorded in ferry-transfer-03.webm (7.5 seconds) and its 320-frame contact trace. Final feminine ankle coordinates in boat space are X −.45/−.67, Y .52000013, Z 1.07000023: sole target .43m plus .09m ankle offset. A real mounted masculine appearance swap produced Y .519996 and X/Z offsets below 1mm; its screenshot and contact JSON are retained. The original appearance was restored after this diagnostic check. No comprehensive outfit-motion approval is inferred.

All three new doors were entered using normal E input after diagnostic placement outside: Wayfarers' Hall, Thread & Timber studio, Reedbank common room. The lower indoor look target keeps the feet in frame; the common room remains visually cramped near its shelf. Lio's correspondence opened via E, displayed its English route/story text, and closed normally. Actual S movement reached the common-room exit at z1.7394; E returned to the exterior at (102.6,6.7904,−338.46). Companion screenshots record each interior and the letter. This is a door/interaction check, not a full interior circulation or artistic pass.

The final CLsWHzg_ log capture contains zero warnings/errors since reload, including subsequent Low/High and interior visits. Device-metrics emulation was cleared after the declared1280×720 tests: the natural candidate viewport is920×668, DPR1.25, internally920×668 at resolution1. city-checkpoint-native-04.png is the natural uncropped view; it is not a matched1280×720 benchmark. The original5173 save was restored byte-for-byte, retaining the separate4175 QA save. The dashboard was opened and visually inspected; it explicitly keeps artistic/journey/performance gates open.
