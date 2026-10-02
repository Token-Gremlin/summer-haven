import * as T from 'three';
import { G, COMMON, REFL } from '../render/materials';
import { PAINTED_WATER } from '../render/painted-water';
import { WATER_MOTION, FALL_SECONDS } from '../render/water-motion';
import { regionRiverSample, REGION_WATER_LIFT } from '../data/regions';
import { prepareWaterSurface } from './water-surface';

export interface RiverWake { body: { value: T.Vector4 }; height: { value: number }; }

/** One continuous material language from the headwater to the village outlet. */
export function riverMaterial(falls = false, pool = false, wake?: RiverWake) {
  return new T.ShaderMaterial({
    glslVersion:T.GLSL3,side:T.DoubleSide,transparent:falls,depthWrite:!falls,
    uniforms:{...G,...REFL,uId:{value:2},falls:{value:falls?1:0},pool:{value:pool?1:0},
      swimmer:wake?.body??{value:new T.Vector4()},swimmerHeight:wake?.height??{value:0}},
    vertexShader:/* glsl */`
      uniform float uTime,falls; in vec4 aWater;
      out vec2 vUv,vWaveSlope;out vec3 vWorld,vBase;out vec4 vWater;
      ${WATER_MOTION}
      void main(){
        vUv=uv;vWater=aWater;vWaveSlope=vec2(0.);vec3 p=(modelMatrix*vec4(position,1.)).xyz;vBase=p;
        if(falls>.5){
          float t=clamp((p.z+730.)/22.,0.,1.);
          float birth=uTime-t*${FALL_SECONDS.toFixed(8)};
          float envelope=sin(t*3.14159265);
          float fold=sin(p.x*1.65+birth*3.)*.32+sin(p.x*3.8-birth*4.7)*.12;
          p.z+=fold*envelope;
          p.y+=cos(p.x*2.3+birth*3.4)*envelope*.16;
        }else{vec3 wave=waterMotion(p,aWater);p.y+=wave.x;vWaveSlope=wave.yz;}
        vWorld=p;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
      }`,
    fragmentShader:/* glsl */`
      uniform float falls,pool,swimmerHeight;uniform vec4 swimmer;
      uniform sampler2D uRefl;uniform mat4 uReflMat;uniform float uReflOn,uReflY;
      in vec2 vUv,vWaveSlope;in vec3 vWorld,vBase;in vec4 vWater;
      layout(location=0)out vec4 col;layout(location=1)out vec4 meta;
      ${COMMON}
      ${WATER_MOTION}
      ${PAINTED_WATER}
      void main(){
        vec3 view=normalize(vWorld-cameraPosition);
        vec3 normal,base;float alpha=1.;
        if(falls>.5){
          float t=clamp((vBase.z+730.)/22.,0.,1.);
          float birth=uTime-t*${FALL_SECONDS.toFixed(8)};
          float ropes=vnoise(vec2(vBase.x*1.25,birth*1.8));
          float fine=vnoise(vec2(vBase.x*4.2,birth*4.1));
          float aeration=smoothstep(.16,.94,t);
          float breakup=smoothstep(.28,.78,ropes*.72+fine*.28);
          normal=normalize(cross(dFdx(vWorld),dFdy(vWorld)));
          if(dot(normal,-view)<0.)normal=-normal;
          vec3 reflected=skyColor(reflect(view,normal));
          float sheen=pow(1.-max(dot(-view,normal),0.),3.);
          base=mix(vec3(.035,.18,.20),reflected,.18+sheen*.28);
          float froth=clamp(breakup*(.38+.5*aeration)+aeration*.14,0.,.9);
          base=mix(base,vec3(.64,.78,.77),froth);
          float ribLight=max(dot(normal,uSunDir),0.);
          base*=.8+ribLight*.35;
          float edge=smoothstep(0.,.06,vUv.x)*smoothstep(0.,.06,1.-vUv.x);
          alpha=mix(.45,.97,breakup)*mix(.45,1.,edge);
        }else{
          vec2 ripple=waterRipples(vWorld,vec2(vWater.y,sqrt(max(0.,1.-vWater.y*vWater.y)))*vWater.z);
          normal=waterNormal(ripple,uDetail<.25?vWaveSlope:waterMotion(vBase,vWater).yz);
          base=paintedWater(vWorld,view,normal,waterReflection(vWorld,view,normal),vWater);
          // Quiet downstream water has no foam work. Pool/rapids retain it on every preset.
          if(vWater.z>.9 || abs(vBase.y-18.08)<.5){
          vec2 flow=vec2(vWater.y,sqrt(max(0.,1.-vWater.y*vWater.y)))*vWater.z;
          float foamNoise=waterFlowNoise(vBase.xz,flow,vec2(.95,.7),vec2(0.));
          float foamFine=foamNoise;
          if(uDetail>=.25)foamFine=waterFlowNoise(vBase.xz,flow,vec2(2.3),vec2(foamNoise*2.));
          float edgeAA=max(fwidth(foamFine),.035);
          float lace=smoothstep(.49-edgeAA,.69+edgeAA,foamFine)*(1.-smoothstep(.80,.96,foamFine));
          vec2 impact=(vBase.xz-vec2(366.,-707.))*vec2(.11,.24);
          float radius=length(impact);
          float receiving=1.-smoothstep(.1,.5,abs(vBase.y-18.08));
          float churn=(1.-smoothstep(.18,1.85,radius))*receiving;
          float wake=sin(radius*11.-uTime*2.5+foamNoise*2.);
          float rings=smoothstep(.8-max(fwidth(wake),.04),1.,wake)*exp(-radius*.9)*receiving;
          float rapids=smoothstep(.9,1.9,vWater.z)*vWater.w*.20;
          float foam=clamp(churn*(.14+.65*lace)+rings*lace*.17+rapids*lace,0.,.8);
          base=mix(base,vec3(.62,.76,.72),foam);
          }
          if(swimmer.w>0. && abs(vBase.y-swimmerHeight)<.3 && distance(vBase.xz,swimmer.xy)<15.){
            vec2 d=vBase.xz-swimmer.xy;float c=cos(swimmer.z),s=sin(swimmer.z);
            vec2 local=vec2(d.x*c-d.y*s,d.x*s+d.y*c);
            float edge=length(vec2(local.x/1.34,(local.y+.6)/4.45));
            float broken=smoothstep(.32,.72,vnoise(local*1.25+vec2(uTime*.23,0.)));
            float flanks=smoothstep(.15,.8,abs(local.x));
            float contact=(1.-smoothstep(.015,.075,abs(edge-1.)))*broken*flanks;
            float pulse=fract(uTime*.28);
            float smallRipple=(1.-smoothstep(.007,.024,abs(edge-1.02-pulse*.30)))*(1.-pulse)*.12*broken*flanks;
            float trailing=-local.y-4.;
            float trail=(1.-smoothstep(.05,.19,abs(abs(local.x)-(.72+trailing*.26))))
              *smoothstep(0.,1.,trailing)*(1.-smoothstep(2.,5.,trailing))*swimmer.w;
            base=mix(base,vec3(.48,.64,.58),clamp((contact*.14+smallRipple+trail*.12)*(.4+.6*swimmer.w),0.,.38));
          }
        }
        float shade=shadowVis(vWorld,normal);
        base*=mix(.75,1.,shade);
        col=vec4(applyFog(base,vWorld),alpha);
        vec3 vn=normalize(mat3(viewMatrix)*normal);meta=vec4(vn.xy*.5+.5,uId/32.,0.);
      }`,
  });
}

/** The clipped pool is subdivided after the one-owner footprint operation. */
export function waterfallPool(){
  const geometry=new T.CircleGeometry(1,72).rotateX(-Math.PI/2).scale(22,1,18).translate(370,18+REGION_WATER_LIFT,-698);
  const mesh:T.Mesh<T.BufferGeometry>=new T.Mesh(geometry,riverMaterial(false,true));
  mesh.name='Silverveil receiving pool';return mesh;
}

/** Coarse footprint is also used by clipping tests; animation is exclusively GPU-side. */
export function riverReach(z0:number,z1:number,falls=false,wake?:RiverWake){
  const rows=Math.ceil(Math.abs(z1-z0)/(falls?.32:1.6)),cols=falls?64:16;
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let i=0;i<=rows;i++){
    const z=T.MathUtils.lerp(z0,z1,i/rows),s=regionRiverSample(z),t=T.MathUtils.clamp((z+730)/22,0,1);
    for(let j=0;j<=cols;j++){
      const u=j/cols;
      const rib=falls?Math.sin(u*31+t*3)*.13*Math.sin(t*Math.PI):0;
      positions.push(s.x+(u*2-1)*s.halfWidth,s.y+REGION_WATER_LIFT+rib,z);uvs.push(u,falls?t:i/rows);
      if(i<rows&&j<cols){const k=i*(cols+1)+j;indices.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();prepareWaterSurface(geometry);
  geometry.boundingSphere!.radius+=falls?.6:0;
  const mesh=new T.Mesh(geometry,riverMaterial(falls,false,wake));
  mesh.name=falls?'Silverveil falling current':'Connected river reach';
  if(falls)mesh.renderOrder=2;return mesh;
}
