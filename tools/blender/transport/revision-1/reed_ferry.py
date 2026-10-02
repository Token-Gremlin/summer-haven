"""Original Summer Haven Reed Ferry; rebuilds only Haven_Transport.
Run via Blender MCP with this file's absolute path as __file__.
Blender -Y is forward, Z is up; the boat origin is its calm-water plane.
"""
import bpy,bmesh,math,json,hashlib,struct
from pathlib import Path
from mathutils import Vector
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[3]
sin,cos,pi=math.sin,math.cos,math.pi
old=bpy.data.scenes.get('Haven_Transport')
if old:
    data=[o.data for o in old.objects if o.data];mats=set(m for o in old.objects if o.type=='MESH' for m in o.data.materials);world=old.world
    for o in list(old.objects):bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.scenes.remove(old)
    for d in data:
        if not d.users:
            for db in [bpy.data.meshes,bpy.data.cameras,bpy.data.lights]:
                if db.get(d.name)==d:db.remove(d);break
    for m in mats:
        if not m.users:bpy.data.materials.remove(m)
    if world and not world.users:bpy.data.worlds.remove(world)
scene=bpy.data.scenes.new('Haven_Transport');bpy.context.window.scene=scene
palette={'mahogany':('wood','#79553b'),'cedar':('wood','#ae8051'),'pale':('wood','#c5a477'),'teal':('roof','#3d6b69'),'cream':('cloth','#d9cca0'),'rope':('cloth','#a9966c'),'brass':('metal','#b69b53'),'dark':('metal','#364442'),'glow':('glow','#f5d18c')}
mats={}
for key,(prefix,h) in palette.items():
    rgb=[int(h[i:i+2],16)/255 for i in [1,3,5]];linear=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(prefix+'_ReedFerry_'+key);m.use_nodes=True;m.diffuse_color=(*linear,1)
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*linear,1);n.inputs['Roughness'].default_value=.69
    if key=='brass':n.inputs['Metallic'].default_value=.32
    if key=='glow':n.inputs['Emission Color'].default_value=(*linear,1);n.inputs['Emission Strength'].default_value=.65
    mats[key]=m

class Craft:
    def __init__(self,name,parent=None,pivot=(0,0,0)):
        self.root=bpy.data.objects.new(name,None);scene.collection.objects.link(self.root);self.root.parent=parent;self.root.location=pivot;self.parts={}
    def add(self,key,vs,fs,smooth=False):
        v,f,sm=self.parts.setdefault(key,([],[],[]));offset=len(v);v.extend(tuple(p) for p in vs);f.extend(tuple(offset+i for i in face) for face in fs);sm.extend([smooth]*len(fs))
    def box(self,c,size,key='cedar',bevel=.02):
        x,y,z=c;w,d,h=[v*.5 for v in size];b=min(bevel,w*.25,h*.25)
        poly=[(-w+b,-h),(w-b,-h),(w,-h+b),(w,h-b),(w-b,h),(-w+b,h),(-w,h-b),(-w,-h+b)]
        vs=[(x+a,y+dy,z+bz) for dy in [-d,d] for a,bz in poly];n=len(poly)
        self.add(key,vs,[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)])
    def tube(self,points,r=.03,key='cedar',sides=8):
        points=[Vector(p) for p in points];vs=[];prev=None;prev_t=None
        for i,p in enumerate(points):
            t=(points[min(i+1,len(points)-1)]-points[max(i-1,0)]).normalized()
            if prev is None:
                u=t.cross(Vector((0,0,1)))
                if u.length<.01:u=t.cross(Vector((0,1,0)))
                u.normalize()
            else:u=prev_t.rotation_difference(t)@prev
            v=t.cross(u).normalized();rr=r[i] if isinstance(r,list) else r
            vs.extend(p+rr*(u*cos(j*2*pi/sides)+v*sin(j*2*pi/sides)) for j in range(sides));prev=u;prev_t=t
        fs=[tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+j for j in range(sides))]
        for i in range(len(points)-1):
            for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
        self.add(key,vs,fs,True)
    def beam(self,a,b,r=.04,key='cedar',sides=8):self.tube([a,b],r,key,sides)
    def leaf(self,center,axis,length,width,key='brass'):
        c=Vector(center);v=Vector(axis).normalized();u=Vector((1,0,0))
        if abs(v.dot(u))>.8:u=Vector((0,1,0))
        u=(u-v*v.dot(u)).normalized();n=u.cross(v);outline=[(0,-.5),(.85,-.15),(1,.08),(.52,.32),(0,.5),(-.52,.32),(-1,.08),(-.85,-.15)]
        vs=[c+u*a*width+v*b*length for a,b in outline]+[c+n*.045]
        self.add(key,vs,[(i,(i+1)%8,8) for i in range(8)],True)
    def finish(self):
        for key,(vs,fs,sm) in self.parts.items():
            me=bpy.data.meshes.new(self.root.name+'_'+key);me.from_pydata(vs,[],fs);me.update()
            bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
            for p,s in zip(me.polygons,sm):p.use_smooth=s
            ob=bpy.data.objects.new(self.root.name+'_'+key,me);scene.collection.objects.link(ob);ob.parent=self.root;me.materials.append(mats[key])
            ob['material_contract']='one material per mesh; retain baseColor'
        return self.root

f=Craft('FERRY_Reed')
# A continuous double-skin shell, with shallow applied strakes following its curvature.
def hull(t,a,inside=False):
    y=-2.25+4.5*t;w=.028+.972*sin(pi*t)**.62
    bottom=-.37+.72*(abs(2*t-1)**3.2);top=.48+.31*(abs(2*t-1)**2.4)
    if inside:w-=.045*sin(pi*t);bottom+=.07
    return (w*sin(a),y,bottom+(top-bottom)*(1-cos(a))**.68)
longs=34;cross=24
for inner in [False,True]:
    vs=[hull(i/longs,-pi*.5+pi*j/cross,inner) for i in range(longs+1) for j in range(cross+1)]
    fs=[]
    for i in range(longs):
        for j in range(cross):a=i*(cross+1)+j;face=(a,a+1,a+cross+2,a+cross+1);fs.append(tuple(reversed(face)) if inner else face)
    f.add('mahogany' if not inner else 'cedar',vs,fs,True)
# Close the laminated upper lip and the two small stem end faces.
for side in [-1,1]:
    vs=[hull(i/longs,side*pi*.5,inside) for i in range(longs+1) for inside in [False,True]]
    f.add('mahogany',vs,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(longs)],True)
for t in [0,1]:
    vs=[hull(t,-pi*.5+pi*j/cross,inside) for j in range(cross+1) for inside in [False,True]]
    f.add('mahogany',vs,[(2*j,2*j+1,2*j+3,2*j+2) for j in range(cross)],True)
for side in [-1,1]:
    rail=[hull(i/longs,side*pi*.5) for i in range(longs+1)];f.tube(rail,.052,'mahogany',10)
    f.tube([(x,y,z-.105) for x,y,z in rail],.025,'teal',7)
    # Carvel seams and the warm exposed edge of each continuous plank.
    for j in range(1,6):
        a=side*pi*.5*(j/6)**.68;pts=[Vector(hull(i/longs,a)) for i in range(longs+1)]
        f.tube([p+Vector((side*.006,0,.004)) for p in pts],.010,'pale',5)
    for i in [7,13,20,27]:
        t=i/longs;pts=[hull(t,-pi*.5+pi*j/16,True) for j in range(17)];f.tube([(x,y,z+.024) for x,y,z in pts],.025,'mahogany',7)
# Bow/stern laminated stems and scarf caps, not flat transom boxes.
for t in [0,1]:
    p=hull(t,0);q=hull(t,pi*.5)
    f.tube([(0,p[1],p[2]-.035),(0,p[1]+(-.06 if t==0 else .035),q[2]),(0,p[1]+(-.015 if t==0 else -.045),q[2]+.16)],[.04,.055,.023],'mahogany',9)
    f.leaf((0,p[1]+(-.063 if t==0 else .063),q[2]-.04),(0,0,1),.31,.10,'brass')
# Fitted floorboards; each follows the narrowing hull planform.
for j in range(9):
    x=(j-4)*.172;edge=abs(x)+.082;allowed=[]
    for i in range(501):
        t=i/500;bottom=hull(t,0,True)[2];top=hull(t,pi*.5,True)[2];w=hull(t,pi*.5,True)[0]
        fraction=(.128-bottom)/(top-bottom)
        if 0<fraction<1 and w*math.sqrt(max(0,1-(1-fraction**(1/.68))**2))>edge:allowed.append(abs(-2.25+4.5*t))
    reach=max(allowed)-.025 if allowed else .15
    f.box((x,0,.165),(.163,reach*2,.065),'pale' if j%3==0 else 'cedar',.012)
    for y in [-reach+.13,reach-.13]:f.beam((x,y,.2),(x,y,.207),.014,'dark',6)
# Passenger bench/back and open stern rower's thwart.
for y,width in [(-.82,1.62),(1.02,1.55)]:
    for k in [-1,0,1]:f.box((0,y+k*.135,.60 if y<0 else .57),(width,.126,.078),'pale',.017)
    for x in [-.58,.58]:
        f.box((x,y,.38),(.10,.32,.37),'mahogany')
        f.beam((x,y-.16,.23),(x,y+.16,.55),.045,'mahogany')
for x in [-.70,.70]:f.beam((x,-.63,.58),(x,-.55,1.03),.043,'mahogany')
for z in [.82,.98]:f.box((0,-.57,z),(1.5,.06,.12),'teal')
# Rope-tied bent canopy frame. Clear middle access remains on both sides.
for y in [-1.52,.27]:
    pts=[(.83*sin(-pi*.5+pi*i/20),y,1.72+.33*cos(-pi*.5+pi*i/20)) for i in range(21)]
    f.tube(pts,.030,'mahogany',8)
    for side in [-1,1]:
        x=side*.83;f.tube([(x*.95,y,.49),(x,y,1.18),(x,y,1.73)],[.035,.025,.032],'mahogany',8)
        for k in range(4):
            z=1.57+k*.023;f.tube([(x+.043*cos(a),y+.043*sin(a),z) for a in [i*2*pi/12 for i in range(13)]],.012,'rope',5)
for side in [-1,1]:f.beam((side*.86,-1.64,1.72),(side*.86,.41,1.72),.025,'mahogany')
# Seven gently sagging canvas panels, edge seams and scalloped valances.
for k in range(7):
    a0=-pi*.5+pi*k/7;a1=-pi*.5+pi*(k+1)/7;vs=[]
    for j in range(13):
        t=j/12;y=-1.67+2.10*t
        for i in range(5):
            a=a0+(a1-a0)*i/4;vs.append((.90*sin(a),y,1.74+.35*cos(a)-.052*sin(pi*t)**2))
    fs=[]
    for j in range(12):
        for i in range(4):a=j*5+i;fs.append((a,a+1,a+6,a+5))
    f.add('cream' if k%2==0 else 'teal',vs,fs,True)
    f.tube([(.90*sin(a0),-1.67+2.10*j/16,1.748+.35*cos(a0)-.052*sin(pi*j/16)**2) for j in range(17)],.009,'rope',5)
for side in [-1,1]:
    vs=[]
    for i in range(29):
        y=-1.67+2.10*i/28;drop=.12+.04*sin(pi*i/4)**2;vs.extend([(side*.9,y,1.74),(side*.918,y,1.74-drop)])
    f.add('teal',vs,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(28)],True)
    f.tube([(side*.918,-1.67+2.10*i/28,1.62-.04*sin(pi*i/4)**2) for i in range(29)],.011,'rope',5)
# Leaf-ended bow ridge finial and small woodwork braces.
f.tube([(0,-1.80,2.09),(0,-1.67,2.19),(0,-1.52,2.10)],.022,'brass',7)
for side in [-1,1]:
    f.beam((side*.80,-1.52,1.36),(side*.60,-1.52,1.92),.022,'mahogany')
    f.beam((side*.80,.27,1.36),(side*.60,.27,1.92),.022,'mahogany')
    # Coil and cleat are separate real rope/wood volumes.
    x=side*.77;y=.55
    f.box((x,y,.57),(.09,.19,.10),'mahogany');f.beam((x,y-.16,.64),(x,y+.16,.64),.027,'brass')
    if side<0:
        pts=[]
        for i in range(91):
            a=i*2*pi/30;r=.105+.035*i/90;pts.append((-.58+r*cos(a),.42+r*.67*sin(a),.23+.016*i/90))
        f.tube(pts,.013,'rope',6)
    # Woven rope bumper pads hang below the sheerline.
    for y in [-1.2,.35]:
        xx=side*(hull((y+2.25)/4.5,pi*.5)[0]+.07)
        f.tube([(xx,y,.49),(xx+side*.025,y,.30),(xx,y,.11)],[.038,.062,.033],'rope',8)
        for k in range(4):
            z=.19+k*.052;f.tube([(xx+.060*cos(a),y+.055*sin(a),z) for a in [i*2*pi/10 for i in range(11)]],.013,'pale',5)
# Low boarding tread over the starboard sheer, at the open side behind the canopy.
f.box((.88,.63,.52),(.33,.40,.06),'pale');f.box((.65,.63,.34),(.24,.40,.08),'cedar')
# Compact hanging lanterns; geometric opaque warm glass survives current stylized shader.
for side in [-1,1]:
    x=side*.70;y=-1.57
    f.tube([(x,y,1.93),(x,y-.07,1.87),(x,y-.07,1.68)],.012,'dark',6)
    f.box((x,y-.07,1.52),(.14,.14,.23),'glow',.025)
    for z in [1.385,1.655]:f.box((x,y-.07,z),(.19,.19,.035),'brass')
    for dx in [-.075,.075]:
        for dy in [-.075,.075]:f.beam((x+dx,y-.07+dy,1.40),(x+dx,y-.07+dy,1.64),.009,'dark',5)
for side in [-1,1]:
    x=side*.85;y=1.10
    f.box((x,y,.52),(.15,.23,.08),'mahogany')
    f.tube([(x,y-.075,.59),(x,y-.07,.69),(x,y+.07,.69),(x,y+.075,.59)],.014,'brass',7)
ferry=f.finish()
# Independent oar groups: origins sit precisely in their brass oarlocks.
oars=[]
for side,name in [(-1,'oar_left'),(1,'oar_right')]:
    pivot=(side*.85,1.10,.57);o=Craft(name,ferry,pivot)
    o.tube([(side*-.67,0,.12),(0,0,0),(side*1.04,.03,-.20),(side*1.57,.07,-.34)],[.025,.032,.028,.021],'pale',10)
    o.tube([(side*-.67,0,.12),(side*-.49,0,.088)],.034,'pale',8)
    # Tapered spoon blade with a raised central ridge and curved shoulders.
    vs=[];rows=[(.98,.018,-.20),(1.13,.105,-.235),(1.42,.145,-.31),(1.73,.12,-.375),(1.82,.015,-.39)]
    for along,w,z in rows:
        for j in [-1,0,1]:vs.append((side*along,.05+j*w,z+(.045 if j==0 else 0)))
    fs=[]
    for i in range(4):
        for j in range(2):a=i*3+j;fs.append((a,a+1,a+4,a+3))
    n=len(vs);vs.extend((x,y,z-.025) for x,y,z in list(vs));fs.extend(tuple(a+n for a in reversed(face)) for face in list(fs))
    edge=[0,1,2,5,8,11,14,13,12,9,6,3]
    fs.extend((a,b,b+n,a+n) for a,b in zip(edge,edge[1:]+edge[:1]))
    o.add('pale',vs,fs,True);o.tube([(side*t,.05,z+.05) for t,w,z in rows],.012,'pale',6)
    oars.append(o.finish())
# Attachment empties export with their exact axes; Y-up manifest is authoritative for runtime.
attachments={
 'passenger_left':{'position':[-.4,.638,.82],'facing_yaw':0,'role':'seat surface; character hips require its own seated offset'},
 'passenger_right':{'position':[.4,.638,.82],'facing_yaw':0,'role':'seat surface; character hips require its own seated offset'},
 'rower':{'position':[0,.608,-1.02],'facing_yaw':pi,'role':'seat surface; faces aft'},
 'boarding':{'position':[1.045,.55,-.63],'facing_yaw':-pi*.5,'role':'outer edge of boarding tread'},
 'floor_arrival':{'position':[.48,.20,-.63],'facing_yaw':0,'role':'inside boarding tread, feet plane'},
}
for name,d in attachments.items():
    e=bpy.data.objects.new('ATT_'+name,None);scene.collection.objects.link(e);e.parent=ferry;x,y,z=d['position'];e.location=(x,-z,y);e.rotation_euler.z=d['facing_yaw']
# Modular landing: root is the top walking plane, posts extend below it.
d=Craft('LANDING_Reed')
for i in range(16):d.box((0,-1.5+i*.20,-.055),(2.60,.188,.11),'pale' if i%4==0 else 'cedar',.014)
for x in [-.94,.94]:d.box((x,0,-.19),(.17,3.45,.20),'mahogany')
for x in [-1.12,1.12]:
    for y in [-1.38,1.38]:
        d.tube([(x,y,-1.40),(x*.997,y,.72)],[.11,.092],'mahogany',9)
        d.box((x,y,.745),(.25,.25,.075),'pale')
        for k in range(4):d.tube([(x+.113*cos(a),y+.113*sin(a),.39+k*.027) for a in [j*pi*2/12 for j in range(13)]],.014,'rope',5)
# Rope railing on port and rear leaves the right face open for boarding and front for gangway.
for z in [.37,.65]:
    d.tube([(-1.12,-1.38+2.76*i/20,z-.09*sin(pi*i/20)) for i in range(21)],.023,'rope',7)
    d.tube([(-1.12+2.24*i/16,1.38,z-.06*sin(pi*i/16)) for i in range(17)],.023,'rope',7)
for x in [-1.13,1.13]:d.beam((x,-.9,.05),(x,-.55,.05),.042,'brass')
landing=d.finish()
g=Craft('GANGWAY_Reed')
# Hinge origin at near end; rotate about local X to follow the bank slope.
for i in range(12):g.box((0,-.1-i*.2,-.045),(1.10,.188,.09),'pale' if i%3==0 else 'cedar',.012)
for x in [-.46,.46]:g.box((x,-1.2,-.145),(.13,2.5,.17),'mahogany')
for y in [-.09,-2.31]:
    for x in [-.46,.46]:g.box((x,y,.007),(.14,.22,.025),'brass',.003)
for x in [-.55,.55]:
    for y in [-.13,-2.27]:g.beam((x,y,-.08),(x,y,.62),.036,'mahogany')
    g.tube([(x,-.13-2.14*i/16,.59-.07*sin(pi*i/16)) for i in range(17)],.020,'rope',7)
gangway=g.finish()
# Export visual roots only; no render-only water, lighting or scene layout in the GLB.
for o in scene.objects:o.select_set(True)
bpy.context.view_layer.objects.active=ferry
out=ROOT/'public/assets/fantasy';out.mkdir(parents=True,exist_ok=True)
import io_scene_gltf2
fmt=next(i[0] for i in io_scene_gltf2.get_format_items(None,bpy.context) if i[0]=='GLB')
bpy.ops.export_scene.gltf(filepath=str(out/'reed-ferry.glb'),export_format=fmt,use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_extras=True)
def metrics(root):
    obs=[o for o in root.children_recursive if o.type=='MESH'];points=[];tri=0
    for o in obs:
        o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles);points.extend(root.matrix_world.inverted()@o.matrix_world@v.co for v in o.data.vertices)
    lo=[min(v[k] for v in points) for k in range(3)];hi=[max(v[k] for v in points) for k in range(3)]
    return {'triangles':tri,'meshes':len(obs),'bounds_three':{'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]}}
bpy.context.view_layer.update()
raw=(out/'reed-ferry.glb').read_bytes();glb=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
report={'candidate':'Reed Ferry 01','created_utc':datetime.now(timezone.utc).isoformat(),'units':'metres','up':'Y','forward':'+Z','waterline_y':0,'roots':{r.name:metrics(r) for r in [ferry,landing,gangway]},'attachments':attachments,
 'hull_footprint_xz':[[-hull(t,pi*.5)[0],-hull(t,pi*.5)[1]] for t in [i/16 for i in range(17)]]+[[hull(t,pi*.5)[0],-hull(t,pi*.5)[1]] for t in [i/16 for i in range(16,-1,-1)]],
 'hull_only_bounds_three':{'min':[-1.0,-.37,-2.25],'max':[1.0,.79,2.25]},
 'oars':{o.name:{'pivot_three':[o.location.x,o.location.z,-o.location.y],'rest_rotation_three':[0,0,0],'sweep_axis_three':[0,1,0],'lift_axis_three':[0,0,1],'handle_local_three':[(-1 if o.name.endswith('left') else 1)*-.58,.105,0],'blade_tip_local_three':[(-1 if o.name.endswith('left') else 1)*1.82,-.39,-.05],'recommended_sweep_radians':[-.42,.42],'recommended_lift_radians':[-.16,.16]} for o in oars},
 'dock_contract':{'LANDING_Reed':{'origin':'deck top centre','walking_size_xz':[2.60,3.2],'walking_y':0,'open_sides':['+X','+Z'],'posts_bottom_y':-1.4},'GANGWAY_Reed':{'origin':'near hinge on walking plane','walking_width':1.10,'walking_length':2.4,'extends_three':'+Z','slope_axis_three':[1,0,0]}},
 'collision':'No collision meshes exported. Use hull footprint for water navigation; landing/gangway walking rectangles and structural post positions for runtime collision. Do not collide against visual canopy/oars as a solid box.',
 'verification':{'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'one_material_per_mesh':all(len(m['primitives'])==1 for m in glb['meshes']),'exported_roots':[glb['nodes'][i]['name'] for i in glb['scenes'][glb.get('scene',0)]['nodes']]},'preserved_scenes':{n:len(bpy.data.scenes[n].objects) for n in ['Scene','Haven_Dragons','Haven_Architecture']}}
report['oar_pose_contract']={'order':'Apply yaw about Three Y, then local roll about Three Z; quaternions qYaw.multiply(qRoll). Identity rest pose is exported.','stroke':{'left_yaw':.36,'right_yaw':-.36,'left_roll':.14,'right_roll':-.14},'recovery':{'left_yaw':-.36,'right_yaw':.36,'left_roll':-.14,'right_roll':.14},'stowed':{'left_yaw':-pi*.5,'right_yaw':pi*.5,'left_roll':0,'right_roll':0},'notes':'Interpolate with a rowing cycle and drive rower hand targets from each handle; stow before docking. No runtime animation clip is exported.'}
report['example_boarding_layout_three']={'FERRY_Reed':{'position':[0,0,0],'yaw':0},'LANDING_Reed':{'position':[2.45,.55,-.63],'yaw':pi},'GANGWAY_Reed':{'position':[2.45,.55,-2.23],'yaw':pi},'oars':'stowed','tread_to_dock_gap_m':.105}
(out/'reed-ferry.json').write_text(json.dumps(report,indent=2))
bpy.data.libraries.write(str(ROOT/'tools/blender/transport/reed-ferry.blend'),{scene},fake_user=True,compress=True)
print(json.dumps(report['roots']))
