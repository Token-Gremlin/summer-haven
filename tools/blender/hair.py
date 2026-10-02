"""Eight fitted hair silhouettes. Broad sculpted locks, fine ridges, shared head rig.
Loaded into the character author's namespace so materials and weights stay compatible.
"""
def hair_lock(name, points, widths, depths, mat='hair', bone='head'):
    # Lens cross sections read as illustrated ribbons, with volume in profile.
    # Interpolate the sculpted guide, so four control points never become hard spikes.
    guides=[Vector(p) for p in points]; smooth=[]; ws=[]; ds=[]
    for i in range(len(guides)-1):
        p0=guides[max(0,i-1)];p1=guides[i];p2=guides[i+1];p3=guides[min(len(guides)-1,i+2)]
        for k in range(4):
            t=k/4
            smooth.append(tuple(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)))
            ws.append(widths[i]*(1-t)+widths[i+1]*t);ds.append(depths[i]*(1-t)+depths[i+1]*t)
    points=smooth+[points[-1]];widths=ws+[widths[-1]];depths=ds+[depths[-1]]
    vs=[]; fs=[]; sides=8
    for i,p in enumerate(points):
        tangent=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
        across=tangent.cross(Vector((0,-1,0))).normalized()
        if across.length<.1:across=Vector((1,0,0))
        normal=across.cross(tangent).normalized()
        for j in range(sides):
            a=j*2*pi/sides
            vs.append(tuple(Vector(p)+across*cos(a)*widths[i]+normal*sin(a)*depths[i]))
    for i in range(len(points)-1):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
    fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+j for j in range(sides))])
    return mesh(name,vs,fs,mat,'HAIR',bone)

def build_hair():
    for opt in range(8):
        short=opt in [1,4,5,6,7];vs=[];fs=[];N=40;R=12
        for i in range(R+1):
            t=i/R
            for j in range(N):
                a=j*2*pi/N;front=(cos(a)+1)/2
                end=1.71*front+(1-front)*(1.60 if short else 1.51 if opt==0 else 1.57 if opt==2 else 1.48)
                theta=t*(1.47 if front>.6 else 1.85)
                z=1.672+cos(theta)*(.167 if short else .175)
                if t>.65:z=z*(1-(t-.65)/.35)+end*(t-.65)/.35
                r=sin(theta);w=.158+(0 if short else .017*t)
                vs.append((sin(a)*w*r,.012-cos(a)*.147*r,z))
        for i in range(R):
            for j in range(N):
                a=i*N+j;b=i*N+(j+1)%N;fs.append((a,b,b+N,a+N))
        # Continuous fitted crowns keep the side silhouette connected, with no gaps
        # between parallel sculpted locks. The part and quiff have different sweeps.
        if opt in [4,7]:
            shaped=[]
            for x,y,z in vs:
                crown=max(0,min(1,(z-1.705)/.134))
                if opt==4:
                    lift=.044*math.exp(-((x+.045)**2/.018+(y+.01)**2/.035))*crown
                    shaped.append((x-.018*crown,y,z+lift))
                else:
                    lift=.066*math.exp(-((y+.055)**2/.020))*crown
                    shaped.append((x+.014*crown,y-.024*crown,z+lift))
            vs=shaped
        mesh(f'HAIR_{opt}_cap',vs,fs,'hair','HAIR','head')
        if opt<4:
            for j in range(7):
                x=-.124+j*.041;end=1.687+.027*cos(j*.82)
                hair_lock(f'HAIR_{opt}_fringe_{j}',[(x*.3,-.038,1.82),(x*.7,-.11,1.782),(x,-.15,end+.03),(x+.014,-.147,end)], [.025,.029,.020,.0008],[.009,.012,.007,.0005])
            if opt in [0,3]:
                for s,side in [(1,'L'),(-1,'R')]:
                    for j in range(5):
                        end=1.48+j*.005 if opt==0 else 1.28+j*.025
                        hair_lock(f'HAIR_{opt}_lock_{side}{j}',[(s*.13,.00+j*.026,1.74),(s*.173,.012+j*.029,1.60),(s*(.155+.016*sin(j)),.015+j*.032,end+.07),(s*.14,.04+j*.031,end)], [.029,.033,.025,.001],[.012,.016,.012,.001],bone='hair_'+side)
            if opt==2:
                hair_lock('HAIR_2_tail',[(0,.13,1.73),(0,.245,1.65),(.033,.247,1.47),(.013,.21,1.28)],[.038,.061,.048,.001],[.024,.043,.027,.001],bone='hair_L')
                ellipsoid('HAIR_2_tie',(0,.163,1.715),(.046,.032,.032),'bag','HAIR','head')
        elif opt==4:
            # Subtle off-centre parting over the continuous swept crown.
            hair_lock('HAIR_4_parting',[(.045,.028,1.872),(.063,-.045,1.84),(.071,-.11,1.767)],[.001,.002,.0002],[.0005,.0008,.0001],'hair_light')
        elif opt==5:
            # Undercut: close temples below a visibly longer, broken crown.
            for j in range(9):
                x=-.113+(j%5)*.054;y=-.085+(j//5)*.083
                hair_lock(f'HAIR_5_texture_{j}',[(x*.78,y+.055,1.799),(x,y,1.862),(x*.84,y-.04,1.805),(x*.8+.019,y-.054,1.754)], [.023,.037,.027,.001],[.009,.020,.012,.001])
        elif opt==6:
            # Curly crop: clustered rounded curls rather than a repeated straight fringe.
            for j in range(24):
                a=j*2.39996;rad=.133*math.sqrt((j+.5)/24);x=sin(a)*rad;y=cos(a)*rad
                z=1.79+.065*(1-rad/.15)
                ellipsoid(f'HAIR_6_curl_{j}',(x,y-.012,z),(.035,.033,.036),'hair','HAIR','head',12,8)
                if j%3==0:
                    hair_lock(f'HAIR_6_glint_{j}',[(x-.021,y-.025,z+.007),(x-.01,y-.029,z+.023),(x+.014,y-.025,z+.025)], [.002,.003,.0003],[.001,.001,.0001],'hair_light')
        else:
            # A front lift flowing back over one continuous surface.
            hair_lock('HAIR_7_sweep_line',[(-.053,.04,1.87),(-.045,-.045,1.889),(-.057,-.12,1.792)],[.001,.002,.0002],[.0005,.0008,.0001],'hair_light')
        if short:
            for s,side in [(1,'L'),(-1,'R')]:
                hair_lock(f'HAIR_{opt}_temple_{side}',[(s*.145,-.003,1.742),(s*.151,-.024,1.661),(s*.139,-.032,1.60)], [.020,.014,.002],[.012,.010,.001])
        # Fine curved sheen on the crown, in the same palette with a subtle value shift.
        if opt!=6:
            for j in range(4):
                x=-.08+j*.049
                hair_lock(f'HAIR_{opt}_sheen_{j}',[(x*.32,.022,1.839),(x*.65,-.049,1.823),(x,-.106,1.783)], [.001,.0028,.0002],[.001,.001,.0001],'hair_light')
