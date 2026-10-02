"""Neutral diagnostic architecture views. Asset origins remain unchanged."""
import bpy,json,struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
s=bpy.data.scenes['Haven_Architecture'];bpy.context.window.scene=s
for o in list(s.objects):
    if o.name.startswith('ArchitectureReview'):bpy.data.objects.remove(o,do_unlink=True)
world=bpy.data.worlds.new('ArchitectureReviewWorld');world.use_nodes=True;s.world=world
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.19,.21,.21,1);bg.inputs['Strength'].default_value=.65
for name,loc,power,size,color in [('Key',(9,-14,20),3900,10,(1,.89,.74)),('Fill',(-13,-6,12),2800,12,(.75,.85,1)),('Rim',(4,12,18),3200,10,(1,.84,.67))]:
    data=bpy.data.lights.new('ArchitectureReview'+name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    ob=bpy.data.objects.new(data.name,data);s.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,4))-ob.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('ArchitectureReviewCamera');cam=bpy.data.objects.new(data.name,data);s.collection.objects.link(cam);s.camera=cam;data.type='ORTHO'
mesh=bpy.data.meshes.new('ArchitectureReviewGround');mesh.from_pydata([(-60,-60,-.03),(60,-60,-.03),(60,60,-.03),(-60,60,-.03)],[],[(0,1,2,3)])
floor=bpy.data.objects.new('ArchitectureReviewGround',mesh);s.collection.objects.link(floor);mat=bpy.data.materials.new('ArchitectureReviewGroundMat');mat.use_nodes=True
next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(.15,.17,.15,1);floor.data.materials.append(mat)
s.render.resolution_x=1440;s.render.resolution_y=1080;s.render.resolution_percentage=75;s.render.image_settings.file_format='PNG'
views=[]
for asset,scale,target in [('market',18,(0,0,4.2)),('workshop',17.6,(0,0,4.2)),('canal_home',14,(0,-.5,3.4)),('gate',27,(0,0,6)),('starroot',25,(0,0,2.8))]:
    for mode in ['front','three-quarter']:
        for ob in s.objects:
            if ob.name.startswith('BLD_'):ob.hide_render=not (ob.name=='BLD_'+asset or ob.name.startswith('BLD_'+asset+'__'));ob.hide_set(ob.hide_render)
            elif ob.name.startswith('COL_'):ob.hide_render=True;ob.hide_set(True)
        loc=(0,-35,target[2]+3.0) if mode=='front' else (24,-30,20 if asset!='starroot' else 25)
        cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=scale
        s.render.filepath=str(ROOT/'docs/gauntlet/evidence'/('architecture-'+asset+'-'+mode+'.png'));bpy.ops.render.render(write_still=True)
        views.append({'asset':asset,'view':mode,'camera':loc,'target':target,'orthographic_scale':scale})
# Near inspection of the market facade/arcade and canal balcony.
for asset,loc,target,scale in [('market',(9,-16,10),(-.7,-2.5,4.1),9),('canal_home',(8,-13,8),(.6,-3.3,3.2),6.8)]:
    for ob in s.objects:
        if ob.name.startswith('BLD_'):ob.hide_render=not (ob.name=='BLD_'+asset or ob.name.startswith('BLD_'+asset+'__'));ob.hide_set(ob.hide_render)
    cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=scale
    s.render.filepath=str(ROOT/'docs/gauntlet/evidence'/('architecture-'+asset+'-close.png'));bpy.ops.render.render(write_still=True)
    views.append({'asset':asset,'view':'close','camera':loc,'target':target,'orthographic_scale':scale})
for ob in s.objects:
    if ob.name.startswith('BLD_'):ob.hide_render=not (ob.name=='BLD_market' or ob.name.startswith('BLD_market__'));ob.hide_set(ob.hide_render)
cam.location=(24,-30,20);cam.rotation_euler=(Vector((0,0,4.2))-cam.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=16
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        sp=area.spaces.active;sp.overlay.show_overlays=False;sp.shading.type='SOLID';sp.shading.color_type='MATERIAL';sp.region_3d.view_distance=22;sp.region_3d.view_location=(0,0,4);sp.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
bpy.data.libraries.write(str(ROOT/'tools/blender/architecture/aldermere.blend'),{s},fake_user=True,compress=True)
report=json.loads((ROOT/'public/assets/fantasy/architecture.json').read_text());report['review']={'resolution':[1080,810],'mode':'Blender Eevee diagnostic studio, not gameplay','views':views}
raw=(ROOT/'public/assets/fantasy/architecture.glb').read_bytes();d=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
report['export_verification']={'bytes':len(raw),'roots':[d['nodes'][i]['name'] for i in d['scenes'][d.get('scene',0)]['nodes']],'all_meshes_single_primitive':all(len(m['primitives'])==1 for m in d['meshes'])}
(ROOT/'public/assets/fantasy/architecture.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report['export_verification']))
