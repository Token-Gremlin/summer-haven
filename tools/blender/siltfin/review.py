"""Actual posed Blender diagnostic views; no runtime or independent approval."""
import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[3];s=bpy.data.scenes['Haven_Siltfin'];bpy.context.window.scene=s;r=s.objects['RIG_Vesper_Siltfin']
for ob in list(s.objects):
    if ob.name.startswith('SiltfinReview'):bpy.data.objects.remove(ob,do_unlink=True)
for tr in r.animation_data.nla_tracks:tr.mute=True
world=bpy.data.worlds.new('SiltfinReviewWorld');world.use_nodes=True;s.world=world
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.12,.16,.19,1);bg.inputs['Strength'].default_value=.55
for name,loc,power,size,color in [('Key',(4,-7,9),1300,7,(1,.88,.73)),('Fill',(-7,-2,6),1050,6,(.71,.83,1)),('Rim',(2,7,8),1650,6,(1,.8,.61))]:
    li=bpy.data.lights.new('SiltfinReview'+name,'AREA');li.energy=power;li.size=size;li.color=color;ob=bpy.data.objects.new(li.name,li);s.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,.5,1))-ob.location).to_track_quat('-Z','Y').to_euler()
me=bpy.data.meshes.new('SiltfinReviewFloor');me.from_pydata([(-40,-40,-.018),(40,-40,-.018),(40,40,-.018),(-40,40,-.018)],[],[(0,1,2,3)]);floor=bpy.data.objects.new(me.name,me);s.collection.objects.link(floor);mat=bpy.data.materials.new('SiltfinReviewFloor');mat.use_nodes=True;next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(.064,.088,.098,1);me.materials.append(mat)
ca=bpy.data.cameras.new('SiltfinReviewCamera');cam=bpy.data.objects.new(ca.name,ca);s.collection.objects.link(cam);s.camera=cam;ca.type='ORTHO'
s.render.resolution_x=1440;s.render.resolution_y=1080;s.render.resolution_percentage=75;s.render.image_settings.file_format='PNG'
views=[('three-quarter','idle',1,(8,-10,6),(0,.7,.9),10.5),('front','idle',1,(0,-12,4),(0,-.4,1),5.8),('side','idle',1,(12,0,4),(0,1,.9),10.6),('face','idle',1,(4,-6,3.5),(0,-2.75,1.35),2.7),('limbs','idle',1,(7,-.5,3.8),(.3,-.15,.85),4.9),('swim-left','swim',19,(8,-10,7),(0,.7,.9),10.7),('swim-right','swim',55,(8,-10,7),(0,.7,.9),10.7),('alert','alert',46,(5,-6,3.5),(0,-2.7,1.4),3),('submerge','submerge',37,(12,0,4),(0,1,.9),10.6),('surface','surface',37,(12,0,4),(0,1,.9),10.6),('crawl-a','crawl',17,(8,-10,6),(0,.7,.9),10.5),('crawl-b','crawl',65,(8,-10,6),(0,.7,.9),10.5),('tail','swim',19,(7,5,4),(0,3.7,.5),4.3)]
evidence=[]
for name,clip,fr,loc,target,scale in views:
    r.animation_data.action=next(tr.strips[0].action for tr in r.animation_data.nla_tracks if tr.name==clip);s.frame_set(fr);bpy.context.view_layer.update()
    cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();ca.ortho_scale=scale
    path=ROOT/'docs/gauntlet/evidence/siltfin'/(name+'.png');s.render.filepath=str(path);bpy.ops.render.render(write_still=True)
    evidence.append({'file':name+'.png','clip':clip,'frame':fr,'camera_blender':loc,'target_blender':target,'orthographic_scale':scale,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'created_utc':datetime.now(timezone.utc).isoformat()})
r.animation_data.action=next(tr.strips[0].action for tr in r.animation_data.nla_tracks if tr.name=='idle');s.frame_set(1)
cam.location=(8,-10,6);cam.rotation_euler=(Vector((0,.7,.9))-cam.location).to_track_quat('-Z','Y').to_euler();ca.ortho_scale=10.5
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        sp=area.spaces.active;sp.shading.type='MATERIAL';sp.clip_end=2000;sp.region_3d.view_location=(0,.7,.9);sp.region_3d.view_distance=12;sp.region_3d.view_rotation=cam.rotation_euler.to_quaternion();sp.overlay.show_overlays=False
bpy.data.libraries.write(str(ROOT/'tools/blender/siltfin/vesper-siltfin.blend'),{s},fake_user=True,compress=True)
p=ROOT/'public/assets/creatures/vesper-siltfin.json';report=json.loads(p.read_text());report['review']={'mode':'Blender Eevee posed diagnostics, not gameplay or independent approval','resolution':[1080,810],'views':evidence};p.write_text(json.dumps(report,indent=2));print('Rendered '+str(len(evidence))+' Vesper views')
