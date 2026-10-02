/* Local diagnostic stills only. Use the same saved state before either asset.
 * Pauses before any gameplay frame and uses the actual production renderer.
 * No animal pose/state edits. Wind/cloud shader phase is not synchronized.
 */
window.captureDeerStills = async function () {
  const g=window.__haven;
  if(!g?.ready || g.ui.mode!=='pause') throw new Error('Pause the prepared QA game first.');
  const a=g.habitatLife.group.children[0], output=[];
  for(const [view,yaw,distance] of [['front',0,4.4],['side',Math.PI/2,4.4],['threequarter',.9,4.4],['medium',.9,7.2]]) {
    g.camera.reset();g.camera.photo=true;
    g.camera.photoOffset.set(a.position.x-g.player.position.x,a.position.y+1-(g.player.position.y+1.25),a.position.z-g.player.position.z);
    g.camera.yaw=yaw;g.camera.pitch=.08;g.camera.distance=distance;
    await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    g.post.render(g.scene,g.camera.camera,17);
    output.push({view,created:new Date().toISOString(),image:g.renderer.domElement.toDataURL('image/png'),
      build:[...document.scripts].map(s=>s.src),viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,
      render:[g.renderer.domElement.width,g.renderer.domElement.height],settings:structuredClone(g.save.settings),
      time:g.save.time,worldSeconds:g.save.world.elapsedSeconds,player:g.player.position.toArray(),
      camera:{position:g.camera.camera.position.toArray(),quaternion:g.camera.camera.quaternion.toArray(),
        target:g.camera.target.toArray(),yaw:g.camera.yaw,pitch:g.camera.pitch,distance:g.camera.distance,
        photo:g.camera.photo,offset:g.camera.photoOffset.toArray()},
      animal:g.habitatLife.snapshot().animals[0],rootQuaternion:a.quaternion.toArray()});
  }
  return output;
};
