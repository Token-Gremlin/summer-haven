import * as T from 'three';
import { Character } from '../character/character';
import { Assets } from '../game/assets';
import { VILLAGERS, type Villager } from '../data/villagers';
import { terrainHeight } from '../data/world';
import { Navigation, type Point } from './navigation';
import { Collision } from './collision';
import type { Save } from '../core/save';
interface Actor {
  data: Villager;
  character: Character;
  position: T.Vector3;
  route: Point[];
  stage: number;
  room: string | null;
  wait: number;
  animationDt: number;
}
export class Villagers {
  actors: Actor[] = [];
  nav: Navigation;
  talking: Actor | null = null;
  constructor(assets: Assets, scene: T.Scene, collision: Collision, slice = false) {
    this.nav = new Navigation(collision);
    for (const data of slice ? VILLAGERS.filter((v) => v.id === 'aya') : VILLAGERS) {
      const s = data.stops[0],
        character = new Character(assets, data.appearance),
        p = new T.Vector3(s.x, terrainHeight(s.x, s.z), s.z);
      character.group.position.copy(p);
      scene.add(character.group);
      this.actors.push({
        data,
        character,
        position: p,
        route: [],
        stage: 0,
        room: s.room || null,
        wait: 0,
        animationDt: 0,
      });
    }
  }
  update(dt: number, time: number, player: T.Vector3, inside: string | null, elapsed: number, range = 95) {
    const stage = time < 0.48 ? 0 : time < 0.8 ? 1 : 2;
    for (const a of this.actors) {
      if (a.stage !== stage && a !== this.talking) {
        a.stage = stage;
        a.room = null;
        const s = a.data.stops[stage];
        a.route = this.nav.route([a.position.x, a.position.z], [s.x, s.z]);
        // Scrubbing time can choose a workplace whose route is already complete.
        if (!a.route.length && Math.hypot(a.position.x - s.x, a.position.z - s.z) < 2)
          a.room = s.room || null;
      }
      let moving = false;
      if (a !== this.talking && a.route.length && dt > 0) {
        const target = a.route[0],
          dx = target[0] - a.position.x,
          dz = target[1] - a.position.z,
          d = Math.hypot(dx, dz),
          speed = a.data.id === 'ichiro' ? 0.65 : 0.92;
        const other = this.actors.some(
          (o) =>
            o !== a && o.room === a.room && o.position.distanceTo(a.position) < 0.7 && o.data.id < a.data.id,
        );
        if (!other && player.distanceTo(a.position) > 0.75) {
          if (d < 0.12) a.route.shift();
          else {
            const step = Math.min(d, speed * dt);
            this.nav.collision.move(a.position, (dx / d) * step, (dz / d) * step, 0.3, a.position.y);
            const yaw = Math.atan2(dx, dz);
            a.character.group.rotation.y +=
              Math.atan2(
                Math.sin(yaw - a.character.group.rotation.y),
                Math.cos(yaw - a.character.group.rotation.y),
              ) *
              (1 - Math.exp(-6 * dt));
            moving = true;
          }
        }
        if (!a.route.length) a.room = a.data.stops[a.stage].room || null;
      }
      a.position.y = terrainHeight(a.position.x, a.position.z) + 0.02;
      a.character.group.position.copy(a.position);
      if (a.room) {
        a.character.group.position.set(a.room === 'shop' ? 461.5 : 431.8, 0, -1.6);
        a.character.group.rotation.y = 0.3;
      }
      a.character.group.visible = a.room
        ? inside === a.room
        : !inside && a.position.distanceTo(player) < range;
      if (a !== this.talking) a.character.setState(moving ? 'walk' : 'idle', moving ? 0.65 : 1);
      a.animationDt += dt;
      if (a.character.group.visible && a.animationDt > (a.position.distanceTo(player) < 15 ? 0 : 0.05)) {
        a.character.update(a.animationDt, moving ? 0.9 : 0, 0, 0, elapsed);
        a.animationDt = 0;
      }
    }
  }
  nearby(player: T.Vector3, inside: string | null) {
    return (
      this.actors.find(
        (a) =>
          a.character.group.visible &&
          a.room === inside &&
          a.character.group.position.distanceTo(player) < 2.2,
      ) || null
    );
  }
  talk(a: Actor, save: Save, player: T.Vector3) {
    this.talking = a;
    a.character.group.rotation.y = Math.atan2(
      player.x - a.character.group.position.x,
      player.z - a.character.group.position.z,
    );
    a.character.setState('interact');
    let text = a.data.lines[a.stage];
    if (a.data.id === 'aya') {
      save.activities.cat = Math.max(1, save.activities.cat);
      text =
        save.activities.cat === 2
          ? 'You found Mikan! He always knows where the afternoon shade will be. Thank you for keeping an eye on him.'
          : `Welcome, ${save.appearance.name}. I’m glad the house has someone in it again. If you see an orange cat, that’s Mikan. Probably somewhere comfortable.`;
    }
    if (a.data.id === 'mori' && save.activities.delivery < 2) {
      save.activities.delivery = 1;
      text =
        'Would you take this little parcel to Ren at the workshop? Just follow the street north, past the inn. No hurry — it is only a new wood plane.';
    }
    if (a.data.id === 'ren' && save.activities.delivery === 1) {
      save.activities.delivery = 2;
      text =
        'Ah, the new plane! Mori remembered. Thank you. If you pass the river, look at the bridge rail — that was my first job here.';
    }
    if (a.data.id === 'sora') save.activities.photo = Math.max(1, save.activities.photo);
    return { name: `${a.data.name} · ${a.data.role}`, text };
  }
  release() {
    this.talking = null;
  }
}
