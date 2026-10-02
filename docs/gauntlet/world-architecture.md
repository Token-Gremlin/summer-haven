# Connected world architecture — implementation contract

Status: source inspection and proposed contracts, 29 September 2026, followed by the authorized foundation handoff recorded below. This report does not certify a playable expansion, visual quality, simulation, performance, or assets. Parent integration owns acceptance of this design. The complete user goal remains the delivery scope; the first corridor is a production dependency, not the final deliverable.

## Source findings that constrain expansion

- `src/data/world.ts` holds all 33 building records, 14 paths, seven discovery circles, river centerline, and the shared height function. Village building coordinates, IDs, doors, customization, and activities must survive. Existing terrain rules are not region bounded: the central flat strip, sinusoidal river, and bridge override can affect any appended northern/southern terrain.
- `src/world/village.ts:130` creates one 390 × 390 m terrain plane with 160 × 160 segments. Paths sample the same height function, and `PathSurfaces` clips intersecting triangles to eliminate depth fighting. Plants, water, scenery, collision and interactions are constructed in the same class. Only one zero-timeout interrupts its construction. Static props batch into 22 m cells; preserve that useful machinery.
- `Collision` currently permits x = [-126,126], z = [-132,124], with an unbounded river predicate and a linear obstacle array. Movement uses at most 0.1 m substeps. The camera checks terrain plus every obstacle every 0.12 m along its boom. Widening only the rectangle would expose invisible/unbuilt land, lose water/bridge coherence, and multiply CPU cost.
- `Navigation` derives a whole-world 1.4 m grid from collision bounds. Walkability/edge results are cached without invalidation; A* selects the minimum by scanning an open Set. Its height sampler is imported directly from world data. On the proposed full envelope a monolithic grid would approach 738,000 cells, roughly 23 times the current grid, before path-search maps and edge caches. Use local grids and a regional portal graph.
- Player ground, gait IK, camera ground, trees, villagers, and paths share `terrainHeight`; keep that export as an adapter during migration. The present player has no jump/fall/swim traversal model: it snaps y to the sampled surface. New cliffs require explicit impassability and reachable switchbacks; a visual cliff alone is not collision.
- `Assets.load` synchronously sequences two body libraries and one village GLB. `Assets.toon` clones geometry, uses the first source material only, strips groups and morph attributes through `prep`, and replaces materials with the custom MRT toon shader. Source base color, mesh separation, names, normals, skin weights and named clips survive; texture/PBR/morph-based detail does not currently survive. `get` clones objects from the shared village library; new assets need explicit packages and animation ownership.
- Every villager constructs a full customized `Character`. Existing visible clothing is batched within an actor, but there is no population-level mesh LOD or pooled actor library. Twelve identities have three schedule stops selected at time 0.48 and 0.8, mostly standing/walking. Actor yielding scans all other actors. Routes continue outside rendering range but no resident state persists. Room placement assumes café x=431.8 or shop x=461.5; any further room incorrectly falls into the café position branch.
- Interiors are physically stored at x=400,430,460, z≈0, not separate spaces. Main entry/exit assumes only `home|cafe|shop`. Keep those coordinates isolated while introducing explicit `spaceId`; never accidentally include room collisions in outdoor queries or claim their coordinates are an outdoor destination.
- Save v1 clamps x to [-124,124], z to [-130,122], allows only 20 discoveries, discards unknown activities, and has no resident, vehicle, interior, or world-event state. Merely saving a new-region coordinate would silently move the player back on reload. Bike position is reset to [8,17] on every boot.
- Time is a one-way 14:00–20:30 display, reaching 1 after 1,200 real seconds at normal speed and stopping. A complete recurring daily life needs an absolute simulation clock and new dawn/night looks. Keep the existing afternoon-to-blue-hour lighting curve intact as a component.
- Wildlife is six procedural small birds returning to the same perch, seven dragonflies, firefly points, and one village cat. It is a useful behavior foundation, not existing ecosystem/dragon production.
- Camera is 48° outside with a 2.1–9 m boom, 0.15 near and 4,200 far plane. This is workable for ground exploration but needs cliff, large-creature, transit and interior evidence. Avoid world-origin rebasing within this ~1.5 km envelope; it would introduce complexity without a demonstrated precision need.

## Spatial contract

One runtime unit remains one metre. +Y is up, -Z is north, +X is east. World coordinates are authoritative for saves and authored routes. All new GLBs export metre-scaled, Y-up through Blender's glTF exporter, origin at their ground/contact reference, +Z local forward, unit scale, applied mesh transforms, and explicit collision proxies. Skeletal transforms remain deliberate and validated. Never scale the village or existing avatars to imply a larger world.

Reserve outer world envelope x=[-320,760], z=[-1160,180]. This is a generation/loading envelope, not automatically walkable space. Preserve current collision semantics and heights bit-for-bit within legacy playable rectangle x=[-126,126], z=[-132,124], excluding only an explicitly authored 8 m wide north-road opening centered at (0,-132). Preserve existing named places and IDs. Region IDs below are stable, player-facing names are original proposed English names.

| Region ID / name | Bounds (x range; z range) | Main terrain and composition | Required destination coverage |
|---|---|---|---|
| `haven` / Haven village | [-126,126]; [-132,124] | Existing village, mirror fields, hill, shrine, gardens and orchard unchanged | All current homes, wardrobe, café, shop, bicycle, discoveries and activities |
| `north-road` / Lantern Road | [-48,100]; [-250,-120] | Fields taper into coppice and a gentle 0–4 m rise; framed city gate appears between trees | Roadside shelter, courier meeting point, milestone; open village connection |
| `aldermere` / Aldermere | [-125,170]; [-430,-235] | 4–12 m terraces; 18–28 m roof/tower skyline, 4 distinct districts | South market, west workshops, east canal quay, north homes/public garden; inn, guild workshop, market hall interiors |
| `mosswood` / Mosswood | [110,365]; [-645,-415] | 8–22 m broadleaf/cedar forest; paths alternate enclosure and clearings | Ranger home, feeding glade, ruined aqueduct, riverbank trail, wildlife habitat |
| `silverveil` / Silverveil Falls | [250,490]; [-805,-610] | River basin at 18 m, upper water at 54 m; 36 m fall and ledged rock amphitheatre | Lower spray overlook, accessible riverside pool edge, climbing switchback, upper crossing |
| `starroot` / Starroot Sanctuary | [230,435]; [-950,-790] | 48–62 m temple terraces behind falls; large trees break the ruins' silhouette | Reachable temple courtyard, archive interior, bell garden, ruin side loop and discovery |
| `crownreach` / Crownreach | [390,690]; [-1100,-855] | Ridge terrain 65–115 m; visible 125–180 m mountain backdrop and open flight space | 30 × 24 m dragon resting shelf, safe lookout, drake habitat, ranger/dragon encounter route |

Bounds overlap intentionally for authored transitions, not duplicate ground. Each ground sample has one deterministic owner; water, bridge decks and interiors are separate surfaces. The rest of the reserved envelope allows meaningful side valleys, paths and skyline compositions in later passes. Add those connected regions as approved production work, not inaccessible painted façades presented as exploration.

### First continuous journey spine

Author a route spline through these `(x,z,height)` stations. Heights are route/deck elevations, not entire-region flatness. Legacy samples through z=-132 use their exact previous heights; outside heights shown below are targets. Enforce maximum 10% grade for the cart/bicycle road to the forest and 18% grade for walking switchbacks. Sampling of an unconstrained Catmull-Rom spline is not sufficient: inspect grade, road edge clearance and curvature after terrain fitting.

| Stable node | Coordinate | Width / use |
|---|---|---|
| `haven-north` | (-6,-76,legacy) | Join existing north road without a duplicate surface |
| `haven-portal` | (0,-132,legacy) | 8 m clear opening, 5.2 m road; no tree or boundary barrier |
| `road-bend` | (8,-164,1) | 5.2 m; reveal city tower beyond foreground trees |
| `city-south-gate` | (20,-244,4) | 7 m road plus two 1.8 m pedestrian margins |
| `city-market` | (20,-300,6) | 24 × 30 m square, through route remains clear |
| `city-garden` | (34,-360,8) | 5.5 m road; workshop and quay side loops reconnect |
| `city-forest-gate` | (94,-416,9) | 5.2 m; delivery-cart turning/stop bay off road |
| `forest-ranger` | (196,-492,12) | 3.6 m bicycle trail, 5.2 m service spur stops at ranger |
| `forest-water` | (280,-568,16) | 3 m riverbank trail; dragon silhouette can cross distant sky |
| `falls-lower` | (348,-688,18) | 3 m trail, 10 × 12 m setback lookout |
| `falls-switch-1` | (300,-715,23) | 2.6 m walking path |
| `falls-switch-2` | (362,-737,29) | 2.6 m walking path |
| `falls-switch-3` | (305,-766,36) | 2.6 m walking path |
| `falls-upper` | (376,-794,47) | 3 m trail; upper-river crossing on separate deck |
| `temple-court` | (340,-846,52) | 22 × 26 m public courtyard |
| `ridge-gate` | (414,-899,64) | 3 m path; sheltered resting place |
| `ridge-switch` | (454,-996,78) | 3 m path with return view |
| `dragon-lookout` | (500,-960,88) | 14 × 10 m platform, encounter distance ≥25 m from resting shelf |
| `dragon-rest` | (542,-978,92) | 30 × 24 m grounded creature shelf; reachable on behavior conditions |

Village-to-dragon spine is approximately 1.5 km with these bends: ~11 minutes uninterrupted walking at 2.35 m/s, before exploration, and substantially shorter to the forest on bicycle. Preserve convenient return travel as part of transportation, without making initial discovery a menu teleport. City loops, forest return trail and temple side paths are mandatory meaningful area coverage after the spine works.

Water runs from the upper falls (366,-756,54) over the lip near (366,-730,54), into a lower basin near (352,-690,18), then through forest at (304,-570,15), city east quay at (137,-345,2), and joins the existing river at `(riverX(-132),-132,-0.16)`. This is an authored hydrological spline with banks, not an extension of `riverX(z)` forever. The upper trail crosses behind the lip on a height-55 m bridge near (373,-766), reached by an optional short ascent from the upper trail. Fix path geometry against actual river width; bridge deck beats water blocking only within its polygon. Keep the existing village bridge at z≈-26 exactly intact.

## Shared terrain and world service seam

Introduce data-only `src/data/regions.ts` with region IDs, bounds, portal nodes/edges, water spline/deck polygons, POIs and world limits. No Three.js imports. `src/world/terrain.ts` owns the unified sampler. Retain `terrainHeight(x,z,walkable)` in `src/data/world.ts` as a forwarding compatibility function; move the exact old implementation into a legacy helper rather than duplicating formulas. Avoid a circular import: terrain may import `legacy-terrain.ts`, not `data/world.ts`.

Required service contract:

```ts
type SpaceId = 'outdoors' | `interior:${string}`;
type SurfaceKind = 'grass'|'road'|'stone'|'wood'|'shallow-water'|'deep-water'|'cliff';
interface GroundSample {
  y: number; normal: [number,number,number]; surface: SurfaceKind;
  regionId: string; walkable: boolean; cycleable: boolean;
  waterY?: number; deckId?: string;
}
sampleGround(x: number, z: number, space?: SpaceId): GroundSample;
sampleTerrainHeight(x: number, z: number): number; // bare terrain; excludes bridge/stairs
sampleSupportHeight(x: number, z: number, referenceY?: number): number;
```

Legacy `walkable=false` must remain bare-terrain sampling, while true returns support surfaces including existing shrine steps. New overpasses/caves eventually require referenceY; a single heightfield cannot represent an underpass and its deck at once. Do not imply caves work before that contract is implemented.

Use a 32 m terrain grid cell. High/medium mesh tiles use 1 m samples in playable near ground, low distant meshes 4 m; all edges sample identical global coordinates. Terrain collision reads the analytic/authored sampler, not rendered LOD vertices. Blend new low-frequency terrain only outside the legacy rectangle across a 24 m band. Preserve all old ground inside; clip/replace only the original plane's unused outer skirt so it cannot overlap new tiles. Keep path surfaces 0.035 m over support, terrain rendered 0.045 m below terrain samples as today. The path intersection index must include neighboring tile crossings or use deterministic edge clipping to avoid seam overlaps.

`WorldRuntime` is a facade over legacy Village plus region residents/terrain/water/interaction indexes. It exposes `collision`, `sampleGround`, `interactionsNear`, `regionAt`, `ensureAreaReady`, `update`, `snapshot`. `main.ts` remains the sole composition owner. Initially all tiny region descriptors may be resident; region meshes, actors and assets are loaded separately. Do not make another giant `Village` holding the entire world.

Collision gets stable obstacle IDs, `regionId`, `spaceId`, static/dynamic distinction, and 8 m spatial-hash buckets. Existing `add/blocked/move/cameraDistance` signatures can remain. Broadphase queries use the swept capsule/boom AABB; preserve current narrow-phase and movement stepping first. Add slope/surface rejection before a movement substep and query y at candidate support, avoiding traversal through steep terrain by y snapping. Loading boundary is not the outer rectangle: movement may enter only ready traversable tiles and authored road openings. Registry-derived invalidation increments a collision revision for local nav tiles.

Navigation grids remain at 1.4 m for compatibility, partitioned into 64 m tiles with a two-cell shared border. Routes use the named portal graph first and A* only within local tiles; binary heap replaces open-Set scanning. Queue path work with at most 2 ms main-thread budget per rendered frame until moved to a worker. Distinguish `pending`, `found`, `alreadyThere`, `unreachable`; an empty array must not mean all four. Each result records tile revisions and agent radius/mode. Walking, bicycle and cart links differ; stairs and upper falls prohibit carts. Cart lanes require ≥5.2 m clear carriageway, minimum 6 m turn radius, off-lane stop bays, and pedestrian yield zones.

## Loading, rendering and asset contract

Region states: `unloaded → requested → building → ready → retiring`. Physics/portal/simulation data stays resident. A region becomes ready only after terrain, collision, essential surfaces and at least landmark proxies are installed atomically. Do not let the player step onto absent ground while a texture/model request runs. Keep legacy village available as fallback and a failed-package retry status in the dashboard.

Start with 32 m scenery cells aligned to terrain (existing village may retain 22 m batches). Request detail within 192 m, prefetch within 288 m plus a 4-second velocity corridor, retire detail beyond 352 m after 8 seconds. These are initial measurable settings, not claimed optimal values. Keep next portal neighborhood requested even when camera faces backward. Incremental mesh construction target ≤2 ms per frame; compile materials once per package before first prominent reveal. Never run full-scene compilation on every transition. Asset packages are promise-cached and reference counted; retain shared geometry/materials until all instances are released. Region retirement must dispose owned buffers, stop emitters and detach actors while preserving their simulation records.

Keep skyline/landmark proxy geometry at 800–1,600 m, with separate silhouette budgets; existing full-view mode must become full-landscape silhouettes with quality-sensitive close detail, visibly described in settings. Never silently remove distant city/falls/dragon destinations in low mode. Chunk terrain/paths/water so visibility can work; current SceneryVisibility deliberately skips >65 m bounding spheres, which would otherwise keep giant expansion meshes permanently submitted.

New package path: `public/assets/regions/<region>/<package>.glb`, editable sources under the repository's existing Blender production location after parent confirms its pipeline. Manifest records source path, export recipe/hash, units, bounds, material slots, collider IDs, LODs and named clips. Architecture/props: separate mesh per material family, names `wood_*`, `plaster_*`, `roof_*`, `stone_*`, `metal_*`, `glass_*`, `glow_*`. Dragon: explicit `skin_*`/`scale_*`/`membrane_*` families require importer mappings; otherwise they become cloth today. Make shader changes deliberately and verify in game. Do not add textures expecting the present importer to display them. Export collision proxies separately from beauty meshes; do not infer gameplay collision from decorative horns, eaves or branches.

Dragon target: 13–16 m nose-to-tail, 20–24 m wingspan, grounded shoulder 4–5 m. Author skeleton and clips `rest`, `breathe`, `look`, `rise`, `walk`, `takeoff`, `flap`, `glide`, `bank`, `land`, `react`; name/skeleton contract must be agreed before runtime behavior binding. Four legs plus distinct wings require shoulders/pelvis/wing-root anatomy, not stretching the human rig. Near/mid/far geometry, membrane and silhouette review are mandatory; start budget proposal 45k/14k/3k triangles with ≤6 material batches, revisable only after actual art/runtime evidence. Budget is not an art-quality target.

## Persistent living-world contract

The simulation stores residents independently of render objects. Identity record: stable id, name, home, occupation, appearance seed/palette and authored dialogue. State record: absolute world seconds, current activity, destination, route edge/progress, needs/event flags, current space, owned vehicle, interaction commitments. Pool character instances by appearance; far residents do not keep full wardrobe skeletons. Initial first-journey density target is 36 city identities plus existing village residents, 12–18 visible in a busy market view on high, and 8–12 on low; reduced render population must be disclosed while offscreen identities persist.

Use fixed simulation step 0.1 s near (≤50 m), 0.5 s mid (50–160 m), and analytic schedule/edge-progress evaluation beyond. Visual animation stays render-rate near and 15–20 Hz mid, interpolated. Distant movement follows route length, speed and departures, never teleports between independently selected random points. At materialization reconstruct the same route position away from camera occlusion where possible; do not reset the person to home. Actor collision uses the spatial index, reservations at doors, and yielding with progress timeouts. Separate conversation reservations from movement, so a paused chat does not invalidate a shop opening.

Full day: absolute seconds + day index, proposed 4,800 real seconds per 24 in-game hours at speed 1, pausing under the current UI pause semantics. Migrate old time to day 0, minute `840 + round(time*390)`. Existing afternoon/dusk palette remains mapped to its real time segment; dawn/night must be authored and evaluated before a 24-hour mode is considered accepted. Schedule jumps use `advanceTo`, explicitly reconcile commitments/vehicles, and do not enqueue every missed frame. Browser suspension remains paused; offline progress is not implied.

City schedules must visibly include delivery, opening/closing, production animation, two-person social meetings, meal/rest and returning home. Give every visible activity a reachable anchor and animation/prop/sound. Add a service cart looping village gate → market → workshops → ranger depot; passengers are a separate later vehicle contract, not an invisible rider on a decorative moving mesh. Cart/bicycle/player ownership and parking persist. Wildlife habitat records supply food/rest/perch nodes, seeded identity, alert radius, roam/forage/rest/flee transitions. Birds choose actual landing nodes and animate braking/feet/settle; dragon stores territory, alert, flight route and grounded state. First dragon is a complete landmark creature; further distinctive dragons/territories remain broader-world coverage, not implicitly completed by one model.

Save v2 uses a new key with migration from v1, retains an untouched recoverable v1 copy, and commits only after validation. Store `worldVersion`, `clock`, `player {spaceId,x,y,z,yaw}`, legacy appearance/settings/activities, scalable discovery IDs, residents, vehicles, wildlife/dragon encounter state, and durable local story flags. Validate finite coordinates against the world/space registry, then find nearest safe support on load. Never clamp a valid city save into village limits. Interior saves preserve doorway return transform. Rehydrate simulation first; await player neighborhood collision readiness; then place player and bike, then render. Keep previous valid v2 snapshot when a write fails. Do not overwrite the active user's save with a QA fixture.

## Evidence-led performance constraints

Latest checked-in relevant evidence is `docs/qa-fluency-1080p.json`, not older polish timings: Intel UHD Graphics (0x00009BC4), ANGLE/D3D11, 1920×1080 display, DPR≈1, Low/nearby internally 1344×756. Town: mean 34.66 ms, p95 41.5 ms, 28.86 FPS, ~400 total draw calls, ~1.21m submitted triangles. River: mean 32.05 ms, p95 34.8 ms, 31.20 FPS. These are 4-second historical samples, not a fresh hardware baseline. `QA-FLUENCY.md` reports 720p Low 35.6–41.8 FPS and Medium ~19–20 outdoors. There is no demonstrated 60 FPS headroom for expansion.

Source-backed priorities, with causal claims separated from measurements:

1. Scene geometry/shading cost is the dominant historical timed GPU component in older pass reports; newer low render submits roughly a million triangles. Measure the current pass breakdown before final prioritization. Trees use both near detail and far canopy; reflections bypass camera-frustum rejection in the tree loop. Region-scale forestry must use cell rejection and separate main/reflection lists.
2. Reflection currently renders the scene every other frame whenever enabled outdoors, regardless of whether a reflecting water surface is visible. Use nearest visible water body, its own elevation, bounded reflection inclusion, distance cutoff and update cadence. One global plane at -0.19 cannot reflect an elevated waterfall basin or upper river correctly. Prefer opaque stylized waterfall sheet plus bounded spray over multi-layer transparent overdraw.
3. Camera and movement collision work scale linearly with all obstacles and substeps; broadphase is a required prerequisite to dense city construction. Nav searches can synchronously spike at global schedule transitions; stagger/queue route requests and profile worst-case busy-city change of shift.
4. Whole-world actor construction clones wardrobe geometry and creates mixers even when distant. Pool active forms and keep data-only far state; asset-memory reporting must count shared versus cloned geometry. Current GC allocations in player/camera and IK merit profiling, but are not assumed the principal frame cost without evidence.
5. MRT half-float scene buffers, post effects, shadows and reflections add render target bandwidth. Preserve high fidelity settings, but establish independent low/medium budgets; do not hide a resolution downgrade inside an FPS claim.
6. Global geometry build/asset preload and lack of unloading create startup and memory growth risks; frame pacing and memory plateau are acceptance evidence, not merely mean FPS.

Initial planning allocation for 60 FPS: total p95 ≤16.7 ms, CPU update ≤3 ms (simulation/navigation ≤1.5 ms), main render GPU ≤8 ms, combined shadow/reflection average ≤2 ms, post ≤2 ms, leaving overlap/driver headroom. These are goals, not measurements or guaranteed hardware feasibility. Begin low-tier content guardrails at ≤160 main-view calls / ≤300k main-view triangles, ≤256 MiB estimated live GPU resources and ≤350 MiB JS heap, plus an observed plateau after three full round trips. Determine feasibility on declared hardware before calling these budgets fixed. Retain high mode with additional detail and report its achieved numbers independently.

Measure 30-second warmed city/forest/falls/dragon scenarios plus a continuous transition run. Record hardware/browser, viewport/internal size/DPR, every setting, active/distant entity counts, p50/p95/p99 frame times, >50/100 ms stalls, pass times when supported, JS heap, estimated buffers/textures/render targets, load durations and errors. GPU memory from browser estimates must be labeled estimated; missing hardware counters remain unavailable. Historical four-second samples inform priorities but cannot approve sustained new-world performance.

## File ownership and integration order

| Owner role | Exclusive write area | Dependency contract |
|---|---|---|
| Integration owner | `main.ts`, `core/save.ts`, `ui/*`, integration tests | Wires services, migrates persistence, owns all shared-file reconciliation |
| World/terrain specialist | new `data/regions.ts`, `data/legacy-terrain.ts`, `world/terrain.ts`, `world/regions/*`, `world/world.ts`; coordinated `data/world.ts` forwarding export | Authored route and height/water/region contracts above; no actor or save edits |
| Spatial/performance specialist | `world/collision.ts`, `world/navigation.ts`, `render/visibility.ts`, new spatial/loading helpers | Compatibility API first; migration revision and nav result protocol; measured baseline and broadphase tests |
| Living-world specialist | new `data/residents.ts`, `world/simulation/*`, `world/transport.ts`; later coordinated `world/npcs.ts`, `wildlife.ts` | Consumes GroundSample, portals, clock and snapshot interfaces; never owns `main.ts` |
| Blender asset specialist | allocated source/export package and manifest section | Single Blender writer; exports agreed names/units/clips/materials; importer owned by integration/render owner |
| Independent critic | `docs/gauntlet/reviews/*`, evidence annotations | Fresh objective/criteria/output; no builder explanation as evidence |

With four total slots, run integration + terrain/spatial + living systems + asset artist; rotate a completed builder out for independent critique. Never let two workers edit `main.ts`, `data/world.ts`, `assets.ts`, or the shared Blender scene simultaneously. This document itself is owned by the architecture specialist only until handoff.

1. Freeze baseline saves, journey evidence and hardware conditions; production village remains playable.
2. Land world/terrain registry, legacy forwarding adapter, save migration, indexed collision and readiness gates without new visual claims. Validate existing village and new-region save roundtrip.
3. Build first integrated north-road/city/forest/falls/temple/ridge surfaces and destinations, original asset packages, interactions, skyline proxies and streaming. A connected but visually unfinished corridor is explicitly still unfinished.
4. Integrate resident activities, cart service, habitats, authored dragon animation/behavior and persistent story/discoveries; evaluate them in the corridor, not only isolated scenes.
5. Independently critique actual playable journey against frozen reference criteria; address the largest gap. Extend city density/interiors and region side loops, add broader connected territory and further creature/transport coverage, and repeat integrated criticism. No fixed round count or small-demo completion condition.

First mechanical gates: preserve every legacy test and saved appearance; cross village/city boundaries on foot and bicycle without height/collision jumps; make every spine edge traversable with correct mode; return from each interior; save/reload in every region; remove/reload streamed scenery without missing ground or growing resource counts; observe one resident and vehicle complete a meaningful destination cycle. These gates prove integration only. Art, atmosphere, living activity and full scope require the user-requested independent in-game evidence.

## Authorized foundation handoff

After the independent `acceptance-v1.md` freeze and root confirmation that the current baseline had been captured, the architecture worker implemented these bounded foundations. They are pending independent contribution review and integrated gameplay evidence.

- `data/regions.ts`: accepted stable IDs, bounds, journey route, shared northern terrain and river samplers. Water basin center moved east from the design's initial (352,-690) to (370,-690) so the lower overlook remains on dry land. The 24 m legacy seam preserves original playable heights exactly. Paths must use this same height sampler. Root owns clipping the unused old ground skirt and all actual region activation.
- `data/world.ts`: the original height formula remains intact and forwards its result to the new finite-region sampler. No BUILDINGS or PATHS records were edited.
- `core/save.ts`: additive v1-compatible position validation covers the reserved envelope, and retains up to 2,048 distinct discoveries. This is not the complete v2 simulation migration described above.
- `world/collision.ts`: 8 m conservative broadphase, unchanged exact collision/camera narrow phase and substeps, mutable array/returned-handle tracking, `update`, `remove`, `reindex` and `revision`. The original object passed to `add` keeps its identity and tracked spatial-field accessors, so direct position/dimension/yaw assignments update buckets automatically. Optional shape fields should be changed by assignment (including `undefined`) or `update`; use `reindex` after bulk property-descriptor/deletion edits. Default movement bounds stay legacy-sized.
- `world/navigation.ts`: snapshot grid origin at construction. Width/height alone were already snapshots; reading the mutable collision bounds in `point/id` would otherwise shift every existing villager route when root expands outdoor bounds. The global-grid architecture still needs later regional navigation work.
- `tests/world-regions.test.ts`: legacy terrain fixture including stairs/bridge, route height/grade continuity, finite registry/river, distant save/discovery roundtrip, randomized brute-force collision/camera equivalence, mutable obstacles, full-width junction continuity, dragon shelf/water basin and navigation origin regression. This validates the mechanical foundation only.

The first independent contribution critic found two real defects: nearest-segment road heights jumped at switchback bisectors, and direct mutation of the original obstacle reference bypassed indexing. Both were repaired with targeted tests. Junctions now interpolate only the immediately adjacent segments within their common road footprint, preserving each centreline and excluding unrelated switchback levels. Full-width junction sweeps compare heights 1 cm apart, including the critic's ridge coordinates. Original obstacle spatial fields now use tracked accessors; `add` still returns the exact original object. The terrain additionally has a dragon-rest shelf (radius 18 m at y=92, 12 m outer blend) and lower-falls receiving basin (22×18 m ellipse at y=17.2). A new final approach node `(526,-971.15,92)` brings the route onto the shelf before the creature's tested 14 m radius grounded footprint. The navigation origin regression and these five targeted repair tests passed; full-suite follow-up is recorded by the integration owner.

The reserved bounds are not a declaration that all land is traversable or loaded. Root must gate collision/readiness, ensure every crossing deck matches water blocking, and validate travel through actual built geometry. Complete world scope, original production assets, full simulation, 24-hour time, broad persistent state, sustained performance and craft acceptance remain outstanding.
