# Creature review 01 — independent static critique

Date: 2026-09-29, approximately 21:50 UTC. Reviewer: fresh creature critic. Decision: **FAIL for the shown contribution's final artistic acceptance; useful original prototype, further iteration required. No full-world approval.**

## Scope and evidence limits

Read the complete supplied world objective, frozen `acceptance-v1.md`, and `reference-evidence.md`. Inspected actual pixels in all eight `dragon-aurelian-{three-quarter,front,side,face,rest,flight-up,flight-down,alert}.png` images and both `dragon-runtime-01.png` and `dragon-runtime-close.png`. No builder contract or persuasive narrative was read. No browser, Blender session, runtime writes, audio, or contiguous motion was inspected. GLB/source inspection was unnecessary for these visible findings and was not performed.

The eight studio images are 1080 × 810; the two game images are 1280 × 720. Game HUD identifies Crownreach and 15:10. These are output image dimensions, not verified internal render resolutions. Build/checkpoint, seed/save, precise coordinates, camera parameters, preset/overrides and production-versus-diagnostic capture provenance were not supplied to this critic. Consequently these images do not form a fully reproducible acceptance packet yet.

This comparison is **not blinded**: filenames identify the asset, studio/game views differ, and the game HUD identifies the scene. There is no equivalent shuffled old/new A/B pair. Reference comparison uses the recorded observations of N3 (hierarchical anatomy and player-relative scale), N4 (expressive simple faces/poses), and Z2 (territory composition); this critic did not independently reopen the remote source pixels. No animation quality is inferred from disconnected posed stills.

## Largest remaining visible gap: credible grounding and presence in the world

In [dragon-runtime-01](../evidence/dragon-runtime-01.png), the terrain boundary cuts across the lower chest and both wing membranes near image y=450. No leg, talon or lower torso is visible. The upper dragon reads like a bust emerging from the hillside. The image alone cannot determine whether the cause is actual terrain penetration or a foreground crest occluding a correctly placed body. Either way, this representative approach fails to communicate the creature's weight, complete anatomy and magnificent scale. In [dragon-runtime-close](../evidence/dragon-runtime-close.png), legs are visible, confirming that the approach image does not reliably show the authored form. This discrepancy needs an exact-position side-view diagnostic before calling it a collision defect.

The closer image establishes a friendly dragon, but only a modest player-relative height difference: its head stands approximately twice the player's on-screen height above its feet despite being farther away. Perspective prevents an exact physical ratio. The front-on spread wings and very slim legs give it the presence of a character display on a bare grassy slope. There is no visible resting shelf/nest, body-sized terrain response, distinctive territory landmark, or framed approach that sells a great creature belonging here. A simple increase in scale would not by itself solve the anatomy/contact/composition issue.

Affected gates: **D1** encounter anatomy/scale readability; **D2** terrain contact and magnificence (actual intersection and behavior remain unverified); **B2** intended form in runtime; **Q1/Q2/Q4** composition and integrated coherence.

**Next experiment:** preserve the exact runtime-01 creature location/time, record side and rear views exposing all foot contacts and lowest membrane/tail points, then walk continuously from that original approach into encounter distance. If penetrated, correct the root/pose placement and individual ground contacts; if occluded, compose a clear reveal that intentionally resolves the hidden body. Make the resting terrain and approach express this dragon's habitat. Capture a matched studio/runtime side and three-quarter pose at player eye height, with the player beside a visible foot. Re-review the actual runtime result.

## Asset-specific findings

**Silhouette and anatomy.** The long tapering tail, horn crown, cheek fins, dorsal spines and pale ribbed throat make a coherent recognizable design. The four legs, separate wings, and distinct head/jaw are clearly authored, and no recognizable reuse of the selected reference creature is apparent. The side view is readable without requiring texture. However, upper/lower leg transitions look assembled: the near front elbow and especially rear knee/hock in `side` have abrupt flat-edged changes between bulky upper forms and narrow lower forms. In `front`, both forelegs show narrow dark joint seams. This is below a hero creature's close-inspection standard. The evenly repeated conical dorsal spines and disc-like scale rows also communicate a construction pattern more strongly than anatomical flow.

**Wings.** Major wing arms visibly originate at the shoulder; membranes and gold spars are readable in three-quarter/front/rest views. This is a substantial improvement over unattached decorative wing plates as a general asset class. No decisive fully detached wing is visible in these images. The long smooth arm, narrow root and fan membrane still need stronger shoulder/underarm mass and deformation evidence. `rest` leaves both wings broadly spread instead of providing an unmistakably folded resting silhouette. `flight-up` and `flight-down` show different wing positions and tucked limbs; they prove pose variation only. Membrane strain, flex, recovery, range of motion and root continuity through a stroke remain **UNVERIFIED**.

**Expressive head.** `face` provides intentional eyes with vertical pupils/highlights, nostrils, readable jaw separation, cheek accents and a clear welcoming character. The silhouette works. The brows are conspicuously straight bars, eyes sit over dark faceted rings, and a large smooth muzzle dominates the close-up. The `alert` still changes presentation subtly but does not demonstrate an unambiguous expressive range independently of its label. More integrated eyelid/brow volumes and a genuinely distinct attentive head/neck/jaw pose would improve expression without abandoning friendly stylization.

**Surface and palette.** Muted teal, cream and ochre is restrained and compatible with Summer Haven's warmth. The studio rendering separates belly/membrane/horn/body effectively. The pale belly, gold horns and teal body survive in the runtime images, so there is positive evidence of broad palette preservation. Fine surfaces are less convincing: broad smooth body masses contrast with rows of coarse overlapping scale discs; the belly's repeated thin rims and eye-ring facets remain mechanically uniform. This is surface organization, not a request for indiscriminate texture density. Runtime uses strong outlines and flatter shading; its cheek fins and eyes remain readable, but the studio depth of shoulder, knee and membrane folds is not yet demonstrated at equivalent distance/view.

**World fit.** The creature's friendliness, outlined color regions and restrained palette suit the player's broad stylization. The surrounding trees have denser mottled surface treatment than the largely blank dragon body. The current field lacks the foreground/middle/background organization of the selected territory principle Z2: foreground path/grass leads toward the creature, but background tree trunks and foliage compete with its head and wings. The closer frame also places the player over the belly/legs, making anatomical assessment harder. These are reasons to author the encounter view and habitat, not to remove world scope.

## Q4 ratings for applicable static dimensions

These are narrow judgments of the supplied images, not final moving-inspection scores. A 4 requires the frozen criterion's representative close and moving inspection, which this packet cannot provide.

| Dimension | Rating | Evidence |
|---|---:|---|
| Composition | **2/5** | Studio framing is legible; actual approach conceals the lower creature, and the encounter sits on a sparse slope against competing foliage. Runtime views do not yet sell a purposeful territory reveal. |
| Shape/anatomy | **3/5** | Recognizable authored head/neck/tail/wing hierarchy; conspicuous limb-joint transitions, narrow wing-root structure and primitive brow construction remain. `side`, `front`, `face`. |
| Surface craft | **2/5** | Disc-like scale patches, uniform spike repetition, eye facets and smooth large masses feel assembled at close range. `face`, `side`, `three-quarter`. |
| Lighting/palette | **3/5** | Coherent teal/cream/ochre survives runtime; representative matched light/material views and adverse lighting are absent, and dark foliage reduces silhouette separation. |
| Animation | **UNVERIFIED** | Posed stills establish alternate poses only; no timing, transitions, contact, flex or weight observed. |
| Atmosphere/audio | **UNVERIFIED** | No listening or contiguous gameplay; still backgrounds cannot establish soundscape or atmospheric continuity. |
| Integrated coherence | **2/5** | Compatible color language, but unresolved apparent ground cutting, modest encounter presence, sparse territory context and unmatched shader comparison. Both runtime images. |

## Gate disposition

- **D1: FAIL for shown hero close-up/encounter craft.** A promising original dragon exists visually, but final anatomy and scale cues do not withstand all presented views. The required second distinguishable design/encounter is **UNVERIFIED** in this packet; this is not evidence that it does not exist elsewhere.
- **D2: UNVERIFIED.** No complete takeoff/flight/glide/turn/landing/rest/reaction cycle, spatial sound, territory persistence or continuous terrain-contact observation. The runtime-01 appearance is a priority diagnostic, not proof of the underlying collision cause.
- **B1: UNVERIFIED by this critic.** Rendered images do not prove Blender MCP authorship, editable rig/export reproduction, or preservation of unrelated work.
- **B2: UNVERIFIED overall.** Broad palette preservation is visible; matched poses, LOD transitions, holes, popping and animation retention are not fully evaluated.
- **Q1/Q2: FAIL for this encounter's shown composition/coherence.** No judgment of unreviewed regions.
- **Q3: UNVERIFIED. Q4: FAIL for this static packet**, with multiple applicable dimensions below 4; unavailable motion/audio are not silently assigned passing scores.

After grounding/reveal correction, the next substantial asset craft priority is continuous limb/wing-root anatomy and integrated eye/brow forms. Re-review those changes at runtime encounter distance as well as in authoring views. The complete world objective, plural dragons, behavior, audio, full journey and hardware gates remain mandatory and are not reduced by this contribution review.
