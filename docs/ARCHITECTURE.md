# How Summer Haven is built

Three.js and TypeScript run the game in the browser. Blender produces the
characters and selected world assets; its editable scenes and authoring scripts
are included. No Blender installation is needed to play.

| Directory | Responsibility |
| --- | --- |
| `src/main.ts` | Startup, system orchestration, update and render loop |
| `src/character/` | Compatible rigs, modular clothing, animation blending and IK |
| `src/player/` | Walking, jogging, cycling, camera and movement responses |
| `src/world/` | Village, regions, interiors, collision, residents, wildlife, ferry and water |
| `src/render/` | Painterly shading, displacement, reflections, quality and post-processing |
| `src/data/` | Appearance options, buildings, routes, residents and shared definitions |
| `src/core/` | Input, validated local saves, random generation and utilities |
| `src/game/`, `src/sound/` | Asset loading, audio routing and synthesized sound |
| `src/ui/` | Character creator, dialogue, journal, settings and photo controls |
| `public/assets/` | Runtime GLBs and their manifests |
| `tools/blender/` | Editable production scenes, asset builders, inspections and archived drafts |
| `tools/qa/`, `tests/` | Browser exercises, measurements and regression tests |
| `docs/gauntlet/` | Development contracts, review notes, captures and retained experiments |

## Rendering and world life

The renderer combines custom toon shading, selective outlines, atmospheric
lighting, instanced vegetation and a reduced-resolution reflection pass. Nearby
and entire-landscape scenery modes are independent of the quality preset.

Water uses shared vertex displacement and normals, current-driven flow phases,
depth shading and bounded reflection fallback. The waterfall adds a deforming
sheet and GPU ballistic spray. Particle budgets range from 2,048 to 131,072;
this is a surface-and-spray approximation rather than a full fluid solver.

Residents follow authored routes and schedules. The ferry, wildlife and fantasy
creatures have dedicated state and movement systems. Collision uses practical
proxies instead of full render-mesh physics.

## Assets and provenance

The [Blender workshop](../tools/blender/README.md) explains scale, names, rigs and
export conventions. The current deer is revision 2; revision 3 remains an
explicitly labeled source experiment. Keeping an experiment in the repository
does not mean the game loads it.

Original project work is MIT licensed. Adapted Summer Cycle modules and third-party
packages retain their notices in [Attribution](ATTRIBUTION.md).

## Quality records

The [playtest guide](PLAYTEST.md) describes the current playable state. The
[water handoff](gauntlet/HANDOFF-10.md) links the latest focused visual and timing
evidence. Historical reports keep their original scope and failures; they are
not claims that the whole game has passed final acceptance.
