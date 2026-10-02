import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { tree } from '../src/world/props';
import { M } from '../src/world/geo';
import { canopyHullObstacle, leafHull } from '../src/world/tree-canopy';
import { Collision } from '../src/world/collision';

const families = ['round', 'tall', 'cedar', 'round', 'tall', 'cedar'] as const;

test('village camera volumes contain actual foliage in both detail levels under rotation and scale', () => {
  for (const [family, kind] of families.entries()) {
    const geometries = [tree(kind, 11 + family * 3), tree(kind, 11 + family * 3, 1)];
    const hull = leafHull(...geometries);
    for (const scale of [.7, 1.1]) {
      const matrix = new T.Matrix4().compose(new T.Vector3(13, 4, -23),
        new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), 1.17), new T.Vector3(scale, scale, scale));
      const proxy = canopyHullObstacle(hull, matrix);
      for (const geometry of geometries) {
        const p = geometry.attributes.position, mat = geometry.attributes.aMat, wind = geometry.attributes.aWind;
        for (let i = 0; i < p.count; i++) {
          if (![M.foliage, M.leafCard, M.fringeCard].includes(mat.getX(i) as any)) continue;
          const point = new T.Vector3(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(matrix);
          const w = wind.getX(i);
          for (const plane of proxy.cameraHull!) assert.ok(
            plane.x*point.x + plane.y*point.y + plane.z*point.z + plane.constant + .609*w < .00001);
        }
      }
      const collision = new Collision(); collision.add(proxy);
      assert.equal(collision.blocked(proxy.x, proxy.z, .45, proxy.bottom!), false,
        'camera-only foliage must not introduce invisible walking barriers');
    }
    geometries.forEach(g => g.dispose());
  }
});

test('a nonzero world-space wind displacement remains inside the scaled canopy envelope', () => {
  const geometry=tree('round',11),p=geometry.attributes.position,mat=geometry.attributes.aMat;
  // The present tree assets use zero wind. Exercise the displacement contract
  // explicitly so future moving crowns cannot silently outgrow their camera hull.
  for(let i=0;i<p.count;i++)if([M.foliage,M.leafCard,M.fringeCard].includes(mat.getX(i) as any))
    geometry.attributes.aWind.setX(i,1);
  const hull=leafHull(geometry);
  assert.equal(hull.maxWind,1);
  const matrix=new T.Matrix4().compose(new T.Vector3(5,3,-7),
    new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),.83),new T.Vector3(.7,.9,1.1));
  const proxy=canopyHullObstacle(hull,matrix);
  for(let i=0;i<p.count;i++)if(geometry.attributes.aWind.getX(i)>0){
    const point=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix);
    for(const x of [-.4216,.4216])for(const z of [-.4216,.4216]){
      const displaced=point.clone().add(new T.Vector3(x,-.123008,z));
      assert.ok(Math.abs(displaced.x-proxy.x)<proxy.w!/2&&Math.abs(displaced.z-proxy.z)<proxy.d!/2);
      assert.ok(displaced.y>proxy.bottom!&&displaced.y<proxy.bottom!+proxy.height);
      for(const plane of proxy.cameraHull!)assert.ok(
        plane.x*displaced.x+plane.y*displaced.y+plane.z*displaced.z+plane.constant<.00001);
    }
  }
  geometry.dispose();
});

test('the reproduced village-bank camera stops before the cedar crown that fixed-radius proxies missed', () => {
  // Actual I capture: player (43,-116), yaw -.7, pitch .5; see diagnostic-village-canopy-i.json.
  const matrix = new T.Matrix4().fromArray([
    .6019563296491355,0,.6468659714863028,0,0,.8836215297691523,0,0,
    -.6468659714863028,0,.6019563296491355,0,39.9812177636195,.03902292991040952,-114.46120135090314,1,
  ]);
  const start = new T.Vector3(43, 1.315704226554949, -116);
  const dir = new T.Vector3(Math.sin(-.7) * Math.cos(.5), Math.sin(.5), Math.cos(-.7) * Math.cos(.5));
  const collision = new Collision();
  collision.add({ x:matrix.elements[12],z:matrix.elements[14],bottom:matrix.elements[13]+3.2,
    height:4.5,r:1.1,cameraOnly:true });
  assert.equal(collision.cameraDistance(start, dir, 6, () => 0), 6, 'original radius misses the visible crown');
  const geometries = [tree('cedar',26),tree('cedar',26,1)];
  const proxy = canopyHullObstacle(leafHull(...geometries), matrix);
  collision.obstacles = [proxy];
  const distance = collision.cameraDistance(start,dir,6,() => 0);
  assert.ok(distance > 1 && distance < 5, `usable camera distance before leaves: ${distance}`);
  const camera = start.clone().addScaledVector(dir,distance);
  assert.ok(proxy.cameraHull!.some(p => p.x*camera.x+p.y*camera.y+p.z*camera.z+p.constant > .2),
    'camera remains outside the expanded foliage bounds');
  console.log(JSON.stringify({oldDistance:6,newDistance:distance}));
  geometries.forEach(g => g.dispose());
});

test('convex camera collision permits empty crown corners and handles parallel, inside and departing rays', () => {
  const planes = [-1,1].flatMap(x => [-1,1].flatMap(y => [-1,1].map(z =>
    ({x:x/Math.sqrt(3),y:y/Math.sqrt(3),z:z/Math.sqrt(3),constant:(-2*y-1)/Math.sqrt(3)}))));
  const collision = new Collision();
  collision.add({x:0,z:0,w:2,d:2,bottom:1,height:2,cameraOnly:true,cameraHull:planes});
  assert.equal(collision.cameraDistance({x:.9,y:2.9,z:-3},{x:0,y:0,z:1},6,()=>-10),6,
    'empty upper corner of the broad-phase box does not force a zoom');
  assert.equal(collision.cameraDistance({x:0,y:2,z:0},{x:0,y:0,z:1},6,()=>-10),.28);
  assert.equal(collision.cameraDistance({x:0,y:2,z:-3},{x:0,y:0,z:-1},6,()=>-10),6);
  const distance=collision.cameraDistance({x:0,y:2,z:-3},{x:0,y:0,z:1},6,()=>-10);
  assert.ok(distance>1.5&&distance<2,'approaching crown retracts before its surface');
});
