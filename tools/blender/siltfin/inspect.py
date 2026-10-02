"""Factual per-frame deformation, sole-contact and exported-channel checks."""
import bpy,json,math,hashlib,struct
from pathlib import Path
from mathutils import Vector
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[3];s=bpy.data.scenes['Haven_Siltfin'];bpy.context.window.scene=s;r=s.objects['RIG_Vesper_Siltfin'];meshes=[o for o in r.children if o.type=='MESH']
p=ROOT/'public/assets/creatures/vesper-siltfin.json';report=json.loads(p.read_text());feet=['foreL','foreR','hindL','hindR'];indices={}
for ob in meshes:
    names={g.index:g.name for g in ob.vertex_groups}
    for foot in feet:indices[ob.name,foot]=[v.index for v in ob.data.vertices if sum(g.weight for g in v.groups if names[g.group].startswith(foot) and ('Foot' in names[g.group] or 'Toe' in names[g.group]))>.65]
def bounds(points):
    lo=[min(p[k] for p in points) for k in range(3)];hi=[max(p[k] for p in points) for k in range(3)]
    return {'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]}
def sample():
    dg=bpy.context.evaluated_depsgraph_get();corners=[];contacts={f:1e9 for f in feet};finite=True
    for ob in meshes:
        eo=ob.evaluated_get(dg);corners.extend(eo.matrix_world@Vector(v) for v in eo.bound_box);me=eo.to_mesh()
        for foot in feet:
            ids=indices[ob.name,foot]
            if ids:contacts[foot]=min(contacts[foot],min((eo.matrix_world@me.vertices[i].co).z for i in ids))
        finite=finite and all(math.isfinite(c) for v in me.vertices for c in v.co);eo.to_mesh_clear()
    return bounds(corners),contacts,finite
for tr in r.animation_data.nla_tracks:tr.mute=True
r.animation_data.action=None
for pb in r.pose.bones:pb.rotation_quaternion=(1,0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
bpy.context.view_layer.update();report['neutral_contact']=sample()[1]
allclips={}
for tr in r.animation_data.nla_tracks:
    action=tr.strips[0].action;r.animation_data.action=action;end=int(action.frame_range[1]);entry={'frames':end,'feet_minimum_y_ranges':{f:[1e9,-1e9] for f in feet},'union_bounds_three':{'min':[1e9]*3,'max':[-1e9]*3},'finite':True,'selected_frames':{}};first=None;last=None
    for fr in range(1,end+1):
        s.frame_set(fr);bpy.context.view_layer.update();bb,contacts,finite=sample();entry['finite']&=finite
        for f,y in contacts.items():entry['feet_minimum_y_ranges'][f]=[min(entry['feet_minimum_y_ranges'][f][0],y),max(entry['feet_minimum_y_ranges'][f][1],y)]
        for k in range(3):entry['union_bounds_three']['min'][k]=min(entry['union_bounds_three']['min'][k],bb['min'][k]);entry['union_bounds_three']['max'][k]=max(entry['union_bounds_three']['max'][k],bb['max'][k])
        if fr in [1,(end+1)//4,(end+1)//2,3*(end+1)//4,end]:entry['selected_frames'][str(fr)]={'bounds_three':bb,'sole_minimum_y':contacts}
        matrices={pb.name:list(v for row in pb.matrix for v in row) for pb in r.pose.bones}
        if fr==1:first=matrices
        if fr==end:last=matrices
    entry['endpoint_bone_matrix_max_error']=max(abs(a-b) for n in first for a,b in zip(first[n],last[n]));allclips[tr.name]=entry
report['deformation']=allclips
raw=(p.with_suffix('.glb')).read_bytes();g=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]]);binary=20+struct.unpack_from('<I',raw,12)[0]+8

def accessor(index):
    a=g['accessors'][index];v=g['bufferViews'][a['bufferView']];count={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];stride=v.get('byteStride',4*count);start=binary+v.get('byteOffset',0)+a.get('byteOffset',0)
    return [struct.unpack_from('<'+'f'*count,raw,start+i*stride) for i in range(a['count'])]
roots=[g['nodes'][i] for i in g['scenes'][g.get('scene',0)]['nodes']]
channels=[]
for a in g['animations']:
    for ch in a['channels']:
        node=g['nodes'][ch['target']['node']]
        if node.get('name') in ['root','RIG_Vesper_Siltfin'] and ch['target']['path']=='translation':
            values=accessor(a['samplers'][ch['sampler']]['output']);spread=max(max(v[k] for v in values)-min(v[k] for v in values) for k in range(3));channels.append({'clip':a['name'],'node':node['name'],'value':values[0],'maximum_variation':spread})
report['export']['scene_roots']=roots;report['export']['root_translation_channels']=channels;report['export']['fin_material_double_sided']=next(m.get('doubleSided',False) for m in g['materials'] if m.get('name','').startswith('skin_SiltfinFin'));report['export']['triangles_from_indices']=sum(g['accessors'][q['indices']]['count']//3 for m in g['meshes'] for q in m['primitives']);report['export']['morph_targets']=any(q.get('targets') for m in g['meshes'] for q in m['primitives'])
report['inspection_utc']=datetime.now(timezone.utc).isoformat();report['source_sha256']={n:hashlib.sha256((ROOT/'tools/blender/siltfin'/n).read_bytes()).hexdigest() for n in ['vesper.py','siltfin_meshcraft.py','review.py','inspect.py']};report['preserved_scenes_after_inspection']={n:len(bpy.data.scenes[n].objects) for n in report['preserved_scenes']}
report['water_placement']={'visible_surface':'regionRiverSample(z).y + .08','root_y':'visibleSurfaceY - 1.0377006202936172','local_waterline_y':1.0377006202936172,'notes':'Runtime owns horizontal travel and submerge/surface depth. Clips carry no root travel. Inspect bank clearance against full animated bounds.'}
r.animation_data.action=next(tr.strips[0].action for tr in r.animation_data.nla_tracks if tr.name=='idle');s.frame_set(1);p.write_text(json.dumps(report,indent=2))
print(json.dumps({'contact':report['neutral_contact'],'roots':roots,'root_translation':channels,'fin_two_sided':report['export']['fin_material_double_sided'],'clips':{k:{'bounds':v['union_bounds_three'],'foot_ranges':v['feet_minimum_y_ranges'],'loop_error':v['endpoint_bone_matrix_max_error']} for k,v in allclips.items()}}))
