import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { blob, prep, M, ID } from './geo';
import { mote } from './vegetation';
import { skyMaterial, uber } from '../render/materials';
import { LAYER_REFLECT, onLayers } from '../render/lightpasses';
import { mulberry32, range } from '../core/rng';
import { angularSectors } from '../render/angular-sectors';
import { Atmosphere } from '../render/atmosphere';

/**
 * Everything at "infinite" distance follows the camera: sky dome, distant ridges,
 * a far ground disc that fills the horizon, and drifting light motes.
 */
export class Sky {
  readonly group = new THREE.Group();
  readonly atmosphere = new Atmosphere();

  constructor() {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 24), skyMaterial());
    dome.frustumCulled = false;
    dome.renderOrder = -10;
    this.group.add(dome);

    const r = mulberry32(77);

    // Distant layers: a forested near ridge, then painted blue mountains fading lighter.
    // Aerial perspective: nearer bands greener/darker and forested, farther bands bluer/lighter.
    const layers: [number, number, number, string, number][] = [
      [430, 46, 1, '#24503a', M.foliage],
      [640, 88, 4, '#3a6656', M.foliage],
      [950, 150, 2, '#6c90a8', M.distant],
      [1350, 235, 3, '#90aec2', M.distant],
      [1900, 390, 6, '#b3c8d6', M.distant],
    ];
    layers.forEach(([rad, h, s, color, mat], i) => {
      const g = ridge(rad, h, s * 13 + 5, color, mat, i < 2, i === 4);
      g.name = `Distant ridge ${i + 1}`;
      const material = uber(ID.hills, i < 2 ? 0.5 : 0.0, THREE.DoubleSide);
      // Exact same triangles and shared vertex buffers; only offscreen sectors stop drawing.
      for (const sector of angularSectors(g)) {
        const m = new THREE.Mesh(sector, material);
        m.name = sector.name;
        this.group.add(m);
      }
    });

    const disc = new THREE.Mesh(
      prep(new THREE.CircleGeometry(2400, 48).rotateX(-Math.PI / 2), '#3f7a36', M.ground),
      uber(ID.ground, 0),
    );
    disc.position.y = -0.7;
    disc.frustumCulled = false;
    this.group.add(disc);
    onLayers(this.group, LAYER_REFLECT);

    // Light motes / seed fluff drifting on the wind (wrapped around the camera in the shader).
    const n = 160;
    const im = new THREE.InstancedMesh(mote(), uber(ID.sky, -1, THREE.DoubleSide), n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const s = range(r, 0.6, 1.4);
      m4.makeScale(s, s, s).setPosition(range(r, -18, 18), range(r, 0.3, 5), range(r, -18, 18));
      im.setMatrixAt(i, m4);
    }
    im.frustumCulled = false;
    this.motes = im;
  }

  /** Added to the scene separately: must not follow the sky group (the shader wraps it). */
  readonly motes: THREE.InstancedMesh;

  follow(cam: THREE.Vector3, time = 0): void {
    this.group.position.set(cam.x, 0, cam.z);

  }
}

function ridge(
  rad: number,
  h: number,
  seed: number,
  color: string,
  mat: number,
  forest: boolean,
  peaks: boolean,
): THREE.BufferGeometry {
  const seg = forest ? 360 : 200;
  const rows = forest ? 10 : 5;
  const pos: number[] = [];
  const idx: number[] = [];
  const s = seed;
  const prof = (a: number) => {
    if (peaks) {
      // Far range: a few soft peaks with long saddles between them.
      const v =
        Math.pow(Math.abs(Math.sin(a * 2.5 + s)), 2.2) * 0.55 +
        Math.pow(Math.abs(Math.sin(a * 5 + s * 1.3)), 3) * 0.3 +
        Math.sin(a * 17 + s) * 0.03;
      return h * Math.max(0.1, 0.12 + v);
    }
    const v =
      Math.sin(a * 3 + s) * 0.35 +
      Math.sin(a * 7 + s * 1.7) * 0.25 +
      Math.sin(a * 13 + s * 0.3) * 0.15 +
      Math.sin(a * 29 + s) * 0.06;
    return h * Math.max(0.12, 0.5 + v);
  };
  // Gullies and spurs: the slope bends in and out, so the sun paints lit and shaded faces.
  const gully = (a: number, t: number) =>
    Math.sin(a * 61 + s + t * 2.0) * 0.5 + Math.sin(a * 23 + s * 2.3 - t) * 0.5;
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const top = prof(a);
    for (let j = 0; j <= rows; j++) {
      const t = j / rows;
      const y = -6 + (top + 6) * Math.sin((t * Math.PI) / 2);
      const rr =
        rad + (1 - t) * rad * 0.08 + (forest ? gully(a, t) * rad * 0.012 * Math.sin(t * Math.PI) : 0);
      pos.push(Math.sin(a) * rr, y, -Math.cos(a) * rr);
    }
  }
  for (let i = 0; i < seg; i++)
    for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j,
        b = a + 1,
        c = a + rows + 1,
        d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const g0 = new THREE.BufferGeometry();
  g0.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g0.setIndex(idx);
  g0.computeVertexNormals();
  const g = prep(g0.toNonIndexed(), color, mat);
  g.computeVertexNormals();
  if (!forest) return g;

  // Painted slope patches: darker forest, lighter meadow / terrace bands on the lower slopes.
  const base = new THREE.Color(color);
  const lit = base.clone().lerp(new THREE.Color('#6f9a48'), 0.45);
  const dark = base.clone().multiplyScalar(0.72);
  const cAttr = g.attributes.color as THREE.BufferAttribute;
  const p = g.attributes.position;
  const tmp = new THREE.Color();
  const rr = mulberry32(seed);
  const terraceAz = [rr() * 6.28, rr() * 6.28];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const a = Math.atan2(x, -z);
    const n = Math.sin(a * 37 + s) * Math.sin(a * 11 - s + y * 0.05) * 0.5 + 0.5;
    tmp.copy(base).lerp(n > 0.6 ? lit : dark, Math.abs(n - 0.5) * 1.4);
    for (const ta of terraceAz) {
      const d = Math.abs(Math.atan2(Math.sin(a - ta), Math.cos(a - ta)));
      if (d < 0.05 && y > 2 && y < h * 0.45 && Math.floor(y / 3.2) % 2 === 0)
        tmp.lerp(new THREE.Color('#8fb060'), 0.55);
    }
    cAttr.setXYZ(i, tmp.r, tmp.g, tmp.b);
  }
  cAttr.needsUpdate = true;

  // Layered tree-mass bumps along the ridgeline and a second row lower down the slope.
  const parts: THREE.BufferGeometry[] = [g];
  const step = 5.5 * (rad / 430);
  const circ = Math.PI * 2 * rad;
  const n = Math.floor(circ / step);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rr() * 0.004;
    const top = prof(a);
    for (const row of [0, 1]) {
      if (row === 1 && rr() > 0.55) continue;
      const bR = (row === 0 ? range(rr, 5, 10) : range(rr, 4, 7)) * (rad / 430);
      const y = row === 0 ? top - bR * 0.25 : top * range(rr, 0.45, 0.8);
      const d = rad - bR * 0.2 + (row === 0 ? 0 : -rad * 0.004);
      const b = blob(bR, 1, 0.2, k * 7 + row);
      b.scale(1, range(rr, 0.7, 1.0), 1);
      b.translate(Math.sin(a) * d, y, -Math.cos(a) * d);
      const shade = row === 0 ? range(rr, 0.8, 1.05) : range(rr, 0.7, 0.95);
      parts.push(prep(b.index ? b.toNonIndexed() : b, base.clone().multiplyScalar(shade), mat));
    }
  }
  const merged = mergeGeometries(
    parts.map((x) => {
      x.deleteAttribute('uv');
      return x;
    }),
    false,
  )!;
  return merged;
}
