import * as T from 'three';
import { G, COMMON } from './materials';
import { CLIMATE } from './climate-uniforms';
import { CLIMATE_BUDGET } from '../data/climate';
import type { Quality } from '../core/save';

/** Raymarch a shared hemispherical cloud layer at a bounded rate, then sample it cheaply
 * from the sky dome and its mirror. No full-resolution volume pass per reflection. */
export class Atmosphere {
  readonly target = new T.WebGLRenderTarget(384, 384, {
    type: T.HalfFloatType,
    depthBuffer: false,
    minFilter: T.LinearFilter,
    magFilter: T.LinearFilter,
    wrapS: T.ClampToEdgeWrapping,
    wrapT: T.ClampToEdgeWrapping,
  });
  private readonly scene = new T.Scene();
  private readonly camera = new T.Camera();
  private readonly material: T.ShaderMaterial;
  private quality: Quality = 'low';
  private last = -Infinity;
  private stripe = 0;
  private lastLight = new T.Color(-1, -1, -1);
  constructor() {
    this.target.texture.name = 'Procedural cloud radiance and transmittance';
    CLIMATE.uCloudTexture.value = this.target.texture;
    this.material = new T.ShaderMaterial({
      name: 'Atmosphere · bounded volumetric hemisphere',
      glslVersion: T.GLSL3,
      depthTest: false,
      depthWrite: false,
      uniforms: { ...G, uId: { value: 0 }, uSteps: { value: 12 }, uEye: { value: new T.Vector3() } },
      vertexShader: `out vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform float uSteps;
        uniform vec3 uEye;
        in vec2 vUv;
        layout(location=0) out vec4 cloud;
        float density(vec3 p){
          float h=(p.y-520.)/430.;
          if(h<0. || h>1.)return 0.;
          vec2 drift=uWindTravel*.00012;
          vec2 q=p.xz*.0018-drift+vec2(31.,87.);
          float weather=vnoise(q)*.72+vnoise(q*2.07+13.)*.28;
          vec3 shapeP=vec3(p.x*.007-drift.x*3.9,h*3.3,p.z*.007-drift.y*3.9);
          float shape=vnoise3(shapeP)*.68+vnoise3(shapeP*2.03+7.1)*.32;
          float profile=smoothstep(0.,.13,h)*(1.-smoothstep(.35+weather*.45,1.,h));
          float mass=weather-.83+uCloudCover*.40+(shape-.48)*.40;
          return max(0.,mass)*profile*5.4*smoothstep(0.,.12,uCloudCover);
        }
        void main(){
          if(uCloudCover<.001){cloud=vec4(0.);return;}
          vec2 q=vUv*2.-1.;float rr=dot(q,q);
          if(rr>1.){cloud=vec4(0.);return;}
          vec3 ray=vec3(2.*q.x,1.-rr,2.*q.y)/(1.+rr);
          if(ray.y<.014){cloud=vec4(0.);return;}
          vec3 eye=vec3(uEye.x,clamp(uEye.y,0.,420.),uEye.z);
          float enter=(520.-eye.y)/ray.y,leave=min((950.-eye.y)/ray.y,17000.);
          if(enter>=leave){cloud=vec4(0.);return;}
          float stepSize=(leave-enter)/uSteps;
          float jitter=hash12(floor(gl_FragCoord.xy));
          float t=enter+stepSize*(.25+jitter*.5),trans=1.;
          vec3 accumulated=vec3(0.);
          float towards=clamp(dot(ray,uSkySun),-1.,1.);
          float silver=pow(max(0.,towards),12.);
          for(int i=0;i<32;i++){
            if(float(i)>=uSteps || trans<.018)break;
            vec3 p=eye+ray*t;
            float d=density(p);
            if(d>.006){
              float lightDepth=density(p+uSkySun*100.)*1.75;
              if(uSteps>20.)lightDepth+=density(p+uSkySun*240.)*.85;
              float sun=exp(-lightDepth);
              float height=clamp((p.y-520.)/430.,0.,1.);
              vec3 ambient=mix(uCloudLow*.82,uCloudMid,.24+height*.46);
              vec3 lit=mix(ambient,uCloudTop,sun*(.26+.58*smoothstep(.08,.78,height)));
              lit+=uCloudRim*silver*sun*(1.-sun)*.55;
              lit*=1.-uOvercast*.19;
              lit=mix(lit,skyColor(ray),smoothstep(5500.,17000.,t)*.58);
              float absorb=1.-exp(-d*stepSize*.014);
              accumulated+=trans*absorb*lit;
              trans*=1.-absorb;
            }
            t+=stepSize;
          }
          // High thin ice-cloud filaments stay distinct from the low water-cloud deck.
          vec2 cirrus=ray.xz*(2300.-eye.y)/max(ray.y,.07)*vec2(.0003,.0011)-uWindTravel*.000045;
          float wisps=smoothstep(.55,.73,fbm2(cirrus))*smoothstep(.10,.35,ray.y)*(.13+uCloudCover*.22)*smoothstep(0.,.12,uCloudCover);
          vec3 thin=uWisp*(1.-uOvercast*.2);
          accumulated+=trans*wisps*thin;
          trans*=1.-wisps;
          float alpha=(1.-trans)*smoothstep(.014,.045,ray.y);
          cloud=vec4(accumulated/max(1.-trans,.001),alpha);
        }
      `,
    });
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }
  update(renderer: T.WebGLRenderer, eye: T.Vector3, quality: Quality, time: number) {
    const budget = CLIMATE_BUDGET[quality];
    const stripes = quality === 'high' || quality === 'ultra' ? 4 : 1;
    let fullRefresh = this.last === -Infinity;
    if (this.quality !== quality) {
      this.quality = quality;
      this.target.setSize(budget.skyWidth, budget.skyWidth);
      this.material.uniforms.uSteps.value = budget.skySteps;
      this.last = -Infinity;
      this.stripe = 0;
      fullRefresh = true;
    }
    const light = G.uSunColor.value;
    const changedLight =
      Math.abs(light.r - this.lastLight.r) +
        Math.abs(light.g - this.lastLight.g) +
        Math.abs(light.b - this.lastLight.b) >
      0.18;
    fullRefresh ||= changedLight;
    if (time - this.last < 1 / (budget.skyHz * stripes) && !fullRefresh) return false;
    this.last = time;
    this.lastLight.copy(G.uSunColor.value);
    this.material.uniforms.uEye.value.copy(eye);
    const previous = renderer.getRenderTarget();
    // Sky motion is slow. Refresh disjoint bands of the same radiance cache so
    // expensive presets never put a whole volume march on every gameplay frame.
    // First use, resizing and a large lighting change still initialize every texel.
    const height = this.target.height / stripes;
    this.target.scissorTest = !fullRefresh && stripes > 1;
    this.target.scissor.set(0, this.stripe * height, this.target.width, height);
    this.stripe = (this.stripe + 1) % stripes;
    renderer.setRenderTarget(this.target);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(previous);
    return true;
  }
  stats() {
    return {
      resolution: [this.target.width, this.target.height],
      steps: this.material.uniforms.uSteps.value,
      hz: CLIMATE_BUDGET[this.quality].skyHz,
      bands: this.quality === 'high' || this.quality === 'ultra' ? 4 : 1,
    };
  }
}
