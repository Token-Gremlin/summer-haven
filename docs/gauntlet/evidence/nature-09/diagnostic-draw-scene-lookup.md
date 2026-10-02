# Scene lookup after the E draw diagnostic

Build `CxmM6m5Y`, disposable local QA origin4177. This is a retained transcription
of the actual `Runtime.evaluate` scene lookup made immediately after saving
`diagnostic-forest-draw-e.json`, before reloading. The query traversed
`window.__haven.scene`, selected the recorded geometry IDs and returned ancestor
types/names, local position, attribute sizes and material fields. It did **not**
capture the ancestors' world transforms. Numeric world positions must not be
inferred from this record as direct observations.

| Geometry ID | Actual ancestor chain | Actual local position | Actual geometry/material observations | Source correspondence |
|---|---|---|---|---|
|35874|Connected river reach → Group → The northern valleys → Scene|0,0,0|108 position/normal/UV vertices; region-water shader with falls/pool/swimmer uniforms|Connected river reach|
|35923|Silverveil impact mist → Group → The northern valleys → Scene|0,0,0|4 position/normal/UV vertices; instanced quad, transparent; time/night/sky uniforms|Existing waterfall spray|
|37184|Mesh → Group → Group → Scene|.045,.09,−.02|3 position/normal/UV/color/aMat/aWind vertices; MT_MASK_V0x1u; opaque, alphaToCoverage|`Wildlife` bird wing: matching triangle and local wing offset, plain material|
|37221|Mesh → Group → Group → Scene|0,0,0|24 position/normal/UV/color/aMat/aWind vertices; MT_MASK_V0x401u; opaque, alphaToCoverage|`Wildlife` dragonfly body: box with metal material|
|37226|Points → Group → Scene|0,0,0|50 position-only vertices; transparent; time/night uniforms; pulse point shader|`Wildlife` firefly field|

The correspondence column is an inference from the exact matching runtime
geometry, shader and transform signatures and `src/world/wildlife.ts`, not a
name supplied by the anonymous objects. Source places these legacy birds and
insects in the village. The recorded player location at the slow calls is in
Mosswood, roughly500m away. The subsequent F change names those groups to make
future diagnostics directly attributable.

The same diagnostic includes river/mist startup draws. It does not demonstrate
that village wildlife caused every stall or uniquely caused the original
326.3ms RAF interval.99 unchanged linked programs do not rule out driver work,
deferred compilation, synchronization or buffer upload. The later uninstrumented
F run is separate evidence and does not replace the retained baseline/E data.
