"""Bracken revision 2: original connected anatomical skin and stable contact rig.
Executed in wildlife.py's authoring namespace, through live Blender MCP.
"""
from mathutils import Matrix

def build_deer():
    root=start('deer','Wildlife_Deer');body=pivot('BodyPivot',(0,0,.93),root)
    # A raised loin, tucked flank, deep forward ribs and a narrow brisket.
    loft(body,'Fawn',[
        ((0,.69,.99),.035,.065),((0,.52,1.015),.205,.225),
        ((0,.28,1.025),.197,.195),((0,.03,.975),.231,.256),
        ((0,-.23,.985),.222,.275),((0,-.45,1.005),.179,.277),
        ((0,-.60,1.025),.090,.182),((0,-.69,1.035),.025,.070)],24,4)
    neck=pivot('NeckPivot',(0,-.49,1.08),body)
    loft(neck,'Fawn',[
        ((0,-.445,1.035),.148,.195),((0,-.555,1.19),.127,.174),
        ((0,-.675,1.365),.098,.141),((0,-.805,1.535),.086,.114),
        ((0,-.865,1.605),.080,.092)],20,4)
    head=pivot('HeadPivot',(0,-.83,1.54),neck)
    loft(head,'Fawn',[
        ((0,-.765,1.575),.054,.067),((0,-.87,1.644),.117,.143),
        ((0,-.99,1.622),.116,.122),((0,-1.08,1.56),.086,.088),
        ((0,-1.235,1.505),.059,.055),((0,-1.325,1.502),.068,.047),
        ((0,-1.35,1.505),.037,.025)],20,4)
    bead(head,'Dark',(0,-1.337,1.518),(.057,.027,.033))
    # Preserve the alert ear/eye identity; ear shells stay crisp instead of voxel-thin.
    mats['EarFawn']=mats['Fawn'].copy();mats['EarFawn'].name='skin_Wildlife_EarFawn'
    for s in [-1,1]:
        leaf(head,'EarFawn',(s*.07,-.84,1.68),(s*.305,-.77,1.985),.091,.031)
        leaf(head,'Rose',(s*.093,-.865,1.715),(s*.282,-.801,1.947),.055,.013)
        bead(head,'Dark',(s*.104,-.998,1.659),(.022,.039,.030))
        bead(head,'Amber',(s*.123,-1.008,1.664),(.008,.023,.022))
        bead(head,'Highlight',(s*.129,-1.021,1.673),(.005,.007,.007))
        for front,y in [(True,-.43),(False,.43)]:
            code=('F' if front else 'B')+('L' if s<0 else 'R')
            hip=(s*.166,y,.96);knee=(s*.183,y+(.016 if front else -.16),.53)
            leg=pivot('Leg_'+code,hip,body)
            if front:
                sections=[((s*.07,-.34,1.115),.045,.065),
                    ((s*.12,-.395,1.045),.088,.121),(hip,.093,.132),
                    ((s*.173,-.382,.78),.059,.078),
                    ((s*.181,-.405,.615),.036,.047),(knee,.035,.046)]
            else:
                sections=[((s*.075,.48,1.095),.055,.077),
                    ((s*.12,.455,1.015),.112,.15),(hip,.117,.17),
                    ((s*.172,.372,.785),.086,.114),
                    ((s*.181,.295,.605),.047,.064),(knee,.039,.054)]
            loft(leg,'Fawn',sections,16,4)
            low=pivot('Knee_'+code,knee,leg)
            ankle=(s*.185,y+(.018 if front else .085),.17)
            loft(low,'Fawn',[(knee,.035,.044),
                ((s*.184,y+(.025 if front else -.07),.455),.034,.039),
                ((s*.184,y+(.032 if front else .095),.33),.029,.034),
                ((s*.185,ankle[1],.205),.025,.029),(ankle,.023,.026)],14,3)
            hoof=pivot('Hoof_'+code,ankle,low)
            # R1 hoof surfaces and all joint positions remain byte-for-byte designed alike.
            loft(hoof,'Chestnut',[(ankle,.025,.03),((s*.185,ankle[1]-.017,.066),.034,.034),((s*.185,ankle[1]-.055,.036),.043,.035)],10,2)
            for dx in [-.021,.021]:
                loft(hoof,'Dark',[((s*.185+dx,ankle[1]+.012,.047),.017,.026),((s*.185+dx,ankle[1]-.082,.023),.020,.023)],8,2)
    tail=pivot('TailPivot',(0,.62,1.02),body)
    leaf(tail,'Cream',(0,.60,1.02),(0,.87,1.11),.073,.032,normal=(0,0,1))
    leaf(tail,'EarFawn',(0,.60,1.044),(0,.86,1.126),.062,.020,normal=(0,0,1))

def deer_skin():
    root=roots['deer']; old=dict(pivots['deer'])
    joints={name:(ob.matrix_world.translation.copy(),ob.parent.name if ob.parent else '') for name,ob in old.items()}
    components=[o for o in root.children_recursive if o.type=='MESH' and o.data.materials[0]==mats['Fawn']]
    # Voxel union resolves intersections into one manifold surface. Controlled reduction
    # spends geometry on silhouette and deformation, not disconnected caps.
    for ob in scene.objects:ob.select_set(False)
    for ob in components:ob.select_set(True)
    bpy.context.view_layer.objects.active=components[0]
    bpy.ops.object.join();skin=components[0]
    world=skin.matrix_world.copy();skin.parent=None
    skin.data.transform(world);skin.matrix_world=Matrix.Identity(4)
    skin.name='deer_ConnectedSkin';skin.data.name='Bracken_connected_anatomy'
    remesh=skin.modifiers.new('Anatomical union','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.010
    remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    sm=skin.modifiers.new('Relax junctions','SMOOTH');sm.factor=.85;sm.iterations=14
    bpy.ops.object.modifier_apply(modifier=sm.name)
    skin.data.calc_loop_triangles();ratio=min(1,9400/len(skin.data.loop_triangles))
    dec=skin.modifiers.new('Silhouette reduction','DECIMATE');dec.ratio=ratio
    bpy.ops.object.modifier_apply(modifier=dec.name)
    # The union may retain tiny enclosed scraps where overlapping muscle lofts meet.
    # Keep the connected exterior, rather than exporting floating internal triangles.
    adjacency={v.index:set() for v in skin.data.vertices}
    for edge in skin.data.edges:
        a,b=edge.vertices;adjacency[a].add(b);adjacency[b].add(a)
    seen=set();components=[]
    for start in adjacency:
        if start in seen:continue
        queue=[start];part=set()
        while queue:
            i=queue.pop()
            if i in seen:continue
            seen.add(i);part.add(i);queue.extend(adjacency[i]-seen)
        components.append(part)
    if len(components)>1:
        keep=max(components,key=len)
        assert sum(len(c) for c in components if c is not keep)<12,'unexpected detached anatomy'
        order=sorted(keep);remap={old:new for new,old in enumerate(order)}
        data=bpy.data.meshes.new('Bracken_connected_exterior')
        data.from_pydata([skin.data.vertices[i].co[:] for i in order],[],
            [tuple(remap[i] for i in f.vertices) for f in skin.data.polygons if all(i in keep for i in f.vertices)])
        data.update();skin.data=data
    for face in skin.data.polygons:face.use_smooth=True

    arm=bpy.data.armatures.new('Bracken_contact_skeleton')
    rig=bpy.data.objects.new('deer_Rig',arm);scene.collection.objects.link(rig);rig.parent=root
    for ob in scene.objects:ob.select_set(False)
    rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.object.mode_set(mode='EDIT')
    # Blender's glTF bone exporter keeps bone-local axes. +Z authoring tails
    # cancel its root basis conversion, yielding identity glTF rest rotations.
    # +Y tails would instead produce a -90 degree root and wrong child axes.
    for name,(point,_) in joints.items():
        b=arm.edit_bones.new('deer_'+name);b.head=point;b.tail=point+Vector((0,0,.1));b.roll=0
    for name,(_,parent) in joints.items():
        if parent in arm.edit_bones:arm.edit_bones['deer_'+name].parent=arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.update()
    rigid=[o for o in root.children_recursive if o.type=='MESH' and o!=skin]
    for ob in rigid:
        parent=ob.parent.name;world=ob.matrix_world.copy()
        ob.parent=rig;ob.parent_type='BONE';ob.parent_bone=parent
        bpy.context.view_layer.update();ob.matrix_world=world
    for ob in old.values():bpy.data.objects.remove(ob,do_unlink=True)
    pivots['deer']={name:rig.pose.bones['deer_'+name] for name in joints}
    skin.parent=rig
    mod=skin.modifiers.new('Continuous anatomical deformation','ARMATURE');mod.object=rig
    groups={name:skin.vertex_groups.new(name='deer_'+name) for name in joints}
    def smooth(a,b,x):
        t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
    for v in skin.data.vertices:
        x,y,z=v.co;weights={'BodyPivot':1.0}
        # Leg roots share a broad body-to-muscle transition; no hard collar seam.
        if z<1.15 and abs(x)>.055:
            front=y<-.10;cy=-.43 if front else .43
            limb=(1-smooth(.95,1.14,z))*smooth(.045,.17,abs(x))
            limb*=1-smooth(.16,.34,abs(y-cy))
            if z<.68:limb=1.0
            limb=max(0,min(1,limb))
            code=('F' if front else 'B')+('L' if x<0 else 'R')
            lower=1-smooth(.46,.62,z)
            weights={'BodyPivot':1-limb,'Leg_'+code:limb*(1-lower),'Knee_'+code:limb*lower}
        neck=smooth(1.00,1.34,z)*(1-smooth(-.48,-.29,y))
        if neck>0:
            weights={k:w*(1-neck) for k,w in weights.items()}
            head=smooth(1.455,1.62,z)*smooth(.72,.87,-y)
            if y<-.96:head=max(head,smooth(.95,1.10,-y))
            weights['NeckPivot']=neck*(1-head);weights['HeadPivot']=neck*head
        total=sum(weights.values())
        for name,w in weights.items():
            if w>1e-6:groups[name].add([v.index],w/total,'REPLACE')

    # Continuous paint is in linear color space and intentionally survives runtime
    # material replacement via the explicit authoredVertexColor contract.
    mat=bpy.data.materials.new('skin_Wildlife_Painted');mat.use_nodes=True;mat.diffuse_color=(1,1,1,1)
    bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Roughness'].default_value=.88
    colors=skin.data.color_attributes.new(name='BrackenPaint',type='FLOAT_COLOR',domain='POINT')
    color_node=mat.node_tree.nodes.new('ShaderNodeVertexColor');color_node.layer_name=colors.name
    mat.node_tree.links.new(color_node.outputs['Color'],bs.inputs['Base Color'])
    skin.data.materials.clear();skin.data.materials.append(mat)
    for v in skin.data.vertices:
        x,y,z=v.co;c=Vector((.43,.205,.083))
        dorsal=smooth(1.075,1.26,z)*(1-smooth(-.60,-.42,-y))*.30
        c=c.lerp(Vector((.29,.117,.043)),dorsal)
        belly=smooth(.59,.73,z)*(1-smooth(.745,.845,z))*(1-smooth(.13,.225,abs(x)))*smooth(.0,.17,y+.50)
        neckfront=-.445-(z-1.035)*.76
        throat=smooth(.040,.095,neckfront-y)*(1-smooth(.035,.095,abs(x)))
        throat*=smooth(1.07,1.19,z)*(1-smooth(1.49,1.57,z))
        jaw=(1-smooth(1.485,1.535,z))*smooth(.97,1.11,-y)
        rump=smooth(.545,.645,y)*(1-smooth(.90,1.145,z))
        cream=max(belly,throat,jaw,rump)
        c=c.lerp(Vector((.78,.64,.40)),cream)
        # Faint small dapples follow the actual surface; no polygon-shaped decals.
        for py,pz,rx,rz in [(.40,1.105,.052,.026),(.18,1.13,.038,.022),(-.015,1.14,.032,.019)]:
            d=((y-py)/rx)**2+((z-pz)/rz)**2
            amount=(1-smooth(.3,1.3,d))*smooth(.16,.21,abs(x))*.40
            c=c.lerp(Vector((.77,.60,.35)),amount)
        colors.data[v.index].color=(*c,1)
    skin['authoredVertexColor']=True;skin['revision']=2
    skin['authorship']='Original connected anatomical loft union, reduced silhouette topology, hand-directed weights and paint'
    rig['contract']='Global-aligned rest axes; R1 joint translations and hoof surfaces preserved'
    bpy.context.view_layer.update()
    return skin,rig



