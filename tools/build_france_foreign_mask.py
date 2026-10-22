#!/usr/bin/env python3
"""Rasterize foreign land outside metropolitan France as non-playable.

Uses Natural Earth 1:50m admin-0 country polygons; removes synthetic sea and
foreign-country land in the Channel/Atlantic, without touching French
mainland, Corsica or intended navigable water.
"""
from __future__ import annotations
import base64, json, math, re, sys
from pathlib import Path

COLS, ROWS = 142, 104
WEST, EAST, NORTH, SOUTH = -5.85, 9.65, 51.55, 40.95
DEST = Path(__file__).resolve().parents[1] / 'dist/scenarios-cf-eu-france.js'


def inside_ring(x,y,ring):
    odd = False
    for i in range(len(ring)):
        ax,ay = ring[i-1]
        bx,by = ring[i]
        if (ay > y) != (by > y) and x < (bx-ax)*(y-ay)/(by-ay)+ax:
            odd = not odd
    return odd


def inside_country(x,y,rings):
    return inside_ring(x,y,rings[0]) and not any(inside_ring(x,y,h) for h in rings[1:])


def main():
    if len(sys.argv)!=2:
        raise SystemExit('Usage: build_france_foreign_mask.py <Natural Earth countries.geojson>')
    features=json.loads(Path(sys.argv[1]).read_text())['features']
    shapes=[]
    found=set()
    for f in features:
        p=f.get('properties') or {}
        name=p.get('ADMIN') or p.get('NAME') or p.get('SOVEREIGNT')
        if not name:
            continue
        found.add(name)
        if name=='France':
            continue
        g=f.get('geometry') or {}
        polys=g.get('coordinates') or []
        ringses=polys if g.get('type')=='MultiPolygon' else [polys] if g.get('type')=='Polygon' else []
        for rings in ringses:
            if not rings or not rings[0]:
                continue
            xs=[p[0] for p in rings[0]]
            ys=[p[1] for p in rings[0]]
            box=(min(xs),max(xs),min(ys),max(ys))
            if box[1]<WEST or box[0]>EAST or box[3]<SOUTH or box[2]>NORTH:
                continue
            shapes.append((name,rings,box))
    if 'France' not in found:
        raise RuntimeError('France missing from natural earth input')
    counts={}
    bits=bytearray(math.ceil(COLS*ROWS/8))
    for r in range(ROWS):
        lat=NORTH-(r+.5)*(NORTH-SOUTH)/ROWS
        for c in range(COLS):
            lon=WEST+(c+.5+.5*(r&1))*(EAST-WEST)/COLS
            for name,rings,(l,b,t,u) in shapes:
                if lon<l or lon>b or lat<t or lat>u:
                    continue
                if inside_country(lon,lat,rings):
                    index=r*COLS+c
                    bits[index>>3] |= 128>>(index&7)
                    counts[name]=counts.get(name,0)+1
                    break
    if sum(counts.values())<100:
        raise RuntimeError('Foreign land unexpectedly tiny: '+repr(counts))
    data=DEST.read_text()
    encoded=base64.b64encode(bits).decode('ascii')
    pat=r"const FOREIGN_FRANCE_LAND=atob\('[A-Za-z0-9+/=]*'\);"
    updated,num=re.subn(pat,lambda _:"const FOREIGN_FRANCE_LAND=atob('"+encoded+"');",data)
    if num!=1:
        raise RuntimeError('Suez foreign landmask insertion point missing')
    DEST.write_text(updated)
    print('FRANCE foreign country mask hexes: ',sum(counts.values()),counts, 'mask chars',len(encoded))


if __name__=='__main__':
    main()
