"""Deterministic mesh authoring helpers. No Blender operators or primitive meshes."""
import math
from mathutils import Vector

def catmull(a, b, c, d, t):
    return (b*2+(c-a)*t+(a*2-b*5+c*4-d)*t*t+(-a+b*3-c*3+d)*t*t*t)*.5

class Surface:
    def __init__(self):
        self.vertices=[]; self.faces=[]; self.weights=[]
    def vertex(self, p, weights):
        self.vertices.append(tuple(p)); self.weights.append(dict(weights)); return len(self.vertices)-1
    def face(self, *indices): self.faces.append(indices)

def blend_weights(a,b,t):
    out={}
    for key, value in a.items(): out[key]=out.get(key,0)+value*(1-t)
    for key, value in b.items(): out[key]=out.get(key,0)+value*t
    return {k:v for k,v in out.items() if v>.00001}

def tube(surface, sections, steps=4, sides=14, dorsal=0):
    """Spline loft: each section is (centre, radius_width, radius_depth, weights).
    Uses a transported local frame. End caps are deliberately small authored sections.
    """
    pts=[Vector(s[0]) for s in sections]
    radii=[Vector((s[1],s[2],0)) for s in sections]
    samples=[]
    for i in range(len(pts)-1):
        for j in range(steps):
            t=j/steps
            inds=[max(0,i-1),i,i+1,min(len(pts)-1,i+2)]
            p=catmull(*(pts[k] for k in inds),t)
            r=catmull(*(radii[k] for k in inds),t)
            samples.append((p,r,blend_weights(sections[i][3],sections[i+1][3],t)))
    samples.append((pts[-1],radii[-1],sections[-1][3]))
    rings=[];previous_tangent=None;previous_side=None
    for i,(p,r,w) in enumerate(samples):
        tangent=samples[min(i+1,len(samples)-1)][0]-samples[max(i-1,0)][0]
        tangent.normalize()
        # Parallel transport avoids a 180-degree frame flip through vertical elbows/hocks.
        if previous_side is None:
            sideways=tangent.cross(Vector((0,0,1)))
            if sideways.length<.05:sideways=Vector((1,0,0))
        else:sideways=previous_tangent.rotation_difference(tangent)@previous_side
        sideways.normalize(); up=sideways.cross(tangent).normalized()
        previous_tangent=tangent.copy();previous_side=sideways.copy()
        ring=[]
        for j in range(sides):
            a=j*math.tau/sides
            # Very shallow keel on upper surface retains intentional organic planes.
            y=math.sin(a)*(1+dorsal*max(0,math.sin(a))**6)
            ring.append(surface.vertex(p+sideways*(math.cos(a)*max(.001,r.x))+up*(y*max(.001,r.y)),w))
        rings.append(ring)
    for a,b in zip(rings,rings[1:]):
        for j in range(sides):surface.face(a[j],b[j],b[(j+1)%sides],a[(j+1)%sides])
    surface.face(*reversed(rings[0]));surface.face(*rings[-1])

def lens(surface, centre, tangent_u, tangent_v, width, length, height, weights, sides=10):
    """A low relief pointed leaf/scute, not an ellipsoid. Root and tip have asymmetry."""
    p=Vector(centre);u=Vector(tangent_u).normalized();v=Vector(tangent_v).normalized();n=u.cross(v).normalized()
    outline=[(0,-.90),(.65,-.67),(1,-.12),(.74,.57),(0,1.18),(-.74,.57),(-1,-.12),(-.65,-.67)]
    rim=[surface.vertex(p+u*(a*width)+v*(b*length),weights) for a,b in outline]
    inset=[surface.vertex(p+u*(a*width*.58)+v*(b*length*.60)+n*height*.75,weights) for a,b in outline]
    peak=surface.vertex(p+v*(length*.19)+n*height,weights)
    for j in range(len(rim)):
        k=(j+1)%len(rim);surface.face(rim[j],rim[k],inset[k],inset[j]);surface.face(inset[j],inset[k],peak)
    # Embedded relief is open-backed: no coplanar underside or inverted rim normals.

def ellipsoid(surface, centre, scale, weights, sides=16, rings=10):
    p=Vector(centre); sx,sy,sz=scale
    loop=[]
    for i in range(rings+1):
        a=-math.pi/2+math.pi*i/rings
        loop.append([surface.vertex(p+Vector((sx*math.cos(a)*math.cos(j*math.tau/sides),sy*math.cos(a)*math.sin(j*math.tau/sides),sz*math.sin(a))),weights) for j in range(sides)])
    for a,b in zip(loop,loop[1:]):
        for j in range(sides):surface.face(a[j],a[(j+1)%sides],b[(j+1)%sides],b[j])
