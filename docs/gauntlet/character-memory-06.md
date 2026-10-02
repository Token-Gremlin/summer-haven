# Character geometry memory experiment 06

The production GLBs contain 288 skinned wardrobe modules per body. Previously each character cloned and recolored every module, then cloned selected modules again for rendering batches. The candidate prepares one immutable wardrobe per loaded GLTF, clones independent rigs, and colors only private selected batch inputs. Non-skinned and failed-merge selections retain private geometry; body changes release private batches and old bone textures without disposing shared wardrobe geometry. Shared templates live for the Assets lifetime. The existing authored wildlife vertex-color conversion is unchanged.

## Reproduction and evidence

Run `node node_modules/tsx/dist/cli.mjs tools/qa/character-memory.ts <output.json>` from the repository root. It loads actual character GLBs without a browser, instantiates the default player and creator preview plus every defined villager and city resident, inventories unique geometry backing buffers by identity, and records 74 SHA-256 output signatures. Accounting precedes the additional appearance probes.

- [Before raw record](evidence/character-memory-before-06.json): pre-change character/importer snapshots, with original-source hashes corrected for temporary import relocation. The character implementation is the `ac21d2bc5bec9fe592ce6435d8e42a20264cc275` path. The importer additionally contained the authoredVertexColor branch already integrated at handoff; the production character GLBs do not use that branch. No legacy TypeScript fixture is required in the repository: use the reference checkout for a fresh before run and copy this accounting tool into it, keeping its relative source imports.
- [Candidate raw record](evidence/character-memory-current-06.json): current source-file SHA-256 hashes and GLB hashes; generated before the integrated `DC1G58qr` browser build was measured. Re-running the tool records whatever source is currently checked out rather than assuming a build identity.
- Each record preserves all 74 signatures with appearance values and case identifiers. The first 24 are actual population looks; 50 additional cases cover both default bodies and every appearance option value. Every corresponding signature matches exactly. A signature includes visible mesh names, exact attribute/index bytes, material specialization and local transforms. It does not approve animated appearance or rendered pixels.

| Retained geometry backing bytes | Before | Candidate |
|---|---:|---:|
| Full wardrobes across 24 characters | 57,317,016 | 4,776,408 |
| Selected batches | 14,294,940 | 14,294,940 |
| Total including raw GLTF geometry buffers | 74,707,280 | 22,166,672 |

The measured reduction is 52,540,608 bytes (70.3%) for 24 simultaneously instantiated characters: 13 feminine and 11 masculine, comprising player/preview, 12 villagers and 10 city residents. Live city characters are created as needed, so a particular runtime snapshot may contain fewer characters. One character of each body has no geometry-sharing reduction; additional instances reuse the prepared wardrobe.

Five focused character sharing/ownership tests, three existing actual-rig ferry contact tests, and strict typecheck passed. Tests cover independent rigs/colors/face transforms, exact output across appearance options, private geometry and bone-texture disposal on body changes, and non-skinned/failed-batch fallback ownership. Independent visual and memory review remains required.

## Measurement limits and runtime follow-up

These are Node retained geometry typed-array backing bytes, not browser heap, GPU bytes, process memory, object overhead, animation/skeleton storage, transient allocation peaks, FPS, or loading/stall causation. The complete backing buffer is retained when a geometry view references it. The records do not establish a cause for either measured browser heap peak or the arrival stall, and do not certify the frozen memory gates.

Inject [runtime-geometry-memory.js](../../tools/qa/runtime-geometry-memory.js) only into a loaded local `?qa=1` game, then call `window.inventoryGeometryMemory()`. It returns compact root aggregates, per-character selected-batch bytes, known unmounted terrain/foliage geometry caches, raw/prepared assets, sky and dragon geometry, and a deduplicated global union. It does not create wardrobes, modify state, render, compile, dispose, or request GPU readback. It refuses to run while the existing performance helper reports an active timed run.

Inclusive root counts overlap and must not be summed. `exclusiveNewBackingBytes` assigns each backing buffer to the first listed root; these values sum to the global union. Attribution order is declared by the returned rows and is not a causal attribution. Hidden objects and full allocated instance capacity are included. Texture/bone texture data, ordinary arrays, module/closure caches not explicitly listed, GPU/process memory and transient peaks are excluded. The inventory itself allocates temporary Sets/Maps; run it outside timed intervals. This helper has no browser evidence until independently invoked and checked.
