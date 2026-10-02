<div align="center">

# Summer Haven

**A little village. A long summer. A place to stay a while.**

A painterly third-person exploration game for the browser.<br>
Make a character, ride a bicycle, follow the river, and find your own favorite place.

[![MIT license](https://img.shields.io/badge/license-MIT-315e4e?style=flat-square)](LICENSE)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-315e4e?style=flat-square)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-typed-315e4e?style=flat-square)](https://www.typescriptlang.org/)
[![Blender assets](https://img.shields.io/badge/Blender-editable_assets-315e4e?style=flat-square)](tools/blender/README.md)
[![Validation](https://github.com/Token-Gremlin/summer-haven/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Token-Gremlin/summer-haven/actions/workflows/ci.yml)

[Play the live demo](https://summer-haven-demo.tokengremlin.chatgpt.site) · [Play locally](#play-locally) · [Gallery](docs/GALLERY.md) · [Contribute](CONTRIBUTING.md)

</div>

![A summer afternoon on Hibiscus Lane, with shaded gardens and village homes](docs/screenshots/polish/hibiscus-lane.png)

Summer Haven is about the pleasure of being somewhere: a familiar street, a
quiet ferry crossing, deer in the shade, sunlight moving across the water.
There is no combat, survival pressure, score or mandatory grind. Walk, jog,
cycle, talk to neighbors, visit interiors and photograph the evening light.

**Playable and in active development.** This repository includes the game,
original Blender scenes, asset-building scripts, tests, screenshots and the
development archive. See the [playtest guide](docs/PLAYTEST.md) for the current
state and known rough edges.

Created by **[Token Gremlin](https://github.com/Token-Gremlin)**. The
[public browser demo](https://summer-haven-demo.tokengremlin.chatgpt.site)
needs no account. Use a desktop browser with WebGL2, keyboard and mouse;
graphics run on your device. Your character and progress stay in local storage.

## A world worth wandering

| Make yourself at home | Follow your curiosity |
| --- | --- |
| Two adult body presets, eight hairstyles and a modular wardrobe with editable colors | Connected village streets, rice fields, woodland, a mountain route and scenic viewpoints |
| A home, café, shop and furnished city interiors | Aldermere's market, the Reed Ferry, Mosswood, Silverveil Falls and Starroot Sanctuary |
| A bicycle to ride, park and return to | Deer, birds, butterflies, a familiar cat and two original fantasy creatures |
| Villagers with routines, short conversations and three optional activities | Flowing reflections, displaced river waves, waterfall spray and wind-driven vegetation |
| Local saves, a journal and a wardrobe you can revisit | Afternoon, golden hour, sunset and evening; adjust or freeze the light whenever you like |
| Four botanical tree species, textured bark and wind-driven leaves | [EZ Tree woodlands](docs/WOODLAND.md), with shared geometry and detail that scales with distance |
| Spring, summer, autumn and snowy winter, with live weather controls | [Volumetric clouds, rain, snow and shared wind](docs/CLIMATE.md), scaled across all four graphics presets |

## Glimpses of summer

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/weather/summer-sky-ultra.jpg" alt="Volumetric clouds above a green summer village"><br><strong>A different sky</strong><br>Cloud layers, moving wind and changing light.</td>
    <td width="50%"><img src="docs/screenshots/weather/winter-mosswood-ultra.jpg" alt="Snow-covered Mosswood with deer, bare trees and evergreen pines"><br><strong>The same place, another season</strong><br>Spring, summer, autumn and winter throughout the valley.</td>
  </tr>
</table>

<table>
  <tr>
    <td width="50%"><img src="docs/gauntlet/evidence/water-10/final-falls-ultra.jpg" alt="Silverveil Falls with cascading water and impact spray"><br><strong>Silverveil Falls</strong><br>A river journey, from falling water to quiet pools.</td>
    <td width="50%"><img src="docs/gauntlet/evidence/city-checkpoint-native-04.png" alt="The timber-fronted buildings of Lantern Market"><br><strong>Lantern Market</strong><br>A second town of workshops, errands and familiar faces.</td>
  </tr>
  <tr>
    <td><img src="docs/gauntlet/evidence/ferry-underway-02.png" alt="A passenger aboard the covered wooden ferry with its boatkeeper"><br><strong>The Reed Ferry</strong><br>Take a seat and let the river set the pace.</td>
    <td><img src="docs/screenshots/woodland/mosswood-ultra.jpg" alt="Summer-green leaf sprays, pale trunks and deer beside the Mosswood trail"><br><strong>Mosswood</strong><br>Detailed botanical trees frame a familiar woodland path.</td>
  </tr>
</table>

[See the full gallery →](docs/GALLERY.md)

These are real captures from playable development builds. The gallery records
their provenance; screenshots are not frame-rate measurements.

## Play locally

Use **Node.js 24** and npm. The game supports compatible Node versions from
22.12 onward; the release-maintenance tools use Node 24. You need a desktop
browser with WebGL2, a keyboard and a mouse. No account, API key or Blender
installation is required to play.

~~~sh
git clone https://github.com/Token-Gremlin/summer-haven.git
cd summer-haven
npm ci
npm run dev
~~~

Open **http://127.0.0.1:5173/**, create your character, and step outside.
Your appearance, settings, activities and safe return position are saved in
this browser. The wardrobe in your house lets you change your look later.

To check the production build:

~~~sh
npm run build
npm run preview
~~~

Open **http://127.0.0.1:4173/**. The compiled output in **dist/** can be hosted on
a static web host and supports relative asset paths. This repository does not
deploy itself automatically.

### Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Walk; steer and pedal while cycling |
| Shift | Jog / cycle faster |
| Drag the view / mouse wheel | Orbit / zoom the camera |
| E | Interact, talk or continue dialogue |
| F / B | Mount or dismount the bicycle / ring its bell |
| T | Choose the time of day |
| K | Weather, seasons and wind |
| J / P | Journal / photo mode |
| Esc | Pause, settings and recovery options |

In photo mode, use WASD to reframe, R/C to move up/down, H to hide controls,
and Space to save a PNG. See the [playtest guide](docs/PLAYTEST.md) for routes
and places to visit.

## Find your balance

**Low, Medium, High and Ultra** scale rendering quality. Choose **As I approach**
for distance-based scenery, or **Entire landscape** to retain distant regions.
Resolution, shadows, vegetation, reflections, anti-aliasing, draw distance and
post-processing can also be adjusted individually. Integrated graphics start
at Low on a fresh save.

Water stays animated on every preset. Waterfall spray scales from **2,048**
droplets on Low to **131,072** on Ultra, using GPU motion and a reusable buffer.
The water is a physically inspired surface-and-spray model. Detailed measurement
conditions and remaining frame-time spikes are recorded in the
[water review](docs/gauntlet/HANDOFF-10.md).

**60 FPS at 1080p is a design target, not a universal performance claim.**
Touch/gamepad controls and a repeating 24-hour simulation
are not implemented. Some camera, collision and seating issues remain under
review. The [known limitations](docs/PLAYTEST.md#known-limitations) are kept visible.

## Made with Three.js and Blender

**Three.js + TypeScript** power the browser game, custom shaders, camera,
animation, world life and synthesized spatial sound. **Blender** provides
editable characters, clothing, bicycles, architecture, wildlife and hero assets,
exported as GLB.

- [Architecture guide](docs/ARCHITECTURE.md) — the code and rendering systems.
- [Blender workshop](tools/blender/README.md) — source scenes, rigs and reproducible exports.
- [Contributing](CONTRIBUTING.md) — development setup and how to help.
- [Playtest guide](docs/PLAYTEST.md) — exploration, graphics and current limitations.
- [Development archive](docs/gauntlet/HANDOFF-10.md) — source reviews, experiments and QA evidence.

~~~sh
npm test
npm run build
npm run check:publication
~~~

The latest climate round passed 161 automated tests, 23 browser checks and a production build.
Visual and gameplay checks remain essential; the archive distinguishes
measured results, partial checks and unfinished experiments.

## Open source, with the workshop included

Summer Haven's original code, documentation and project-authored assets,
including Blender sources and GLB exports, are available under the
[MIT license](LICENSE). You can study, modify and redistribute them, including
commercially, while retaining the required notices.

The public Git history starts with a clean release snapshot. The game, editable
assets and development records are included; pre-release Git and PR history
remain in a separate private archive. See the [release notes](docs/OPEN-SOURCE.md).

Selected rendering, procedural world and audio foundations build on
[Summer Cycle](https://github.com/StarKnightt/summer-cycle) by StarKnightt / Prasenjit.
Its MIT notice is preserved. Third-party dependencies and typefaces retain their
own licenses; see [Attribution](docs/ATTRIBUTION.md).

<div align="center">

**There is nowhere you need to be.**

[Report a bug](https://github.com/Token-Gremlin/summer-haven/issues/new/choose) · [Bring an idea](https://github.com/Token-Gremlin/summer-haven/issues/new/choose) · [Security & privacy](SECURITY.md)

</div>
