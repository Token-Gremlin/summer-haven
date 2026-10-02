"""Original Haven wildlife. Run through live Blender MCP after exclusive ownership.
Hand-shaped lofts, connected deer skin, shell scutes and feather fans; semantic rigs.
Only replaces Haven_Wildlife. No generated/downloaded assets or primitive bodies.
"""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'public/assets/creatures'
HERE=Path(__file__).parent
old=bpy.data.scenes.get('Haven_Wildlife')
if old:
    for ob in list(old.objects): bpy.data.objects.remove(ob,do_unlink=True)
    bpy.data.scenes.remove(old)
# Remove only unused data owned by this authoring scene so repeated exports have
# stable names. User scenes and any datablocks still used elsewhere are preserved.
for datablocks in [bpy.data.meshes,bpy.data.armatures,bpy.data.materials,bpy.data.worlds,bpy.data.cameras,bpy.data.lights]:
    for data in list(datablocks):
        if data.users==0 and data.name.startswith(('deer_','terrapin_','songbird_','Bracken_','skin_Wildlife_','Wildlife_')):
            datablocks.remove(data)
scene=bpy.data.scenes.new('Haven_Wildlife'); bpy.context.window.scene=scene
scene.render.fps=30
palette={
 'Fawn':(.43,.205,.083), 'Cream':(.82,.69,.43), 'Dark':(.047,.033,.026),
 'Chestnut':(.24,.079,.027), 'Rose':(.46,.20,.13), 'Amber':(.75,.36,.035),
 'Moss':(.15,.245,.12), 'Shell':(.23,.31,.19), 'Scute':(.36,.39,.19),
 'Teal':(.055,.25,.29), 'Wing':(.032,.12,.16), 'Gold':(.79,.36,.045),
 'Highlight':(.96,.9,.71)
}
mats={}
for key,color in palette.items():
    mat=bpy.data.materials.new('skin_Wildlife_'+key);mat.diffuse_color=(*color,1)
    mat.use_nodes=True
    bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=.86
    mats[key]=mat
parts={};roots={};pivots={};surfaces={}
species=''

def pivot(name,point,parent=None):
    ob=bpy.data.objects.new(species+'_'+name,None);scene.collection.objects.link(ob)
    if parent:
        ob.parent=parent;ob.location=Vector(point)-parent.matrix_world.translation
    else:ob.location=point
    bpy.context.view_layer.update()
    pivots[species][name]=ob
    return ob

def start(key,rootname):
    global species
    species=key;pivots[key]={}
    ob=bpy.data.objects.new(rootname,None);scene.collection.objects.link(ob);roots[key]=ob
    ob['species']=key;ob['forward']='glTF +Z';ob['contact_y']=0.0
    return ob

def surface(parent,material):
    key=(parent.name,material)
    if key not in surfaces:surfaces[key]=[[],[],parent,material]
    return surfaces[key]

def meshadd(parent,material,vertices,faces):
    surf=surface(parent,material);offset=len(surf[0])
    origin=parent.matrix_world.translation
    surf[0].extend([tuple(Vector(v)-origin) for v in vertices])
    surf[1].extend([tuple(i+offset for i in f) for f in faces])

def loft(parent,material,sections,sides=12,steps=3):
    # Cross-sections describe sculptural anatomy, transported continuously along spine.
    samples=[]
    for i in range(len(sections)-1):
        for k in range(steps):
            t=k/steps;u=t*t*(3-2*t)
            a,b=sections[i],sections[i+1]
            samples.append((Vector(a[0]).lerp(Vector(b[0]),t),a[1]*(1-u)+b[1]*u,a[2]*(1-u)+b[2]*u))
    samples.append((Vector(sections[-1][0]),sections[-1][1],sections[-1][2]))
    vs=[];fs=[];prev=None;prev_t=None
    for i,(p,w,h) in enumerate(samples):
        tangent=(samples[min(i+1,len(samples)-1)][0]-samples[max(0,i-1)][0]).normalized()
        side=tangent.cross(Vector((0,0,1))) if prev is None else prev_t.rotation_difference(tangent)@prev
        if side.length<.01:side=Vector((1,0,0))
        side.normalize();up=side.cross(tangent).normalized();prev=side;prev_t=tangent
        for j in range(sides):
            a=j*math.tau/sides
            vs.append(p+side*(w*math.cos(a))+up*(h*math.sin(a)))
    for i in range(len(samples)-1):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides
            fs.append((a,b,b+sides,a+sides))
    fs.extend([tuple(reversed(range(sides))),tuple(range(len(vs)-sides,len(vs)))])
    meshadd(parent,material,vs,fs)

def leaf(parent,material,base,tip,width,depth=.008,normal=(0,-1,0)):
    a,b=Vector(base),Vector(tip);v=b-a;n=Vector(normal).normalized();u=v.cross(n).normalized()
    vs=[a,a+v*.24+u*width*.72,a+v*.55+u*width,a+v*.81+u*width*.52,b,a+v*.81-u*width*.52,a+v*.55-u*width,a+v*.24-u*width*.72,a+v*.51+n*depth,a+v*.51-n*depth*.4]
    fs=[]
    for j in range(8):fs.extend([(j,(j+1)%8,8),((j+1)%8,j,9)])
    meshadd(parent,material,vs,fs)

def bead(parent,material,p,r):
    # Small facial features only. Bodies and appendages use designed lofts/planes.
    vs=[];fs=[]
    for i in range(7):
        t=-math.pi/2+i*math.pi/6
        for j in range(10):
            a=j*math.tau/10;vs.append((p[0]+r[0]*math.cos(t)*math.cos(a),p[1]+r[1]*math.cos(t)*math.sin(a),p[2]+r[2]*math.sin(t)))
    for i in range(6):
        for j in range(10):fs.append((i*10+j,i*10+(j+1)%10,(i+1)*10+(j+1)%10,(i+1)*10+j))
    meshadd(parent,material,vs,fs)

def decal(parent,material,base_material,base,tip,width,normal):
    # Low-relief markings conform to the actual loft, never float above its silhouette.
    surf=surface(parent,material);start=len(surf[0])
    leaf(parent,material,base,tip,width,.001,normal)
    target=surface(parent,base_material);tree=BVHTree.FromPolygons(target[0],target[1])
    n=Vector(normal).normalized()
    for i in range(start,len(surf[0])):
        p=Vector(surf[0][i]);hit,_,_,_=tree.ray_cast(p+n*5,-n,10)
        if hit is not None:surf[0][i]=tuple(hit+n*.0012)

def paint(parent,base_material,material,predicate):
    src=surface(parent,base_material);dst=surface(parent,material);keep=[];remap={}
    for face in src[1]:
        centre=sum((Vector(src[0][i]) for i in face),Vector())/len(face)+parent.matrix_world.translation
        if predicate(centre):
            indices=[]
            for i in face:
                if i not in remap:remap[i]=len(dst[0]);dst[0].append(src[0][i])
                indices.append(remap[i])
            dst[1].append(tuple(indices))
        else:keep.append(face)
    src[1]=keep

exec((HERE/'deer.py').read_text(),globals())
build_deer()

# Reed terrapin: low asymmetric domed carapace, inlaid scutes, striped neck, webbed feet.
root=start('terrapin','Wildlife_Terrapin');body=pivot('BodyPivot',(0,0,.14),root)
loft(body,'Cream',[((0,.29,.095),.035,.024),((0,.21,.092),.18,.037),((0,-.18,.092),.19,.036),((0,-.29,.105),.045,.022)],18,3)
vs=[(0,0,.278)];fs=[];rings=10;sides=40
for i in range(1,rings+1):
    t=i/rings
    for j in range(sides):
        a=j*math.tau/sides
        vs.append((.242*t*math.cos(a),.322*t*math.sin(a),.108+.17*(1-t*t)**.72))
for j in range(sides):fs.append((0,1+j,1+(j+1)%sides))
for i in range(rings-1):
    for j in range(sides):
        a=1+i*sides+j;b=1+i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
meshadd(body,'Shell',vs,fs)
def shellz(x,y):return .108+.17*max(0,1-(x/.242)**2-(y/.322)**2)**.72
for row in range(5):
    y=-.245+row*.116
    for col in [-1,0,1]:
        if row in [0,4] and col!=0:continue
        x=col*.116
        if (x/.242)**2+(y/.322)**2>.81:continue
        verts=[]
        for j in range(6):
            a=j*math.tau/6;xx=x+.053*math.cos(a);yy=y+.047*math.sin(a)
            verts.append((xx,yy,shellz(xx,yy)+.003))
        verts.append((x,y,shellz(x,y)+.011))
        meshadd(body,'Scute',verts,[(j,(j+1)%6,6) for j in range(6)])
loft(body,'Scute',[((.241*math.cos(j*math.tau/40),.321*math.sin(j*math.tau/40),.108),.005,.006) for j in range(41)],6,1)
neck=pivot('NeckPivot',(0,-.22,.12),body);head=pivot('HeadPivot',(0,-.30,.14),neck)
loft(head,'Moss',[((0,-.22,.126),.056,.045),((0,-.32,.145),.047,.045),((0,-.385,.157),.074,.060),((0,-.444,.15),.065,.048),((0,-.466,.141),.028,.022)],14,3)
for s in [-1,1]:
    loft(head,'Cream',[((s*.039,-.24,.154),.005,.005),((s*.054,-.35,.186),.007,.006),((s*.062,-.40,.189),.005,.004)],6,2)
    bead(head,'Dark',(s*.063,-.413,.178),(.012,.018,.016))
    bead(head,'Highlight',(s*.071,-.42,.184),(.004,.005,.005))
    for front,y in [(True,-.18),(False,.20)]:
        code=('F' if front else 'B')+('L' if s<0 else 'R')
        leg=pivot('Leg_'+code,(s*.17,y,.12),body)
        loft(leg,'Moss',[((s*.17,y,.12),.045,.035),((s*.245,y-.01,.065),.04,.032),((s*.275,y-.066,.032),.033,.023)],10,2)
        leaf(leg,'Moss',(s*.257,y-.031,.038),(s*.31,y-.11,.016),.047,.012,normal=(0,0,1))
        for toe in range(3):
            x=s*(.271+toe*.023)
            loft(leg,'Cream',[((x,y-.07,.022),.008,.007),((x+s*.011,y-.12,.009),.002,.002)],6,1)
tail=pivot('TailPivot',(0,.26,.11),body)
loft(tail,'Moss',[((0,.255,.11),.037,.023),((.014,.34,.077),.018,.012),((.032,.4,.057),.001,.001)],10,3)

# Coppercrest songbird: teardrop body, short hooked bill, crest and layered pinion fan.
root=start('songbird','Wildlife_Songbird');body=pivot('BodyPivot',(0,0,.112),root)
loft(body,'Teal',[((0,.108,.103),.015,.022),((0,.056,.135),.056,.064),((0,-.028,.149),.066,.068),((0,-.078,.165),.044,.052)],16,3)
paint(body,'Teal','Gold',lambda p:p.y<.02 and p.z<.145)
head=pivot('HeadPivot',(0,-.061,.18),body)
loft(head,'Teal',[((0,-.045,.18),.024,.033),((0,-.077,.21),.048,.047),((0,-.12,.213),.04,.036),((0,-.137,.199),.018,.018)],14,3)
loft(head,'Dark',[((0,-.129,.20),.024,.019),((0,-.166,.197),.017,.012),((0,-.18,.187),.001,.002)],10,2)
for i in range(3):
    leaf(head,'Gold',((i-1)*.011,-.068,.242),((i-1)*.019,-.03+i*.006,.298-abs(i-1)*.015),.016,.004,normal=(0,-1,0))
for s in [-1,1]:
    bead(head,'Cream',(s*.038,-.109,.225),(.009,.020,.018))
    bead(head,'Dark',(s*.045,-.113,.226),(.008,.011,.012))
    bead(head,'Highlight',(s*.050,-.119,.23),(.0028,.004,.004))
    wing=pivot('Wing_'+('L' if s<0 else 'R'),(s*.048,-.025,.175),body)
    # Wings authored outstretched; runtime folds around local Y and Z, feet retain contact.
    loft(wing,'Teal',[((s*.046,-.025,.175),.02,.015),((s*.115,-.009,.169),.048,.017),((s*.19,.015,.151),.027,.01)],10,2)
    tip=pivot('WingTip_'+('L' if s<0 else 'R'),(s*.15,.01,.16),wing)
    for i in range(7):
        leaf(tip,'Wing',(s*(.093+i*.012),.0+i*.007,.163-i*.002),(s*(.29-i*.015),.058+i*.018,.135-i*.003),.014,.003,normal=(0,0,1))
    for i in range(5):
        leaf(wing,'Teal',(s*(.068+i*.02),-.023+i*.006,.182-i*.003),(s*(.11+i*.022),.04+i*.008,.163-i*.003),.018,.004,normal=(0,0,1))
    foot=pivot('Foot_'+('L' if s<0 else 'R'),(s*.023,-.008,.081),body)
    loft(foot,'Dark',[((s*.023,-.008,.083),.006,.007),((s*.024,.001,.033),.004,.005),((s*.023,-.014,.013),.005,.006)],8,2)
    for toe in range(3):
        loft(foot,'Dark',[((s*.023,-.013,.013),.004,.004),((s*.023+(toe-1)*.012,-.041,.006),.002,.003),((s*.023+(toe-1)*.014,-.046,.004),.001,.001)],6,1)
    loft(foot,'Dark',[((s*.023,0,.016),.004,.004),((s*.025,.027,.006),.001,.002)],6,2)
tail=pivot('TailPivot',(0,.087,.13),body)
for i in range(5):leaf(tail,'Wing',((i-2)*.009,.075,.13),((i-2)*.018,.206-abs(i-2)*.01,.107),.014,.003,normal=(0,0,1))

# Commit mesh buffers: material-separated geometry per anatomical pivot.
for name,mat in surfaces:
    vs,fs,parent,key=surfaces[(name,mat)]
    mesh=bpy.data.meshes.new(name+'_'+key);mesh.from_pydata(vs,[],fs);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    ob=bpy.data.objects.new(name+'_'+key,mesh);scene.collection.objects.link(ob);ob.parent=parent;mesh.materials.append(mats[key])
    for p in mesh.polygons:p.use_smooth=True
    ob['authorship']='Original Summer Haven wildlife loft and relief topology'

deer_skin()

# Preserve actual contact and export every source root at origin, never the review arrangement.
bpy.context.view_layer.update()
manifest={'version':2,'units':'metres','forward':'+Z','up':'+Y','rig':'deer skinned armature; terrapin/songbird transform parts; global-aligned glTF rest axes','clips':[],'species':{}}
for key,root in roots.items():
    meshes=[o for o in root.children_recursive if o.type=='MESH'];verts=[];tris=0
    for ob in meshes:
        ob.data.calc_loop_triangles();tris+=len(ob.data.loop_triangles);verts.extend([ob.matrix_world@v.co for v in ob.data.vertices])
    manifest['species'][key]={'root':root.name,'triangles':tris,'meshes':len(meshes),'pivots':{n:o.name for n,o in pivots[key].items()},'contactY':min(v.z for v in verts),'bounds':{'min':[min(v.x for v in verts),min(v.z for v in verts),min(-v.y for v in verts)],'max':[max(v.x for v in verts),max(v.z for v in verts),max(-v.y for v in verts)]}}
OUT.mkdir(parents=True,exist_ok=True)
for ob in scene.objects:ob.select_set(True)
bpy.context.view_layer.objects.active=roots['deer']
bpy.ops.export_scene.gltf(filepath=str(OUT/'haven-wildlife.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_apply=False,export_extras=True)
(OUT/'haven-wildlife.json').write_text(json.dumps(manifest,indent=2))

# Review studio. Source species can be isolated by hide_render; export is already saved.
world=bpy.data.worlds.new('Wildlife_ReviewWorld');world.use_nodes=True;scene.world=world
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.14,.18,.15,1);bg.inputs['Strength'].default_value=.55
for label,loc,power,size,col in [('Key',(3,-4,5),450,4,(1,.83,.63)),('Fill',(-3,-1,3),260,3,(.65,.84,1)),('Rim',(0,4,4),450,3,(1,.7,.32))]:
    lamp=bpy.data.lights.new('Wildlife_'+label,'AREA');lamp.energy=power;lamp.size=size;lamp.color=col
    ob=bpy.data.objects.new(lamp.name,lamp);scene.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,.8))-ob.location).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.cameras.new('Wildlife_ReviewCamera');camera=bpy.data.objects.new(cam.name,cam);scene.collection.objects.link(camera);scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=2.5
camera.location=(3,-4,2.3);camera.rotation_euler=(Vector((0,-.2,1))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.engine='CYCLES';scene.cycles.samples=32
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        sp=area.spaces.active;sp.shading.type='SOLID';sp.shading.color_type='MATERIAL';sp.region_3d.view_distance=3;sp.region_3d.view_location=(0,-.2,1);sp.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
bpy.data.libraries.write(str(HERE/'haven-wildlife.blend'),{scene},fake_user=True,compress=True)
print(json.dumps(manifest))
