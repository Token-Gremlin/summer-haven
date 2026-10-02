import * as T from 'three';
import type { Input } from '../core/input';
import type { Settings } from '../core/save';
import type { Collision } from '../world/collision';
import { terrainHeight } from '../data/world';
export class CameraRig {
  camera = new T.PerspectiveCamera(48, 1, 0.15, 4200);
  yaw = 0.22;
  pitch = 0.19;
  distance = 5.2;
  target = new T.Vector3();
  photo = false;
  photoOffset = new T.Vector3();
  private ready = false;
  private boom = 5.2;
  update(
    dt: number,
    pos: T.Vector3,
    input: Input,
    settings: Settings,
    collision: Collision,
    inside: boolean,
    creator = false,
    velocity?: T.Vector2,
  ) {
    this.yaw -= input.dx * 0.0034 * settings.sensitivity;
    this.pitch = T.MathUtils.clamp(
      this.pitch + input.dy * 0.0025 * settings.sensitivity * (settings.invertY ? -1 : 1),
      creator || inside ? -0.12 : -0.7,
      inside ? 0.65 : 1.1,
    );
    this.distance = T.MathUtils.clamp(
      this.distance + input.wheel * 0.38,
      creator ? 1.15 : inside ? 1.3 : 2.1,
      creator ? 5 : this.photo ? 18 : inside ? 5 : 9,
    );
    const wanted = pos.clone().add(new T.Vector3(0, creator ? 1.06 : inside ? 1.0 : 1.25, 0));
    // Look up at cliffs and flying creatures without forcing the camera underneath the ground.
    if (!creator && !inside && this.pitch < 0)
      wanted.y += -Math.sin(this.pitch) * this.distance;
    if (velocity && !this.photo) {
      wanted.x += velocity.x * 0.09;
      wanted.z += velocity.y * 0.09;
    }
    if (this.photo) {
      const f = new T.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)),
        r = new T.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const rate = dt * 3.5;
      this.photoOffset
        .addScaledVector(f, (Number(input.down('KeyW')) - Number(input.down('KeyS'))) * rate)
        .addScaledVector(r, (Number(input.down('KeyD')) - Number(input.down('KeyA'))) * rate);
      this.photoOffset.y += rate * (Number(input.down('KeyR')) - Number(input.down('KeyC')));
      this.photoOffset.clampLength(0, 12);
      wanted.add(this.photoOffset);
    }
    this.target.lerp(wanted, this.ready ? 1 - Math.exp(-9 * dt) : 1);
    const dir = new T.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    const radius = creator
      ? this.distance
      : collision.cameraDistance(this.target, dir, this.distance, (x, z) =>
          inside ? 0 : terrainHeight(x, z),
        );
    this.boom = !this.ready || radius < this.boom ? radius : T.MathUtils.damp(this.boom, radius, 12, dt);
    const desired = this.target.clone().addScaledVector(dir, this.boom);
    desired.y = Math.max(desired.y, (inside ? 0 : terrainHeight(desired.x, desired.z)) + 0.18);
    // Pull inward immediately to prevent wall clipping; ease outward after an obstruction clears.
    this.camera.position.copy(desired);
    const fov = inside ? 57 : creator ? 45 : 48;
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.lookAt(this.target);
    this.ready = true;
  }
  reset(creator = false) {
    this.yaw = creator ? 0.15 : 0.2;
    this.pitch = creator ? 0.04 : 0.19;
    this.distance = creator ? 3.1 : 5.2;
    this.ready = false;
    this.photoOffset.set(0, 0, 0);
  }
}
