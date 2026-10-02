"""Actual authored triangle raycasts versus dense analytic terrain and proxies."""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[3];folder=Path(__file__).parent;s=bpy.data.scenes['Haven_Geology'];bpy.context.window.scene=s
report_path=ROOT/'public/assets/fantasy/silverveil-gorge.json';report=json.loads(report_path.read_text());data=json.loads((folder/'bank-terrain.json').read_text());g=data['grid']
trees=[]
for o in s.objects:
    if o.type=='MESH' and o.name.startswith('GEO_Silverveil_'):
        trees.append((o.name,BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons])))
def terrain(x,z):
    fx=(x-g['x0'])/g['step'];fz=(z-g['z0'])/g['step'];ix=min(len(data['heights'][0])-2,max(0,int(fx)));iz=min(len(data['heights'])-2,max(0,int(fz)));tx=fx-ix;tz=fz-iz;h=data['heights']
    return (h[iz][ix]*(1-tx)+h[iz][ix+1]*tx)*(1-tz)+(h[iz+1][ix]*(1-tx)+h[iz+1][ix+1]*tx)*tz
def hits(x,z):
    out=[]
    for name,tree in trees:
        co,normal,index,dist=tree.ray_cast(Vector((x-366,-z-713,120)),Vector((0,0,-1)),150)
        if co is not None:out.append({'mesh':name,'y':co.z})
    return sorted(out,key=lambda q:-q['y'])
def clearance(x,z):
    return min(math.hypot(max(p['bounds_world']['min'][0]-x,0,x-p['bounds_world']['max'][0]),max(p['bounds_world']['min'][2]-z,0,z-p['bounds_world']['max'][2])) for p in report['collision_proxies'])
samples=[];fail=[];max_delta=-1e9;min_clear=1e9;peak=None
# Body-disc expanded walking strip and observation turnaround, sampled at .1m.
for iz in range(551):
    z=-792+iz*.1
    for ix in range(33):
        x=353.7+ix*.1;tr=terrain(x,z);hh=hits(x,z);delta=hh[0]['y']-tr if hh else None
        # Only traversable centres: bank waterline cuts out the east side; proxies
        # exclude physical rocks. Radius is checked separately below.
        proxy=clearance(x,z);min_clear=min(min_clear,proxy) if 355.5<=x<=356.5 else min_clear
        if delta is not None and delta>max_delta:max_delta=delta;peak=[x,z,hh[0]['mesh'],hh[0]['y'],tr]
        if delta is not None and delta>.001:fail.append([x,z,delta,proxy])
for z in [-792,-780,-763,-755,-750,-746,-742,-740,-738]:
    for x in [353.8,354,355,356,356.8,357]:samples.append({'x':x,'z':z,'terrain':terrain(x,z),'hits':hits(x,z),'proxy_clearance':clearance(x,z)})
# .27m radius around the interaction disc and normal route; any geometry higher
# than terrain is reported rather than assumed blocked by an unrelated proxy.
disc=[]
for iz in range(50):
    z=-744.45+iz*.1
    for ix in range(50):
        x=353.55+ix*.1
        if math.hypot(x-356,z+742)>2.47:continue
        if clearance(x,z)<.001:continue
        hh=hits(x,z);tr=terrain(x,z)
        if hh and hh[0]['y']>tr+.001:disc.append({'x':x,'z':z,'height_above_terrain':hh[0]['y']-tr,'mesh':hh[0]['mesh'],'proxy_clearance':clearance(x,z)})
check={'method':'Downward BVH raycast against actual final visual mesh polygons, compared with quarter-metre analytic terrain; .1m inspection grid. Not gameplay.','tested_strip_xz':[353.7,356.9,-792,-737],'maximum_visual_above_terrain_m':max_delta,'maximum_location':peak,'raised_geometry_samples':fail,'inspection_samples':samples,'expanded_interaction_disc_radius_m':2.47,'expanded_disc_raised_samples':disc,'central_route_x_355_5_to_356_5_min_proxy_distance_m':min_clear,'player_radius_m':.27,'target':next(q for q in samples if q['x']==356 and q['z']==-742),'source_sha256':data['source_sha256']}
report['bank_fit']['contact_verification']=check
report['bank_fit']['source_sha256_files']={n:hashlib.sha256((folder/n).read_bytes()).hexdigest() for n in ['silverveil.py','bank_fit.py','sample-bank.ts','bank_inspect.py']}
report_path.write_text(json.dumps(report,indent=2));(folder/'bank-r3').mkdir(exist_ok=True);(folder/'bank-r3/contact-measurements.json').write_text(json.dumps(check,indent=2))
print(json.dumps({'maximum_delta':max_delta,'peak':peak,'strip_failures':len(fail),'disc_failures':len(disc),'disc_worst':sorted(disc,key=lambda q:-q['height_above_terrain'])[:5],'target':check['target'],'central_proxy_distance':min_clear}))
