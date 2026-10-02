"""Hand-detailed neighborhood gathering places, composed with world asset helpers."""
collection='PROPS'
root=empty('PROP_pergola')
for x in [-1.9,1.9]:
 for y in [-1.5,1.5]:
  box('stone_foot',(x,y,.15),(.38,.38,.3),'stone',.025)
  box('cedar_post',(x,y,1.45),(.16,.16,2.8),'wood',.025)
  tube('knee_brace',[(x,y,2.23),(x*.72,y,2.76)],.065,'wood_dark')
for y in [-1.5,1.5]:box('long_beam',(0,y,2.83),(4.5,.16,.23),'wood_dark',.025)
for i in range(13):box('roof_lath',(-2.12+i*.353,0,2.99),(.11,3.8,.13),'wood_light',.012)
for y in [-1.2,1.2]:
 box('bench_seat',(0,y,.5),(2.9,.48,.10),'wood_light',.03)
 for x in [-1.1,1.1]:box('bench_leg',(x,y,.25),(.12,.35,.48),'wood_dark',.02)
for i in range(8):
 x=-1.65+i*.47
 tube('vine',[(x,1.54,1.7),(x+.14,1.54,2.5),(x-.08,1.34,3.02),(x-.1,.3,3.08)],.018,'wood_dark')
 for j in range(5):
  ball('vine_leaf',(x+.12*sin(j*2),1.4-j*.3,3.09),(.19,.24,.09),'leaf')
consolidate(root)

root=empty('PROP_market_stall')
for x in [-1.2,1.2]:
 for y in [-.5,.5]:box('stall_post',(x,y,1.3),(.085,.085,2.6),'wood',.014)
box('counter',(0,0,.87),(2.6,1.25,.12),'wood_light',.02)
for x in [-.83,0,.83]:
 box('crate',(x,0,1.05),(.72,.87,.26),'wood',.02)
 for j in range(8):
  ball('fruit',(x+(j%3-1)*.19,-.29+(j//3)*.23,1.23),(.095,.095,.09),'red' if x<0 else 'leaf' if x==0 else 'ceramic')
for j in range(10):
 x=-1.4+j*.28
 mesh('striped_awning',[(x,-.83,2.33),(x+.28,-.83,2.33),(x+.28,0,2.69),(x,0,2.69),(x,.83,2.33),(x+.28,.83,2.33)],[(0,1,2,3),(3,2,5,4)],'cloth' if j%2 else 'cream')
 box('scalloped_valance',(x+.14,-.83,2.25),(.28,.035,.18),'cloth' if j%2 else 'cream',.022)
box('honesty_box',(1.03,-.35,1.08),(.22,.25,.26),'wood_dark',.025)
box('coin_slot',(1.03,-.35,1.216),(.13,.025,.012),'ink')
consolidate(root)

root=empty('PROP_garden_pump')
box('pump_base',(0,0,.12),(.8,.8,.24),'stone',.045)
tube('pump_body',[(0,0,.2),(0,0,1.12)],.09,'frame',sides=12)
tube('spout',[(0,0,.79),(0,-.26,.81),(0,-.30,.70)],.035,'frame',sides=12)
tube('lever',[(0,0,1.08),(0,.23,1.23),(0,.52,1.07)],.028,'metal')
tube('lever_grip',[(0,.43,1.13),(0,.59,1.01)],.038,'wood')
box('basin',(0,-.31,.21),(.68,.7,.23),'stone',.045)
box('basin_water',(0,-.31,.332),(.54,.56,.01),'glass')
consolidate(root)
