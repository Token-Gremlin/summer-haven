# Deer revision 3 — local runtime-comparison candidate

The resumed authoring pass refines the previously paused archive. It is
**not integrated into the game** and has not passed independent runtime criticism.
`public/assets/creatures/haven-wildlife.glb` remains the tested revision 2.

The staged revision 3 has a 12,112-triangle deer, shallow almond eyes and lids,
fuller cheek/muzzle, a tapered nasal pad, reduced chest/haunch bulges, revised
shoulder silhouette and connected lower-leg/pastern skin.
The exported GLB, manifest, editable Blender scene, source scripts, authored
rest-pose input, Blender inspection renders and validation code are included.
The previous `README.txt` predates actual authoring. `sole-validation.txt` is
historical test source; current passing logs and limitations are in
`docs/gauntlet/evidence/wildlife-r3-authoring/` at the repository root.

Seven draft tests pass, including original sole/joint contracts with unchanged
thresholds and an additional connected-pastern contact check. A complete second
Blender MCP rebuild reproduced the identical GLB hash. Neutral-light front,
side, three-quarter, face and feeding renders were inspected. The feeding
preview now explicitly switches neck/head to Euler mode after applying the
contact pose. Its images are Blender output, not runtime approval.

Packaging changes only make filesystem paths relative to this checkout. Execute
`wildlife.py` in Blender with its actual `__file__`; it writes the staged export
inside this directory. The shared `Haven_Wildlife` scene is replaced, so inspect
and preserve any current Blender work and coordinate exclusive access first.
`deer.py` is loaded by that authoring script. `review.py` uses the existing
authoring scene and writes to `evidence/`.

Optional draft-only checks, from the repository root:

```sh
npx tsx --test tools/blender/wildlife/revision-3-draft/deer-gait.test.ts
npx tsx tools/blender/wildlife/revision-3-draft/rest-pose.ts
```

These draft checks are deliberately outside the production `npm test` suite.
The current local iteration followed the preserved PR2 archive. No publishing,
production asset replacement, runtime changes or browser tests were performed
by this authoring pass. `session-preservation/pre-authoring-scenes.blend` holds
all seven scenes from the shared Blender session before any authoring mutation.
