# Geography / collision / navigation independent review 02

Decision recorded 2026-09-29 21:57 UTC. Reviewed working tree based on `4a2e55b2d4a25c62d042c33a2c0b42654413c20d`, with uncommitted production work. **PASS for the narrowly scoped geography, broadphase equivalence and static legacy-navigation invariants below. FAIL for navigation cache coherence after collision mutation. No integrated-world gate is approved.**

## Independence and scope

Fresh-context critic read OBJECTIVE.txt, acceptance-v1.md and reference-evidence.md, then actual regions.ts, world.ts terrain function, collision.ts, navigation.ts and world-regions.test.ts. No previous critic decision or builder explanation was read before this verdict. Source names/comments and descriptive tests reveal intended behavior, so this is not a blinded A/B assessment. The coordinator disclosed that bridge decks and city runtime were being integrated; those files, browser and Blender were not used. No publishing or implementation-file edits were performed.

Relevant reference principles are N2 (coherent land/water and traversable relief) and Z1/Z2 (readable vertical relationships and destinations), as documented in reference-evidence.md. No reference imagery was newly viewed and no visual comparison is claimed. This is S/R evidence, not V/M/A/P evidence. Save, camera, viewport, quality and time of day are not applicable to these Node tests; runtime settings remain unverified.

## Claims and results

| Claim | Verdict | Observed evidence / limit |
|---|---|---|
| Protected village terrain retained | PASS, formula/sample scope | Existing terrain expression still precedes the new sampler; sampler returns legacyHeight throughout LEGACY_BOUNDS. Tests compare both walkable modes on a 3 m by 2 m lattice plus shrine steps at 0.1 m and bridge. This does not approve wardrobe, activities, old saves or village appearance under W1. |
| Full advertised trail width retains road/cycle <=0.10 and walking <=0.18 grade | PASS, sampled numerical scope | Supplied test runs 17 lateral lanes at <=0.1 m longitudinal intervals. Independent central-difference gradient probe on 85,202 junction-area points at 0.11 m spacing, excluding the last 0.02 m at edges, found zero violations against the nearest segment's destination mode. Maximum grade 0.178326619 at (306.91,-763.32), falls-switch-3; maximum grade/limit 0.990703437. Segment labels must be used: the cycle-to-walk junction includes a walking departure. |
| Junction continuity across trail width | PASS, sampled numerical scope | Supplied 0.17 m junction grids test 0.01 m horizontal/vertical differences across width, including switchback bisectors. The level landings and adjacent-segment interpolation are consistent with the independent gradient probes. No mathematical all-real-coordinate proof or rendered mesh continuity is claimed. |
| Waterfall has supported upper geography and a receiving basin | PASS, foundation geometry only | Upper-bank/lip tests from z=-730 to -830 at 0.5 m pass, escarpment exceeds 25 m rise and channel bed is 1.6 m below water. Independent near-bank probes at halfWidth+0.1 m, every 0.2 m on both sides, found minimum ground-water gap 1.2 m. Basin center (370,-698) is 17.2 below water 18. River samples join the original river at -132. This does not verify rendered spray, current, banks, sound or W5 visual coherence. |
| Trail is separate from river/banks, with one explicit elevated crossing | PASS, data/support scope | 17 width lanes at <=0.25 m intervals pass: samples within 2 m of water banks require REGION_BRIDGES membership, >=0.35 m clearance and deck interpolation equal to terrain support. One bridge is exercised. regionBridgeAt tests a finite deck footprint, rather than granting generic water exemption to nearby paths. Actual bridge mesh, rails, water collision and player passage were not inspected. |
| Safe level dragon resting shelf | PASS, geometric footprint only | Radius 0..26 m in 2 m increments, angular spacing 0.15 radians, is exactly y=92; encounter approach (529,-958) also y=92. Creature size/contact and physical encounter safety need runtime evidence. |
| Spatial collision index preserves brute-force results | PASS, tested operations | Seed 271: 1,600 rotated/circular/height-aware obstacles, 5,000 blockage probes and 500 camera sweeps pass against brute force; local query <60 candidates. Original handles, update, array mutation and remove tests pass. No timing/performance gate is approved. |
| Legacy navigation coordinate mapping survives expanded collision bounds | PASS, static-grid scope | Origin captured at construction; IDs and points remain unchanged after WORLD_BOUNDS assignment; tested village route reaches within 2 m of destination and avoids tested obstacles. Grid intentionally does not expand and this cannot approve city/region navigation. |
| Navigation remains coherent after collision changes | FAIL | Independent reproduction below returns cached walkable=true after adding an obstacle directly over that cell, while collision.blocked=true and collision.revision=1. cells and edges never invalidate on revision. Inspection of the navigation diff establishes this is inherited behavior, not a regression introduced by the origin fix. It nevertheless limits C4/J2 and any live city/streaming use. |
| Save round trip preserves distant position/discoveries/appearance | PASS, serialization fixture only | Provided test retains (542,-978), 70 discovery IDs and hair selection, rejects nonfinite positions and invalid/duplicate IDs. Existing played-save migration and persistence journey remain unverified. |

## Reproduction and results

`npx tsx --test tests/world-regions.test.ts`: **12 passed, 0 failed**, 26.319 seconds. This is test duration, not game performance. Independent probes used Node 24.14.0 with `--import tsx --input-type=module` and direct imports of reviewed source.

Cache counterexample:

```ts
const c = new Collision();
const nav = new Navigation(c);
const id = nav.id(0, 17);
const [x, z] = nav.point(id); // -0.4, 17.4
nav.walkable(id); // true: populate cache
c.add({ x, z, r: 1, height: 3 });
nav.walkable(id); // true: stale
c.blocked(x, z, 0.38, terrainHeight(x, z)); // true
```

Reviewed SHA256 fingerprints (in listed order):

- src/data/regions.ts: `48C55801696EC61C84FC5D933908AD09E4F4905EE82DE6FE09C82E04D14C1D4A`
- src/data/world.ts: `26C426D81F4499F8EB2F8580900E6442C009FE37A5FC83A0851E565C0B6800E7`
- src/world/collision.ts: `2CFAE01B29CEBEEA9636C6C4DF3C77F7E19E73B19DD4B2FAEA9B32094A63F33C`
- src/world/navigation.ts: `206AD4252D539F8A9BEA911AAEDF11B235C37B7944A8A06B761B32DF96304883`
- tests/world-regions.test.ts: `83EAA41F4C391D80B66D37A6FA365DD8E34881C88BC20707FB3945572305148C`

## Largest gap and next experiment

The largest demonstrated logic gap is stale navigation after mutable collision updates. Invalidate cached cells/edges when relevant collision state changes, or explicitly restrict this navigation object to immutable geometry and test that integration contract. Repeat add/move/remove route tests, including a cached edge with a new blocker, before using it for live blocked-route recovery. The narrow origin-preservation contribution can be accepted without implying that this inherited limitation is repaired.

For geography itself the next missing evidence is an actual input-driven full-width journey across the rendered headwater bridge, waterfall switchbacks and shelf, followed by a return route. Sampled height functions cannot approve rendered terrain tessellation, controller slopes, bridge-water collision, camera, animation, creature grounding, atmosphere, art or sound. W1/W3/W5/C4/D2/J1/J2 and all artistic/performance gates remain UNVERIFIED as complete acceptance gates. No earlier explanations were opened after the decision either.
