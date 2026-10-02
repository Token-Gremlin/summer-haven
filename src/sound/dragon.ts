import type { Vector3 } from 'three';
import type { DragonPhase } from '../world/dragon';

/** A rounded breath/call and broad wing rush, routed through the existing final audio bus. */
export class DragonVoice {
  private readonly noise:AudioBuffer;
  private readonly gain:GainNode;
  private readonly pan:StereoPannerNode;
  private callIndex=-1;
  private wingIndex=-1;
  constructor(private readonly context:AudioContext,destination:AudioNode) {
    this.gain=context.createGain();this.pan=context.createStereoPanner();
    this.gain.connect(this.pan).connect(destination);
    this.noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
    const data=this.noise.getChannelData(0);let previous=0,seed=51294;
    for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;previous=(previous+(seed/4294967296*2-1)*.03)/1.025;data[i]=previous*3;}
  }
  update(position:Vector3,listener:Vector3,yaw:number,clock:number,phase:DragonPhase,volume:number) {
    const dx=position.x-listener.x,dz=position.z-listener.z,d=position.distanceTo(listener),now=this.context.currentTime;
    this.gain.gain.setTargetAtTime(volume*Math.max(0,1-d/210)**2,now,.2);
    this.pan.pan.setTargetAtTime(Math.max(-.9,Math.min(.9,(dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(d,1))),now,.15);
    const call=Math.floor(clock/29);
    if(call!==this.callIndex){this.callIndex=call;if(d<150&&volume>0)this.voice(phase==='alert');}
    const wing=Math.floor(clock/2);
    if(wing!==this.wingIndex){this.wingIndex=wing;if(d<100&&volume>0&&(phase==='flight'||phase==='takeoff'))this.breath(.5,.24,280);}
  }
  private breath(duration:number,loudness:number,frequency:number) {
    const c=this.context,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
    s.buffer=this.noise;f.type='lowpass';f.frequency.setValueAtTime(frequency,t);f.frequency.exponentialRampToValueAtTime(frequency*2,t+duration*.4);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(loudness,t+duration*.18);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    s.connect(f).connect(g).connect(this.gain);s.start(t);s.stop(t+duration+.05);
    s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};
  }
  private voice(alert:boolean) {
    const c=this.context,t=c.currentTime,duration=alert?1.8:3.1;
    this.breath(duration,.2,220);
    for(let i=0;i<3;i++){
      const s=c.createOscillator(),g=c.createGain();s.type='sine';
      const base=(alert?83:66)*(i+1);s.frequency.setValueAtTime(base,t);s.frequency.exponentialRampToValueAtTime(base*1.14,t+.4);s.frequency.exponentialRampToValueAtTime(base*.77,t+duration);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.045/(i+1),t+.26);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
      s.connect(g).connect(this.gain);s.start(t);s.stop(t+duration+.04);s.onended=()=>{s.disconnect();g.disconnect();};
    }
  }
}
