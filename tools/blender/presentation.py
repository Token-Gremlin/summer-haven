"""Readable source-file layouts, applied only after origin-clean GLB export."""
import bpy
from mathutils import Euler

def present_character(scene):
    bpy.context.window.scene=scene
    selected=['TOP_5_','BOTTOM_3_','SHOE_2_','HAIR_4_']
    for o in scene.objects:
        visible=o.name=='RIG_masculine' or (o.type=='MESH' and o.name.endswith('_M') and (not any(o.name.startswith(p) for p in ['TOP_','BOTTOM_','SHOE_','HAIR_','ACC_','BODY_torso','BODY_leg','BODY_shoulder']) or any(o.name.startswith(p) for p in selected)))
        o.hide_set(not visible)
    for a in bpy.context.screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.shading.type='MATERIAL'
            a.spaces.active.region_3d.view_distance=2.7
            a.spaces.active.region_3d.view_location=(0,0,1.03)
            a.spaces.active.region_3d.view_rotation=Euler((1.48,0,.15)).to_quaternion()

def present_world(scene):
    bpy.context.window.scene=scene
    roots=[o for o in scene.objects if o.parent is None]
    for i,o in enumerate(roots):
        o.location=((i%4)*13,(i//4)*12,0)
        o['presentation_offset_only']=True
    for a in bpy.context.screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_location=(18,18,0)
            a.spaces.active.region_3d.view_distance=56
            a.spaces.active.region_3d.view_rotation=Euler((.8,0,-.45)).to_quaternion()
