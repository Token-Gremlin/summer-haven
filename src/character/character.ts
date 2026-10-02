import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Assets } from '../game/assets';
import { SKIN, HAIR_COLORS, EYES, CLOTH, copyAppearance, type Appearance } from '../data/appearance';
import { gaitProfile, sampleFoot } from './gait';

const X = new T.Vector3(1, 0, 0),
  Y = new T.Vector3(0, 1, 0);
export class Character {
  readonly group = new T.Group();
  model!: T.Group;
  appearance!: Appearance;
  mixer!: T.AnimationMixer;
  actions = new Map<string, T.AnimationAction>();
  bones = new Map<string, T.Bone>();
  state = '';
  phase = 0;
  footfalls = 0;
  private last = '';
  private rest = new Map<string, T.Quaternion>();
  private animated = new Map<string, { q: T.Quaternion; p: T.Vector3 }>();
  private batches: T.SkinnedMesh[] = [];
  private sharedWardrobe = false;
  // Only fallback/non-skinned selected meshes need an individual colored geometry.
  // Store their immutable source so a later apply can release the private copy safely.
  private coloredParts = new Map<T.Mesh, T.BufferGeometry>();
  private gaitPhase = 0;
  private gaitWeight = 0;
  constructor(
    private assets: Assets,
    appearance: Appearance,
  ) {
    this.apply(appearance);
  }
  apply(a: Appearance) {
    for (const [part, source] of this.coloredParts) {
      part.geometry.dispose();
      part.geometry = source;
    }
    this.coloredParts.clear();
    for (const b of this.batches) {
      b.removeFromParent();
      b.geometry.dispose();
    }
    this.batches = [];
    const rebuild = !this.appearance || this.appearance.body !== a.body;
    this.appearance = copyAppearance(a);
    if (rebuild) {
      if (this.model) {
        this.group.remove(this.model);
        this.mixer.stopAllAction();
        this.mixer.uncacheRoot(this.model);
        const skeletons = new Set<T.Skeleton>();
        this.model.traverse((o) => {
          if (o instanceof T.Mesh && !this.sharedWardrobe) o.geometry.dispose();
          if (o instanceof T.SkinnedMesh) skeletons.add(o.skeleton);
        });
        // SkeletonUtils clones these per character. Release any uploaded bone textures
        // when replacing a body without touching another person's rig or wardrobe.
        for (const skeleton of skeletons) skeleton.dispose();
      }
      const data = this.assets.character(a.body);
      this.model = data.root;
      this.sharedWardrobe = data.sharedGeometry === true;
      this.group.add(this.model);
      this.mixer = new T.AnimationMixer(this.model);
      this.actions.clear();
      this.bones.clear();
      this.rest.clear();
      this.model.traverse((o) => {
        if (o instanceof T.Bone) {
          this.bones.set(o.name, o);
          this.rest.set(o.name, o.quaternion.clone());
        }
      });
      for (const clip of data.clips) this.actions.set(clip.name, this.mixer.clipAction(clip));
      this.animated.clear();
      this.last = '';
      this.setState('idle');
    }
    const colors = new Map<T.Mesh, T.Color>();
    this.model.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      const n = o.name,
        m = o.userData.materialName as string;
      let visible = true;
      let color: T.Color | string = o.userData.baseColor;
      for (const [prefix, opt] of [
        ['HAIR_', a.hair],
        ['TOP_', a.top],
        ['BOTTOM_', a.bottom],
        ['SHOE_', a.shoes],
      ] as const)
        if (n.startsWith(prefix)) visible = n.startsWith(prefix + opt + '_');
      if (n.startsWith('ACC_')) visible = a.accessories[Number(n[4])] === true;
      if (n.startsWith('BODY_torso')) visible = false;
      if (n.startsWith('BODY_shoulder')) visible = a.top === 3;
      if (n.startsWith('BODY_arm') && a.top === 2) visible = false;
      if (n.startsWith('BODY_leg') && (a.bottom === 1 || a.bottom === 3)) visible = false;
      o.visible = visible;
      o.userData.selected = visible;
      // Wardrobe source transforms change only in apply(); do not rebuild them for every IK solve.
      o.matrixAutoUpdate = false;
      if (n.startsWith('FACE_head')) o.scale.x = a.face === 1 ? 1.045 : a.face === 2 ? 0.96 : 1;
      if (n.startsWith('EYE')) o.scale.y = a.face === 1 ? 0.995 : a.face === 2 ? 1.008 : 1;
      o.updateMatrix();
      if (!visible) return;
      if (m.startsWith('skin')) color = SKIN[a.skin];
      if (m.startsWith('hair')) color = HAIR_COLORS[a.hairColor];
      if (m.startsWith('iris')) color = EYES[a.eyes];
      if (m.startsWith('top')) color = CLOTH[a.topColor];
      if (m.startsWith('bottom')) color = CLOTH[a.bottomColor];
      const c = new T.Color(color);
      if (m.startsWith('hair_light')) c.lerp(new T.Color('#d1b997'), 0.16);
      if (m.startsWith('top_light')) c.lerp(new T.Color('#fff7dd'), 0.18);
      if (m.startsWith('top_shadow')) c.multiplyScalar(0.82);
      colors.set(o, c);
      if (!(o instanceof T.SkinnedMesh)) this.colorPart(o, c);
    });
    // All exported modules share bind matrices and joint order. Batch the selected
    // wardrobe by shader to keep eight villagers affordable without losing modularity.
    const groups = new Map<T.Material, T.SkinnedMesh[]>();
    this.model.traverse((o) => {
      if (o instanceof T.SkinnedMesh && o.visible) {
        const m = o.material as T.Material;
        if (!groups.has(m)) groups.set(m, []);
        groups.get(m)!.push(o);
      }
    });
    for (const [material, parts] of groups) {
      const geometries = parts.map((p) => {
        p.updateMatrix();
        return this.coloredGeometry(p.geometry, colors.get(p)!).applyMatrix4(p.matrix);
      });
      const geometry = mergeGeometries(geometries, false);
      geometries.forEach((g) => g.dispose());
      if (!geometry) {
        for (const p of parts) this.colorPart(p, colors.get(p)!);
        continue;
      }
      const batch = new T.SkinnedMesh(geometry, material);
      batch.name = 'DRAW_selected_' + parts[0].userData.materialName;
      batch.bind(parts[0].skeleton, parts[0].bindMatrix);
      batch.frustumCulled = false;
      batch.layers.enable(1);
      batch.layers.enable(2);
      parts[0].parent!.add(batch);
      this.batches.push(batch);
      parts.forEach((p) => (p.visible = false));
    }
  }
  private coloredGeometry(source: T.BufferGeometry, color: T.Color): T.BufferGeometry {
    const geometry = source.clone();
    const attr = geometry.getAttribute('color');
    for (let i = 0; i < attr.count; i++) attr.setXYZ(i, color.r, color.g, color.b);
    return geometry;
  }
  private colorPart(part: T.Mesh, color: T.Color): void {
    const source = part.geometry;
    part.geometry = this.coloredGeometry(source, color);
    this.coloredParts.set(part, source);
  }
  setState(name: string, speed = 1) {
    this.state = name;
    const action = this.actions.get(name) || this.actions.get('idle');
    if (!action) return;
    action.timeScale = speed;
    if (this.last === name) return;
    const previous = this.actions.get(this.last);
    const moving = (name === 'walk' || name === 'jog') && (this.last === 'walk' || this.last === 'jog');
    const phase = moving && previous ? previous.time / previous.getClip().duration : 0;
    for (const a of this.actions.values()) if (a.isRunning()) a.fadeOut(0.2);
    action.reset().setEffectiveWeight(1).fadeIn(0.2).play();
    action.time = phase * action.getClip().duration;
    this.last = name;
  }
  update(
    dt: number,
    speed = 0,
    cycle = 0,
    steer = 0,
    time = 0,
    bicycle?: T.Object3D,
    ground?: (x: number, z: number) => number,
  ) {
    // Mixer bindings skip unchanged values. Restore the last unmodified pose before
    // applying secondary motion; otherwise a constant head/hip track accumulates offsets.
    for (const [name, pose] of this.animated) {
      const bone = this.bones.get(name)!;
      bone.quaternion.copy(pose.q);
      bone.position.copy(pose.p);
    }
    this.mixer.update(dt);
    for (const [name, bone] of this.bones) {
      let pose = this.animated.get(name);
      if (!pose) {
        pose = { q: new T.Quaternion(), p: new T.Vector3() };
        this.animated.set(name, pose);
      }
      pose.q.copy(bone.quaternion);
      pose.p.copy(bone.position);
    }
    if (cycle < 0.1) this.phase += dt * Math.max(0.8, speed) * 3;
    if (ground) this.applyGait(dt, speed, cycle, ground);
    const head = this.bones.get('head');
    if (head) head.quaternion.multiply(new T.Quaternion().setFromAxisAngle(Y, Math.sin(time * 0.6) * 0.045));
    for (const side of ['L', 'R']) {
      const hair = this.bones.get('hair_' + side);
      if (hair)
        hair.quaternion.multiply(
          new T.Quaternion().setFromAxisAngle(
            X,
            Math.sin(time * 2.1 + (side === 'L' ? 0 : 1)) * 0.045 + speed * 0.007,
          ),
        );
    }
    if (cycle > 0) {
      // Bicycle pose is solved to the real saddle, grips and crank after animation blending.
      const hips = this.bones.get('hips');
      if (hips) {
        hips.position.y += 0.05 * cycle;
        hips.position.z -= 0.28 * cycle;
      }
      this.bones.get('root')!.updateWorldMatrix(true, true);
      const spine = this.bones.get('spine'),
        chest = this.bones.get('chest');
      if (spine && chest) {
        const target = this.group.worldToLocal(spine.getWorldPosition(new T.Vector3()));
        target.add(new T.Vector3(0, Math.cos(0.62), Math.sin(0.62)));
        this.aimBone(spine, chest, this.group.localToWorld(target), cycle);
        this.bones.get('root')!.updateWorldMatrix(true, true);
      }
      const neck = this.bones.get('neck');
      if (neck && head) {
        const target = neck.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.1, 0));
        this.aimBone(neck, head, target, cycle * 0.9);
        this.bones.get('root')!.updateWorldMatrix(true, true);
      }
      const attachment = (name: string, fallback: T.Vector3) => {
        const node = bicycle?.getObjectByName(name);
        return node ? this.group.worldToLocal(node.getWorldPosition(new T.Vector3())) : fallback;
      };
      for (const [side, s] of [
        ['L', 1],
        ['R', -1],
      ] as const) {
        const crankAngle = this.phase + (s === 1 ? 0 : Math.PI);
        const foot = attachment(
          'pedal_' + side,
          new T.Vector3(s * 0.13, 0.34 + Math.sin(crankAngle) * 0.17, -0.08 - Math.cos(crankAngle) * 0.17),
        ).add(new T.Vector3(0, 0.07, -0.045));
        const hand = attachment('grip_' + side, new T.Vector3(s * 0.25, 1.16, 0.24)).add(
          new T.Vector3(0, 0.02, -0.075),
        );
        this.solveLimb(
          'thigh_' + side,
          'shin_' + side,
          'foot_' + side,
          foot,
          new T.Vector3(s * 0.12, 0.75, 0.5),
          cycle,
        );
        this.orientEnd('foot_' + side, new T.Vector3(0, -0.25, 1), cycle);
        this.solveLimb(
          'upper_arm_' + side,
          'forearm_' + side,
          'hand_' + side,
          hand,
          new T.Vector3(s * 0.38, 1.02, 0.16),
          cycle,
        );
        this.orientEnd('hand_' + side, new T.Vector3(0, -0.15, 1).applyAxisAngle(Y, -steer), cycle);
        this.orientEnd('cloth_' + side, new T.Vector3(s * 0.16, -0.38, 0.93), cycle);
      }
    }
    if (this.state === 'sit') {
      for (const [side, s] of [
        ['L', 1],
        ['R', -1],
      ] as const)
        this.orientEnd(
          'cloth_' + side,
          new T.Vector3(s * 0.16, -0.38, 0.93),
          this.actions.get('sit')?.getEffectiveWeight() ?? 1,
        );
    }
    this.group.rotation.z = T.MathUtils.damp(this.group.rotation.z, -steer * speed * 0.035, 7, dt);
  }
  private applyGait(dt: number, speed: number, cycle: number, ground: (x: number, z: number) => number) {
    const locomotion = cycle < 0.01 && ['idle', 'walk', 'jog'].includes(this.state);
    const weight = locomotion ? T.MathUtils.smoothstep(speed, 0.02, 0.65) : 0;
    this.gaitWeight = T.MathUtils.damp(this.gaitWeight, weight, 12, dt);
    if (!locomotion || this.gaitWeight < 0.001) return;
    const { run, stride } = gaitProfile(speed);
    const nextPhase = this.gaitPhase + (speed * dt) / stride;
    this.footfalls += Math.floor(nextPhase * 2) - Math.floor(this.gaitPhase * 2);
    this.gaitPhase = nextPhase % 1;
    const w = this.gaitWeight,
      phase = this.gaitPhase * Math.PI * 2;
    const hips = this.bones.get('hips')!;
    hips.position.y += (-0.09 - run * 0.05 - Math.cos(phase * 2) * (0.015 + run * 0.02)) * w;
    const chest = this.bones.get('chest')!;
    chest.quaternion.multiply(new T.Quaternion().setFromAxisAngle(X, (0.025 + run * 0.065) * w));
    chest.quaternion.multiply(new T.Quaternion().setFromAxisAngle(Y, Math.cos(phase) * 0.045 * w));
    this.bones.get('root')!.updateWorldMatrix(true, true);
    for (const [side, sign] of [
      ['L', 1],
      ['R', -1],
    ] as const) {
      const foot = sampleFoot(this.gaitPhase + (sign === 1 ? 0 : 0.5), speed);
      const x = sign * (this.appearance.body === 'feminine' ? 0.112 : 0.108);
      const target = new T.Vector3(x, 0.105 + foot.lift, foot.z);
      const world = this.group.localToWorld(target.clone());
      target.y += T.MathUtils.clamp(
        ground(world.x, world.z) - ground(this.group.position.x, this.group.position.z),
        -0.2,
        0.2,
      );
      this.solveLimb('thigh_' + side, 'shin_' + side, 'foot_' + side, target, new T.Vector3(x, 0.5, 0.8), w);
      this.orientEnd('foot_' + side, new T.Vector3(0, -0.25, 1), w);
      // Opposed arms follow the same travelled-distance phase as the feet.
      const arm = this.bones.get('upper_arm_' + side)!;
      const forearm = this.bones.get('forearm_' + side)!;
      const swing = Math.cos(phase + (sign === 1 ? 0 : Math.PI));
      const desiredArm = this.rest
        .get('upper_arm_' + side)!
        .clone()
        .multiply(new T.Quaternion().setFromAxisAngle(X, swing * (0.28 + run * 0.22)));
      const desiredForearm = this.rest
        .get('forearm_' + side)!
        .clone()
        .multiply(new T.Quaternion().setFromAxisAngle(X, -0.18 - run * 0.65));
      arm.quaternion.slerp(desiredArm, w);
      forearm.quaternion.slerp(desiredForearm, w);
    }
  }
  /** World-space grip contacts, applied after update; reusable for articulated props. */
  contactHands(left: T.Vector3, right: T.Vector3, weight = 1, lean = 0) {
    if (lean) this.bones.get('spine')?.quaternion.multiply(new T.Quaternion().setFromAxisAngle(X, lean));
    if (lean) this.bones.get('chest')?.quaternion.multiply(new T.Quaternion().setFromAxisAngle(X, -lean));
    this.group.updateWorldMatrix(true, true);
    for (const [side, sign, target] of [['L', 1, left], ['R', -1, right]] as const) {
      this.solveLimb('upper_arm_' + side, 'forearm_' + side, 'hand_' + side,
        this.group.worldToLocal(target.clone()), new T.Vector3(sign * .5, 1.05, .2), weight);
    }
  }
  /** World-space sole contacts. Both authored rigs/shoe families have ankle .105,
   * sole minimum .015 in bind coordinates: .090m, with the bind toe direction. */
  contactFeet(left: T.Vector3, right: T.Vector3, weight = 1) {
    this.group.updateWorldMatrix(true, true);
    for (const [side, sign, sole] of [['L', 1, left], ['R', -1, right]] as const) {
      const target=this.group.worldToLocal(sole.clone().add(new T.Vector3(0,.09,0)));
      this.solveLimb('thigh_'+side,'shin_'+side,'foot_'+side,target,new T.Vector3(sign*.12,.5,.8),weight);
      this.orientEnd('foot_'+side,new T.Vector3(0,-.25,1),weight);
    }
  }
  private orientEnd(name: string, direction: T.Vector3, weight: number) {
    const bone = this.bones.get(name);
    if (!bone) return;
    const world = bone.getWorldQuaternion(new T.Quaternion());
    const from = Y.clone().applyQuaternion(world);
    direction.applyQuaternion(this.group.getWorldQuaternion(new T.Quaternion())).normalize();
    const q = new T.Quaternion().setFromUnitVectors(from, direction).multiply(world);
    q.premultiply(bone.parent!.getWorldQuaternion(new T.Quaternion()).invert());
    bone.quaternion.slerp(q, weight);
    this.bones.get('root')!.updateWorldMatrix(true, true);
  }
  private solveLimb(
    upperName: string,
    lowerName: string,
    endName: string,
    target: T.Vector3,
    pole: T.Vector3,
    weight: number,
  ) {
    const upper = this.bones.get(upperName),
      lower = this.bones.get(lowerName),
      end = this.bones.get(endName);
    if (!upper || !lower || !end) return;
    const a = upper.getWorldPosition(new T.Vector3()),
      b = lower.getWorldPosition(new T.Vector3()),
      c = end.getWorldPosition(new T.Vector3());
    this.group.localToWorld(target);
    this.group.localToWorld(pole);
    const l1 = a.distanceTo(b),
      l2 = b.distanceTo(c),
      d = target.clone().sub(a),
      len = Math.min(l1 + l2 - 0.001, Math.max(0.001, d.length()));
    d.normalize();
    const cosA = T.MathUtils.clamp((l1 * l1 + len * len - l2 * l2) / (2 * l1 * len), -1, 1),
      perp = pole.clone().sub(a);
    perp.addScaledVector(d, -perp.dot(d)).normalize();
    const knee = a
      .clone()
      .addScaledVector(d, l1 * cosA)
      .addScaledVector(perp, l1 * Math.sqrt(1 - cosA * cosA));
    this.aimBone(upper, lower, knee, weight);
    this.bones.get('root')!.updateWorldMatrix(true, true);
    this.aimBone(lower, end, target, weight);
    this.bones.get('root')!.updateWorldMatrix(true, true);
  }
  private aimBone(b: T.Bone, child: T.Bone, target: T.Vector3, w: number) {
    const pos = b.getWorldPosition(new T.Vector3()),
      dir = child.getWorldPosition(new T.Vector3()).sub(pos).normalize(),
      to = target.clone().sub(pos).normalize();
    const q = new T.Quaternion()
      .setFromUnitVectors(dir, to)
      .multiply(b.getWorldQuaternion(new T.Quaternion()));
    const parent = b.parent!.getWorldQuaternion(new T.Quaternion()).invert();
    q.premultiply(parent);
    b.quaternion.slerp(q, w);
  }
}
