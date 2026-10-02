"""Silverveil's original fractured bedrock, fitted to sampled production terrain.
Run sample-terrain.ts with node --import tsx first, then this through Blender MCP.
Only Haven_Geology is replaced. Coordinates in authoring functions are world X/Z/Y;
mesh coordinates use Blender X/-Z/Y relative to origin Three [366,0,-713].
"""
import bpy,bmesh,json,math,random,hashlib,struct
from pathlib import Path
from mathutils import Vector
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[3];random.seed(619)
data=json.loads((Path(__file__).parent/'terrain-samples.json').read_text());grid=data['grid']
old=bpy.data.scenes.get('Haven_Geology')
if old:
    owned=[o.data for o in old.objects if o.data];mats=set(m for o in old.objects if o.type=='MESH' for m in o.data.materials);world=old.world
    for o in list(old.objects):bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.scenes.remove(old)
    for d in owned:
        if not d.users:
            for db in [bpy.data.meshes,bpy.data.lights,bpy.data.cameras]:
                if db.get(d.name)==d:db.remove(d);break
    for m in mats:
        if not m.users:bpy.data.materials.remove(m)
    if world and not world.users:bpy.data.worlds.remove(world)
s=bpy.data.scenes.new('Haven_Geology');bpy.context.window.scene=s
root=bpy.data.objects.new('GEO_Silverveil',None);s.collection.objects.link(root)
palette={'stone':'#78847e','warm':'#86887a','shadow':'#4d615d','light':'#929d8b','wet':'#586e68','moss':'#667954','lichen':'#8a956d','leaf':'#617c46','leaf_light':'#91a05a','earth':'#635f49'}
materials={};parts={k:([],[]) for k in palette};proxies=[];features=[]
for key,h in palette.items():
    rgb=[int(h[i:i+2],16)/255 for i in [1,3,5]];linear=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new('stone_Silverveil_'+key);m.use_nodes=True;m.diffuse_color=(*linear,1)
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*linear,1);n.inputs['Roughness'].default_value=.74 if key=='wet' else .91;materials[key]=m
def terrain(x,z):
    fx=max(0,min(grid['x1']-grid['x0']-.000001,x-grid['x0']));fz=max(0,min(grid['z1']-grid['z0']-.000001,z-grid['z0']))
    ix,iz=int(fx),int(fz);tx,tz=fx-ix,fz-iz;h=data['heights']
    return (h[iz][ix]*(1-tx)+h[iz][ix+1]*tx)*(1-tz)+(h[iz+1][ix]*(1-tx)+h[iz+1][ix+1]*tx)*tz
def river(z):
    for a,b in zip(list(reversed(data['water_profiles'])),list(reversed(data['water_profiles']))[1:]):
        if z>=b['z']:
            t=max(0,min(1,(a['z']-z)/(a['z']-b['z'])));return {k:a[k]+(b[k]-a[k])*t for k in ['x','y','halfWidth']}
    return data['river'][-1]
def road(x,z):
    best=1e9;width=0
    for a,b in zip(data['route'],data['route'][1:]):
        dx=b['x']-a['x'];dz=b['z']-a['z'];u=max(0,min(1,((x-a['x'])*dx+(z-a['z'])*dz)/(dx*dx+dz*dz)))
        distance=math.hypot(x-a['x']-u*dx,z-a['z']-u*dz)
        if distance<best:best=distance;width=a['width']+(b['width']-a['width'])*u
    return best-width*.5
def safe(x,z,margin=2.4):
    r=river(z);return road(x,z)>margin and abs(x-r['x'])>r['halfWidth']+.65
def V(p):x,z,y=p;return (x-366,-(z+713),y)
def add(key,points,faces):
    vs,fs=parts[key];o=len(vs);vs.extend(V(p) for p in points);fs.extend(tuple(i+o for i in face) for face in faces)
def face(key,points):add(key,points,[tuple(range(len(points)))])
def triangulated_cap(key,poly,center):
    add(key,poly+[center],[(i,(i+1)%len(poly),len(poly)) for i in range(len(poly))])
# Revision 2: one exposed cross-section, with consistent bedding and eroded joints.
# World heights determine the strata; terrain inverse determines their supported depth.
def contour(x,height):
    samples=[(-746+i*.5,terrain(x,-746+i*.5)) for i in range(111)]
    height=max(min(p[1] for p in samples)+.02,min(max(p[1] for p in samples)-.15,height))
    crossings=[]
    for (za,ha),(zb,hb) in zip(samples,samples[1:]):
        if (ha-height)*(hb-height)<=0 and abs(ha-hb)>.001:
            crossings.append(za+(zb-za)*(height-ha)/(hb-ha))
    return max(crossings) if crossings else min(samples,key=lambda p:abs(p[1]-height))[0]

def swell(x):
    return .8+3.4*math.exp(-((x-343)/10)**2)+5.2*math.exp(-((x-391)/13)**2)+2.7*math.exp(-((x-428)/18)**2)

levels=sorted(set([17.0,19.2,25.2,25.4,32.8,33.05,41.1,41.35,50.7,50.95,57.1]+[20+i*1.4 for i in range(26)]))
xs=[278+i*1.45 for i in range(127)]
faults=[(291,1.1,1.2),(322,1.2,1.8),(340,.85,1.5),(349,.7,1.15),(387,1.1,1.7),(402,1.3,2.0),(424,1.4,1.6),(442,.9,1.3)]
rows=[]
for k,h in enumerate(levels):
    row=[]
    for i,x in enumerate(xs):
        height=h+.012*(x-366)+.62*math.sin(x*.15)+.25*math.sin(x*.41+h*.13)
        z=contour(x,height)
        # A unified promontory profile; undercuts are shallow and supported below.
        bandpush=.8+.20*math.sin(h*.54)+.14*math.sin(h*.22)
        z+=swell(x)*bandpush+.25*math.sin(x*.37+h*.6)
        # Worn lobes and erosion alcoves interrupt large faces as actual depth.
        for cx,ch,rx,rh,depth in [(343,43,9,9,4.4),(348,26,6,7,3.8),(332,34,8,11,2.7),(391,38,11,10,5.0),(416,43,10,10,3.5),(430,27,12,7,3.2),(342,33,4,4,-3.8),(397,28,5,5,-4.0),(423,35,4,7,-3.2)]:
            z+=depth*math.exp(-(((x-cx)/rx)**4+((height-ch)/rh)**4))
        for fx,width,depth in faults:z-=depth*math.exp(-((x-fx)/width)**2)*(.65+.35*math.sin(height*.1)**2)
        row.append((x,z,height))
    rows.append(row)
for k in range(len(levels)-1):
    for i in range(len(xs)-1):
        quad=[rows[k][i],rows[k][i+1],rows[k+1][i+1],rows[k+1][i]]
        if not all(safe(p[0],p[1],2.7) for p in quad):continue
        cx=sum(p[0] for p in quad)/4;cz=sum(p[1] for p in quad)/4;hy=sum(p[2] for p in quad)/4
        # Geological, local color assignments: no repeated diagonal noise or checkerboard.
        margin=abs(cx-river(cz)['x'])-river(cz)['halfWidth']
        key='wet' if margin<5.2 and hy<54.7 else 'stone'
        if key=='stone' and (abs(hy-27-.017*(cx-366))<1.5 or abs(hy-45)<1.0):key='warm'
        if any(((cx-fx)/2.5)**2+((hy-fh)/3.0)**2<1 for fx,fh in [(342,33),(397,28),(423,35)]):key='shadow'
        face(key,quad)
        if levels[k] in [25.2,32.8,41.1,50.7] and math.sin(cx*.15+hy)>.25:
            # A narrow chipped edge belongs to its whole bedding layer.
            a,b=Vector(quad[2]),Vector(quad[3]);toward=Vector((0,-.12,.08))
            face('warm',[tuple(a),tuple(b),tuple(b+toward),tuple(a+toward)])
        if i in [0,len(xs)-2] or any(road(p[0],p[1])<6 for p in quad) or margin<3.5:
            for a,b in [(quad[0],quad[3]),(quad[1],quad[2])]:
                face('shadow',[a,b,(b[0],b[1]-5,b[2]-2),(a[0],a[1]-5,a[2]-2)])
features.append({'name':'Continuous_bedded_cross_section','world_x_extent':[278,460.75],'bedding_levels_y':levels,'note':'Continuous contour-fitted front, shallow connected undercuts and eight eroded joint zones. No detached shelf wedges.'})
# Connect the upper profile into the actual upstream plateau. Grass pockets sit on this surface.
for i in range(len(xs)-1):
    a,b=rows[-1][i],rows[-1][i+1]
    rear=[(a[0],-750,terrain(a[0],-750)+.12),(b[0],-750,terrain(b[0],-750)+.12)]
    for j in range(5):
        t0=j/5;t1=(j+1)/5
        pa=tuple(a[k]*(1-t0)+rear[0][k]*t0 for k in range(3));pb=tuple(b[k]*(1-t0)+rear[1][k]*t0 for k in range(3))
        pc=tuple(b[k]*(1-t1)+rear[1][k]*t1 for k in range(3));pd=tuple(a[k]*(1-t1)+rear[0][k]*t1 for k in range(3))
        if all(safe(p[0],p[1],3) for p in [pa,pb,pc,pd]):face('moss' if j>1 else 'stone',[pa,pb,pc,pd])

# Weathered jointed blocks: bevel rings express worn corners, not extruded sharp discs.
def block(name,x,z,width,depth,rise,seed,wet=False,collision=False):
    rng=random.Random(seed);base=terrain(x,z);n=10;points=[]
    outline=[]
    for i in range(n):
        a=math.tau*i/n;rr=.92+rng.random()*.13
        outline.append((math.copysign(abs(math.cos(a))**.55,math.cos(a))*width*.5*rr,math.copysign(abs(math.sin(a))**.55,math.sin(a))*depth*.5*rr))
    if not all(safe(x+dx,z+dz,3.0) for dx,dz in outline):return None
    for level,scale in [(-1.7,.80),(.05,1),(.44,.97),(.84,.83),(1,.54)]:
        for i,(dx,dz) in enumerate(outline):
            yy=base+rise*level+.09*rise*math.sin(i*1.8+seed)
            if level<0:yy=min(yy,terrain(x+dx,z+dz)-1.2)
            points.append((x+dx*scale,z+dz*scale,yy))
    for j in range(4):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;c=b+n;d=a+n
            key='wet' if wet and j<2 else 'warm' if j==2 and seed%3==0 else 'stone'
            if j==0:key='shadow' if not wet else 'wet'
            face(key,[points[a],points[b],points[c],points[d]])
    cap=points[4*n:];triangulated_cap('moss' if seed%3==0 else 'stone',cap,(x,z,base+rise*.98))
    bounds={'min':[min(p[0] for p in points),min(p[2] for p in points),min(p[1] for p in points)],'max':[max(p[0] for p in points),max(p[2] for p in points),max(p[1] for p in points)]}
    features.append({'name':name,'bounds_world':bounds,'route_edge_clearance_min':min(road(x+dx,z+dz) for dx,dz in outline)})
    if collision:proxies.append({'name':'COL_'+name,'bounds_world':bounds})
    return (x,z,base+rise*.98)

# Named, asymmetric upstream shoulders establish a channel leading to the lip.
for spec in [('Lip_West',350.7,-731,8,9,2.6,31,True,True),('Lip_East',381.5,-732,9,10,2.9,33,True,True),('Upstream_West',350,-746,7,12,2.2,36,False,True),('Upstream_East',384,-752,10,13,2.4,37,False,True),('Eastern_Lookout',402,-736,14,10,3,40,False,True)]:block(*spec)
# Receiving basin: a discontinuous rim following the pool ellipse, with dark waterline toes.
for i,(x,z,w,d,h) in enumerate([(346,-706,7,6,2.6),(345,-700,6,7,2.1),(348,-686,6,6,1.6),(355,-681,7,4,1.2),(392,-710,10,6,3.5),(395,-702,7,8,2.7),(394,-693,8,7,1.8),(389,-684,9,5,1.5),(383,-681,6,4,1.0)]):block('Basin_Rim_'+str(i),x,z,w,d,h,60+i,True,True)
# Talus fans are clustered where the bedded wall meets the banks, not distributed over all faces.
for group,(x,z) in enumerate([(334,-702),(402,-704),(427,-710),(443,-711)]):
    rng=random.Random(90+group)
    for i in range(8):
        xx=x+rng.uniform(-7,7);zz=z+rng.uniform(-3.5,3.5)
        block('Talus_'+str(group)+'_'+str(i),xx,zz,rng.uniform(2.2,5),rng.uniform(2.1,4),rng.uniform(.7,2),150+group*10+i,group<2,False)

# Wet stone margins follow the supplied water profile closely while preserving the full 20m aperture.
profiles=data['water_profiles']
for side in [-1,1]:
    curve=[p for p in profiles if -763<=p['z']<=-704]
    for a,b in zip(curve,curve[1:]):
        pts=[]
        for p in [a,b]:
            edge=p['x']+side*(p['halfWidth']+.12)
            outer=edge+side*(1.3+.30*math.sin(p['z']*.24+side))
            pts.extend([(edge,p['z'],p['y']-.18),(outer,p['z'],max(p['y']+.45,terrain(outer,p['z'])+.14))])
        if all(road(p[0],p[1])>3 for p in pts):face('wet',[pts[0],pts[1],pts[3],pts[2]])
features.append({'name':'Wet_channel_margins','note':'Outer lip follows sampled water Y at every metre; inner edge is .12m outside sampled half-width, .18m below water.'})

# Supported soil basins and original broad-leaf fern clumps add a second scale of erosion/colonisation.
def pocket(x,z,radius,seed):
    if not safe(x,z,5):return
    rng=random.Random(seed);h=terrain(x,z)+.16;n=10
    rim=[(x+radius*math.cos(i*math.tau/n),z+radius*.65*math.sin(i*math.tau/n),h+.08*math.sin(i*2.1)) for i in range(n)]
    if not all(safe(a,b,3) for a,b,c in rim):return
    lower=[(a,b,terrain(a,b)-.5) for a,b,c in rim]
    for i in range(n):j=(i+1)%n;face('stone',[lower[i],lower[j],rim[j],rim[i]])
    triangulated_cap('earth',rim,(x,z,h+.08))
    for plant in range(5):
        cx=x+rng.uniform(-.6,.6)*radius;cz=z+rng.uniform(-.35,.35)*radius;cy=max(h+.1,terrain(cx,cz)+.18)
        for leaf in range(7):
            angle=leaf*math.tau/7+rng.random()*.3;length=rng.uniform(.65,1.25);height=rng.uniform(.55,.95);u=Vector((math.cos(angle),math.sin(angle),0));v=Vector((-u.y,u.x,0));base=Vector((cx,cz,cy))
            mid=base+u*length*.45+Vector((0,0,height));tip=base+u*length+Vector((0,0,height*.45));width=length*.15
            face('leaf_light' if leaf%3==0 else 'leaf',[tuple(base),tuple(mid+v*width),tuple(tip),tuple(mid+Vector((0,0,.045)))])
            face('leaf',[tuple(base),tuple(mid+Vector((0,0,.045))),tuple(tip),tuple(mid-v*width)])
    features.append({'name':'Vegetation_pocket_'+str(seed),'center_world_xz':[x,z],'soil_plane_y':h})
for i,(x,z,r) in enumerate([(348,-754,2),(387,-760,2.6),(398,-744,2.2),(416,-744,2.8),(438,-739,2.4),(403,-695,1.8),(389,-682,1.3),(331,-696,1.8)]):pocket(x,z,r,400+i)
# Local fracture traces and spalled skins belong to the bedrock surface, at centimetre relief.
def surface(x,h):
    ix=max(0,min(len(xs)-2,int((x-xs[0])/(xs[1]-xs[0]))));tx=(x-xs[ix])/(xs[ix+1]-xs[ix])
    k=next((j for j in range(len(levels)-1) if levels[j]<=h<=levels[j+1]),len(levels)-2)
    th=max(0,min(1,(h-levels[k])/(levels[k+1]-levels[k])))
    a=Vector(rows[k][ix]).lerp(Vector(rows[k][ix+1]),tx);b=Vector(rows[k+1][ix]).lerp(Vector(rows[k+1][ix+1]),tx)
    return a.lerp(b,th)
fractures=[[(333,49),(335,46),(334.6,43),(337,41)],[(343,52),(344,49),(342.8,47),(344,45)],[(350,42),(349,40),(350.5,37),(348,35)],[(332,31),(335,30.4),(338,31.2),(340,30.6)],[(344,23),(345,26),(344,28.5)],[(382,50),(384,48),(383.4,46),(386,44)],[(391,49),(393,46),(392,43),(394.5,41)],[(402,45),(402.8,42),(401,39),(403,37)],[(389,33),(391.3,31.8),(393.6,32.3),(396,30.8)],[(405,26),(407,28.4),(406.5,31)],[(417,50),(418.2,47),(416.7,44)],[(426,38),(429,36.2),(431,37),(433,35.5)],[(439,47),(440,43),(438.6,40)],[(421,24),(424,26),(426,25.4)]]
for n,path in enumerate(fractures):
    for j,(a,b) in enumerate(zip(path,path[1:])):
        length=math.hypot(b[0]-a[0],b[1]-a[1]);ux=-(b[1]-a[1])/length;uy=(b[0]-a[0])/length
        steps=max(3,int(length/.55));previous=None
        for k in range(steps+1):
            t=k/steps;x=a[0]*(1-t)+b[0]*t;h=a[1]*(1-t)+b[1]*t;width=.038+.040*math.sin(t*math.pi)**2
            left=surface(x+ux*width,h+uy*width)+Vector((0,.065,0));right=surface(x-ux*width,h-uy*width)+Vector((0,.065,0))
            if not safe(left.x,left.y,3) or not safe(right.x,right.y,3):previous=None;continue
            if previous:
                face('shadow',[tuple(previous[0]),tuple(previous[1]),tuple(right),tuple(left)])
                bevel=Vector((0,-.015,.045));face('light',[tuple(previous[0]),tuple(left),tuple(left+bevel),tuple(previous[0]+bevel)])
            previous=(left,right)
# Small locally weathered skins vary size and orientation; they never become separate shelf shards.
for n,(x,h,rx,rh) in enumerate([(345,46,1.7,.7),(335,39,2.2,.9),(350,29,1.1,1.3),(383,47,1.3,.8),(390,42,1.8,.7),(399,35,1.2,1.1),(411,43,2.0,.65),(420,30,1.6,.8),(435,45,2.3,.7)]):
    ring=[surface(x+rx*dx,h+rh*dh)+Vector((0,.052,0)) for dx,dh in [(-1,-.2),(-.5,-.8),(.45,-1),(1,.2),(.4,.8),(-.6,.65)]]
    if all(safe(p.x,p.y,3) for p in ring):
        center=surface(x,h)+Vector((0,.19,0))
        for a,b in zip(ring,ring[1:]+ring[:1]):face('warm' if n%3 else 'light',[tuple(a),tuple(b),tuple(center)])
# Damp moss colonises a few continuous bed cracks, rather than every horizontal stripe.
for n,(x,h,rx) in enumerate([(343,40.6,3.3),(349,25.5,2.1),(392,40.8,3.7),(417,50.9,4.2),(432,25.4,2.5)]):
    outline=[(-1,-.05),(-.7,-.25),(-.2,-.18),(.2,-.4),(.7,-.1),(1,.02),(.4,.17),(-.3,.14)]
    pts=[surface(x+a*rx,h+b)+Vector((0,.075,0)) for a,b in outline]
    if all(safe(p.x,p.y,3) for p in pts):face('moss',[tuple(p) for p in pts])
features.append({'name':'Fracture_and_spall_hierarchy','fracture_paths':len(fractures),'spalled_skins':9,'wet_moss_cracks':5,'note':'Centimetre relief follows the continuous rock surface, distinct from the large erosion alcoves.'})
for key,(vs,fs) in parts.items():
    if not vs:continue
    me=bpy.data.meshes.new('Silverveil_'+key);me.from_pydata(vs,[],fs);me.update()
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    ob=bpy.data.objects.new('GEO_Silverveil_'+key,me);s.collection.objects.link(ob);ob.parent=root;me.materials.append(materials[key])
    ob['material_contract']='single material; preserve baseColor and authored planar normals'
for p in proxies:
    lo=p['bounds_world']['min'];hi=p['bounds_world']['max'];vs=[(x,z,y) for y in [lo[1],hi[1]] for x,z in [(lo[0],lo[2]),(hi[0],lo[2]),(hi[0],hi[2]),(lo[0],hi[2])]]
    me=bpy.data.meshes.new(p['name']);me.from_pydata([V(v) for v in vs],[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    ob=bpy.data.objects.new(p['name'],me);s.collection.objects.link(ob);ob.hide_render=True;ob.display_type='WIRE'
    p['bounds_local_three']={'min':[lo[0]-366,lo[1],lo[2]+713],'max':[hi[0]-366,hi[1],hi[2]+713]}
for o in s.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root;bpy.context.view_layer.update()
import io_scene_gltf2
fmt=next(i[0] for i in io_scene_gltf2.get_format_items(None,bpy.context) if i[0]=='GLB')
out=ROOT/'public/assets/fantasy';out.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out/'silverveil-gorge.glb'),export_format=fmt,use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_extras=True)
vertices=[];triangles=0
for o in root.children:
    o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles);vertices.extend(v.co for v in o.data.vertices)
lo=[min(v[k] for v in vertices) for k in range(3)];hi=[max(v[k] for v in vertices) for k in range(3)]
raw=(out/'silverveil-gorge.glb').read_bytes();glb=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
report={'candidate':'Silverveil gorge 02','created_utc':datetime.now(timezone.utc).isoformat(),'source_terrain_sha256':data['source_sha256'],'placement_three':{'position':[366,0,-713],'rotation':[0,0,0],'scale':[1,1,1]},'visual_root':'GEO_Silverveil','visual_triangles':triangles,'material_meshes':sum(bool(v[0]) for v in parts.values()),'bounds_local_three':{'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]},'materials':[m.name for m in materials.values()],
 'water_aperture':'20m drop opening preserved. Main wall keeps +.65m margin; thin wet bank margins begin .12m outside water half-width and .18m below its Y. No visual water exported.','route_protection':'Cross-section quads require vertices >2.7m beyond route half-width; rounded blocks >3m at all perimeter points. Proxy distances and runtime traversal require separate inspection.','collision_proxies':proxies,'features':features,'terrain_sampling':{'spacing_m':1,'source':'src/data/regions.ts','legacy_height':0,'range':grid},'verification':{'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'exported_roots':[glb['nodes'][i]['name'] for i in glb['scenes'][glb.get('scene',0)]['nodes']]},'preserved_scenes':{n:len(bpy.data.scenes[n].objects) for n in ['Scene','Haven_Dragons','Haven_Architecture','Haven_Transport']}}
(out/'silverveil-gorge.json').write_text(json.dumps(report,indent=2))
bpy.data.libraries.write(str(ROOT/'tools/blender/geology/silverveil-gorge.blend'),{s},fake_user=True,compress=True)
print(json.dumps({'triangles':triangles,'bounds':report['bounds_local_three'],'features':len(features),'proxies':len(proxies)}))
