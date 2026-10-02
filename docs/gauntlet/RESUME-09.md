# Resume — paused water/nature handoff

Do not resume the development loop automatically. On 30 September 2026 the owner requested stopping it and publishing all current work in a new GitHub PR. Goal status is paused, not complete. Publication of this snapshot is authorized; deployment and merging main are not requested.

Branch: polish/water-and-nature, based on merged PR #3 (bbb185b). Read HANDOFF-09.md, nature-focus-09.md, evidence/runtime-nature-09.md, reviews/bank-i09.md, reviews/canopy-j09.md and reviews/nature-verification-09.md for exact evidence and unfinished work.

Current runtime: J DMYTnp5a. Preview 4177 serves .cache/nature-candidate, not dist. Before future testing, copy both compiled assets and index after a build. Frozen baseline 4176 uses .cache/handoff-build. Original dev 5173 and prior previews/saves are preserved. Browser viewport overrides were reset at handoff.

Water/foliage changes are in commits 65faa5d and 4501dda. The handoff adds local village-ground replacement (I) and fitted foliage-camera envelopes (J). Bounds, regions, routes, population and save format are unchanged. All existing assets remain tracked; no extra art download is needed.

Validation: J TypeScript/build passed; 146 full tests passed, then four focused canopy tests passed after one test-only nonzero-wind fixture addition. A four-waypoint bank walk completes; the orbit recovers its six-metre distance. Reviewers accept only narrow static/contact improvements, not full quality.

Current Low measurements: forest 36.43 FPS / p95 34.6ms / max 77; falls 43.94 FPS / p95 27.9ms / max 62.6; village 39.80 FPS / p95 27.9ms / max 55.4. Internal 1120x630 on Intel UHD, not 1080p/High/60FPS. Forest run 2 has 22 consecutive 69–77ms intervals across 1.65 seconds, still unresolved. A 90s profile completed before stopping and is saved as diagnostic-forest-profile-j.json; no diagnostic loop remains active.

If explicitly resumed, prioritize that stutter burst, the 3.677m/256ms inward camera correction and remaining regional bank/pool contact. Preserve the no-world-expansion instruction. Q4, temporal, audio and full-journey gates remain unapproved. Publication and passing tests do not complete the Goal.
