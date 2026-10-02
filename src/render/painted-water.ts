/** Dielectric water with absorption, analytic bed refraction and filtered detail. */
export const PAINTED_WATER = /* glsl */ `
// Two overlapping flow phases reset invisibly. Local flow may curve or accelerate
// without accumulating texture stretching over a long play session.
float waterFlowNoise(vec2 p,vec2 current,vec2 scale,vec2 offset) {
  float phase=fract(uTime*.125),other=fract(phase+.5);
  float a=vnoise((p-current*(phase*8.))*scale+offset);
  float b=vnoise((p-current*(other*8.))*scale+offset);
  return mix(a,b,abs(phase*2.-1.));
}
vec2 waterRipples(vec3 p, vec2 current) {
  // Low keeps geometric waves; omit capillary texture work rather than flattening the surface.
  if(uDetail<.25)return vec2(0.);
  float footprint=max(length(dFdx(p.xz)),length(dFdy(p.xz)));
  vec2 ripple=vec2(waterFlowNoise(p.xz,current,vec2(.75,1.4),vec2(0.)),
    waterFlowNoise(p.xz,current,vec2(1.7,.9),vec2(17.3,31.7)))-.5;
  if(uRain>.02){
    vec2 cell=floor(p.xz*1.7),q=fract(p.xz*1.7)-.5;
    float seed=hash12(cell),life=fract(uWeatherTime*(1.4+seed)+seed*13.);
    q-=vec2(seed-.5,hash12(cell+43.)-.5)*.5;
    float radius=length(q),ring=(radius-life*.5)*48.;
    ripple+=normalize(q+vec2(.001))*cos(ring)*exp(-abs(ring)*.14)*(1.-life)*uRain*.65;
  }
  return ripple*(1.0-smoothstep(.08,.55,footprint))*(.72+uWindStrength*.8);
}
vec3 waterNormal(vec2 ripple,vec2 slope) {return normalize(vec3(-slope.x+ripple.x*.16,1.,-slope.y+ripple.y*.16));}
vec3 waterReflection(vec3 p,vec3 view,vec3 normal) {
  vec3 r=reflect(view,normal);r.y=max(r.y,.015);
  vec3 reflection=skyColor(normalize(r));
  vec3 skyRay=normalize(r);
  vec2 cloudUv=skyRay.xz/(1.+max(0.,skyRay.y))*.5+.5;
  vec4 cloud=texture(uCloudTexture,cloudUv);
  reflection=mix(reflection,cloud.rgb,cloud.a);
  if(uReflOn>.5){
    vec4 pc=uReflMat*vec4(p.x,uReflY,p.z,1.);
    vec2 uv=pc.xy/max(pc.w,.0001)+normal.xz*.035;
    float border=min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y));
    float confidence=smoothstep(0.,.07,border)*step(.0001,pc.w);
    confidence*=1.-smoothstep(.25,2.5,abs(p.y-uReflY));
    reflection=mix(reflection,texture(uRefl,clamp(uv,.001,.999)).rgb,confidence);
  }
  return reflection;
}
vec3 paintedWater(vec3 p,vec3 view,vec3 normal,vec3 reflection,vec4 water) {
  float facing=clamp(dot(-view,normal),0.,1.);
  float fresnel=.025+.925*pow(1.-facing,5.);
  float depth=water.x;
  vec2 bedPos=p.xz+normal.xz*min(depth,2.)*.7;
  float stones=.5;if(uDetail>=.25)stones=vnoise(bedPos*1.6);
  vec3 bed=mix(vec3(.11,.15,.095),vec3(.24,.245,.16),stones);
  vec3 transmission=exp(-vec3(.82,.32,.22)*depth/max(.35,facing));
  vec3 body=mix(vec3(.018,.13,.145),bed,transmission);
  // Fine bed caustics are optional; displacement, absorption and reflection stay on Low.
  if(uDetail>.25){
    float caustic=sin(bedPos.x*2.5+normal.x*12.+uTime*.4)*sin(bedPos.y*2.8+normal.z*12.-uTime*.3);
    float edgeAA=max(fwidth(caustic),.04);
    float light=smoothstep(.72-edgeAA,.96+edgeAA,caustic)*exp(-depth*.85);
    body+=vec3(.065,.085,.055)*light*(1.-uOvercast*.85);
  }
  vec3 color=mix(body,reflection,fresnel);
  if(uGlint>0.){
    vec3 halfVector=normalize(-view+uSkySun);
    float rough=clamp(length(fwidth(normal))*24.,0.,1.);
    float glint=pow(max(dot(normal,halfVector),0.),mix(220.,36.,rough));
    color+=uSunDisk*glint*uGlint*(1.-rough*.7)*.7;
  }
  return color;
}
`;
