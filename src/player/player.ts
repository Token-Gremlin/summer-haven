import * as T from 'three';
import { Character } from '../character/character';
import { Assets } from '../game/assets';
import { Input } from '../core/input';
import { Collision } from '../world/collision';
import { terrainHeight } from '../data/world';
import type { Appearance } from '../data/appearance';
import { integrateVelocity, LOCOMOTION } from './motion';
export class Player {
  character: Character;
  bike: T.Object3D;
  position = new T.Vector3(8, 0, 16);
  yaw = Math.PI;
  velocity = new T.Vector2();
  speed = 0;
  cycling = false;
  mountBlend = 0;
  transition = 0;
  seated = false;
  seatHeightOffset = 0;
  inside = false;
  steer = 0;
  wheel = 0;
  crank = 0;
  lastState = 'idle';
  private turnLean = 0;
  constructor(assets: Assets, a: Appearance, scene: T.Scene) {
    this.character = new Character(assets, a);
    scene.add(this.character.group);
    this.bike = assets.get('BICYCLE_town');
    this.bike.position.set(8, 0, 17);
    this.bike.rotation.y = Math.PI / 2;
    scene.add(this.bike);
  }
  update(dt: number, input: Input, cameraYaw: number, collision: Collision, active: boolean, time: number) {
    const jog = input.down('ShiftLeft', 'ShiftRight');
    const forward = Number(input.down('KeyW', 'ArrowUp')) - Number(input.down('KeyS', 'ArrowDown'));
    const sideways = Number(input.down('KeyD', 'ArrowRight')) - Number(input.down('KeyA', 'ArrowLeft'));
    if (this.transition > 0) this.transition = Math.max(0, this.transition - dt);
    if (this.seated && (forward || sideways) && active) this.seated = false;
    if (this.cycling) {
      const throttle = active && this.transition === 0 ? forward : 0;
      const target = throttle > 0 ? (jog ? 8.5 : 5.7) : throttle < 0 ? (this.speed > 0.2 ? 0 : -0.7) : 0;
      this.speed = T.MathUtils.damp(this.speed, target, throttle < 0 ? 5 : throttle > 0 ? 1.1 : 0.6, dt);
      this.steer = T.MathUtils.damp(this.steer, active ? -sideways * 0.44 : 0, 5, dt);
      this.yaw += this.steer * (0.7 + Math.abs(this.speed)) * 0.54 * dt;
      const hit = collision.move(
        this.position,
        Math.sin(this.yaw) * this.speed * dt,
        Math.cos(this.yaw) * this.speed * dt,
        0.45,
        this.position.y,
      );
      if (hit) this.speed *= 0.8;
      this.crank += (this.speed / 0.34 / 2.35) * dt;
      this.wheel += (this.speed / 0.34) * dt;
    } else {
      const v = new T.Vector2(sideways, -forward);
      if (v.lengthSq() > 1) v.normalize();
      const max =
        this.seated || !active || this.transition > 0
          ? 0
          : (jog ? LOCOMOTION.run : LOCOMOTION.walk) * (this.inside ? 0.85 : 1);
      const c = Math.cos(cameraYaw),
        s = Math.sin(cameraYaw),
        vx = (v.x * c + v.y * s) * max,
        vz = (-v.x * s + v.y * c) * max;
      const response =
        !v.lengthSq() || vx * this.velocity.x + vz * this.velocity.y < 0
          ? LOCOMOTION.braking
          : LOCOMOTION.acceleration;
      const mx = integrateVelocity(this.velocity.x, vx, response, dt);
      const mz = integrateVelocity(this.velocity.y, vz, response, dt);
      this.velocity.set(mx.velocity, mz.velocity);
      const before = this.position.clone();
      collision.move(this.position, mx.distance, mz.distance, 0.27, this.position.y);
      this.speed = before.distanceTo(this.position) / Math.max(dt, 0.0001);
      if (this.speed > 0.04) {
        const want = Math.atan2(this.position.x - before.x, this.position.z - before.z);
        const turn = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw));
        this.yaw += turn * (1 - Math.exp(-14 * dt));
        this.turnLean = T.MathUtils.damp(this.turnLean, T.MathUtils.clamp(turn, -0.45, 0.45), 9, dt);
      } else this.turnLean = T.MathUtils.damp(this.turnLean, 0, 10, dt);
    }
    this.position.y = this.inside ? 0 : terrainHeight(this.position.x, this.position.z) + 0.02;
    this.mountBlend = T.MathUtils.damp(this.mountBlend, this.cycling ? 1 : 0, 5, dt);
    const chr = this.character;
    chr.group.position.copy(this.position);
    chr.group.rotation.y = this.yaw;
    const state =
      this.transition > 0
        ? this.cycling
          ? 'mount'
          : 'dismount'
        : this.cycling
          ? forward < 0
            ? 'brake'
            : 'cycle'
          : this.seated
            ? 'sit'
            : this.speed > 3.0
              ? 'jog'
              : this.speed > 0.12
                ? 'walk'
                : 'idle';
    chr.setState(
      state,
      state === 'walk' ? Math.max(0.2, this.speed / 1.5) : state === 'jog' ? this.speed / 3 : 1,
    );
    if (this.cycling) chr.phase = this.crank;
    if (this.seated) {
      chr.group.position.y -= 0.38 - this.seatHeightOffset;
      chr.group.position.z += 0.13;
    }
    if (this.cycling) {
      this.bike.position.copy(this.position);
      this.bike.rotation.y = this.yaw;
      this.bike.rotation.z = chr.group.rotation.z;
    } else this.bike.rotation.z = T.MathUtils.damp(this.bike.rotation.z, 0.1, 5, dt);
    const front = this.bike.getObjectByName('wheel_front'),
      rear = this.bike.getObjectByName('wheel_rear'),
      crank = this.bike.getObjectByName('crank'),
      steering = this.bike.getObjectByName('steering');
    if (front) front.rotation.x = this.wheel;
    if (rear) rear.rotation.x = this.wheel;
    if (crank) crank.rotation.x = this.crank;
    for (const side of ['L', 'R']) {
      const pedal = this.bike.getObjectByName('pedal_' + side);
      if (pedal) pedal.rotation.x = -this.crank;
    }
    if (steering) steering.rotation.y = -this.steer;
    this.bike.updateMatrixWorld(true);
    chr.update(
      dt,
      this.speed,
      this.mountBlend,
      this.cycling ? this.steer : this.turnLean,
      time,
      this.bike,
      this.inside ? () => 0 : terrainHeight,
    );
    this.lastState = state;
  }
  toggleBike(collision: Collision): string | null {
    if (this.inside) return 'Your bicycle is waiting outside.';
    if (this.transition > 0) return null;
    if (this.cycling) {
      const side = new T.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const places = [1, -1, 1.7, -1.7].map((s) => this.position.clone().addScaledVector(side, s));
      const spot = places.find((p) => !collision.blocked(p.x, p.z, 0.3, this.position.y));
      if (!spot) return 'A little more space would be better for getting off.';
      this.cycling = false;
      this.position.copy(spot);
      this.speed = 0;
      this.velocity.set(0, 0);
      this.transition = 0.65;
      return null;
    }
    if (this.position.distanceTo(this.bike.position) > 2)
      return 'Your bicycle is nearby. Walk over to it to ride.';
    this.seated = false;
    this.position.copy(this.bike.position);
    this.yaw = this.bike.rotation.y;
    this.cycling = true;
    this.speed = 0;
    this.turnLean = 0;
    this.transition = 0.7;
    return null;
  }
  recoverBike(collision: Collision) {
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [2, 0],
    ])
      if (!collision.blocked(this.position.x + dx, this.position.z + dz, 0.5, this.position.y)) {
        this.bike.position.copy(this.position).add(new T.Vector3(dx, 0, dz));
        this.bike.rotation.y = this.yaw;
        this.cycling = false;
        this.speed = 0;
        return true;
      }
    return false;
  }
  teleport(x: number, z: number) {
    this.position.set(x, this.inside ? 0 : terrainHeight(x, z) + 0.02, z);
    this.velocity.set(0, 0);
    this.speed = 0;
    this.turnLean = 0;
    this.character.group.position.copy(this.position);
  }
}
