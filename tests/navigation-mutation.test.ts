import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Collision} from '../src/world/collision';
import {Navigation} from '../src/world/navigation';

test('cached cells and edges reflect adding, moving and removing live obstacles',()=>{
  const collision=new Collision(),nav=new Navigation(collision),a=nav.id(0,17),b=a+1;
  const [x,z]=nav.point(a),[bx,bz]=nav.point(b);
  assert.equal(nav.walkable(a),true);
  assert.equal(nav.clearEdge(a,b),true);
  const wall=collision.add({x:(x+bx)/2,z:(z+bz)/2,w:.2,d:2,height:3});
  assert.equal(nav.clearEdge(a,b),false,'cached edge must detect the new wall');
  collision.update(wall,{x,z});
  assert.equal(nav.walkable(a),false,'cached cell must detect the moved wall');
  collision.update(wall,{x:x+15});
  assert.equal(nav.walkable(a),true);
  assert.equal(nav.clearEdge(a,b),true);
  wall.x=x;
  assert.equal(nav.walkable(a),false,'retained original handle must also invalidate cells');
  collision.remove(wall);
  assert.equal(nav.walkable(a),true);
  assert.equal(nav.clearEdge(a,b),true);
});

test('local collision revisions include removals and height changes but exclude distant motion',()=>{
  const c=new Collision(),bounds={x0:-20,x1:20,z0:-20,z1:20};
  const a=c.add({x:0,z:0,w:1,d:1,bottom:4,height:1});
  const before=c.revisionForBounds(bounds),far=c.add({x:550,z:-960,r:3,height:8});
  for(let i=0;i<100;i++){far.x+=.1;far.z+=.2;}
  assert.equal(c.revisionForBounds(bounds),before);
  a.bottom=0;
  const changed=c.revisionForBounds(bounds);
  assert.ok(changed>before);
  a.bottom=0;
  assert.equal(c.revisionForBounds(bounds),changed,'unchanged writes do not invalidate searches');
  c.remove(a);
  assert.ok(c.revisionForBounds(bounds)>changed,'the removed cell keeps an invalidation stamp');
});
