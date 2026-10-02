# Foundation review 01 — FAIL (narrow contribution)

Independent critic: foundation_critic. Evaluated 2026-09-29, approximately 21:40 UTC, against base `4a2e55b` and frozen acceptance v1. Read the authoritative supplied objective, criteria and selected reference evidence; inspected actual code/diff without the builder narrative. Source/state review cannot be visually blinded.

Scope: regions.ts, only the terrain sampler change in world.ts, collision.ts, save.ts, world-regions.test.ts, and the subsequently supplied origin snapshot in navigation.ts. No browser, gameplay, Blender, audio or hardware performance evaluation occurred. N2/Z1/Z2 support coherent navigable elevation; no artistic approval is inferred from code.

## Largest defect: road joins contain height discontinuities

**FAIL — continuous usable route terrain (J2/W3/W5 prerequisite).** `regionRouteSample` hard-selects the nearest segment (regions.ts:84), whose interpolated height directly becomes road interior terrain (regions.ts:143). Crossing a bend's equal-distance boundary swaps between different longitudinal heights. Points well inside declared road width therefore have abrupt steps:

| Join | Point A → point B | Height A → height B | Jump across 0.01 m |
|---|---|---|---|
| ridge-switch | (454.38, -994.54) → (454.39, -994.54) | 77.839233 → 78.206624 | 0.367390 m |
| falls-switch-3 | (306.28, -765.94) → (306.28, -765.93) | 36.168446 → 35.871655 | 0.296791 m |

Ridge points lie only 0.908/0.909 m from centerline inside a 3 m wide road; falls points lie 0.525/0.518 m from centerline inside a 2.6 m wide road. These ordinary road positions fail the intended bounded walking grade. Supplied tests sample only centerlines and miss the joins. Actual foot/camera behavior was not observed.

Reproduce: `node_modules/.bin/tsx.cmd .cache/foundation-critic.ts` scans every join; `.cache/foundation-serialization.ts` prints exact pairs. Repair with continuous join construction/blending; test full road width, both crossing directions and progressively tighter intervals near segment boundaries. Then demonstrate normal-input walking/cycling contact separately.

## Other findings

- **PASS, tested legacy terrain math:** the supplied fixture matches the old function; both walkable modes, protected grid, steps and bridge pass. Early return preserves legacy values. This does not approve visual/gameplay W1.
- **PASS, tested serialization:** independently exercised actual writeSave/readSave JSON paths using in-memory localStorage at all 19 route nodes with 100 discoveries. Coordinates, appearance, settings and state round-trip. Schema/key unchanged. Browser reload recovery remains unverified.
- **PASS, tested static broadphase parity/local reduction:** the supplied 1,600-obstacle random test compares player queries and camera sweeps with old brute force, including rotation, height, camera-only and water. Local candidate bound passes. No frame-time/memory-budget approval follows.
- **Compatibility limitation:** retained raw input mutations are not tracked. `const o={x:0,z:0,r:1,height:3}; c.add(o); o.x=40;` gives contains(o,40,0,.28)=true but blocked(40,0)=false, unlike the old list scan. The documented returned-handle/update/reindex contract works; searched production add calls use inline literals, so an existing gameplay regression is not established. Do not claim unrestricted mutable-reference compatibility. Preserve it or explicitly document/migrate retained references.
- **PASS, navigation origin snapshot:** independent test verifies all 32,578 legacy grid points/id round trips and a simple cached route remain identical after Collision bounds become WORLD_BOUNDS. Diagnostic: `.cache/foundation-navigation.ts`. This does not approve expanded NPC navigation or dynamic-obstacle cache recovery.
- **UNVERIFIED, gameplay route modes:** road/cycle/walk labels do not prove transport restrictions, boarding, route signage or bicycle slope behavior.

Initial supplied six-test suite passed in 17.66 s; updated seven-test suite including navigation passed in 58.08 s. Different wall times occurred on the shared host and are not a controlled performance comparison. Node 24.14 / Windows. No full-game build or acceptance journey was independently run.

## Decision

**Contribution: FAIL** because path interiors have demonstrated discontinuities. Other passes above apply only to their tested narrow properties. **Full objective: UNVERIFIED; no approval.** Art, animation, residents, transport, creatures, audio, complete journeys and hardware gates need their mandated evidence. Next experiment: repair continuous full-width joins, repeat adversarial checks, then traverse waterfall/ridge normally while inspecting contact and camera.

SHA-256 snapshots at evaluation (later edits require re-review):

- regions.ts: 15E4D70C7B045BB2C34090031417C50CF0CB9B41ED2A9ACDDE7008CE968B9543
- world.ts: 26C426D81F4499F8EB2F8580900E6442C009FE37A5FC83A0851E565C0B6800E7
- collision.ts: F7B9A43AF4DC2E2DF5C4D6196E20ACCD2799687E2FC961C5320394538450B1E9
- save.ts: 155CDC7445B25F538B8EC59E32998F557F15E3323CEFDBBC85F425078A72EA2D
- navigation.ts: 206AD4252D539F8A9BEA911AAEDF11B235C37B7944A8A06B761B32DF96304883
- world-regions.test.ts: 98FB7107EE290AC918216CC2792D34E9F3D2834F29587707EC4863A3A558A29E
