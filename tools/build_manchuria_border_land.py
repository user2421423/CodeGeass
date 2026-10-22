#!/usr/bin/env python3
"""Audit-correct the Manchuria/Korea mainland border without changing Bohai ports."""
import base64,json,re,sys
from pathlib import Path
from build_manchuria_north_coast import dry,C,R,W,E,N,S
if len(sys.argv)!=2:raise SystemExit('Provide Natural Earth land GeoJSON')
shapes=[]
for f in json.loads(Path(sys.argv[1]).read_text())['features']:
    g=f.get('geometry') or {};cs=g.get('coordinates') or []
    for rings in cs if g.get('type')=='MultiPolygon' else [cs] if g.get('type')=='Polygon' else []:
        if not rings or not rings[0]:continue
        a=min(p[0] for p in rings[0]);b=max(p[0] for p in rings[0])
        c=min(p[1] for p in rings[0]);d=max(p[1] for p in rings[0])
        if b>=123.2 and a<=137.5 and d>=40.2 and c<=54:shapes.append((rings,(a,b,c,d)))
if not shapes:raise RuntimeError('Manchuria coastline reference empty')
encoded=bytearray(C*R//2);landCells=seaCells=coastCells=0
for r in range(R):
    lat=N-(r+.5)*(N-S)/R
    for c in range(C):
        lon=W+(c+.5+.5*(r&1))*(E-W)/C
        n=9
        if lon>=123.5 and lat>=40.5:
            n=sum(dry(lon+x*(E-W)/C,lat+y*(N-S)/R,shapes)
                  for x in (-.38,0,.38) for y in (-.38,0,.38))
            if n<=1:seaCells+=1
            elif n<=7:coastCells+=1
            else:landCells+=1
        i=r*C+c
        encoded[i>>1]|=(n<<4) if i%2==0 else n
if seaCells<30 or landCells<1000:raise RuntimeError('Implausible Manchuria coastline')
path=Path(__file__).resolve().parents[1]/'dist/scenarios-eu-cf-manchuria.js'
s=path.read_text()
s=s.replace('if(p.lon>=130&&p.lat>=43.5)dry=Math.round(manchuriaNorthDry(i)*25/9);',
            'if(p.lon>=123.5&&p.lat>=40.5)dry=Math.round(manchuriaNorthDry(i)*25/9);')
if 'if(p.lon>=123.5&&p.lat>=40.5)dry=Math.round' not in s:raise RuntimeError('Manchuria terrain guard missing')
blob=base64.b64encode(encoded).decode('ascii')
s,n=re.subn(r"const MANCHURIA_NORTH_LAND_COUNTS=atob\('[A-Za-z0-9+/=]*'\);",
    lambda _:"const MANCHURIA_NORTH_LAND_COUNTS=atob('"+blob+"');",s)
if n!=1:raise RuntimeError('Manchuria geographic mask missing')
path.write_text(s)
print('MANCHURIA_BORDER_GEO',json.dumps({'sea':seaCells,'coast':coastCells,'land':landCells}))
