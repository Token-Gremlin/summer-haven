"""Record export and sampled deformation facts; this does not certify motion quality."""
import bpy,json,hashlib,struct,ast
from datetime import datetime,timezone
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
scene=bpy.data.scenes['Haven_Dragons'];bpy.context.window.scene=scene
rig=scene.objects['RIG_Aurelian_Reedwing'];meshes=[o for o in scene.objects if o.parent==rig and o.type=='MESH']
feet=['foreLFoot','foreRFoot','hindLFoot','hindRFoot'];foot_indices={}
for o in meshes:
    if o.name not in ['Aurelian_Slate','Aurelian_Crown']:continue
    for foot in feet:
        vg=o.vertex_groups.get(foot)
        foot_indices[o.name,foot]=[v.index for v in o.data.vertices if any(g.group==vg.index and g.weight>.75 for g in v.groups)]
report=json.loads((ROOT/'public/assets/creatures/aurelian-reedwing.json').read_text())
samples={}
for track in rig.animation_data.nla_tracks:
    rig.animation_data.action=track.strips[0].action;end=int(track.strips[0].action.frame_range[1]);frames=list(range(1,end+1))
    entry={'sample_frames':frames,'minimum_z':1e9,'maximum_z':-1e9,'foot_minimum_z_ranges':{foot:[1e9,-1e9] for foot in feet},'selected_bounds':{}}
    for fr in frames:
        scene.frame_set(fr);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();corners=[];footz={foot:1e9 for foot in feet}
        for o in meshes:
            eo=o.evaluated_get(dg);corners.extend(eo.matrix_world@Vector(v) for v in eo.bound_box)
            if o.name in ['Aurelian_Slate','Aurelian_Crown']:
                me=eo.to_mesh()
                for foot in feet:
                    inds=foot_indices[o.name,foot]
                    if inds:footz[foot]=min(footz[foot],min((eo.matrix_world@me.vertices[i].co).z for i in inds))
                eo.to_mesh_clear()
        lo=[min(p[k] for p in corners) for k in range(3)];hi=[max(p[k] for p in corners) for k in range(3)]
        entry['minimum_z']=min(entry['minimum_z'],lo[2]);entry['maximum_z']=max(entry['maximum_z'],hi[2])
        for foot,z in footz.items():entry['foot_minimum_z_ranges'][foot]=[min(entry['foot_minimum_z_ranges'][foot][0],z),max(entry['foot_minimum_z_ranges'][foot][1],z)]
        if fr in [1,16,34,46,end]:entry['selected_bounds'][str(fr)]={'min':lo,'max':hi}
    samples[track.name]=entry
rig.animation_data.action=next(t.strips[0].action for t in rig.animation_data.nla_tracks if t.name=='idle');scene.frame_set(1)
report['rest_wing_joints_blender']={name:{'head':list(rig.pose.bones[name].head),'tail':list(rig.pose.bones[name].tail)} for name in ['wingArmL','wingHandL','wingArmR','wingHandR']}
report['revision']='creature-03 candidate';report['inspection_utc']=datetime.now(timezone.utc).isoformat();report['deformation_samples_blender']=samples
raw=(ROOT/'public/assets/creatures/aurelian-reedwing.glb').read_bytes();glb=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
report['export_verification']={'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'clips':[a['name'] for a in glb['animations']],'bones':[glb['nodes'][i]['name'] for i in glb['skins'][0]['joints']],'single_primitive_per_mesh':all(len(m['primitives'])==1 for m in glb['meshes']),'mesh_names':[n['name'] for n in glb['nodes'] if 'mesh' in n]}
report['export_verification']['morph_targets']=any('targets' in p for m in glb['meshes'] for p in m['primitives'])
previous=json.loads((ROOT/'tools/blender/dragons/revision-2/aurelian-reedwing.json').read_text())
report['export_verification']['unchanged_r2_bone_names']=report['export_verification']['bones']==previous['export_verification']['bones']
report['export_verification']['unchanged_r2_mesh_names']=report['export_verification']['mesh_names']==previous['export_verification']['mesh_names']
report['review_provenance']={'mode':'Blender Eevee diagnostic, no gameplay; independent critic still required','image_resolution':[1080,810],'scene':'Haven_Dragons','root_position':[0,0,0],'studio':'review.py fixed three-light setup','previous_images':'dragon-aurelian-r2-*.png','matched_camera_script':'tools/blender/dragons/review.py','preserved_scenes':{n:len(bpy.data.scenes[n].objects) for n in ['Scene','Haven_Architecture','Haven_Transport']}}
report['review_provenance']['source_sha256']={n:hashlib.sha256((ROOT/'tools/blender/dragons'/n).read_bytes()).hexdigest() for n in ['aurelian.py','meshcraft.py','review.py']}
tree=ast.parse((ROOT/'tools/blender/dragons/review.py').read_text(encoding='utf-8-sig'))
views=ast.literal_eval(next(node.value for node in tree.body if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='views' for t in node.targets)))
report['review_provenance']['views']=[]
for name,clip,frame,camera,target,scale in views:
    path=ROOT/'docs/gauntlet/evidence'/('dragon-aurelian-'+name+'.png')
    report['review_provenance']['views'].append({'file':path.name,'clip':clip or 'bind pose','frame':frame,'camera_position_blender':camera,'look_at_blender':target,'orthographic_scale':scale,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'rendered_utc':datetime.fromtimestamp(path.stat().st_mtime,timezone.utc).isoformat()})
(ROOT/'public/assets/creatures/aurelian-reedwing.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'revision':report['revision'],'metrics':{k:report[k] for k in ['triangles','vertices','bones','meshes','bbox_blender']},'clips':report['export_verification']['clips'],'idle':samples['idle'],'preserved':report['review_provenance']['preserved_scenes']}))
