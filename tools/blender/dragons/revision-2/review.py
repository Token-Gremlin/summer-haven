"""Generate matched inspectable authoring views, never treated as runtime approval."""
import bpy,json,struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
s=bpy.data.scenes['Haven_Dragons'];bpy.context.window.scene=s
r=s.objects['RIG_Aurelian_Reedwing'];cam=s.camera
for t in r.animation_data.nla_tracks:t.mute=True
for ob in s.objects:ob.select_set(False)
floor=s.objects.get('ReviewGround')
if not floor:
    mesh=bpy.data.meshes.new('ReviewGroundMesh');mesh.from_pydata([(-50,-50,-.025),(50,-50,-.025),(50,50,-.025),(-50,50,-.025)],[],[(0,1,2,3)])
    floor=bpy.data.objects.new('ReviewGround',mesh);s.collection.objects.link(floor)
    mat=bpy.data.materials.new('ReviewGroundMat');mat.use_nodes=True
    next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(.075,.10,.105,1);floor.data.materials.append(mat)
s.render.resolution_percentage=75
views=[
 ('three-quarter',None,0,(16,-19,18),(0,.6,2.9),21),
 ('front',None,0,(0,-26,9),(0,0,3),20),
 ('side',None,0,(25,0,8),(0,1,3),19),
 ('face',None,0,(10,-14,9),(0,-4.55,4.8),5.3),
 ('rest','idle',34,(16,-19,14),(0,.6,2.9),18),
 ('flight-up','flight',16,(16,-19,17),(0,.6,2.9),22),
 ('flight-down','flight',46,(16,-19,17),(0,.6,2.9),22),
 ('alert','alert',46,(10,-14,9),(0,-4.5,4.8),5.5),
]
for name,state,frame,loc,target,scale in views:
    r.animation_data.action=next(t.strips[0].action for t in r.animation_data.nla_tracks if t.name==state) if state else None
    if not state:
        for pb in r.pose.bones:pb.rotation_quaternion=(1,0,0,0)
    s.frame_set(frame);bpy.context.view_layer.update()
    cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
    s.render.filepath=str(ROOT/'docs/gauntlet/evidence'/('dragon-aurelian-'+name+'.png'));bpy.ops.render.render(write_still=True)
r.animation_data.action=next(t.strips[0].action for t in r.animation_data.nla_tracks if t.name=='idle');s.frame_set(1)
cam.location=(16,-19,14);cam.rotation_euler=(Vector((0,.6,2.9))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=18
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        sp=area.spaces.active;sp.overlay.show_overlays=False;sp.region_3d.view_distance=20;sp.region_3d.view_location=(0,.5,3);sp.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
bpy.data.libraries.write(str(ROOT/'tools/blender/dragons/aurelian-reedwing.blend'),{s},fake_user=True,compress=True)
raw=(ROOT/'public/assets/creatures/aurelian-reedwing.glb').read_bytes();d=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
print(json.dumps({'bytes':len(raw),'clips':[a['name'] for a in d['animations']], 'mesh_primitives':[len(m['primitives']) for m in d['meshes']], 'skins':[len(s['joints']) for s in d['skins']], 'views':[x[0] for x in views]}))
