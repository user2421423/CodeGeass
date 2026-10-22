#!/usr/bin/env python3
"""Repair Manchuria's east coast north of 43.5 N from NE 1:50m geography.

Existing map treats the entire northern section as dry land even in the
Sea of Japan. Only the map's eastern strip (>=130 E, >=43.5 N) is changed;
existing southern Korean, Liaodong, river and city geometry is preserved.
"""
import base64, json, re, sys
from pathlib import Path

C,R=144,112
W,E,N,S=105,137,53.5,37.5
TARGET=Path(__file__).resolve().parents[1]/'dist/scenarios-eu-cf-manchuria.js'

def ring(x,y,points):
    inside=False
    for j in range(len(points)):
        a,b=points[j-1],points[j]
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            inside=not inside
    return inside

def get_polys(src):
    out=[]
    for f in src['features']:
        g=f.get('geometry') or {};p=g.get('coordinates') or []
        entries=p if g.get('type')=='MultiPolygon' else [p] if g.get('type')=='Polygon' else []
        for rings in entries:
            if not rings or not rings[0]:continue
            a=min(p[0] for p in rings[0]);b=max(p[0] for p in rings[0])
            c=min(p[1] for p in rings[0]);d=max(p[1] for p in rings[0])
            if b<129.5 or a>137.5 or d<43 or c>54:continue
            out.append((rings,(a,b,c,d)))
    return out

def dry(x,y,polys):
    for rings,(a,b,c,d) in polys:
        if a<=x<=b and c<=y<=d and ring(x,y,rings[0]) and not any(
            ring(x,y,h) for h in rings[1:]):
            return True
    return False

def main():
    if len(sys.argv)!=2:raise SystemExit('Usage: build_manchuria_north_coast.py <Natural Earth land geojson>')
    polys=get_polys(json.loads(Path(sys.argv[1]).read_text()))
    if not polys:raise RuntimeError('No eastern Manchurian land reference polygons')
    encoded=bytearray(C*R//2)
    nSea=nCoast=nLand=0
    dx=(E-W)/C;dy=(N-S)/R
    for r in range(R):
        lat=N-(r+.5)*dy
        for c in range(C):
            lon=W+(c+.5+.5*(r&1))*dx
            n=9
            if lon>=130 and lat>=43.5:
                n=sum(dry(lon+x*dx,lat+y*dy,polys) for x in (-.38,0,.38) for y in (-.38,0,.38))
                if n<=1:nSea+=1
                elif n<=7:nCoast+=1
                else:nLand+=1
            i=r*C+c
            encoded[i>>1]|=(n<<4) if (i&1)==0 else n
    if nSea<30 or nLand<400:raise RuntimeError('Manchuria coast reference incomplete: '+repr((nSea,nCoast,nLand)))
    b64=base64.b64encode(encoded).decode('ascii')
    source=TARGET.read_text()
    out,n=re.subn(r"const MANCHURIA_NORTH_LAND_COUNTS=atob\('[A-Za-z0-9+/=]*'\);",
        lambda _:"const MANCHURIA_NORTH_LAND_COUNTS=atob('"+b64+"');",source)
    if n!=1:raise RuntimeError('Manchuria mask insertion point missing')
    TARGET.write_text(out)
    print('MANCHURIA_NORTH_COAST '+json.dumps({'sea':nSea,'coast':nCoast,'land':nLand,'polygons':len(polys)}))

if __name__=='__main__':main()
