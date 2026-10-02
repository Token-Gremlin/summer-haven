"""Actual Blender diagnostic renders, separate from runtime acceptance."""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[3]
s=bpy.data.scenes['Haven_Transport'];bpy.context.window.scene=s
f=s.objects['FERRY_Reed'];d=s.objects['LANDING_Reed'];g=s.objects['GANGWAY_Reed']
for ob in list(s.objects):
    if ob.name.startswith('FerryReview'):bpy.data.objects.remove(ob,do_unlink=True)
w=bpy.data.worlds.new('FerryReviewWorld');w.use_nodes=True;s.world=w
bg=next(n for n in w.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.17,.22,.23,1);bg.inputs['Strength'].default_value=.48
for name,loc,power,size,color in [('Key',(2,-5,8),1100,7,(1,.86,.66)),('Fill',(-6,-1,4),850,6,(.65,.81,1)),('Rim',(3,6,6),1200,5,(1,.76,.47))]:
    li=bpy.data.lights.new('FerryReview_'+name,'AREA');li.energy=power;li.size=size;li.color=color
    ob=bpy.data.objects.new(li.name,li);s.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,.6))-ob.location).to_track_quat('-Z','Y').to_euler()
me=bpy.data.meshes.new('FerryReviewFloor');me.from_pydata([(-30,-30,-.43),(30,-30,-.43),(30,30,-.43),(-30,30,-.43)],[],[(0,1,2,3)])
ground=bpy.data.objects.new('FerryReviewFloor',me);s.collection.objects.link(ground)
m=bpy.data.materials.new('FerryReviewFloor');m.use_nodes=True;n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(.065,.105,.11,1);n.inputs['Roughness'].default_value=.58;me.materials.append(m)
ca=bpy.data.cameras.new('FerryReviewCamera');cam=bpy.data.objects.new(ca.name,ca);s.collection.objects.link(cam);s.camera=cam;ca.type='ORTHO'
s.render.resolution_x=1440;s.render.resolution_y=1080;s.render.resolution_percentage=75;s.render.image_settings.file_format='PNG'
d.location=(2.45,.63,.55);d.rotation_euler.z=math.pi;g.location=(2.45,2.23,.55);g.rotation_euler.z=math.pi
views=[
 ('three-quarter',(7,-9,6),(0,0,.65),7.6,False,0),
 ('front',(0,-10,3.5),(0,0,.7),6.5,False,0),
 ('side',(10,0,3.3),(0,0,.7),6.5,False,0),
 ('close',(4,4,4),(0,.45,.85),4.7,False,0),
 ('boarding',(10,-8,8),(2.25,0,.55),10.8,True,0),
 ('forward-aisle',(0,3.9,1.52),(0,-.70,.59),2.35,False,0),
 ('seating',(2.7,2.4,1.65),(0,-.78,.61),2.55,False,0),
 ('oar-pull',(7,-9,6),(0,0,.65),7.6,False,-.36),
 ('oar-recover',(7,-9,6),(0,0,.65),7.6,False,.36),
]
evidence=[]
for name,loc,target,scale,showdock,sweep in views:
    for root in [d,g]:
        for ob in root.children_recursive:ob.hide_render=not showdock
    for sign,nameo in [(-1,'oar_left'),(1,'oar_right')]:
        ob=s.objects[nameo];ob.rotation_euler.z=sign*(math.pi*.5 if showdock else sweep);ob.rotation_euler.y=sign*(-.14 if sweep>0 else .14 if sweep<0 else 0)
    cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();ca.ortho_scale=scale
    path=ROOT/'docs/gauntlet/evidence'/('ferry-'+name+'.png');s.render.filepath=str(path);bpy.ops.render.render(write_still=True)
    evidence.append({'file':path.name,'camera_position_blender':loc,'target_blender':target,'ortho_scale':scale,'oar_pose':'stowed' if showdock else 'stroke' if sweep<0 else 'recovery' if sweep>0 else 'rest','oar_sweep_radians':sweep,'dock_visible':showdock,'rendered_utc':datetime.now(timezone.utc).isoformat(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
for sign,name in [(-1,'oar_left'),(1,'oar_right')]:s.objects[name].rotation_euler=(0,0,sign*math.pi*.5)
for root in [d,g]:
    for ob in root.children_recursive:ob.hide_render=False
cam.location=(10,-8,8);cam.rotation_euler=(Vector((2.25,0,.55))-cam.location).to_track_quat('-Z','Y').to_euler();ca.ortho_scale=10.8
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        sp=area.spaces.active;sp.shading.type='MATERIAL';sp.overlay.show_overlays=False;sp.region_3d.view_location=(2,0,.55);sp.region_3d.view_distance=12;sp.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
bpy.data.libraries.write(str(ROOT/'tools/blender/transport/reed-ferry.blend'),{s},fake_user=True,compress=True)
path=ROOT/'public/assets/fantasy/reed-ferry.json';report=json.loads(path.read_text());report['review']={'mode':'Blender Eevee diagnostic, no gameplay or motion approval','resolution':[1080,810],'views':evidence,'studio_floor_z':-.43,'source_sha256':{n:hashlib.sha256((ROOT/'tools/blender/transport'/n).read_bytes()).hexdigest() for n in ['reed_ferry.py','review.py']}};path.write_text(json.dumps(report,indent=2))
print('Rendered '+str(len(evidence))+' ferry diagnostic views')
