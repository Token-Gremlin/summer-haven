import './ui/style.css';
import * as T from 'three';
import { Assets } from './game/assets';
import { Input } from './core/input';
import { readSave, writeSave, freshSave, hasSavedSettings, PRESETS, type Settings } from './core/save';
import { copyAppearance } from './data/appearance';
import { clampTime, formatTime } from './data/time';
import { UI } from './ui/ui';
import { Village, type Interaction } from './world/village';
import { Interiors } from './world/interiors';
import { addCityInteriors } from './world/city-interiors';
import { CITY_BUILDINGS } from './data/city';
import { Villagers } from './world/npcs';
import { Wildlife } from './world/wildlife';
import { HabitatLife } from './world/habitat-life';
import { Regions, REGION_PLACES } from './world/regions';
import { Reedwing } from './world/dragon';
import { Siltfin } from './world/siltfin';
import { Ferry } from './world/ferry';
import { CityLife } from './world/city-life';
import { REGION_ROUTE, regionAt, regionSurfaceWater, regionRiverSample } from './data/regions';
import { Collision } from './world/collision';
import { Player } from './player/player';
import { frameDelta } from './player/motion';
import { sceneryRanges } from './render/visibility';
import { CameraRig } from './player/camera';
import { Character } from './character/character';
import { Audio } from './game/audio';
import { Sky } from './world/sky';
import { Climate } from './world/climate';
import { validateClimate } from './data/climate';
import { Post } from './render/post';
import { Profiler } from './render/profiler';
import { SunShadow, PaddyReflection } from './render/lightpasses';
import { TimeOfDay } from './world/timeofday';
import { leafAtlas } from './render/leafAtlas';
import { signAtlas } from './render/signAtlas';
import { G, REFL, uber, specializeUber } from './render/materials';
import { prep, ID, M } from './world/geo';
import { BUILDINGS, LANDMARKS, terrainHeight } from './data/world';

const ui = new UI();
const params = new URLSearchParams(location.search);
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
async function boot() {
  const save = readSave(),
    assets = new Assets();
  let started = false,
    creator = false,
    inside: string | null = null,
    elapsed = 0,
    last = 0,
    autosave = 0,
    locationName = 'Haven village',
    photo = false,
    returnToTitle = false;
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) * save.settings.resolution);
  renderer.setSize(innerWidth, innerHeight);
  renderer.autoClear = false;
  renderer.info.autoReset = false;
  const gl = renderer.getContext(),
    gpuExtension = gl.getExtension('WEBGL_debug_renderer_info');
  if (
    !save.created &&
    !hasSavedSettings() &&
    gpuExtension &&
    /Intel|SwiftShader/i.test(gl.getParameter(gpuExtension.UNMASKED_RENDERER_WEBGL))
  ) {
    Object.assign(save.settings, PRESETS.low, { quality: 'low' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) * save.settings.resolution);
    renderer.setSize(innerWidth, innerHeight);
  }
  const scene = new T.Scene(),
    studio = new T.Scene();
  studio.background = new T.Color('#d8ddc8');
  const input = new Input(canvas),
    camera = new CameraRig();
  camera.camera.aspect = innerWidth / innerHeight;
  camera.camera.updateProjectionMatrix();
  const post = new Post(renderer, innerWidth, innerHeight, { kuwahara: true, msaa: save.settings.aa }),
    shadow = new SunShadow(save.settings.shadows, 38),
    reflection = new PaddyReflection(Math.round(innerWidth * 0.4), Math.round(innerHeight * 0.4));
  const profiler = params.get('prof') === '1' ? new Profiler(renderer, true) : null;
  post.prof = profiler;
  post.setNear(camera.camera.near);
  post.setPainterly(save.settings.post);
  post.bloom.enabled = save.settings.post;
  post.setQuality(save.settings.quality);
  const tod = new TimeOfDay(post, shadow, new URLSearchParams());
  G.uLeafTex.value = leafAtlas(renderer);
  G.uSignTex.value = signAtlas(renderer);
  const sky = new Sky();
  scene.add(sky.group, sky.motes);
  const studioGround = new T.Mesh(
    prep(new T.CylinderGeometry(1.8, 1.9, 0.09, 64), '#bdc8ae', M.ground),
    uber(ID.ground, 0, T.DoubleSide),
  );
  studioGround.position.y = -0.06;
  studio.add(studioGround);
  const progress = (s: string, n: number) => ui.loading(s, n);
  await assets.load(progress);
  const village = new Village(assets, params.get('world') === 'slice');
  scene.add(village.group);
  await village.build(progress);
  const interiors = new Interiors(assets);
  if(!village.slice)addCityInteriors(assets,interiors.group,interiors.rooms);
  scene.add(interiors.group);
  const player = new Player(assets, save.appearance, scene);
  if (!village.collision.blocked(...save.position, 0.4, terrainHeight(...save.position)))
    player.teleport(...save.position);
  const preview = new Character(assets, save.appearance);
  studio.add(preview.group);
  const villagers = new Villagers(assets, scene, village.collision, village.slice);
  const regions = new Regions(assets, village);
  if (!village.slice) {
    await regions.build(progress);
    scene.add(regions.group);
    if (!village.collision.blocked(...save.position, .4, terrainHeight(...save.position)))
      player.teleport(...save.position);
  }
  const reedwing = new Reedwing(assets, village.collision);
  const climate = new Climate(save.climate,save.world.elapsedSeconds,village.collision,(x,z)=>
    Math.max(terrainHeight(x,z),regionSurfaceWater(x,z)??(z>=-132&&village.collision.water(x,z)?-.18:-100)));
  scene.add(climate.precipitation.group);
  if (!village.slice) {
    scene.add(reedwing.group);
    village.interactions.push(reedwing.interaction);
  }
  const ferry = village.slice ? null : new Ferry(assets,scene,village.collision);
  const siltfin = village.slice ? null : new Siltfin({...assets.siltfin(),snapshot:save.world.siltfin});
  if(siltfin){scene.add(siltfin.group);village.interactions.push(siltfin.interaction);}
  if(ferry)village.interactions.push(...ferry.interactions);
  const cityLife = village.slice ? null : new CityLife(assets,scene,village.collision,save.world.cityLife);
  if(cityLife)save.world.cityLife=cityLife.state;
  const wildlife = new Wildlife();
  scene.add(wildlife.group);
  const habitatLife = village.slice ? null : new HabitatLife({
    terrainHeight, waterHeight: regionSurfaceWater, assets: assets.wildlife, saved: save.world.habitatLife,
    blocked: (x,y,z,r) => {
      for(const o of village.collision.query(x-r,z-r,x+r,z+r)) {
        if(o.cameraOnly || y>(o.bottom??0)+o.height || y+.7<(o.bottom??0))continue;
        if(village.collision.contains(o,x,z,r))return true;
      }
      return false;
    },
  });
  if(habitatLife){
    scene.add(habitatLife.group);
    for(const support of habitatLife.supportObstacles)village.collision.add({...support});
  }
  const audio = new Audio();
  let selected: Interaction | null = null;
  const emptyCollision = new Collision();
  emptyCollision.bounds = { x0: -1000, x1: 1000, z0: -1000, z1: 1000 };
  const activeCollision = () => (inside ? interiors.rooms.get(inside)!.collision : village.collision);
  let storageWarningShown = false;
  const persist = () => {
    if(habitatLife)save.world.habitatLife=habitatLife.snapshot();
    if(siltfin)save.world.siltfin=siltfin.snapshot();
    if (
      !inside &&
      !creator &&
      !ferry?.riding &&
      started &&
      !village.collision.blocked(player.position.x, player.position.z, 0.3, player.position.y)
    )
      save.position = [player.position.x, player.position.z];
    if (!writeSave(save) && !storageWarningShown) {
      storageWarningShown = true;
      ui.toast('This browser could not save your visit. Please allow local storage to keep your progress.');
    }
  };
  const resume = () => {
    input.clear();
    if (creator) return;
    villagers.release();
    cityLife?.release();
    photo = false;
    camera.photo = false;
    ui.root.classList.remove('photo-hidden');
    if (!started) {
      ui.title(save.created);
      return;
    }
    ui.hud();
    persist();
  };
  const openCreator = () => {
    returnToTitle = !started;
    creator = true;
    player.character.group.visible = false;
    camera.reset(true);
    preview.apply(save.appearance);
    ui.creator(save.appearance);
    input.clear();
    void audio.start(save.settings);
  };
  const start = () => {
    started = true;
    creator = false;
    player.character.group.visible = true;
    camera.reset();
    ui.hud();
    void audio.start(save.settings);
    persist();
  };
  const enter = (name: string) => {
    if (player.cycling) {
      ui.toast('Leave your bicycle outside first.');
      return;
    }
    const room = interiors.rooms.get(name);
    if(!room)return;
    inside = name;
    player.inside = true;
    player.teleport(room.origin.x, room.origin.z);
    player.yaw = Math.PI;
    camera.reset();
    ui.toast(
      name === 'home'
        ? 'Your home · The wardrobe is beside the window.'
        : name === 'cafe'
          ? 'Komorebi café · Stay as long as you like.'
          : name==='shop' ? 'Mori general store · Small things for summer.'
            : `${CITY_BUILDINGS.find(b=>b.interior===name)?.name ?? 'Aldermere'} · Come in and stay a while.`,
    );
  };
  const leave = () => {
    const b = BUILDINGS.find((b) => b.interior === inside);
    const door = regions.city.doors.get(inside!) ?? village.interactions.find((i) => i.id === b?.id);
    if(!door)return;
    inside = null;
    player.inside = false;
    player.teleport(door.x, door.z + 0.8);
    camera.reset();
    persist();
  };
  let appliedSettings = { ...save.settings };
  const settings = (s: Settings) => {
    const previous = appliedSettings;
    Object.assign(save.settings, s);
    if (previous.resolution !== s.resolution) {
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) * s.resolution);
      post.composer.setPixelRatio(renderer.getPixelRatio());
      resize();
    }
    if (previous.aa !== s.aa) post.setMsaa(s.aa);
    if (previous.post !== s.post) {
      post.bloom.enabled = s.post;
      post.setPainterly(s.post);
    }
    if (previous.shadows !== s.shadows) shadow.setSize(s.shadows);
    if (previous.quality !== s.quality) post.setQuality(s.quality);
    audio.configure(s);
    appliedSettings = { ...s };
    persist();
  };
  const takePhoto = () => {
    ui.root.style.visibility = 'hidden';
    requestAnimationFrame(() => {
      // Read immediately after rendering; preserving the framebuffer permanently can stall GPUs.
      post.render(scene, camera.camera, elapsed);
      const a = document.createElement('a');
      a.download = `summer-haven-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.style.display = 'none';
      document.body.append(a);
      a.click();
      a.remove();
      ui.root.style.visibility = '';
      if (Math.hypot(player.position.x + 61, player.position.z + 85) < 20) {
        save.activities.photo = 2;
        persist();
      }
      ui.toast('A little piece of summer, saved.');
    });
  };
  ui.callbacks = {
    start,
    create: openCreator,
    appearance: (a) => preview.apply(a),
    confirm: (a) => {
      save.appearance = copyAppearance(a);
      save.created = true;
      player.character.apply(a);
      creator = false;
      start();
    },
    cancel: () => {
      creator = false;
      player.character.group.visible = true;
      camera.reset();
      if (returnToTitle) {
        ui.title(save.created);
      } else resume();
    },
    resume,
    settings,
    climate: (options) => {save.climate=validateClimate(options);persist();},
    setTime: (t) => {
      save.time = clampTime(t);
      persist();
    },
    recover: () => {
      if(ferry?.riding){ui.toast('Step ashore before calling your bicycle.');return;}
      if (inside) {
        ui.toast('Step outside to bring your bicycle over.');
        return;
      }
      if (player.recoverBike(village.collision)) ui.toast('Your bicycle is beside you.');
    },
    home: () => {
      ferry?.release();
      inside = null;
      player.inside = false;
      player.cycling = false;
      player.teleport(8, 16);
      resume();
      camera.reset();
    },
    photo: () => {
      if (!started) return;
      photo = true;
      camera.photo = true;
      camera.photoOffset.set(0, 0, 0);
      ui.photo();
    },
    capture: takePhoto,
    reset: () => {
      ferry?.release();
      Object.assign(save, freshSave());
      if(cityLife){cityLife.reset();save.world.cityLife=cityLife.state;}
      if(habitatLife){habitatLife.reset();save.world.habitatLife=habitatLife.snapshot();}
      if(siltfin){siltfin.reset();save.world.siltfin=siltfin.snapshot();}
      player.character.apply(save.appearance);
      inside = null;
      player.inside = false;
      player.cycling = false;
      player.teleport(8, 16);
      started = false;
      settings(save.settings);
      openCreator();
    },
    rotate: (d) => (camera.yaw += d),
    dialogueClose: () => {
      villagers.release();
      resume();
    },
  };
  ui.root.addEventListener('ui-action', (e) => {
    const a = (e as CustomEvent<string>).detail;
    if (a === 'pause') {
      ui.pause();
      input.clear();
    } else if (a === 'settings') ui.showSettings(save.settings);
    else if (a === 'climate') {
      photo=false;camera.photo=false;ui.showClimate(save.climate);input.clear();
    } else if (a === 'time') {
      photo = false;
      camera.photo = false;
      ui.showTime(save.time, save.settings,save.climate.season);
      input.clear();
    } else if (a === 'journal') {
      ui.journal(save);
      input.clear();
    } else {
      const fn = ui.callbacks[a as keyof typeof ui.callbacks];
      if (typeof fn === 'function') (fn as () => void)();
    }
  });
  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    post.setSize(innerWidth, innerHeight);
    reflection.setSize(Math.round(innerWidth * 0.4), Math.round(innerHeight * 0.4));
    camera.camera.aspect = innerWidth / innerHeight;
    camera.camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ui.mode === 'play') {
      ui.pause();
      input.clear();
      persist();
    }
  });
  function interact() {
    const actor = nearbyActor();
    if (actor) {
      const dialogue = actor.city
        ? cityLife!.talk(actor.city,player.position)
        : villagers.talk(actor.village!, save, player.position);
      ui.dialogue(dialogue.name, dialogue.text);
      persist();
      return;
    }
    if (!selected) return;
    const i = selected;
    if (i.kind === 'ferry') {
      const message=ferry?.interact(player);
      if(message)ui.toast(message);
    }
    else if (i.kind === 'door') enter(i.data!);
    else if (i.kind === 'exit') leave();
    else if (i.kind === 'wardrobe') openCreator();
    else if (i.kind === 'sit') {
      player.seated = true;
      player.seatHeightOffset = i.seat?.[3] ?? 0;
      player.teleport(i.seat?.[0] ?? i.x, i.seat?.[1] ?? i.z - 0.35);
      player.yaw = i.seat?.[2] ?? (inside ? Math.PI : -Math.PI / 2);
      ui.toast('Stay a while. Move whenever you’re ready.');
    } else if (i.kind === 'cat') {
      save.activities.cat = 2;
      ui.dialogue(
        'Mikan',
        'A slow blink. A small stretch. Apparently, this is the best box in the whole village. You should let Aya know he is here.',
      );
      persist();
    } else if (i.kind === 'view') {
      ui.dialogue(
        'Windbell hill',
        'The roofs, the fields, the river. They all fit in one quiet breath from up here. Press P to keep a photograph.',
      );
      save.activities.photo = Math.max(1, save.activities.photo);
    } else {
      if(i.id==='vesper-siltfin'&&siltfin){
        const response=siltfin.interact(player.position);
        if(response){ui.dialogue('Vesper Siltfin',response);persist();}
        return;
      }
      if (i.id === 'shrine'||i.id==='starroot-bell') audio.chime();
      ui.dialogue(i.label, i.data || 'Someone has made a little home here.');
    }
  }
  function nearbyActor() {
    if(ferry?.riding)return null;
    // A resident near an entrance must not monopolize the door's interaction key.
    if (
      selected?.kind === 'door' &&
      Math.hypot(selected.x - player.position.x, selected.z - player.position.z) < 1.1
    )
      return null;
    const city=cityLife?.nearby(player.position,inside);
    if(city)return {city,village:null,data:city.data};
    const village= villagers.nearby(player.position, inside);
    return village ? {city:null,village,data:village.data}:null;
  }
  progress('Warming the summer light…', 0.84);
  specializeUber(scene);
  specializeUber(studio);
  renderer.setRenderTarget(post.mrt);
  await renderer.compileAsync(scene, camera.camera);
  await renderer.compileAsync(studio, camera.camera);
  renderer.setRenderTarget(null);
  progress('A place is waiting for you.', 1);
  ui.title(save.created);
  if (params.get('skipintro') === '1') start();
  const frameTimes: number[] = [];
  let frames = 0;
  let lastShadowTime = -1;
  const shadowFocus = new T.Vector3(Infinity, 0, 0);
  function frame(now: number) {
    requestAnimationFrame(frame);
    profiler?.frameBegin(now);
    profiler?.cpuBegin('input/time');
    const raw = last ? (now - last) / 1000 : 1 / 60;
    last = now;
    const dt = frameDelta(raw);
    elapsed += dt;
    if (raw < 1 && frames++ > 20) {
      frameTimes.push(raw * 1000);
      if (frameTimes.length > 600) frameTimes.shift();
    }
    if (input.tap('Escape')) {
      if (creator) ui.callbacks.cancel();
      else if (ui.mode === 'play') ui.pause();
      else resume();
      input.clear();
    }
    if (ui.mode === 'play') {
      if (input.tap('KeyF')) {
        const message = ferry?.riding ? 'Step ashore before riding your bicycle.' : player.toggleBike(activeCollision());
        if (message) ui.toast(message);
      }
      if (input.tap('KeyB')) audio.bell();
      if (input.tap('KeyJ')) ui.journal(save);
      if (input.tap('KeyP')) ui.callbacks.photo();
      if (input.tap('KeyK')) {ui.showClimate(save.climate);input.clear();}
      if (input.tap('KeyT')) {
        ui.showTime(save.time, save.settings,save.climate.season);
        input.clear();
      }
      if (input.tap('KeyE')) interact();
    } else if (ui.mode === 'climate' && input.tap('KeyK')) resume();
    else if (ui.mode === 'time' && input.tap('KeyT')) resume();
    else if (ui.mode === 'dialogue' && (input.tap('KeyE') || input.tap('Space')))
      ui.callbacks.dialogueClose();
    if (photo) {
      if (input.tap('KeyH')) ui.root.classList.toggle('photo-hidden');
      if (input.tap('Space')) takePhoto();
      if (input.tap('KeyP')) resume();
    }
    const play = ui.mode === 'play',
      paused = !play && !photo;
    if (!save.settings.freezeTime && play)
      save.time = Math.min(1, save.time + (dt * save.settings.timeSpeed) / 1200);
    if (play) save.world.elapsedSeconds += dt;
    tod.setProgress(creator ? 0.03 : save.time);
    climate.advance(play || ui.mode==='climate' || ui.mode==='time' || !started ? dt : 0,save.climate,save.world.elapsedSeconds,!inside&&!creator);
    G.uTime.value = elapsed;
    G.uShadowQuality.value = save.settings.quality === 'high' || save.settings.quality === 'ultra' ? 1 : 0;
    G.uDetail.value = save.settings.quality === 'low' ? 0 : save.settings.quality === 'medium' ? 0.5 : 1;
    const ranges = sceneryRanges(save.settings);
    G.uViewOrigin.value.copy(player.position);
    G.uWorldRange.value.set(creator || inside ? 1600 : ranges.start, creator || inside ? 1600 : ranges.end);
    G.uFoliageRange.value.set(ranges.foliageStart, ranges.foliage);
    G.uTreeLod.value.set(ranges.lodStart, ranges.lodEnd);
    G.uPush.value.set(player.position.x, player.position.z, 0.75, play && !player.cycling ? 1 : 0);
    if (creator) {
      profiler?.cpuBegin('creator');
      preview.setState('idle');
      preview.update(dt, 0, 0, 0, elapsed);
      camera.update(dt, new T.Vector3(0.38, 0, 0), input, save.settings, emptyCollision, false, true);
      G.uShadowOn.value = 0;
      if (profiler) renderer.info.reset();
      profiler?.cpuBegin('post');
      post.render(studio, camera.camera, elapsed);
    } else {
      profiler?.cpuBegin('player/ferry');
      if (play && !ferry?.riding) player.update(dt, input, camera.yaw, activeCollision(), true, elapsed);
      if(ferry){
        ferry.group.visible=!inside;
        ferry.update(play ? dt : 0,save.world.elapsedSeconds,player,!!inside,ranges.end);
      }
      profiler?.cpuBegin('residents:village');
      villagers.update(play ? dt : 0, save.time, player.position, inside, elapsed, ranges.end);
      profiler?.cpuBegin('residents:city');
      cityLife?.update(play ? dt : 0,save.time,elapsed,player.position,inside,ranges.end);
      profiler?.cpuBegin('wildlife');
      wildlife.group.visible = !inside;
      wildlife.update(paused ? 0 : dt, elapsed, save.time, player.position, ranges.end);
      profiler?.cpuBegin('habitat');
      if(habitatLife){
        habitatLife.group.visible=!inside;
        habitatLife.drawDistance=ranges.end;
        habitatLife.update(play ? dt : 0,(14+save.time*6.5)/24,player.position);
      }
      profiler?.cpuBegin('camera/sky');
      if (!started) {
        camera.yaw = 0.32;
        camera.pitch = 0.19;
        camera.distance = 7.2;
        camera.update(dt, new T.Vector3(0, 0, 21), input, save.settings, village.collision, false);
      } else
        camera.update(
          dt,
          player.position,
          input,
          save.settings,
          activeCollision(),
          !!inside,
          false,
          player.cycling ? undefined : player.velocity,
        );
      sky.follow(camera.camera.position, elapsed);
      sky.group.visible = !inside;
      sky.motes.visible = !inside;
      sky.motes.visible &&= climate.model.state.rain<.1 && climate.model.state.snowfall<.1 && climate.model.state.season[3]<.5;
      climate.update(save.settings,!inside,camera.camera.position);
      if(!inside){
        profiler?.begin('atmosphere',renderer);
        sky.atmosphere.update(renderer,camera.camera.position,save.settings.quality,elapsed);
        profiler?.end('atmosphere',renderer);
      }
      village.group.visible = !inside;
      regions.group.visible = !inside;
      profiler?.cpuBegin('dragons');
      if (!village.slice) {
        reedwing.update(play ? dt : 0, save.world.elapsedSeconds, player.position, player.speed, ranges.end);
        reedwing.group.visible &&= !inside;
        if (!inside && reedwing.group.position.distanceTo(player.position) < 65)
          save.world.reedwingSeen = true;
      }
      if(siltfin){
        siltfin.update(play?dt:0,save.world.elapsedSeconds,player.position,player.speed,ranges.end);
        siltfin.group.visible&&=!inside;
        const p=siltfin.group.position;
        regions.swimmerWake.body.value.set(p.x,p.z,siltfin.group.rotation.y,siltfin.phase==='swim'?1:.35);
        regions.swimmerWake.height.value=regionSurfaceWater(p.x,p.z)??0;
      }
      profiler?.cpuBegin('scenery');
      interiors.group.visible = !!inside;
      player.bike.visible = !inside;
      if (!inside) village.update(dt, player.position, save.settings, player.speed, camera.camera);
      if (!inside && !village.slice) regions.update(dt, player.position, save.settings, camera.camera);
      profiler?.cpuBegin('lighting');
      renderer.info.reset();
      const shadowInterval =
        save.settings.quality === 'low' || save.settings.quality === 'medium' ? 1 / 30 : 1 / 60;
      if (
        elapsed - lastShadowTime >= shadowInterval ||
        G.uShadowOn.value === 0 ||
        shadowFocus.distanceToSquared(player.position) > 9
      ) {
        profiler?.begin('shadow', renderer);
        shadow.update(renderer, scene, player.position.clone().add(new T.Vector3(0, 0, -4)));
        profiler?.end('shadow', renderer);
        lastShadowTime = elapsed - ((elapsed - lastShadowTime) % shadowInterval);
        shadowFocus.copy(player.position);
      }
      if (save.settings.reflections && !inside && !village.slice) {
        village.water.visible = false;
        const waterVisible=regions?.water.visible;
        if(regions)regions.water.visible=false;
        profiler?.begin('reflection', renderer);
        const rz=player.position.z;
        const mirrorY=rz < -132 ? (rz > -730 && rz < -676 ? 18.08 : regionRiverSample(rz).y+.08) : -.19;
        reflection.update(renderer, scene, camera.camera, mirrorY);
        profiler?.end('reflection', renderer);
        village.water.visible = true;
        if(regions)regions.water.visible=waterVisible!;
        REFL.uReflOn.value = 1;
      } else REFL.uReflOn.value = 0;
      G.uWaterPixels.value=renderer.domElement.height;
      profiler?.cpuBegin('post');
      post.render(scene, camera.camera, elapsed);
      profiler?.cpuBegin('audio');
      audio.tick(dt, player, save.time, paused || !started);
      audio.weather(climate.model.state,paused||!started,!!inside);
      if (!village.slice) audio.dragon(reedwing, player, save.world.elapsedSeconds, paused || !started,camera.yaw);
      if (!village.slice) audio.landscape(player,save.world.elapsedSeconds,paused||!started,camera.yaw);
      if(siltfin)audio.siltfin(siltfin,player,save.world.elapsedSeconds,paused||!started,camera.yaw);
      profiler?.cpuBegin('HUD/interactions');
      if (play) {
        const list = inside ? interiors.rooms.get(inside)!.interactions : village.interactions;
        selected = null;
        let best = Infinity;
        for (const i of list) {
          const d = Math.hypot(i.x - player.position.x, i.z - player.position.z);
          if (d < i.radius && d < best) {
            best = d;
            selected = i;
          }
        }
        const npcNear = nearbyActor(),
          bikeNear = !inside && player.position.distanceTo(player.bike.position) < 2;
        const spot = [...LANDMARKS, ...REGION_PLACES].filter(
          (s) => Math.hypot(s.x - player.position.x, s.z - player.position.z) < s.r,
        ).at(-1);
        if(!spot&&!inside)locationName=regionAt(player.position.x,player.position.z)?.name ?? 'The valley beyond Haven';
        if (spot && spot.name !== locationName && !inside) {
          locationName = spot.name;
          if (!save.discoveries.includes(spot.id)) {
            save.discoveries.push(spot.id);
            ui.toast(`${spot.name} · ${spot.subtitle}`);
          }
        }
        ui.updateHud(
          inside
            ? inside === 'home'
              ? 'Your home'
              : inside === 'cafe'
                ? 'Komorebi café'
                : inside==='shop' ? 'Mori general store' : CITY_BUILDINGS.find(b=>b.interior===inside)?.name ?? 'Aldermere'
            : locationName,
          formatTime(save.time),
          npcNear
            ? 'Talk to ' + npcNear.data.name
            : selected?.label || (player.cycling ? 'Dismount bicycle' : bikeNear ? 'Ride your bicycle' : ''),
          !npcNear && !selected && (bikeNear || player.cycling) ? 'F' : 'E',
        );
        const hint = document.querySelector<HTMLElement>('.movement-hint');
        const weatherIcon=document.querySelector('#weather-icon');
        if(weatherIcon)weatherIcon.textContent=climate.model.state.snowfall>.08?'❄':climate.model.state.rain>.08?'☂':climate.model.state.overcast>.4?'☁':'☀';
        if (hint) hint.style.display = save.settings.hints ? '' : 'none';
      }
    }
    profiler?.cpuBegin('persistence/input-end');
    autosave += dt;
    if (autosave > 8) {
      autosave = 0;
      persist();
    }
    input.endFrame();
    profiler?.frameEnd(renderer);
  }
  requestAnimationFrame(frame);
  if (params.get('qa') === '1')
    Object.assign(window, {
      __haven: {
        player,
        climate,
        sky,
        village,
        regions,
        reedwing,
        ferry,
        cityLife,
        habitatLife,
        siltfin,
        regionSurfaceWater,
        terrainHeight,
        REGION_ROUTE,
        interiors,
        preview,
        scene,
        camera,
        ui,
        save,
        assets,
        renderer,
        input,
        post,
        settings,
        villagers,
        audio,
        profiler: {
          enabled: !!profiler,
          report: () => profiler?.report() ?? { enabled: false, diagnostic: false },
          reset: () => profiler?.reset(),
        },
        ready: true,
        enter,
        leave,
        resume,
        start,
        openCreator,
        interact,
        setTime: (t: number) => {
          save.time = t;
          save.settings.freezeTime = true;
        },
        teleport: (x: number, z: number) => {
          if (inside) leave();
          player.teleport(x, z);
          camera.reset();
        },
        stats: () => ({
          mode: ui.mode,
          inside,
          position: player.position.toArray(),
          state: player.lastState,
          cycling: player.cycling,
          frameMs:
            frameTimes.slice(-120).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(120, frameTimes.length)),
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          frames: frameTimes.length,
        }),
      },
    });
}
boot().catch((error) => {
  console.error(error);
  ui.root.innerHTML =
    '<section class="fatal"><p class="eyebrow">THE SHUTTERS DID NOT OPEN</p><h2>A little trouble starting.</h2><p>Summer Haven needs a browser with WebGL 2 and hardware acceleration. Please reload after checking those settings.</p><p id="startup-detail" class="small"></p><button class="primary green" onclick="location.reload()">Try again</button></section>';
  document.querySelector('#startup-detail')!.textContent = String(error);
});
