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
palette={'stone':'#78847e','warm':'#86887a','shadow':'#4d615d','light':'#929d8b','wet':'#586e68','moss':'#667954','lichen':'#8a956d'}
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
    for a,b in zip(data['river'],data['river'][1:]):
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
# Angular weathered facing, above the smooth terrain but buried at every exposed edge.
# Irregular bedding breaks the old planar wall while retaining the river and trail cuts.
nx,nz=83,25;meshgrid=[]
for iz in range(nz+1):
    z=-745+iz*2.05;row=[]
    for ix in range(nx+1):
        x=278+ix*2.2
        xx=x+(.24*math.sin(ix*7.2+iz*3.3) if 0<ix<nx else 0)
        zz=z+(.29*math.sin(ix*1.7+iz*4.1) if 0<iz<nz else 0)
        taper=min(1,ix/3,(nx-ix)/3,iz/2,(nz-iz)/2)
        weather=.9+.42*math.sin(xx*.38+zz*.17)+.75*abs(math.sin(zz*.49+math.sin(xx*.10)))
        height=terrain(xx,zz)+.32+max(0,taper)*weather
        row.append((xx,zz,height))
    meshgrid.append(row)
for iz in range(nz):
    for ix in range(nx):
        p=[meshgrid[iz][ix],meshgrid[iz][ix+1],meshgrid[iz+1][ix+1],meshgrid[iz+1][ix]]
        x=sum(a[0] for a in p)/4;z=sum(a[1] for a in p)/4
        if not safe(x,z) or not all(safe(a[0],a[1]) for a in p):continue
        wet=abs(x-river(z)['x'])-river(z)['halfWidth']<8
        key='wet' if wet else 'warm' if math.sin(x*.033+z*.17)>.82 else 'stone'
        if iz<3 and (ix+iz)%5<2:key='moss'
        # Broad strata are built from coherent quads with occasional fractured diagonals.
        add(key,p,[(0,1,2),(0,2,3)] if (ix+iz)%3==0 else [(0,1,2,3)])
        # Boundary skirts go several metres into the existing landmass; never float.
        for a,b in zip(p,p[1:]+p[:1]):
            mx=(a[0]+b[0])/2;mz=(a[1]+b[1])/2
            if road(mx,mz)<5 or abs(mx-river(mz)['x'])<river(mz)['halfWidth']+3 or ix in [0,nx-1] or iz in [0,nz-1]:
                face('shadow',[a,b,(b[0],b[1],terrain(b[0],b[1])-3),(a[0],a[1],terrain(a[0],a[1])-3)])

outline=[(-.94,-.44),(-.54,-.98),(.30,-.92),(.92,-.51),(1,.30),(.44,.89),(-.48,1),(-1,.36)]
def mass(name,x,z,sx,sz,rise,seed,angle=0,collide=True):
    """A buried, fractured wedge: tilted strata, bevels, unequal ridges and basal volume."""
    rng=random.Random(seed);ca,sa=math.cos(angle),math.sin(angle);poly=[]
    for a,b in outline:
        xx=x+(a*ca*sx-b*sa*sz)*.5;zz=z+(a*sa*sx+b*ca*sz)*.5;poly.append((xx,zz))
    # Reject whole outcrops that could cover the protected route or water aperture.
    probes=poly+[(x,z)]+[((a[0]+b[0])/2,(a[1]+b[1])/2) for a,b in zip(poly,poly[1:]+poly[:1])]
    if not all(safe(xx,zz,3.3) for xx,zz in probes):return False
    base=[];rim=[];crown=[]
    for i,(xx,zz) in enumerate(poly):
        h=terrain(xx,zz);offset=rise*(.53+.38*rng.random())
        base.append((xx,zz,h-max(3,rise*.75)))
        rim.append((xx,zz,h+offset*.70))
        crown.append((x+(xx-x)*(.72+.15*rng.random()),z+(zz-z)*(.78+.1*rng.random()),h+offset))
    # Front split planes read as erosion/faults rather than stacked circular shelves.
    for i in range(8):
        j=(i+1)%8;a,b=base[i],base[j];c,d=rim[i],rim[j]
        inset=.055 if i%3==0 else .012
        p=(c[0]+(x-c[0])*inset,c[1]+(z-c[1])*inset,c[2]-.12)
        q=(d[0]+(x-d[0])*inset,d[1]+(z-d[1])*inset,d[2]-.12)
        key=['shadow','stone','warm','stone','stone','stone','wet','shadow'][(i+seed)%8]
        face(key,[a,b,q,p]);face('warm' if i%3==0 else 'stone',[p,q,crown[j],crown[i]])
        if i%3==0:
            # Oblique bedding break wraps the exposed wall and reaches into its depth.
            for t in [.33,.64]:
                e=tuple(a[k]*(1-t)+p[k]*t for k in range(3));f=tuple(b[k]*(1-t)+q[k]*t for k in range(3))
                face('shadow',[e,f,(f[0]+(x-f[0])*.01,f[1]+(z-f[1])*.01,f[2]+.12),(e[0]+(x-e[0])*.01,e[1]+(z-e[1])*.01,e[2]+.12)])
    center=(x+sx*.11,z-sz*.08,terrain(x,z)+rise*1.06)
    for i in range(8):
        j=(i+1)%8;a,b,c=Vector(crown[i]),Vector(crown[j]),Vector(center)
        normal=(b-a).cross(c-a).normalized()
        if normal.z<0:normal=-normal
        key='moss' if normal.z>.82 and (i+seed)%4==0 else 'warm' if i%4==0 else 'stone'
        # Broad planes fracture into unequal facets; moss never coats a steep wall.
        divisions=4 if rise>3.8 else 2;rows={}
        for u in range(divisions+1):
            for v in range(divisions-u+1):
                fu,fv=u/divisions,v/divisions;fw=1-fu-fv;p=a*fw+b*fu+c*fv
                displacement=.72*math.sin(p.x*.47+p.y*.23+seed)*max(0,fu*fv*fw)*24
                rows[u,v]=tuple(p+normal*displacement)
        for u in range(divisions):
            for v in range(divisions-u):
                face(key,[rows[u,v],rows[u+1,v],rows[u,v+1]])
                if u+v<divisions-1:face(key,[rows[u+1,v],rows[u+1,v+1],rows[u,v+1]])
        # Narrow rock bedding lines cross large exposed faces, with no checkerboard colors.
        if normal.z<.78:
            for level in range(22,59,7):
                cut=[];height=level+.6*math.sin(x*.1)
                for p,q in [(a,b),(b,c),(c,a)]:
                    if (p.z-height)*(q.z-height)<0:cut.append(p.lerp(q,(height-p.z)/(q.z-p.z)))
                if len(cut)==2:
                    p,q=cut;up=(Vector((0,0,1))-normal*normal.z).normalized()*.055
                    face('shadow',[tuple(p+normal*.014),tuple(q+normal*.014),tuple(q+up+normal*.014),tuple(p+up+normal*.014)])
        if normal.z>.8 and (i+seed)%3==0:
            p=a*.36+b*.22+c*.42;u=(b-a).normalized();v=normal.cross(u);radius=min(1.0,(b-a).length*.13)
            patch=[tuple(p+(u*math.cos(t)+v*math.sin(t))*radius*(.72+.18*math.sin(k*2.3))+normal*.027) for k,t in enumerate([k*math.tau/7 for k in range(7)])]
            face('lichen',patch)
    pts=base+rim+crown+[center];bounds={'min':[min(p[0] for p in pts),min(p[2] for p in pts),min(p[1] for p in pts)],'max':[max(p[0] for p in pts),max(p[2] for p in pts),max(p[1] for p in pts)]}
    features.append({'name':name,'center_world_xz':[x,z],'base_embed_minimum':max(3,rise*.75),'bounds_world':bounds,'route_edge_clearance_min':min(road(xx,zz) for xx,zz in probes)})
    if collide:proxies.append({'name':'COL_'+name,'bounds_world':bounds})
    return True

# Designed major masses form two unequal walls, with a wider eastern shoulder.
specs=[
 ('West_Foot',326,-705,14,10,5,10,-.10),('West_Fault',332,-715,14,10,7,11,.06),('West_Prow',345,-721,12,11,6,12,-.12),
 ('West_Crown',346,-733,11,10,5,13,.08),('West_Upper',346,-750,11,13,4,14,-.12),
 ('West_Outer',282,-723,13,16,6,15,.15),('West_Ridge',286,-738,15,13,5,16,-.10),('West_Lower',302,-702,16,9,5,17,.08),
 ('East_Mouth',386,-704,15,10,6,21,.12),('East_Buttress',391,-715,16,13,8,22,-.12),('East_Crown',387,-732,16,10,7,23,.16),
 ('East_Fault',409,-719,18,15,9,24,-.15),('East_Ledge',420,-707,20,11,6,25,.06),('East_Ridge',417,-736,19,13,7,26,.10),
 ('East_Tower',438,-724,19,16,8,27,-.11),('East_Taper',451,-711,16,12,5,28,.20),('East_Top',442,-741,21,11,5,29,-.05),
 ('Upper_Reedbank',391,-755,12,13,4,30,.12),
]
for spec in specs:mass(*spec)
# Deeply keyed bedding shelves. Their rear halves enter the continuous rock facing;
# only an angular eroded front and part of the top remain exposed.
for number,(x,height,width) in enumerate([(342,30,11),(347,45,10),(390,31,13),(401,44,15),(415,35,16),(431,49,15),(443,29,13),(291,38,12)]):
    candidates=[-732+i*.25 for i in range(105)]
    z=min(candidates,key=lambda zz:abs(terrain(x,zz)-height))
    plan=[(x-width*.48,z-7),(x+width*.43,z-6.2),(x+width*.53,z+1.1),(x+width*.30,z+3.6),(x-width*.28,z+3.1),(x-width*.54,z+.2)]
    if not all(safe(xx,zz,3.4) for xx,zz in plan):continue
    lower=[(xx+(x-xx)*.18,zz-2.6,height-8.2-.8*math.sin(i+number)) for i,(xx,zz) in enumerate(plan)]
    upper=[(xx,zz,height+.15+.24*math.sin(i*1.9+number)) for i,(xx,zz) in enumerate(plan)]
    ridge=(x+.12*width,z-.3,height+.65)
    for i in range(6):
        j=(i+1)%6;face('shadow' if i in [2,3] else 'stone',[lower[i],lower[j],upper[j],upper[i]])
        face('moss' if i in [0,1] else 'warm',[upper[i],upper[j],ridge])
        if i in [2,3,4]:
            a=Vector(upper[i]);b=Vector(upper[j]);mid=a.lerp(b,.47)+Vector((0,-.28,-.42))
            face('light',[tuple(a),tuple(b),tuple(mid)])
    features.append({'name':'BeddingShelf_'+str(number),'center_world_xz':[x,z],'base_embed_minimum':7,'route_edge_clearance_min':min(road(xx,zz) for xx,zz in plan),'note':'rear anchor extends 7m into slope; fractured supporting wedge descends 7.4–9m and tapers back into cliff'})
# Small angular fragments accumulate at the foot and around the receiving basin.
for i,(x,z,sx,sz,h) in enumerate([(338,-697,7,5,3.4),(341,-704,7,6,4),(392,-690,8,7,4),(399,-696,9,7,5),(408,-700,9,7,4.2),(417,-695,8,6,3.4),(431,-700,9,7,4),(445,-696,7,6,2.6),(322,-698,8,6,2.5),(287,-703,8,7,3)]):mass('Shore_'+str(i),x,z,sx,sz,h,90+i,.19*math.sin(i),True)
# Subordinate fractured blocks share bedding direction without evenly repeating a tile.
for i in range(56):
    x=281+random.random()*173;z=-741+random.random()*39
    mass('Fragment_'+str(i),x,z,3.5+random.random()*4,3+random.random()*4,1.2+random.random()*2.4,200+i,.18*math.sin(i*1.7),False)

for key,(vs,fs) in parts.items():
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
report={'candidate':'Silverveil gorge 01','created_utc':datetime.now(timezone.utc).isoformat(),'source_terrain_sha256':data['source_sha256'],'placement_three':{'position':[366,0,-713],'rotation':[0,0,0],'scale':[1,1,1]},'visual_root':'GEO_Silverveil','visual_triangles':triangles,'material_meshes':len(parts),'bounds_local_three':{'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]},'materials':[m.name for m in materials.values()],
 'water_aperture':'Actual sampled river half-width plus .65m, with complete-cell rejection along the edge. No visual water exported.','route_protection':'Terrain-facing cells require >2.4m beyond sampled route half-width; outcrop perimeter/centre/midpoints require >3.3m. Runtime must test the resulting collision setup.','collision_proxies':proxies,'features':features,'terrain_sampling':{'spacing_m':1,'source':'src/data/regions.ts','legacy_height':0,'range':grid},'verification':{'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'exported_roots':[glb['nodes'][i]['name'] for i in glb['scenes'][glb.get('scene',0)]['nodes']]},'preserved_scenes':{n:len(bpy.data.scenes[n].objects) for n in ['Scene','Haven_Dragons','Haven_Architecture','Haven_Transport']}}
(out/'silverveil-gorge.json').write_text(json.dumps(report,indent=2))
bpy.data.libraries.write(str(ROOT/'tools/blender/geology/silverveil-gorge.blend'),{s},fake_user=True,compress=True)
print(json.dumps({'triangles':triangles,'bounds':report['bounds_local_three'],'features':len(features),'proxies':len(proxies)}))
