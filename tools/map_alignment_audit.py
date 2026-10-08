#!/usr/bin/env python3
"""Reproducible GSHHG-versus-hex area audit (review only; never edits gameplay).
Requires: pip install shapely; Node.js. Run: python tools/map_alignment_audit.py
"""
import json
import subprocess
import sys
from collections import Counter, deque
from pathlib import Path
from shapely.geometry import Polygon, Point
from shapely.strtree import STRtree
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import build_map as bm

node_script = """const E=require('./dist/engine.js'),g=E.createGame('britannia');
process.stdout.write(JSON.stringify({tiles:g.tiles, stations:g.stations.map(s=>({name:s.name,c:s.c,r:s.r,portAt:s.portAt||null})),
units:g.units.map(u=>({c:u.c,r:u.r}))}));"""
state = json.loads(subprocess.check_output(['node','-e',node_script], cwd=ROOT))
text = (ROOT/'dist/ui/geography-data.js').read_text()
geo = json.loads(text.split('const GEOGRAPHY_SHAPES = ',1)[1].rsplit(';',1)[0])
def rings(label):
    polygons=[]
    for ring in geo[label]:
        p=Polygon(ring)
        if not p.is_valid:p=make_valid(p)
        if not p.is_empty and p.area > 0.00000001:polygons.append(p)
    return polygons
land,water=rings('land'),rings('water')
land_tree, water_tree = STRtree(land), STRtree(water)

def neighbours(c,r):
    for cc in ((c-1)%180,(c+1)%180):yield cc,r
    for rr in (r-1,r+1):
        if 0<=rr<76:
            for cc in ((c,c+1) if r%2 else (c-1,c)):yield cc%180,rr

def hex_polygon(c,r):
    x,y=bm.center(c,r); h=bm.DLAT*2/3
    return Polygon([(x,y+h),(x+1,y+h/2),(x+1,y-h/2),
                    (x,y-h),(x-1,y-h/2),(x-1,y+h/2)])
def area(tree,shapes,hexagon):
    clips=[shapes[int(i)].intersection(hexagon) for i in tree.query(hexagon)
           if shapes[int(i)].intersects(hexagon)]
    if not clips:return 0
    return clips[0].area if len(clips)==1 else unary_union(clips).area

STRATEGIC = {'Suez':(32.5,30.5),'Gibraltar':(-5.5,36.5),
'Bosporus':(29,41),'Dardanelles':(26.5,40.2),'Malacca':(101.5,3),
'Sunda':(105.8,-5.8),'Lombok':(116,-8.5),'Taiwan Strait':(119.5,24.5),
'Korea Strait':(129.5,34.5),'Bab-el-Mandeb':(43.4,12.8),'Hormuz':(56.5,26.5),
'Otranto':(19,40),'Dover':(1,51.3),'Panama':(-80,9),'Bering':(-169,65)}
protected = {}
def protect(c,r,reason,radius=0):
    queue=deque([(c%180,r,0)]);seen=set()
    while queue:
        c0,r0,n=queue.popleft()
        key=(c0%180,r0)
        if key in seen or not 0<=r0<76:continue
        seen.add(key);protected.setdefault(key,set()).add(reason)
        if n<radius:queue.extend((*pos,n+1) for pos in neighbours(*key))
for s in state['stations']:
    protect(s['c'],s['r'],'city '+s['name'],1)
    if s.get('portAt'):
        protect(s['portAt']['c'],s['portAt']['r'],'port '+s['name'],1)
for u in state['units']:
    if isinstance(u['c'],int) and isinstance(u['r'],int):
        protect(u['c'],u['r'],'initial unit')
for name,pos in STRATEGIC.items():
    c,r=bm.hex_of(*pos);protect(c,r,'strategic '+name,2)
for name in ['HEX_LAND','HEX_SEA','FIX_LAND','FIX_SEA']:
    for c,r in getattr(bm,name):protect(c,r,'intentional '+name)

def region(lon,lat):
    if lat>=62:return 'Arctic / high north'
    if 30<=lon<=62 and 10<=lat<42:return 'Middle East / Arabian Peninsula'
    if 94<=lon<=138 and -12<=lat<=22:return 'Southeast Asia / Indonesia'
    if 115<=lon<=146 and 22<lat<50:return 'East Asia / Japan / Korea'
    if -12<=lon<=40 and 34<=lat<62:return 'Europe / Mediterranean'
    if -170<=lon<=-29:return 'Americas'
    if -20<=lon<=52 and -35<=lat<=36:return 'Africa'
    if lon>=96 and lat>=45:return 'Siberia / Far East'
    if 110<=lon<=180 and lat< -10:return 'Australia / Pacific'
    return 'Other'

proposals=[]
for t in state['tiles']:
    c,r=t['c'],t['r'];hp=hex_polygon(c,r)
    fraction=min(1,max(0,(area(land_tree,land,hp)-area(water_tree,water,hp))/hp.area))
    original='sea' if t['terrain']=='sea' else 'land'
    proposed='land' if fraction>=.80 else 'sea' if fraction<=.18 else 'mixed'
    if proposed=='mixed' or proposed==original:continue
    lon,lat=bm.center(c,r)
    reasons=sorted(protected.get((c,r),set()))
    if lat>60:reasons.append('polar island simplification review')
    if original=='land' and t.get('owner'):reasons.append('owned land: save / ownership migration')
    proposals.append({'c':c,'r':r,'lon':round(lon,3),'lat':round(lat,3),
                      'region':region(lon,lat),'terrain':t['terrain'],
                      'owner':t.get('owner'),'fraction_land':round(fraction,4),
                      'proposed':proposed,'needs_review':bool(reasons), 'reasons':reasons})

def is_visual_land(c,r):
    p=Point(*bm.center(c,r))
    return any(land[int(i)].covers(p) for i in land_tree.query(p)) and not any(water[int(i)].covers(p) for i in water_tree.query(p))
city_issues=[s['name'] for s in state['stations'] if not is_visual_land(s['c'],s['r'])]
# Render-time city offsets must cover the actual flagged set, lie ON GIS land,
# and remain close enough to their original logical hex to select safely.
import re
view_src=(ROOT/'dist/ui/view.js').read_text()
anchor_match=re.search(r'const CITY_SHORE_ANCHORS = Object.freeze\\((\\{.*?\\})\\);',view_src,re.S)
if anchor_match is None:
    raise RuntimeError('City visual shoreline anchor table missing')
city_anchors=json.loads(anchor_match.group(1))
if set(city_anchors)!=set(city_issues):
    raise RuntimeError(f'Incorrect shoreline anchor cities: missing={set(city_issues)-set(city_anchors)}, extra={set(city_anchors)-set(city_issues)}')
for s in state['stations']:
    coords=city_anchors.get(s['name'])
    if coords is None:continue
    lon,lat=coords
    point=Point(lon,lat)
    if not (any(land[int(i)].covers(point) for i in land_tree.query(point))
          and not any(water[int(i)].covers(point) for i in water_tree.query(point))):
        raise RuntimeError(f'City {s["name"]} visual anchor is not geographic land: {coords}')
    old_lon,old_lat=bm.center(s['c'],s['r'])
    offset=((lon-old_lon)**2*(43*3**.5/2)**2+(lat-old_lat)**2*(43*1.5*75/128)**2)**.5
    if offset>43*.72:
        raise RuntimeError(f'City {s["name"]} art moved too far from gameplay tile: {offset:.1f}')
port_issues=[s['name'] for s in state['stations'] if s.get('portAt') and is_visual_land(s['portAt']['c'],s['portAt']['r'])]
report={'summary':{'hexes':len(state['tiles']),'high_confidence_mismatches':len(proposals),
        'needs_review':sum(p['needs_review'] for p in proposals),
        'region_counts':dict(Counter(p['region'] for p in proposals)),
        'city_visual_water':len(city_issues),'city_visual_anchors_on_land':len(city_anchors),'port_visual_land':len(port_issues)},
        'city_centres_on_visual_water':city_issues, 'port_centres_on_visual_land':port_issues,
        'proposals':proposals,'approved_for_gameplay_edit':False}
out=ROOT/'docs/map-alignment-review.json'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report['summary'],indent=2))
