#!/usr/bin/env python3
"""Generate Black Sea/Sea of Azov and Caspian footprint water samples.

Natural Earth 1:50m land outlines identify Black Sea/Sea of Azov water,
and its 1:50m lakes layer identifies the landlocked Caspian Sea. The two
basins are sampled separately to keep scenario fleets in their true basins.
Each hex packs nine-sample counts as (Caspian<<4)|Black.
"""
import base64, json, re, sys
from pathlib import Path

C, R = 164, 114
WEST, EAST, NORTH, SOUTH = 37.1, 51.9, 46.65, 37.05
TARGET=Path(__file__).resolve().parents[1]/'dist/scenarios-cf-eu-caucasus.js'

def contains_ring(x,y,ring):
    inside=False
    for i in range(len(ring)):
        a,b=ring[i-1],ring[i]
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            inside=not inside
    return inside

def get_polys(path):
    data=json.loads(Path(path).read_text())
    out=[]
    for f in data['features']:
        g=f.get('geometry') or {}
        p=g.get('coordinates') or []
        entries=p if g.get('type')=='MultiPolygon' else [p] if g.get('type')=='Polygon' else []
        for rings in entries:
            if not rings or not rings[0]:
                continue
            w=min(x[0] for x in rings[0]);e=max(x[0] for x in rings[0])
            s=min(x[1] for x in rings[0]);n=max(x[1] for x in rings[0])
            if e<WEST-.2 or w>EAST+.2 or n<SOUTH-.2 or s>NORTH+.2:continue
            out.append((rings,(w,e,s,n)))
    return out

def inside(x,y,polys):
    for rings,(w,e,s,n) in polys:
        if not (w<=x<=e and s<=y<=n):
            continue
        if contains_ring(x,y,rings[0]) and not any(contains_ring(x,y,ring) for ring in rings[1:]):
            return True
    return False

def main():
    if len(sys.argv)!=3:
        raise SystemExit('Usage: build_caucasus_watermask.py <NE land.geojson> <NE lakes.geojson>')
    land=get_polys(sys.argv[1]);lakes=get_polys(sys.argv[2])
    if not land or not lakes:raise RuntimeError('Missing geographic reference polygons')
    dx=(EAST-WEST)/C;dy=(NORTH-SOUTH)/R
    raw=bytearray(C*R)
    sea=[0,0]
    for r in range(R):
        lat=NORTH-(r+.5)*dy
        for c in range(C):
            lon=WEST+(c+.5+.5*(r&1))*dx
            black=caspian=0
            for x in (-.34,0,.34):
                for y in (-.34,0,.34):
                    px=lon+x*dx;py=lat+y*dy
                    # Black Sea and its Azov extension are outside Natural Earth
                    # land; the Caspian is represented by an inland lake polygon.
                    if px<=43 and py>=40.3 and not inside(px,py,land):
                        black+=1
                    elif px>=46.25 and py>=37.05 and inside(px,py,lakes):
                        caspian+=1
            raw[r*C+c]=(caspian<<4)|black
            if black>=8:sea[0]+=1
            if caspian>=8:sea[1]+=1
    if min(sea)<350:
        raise RuntimeError('One geographic sea basin unexpectedly missing: '+repr(sea))
    b64=base64.b64encode(raw).decode('ascii')
    src=TARGET.read_text()
    new,n=re.subn(r"const CAUCASUS_WATER_COUNTS=atob\('[A-Za-z0-9+/=]*'\);",
        lambda _:"const CAUCASUS_WATER_COUNTS=atob('"+b64+"');",src)
    if n!=1:raise RuntimeError('Caucasus watermask insertion point missing')
    TARGET.write_text(new)
    print('CAUCASUS_WATERMASK '+json.dumps({'seaTiles':sea,'landPolygons':len(land),'lakePolygons':len(lakes),'bytes':len(raw)}))

if __name__=='__main__':
    main()
