# Village canopy contact — J

The I south-bank diagnostic at player (43,−116), yaw−.7, pitch.5 and
requested distance6 places the camera at (39.607875,4.192257,−111.972727).
Actual pixels are almost completely covered by foliage. Runtime tree matrices
and nearby fixed-radius obstacles are saved in
`evidence/nature-09/diagnostic-village-canopy-i.json`. Two transformed tree-mesh
bounds enclose that position while the old 2m /1.1m camera proxies miss it.

A full transformed foliage box was tried and rejected: it returned distance.28,
filling the empty space beneath the spreading crown. Vertical box and round
slabs also retracted too far (.28–.94 at this viewpoint), so neither is shipped.
No test tolerance was lowered to accept those results.

J builds one convex foliage envelope per existing tree variant, including both
detail levels, then transforms its planes for each of the245 existing village
trees. The existing spatial-index box is its broad phase; camera rays test only
nearby envelopes. There are no extra rendered meshes, trees, obstacles per tree,
or player barriers. Original trunk collisions, transforms and route reservations
are unchanged. Analytic clipping is padded for the camera and potential wind;
ordinary obstacle and terrain collision still applies. Region-tree proxies are
unchanged.

The reproduced camera stops at1.381846m. J actual pixels restore the character
and river instead of the obstructing leaves. **This is close framing with cropped
head/feet, not a full camera-polish approval.** Convex envelopes conservatively
fill concavities and transparent leaf-card corners. Escape, retraction and
recovery must be judged in motion as well as numerically.

The six existing tree variants currently have zero aWind. The independent critic
correctly noted that testing them alone cannot prove the wind margin. A separate
nonzero-wind fixture now checks displaced foliage against the transformed hull
and broad-phase box under nonuniform scaling. This does not claim that tree sway
has been added to the game.

J production build: `DMYTnp5a`. TypeScript/build passed;146 full tests passed,
then all four focused canopy tests passed after adding the nonzero-wind case.
Logs are `tests-j.txt` and `tests-canopy-j.txt`. No runtime change followed that
full run. The intermediate static preview accidentally still served I once:
`invalid-stale-build-j-bank-south` is retained and excluded from J evidence.
Correct J captures contain the production hash and245 runtime envelopes.

The first real walking route uses ordinary W input, scripted steering and normal
collision after one initial placement. Four waypoints completed in15.453s;
the22.008s recording retains its raw player/camera trace. Its90 sampled camera
distances all remain6m, so that walk proves local passage, **not** recovery from
canopy retraction. A separate stationary scripted orbit tests that response.
Recordings and screenshots are not performance measurements or complete
continuous-motion/audio approval.

The separate18.040s orbit retains74 camera samples:1.381846m initially,
recovery to6m, then return to1.381846m at the same orientation. However, on the
inward sweep it contracts3.6767m within255.9ms. This is an explicit remaining
temporal-framing concern, not a smoothness pass. See independent
`reviews/canopy-j09.md`; sampled frames show the route and character again,
but continuous playback/audio and all-family/all-angle evaluation remain open.
