#!/usr/bin/env python3
"""Restore high-confidence Bohai Sea water in the eastern Luoyang map."""
import base64,json,re,sys
from pathlib import Path
from build_beijing_landmask import polygons,land

if len(sys.argv)!=2:raise SystemExit('Usage: build_luoyang_bohai_mask.py land.geojson')
features=json.loads(Path(sys.argv[1]).read_text())['features']
shapes=polygons(features)
C,R=174,116
bits=bytearray((C*R+7)//8)
count=0
for r in range(R):
    lat=38.2-(r+.5)*6.55/R
    if lat<=37.2:continue
    for c in range(C):
        lon=108.55+(c+.5+.5*(r&1))*9.9/C
        if lon<=117:continue
        hits=sum(land(lon+x*9.9/C,lat+y*6.55/R,shapes)
                 for x in (-.32,0,.32) for y in (-.32,0,.32))
        if hits<=1:
            k=r*C+c
            bits[k>>3]|=128>>(k&7)
            count+=1
if count<1 or count>300:raise RuntimeError('Unexpected Bohai water count '+str(count))
encoded=base64.b64encode(bits).decode('ascii')
for filename in ('scenarios-luoyang.js','scenarios-eu-cf-luoyang.js'):
    path=Path(__file__).resolve().parents[1]/'dist'/filename
    s=path.read_text()
    if "const LUOYANG_BOHAI_BITS=atob(" not in s:
        insert="""  const LUOYANG_BOHAI_BITS=atob('');
  function restoreBohaiSea(g){
    for(const t of g.tiles){
      const i=t.r*COLS+t.c;
      if(LUOYANG_BOHAI_BITS.charCodeAt(i>>3)&(128>>(i&7)))t.terrain='sea';
    }
  }
"""
        if s.count('  function makeRiver(g) {')!=1:
            raise RuntimeError('Missing Luoyang river insertion: '+filename)
        s=s.replace('  function makeRiver(g) {',insert+'  function makeRiver(g) {',1)
        if s.count('    openApproaches(g);')!=1:
            raise RuntimeError('Missing Luoyang land/sea insertion: '+filename)
        s=s.replace('    openApproaches(g);','    openApproaches(g);\n    restoreBohaiSea(g);',1)
    s,n=re.subn(r"const LUOYANG_BOHAI_BITS=atob\('[A-Za-z0-9+/=]*'\);",
        lambda m:"const LUOYANG_BOHAI_BITS=atob('"+encoded+"');",s)
    if n!=1:raise RuntimeError('Bohai sea-mask missing: '+filename)
    path.write_text(s)
    print('LUOYANG_BOHAI_SEA',filename,count)
