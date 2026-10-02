import type { Vector3 } from 'three';
import type { SiltfinPhase } from '../data/siltfin';
/** Original filtered water/breath synthesis through the caller's existing master bus. */
export class SiltfinVoice {
  private readonly noise:AudioBuffer;
  private readonly gain:GainNode;
  private readonly pan:StereoPannerNode;
  private lastPulse=-1;
  private lastClock:number|null=null;
  private sources=new Set<AudioBufferSourceNode>();
  constructor(private readonly context:AudioContext,destination:AudioNode) {
    this.gain=context.createGain();this.gain.gain.value=0;this.pan=context.createStereoPanner();this.gain.connect(this.pan).connect(destination);
    this.noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
    const data=this.noise.getChannelData(0);let seed=88031,value=0;
    for(let i=0;i<data.length;i++){seed=(1664525*seed+1013904223)>>>0;value=.94*value+.06*(seed/4294967296*2-1);data[i]=value;}
  }
  update(position:Vector3,listener:Vector3,yaw:number,clock:number,phase:SiltfinPhase,volume:number) {
    const d=position.distanceTo(listener),now=this.context.currentTime;
    this.gain.gain.setTargetAtTime(Math.max(0,Math.min(1,volume))*Math.max(0,1-d/45)**2,now,.2);
    this.pan.pan.setTargetAtTime(Math.max(-.9,Math.min(.9,((position.x-listener.x)*Math.cos(yaw)-(position.z-listener.z)*Math.sin(yaw))/Math.max(1,d))),now,.15);
    const pulse=Math.floor(clock/4.8),continuous=this.lastClock!==null&&clock>=this.lastClock&&clock-this.lastClock<1;
    if(continuous&&pulse!==this.lastPulse&&d<45&&volume>0&&this.context.state==='running')this.breath(phase==='swim'?1.2:1.8,phase==='alert'?420:phase==='swim'?650:240);
    this.lastClock=clock;this.lastPulse=pulse;
  }
  private breath(duration:number,frequency:number) {
    const c=this.context,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
    s.buffer=this.noise;f.type='bandpass';f.Q.value=.65;f.frequency.setValueAtTime(frequency,t);f.frequency.exponentialRampToValueAtTime(frequency*.55,t+duration);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.4,t+.25);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    s.connect(f).connect(g).connect(this.gain);this.sources.add(s);s.start();s.stop(t+duration+.05);
    s.onended=()=>{this.sources.delete(s);s.disconnect();f.disconnect();g.disconnect();};
  }
  dispose(){for(const s of this.sources)s.stop();this.sources.clear();this.gain.disconnect();this.pan.disconnect();}
}
