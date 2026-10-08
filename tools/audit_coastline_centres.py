#!/usr/bin/env python3
"""Review *every* centre-point mismatch against the continuous coastline atlas.
Area share and gameplay protection rules identify deliberate mixed coastal
hexes separately from stronger conflicts. No map mutation. Requires shapely.
Run: python tools/audit_coastline_centres.py
"""
import argparse
from collections import Counter
from pathlib import Path
import json
from shapely.geometry import Point
from shapely.strtree import STRtree
from audit_map_alignment import (game_state, atlas_polygons, protect, polygon,
                                 intersection_area, region, bm)
ROOT = Path(__file__).resolve().parents[1]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--output',default='docs/map-coastline-centre-review.json')
    args=ap.parse_args()
    state=game_state()
    lands,lakes=atlas_polygons()
    land_index,lake_index=STRtree(lands),STRtree(lakes)
    protected=protect(state)
    records=[]
    for tile in state['tiles']:
        c,r=tile['c'],tile['r']
        lon,lat=bm.center(c,r)
        pt=Point(lon,lat)
        visual=any(lands[int(i)].covers(pt) for i in land_index.query(pt)) and not any(
            lakes[int(i)].covers(pt) for i in lake_index.query(pt))
        playable=tile['terrain']!='sea'
        if visual==playable:continue
        hp=polygon(c,r)
        share=max(0,min(1,(intersection_area(land_index,lands,hp)-
             intersection_area(lake_index,lakes,hp))/hp.area))
        reasons=sorted(protected.get((c,r),()))
        if lat>60:reasons.append('polar coastline simplification')
        if playable and tile['owner']:reasons.append('owned land: save and territory migration')
        if share>=.8 and not playable:
            category='sea_hex_on_geographic_land'
            recommendation='visual waterway review' if reasons else 'gameplay sea-to-land candidate'
        elif share<=.18 and playable:
            category='land_hex_on_geographic_water'
            recommendation='visual city/shoreline adjustment' if reasons else 'gameplay land-to-sea candidate'
        else:
            category='mixed_coast_hex'
            recommendation='retain mixed hex; ensure visual navigation cues'
        records.append({'c':c,'r':r,'lon':round(lon,3),'lat':round(lat,3),
            'region':region(lon,lat),'playable':'land' if playable else 'sea',
            'visual_centre':'land' if visual else 'sea','land_coverage':round(share,4),
            'category':category,'recommended_action':recommendation,'protection_reasons':reasons})
    records.sort(key=lambda x:(x['region'],x['r'],x['c']))
    report={'method':'Centre-point comparison plus true hex area intersection; not all mismatches are errors.',
        'hexes':len(state['tiles']),'total_centre_conflicts':len(records),
        'by_region':dict(Counter(x['region'] for x in records)),
        'by_category':dict(Counter(x['category'] for x in records)),
        'by_recommended_action':dict(Counter(x['recommended_action'] for x in records)),
        'records':records,'gameplay_changed_by_audit':False}
    dst=ROOT/args.output
    dst.parent.mkdir(parents=True,exist_ok=True)
    dst.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='records'},indent=2))
if __name__=='__main__':main()
