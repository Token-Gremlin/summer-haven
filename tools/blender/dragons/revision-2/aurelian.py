"""Aurelian Reedwing — original Summer Haven river guardian.
Run through Blender MCP with __file__ set to this file. Rebuilds only Haven_Dragons.
Hand-authored spline topology, membrane patches, scale placement, rig and motion.
"""
import bpy,bmesh,math,json,sys,importlib
from pathlib import Path
from mathutils import Vector,Quaternion
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(Path(__file__).parent))
import meshcraft
importlib.reload(meshcraft)
from meshcraft import Surface,tube,lens,ellipsoid,blend_weights
sin,cos,pi=math.sin,math.cos,math.pi

old=bpy.data.scenes.get('Haven_Dragons')
if old:
    old_data=[ob.data for ob in old.objects if ob.data]
    old_mats=set(mat for ob in old.objects if ob.type=='MESH' for mat in ob.data.materials)
    old_actions=set(strip.action for ob in old.objects if ob.animation_data for track in ob.animation_data.nla_tracks for strip in track.strips)
    old_collections=list(old.collection.children);old_world=old.world
    for ob in list(old.objects): bpy.data.objects.remove(ob,do_unlink=True)
    bpy.data.scenes.remove(old)
    for data in old_data:
        if data.users==0:
            for database in [bpy.data.meshes,bpy.data.armatures,bpy.data.lights,bpy.data.cameras]:
                if data.name in database and database.get(data.name)==data:database.remove(data);break
    for mat in old_mats:
        if mat.users==0:bpy.data.materials.remove(mat)
    for action in old_actions:bpy.data.actions.remove(action)
    for col in old_collections:
        if col.users==0:bpy.data.collections.remove(col)
    if old_world and old_world.users==0:bpy.data.worlds.remove(old_world)
scene=bpy.data.scenes.new('Haven_Dragons');bpy.context.window.scene=scene
scene.render.fps=30;scene.frame_end=121
collection=bpy.data.collections.new('Aurelian_Reedwing');scene.collection.children.link(collection)
palette={
 'Slate':('skin_ReedwingSlate',(0.075,.255,.28,1)),
 'Scales':('skin_DorsalScales',(.045,.145,.18,1)),
 'Belly':('skin_IvoryScutes',(.71,.67,.43,1)),
 'Crown':('hair_ReedCrown',(.65,.34,.075,1)),
 'Sail':('skin_WingSail',(.27,.51,.44,1)),
 'Edge':('skin_WingEdge',(.43,.32,.14,1)),
 'Iris':('iris_Amber',(.96,.47,.055,1)),
 'Ink':('ink_Details',(.013,.027,.028,1)),
 'Glint':('eye_Highlight',(.94,.9,.68,1)),
}
surfaces={k:Surface() for k in palette}
def w(name):return {name:1.0}
def sec(p,a,b,bone):return (p,a,b,w(bone) if isinstance(bone,str) else bone)
def loft(mat,sections,steps=4,sides=16,dorsal=0):tube(surfaces[mat],sections,steps,sides,dorsal)
def orb(mat,p,s,bone,sides=16,rings=10):ellipsoid(surfaces[mat],p,s,w(bone),sides,rings)
def scute(mat,p,u,v,width,length,height,bone):lens(surfaces[mat],p,u,v,width,length,height,w(bone) if isinstance(bone,str) else bone)
bones=[]
def bone(name,head,tail,parent=None):bones.append((name,head,tail,parent))
bone('root',(0,0,0),(0,0,1))
bone('pelvis',(0,1.7,2.7),(0,.4,2.9),'root')
bone('chest',(0,.4,2.9),(0,-1.6,3.3),'pelvis')
bone('neckBase',(0,-1.6,3.3),(0,-2.7,4.1),'chest')
bone('neckMid',(0,-2.7,4.1),(0,-3.6,4.9),'neckBase')
bone('head',(0,-3.6,4.9),(0,-5,4.9),'neckMid')
bone('jaw',(0,-4.3,4.55),(0,-5.8,4.4),'head')
tail=[(0,2.3,2.8),(.1,3.3,2.5),(.25,4.5,2),(.5,5.7,1.5),(.85,6.8,1.15),(1.4,7.7,1.35),(1.8,8.2,1.9)]
for i in range(6):bone('tail'+str(i),tail[i],tail[i+1],'pelvis' if i==0 else 'tail'+str(i-1))
# Integrated torso tapers into powerful wing girdle, hips and neck.
loft('Slate',[sec((0,2.9,2.7),.13,.2,'pelvis'),sec((0,2.3,2.8),.73,.7,'pelvis'),sec((0,1.3,2.8),1.06,.99,'pelvis'),sec((0,0,3),1.13,1.15,'chest'),sec((0,-1.25,3.25),1.04,1.16,'chest'),sec((0,-1.9,3.4),.72,.91,'neckBase'),sec((0,-2.6,3.95),.57,.71,'neckBase'),sec((0,-3.15,4.55),.5,.61,'neckMid'),sec((0,-3.65,4.85),.52,.57,'head')],5,24,.05)
# The ventral field shares the exact authored torso surface, avoiding detached plates.
body=surfaces['Slate'];ventral=surfaces['Belly'];keep=[];remap={}
for fi,face in enumerate(body.faces):
    if len(face)==4 and 14<=fi%24<=21:
        inds=[]
        for vi in face:
            if vi not in remap:remap[vi]=ventral.vertex(body.vertices[vi],body.weights[vi])
            inds.append(remap[vi])
        ventral.face(*inds)
    else:keep.append(face)
body.faces=keep
for ring in range(4,39,3):
    strip=[]
    for j in range(14,23):
        vi=ring*24+j;p=Vector(body.vertices[vi]);p.z-=.009
        strip.append(sec(p,.018,.017,body.weights[vi]))
    loft('Belly',strip,1,6)
loft('Slate',[sec(p,r,r*.87,'tail'+str(min(i,5))) for i,(p,r) in enumerate(zip(tail,[.59,.45,.33,.24,.15,.10,.01]))],6,16)
# Pear-shaped cranium into a long, softly hooked muzzle; jaw is an independent volume.
loft('Slate',[sec((0,-3.45,4.9),.43,.5,'head'),sec((0,-3.9,4.99),.72,.7,'head'),sec((0,-4.4,4.97),.79,.63,'head'),sec((0,-4.8,4.83),.57,.4,'head'),sec((0,-5.35,4.67),.51,.30,'head'),sec((0,-5.82,4.64),.43,.29,'head'),sec((0,-6.02,4.68),.12,.13,'head')],4,24)
head_surface=(list(surfaces['Slate'].vertices),list(surfaces['Slate'].faces))
def head_z(x,y):
    values=[];vs,fs=head_surface
    for face in fs:
        for j in range(1,len(face)-1):
            a,b,c=[vs[i] for i in (face[0],face[j],face[j+1])]
            den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
            if abs(den)<1e-9:continue
            u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den
            v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den
            if u>=-1e-6 and v>=-1e-6 and u+v<=1.000001:values.append(u*a[2]+v*b[2]+(1-u-v)*c[2])
    return max(values) if values else 4.9
def cranial_plate(mat,x,y,width,length,height):
    surf=surfaces[mat];start=len(surf.vertices)
    scute(mat,(x,y,0),(1,0,0),(0,1,0),width,length,height,'head')
    for i in range(start,len(surf.vertices)):
        px,py,pz=surf.vertices[i];surf.vertices[i]=(px,py,head_z(px,py)+pz+.002)
loft('Belly',[sec((0,-4,4.47),.52,.21,'jaw'),sec((0,-4.65,4.38),.53,.21,'jaw'),sec((0,-5.35,4.37),.47,.16,'jaw'),sec((0,-5.83,4.45),.29,.1,'jaw')],4,20)
for side in [-1,1]:
    # Cheek and brow plates form a welcoming swept eye socket rather than a round eyeball mask.
    orb('Slate',(side*.66,-4.28,5.19),(.15,.39,.24),'head',24,14)
    orb('Ink',(side*.719,-4.47,5.02),(.052,.245,.193),'head',24,14)
    orb('Iris',(side*.775,-4.50,5.04),(.057,.185,.172),'head',20,12)
    orb('Ink',(side*.819,-4.55,5.05),(.018,.066,.122),'head',16,10)
    orb('Glint',(side*.833,-4.594,5.113),(.012,.031,.034),'head',10,8)
    loft('Slate',[sec((side*.52,-4.82,5.02),.025,.035,'head'),sec((side*.69,-4.65,5.17),.073,.086,'head'),sec((side*.77,-4.43,5.23),.092,.088,'head'),sec((side*.75,-4.18,5.17),.070,.08,'head'),sec((side*.62,-3.98,5.06),.01,.018,'head')],5,16)
    loft('Slate',[sec((side*.56,-4.78,4.94),.02,.022,'head'),sec((side*.72,-4.62,4.85),.039,.047,'head'),sec((side*.78,-4.4,4.82),.044,.052,'head'),sec((side*.72,-4.14,4.93),.018,.028,'head')],5,14)
    # Eyelid crease and cheek plates follow the orbit rather than forming a faceted ring.
    loft('Scales',[sec((side*.61,-4.73,5.22),.010,.016,'head'),sec((side*.71,-4.51,5.31),.019,.021,'head'),sec((side*.69,-4.17,5.29),.009,.015,'head')],6,9)
    for k in range(3):scute('Scales',(side*(.68-k*.026),-4.05+k*.19,4.81-k*.04),(0,side,0),(0,0,1),.105,.19,.027,'head')
    orb('Ink',(side*.345,-5.74,4.86),(.081,.119,.035),'head',14,8)
    loft('Ink',[sec((side*.17,-5.94,4.48),.022,.024,'head'),sec((side*.44,-5.54,4.46),.025,.027,'head'),sec((side*.53,-4.94,4.53),.021,.022,'head'),sec((side*.63,-4.56,4.57),.012,.012,'head')],4,7)
    # Natural asymmetric crown: one tip has an old blunt break, and reeds sweep backward.
    for j in range(3):
        x=side*(.39+j*.16); y=-4.0+j*.19; z=5.45-j*.1
        h=[1.42,1.02,.70][j]*(.89 if side==-1 and j==0 else 1)
        loft('Crown',[sec((x,y,z),.18-j*.025,.17-j*.024,'head'),sec((x+side*.12,y+.34,z+h*.53),.12,.11,'head'),sec((x+side*.23,y+.88,z+h),.018 if side==1 else .037,.016 if side==1 else .032,'head')],5,10)
    # Swept cheek fins and small chin sensory barbels.
    for j in range(3):
        loft('Crown',[sec((side*.58,-3.85+j*.16,4.7-j*.12),.13,.1,'head'),sec((side*(1.0+j*.08),-3.14+j*.15,4.91-j*.19),.055,.045,'head'),sec((side*(1.16+j*.05),-2.88+j*.1,5.12-j*.28),.004,.004,'head')],3,9)
    loft('Edge',[sec((side*.35,-5.68,4.37),.052,.054,'jaw'),sec((side*.48,-5.5,4.02),.033,.035,'jaw'),sec((side*.52,-5.2,3.94),.003,.003,'jaw')],5,8)
    for k in range(4):
        yy=-5.50+k*.175
        cranial_plate('Slate',side*(.16+.028*sin(k)),yy,.084+.007*k,.105,.012)
cranial_plate('Scales',0,-4.34,.14,.27,.018)
for side in [-1,1]:cranial_plate('Slate',side*.25,-4.25,.13,.22,.015)
# Legs: folded high shoulder/hip, mobile elbow/hock, splayed three-toed feet.
for side in [-1,1]:
    suffix='L' if side>0 else 'R'
    for front in [True,False]:
        stem=('fore' if front else 'hind')+suffix
        a=(side*.79,-1.22 if front else 1.68,3.03 if front else 2.75)
        b=(side*1.17,-.5 if front else .90,1.66)
        c=(side*1.12,-1.14 if front else 2.05,.48)
        d=(side*1.18,-1.72 if front else 1.47,.20)
        bone(stem+'Upper',a,b,'chest' if front else 'pelvis');bone(stem+'Lower',b,c,stem+'Upper');bone(stem+'Foot',c,d,stem+'Lower')
        loft('Slate',[sec(a,.53 if front else .66,.58 if front else .68,stem+'Upper'),sec((side*1.03,(a[1]+b[1])*.5,2.42),.45,.51,{stem+'Upper':.94,stem+'Lower':.06}),sec((side*1.15,b[1]-.06,1.90),.37,.39,{stem+'Upper':.75,stem+'Lower':.25}),sec(b,.32,.35,{stem+'Upper':.48,stem+'Lower':.52}),sec((side*1.15,b[1]+(c[1]-b[1])*.31,1.31),.285,.30,{stem+'Upper':.17,stem+'Lower':.83}),sec(((b[0]+c[0])*.5,(b[1]+c[1])*.5,1.03),.26,.28,stem+'Lower'),sec(c,.24,.24,{stem+'Lower':.6,stem+'Foot':.4}),sec(d,.30,.19,stem+'Foot')],4,18)
        for j in range(3):
            tx=d[0]+(j-1)*.23;ty=d[1]-.34-(.12 if j==1 else 0)
            loft('Slate',[sec((tx,d[1]+.05,.24),.14,.17,stem+'Foot'),sec((tx,ty,.19),.11,.13,stem+'Foot'),sec((tx,ty-.2,.14),.065,.075,stem+'Foot')],3,10)
            loft('Crown',[sec((tx,ty-.13,.18),.083,.075,stem+'Foot'),sec((tx,ty-.30,.135),.055,.065,stem+'Foot'),sec((tx,ty-.49,.065),.005,.006,stem+'Foot')],3,10)
        for j in range(4):
            t=.22+j*.24;centre=Vector(a).lerp(Vector(b),t);centre.x+=side*(.46*(1-t)+.29*t)
            scute('Scales',centre,(0,side,0),(0,0,1),.14,.23,.025,stem+'Upper')
# Four long fingers articulate each wing. Membranes join wrist to finger tips and flank.
for side in [-1,1]:
    s='L' if side>0 else 'R'; shoulder=Vector((side*.77,-1.02,3.65)); elbow=Vector((side*2.35,-.76,4.43)); wrist=Vector((side*4.05,-2.0,5.13))
    bone('wingArm'+s,shoulder,elbow,'chest');bone('wingHand'+s,elbow,wrist,'wingArm'+s)
    loft('Slate',[sec((side*.44,-1.02,3.48),.59,.60,{'chest':.7,'wingArm'+s:.3}),sec(shoulder,.53,.53,{'chest':.43,'wingArm'+s:.57}),sec((side*1.48,-.88,4.05),.43,.44,'wingArm'+s),sec(elbow,.29,.31,{'wingArm'+s:.5,'wingHand'+s:.5}),sec((side*3.2,-1.40,4.88),.22,.235,'wingHand'+s),sec(wrist,.17,.19,'wingHand'+s)],5,18)
    tips=[Vector((side*8.5,.25,4.23)),Vector((side*7.1,2.10,3.58)),Vector((side*5.0,3.02,3.2)),Vector((side*2.9,2.55,2.95))]
    finger_paths=[]
    for j,tip in enumerate(tips):
        mid=wrist.lerp(tip,.51)+Vector((0,-.20,.28)); nm='finger'+str(j)+s
        bone(nm,wrist,mid,'wingHand'+s);bone(nm+'Tip',mid,tip,nm)
        finger_paths.append((wrist,mid,tip,nm))
        loft('Edge',[sec(wrist,.10,.11,nm),sec(mid,.080-j*.008,.072,nm+'Tip'),sec(tip,.012,.016,nm+'Tip')],7,10)
    # Thumb is a grasping hook, anatomically separate from membrane fingers.
    loft('Crown',[sec(wrist,.17,.15,'wingHand'+s),sec((side*4.2,-2.5,5.42),.095,.1,'wingHand'+s),sec((side*4.1,-2.7,5.25),.007,.01,'wingHand'+s)],5,10)
    bounds=tips+[Vector((side*.65,2.0,2.9))]
    for j in range(4):
        A=bounds[j];B=bounds[j+1];surf=surfaces['Sail'];grid=[];N=14;R=9
        for r in range(R+1):
            radial=r/R;row=[]
            for q in range(N+1):
                t=q/N;edge=A.lerp(B,t)
                # Scalloped trailing edges and a bowed tensile surface between spars.
                edge=edge.lerp(wrist,.14*sin(pi*t));p=wrist.lerp(edge,radial)
                p.z-=.23*sin(pi*t)*sin(pi*radial)
                p.z+=.045*sin(t*pi*7)*sin(pi*radial)*(1-radial)
                fblend=max(0,min(1,(radial-.30)/.43))
                wa=blend_weights(w('finger'+str(j)+s),w('finger'+str(j)+s+'Tip'),fblend)
                wb=blend_weights(w('finger'+str(j+1)+s),w('finger'+str(j+1)+s+'Tip'),fblend) if j<3 else w('pelvis')
                weights=blend_weights(wa,wb,t)
                if radial<.24:weights=blend_weights(w('wingHand'+s),weights,radial/.24)
                row.append(surf.vertex(p,weights))
            grid.append(row)
        for r in range(R):
            for q in range(N):
                inds=[grid[r][q],grid[r+1][q],grid[r+1][q+1],grid[r][q+1]]
                surf.face(*(inds if side>0 else inds[::-1]))
        # Rolled border follows the physical scallop, and small veins lend scale.
        border=[]
        for q in range(15):
            t=q/14;p=A.lerp(B,t).lerp(wrist,.14*sin(pi*t))
            wa=w('finger'+str(j)+s+'Tip');wb=w('finger'+str(j+1)+s+'Tip') if j<3 else w('pelvis')
            border.append(sec(p,.025,.027,blend_weights(wa,wb,t)))
        loft('Edge',border,1,6)
    # Shoulder overlapping armour conceals no articulation, and gives heroic volume.
    tangent=(elbow-shoulder).normalized()
    for row in range(3):
        seed=Vector((0,-cos(.35+row*.42),sin(.35+row*.42)));normal=(seed-tangent*tangent.dot(seed)).normalized();u=tangent.cross(normal).normalized()
        for j in range(4):
            t=.13+j*.18+row*.025;radius=.53*(1-t)+.31*t
            p=shoulder.lerp(elbow,t)+normal*(radius-.020)
            weights={'chest':max(0,.32-t),'wingArm'+s:1-max(0,.32-t)}
            scute('Scales',p,u,tangent,.12,.19+.025*sin(j),.025,weights)
# Organized dorsal reed crest; little terminal leaf fin echoes river vegetation.
for i in range(18):
    y=-3.1+i*.48+.045*sin(i*2.2)
    if y<2.3:
        profile=[(-3.65,5.42),(-3.15,5.16),(-2.6,4.66),(-1.9,4.31),(-1.25,4.41),(0,4.15),(1.3,3.79),(2.3,3.5)]
        for (ya,za),(yb,zb) in zip(profile,profile[1:]):
            if ya<=y<=yb:z=za+(zb-za)*(y-ya)/(yb-ya)-.035;break
        bn='neckMid' if y<-2.6 else 'neckBase' if y<-1.7 else 'chest' if y<.6 else 'pelvis'
    else:
        t=min(4.9,(y-2.3)/1.1);k=int(t);f=t-k;p=Vector(tail[k]).lerp(Vector(tail[k+1]),f);z=p.z+max(.05,.56-t*.1);bn='tail'+str(k)
    h=(.55 if i<10 else .40-(i-10)*.025)*(.9+.18*sin(i*1.3))
    loft('Crown',[sec((0,y,z),.07,.185,bn),sec((.04*sin(i*1.7),y+.18,z+h*.66),.045,.13,bn),sec((.065*sin(i),y+.45,z+h),.003,.009,bn)],5,10)
for side in [-1,1]:
    for row in range(3):
        for i in range(13):
            y=-1.38+i*.255+row*.115;angle=.58+row*.30+.02*sin(i*1.7)
            rw=1.13-.075*abs(y);rz=1.15-.080*max(0,y);cz=3.0-.1*y
            x=side*(rw+.01)*sin(angle);z=cz+(rz+.014)*cos(angle)
            scute('Scales',(x,y,z),(cos(angle),0,-side*sin(angle)),(0,1,0),.13+.014*sin(i),.195,.024,'chest' if y<.6 else 'pelvis')
    loft('Crown',[sec((1.55,7.89,1.48),.09,.11,'tail5'),sec((1.55+side*.6,8.05,1.8),.15,.28,'tail5'),sec((1.9+side*.72,8.18,2.14),.01,.02,'tail5')],4,10)

# Rig and mesh creation. Exactly one material per final mesh (runtime importer contract).
arm=bpy.data.armatures.new('Aurelian_Skeleton');rig=bpy.data.objects.new('RIG_Aurelian_Reedwing',arm);collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name,h,t,parent in bones:
    b=arm.edit_bones.new(name);b.head=h;b.tail=t
    if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for key,surf in surfaces.items():
    matname,color=palette[key];mat=bpy.data.materials.new(matname);mat.diffuse_color=color;mat.use_nodes=True
    bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bsdf.inputs['Base Color'].default_value=color;bsdf.inputs['Roughness'].default_value=.72 if key not in ['Iris','Glint'] else .29
    mesh=bpy.data.meshes.new('Aurelian_'+key);mesh.from_pydata(surf.vertices,[],surf.faces);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    obj=bpy.data.objects.new(('EYE_' if key in ['Iris','Ink','Glint'] else '')+'Aurelian_'+key,mesh);collection.objects.link(obj);mesh.materials.append(mat)
    for poly in mesh.polygons:poly.use_smooth=True
    groups={name:obj.vertex_groups.new(name=name) for name,_,_,_ in bones}
    for vi,weights in enumerate(surf.weights):
        total=sum(weights.values())
        for name,weight in weights.items():groups[name].add([vi],weight/total,'REPLACE')
    mod=obj.modifiers.new('Aurelian_Deform','ARMATURE');mod.object=rig;obj.parent=rig
    obj['original_authoring']='Summer Haven / Aurelian Reedwing';obj['material_contract']='single material, preserve baseColor'

# Motion clips. All joint axes are quaternion based; looping endpoints match exactly.
rig.animation_data_create()
def rotate_global(name,axis,angle):
    pb=rig.pose.bones[name];local_axis=pb.bone.matrix_local.to_3x3().inverted()@Vector(axis)
    pb.rotation_quaternion=Quaternion(local_axis,angle)
def rotate_multiple(name,axes):
    pb=rig.pose.bones[name];q=Quaternion((1,0,0,0));basis=pb.bone.matrix_local.to_3x3().inverted()
    for axis,angle in axes:q=q@Quaternion(basis@Vector(axis),angle)
    pb.rotation_quaternion=q
for state,duration in [('idle',150),('flight',60),('glide',120),('alert',90),('takeoff',90),('landing',90)]:
    action=bpy.data.actions.new(state);action.use_fake_user=True;rig.animation_data.action=action
    for fr in range(1,duration+2,3):
        t=(fr-1)/duration;phase=t*math.tau
        for pb in rig.pose.bones:pb.rotation_quaternion=(1,0,0,0);pb.location=(0,0,0)
        rest=state in ['idle','alert'];fold=1.0 if rest else max(0,1-t*2) if state=='takeoff' else max(0,(t-.5)*2) if state=='landing' else 0
        pulse=sin(phase);flightphase=phase if state=='flight' else phase*1.5
        for side in [-1,1]:
            s='L' if side>0 else 'R'
            flap=.44*sin(flightphase) if state in ['flight','takeoff','landing'] else .035*sin(phase)
            rotate_multiple('wingArm'+s,[((0,0,1),side*fold*1.25),((0,1,0),side*(fold*.18+flap*(1-fold)))])
            rotate_global('wingHand'+s,(0,0,1),side*(fold*.15+.045*sin(phase-.7)*(1-fold)))
            for j in range(4):
                # Collapse the radial fan into a narrow set of swept resting fingers.
                fold_angles=[-.32,-.78,-1.23,-1.67]
                rotate_global('finger'+str(j)+s,(0,0,1),side*fold*fold_angles[j])
                rotate_multiple('finger'+str(j)+s+'Tip',[((0,0,1),side*fold*.12),((0,1,0),side*(.05*sin(phase-.6-j*.2))*(1-fold))])
            for limb in ['fore','hind']:
                rotate_global(limb+s+'Upper',(1,0,0),(.28 if limb=='fore' else -.33)*(1-fold))
                rotate_global(limb+s+'Lower',(1,0,0),(-.58 if limb=='fore' else .45)*(1-fold))
        rotate_global('chest',(1,0,0),0 if rest else .016*pulse)
        rotate_global('neckBase',(1,0,0),(-.09 if state=='flight' else -.13*sin(pi*t) if state=='alert' else 0)+.026*sin(phase-.3))
        rotate_global('neckMid',(0,0,1),.12*sin(pi*t) if state=='alert' else .02*sin(phase))
        rotate_global('head',(0,0,1),.32*sin(pi*t) if state=='alert' else .025*sin(phase-.7))
        rotate_global('jaw',(1,0,0),.14*sin(pi*t) if state=='alert' else .01*(1+pulse))
        for i in range(6):rotate_global('tail'+str(i),(0,0,1),.045*sin(phase-i*.49))
        for pb in rig.pose.bones:pb.keyframe_insert(data_path='rotation_quaternion',frame=fr,group=pb.name)
    track=rig.animation_data.nla_tracks.new();track.name=state;track.strips.new(state,1,action);track.mute=True
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_quaternion=(1,0,0,0)
scene.frame_set(1)
rig['forward']='Blender -Y, glTF +Z';rig['units']='metres';rig['feet_contact_z']=min(v[2] for surf in surfaces.values() for v in surf.vertices)

# Review studio is excluded from GLB selection; untouched default Scene remains intact.
world=bpy.data.worlds.new('Aurelian_ReviewWorld');world.use_nodes=True;scene.world=world
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.12,.16,.18,1);bg.inputs['Strength'].default_value=.55
for name,loc,power,size,color in [('Key',(5,-10,14),2100,9,(1,.86,.66)),('Fill',(-10,-4,8),1700,8,(.65,.81,1)),('Rim',(1,9,11),2500,7,(1,.77,.44))]:
    light=bpy.data.lights.new('Review_'+name,'AREA');light.energy=power;light.shape=next(i.identifier for i in light.bl_rna.properties['shape'].enum_items if i.identifier=='DISK');light.size=size;light.color=color
    ob=bpy.data.objects.new(light.name,light);scene.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,3))-ob.location).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.cameras.new('ReviewCamera');camera=bpy.data.objects.new('ReviewCamera',cam);scene.collection.objects.link(camera);scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=21
camera.location=(15,-21,13);camera.rotation_euler=(Vector((0,.7,2.9))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1440;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        sp=area.spaces.active;sp.shading.type='SOLID';sp.shading.color_type='MATERIAL';sp.region_3d.view_distance=23;sp.region_3d.view_location=(0,.5,3);sp.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
for obj in scene.objects:obj.select_set(obj==rig or obj.parent==rig)
bpy.context.view_layer.objects.active=rig
out=ROOT/'public/assets/creatures';out.mkdir(parents=True,exist_ok=True)
import io_scene_gltf2
formats=io_scene_gltf2.get_format_items(None,bpy.context)
glb=next(item[0] for item in formats if item[0]=='GLB')
bpy.ops.export_scene.gltf(filepath=str(out/'aurelian-reedwing.glb'),export_format=glb,use_selection=True,use_active_scene=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_apply=False)
metrics={'name':'Aurelian Reedwing','bones':len(bones),'meshes':len(surfaces),'materials':len(palette),'triangles':0,'vertices':0,'clips':{},'bbox_blender':None}
allverts=[]
for obj in collection.objects:
    if obj.type=='MESH':
        obj.data.calc_loop_triangles();metrics['triangles']+=len(obj.data.loop_triangles);metrics['vertices']+=len(obj.data.vertices);allverts.extend([obj.matrix_world@v.co for v in obj.data.vertices])
metrics['bbox_blender']={'min':[min(v[k] for v in allverts) for k in range(3)],'max':[max(v[k] for v in allverts) for k in range(3)]}
for track in rig.animation_data.nla_tracks:metrics['clips'][track.name]=round((track.strips[0].action.frame_range[1]-1)/30,3)
(out/'aurelian-reedwing.json').write_text(json.dumps(metrics,indent=2))
bpy.data.libraries.write(str(ROOT/'tools/blender/dragons/aurelian-reedwing.blend'),{scene},fake_user=True,compress=True)
print(json.dumps(metrics))
