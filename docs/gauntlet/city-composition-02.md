# Aldermere composition iteration 02

This responds to the fresh `reviews/world-03.md` City02 findings: an empty boulevard sightline, detached houses with lawn setbacks, weak district identity and no civic destination. The contributor inspected the actual `city-runtime-02.png` and `interior-guildhall-03.png` pixels before editing. The guildhall interior was outside this iteration's ownership and was not changed. There is no screenshot, artistic-score or motion approval in this report.

## Authored spatial changes

The same **24 building IDs**, all three interior keys and the original regional road geometry are retained. No map scaling or indiscriminate building multiplication was used.

- **Lantern Market:** paired frontages now occupy approximately X9/33 along Z−268…−319. The bakery and tea house establish the southern arrival; the herb-window home and swallow house continue the frontages. Two covered shopping walks connect these into a street edge, with their stalls under cover and a high hanging-light line framing the approach. The large 15m lateral market strip is replaced by a smaller public space plus connected pedestrian margins.
- **Civic endpoint:** the Wayfarers’ Hall moves to **(18,−340), yaw 0**, facing the market approach. A timber roof lantern with an actual bell and stepped roof gives a distinctive skyline endpoint. Its overall highest added detail is about 12m above foundation. A small paved forecourt, public basin, bench and mapmaking/steward rendezvous occupy the middle distance. The unchanged main road bends east past the hall with full-width clearance rather than ending at its door. The room's exterior prompt is **(18,−334.75)**.
- **Makers’ Court:** two facing workshop rows now enclose the area around **(−23,−315)**. Pottery and cloth/wood studios share a 24m covered working edge; wheelwright and dye house face them from the north; the bell foundry frames the west. A rear residential lane reaches Mira's courtyard, while Oren's home sits on the northern return lane. The workshop interior prompt is **(−16.525,−322.4)**. Indigo shade, real station activity and a central meeting bench distinguish this district from the market.
- **Reedbank:** the common room and west-facing boat shed now share a paved court around **(108,−342)**. Lio's landing sits on the northern approach; the blue door and water gardener form its domestic edges. A small covered gallery, garden walls, laundry and a wider court establish an inhabited cluster. The common-room entrance is **(102.6,−339.26)**. A dedicated path and “River ferry →” sign lead to the ferry's upper stair landing at **(110.3065,−325.37)**; the route does not target the boat deck below.

All frontages use the existing authored building scale. The four arcades are explicit architectural connections, each with bay rhythm, valance, corbels, individual grounded posts and an elevated roof collision interval. Their footprints reserve the ground from procedural trees. Side paths and courtyards use the existing shared path surface system, avoiding layered duplicate paving. Low garden boundaries define the space between the market and quay without fencing off doors or the main road. Detail goes through the existing static batching and visibility system.

## Resident and save changes

Stable building IDs keep each home/work reference coherent through `cityPoint`; the fixed market errands and paired rendezvous were remapped to the corresponding new public spaces. The updated exact table is in `city-life-contract.md`. All ten workstations remain separate physical props, whose stand feet stay on sampled ground while their work surfaces account for the small height difference between the worker and station.

`CityLifeState.layoutRevision` is now **2**. An older/absent layout revision migrates **once on load** to each resident's new home, preserving their ID, conversations, completed jobs and completed meetings; active route/phase/partial activity resets coherently. A current-layout load keeps the saved positions. This does not add a runtime teleport recovery for blocked residents.

The tighter streets exposed a real route issue: a settled worker could block another resident's preferred path. Resumable A* now includes temporary per-search clearance around settled residents and the player, without inserting constantly moving global collision proxies. A late blockage still triggers replanning. Arrival precision is now ≤.025m, with swept movement down to the final step; work contact waits for station-facing alignment after a greeting, and nonworking hand diagnostics clear. A regression walks the actual home→work routes before testing contacts, rather than seeding exact work positions.

## Mechanical evidence and live-review boundary

`tests/city-layout.test.ts` loads the actual architecture GLB/manifest and original furniture, builds the new City with its architecture/detail collision, and tests:

1. The 24 identities, three interior approaches, four connected frontages and finite batched mesh count.
2. Adult-radius clearance across nine lanes spanning the full width of every original city main-road segment, sampled every .5m from south gate to forest gate, including the live river/grade blocking predicate.
3. All forty resident daily route legs, all exact activity points and routes to the three interior entrances.
4. Actual walking arrival of all ten residents, complete work-contact cycles using the real adult rigs, and greeting recovery without reaching back toward a station while facing the player. Maximum sampled hand-origin target error must remain ≤.06m.

The complete four-test composition preflight passes; typecheck passes. `evidence/city-layout-node-audit.json` records **50 static mesh objects after batching** and **985 authored collision obstacles**. These counts exclude procedural terrain/tree generation, animated residents and render passes; they are not measured frame times, actual GPU draw calls or performance approval. The architecture-only collision preflight is saved to `.cache/city-layout-collision.json` for diagnosis and must not replace a full runtime capture.

The coordinator supplied the refreshed **Bcrodwn1 full runtime fixture** with 1,233 obstacles, including generated trees and ferry collision. The combined **12/12 city and resident tests pass against this default fixture**, and typecheck passes. No additional source fixes were needed. The normal 1,200-second day, offscreen progress, all forty routes, contacts, migration and reset are covered. `evidence/city-tests-runtime-02.json` records the exact fixture hash and result. The captured reload in `evidence/city-layout-migration-02.json` preserves all ten completed-task totals and Lio’s conversation count of 1.

Capture the same market approach as City02, the new civic forecourt, Makers’ Court, Reedbank/ferry approach and an elevated neighborhood overview. Follow actual residents and enter each interior with normal input. Review local occlusion, roof/post camera clearance, road turning, workstations, tree intrusion, crowd flow, long-outfit contact and the intended foreground/middle/background hierarchy. Independent artistic review and populated hardware measurements remain required; no Q4 score has been raised by tests or by this report.
