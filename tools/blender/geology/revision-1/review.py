"""Render fitted gorge against actual terrain samples. Context meshes are not exported."""
import bpy,json,math,hashlib
from mathutils import Vector
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[3];data=json.loads((Path(__file__).parent/'terrain-samples.json').read_text());grid=data['grid']
s=bpy.data.scenes['Haven_Geology'];bpy.context.window.scene=s
for o in list(s.objects):
    if o.name.startswith('GorgeReview'):bpy.data.objects.remove(o,do_unlink=True)
def V(x,z,y):return (x-366,-(z+713),y)
def material(name,color):
    m=bpy.data.materials.new(name);m.use_nodes=True;next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(*color,1);return m
def mesh(name,vs,fs,mat):
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();ob=bpy.data.objects.new(name,me);s.collection.objects.link(ob);me.materials.append(mat);return ob
terrain=material('GorgeReviewTerrain',(.19,.225,.13));water=material('GorgeReviewWater',(.16,.46,.45));trail=material('GorgeReviewTrail',(.45,.34,.18))
vs=[];nx=(grid['x1']-grid['x0'])//2;ny=(grid['z1']-grid['z0'])//2
for j in range(ny+1):
    for i in range(nx+1):vs.append(V(grid['x0']+i*2,grid['z0']+j*2,data['heights'][j*2][i*2]))
mesh('GorgeReviewTerrain',vs,[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(ny) for i in range(nx)],terrain)
profiles=data['water_profiles'];vs=[]
for p in profiles:vs.extend([V(p['x']-p['halfWidth'],p['z'],p['y']+.05),V(p['x']+p['halfWidth'],p['z'],p['y']+.05)])
mesh('GorgeReviewWater',vs,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(profiles)-1)],water)
vs=[V(370, -698,18.05)]+[V(370+22*math.cos(i*math.tau/48),-698+18*math.sin(i*math.tau/48),18.05) for i in range(48)]
mesh('GorgeReviewBasin',vs,[(0,1+i,1+(i+1)%48) for i in range(48)],water)
for k,(a,b) in enumerate(zip(data['route'],data['route'][1:])):
    if not (-790<a['z']<-678 or -790<b['z']<-678):continue
    dx=b['x']-a['x'];dz=b['z']-a['z'];length=math.hypot(dx,dz);ux=-dz/length;uz=dx/length;vs=[]
    steps=max(2,int(length/2))
    for i in range(steps+1):
        t=i/steps;x=a['x']+dx*t;z=a['z']+dz*t;width=a['width']+(b['width']-a['width'])*t
        for side in [-1,1]:
            xx=x+side*ux*width*.5;zz=z+side*uz*width*.5;ix=max(0,min(len(data['heights'][0])-1,round(xx-grid['x0'])));iz=max(0,min(len(data['heights'])-1,round(zz-grid['z0'])))
            vs.append(V(xx,zz,data['heights'][iz][ix]+.12))
    fs=[]
    for i in range(steps):
        inds=(i*2,i*2+1,i*2+3,i*2+2)
        if all(grid['x0']<vs[j][0]+366<grid['x1'] and grid['z0']<-vs[j][1]-713<grid['z1'] for j in inds):fs.append(inds)
    mesh('GorgeReviewTrail'+str(k),vs,fs,trail)
w=bpy.data.worlds.new('GorgeReviewWorld');w.use_nodes=True;s.world=w
bg=next(n for n in w.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.30,.40,.46,1);bg.inputs['Strength'].default_value=.55
for name,loc,power,size,color in [('Key',(-35,-45,105),180000,65,(1,.87,.69)),('Fill',(65,-25,65),110000,70,(.72,.84,1)),('Rim',(-20,80,100),130000,60,(1,.91,.75))]:
    li=bpy.data.lights.new('GorgeReview'+name,'AREA');li.energy=power;li.size=size;li.color=color;ob=bpy.data.objects.new(li.name,li);s.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,5,35))-ob.location).to_track_quat('-Z','Y').to_euler()
ca=bpy.data.cameras.new('GorgeReviewCamera');cam=bpy.data.objects.new(ca.name,ca);s.collection.objects.link(cam);s.camera=cam;ca.type='ORTHO'
s.render.resolution_x=1440;s.render.resolution_y=1080;s.render.resolution_percentage=75;s.render.image_settings.file_format='PNG'
views=[('wide',(350,-632,83),(367,-721,34),170),('approach',(348,-676,22),(373,-718,39),91),('close',(397,-686,31),(407,-716,39),51),('upstream',(375,-774,92),(373,-719,38),113)]
evidence=[]
for name,loc,target,scale in views:
    cam.location=V(*loc);cam.rotation_euler=(Vector(V(*target))-cam.location).to_track_quat('-Z','Y').to_euler();ca.ortho_scale=scale;ca.type='PERSP' if name in ['approach','close'] else 'ORTHO';ca.lens=32 if name=='approach' else 45
    path=ROOT/'docs/gauntlet/evidence'/('gorge-'+name+'.png');s.render.filepath=str(path);bpy.ops.render.render(write_still=True)
    evidence.append({'file':path.name,'camera_world_xzy':loc,'target_world_xzy':target,'camera_type':ca.type,'lens_mm':ca.lens,'orthographic_scale':scale,'rendered_utc':datetime.now(timezone.utc).isoformat(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
for a in bpy.context.screen.areas:
    if a.type=='VIEW_3D':
        sp=a.spaces.active;sp.shading.type='MATERIAL';sp.overlay.show_overlays=False;sp.region_3d.view_location=(0,5,35);sp.region_3d.view_distance=130;sp.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
bpy.data.libraries.write(str(ROOT/'tools/blender/geology/silverveil-gorge.blend'),{s},fake_user=True,compress=True)
path=ROOT/'public/assets/fantasy/silverveil-gorge.json';report=json.loads(path.read_text());report['review']={'mode':'Blender Eevee diagnostic with sampled terrain and simple water/path context, not gameplay','resolution':[1080,810],'views':evidence,'context_exported':False,'source_sha256':{n:hashlib.sha256((ROOT/'tools/blender/geology'/n).read_bytes()).hexdigest() for n in ['silverveil.py','sample-terrain.ts','review.py']}};path.write_text(json.dumps(report,indent=2));print('Rendered gorge review views')
