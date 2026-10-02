import * as T from 'three';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';
import { M } from './geo';
import type { Obstacle } from './collision';
export interface LeafBounds { box:T.Box3; maxWind:number }
export interface LeafHull extends LeafBounds { planes:T.Plane[] }
const isLeaf = (surface:number) => [M.foliage,M.leafCard,M.fringeCard].includes(surface as any) || (surface>=32&&surface<=35);
/** Called once per shared geometry variant; excludes bark/trunk from the canopy volume. */
export function leafBounds(...geometries:T.BufferGeometry[]):LeafBounds {
  const box=new T.Box3();let maxWind=0;
  for(const geometry of geometries){
    const p=geometry.getAttribute('position'),material=geometry.getAttribute('aMat'),wind=geometry.getAttribute('aWind');
    for(let i=0;i<p.count;i++)if(isLeaf(material.getX(i))){
      box.expandByPoint(new T.Vector3(p.getX(i),p.getY(i),p.getZ(i)));maxWind=Math.max(maxWind,wind?.getX(i)??0);
    }
  }
  if(box.isEmpty())throw new Error('Tree has no leaf geometry.');
  return {box,maxWind};
}
/** Created once per village tree variant. A convex envelope follows the sloped
 * underside; a single box or cylinder fills the empty corners below the crown. */
export function leafHull(...geometries:T.BufferGeometry[]):LeafHull {
  const points:T.Vector3[]=[];
  for(const geometry of geometries){
    const p=geometry.attributes.position,mat=geometry.attributes.aMat;
    for(let i=0;i<p.count;i++)if(isLeaf(mat.getX(i)))
      points.push(new T.Vector3().fromBufferAttribute(p,i));
  }
  const hull=new ConvexHull().setFromPoints(points);
  return {...leafBounds(...geometries),planes:hull.faces.map(face=>new T.Plane(face.normal.clone(),-face.constant))};
}
export function canopyHullObstacle(hull:LeafHull,matrix:T.Matrix4):Obstacle {
  const margin=.04+.61*hull.maxWind;
  return {...canopyObstacle(hull,matrix),tag:'village-tree-canopy',
    cameraHull:hull.planes.map(plane=>{
      const p=plane.clone().applyMatrix4(matrix);
      return {x:p.normal.x,y:p.normal.y,z:p.normal.z,constant:p.constant-margin};
    })};
}
/** windOffset is applied in world space: |k|<=1.24, horizontal=.34*k*w, vertical=.08*k*k*w. */
export function canopyObstacle(bounds:LeafBounds,matrix:T.Matrix4):Obstacle {
  const box=bounds.box.clone().applyMatrix4(matrix);
  box.expandByVector(new T.Vector3(.04+.422*bounds.maxWind,.04+.124*bounds.maxWind,.04+.422*bounds.maxWind));
  const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  return {x:center.x,z:center.z,w:size.x,d:size.z,bottom:box.min.y,height:size.y,cameraOnly:true,tag:'region-tree-canopy'};
}
