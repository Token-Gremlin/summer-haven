import { SoundEngine } from '../sound/engine';
import type { Settings } from '../core/save';
import type { Player } from '../player/player';
import { riverX } from '../data/world';
import { regionRiverX, regionAt, regionRouteSample } from '../data/regions';
import { DragonVoice } from '../sound/dragon';
import { LandmarksAudio } from '../sound/landmarks';
import { ferryLandingAt } from '../data/ferry';
import type { Reedwing } from '../world/dragon';
import type { Siltfin } from '../world/siltfin';
import { SiltfinVoice } from '../sound/siltfin';
import { WeatherAudio } from '../sound/weather';
import type { ClimateState } from '../data/climate';
export class Audio {
  context: AudioContext | null = null;
  engine: SoundEngine | null = null;
  settings!: Settings;
  enabled = false;
  private lastFootfall = 0;
  private weatherBed:WeatherAudio|null=null;
  private climateState:ClimateState|null=null;
  weather(state:ClimateState,paused:boolean,inside:boolean){
    this.climateState=state;
    if(!this.context||!this.engine)return;
    this.weatherBed??=new WeatherAudio(this.context,this.engine.output);
    this.weatherBed.update(state,paused?0:this.settings.master*this.settings.ambience,inside);
  }
  private guardian: DragonVoice | null = null;
  private riverGuardian: SiltfinVoice | null = null;
  private landmarks: LandmarksAudio | null = null;
  landscape(player:Player,clock:number,paused:boolean,listenerYaw:number) {
    if(!this.context||!this.engine)return;
    this.landmarks ??= new LandmarksAudio(this.context,this.engine.output);
    this.landmarks.update(player.position,listenerYaw,clock,player.inside,
      paused?0:this.settings.master*this.settings.ambience,
      paused?0:this.settings.master*this.settings.effects);
  }
  dragon(dragon: Reedwing, player: Player, clock: number, paused: boolean, listenerYaw:number) {
    if (!this.context || !this.engine) return;
    this.guardian ??= new DragonVoice(this.context, this.engine.output);
    this.guardian.update(dragon.group.position, player.position, listenerYaw, clock, dragon.phase,
      paused || player.inside ? 0 : this.settings.master * this.settings.effects);
  }
  async start(settings: Settings) {
    this.settings = settings;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.engine = new SoundEngine(this.context, this.context.destination, { seed: 431, lazy: true });
      }
      await this.context.resume();
      this.enabled = true;
      this.configure(settings);
    } catch {
      this.enabled = false;
    }
  }
  siltfin(dragon:Siltfin,player:Player,clock:number,paused:boolean,listenerYaw:number) {
    if(!this.context||!this.engine)return;
    this.riverGuardian??=new SiltfinVoice(this.context,this.engine.output);
    this.riverGuardian.update(dragon.group.position,player.position,listenerYaw,clock,dragon.phase,
      paused||player.inside?0:this.settings.master*this.settings.effects);
  }
  configure(s: Settings) {
    this.settings = s;
    if (!this.engine || !this.context) return;
    this.engine.setVolume(s.master, this.context.currentTime);
    this.engine.ambienceVolume = s.ambience;
    this.engine.effectsVolume = s.effects;
  }
  tick(dt: number, p: Player, time: number, paused: boolean) {
    if (!this.engine || !this.context) return;
    this.engine.setVolume(paused ? 0 : this.settings.master, this.context.currentTime);
    const x = p.position.x,
      z = p.position.z;
    this.engine.tick(this.context.currentTime, dt, {
      speed: p.cycling ? p.speed : 0,
      crank: Math.abs(p.speed) / 0.34 / 2.35 / (2 * Math.PI),
      wheel: Math.abs(p.speed) / 0.34 / (2 * Math.PI),
      pedal: p.cycling && p.speed > 0.2 ? 1 : 0,
      brake: p.lastState === 'brake' ? 1 : 0,
      water: p.inside ? 0 : Math.max(0, 1 - Math.abs(x - (z < -132 ? regionRiverX(z) : riverX(z))) / (z < -610 ? 65 : 30)),
      trees: p.inside ? 0.05 : regionAt(x,z)?.id === 'mosswood' ? 1 : x > 60 ? 0.9 : 0.45,
      houses: p.inside ? 1 : regionAt(x,z)?.id === 'aldermere' ? .8 : Math.abs(x) < 33 ? 0.65 : 0,
      evening: time,
      wind: this.climateState?.wind,
      gust: this.climateState?.gust,
      winter: this.climateState?.season[3],
      rain: this.climateState?.rain,
    });
    if (!p.cycling && !paused) {
      if (p.character.footfalls !== this.lastFootfall) {
        this.lastFootfall = p.character.footfalls;
        this.engine.footstep(
          this.context.currentTime,
          p.inside || ferryLandingAt(x,z) ? 'wood' : z < -132 ? regionRouteSample(x,z).distance < 3 ? z < -610 ? 'stone' : 'dirt' : 'grass' : Math.abs(x) < 3 ? 'asphalt' : x > 65 ? 'stone' : x < -30 ? 'grass' : 'dirt',
          this.settings.effects * 0.65,
        );
      }
    }
  }
  bell() {
    if (this.engine && this.context) this.engine.trigger('bell', this.context.currentTime);
  }
  chime() {
    if (this.context) this.engine?.trigger('temple', this.context.currentTime);
  }
}
