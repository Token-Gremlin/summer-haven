"""Vesper Siltfin: original, independently authored aquatic dragon.
Only rebuilds Haven_Siltfin. Blender Z-up/-Y-forward; exported Three Y-up/+Z-forward.
"""
import bpy,bmesh,math,json,sys,importlib,hashlib,struct
from pathlib import Path
from mathutils import Vector,Quaternion,Matrix
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(Path(__file__).parent))
import siltfin_meshcraft as mc
importlib.reload(mc)
Surface,tube,lens,ellipsoid,blend_weights=mc.Surface,mc.tube,mc.lens,mc.ellipsoid,mc.blend_weights
sin,cos,pi=math.sin,math.cos,math.pi
preserved={s.name:len(s.objects) for s in bpy.data.scenes if s.name!='Haven_Siltfin'}
old=bpy.data.scenes.get('Haven_Siltfin')
if old:
    actions={st.action for ob in old.objects if ob.animation_data for tr in ob.animation_data.nla_tracks for st in tr.strips}
    for ob in list(old.objects):bpy.data.objects.remove(ob,do_unlink=True)
    bpy.data.scenes.remove(old)
    for a in actions:
        if a.users<=1:bpy.data.actions.remove(a)
scene=bpy.data.scenes.new('Haven_Siltfin');bpy.context.window.scene=scene
scene.render.fps=30
try:scene.render.engine='BLENDER_EEVEE'
except TypeError:pass
palette={'Pearl':('skin_SiltfinPearl','#a8bbc0'),'Belly':('skin_SiltfinBelly','#d1d0b8'),'Indigo':('skin_SiltfinIndigo','#45516b'),'Fin':('skin_SiltfinFin','#6d93a1'),'Copper':('hair_SiltfinCopper','#bb865d'),'Ink':('ink_Siltfin','#192b38'),'Iris':('iris_Siltfin','#deaf56'),'Glint':('eye_Siltfin','#f3e4c1')}
surfs={k:Surface() for k in palette};bones=[];limbs={}
def w(n):return {n:1.0}
def sec(p,a,b,n):return (p,a,b,w(n) if isinstance(n,str) else n)
def loft(mat,sections,steps=3,sides=12):tube(surfs[mat],sections,steps,sides)
def orb(mat,p,s,n,sides=16,rings=10):ellipsoid(surfs[mat],p,s,w(n),sides,rings)
def plate(mat,p,u,v,width,length,height,n):lens(surfs[mat],p,u,v,width,length,height,w(n) if isinstance(n,str) else n)
def bone(n,a,b,parent=None):bones.append((n,tuple(a),tuple(b),parent))
bone('root',(0,0,0),(0,0,.5))
bone('pelvis',(0,1.1,.97),(0,.35,1.05),'root')
bone('chest',(0,.35,1.05),(0,-1.35,1.10),'pelvis')
bone('neck',(0,-1.35,1.10),(0,-2.20,1.30),'chest')
bone('head',(0,-2.20,1.30),(0,-3.35,1.19),'neck')
bone('jaw',(0,-2.35,1.04),(0,-3.33,1.0),'head')
tail=[(0,1.60,.97),(.04,2.35,.79),(.09,3.05,.57),(.12,3.75,.40),(.12,4.35,.26),(.08,4.93,.16),(0,5.42,.12)]
for i in range(6):bone('tail'+str(i),tail[i],tail[i+1],'pelvis' if i==0 else 'tail'+str(i-1))
sections=[sec((0,-3.52,1.17),.055,.07,'head'),sec((0,-3.32,1.18),.34,.17,'head'),sec((0,-2.96,1.26),.38,.23,'head'),sec((0,-2.65,1.36),.47,.36,'head'),sec((0,-2.24,1.32),.40,.36,'head'),sec((0,-1.90,1.18),.33,.36,'neck'),sec((0,-1.30,1.04),.57,.51,'chest'),sec((0,-.35,1.03),.63,.54,{'chest':.65,'pelvis':.35}),sec((0,.65,1.0),.50,.43,'pelvis'),sec((0,1.30,.98),.55,.46,'pelvis'),sec((0,1.80,.94),.40,.34,{'pelvis':.6,'tail0':.4}),sec((.05,2.60,.72),.29,.24,{'tail0':.25,'tail1':.75}),sec((.11,3.40,.48),.21,.17,{'tail2':.7,'tail3':.3}),sec((.12,4.20,.29),.14,.12,{'tail3':.7,'tail4':.3}),sec((.07,4.87,.17),.076,.067,{'tail4':.35,'tail5':.65}),sec((0,5.42,.12),.006,.009,'tail5')]
loft('Pearl',sections,4,24)
body=surfs['Pearl'];base_faces=list(body.faces);base_vertices=len(body.vertices)
# Each limb starts in a genuine torso opening, then shares a continuous elbow/hock/palm loft.
for side in [-1,1]:
    suffix='L' if side>0 else 'R'
    for front in [True,False]:
        nm=('fore' if front else 'hind')+suffix;parent='chest' if front else 'pelvis'
        a=Vector((side*.49,-1.20 if front else 1.17,1.02 if front else .98))
        b=Vector((side*.84,-.84 if front else .83,.57 if front else .60))
        c=Vector((side*.94,-1.24 if front else 1.35,.19 if front else .21))
        d=Vector((side*.96,-1.47 if front else 1.13,.115))
        for name,h,t,par in [(nm+'Upper',a,b,parent),(nm+'Lower',b,c,nm+'Upper'),(nm+'Foot',c,d,nm+'Lower')]:bone(name,h,t,par)
        limbs[nm]={'a':a,'b':b,'c':c,'d':d,'side':side,'front':front}
        r0,r1=(20,25) if front else (32,37);j0,j1=(22,26) if side>0 else (10,14)
        idx=lambda r,j:r*24+j%24
        boundary=[idx(r,j0) for r in range(r0,r1+1)]+[idx(r1,j) for j in range(j0+1,j1+1)]+[idx(r,j1) for r in range(r1-1,r0-1,-1)]+[idx(r0,j) for j in range(j1-1,j0,-1)]
        patch={idx(r,j) for r in range(r0,r1+1) for j in range(j0,j1+1)}
        body.faces=[face for face in body.faces if not(len(face)==4 and all(i in patch for i in face))]
        branch=Surface();tube(branch,[sec(a,.26,.30,{parent:.35,nm+'Upper':.65}),sec(a.lerp(b,.48),.25,.27,nm+'Upper'),sec(b,.20,.22,{nm+'Upper':.48,nm+'Lower':.52}),sec(b.lerp(c,.52),.155,.16,nm+'Lower'),sec(c,.135,.13,{nm+'Lower':.65,nm+'Foot':.35}),sec(d,.19,.11,nm+'Foot'),sec(d+Vector((0,-.18,-.025)),.18,.078,nm+'Foot'),sec(d+Vector((0,-.29,-.03)),.09,.04,nm+'Foot')],3,18)
        candidates=[seq[k:]+seq[:k] for seq in [boundary,list(reversed(boundary))] for k in range(18)]
        boundary=min(candidates,key=lambda seq:sum((Vector(body.vertices[i])-Vector(branch.vertices[j])).length_squared for j,i in enumerate(seq)))
        prev=boundary
        for q in [1/3,2/3]:
            ring=[]
            for j,vi in enumerate(boundary):
                p=Vector(body.vertices[vi]).lerp(Vector(branch.vertices[j]),q);p.x+=side*.045*sin(pi*q)
                ring.append(body.vertex(p,blend_weights(body.weights[vi],branch.weights[j],q)))
            for j in range(18):body.face(prev[j],prev[(j+1)%18],ring[(j+1)%18],ring[j])
            prev=ring
        remap=[body.vertex(p,ww) for p,ww in zip(branch.vertices,branch.weights)]
        for j in range(18):body.face(prev[j],prev[(j+1)%18],remap[(j+1)%18],remap[j])
        for face in branch.faces[:-2]+branch.faces[-1:]:body.face(*(remap[i] for i in face))
        # Three articulated toes with membrane webs fixed to the same toe weights.
        paths=[]
        for j in range(3):
            start=d+Vector(((j-1)*.14,.015,-.002));tip=d+Vector(((j-1)*.20,-.35-(.09 if j==1 else 0),-.060));mid=start.lerp(tip,.52)+Vector((0,0,.015));toe=nm+'Toe'+str(j)
            bone(toe,start,tip,nm+'Foot');paths.append((start,mid,tip,toe))
            loft('Pearl',[sec(start,.078,.07,nm+'Foot'),sec(mid,.065,.056,toe),sec(tip,.037,.04,toe)],3,10)
            loft('Copper',[sec(tip+Vector((0,.028,.009)),.047,.041,toe),sec(tip+Vector((0,-.09,-.014)),.026,.023,toe),sec(tip+Vector((0,-.18,-.031)),.003,.004,toe)],3,8)
        for j in range(2):
            pa,pb=paths[j],paths[j+1];sf=surfs['Fin'];rows=[]
            for k in range(5):
                t=k/4;a=pa[0].lerp(pa[2],t*.83);b=pb[0].lerp(pb[2],t*.83)
                row=[]
                for q in range(5):
                    u=q/4;p=a.lerp(b,u);p.y+=.055*sin(pi*u)*t;p.z+=.014*sin(pi*u)
                    ww=blend_weights(w(pa[3]),w(pb[3]),u);row.append(sf.vertex(p,ww))
                rows.append(row)
            for ra,rb in zip(rows,rows[1:]):
                for q in range(4):sf.face(ra[q],ra[q+1],rb[q+1],rb[q])
# The ventral pearl field reuses the exact torso vertices and weights, without overlapping shells.
ventral={tuple(face) for i,face in enumerate(base_faces[:-2]) if 13<=i%24<=22}
keep=[];belly=surfs['Belly'];mapping={}
for f in body.faces:
    if tuple(f) in ventral:
        ids=[]
        for vi in f:
            if vi not in mapping:mapping[vi]=belly.vertex(body.vertices[vi],body.weights[vi])
            ids.append(mapping[vi])
        belly.face(*ids)
    else:keep.append(f)
body.faces=keep
# Separate modeled mandible, chin fold, lips and soft expressive orbital anatomy.
loft('Belly',[sec((0,-2.32,1.00),.29,.15,'jaw'),sec((0,-2.65,.98),.40,.15,'jaw'),sec((0,-3.10,.995),.33,.105,'jaw'),sec((0,-3.40,1.08),.19,.060,'jaw')],4,20)
for side in [-1,1]:
    suffix='L' if side>0 else 'R'
    orb('Ink',(side*.442,-2.75,1.46),(.041,.185,.144),'head',20,12)
    orb('Iris',(side*.475,-2.77,1.47),(.039,.141,.115),'head',20,12)
    orb('Ink',(side*.505,-2.79,1.472),(.012,.040,.091),'head',12,10)
    orb('Glint',(side*.516,-2.835,1.516),(.009,.023,.023),'head',8,6)
    lid='lid'+suffix;bone(lid,(side*.42,-2.76,1.56),(side*.42,-2.93,1.55),'head')
    loft('Pearl',[sec((side*.36,-2.97,1.47),.014,.025,'head'),sec((side*.455,-2.88,1.595),.047,.062,lid),sec((side*.472,-2.70,1.63),.068,.068,lid),sec((side*.420,-2.48,1.53),.063,.07,'head'),sec((side*.33,-2.33,1.44),.01,.01,'head')],4,14)
    loft('Pearl',[sec((side*.37,-2.98,1.42),.018,.022,'head'),sec((side*.46,-2.80,1.325),.032,.04,'head'),sec((side*.46,-2.62,1.35),.038,.04,'head'),sec((side*.40,-2.49,1.45),.014,.02,'head')],4,12)
    loft('Indigo',[sec((side*.36,-2.95,1.59),.008,.012,'head'),sec((side*.43,-2.74,1.70),.013,.012,'head'),sec((side*.365,-2.48,1.64),.006,.007,'head')],4,7)
    orb('Ink',(side*.22,-3.28,1.315),(.060,.085,.022),'head',12,7)
    loft('Ink',[sec((side*.12,-3.48,1.115),.012,.01,'head'),sec((side*.31,-3.22,1.075),.014,.012,'head'),sec((side*.40,-2.89,1.09),.012,.012,'head'),sec((side*.385,-2.48,1.13),.003,.003,'head')],4,7)
    # Swept water crown: broad roots taper into three unequal curved flutes.
    for j in range(3):
        x=side*(.24+j*.105);yy=-2.33+j*.13;zz=1.59-j*.09
        endz=[2.07,1.89,1.72][j]-(.04 if side<0 and j==0 else 0)
        loft('Copper',[sec((x,yy,zz),.09-j*.014,.075,'head'),sec((x+side*.08,yy+.24,zz+.20),.064,.05,'head'),sec((x+side*.13,yy+.58,endz),.028,.024,'head'),sec((x+side*.14,yy+.75,endz-.05),.004,.006,'head')],4,10)
    # Low cheek fan rooted behind the opercular fold; no flight wings.
    fin='cheekFin'+suffix;bone(fin,(side*.33,-2.25,1.29),(side*.75,-1.75,1.33),'head')
    roots=[];tips=[]
    for j in range(4):
        a=Vector((side*.35,-2.30+j*.07,1.30-j*.08));b=Vector((side*(.77+.04*sin(j)),-1.67+j*.12,1.55-j*.19));roots.append(a);tips.append(b)
        loft('Copper',[sec(a,.036,.027,'head'),sec(a.lerp(b,.6),.022,.018,fin),sec(b,.003,.006,fin)],4,8)
    sf=surfs['Fin']
    for j in range(3):
        ids=[]
        for k in range(6):
            t=k/5;a=roots[j].lerp(tips[j],t);b=roots[j+1].lerp(tips[j+1],t)
            ids.append([sf.vertex(a.lerp(b,u)+Vector((0,.035*sin(pi*u)*t,0)),blend_weights(w('head'),w(fin),t)) for u in [0,.25,.5,.75,1]])
        for a,b in zip(ids,ids[1:]):
            for k in range(4):sf.face(a[k],a[k+1],b[k+1],b[k])
    # Two short sensory barbels are swept under the muzzle rather than added as straight rods.
    loft('Copper',[sec((side*.20,-3.31,1.04),.025,.028,'jaw'),sec((side*.33,-3.23,.88),.02,.018,'jaw'),sec((side*.36,-3.00,.83),.003,.004,'jaw')],4,8)
# Anatomical scale fields follow the source surface normals, clustered rather than uniform armouring.
for ring in range(5,57,2):
    for j in [2,4,6,8,10]:
        if ring<16 and j not in [4,6,8]:continue
        vi=ring*24+j;p=Vector(body.vertices[vi]);prev=Vector(body.vertices[max(0,ring-1)*24+j]);nxt=Vector(body.vertices[min(60,ring+1)*24+j]);v=(nxt-prev).normalized();u=Vector(body.vertices[ring*24+(j+1)%24])-Vector(body.vertices[ring*24+(j-1)%24]);u.normalize()
        norm=u.cross(v).normalized()
        if norm.z<0:u=-u;norm=-norm
        width=.061 if ring<17 else .12 if ring<40 else .065;length=.098 if ring<17 else .22 if ring<40 else .14
        plate('Indigo',p+norm*.006,u,v,width,length,.018 if ring<17 else .025,body.weights[vi])
# An integrated indigo dorsal field supports the relief scales; pearl flanks remain exposed.
dorsal_faces={tuple(f) for i,f in enumerate(base_faces[:-2]) if 18<=i//24<=54 and (3 if (i//24)%7<3 else 2)<=i%24<=9}
retained=[];remap={};dark=surfs['Indigo']
for f in body.faces:
    if tuple(f) in dorsal_faces:
        ids=[]
        for vi in f:
            if vi not in remap:remap[vi]=dark.vertex(body.vertices[vi],body.weights[vi])
            ids.append(remap[vi])
        dark.face(*ids)
    else:retained.append(f)
body.faces=retained
# A continuous dorsal ribbon with a scalloped free edge and flexible fin rays.
sf=surfs['Fin'];dorsal=[]
for ring in range(19,61):
    vi=ring*24+6;p=Vector(body.vertices[vi]);height=(.15+.18*sin((ring-19)/25*pi)**2 if ring<44 else .38*sin(pi*(ring-44)/17)**.85)*min(1,(ring-19)/3,(61-ring)/3)
    ww=body.weights[vi];ids=[]
    for q in range(4):
        t=q/3;ids.append(sf.vertex(p+Vector((.018*sin(ring*.5)*t,0,height*t*(.8+.2*sin(ring*pi/3)**2))),ww))
    dorsal.append(ids)
for a,b in zip(dorsal,dorsal[1:]):
    for j in range(3):sf.face(a[j],b[j],b[j+1],a[j+1])
for ring in range(21,59,4):
    ids=dorsal[ring-19];p=Vector(sf.vertices[ids[0]]);q=Vector(sf.vertices[ids[-1]])
    loft('Copper',[sec(p,.016,.014,sf.weights[ids[0]]),sec(q,.005,.006,sf.weights[ids[-1]])],2,6)
# Tail paddle is vertical and slender, with true body-weighted membrane continuity.
for side in [-1]:
    sf=surfs['Fin'];rows=[]
    for ring in range(45,61):
        vi=ring*24+(6 if side>0 else 18);p=Vector(body.vertices[vi]);weight=body.weights[vi];t=(ring-45)/15;width=.38*sin(pi*t)**.85
        if side<0:width=min(width,max(0,p.z-.05))
        rows.append([sf.vertex(p+Vector((0,0,side*width*q/4)),weight) for q in range(5)])
    for a,b in zip(rows,rows[1:]):
        for j in range(4):sf.face(a[j],b[j],b[j+1],a[j+1])
# Small limb scales emphasize extensor volumes without disguising the joints.
for nm,d in limbs.items():
    for k in range(3):
        t=.2+k*.24;p=d['a'].lerp(d['b'],t);p.x+=d['side']*.19
        plate('Indigo',p,(0,d['side'],0),(0,0,1),.085,.13,.012,nm+'Upper')
# Normalize the actual authored sole minimum to the origin; shift rig and geometry together.
foot_vertices=[p for sf in surfs.values() for p,ww in zip(sf.vertices,sf.weights) if any('Toe' in n or n.endswith('Foot') for n in ww)]
contact=min(p[2] for p in foot_vertices)
for sf in surfs.values():sf.vertices=[(p[0],p[1],p[2]-contact) for p in sf.vertices]
bones=[(n,(a[0],a[1],a[2]-contact),(b[0],b[1],b[2]-contact),par) for n,a,b,par in bones]
for d in limbs.values():
    for k in ['a','b','c','d']:d[k].z-=contact
# Rear soles are independently normalized; blended ankle vertices follow the correction.
for prefix in ['hindL','hindR']:
    matches=lambda ww:sum(value for n,value in ww.items() if n.startswith(prefix) and ('Foot' in n or 'Toe' in n))
    delta=min(p[2] for sf in surfs.values() for p,ww in zip(sf.vertices,sf.weights) if matches(ww)>.99)
    for sf in surfs.values():sf.vertices=[(p[0],p[1],p[2]-delta*matches(ww)) for p,ww in zip(sf.vertices,sf.weights)]
arm=bpy.data.armatures.new('Siltfin_Skeleton');rig=bpy.data.objects.new('RIG_Vesper_Siltfin',arm);scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n,a,b,par in bones:
    eb=arm.edit_bones.new(n);eb.head=a;eb.tail=b
    if par:eb.parent=arm.edit_bones[par]
bpy.ops.object.mode_set(mode='OBJECT')
for key,sf in surfs.items():
    matname,h=palette[key];rgb=[int(h[i:i+2],16)/255 for i in [1,3,5]];rgb=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    mat=bpy.data.materials.new(matname);mat.use_nodes=True;mat.diffuse_color=(*rgb,1);bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Roughness'].default_value=.57 if key not in ['Iris','Glint'] else .26
    me=bpy.data.meshes.new('Vesper_'+key);me.from_pydata(sf.vertices,[],sf.faces);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    ob=bpy.data.objects.new(('EYE_' if key in ['Iris','Ink','Glint'] else '')+'Vesper_'+key,me);scene.collection.objects.link(ob);ob.parent=rig;me.materials.append(mat)
    for p in me.polygons:p.use_smooth=True
    groups={n:ob.vertex_groups.new(name=n) for n,a,b,par in bones}
    for i,ww in enumerate(sf.weights):
        total=sum(ww.values())
        for n,weight in ww.items():groups[n].add([i],weight/total,'REPLACE')
    mod=ob.modifiers.new('Siltfin_Deform','ARMATURE');mod.object=rig
rig.animation_data_create()
def rotate(n,axis,angle):
    p=rig.pose.bones[n];axis=p.bone.matrix_local.to_3x3().inverted()@Vector(axis);p.rotation_quaternion=Quaternion(axis,angle)
def aim(n,start,end):
    p=rig.pose.bones[n];rest=p.bone;direction=(end-start).normalized();q=(rest.tail_local-rest.head_local).normalized().rotation_difference(direction)@rest.matrix_local.to_quaternion();p.matrix=Matrix.LocRotScale(start,q,Vector((1,1,1)))
def solve_leg(nm,target):
    d=limbs[nm];upper=rig.pose.bones[nm+'Upper'];a=upper.head.copy();l1=(d['b']-d['a']).length;l2=(d['c']-d['b']).length;direction=target-a;dist=min(l1+l2-.002,max(.05,direction.length));u=direction.normalized();pole=d['b']-a;v=pole-u*pole.dot(u)
    if v.length<.001:v=Vector((d['side'],0,0))
    v.normalize();along=(l1*l1-l2*l2+dist*dist)/(2*dist);bend=a+u*along+v*math.sqrt(max(.00001,l1*l1-along*along))
    aim(nm+'Upper',a,bend);bpy.context.view_layer.update();aim(nm+'Lower',bend,target);bpy.context.view_layer.update()
    foot=rig.pose.bones[nm+'Foot'];foot.matrix=Matrix.LocRotScale(target,foot.bone.matrix_local.to_quaternion(),Vector((1,1,1)))
clips=[('idle',120),('swim',72),('alert',90),('submerge',72),('surface',72),('crawl',96)]
for state,duration in clips:
    action=bpy.data.actions.new('Siltfin_'+state);action.use_fake_user=True;rig.animation_data.action=action
    for fr in range(1,duration+2,2):
        t=(fr-1)/duration;ph=t*math.tau
        for pb in rig.pose.bones:pb.rotation_mode='QUATERNION';pb.rotation_quaternion=(1,0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
        swim=state in ['swim','submerge','surface'];amp=1 if swim else .15 if state=='crawl' else .07
        rotate('pelvis',(0,0,1),.045*amp*sin(ph));rotate('chest',(0,0,1),.065*amp*sin(ph-.7))
        rotate('neck',(0,0,1),(-.045*amp*sin(ph-1.2)+(.16*sin(pi*t) if state=='alert' else 0)))
        rotate('head',(0,0,1),.22*sin(pi*t) if state=='alert' else .025*amp*sin(ph-1.7))
        if state in ['submerge','surface']:
            sign=1 if state=='submerge' else -1;rotate('neck',(1,0,0),sign*.18*sin(pi*t));rotate('chest',(1,0,0),sign*.10*sin(pi*t))
        rotate('jaw',(1,0,0),.16*sin(pi*t) if state=='alert' else .012*(1+sin(ph)))
        for i in range(6):rotate('tail'+str(i),(0,0,1),amp*(.055+i*.023)*sin(ph-i*.58))
        for side in [-1,1]:
            suffix='L' if side>0 else 'R';rotate('cheekFin'+suffix,(0,0,1),side*(.12*amp*sin(ph-.4)+(.22*sin(pi*t) if state=='alert' else 0)))
            blink=max(0,1-abs(t-.65)/.045)*.10;pb=rig.pose.bones['lid'+suffix];pb.location=pb.bone.matrix_local.to_3x3().inverted()@Vector((0,0,-blink))
        bpy.context.view_layer.update()
        for nm,d in limbs.items():
            target=d['c'].copy()
            if state=='crawl':
                target.z+=.001
                offset=0 if (d['side']>0)==d['front'] else .5;q=(t+offset)%1
                if q<.6:target.y+=-.20+.40*q/.6
                else:target.y+=.20-.40*(q-.6)/.4;target.z+=.13*sin(pi*(q-.6)/.4)
            elif swim:
                q=ph+(0 if d['front'] else pi)+d['side']*.6;target.x*=.88;target.y+=.25+.13*sin(q);target.z+=.15+.065*cos(q)
            solve_leg(nm,target)
            if swim:
                for j in range(3):rotate(nm+'Toe'+str(j),(0,0,1),(j-1)*.12*sin(ph+.4))
        for pb in rig.pose.bones:
            pb.keyframe_insert('rotation_quaternion',frame=fr,group=pb.name)
            if pb.name!='root':pb.keyframe_insert('location',frame=fr,group=pb.name)
    tr=rig.animation_data.nla_tracks.new();tr.name=state;tr.strips.new(state,1,action);tr.mute=True
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_quaternion=(1,0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
scene.frame_set(1);bpy.context.view_layer.update()
for ob in scene.objects:ob.select_set(ob==rig or ob.parent==rig)
bpy.context.view_layer.objects.active=rig
import io_scene_gltf2
fmt=next(i[0] for i in io_scene_gltf2.get_format_items(None,bpy.context) if i[0]=='GLB')
out=ROOT/'public/assets/creatures';out.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out/'vesper-siltfin.glb'),export_format=fmt,use_selection=True,use_active_scene=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_apply=False)
# Remove constant root-translation animation channels; the bone's static bind offset remains.
glbpath=out/'vesper-siltfin.glb';exported=glbpath.read_bytes();old_json_length=struct.unpack_from('<I',exported,12)[0];document=json.loads(exported[20:20+old_json_length])
for action in document.get('animations',[]):
    action['channels']=[ch for ch in action['channels'] if not(document['nodes'][ch['target']['node']].get('name') in ['root','RIG_Vesper_Siltfin'] and ch['target']['path']=='translation')]
encoded=json.dumps(document,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);binary_chunk=exported[20+old_json_length:]
glbpath.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(encoded)+len(binary_chunk))+struct.pack('<I4s',len(encoded),b'JSON')+encoded+binary_chunk)
verts=[];tris=0
for ob in rig.children:
    ob.data.calc_loop_triangles();tris+=len(ob.data.loop_triangles);verts.extend(v.co for v in ob.data.vertices)
lo=[min(p[k] for p in verts) for k in range(3)];hi=[max(p[k] for p in verts) for k in range(3)]
raw=(out/'vesper-siltfin.glb').read_bytes();g=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
report={'candidate':'Vesper Siltfin 01','scene':scene.name,'root':rig.name,'triangles':tris,'bones':len(bones),'meshes':len(surfs),'units':'metres','up':'Y','forward':'+Z','root_transform':'identity','morph_targets':False,'bounds_three':{'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]},'contact_source_shift':contact,'clips':{n:d/30 for n,d in clips},'root_translation':False,'feet':[nm+'Foot' for nm in limbs],'waterline_recommendation_local_y':.95-contact,'crawl_recommended_speed_mps':.40/(3.2*.6),'export':{'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'clips':[a['name'] for a in g['animations']],'single_material_per_mesh':all(len(m['primitives'])==1 for m in g['meshes']),'bone_names':[g['nodes'][i]['name'] for i in g['skins'][0]['joints']],'mesh_names':[n['name'] for n in g['nodes'] if 'mesh' in n]},'preserved_scenes':preserved}
(out/'vesper-siltfin.json').write_text(json.dumps(report,indent=2))
bpy.data.libraries.write(str(ROOT/'tools/blender/siltfin/vesper-siltfin.blend'),{scene},fake_user=True,compress=True)
print(json.dumps({k:report[k] for k in ['triangles','bones','bounds_three','clips']}))
