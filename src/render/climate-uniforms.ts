import * as T from 'three';
export const CLIMATE = {
  uSeason: { value: new T.Vector4(0, 1, 0, 0) },
  uClimateOutside: { value: 1 },
  uWetness: { value: 0 },
  uSnowCover: { value: 0 },
  uRain: { value: 0 },
  uSnowfall: { value: 0 },
  uCloudCover: { value: 0.46 },
  uOvercast: { value: 0 },
  uWindStrength: { value: 0.35 },
  uWindPhase: { value: 0 },
  uWindTravel: { value: new T.Vector2() },
  uWeatherTime: { value: 0 },
  uCloudTexture: { value: null as T.Texture | null },
};
export const CLIMATE_GLSL = /* glsl */ `
uniform vec4 uSeason;
uniform float uClimateOutside, uWetness, uSnowCover, uRain, uSnowfall, uCloudCover, uOvercast;
uniform float uWindStrength, uWindPhase, uWeatherTime;
uniform vec2 uWindTravel;
`;
/** The maximum displacement remains inside the existing vegetation camera envelopes. */
export const SHARED_WIND = /* glsl */ `
vec3 climateWind(vec3 wp, float weight) {
  float wave = sin(dot(wp.xz,uWindDir)*.22-uWindPhase*2.1)*.5+.5;
  float gust = .38+.48*wave*wave;
  float flutter = sin(uWindPhase*3.3+dot(wp.xz,vec2(1.7,2.3)))*.085;
  float bend = (gust+flutter)*.42*uWindStrength;
  return vec3(uWindDir.x*bend,-gust*gust*.11*uWindStrength,uWindDir.y*bend)*weight;
}
`;
/** Included after COMMON's noise helpers. All coordinates are stable in the world. */
export const CLIMATE_SURFACES = /* glsl */ `
vec3 seasonalGreen(vec3 base, vec3 wp, float evergreen, float grass) {
  if(uSeason.y>.9999)return base;
  float variation = vnoise(wp.xz*.06 + vec2(wp.y*.035,0.));
  float lum = max(dot(base,vec3(.2126,.7152,.0722)),.006);
  vec3 gold = mix(vec3(.55,.055,.008),vec3(.68,.34,.025),variation);
  gold = mix(gold,vec3(.33,.255,.083),grass*.8);
  base = mix(base, gold*lum/.24, uSeason.z*(1.-evergreen)*.92);
  base = mix(base,base*vec3(1.08,1.2,.9),uSeason.x*.7);
  base = mix(base,vec3(.22,.23,.19)*lum/.2,uSeason.w*(1.-evergreen)*.72);
  return base;
}
float climateCloudShade(vec3 wp) {
  if(uClimateOutside<.5)return 1.;
  vec2 projected=wp.xz+uSkySun.xz*(650.-wp.y)/max(.18,uSkySun.y);
  float shade=vnoise(projected*.0018-uWindTravel*.00012+vec2(31.,87.));
  return mix(1.,.72,smoothstep(.53,.68,shade+uCloudCover*.2)*(.2+.8*uOvercast));
}
float snowMask(vec3 wp, vec3 N) {
  if(uSnowCover<.001 || uClimateOutside<.5)return 0.;
  float breakup=vnoise(wp.xz*.45+wp.y*.1);
  float amount=uSnowCover*(1.+min(.13,max(0.,wp.y-45.)*.001));
  return smoothstep(.12,.55,N.y)*smoothstep(breakup*.22,.32+breakup*.38,amount)*uClimateOutside;
}
vec3 climateBase(vec3 base,vec3 N,vec3 wp,int surface) {
  if(uClimateOutside<.5 || uId==13. || uId==14. || uId==18. || uId==19. || uId==12.)return base;
  bool meadow=surface==11 && base.g>base.r*1.12;
  if(surface==6 || meadow)base=seasonalGreen(base,wp,0.,1.);
  if(meadow && (uSeason.x>.02 || uSeason.z>.02)){
    vec2 p=wp.xz*5.,cell=floor(p),q=fract(p)-.5;
    float seed=hash12(cell);
    q-=vec2(seed-.5,hash12(cell+39.)-.5)*.55;
    float aa=max(length(fwidth(p)),.02);
    float petal=1.-smoothstep(.08,.14+aa,length(q));
    float surfacePatch=smoothstep(.5,.72,vnoise(wp.xz*.13));
    vec3 bloom=mix(vec3(.8,.39,.52),vec3(.86,.78,.48),seed);
    base=mix(base,bloom,petal*surfacePatch*uSeason.x*.8);
    float leaf=(1.-smoothstep(.055,.095+aa,abs(q.x)))*(1.-smoothstep(.12,.23+aa,abs(q.y)));
    base=mix(base,mix(vec3(.27,.07,.015),vec3(.48,.22,.025),seed),leaf*uSeason.z*.8);
  }
  bool solid=surface==0||surface==2||surface==3||surface==9||surface==11||surface==13||surface==19||surface==25||surface==6;
  if(solid){
    base*=1.-uWetness*.28*max(N.y,.18);
    float snow=snowMask(wp,N);
    vec3 white=vec3(.80,.87,.91)*(.92+.08*vnoise(wp.xz*3.1));
    base=mix(base,white,snow);
  }
  return base;
}
float rainfallRings(vec2 wp) {
  vec2 cell=floor(wp*1.5),q=fract(wp*1.5)-.5;
  float seed=hash12(cell);
  q-=vec2(seed-.5,hash12(cell+41.)-.5)*.55;
  float life=fract(uWeatherTime*(1.3+seed)+seed*17.);
  float ring=abs(length(q)-life*.48);
  float width=max(fwidth(length(q))*1.4,.014);
  return (1.-smoothstep(width,width*2.,ring))*pow(1.-life,2.)*uRain;
}
vec3 climateFinish(vec3 col,vec3 N,vec3 wp,int surface,float porous) {
  if(uClimateOutside<.5 || uId==13. || uId==14. || uId==18. || uId==19. || uId==12.)return col;
  col*=climateCloudShade(wp);
  if((surface==11||surface==13||surface==3||surface==0) && uWetness>.02){
    vec3 V=normalize(cameraPosition-wp);
    float wet=uWetness*smoothstep(.5,.92,N.y)*(1.-snowMask(wp,N))*(1.-porous);
    float surfacePatch=smoothstep(.52,.68,vnoise(wp.xz*.48));
    float fresnel=.035+.7*pow(1.-max(dot(N,V),0.),4.);
    col=mix(col,skyColor(reflect(-V,N)),wet*surfacePatch*fresnel*.72);
    if(distance(wp,cameraPosition)<45.)col+=rainfallRings(wp.xz)*wet*.035;
  }
  return col;
}
`;
