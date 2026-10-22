#!/usr/bin/env python3
"""Rasterize non-playable foreign Mediterranean land for North Africa.

Input: Natural Earth 1:50m admin-0 countries GeoJSON.
Only foreign land currently classified as open sea is excluded. African land,
mixed coastal battle hexes and every existing port keep their original terrain.
Run: python tools/build_north_africa_foreign_mask.py /tmp/ne_50m_countries.geojson
"""
from __future__ import annotations
import base64
import json
import math
from pathlib import Path
import re
import sys

COLS, ROWS = 176, 108
B = (-1.8, 34.3, 40.5, 22.4)  # west, east, north, south
HOME = {'Algeria', 'Tunisia', 'Libya', 'Egypt'}
SCRIPT = Path(__file__).resolve().parents[1] / 'dist/scenarios-cf-eu-north-africa.js'


def ring_contains(lon, lat, ring):
    inside = False
    for i in range(len(ring)):
        x0, y0 = ring[i - 1]
        x1, y1 = ring[i]
        if (y0 > lat) != (y1 > lat):
            if lon < (x1 - x0) * (lat - y0) / (y1 - y0) + x0:
                inside = not inside
    return inside


def polygon_contains(lon, lat, rings):
    return ring_contains(lon, lat, rings[0]) and not any(
        ring_contains(lon, lat, hole) for hole in rings[1:])


def polygons_for_area(features):
    polygons = []
    encountered = set()
    for feature in features:
        props = feature.get('properties') or {}
        name = props.get('ADMIN') or props.get('NAME') or props.get('SOVEREIGNT')
        if not name:
            continue
        encountered.add(name)
        if name in HOME:
            continue
        geometry = feature.get('geometry') or {}
        shape = geometry.get('type')
        coords = geometry.get('coordinates') or []
        entries = coords if shape == 'MultiPolygon' else [coords] if shape == 'Polygon' else []
        for rings in entries:
            if not rings or not rings[0]:
                continue
            west = min(p[0] for p in rings[0])
            east = max(p[0] for p in rings[0])
            south = min(p[1] for p in rings[0])
            north = max(p[1] for p in rings[0])
            if east < B[0] or west > B[1] or north < B[3] or south > B[2]:
                continue
            polygons.append((name, rings, (west,east,north,south)))
    if not HOME.issubset(encountered):
        raise RuntimeError('Natural Earth country labels are not as expected: ' +
                           repr(HOME.difference(encountered)))
    return polygons


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Provide Natural Earth admin-0 countries GeoJSON path')
    data = json.loads(Path(sys.argv[1]).read_text())
    polys = polygons_for_area(data['features'])
    packed = bytearray(math.ceil(COLS * ROWS / 8))
    counts = {}
    for row in range(ROWS):
        lat = B[2] - (row + 0.5) * (B[2] - B[3]) / ROWS
        for col in range(COLS):
            lon = B[0] + (col + 0.5 + 0.5 * (row & 1)) * (B[1] - B[0]) / COLS
            for name, rings, (west,east,north,south) in polys:
                if not (west <= lon <= east and south <= lat <= north):
                    continue
                if polygon_contains(lon,lat,rings):
                    i = row * COLS + col
                    packed[i >> 3] |= 128 >> (i & 7)
                    counts[name] = counts.get(name, 0) + 1
                    break
    if sum(counts.values()) < 200:
        raise RuntimeError('Foreign land mask unexpectedly tiny: '+repr(counts))
    source = SCRIPT.read_text()
    encoded = base64.b64encode(packed).decode('ascii')
    pattern = r"const FOREIGN_MEDITERRANEAN_LAND = atob\('[A-Za-z0-9+/=]*'\);"
    replacement = "const FOREIGN_MEDITERRANEAN_LAND = atob('" + encoded + "');"
    result, changes = re.subn(pattern, lambda _: replacement, source)
    if changes != 1:
        raise RuntimeError('Foreign Mediterranean terrain mask insertion point missing')
    SCRIPT.write_text(result)
    print('Foreign-country land hexes:', sum(counts.values()), counts)
    print('Packed bytes:', len(packed), 'base64 chars:', len(encoded))


if __name__ == '__main__':
    main()
