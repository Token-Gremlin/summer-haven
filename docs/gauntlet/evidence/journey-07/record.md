# Journey 07 — failed playtest, preserved for reproduction

This attempt ran on the previously published `3c0cd57` gameplay source and
`index-rs5CDbKv.js`, before the new road and resident fixes. It started at
2026-09-30T02:20:34.697Z and ended at 2026-09-30T02:36:38.367Z, after
963,670.5 ms. It does not pass the complete-world journey gate.

The existing QA-origin save was backed up outside Git. A fresh summer and the
masculine Rowe appearance were created through normal UI. Low quality was
selected through settings: 1280 × 720 viewport, DPR 1.25, 1120 × 630 internal
rendering, natural clock at 1× without freeze. The separate development-origin
save was not changed. Concurrent Blender work and recording mean this session
is not a performance benchmark.

Ordinary interactions and synthetic movement keys used the real player
controller and collision system. Scripted camera steering is disclosed. No QA
position teleport, time fixture or recovery action was used to complete a leg.
The functions actually injected during this attempt are archived in
`injected-methods.js`; later helper fixes must not be attributed to this run.

## Observed sequence and failures

- Character creation, house entry/exit, bicycle mounting, travel to Aldermere
  and dismounting were exercised. The entry-road tree and center-road milepost
  obstructed the journey and required ordinary detours.
- Rowan remained blocked beside Mara's work props. The exact resident and
  collision state is in `rowan-blocked.json`.
- Hall and studio entries, the hall route chart and delivery board, and studio
  inspections were exercised. A porch post obstructed a straight approach,
  though the normal entry prompt still worked.
- Tamsin moved away before the attempted interaction. No conversation was
  completed. `tamsin-departed.png` records that attempt; its original filename
  was misleading and has been corrected.
- At the bench near `(23, -333)`, normal sitting placed the character inside the
  bench collider. Movement cleared the seated flag but could not move the
  player out. The route watchdog stopped after approximately five seconds.
  The final state is in `bench-trap.json` and the last video.

The attempt ended at this actual seating failure. It did not continue to the
ferry, forest, falls, temple, dragons or return home. The new road and crowd
repairs address earlier findings with structural regression tests; they were
not loaded into this running build. The seating defect remains open in the
handoff, with the normal pause-menu return-home action as a recovery option.

## Evidence and limits

`observer.json` contains 963 state samples, 316 input events, 92 memory samples,
21 markers and the exact initial/final save data. Six WebM segments retain
canvas motion and an audio track, with sidecar timing/size metadata. There are
gaps between recordings; they are not one uninterrupted full-session video.
No independent continuous motion or audio approval is claimed. Screenshots
show individual states only. The journey cannot certify performance, complete
persistence or overall artistic quality.
