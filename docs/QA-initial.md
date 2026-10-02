# Play and visual review

Reviewed on September 29, 2026 in the Codex in-app Chromium browser on Windows, using the actual Three.js renderer and exported Blender assets. The screenshots below are captures of the running game, not concept art. The browser was tested at a 1920 × 1080 viewport.

## Executed checks

- `npm test`: **11 passed, 0 failed**. Save validation, serialization, collision, water/bridge boundaries, navigation, complete wardrobe exports, shared skeletons, animation tracks and articulated bicycle attachment points.
- `npm run build`: **passed**, including strict TypeScript checking and a Vite production bundle.
- Production preview at `http://127.0.0.1:4173/`: **launched and visually inspected**. The first-visit creator, appearance confirmation, world entry and F-key bicycle mounting worked with the bundled assets. The development QA API is absent from a normal production URL.
- `tests/browser-smoke.js`: **114 passed, 0 failed**, executed in the live browser after a real input gesture. [Machine-readable result](qa-browser.json).
- Real reload tests: **passed**. A customized masculine character, selected clothes/accessories, volume, frozen time, activity completion and safe position survived reload and matched the loaded world character. Malformed JSON was then inserted through the same-origin [storage fixture](../tests/storage-fixture.html); startup recovered to the fresh title screen with a valid default character and Low graphics. [Results](qa-storage.json).
- The optional Playwright command-line wrapper is provided for repeatability; the recorded browser result came from the live in-app browser, not that wrapper.

The browser suite exercises walking, jogging, pause, bicycle mounting, movement, coasting, bell and dismounting through the input layer. It checks both body presets, every hairstyle and top, all bottom/shoe/accessory categories in representative combinations, nine pose states, matching saved appearance in the world, conversations and Escape cancellation, three interiors and the home wardrobe, all three optional activities, regional movement routes, climbable shrine steps, NPC schedule changes, photo mode, PNG export and audio activation.

Cycling also checks both body presets through 24 crank/steering samples. The wrists remain within 7.8 cm of the grips and ankles within 8.4 cm of the pedals, including the deliberate palm and shoe offsets. The grips and pedals are real exported attachment nodes. This numerical check complements the close-up visual review; it does not measure finger contact or simulate cloth physics.

The regional traversal uses the real player collision update along navigation routes to fields, river, shrine and hill. Separate collision tests cover fast motion through walls, sliding and camera obstacle height. Navigation edges are sampled between grid cells so a diagonal cannot jump a thin bridge rail.

## Visual evidence

| View                                                                                                             | What was inspected                                                                       |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Character creator](screenshots/character-creator.png) · [Masculine preset](screenshots/character-masculine.png) | Full-body framing, face, hairline, proportion differences and instant appearance changes |
| [Wardrobe contact sheet](screenshots/wardrobe-review.jpg)                                                        | Both bodies, all hair/top options, bottoms, shoes and accessories                        |
| [Character close-up](screenshots/character-closeup.png)                                                          | Face readability and clothing in outdoor light                                           |
| [Village street](screenshots/village-street.png)                                                                 | Clear routes, architecture, props, trees, atmospheric layers and NPC scale               |
| [Bicycle](screenshots/bicycle.png) · [Long clothing while riding](screenshots/cycling-wardrobe.png)              | Grip/pedal contact, wheel assembly, torso posture, sleeve and hem deformation            |
| [Home](screenshots/interior.png) · [Café](screenshots/interior-cafe.png) · [Shop](screenshots/interior-shop.png) | Furniture scale, enclosure, windows and usable space                                     |
| [Rice fields](screenshots/rice-fields.png)                                                                       | Planted rows, water visibility, borders and landscape depth                              |
| [River](screenshots/river.png)                                                                                   | Continuous watercourse, bridge crossing and bank composition                             |
| [Wooded shrine](screenshots/shrine.png)                                                                          | Shaded contrast, clear stone steps, gate and caretaker                                   |
| [Sunset viewpoint](screenshots/sunset-viewpoint.png)                                                             | Reachable elevation, recognizable village geography and sunset palette                   |
| [Evening village](screenshots/dusk-village.png)                                                                  | Character visibility, emissive windows and comfortable evening exposure                  |

Visual inspection led to concrete revisions: opening the hairline so eyes read, lowering the hat, fitting waistbands, adding sleeve sections around the elbow, hiding covered skin, making cloth follow the seated lap, correcting the rider's torso and hand/foot orientation, sweeping handlebars toward the rider, closing the handlebar stem, clearing vegetation from paths and shrine steps, adding interior ceilings, correcting camera resets after room changes, softening sunset ground breakup and removing floating distant house shapes.

The last shader review replaced implicit-gradient samples of non-mipmapped noise/shadow textures with explicit level-zero samples, avoiding undefined derivatives in conditional loops on the Intel driver. The production shader build and populated-scene comparison were repeated after that change.

The result has a cohesive warm palette, distinct neighborhoods, reusable authored characters and a recognizable bicycle. Close views still reveal deliberately economical geometry: hands and facial expressions are simple, the skirt and jacket use joint-driven deformation rather than fabric simulation, and interior products/cups use simplified silhouettes. Mount/dismount and sitting are blended short actions, not motion-captured performances. These remain worthwhile targets for a further art/animation pass; passing functional checks is not a claim of commercial-final character fidelity.

## Performance and limits

[Full measurements](qa-performance.json) include renderer identity, viewport and render dimensions, mean/median/95th-percentile frame times, draw counts and GPU pass timings. Each scene is sampled for 2.6 seconds after ten warm-up frames, without screenshots during measurement. These are short comparative samples, not a long-duration benchmark or a certification of a gaming GPU.

The available GPU reports **Intel UHD Graphics through ANGLE / Direct3D11**. Low renders at 70% resolution (1344 × 756 for the 1080p viewport), Medium at 85% and High at 100%. Low disables reflections and painterly/bloom processing, reduces vegetation and uses smaller shadows. Low still retains the core grading and restrained outline pass. Intel integrated and software graphics automatically start at Low on a fresh save.

Final measured average FPS, 1080p viewport:

| Populated scene      |  Low | Medium | High |
| -------------------- | ---: | -----: | ---: |
| Walking through town | 24.8 |   14.3 |  9.6 |
| Garden foliage       | 25.0 |   15.5 | 10.6 |
| Villagers            | 24.2 |   14.7 |  9.7 |
| River approach       | 24.3 |   15.4 | 10.5 |
| Home interior        | 50.0 |   30.1 | 18.7 |
| Fast cycling         | 23.4 |   14.2 |  9.4 |

**The 60 FPS target has not been demonstrated.** This machine is below the intended mid-range discrete gaming GPU, and populated outdoor scenes run substantially below 60 FPS. Do not present these results as smooth native-1080p performance. After replacing repeated shader noise calculations with shared textures and explicit level-zero sampling, the Low town sample changed from 18.1 to 24.8 FPS; the [earlier report](qa-performance-before.json) is retained for comparison. The final report includes the subsequent character and world fixes. Fresh-page diagnostics after the shader fix contained no graphics warnings or errors.

Performance techniques in use include spatial batching, wardrobe draw batching, shared geometry/materials, instanced vegetation, foliage chunks and distance fades, tree LOD, reduced shadow sampling on lower settings, half-resolution reflections on alternating frames and shared 2D/3D shader noise textures. Further profiling on a discrete GPU and additional draw/shader reduction are still needed to establish the original 60 FPS goal.

## Scope boundaries

The game is a compact continuous region with sixteen buildings, three enterable rooms and eight scheduled villagers. Other homes are intentionally background residences. There is no combat, economy or failure state. NPC routes and dialogue are authored and lightweight; animals have a handful of reactive behaviors. The time cycle covers afternoon through evening, not a complete calendar. Photo mode offers framing, zoom, clock freeze and PNG capture, without artificial depth of field. Weather variants, touch/gamepad controls and a full social simulation are outside this version.

Local saves are browser-specific. A reset is explicitly confirmed in the UI, and recovery controls return the player or bicycle to safe positions. No backend or remote AI is required. Asset source scenes, export scripts, reference attribution, test sources and the evidence in this document are all in the repository.
