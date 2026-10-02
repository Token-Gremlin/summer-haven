"""Original Aldermere architecture and Starroot sanctuary, authored for Summer Haven.
Blender MCP entry: exec(compile(open(path).read(),path,'exec'),{'__file__':path}).
Only the dedicated Haven_Architecture production scene is rebuilt.
"""
import bpy,bmesh,math,json,random
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
random.seed(241)
sin,cos,pi=math.sin,math.cos,math.pi
NAME='Haven_Architecture'
old=bpy.data.scenes.get(NAME)
if old:
    olddata=[o.data for o in old.objects if o.data];oldmats=set(m for o in old.objects if o.type=='MESH' for m in o.data.materials)
    oldcols=list(old.collection.children);oldworld=old.world
    for o in list(old.objects):bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.scenes.remove(old)
    for d in olddata:
        if d.users==0:
            for db in [bpy.data.meshes,bpy.data.lights,bpy.data.cameras]:
                if db.get(d.name)==d:db.remove(d);break
    for m in oldmats:
        if m.users==0:bpy.data.materials.remove(m)
    for c in oldcols:
        if c.users==0:bpy.data.collections.remove(c)
    if oldworld and oldworld.users==0:bpy.data.worlds.remove(oldworld)
scene=bpy.data.scenes.new(NAME);bpy.context.window.scene=scene
collection=bpy.data.collections.new('Aldermere_Production');scene.collection.children.link(collection)
colors={
 'wood':'#765137','darkwood':'#403d32','lightwood':'#be9766','ochre':'#d8a955','cream':'#e3d2a6','sage':'#a8b8a0',
 'teal':'#365f61','teal_light':'#497675','terra':'#ab6550','terra_light':'#c27e5d',
 'stone':'#a3a594','stone_dark':'#747f73','brick':'#b88761','moss':'#647e54','metal':'#bba15d','ink':'#2c4442','glow':'#edd9a5','flower':'#c27b73',
}
prefix={'darkwood':'wood','lightwood':'wood','ochre':'plaster','cream':'plaster','sage':'plaster','teal':'roof','teal_light':'roof','terra':'roof','terra_light':'roof','brick':'stone','moss':'stone','ink':'stone','flower':'plaster'}
MATS={}
for key,h in colors.items():
    rgb=[int(h[i:i+2],16)/255 for i in [1,3,5]];linear=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(prefix.get(key,key)+'_Aldermere_'+key);m.use_nodes=True;m.diffuse_color=(*linear,1)
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*linear,1);n.inputs['Roughness'].default_value=.8;MATS[key]=m

class Asset:
    def __init__(self,name):
        self.name=name;self.parts={};self.collisions=[];self.notes=[]
    def add(self,mat,verts,faces):
        v,f=self.parts.setdefault(mat,([],[]));offset=len(v);v.extend(tuple(p) for p in verts);f.extend(tuple(i+offset for i in face) for face in faces)
    def block(self,c,d,mat='wood',bevel=.025,collision=False):
        x,y,z=c;w,depth,h=[v/2 for v in d];b=min(bevel,w*.22,h*.22)
        poly=[(-w,-h),(w,-h),(w,h),(-w,h)] if b==0 else [(-w+b,-h),(w-b,-h),(w,-h+b),(w,h-b),(w-b,h),(-w+b,h),(-w,h-b),(-w,-h+b)]
        self.prism([(x+a,z+b) for a,b in poly],y-depth,y+depth,mat)
        if collision:self.collisions.append({'center':list(c),'size':list(d)})
    def prism(self,poly,y0,y1,mat):
        n=len(poly);vs=[(x,y,z) for y in [y0,y1] for x,z in poly]
        fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        self.add(mat,vs,fs)
    def beam(self,a,b,width=.14,mat='wood',sides=8):
        a=Vector(a);b=Vector(b);t=(b-a).normalized();u=t.cross(Vector((0,0,1)))
        if u.length<.1:u=t.cross(Vector((0,1,0)))
        u.normalize();v=t.cross(u).normalized()
        vs=[p+width*.5*(cos(j*2*pi/sides)*u+sin(j*2*pi/sides)*v) for p in [a,b] for j in range(sides)]
        fs=[tuple(range(sides-1,-1,-1)),tuple(range(sides,2*sides))]+[(j,(j+1)%sides,(j+1)%sides+sides,j+sides) for j in range(sides)]
        self.add(mat,vs,fs)
    def tube(self,pts,r=.06,mat='wood',sides=7):
        for a,b in zip(pts,pts[1:]):self.beam(a,b,r*2,mat,sides)
    def column(self,x,y,z,height,r=.35,mat='stone',profile=None,sides=8):
        profile=profile or [(0,1.25),(.10,1.25),(.15,.87),(.80,.68),(.87,.82),(.92,1.15),(1,1.15)]
        vs=[(x+r*rr*cos(j*2*pi/sides),y+r*rr*sin(j*2*pi/sides),z+height*t) for t,rr in profile for j in range(sides)]
        fs=[]
        for i in range(len(profile)-1):
            for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
        fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(profile)-1)*sides+j for j in range(sides))]);self.add(mat,vs,fs)
    def arch(self,c,width,rise,thick=.35,depth=.45,mat='stone',segments=15,start=0,end=pi):
        x,y,z=c
        for i in range(segments):
            a=start+(end-start)*(i+.018)/segments;b=start+(end-start)*(i+.982)/segments
            poly=[(x+rx*cos(t),z+rz*sin(t)) for rx,rz,t in [(width*.5,rise,a),(width*.5,rise,b),(width*.5+thick,rise+thick,b),(width*.5+thick,rise+thick,a)]]
            self.prism(poly,y-depth*.5,y+depth*.5,mat)
    def wall(self,x0,x1,y,z0,z1,thick,holes,mat='ochre'):
        # Exact rectangular voids cut by a deterministic grid, with no booleans.
        xs=sorted(set([x0,x1]+[v for h in holes for v in [h[0],h[1]] if x0<v<x1]));zs=sorted(set([z0,z1]+[v for h in holes for v in [h[2],h[3]] if z0<v<z1]))
        for a,b in zip(xs,xs[1:]):
            for c,d in zip(zs,zs[1:]):
                if not any(h[0]<(a+b)*.5<h[1] and h[2]<(c+d)*.5<h[3] for h in holes):self.block(((a+b)*.5,y,(c+d)*.5),(b-a,thick,d-c),mat,.012,True)
    def window(self,x,y,z,width=1.1,height=1.5,shutters=True):
        self.block((x,y+.10,z),(width,.09,height),'ink',.01)
        for sx in [-1,1]:self.block((x+sx*(width*.5+.065),y-.04,z),(.13,.16,height+.24),'wood')
        for zz in [z-height*.5-.06,z+height*.5+.06]:self.block((x,y-.05,zz),(width+.28,.2,.13),'wood')
        self.block((x,y-.10,z),(.07,.13,height),'lightwood');self.block((x,y-.10,z+.15),(width,.13,.065),'lightwood')
        self.block((x,y-.15,z-height*.5-.15),(width+.43,.42,.16),'lightwood')
        if shutters:
            for side in [-1,1]:
                sx=x+side*(width*.5+.30)
                self.block((sx,y,z),(.37,.12,height),'teal')
                for k in range(5):self.block((sx,y-.07,z-height*.38+k*height*.19),(.35,.06,.045),'lightwood',.005)
    def roof(self,x,y,z,width,depth,rise,mat='teal',accent='teal_light',peak=0):
        # Swept profile: steep ridge transitions into a slight upturned eave.
        profile=[(0,1),(.19,.80),(.42,.50),(.65,.23),(.86,.055),(1,.08)]
        for side in [-1,1]:
            span=width*.5-side*peak
            for row in range(len(profile)-1):
                ta,ha=profile[row];tb,hb=profile[row+1]
                for col in range(max(2,round(depth/.7))):
                    cols=max(2,round(depth/.7));ya=y-depth*.5+depth*col/cols;yb=y-depth*.5+depth*(col+1)/cols+.025
                    xa=x+peak+side*span*ta;xb=x+peak+side*span*tb;za=z+rise*ha+.022;zb=z+rise*hb
                    poly=[(xa,za),(xb,zb),(xb,zb-.14),(xa,za-.14)]
                    self.prism(poly,ya,yb,accent if (row+col)%6==0 else mat)
                if row>0:
                    xx=x+peak+side*span*ta;zz=z+rise*ha+.036
                    self.beam((xx,y-depth*.5,zz),(xx,y+depth*.5,zz),.045,accent,6)
            pts=[(x+peak+side*span*t,y-depth*.5-.025,z+rise*h-.05) for t,h in profile];self.tube(pts,.095,'lightwood',8)
            pts=[(x+peak+side*span*t,y+depth*.5+.025,z+rise*h-.05) for t,h in profile];self.tube(pts,.095,'wood',8)
            for yy in [y-depth*.5,y+depth*.5]:self.beam((x+side*width*.5,yy,z-.05),(x+side*width*.5,yy,z+.12),.20,'lightwood')
            self.beam((x+side*width*.5,y-depth*.5,z+.06),(x+side*width*.5,y+depth*.5,z+.06),.17,'wood')
        self.beam((x+peak,y-depth*.5-.12,z+rise+.08),(x+peak,y+depth*.5+.12,z+rise+.08),.21,accent,10)
    def gable(self,x,y,z,width,rise,mat='ochre',peak=0):
        profile=[(0,1),(.19,.80),(.42,.50),(.65,.23),(.86,.055),(1,.08)]
        right=[(x+peak+(width*.5-peak)*t,z+rise*h-.19) for t,h in reversed(profile)]
        left=[(x+peak-(width*.5+peak)*t,z+rise*h-.19) for t,h in profile[1:]]
        self.prism([(x-width*.5,z-.08),(x+width*.5,z-.08)]+right+left,y-.14,y+.14,mat)
        for side in [-1,1]:
            pts=[(x+peak+side*(width*.5-side*peak)*t,y-.20,z+rise*h-.19) for t,h in profile]
            self.tube(pts,.078,'darkwood',8)
        self.beam((x-width*.5,y-.20,z),(x+width*.5,y-.20,z),.22,'darkwood');self.beam((x+peak,y-.22,z),(x+peak,y-.22,z+rise-.25),.16,'darkwood')
        for a in [-.65,-.3,.3,.65]:self.beam((x+a*width*.5,y-.21,z+.04),(x+peak,y-.21,z+rise*.66),.10,'wood')
    def planter(self,x,y,z,width=1.4):
        self.block((x,y,z),(width,.40,.34),'wood')
        for k in range(7):
            xx=x-width*.42+k*width*.14;h=.22+.10*sin(k*1.9)
            self.beam((xx,y,z+.12),(xx+.08,y,z+.35+h),.045,'moss',5)
            for side in [-1,1]:self.prism([(xx,z+.22),(xx+side*.20,z+.37),(xx,z+.42)],y-.07,y+.02,'moss')
            self.column(xx+.08,y,z+.36+h,.1,.11,'flower',[(0,.3),(.4,1),(1,.45)],5)
    def crest(self,x,y,z,size=1):
        # Original six-leaf civic sun, geometric relief, no letters or copied icon.
        ring=[(x+size*.27*cos(t*pi/16),y,z+size*.27*sin(t*pi/16)) for t in range(33)];self.tube(ring,.035,'metal',7)
        for j in range(6):
            a=j*pi/3;u=Vector((cos(a),0,sin(a)));v=Vector((-sin(a),0,cos(a)));c=Vector((x,y,z))
            pts=[c+u*size*.30,c+u*size*.58+v*size*.13,c+u*size*.93,c+u*size*.58-v*size*.13]
            vs=[p+Vector((0,d,0)) for d in [-.045,.045] for p in pts];self.add('metal',vs,[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)])

assets=[]
def market():
    a=Asset('BLD_market');assets.append(a)
    # Raised stone plinth breaks only at the broad entrance; exterior arcade stays at grade.
    a.block((0,.6,.14),(10,5.8,.28),'stone',.05)
    holes=[(-.95,.95,0,2.65),(-3.9,-2.7,3.7,5.15),(2.55,3.85,3.7,5.15)]
    a.wall(-5,5,-2.3,.28,5.8,.3,holes,'ochre');a.wall(-5,5,3.5,.28,5.8,.3,[],'ochre')
    for side in [-1,1]:
        sub=Asset('side');sub.wall(-2.3,3.5,0,.28,5.8,.3,[(-.1,1.3,.95,2.4),(-.1,1.3,3.7,5.15)],'ochre')
        for zz in [1.675,4.425]:sub.window(.6,-.22,zz,1.4,1.45,False)
        for yy in [-2.17,.6,3.37]:sub.block((yy,-.19,3.1),(.16,.18,5.4),'darkwood')
        for zz in [.5,3.12,5.60]:sub.block((.6,-.20,zz),(5.7,.18,.17),'darkwood')
        for mat,(vs,fs) in sub.parts.items():a.add(mat,[(side*(4.85-vy),vx,vz) for vx,vy,vz in vs],fs)
        for c in sub.collisions:a.collisions.append({'center':[side*(4.85-c['center'][1]),c['center'][0],c['center'][2]],'size':[c['size'][1],c['size'][0],c['size'][2]]})
    a.block((0,.6,3.05),(9.6,5.4,.2),'wood');a.block((0,0,.07),(1.85,5,.14),'stone')
    for x in [-4.8,-2.4,0,2.4,4.8]:
        for y in [-2.48,3.68]:
            if x==0 and y<0:a.block((x,y,4.34),(.19,.19,3.0),'darkwood')
            else:a.block((x,y,3.06),(.19,.19,5.65),'darkwood')
    for z in [3.12,5.64]:a.block((0,-2.5,z),(10.1,.23,.19),'darkwood')
    for x in [-3.03,3.03]:a.block((x,-2.5,.48),(4.05,.23,.19),'darkwood')
    for x in [-3.3,3.2]:a.window(x,-2.53,4.425,1.2,1.45)
    for x in [-3.3,3.2]:
        for side in [-1,1]:a.beam((x+side*.88,-2.54,3.32),(x+side*.42,-2.54,3.91),.12,'wood')
    a.roof(0,.65,5.73,11.25,7.6,3.05,peak=-.85);a.gable(0,-2.34,5.76,9.7,3.05,'cream',-.85);a.gable(0,3.52,5.76,9.7,3.05,'ochre',-.85)
    a.crest(-.85,-2.56,7.1,.72)
    # Asymmetric projecting clock-free lookout dormer and shallow annex roof.
    a.wall(-4.65,-2.5,-3.27,4.45,6.3,.2,[(-4.15,-3.0,4.78,5.87)],'cream');a.window(-3.575,-3.4,5.32,1.15,1.1,False)
    a.gable(-3.575,-3.28,6.3,2.5,1.20,'cream');a.roof(-3.575,-2.9,6.28,2.92,1.65,1.2)
    # Sheltered arcade, with brackets and room to walk behind counters.
    for x in [-4.7,-1.6,1.6,4.7]:
        a.column(x,-4.0,0,2.8,.15,'wood');a.block((x,-4,.12),(.49,.49,.24),'stone')
        for dx in [-.62,.62]:a.beam((x,-4,2.08),(x+dx,-4,2.72),.14,'wood')
        a.collisions.append({'center':[x,-4,1.3],'size':[.4,.4,2.6]})
    a.block((0,-4,2.82),(9.8,.23,.25),'darkwood')
    for i in range(14):
        xa=-5.15+i*.736;a.prism([(xa,3.5),(xa+.74,3.5),(xa+.74,3.36),(xa,3.36)],-2.28,-2.09,'teal')
        a.add('teal_light' if i%4==0 else 'teal',[(xa,-2.30,3.54),(xa+.75,-2.30,3.54),(xa+.75,-4.55,2.96),(xa,-4.55,2.96)],[(0,1,2,3)])
    a.block((0,-4.57,2.95),(10.35,.16,.24),'wood')
    for x in [-3.18,3.18]:
        a.block((x,-3.67,.95),(2.15,.9,.17),'lightwood');a.block((x,-3.67,.48),(2.0,.7,.86),'wood')
        for xx in [-.7,0,.7]:a.block((x+xx,-3.70,1.13),(.54,.60,.19),'lightwood')
        for k in range(7):a.column(x-.83+k*.28,-3.66,1.25,.16,.11,'ochre',[(0,.5),(.4,1),(1,.55)],7)
    a.block((0,-2.62,2.86),(2.9,.22,.38),'wood');a.crest(0,-2.78,2.88,.20)
    a.notes=['Front -Y entry width 1.90m, height 2.65m; shell interior with upper slab, no stair yet.','Arcade corridor behind display counters; front posts collide individually.']
    return a

def workshop():
    a=Asset('BLD_workshop');assets.append(a)
    a.block((-.6,.2,.13),(5.4,6.6,.26),'stone',.06)
    a.wall(-3.3,2.1,-3.05,.26,3.6,.34,[(-1.5,.45,0,2.65)],'brick');a.wall(-3.3,2.1,3.5,.26,3.6,.34,[],'brick')
    for x in [-3.15,1.95]:a.block((x,.2,1.93),(.3,6.5,3.35),'brick',.03,True)
    for x in [-3.15,1.9]:a.block((x,-3.28,1.96),(.22,.22,3.4),'darkwood')
    for z in [.45,2.75,3.55]:a.block((-.6,-3.29,z),(5.5,.20,.18),'wood')
    for row in range(6):
        for col in range(8):
            x=-3.04+col*.64+(row%2)*.21
            if x<-.1 and x>-1.65:continue
            if x>1.9:continue
            a.block((x,-3.232,.63+row*.45),(.51,.048,.075),'stone',.009)
    a.roof(-.6,.24,3.56,6.5,7.6,2.4,'terra','terra_light',-.3);a.gable(-.6,-3.07,3.6,5.35,2.4,'brick',-.3)
    # Tall tapered kiln stack, wide shoulder, rain cap and soot-dark opening.
    a.column(-2.15,1.95,0,8.1,.58,'brick',[(0,1.25),(.2,1.25),(.46,.93),(.9,.71),(1,.72)],4)
    for z in [2.4,4.0,5.6,7.1]:a.block((-2.15,1.95,z),(1.05,1.05,.19),'stone_dark')
    a.block((-2.15,1.95,8.17),(1.2,1.2,.18),'stone');a.block((-2.15,1.95,8.3),(.74,.74,.1),'ink')
    for x in [-2.58,-1.72]:a.beam((x,1.55,8.26),(x,1.55,8.72),.08,'metal');a.beam((x,2.35,8.26),(x,2.35,8.72),.08,'metal')
    a.roof(-2.15,1.95,8.7,1.52,1.52,.35,'terra','terra_light')
    # Open side work awning attached to the hall; visible joinery and a useful bench.
    for y in [-2.7,2.8]:a.column(3.95,y,0,2.7,.14,'wood');a.collisions.append({'center':[3.95,y,1.3],'size':[.3,.3,2.6]})
    a.add('terra',[(1.85,-3.2,3.30),(4.4,-3.2,2.78),(4.4,3.25,2.78),(1.85,3.25,3.30)],[(0,1,2,3)])
    for y in [-3.2,-1.9,-.6,.7,2,3.25]:a.beam((1.85,y,3.25),(4.4,y,2.73),.15,'wood')
    a.beam((4.2,-3.2,2.71),(4.2,3.25,2.71),.2,'wood')
    a.block((3.0,1.1,1.08),(1.2,2.8,.16),'lightwood')
    for x in [2.52,3.48]:
        for y in [0,2.2]:a.block((x,y,.54),(.16,.17,1.04),'wood')
    for k in range(4):a.column(3.0,.3+k*.5,1.16,.30,.18,'brick',[(0,.55),(.3,1),(.75,.87),(1,.55)],10)
    a.block((.9,-3.38,1.6),(.92,.16,1.25),'darkwood');a.crest(.9,-3.5,1.7,.39)
    a.notes=['Front -Y entrance width 1.95m x 2.65m.','Side awning is open; kiln chimney is solid and requires footprint collision.']
    return a

def canal_home():
    a=Asset('BLD_canal_home');assets.append(a)
    a.block((0,0,.17),(6,6,.34),'stone',.06)
    a.wall(-3,3,-2.85,.34,5.2,.3,[(-2.38,-1.1,.0,2.65),(.10,2.22,3.3,4.7)],'sage');a.wall(-3,3,2.85,.34,5.2,.3,[],'sage')
    for side in [-1,1]:
        sub=Asset('side');sub.wall(-2.85,2.85,0,.34,5.2,.3,[(-.1,1.1,.95,2.3),(-.1,1.1,3.3,4.65)],'sage')
        for zz in [1.625,3.975]:sub.window(.5,-.20,zz,1.2,1.35,False)
        for yy in [-2.72,2.72]:sub.block((yy,-.17,2.8),(.15,.19,4.8),'wood')
        for zz in [.5,2.9]:sub.block((0,-.18,zz),(5.7,.15,.16),'lightwood')
        for mat,(vs,fs) in sub.parts.items():a.add(mat,[(side*(2.85-vy),vx,vz) for vx,vy,vz in vs],fs)
        for c in sub.collisions:a.collisions.append({'center':[side*(2.85-c['center'][1]),c['center'][0],c['center'][2]],'size':[c['size'][1],c['size'][0],c['size'][2]]})
    for z in [.50,2.9,5.15]:a.block((0,-3.03,z),(6.15,.20,.17),'lightwood')
    for x in [-2.88,2.88]:a.block((x,-3.03,2.78),(.18,.20,4.92),'wood')
    a.roof(0,0,5.12,7.05,7,2.28,'terra','terra_light',.35);a.gable(0,-2.87,5.15,5.7,2.3,'cream',.35)
    # Carved three-faced projecting bay at ground level; roof and sill make its mass clear.
    a.prism([(-.35,.75),(2.25,.75),(2.25,2.52),(-.35,2.52)],-3.52,-2.86,'wood')
    for x in [.13,.95,1.77]:a.window(x,-3.64,1.75,.61,1.10,False)
    a.block((.95,-3.62,.95),(2.9,.47,.23),'lightwood');a.roof(.95,-3.15,2.58,3.25,1.62,.72,'terra','terra_light')
    a.window(1.16,-3.05,4.00,2.12,1.40,False)
    # Upper flower balcony, slim turned rails, and diagonal corbels.
    a.block((1.08,-3.75,3.13),(2.95,1.6,.2),'wood')
    for x in [-.24,2.4]:a.beam((x,-3,2.30),(x,-4.33,3.12),.15,'wood');a.column(x,-4.36,3.18,1.12,.09,'lightwood')
    a.block((1.08,-4.36,4.27),(2.98,.14,.14),'lightwood')
    for k in range(10):a.column(-.18+k*.28,-4.36,3.2,.96,.040,'wood')
    a.planter(1.08,-4.47,3.48,2.5)
    # Front door leaves are visibly open into the shell; lintel height remains 2.65m.
    for x in [-2.43,-1.05]:a.block((x,-2.89,1.38),(.15,.2,2.72),'wood')
    a.block((-1.74,-3.08,2.72),(1.6,.29,.22),'lightwood')
    a.block((-2.36,-2.36,1.43),(.1,1.06,2.48),'wood');a.block((-1.74,-3.1,.10),(1.42,.72,.2),'stone')
    a.crest(.35,-3.08,6.1,.43)
    a.notes=['Front entry x [-2.38,-1.10], opening 1.28m x 2.65m.','Balcony and bay extend beyond primary 6x6 shell; balcony flowers are fixed geometry. Interior unfurnished, no staircase.']
    return a

def gate():
    a=Asset('BLD_gate');assets.append(a)
    # Empty nine-metre central road; towers begin at |x|=4.5.
    for side in [-1,1]:
        x=side*7.25
        a.block((x,0,.35),(5.5,5.7,.7),'stone',.12,True)
        a.column(x,0,.7,9.5,2.74,'stone',[(0,1),(.06,1),(.10,.9),(.80,.78),(.90,.92),(1,.92)],8)
        a.collisions.append({'center':[x,0,4.9],'size':[5.3,5.3,9.8]})
        for z in [1.5,5.5,9.1]:a.block((x,0,z),(4.95,4.95,.21),'stone_dark',.055)
        a.roof(x,0,10.0,5.7,5.8,2.7,'teal','teal_light',side*.25)
        a.gable(x,-2.22,10,4.4,2.65,'ochre',side*.25)
        a.window(x,-2.32,7.5,1.15,2.05,False)
        a.arch((x,-2.42,8.51),1.27,.67,.19,.22,'lightwood',9)
        for xx in [-1.4,1.4]:a.beam((x+xx,-2.35,1.8),(x+xx,-2.0,9.3),.17,'stone_dark')
        # Original deep teal fabric pennant with an asymmetric swallow-tail cut.
        y=-2.60;a.beam((x+.9*side,y,8.4),(x+2.15*side,y,8.4),.075,'metal')
        a.prism([(x+.98*side,8.3),(x+2.05*side,8.3),(x+2.05*side,5.78),(x+1.50*side,6.12),(x+.98*side,5.92)],y-.02,y+.02,'teal')
        a.crest(x+1.51*side,y-.04,7.28,.40)
    # Structural voussoirs form a genuine arch; crown not a solid overhead box.
    a.arch((0,0,5.8),9,3.75,.76,2.2,'stone',23)
    for side in [-1,1]:a.block((side*4.86,0,3.0),(.72,2.2,6.0),'stone',.05,True)
    a.arch((0,-1.18,5.8),9,3.75,.22,.23,'lightwood',23)
    a.arch((0,1.18,5.8),9,3.75,.22,.23,'stone_dark',23)
    a.prism([(-1.15,9.18),(1.15,9.18),(1.05,10.62),(0,11.42),(-1.05,10.62)],-1.36,-.78,'ochre');a.crest(0,-1.44,10.15,.89)
    a.notes=['Central road x [-4.5,4.5] is open at grade through depth; arch spring 5.8m, inner crown 9.55m.','Proxies describe side towers/jambs only; do not create a full-width blocker.']
    return a

def starroot():
    a=Asset('BLD_starroot');assets.append(a)
    # Open central court: joints and broken border segments follow circulation.
    for i in range(9):
        for j in range(9):
            x=-8+i*2;y=-8+j*2
            if (i in [0,8] and j in [0,8]) or (i==0 and j==5):continue
            a.block((x,y,.07),(1.96,1.96,.14),'stone_dark' if (i+j)%6==0 else 'stone',.06)
    # Front entry pillar pair and a broken crown with a legible arch envelope.
    for x in [-3.3,3.3]:a.column(x,-7.1,.14,4.8,.56,'stone');a.collisions.append({'center':[x,-7.1,2.6],'size':[1.38,1.38,5.2]})
    a.arch((0,-7.1,4.8),6.6,2.8,.54,.9,'stone',9,0,pi*.41)
    a.arch((0,-7.1,4.8),6.6,2.8,.54,.9,'stone',9,pi*.60,pi)
    # Roofed side walks: tapering paired columns support the colonnade and leave middle court open.
    for side in [-1,1]:
        for y in [-4.3,.0,4.3]:
            for x in [side*6.0,side*8.0]:
                a.column(x,y,.14,3.65,.33,'stone');a.collisions.append({'center':[x,y,1.95],'size':[.82,.82,3.9]})
        for y in [-2.15,2.15]:
            # Along-Y arches created as transformed temporary geometry.
            sub=Asset('tmp');sub.arch((0,0,3.25),4.3,1.2,.28,.43,'stone_dark',13)
            for mat,(vs,fs) in sub.parts.items():a.add(mat,[(side*6+vy,y+vx,vz) for vx,vy,vz in vs],fs)
        a.roof(side*7,0,4.52,3.35,11.6,.85,'stone_dark','moss')
        for yy in [-6.15,6.15]:a.block((side*7.15,yy,.78),(3.3,.65,1.55),'stone',.10,True)
    # Back sanctuary arcades and surviving pediment beside a deliberately missing bay.
    for x in [-6,-2,2,6]:a.column(x,6.4,.14,4.25,.43,'stone');a.collisions.append({'center':[x,6.4,2.3],'size':[1.08,1.08,4.5]})
    for x in [-4,0,4]:a.arch((x,6.4,4.25),4,1.52,.38,.66,'stone',13)
    a.gable(-4,6.45,5.83,4.5,1.65,'stone_dark');a.roof(-4,6.5,5.85,5.5,2.7,1.65,'stone_dark','moss')
    # Bell dais: broad accessible front ramp, three rings and a freestanding forked canopy.
    for radius,z,h in [(2.2,.14,.18),(1.87,.32,.18),(1.5,.50,.18)]:a.column(0,2.2,z,h,radius,'stone',[(0,1),(1,1)],20)
    a.add('stone',[(-.8,-.2,.14),(.8,-.2,.14),(.8,1.3,.14),(-.8,1.3,.14),(-.8,-.2,.16),(.8,-.2,.16),(.8,1.3,.68),(-.8,1.3,.68)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    for x in [-1.2,1.2]:a.column(x,2.2,.68,3.12,.17,'wood');a.beam((x,2.2,2.8),(x*.45,2.2,3.8),.15,'wood')
    a.beam((-1.5,2.2,3.8),(1.5,2.2,3.8),.24,'wood');a.roof(0,2.2,3.85,3.3,2.25,1.15,'stone_dark','moss')
    a.column(0,2.2,2.1,1.22,.59,'metal',[(0,1.1),(.06,1.13),(.13,.88),(.6,.54),(.92,.40),(1,.12)],20);a.beam((0,2.2,3.3),(0,2.2,3.72),.07,'metal')
    a.beam((0,2.2,2.2),(0,2.2,1.57),.06,'wood');a.column(0,2.2,1.52,.12,.13,'wood',[(0,1),(1,.8)],8)
    # Weathering is authored in sparse broad patches, with old roots at structural joins.
    for side in [-1,1]:
        for j in range(4):
            x=side*(5.5+.68*sin(j));y=-5+j*3.0
            a.prism([(x-.62,.15),(x+.57,.15),(x+.8,.18),(x-.35,.21)],y-.55,y+.50,'moss')
        for k in range(3):
            a.tube([(side*8,5.7,2.5),(side*7.6,5.3,1.2),(side*(7.2-k*.31),4.6,.3),(side*(6.1-k*.32),3.4,.20),(side*(5.5-k*.41),2.8,.16)],.09-k*.018,'wood',7)
    for k,(x,y) in enumerate([(-4.4,-6),(-5.1,-5.5),(3.5,-5.4),(4.3,-6.1),(4.9,6.8)]):
        a.prism([(x-.45,.15),(x+.51,.15),(x+.36,.63),(x-.3,.79)],y-.32,y+.4,'stone_dark')
    a.notes=['Front entry width 5.22m between pillar bases at local -Y; broken crown does not obstruct walking.','Open 18x18m court, side covered paths, bell dais near back. Floor Y in Three is .14m; dais top .68m.','Decorative court slabs are not tall blockers. Bell sound/interaction and climb contacts belong to runtime.']
    return a

market();workshop();canal_home();gate();starroot()
report={'author':'Summer Haven original production','scene':NAME,'units':'metres','forward':'Blender -Y / glTF +Z','assets':{}}
for a in assets:
    root=bpy.data.objects.new(a.name,None);collection.objects.link(root);root['original_authoring']='Summer Haven / Aldermere & Starroot';root['front']='-Y'
    allvs=[];tri=0
    for mat,(vs,fs) in a.parts.items():
        mesh=bpy.data.meshes.new(a.name+'_'+mat);mesh.from_pydata(vs,[],fs);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
        ob=bpy.data.objects.new(a.name+'__'+mat,mesh);collection.objects.link(ob);ob.parent=root;mesh.materials.append(MATS[mat]);mesh.calc_loop_triangles();tri+=len(mesh.loop_triangles);allvs.extend(vs)
        uv=mesh.uv_layers.new(name='UVMap')
        for p in mesh.polygons:
            for li in p.loop_indices:
                v=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(v.x+v.y,v.z+v.y)
    bbox={'min':[min(v[k] for v in allvs) for k in range(3)],'max':[max(v[k] for v in allvs) for k in range(3)]}
    report['assets'][a.name]={'triangles':tri,'vertices':len(allvs),'material_meshes':len(a.parts),'materials':[MATS[m].name for m in a.parts],'bounds_blender':bbox,'collisions_blender':a.collisions,'notes':a.notes}
    proxy=bpy.data.objects.new('COL_'+a.name[4:],None);collection.objects.link(proxy);proxy['collision_only']=True
    for i,col in enumerate(a.collisions):
        helper=Asset('col');helper.block(col['center'],col['size'],'stone',0)
        vs,fs=helper.parts['stone'];mesh=bpy.data.meshes.new(proxy.name+str(i));mesh.from_pydata(vs,[],fs);ob=bpy.data.objects.new(proxy.name+'_'+str(i),mesh);collection.objects.link(ob);ob.parent=proxy;ob['collision_only']=True
        ob.hide_render=True;ob.hide_set(True)
for ob in scene.objects:ob.select_set(not ob.name.startswith('COL_'))
out=ROOT/'public/assets/fantasy';out.mkdir(parents=True,exist_ok=True)
import io_scene_gltf2
fmt=next(x[0] for x in io_scene_gltf2.get_format_items(None,bpy.context) if x[0]=='GLB')
# Collision proxy roots are included explicitly but must be hidden/removed by runtime.
for ob in scene.objects:ob.hide_set(False);ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'architecture.glb'),export_format=fmt,use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_extras=True)
for ob in scene.objects:
    ob.select_set(False)
    if ob.name.startswith('COL_'):ob.hide_set(True)
(out/'architecture.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
bpy.data.libraries.write(str(ROOT/'tools/blender/architecture/aldermere.blend'),{scene},fake_user=True,compress=True)
print(json.dumps({name:{'tris':d['triangles'],'meshes':d['material_meshes'],'bounds':d['bounds_blender']} for name,d in report['assets'].items()}))
