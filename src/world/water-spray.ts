import * as T from 'three';
import { G, COMMON } from '../render/materials';
import { FALL_SECONDS, FALL_FORWARD_SPEED, WATER_PARTICLES } from '../render/water-motion';
import { mulberry32 } from '../core/rng';
import type { Settings } from '../core/save';

/** Fixed seed buffer; all launch, acceleration, impact and recycling happen on GPU.
 * A spray approximation, not a mass-conserving particle fluid solver.
 */
export class WaterSpray {
  readonly group=new T.Group();
  readonly drops:T.Points<T.BufferGeometry,T.ShaderMaterial>;
  readonly mist:T.InstancedMesh;
  constructor(){
    this.group.name='Silverveil gravity spray';
    const rng=mulberry32(4109),seeds=new Float32Array(WATER_PARTICLES.ultra*3);
    for(let i=0;i<seeds.length;i++)seeds[i]=rng();
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(seeds,3));
    geometry.boundingSphere=new T.Sphere(new T.Vector3(366,36,-713),36);
    geometry.setDrawRange(0,WATER_PARTICLES.low);
    const material=new T.ShaderMaterial({glslVersion:T.GLSL3,transparent:true,depthWrite:false,
      uniforms:{...G,uId:{value:2},uOpacity:{value:1}},
      vertexShader:/* glsl */`
        uniform float uTime,uWaterPixels;out float vAlpha;out vec3 vWorld;
        void main(){
          vec3 seed=position;float mode=fract(seed.x*17.13+seed.z*31.71);
          vec3 p;float life;
          if(mode<.70){
            float age=fract(seed.y+uTime/${FALL_SECONDS.toFixed(8)})*${FALL_SECONDS.toFixed(8)};
            life=age/${FALL_SECONDS.toFixed(8)};
            float spread=sin(life*3.14159);
            p=vec3(356.4+seed.x*19.2+(seed.z-.5)*spread*.8,
              54.08-4.905*age*age,-730.+${FALL_FORWARD_SPEED.toFixed(8)}*age);
            p.z+=(seed.z-.28)*spread*1.4;
            vAlpha=smoothstep(0.,.1,life)*(1.-smoothstep(.91,1.,life))*.54;
          }else{
            float launch=2.2+seed.z*4.6;
            float duration=2.*launch/9.81;
            float age=fract(seed.y+uTime/duration)*duration;life=age/duration;
            float angle=seed.z*6.28318+seed.x*19.;
            p=vec3(357.+seed.x*18.,18.10,-707.2+seed.z*2.1);
            p+=vec3(cos(angle)*(1.+seed.z*3.)*age,launch*age-4.905*age*age,(1.5+sin(angle)*1.8)*age);
            vAlpha=sin(life*3.14159)*.55;
          }
          vec4 eye=viewMatrix*vec4(p,1.);vWorld=p;
          float fade=1.-smoothstep(100.,250.,length(eye.xyz));
          vAlpha*=fade;
          gl_PointSize=clamp(uWaterPixels*.065/max(1.,-eye.z)*( .55+seed.z),.7,3.5);
          gl_Position=projectionMatrix*eye;
        }`,
      fragmentShader:/* glsl */`
        uniform float uOpacity;in float vAlpha;in vec3 vWorld;
        layout(location=0)out vec4 col;layout(location=1)out vec4 meta;
        ${COMMON}
        void main(){
          vec2 q=gl_PointCoord*2.-1.;float r=dot(q,q);if(r>1.)discard;
          float a=(1.-smoothstep(.16,1.,r))*vAlpha*uOpacity;
          vec3 color=mix(vec3(.65,.80,.82),uSkyHorizon,.20)*mix(1.,.32,uNight);
          col=vec4(applyFog(color,vWorld),a);meta=vec4(.5,.5,2./32.,0.);
        }`});
    this.drops=new T.Points(geometry,material);this.drops.name='GPU ballistic water droplets';this.drops.renderOrder=3;
    const mistMaterial=new T.ShaderMaterial({glslVersion:T.GLSL3,transparent:true,depthWrite:false,side:T.DoubleSide,
      uniforms:{...G},vertexShader:/* glsl */`
        uniform float uTime;out vec2 vUv;out float life;out vec3 vWorld;
        void main(){vUv=uv;vec4 p=modelMatrix*instanceMatrix*vec4(0,0,0,1);
          life=fract(uTime*.15+p.x*.31+p.z*.43);p.y+=life*3.;p.x+=sin(life*2.+p.x)*.6;p.z+=life*1.8;vWorld=p.xyz;
          vec4 eye=viewMatrix*p;eye.xy+=position.xy*length(instanceMatrix[0].xyz)*(1.+life*.6);
          gl_Position=projectionMatrix*eye;}`,
      fragmentShader:/* glsl */`
        uniform float uNight;uniform vec3 uSkyHorizon;in vec2 vUv;in float life;in vec3 vWorld;
        layout(location=0)out vec4 col;layout(location=1)out vec4 meta;
        void main(){float r=length((vUv-.5)*2.);float a=(1.-smoothstep(.0,1.,r))*sin(life*3.14159)*.075;
          col=vec4(mix(vec3(.62,.74,.75),uSkyHorizon,.3)*mix(1.,.3,uNight),a);meta=vec4(.5,.5,2./32.,0.);}`});
    this.mist=new T.InstancedMesh(new T.PlaneGeometry(2,2),mistMaterial,16);
    const o=new T.Object3D();for(let i=0;i<16;i++){
      o.position.set(357+rng()*18,18.4+rng()*.6,-707+rng()*2);o.scale.setScalar(1.2+rng());o.updateMatrix();this.mist.setMatrixAt(i,o.matrix);
    }
    this.mist.computeBoundingSphere();this.mist.boundingSphere!.radius+=7;this.mist.renderOrder=4;this.mist.name='Localized impact vapor';
    this.group.add(this.drops,this.mist);
  }
  update(position:T.Vector3,settings:Settings,range:number){
    this.group.visible=Math.hypot(position.x-366,position.z+713)<Math.min(270,range+65);
    this.drops.geometry.setDrawRange(0,WATER_PARTICLES[settings.quality]);
    // Keep aggregate opacity controlled as the density increases.
    this.drops.material.uniforms.uOpacity.value=settings.quality==='ultra'?.38:settings.quality==='high'?.6:1;
    this.mist.count=settings.quality==='low'?8:16;
  }
}
