# A summer in pictures

Actual images from Summer Haven's playable development builds. The original
captures remain in the repository alongside their development records. No
concept-art images or generated promotional scenes are presented as gameplay.
Graphics settings and capture sizes vary; these images are not performance
benchmarks. The woodland images come from the October 1 tree-focused round;
water and town images retain their earlier provenance below.

[Play the live demo](https://summer-haven-demo.tokengremlin.chatgpt.site) · [Back to the project](../README.md) · [Play locally](../README.md#play-locally)

## Through the seasons

![Layered clouds above the familiar village in summer](screenshots/weather/summer-sky-ultra.jpg)

The procedural cloud sky in summer, with full green canopies. The sky cache is
also sampled by the river's reflections.

![Fresh greens, flowers and garden paths in spring](screenshots/weather/spring-gardens-ultra.jpg)

Spring brightens the vegetation and brings small flowers and drifting petals.

![Rain, damp roads and copper foliage in autumn](screenshots/weather/autumn-rain-ultra.jpg)

Autumn rain. Wet roads carry scattered reflective patches and impact rings;
porous grassy soil darkens without turning into a mirror.

![Snow-covered homes and bare deciduous branches in winter](screenshots/weather/winter-village-ultra.jpg)

The same village in winter, with snow on the ground, roofs and plants.

![Deer beside the snowy Mosswood path, bare trees and evergreen pines](screenshots/weather/winter-mosswood-ultra.jpg)

Winter reaches the existing forest too. Pines retain needles while the
deciduous crowns reveal their branching structure.

![Copper leaves and conifers under evening clouds](screenshots/weather/river-evening-ultra.jpg)

The woodland route near the river in autumn evening light.

![Rain falling across the reflective village river](screenshots/weather/river-rain-ultra.jpg)

Rain joins the existing flowing water, ferry, ripples and reflections.

![Live weather controls beside the snowy village](screenshots/weather/weather-controls.jpg)

Press K to choose seasons, precipitation and wind. The landscape remains
visible while the controls are open.

![The snowy village after sunset](screenshots/weather/winter-evening.jpg)

These climate-round images are actual Ultra gameplay captures at a 920×668
CSS viewport and 1380×1002 internal resolution. Camera, settings and weather
metadata accompany each image. No graphics overrides beyond the Ultra preset
are used. See [CLIMATE-QA.md](CLIMATE-QA.md) for measured performance and limits.

## Botanical woodlands

![Detailed oak and ash foliage beside village homes](screenshots/woodland/village-ultra.jpg)

Familiar village trees now use branching skeletons, textured bark and individual
leaf sprays based on Daniel Greenheck's EZ Tree. The map has not grown.

![Mosswood's pale trunks, summer-green leaves and resident deer](screenshots/woodland/mosswood-ultra.jpg)

The Mosswood path in Ultra. Four species share the game's wind, lighting and
reflections, with simpler geometry as they recede into the landscape.

![Golden light on the wooded approach to Silverveil](screenshots/woodland/river-golden-ultra.jpg)

The approach to Silverveil in golden light.

![Evening light across the new Mosswood canopy](screenshots/woodland/mosswood-evening-ultra.jpg)

Evening among the trees. These are local gameplay captures at a 920×668 browser
viewport, with Ultra rendering at 1380×1002. Their adjacent JSON files record
the settings and camera. See the [woodland QA report](WOODLAND-QA.md) for measured
performance; Ultra is demanding on the integrated GPU used for this review.

## Streets to come home to

![Hibiscus Lane, with shaded homes and garden verges](screenshots/polish/hibiscus-lane.png)

Hibiscus Lane in the original village. Walk past porches, vegetable gardens,
laundry and neighbors on their way through the afternoon.

![Aldermere's Lantern Market and its timber facades](gauntlet/evidence/city-checkpoint-native-04.png)

Lantern Market in Aldermere. The city adds workshops, residents and enterable rooms.

## Follow the water

![Silverveil Falls with folds, spray and its receiving pool](gauntlet/evidence/water-10/final-falls-ultra.jpg)

Silverveil Falls, captured with the Ultra particle budget. Its
[capture settings](gauntlet/evidence/water-10/final-falls-ultra.json) record the
controlled visual overrides used for this image.

![Moving reflections across the village river](gauntlet/evidence/water-10/final-village.jpg)

The river winds through the village. Shared waves, ripples and distorted
reflections carry the water treatment into quieter places.

![A passenger and boatkeeper on the covered Reed Ferry](gauntlet/evidence/ferry-underway-02.png)

The Reed Ferry crossing. This earlier gameplay image shows the boat and passenger
interaction before the latest water shader update.

## A world with its own life

![A spotted deer standing among the shaded trees of Mosswood](gauntlet/evidence/wildlife-deer-shade-after-05.png)

Mosswood's deer, from the integrated wildlife review. The separately archived
revision 3 deer experiment is not the animal loaded by the current game.

![A bicycle ride through the village](screenshots/polish/bicycle-feminine.png)

Take the bicycle down familiar streets, leave it parked, and return later.

![Flooded rice paddies beside the village](gauntlet/evidence/water-10/final-paddies.jpg)

Quiet fields use much gentler water movement than the river and waterfall.

## Your character, your afternoon

![The masculine character preset in the creator](screenshots/polish/creator-masculine.png)

Choose a body preset, hairstyle, wardrobe and colors. The same configuration
appears in the world and is kept in your browser save.

![Warm evening light on the river](gauntlet/evidence/water-10/final-village-evening.jpg)

Change or freeze the time of day to linger in the light you like.

## Source and reuse

These project captures are distributed with Summer Haven under its
[MIT license](../LICENSE). Retain the required notice when reusing them.
The [QA archive](gauntlet/HANDOFF-10.md) records the underlying builds,
measurements and known limitations. Earlier images are retained as development
history, not represented as a fresh validation of every current system.
