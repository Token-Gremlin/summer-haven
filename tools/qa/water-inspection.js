/* Local ?qa=1 only. Diagnostic placement is not traversal/performance evidence. */
window.waterViews = {
  falls:{x:344,z:-677,yaw:-.62,pitch:-.32,distance:8},
  impact:{x:348,z:-688,yaw:-.9,pitch:.1,distance:5},
  headwater:{x:356,z:-746,yaw:-.7,pitch:.35,distance:7},
  brook:{x:230,z:-460,yaw:-.8,pitch:.35,distance:7},
  village:{x:43,z:-124,yaw:-.5,pitch:.48,distance:7},
  paddies:{x:-36,z:16,yaw:1.2,pitch:.35,distance:6},
};
window.waterView = function(name,quality='high',time=.18) {
  const g=window.__haven,v=window.waterViews[name];
  if(!g?.ready||!v)throw new Error('Ready game and known water view required');
  if(window.__worldPerformance?.running)throw new Error('Do not capture during timing');
  g.start();g.input.clear();g.camera.photo=false;g.player.cycling=false;
  g.settings({...g.save.settings,quality,resolution:quality==='low'?.7:1,shadows:quality==='low'?512:1024,
    vegetation:quality==='low'?.3:1,reflections:quality!=='low',aa:1,post:quality!=='low',
    visibility:'nearby',distance:quality==='low'?90:240,freezeTime:true});
  g.setTime(time);g.teleport(v.x,v.z);Object.assign(g.camera,{yaw:v.yaw,pitch:v.pitch,distance:v.distance});
  window.__waterView={name,quality,time,view:v};
};
window.waterEvidence = function() {
  const g=window.__haven;
  return {view:window.__waterView,build:[...document.scripts].map(s=>s.src),time:g.save.time,
    camera:g.camera.camera.position.toArray(),cameraAspect:g.camera.camera.aspect,target:g.camera.target.toArray(),appearance:structuredClone(g.save.appearance),
    viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,internal:[g.renderer.domElement.width,g.renderer.domElement.height],
    targets:{scene:[g.post.mrt.width,g.post.mrt.height],post:[g.post.composer.readBuffer.width,g.post.composer.readBuffer.height]},
    waterClockOverride:window.__waterClockOverride??null,settings:structuredClone(g.save.settings),drops:g.regions?.spray?.drops.geometry.drawRange.count??0,
    profilerEnabled:g.profiler.enabled,stats:g.stats()};
};
// Exercise a long-session shader phase without pretending to have played for an hour.
window.waterClock=function(seconds=null){
  const g=window.__haven,original=window.__waterOriginalClocks??=new Map();
  if(seconds===null){for(const [m,u] of original)m.uniforms.uTime=u;original.clear();}
  else for(const group of [g.village.water,g.regions.water])group.traverse(o=>{
    if(!o.geometry?.hasAttribute('aWater')||!o.material?.uniforms?.uTime)return;
    if(!original.has(o.material))original.set(o.material,o.material.uniforms.uTime);
    o.material.uniforms.uTime={value:seconds};
  });
  window.__waterClockOverride=seconds;
};
window.recordWaterMotion=function(durationMs=12000,sweep=.18){
  if(window.__worldPerformance?.running||window.__waterVideo?.running)throw new Error('Another capture/timing is active');
  const g=window.__haven,canvas=g.renderer.domElement,stream=canvas.captureStream(30),chunks=[],trace=[];
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(t=>MediaRecorder.isTypeSupported(t));
  if(!mime)throw new Error('No WebM recording support');
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4000000});
  const record=window.__waterVideo={running:true,evidence:window.waterEvidence(),trace,
    method:'Stationary gameplay, scripted camera sweep, canvas video without audio; not a benchmark',mime};
  const yaw=g.camera.yaw;let first,last=0;
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  record.finished=new Promise(resolve=>recorder.onstop=async()=>{
    stream.getTracks().forEach(t=>t.stop());g.camera.yaw=yaw;
    const bytes=new Uint8Array(await new Blob(chunks,{type:mime}).arrayBuffer());let binary='';
    for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
    record.base64=btoa(binary);record.running=false;resolve(true);
  });
  recorder.start();
  function frame(now){
    first??=now;const t=now-first;
    g.camera.yaw=yaw+Math.sin(t/durationMs*Math.PI*2)*sweep;
    if(t-last>100){trace.push({ms:t,camera:g.camera.camera.position.toArray(),position:g.player.position.toArray()});last=t;}
    if(t<durationMs)requestAnimationFrame(frame);else{record.actualMs=t;recorder.stop();}
  }
  requestAnimationFrame(frame);return 'Recording started';
};
