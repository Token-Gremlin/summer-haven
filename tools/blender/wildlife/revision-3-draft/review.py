"""Render selected wildlife through live Blender MCP after wildlife.py.
Set REVIEW_SPECIES deer/terrapin/songbird and REVIEW_VIEW threequarter/side/front.
Never overwrites the export or another scene.
"""
import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix,Euler
ROOT=Path(__file__).resolve().parents[4]
species=globals().get('REVIEW_SPECIES','deer');view=globals().get('REVIEW_VIEW','threequarter')
pose=globals().get('REVIEW_POSE','neutral')
scene=bpy.data.scenes['Haven_Wildlife'];bpy.context.window.scene=scene
# Neutral studio and a visible receiving plane make contact and shape inspectable.
# The plane belongs only to the review scene, never to the exported roots.
floor=scene.objects.get('Wildlife_ReviewFloor')
if floor is None:
    mesh=bpy.data.meshes.new('Wildlife_ReviewFloor')
    mesh.from_pydata([(-4,-4,0),(4,-4,0),(4,4,0),(-4,4,0)],[],[(0,1,2,3)])
    floor=bpy.data.objects.new('Wildlife_ReviewFloor',mesh);scene.collection.objects.link(floor)
    mat=bpy.data.materials.new('Wildlife_ReviewFloor');mat.use_nodes=True
    bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value=(.16,.17,.18,1);bs.inputs['Roughness'].default_value=.9
    mesh.materials.append(mat)
for ob in scene.objects:
    if ob.type=='LIGHT':ob.data.color=(1,1,1)
bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
bg.inputs['Color'].default_value=(.16,.17,.18,1)
for ob in scene.objects:
    if ob.type=='EMPTY' and not ob.name.startswith('Wildlife_'):ob.rotation_euler=(0,0,0)
for rig in [o for o in scene.objects if o.type=='ARMATURE']:
    for bone in rig.pose.bones:
        bone.rotation_mode='XYZ';bone.rotation_euler=(0,0,0);bone.location=(0,0,0)
if pose in ('ikrest','feed'):
    data=json.loads((ROOT/'tools/blender/wildlife/revision-3-draft/ik-rest.json').read_text())
    for name,transform in data['bones'].items():
        bone=scene.objects['deer_Rig'].pose.bones[name]
        x,y,z,w=transform['quaternion'];bone.rotation_mode='QUATERNION';bone.rotation_quaternion=(w,x,y,z)
        bone.location=transform['translation']
if pose=='feed':
    scene.objects['deer_Rig'].pose.bones['deer_NeckPivot'].rotation_mode='XYZ'
    scene.objects['deer_Rig'].pose.bones['deer_HeadPivot'].rotation_mode='XYZ'
    scene.objects['deer_Rig'].pose.bones['deer_NeckPivot'].rotation_euler.x=1.35
    scene.objects['deer_Rig'].pose.bones['deer_HeadPivot'].rotation_euler.x=.15
if pose=='perched':
    basis=Matrix(((1,0,0),(0,0,-1),(0,1,0)))
    for side in ['L','R']:
        sign=1 if side=='L' else -1
        scene.objects['songbird_Wing_'+side].rotation_euler=(basis@Euler((0,-sign*1.2,sign*.25),'XYZ').to_matrix()@basis.inverted()).to_euler()
for key,name in [('deer','Wildlife_Deer'),('terrapin','Wildlife_Terrapin'),('songbird','Wildlife_Songbird')]:
    root=scene.objects[name]
    for ob in root.children_recursive:ob.hide_render=key!=species
centres={'deer':(0,-.22,1.00),'terrapin':(0,-.04,.13),'songbird':(0,.02,.145)}
scales={'deer':2.5,'terrapin':.90,'songbird':.72}
c=Vector(centres[species]);camera=scene.camera;camera.data.ortho_scale=scales[species]
if view=='face':c=Vector((0,-1.02,1.69));camera.data.ortho_scale=.70
if view=='hoof':c=Vector((.18,-.43,.20));camera.data.ortho_scale=.55
direction=Vector({'threequarter':(3,-4,1.8),'side':(5,0,.6),'front':(0,-5,.8),'face':(3,-4,1.3),'hoof':(4,-3,1.5)}[view])
camera.location=c+direction;camera.rotation_euler=(c-camera.location).to_track_quat('-Z','Y').to_euler()
scene.view_settings.view_transform='Standard'
scene.render.resolution_x=globals().get('REVIEW_WIDTH',1000);scene.render.resolution_y=globals().get('REVIEW_HEIGHT',900)
scene.cycles.samples=24
out=ROOT/'tools/blender/wildlife/revision-3-draft/evidence';out.mkdir(parents=True,exist_ok=True)
scene.render.filepath=str(out/(species+'-'+view+('-'+pose if pose!='neutral' else '')+'.png'))
bpy.ops.render.render(write_still=True)
record={'evidence':'Blender authoring diagnostic; not runtime acceptance',
    'species':species,'view':view,'pose':pose,'resolution':[scene.render.resolution_x,scene.render.resolution_y],
    'engine':scene.render.engine,'samples':scene.cycles.samples,'viewTransform':scene.view_settings.view_transform,
    'camera':{'location':list(camera.location),'rotationEuler':list(camera.rotation_euler),'orthoScale':camera.data.ortho_scale},
    'lighting':'White area lights, neutral gray world and receiving plane',
    'exportSha256':hashlib.sha256((Path(__file__).parent/'export/haven-wildlife.glb').read_bytes()).hexdigest()}
Path(scene.render.filepath).with_suffix('.json').write_text(json.dumps(record,indent=2))
print(json.dumps({'species':species,'view':view,'file':scene.render.filepath}))
