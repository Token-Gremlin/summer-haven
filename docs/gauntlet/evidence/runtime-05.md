# Actual runtime observations 05 — local candidates, not acceptance

Date: 2026-09-29. Branch `feat/fantasy-gauntlet`, following checkpoint `d368760`.
PR #1 is already merged as `570ca10fe8b84601798ab48f988637760a783b76`; GitHub workflow
36624543948 succeeded. It publishes the earlier village polish, **not this expansion**.

## Silverveil comparison

Actual rendered stills `falls-r1-*` / `falls-r2-*` cover approach, base and upstream
bank at matched positions and natural 920×668 viewport. High overrides: resolution1,
shadow1024, vegetation1, reflections off, FXAA/post on, nearby240m, time .12 frozen.
Compiled old/new files were CLsWHzg_ / uyTwziAt. Water/wind phase and avatar heading
were not synchronized. Neutral packet `world-comparison-05` concealed chronology
until review. L=new; N=old. Independent world-05 preferred L, but Q1/Q2/Q4 still FAIL;
W5 lacks a contiguous upstream-to-pool journey and appropriate audio review.

The basin now has a rendered water surface clipped around the river footprint,
without coplanar double coverage. Falling water shares a level lip and accelerating
profile with terrain. Geology revision2 uses broad low-noise weathering. The extra
`falls-path-pool-05.png` was captured on the dry trail at (337,-694), Y18.9909,
yaw−1.03, pitch .02, distance7. The diagnostic base view at (393,-684) intersects a
decorative shoreline boulder; this is an unresolved collision/placement issue,
not a verified valid walking stop. The comparison bank view is not journey proof.

## Wildlife candidate DNQwQnV7

Original Blender deer, terrapins and songbirds loaded through the actual custom
renderer. `wildlife-forest-05.webm` is 75 seconds of continuous elapsed play,
canvas VP9/Opus, with a 2.2-second normal W-key movement starting at second12.
No mid-recording relocation or accelerated simulation. The initial player position
was diagnostic (210,-497); endpoint Z−502.10044. Low overrides .7 resolution,
shadow512, vegetation.3, reflections/post off, FXAA on, nearby140m. Natural viewport
920×668, DPR1.25; actual internal805×584. Tests/Blender were also active: **not a
performance benchmark**. Full metadata and 250ms state samples are adjacent JSON.

The recording contains the existing spatial ambience, not newly authored wildlife
calls. An audio track/context does not establish an actual listening verdict.
Independent wildlife-05 inspected timed video frames and official N4/N2 pixels,
not continuous motion or sound. It rejected Q4 and found a concrete overlap in the
trace: deer1/deer2 shared the exact resting contact at the endpoint.

Frozen diagnostic photo views document folded birds and the earlier submerged
terrapin at close range, with adjacent camera/settings metadata. Bird feet read
as supported, but their identical stone supports/poses remain artificial. The
terrapin showed only a shell patch because the old simulation ignored the .08m
rendered water offset and submerged the body too far.

Actual save/reload at 11.9 simulation seconds retained all 14 wildlife records
exactly by deep value comparison, including takeoff/flock phases and ground travel;
appearance and city histories also matched. `wildlife-reload-05.json` contains both
sides. Field order differs in serialized XYZ objects; value comparison ignores
object-key order. This does not establish long-session or full-world persistence.

## Wildlife corrections C2ECmFV1

Ground animals reserve their remaining paths and destinations using a conservative
body envelope. Existing duplicated saved contacts migrate to free safe contacts;
valid unrelated histories remain. A 400-second headless test checks 56,000 resident
samples against solid geometry and ground-animal separation; all residents visit
multiple contacts. This is mechanical evidence, not motion approval.

Visible water height is shared with the rendering offset, and terrapin draft is
.10m. Fauna has its own controlled form shading instead of the lifted human-skin
shadow treatment. Matched K/M deer/river images in `wildlife-comparison-06` retain
the same cameras/time/settings/reset poses. K=new, M=old. The fresh independent
critic preferred K for head/shell readability and deer volume, but still rated
visible craft below4. No visual acceptance gate was lowered.

`forest-contact-after-05.webm` records a further 90.017 seconds of actual simulation
at High overrides/internal1150×835, with 48kHz Opus. A diagnostic tracking camera
follows deer0 within the existing photo-camera range; avatar remains stationary.
This is **not ordinary player-camera or journey proof**. Full trace and capture
procedure are preserved (`tools/qa/habitat-capture.js`). Samples at15/45 seconds
were inspected: the first shows rigid lifted legs; the second is entirely obscured
by a canopy. Preserve these unfavorable results. They motivated the next grounded
gait and feeding-clearing experiment; this video predates those changes.

## Verification boundaries

For C2ECmFV1: 79/79 full tests passed in52.337 seconds, recorded in
`full-tests-05.txt`; strict TypeScript and Vite build succeeded. Existing bundle-size
advisory remains. These results predate the subsequent glade, articulated deer gait
and Vesper integration; their new checks must be recorded separately.

Whole-world journey, sustained daily activity, audio listening, busy-scene60FPS,
memory loops, full camera/terrain regression and artistic acceptance remain open.
No screenshot, simulation trace or passing test is treated as their substitute.

## Integrated candidate 7hgK5CKM — 2026-09-30

Strict TypeScript and the production build pass. The final full run is **96/96**
tests in 51.798807 seconds (`full-tests-final-05.txt`); five habitat tests then pass
against a refreshed capture of the final runtime obstacles in 2.6126 seconds
(`habitat-final-fixture-05.txt`). These are mechanical results. The final JS asset
is `index-7hgK5CKM.js` (1,136.01 kB / 353.52 kB gzip); the existing large-chunk
advisory remains. Earlier 79-, 91- and 93-test logs are retained with their builds.

The deer gait now solves articulated two-link legs with world-space stance anchors,
bounded terrain-following body incline and swing clearance. Perch supports are
actual shared collision obstacles. Deer collision and inter-animal reservations
use a measured conservative 1.6 m envelope. The final fixture includes tree canopy
camera proxies, perch supports and the current gorge. Renderer visibility does not
stop the fixed-step habitat simulation. These changes do not establish natural
anatomy or a visually approved gait.

The 90.0153-second `forest-gait-glade-05.webm` retains the earlier BuyaVAh3 candidate
and its unfavorable deer/rock overlap. The later 90.0092-second
`forest-support-corrected-05.webm` is BqU66S_Z, before the final reservation-radius
increase; no other individual gait change followed that video. Both use diagnostic
tracking, not an ordinary player journey. In contact review 08, D=BqU66S_Z was
preferred narrowly over F=BuyaVAh3. The critic inspected three extracted frames per
recording, not continuous motion. Anatomy, surface, composition and coherence
remain 2/5, lighting/palette 3/5. Preserve the obstructed feet, weak contact shadow,
angular limbs and repetitive canopy evidence. Q4 still fails.

## Vesper Siltfin and a real partial approach

The second original dragon is a wingless aquatic creature with editable Blender
source, 40 bones, 22,054 triangles, eight material meshes and six exported clips.
`vesper-siltfin.glb` SHA-256:
`ed1037ae7b43b059a236feec4c2fc60bb38d043cf8687760aac8fc54fba45905`.
The runtime uses a 120-second rest/swim routine and a one-shot alert on interaction.
It does not play a dive or crawl where the water is too shallow for those poses.
The first continuous 135.0114-second routine recording (`siltfin-cycle-05.webm`)
belongs to BuyaVAh3. It contains game audio but has no listening approval.

The initial temple-to-bank route failed against a tree at approximately
(366.75,-839.26); the recorded camera also filled with canopy. The failure trace,
image and 68.2615-second recording remain alongside the correction. The final
route follows (340,-846) → (364,-846) → (368,-842) → (368,-806) →
(356,-792) → (356,-742). It has a 1.6 m readable trail, a riverbank sign and
measured tree-canopy camera proxies. Gorge revision 3 lowers only the raised visual
cap along the existing dry-bank corridor. Its final export hash is
`7557f4c608d6e7e549fc0f33adac394ae7417724e9c96f7ee374492a5deeb8ec`.
The terrain/water functions and collision constraints were not bypassed.

`temple-bank-arrival-05.webm` records 70.0118 seconds of continuous play at High
overrides: resolution 1, shadow 1024, vegetation 1, reflections off, FXAA/post on,
nearby distance 240, frozen day time .12. Viewport 920×668, DPR 1.25, internal
1150×835. Diagnostic initial placement precedes capture; W+Shift input with scripted
camera steering then uses the real controller and collisions, with no position or
clock jumps during the recording. All five destinations were reached after
**28.1109 seconds**. The settled endpoint was approximately
(355.99996,56.02,-742.00437). The route JSON preserves the trace. This is a partial
temple-to-bank journey, not the required home-to-world-to-home journey.

The player waited through the natural routine, then interacted with the ordinary
E control. At world time 253.3847 seconds the game displayed the named encounter
in English and saved encounters=1, lastEncounter=253.3847,
alertUntil=259.3847. `siltfin-interaction-05.png` shows the result. Actual reload into
the title screen retained the Siltfin record, all 14 habitat records, appearance,
settings, world clock and player position by deep value comparison; see the before
and after JSON records. This proves retained data at that point, not resumed
behavior over a complete journey. The QA-origin encounter save is backed up before
diagnostic resets; the original 5173-origin player save is separate and untouched.

## Final still critique and open issues

The new aquatic-specific material gives the face and body stronger form shading;
a restrained broken wake follows the actual creature transform and water height.
An intermediate full oval ripple looked artificial and was reduced before the
final build. In the neutral close/medium packet, **P=7hgK5CKM** and **S=BuyaVAh3**.
The original creature mesh, reset alert pose, time, camera and settings match;
moving cloud/water phases and background collision geometry do not. The independent
critic chose P before disclosure, modestly. Scores remain composition 3, anatomy 3,
surface 2, lighting/palette 3, coherence 2. Wet/submerged transitions, body-water
integration and material hierarchy remain below the frozen criteria.

The same critic inspected four arrival frames and the route trace. These support
visible dry-bank placement and partial arrival, but not continuous camera, motion
or audio approval. The abrupt trail end, planar bank rocks and sparse destination
need further authoring. The shoreline boulder at (393,-684), wider basin/outlet
coherence, both dragons' artistic gates and the complete world journey remain open.
See `reviews/integrated-07.md` and `reviews/contact-08.md`; neither is a world pass.

## Sustained performance session

A separate no-video/no-screenshot run began at 2026-09-30T00:17:29.859Z on the final
build, with three 60-second walks after ten-second warmups in each of the market,
forest, lower falls approach and Vesper bank. Hardware inventory is in
`hardware-05.json`. The actual browser renderer is Intel UHD / ANGLE D3D11, despite
an installed GTX 1650. Results and their limitations will be recorded after the
session finishes. No hardware switch or 60 FPS pass is inferred from the installed
dedicated GPU.

The first attempt completed all three market runs, then stopped when a forest
perch-rock cluster obstructed the trail. Its incomplete forest interval is not
used. The failure and the successful 21.102-second detour preflight are preserved.
A second attempt, 00:24:37.661Z–00:35:08.057Z, completed the remaining nine runs
without interruption. No screenshot/video/build/test/Blender rendering occurred
during timing. Only lightweight file work and status reads ran alongside it.

| Scene | FPS across three runs | p95 frame ms | Max frame ms | Frames >100 ms |
|---|---:|---:|---:|---:|
| Aldermere market | 37.79 / 38.33 / 37.85 | 34.6 / 34.7 / 34.7 | 1152.4 | 1 |
| Mosswood glade detour | 42.62 / 42.42 / 42.79 | 27.9 / 27.9 / 27.9 | 48.6 | 0 |
| Silverveil lower approach | 50.38 / 50.68 / 50.12 | 21.1 / 21.0 / 21.1 | 41.8 | 0 |
| Vesper upper bank | 48.87 / 48.97 / 49.05 | 27.8 / 27.8 / 27.8 | 55.7 | 0 |

All runs are Low at **805×584 internal pixels**, viewport 920×668, DPR 1.25,
resolution .7, shadow512, vegetation .3, reflections off, FXAA on, post off,
nearby distance90, day time .12 frozen. Simulation remained populated. These are
RAF-delivery intervals, not GPU elapsed timings or native-1080p results. Embedded
browser refresh/vsync and process/GPU byte usage remain unverified. The preserved
raw files include every interval and roughly one-second route/resource traces;
`performance-05-summary.json` aggregates complete runs only.

The **60 FPS target is missed in every scene**. The numeric mean/p95 weaker-mode
targets are met in these samples, but the initial 1.1524-second city stall remains
unexplained. Maximum observed used JS heap is **638,627,462 bytes**, above the
450 MB peak budget. Final-run values range from 337.5 to 351.2 MB, including one
value above the 350 MB settled budget; these are approximate counters, not a
three-journey retention or loading test. Resource counts increased as scenes first
became resident (up to655 geometries/96 textures); repeated-world leak behavior is
unverified. Neither P2 nor P4 receives approval from this evidence. The independent
performance-05 audit recomputes the raw records and retains these failures; it
also documents warmup-inclusive lap counters, incomplete first-attempt provenance
and missing refresh/loading/full-journey evidence.

After benchmarking, the exact QA encounter backup was restored through a temporary
same-origin HTML recovery page so an old game's unload handler could not overwrite
the restoration. The helper page was removed before freezing the build. Actual
Welcome home activation resumed play; `siltfin-resumed-save-05.webm` records
22.0138 seconds and its trace retains encounters=1 while the routine proceeds to
swimming. There are no clock or position jumps. The first mouse pan points away
from Vesper; the final dragon-facing live view occurs just after capture and is
saved separately. This is state-continuation evidence with unfavorable framing,
not independent continuous-motion or audio acceptance.
