#!/usr/bin/env python3
"""Recompute the experimental uniform 20-80% coastal classification.

Needs shapely at authoring time. Gameplay and check_map.py use the committed
static JSON; runtime has no GIS dependency. No strategic/station/port overrides
are consulted when calculating geometry.
"""
import argparse
import json
from pathlib import Path

from shapely.geometry import Polygon
from shapely.strtree import STRtree
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
GEO = ROOT / 'dist/ui/geography-data.js'
OUT = ROOT / 'tools/data/coastal_20_80.json'
COLS, ROWS = 180, 76
H = (128 / 75) * 2 / 3


def generate():
    source = GEO.read_text()
    atlas = json.loads(source.split('const GEOGRAPHY_SHAPES = ', 1)[1].rsplit(';', 1)[0])
    polys = []
    for ring in atlas['land']:
        polygon = Polygon(ring)
        if not polygon.is_valid:
            polygon = make_valid(polygon)
        if not polygon.is_empty and polygon.area > 1e-8:
            polys.append(polygon)
    tree = STRtree(polys)
    rows = []
    for r in range(ROWS):
        lat = 74 - r * 128 / 75
        row = []
        for c in range(COLS):
            lon = -180 + (c + 0.5 + 0.5 * (r & 1)) * 2
            hexagon = Polygon([
                (lon, lat + H), (lon + 1, lat + H / 2),
                (lon + 1, lat - H / 2), (lon, lat - H),
                (lon - 1, lat - H / 2), (lon - 1, lat + H / 2),
            ])
            # Polygon area sum matches the coastline rasterizer, clamped at 1.
            overlap = sum(polys[int(i)].intersection(hexagon).area for i in tree.query(hexagon)
                          if polys[int(i)].intersects(hexagon))
            share = min(1.0, max(0.0, overlap / hexagon.area))
            row.append('S' if share < 0.20 else 'C' if share <= 0.80 else 'L')
        rows.append(''.join(row))
    return {
        'about': 'Uniform geographic hex classification using GSHHG land polygons. No legacy FIX_/HEX_ or strait/city/port vetoes. Experimental gameplay branch only.',
        'source': 'dist/ui/geography-data.js',
        'thresholds': {'sea_below': 0.2, 'land_above': 0.8},
        'cols': COLS, 'rows': rows,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true', help='verify the committed classification without writing')
    args = parser.parse_args()
    fresh = generate()
    if args.check:
        saved = json.loads(OUT.read_text())
        if fresh['rows'] != saved['rows']:
            mismatch = [(c, r) for r in range(ROWS) for c in range(COLS)
                        if fresh['rows'][r][c] != saved['rows'][r][c]]
            raise SystemExit(f'Classification drift at {len(mismatch)} hexes; first: {mismatch[:10]}')
        print('20-80% classification matches the coastline atlas for all 13,680 hexes')
    else:
        OUT.write_text(json.dumps(fresh, separators=(',', ':')) + '\n')
        print('Updated', OUT.relative_to(ROOT))


if __name__ == '__main__':
    main()
