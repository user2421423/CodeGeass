#!/usr/bin/env python3
"""Rasterize the Battle of Beijing terrain using Natural Earth 1:50m land.

Each hex is sampled at nine footprint locations, as the old hand-drawn
Bohai function was. Encodes land sample counts 0..9 as packed 4-bit nibbles.
Use: python3 tools/build_beijing_landmask.py /tmp/ne_50m_land.geojson
"""
import base64
import json
from pathlib import Path
import sys

C, R = 176, 112
WEST, EAST, NORTH, SOUTH = 114.3, 125.2, 43.3, 37.4
PATH = Path(__file__).resolve().parents[1] / 'dist/scenarios-eu-cf-beijing.js'


def in_ring(lon,lat,ring):
    inside=False
    for j in range(len(ring)):
        a,b=ring[j-1],ring[j]
        if (a[1]>lat)!=(b[1]>lat) and lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0]:
            inside=not inside
    return inside


def polygons(features):
    out=[]
    for f in features:
        g=f.get('geometry') or {}
        parts=g.get('coordinates') or []
        ringsets=parts if g.get('type')=='MultiPolygon' else [parts] if g.get('type')=='Polygon' else []
        for rings in ringsets:
            if not rings or not rings[0]:
                continue
            lon0=min(p[0] for p in rings[0]);lon1=max(p[0] for p in rings[0])
            lat0=min(p[1] for p in rings[0]);lat1=max(p[1] for p in rings[0])
            if lon1<WEST-.3 or lon0>EAST+.3 or lat1<SOUTH-.3 or lat0>NORTH+.3:
                continue
            out.append((rings,(lon0,lon1,lat0,lat1)))
    return out


def land(lon,lat,polys):
    for rings,(a,b,c,d) in polys:
        if a<=lon<=b and c<=lat<=d and in_ring(lon,lat,rings[0]) and not any(
            in_ring(lon,lat,h) for h in rings[1:]):
            return True
    return False


def main():
    if len(sys.argv)!=2:
        raise SystemExit('Usage: build_beijing_landmask.py <Natural Earth 1:50m land GeoJSON>')
    polys=polygons(json.loads(Path(sys.argv[1]).read_text())['features'])
    if not polys:raise RuntimeError('No land polygons within Beijing scene')
    dx=(EAST-WEST)/C;dy=(NORTH-SOUTH)/R
    packed=bytearray(C*R//2)
    histogram=[0]*10
    for r in range(R):
        lat=NORTH-(r+.5)*dy
        for c in range(C):
            lon=WEST+(c+.5+.5*(r&1))*dx
            n=sum(land(lon+sx*dx,lat+sy*dy,polys) for sx in (-.38,0,.38) for sy in (-.38,0,.38))
            i=r*C+c
            packed[i//2]|=n<<4 if i%2==0 else n
            histogram[n]+=1
    if histogram[9]<8000 or histogram[0]<1500:
        raise RuntimeError('Unexpected Beijing geographic data: '+repr(histogram))
    encoded=base64.b64encode(packed).decode('ascii')
    content=PATH.read_text()
    if "const BEIJING_LAND_COUNTS=atob('');" not in content and 'const BEIJING_LAND_COUNTS=atob(' not in content:
        raise RuntimeError('Missing Beijing mask placeholder')
    import re
    result,n=re.subn(r"const BEIJING_LAND_COUNTS=atob\('[A-Za-z0-9+/=]*'\);",
      lambda m:"const BEIJING_LAND_COUNTS=atob('"+encoded+"');",content)
    if n!=1:raise RuntimeError('Expected precisely one Beijing landmask placeholder')
    PATH.write_text(result)
    print('BEIJING_LANDMASK '+json.dumps({'sampleCounts':histogram,'polygons':len(polys),'bytes':len(packed)}))


if __name__=='__main__':
    main()
