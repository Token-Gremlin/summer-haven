# Summer Haven — playtest guide

This is the complete current development snapshot for testing in any local
editor. The latest gameplay round adds [weather and four seasons](CLIMATE.md)
to the existing world and its detailed [EZ Tree woodlands](WOODLAND.md).
The main branch includes the original world, regional expansion and water work.

## Get and run this version

Use Node.js 24, or a compatible Node.js version at least 22.12. Clone the
default branch:

```sh
git clone https://github.com/Token-Gremlin/summer-haven.git
cd summer-haven
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. No API key, backend service or Blender
installation is needed to play. The runtime GLBs and editable asset sources
are included in Git.

For an existing clone:

```sh
git fetch origin
git switch main
git pull --ff-only
npm ci
npm run dev
```

The development server uses port 5173. For the compiled version, run
`npm run build` and `npm run preview`, then open port 4173. If one of those
ports is already occupied, close that server first or pass a different port.

## Where to go

Start with the character creator, or choose **Welcome home** for this browser's
existing save. The original village, wardrobe, bicycle and activities remain.
Follow the northern road out of the village to reach the new regions:

| Place | Current playable content |
| --- | --- |
| Aldermere | Lantern Market, Makers' Court and Reedbank; 24 buildings, three enterable rooms and ten named residents with work, errands and meeting schedules |
| Reed Ferry | Passenger route between the Haven river landing and Aldermere quay; follow the stairs and gangway, then use the boarding prompt |
| Mosswood | Woodland route, feeding glade, deer, songbirds and ranger notes |
| Silverveil Falls | River, layered waterfall and walking switchbacks; follow the trail rather than cutting across the cliff |
| Starroot Sanctuary | Open sanctuary court, old route inscription and travelers' bell; a separate trail leads to Vesper's upper bank |
| Crownreach | Mountain trail, bridge, viewpoint and Aurelian's territory |

The city changes naturally with the afternoon. Early on, residents rest near
home; later they work, run errands, meet and return. **T** opens daylight
controls. Freezing the clock also holds the schedule's time-of-day band.

**WASD/arrows** move; **Shift** jogs; drag to turn the camera and scroll to zoom.
**E** interacts, **F** mounts/dismounts a nearby bicycle, **B** rings its bell,
**J** opens the journal, **P** opens photo mode, and **Esc** opens the pause menu.
Cycling uses A/D steering. The pause menu can recover the player or bicycle.

**K** opens Weather & seasons. Try autumn with rain near the river, winter
with snowfall in Mosswood, and spring beside the village gardens. Move wind
strength from zero to a breeze and change its direction. Leave a few seconds
for transitions. Enter the café or your house to shelter from precipitation.
Choose **Summer defaults** to return to the original season. Graphics presets
also control cloud detail and the density of rain, snow and drifting leaves.

## Graphics and saves

Low, Medium, High and Ultra are available. **As I approach** limits scenery by
distance; **Entire landscape** draws much more distant scenery and is more
demanding. Integrated graphics start at Low on a fresh save. Settings and
appearance are stored locally per browser origin, not in the repository.
Importing this branch into another editor or browser does not upload a save.

## Latest files in this handoff

The latest tree round adds oak, ash, aspen and pine based on EZ Tree, with
textured trunks, wind-driven leaf cutouts and four distance detail levels.
It replaces the same 2,368 trees rather than expanding the world. See the
[woodland report](WOODLAND-QA.md) for captures, performance and focused checks.
While its PR is open, check out `polish/ez-tree-woodlands` to test this round.

The earlier [water handoff](gauntlet/HANDOFF-10.md) remains included. It covers:

- Actual displaced waves across rivers and the waterfall pool, with current-driven
  ripples, depth absorption, bed shading, caustics and wave-aligned reflections.
- A deforming waterfall, gravity-driven droplets, impact spray and local mist.
  Low/Medium/High/Ultra use 2,048/8,192/32,768/131,072 droplets respectively.
- The original river footprint and terrain contact are retained. No region,
  road, building, character or vegetation population is added by this round.
- Current source, tests, raw measurements, screenshots and movement recordings.

The earlier complete handoff remains included, including:

- A roadside milepost and four removed tree obstructions that clear the bicycle
  route between the village and Aldermere.
- Resident navigation that can escape a close neighbor beside solid work props
  without teleporting or reducing collision radii.
- Reproducible deer revision 3 Blender sources, export, diagnostics and tests.
  This remains an authoring draft; the game still loads revision 2.
- The failed 16-minute journey recording, new regression tests, measurement
  tools and their independent source review. These are retained as evidence of
  the current state, not presented as a successful complete-world journey.

## What has been checked

- The woodland runtime passed **154 full-suite tests**, strict TypeScript and
  the production build, plus 18 browser fluency checks and a short woodland
  jogging/cycling smoke test. See [current measurements](WOODLAND-QA.md).
- The preceding water round passed **150 full-suite tests**. Its water tests
  cover connected seams, original bank contours,
  pool ownership, gravity trajectories and bounded particle buffers. See
  [the current handoff record](gauntlet/HANDOFF-10.md).
- Final Low samples at 1120×630 internal measured **50.45 FPS** near Silverveil
  (reference 50.60) and **47.59 FPS** on the village riverside (reference 44.84).
  Two 30-second runs per route used matching settings and actual render targets.
  A 631.8ms waterfall frame remains in the data; averages do not certify smooth
  tail latency or 60 FPS at 1080p/High. See the handoff for all measurements.
- Character appearance changes and an actual save/reload were exercised.
- Direct forest/ridge walks, a ferry crossing, interiors, wildlife and dragon
  encounters have partial runtime evidence in `docs/gauntlet/evidence`.
- Earlier twelve one-minute moving samples on Intel UHD measured approximately
  **33–42 FPS**, Low, 1280×720 viewport, DPR1.25, 1120×630 internal rendering.
  The sampled build precedes the final trail bevel patch. One city frame took
  111.2 ms. The fixed city time was a home/rest period, not a busy work period.
- Historical round-09 Low measurements at 1120×630 internal were **36.43 FPS** in Mosswood,
  **43.94 FPS** near Silverveil and **39.80 FPS** on the village riverside.
  A forest run contains a 1.65-second burst of 69–77ms frames; the cause is still
  unresolved. Camera recovery works in the recorded orbit, but its inward
  correction is abrupt. These are not 60 FPS or complete-world approvals.

## Known limitations

**Known interaction bug:** standing after sitting on a city bench can leave the
player stuck in its collision. Until the seating repair is implemented, use
**Esc → Return safely to my house** if this happens. The failed attempt and
exact captured state are preserved in
[journey 07](gauntlet/evidence/journey-07/record.md).

The complete end-to-end journey, busy-city performance, repeated-journey memory,
continuous animation/audio review and final artistic quality are still open.
Creature detail and waterfall/bank integration still have open polish items.
The broader world loop remains paused; this round is limited to trees.
Current bank and camera records have bounded visual
and mechanical checks, with temporal gaps described in the handoff. These are known work-in-progress limits, not claims of
completed full-world acceptance.

The latest road and resident repairs have regression coverage; a fresh complete
runtime journey and independent integrated review are still pending.

All editable production assets, reference attribution, raw evidence and critic
reports are included. The separately archived deer revision 3 is an unintegrated
authoring draft, not the asset loaded by the game. Dependency downloads,
regenerable build output, browser-save backups and temporary caches remain
outside Git; `npm ci` and `npm run build` recreate what is needed to run.
