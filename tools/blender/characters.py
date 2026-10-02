"""Summer Haven original modular adult characters. Execute in Blender via MCP.
Metres, Z-up authoring, front = -Y. glTF converts to Y-up, front = +Z.
All clothing fits the same 22-joint rig. Covered torso/legs are omitted at runtime.
"""
import bpy, math, json
from mathutils import Vector
from math import sin, cos, pi

SCENE='SummerHaven_Characters'
if SCENE in bpy.data.scenes:
    bpy.context.window.scene=bpy.data.scenes[SCENE]
    for obj in list(bpy.context.scene.objects): bpy.data.objects.remove(obj,do_unlink=True)
else:
    bpy.context.window.scene=bpy.data.scenes.new(SCENE)
scene=bpy.context.scene
for collection in list(scene.collection.children):
    if collection.users==1:bpy.data.collections.remove(collection)
    else:scene.collection.children.unlink(collection)
scene.unit_settings.scale_length=1.0
COL={}
for name in ['CHARACTER','CLOTHING','HAIR','ACCESSORIES','PRESENTATION']:
    c=bpy.data.collections.new(name);scene.collection.children.link(c);COL[name]=c

def material(name,hexcode):
    m=bpy.data.materials.new(name);m.use_nodes=True
    h=hexcode.lstrip('#');rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    rgba=tuple((v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4) for v in rgb)+(1,)
    m.diffuse_color=rgba
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=rgba;n.inputs['Roughness'].default_value=.85
    return m
MAT={k:material(k,v) for k,v in {'skin':'#deb294','hair':'#382c28','hair_light':'#57453a','top_light':'#f5eedb','top_shadow':'#c8bea8','lining':'#eee8d7','eye_white':'#f5eee1','iris':'#426b62','ink':'#312a2d','lip':'#a75f56','top':'#eee4cb','bottom':'#6b8496','seam':'#b9a787','sole':'#dbd3bf','shoe':'#f2eee2','straw':'#cba974','glass':'#555142','bag':'#aa7551','metal':'#b9b7a8','button':'#917150'}.items()}
current=None;suffix='';bones={}
def mesh(name,verts,faces,mat,group='CHARACTER',weights=None):
    me=bpy.data.meshes.new(name+suffix);me.from_pydata(verts,[],faces);me.update()
    o=bpy.data.objects.new(name+suffix,me);COL[group].objects.link(o);o.data.materials.append(MAT[mat]);o.parent=current
    for p in me.polygons:p.use_smooth=True
    # Deterministic per-corner UVs, useful for later hand painting.
    uv=me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        for li in p.loop_indices:
            v=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(v.x*2+.5,v.z*.5)
    if current:
        mod=o.modifiers.new('Skin','ARMATURE');mod.object=current
        groups={}
        for i,v in enumerate(verts):
            ws=weights(v) if callable(weights) else {weights or 'head':1.0}
            for b,w in ws.items():
                if w<.001:continue
                if b not in groups:groups[b]=o.vertex_groups.new(name=b)
                groups[b].add([i],w,'REPLACE')
    return o

def rings(name,profile,mat,group='CHARACTER',weight='head',n=24,pleat=0):
    # z, halfwidth, depth, centre-y; ring topology with shaped cross sections.
    vs=[];fs=[]
    for k,(z,w,d,y) in enumerate(profile):
        for j in range(n):
            a=2*pi*j/n;r=1+pleat*cos(a*12)
            vs.append((sin(a)*w*r,y-cos(a)*d*r,z))
    for k in range(len(profile)-1):
        for j in range(n):a=k*n+j;b=k*n+(j+1)%n;fs.append((a,b,b+n,a+n))
    fs.extend([tuple(range(n-1,-1,-1)),tuple((len(profile)-1)*n+j for j in range(n))])
    return mesh(name,vs,fs,mat,group,weight)

def ellipsoid(name,center,scale,mat,group='CHARACTER',weight='head',seg=20,rows=12):
    vs=[];fs=[]
    for i in range(rows+1):
        t=pi*i/rows
        for j in range(seg):
            a=2*pi*j/seg;vs.append((center[0]+sin(t)*cos(a)*scale[0],center[1]+sin(t)*sin(a)*scale[1],center[2]+cos(t)*scale[2]))
    for i in range(rows):
        for j in range(seg):a=i*seg+j;b=i*seg+(j+1)%seg;fs.append((a,b,b+seg,a+seg))
    return mesh(name,vs,fs,mat,group,weight)

def tube(name,points,radii,mat,group='CHARACTER',weight='head',sides=12):
    vs=[];fs=[]
    for i,pt in enumerate(points):
        p=Vector(pt);t=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        t.normalize();u=t.cross(Vector((0,1,0)));u.normalize();v=t.cross(u).normalized()
        r=radii[i] if isinstance(radii,list) else radii
        for j in range(sides):
            a=j*2*pi/sides;point=p+r*(cos(a)*u+sin(a)*v)
            if name.startswith('BODY_leg'):point.z=min(point.z,.708)
            if name.startswith('BODY_arm'):point.z=min(point.z,1.218)
            vs.append(tuple(point))
    for i in range(len(points)-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
    fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+j for j in range(sides))])
    return mesh(name,vs,fs,mat,group,weight)

def bind_limb(a,b,joint,zjoint,blend=.09):
    def weights(v):
        t=max(0,min(1,(v[2]-zjoint+blend)/(blend*2)))
        return {a:t,b:1-t}
    return weights

def make_rig(kind):
    global current,bones,suffix
    suffix='_F' if kind=='feminine' else '_M'
    fem=kind=='feminine';shoulder=.192 if fem else .231;hip=.112 if fem else .108
    arm=bpy.data.armatures.new('SKEL_'+kind);current=bpy.data.objects.new('RIG_'+kind,arm);COL['CHARACTER'].objects.link(current)
    bpy.context.view_layer.objects.active=current;current.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    spec=[('root',(0,0,0),(0,0,.12),None),('hips',(0,0,.88),(0,0,1.0),'root'),('spine',(0,0,1.0),(0,0,1.23),'hips'),('chest',(0,0,1.23),(0,0,1.43),'spine'),('neck',(0,0,1.43),(0,0,1.51),'chest'),('head',(0,0,1.51),(0,0,1.78),'neck')]
    for s,side in [(1,'L'),(-1,'R')]:
        spec += [(f'upper_arm_{side}',(s*shoulder,0,1.40),(s*(shoulder+.055),0,1.15),'chest'),(f'forearm_{side}',(s*(shoulder+.055),0,1.15),(s*(shoulder+.085),-.015,.94),f'upper_arm_{side}'),(f'hand_{side}',(s*(shoulder+.085),-.015,.94),(s*(shoulder+.087),-.025,.84),f'forearm_{side}'),(f'thigh_{side}',(s*hip,0,.90),(s*hip,-.018,.49),'hips'),(f'shin_{side}',(s*hip,-.018,.49),(s*hip,0,.105),f'thigh_{side}'),(f'foot_{side}',(s*hip,0,.105),(s*hip,-.14,.07),f'shin_{side}'),(f'hair_{side}',(s*.08,.035,1.70),(s*.10,.06,1.43),'head'),(f'cloth_{side}',(s*.1,0,.95),(s*.16,0,.64),'hips')]
    bones={}
    for name,a,b,parent in spec:
        bone=arm.edit_bones.new(name);bone.head=a;bone.tail=b
        if parent:bone.parent=arm.edit_bones[parent]
        bones[name]=(a,b)
    bpy.ops.object.mode_set(mode='OBJECT');current.select_set(False)
    current['author']='Summer Haven';current['units']='metres';current['forward']='-Y in Blender, +Z in glTF';current['body_preset']=kind
    return fem,shoulder,hip

from pathlib import Path
for module in ['hair.py','clothing.py']:
    exec(compile((Path(__file__).parent/module).read_text(encoding='utf-8'),module,'exec'),globals())

def character(kind):
    fem,sh,hip=make_rig(kind)
    # Continuous profiled torso has a real waist, ribcage, shoulder line and neck.
    torso=[(.88,.16 if fem else .145,.105,0),(.98,.145 if fem else .15,.09,0),(1.08,.115 if fem else .154,.08,0),(1.20,.148 if fem else .184,.11,-.008),(1.32,.17 if fem else .213,.12,-.012),(1.40,sh,.087,0),(1.445,.091,.069,0),(1.46,.06,.06,0)]
    def torso_w(v):
        z=v[2]
        if z<1.02:return {'hips':1}
        if z<1.23:return {'spine':1}
        return {'chest':1}
    def coat_w(v):
        if v[2]>=1.02:return torso_w(v)
        # The front hem rests on the lap; the rear stays behind the seated hips.
        k=max(0,min(.6,(1.02-v[2])/.28))*max(.08,min(1,(-v[1]+.012)/.13))
        return {'hips':1-k,'cloth_L' if v[0]>0 else 'cloth_R':k}
    rings('BODY_torso',torso,'skin',weight=torso_w)
    rings('BODY_neck',[(1.4,.056,.052,0),(1.5,.052,.051,0),(1.55,.065,.054,0)],'skin',weight='neck')
    head=[(1.49,.033,.035,-.053),(1.51,.067,.068,-.026),(1.54,.103 if fem else .113,.096,-.009),(1.59,.136 if fem else .143,.118,0),(1.65,.146,.125,.004),(1.71,.144,.128,.012),(1.77,.11,.106,.014),(1.81,.045,.045,.01),(1.818,.005,.005,.01)]
    rings('FACE_head',head,'skin',n=40)
    for s,side in [(1,'L'),(-1,'R')]:
        ellipsoid('FACE_ear_'+side,(s*.146,.001,1.615),(.026,.02,.038),'skin')
        # Flat almond eyes placed on the gently curved front face, with iris/lash detail.
        cx=s*.065;cy=-.117;cz=1.642
        for label,w,h,yy,mat in [('white',.044,.019,0,'eye_white'),('iris',.015,.018,-.007,'iris'),('pupil',.0065,.013,-.010,'ink'),('spark',.0038,.0045,-.012,'eye_white')]:
            if label=='white':
                vs=[(cx,cy+yy,cz)]+[(cx+cos(a*2*pi/32)*w,cy+yy+.014*abs(cos(a*2*pi/32)),cz+sin(a*2*pi/32)*h) for a in range(32)]
                fs=[(0,j+1,(j+1)%32+1) for j in range(32)]
                mesh('EYE_'+label+'_'+side,vs,fs,mat)
            else:ellipsoid('EYE_'+label+'_'+side,(cx-(.004 if label=='spark' else 0),cy+yy,cz+(.006 if label=='spark' else 0)),(w,.004,h),mat,seg=16,rows=8)
        tube('FACE_lash_'+side,[(cx-.043,-.104,cz),(cx-.027,-.120,cz+.017),(cx,-.124,cz+.021),(cx+.029,-.116,cz+.014),(cx+.046,-.102,cz+.003)],.0028,'ink',sides=6)
        tube('FACE_brow_'+side,[(cx-.037,-.111,cz+.040),(cx,-.127,cz+.045),(cx+.035,-.110,cz+.039)],.0035 if fem else .0048,'hair',sides=6)
    # Sculpted bridge and tip, subtle lips; no oversized sphere nose.
    mesh('FACE_nose',[(-.010,-.116,1.62),(.010,-.116,1.62),(0,-.150,1.585),(-.013,-.120,1.575),(.013,-.120,1.575)],[(0,1,2),(0,2,3),(2,1,4),(3,2,4)],'skin')
    tube('FACE_mouth',[(-.021,-.114,1.548),(-.008,-.124,1.546),(0,-.126,1.545),(.011,-.122,1.547),(.023,-.112,1.55)],.0018,'lip',sides=6)
    # Arm and leg shells have smoothly varying cross-sections and blended joint weights.
    for s,side in [(1,'L'),(-1,'R')]:
        armpts=[(s*sh,0,1.4),(s*(sh+.012),0,1.35),(s*(sh+.03),0,1.26),(s*(sh+.055),0,1.15),(s*(sh+.067),-.006,1.07),(s*(sh+.085),-.015,.94)]
        tube('BODY_arm_'+side,armpts,[.065,.067,.049,.037,.043,.027],'skin',weight=bind_limb('upper_arm_'+side,'forearm_'+side,None,1.15),sides=16)
        tube('BODY_shoulder_'+side,armpts[:4],[.065,.067,.049,.037],'skin',weight=bind_limb('upper_arm_'+side,'forearm_'+side,None,1.15),sides=16)
        ellipsoid('BODY_palm_'+side,(s*(sh+.087),-.020,.898),(.032,.023,.047),'skin',weight='hand_'+side)
        for j in range(4):
            xx=s*(sh+.064+j*.014);tube('BODY_finger_'+side+str(j),[(xx,-.02,.88),(xx,-.026,.84+abs(j-1.5)*.006),(xx,-.037,.83+abs(j-1.5)*.006)],[.008,.007,.0055],'skin',weight='hand_'+side,sides=8)
        tube('BODY_thumb_'+side,[(s*(sh+.062),-.014,.915),(s*(sh+.049),-.04,.887),(s*(sh+.049),-.05,.873)],[.012,.010,.008],'skin',weight='hand_'+side,sides=8)
        pts=[(s*hip,0,.92),(s*hip,0,.84),(s*hip,-.007,.68),(s*hip,-.018,.49),(s*hip,.008,.34),(s*hip,0,.105)]
        tube('BODY_leg_'+side,pts,[.091 if fem else .085,.085,.068,.047,.059,.032],'skin',weight=bind_limb('thigh_'+side,'shin_'+side,None,.49),sides=18)
        # Each bottom is separately fitted, and legs covered by trousers are hidden in runtime.
        for opt in [0,1,3]:
            p=pts[:3] if opt==0 else pts
            if opt==0:p=[(s*hip,0,.94),(s*hip,0,.86),(s*hip,-.006,.71)]
            rs=[.105,.102,.092] if opt==0 else [.102,.105,.093,.078,.069,.057] if opt==3 else [.109,.112,.104,.098,.088,.069]
            if opt==3:p=pts[:-1]+[(s*hip,0,.16)]
            tube('BOTTOM_'+str(opt)+'_leg_'+side,p,rs,'bottom','CLOTHING',bind_limb('thigh_'+side,'shin_'+side,None,.49),16)
        for opt in range(3):
            ellipsoid('SHOE_'+str(opt)+'_sole_'+side,(s*hip,-.065,.047),(.064,.139,.032),'sole','CLOTHING','foot_'+side)
            if opt==0:
                ellipsoid('SHOE_0_upper_'+side,(s*hip,-.059,.087),(.058,.127,.049),'shoe','CLOTHING','foot_'+side)
                for j in range(3):tube('SHOE_0_lace_'+side+str(j),[(s*hip-.028,-.078+j*.018,.13),(s*hip+.028,-.07+j*.018,.13)],.003,'sole','CLOTHING','foot_'+side,6)
            elif opt==2:
                ellipsoid('SHOE_2_upper_'+side,(s*hip,-.058,.09),(.060,.129,.047),'bag','CLOTHING','foot_'+side)
                tube('SHOE_2_vamp_'+side,[(s*hip-.047,-.056,.118),(s*hip,-.064,.134),(s*hip+.047,-.056,.118)],.005,'seam','CLOTHING','foot_'+side,8)
            else:
                ellipsoid('SHOE_1_foot_'+side,(s*hip,-.045,.080),(.053,.108,.031),'skin','CLOTHING','foot_'+side)
                for yy in [-.11,-.022]:tube('SHOE_1_strap_'+side+str(yy),[(s*hip-.057,yy,.072),(s*hip-.045,yy,.107),(s*hip+.045,yy,.107),(s*hip+.057,yy,.072)],.012,'bag','CLOTHING','foot_'+side,8)
    for opt in [0,1,3]:rings('BOTTOM_'+str(opt)+'_waist',[(.9,.218,.124,0),(.96,.181,.122,0),(1.005,.157,.107,0)],'bottom','CLOTHING','hips')
    for sign,side in [(1,'L'),(-1,'R')]:
        tube('BOTTOM_3_cuff_'+side,[(sign*hip,0,.17),(sign*hip,0,.145)],[.061,.061],'bottom','CLOTHING','shin_'+side,18)
    rings('BOTTOM_2_skirt',[(.99,.140,.096,0),(.91,.171,.113,0),(.78,.226,.17,0),(.61,.285,.208,0),(.59,.289,.212,0)],'bottom','CLOTHING',lambda v:{'hips':max(.15,min(1,(v[2]-.6)/.35)),'cloth_L' if v[0]>0 else 'cloth_R':1-max(.15,min(1,(v[2]-.6)/.35))},48,.04)
    build_tops(torso,sh,torso_w,coat_w)
    build_hair()
    # Accessory geometry: woven sunhat, wired round glasses, shoulder satchel.
    rings('ACC_0_hat',[(1.80,.10,.10,.016),(1.84,.158,.14,.016),(1.94,.14,.125,.016),(1.97,.10,.09,.016)],'straw','ACCESSORIES','head',40)
    rings('ACC_0_brim',[(1.831,.248,.215,.016),(1.836,.25,.217,.016),(1.85,.145,.13,.016)],'straw','ACCESSORIES','head',48)
    rings('ACC_0_ribbon',[(1.847,.16,.142,.016),(1.864,.157,.14,.016)],'bag','ACCESSORIES','head',40)
    for obj in COL['ACCESSORIES'].objects:
        if obj.parent==current and obj.name.startswith('ACC_0_'):
            for vertex in obj.data.vertices:vertex.co.z-=.03
    for s in [-1,1]:
        pts=[(s*.065+cos(i*2*pi/32)*.049,-.145,1.645+sin(i*2*pi/32)*.035) for i in range(33)]
        tube('ACC_1_rim_'+str(s),pts,.0027,'glass','ACCESSORIES','head',6)
        tube('ACC_1_temple_'+str(s),[(s*.111,-.141,1.65),(s*.147,-.057,1.655),(s*.151,.01,1.645)],.0028,'glass','ACCESSORIES','head',6)
    tube('ACC_1_bridge',[(-.016,-.145,1.645),(0,-.155,1.655),(.016,-.145,1.645)],.0025,'glass','ACCESSORIES','head',6)
    ellipsoid('ACC_2_bag',(.218,-.01,.943),(.094,.06,.12),'bag','ACCESSORIES','hips',20,12)
    tube('ACC_2_strap',[(-.14,-.025,1.424),(-.08,-.144,1.33),(.10,-.145,1.12),(.218,-.055,.98)],.012,'bag','ACCESSORIES',torso_w,8)
    ellipsoid('ACC_2_clasp',(.218,-.071,.967),(.013,.006,.011),'metal','ACCESSORIES','hips',12,6)
    # Authored action library. Runtime blends/retargets these compatible skeletal channels.
    rig=current;rig.animation_data_create()
    for state,duration in [('idle',60),('walk',30),('jog',22),('cycle',30),('sit',30),('interact',40),('mount',30),('dismount',30),('brake',30),('turn',30)]:
        action=bpy.data.actions.new(state);rig.animation_data.action=action
        for fr in range(1,duration+2,3):
            phase=(fr-1)/duration*2*pi
            for b in rig.pose.bones:b.rotation_quaternion=(1,0,0,0);b.location=(0,0,0)
            for side,sgn in [('L',1),('R',-1)]:
                if state in ['walk','jog']:
                    amp=.50 if state=='walk' else .82
                    angles={f'thigh_{side}':sin(phase)*amp*sgn,f'shin_{side}':max(0,-sin(phase)*sgn)*.72,f'upper_arm_{side}':-sin(phase)*amp*.6*sgn,f'forearm_{side}':-.12}
                elif state in ['cycle','brake','sit','mount','dismount']:
                    blend=min(1,(fr-1)/duration) if state=='mount' else max(0,1-(fr-1)/duration) if state=='dismount' else 1
                    angles={f'thigh_{side}':blend*(-1.05+(.32*sin(phase)*sgn if state=='cycle' else 0)),f'shin_{side}':blend*1.45,f'upper_arm_{side}':blend*-.7,f'forearm_{side}':blend*-.55}
                elif state=='interact':angles={f'upper_arm_{side}':-.3 if side=='R' else 0,f'forearm_{side}':-.7*(sin(phase)*.3+.7) if side=='R' else -.05}
                else:angles={f'upper_arm_{side}':sin(phase)*.025*sgn,f'forearm_{side}':-.08}
                from mathutils import Quaternion
                for b,a in angles.items():rig.pose.bones[b].rotation_quaternion=Quaternion((1,0,0),a)
            rig.pose.bones['chest'].rotation_quaternion=Quaternion((1,0,0),sin(phase)*.016)
            for b in rig.pose.bones:
                b.keyframe_insert(data_path='rotation_quaternion',frame=fr,group=b.name)
        action.use_fake_user=True
        track=rig.animation_data.nla_tracks.new();track.name=state;strip=track.strips.new(state,1,action);track.mute=True
    rig.animation_data.action=None
    for b in rig.pose.bones:b.rotation_quaternion=(1,0,0,0)
    return rig

rigF=character('feminine');rigM=character('masculine')
for o in scene.objects:
    o.select_set(False)
    if o.type=='MESH':
        # Inspectable default outfit in Blender; exports include all modules.
        visible=(o.name.endswith('_F') and (not any(o.name.startswith(x) for x in ['TOP_','BOTTOM_','SHOE_','HAIR_','ACC_']) or any(o.name.startswith(x) for x in ['TOP_1_','BOTTOM_0_','SHOE_0_','HAIR_0_','ACC_2_'])))
        o.hide_set(not visible)
rigM.hide_set(True)
scene.world=bpy.data.worlds.new('Warm studio');scene.world.color=(.3,.3,.3)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.shading.type='MATERIAL'
        area.spaces.active.region_3d.view_distance=2.5
        area.spaces.active.region_3d.view_location=(0,0,1.05)
print(json.dumps({'scene':scene.name,'rigs':[rigF.name,rigM.name],'objects':len(scene.objects),'bones':len(rigF.data.bones),'mesh_vertices':sum(len(o.data.vertices) for o in scene.objects if o.type=='MESH')}))
