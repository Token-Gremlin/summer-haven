"""Render selected wildlife through live Blender MCP after wildlife.py.
Set REVIEW_SPECIES deer/terrapin/songbird and REVIEW_VIEW threequarter/side/front.
Never overwrites the export or another scene.
"""
import bpy,json
from pathlib import Path
from mathutils import Vector,Matrix,Euler
ROOT=Path(__file__).resolve().parents[3]
species=globals().get('REVIEW_SPECIES','deer');view=globals().get('REVIEW_VIEW','threequarter')
pose=globals().get('REVIEW_POSE','neutral')
scene=bpy.data.scenes['Haven_Wildlife'];bpy.context.window.scene=scene
for ob in scene.objects:
    if ob.type=='EMPTY' and not ob.name.startswith('Wildlife_'):ob.rotation_euler=(0,0,0)
for rig in [o for o in scene.objects if o.type=='ARMATURE']:
    for bone in rig.pose.bones:
        bone.rotation_mode='XYZ';bone.rotation_euler=(0,0,0)
if pose=='feed':
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
direction=Vector({'threequarter':(3,-4,1.8),'side':(5,0,.6),'front':(0,-5,.8)}[view])
camera.location=c+direction;camera.rotation_euler=(c-camera.location).to_track_quat('-Z','Y').to_euler()
scene.view_settings.view_transform='Standard'
scene.render.resolution_x=1200;scene.render.resolution_y=1000
out=ROOT/'docs/gauntlet/evidence/wildlife-r2';out.mkdir(parents=True,exist_ok=True)
scene.render.filepath=str(out/(species+'-'+view+('-'+pose if pose!='neutral' else '')+'.png'))
bpy.ops.render.render(write_still=True)
print(json.dumps({'species':species,'view':view,'file':scene.render.filepath}))
