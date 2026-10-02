/** Run against the local development build: await import('/tests/browser-smoke.js').then(m=>m.runSmoke()). */
export async function runSmoke() {
  const g = window.__haven;
  if (!g?.ready) throw Error('Launch with ?qa=1 and wait for the title screen.');
  const report = { checks: [], metrics: [], date: new Date().toISOString() },
    original = JSON.parse(JSON.stringify(g.save));
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const check = (name, pass, detail = '') => {
    report.checks.push({ name, pass: !!pass, detail });
    window.__havenQAProgress = { completed: report.checks.length, last: name };
    if (!pass) console.error('QA: ' + name, detail);
  };
  const press = async (code, ms = 100) => {
    dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await wait(ms);
    dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await frame();
  };
  try {
    g.start();
    g.setTime(0.16);
    g.teleport(0, 20);
    // Let lazy shadow/post shader variants settle before timing real key holds.
    for (let i = 0; i < 12; i++) await frame();
    let p = g.player.position.clone();
    await press('KeyW', 1200);
    const walk = g.player.position.distanceTo(p);
    check('W moves the character through the game input layer', walk > 1.1, walk);
    dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', bubbles: true }));
    p = g.player.position.clone();
    await press('KeyW', 1200);
    dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', bubbles: true }));
    check(
      'Shift produces a faster jog',
      g.player.position.distanceTo(p) > walk * 1.45,
      g.player.position.distanceTo(p),
    );
    await press('Escape');
    const paused = g.player.position.clone();
    await press('KeyW', 350);
    check('Pause stops player motion', paused.distanceTo(g.player.position) < 0.001);
    g.resume();
    g.teleport(0, 24);
    g.player.recoverBike(g.village.collision);
    await press('KeyF');
    await wait(850);
    check('F mounts the nearby bicycle', g.player.cycling);
    p = g.player.position.clone();
    await press('KeyW', 1600);
    check(
      'Bicycle propulsion and crank are active',
      g.player.position.distanceTo(p) > 1 && g.player.crank > 0,
    );
    g.ui.mode = 'qa';
    g.player.speed = 0;
    g.player.mountBlend = 1;
    for (const body of ['feminine', 'masculine']) {
      g.player.character.apply({ ...original.appearance, body, top: 2, bottom: 2 });
      let handGap = 0,
        footGap = 0;
      for (let phase = 0; phase < 24; phase++) {
        g.player.crank = (phase * Math.PI) / 12;
        g.player.steer = Math.sin(phase) * 0.4;
        g.player.update(0, g.input, 0, g.village.collision, false, phase / 30);
        for (const side of ['L', 'R']) {
          const wrist = g.player.character.bones.get('hand_' + side);
          const ankle = g.player.character.bones.get('foot_' + side);
          const grip = g.player.bike.getObjectByName('grip_' + side);
          const pedal = g.player.bike.getObjectByName('pedal_' + side);
          handGap = Math.max(
            handGap,
            wrist.getWorldPosition(p.clone()).distanceTo(grip.getWorldPosition(p.clone())),
          );
          footGap = Math.max(
            footGap,
            ankle.getWorldPosition(p.clone()).distanceTo(pedal.getWorldPosition(p.clone())),
          );
        }
      }
      check(
        `${body}: hands and shoes stay attached throughout pedalling and steering`,
        handGap < 0.11 && footGap < 0.11,
        { handGap, footGap },
      );
    }
    g.player.character.apply(original.appearance);
    g.player.steer = 0;
    g.ui.hud();
    await press('KeyB');
    await press('KeyF');
    await wait(800);
    check(
      'F dismounts and leaves the bicycle parked',
      !g.player.cycling && g.player.bike.position.distanceTo(g.player.position) > 0.5,
    );
    const actor = g.villagers.actors.find((a) => a.data.id === 'aya');
    g.teleport(actor.position.x + 0.8, actor.position.z + 0.6);
    await frame();
    await press('KeyE');
    check(
      'A villager acknowledges the player and opens dialogue',
      g.ui.mode === 'dialogue' && g.save.activities.cat >= 1,
    );
    await press('KeyE');
    check('Conversation returns to exploration', g.ui.mode === 'play' && !g.villagers.talking);
    await press('KeyE');
    await press('Escape');
    check(
      'Escape closes dialogue and releases the villager routine',
      g.ui.mode === 'play' && !g.villagers.talking,
    );
    for (const body of ['feminine', 'masculine']) {
      g.openCreator();
      g.ui.draft.body = body;
      g.preview.apply(g.ui.draft);
      for (let hair = 0; hair < 8; hair++) {
        const a = {
          ...g.ui.draft,
          body,
          hair,
          top: hair % 6,
          bottom: hair % 4,
          shoes: hair % 3,
          accessories: [hair === 0, hair === 1, hair >= 2],
        };
        g.preview.apply(a);
        let invalid = 0,
          parts = 0;
        g.preview.model.traverse((o) => {
          if (o.isSkinnedMesh && o.visible) {
            parts++;
            o.computeBoundingBox();
            if (!Number.isFinite(o.boundingBox.min.x + o.boundingBox.max.y)) invalid++;
          }
        });
        check(
          `${body}: hairstyle ${hair + 1}, top ${(hair % 6) + 1}, fitted outfit`,
          parts > 0 && invalid === 0,
          `${parts} draw batches`,
        );
        for (const state of [
          'idle',
          'walk',
          'jog',
          'sit',
          'mount',
          'cycle',
          'brake',
          'dismount',
          'interact',
        ]) {
          g.preview.setState(state);
          for (let k = 0; k < 6; k++) g.preview.update(1 / 30, 2, state === 'cycle' ? 1 : 0, 0.1, k / 30);
          check(
            `${body}/${hair}: ${state} has finite bones`,
            [...g.preview.bones.values()].every((b) =>
              [...b.position.toArray(), ...b.quaternion.toArray()].every(Number.isFinite),
            ),
          );
        }
      }
      g.ui.callbacks.confirm({ ...g.ui.draft, body, hair: 2, top: 1, bottom: 1 });
      check(
        `${body}: creator confirms exact appearance in the world`,
        g.player.character.appearance.body === body &&
          g.player.character.appearance.hair === 2 &&
          g.save.appearance.bottom === 1,
      );
    }
    g.player.character.apply(original.appearance);
    g.teleport(0, 17);
    for (const room of ['home', 'cafe', 'shop']) {
      const door = g.village.interactions.find((i) => i.kind === 'door' && i.data === room);
      g.teleport(door.x, door.z);
      await frame();
      await press('KeyE');
      check(`Door enters the ${room}`, g.stats().inside === room);
      if (room === 'home') {
        g.player.teleport(402.35, -1.45);
        await frame();
        await press('KeyE');
        check('Wardrobe reopens the creator from home', g.ui.mode === 'creator');
        g.ui.callbacks.cancel();
      }
      const exit = g.interiors.rooms.get(room).interactions[0];
      g.player.teleport(exit.x, exit.z - 0.3);
      await frame();
      await press('KeyE');
      check(`${room} exit returns safely outside`, g.stats().inside === null);
    }
    g.teleport(g.village.cat.position.x + 0.55, g.village.cat.position.z + 0.55);
    await frame();
    await press('KeyE');
    check('Mikan interaction completes the lost-cat activity', g.save.activities.cat === 2);
    g.resume();
    g.enter('shop');
    g.player.teleport(460.7, -1);
    await frame();
    await press('KeyE');
    check('Mori gives the optional parcel', g.save.activities.delivery === 1);
    g.resume();
    g.leave();
    const ren = g.villagers.actors.find((a) => a.data.id === 'ren');
    g.teleport(ren.position.x - 0.6, ren.position.z + 0.6);
    await frame();
    await press('KeyE');
    check('Ren receives the parcel', g.save.activities.delivery === 2);
    g.resume();
    g.villagers.release();
    for (const [id, goal] of [
      ['fields', [-63, 18]],
      ['river', [39, -26]],
      ['shrine', [77, -69]],
      ['hill', [-61, -83]],
      ['Hibiscus lane', [0, 112]],
      ['community garden', [-30, 95]],
      ['Apricot neighborhood', [81, 88]],
    ]) {
      g.teleport(0, 17);
      g.ui.mode = 'qa';
      const route = g.villagers.nav.route([0, 17], goal);
      let stuck = false,
        steps = 0;
      g.input.keys.add('KeyW');
      g.input.keys.add('ShiftLeft');
      for (const point of route) {
        let budget = 140;
        while (
          Math.hypot(g.player.position.x - point[0], g.player.position.z - point[1]) > 0.16 &&
          budget-- > 0
        ) {
          const dx = point[0] - g.player.position.x,
            dz = point[1] - g.player.position.z;
          g.player.update(1 / 60, g.input, Math.atan2(-dx, -dz), g.village.collision, true, steps / 60);
          steps++;
        }
        if (budget <= 0) {
          stuck = true;
          break;
        }
      }
      g.input.clear();
      check(`Walkable route to ${id} with actual player collision`, route.length > 0 && !stuck, {
        steps,
        end: g.player.position.toArray(),
      });
      g.resume();
      await frame();
    }
    g.teleport(77, -71.3);
    g.ui.mode = 'qa';
    g.input.keys.add('KeyW');
    for (let i = 0; i < 230; i++) g.player.update(1 / 60, g.input, 0, g.village.collision, true, i / 60);
    g.input.clear();
    check(
      'Shrine stone steps elevate the player onto the platform',
      g.player.position.y > 5.1,
      g.player.position.toArray(),
    );
    g.resume();
    g.setTime(0.6);
    await frame();
    const planned = g.villagers.actors.filter((a) => a.route.length).length;
    check('Time changes produce purposeful NPC routes', planned >= 4, planned);
    const far = g.player.position.clone().set(1000, 0, 1000);
    for (let i = 0; i < 600; i++) g.villagers.update(0.5, 0.6, far, null, i * 0.5);
    check(
      'Villagers finish their afternoon routes',
      g.villagers.actors.filter((a) => a.route.length).length === 0,
      g.villagers.actors
        .filter((a) => a.route.length)
        .map((a) => ({ name: a.data.name, at: a.position.toArray(), remaining: a.route.length })),
    );
    const mori = g.villagers.actors.find((a) => a.data.id === 'mori'),
      work = mori.data.stops[0];
    mori.position.set(work.x, 0, work.z);
    mori.stage = 2;
    mori.room = null;
    g.villagers.update(0, 0.1, far, null, 301);
    check(
      'Rewinding time restores a workplace even when its route is already complete',
      mori.room === 'shop',
    );
    g.teleport(-61, -83);
    g.ui.callbacks.photo();
    await frame();
    check('Photo mode opens and freezes simulation time', g.ui.mode === 'photo');
    const time = g.save.time;
    await wait(350);
    check('Photo mode holds the clock', g.save.time === time);
    let png = '';
    const intercept = (e) => {
      if (e.target instanceof HTMLAnchorElement && e.target.download.startsWith('summer-haven-')) {
        e.preventDefault();
        png = e.target.href;
      }
    };
    document.addEventListener('click', intercept, true);
    g.ui.callbacks.capture();
    await frame();
    document.removeEventListener('click', intercept, true);
    check(
      'Photo button creates a PNG and records the hill photograph',
      png.startsWith('data:image/png;base64,') && png.length > 10000 && g.save.activities.photo === 2,
      { pngBytes: png.length, activity: g.save.activities.photo },
    );
    g.resume();
    await press('KeyT');
    check('T opens the daylight panel', g.ui.mode === 'time' && !!document.querySelector('#daylight-slider'));
    for (const value of [0.05, 0.38, 0.67, 0.86, 1]) {
      document.querySelector(`[data-time="${value}"]`).click();
      await frame();
      check(
        `Daylight preset ${value} updates live lighting`,
        Math.abs(g.save.time - value) < 0.001 &&
          document.querySelector('#time-label').textContent.length === 5,
      );
    }
    const clockSlider = document.querySelector('#daylight-slider');
    clockSlider.value = '.5';
    clockSlider.dispatchEvent(new Event('input', { bubbles: true }));
    check(
      'Continuous time slider reaches 17:15',
      g.save.time === 0.5 && document.querySelector('#time-label').textContent === '17:15',
    );
    const speedSlider = document.querySelector('#time-speed');
    speedSlider.value = '2.5';
    speedSlider.dispatchEvent(new Event('input', { bubbles: true }));
    const hold = document.querySelector('#hold-time');
    hold.checked = true;
    hold.dispatchEvent(new Event('change', { bubbles: true }));
    check(
      'Time speed and hold preference persist',
      JSON.parse(localStorage.getItem('summer-haven.save.v1')).settings.timeSpeed === 2.5 &&
        g.save.settings.freezeTime,
    );
    await press('Escape');
    check('Escape returns from daylight panel', g.ui.mode === 'play');
    document.querySelector('[data-action="time"]').click();
    check('HUD clock opens the same controls', g.ui.mode === 'time');
    g.resume();
    const gl = g.renderer.getContext(),
      ext = gl.getExtension('WEBGL_debug_renderer_info');
    report.renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'not exposed';
    report.audio = { state: g.audio.context?.state, enabled: g.audio.enabled };
    check('Audio starts after interaction', g.audio.enabled && g.audio.context?.state === 'running');
  } finally {
    Object.assign(g.save, original);
    g.villagers.release();
    g.player.cycling = false;
    g.player.inside = false;
    if (g.stats().inside) g.leave();
    g.player.character.apply(original.appearance);
    g.teleport(...original.position);
    g.settings(original.settings);
    g.resume();
  }
  report.passed = report.checks.filter((c) => c.pass).length;
  report.failed = report.checks.filter((c) => !c.pass);
  window.__havenQA = report;
  return report;
}
