import * as T from 'three';
import { COMMON, OUT, G } from './materials';
import { WOODLAND, TREE_WIND, TREE_SAMPLERS } from './woodland-shared';
import { CLIMATE_SURFACES } from './climate-uniforms';

const cache = new Map<number, T.ShaderMaterial>();
/** Alpha-tested botanical sprays; all three scene passes use the same foliage silhouette. */
export function woodlandMaterial(level: number) {
  const existing = cache.get(level);
  if (existing) return existing;
  const material = new T.ShaderMaterial({
    name: `Woodland LOD ${level}`,
    glslVersion: T.GLSL3,
    side: T.DoubleSide,
    vertexColors: true,
    alphaToCoverage: true,
    uniforms: { ...G, ...WOODLAND, uId: { value: 6 }, uMask: { value: -1 }, uLevel: { value: level } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uWindDir;
      uniform float uWindStrength,uWindPhase;
      uniform vec3 uViewOrigin;
      in float aMat, aWind;
      out vec3 vWPos, vN, vCol;
      out vec2 vUv;
      out float vDistance, vHeight;
      flat out int vSurface;
      ${TREE_WIND}
      void main(){
        mat4 m=modelMatrix;
        #ifdef USE_INSTANCING
          m=modelMatrix*instanceMatrix;
        #endif
        vec4 wp=m*vec4(position,1.);
        wp.xyz+=woodlandWind(wp.xyz,aWind);
        vWPos=wp.xyz;vN=normalize(mat3(m)*normal);vCol=color;
        #ifdef USE_INSTANCING_COLOR
          vCol*=instanceColor;
        #endif
        vUv=uv;vHeight=position.y;vSurface=int(aMat+.5);
        vDistance=length(m[3].xz-uViewOrigin.xz);
        gl_Position=projectionMatrix*viewMatrix*wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${CLIMATE_SURFACES}
      ${OUT}
      ${TREE_SAMPLERS}
      uniform sampler2D uTreeBark;
      uniform vec3 uTreeBands;
      uniform float uLevel;
      in vec3 vWPos,vN,vCol;
      in vec2 vUv;
      in float vDistance,vHeight;
      flat in int vSurface;
      void main(){
        // Complementary coverage between adjacent levels, never two solid surfaces z-fighting.
        float lod=(uTreeBands.x<.1?1.:smoothstep(uTreeBands.x-2.,uTreeBands.x+2.,vDistance));
        lod+=smoothstep(uTreeBands.y-4.,uTreeBands.y+4.,vDistance);
        lod+=smoothstep(uTreeBands.z-8.,uTreeBands.z+8.,vDistance);
        float noise=hash12(floor(gl_FragCoord.xy));
        if(uLevel>=0. && abs(floor(lod+noise)-uLevel)>.1)discard;
        float distanceXZ=length(vWPos.xz-uViewOrigin.xz);
        float coverage=uWorldRange.y>1000.?1.:1.-smoothstep(uWorldRange.x,uWorldRange.y,distanceXZ);
        if(coverage<.001)discard;
        vec3 N=normalize(vN),base,col;
        float mask=-1.;
        gFastShadow=true;
        if(vSurface<36){
          vec4 leaf=treeLeaf(vUv,vSurface);
          // Derivative coverage, mipmaps and MSAA stabilize the many subpixel leaf edges.
          float a=clamp((leaf.a-.38)/max(fwidth(leaf.a),.06)+.5,0.,1.);
          if(vSurface!=35)a*=1.-smoothstep(.05,.92,uSeason.w)*.99;
          if(a<.02)discard;
          gAlpha=a*coverage*smoothstep(.18,.65,distance(vWPos,cameraPosition));
          base=leaf.rgb*vCol;
          // The supplied aspen photograph is golden; keep this summer population green.
          if(vSurface==34)base*=vec3(.38,1.28,1.35);
          base=seasonalGreen(base,vWPos,vSurface==35?1.:0.,0.);
          if(vSurface==35)base=mix(base,vec3(.72,.81,.84),snowMask(vWPos,N)*.85);
          N=normalize(mix(N,vec3(0.,1.,0.),.18));
          // One depth sample is enough within a textured leaf spray. Bark and ground
          // retain normal soft shadows; avoid four PCF reads on every overlapping leaf.
          float sv=1.,ndl=dot(N,uSunDir);
          if(uShadowOn>.5){
            vec4 sc=uShadowMat*vec4(vWPos+N*.06+uSunDir*.04,1.);
            vec3 s=sc.xyz/sc.w;
            if(all(greaterThan(s,vec3(0.)))&&all(lessThan(s,vec3(1.)))){
              float lit=step(s.z-.0008,texture(uShadowMap,s.xy).r);
              float edge=smoothstep(uShadowHalf*.82,uShadowHalf*.98,max(abs(vWPos.x-uShadowCenter.x),abs(vWPos.z-uShadowCenter.z)));
              sv=mix(.5+.5*lit,1.,edge);
            }
          }
          float diffuse=smoothstep(-.35,.8,ndl);
          vec3 V=normalize(cameraPosition-vWPos);
          // Soft leaf transmission, strongest looking into the light; veins remain in the texture.
          float transmission=pow(max(0.,dot(-V,uSunDir)),3.)*.24;
          vec3 shade=mix(vec3(.29,.40,.32),uShadowTint*.70,.35);
          col=base*(shade+uSunColor*(diffuse*.88+transmission)*sv);
          col+=base*uSkyMid*.10*(.5+.5*N.y);
        }else{
          if(!gl_FrontFacing)N=-N;
          vec3 bark=texture(uTreeBark,vUv*vec2(2.,3.)).rgb;
          base=mix(bark,vec3(dot(bark,vec3(.2126,.7152,.0722))),.22)*vCol;
          if(vSurface==38)base=mix(base,vec3(.49,.51,.45)*(.65+bark.g*.5),.76);
          if(vSurface==37)base=mix(base,vec3(dot(base,vec3(.2126,.7152,.0722))),.35);
          if(vSurface==39)base*=vec3(.84,.78,.70);
          float moss=(1.-smoothstep(.05,1.65,vHeight))*smoothstep(.40,.75,vnoise(vWPos.xz*2.+vWPos.y*.3));
          base=mix(base,vec3(.065,.11,.043),moss*.65);
          base=climateBase(base,N,vWPos,9);
          col=toon(base,N,vWPos,.07,.20,.18,.14);
          gAlpha=coverage;mask=.08;
        }
        col*=climateCloudShade(vWPos);
        writeOut(applyFog(col,vWPos),N,mask);
      }
    `,
  });
  cache.set(level, material);
  return material;
}
