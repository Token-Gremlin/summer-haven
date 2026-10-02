# Wildlife 05 — independent review

Date: 2026-09-29. Decision: **NOT APPROVED; Q4 FAIL**. This is a single named candidate, not a blind A/B. No implementation, builder narrative, previous review or unit-test result was read. Scope is the supplied wildlife contribution, not the complete world.

## Evidence actually inspected

- `wildlife-forest-05.webm`: decoded timed stills across the approximately 75-second recording; 15 samples at five-second cadence (selection near each interval centre), an exact seek at 25 seconds, and eight samples across 49–51 seconds. Saved under `../evidence/wildlife-review-05/`. **These are sampled frames, not continuous motion watching. I did not listen to audio.** VP9 805×584 and Opus streams were inspected; stream presence does not approve sound.
- `wildlife-forest-05.json`: build DNQwQnV7, asset SHA 5b99d494154dbedd0169be29e0b4e26b2b119e7379bd7fde73ac535ff9c93d74, Low, 0.7 resolution, shadows 512, vegetation 0.3, nearby visibility/distance 140; viewport 920×668/DPR 1.25, internal 805×584. Recorder reports diagnostic initial positioning/reset, then ordinary unaccelerated play with W at 12 seconds for 2.2 seconds; frozen time. Player begins (210,11.83185,-497) and ends approximately (210,12.54790,-502.10044). Exact time of day/save identity are not supplied. This is not an acceptance journey.
- Original Blender pixels: deer three-quarter, deer side feed, perched songbird, terrapin. These are stills without a contact ground plane, not rig/contact validation.
- Independently opened and inspected actual official N4 and N2 image pixels in a temporary browser tab, using the exact official Bandai CDN URLs in `reference-evidence.md`. N4 demonstrates simple forms with head/arm pose variation, soft volume and feet coherently placed on paving. N2 uses clustered vegetation, an articulated land/water surface and distant relief to connect a route with depth. Reference stills do not establish motion or audio; different rendering resolution/viewpoint limits direct fidelity comparison.

## Observations and scores

| Q4 dimension | Score | Evidence and limiting gap |
|---|---:|---|
| Composition | 2/5 | Forest has a clear pale diagonal path and warm deer as focal accents, with foreground player/trunk and middle-ground animals. Almost all background is sealed by similar dark canopy masses; little depth, ground detail or habitat destination is legible. N2's route/depth principle is not achieved here. |
| Shape/anatomy | 3/5 | Deer ears, muzzle, split hooves and body spots read immediately. Blender exposes a collar-like neck junction, abrupt shoulder/leg attachments and pipe-like lower limbs; terrapin limb joints and separate shell tiles remain elementary. Bird crest, beak and feet are distinguishable. Competent stylized assets, insufficient close and moving evidence for 4. |
| Surface craft | 2/5 | At runtime 25 seconds, deer torso is almost one flat orange fill with spots, losing much of the Blender render's chest/haunch volume. Forest floor is an undifferentiated dark plane; foliage uses highly repeated masses/pattern. |
| Lighting/palette | 3/5 | Warm deer/pale path against cool forest makes action readable and retains welcoming color. Dark habitat lacks local light/tonal hierarchy; runtime animal volume is weak. Only one lighting condition inspected. |
| Animation | UNVERIFIED | Sampled frames show different leg/head poses and changed positions, including lowered feeding heads. They cannot establish stance locking, weight, smooth transition, takeoff/landing or continuity. No numeric motion score is justified. |
| Atmosphere/audio | UNVERIFIED | Static mood is sheltered and calm, but no listening or continuous foliage/water observation occurred. Opus is not audible-quality evidence. |
| Integrated coherence | 3/5 | Warm stylized creatures fit the broad palette and proportions. Weak runtime volume, repeated enclosure and unproven habitat interaction keep this at prototype quality. River/bird runtime is absent from this reviewed packet. |

Scores are separate; no average excuses a weak or unverified dimension.

## Gate decisions

- **L1 UNVERIFIED:** forest frames show deer standing, changing location and lowering heads, and the trace names rest/wander/feed. Bird trace names perch/takeoff/flock/land, but state names cannot prove those visible behaviors. No adequately framed bird contact sequence or second ground/water kind in habitat was inspected. Deer trace has no reaction state during the reported player approach; this does not prove reaction is broken because the trigger distance is unknown.
- **B2 UNVERIFIED as a complete gate; visual deficit observed:** silhouette, ochre/cream palette and spots survive, but torso volume/focal detail are reduced in the 25-second runtime view versus Blender. Matched close runtime views, approach/LOD continuity and other species remain missing.
- **C2 relevant contact principles UNVERIFIED:** thin legs and changing poses are visible, not grounded stance continuity. Blender's empty background cannot prove terrain/perch contact. No unit test can close this gate.
- **Q1 FAIL in this sampled forest composition:** route is readable, but background and habitat hierarchy remain weak. Full-world Q1 is not evaluated.
- **Q2 FAIL at the requested polish level in sampled contribution:** compatible palette is a strength, but assets and setting do not sustain close craft. Other times/regions are unverified.
- **Q3 UNVERIFIED:** continuous motion and actual audio listening are missing from this critic's inspection.
- **Q4 FAIL:** several visual dimensions remain 2–3, with motion/audio unverified.

## Largest gap and next experiment

The largest craft gap is **animals reading as flat repeated ornaments within a nearly uniform foliage wall rather than grounded inhabitants of an authored habitat**. Improving asset count will not address this. The narrow next experiment should stage one small feeding glade beside the existing path: retain one foreground framing tree, open a middle-ground patch with clearly readable food/ground material, separate background tree layers, and give a deer enough local form shading and contact shadow to read chest, haunch and planted hoof. Record one close/medium uninterrupted rest → walk → feed → player reaction → return sequence with normal input, retaining the same resolution/settings for comparison. Inspect real-time stance contact and listen to the resulting encounter before scoring those dimensions.

A separate concrete behavior warning is present in the actual state trace: at 75.0277 seconds **mosswood-glade-1 and mosswood-glade-2 both rest at exactly (220,12.91799191489536,-509)**. This supports a shared occupied destination concern; it is not direct visual intersection proof because that endpoint is outside the sampled camera. Test and visibly record destination separation for all three deer before approving believable group behavior. Their first departures also occur within roughly 0.75 seconds of each other after a diagnostic reset, so a natural-start observation is needed before concluding they behave independently.

River/bird evidence was requested from the coordinator but had not arrived when this review was written. It can close evidence gaps; it cannot erase the observed forest craft deficit. No source files were modified.

## Addendum — frozen bird and terrapin close views, 2026-09-29

Independently inspected `wildlife-birds-perched-05.png/.json` and `wildlife-terrapin-water-05.png/.json`, without source inspection. Both are **diagnostic photo stills frozen at reset**, build DNQwQnV7, time 0.12, elapsed 0. High, resolution 1, shadows 1024, vegetation 1, post on, reflections off, distance 240/nearby; viewport 920×668 at DPR 1.25 and reported internal 1150×835. Thus these are not matched-quality replacements for the Low forest recording. Bird camera distance 2.4 targets (204,12.96,-500); terrapin distance 3.5 targets (306.7,15.3,-577). No continuous animation or audio inspection was added.

**Birds:** Four recognizable teal/gold birds stand on separate faceted stones. Crests, large eyes, dark beaks, orange breasts, tails and feet survive runtime and give stronger focal readability than the deer forest samples. Toes appear placed on stone tops in this view, which is useful static contact evidence, not landing or stance continuity approval. All four share essentially the same forward gaze, orientation and upright pose; unlike N4's expressive variation, this looks like a repeated display group. The heads and torsos remain broadly flat colored compared with Blender's soft volume. The conspicuous repeated dark canopy remains behind them.

**Terrapin:** Only a small ochre patterned shell patch is legible in a very large, nearly uniform pale water area; head, eyes, limbs and shell volume from the Blender view are not readable. The upper bank is a dark straight-edged band with little contextual detail. This may depict intentional submergence, but this particular close review view does not communicate a recognizable resting animal or its body/water contact. Do not infer swimming, feeding, hidden limb animation or suitable breathing posture from the state label.

- **B2:** Bird palette/silhouette/major accents receive narrow positive still evidence; full B2 remains UNVERIFIED for bird loading/LOD/motion. **Terrapin focal-detail readability FAILS in the supplied view**, despite High settings. Water obscuration is an integrated presentation problem regardless of whether the asset itself contains the missing detail.
- **L1:** Presence in separate forest/water settings is now supported visually; distinct observable behavior and complete bird transitions remain UNVERIFIED. A shell patch and named rest state cannot establish the required second animal's behavior.
- **Q4 narrow scores:** bird composition 3, shape 3, surface craft 2, lighting/palette 3, integrated coherence 3; terrapin-view composition 2, shape UNVERIFIED because anatomy is obscured, surface presentation 2, lighting/palette 2, integrated coherence 2. Animation and atmosphere/audio remain UNVERIFIED for both. No dimension is averaged, and existing forest decision remains intact.

The narrow additional experiment is a side-on terrapin waterline/bank view at ordinary encounter distance: make head, shell contour and at least relevant contact/action readable, then record an uninterrupted rest → travel → feed sequence plus a contrasting bird takeoff/landing. For birds, vary resting head/gaze and body pose while retaining credible foot placement; do not substitute randomized placement for expression. No further clip is needed to conclude that these stills do not yet close B2/L1/Q4.

The coordinator reports reproducing deer overlap at elapsed 310.3 and working on occupancy correction. That report is **not independently inspected evidence in this addendum** and does not retroactively alter the original recording or verdict.
