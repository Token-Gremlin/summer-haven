import * as T from 'three';

type Leg = {
  upper: T.Object3D;
  knee: T.Object3D;
  hoof: T.Object3D;
  uq: T.Quaternion;
  kq: T.Quaternion;
  hq: T.Quaternion;
  u: T.Vector3;
  l: T.Vector3;
  neutral: T.Vector3;
  vertices: T.Vector3[];
  anchor: T.Vector3;
  start: T.Vector3;
  end: T.Vector3;
  swing: number;
  delay: number;
};
const up = new T.Vector3(0, 1, 0);
const ease = (t: number) => t * t * (3 - 2 * t);
/** Presentation-only transform-rig solver. Never writes habitat records or geometry. */
export class DeerGait {
  private legs: Leg[] = [];
  private body: T.Object3D;
  private bodyY: number;
  private bodyRotation: T.Quaternion;
  private previous?: T.Vector3;
  private initialized = false;
  private heading?: T.Quaternion;
  private targetHeading?: T.Quaternion;
  private constructor(
    private root: T.Object3D,
    private model: T.Object3D,
    private terrain: (x: number, z: number) => number,
    body: T.Object3D,
  ) {
    this.body = body;
    this.bodyY = body.position.y;
    this.bodyRotation = body.quaternion.clone();
  }
  static create(root: T.Object3D, model: T.Object3D, terrain: (x: number, z: number) => number) {
    const body = model.getObjectByName('deer_BodyPivot');
    if (!body) return undefined;
    const gait = new DeerGait(root, model, terrain, body);
    root.updateWorldMatrix(true, true);
    for (const code of ['FL', 'BR', 'FR', 'BL']) {
      const upper = model.getObjectByName('deer_Leg_' + code),
        knee = model.getObjectByName('deer_Knee_' + code),
        hoof = model.getObjectByName('deer_Hoof_' + code);
      if (!upper || !knee || !hoof || knee.parent !== upper || hoof.parent !== knee) return undefined;
      if (knee.position.length() < 0.1 || hoof.position.length() < 0.1) return undefined;
      const vertices: T.Vector3[] = [];
      const inverse = hoof.matrixWorld.clone().invert();
      hoof.traverse((o) => {
        if (!(o instanceof T.Mesh)) return;
        const p = o.geometry.getAttribute('position');
        const matrix = inverse.clone().multiply(o.matrixWorld);
        for (let i = 0; i < p.count; i++)
          vertices.push(new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(matrix));
      });
      if (!vertices.length) return undefined;
      gait.legs.push({
        upper,
        knee,
        hoof,
        uq: upper.quaternion.clone(),
        kq: knee.quaternion.clone(),
        hq: hoof.quaternion.clone(),
        u: knee.position.clone(),
        l: hoof.position.clone(),
        neutral: root.worldToLocal(hoof.getWorldPosition(new T.Vector3())),
        vertices,
        anchor: new T.Vector3(),
        start: new T.Vector3(),
        end: new T.Vector3(),
        swing: -1,
        delay: code === 'FL' || code === 'BR' ? 0 : 0.08,
      });
    }
    return gait;
  }
  reset() {
    this.initialized = false;
    this.previous = undefined;
    this.heading = undefined;
    this.targetHeading = undefined;
    this.body.position.y = this.bodyY;
    this.body.quaternion.copy(this.bodyRotation);
    for (const l of this.legs) {
      l.upper.quaternion.copy(l.uq);
      l.knee.quaternion.copy(l.kq);
      l.hoof.quaternion.copy(l.hq);
      l.swing = -1;
    }
  }
  update(dt: number, moving: boolean, immediate = false) {
    if (!this.heading || immediate) {
      this.heading = this.root.quaternion.clone();
      this.targetHeading = this.heading.clone();
    } else {
      if (this.root.quaternion.angleTo(this.heading) > 1e-5) this.targetHeading!.copy(this.root.quaternion);
      this.heading.rotateTowards(this.targetHeading!, dt * 1.8);
      this.root.quaternion.copy(this.heading);
    }
    this.root.updateWorldMatrix(true, true);
    const position = this.root.getWorldPosition(new T.Vector3());
    const travel = this.previous ? position.clone().sub(this.previous) : new T.Vector3();
    const teleported = travel.length() > 0.8;
    const velocity = dt > 0 ? travel.clone().multiplyScalar(1 / dt) : new T.Vector3();
    velocity.y = 0;
    velocity.clampLength(0, 2);
    const yaw = this.root.getWorldQuaternion(new T.Quaternion());
    const turning = this.heading!.angleTo(this.targetHeading!) > 0.04;
    const landingHeading = this.heading!.clone().rotateTowards(this.targetHeading!, 0.22 * 1.8);
    const targets: { point: T.Vector3; rotation: T.Quaternion }[] = [];
    for (const l of this.legs) {
      const neutral = this.root.localToWorld(l.neutral.clone());
      if (!this.initialized || immediate || teleported) {
        l.anchor.copy(neutral);
        l.swing = -1;
      }
      const error = Math.hypot(neutral.x - l.anchor.x, neutral.z - l.anchor.z);
      const landing = l.neutral.clone().applyQuaternion(landingHeading).add(position);
      const turnError = Math.hypot(landing.x - l.anchor.x, landing.z - l.anchor.z);
      if (
        l.swing < 0 &&
        ((moving && error > 0.16 + l.delay) || (turning && turnError > 0.18) || error > 0.25)
      ) {
        l.start.copy(l.anchor);
        l.end.copy(turning ? landing : neutral).addScaledVector(velocity, turning ? 0.22 : 0.36);
        l.swing = 0;
        l.delay = 0;
      }
      let lift = 0;
      if (l.swing >= 0) {
        l.swing = Math.min(1, l.swing + dt / 0.22);
        l.anchor.lerpVectors(l.start, l.end, ease(l.swing));
        lift = 0.065 * Math.sin(Math.PI * l.swing) ** 2;
        if (l.swing === 1) l.swing = -1;
      }
      const x = l.anchor.x,
        z = l.anchor.z,
        e = 0.035;
      const normal = new T.Vector3(
        this.terrain(x - e, z) - this.terrain(x + e, z),
        2 * e,
        this.terrain(x, z - e) - this.terrain(x, z + e),
      ).normalize();
      const rotation = new T.Quaternion().setFromUnitVectors(up, normal).multiply(yaw);
      const ground = this.terrain(x, z);
      let height = -Infinity;
      for (const vertex of l.vertices) {
        const v = vertex.clone().applyQuaternion(rotation);
        // Tiny hoof footprint uses the sampled support plane; avoid hundreds of
        // expensive world terrain evaluations per animal per rendered frame.
        height = Math.max(height, ground - (normal.x * v.x + normal.z * v.z) / normal.y - v.y);
      }
      targets.push({ point: new T.Vector3(x, height + lift, z), rotation });
    }
    // Leave extension reserve, including the downhill feet on cross-slopes.
    this.body.position.y = this.bodyY;
    const supportNormal = new T.Vector3(
      this.terrain(position.x - 0.4, position.z) - this.terrain(position.x + 0.4, position.z),
      0.8,
      this.terrain(position.x, position.z - 0.4) - this.terrain(position.x, position.z + 0.4),
    )
      .normalize()
      .applyQuaternion(yaw.clone().invert());
    const incline = new T.Quaternion().setFromUnitVectors(up, supportNormal);
    const limitedIncline = new T.Quaternion().rotateTowards(incline, 0.35);
    this.body.quaternion.copy(limitedIncline.multiply(this.bodyRotation));
    this.root.updateWorldMatrix(true, true);
    let lower = 0.055;
    for (let i = 0; i < this.legs.length; i++) {
      const l = this.legs[i],
        p = targets[i].point;
      const hip = l.upper.getWorldPosition(new T.Vector3());
      const reach = l.u.length() + l.l.length() - 0.008;
      const horizontal = Math.hypot(hip.x - p.x, hip.z - p.z);
      lower = Math.max(
        lower,
        hip.y - p.y - Math.sqrt(Math.max(0.01, reach * reach - horizontal * horizontal)),
      );
    }
    this.body.position.y = this.bodyY - Math.min(0.15, lower);
    this.root.updateWorldMatrix(true, true);
    for (let i = 0; i < this.legs.length; i++)
      this.solve(this.legs[i], targets[i].point, targets[i].rotation);
    this.previous = position;
    this.initialized = true;
  }
  private solve(l: Leg, target: T.Vector3, footRotation: T.Quaternion) {
    l.upper.quaternion.copy(l.uq);
    l.knee.quaternion.copy(l.kq);
    this.root.updateWorldMatrix(true, true);
    const hip = l.upper.getWorldPosition(new T.Vector3());
    const restKnee = l.knee.getWorldPosition(new T.Vector3());
    const restFoot = l.hoof.getWorldPosition(new T.Vector3());
    const a = hip.distanceTo(restKnee),
      b = restKnee.distanceTo(restFoot);
    const axis = target.clone().sub(hip);
    const distance = axis.length();
    axis.normalize();
    const d = T.MathUtils.clamp(distance, Math.abs(a - b) + 1e-5, a + b - 1e-5);
    // Authored hocks bend forward; front knees bend rearward. Preserve that plane,
    // including the original lateral upper/lower offsets rather than assuming vertical bones.
    let pole = restKnee.clone().sub(hip).addScaledVector(axis, -restKnee.clone().sub(hip).dot(axis));
    const forward = new T.Vector3(0, 0, l.upper.name.includes('_F') ? -1 : 1).applyQuaternion(
      this.root.getWorldQuaternion(new T.Quaternion()),
    );
    if (pole.length() < 0.025 || pole.dot(forward) < 0)
      pole = forward.addScaledVector(axis, -forward.dot(axis));
    pole.normalize();
    const along = (a * a - b * b + d * d) / (2 * d),
      bend = Math.sqrt(Math.max(0, a * a - along * along));
    const knee = hip.clone().addScaledVector(axis, along).addScaledVector(pole, bend);
    const parentQ = l.upper.parent!.getWorldQuaternion(new T.Quaternion());
    const desired = knee.clone().sub(hip).applyQuaternion(parentQ.clone().invert()).normalize();
    l.upper.quaternion.copy(
      new T.Quaternion()
        .setFromUnitVectors(l.u.clone().applyQuaternion(l.uq).normalize(), desired)
        .multiply(l.uq),
    );
    l.upper.updateWorldMatrix(true, true);
    const kneeQ = l.knee.parent!.getWorldQuaternion(new T.Quaternion());
    const lower = target
      .clone()
      .sub(l.knee.getWorldPosition(new T.Vector3()))
      .applyQuaternion(kneeQ.invert())
      .normalize();
    l.knee.quaternion.copy(
      new T.Quaternion()
        .setFromUnitVectors(l.l.clone().applyQuaternion(l.kq).normalize(), lower)
        .multiply(l.kq),
    );
    l.knee.updateWorldMatrix(true, true);
    l.hoof.quaternion.copy(
      l.hoof.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(footRotation),
    );
    l.hoof.updateWorldMatrix(true, true);
  }
}
