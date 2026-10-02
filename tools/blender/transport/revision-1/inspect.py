"""Factual geometry and exported-node checks; not gameplay approval."""
import bpy,json,math,struct,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
path=ROOT/'public/assets/fantasy/reed-ferry.json';report=json.loads(path.read_text())
scene=bpy.data.scenes['Haven_Transport'];f=scene.objects['FERRY_Reed'];facts={}
for pose,sweep,lift in [('rest',0,0),('stroke',-.36,.14),('recovery',.36,-.14),('stowed',math.pi*.5,0)]:
    record={}
    for side,name in [(-1,'oar_left'),(1,'oar_right')]:
        ob=scene.objects[name];ob.rotation_euler=(0,side*lift,side*sweep);bpy.context.view_layer.update()
        tip=ob.matrix_world@Vector((side*1.82,.05,-.39));hand=ob.matrix_world@Vector((side*-.58,0,.105))
        record[name]={'blade_tip_three':[tip.x,tip.z,-tip.y],'handle_three':[hand.x,hand.z,-hand.y]}
    facts[pose]=record
report['inspected_oar_poses']=facts
report['source_body_bounds_three']={}
points=[o.matrix_world@v.co for o in f.children if o.type=='MESH' for v in o.data.vertices]
lo=[min(p[k] for p in points) for k in range(3)];hi=[max(p[k] for p in points) for k in range(3)]
report['source_body_bounds_three']={'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]}
raw=(ROOT/'public/assets/fantasy/reed-ferry.glb').read_bytes();glb=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
report['verification']['movable_nodes']=[n for n in glb['nodes'] if n.get('name') in ['oar_left','oar_right']]
report['verification']['root_transforms_identity']=all(not any(k in n for k in ['translation','rotation','scale','matrix']) for n in glb['nodes'] if n.get('name') in ['FERRY_Reed','LANDING_Reed','GANGWAY_Reed'])
report['verification']['triangles_from_glb_indices']=sum(glb['accessors'][p['indices']]['count']//3 for m in glb['meshes'] for p in m['primitives'])
report['verification']['finite_source_coordinates']=all(math.isfinite(c) for o in scene.objects if o.type=='MESH' for v in o.data.vertices for c in v.co)
report['review']['source_sha256']['inspect.py']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
path.write_text(json.dumps(report,indent=2))
print(json.dumps({'roots':report['roots'],'body':report['source_body_bounds_three'],'verification':report['verification'],'oar_poses':facts,'preserved':report['preserved_scenes']}))
