"""Rebuild original Summer Haven production assets in Blender 5.2.
Run from Blender's Python console or through Blender MCP:
exec(compile(open(r'/path/to/repo/tools/blender/export_assets.py').read(),
             r'/path/to/repo/tools/blender/export_assets.py','exec'))
Only the two named SummerHaven production scenes are rebuilt. Other scenes stay intact.
"""
import bpy, bmesh, json, math, os, contextlib, io
from pathlib import Path

# Set SUMMER_HAVEN_REPO when running through an MCP exec without __file__.
ROOT=Path(os.environ.get('SUMMER_HAVEN_REPO',str(Path(__file__).resolve().parents[2])))
exec(compile((ROOT/'tools/blender/presentation.py').read_text(encoding='utf-8'),'presentation.py','exec'),globals())
PROMPT='Use Blender MCP as a production tool, not merely as an optional experiment.'

def build(source):
    path=ROOT/'tools'/'blender'/source
    scope={'__file__':str(path),'__name__':'__main__'}
    exec(compile(path.read_text(encoding='utf-8-sig'),str(path),'exec'),scope)
    return bpy.context.scene

def inspect(scene):
    totals={'meshes':0,'vertices':0,'triangles':0,'rigs':[]}
    for obj in scene.objects:
        obj.hide_set(False);obj.select_set(False)
        if obj.type=='ARMATURE':totals['rigs'].append({'name':obj.name,'bones':len(obj.data.bones)})
        if obj.type!='MESH':continue
        assert all(math.isfinite(v) for vert in obj.data.vertices for v in vert.co),obj.name
        assert all(abs(s-1)<.001 for s in obj.scale),f'Unapplied scale: {obj.name}'
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
        obj.data.update();obj.data.calc_loop_triangles()
        totals['meshes']+=1;totals['vertices']+=len(obj.data.vertices);totals['triangles']+=len(obj.data.loop_triangles)
    return totals

def export(scene,path,selection=False):
    path.parent.mkdir(parents=True,exist_ok=True)
    with contextlib.redirect_stdout(io.StringIO()):
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=selection,
            use_active_scene=True,export_yup=True,export_animations=selection,
            export_animation_mode='NLA_TRACKS',export_apply=not selection)

report={'author':'Summer Haven','units':'metres','Blender':bpy.app.version_string,'forward':'Blender -Y; glTF +Z','assets':{}}
scene=build('characters.py');report['assets']['characters']=inspect(scene)
for kind in ['feminine','masculine']:
    rig=scene.objects['RIG_'+kind]
    for obj in scene.objects:obj.select_set(obj==rig or obj.parent==rig)
    bpy.context.view_layer.objects.active=rig
    export(scene,ROOT/'public'/'assets'/'characters'/(kind+'.glb'),True)
present_character(scene)
bpy.data.libraries.write(str(ROOT/'tools'/'blender'/'characters.blend'),{scene},fake_user=True,compress=True)
scene=build('world_assets.py');report['assets']['village']=inspect(scene)
export(scene,ROOT/'public'/'assets'/'world'/'village-kit.glb')
present_world(scene)
bpy.data.libraries.write(str(ROOT/'tools'/'blender'/'world-assets.blend'),{scene},fake_user=True,compress=True)
(ROOT/'public'/'assets'/'manifest.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
