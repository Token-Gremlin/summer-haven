# Attribution

Summer Haven's original code, documentation, project screenshots and authored
assets (including Blender scenes, scripts and GLB exports) are released under
the [MIT license](../LICENSE), copyright 2026 Token Gremlin.
The notices below remain applicable to third-party work. Build output includes
[THIRD-PARTY-NOTICES.txt](../public/THIRD-PARTY-NOTICES.txt) for redistribution.

## Summer Cycle

Summer Haven began with a study of [Summer Cycle by StarKnightt / Prasenjit](https://github.com/StarKnightt/summer-cycle), copyright 2026 Prasenjit, MIT licensed. The original license is preserved in [SUMMER-CYCLE-LICENSE.txt](SUMMER-CYCLE-LICENSE.txt).

Adapted source includes `src/render/`, `src/sound/`, `src/core/rng.ts`, and the procedural helpers `src/world/geo.ts`, `props.ts`, `street.ts`, `vegetation.ts`, `sky.ts`, `road.ts`, `lights.ts`, and `timeofday.ts`. Changes include skinned rendering, quality controls, new spatial composition, volume routing, surface footsteps and runtime integration. The original house helper supplies the background homes; the three enterable hero buildings are original Blender assets.

The reference's screenshots, character, bicycle, game loop, road chunk system, control system and camera are not shipped as assets or copied gameplay code. See [the reference study](REFERENCE-STUDY.md).

## EZ Tree and botanical textures

The ramified oak, ash, aspen and pine trees use
[EZ Tree by Daniel Greenheck](https://github.com/dgreenheck/ez-tree), copyright
2024 Daniel Greenheck, MIT licensed. The source is pinned at
`dcf309bd86bd521083d9c70f01f2de45fdc7c457` in `src/vendor/ez-tree/`, with its
full [license](../src/vendor/ez-tree/LICENSE). One marked extension omits thin
branches at distant detail levels; the underlying skeleton stays unchanged.

The four leaf PNGs in `public/assets/nature/ez-tree/` are unmodified copies of
that project's `src/app/public/textures/leaves/` files and retain its MIT license.
`bark-color.jpg` is the unmodified `Bark001_1K-JPG_Color.jpg` from the same
repository. Its original source is [ambientCG Bark001](https://ambientcg.com/view?id=Bark001),
released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/),
as recorded in EZ Tree's `src/app/public/textures/LICENSE.md`.

Summer Haven supplies the proportions, shared instancing, four detail levels,
alpha-coverage mipmaps, bark/moss and leaf-transmission shaders, wind, shadow and
reflection population, and camera-clearance integration. The EZ Tree demo UI,
scene and reference screenshots are not shipped as game assets.

## Original work

The modular adult characters, wardrobe meshes, faces, ten compatible skeletal actions, bicycle, three hero buildings, furniture, cat and their Blender source scripts were authored for Summer Haven. The connected world layout, player controls, camera collision, UI, customization, local save, navigation, villagers, dialogue, activities, photo mode, batching and QA harness are new implementation.

The original workshop also includes Aldermere and Starroot architecture,
Silverveil gorge, the Reed Ferry, deer and other wildlife, Aurelian Reedwing and
Vesper Siltfin. Their editable production scenes, scripts, asset contracts and
archived revisions remain included. Draft revisions are labeled separately from
the assets used by the game. No paid or downloaded character, creature or hero
environment meshes are required.

## Dependencies and typefaces

- [Three.js](https://github.com/mrdoob/three.js) and its addons — MIT; the runtime notice is included with distribution files.
- Vite, tsx and Prettier — MIT; TypeScript and Playwright — Apache-2.0. Dependency and transitive license identifiers are recorded in `package-lock.json`; their packages retain the full notices.
- [DM Sans](https://fonts.google.com/specimen/DM+Sans) and [Libre Caslon Display](https://fonts.google.com/specimen/Libre+Caslon+Display) — SIL Open Font License 1.1. The stylesheet requests them from Google Fonts; font files are not bundled. System sans-serif and Georgia are the offline fallbacks.

The game does not require paid assets, a remote AI service, accounts or analytics. Audio is synthesized locally through Web Audio.
