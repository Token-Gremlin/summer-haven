import * as T from 'three';
import { box, prep, merge, xf, sphere, ID, M } from './geo';
import { G, uber } from '../render/materials';
import { terrainHeight, riverX } from '../data/world';
import { mulberry32 } from '../core/rng';
interface Bird {
  group: T.Group;
  wings: T.Mesh[];
  perch: T.Vector3;
  home: T.Vector3;
  flight: number;
  phase: number;
}
export class Wildlife {
  group = new T.Group();
  birds: Bird[] = [];
  flies: T.Group[] = [];
  fireflies: T.Points;
  private readonly fireflyBounds: T.Sphere;
  constructor() {
    this.group.name = 'Village birds and insects';
    const rng = mulberry32(44);
    const birdMaterial = uber(ID.house, 0, T.DoubleSide);
    for (const [i, [x, y, z]] of [
      [3.8, 7.6, 6],
      [4, 7.3, -11],
      [-4, 0.12, 34],
      [-7, 0.12, 30],
      [34, 0.5, -37],
      [32, 0.25, -29],
    ].entries()) {
      const group = new T.Group(),
        perch = new T.Vector3(x, y + terrainHeight(x, z), z);
      group.name = `Village bird ${i + 1}`;
      group.position.copy(perch);
      group.rotation.y = i * 1.6;
      const body = merge([
        xf(sphere(0.075, '#65727b', M.plain, 10, 7), 0, 0.08, 0, 0, 0, 0, 1, 0.85, 1.6),
        xf(sphere(0.048, '#333c43', M.plain, 10, 7), 0, 0.12, 0.1),
        xf(box(0.02, 0.015, 0.05, '#d2b079', M.plain), 0, 0.105, 0.155),
      ]);
      group.add(new T.Mesh(body, birdMaterial));
      const wings: T.Mesh[] = [];
      for (const side of [-1, 1]) {
        const g = prep(
          new T.BufferGeometry().setAttribute(
            'position',
            new T.Float32BufferAttribute([0, 0, 0, side * 0.24, -0.03, -0.06, side * 0.11, 0.01, 0.065], 3),
          ),
          '#506172',
          M.plain,
        );
        g.computeVertexNormals();
        const wing = new T.Mesh(g, birdMaterial);
        wing.position.set(side * 0.045, 0.09, -0.02);
        group.add(wing);
        wings.push(wing);
      }
      this.group.add(group);
      this.birds.push({ group, wings, perch, home: perch.clone(), flight: 0, phase: i });
    }
    for (let i = 0; i < 7; i++) {
      const group = new T.Group(),
        body = new T.Mesh(box(0.016, 0.016, 0.18, '#578f9c', M.metal), uber(ID.butterfly, 0, T.DoubleSide));
      group.name = `River dragonfly ${i + 1}`;
      group.add(body);
      for (const s of [-1, 1])
        for (const z of [-0.035, 0.025]) {
          const wing = new T.Mesh(
            box(0.14, 0.002, 0.035, '#c5e2ca', M.glass),
            uber(ID.butterfly, -1, T.DoubleSide),
          );
          wing.position.set(s * 0.07, 0, z);
          group.add(wing);
        }
      group.position.set(riverX(-25 - i * 7) - 6, 0.9, -25 - i * 7);
      this.flies.push(group);
      this.group.add(group);
    }
    const positions = new Float32Array(50 * 3);
    for (let i = 0; i < 50; i++) {
      const x = 64 + rng() * 28,
        z = -80 + rng() * 45;
      positions.set([x, terrainHeight(x, z) + 0.4 + rng() * 1.9, z], i * 3);
    }
    const geometry = new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();
    this.fireflyBounds = geometry.boundingSphere!.clone();
    this.fireflyBounds.radius += .5; // Shader sway stays inside the coarse bounds.
    const material = new T.ShaderMaterial({
      glslVersion: T.GLSL3,
      transparent: true,
      depthWrite: false,
      uniforms: { time: { value: 0 }, night: { value: 0 }, origin: G.uViewOrigin, range: G.uWorldRange },
      vertexShader:
        'uniform float time;out float pulse;out vec3 world;void main(){vec3 p=position;p.x+=sin(time*.5+position.z)*.25;p.y+=sin(time*.7+position.x)*.15;world=p;vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(28./-v.z,1.,4.);pulse=.5+.5*sin(time*1.2+position.x);}',
      fragmentShader:
        'uniform float night;uniform vec3 origin;uniform vec2 range;in float pulse;in vec3 world;layout(location=0) out vec4 col;layout(location=1) out vec4 meta;void main(){float fade=range.y<1000.?1.-smoothstep(range.x,range.y,distance(world.xz,origin.xz)):1.;float a=(1.-smoothstep(.04,.5,length(gl_PointCoord-.5)))*night*pulse*fade;if(a<.03)discard;col=vec4(1.,.85,.32,a);meta=vec4(.5,.5,0.,0.);}',
    });
    this.fireflies = new T.Points(geometry, material);
    this.fireflies.name = 'Village evening fireflies';
    this.group.add(this.fireflies);
  }
  update(dt: number, time: number, day: number, player: T.Vector3, drawDistance = 1600) {
    // Cull only beyond the existing shader fade. Keep animation/state advancing
    // while unseen, and honor the full-world visibility setting.
    const inRange = (p: T.Vector3, radius: number) => drawDistance >= 1000 ||
      Math.hypot(p.x - player.x, p.z - player.z) < drawDistance + radius + 1;
    for (const b of this.birds) {
      if (b.flight === 0 && player.distanceTo(b.perch) < 3) b.flight = 0.001;
      if (b.flight > 0) {
        b.flight += dt;
        const t = Math.min(1, b.flight / 5.5),
          angle = t * Math.PI * 2;
        b.group.position
          .copy(b.perch)
          .add(new T.Vector3(Math.sin(angle) * 4, Math.sin(Math.PI * t) * 4.5, (1 - Math.cos(angle)) * 2));
        b.group.rotation.y = Math.atan2(Math.cos(angle), Math.sin(angle));
        b.wings.forEach((w, j) => (w.rotation.z = Math.sin(time * 19 + b.phase) * 0.6 * (j ? 1 : -1)));
        if (t >= 1) {
          b.flight = 0;
          b.group.position.copy(b.perch);
        }
      } else {
        b.wings.forEach((w) => (w.rotation.z = 0));
        b.group.rotation.y += Math.sin(time * 0.3 + b.phase) * dt * 0.15;
      }
      b.group.visible = day < 0.85 && inRange(b.group.position, .4);
    }
    this.flies.forEach((f, i) => {
      const z = -25 - i * 7;
      f.position.set(
        riverX(z) - 6 + Math.sin(time * 0.5 + i) * 1.6,
        terrainHeight(riverX(z) - 6, z) + 0.9 + Math.sin(time * 1.3 + i) * 0.24,
        z + Math.cos(time * 0.7 + i) * 1.4,
      );
      f.rotation.y = Math.sin(time * 0.5 + i);
      for (let j = 1; j < f.children.length; j++) f.children[j].rotation.z = Math.sin(time * 50 + j) * 0.22;
      f.visible = day < 0.85 && inRange(f.position, .3);
    });
    const material = this.fireflies.material as T.ShaderMaterial;
    material.uniforms.time.value = time;
    material.uniforms.night.value = T.MathUtils.smoothstep(day, 0.55, 0.9);
    this.fireflies.visible = material.uniforms.night.value >= .03 &&
      inRange(this.fireflyBounds.center, this.fireflyBounds.radius);
  }
}
