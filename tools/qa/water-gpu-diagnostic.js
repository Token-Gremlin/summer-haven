/* Local developer diagnostic. Samples water draw GPU time; never report as FPS. */
window.measureWaterGpu = function(durationMs=10000) {
  const g=window.__haven,gl=g.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if(!ext||g.profiler.enabled||window.__worldPerformance?.running)throw new Error('Idle uninstrumented QA game with GPU timers required');
  const result=window.__waterGpu={running:true,evidence:window.waterEvidence(),samples:{},discarded:0,method:'Per-water-draw GPU timers every eighth frame; diagnostic overhead, not production FPS'};
  const objects=[],pending=[];let serial=0,active=null;
  g.regions.water.traverse(o=>{
    const kind=o===g.regions.spray.drops?'droplets':o===g.regions.spray.mist?'mist':o.geometry?.hasAttribute('aWater')?(o.material.uniforms.falls.value?'fall':'surface'):null;
    if(!kind)return;
    const before=o.onBeforeRender,after=o.onAfterRender;objects.push({o,before,after});
    o.onBeforeRender=function(...args){
      before.apply(this,args);
      if(args[2]!==g.camera.camera||serial%8||pending.length>64||active)return;
      const q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);active={q,kind,object:o};
    };
    o.onAfterRender=function(...args){
      if(active?.object===o){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(active);active=null;}
      after.apply(this,args);
    };
  });
  let start;function frame(now){
    start??=now;serial++;
    const disjoint=gl.getParameter(ext.GPU_DISJOINT_EXT);
    for(let i=pending.length-1;i>=0;i--){const p=pending[i];
      if(disjoint||gl.getQueryParameter(p.q,gl.QUERY_RESULT_AVAILABLE)){
        if(disjoint)result.discarded++;else(result.samples[p.kind]??=[]).push(gl.getQueryParameter(p.q,gl.QUERY_RESULT)/1e6);
        gl.deleteQuery(p.q);pending.splice(i,1);
      }
    }
    if(now-start<durationMs)requestAnimationFrame(frame);else{
      for(const {o,before,after} of objects){o.onBeforeRender=before;o.onAfterRender=after;}
      for(const {q} of pending)gl.deleteQuery(q);
      result.unresolved=pending.length;result.running=false;
      result.summary=Object.fromEntries(Object.entries(result.samples).map(([name,a])=>[name,{count:a.length,meanMs:a.reduce((a,b)=>a+b,0)/a.length,maxMs:Math.max(...a)}]));
    }
  }
  requestAnimationFrame(frame);return 'Diagnostic started';
};
