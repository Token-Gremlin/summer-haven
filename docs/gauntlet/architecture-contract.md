# Aldermere and Starroot architecture — candidate contract

2026-09-29. **Unapproved production candidates**, authored through Blender MCP after the frozen acceptance/reference documents were read. Their existence and diagnostic renders do not approve W2/W5/B2/Q2/Q4 or usable interiors. Fresh independent asset and integrated-world review remains required.

## Source and export

`tools/blender/architecture/architecture.py` builds the five original designs and exports `public/assets/fantasy/architecture.glb`. `tools/blender/architecture/review.py` renders neutral views and writes reproducible camera settings into `public/assets/fantasy/architecture.json`. The editable source scene is saved in `tools/blender/architecture/aldermere.blend`.

Execute each script in the connected Blender with its absolute path bound to `__file__`. Builder only rebuilds `Haven_Architecture`. The existing `Haven_Dragons` (15 objects) and default `Scene` (Cube, Light, Camera) were preserved and checked after production. Blender 5.2.1 LTS, MCP add-on 1.7 / protocol 11; shader schema and relevant enums were inspected. No paid generator, download, third-party mesh or texture is used. All construction, relief, roofs, windows, arches and structural details come from the editable authored source.

Final GLB: **3,816,128 bytes**. A binary GLB read verified exactly the five BLD roots and five COL roots, and one primitive per mesh. Visual triangle counts from the GLB match the Blender report. All vertex positions were checked finite. No textures, subdivisions, animations or skeletons are required.

## Named roots and budgets

| Root | Visual triangles | Authored vertices | Material meshes | Full visual extent: width × depth × height |
|---|---:|---:|---:|---|
| BLD_market | 13,280 | 7,796 | 10 | 11.450 × 9.220 × 8.960m |
| BLD_workshop | 7,262 | 4,298 | 10 | 8.365 × 7.840 × 9.230m |
| BLD_canal_home | 10,090 | 5,885 | 12 | 7.250 × 8.290 × 7.580m |
| BLD_gate | 9,452 | 5,730 | 10 | 20.400 × 6.040 × 12.880m |
| BLD_starroot | 16,196 | 9,746 | 7 | 17.960 × 17.960 × 8.005m |

Visual extents include eaves, balconies, awnings and ridge caps. Primary market shell is 10 × 5.8m plus its front arcade; workshop main hall is 5.4 × 6.6m plus the side work awning; canal-home shell is 6 × 6m. These full extents, rather than only shell footprints, must inform neighboring placement and camera clearance. Every hero is below 40,000 triangles and at most 12 joined material meshes.

All roots are at `(0,0,0)` with identity scale and rotation, at ground level. Mesh minimum height is zero. Blender **Z-up, -Y front** converts to glTF/Three **Y-up, +Z front**, metre units. Instantiate at unit scale; no additional X-axis correction. Place root Y at terrain height. For any Blender coordinate `[x,y,z]`, Three is `[x,z,-y]`; a box size `[width,depth,height]` becomes `[width,height,depth]`. Exact local bounds are in `architecture.json`.

## Palette and renderer contract

Each visual mesh has one material, and its name is `BLD_<asset>__<material-key>`. Material names begin with `plaster_`, `wood_`, `roof_`, `stone_`, or `metal_`, followed by `Aldermere_...`. Numeric Blender suffixes may occur on rebuild and must not be used as identities. The existing `Assets.toon(root,false)` should retain base color and map these prefixes deliberately. Original roughness and lighting cannot be assumed to survive that replacement; inspect the actual game.

The kit shares muted teal roof/paint, warm ochre/cream plaster, brown and pale carved wood, aged amber metal and gray-green stone. Canal homes use sage plaster and terracotta roofs; the workshop has amber masonry and terracotta; Starroot has stone/moss roof slabs and old timber supports. The leaf/sun relief is an original six-leaf geometric civic motif. Roof courses are geometry with restrained color changes, avoiding thousands of individual tile objects. Window panes are recessed dark `stone_...ink` geometry, not transparent glass. They are decorative closed panes; doorways are real shell voids.

## Collision and openings

**Instantiate the chosen BLD root, not the whole GLB scene.** The independent `COL_market`, `COL_workshop`, `COL_canal_home`, `COL_gate`, `COL_starroot` roots hold optional box proxies. Both proxy roots and their children carry `collision_only: true`. They are hidden in the Blender review, but glTF does not provide dependable Blender viewport-hide semantics: the runtime must explicitly remove/hide every COL root after reading it. Proxy meshes have no artistic material and must never enter the toon conversion/render path.

The same boxes are also listed as `collisions_blender` in the JSON, with centre and size. These are **3D** boxes. Do not flatten all lintels/upper walls into full-height XZ blockers: doing so seals the intentionally open doors and windows. Filter against the player's vertical interval and retain openings, or use the detailed mesh as an authoring aid when creating a simpler navigation collider. 64/10/45/6/22 boxes respectively describe market/workshop/home/gate/temple shells and pillars. They are inspection proxies, not a claim of tested collision or automatic complete furniture collision.

| Asset | Door, floor and circulation notes |
|---|---|
| Market | Front centre shell doorway width 1.90m, height 2.65m, at Blender Y -2.3 / Three Z +2.3. Front arcade posts at X ±1.6 and ±4.7, Three Z +4.0; entry corridor between middle posts stays open. Main plinth/floor top .28m. Upper floor slab top 3.15m; **no staircase or authored interior program yet**. Counters occupy the arcade sides, not central entry. |
| Workshop | Front doorway X [-1.5,.45], width 1.95m × 2.65m, Three Z +3.05. Floor top .26m. Open working awning extends to the positive-X side. Chimney is solid. Workbench and pottery are visible fixed props; kiln/work interactions still need runtime implementation. |
| Canal home | Offset front doorway X [-2.38,-1.10], width 1.28m × 2.65m, Three Z +2.85. Door leaf stands open inward; floor/plinth top .34m and approach step top .20m. Front balcony protrudes to Z +4.67m. **Interior is an unfurnished shell without stairs**, not a complete usable home. |
| Gate | **Nine-metre central road** X [-4.5,4.5] remains open at grade, through the gate depth. Inner arch spring height 5.8m, crown 9.55m. Tower/jamb proxies only; never use the full 20.4m visual bounds as a road-blocking rectangle. |
| Starroot | Front broken arch at Three Z +7.1. Pillar-base clear gap is about 5.22m; central path opens into the courtyard. Court slab top .14m; bell dais top .68m with an explicit short ramp facing the entrance. Roofed side walks and back arches remain open between individual supports. Court slabs are floors, not tall blockers. Bell is fixed geometry awaiting interaction/audio. |

Raised floors and the bell ramp need actual runtime step/ground-height testing. Proxies intentionally do not certify doors, camera clearance, transport clearance, NPC routing or physically correct access. Back/side window detail and shell thickness are part of the geometry; the runtime supplies functional interior scenes, occupants, signs, activities, lighting and state.

## Evidence

Twelve diagnostic PNGs are in `docs/gauntlet/evidence/architecture-*.png`: front and three-quarter for each asset, plus market and canal-home close views. Render: Blender Eevee, neutral three-light studio, orthographic camera, 1080×810 pixels (1440×1080 at 75%). Per-view camera positions, target and scale are saved in `architecture.json.review.views`; these are **not gameplay evidence**. The saved .blend opens with the market shown and other roots hidden only for the review view; their geometry is preserved, and the GLB exported all five before any review hiding.

Self-review corrected gable/trim intersections through curved roofs, a market centre timber that spanned the door, cropped skyline framing and unarticulated side elevations. Latest evidence reflects those corrections. Known remaining review targets are facade/roof detail at real player distance, aging and regional identity of Starroot, rear elevations, step heights and complete interiors, custom-shader palette survival, surrounding composition, shadows, performance and walk-through collision. These remain open; no quality gate is declared passed by the builder.
