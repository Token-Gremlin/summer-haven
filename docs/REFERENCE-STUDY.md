# Reference study — completed before implementation

Reference: StarKnightt/summer-cycle, MIT, master as inspected September 29, 2026. Read README.md, PROMPT.md, renderer, shaders, world/chunks, sky, vegetation, rider, bicycle, controller, camera, sound/engine, lightpasses and precompile. Inspected opening, shop-row and sunset-paddy screenshots at full size.

The strongest compositions use a low following camera, a framed street edge, overlapping foliage, a large cloud silhouette, receding ridges and a legible foreground rider. Detail is clustered around places people use: awnings, drains, shops, poles, flower beds. Dark roof masses balance bright reflective fields. Sunset changes the entire palette rather than only the sun color.

Rendering lessons: specialized surface shaders, three softened cel bands, warm bounce, sparse outlines (not on blades and leaf cards), stable world-space brush patterns, lower-frequency distant foliage, reduced-resolution alternate-frame reflections, precompiled shaders and selective shadow casting. Audio is generated into reusable buffers and mixed by location, motion and time. The reference's two-bone IK keeps the rider attached to real pedals; camera obstruction and substepped movement matter as much as art.

The reference explicitly identifies its close-up procedural rider as a limitation. Summer Haven therefore uses new Blender-authored skinned adult bodies and modular geometry, a compatible skeleton and separate creator presentation. The new world is a connected village with returnable places and interiors, not the reference's repeating road. Its movement, save, interaction, schedule, activities and creator systems are new.

Selected MIT rendering, procedural vegetation, minor architecture/prop helpers and sound modules are adapted with the original license preserved in SUMMER-CYCLE-LICENSE.txt. No reference screenshots are shipped as game content. New hero assets are created in Blender and exported to GLB. Original authored asset sources and reproducible production scripts live in tools/blender.
