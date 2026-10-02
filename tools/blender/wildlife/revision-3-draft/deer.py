"""Bracken revision 3 staging: sculpted face, integrated limb and pastern volume.
Executed in wildlife.py's authoring namespace, through live Blender MCP.
"""
from mathutils import Matrix

def build_deer():
    root=start('deer','Wildlife_Deer');body=pivot('BodyPivot',(0,0,.93),root)
    # A raised loin, tucked flank, deep forward ribs and a narrow brisket.
    loft(body,'Fawn',[
        ((0,.69,.99),.035,.065),((0,.52,1.015),.205,.225),
        ((0,.28,1.025),.197,.195),((0,.03,.975),.231,.256),
        ((0,-.23,.995),.215,.235),((0,-.45,1.025),.164,.205),
        ((0,-.60,1.06),.085,.148),((0,-.69,1.08),.025,.065)],24,4)
    neck=pivot('NeckPivot',(0,-.49,1.08),body)
    loft(neck,'Fawn',[
        ((0,-.445,1.065),.140,.175),((0,-.555,1.205),.124,.163),
        ((0,-.675,1.365),.098,.141),((0,-.805,1.535),.086,.114),
        ((0,-.865,1.605),.080,.092)],20,4)
    head=pivot('HeadPivot',(0,-.83,1.54),neck)
    loft(head,'Fawn',[
        ((0,-.775,1.58),.063,.082),((0,-.87,1.644),.121,.148),
        ((0,-.99,1.618),.128,.135),((0,-1.085,1.56),.099,.102),
        ((0,-1.23,1.505),.078,.066),((0,-1.325,1.502),.072,.056),
        ((0,-1.35,1.505),.037,.029)],24,4)
    # A tapered nasal pad seated along the muzzle, not a bead at its tip.
    loft(head,'Dark',[((0,-1.30,1.537),.037,.019),
        ((0,-1.329,1.529),.060,.027),((0,-1.354,1.517),.055,.026),
        ((0,-1.364,1.505),.032,.013)],20,3)
    # Preserve the alert ear/eye identity; ear shells stay crisp instead of voxel-thin.
    mats['EarFawn']=mats['Fawn'].copy();mats['EarFawn'].name='skin_Wildlife_EarFawn'
    for s in [-1,1]:
        leaf(head,'EarFawn',(s*.07,-.84,1.68),(s*.305,-.77,1.985),.091,.031)
        leaf(head,'Rose',(s*.093,-.865,1.715),(s*.282,-.801,1.947),.055,.013)
        # Eyes are authored against the finished cheek surface by deer_face().
        for front,y in [(True,-.43),(False,.43)]:
            code=('F' if front else 'B')+('L' if s<0 else 'R')
            hip=(s*.166,y,.96);knee=(s*.183,y+(.016 if front else -.16),.53)
            leg=pivot('Leg_'+code,hip,body)
            if front:
                sections=[((s*.055,-.29,1.17),.075,.095),
                    ((s*.090,-.35,1.08),.085,.111),((s*.145,-.413,.96),.070,.097),
                    ((s*.165,-.397,.805),.063,.085),
                    ((s*.179,-.405,.64),.043,.057),(knee,.040,.051)]
            else:
                sections=[((s*.065,.455,1.17),.070,.095),
                    ((s*.095,.445,1.075),.090,.135),((s*.140,.423,.96),.103,.151),
                    ((s*.166,.358,.785),.085,.117),
                    ((s*.181,.295,.605),.047,.064),(knee,.039,.054)]
            loft(leg,'Fawn',sections,16,4)
            low=pivot('Knee_'+code,knee,leg)
            ankle=(s*.185,y+(.018 if front else .085),.17)
            loft(low,'Fawn',[(knee,.041,.050),
                ((s*.184,y+(.025 if front else -.07),.455),.039,.046),
                ((s*.184,y+(.032 if front else .085),.33),.035,.041),
                ((s*.185,ankle[1],.205),.034,.037),(ankle,.032,.033)],16,3)
            hoof=pivot('Hoof_'+code,ankle,low)
            # Skin continues across the fetlock/pastern; the dark cloven sole is
            # unchanged and stays rigid below the stable contact joint.
            loft(hoof,'Fawn',[(ankle,.032,.033),
                ((s*.185,ankle[1]-.005,.125),.036,.037),
                ((s*.185,ankle[1]-.021,.082),.037,.033),
                ((s*.185,ankle[1]-.038,.066),.032,.022)],14,3)
            for dx in [-.021,.021]:
                loft(hoof,'Dark',[((s*.185+dx,ankle[1]+.012,.047),.017,.026),((s*.185+dx,ankle[1]-.082,.023),.020,.023)],8,2)
    tail=pivot('TailPivot',(0,.62,1.02),body)
    leaf(tail,'Cream',(0,.60,1.02),(0,.87,1.11),.073,.032,normal=(0,0,1))
    leaf(tail,'EarFawn',(0,.60,1.044),(0,.86,1.126),.062,.020,normal=(0,0,1))

def deer_face(skin,head):
    """Fit shallow almond eyes and lids to the finished cheek, with no floating bead.
    These small rigid head details share the head's full-weight region of the skin.
    """
    cy,cz=-1.017,1.644
    def material(key,color,roughness):
        mat=bpy.data.materials.new('skin_Wildlife_'+key);mat.diffuse_color=(*color,1);mat.use_nodes=True
        bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=roughness
        mats[key]=mat;return mat
    material('EyeUmber',(.038,.020,.008),.4)
    material('EyeLid',(.34,.139,.053),.82)
    material('Mouth',(.16,.070,.027),.9)
    # Subtle depression under the eye, with a rounded brow that belongs to the skin.
    for vertex in skin.data.vertices:
        x,y,z=vertex.co
        if abs(x)<.055 or y>-.92 or y<-1.115 or z<1.57 or z>1.72:continue
        eye=((y-cy)/.053)**2+((z-cz)/.034)**2
        brow=((y-(cy+.004))/.060)**2+((z-(cz+.033))/.025)**2
        vertex.co.x+=(-.004*math.exp(-eye*2)+.006*math.exp(-brow*2))*(1 if x>0 else -1)
    skin.data.update()
    bm=bmesh.new();bm.from_mesh(skin.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(skin.data);bm.free()
    tree=BVHTree.FromPolygons([v.co for v in skin.data.vertices],[p.vertices[:] for p in skin.data.polygons])
    def on_skin(s,y,z,relief=0):
        hit,_,_,_=tree.ray_cast(Vector((s*.6,y,z)),Vector((-s,0,0)),1.2)
        assert hit is not None,('face ray missed',s,y,z)
        return Vector((hit.x+s*relief,y,z))
    faceparts={}
    def part(name,key,vertices,faces):
        # Both eyes share material meshes, keeping focal detail inexpensive to draw.
        if key not in faceparts:faceparts[key]=[[],[]]
        destv,destf=faceparts[key];offset=len(destv);destv.extend(vertices)
        destf.extend([tuple(i+offset for i in f) for f in faces])
    def tube(name,key,points,radii,s):
        verts=[];faces=[];around=8
        for i,p in enumerate(points):
            tangent=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
            normal=Vector((s,0,0));across=tangent.cross(normal).normalized()
            for j in range(around):
                a=j*math.tau/around;verts.append(p+radii[i]*(normal*math.cos(a)+across*math.sin(a)))
        for i in range(len(points)-1):
            for j in range(around):
                a=i*around+j;b=i*around+(j+1)%around;faces.append((a,b,b+around,a+around))
        faces.extend([tuple(reversed(range(around))),tuple(range(len(verts)-around,len(verts)))])
        part(name,key,verts,faces)
    for s,label in [(-1,'L'),(1,'R')]:
        # Surface-conforming four-ring lens: only 5 mm of central relief, tapered
        # to 0.8 mm at the pointed corners. No exposed spherical iris.
        sides=24;rings=4;verts=[on_skin(s,cy,cz,.005)];faces=[]
        for ring in range(1,rings+1):
            r=ring/rings
            for j in range(sides):
                a=j*math.tau/sides;y=cy+.040*r*math.cos(a)
                z=cz+.0185*r*math.sin(a)*abs(math.sin(a))**.30+.07*(y-cy)
                verts.append(on_skin(s,y,z,.0008+.0042*(1-r*r)))
        for j in range(sides):faces.append((0,1+j,1+(j+1)%sides))
        for ring in range(rings-1):
            for j in range(sides):
                a=1+ring*sides+j;b=1+ring*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
        if s<0:faces=[tuple(reversed(f)) for f in faces]
        part('deer_Eye_'+label,'EyeUmber',verts,faces)
        for upper in [True,False]:
            points=[];radii=[];steps=18
            for i in range(steps+1):
                a=(0 if upper else math.pi)+math.pi*i/steps
                y=cy+.042*math.cos(a)
                z=cz+.021*math.sin(a)*abs(math.sin(a))**.30+.07*(y-cy)
                points.append(on_skin(s,y,z,.001))
                radii.append((.0013+(.0021 if upper else .0011)*math.sin(math.pi*i/steps)))
            tube('deer_'+('UpperLid_' if upper else 'LowerLid_')+label,'EyeLid' if upper else 'Fawn',points,radii,s)
        # One small painted-looking catchlight, inset from the upper front corner.
        hy,hz=cy-.013,cz+.007
        verts=[on_skin(s,hy,hz,.0063)]
        for j in range(10):
            a=j*math.tau/10;verts.append(on_skin(s,hy+.0026*math.cos(a),hz+.0028*math.sin(a),.0063))
        faces=[(0,j+1,(j+1)%10+1) for j in range(10)]
        if s<0:faces=[tuple(reversed(f)) for f in faces]
        part('deer_Catchlight_'+label,'Highlight',verts,faces)
        points=[];radii=[]
        for i in range(10):
            t=i/9;y=-1.300+.125*t;z=1.478+.018*t
            points.append(on_skin(s,y,z,.0005));radii.append(.0006+.0011*math.sin(t*math.pi))
        tube('deer_MouthCorner_'+label,'Mouth',points,radii,s)
    for key,(vertices,faces) in faceparts.items():
        name='deer_HeadDetail_'+key;origin=head.matrix_world.translation
        mesh=bpy.data.meshes.new(name);mesh.from_pydata([v-origin for v in vertices],[],faces);mesh.update()
        bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
        ob=bpy.data.objects.new(name,mesh);scene.collection.objects.link(ob);ob.parent=head
        mesh.materials.append(mats[key])
        for p in mesh.polygons:p.use_smooth=True

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
    deer_face(skin,old['HeadPivot'])

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
            limb=(1-smooth(.76,1.14,z))*smooth(.045,.17,abs(x))
            limb*=1-smooth(.16,.34,abs(y-cy))
            if z<.68:limb=1.0
            limb=max(0,min(1,limb))
            code=('F' if front else 'B')+('L' if x<0 else 'R')
            lower=1-smooth(.46,.62,z)
            foot=1-smooth(.12,.225,z)
            weights={'BodyPivot':1-limb,'Leg_'+code:limb*(1-lower),
                'Knee_'+code:limb*lower*(1-foot),'Hoof_'+code:limb*lower*foot}
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
        # A quiet warm socket and graded pastern transition replace outlined eyes
        # and the previous abruptly colored boot cuff.
        socket=((y+1.017)/.055)**2+((z-1.644)/.033)**2
        c=c.lerp(Vector((.30,.13,.049)),(1-smooth(.8,2.0,socket))*smooth(.065,.10,abs(x))*.24)
        pastern=(1-smooth(.07,.20,z))*smooth(.07,.14,abs(x))
        c=c.lerp(Vector((.15,.072,.032)),pastern)
        # Faint small dapples follow the actual surface; no polygon-shaped decals.
        for py,pz,rx,rz in [(.40,1.105,.052,.026),(.18,1.13,.038,.022),(-.015,1.14,.032,.019)]:
            d=((y-py)/rx)**2+((z-pz)/rz)**2
            amount=(1-smooth(.3,1.3,d))*smooth(.16,.21,abs(x))*.40
            c=c.lerp(Vector((.77,.60,.35)),amount)
        colors.data[v.index].color=(*c,1)
    skin['authoredVertexColor']=True;skin['revision']=3
    skin['authorship']='Original connected anatomical loft union, reduced silhouette topology, hand-directed weights and paint'
    rig['contract']='Global-aligned rest axes; R1 joint translations and cloven sole surfaces preserved'
    bpy.context.view_layer.update()
    return skin,rig



