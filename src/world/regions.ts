import * as T from 'three';
import { REGION_ROUTE, REGION_BRIDGES, regionBridgeAt, REGIONS, WORLD_BOUNDS, LEGACY_BOUNDS, regionRouteSample, regionRiverSample, regionSurfaceWater, regionAt, inBounds } from '../data/regions';
import { CITY_PATHS, CITY_DISTRICTS, cityOccupied } from '../data/city';
import { terrainHeight } from '../data/world';
import { Assets } from '../game/assets';
import { type Settings } from '../core/save';
import { Village, type Interaction } from './village';
import { box, beam, merge, prep, xf, M, ID } from './geo';
import { Woodland } from './woodland';
import { woodlandTemplate, type WoodlandKind, type TreeTemplate } from './woodland-catalog';
import { boulder, grassClump, flower, woodlandFloor } from './vegetation';
import { paintedSign } from './signage';
import { uber, surfaceBits, specializeUber, terrainMaterial } from '../render/materials';
import { sceneryRanges } from '../render/visibility';
import { mulberry32 } from '../core/rng';
import { riverReach, waterfallPool } from './region-water';
import { prepareWaterSurface, subdivideWater, waterFootprint } from './water-surface';
import { WaterSpray } from './water-spray';
import { PathSurfaces } from './path-surface';
import { trailJunctionGeometry } from './trail-junction';
import { City } from './city';
import { ferryLandingAt, FERRY_LANDINGS } from '../data/ferry';
import { HabitatScenery, mosswoodGlade } from './habitat-scenery';
import { bankTrailDistance, BANK_TRAIL_WIDTH } from '../data/bank-trail';
import { bankTrailGeometry } from './bank-trail';
import { canopyHullObstacle } from './tree-canopy';
import { colorShore } from './shore-color';

export const REGION_PLACES = [
  { id:'lantern-road',name:'Lantern Road',x:8,z:-175,r:32,subtitle:'The road beyond home.' },
  { id:'aldermere',name:'Aldermere',x:20,z:-300,r:125,subtitle:'Where the valley roads meet.' },
  { id:'mosswood',name:'Mosswood',x:208,z:-500,r:90,subtitle:'Follow the river beneath the leaves.' },
  { id:'silverveil',name:'Silverveil Falls',x:348,z:-688,r:85,subtitle:'The mountain remembers every rain.' },
  { id:'starroot',name:'Starroot Sanctuary',x:340,z:-846,r:65,subtitle:'Old roots, older stories.' },
  { id:'crownreach',name:'Crownreach',x:500,z:-960,r:90,subtitle:'Leave room in the sky for wonder.' },
  ...CITY_DISTRICTS,
  ...FERRY_LANDINGS.map(d=>({id:`landing-${d.id}`,name:d.name,x:d.x,z:d.deckZ,r:23,subtitle:'Maren keeps the river road open.'})),
];
type Cell = { group:T.Group; x:number; z:number; terrain:T.Mesh; high:T.BufferGeometry; foliage:T.InstancedMesh[] };

/** Region geometry owns a finite northern extension. Logical collision remains resident when detail is culled. */
export class Regions {
  readonly group = new T.Group();
  readonly water = new T.Group();
  readonly cells: Cell[] = [];
  readonly interactions: Interaction[] = [];
  readonly bridges = REGION_BRIDGES;
  readonly city: City;
  readonly swimmerWake = {body:{value:new T.Vector4()},height:{value:0}};
  readonly spray = new WaterSpray();
  private gorge:T.Group|null=null;
  private glade:HabitatScenery|null=null;
  treeCount = 0;
  readonly woodland = new Woodland('Valley botanical forests');
  private tick = 0;
  private signature = '';
  private readonly treeTemplates = new Map<number,TreeTemplate>();
  private readonly grass = grassClump(9383);
  private readonly flowers = flower();
  private readonly understory = woodlandFloor(615);
  private readonly groundcoverRadii = new Map<T.BufferGeometry,number>();
  private readonly paths = new PathSurfaces();
  private readonly waterBounds:{mesh:T.Mesh;center:T.Vector3;radius:number}[]=[];
  constructor(readonly assets:Assets, readonly village:Village) { this.group.name='The northern valleys';this.city=new City(assets,village); }

  async build(progress:(s:string,n:number)=>void) {
    progress('Following the river into the hills…',.72);
    // Preserve the old navigation grid: activate this only after legacy villagers are constructed.
    const legacyWater = this.village.collision.water;
    this.village.collision.bounds = {...WORLD_BOUNDS};
    this.village.collision.water = (x,z) => {
      if(z >= -132) return !inBounds(x,z,LEGACY_BOUNDS) || legacyWater(x,z);
      if(ferryLandingAt(x,z))return false;
      const route=regionRouteSample(x,z);
      if(!regionAt(x,z) && route.distance>23) return true;
      const r=regionRiverSample(z);
      const onBridge=regionBridgeAt(x,z)!==null;
      if(z>=-910 && Math.abs(x-r.x)<r.halfWidth+.32 && !onBridge) return true;
      if(regionSurfaceWater(x,z)!==null && !onBridge) return true;
      // Heightfield cliffs are not traversable merely because the player follows the sampled surface.
      if(route.distance>route.width/2+.7) {
        const dx=terrainHeight(x+.4,z)-terrainHeight(x-.4,z);
        const dz=terrainHeight(x,z+.4)-terrainHeight(x,z-.4);
        if(Math.hypot(dx,dz)>.66) return true;
      }
      return false;
    };
    this.village.path(REGION_ROUTE.slice(0,2).map(p=>[p.x,p.z]),REGION_ROUTE[0].width,'dirt');
    this.makeRoute();
    this.makeBridges();
    this.city.build();
    this.group.add(this.city.group);
    this.makeRiver();
    this.gorge=this.assets.gorge.clone(true);
    this.gorge.position.set(366,0,-713);
    this.group.add(this.gorge);
    for(const p of this.assets.gorgeData.collision_proxies){
      const {min:a,max:b}=p.bounds_world;
      this.village.collision.add({x:(a[0]+b[0])/2,z:(a[2]+b[2])/2,w:b[0]-a[0],d:b[2]-a[2],bottom:a[1],height:b[1]-a[1],tag:`gorge-${p.name}`});
    }
    this.water.updateMatrixWorld(true);
    this.water.traverse(o=>{if(o instanceof T.Mesh&&!(o instanceof T.InstancedMesh)){o.geometry.computeBoundingSphere();const b=o.geometry.boundingSphere!;if(o.geometry.hasAttribute('aWater'))b.radius+=.8;this.waterBounds.push({mesh:o,center:b.center.clone(),radius:b.radius});}});
    for(let z=-132;z>-1160;z-=32) {
      for(let x=-160;x<720;x+=32) {
        const route=regionRouteSample(x+16,z-16);
        const region=regionAt(x+16,z-16);
        const touchesRegion=REGIONS.some(r=>x<r.bounds.x1&&x+32>r.bounds.x0&&z>r.bounds.z0&&z-32<r.bounds.z1);
        if(!touchesRegion && route.distance>65) continue;
        this.makeCell(x,z,region?.id ?? 'north-road');
      }
      if(Math.round((-132-z)/32)%4===0) await new Promise(r=>setTimeout(r,0));
    }
    this.woodland.build();this.group.add(this.woodland.group);
    this.makePlaces();
    this.glade=new HabitatScenery();this.group.add(this.glade.group);
    specializeUber(this.group);
    this.group.add(this.water);
    this.village.interactions.push(...this.interactions);
  }

  private mesh(g:T.BufferGeometry,id:number=ID.ground,outline=.25) {
    const m=new T.Mesh(g,uber(id,outline,T.DoubleSide,surfaceBits(g)));m.layers.enable(1);m.layers.enable(2);return m;
  }
  private terrain(x:number,z:number,segments:number,color:string) {
    const g=new T.PlaneGeometry(32,32,segments,segments).rotateX(-Math.PI/2);
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++){const xx=p.getX(i)+x+16,zz=p.getZ(i)+z-16;p.setXYZ(i,xx,terrainHeight(xx,zz,false)-.045,zz);}
    g.computeVertexNormals();prep(g,color,M.ground);
    const colors=g.attributes.color,materials=g.attributes.aMat,normals=g.attributes.normal;
    const stone=new T.Color('#7c877c'),earth=new T.Color(color),c=new T.Color();
    for(let i=0;i<p.count;i++) {
      const slope=1-Math.abs(normals.getY(i)),xx=p.getX(i),zz=p.getZ(i);
      const rock=slope>.2&&zz<-645?Math.min(1,slope*2.2):0;
      c.copy(earth).lerp(stone,rock);
      const glade=mosswoodGlade(xx,zz);
      if(glade>0)c.lerp(new T.Color('#829457'),glade*.52);
      c.multiplyScalar(.92+Math.sin(xx*.052+zz*.018)*.08);
      colorShore(c,xx,p.getY(i),zz);
      colors.setXYZ(i,c.r,c.g,c.b);materials.setX(i,rock>.35?M.stone:M.ground);
    }
    return g;
  }
  private makeCell(x:number,z:number,region:string) {
    const forest=region==='mosswood',rocky=['silverveil','starroot','crownreach'].includes(region);
    const color=forest?'#4e7057':rocky?'#738575':'#72934f';
    const high=this.terrain(x,z,16,color);
    const ground=this.mesh(high,ID.ground,0);ground.layers.disable(1);
    ground.material=terrainMaterial(surfaceBits(high));
    const group=new T.Group();group.name=`Valley cell ${x},${z}`;group.add(ground);this.group.add(group);
    const cell:Cell={group,x:x+16,z:z-16,terrain:ground,high,foliage:[]};this.cells.push(cell);
    const rng=mulberry32((x*737+z*193+49029)>>>0);
    const trees=new Map<number,T.Matrix4[]>(),grass:T.Matrix4[]=[],flowers:T.Matrix4[]=[];
    const dummy=new T.Object3D();
    const city=region==='aldermere';
    for(let i=0;i<(forest?20:rocky?8:city?3:10);i++) {
      const xx=x+rng()*32,zz=z-rng()*32,route=regionRouteSample(xx,zz),river=regionRiverSample(zz);
      if(route.distance<route.width/2+4.8 || Math.abs(xx-river.x)<river.halfWidth+2 || !regionAt(xx,zz)) continue;
      if(regionSurfaceWater(xx,zz)!==null)continue;
      if(forest&&mosswoodGlade(xx,zz)>.02)continue;
      if(cityOccupied(xx,zz,3.5))continue;
      if(Math.hypot(terrainHeight(xx+.5,zz)-terrainHeight(xx-.5,zz),terrainHeight(xx,zz+.5)-terrainHeight(xx,zz-.5))>.5)continue;
      if(region==='crownreach' && Math.hypot(xx-542,zz+978)<32) continue;
      if(region==='silverveil' && Math.hypot((xx-360)*.8,zz+707)<48) continue;
      const kind=forest?(rng()>.6?2:1):rocky?(rng()>.55?2:1):0,variant=kind*2+Math.floor(rng()*2);
      dummy.position.set(xx,terrainHeight(xx,zz),zz);dummy.rotation.set(0,rng()*Math.PI*2,0);
      const scale=forest?1.2+rng()*.9:.8+rng()*.8;dummy.scale.set(scale*(.85+rng()*.3),scale,scale);dummy.updateMatrix();
      if(!this.treeTemplates.has(variant)) {
        this.treeTemplates.set(variant,woodlandTemplate((['round','tall','cedar'] as WoodlandKind[])[Math.floor(variant/2)],184+variant));
      }
      const canopy=canopyHullObstacle(this.treeTemplates.get(variant)!.canopy,dummy.matrix);
      // Preserve the generated grove around a deliberately open walking/camera corridor.
      // This decision follows all random draws, so retained trees keep their previous placement.
      if(bankTrailDistance(canopy.x,canopy.z)<Math.hypot(canopy.w!,canopy.d!)/2+BANK_TRAIL_WIDTH/2+1.3)continue;
      if(!trees.has(variant))trees.set(variant,[]);trees.get(variant)!.push(dummy.matrix.clone());this.treeCount++;
      this.village.collision.add({x:xx,z:zz,r:.29*scale,height:8*scale,bottom:dummy.position.y,tag:'region-tree'});
      canopy.tag='region-tree-canopy';this.village.collision.add(canopy);
    }
    for(const [variant,matrices] of trees) {
      for(const matrix of matrices)this.woodland.add((['round','tall','cedar'] as WoodlandKind[])[Math.floor(variant/2)],184+variant,matrix);
    }
    for(let i=0;i<(forest?110:city?45:95);i++) {
      const xx=x+rng()*32,zz=z-rng()*32,route=regionRouteSample(xx,zz),r=regionRiverSample(zz);
      if(route.distance<route.width/2+.4||Math.abs(xx-r.x)<r.halfWidth+.5)continue;
      if(regionSurfaceWater(xx,zz)!==null)continue;
      if(bankTrailDistance(xx,zz)<BANK_TRAIL_WIDTH/2+.3)continue;
      if(cityOccupied(xx,zz,.7))continue;
      if(rocky&&Math.hypot(terrainHeight(xx+.5,zz)-terrainHeight(xx-.5,zz),terrainHeight(xx,zz+.5)-terrainHeight(xx,zz-.5))>.8)continue;
      dummy.position.set(xx,terrainHeight(xx,zz),zz);dummy.rotation.set(0,rng()*6.28,0);dummy.scale.setScalar(.6+rng()*.75);dummy.updateMatrix();
      // Make coherent patches from existing candidates, after all legacy random draws.
      // Broad dry leaves belong beneath crowns and beside banks; the feeding glade stays low/open.
      const patch=.5+Math.sin(xx*.17+Math.sin(zz*.071)*1.8)*.27+Math.sin(zz*.21+xx*.047)*.20;
      const glade=forest?mosswoodGlade(xx,zz):0;
      if(patch<(forest?.20:.12)&&glade<.35)continue;
      let rootDistance=Infinity;
      if(forest||rocky)for(const grove of trees.values())for(const tree of grove) {
        const e=tree.elements;rootDistance=Math.min(rootDistance,Math.hypot(xx-e[12],zz-e[14]));
      }
      const rootPocket=rootDistance>1.1&&rootDistance<5.2&&patch>.28;
      const bankPocket=Math.abs(xx-r.x)-r.halfWidth<4.5&&patch>.33;
      const secondary=(forest||rocky)?glade<.35&&i%5!==0&&(rootPocket||bankPocket||patch>.60):i%8===0;
      const geometry=secondary?(forest||rocky?this.understory:this.flowers):this.grass;
      dummy.scale.multiplyScalar(glade>.35?.50:.68+patch*.32);
      if(!this.groundcoverRadii.has(geometry)) {
        const p=geometry.attributes.position,w=geometry.attributes.aWind;let radius=0;
        for(let j=0;j<p.count;j++)radius=Math.max(radius,Math.hypot(p.getX(j),p.getZ(j)));
        let wind=0;for(let j=0;j<w.count;j++)wind=Math.max(wind,w.getX(j));
        this.groundcoverRadii.set(geometry,radius+.04);geometry.userData.natureWindMargin=.422*wind;
      }
      const radius=this.groundcoverRadii.get(geometry)!*dummy.scale.x+geometry.userData.natureWindMargin;
      // The whole footprint, including wind, clears routes/water rather than only its root point.
      if(route.distance<route.width/2+radius+.15||bankTrailDistance(xx,zz)<BANK_TRAIL_WIDTH/2+radius+.15)continue;
      if(cityOccupied(xx,zz,radius+.15))continue;
      let dry=true;
      for(let edge=0;edge<8;edge++) {
        const angle=edge*Math.PI/4,px=xx+Math.cos(angle)*radius,pz=zz+Math.sin(angle)*radius,river=regionRiverSample(pz);
        if(Math.abs(px-river.x)<river.halfWidth+.15||regionSurfaceWater(px,pz)!==null){dry=false;break;}
      }
      if(!dry)continue;
      // flower() has its origin at the bloom; lift it so its roots meet the terrain.
      if(geometry===this.flowers)dummy.position.y+=.64*dummy.scale.y;
      dummy.updateMatrix();(secondary?flowers:grass).push(dummy.matrix.clone());
    }
    for(const [g,matrices] of [[this.grass,grass],[forest||rocky?this.understory:this.flowers,flowers]] as const) {
      if(!matrices.length)continue;
      const m=new T.InstancedMesh(g,uber(ID.grass,0,T.DoubleSide,surfaceBits(g)),matrices.length);
      matrices.forEach((a,i)=>m.setMatrixAt(i,a));m.userData.total=matrices.length;m.computeBoundingSphere();
      m.boundingSphere!.radius+=(g.userData.natureWindMargin??0)*1.05;
      group.add(m);cell.foliage.push(m);
    }
  }
  private makeRoute() {
    for(let i=2;i<REGION_ROUTE.length;i++) {
      const a=REGION_ROUTE[i-1],b=REGION_ROUTE[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),n=Math.ceil(len/.8);
      const p:number[]=[],uv:number[]=[],idx:number[]=[];
      for(let j=0;j<=n;j++) {
        const t=j/n,x=a.x+dx*t,z=a.z+dz*t,w=T.MathUtils.lerp(a.width,b.width,t)/2;
        for(const side of [-1,1]) {const xx=x-dz/len*w*side,zz=z+dx/len*w*side;p.push(xx,terrainHeight(xx,zz)+.035,zz);uv.push(side*w,len*t);}
        if(j<n&&!regionBridgeAt(x+dx/n*.5,z+dz/n*.5)){const k=j*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
      const m=this.mesh(prep(this.paths.add(g),i<7?'#b7aa82':'#999b80',i<7?M.ground:M.stone),ID.ground,0);m.name=`Trail ${b.id}`;m.layers.disable(1);this.group.add(m);
    }
    for(let i=2;i<REGION_ROUTE.length-1;i++) {
      const g=trailJunctionGeometry(REGION_ROUTE[i-1],REGION_ROUTE[i],REGION_ROUTE[i+1]);
      if(!g)continue;
      const m=this.mesh(prep(this.paths.add(g),i<7?'#b7aa82':'#999b80',i<7?M.ground:M.stone),ID.ground,0);m.name=`Trail join ${REGION_ROUTE[i].id}`;m.layers.disable(1);this.group.add(m);
    }
    for(const path of CITY_PATHS)for(let k=1;k<path.points.length;k++) {
      const [ax,az]=path.points[k-1],[bx,bz]=path.points[k],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz),n=Math.ceil(len/.65);
      const p:number[]=[],uv:number[]=[],idx:number[]=[];
      for(let i=0;i<=n;i++)for(const side of [-1,1]) {
        const x=ax+dx*i/n-dz/len*path.width/2*side,z=az+dz*i/n+dx/len*path.width/2*side;
        p.push(x,terrainHeight(x,z)+.035,z);uv.push(side*path.width/2,len*i/n);
        if(side===1&&i<n){const j=i*2;idx.push(j,j+2,j+1,j+1,j+2,j+3);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
      const m=this.mesh(prep(this.paths.add(g),'#b3b199',M.stone),ID.ground,0);m.layers.disable(1);m.name=path.id;this.group.add(m);
    }
    const bank=this.mesh(prep(this.paths.add(bankTrailGeometry()),'#b8af8b',M.ground),ID.ground,0);
    bank.name='Quietwater bank trail';bank.layers.disable(1);this.group.add(bank);
  }
  private makeBridges() {
    for(const bridge of REGION_BRIDGES) {
      const {from:a,to:b,width}=bridge,dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz),parts:T.BufferGeometry[]=[];
      const n=Math.ceil(len/.42);
      for(let i=0;i<n;i++) {
        const t=(i+.5)/n,x=a.x+dx*t,z=a.z+dz*t;
        parts.push(xf(box(width,.17,len/n-.018,'#978866',M.planks),x,terrainHeight(x,z)-.07,z,0,yaw));
      }
      for(const side of [-1,1]) {
        const sx=dz/len*(width/2-.12)*side,sz=-dx/len*(width/2-.12)*side;
        const railStart=new T.Vector3(a.x+sx,terrainHeight(a.x,a.z)+1.08,a.z+sz),railEnd=new T.Vector3(b.x+sx,terrainHeight(b.x,b.z)+1.08,b.z+sz);
        parts.push(beam(railStart,railEnd,.085,'#675a47',M.planks,6));
        for(let i=0;i<=8;i++) {
          const x=a.x+dx*i/8+sx,z=a.z+dz*i/8+sz,y=terrainHeight(x,z);
          parts.push(xf(box(.14,1.18,.14,'#716449',M.planks),x,y+.53,z,0,yaw));
        }
        const center={x:(a.x+b.x)/2+sx,z:(a.z+b.z)/2+sz};
        this.village.collision.add({...center,w:.15,d:len,height:6,bottom:Math.min(a.y,b.y)-.2,yaw,tag:'ridge-bridge-rail'});
      }
      this.group.add(this.mesh(merge(parts),ID.house,.25));
    }
  }
  private makeRiver() {
    const poolSurfaces = new PathSurfaces();
    for(let z=-132;z>-910;z-=32) {
      const end=Math.max(z-32,-910);
      // Separate the 36m cascade from the quiet river surface at exact terrain stations.
      for(const [a,b] of [[z,Math.max(end,-708)],[Math.min(z,-708),Math.max(end,-730)],[Math.min(z,-730),end]]) {
        if(a>b&&a<=z&&b>=end) {
          const reach=riverReach(a,b,a<=-708&&b>=-730,this.swimmerWake);
          this.water.add(reach);
          // Fill around the current, never with a second coplanar water sheet.
          if(a>=-730&&b<=-676)poolSurfaces.add(waterFootprint(reach.geometry)).dispose();
        }
      }
    }
    // Small bank stones sit within the geological escarpment, not detached rock pillars.
    const rng=mulberry32(5039);
    for(let i=0;i<13;i++) {
      const x=344+rng()*51,z=-696+rng()*13,r=regionRiverSample(z);
      if(Math.abs(x-r.x)<r.halfWidth-1)continue;
      const g=boulder(720+i);g.scale(1.2+rng(),1.1+rng(),1.2+rng());g.translate(x,terrainHeight(x,z)-.3,z);
      this.water.add(this.mesh(g,ID.ground,.12));
    }
    const pool=waterfallPool();pool.geometry=prepareWaterSurface(subdivideWater(poolSurfaces.add(pool.geometry)));
    this.water.add(pool,this.spray.group);
  }
  private makePlaces() {
    const bankSign={x:342,z:-847.6},bankSignY=terrainHeight(bankSign.x,bankSign.z);
    this.group.add(this.mesh(xf(box(.12,1.65,.12,'#665340',M.planks),bankSign.x,bankSignY+.825,bankSign.z),ID.sign,.2));
    const bankLabel=paintedSign(['RIVER BANK →'],1.7,.42);bankLabel.position.set(bankSign.x,bankSignY+1.45,bankSign.z+.075);this.group.add(bankLabel);
    this.village.collision.add({...bankSign,r:.09,bottom:bankSignY,height:1.65,tag:'bank-trail-sign'});
    for(const [id,x,z,title,body] of [
      // East verge: the entire panel clears the widening road and a .45m bicycle.
      ['milepost',15,-180,'Read the valley milepost','Aldermere, along the lantern road. Mosswood, beyond the northern gate. Follow the current uphill to Silverveil.'],
      ['ranger-note',191,-494,'Read the ranger’s field notes','The reedwings follow the warm air rising from the falls. If one rests nearby, walk softly. A raised crown means it has noticed you.'],
      ['falls-story',345,-686,'Read the worn inscription','“What the mountain keeps, the river carries.” The old stone records the names of bridge keepers, worn smooth by many summers of mist.'],
      ['ridge-story',498,-957,'Read the skywatcher’s marker','People once crossed these ridges by following dragons home. Their resting shelves face the last warm light. Leave the path quiet for whoever arrives next.'],
    ] as const) {
      const y=terrainHeight(x,z),parts=[xf(box(.18,1.9,.18,'#665340',M.planks),x,y+.95,z),xf(box(1.65,.82,.16,'#655039',M.planks),x,y+1.65,z)];
      this.group.add(this.mesh(merge(parts),ID.sign,.3));const sign=paintedSign([id==='milepost'?'ALDERMERE ↑':id==='ranger-note'?'MOSSWOOD':id==='falls-story'?'SILVERVEIL':'CROWNREACH'],1.5,.65);sign.position.set(x,y+1.65,z+.085);this.group.add(sign);
      this.village.collision.add({x,z,r:.12,bottom:y,height:1.9,tag:`${id}-post`});
      this.village.collision.add({x,z,w:1.65,d:.18,bottom:y+1.24,height:.82,tag:`${id}-panel`});
      this.interactions.push({id:'region-'+id,x,z:z+1.2,radius:2,kind:'inspect',label:title,data:body});
    }
    for(const [x,z,yaw] of [[343,-687,-1.1],[489,-958,1.2],[188,-489,.9]]) {
      const b=this.assets.get('FURN_bench');b.position.set(x,terrainHeight(x,z),z);b.rotation.y=yaw;this.group.add(b);
      this.interactions.push({id:`valley-seat-${x}`,x,z,radius:1.8,kind:'sit',label:'Rest a while',seat:[x,z,yaw]});
    }
    // Safe elevated lookout, reached by the shared terrain path.
    const parts:T.BufferGeometry[]=[];
    for(let i=0;i<13;i++){const x=493+i*.55,z=-960;parts.push(xf(box(.52,.1,6,'#8e8065',M.planks),x,terrainHeight(x,z)+.05,z));}
    for(const z of [-962.8,-957.2])for(const x of [493,495,497,499]){
      const y=terrainHeight(x,z);parts.push(beam(new T.Vector3(x,y,z),new T.Vector3(x,y+1.05,z),.08,'#655742',M.planks,5));
    }
    this.group.add(this.mesh(merge(parts),ID.house,.2));
  }
  update(dt:number,position:T.Vector3,settings:Settings,camera?:T.Camera) {
    this.tick+=dt;const signature=`${settings.quality}/${settings.visibility}/${settings.distance}/${settings.vegetation}`;
    if(this.tick<.1&&this.signature===signature)return;this.tick=0;this.signature=signature;
    const range=sceneryRanges(settings);
    this.woodland.update(position,settings,camera);
    this.spray.update(position,settings,range.end);
    if(this.gorge)this.gorge.visible=Math.hypot(position.x-366,position.z+713)<range.end+100;
    this.city.update(position,range.end);
    this.glade?.update(position,range.foliage,settings.vegetation);
    for(const b of this.waterBounds)b.mesh.visible=b.center.distanceTo(position)-b.radius<range.end+5;
    for(const c of this.cells) {
      const d=Math.hypot(c.x-position.x,c.z-position.z);
      c.group.visible=d<range.end+45;
      // Shared full edge samples prevent cracks at neighboring terrain tile boundaries.
      c.terrain.geometry=c.high;
      for(const m of c.foliage){m.visible=d<range.foliage+24;m.count=Math.floor(m.userData.total*settings.vegetation);}
    }
  }
}
