"""Original Summer Haven hero architecture, furniture and town bicycle. Metres, front -Y."""
import bpy, math, random, json
from mathutils import Vector, Quaternion
from math import sin,cos,pi
random.seed(830)
NAME='SummerHaven_WorldAssets'
if NAME in bpy.data.scenes:
 bpy.context.window.scene=bpy.data.scenes[NAME]
 for o in list(bpy.context.scene.objects):bpy.data.objects.remove(o,do_unlink=True)
else:bpy.context.window.scene=bpy.data.scenes.new(NAME)
scene=bpy.context.scene;scene.unit_settings.scale_length=1
COL={}
for n in ['BICYCLE','BUILDINGS','INTERIORS','PROPS','COLLISION','LOD']:
 c=bpy.data.collections.new(n);scene.collection.children.link(c);COL[n]=c
def mat(n,h):
 m=bpy.data.materials.new(n);m.use_nodes=True
 c=[int(h[i:i+2],16)/255 for i in (1,3,5)];rgba=tuple(v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in c)+(1,)
 m.diffuse_color=rgba;p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=rgba;p.inputs['Roughness'].default_value=.8
 return m
MAT={n:mat(n,h) for n,h in {'wood':'#7b583b','wood_dark':'#47382b','wood_light':'#b28e62','plaster':'#ddd1ac','roof':'#4c6565','roof_dark':'#354e52','stone':'#93978b','metal':'#b0b8b5','frame':'#598f83','rubber':'#333431','leather':'#76513c','cream':'#eee4c8','glass':'#9db7b8','glow':'#ffd697','cloth':'#799885','red':'#b85341','ceramic':'#d3ba91','leaf':'#668853','ink':'#3d493d','cat':'#d6b081'}.items()}
root=None;collection='PROPS';serial=0
def empty(name,loc=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);COL[collection].objects.link(o);o.location=loc;o.parent=parent;return o
def mesh(n,vs,fs,m,parent=None):
 global serial
 serial+=1;me=bpy.data.meshes.new(n);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(n+'_'+str(serial),me);COL[collection].objects.link(o);o.parent=parent or root;o.data.materials.append(MAT[m])
 uv=me.uv_layers.new(name='UVMap')
 for p in me.polygons:
  for li in p.loop_indices:
   v=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(v.x+v.y,v.z+v.y)
 return o
def box(n,c,d,m,bevel=0,parent=None):
 x,y,z=c;w,l,h=[v/2 for v in d];vs=[(x+sx*w,y+sy*l,z+sz*h) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 o=mesh(n,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m,parent)
 if bevel:
  mod=o.modifiers.new('Soft crafted edges','BEVEL');mod.width=bevel;mod.segments=2
 return o
def tube(n,pts,r,m,parent=None,sides=8):
 vs=[];fs=[]
 for i,p in enumerate(pts):
  p=Vector(p);t=Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)]);t.normalize();u=t.cross(Vector((0,1,.01))).normalized();v=t.cross(u).normalized()
  for j in range(sides):vs.append(tuple(p+r*(cos(j*2*pi/sides)*u+sin(j*2*pi/sides)*v)))
 for i in range(len(pts)-1):
  for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
 fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(pts)-1)*sides+j for j in range(sides))]);return mesh(n,vs,fs,m,parent)
def ball(n,c,s,m,parent=None):
 vs=[];fs=[];N=16;R=8
 for i in range(R+1):
  for j in range(N):t=pi*i/R;a=2*pi*j/N;vs.append((c[0]+s[0]*sin(t)*cos(a),c[1]+s[1]*sin(t)*sin(a),c[2]+s[2]*cos(t)))
 for i in range(R):
  for j in range(N):a=i*N+j;b=i*N+(j+1)%N;fs.append((a,b,b+N,a+N))
 o=mesh(n,vs,fs,m,parent)
 for p in o.data.polygons:p.use_smooth=True
 return o
def ring(n,center,r,t,m,axis='x',parent=None,start=0,end=2*pi):
 pts=[]
 for i in range(49):
  a=start+(end-start)*i/48
  pts.append((center[0],center[1]+r*cos(a),center[2]+r*sin(a)) if axis=='x' else (center[0]+r*cos(a),center[1]+r*sin(a),center[2]))
 return tube(n,pts,t,m,parent,sides=8)
def consolidate(r):
 # Join static pieces by material and parent: dense detailing, modest runtime draw count.
 groups={}
 for o in list(r.children_recursive):
  if o.type=='MESH' and not o.name.startswith('COL_'):groups.setdefault((o.parent.name,o.data.materials[0].name),[]).append(o)
 for (p,m),os in groups.items():
  for o in scene.objects:o.select_set(False)
  for o in os:o.hide_set(False);o.select_set(True)
  bpy.context.view_layer.objects.active=os[0]
  if len(os)>1:bpy.ops.object.join()
  os[0].name=p+'__'+m

collection='BICYCLE';root=empty('BICYCLE_town')
# Bike faces -Y: wheelbase 1.12 m, seat .96 m.
rear=empty('wheel_rear',(0,.55,.35),root);front=empty('steering',(0,-.55,.35),root)
fw=empty('wheel_front',(0,0,0),front);crank=empty('crank',(0,.08,.34),root)
for name,p in [('rear',rear),('front',fw)]:
 ring('tyre',(0,0,0),.324,.025,'rubber',parent=p);ring('rim',(0,0,0),.303,.009,'metal',parent=p)
 tube('hub',[(-.065,0,0),(.065,0,0)],.024,'metal',p)
 for j in range(24):
  a=2*pi*j/24;tube('spoke',[(.025*(-1 if j%2 else 1),0,0),(0,.30*cos(a),.30*sin(a))],.0018,'metal',p,sides=4)
for a,b in [((0,.55,.35),(0,.08,.34)),((0,.55,.35),(0,.28,.89)),((0,.08,.34),(0,.28,.89)),((0,.08,.34),(0,-.43,.80)),((0,.28,.79),(0,-.41,.84))]:tube('enameled_frame',[a,b],.023,'frame',sides=12)
tube('stepthrough',[(0,.25,.83),(0,.16,.58),(0,-.10,.55),(0,-.4,.77)],.023,'frame',sides=12)
for s in [-1,1]:
 tube('fork',[(s*.045,0,0),(s*.047,.04,.36),(0,.105,.50)],.014,'frame',front)
 tube('rear_stay',[(s*.044,.55,.35),(s*.045,.33,.87)],.010,'metal')
 ring('mudguard',(s*.006,.55,.35),.36,.017,'frame',start=.1,end=pi-.1)
tube('handlebar_stem',[(0,.105,.48),(0,.10,.69)],.017,'metal',front,12)
tube('basket_stay',[(0,.04,.48),(0,-.22,.43)],.012,'metal',front,10)
tube('handlebar',[(.25,.33,.81),(.25,.23,.81),(.14,.25,.84),(0,.1,.69),(-.14,.25,.84),(-.25,.23,.81),(-.25,.33,.81)],.012,'metal',front,10)
for s in [-1,1]:
 tube('grip',[(s*.25,.25,.81),(s*.25,.37,.81)],.02,'leather',front,10)
 empty('grip_'+('L' if s==1 else 'R'),(s*.25,.31,.81),front)
 tube('brake_lever',[(s*.23,.26,.82),(s*.215,.38,.80)],.007,'metal',front)
 tube('cable',[(s*.2,.28,.81),(s*.15,-.12,.61),(s*.04,.03,.15)],.003,'rubber',front,sides=6)
tube('seatpost',[(0,.28,.83),(0,.28,.95)],.015,'metal');ball('saddle',(0,.28,.96),(.115,.155,.027),'leather')
ring('chaincase',(0,.08,.34),.108,.012,'frame');box('chain_guard',(.035,.29,.34),(.021,.48,.14),'frame',.03)
for s in [-1,1]:
 tube('crank_arm',[(s*.08,0,0),(s*.08,s*.17,0)],.009,'metal',crank)
 pedal=empty('pedal_'+('L' if s==1 else 'R'),(s*.12,s*.17,0),crank)
 box('pedal_platform',(0,0,0),(.10,.075,.028),'rubber',.005,pedal)
box('rear_rack',(0,.58,.74),(.24,.4,.022),'metal',.015)
tube('kickstand',[(-.05,.32,.34),(-.20,.41,.02)],.012,'metal')
ball('bell',(.2,.255,.853),(.025,.025,.015),'metal',front)
ball('headlamp',(0,-.13,.55),(.048,.035,.048),'cream',front)
box('red_reflector',(0,.756,.76),(.065,.012,.035),'red',.004)
# Fine wire basket, tapered floor and open top.
for z in [.42,.46,.50,.54,.58,.62,.66]:
 for y in [-.33,-.12]:tube('basket_weave',[(-.18,y,z),(.18,y,z)],.003,'wood_light',front,4)
 for x in [-.18,.18]:tube('basket_weave',[(x,-.33,z),(x,-.12,z)],.003,'wood_light',front,4)
for x in [-.18,-.12,-.06,0,.06,.12,.18]:
 for y in [-.33,-.12]:tube('basket_upright',[(x*.8,y+.02,.42),(x,y,.67)],.004,'wood_light',front,4)
box('basket_base',(0,-.22,.42),(.31,.2,.01),'wood_light')
consolidate(root)

def building(name,w,d,h,kind):
 global root,collection
 collection='BUILDINGS';root=empty(name)
 box('foundation',(0,0,.16),(w+.35,d+.35,.32),'stone',.05)
 box('plaster_wall',(0,0,h/2+.30),(w,d,h),'plaster',.025)
 for x in [-w/2,w/2]:
  for y in [-d/2,d/2]:box('corner_post',(x,y,h/2+.3),(.14,.14,h+.1),'wood_dark')
 for z in [.37,.95,h+.30]:box('crossbeam',(0,-d/2-.03,z),(w+.14,.10,.12),'wood_dark')
 for x in [(-w/2+.12)+i*.18 for i in range(int((w-.2)/.18))]:box('wainscot',(x,-d/2-.05,.66),(.165,.045,.55),'wood')
 # Gabled roof with a softly flared eave profile and tiled rows.
 for side in [-1,1]:
  vs=[];fs=[];N=8
  for j in range(N+1):
   t=j/N;x=side*(w/2+.58)*t;z=h+1.65-1.23*t+.15*t*t*t
   vs.extend([(x,-d/2-.60,z),(x,d/2+.60,z)])
  for j in range(N):fs.append((j*2,j*2+1,j*2+3,j*2+2))
  mesh('roof_plane',vs,fs,'roof')
  for j in range(1,10):
   t=j/9;x=side*(w/2+.58)*t;z=h+1.65-1.23*t+.15*t*t*t+.018
   tube('tile_overlap',[(x,-d/2-.61,z),(x,d/2+.61,z)],.027,'roof_dark',sides=6)
  for j in range(int((d+1.2)/.22)):
   yy=-d/2-.55+j*.22;pts=[(side*(w/2+.58)*t,yy,h+1.65-1.23*t+.15*t*t*t+.026) for t in [0,.25,.5,.75,1]]
   tube('tile_rib',pts,.028,'roof',sides=6)
  for y in [-d/2-.63,d/2+.63]:tube('eave_trim',[(x,y,z-.045) for x,_,z in vs[::2]],.055,'wood_dark')
 tube('ridge_cap',[(0,-d/2-.75,h+1.67),(0,d/2+.75,h+1.67)],.11,'roof_dark',sides=10)
 # Gable triangles and exposed rafters.
 for y in [-d/2-.015,d/2+.015]:
  mesh('gable',[(-w/2,y,h+.30),(w/2,y,h+.30),(0,y,h+1.60)],[(0,1,2)],'plaster')
  tube('king_post',[(0,y,h+.3),(0,y,h+1.6)],.065,'wood_dark')
 # Sliding entrance and detailed shoji window panels.
 doorx=0 if kind=='home' else w*.22
 box('doorframe',(doorx,-d/2-.08,1.32),(1.32,.13,2.05),'wood_dark')
 box('door_paper',(doorx,-d/2-.16,1.34),(1.14,.03,1.88),'glass')
 for x in [-.52,-.26,0,.26,.52]:box('door_lattice',(doorx+x,-d/2-.19,1.34),(.027,.035,1.91),'wood_dark')
 for z in [.52,.88,1.23,1.58,1.92,2.24]:box('door_lattice',(doorx,-d/2-.20,z),(1.15,.035,.023),'wood_dark')
 for x in [-w*.32,w*.32]:
  if abs(x-doorx)<1.2:continue
  box('window_frame',(x,-d/2-.07,1.58),(1.28,.12,1.13),'wood_dark')
  box('warm_window',(x,-d/2-.14,1.58),(1.14,.025,.99),'glow')
  for xx in [-.43,0,.43]:box('window_mullion',(x+xx,-d/2-.17,1.58),(.04,.03,1.03),'wood')
  box('window_mullion',(x,-d/2-.17,1.57),(1.15,.03,.035),'wood')
 # Side windows; raised porch and shaded awning supported by timber brackets.
 for side in [-1,1]:
  for y in [-d*.22,d*.24]:
   box('side_window',(side*(w/2+.03),y,1.63),(.06,1.13,.99),'glass')
   for z in [1.17,1.63,2.10]:box('side_lattice',(side*(w/2+.07),y,z),(.05,1.20,.04),'wood_dark')
 box('porch',(0,-d/2-.53,.31),(w,.98,.16),'wood',.03)
 for x in [-w/2+.25,w/2-.25]:
  tube('porch_bracket',[(x,-d/2,2.55),(x,-d/2-.85,2.25)],.07,'wood_dark')
 awn=box('porch_canopy',(0,-d/2-.44,2.58),(w+.25,1.12,.09),'cloth' if kind=='cafe' else 'roof',.015);awn.rotation_euler.x=.10
 if kind=='cafe':
  for x in [-2.1,-1.7,-1.3,-.9,-.5,-.1,.3,.7,1.1,1.5,1.9]:box('awning_scallop',(x,-d/2-.99,2.44),(.31,.025,.24),'cloth',.05)
  tube('sign_bracket',[(-w/2-.6,-d/2,2.85),(-w/2-.6,-d/2-1.1,2.85)],.034,'metal')
  ball('round_shop_sign',(-w/2-.6,-d/2-.85,2.53),(.30,.05,.30),'cream')
 if kind=='shop':
  for x in [-1.7,-.9]:
   box('produce_crate',(x,-d/2-.98,.48),(.70,.64,.43),'wood_light',.025)
   for j in range(8):ball('produce',(x+random.uniform(-.24,.24),-d/2-.98+random.uniform(-.2,.2),.73),(.09,.08,.08),'red' if x< -1 else 'leaf')
 box('air_conditioner',(w/2+.24,d*.18,1.20),(.39,.77,.49),'cream',.035)
 for i in range(7):box('ac_vent',(w/2+.443,d*.18,1.05+i*.042),(.012,.64,.012),'metal')
 tube('drain_pipe',[(w/2+.14,d/2-.15,h+.5),(w/2+.14,d/2-.15,.16)],.035,'metal')
 # Collision metadata is independent of visual silhouette. Runtime reads the footprint.
 root['width']=w;root['depth']=d;root['height']=h+1.7;root['door_x']=doorx
 consolidate(root)
 return root
home=building('BLD_home',5.4,4.6,2.55,'home')
cafe=building('BLD_cafe',6.5,5.1,2.85,'cafe')
shop=building('BLD_shop',6.0,5.2,2.6,'shop')

collection='INTERIORS'
for kind in ['bench','table','chair','wardrobe','bed','shelf','counter','fridge']:
 root=empty('FURN_'+kind)
 if kind in ['bench','chair','table']:
  w=1.8 if kind=='bench' else .50 if kind=='chair' else 1.35;d=.48 if kind!='table' else .8;h=.46 if kind!='table' else .75
  box('top',(0,0,h),(w,d,.08),'wood_light',.035)
  for x in [-w*.4,w*.4]:
   for y in [-d*.35,d*.35]:box('leg',(x,y,h/2),(.065,.065,h),'wood_dark',.01)
  if kind!='table':
   for z in [.65,.82]:box('backrest',(0,d*.43,z),(w,.05,.13),'wood',.025)
   for x in [-w*.42,w*.42]:box('support',(x,d*.43,.61),(.06,.06,.60),'wood_dark')
 elif kind=='wardrobe':
  box('cabinet',(0,0,.98),(1.15,.58,1.96),'wood',.035)
  for x in [-.28,.28]:
   box('door',(x,-.31,1.0),(.52,.035,1.80),'wood_light',.025)
   ball('knob',(x*.3,-.36,1.0),(.025,.022,.025),'metal')
  box('cornice',(0,0,1.96),(1.25,.65,.09),'wood_dark',.02)
 elif kind=='bed':
  box('frame',(0,0,.22),(1.15,2.0,.30),'wood',.04);box('mattress',(0,0,.43),(1.10,1.94,.17),'cream',.075);box('summer_quilt',(0,-.25,.53),(1.12,1.4,.055),'cloth',.045);ball('pillow',(0,.67,.57),(.46,.30,.11),'cream')
  box('headboard',(0,1.0,.52),(1.20,.075,.9),'wood',.045)
 elif kind=='shelf':
  for x in [-.55,.55]:box('side',(x,0,.85),(.07,.38,1.70),'wood')
  for z in [.12,.57,1.04,1.54]:
   box('shelf',(0,0,z),(1.18,.4,.07),'wood_light')
   for j in range(7):box('book',(-.44+j*.14,-.01,z+.16),(.10,.26,.28+random.random()*.1),'cloth' if j%2 else 'cream',.008)
 elif kind=='counter':
  box('body',(0,0,.48),(2.5,.62,.96),'wood',.025);box('top',(0,0,1.01),(2.64,.77,.09),'wood_dark',.04)
  for x in [-.82,0,.82]:box('panel',(x,-.322,.5),(.73,.026,.78),'wood_light',.018)
 else:
  box('fridge',(0,0,.98),(.85,.72,1.96),'cream',.055);box('glass_door',(0,-.38,1.0),(.69,.018,1.65),'glass',.025)
  for z in [.34,.75,1.16,1.57]:
   box('shelf',(0,-.395,z),(.71,.015,.035),'metal')
   for x in [-.23,0,.23]:ball('bottle',(x,-.41,z+.14),(.065,.014,.13),'red' if x==0 else 'cloth')
 consolidate(root)

collection='PROPS';root=empty('PROP_cat')
ball('body',(0,0,.26),(.15,.32,.18),'cat');ball('head',(0,-.28,.38),(.15,.14,.14),'cat')
for s in [-1,1]:
 mesh('ear',[(s*.04,-.29,.45),(s*.14,-.25,.45),(s*.13,-.27,.62)],[(0,1,2)],'cat')
 ball('eye',(s*.057,-.413,.41),(.023,.009,.012),'ink')
 ball('paw',(s*.1,-.21,.12),(.056,.095,.054),'cream')
tube('tail',[(.06,.22,.29),(.21,.34,.25),(.24,.15,.15)],.046,'cat',sides=12)
ball('nose',(0,-.426,.365),(.018,.01,.01),'red');consolidate(root)

from pathlib import Path
path=Path(__file__).parent/'garden_assets.py'
exec(compile(path.read_text(encoding='utf-8'),str(path),'exec'),globals())

# Inspect cafe in isolation; all source scenes remain non-destructive to the original scene.
for o in scene.objects:o.hide_set(False)
for a in bpy.context.screen.areas:
 if a.type=='VIEW_3D':
  a.spaces.active.overlay.show_overlays=False;a.spaces.active.shading.type='MATERIAL';a.spaces.active.region_3d.view_distance=12;a.spaces.active.region_3d.view_location=(0,0,1.5);a.spaces.active.region_3d.view_rotation=Quaternion((1,0,0),pi/2)
print(json.dumps({'roots':[o.name for o in scene.objects if o.parent is None],'objects':len(scene.objects),'vertices':sum(len(o.data.vertices) for o in scene.objects if o.type=='MESH')}))
