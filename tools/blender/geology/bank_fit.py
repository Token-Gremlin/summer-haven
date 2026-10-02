"""Local r3 bank fit. Called by silverveil.py before export; no terrain edits.

Split only intersecting source faces on a half-metre grid before lowering them.
The full-strength strip clears the player route; transition lies inside the
western boulder proxy or outside the tested approach. Waterfall lip is untouched.
"""
import bpy,json,math
from pathlib import Path

def fit_observation_bank(scene, directory):
    sample=json.loads((Path(directory)/'bank-terrain.json').read_text());grid=sample['grid']
    def terrain(x,z):
        fx=max(0,min((grid['x1']-grid['x0'])/grid['step']-.000001,(x-grid['x0'])/grid['step']))
        fz=max(0,min((grid['z1']-grid['z0'])/grid['step']-.000001,(z-grid['z0'])/grid['step']))
        ix,iz=int(fx),int(fz);tx,tz=fx-ix,fz-iz;h=sample['heights']
        return (h[iz][ix]*(1-tx)+h[iz][ix+1]*tx)*(1-tz)+(h[iz+1][ix]*(1-tx)+h[iz+1][ix+1]*tx)*tz
    def smooth(v):
        t=max(0,min(1,v));return t*t*(3-2*t)
    # Coordinates in world X/Z/Y for clipping and terrain fitting.
    bounds=[352.0,359.0,-799.0,-735.8]
    def strength(x,z):
        return min(smooth((x-352)/1.4),smooth((359-x)/1.2),smooth((z+799)/2),smooth((-735.8-z)/1.4))
    def cut(poly,axis,value):
        low=[];high=[]
        for a,b in zip(poly,poly[1:]+poly[:1]):
            da=a[axis]-value;db=b[axis]-value
            if da<=1e-8:low.append(a)
            if da>=-1e-8:high.append(a)
            if da*db < -1e-14:
                t=da/(da-db);p=tuple(a[k]+t*(b[k]-a[k]) for k in range(3));low.append(p);high.append(p)
        return [p for p in [low,high] if len(p)>=3]
    result=[]
    for ob in scene.objects:
        if ob.type!='MESH' or not ob.name.startswith('GEO_Silverveil_'):continue
        old=ob.data;vs=[];fs=[];changed=0;maximum=0;affected_faces=0
        for face in old.polygons:
            poly=[(old.vertices[i].co.x+366,-old.vertices[i].co.y-713,old.vertices[i].co.z) for i in face.vertices]
            x0=min(p[0] for p in poly);x1=max(p[0] for p in poly);z0=min(p[1] for p in poly);z1=max(p[1] for p in poly)
            pieces=[poly]
            if x1>bounds[0] and x0<bounds[1] and z1>bounds[2] and z0<bounds[3]:
                affected_faces+=1
                for axis,lo,hi in [(0,bounds[0],bounds[1]),(1,bounds[2],bounds[3])]:
                    planes=sorted(set([lo,hi]+[lo+.5*i for i in range(1,math.ceil((hi-lo)/.5))]))
                    for value in planes:
                        pieces=[piece for p in pieces for piece in (cut(p,axis,value) if min(v[axis] for v in p)<value-1e-8 and max(v[axis] for v in p)>value+1e-8 else [p])]
            for p in pieces:
                start=len(vs)
                for x,z,y in p:
                    w=strength(x,z);target=min(y,terrain(x,z)-.18) if w>0 else y
                    yy=y+(target-y)*w
                    if y-yy>1e-6:changed+=1;maximum=max(maximum,y-yy)
                    vs.append((x-366,-z-713,yy))
                fs.append(tuple(start+i for i in range(len(p))))
        if changed:
            me=bpy.data.meshes.new(old.name+'_bankfit');me.from_pydata(vs,[],fs);me.update()
            for mat in old.materials:me.materials.append(mat)
            ob.data=me
            if old.users==0:bpy.data.meshes.remove(old)
        result.append({'mesh':ob.name,'lowered_vertices':changed,'maximum_lowering_m':maximum,'source_faces_split':affected_faces})
    return {'full_clearance_strip_world_xz':[353.4,357.8,-797,-737.2],
      'transition_extent_world_xz':bounds,'target_below_analytic_terrain_m':.18,
      'fit_grid_m':.5,'analytic_sample_grid_m':.25,'source_sha256':sample['source_sha256'],
      'geometry_changes':result,'collision_proxies_changed':False,'fall_lip_south_of_z_unchanged':-735.8}
