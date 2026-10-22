#!/usr/bin/env python3
"""Correct omitted Assamese/northeast mainland in India's geographic map.

Uses NE 1:50m land outlines, but affects ONLY high-confidence physical land
hexes east of 91.5 E and north of 22 N erroneously marked sea by the
regional coarse polygon. Other Indian waterways/shorelines remain unchanged.
"""
import base64,json,re,sys
from pathlib import Path
C,R=168,124
W,E,N,S=57,94,37,5.5
DEST=Path(__file__).resolve().parents[1]/'dist/eu-cf-india-geography.js'

def inside_ring(x,y,pts):
    yes=False
    for j in range(len(pts)):
        a,b=pts[j-1],pts[j]
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            yes=not yes
    return yes

def polys(features):
    out=[]
    for f in features:
        g=f.get('geometry') or {};shapes=g.get('coordinates') or []
        for polygon in (shapes if g.get('type')=='MultiPolygon' else [shapes] if g.get('type')=='Polygon' else []):
            if not polygon or not polygon[0]:continue
            a=min(q[0] for q in polygon[0]);b=max(q[0] for q in polygon[0])
            c=min(q[1] for q in polygon[0]);d=max(q[1] for q in polygon[0])
            if b<91.3 or a>94.2 or d<21.8 or c>37.2:continue
            out.append((polygon,(a,b,c,d)))
    return out

def dry(x,y,shapes):
    for rings,(a,b,c,d) in shapes:
        if a<=x<=b and c<=y<=d and inside_ring(x,y,rings[0]) and not any(
            inside_ring(x,y,h) for h in rings[1:]):
            return True
    return False

def main():
    if len(sys.argv)!=2:raise SystemExit('Usage: build_india_northeast_land.py <NE land GeoJSON>')
    shapes=polys(json.loads(Path(sys.argv[1]).read_text())['features'])
    if not shapes:raise RuntimeError('Missing northeastern India land reference')
    dx=(E-W)/C;dy=(N-S)/R
    bits=bytearray(C*R//8)
    corrected=0
    for r in range(R):
        lat=N-(r+.5)*dy
        if lat<22:continue
        for c in range(C):
            lon=W+(c+.5+.5*(r&1))*dx
            if lon<91.5:continue
            n=sum(dry(lon+x*dx,lat+y*dy,shapes)
                  for x in (-.32,0,.32) for y in (-.32,0,.32))
            if n>=8:
                i=r*C+c;bits[i>>3]|=128>>(i&7);corrected+=1
    if corrected<80:raise RuntimeError('Northeast land reference empty: '+str(corrected))
    b64=base64.b64encode(bits).decode('ascii')
    src=DEST.read_text()
    out,n=re.subn(r"const INDIA_NORTHEAST_LAND=atob\('[A-Za-z0-9+/=]*'\);",
                 lambda _:"const INDIA_NORTHEAST_LAND=atob('"+b64+"');",src)
    if n!=1:raise RuntimeError('Indian northeast raster slot missing')
    DEST.write_text(out)
    print('INDIA_NORTHEAST_REFERENCE '+json.dumps({'landBitHexes':corrected,'polygons':len(shapes)}))

if __name__=='__main__':main()
