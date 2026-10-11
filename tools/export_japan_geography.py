#!/usr/bin/env python3
"""Build the Japan-only shoreline asset from Natural Earth 1:10m land GeoJSON.

Public-domain source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_land.geojson
Usage: python3 tools/export_japan_geography.py ne_10m_land.geojson
Only the nine existing scenario islands are exported. No gameplay hexes change.
"""
import json
import sys
from pathlib import Path

ANCHORS = [(139.69, 35.68), (141.35, 43.06), (130.71, 32.80),
           (133.53, 33.56), (134.87, 34.37), (138.32, 38.06),
           (133.25, 36.25), (130.52, 30.34), (141.25, 45.18)]
HEADER = """/* Japan scenario coastline: Natural Earth 1:10m land polygons, public domain (CC0).
 * Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_land.geojson
 * Rebuild: python3 tools/export_japan_geography.py path/to/ne_10m_land.geojson
 * Only the nine named Japanese islands in the original Scenario atlas are included.
 * This is visual geography only; no hex, sea route, city or gameplay terrain changes. */
'use strict';
const JAPAN_SHAPES = """


def contains(ring, x, y):
    inside = False
    for i, a in enumerate(ring):
        b = ring[i - 1]
        if (a[1] > y) != (b[1] > y) and x < (
            (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]
        ):
            inside = not inside
    return inside


def extract(src):
    shapes, matched = [], set()
    for feature in src['features']:
        geom = feature['geometry']
        polygons = (geom['coordinates'] if geom['type'] == 'MultiPolygon'
                    else [geom['coordinates']] if geom['type'] == 'Polygon'
                    else [])
        for poly in polygons:
            ring = poly[0]
            xs = [p[0] for p in ring]
            ys = [p[1] for p in ring]
            found = [i for i, (x, y) in enumerate(ANCHORS)
                     if min(xs) <= x <= max(xs) and min(ys) <= y <= max(ys)
                     and contains(ring, x, y)]
            if found:
                matched.update(found)
                points = [[round(x, 5), round(y, 5)] for x, y in ring]
                if points[0] == points[-1]:
                    points.pop()
                shapes.append(points)
    if len(shapes) != 9 or len(matched) != 9:
        raise ValueError('Expected exactly nine Japanese island polygons')
    if sum(map(len, shapes)) < 4700:
        raise ValueError('Coastline is not detailed enough for 1:10m resolution')
    return shapes


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 tools/export_japan_geography.py ne_10m_land.geojson')
    shapes = extract(json.loads(Path(sys.argv[1]).read_text()))
    output = Path(__file__).resolve().parents[1] / 'dist/ui/japan-coastlines.js'
    output.write_text(HEADER + json.dumps(shapes, separators=(',', ':')) + ';\n')
    print(f'Wrote {len(shapes)} islands with {sum(map(len, shapes))} points: {output}')
