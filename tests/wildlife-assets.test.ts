import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('wildlife export preserves named independent transform rigs, normals, scale and bounded mesh budgets',()=>{
  const bytes=readFileSync(new URL('../public/assets/creatures/haven-wildlife.glb',import.meta.url));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const manifest=JSON.parse(readFileSync(new URL('../public/assets/creatures/haven-wildlife.json',import.meta.url),'utf8'));
  for(const [key,name,limit] of [['deer','Wildlife_Deer',15000],['terrapin','Wildlife_Terrapin',7000],['songbird','Wildlife_Songbird',5000]] as const){
    const root=gltf.nodes.find((n:{name:string})=>n.name===name);
    assert.ok(root,name);assert.deepEqual(root.translation??[0,0,0],[0,0,0]);
    assert.deepEqual(root.scale??[1,1,1],[1,1,1]);
    const nodes:any[]=[];const visit=(n:any)=>{nodes.push(n);for(const child of n.children??[])visit(gltf.nodes[child]);};visit(root);
    const names=new Set(nodes.map(n=>n.name));
    for(const pivot of key==='songbird'?['BodyPivot','HeadPivot','Wing_L','Wing_R','WingTip_L','WingTip_R','Foot_L','Foot_R']:['BodyPivot','NeckPivot','HeadPivot','Leg_FL','Leg_FR','Leg_BL','Leg_BR','TailPivot'])
      assert.ok(names.has(`${key}_${pivot}`),`${key} missing semantic joint ${pivot}`);
    let triangles=0;
    for(const node of nodes)if(node.mesh!==undefined)for(const p of gltf.meshes[node.mesh].primitives){
      assert.ok(p.attributes.NORMAL!==undefined,'smooth authored normals survive export');
      assert.equal(gltf.accessors[p.attributes.NORMAL].count,gltf.accessors[p.attributes.POSITION].count);
      triangles+=(gltf.accessors[p.indices??p.attributes.POSITION].count)/3;
    }
    assert.ok(triangles>500&&triangles<limit,`${key} geometry budget ${triangles}`);
    assert.equal(manifest.species[key].triangles,triangles);
    assert.ok(Math.abs(manifest.species[key].contactY)<.03,'contact normalization remains small');
  }
});
