#!/usr/bin/env python3
"""Repair unmistakable high-latitude coast errors in shared Japan/Europe maps.

Independent Natural Earth 1:50m land; nine footprint samples per hex.
Japan: sea water supported by all nine samples (only north of 44.2 N).
Europe: solid land supported by all nine samples (only above 60 N,
10-38 E). Other map designs and manual Japan overrides are retained.
"""
import base64,json,re,sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def inside_ring(x,y,p):
    odd=False
    for i in range(len(p)):
        a,b=p[i-1],p[i]
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            odd=not odd
    return odd

def shapes(features):
    result=[]
    for feat in features:
        g=feat.get('geometry') or {};q=g.get('coordinates') or []
        groups=q if g.get('type')=='MultiPolygon' else [q] if g.get('type')=='Polygon' else []
        for rings in groups:
            if not rings or not rings[0]:continue
            a=min(p[0] for p in rings[0]);b=max(p[0] for p in rings[0])
            c=min(p[1] for p in rings[0]);d=max(p[1] for p in rings[0])
            if b<10 or a>147 or d<44 or c>73:continue
            result.append((rings,(a,b,c,d)))
    return result
def dry(x,y,polys):
    for ring,(a,b,c,d) in polys:
        if a<=x<=b and c<=y<=d and inside_ring(x,y,ring[0]) and not any(inside_ring(x,y,h) for h in ring[1:]):
            return True
    return False

def install(filename,constant,function,call,mask):
    p=ROOT/'dist'/filename;s=p.read_text()
    b64=base64.b64encode(mask).decode('ascii')
    if constant not in s:
        # The insertion point is common to the Japan and European base maps.
        anchor='  function create('
        if s.count(anchor)!=1:raise RuntimeError('Missing shared setup in '+filename)
        fn=(f"  const {constant}=atob('');\n"+function+'\n')
        s=s.replace(anchor,fn+anchor,1)
        if s.count(call[0])!=1:raise RuntimeError('Missing activation point in '+filename)
        s=s.replace(*call,1)
    pat=r"const "+constant+r"=atob\('[A-Za-z0-9+/=]*'\);"
    s,n=re.subn(pat,lambda _:f"const {constant}=atob('{b64}');",s)
    if n!=1:raise RuntimeError('Raster slot missing '+filename)
    p.write_text(s)

def main():
    if len(sys.argv)!=2:raise SystemExit('Usage: build_remaining_regional_shores.py <NE land.geojson>')
    polys=shapes(json.loads(Path(sys.argv[1]).read_text())['features'])
    if not polys:raise RuntimeError('Natural Earth source missing land polygons')
    jcols,jrows=110,84
    jmask=bytearray((jcols*jrows+7)//8);jseas=0
    # Same WGS84 centre projection as dist/scenarios.js.
    import math
    cos=math.cos(math.radians(38.1));dx=13.26/109/cos;dy=15.25/83
    for r in range(jrows):
        lat=38.1+7.65-r*dy
        if lat<44.2:continue
        for c in range(jcols):
            lon=137.65+(-6.61+(c+.5*(r&1))*13.26/109)/cos
            if all(not dry(lon+x*dx,lat+y*dy,polys) for x in (-.33,0,.33) for y in (-.33,0,.33)):
                i=r*jcols+c;jmask[i>>3]|=128>>(i&7);jseas+=1
    if jseas<50 or jseas>1000:raise RuntimeError('Unexpected northern Japan open sea '+str(jseas))
    func="""  function fixJapanVerifiedOpenSea(g){
    let repaired=0;
    for(const t of g.tiles){
      const i=t.r*COLS+t.c;
      if((JAPAN_CONFIRMED_OPEN_SEA.charCodeAt(i>>3)&(128>>(i&7)))&&t.terrain!=='sea'){
        t.terrain='sea';repaired++;
      }
    }
    g.scenario.northJapanSeaCorrections=repaired;
  }"""
    install('scenarios.js','JAPAN_CONFIRMED_OPEN_SEA',func,
      ('    applyManualJapanTerrain(g);','    applyManualJapanTerrain(g);\n    fixJapanVerifiedOpenSea(g);'),jmask)
    cols,rows=120,80
    emask=bytearray((cols*rows+7)//8);eland=0
    dx=60/cols;dy=38/rows
    for r in range(rows):
        lat=72-(r+.5)*dy
        if lat<60:continue
        for c in range(cols):
            lon=-13+(c+.5+.5*(r&1))*dx
            if lon<10 or lon>38:continue
            if all(dry(lon+x*dx,lat+y*dy,polys) for x in (-.33,0,.33) for y in (-.33,0,.33)):
                i=r*cols+c;emask[i>>3]|=128>>(i&7);eland+=1
    if eland<200 or eland>2200:raise RuntimeError('Unexpected north Europe land count '+str(eland))
    func="""  function restoreVerifiedNordicLand(g){
    let repaired=0;
    for(const t of g.tiles){
      const i=t.r*COLS+t.c;
      if(t.terrain==='sea'&&(EUROPE_CONFIRMED_NORDIC_LAND.charCodeAt(i>>3)&(128>>(i&7)))){
        t.terrain=landscape(geo(t.c,t.r),t.c,t.r);repaired++;
      }
    }
    g.scenario.nordicTerrainCorrections=repaired;
  }"""
    install('scenarios-europe.js','EUROPE_CONFIRMED_NORDIC_LAND',func,
      ("    // An adjacent sea hex does not, by itself, make a land hex coastal.",
       "    restoreVerifiedNordicLand(g);\n    // An adjacent sea hex does not, by itself, make a land hex coastal."),emask)
    print('REMAINING_REGIONAL_SHORES '+json.dumps({'japanReferenceWaterCells':jseas,'europeReferenceLandCells':eland,'sourcePolygons':len(polys)}))
if __name__=='__main__':main()
