/** Focused integration checks against the loaded world, rigs and actual settings controls. */
export async function reviewFluency() {
  const g = window.__haven;
  const T = await import('/node_modules/three/build/three.module.js');
  const { terrainHeight } = await import('/src/data/world.ts');
  const { sampleFoot } = await import('/src/character/gait.ts');
  const { PRESETS } = await import('/src/core/save.ts');
  const { CameraRig } = await import('/src/player/camera.ts');
  const original = JSON.parse(JSON.stringify(g.save));
  const checks = [];
  const check = (name, pass, detail) => checks.push({ name, pass: !!pass, detail });
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  try {
    g.start();
    g.input.clear();
    g.player.cycling = false;
    g.player.seated = false;
    g.player.transition = 0;
    g.player.mountBlend = 0;
    g.ui.mode = 'qa';
    for (const body of ['masculine', 'feminine']) {
      g.player.character.apply({ ...original.appearance, body, top: 1, bottom: 0 });
      for (const [state, speed] of [
        ['walk', 2.35],
        ['jog', 4.8],
      ]) {
        const c = g.player.character;
        c.group.position.set(0, terrainHeight(0, 0) + 0.02, 0);
        c.group.rotation.set(0, 0, 0);
        c.setState(state, speed / (state === 'walk' ? 1.5 : 3));
        for (let i = 0; i < 60; i++) c.update(1 / 60, speed, 0, 0, i / 60, undefined, terrainHeight);
        let gap = 0,
          low = Infinity,
          finite = true,
          contacts = 0;
        const footfalls = c.footfalls;
        for (let i = 0; i < 120; i++) {
          c.update(1 / 60, speed, 0, 0, i / 60, undefined, terrainHeight);
          for (const [side, offset] of [
            ['L', 0],
            ['R', 0.5],
          ]) {
            const ankle = c.bones.get('foot_' + side).getWorldPosition(new T.Vector3());
            const sample = sampleFoot(c.gaitPhase + offset, speed);
            const expected = c.group.localToWorld(
              new T.Vector3(
                (side === 'L' ? 1 : -1) * (body === 'feminine' ? 0.112 : 0.108),
                0.105 + sample.lift,
                sample.z,
              ),
            );
            gap = Math.max(gap, ankle.distanceTo(expected));
            low = Math.min(low, ankle.y - terrainHeight(ankle.x, ankle.z));
            if (sample.planted) contacts++;
          }
          for (const bone of c.bones.values())
            finite &&= [...bone.position.toArray(), ...bone.quaternion.toArray()].every(Number.isFinite);
        }
        check(
          `${body} ${state}: grounded feet and stable joints through two seconds`,
          finite && gap < 0.045 && low > 0.065 && contacts > 0 && c.footfalls > footfalls,
          { maxAnkleTargetGap: gap, minAnkleAboveGround: low, contacts, footfalls: c.footfalls - footfalls },
        );
      }
    }
    g.village.group.updateMatrixWorld(true);
    const paths = [];
    g.village.group.traverse((o) => {
      if (o.name.startsWith('Continuous ')) paths.push(o);
    });
    const ray = new T.Raycaster();
    for (const [x, z] of [
      [0.13, -5.21],
      [0.19, 17.31],
      [0.23, -28.72],
      [0.17, 65.22],
      [23.12, -5.23],
    ]) {
      ray.set(new T.Vector3(x, 40, z), new T.Vector3(0, -1, 0));
      const hits = ray.intersectObjects(paths, false);
      check(
        `Crossing ${x}, ${z} has one road surface without coplanar overlap`,
        hits.length === 1,
        hits.map((h) => ({ name: h.object.name, y: h.point.y })),
      );
    }
    for (const quality of ['low', 'medium', 'high', 'ultra']) {
      g.ui.showSettings(g.save.settings);
      const select = document.querySelector('[data-setting="quality"]');
      select.value = quality;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      await frame();
      check(
        `${quality} preset updates renderer and saved settings`,
        g.save.settings.quality === quality &&
          g.save.settings.aa === PRESETS[quality].aa &&
          g.renderer.domElement.width ===
            Math.floor(innerWidth * Math.min(devicePixelRatio, 1.5) * PRESETS[quality].resolution),
        { render: [g.renderer.domElement.width, g.renderer.domElement.height], aa: g.save.settings.aa },
      );
    }
    g.settings({ ...g.save.settings, ...PRESETS.low, quality: 'low', distance: 60 });
    g.teleport(0, 0);
    const counts = {};
    for (const visibility of ['nearby', 'full']) {
      g.ui.showSettings(g.save.settings);
      const select = document.querySelector('[data-setting="visibility"]');
      select.value = visibility;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      g.village.update(1, g.player.position, g.save.settings);
      counts[visibility] = {
        scenery: g.village.visibility.entries.filter((e) => e.object.visible).length,
        trees: g.village.woodland.stats().visible,
        plants: g.village.vegetation.filter((m) => m.visible).length,
      };
      check(
        `${visibility} preference persists through the settings UI`,
        JSON.parse(localStorage.getItem('summer-haven.save.v1')).settings.visibility === visibility,
      );
    }
    check(
      'Full landscape retains every tree and more distant scenery',
      counts.full.scenery > counts.nearby.scenery &&
        counts.full.trees === g.village.woodland.stats().total,
      counts,
    );
    const base = g.village.woodland.group.children.map(t=>t.geometry);
    g.village.update(1, new T.Vector3(45, 0, 45), g.save.settings);
    check(
      'Tree LOD templates reuse the same buffers when moving away',
      g.village.woodland.group.children.every((t,i)=>t.geometry===base[i]),
    );
    const camera = new CameraRig();
    camera.yaw = Math.PI / 2;
    camera.pitch = 0.05;
    camera.distance = 9;
    for (let i = 0; i < 90; i++)
      camera.update(1 / 60, new T.Vector3(8, 0.02, 10), g.input, g.save.settings, g.village.collision, false);
    const p = camera.camera.position;
    check('Camera retracts before the player-house wall', p.x < 9.14 && p.y > 0.18, p.toArray());
    return {
      date: new Date().toISOString(),
      passed: checks.filter((c) => c.pass).length,
      failed: checks.filter((c) => !c.pass),
      checks,
    };
  } finally {
    g.input.clear();
    Object.assign(g.save, original);
    g.player.character.apply(original.appearance);
    g.settings(original.settings);
    g.teleport(...original.position);
    g.resume();
  }
}
