# Vesper Siltfin runtime contract

Implementation contribution only. No D1/D2/B2/J or artistic/motion/audio acceptance is claimed. This implementer must not independently critique this contribution. The earlier world-05 review remains a separate immutable prior assignment.

## Integration API

- `new Siltfin({root, clips, waterline?, snapshot?})` from `src/world/siltfin.ts`. Supply a uniquely cloned skinned GLTF root, identity transform, +Y up/+Z forward; do not center its asymmetric bounds. Caller owns import, material adaptation and resource disposal. Required clips: idle, swim, alert. Other authored clips are retained by the loader but deliberately unused here.
- Add `.group` to scene and `.interaction` to the interaction list. `update(dt, world.elapsedSeconds, playerPosition, playerSpeed, visibilityRange)` every logical frame, including while culled. Saved elapsed seconds owns the 120-second routine. Continuous updates blend actions over .7 seconds. First load or a discontinuous clock seeks clip phase instead of replaying missed steps.
- On accepted inspect input, call `.interact(playerPosition)` and show the non-null English response. It validates bank distance/height and the current resting window. Null means unavailable. The standard static inspect text alone does not record an encounter.
- Persist `.snapshot()` under a caller-owned save field; pass it back at construction. Version 1 contains `encounters`, `lastEncounter`, `alertUntil`. JSON-safe finite values, explicit visits with 12-second repeat cooldown, no offline catch-up rewards. The caller must save this alongside the same `world.elapsedSeconds` value.
- `.phase` is rest/swim/alert; `.group.position` is the spatial audio source. `dispose()` stops and uncaches actions/removes the group; caller disposes owned assets.
- Optional `new SiltfinVoice(audioContext, existingDestinationBus)` from `src/sound/siltfin.ts`; `update(position, listenerPosition, listenerYaw, elapsedSeconds, phase, volume)`; `dispose()`. Uses deterministic filtered noise for original subdued breath/current sounds, stereo direction and squared falloff to zero at 45m. Does not create/resume an AudioContext or bypass master settings. Skips historical sound events on time jumps. Needs actual listening in context.

## Placement and routine

Territory center `(366, -742)`, above Silverveil's lip. Oriented elliptical patrol has .8m cross-river radius, 4m longitudinal radius. Rest at `(365.2, -742)` facing upstream; 30 seconds quiet floating rest, then a 90-second continuous circuit, easing departure and return. During rest, proximity or fast approach activates the authored alert gesture without rotating the whole long body into a bank. No teleports at wrap, no frame-dependent accumulated position, no full dive, no crawl on unsupported banks. This is a small territory, not proof of a magnificent sustained encounter.

Visible water is `regionSurfaceWater = riverProfileY + .08`. Root Y uses visible water minus **1.0377006203m**, default from final artist manifest. At this level reach it is **53.0422993797m**. The shallow receiving basin has only .88m water depth; even the upper channel's 1.68m depth is insufficient to hide a 2.42m posed creature. Submerge/surface gestures therefore remain unused. No geography changes were made. Supporting a full dive would require an authored deeper basin with more than the full posed height plus floor/surface margins (at least roughly 2.8m clear depth), and a new envelope/route review.

Dry interaction target `(356, -742)`, ground Y56, radius2.2. It does not require the player to enter water. A one-metre terrain/proxy flood-fill connects temple court `(340,-846)` east to about `(366,-842)`, north to `(366,-812)`, then west toward `(356,-792)` and north along the bank. This proves only a route through sampled terrain and declared gorge proxies. Generated trees, exact visual gorge geometry, camera contact and normal player movement must be checked in the actual game before calling it reachable.

## Mechanical evidence

`node --import tsx --test tests/siltfin.test.ts` and `npx tsc --noEmit` pass. Tests inspect the final artist JSON and every clip's union bounds, bound the whole creature with conservative local min `[-1.3,-.03,-5.6]`, max `[1.3,2.5,3.7]`, and sweep a .26m/.3m horizontal grid at .25-second samples through every orientation in the routine. The envelope stays on water, clears ground by more than .25m, and avoids all current gorge collision boxes. Tests also cover cycle seams, dry target/route, saved cooldown/history round-trip, offscreen clock placement, rejection outside encounter conditions and malformed snapshot values. These sampled mechanical checks cannot certify blended skin geometry, water occlusion, animation appeal, audio quality or gameplay.

Artist manifest inspected: 22,054 triangles, 40 bones, eight meshes, root identity. Final all-clips union min `[-1.207653,-.000006544,-5.429688]`, max `[1.208023,2.421233,3.524908]`; final GLB SHA256 `ed1037ae7b43b059a236feec4c2fc60bb38d043cf8687760aac8fc54fba45905`. Re-run tests if terrain/gorge/model changes. Runtime shader adaptation must preserve pearl/indigo/copper and eyes/fins; this module does not substitute materials or authorize B2.

## Required next evidence

Integrate asset and snapshot with the existing save flow, then walk from temple court to the bank, observe an entire rest/patrol/reaction cycle, listen near/far and behind the camera, leave/return and reload, and inspect the long tail and feet through turns from above and water level. Confirm the narrow circuit does not look like turning in place and that water masks submerged portions correctly. A fresh independent critic should compare Vesper and Aurelian in actual runtime at encounter range. Winged flight acceptance remains a separate responsibility of the winged dragon; this aquatic encounter cannot satisfy flight criteria by renaming them.

## Handoff correction

Restore accepts version 1 only (missing/unsupported versions reset safely). Encounters are bounded to 0..1,000,000 and timestamps to at most 10,000,000,000 seconds; invalid/nonfinite/out-of-range values reset to defaults. Encounter counts saturate at the bound. Idle/swim repeat; alert uses LoopOnce and clamps its endpoint while attention remains active. Alert begins at local time zero, uses time since that activation when resynchronizing, and only restarts after leaving and re-entering the action. Additional tests cover huge/malformed/versioned saves and one-shot playback/clamping across continuous updates, clock jumps and subsequent re-entry.

Clear-save integration: call public `reset()` when clearing `save.world.siltfin`. It clears visit/cooldown history, stops actions, temporarily disables inspection and forces the next `update` to resynchronize from the reset world's elapsed seconds. Persist subsequent `snapshot()` under `save.world.siltfin`. A reset round-trip test verifies visits, interaction availability and local alert time.
