# Expansion and polish review

The subsequent focused movement and rendering pass is documented in [QA-FLUENCY.md](QA-FLUENCY.md). Measurements below describe the earlier expansion build and are retained as history.

Reviewed on September 29, 2026 in the Codex in-app Chromium browser on Windows, with the real Three.js renderer and Blender-exported assets. Images linked here are game captures, not concept art. The [initial review](QA-initial.md) and its reports are retained as historical evidence.

## This pass

The village now contains **36 buildings, 12 scheduled villagers, 249 trees across six shape/seed variations, 54,938 planted instances and 26 cloud groups**. Instance totals include rice, grass, flowers and shrubs before quality/distance reduction; they are not a claim that every plant is rendered at once. Two new connected neighborhoods, Hibiscus lane and the Apricot neighborhood, add a community vegetable garden, three vine pergolas, two honesty fruit stalls, planters, laundry, fences, signs and authored household details. Three interiors remain enterable.

Blender MCP was used to rebuild and inspect both character wardrobes and the new garden hero props. The source scenes, modular authoring scripts and GLBs are included. The wardrobe now offers **8 hairstyles, 6 tops, 4 bottoms and 3 shoes** for both bodies. New short cuts include a side part, textured undercut, curly crop and swept quiff. Open overshirts, camp collar shirts, cuffed chinos and loafers add distinct silhouettes. Existing index values remain compatible with older saves.

The daylight panel opens with **T** or the clock. It includes five presets, continuous afternoon-to-evening scrubbing, a hold toggle and 0.25–4× time speed. The scene stays visible while selecting the light.

## Executed checks

- **13 unit/asset tests passed**: validated and legacy saves, expanded wardrobe bounds, time formatting and speed clamping, collision, river/bridge constraints, expanded navigation, all exported modules, compatible 22-joint rigs, ten actions and bicycle attachment points.
- Strict TypeScript checking and the Vite production build passed.
- **208 live-browser checks passed**, including input, walking/jogging, bicycle mount/propulsion/bell/dismount, both bodies, every hairstyle, all clothing categories, nine pose states, dialogue, three interiors, wardrobe access, activities, seven regional traversals, shrine steps, NPC schedules, time controls, photo export and audio activation. [Full report](qa-polish-browser.json).
- **36/36 building entrances are reachable** from the village navigation network. [Access and population audit](qa-polish-navigation.json).
- The three pergola seat anchors were exercised with interaction and movement: each places the character on the intended bench and allows standing again. [Seat review](qa-polish-seats.json).
- A real page reload preserved the new masculine quiff, camp collar shirt, chinos, loafers, safe position, held blue-hour light and 2.5× time preference; the loaded world character matches the saved appearance. [Persistence review](qa-polish-storage.json).
- The normal production build opened, entered the village and selected sunset through the visible clock panel without console errors or warnings. Its inspection API is absent without `?qa=1`. [Production review](qa-polish-production.json) / [Capture](screenshots/polish/production.png). Test saves were restored afterward.

The browser suite checks finite bone transforms and selected geometry in representative combinations; it does not establish that every possible combination is free of visible clipping. Bicycle IK additionally checks 24 crank/steering positions per body: wrists stay within 7.8 cm of the grips and ankles within 8.4 cm of the pedals, including authored palm and shoe offsets.

Review found and corrected a resident blocking an orchard route, a workplace state that failed when time was rewound, and nearby villagers intercepting door interactions. Visual inspection also exposed skin at shirt shoulders and an overshirt underlayer protruding through the back; the Blender geometry and hidden-body rules were corrected and exported again. Pergola seating uses explicit rotated anchors with a height offset and a forward placement to keep the thighs clear of the seat edge. Collision retains an open central aisle.

## Visual evidence

| View                                                                                                                                                                                  | Inspected                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Creator](screenshots/polish/creator-masculine.png) / [16-outfit review](screenshots/polish/wardrobe-review.jpg) / [Close-up](screenshots/polish/character-closeup.png)               | Both bodies, eight hair silhouettes, shoulders, fitted layers, collars and cuffs      |
| [Hibiscus lane](screenshots/polish/hibiscus-lane.png) / [Apricot neighborhood](screenshots/polish/apricot-neighborhood.png)                                                           | New architecture, open paths, gardens, villagers and vegetation                       |
| [Community garden](screenshots/polish/community-garden.png) / [Bench](screenshots/polish/garden-seat.png)                                                                             | Authored props, usable space and seated clothing                                      |
| [Daylight panel](screenshots/polish/time-controls.png) / [Evening](screenshots/polish/evening-lane.png)                                                                               | Continuous lighting control, readable character and lit windows                       |
| [Masculine rider](screenshots/polish/bicycle-masculine.png) / [Feminine rider](screenshots/polish/bicycle-feminine.png)                                                               | New long clothing while mounted, grip and pedal alignment                             |
| [Home](screenshots/polish/interior.png)                                                                                                                                               | Interior lighting and character readability                                           |
| [Fields](screenshots/polish/rice-fields.png) / [River](screenshots/polish/river.png) / [Shrine](screenshots/polish/shrine.png) / [Viewpoint](screenshots/polish/sunset-viewpoint.png) | Landscape continuity, added foliage, clear routes, reflections and sunset composition |

Screenshots use the High preset. The final side-part/quiff review replaced separated crown locks with continuous fitted surfaces so the profile remains connected. The final two hair shapes were rechecked across both bodies and nine pose states: [36/36 passed](qa-polish-hair-poses.json).

The visual language remains deliberately economical and stylized. Faces, hands and furniture use simplified geometry; animation is authored and joint-driven, without cloth simulation or motion capture. Additional hair and clothing improve silhouette and identity, but this review does not claim commercial-final character fidelity.

## Performance

[Full populated-scene measurements](qa-polish-performance.json) include the renderer, actual display/render dimensions, mean/median/95th-percentile frame times, draw counts and available GPU pass timings. Each sample lasts 2.6 seconds after ten warm-up frames, without screenshots during measurement. These are short comparative samples, not a long-duration hardware certification. The measurements include the expanded world and tuned vegetation density; the final hair surface consolidation and bench alignment followed. No newer FPS figure is claimed.

The available GPU is **Intel UHD Graphics through ANGLE / Direct3D11**. The measurement uses a verified **1920 × 1080 content viewport at DPR 1**. Low renders at 70% resolution, Medium at 85%, High at 100%. Fresh saves on integrated Intel or software rendering select Low automatically.

| Populated scene      | Low FPS | Medium FPS | High FPS |
| -------------------- | ------: | ---------: | -------: |
| town walk            |    18.8 |       11.3 |      8.3 |
| garden foliage       |    19.1 |       11.7 |      3.3 |
| villagers            |    18.8 |       11.1 |      7.9 |
| river                |    20.7 |       11.9 |      8.8 |
| home interior        |    37.7 |       24.8 |     17.1 |
| fast cycling         |    18.2 |       11.9 |      7.9 |
| Hibiscus lane        |    17.4 |       11.5 |      7.4 |
| orchard neighborhood |    20.6 |       13.7 |      8.3 |

The High garden sample includes a substantial frame-time spike. It is retained in the report rather than removed as an outlier. Relative to the initial version, the larger world costs additional GPU time despite quality scaling.

**The 60 FPS target has not been demonstrated on this machine.** The expanded world remains demanding on this integrated GPU. Performance work in this pass keeps authored flower beds on Low while scaling grass/rice density, reduces distant vegetation and tree detail, shares extra cloud geometry, and avoids reallocating render targets when only time or sound settings change. Higher presets retain the denser presentation. Profiling and tuning on the intended discrete gaming GPU remain necessary before claiming the original 60 FPS target.

## Scope and persistence

The three interiors, optional activities, core bicycle system and familiar landmarks remain. Additional homes are intentionally background residences. The clock covers afternoon through evening; weather variants, a full calendar, touch/gamepad controls and a full social simulation are outside this version. Photo mode offers framing, zoom, UI hiding, time freeze and PNG capture without artificial depth of field.

Local saves are browser-specific and validated. Older saves receive a default time speed and preserve existing wardrobe selections. No backend, account or external AI runtime is required. Development inspection APIs require the explicit `?qa=1` URL; a normal production URL does not expose them.
