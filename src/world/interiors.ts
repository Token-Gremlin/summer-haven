import * as T from 'three';
import { Assets } from '../game/assets';
import { Collision } from './collision';
import { box, prep, xf, merge, sphere, ID, M } from './geo';
import { uber, specializeUber } from '../render/materials';
import { potRow } from './street';
import { paintedSign } from './signage';
import type { Interaction } from './village';
export class Interiors {
  group = new T.Group();
  rooms = new Map<string, { origin: T.Vector3; collision: Collision; interactions: Interaction[] }>();
  constructor(private assets: Assets) {
    for (const [i, name] of ['home', 'cafe', 'shop'].entries()) this.room(name, 400 + i * 30);
    specializeUber(this.group);
  }
  private room(name: string, x: number) {
    const room = new T.Group();
    room.position.x = x;
    this.group.add(room);
    const collision = new Collision();
    collision.bounds = { x0: x - 4, x1: x + 4, z0: -3.5, z1: 3.5 };
    const interactions: Interaction[] = [
      { id: name + '-exit', label: 'Step outside', x, z: 2.95, radius: 1.35, kind: 'exit', inside: name },
    ];
    const add = (g: T.BufferGeometry, px: number, y: number, z: number) => {
      const m = new T.Mesh(g, uber(ID.house, 0.4, T.DoubleSide));
      m.position.set(px, y, z);
      m.layers.enable(1);
      room.add(m);
      return m;
    };
    const item = (asset: string, px: number, z: number, yaw = 0, block = true) => {
      const o = this.assets.get(asset);
      o.position.set(px, 0, z);
      o.rotation.y = yaw;
      room.add(o);
      if (block) {
        o.updateMatrixWorld(true);
        const b = new T.Box3().setFromObject(o);
        const size = b.getSize(new T.Vector3());
        collision.add({ x: x + px, z, w: Math.min(size.x, 3), d: Math.min(size.z, 2.1), height: size.y });
      }
      return o;
    };
    add(box(8.1, 0.12, 7.1, '#aa916a', M.planks), 0, -0.07, 0);
    add(box(8.1, 0.1, 7.1, '#c3b18d', M.plaster), 0, 3.15, 0).layers.disable(1);
    for (const [px, z, w, d] of [
      [-4, 0, 0.14, 7],
      [4, 0, 0.14, 7],
      [0, -3.5, 8, 0.14],
      [-2.5, 3.5, 3, 0.14],
      [2.5, 3.5, 3, 0.14],
    ]) {
      add(box(w, 3.1, d, '#e3d8b9', M.plaster), px, 1.55, z);
      collision.add({ x: x + px, z, w, d, height: 3.1 });
    }
    for (const px of [-3.95, 0, 3.95]) add(box(0.12, 3.15, 0.15, '#71583d', M.planks), px, 1.56, -3.39);
    for (const z of [-3.42, 3.42]) add(box(8, 0.17, 0.17, '#745b3e', M.planks), 0, 2.9, z);
    for (const px of [-2, 2]) {
      add(box(1.7, 1.3, 0.06, '#9ebebe', M.glow), px, 1.8, -3.39);
      for (const d of [-0.8, -0.4, 0, 0.4, 0.8])
        add(box(0.035, 1.35, 0.04, '#82654a', M.planks), px + d, 1.8, -3.33);
      for (const yy of [1.18, 1.8, 2.44]) add(box(1.7, 0.035, 0.04, '#82654a', M.planks), px, yy, -3.31);
      add(box(0.2, 1.45, 0.1, '#ddd8ba', M.cloth), px - 0.95, 1.78, -3.22);
    }
    add(box(1.6, 0.02, 0.8, '#766d58', M.cloth), 0, 0.015, 3.0);
    add(sphere(0.22, '#f4deb0', M.lantern, 16, 10), 0, 2.75, 0);
    if (name === 'home') {
      item('FURN_bed', -2.6, -1.4, 0);
      item('FURN_wardrobe', 2.9, -2.75, 0);
      item('FURN_table', 2.8, 0.1, Math.PI / 2);
      item('FURN_chair', 1.9, 0.1, Math.PI / 2);
      item('FURN_shelf', -3.3, 1.1, Math.PI / 2);
      item('FURN_counter', 0.0, -2.98, 0);
      add(box(1.1, 0.045, 0.7, '#92aa9b', M.cloth), -1, 0.02, 0.6);
      add(box(0.32, 0.016, 0.23, '#ece3c8', M.plain), 2.8, 0.78, 0.1);
      add(box(0.035, 0.025, 0.27, '#63746a', M.plain), 2.92, 0.8, 0.1);
      add(sphere(0.13, '#727b78', M.metal, 14, 9), -0.5, 1.15, -2.98);
      add(box(0.7, 0.04, 0.5, '#494c49', M.metal), 0.15, 1.08, -2.98);
      const note = paintedSign(['A summer to remember'], 1.0, 0.32);
      note.position.set(-0.3, 2.15, -3.38);
      room.add(note);
      interactions.push({
        id: 'wardrobe',
        label: 'Open your wardrobe',
        x: x + 2.9,
        z: -1.7,
        radius: 1.5,
        kind: 'wardrobe',
        inside: name,
      });
      interactions.push({
        id: 'desk',
        label: 'Read the welcome note',
        x: x + 2,
        z: 0.7,
        radius: 1.3,
        kind: 'inspect',
        data: 'Welcome home. The bicycle is yours, the café makes good tea, and the hill catches the last light. Take your time. — Aya',
        inside: name,
      });
      add(
        merge([
          xf(box(0.21, 0.05, 0.14, '#f2ebd9'), -0.1, 0, 0),
          xf(box(0.21, 0.05, 0.14, '#f2ebd9'), 0.15, 0, 0),
        ]),
        0.8,
        0.05,
        2.8,
      );
    } else if (name === 'cafe') {
      item('FURN_counter', 0, -1.8, 0);
      item('FURN_shelf', 2.9, -3.1);
      item('FURN_shelf', -2.9, -3.1);
      for (const px of [-2.4, 2.4]) {
        item('FURN_table', px, 0.9);
        item('FURN_chair', px, 1.65, Math.PI);
        item('FURN_chair', px, 0.12, 0);
        interactions.push({
          id: 'cafe-seat-' + px,
          label: 'Have a quiet seat',
          x: x + px,
          z: 1.45,
          radius: 1,
          kind: 'sit',
          inside: name,
        });
      }
      for (const px of [-0.8, 0, 0.8]) add(sphere(0.065, '#dfc79d', M.plain), px, 1.14, -1.8);
      for (const px of [-2.4, 2.4]) {
        add(sphere(0.05, '#eee6d2', M.plain, 12, 8), px, 0.81, 0.9);
        add(box(0.23, 0.012, 0.18, '#dad0b3', M.cloth), px + 0.25, 0.765, 0.9);
      }
      const menu = paintedSign(['Komorebi café', 'Barley tea · Peach cake'], 1.5, 0.66);
      menu.position.set(0, 2.15, -3.37);
      room.add(menu);
      interactions.push({
        id: 'cafe-menu',
        label: 'Read today’s menu',
        x,
        z: -0.6,
        radius: 1.7,
        kind: 'inspect',
        data: 'Today at Komorebi: iced barley tea, plum soda, and a slice of peach cake. The tea is on the house for our newest neighbor.',
        inside: name,
      });
    } else {
      for (const px of [-3, -1.1, 1.1]) {
        item('FURN_shelf', px, -2.9);
        item('FURN_shelf', px, -0.3, Math.PI / 2);
      }
      item('FURN_fridge', 3.2, -2.7);
      item('FURN_counter', 2.7, 1.8, Math.PI / 2);
      interactions.push({
        id: 'shop-shelf',
        label: 'Browse the summer shelf',
        x: x - 1,
        z: 1.1,
        radius: 1.6,
        kind: 'inspect',
        data: 'Hand fans, ramune bottles, tomato seeds, postcards. A handwritten sign reads: “The best things here are the people.”',
        inside: name,
      });
    }
    add(potRow(71, 2), 3.1, 0, 2.7);
    this.rooms.set(name, { origin: new T.Vector3(x, 0, 1.4), collision, interactions });
  }
}
