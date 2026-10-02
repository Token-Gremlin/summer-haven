import * as T from 'three';
import { G, COMMON } from './materials';
import { CLIMATE_BUDGET, type ClimateState } from '../data/climate';
import type { Quality } from '../core/save';
import { WeatherSurface } from '../world/weather-surface';
import { mulberry32 } from '../core/rng';

export class Precipitation {
  readonly group = new T.Group();
  private meshes: T.Mesh<T.InstancedBufferGeometry, T.ShaderMaterial>[] = [];
  constructor(readonly surface: WeatherSurface) {
    this.group.name = 'Weather · rain, snow, petals and falling leaves';
    const max = CLIMATE_BUDGET.ultra;
    [max.rain, max.snow, max.drift, max.splashes].forEach((count, mode) => {
      const plane = new T.PlaneGeometry(1, 1),
        geometry = new T.InstancedBufferGeometry();
      geometry.setIndex(plane.index);
      for (const [key, attribute] of Object.entries(plane.attributes)) geometry.setAttribute(key, attribute);
      const r = mulberry32(56017 + mode * 53),
        seeds = new Float32Array(count * 4);
      for (let i = 0; i < seeds.length; i++) seeds[i] = r();
      geometry.setAttribute('aSeed', new T.InstancedBufferAttribute(seeds, 4));
      geometry.instanceCount = 0;
      const material = new T.ShaderMaterial({
        name: ['Rain streaks', 'Snow crystals', 'Seasonal drift', 'Rain impacts'][mode],
        glslVersion: T.GLSL3,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: T.DoubleSide,
        uniforms: {
          ...G,
          uId: { value: 0 },
          uMode: { value: mode },
          uCatchment: { value: surface.texture },
          uArea: { value: surface.area },
          uEmitters: { value: surface.emitters },
          uEmitterCount: { value: 0 },
        },
        vertexShader: /* glsl */ `
          ${COMMON}
          uniform float uMode,uEmitterCount;
          uniform sampler2D uCatchment;
          uniform vec4 uArea,uEmitters[24];
          in vec4 aSeed;
          out vec2 vUv;
          out vec3 vWorld;
          out float vAlpha,vRandom;
          float floorAt(vec2 p){return texture(uCatchment,clamp((p-uArea.xy)/uArea.z,vec2(0.),vec2(1.))).r;}
          void main(){
            float radius=uMode<.5?27.:uMode<1.5?25.:18.;
            vec2 drift=uWindTravel*(uMode<.5?.18:.32);
            vec2 xz=cameraPosition.xz+mod(aSeed.xy*radius*2.+drift-cameraPosition.xz+radius,radius*2.)-radius;
            float floorY=floorAt(xz);
            float speed=uMode<.5?9.+aSeed.z*5.:.55+aSeed.z*.85;
            float y=cameraPosition.y+mod(aSeed.z*34.-uWeatherTime*speed-cameraPosition.y+12.,34.)-12.;
            vec3 wp=vec3(xz.x,y,xz.y);
            float alpha=smoothstep(floorY+.04,floorY+.4,y)*(1.-smoothstep(radius*.75,radius,length(xz-cameraPosition.xz)));
            vec2 scale=uMode<.5?vec2(.009+aSeed.w*.008,.32+aSeed.z*.28):vec2(.028+aSeed.w*.035);
            if(uMode>.5 && uMode<1.5){
              wp.xz+=vec2(sin(uWeatherTime*.8+aSeed.w*37.),cos(uWeatherTime*.61+aSeed.z*29.))*.5;
              alpha*=smoothstep(floorAt(wp.xz)+.04,floorAt(wp.xz)+.4,wp.y);
            }
            if(uMode>1.5 && uMode<2.5){
              int index=int(mod(floor(aSeed.x*1700.),max(1.,uEmitterCount)));
              vec4 emitter=uEmitters[index];
              float age=fract(aSeed.w+uWeatherTime*(.055+aSeed.z*.028));
              float fall=max(2.,emitter.y-floorAt(emitter.xz));
              wp=emitter.xyz+vec3((aSeed.y-.5)*emitter.w*2.,-age*fall,(aSeed.z-.5)*emitter.w*2.);
              wp.xz+=uWindDir*uWindStrength*age*4.+vec2(sin(age*15.+aSeed.w*40.),cos(age*12.+aSeed.y*9.))*.65;
              scale=vec2(.05,.085)*(1.+uSeason.z*.65);
              alpha=smoothstep(0.,.12,age)*(1.-smoothstep(.75,1.,age))*step(.5,uEmitterCount);
              alpha*=smoothstep(floorAt(wp.xz)+.03,floorAt(wp.xz)+.35,wp.y);
            }
            if(uMode>2.5){
              float age=fract(aSeed.w+uWeatherTime*(1.5+aSeed.z));
              float t=age*.22;
              wp.y=floorY+.025+max(0.,1.1*t-4.905*t*t);
              scale=vec2(.025+age*.055,.045*(1.-age));
              alpha=(1.-age)*uRain;
            }
            vec4 view=viewMatrix*vec4(wp,1.);
            vec2 offset=position.xy*scale;
            if(uMode<.5){
              vec3 velocity=mat3(viewMatrix)*vec3(uWindDir.x*uWindStrength*2.5,-speed,uWindDir.y*uWindStrength*2.5);
              vec2 along=normalize(-velocity.xy+vec2(0.,.001));
              offset=vec2(along.y,-along.x)*position.x*scale.x+along*position.y*scale.y;
            }else if(uMode<2.5){
              float angle=uWeatherTime*(1.+aSeed.x*2.)+aSeed.y*40.;
              offset=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*offset;
            }
            view.xy+=offset;
            gl_Position=projectionMatrix*view;
            vUv=uv;vWorld=wp;vAlpha=alpha*smoothstep(.8,2.5,length(wp-cameraPosition));vRandom=aSeed.w;
          }
        `,
        fragmentShader: /* glsl */ `
          ${COMMON}
          uniform float uMode;
          in vec2 vUv;
          in vec3 vWorld;
          in float vAlpha,vRandom;
          layout(location=0) out vec4 gColor;
          layout(location=1) out vec4 gNormal;
          void main(){
            vec2 p=vUv-.5;
            float alpha=vAlpha;
            vec3 colour=mix(vec3(.56,.66,.73),vec3(.9,.95,1.),.55);
            if(uMode<.5){
              alpha*=(1.-smoothstep(.09,.48,abs(p.x)))*(1.-smoothstep(.15,.5,abs(p.y)))*.36;
            }else if(uMode<1.5){
              float d=length(p);
              alpha*=(1.-smoothstep(.16,.5,d))*.85;
              colour=vec3(.92,.97,1.);
            }else if(uMode<2.5){
              float shape=1.-smoothstep(.12,.24,abs(p.x)/(max(.15,1.-p.y*p.y*3.5)));
              alpha*=shape*(1.-smoothstep(.42,.5,abs(p.y)));
              vec3 petal=mix(vec3(.96,.60,.70),vec3(1.,.83,.87),vRandom);
              vec3 leaf=mix(vec3(.48,.08,.012),vec3(.92,.49,.03),vRandom);
              colour=mix(petal,leaf,uSeason.z/max(.01,uSeason.x+uSeason.z));
              colour*=.8+.2*smoothstep(.0,.025,abs(p.x));
            }else{
              alpha*=(1.-smoothstep(.12,.5,length(p)))*.30;
            }
            alpha*=1.-smoothstep(22.,42.,length(vWorld-cameraPosition));
            if(alpha<.015)discard;
            colour*=mix(vec3(.7,.78,.86),uSunColor*.75+vec3(.25),.55);
            colour*=mix(vec3(1.),uWorldTint,.65);
            gColor=vec4(colour,alpha);
            // Preserve the opaque normal/outline buffer below the transparent particles.
            gNormal=vec4(0.);
          }
        `,
      });
      const mesh = new T.Mesh(geometry, material);
      mesh.name = material.name;
      mesh.frustumCulled = false;
      mesh.renderOrder = 5;
      mesh.visible = false;
      this.meshes.push(mesh);
      this.group.add(mesh);
    });
  }
  update(state: ClimateState, quality: Quality, outside: boolean, eye: T.Vector3) {
    const b = CLIMATE_BUDGET[quality];
    const strengths = [
      state.rain,
      state.snowfall,
      (state.season[0] + state.season[2]) * (0.35 + state.wind * 0.65),
      state.rain,
    ];
    const counts = [b.rain, b.snow, b.drift, b.splashes];
    this.group.visible = outside;
    if (outside && strengths.some((v) => v > 0.015)) this.surface.update(eye);
    this.meshes.forEach((mesh, i) => {
      mesh.geometry.instanceCount = strengths[i] > 0.015 ? Math.ceil(counts[i] * strengths[i]) : 0;
      mesh.visible = mesh.geometry.instanceCount > 0;
      mesh.material.uniforms.uEmitterCount.value = this.surface.emitterCount;
    });
  }
  stats() {
    return {
      counts: this.meshes.map((m) => m.geometry.instanceCount),
      visible: this.group.visible,
      catchmentRebuilds: this.surface.rebuilds,
    };
  }
}
