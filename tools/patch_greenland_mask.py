#!/usr/bin/env python3
"""Install Greenland's blocked foreign-island mask in the scenario, idempotently.

Only edits source when a verified Natural Earth mask will be rasterized in the
same GitHub Actions run. Changes are committed only after full scenario audit.
"""
from pathlib import Path

path=Path(__file__).resolve().parents[1]/'dist/scenarios-greenland.js'
s=path.read_text()
if "const FOREIGN_GREENLAND_LAND=atob(" in s:
    print("GREENLAND_MASK_PATCH already installed")
    raise SystemExit(0)

changes=[
  ("  const PROJECTION={centerLon:-44,centerLat:71,angle:0,uMin:-34*K,uMax:34*K,vMin:-13,vMax:13};",
   "  const PROJECTION={centerLon:-44,centerLat:71,angle:0,uMin:-34*K,uMax:34*K,vMin:-13,vMax:13};\n  // Natural Earth source for Canadian Arctic islands outside playable Greenland.\n  const FOREIGN_GREENLAND_LAND=atob('');\n  const foreignGreenlandAt=(c,r)=>{const i=r*COLS+c;return !!(FOREIGN_GREENLAND_LAND.charCodeAt(i>>3)&(128>>(i&7)));};"),
  ("return {c,r,owner:null,terrain:fraction===0?'sea':\n        fraction===1?'coast':landscape(p)};",
   "return {c,r,owner:null,terrain:foreignGreenlandAt(c,r)?'offmap':\n        fraction===0?'sea':fraction===1?'coast':landscape(p)};"),
  ("if(t.terrain==='sea')continue;\n      if(E.adjacent(g,t).some(n=>n.terrain==='sea')){",
   "if(t.terrain==='sea'||t.terrain==='offmap')continue;\n      if(E.adjacent(g,t).some(n=>n.terrain==='sea')){"),
  ("if(n.terrain==='sea'||iceDistance[index]>=0)continue;",
   "if(n.terrain==='sea'||n.terrain==='offmap'||iceDistance[index]>=0)continue;"),
  ("if(t.terrain==='sea'||t.terrain==='coast')continue;",
   "if(t.terrain==='sea'||t.terrain==='coast'||t.terrain==='offmap')continue;"),
  ("t=>t.terrain!=='sea'&&t.terrain!=='peak'&&",
   "t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&t.terrain!=='peak'&&"),
  ("if(g.tiles[i].terrain==='sea'||components[i]>=0)continue;",
   "if(g.tiles[i].terrain==='sea'||g.tiles[i].terrain==='offmap'||components[i]>=0)continue;"),
  ("if(n.terrain==='sea'||components[j]>=0)continue;",
   "if(n.terrain==='sea'||n.terrain==='offmap'||components[j]>=0)continue;"),
  ("for(const t of g.tiles)if(t.terrain!=='sea'){\n      const eligible=byComponent.get",
   "for(const t of g.tiles)if(t.terrain!=='sea'&&t.terrain!=='offmap'){\n      const eligible=byComponent.get"),
  ("const at=nearest(g,s,t=>t.terrain!=='sea'&&!E.unitAt(g,t)&&",
   "const at=nearest(g,s,t=>t.terrain!=='sea'&&t.terrain!=='offmap'&&!E.TERRAIN[t.terrain]?.blocked&&!E.unitAt(g,t)&&"),
  ("for(const t of g.tiles)if(t.terrain!=='sea'){\n      depth[t.r*COLS+t.c]=0;q.push(t);",
   "for(const t of g.tiles)if(t.terrain!=='sea'&&t.terrain!=='offmap'){\n      depth[t.r*COLS+t.c]=0;q.push(t);")
]
for old,new in changes:
    if s.count(old)!=1:
        raise RuntimeError('Greenland source changed; safe patch aborted: '+repr(old[:80]))
    s=s.replace(old,new,1)
path.write_text(s)
print('GREENLAND_MASK_PATCH installed',len(changes),'safe changes')
