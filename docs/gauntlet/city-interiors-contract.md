# Aldermere interiors — integration candidate

29 September 2026. These are composed runtime interior candidates for the three useful city rooms required by W2. No visual, motion, sound, animation, performance or integrated gameplay gate is approved by this document. The mechanical checks use actual exported Blender furniture, with a canvas stub for sign construction; they cannot judge atmosphere, readable signs or seat contact.

The owner edited only `src/world/city-interiors.ts`, `tests/city-interiors.test.ts` and this document. The source reads the original architecture contract, frozen acceptance v1, and `src/data/city.ts` identities. No Blender access was used; the existing furniture was originally authored through the repository's Blender pipeline. New trim, chart, repair jig, tools, textiles, kettle and correspondence details are runtime geometry, not new Blender exports.

## Integration

Call `addCityInteriors(assets, interiors.group, interiors.rooms)` after the village rooms exist and before final scene compilation. It is idempotent by room key, preserves other room records, and specializes its custom materials. Parent group must retain its existing identity transform. Each room is a named child with `userData.interiorId`; the current shared-group visibility model is supported. Runtime uses metre units, Y-up, floor at exactly y=0, and world-space collision/interactions.

Root owns door activation, entry/exit return transforms, English HUD names and linking these rooms to their three `CITY_BUILDINGS.interior` values. Use the exported room `origin` exactly; workshop and canal doors are offset to match their authored façades. These are ground-floor room programs. No upper-floor access, NPC occupation, craft animation, inventory exchange or simulation persistence is claimed here.

| Key / program | Entry origin x,y,z | Collision x bounds | Collision z bounds | Ceiling | Exterior match |
|---|---|---|---|---:|---|
| `aldermere-market` / The Wayfarers’ Hall | 520, 0, .15 | 515.2…524.8 | -2.6…2.6 | 3.1 | `BLD_market`; 9.6×5.2m inside the 10×5.8m shell |
| `aldermere-workshop` / The Thread & Timber studio | 559.475, 0, .15 | 557.5…562.5 | -3.1…3.1 | 3.7 | `BLD_workshop`; 5×6.2m inside the 5.4×6.6m shell |
| `aldermere-canal` / Reedbank common room | 598.26, 0, .15 | 597.2…602.8 | -2.8…2.8 | 3.05 | `BLD_canal_home`; 5.6×5.6m inside the 6×6m shell |

Front walls face +Z. Door widths are respectively 1.90, 1.95 and 1.28m; local door centers are 0, -0.525 and -1.74. Walls, lintels, ceilings and imported furniture have separate height-aware proxies. Ceilings are camera-only collision and do not cast the custom directional shadow into darkness. Floors and rugs do not block horizontal movement. Ordinary furniture collision derives from actual transformed GLB bounds, not assumed catalogue sizes.

The common-room bench uses physical legs/back, a camera-only seat surface, and an open front so the current sitting system can stand and move out without starting inside a full box collider. This is a deliberate seat accommodation, not an unsupported physics claim. Final seated pelvis/cloth/feet contact needs real character/outfit motion inspection.

## Room programs

The Wayfarers’ Hall uses cream plaster, teal lower panels and pale timber. A wide central aisle separates a valley map table and wall chart from the dispatch counter and posted delivery board. The inlaid route, river and pins form a distinct civic focal point. Iona's English route guidance explains the actual western waterfall switchbacks, walking-only ascent and safe headwater crossing. The board connects Oren, Mira and Lio without pretending a delivery quest or shop transaction has already occurred.

Thread & Timber uses ochre plaster, clay panels, exposed beams and side work light. Oren's visible rim, hub, ten spokes, holding jig, timber blank and tool rack occupy the back workbench; Mira's cloth rolls, hoop, thread and mending pattern use a separate side table. The shared central aisle remains clear. Inspection describes recognizable tasks and an orchard-cart repair order; it does not claim animated work has been implemented.

Reedbank common room uses sage panels, pale wood, a woven rug, window bench, cupboard, books, botanical pictures and a kettle with three cups. Lio's correspondence from visiting mapmaker Mara connects the city to Silverveil, Starroot and Crownreach. Mira's repaired curtain is a personal connection, not a second inconsistent resident identity. The welcome and rest seat make this a domestic gathering space rather than a duplicate shop.

## Exact interaction contract

All x/z below are world-space; interaction y is omitted to match existing ground-floor handling. All records include `inside` equal to their room key. Read interactions use existing `kind: 'inspect'` with complete English text. Nothing needs new action dispatch.

| ID | Kind | x,z | Radius | Player-facing label |
|---|---|---|---:|---|
| `aldermere-market-exit` | exit | 520, 2.18 | .95 | Step outside |
| `aldermere-market-route-chart` | inspect | 517.4, -.53 | 1.15 | Study the valley route chart |
| `aldermere-market-delivery-board` | inspect | 522.83, -.7 | 1.15 | Read the neighbors’ delivery board |
| `aldermere-workshop-exit` | exit | 559.475, 2.68 | .95 | Step outside |
| `aldermere-workshop-wheel-jig` | inspect | 560, -1.46 | 1.15 | Inspect Oren’s wheel-repair jig |
| `aldermere-workshop-mending` | inspect | 560.62, .35 | 1.15 | Examine Mira’s mending pattern |
| `aldermere-canal-exit` | exit | 598.26, 2.38 | .95 | Step outside |
| `aldermere-canal-correspondence` | inspect | 598.45, -.67 | 1.15 | Read Lio’s open correspondence |
| `aldermere-canal-kettle` | inspect | 601.18, 1.1 | 1.15 | Read the common-room welcome |
| `aldermere-canal-window-seat` | sit | 600.85, -.73 | 1.0 | Rest on the window bench |

Bench seat tuple: `[600.85, -1.55, 0, 0]` = x, z, yaw, height offset. Footprint tests verify the current player's .27m radius can stand and move +Z from that location. A screenshot cannot establish motion or correct cloth contact.

## Mechanical validation and remaining review

`tests/city-interiors.test.ts` loads the real `village-kit.glb`, converts it through `Assets.toon`, and constructs all rooms. Tests cover exact bounds/ground-floor origins, three corresponding city entrances, repeat registration, finite geometry and furniture use; radius-aware flood reachability to every prompt; standing up from the seat; door voids, furniture dimensions and camera wall/ceiling interception; distinct English content and consistent resident names.

All four mechanical tests and TypeScript checking passed. This is a contribution-level mechanical result, not an integrated-world or art approval.

First review must enter each room through its real exterior door, walk the central and side aisles, read each sign at normal camera distance, inspect every prompt, sit/stand with both supported bodies and representative outfits, and return to the correct exterior position. Inspect afternoon and blue hour, including the common-room bench silhouette and the workshop's wheel/cloth focal points. Actual warm lighting, view occlusion, camera behavior, drawn textures, close-up craft and performance remain UNVERIFIED until that evidence exists. The full city/living-world objective remains ongoing.
