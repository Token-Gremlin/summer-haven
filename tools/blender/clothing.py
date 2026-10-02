"""Fitted wardrobe with rounded shoulder caps, open layers, collars and tailoring."""
def build_tops(torso,sh,torso_w,coat_w):
    for opt in range(6):
        long=opt==2;opened=opt==4
        prof=[(max(z,.955) if not long else z-.05 if z<1.05 else z,w+(.027 if long or opened else .017),d+.021,y) for z,w,d,y in torso[:-1]]
        if long:prof[0]=(.83,.239,.179,0);prof[1]=(.94,.185,.127,0)
        if opt==3:prof=[(z,w*.95,d,y) for z,w,d,y in prof]
        if opt==5:prof=[(z,w+.012,d+.007,y) for z,w,d,y in prof]
        # No stacked coincident rings at the hem.
        prof=[row for i,row in enumerate(prof) if i==len(prof)-1 or row[0]<prof[i+1][0]-.001]
        weight=coat_w if long else torso_w
        bodice=rings(f'TOP_{opt}_bodice',prof,'top','CLOTHING',weight,n=40)
        if opened:
            # Open the front faces; the ivory undershirt sits behind the separated panels.
            # Filter front panel faces without changing the bound vertex indices.
            coords=[tuple(v.co) for v in bodice.data.vertices]
            faces=[tuple(f.vertices) for f in bodice.data.polygons if not (f.center.y<-.07 and abs(f.center.x)<.065)]
            replacement=mesh('TOP_4_open_panels',coords,faces,'top','CLOTHING',torso_w)
            bpy.data.objects.remove(bodice,do_unlink=True)
            inner=[(max(z,.961),w+.005,d+.004,y) for z,w,d,y in torso[:-1]]
            inner=[row for i,row in enumerate(inner) if i==len(inner)-1 or row[0]<inner[i+1][0]-.001]
            rings('TOP_4_underlayer',inner,'lining','CLOTHING',torso_w,n=32)
        # Rolled bound hem and shaped neck edging, darkened in the chosen cloth palette.
        z,w,d,y=prof[0]
        rings(f'TOP_{opt}_hem',[(z,w+.001,d+.002,y),(z+.018,w+.001,d+.002,y)],'top_shadow','CLOTHING',weight,n=40)
        if opt in [0,3]:
            rings(f'TOP_{opt}_neckline',[(1.435,.096,.074,0),(1.45,.089,.068,0)],'top_shadow','CLOTHING','chest',32)
        for s,side in [(1,'L'),(-1,'R')]:
            if long:
                sleeve=[(s*(sh-.06),0,1.404),(s*(sh-.018),0,1.389),(s*(sh+.018),0,1.342),(s*(sh+.03),0,1.26),(s*(sh+.055),0,1.15),(s*(sh+.067),-.006,1.07),(s*(sh+.085),-.015,.95)]
                radii=[.018,.066,.079,.071,.06,.058,.044]
            else:
                end=1.185 if opt in [1,4,5] else 1.245
                sleeve=[(s*(sh-.06),0,1.404),(s*(sh-.018),0,1.389),(s*(sh+.017),0,1.35),(s*(sh+.033),0,1.29),(s*(sh+.048),0,end)]
                radii=[.014,.060,.080,.078,.071]
            if opt!=3:
                tube(f'TOP_{opt}_sleeve_{side}',sleeve,radii,'top','CLOTHING',bind_limb('upper_arm_'+side,'forearm_'+side,None,1.15),20)
                x,y,z=sleeve[-1];r=radii[-1]+.002
                tube(f'TOP_{opt}_cuff_{side}',[(x,y,z+.015),(x,y,z-.006)],[r,r],'top_shadow','CLOTHING',bind_limb('upper_arm_'+side,'forearm_'+side,None,1.15),20)
            if opt in [1,2,4,5]:
                length=.10 if opt==5 else .075
                mesh(f'TOP_{opt}_collar_{side}',[(s*.052,-.073,1.45),(s*.105,-.088,1.417),(s*.073,-.157,1.40-length),(s*.013,-.14,1.384)],[(0,1,2,3)],'top_light','CLOTHING','chest')
        if opt in [1,5]:
            tube(f'TOP_{opt}_placket',[(0,-.117,1.02),(0,-.116,1.10),(0,-.147,1.23),(0,-.157,1.34)],.0045,'top_shadow','CLOTHING',torso_w,8)
            for z,y in [(1.06,-.124),(1.15,-.134),(1.25,-.154),(1.34,-.158)]:
                ellipsoid(f'TOP_{opt}_button_{z}',(0,y,z),(.0055,.004,.0055),'button','CLOTHING','chest' if z>1.23 else 'spine',10,6)
        if opt in [1,4,5]:
            for s in ([1,-1] if opt==4 else [1]):
                cx=s*.105;yy=-.151
                mesh(f'TOP_{opt}_pocket_{s}',[(cx-.033,yy,1.317),(cx+.033,yy,1.317),(cx+.031,yy,1.232),(cx,yy-.006,1.219),(cx-.032,yy,1.232)],[(0,1,2,3,4)],'top_shadow','CLOTHING','chest')
                tube(f'TOP_{opt}_pocket_seam_{s}',[(cx-.032,yy-.003,1.305),(cx+.032,yy-.003,1.305)],.002,'top_light','CLOTHING','chest',6)
        if opt in [2,4]:
            for s in [-1,1]:
                tube(f'TOP_{opt}_trim_{s}',[(s*.02,-.132,1.4),(s*.067,-.157,1.24),(s*.065,-.121,1.04),(s*.071,-.178,.85) if long else (s*.074,-.138,.98)],.006,'top_shadow','CLOTHING',weight,8)
