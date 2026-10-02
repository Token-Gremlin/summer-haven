"""Check export facts and conservative proxy clearance against sampled route."""
import bpy,json,math,hashlib,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
path=ROOT/'public/assets/fantasy/silverveil-gorge.json';report=json.loads(path.read_text());data=json.loads((Path(__file__).parent/'terrain-samples.json').read_text())
checks=[]
for proxy in report['collision_proxies']:
    lo=proxy['bounds_world']['min'];hi=proxy['bounds_world']['max'];best=1e9;where=None
    for a,b in zip(data['route'],data['route'][1:]):
        length=math.hypot(b['x']-a['x'],b['z']-a['z']);count=max(1,math.ceil(length/.25))
        for i in range(count+1):
            t=i/count;x=a['x']+(b['x']-a['x'])*t;z=a['z']+(b['z']-a['z'])*t;width=a['width']+(b['width']-a['width'])*t
            dx=max(lo[0]-x,0,x-hi[0]);dz=max(lo[2]-z,0,z-hi[2]);clearance=math.hypot(dx,dz)-width*.5
            if clearance<best:best=clearance;where=[x,z]
    checks.append({'name':proxy['name'],'minimum_route_edge_clearance_m':best,'route_point_xz':where})
raw=(ROOT/'public/assets/fantasy/silverveil-gorge.glb').read_bytes();glb=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
roots=[glb['nodes'][i] for i in glb['scenes'][glb.get('scene',0)]['nodes']]
report['verification']['roots_identity']=all(not any(k in n for k in ['translation','rotation','scale','matrix']) for n in roots)
report['verification']['single_primitive_per_mesh']=all(len(m['primitives'])==1 for m in glb['meshes'])
report['verification']['proxy_route_clearance']=checks
report['verification']['minimum_proxy_route_edge_clearance_m']=min(c['minimum_route_edge_clearance_m'] for c in checks)
report['verification']['terrain_source_unchanged']=hashlib.sha256((ROOT/'src/data/regions.ts').read_bytes()).hexdigest()==report['source_terrain_sha256']
report['materials']=[m['name'] for m in glb['materials']]
report['verification']['triangles_including_proxies']=sum(glb['accessors'][p['indices']]['count']//3 for m in glb['meshes'] for p in m['primitives'])
report['water_interface']={'center_x':366,'opening_x':[356,376],'top_zy':[-730,54],'bottom_zy':[-708,18],'profile':'Y=54-36*((Z+730)/22)^2','basin_center_xz':[370,-698],'basin_radii_xz':[22,18],'basin_y':18,'wet_margin_inner_offset_m':.12,'wet_margin_y_below_water_m':.18}
report['review']['source_sha256']['inspect.py']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
path.write_text(json.dumps(report,indent=2))
print(json.dumps({'triangles':report['visual_triangles'],'materials':report['material_meshes'],'minimum_proxy_route_edge_clearance_m':report['verification']['minimum_proxy_route_edge_clearance_m'],'closest':sorted(checks,key=lambda x:x['minimum_route_edge_clearance_m'])[:5],'terrain_source_unchanged':report['verification']['terrain_source_unchanged']}))
