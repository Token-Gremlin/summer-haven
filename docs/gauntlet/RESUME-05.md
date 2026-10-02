# Resume after local candidate 05

The full objective in OBJECTIVE.txt remains active and incomplete. PR #1 is the
already published village/fluency work: merged as
`570ca10fe8b84601798ab48f988637760a783b76`, with successful workflow 36624543948.
No fantasy-expansion source or evidence has been pushed or merged. Separate
authorization is required for publication of this branch.

## Recoverable build and saves

- Branch `feat/fantasy-gauntlet`, following local checkpoint `d368760`.
- Candidate 05 module: `index-7hgK5CKM.js`. The tested build is frozen at
  `.cache/releases/fantasy-candidate-05`; hashes are in evidence/checkpoint-05-hashes.json.
  Candidate 04 and the published village remain in `.cache/releases`.
- Servers: published village 4173, current compiled candidate 4175, development
  and dashboard 5173. Previous process sessions: 12423 / 87138 / 91576. Verify
  after a restart. Dashboard: `/docs/gauntlet/index.html` on 5173.
- The original 5173-origin save is separate and preserved. Its backup is
  `.cache/gauntlet-original-storage.json`; it contains a CDP result wrapping the
  serialized save, not a map of storage keys. Do not replace it with test state.
- The useful 4175-origin encounter save is the exact serialized value in
  `.cache/qa-encounter-save-05.json`, for key `summer-haven.save.v1`. It contains
  one real Vesper encounter and all retained fauna state. Restore it after
  diagnostics, then reload and verify. A running game persists on unload, so
  restoration must update the live save or otherwise prevent a stale unload write.
- Natural browser viewport is 920×668 with DPR 1.25. High scale 1 renders
  1150×835; Low scale .7 renders 805×584. There is no temporary viewport override.

## Narrow evidence now available

- Strict TypeScript and production build pass. Full suite **96/96**, 51.798807 s,
  and final-fixture habitat checks **5/5**, 2.6126 s. Logs are in evidence.
- Fourteen original persistent animals are integrated. Shared waterline offset,
  grounded two-link deer gait, slope accommodation, conservative 1.6 m deer
  envelope and actual bird-perch collision supports are tested. Supports at
  (204,-500) currently obstruct the main forest trail: the live benchmark found
  this; preserve its image and trace. The declared detour was walked successfully.
- Original Vesper Siltfin is integrated, with 40 bones, six clips, a rest/swim
  routine and bank interaction. The initial routine has a 135.0114 s recording;
  it predates the final material/wake correction. Dive/crawl clips are not played
  in a habitat too shallow for them. Audio is recorded but not listened/approved.
- Gorge revision 3 makes the actual approach bank physically match its terrain
  surface. A 70.0118 s continuous recording contains a **28.1109 s** successful
  five-waypoint temple-to-bank walk via ordinary controller/collision and scripted
  camera steering. Only its initial placement was diagnostic. It is not J1.
- E interaction saved one Vesper encounter. Actual reload to the title screen
  retained Siltfin, all fauna, appearance, settings, world clock and position by
  deep equality. A later 22.0138 s actual resumed-play recording retains that
  encounter while the routine changes from alert/rest to swimming, with no clock
  or position jumps. The camera initially faces away; a natural mouse pan shows
  swimming just after capture. This is narrow continuation, not full motion approval.
- Final actual viewport, conditions, adverse outputs, caveats and evidence names
  are detailed in `evidence/runtime-05.md`.

## Independent criticism remains unfavorable overall

Reviews 05–08 retain all failures. The latest fresh critic viewed actual official
reference images and neutral comparison packets before identity disclosure:

- Forest D=BqU66S_Z preferred narrowly over F=BuyaVAh3. Contact contradictions
  reduced, but anatomy, surface, composition and coherence score 2; lighting 3.
- Aquatic P=7hgK5CKM preferred modestly over S=BuyaVAh3. Face volume improves;
  anatomy/composition/light score 3, surface/water integration 2.
- Arrival frames and trace support a dry-bank endpoint, but its path ends
  abruptly and the bank is sparsely authored. Frame inspection does not approve
  continuous movement, camera or sound.
- Q4 and broader craft gates do not pass. No frozen criteria were lowered.

## Performance procedure and limits

`tools/qa/world-performance.js` runs real controller walks with scripted camera
steering, 10 s warmup and three 60 s timed repetitions per populated scene. It
records raw RAF intervals, position/speed/resource traces, actual rendering size
and settings. Do not render Blender, build/test, record video or take screenshots
during timing. Diagnostic placement/reset happens before warmup. RAF delivery is
not asynchronous GPU elapsed time.

The first attempt (`performance-05-attempt1.json`) preserves three complete market
runs: 37.79 / 38.33 / 37.85 FPS, p95 about 34.7 ms. Its forest sample aborted on the
perch-rock obstruction and is not accepted. The safe detour was then preflighted
against live collision and walked in 21.102 s before restarting the other scenes.
The resumed `performance-05.json` completes nine more runs with no interruption.
`performance-05-summary.json` combines completed runs only: forest42.42–42.79FPS,
falls50.12–50.68FPS, Vesper48.87–49.05FPS. None achieves60FPS. Method/limits and
all distributions are recorded in runtime-05.md; do not compare only best runs.

Hardware: i5-10300H, approximately 16 GB RAM, Windows 11. **Actual browser renderer
is Intel UHD / ANGLE D3D11**, driver 31.0.101.2141, Chrome 154. The installed GTX 1650
is not the measured renderer. Embedded-browser refresh/vsync remains unverified.
The first market run includes a 1,152.4 ms stall and maximum observed used heap
638.6 MB, subsequently about339 MB. This exceeds the frozen measured-peak budget;
its cause has not yet been established. No cold-load/process/GPU-memory or
three-full-journey leak certification exists. The 60 FPS target remains unmet.
The fresh independent `reviews/performance-05.md` recomputes the raw records and
retains P2/P4 failure and incomplete P1/P3. It also notes that lap counters include
warmup and that the initial helper did not preserve interrupted-run trace samples.

## Next production and ownership

Before release of new production, preserve this source/build/evidence checkpoint.
Two explicitly authorized Astra specialists prepared drafts only in `.cache`:

- `deer_artist_09`: original continuous/skinned deer anatomy and restrained vertex
  painting. Owns wildlife Blender sources/GLB/metadata, deer gait and gait tests,
  wildlife asset contract, plus a narrowly opt-in vertex-color preservation branch
  in `src/game/assets.ts`. Preserve terrapin/songbird buffers and old deer revision.
  Requires exclusive Blender access after the benchmark; preserve unrelated scenes.
- `performance_engineer_06`: opt-in `?prof=1` main-loop CPU and asynchronous GPU
  instrumentation. Owns main.ts, render/profiler.ts and focused profiler lifecycle
  tests after release. Default rendering/behavior must be unchanged. Root controls
  browser timing and keeps GPU-heavy authoring separate from profiling windows.
- Root: relocate obstructing forest perches, route regression, dashboard/evidence,
  integration, actual runtime profiling and fresh independent review.

Beyond those experiments: city surfaces and purposeful activity, authored forest
floor/canopies, waterfall basin/outlet and separate boulder collision, useful bank
destination, ferry visibility and return, Aurelian anatomy, Vesper immersion and
sound, meaningful discoveries and alternate routes, all-body/outfit regression,
full home-to-world-to-home journey, daily and 30-minute observation, sustained
performance/memory and independent integrated-world acceptance all remain open.
