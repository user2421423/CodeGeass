#!/usr/bin/env python3
"""Clip Natural Earth land outlines to the regions tools/build_map.py redraws from real coastlines (REDRAW).

Natural Earth (naturalearthdata.com) is public domain. Download ne_10m_land.geojson once, e.g. from
https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson
then run:  python3 tools/prepare_coast.py ne_10m_land.geojson
It writes tools/data/coast.json: the land rings that touch each region's box, clipped to that box and simplified to
0.01 degrees (far below the 2-degree hex size), so build_map.py stays reproducible offline.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import build_map as bm  # noqa: E402

MARGIN = 1.5  # degrees around each region's hex centers, so whole hexes are covered
TOLERANCE = 0.01


def clip(ring, x0, y0, x1, y1):
    # Sutherland-Hodgman against an axis-aligned box. The even-odd test stays correct for points inside the box.
    def cut(points, inside, cross):
        out = []
        for i, p in enumerate(points):
            q = points[i - 1]
            if inside(p):
                if not inside(q):
                    out.append(cross(q, p))
                out.append(p)
            elif inside(q):
                out.append(cross(q, p))
        return out

    def at_x(x):
        return lambda a, b: (x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]))

    def at_y(y):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y)

    pts = ring
    for inside, cross in (
        (lambda p: p[0] >= x0, at_x(x0)),
        (lambda p: p[0] <= x1, at_x(x1)),
        (lambda p: p[1] >= y0, at_y(y0)),
        (lambda p: p[1] <= y1, at_y(y1)),
    ):
        if not pts:
            break
        pts = cut(pts, inside, cross)
    return pts


def simplify(points, tol):
    # Douglas-Peucker on an open polyline (the ring's closing edge is implicit).
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = points[a], points[b]
        dx, dy = bx - ax, by - ay
        norm = (dx * dx + dy * dy) ** 0.5 or 1e-12
        best, idx = 0, None
        for i in range(a + 1, b):
            px, py = points[i]
            d = abs(dy * (px - ax) - dx * (py - ay)) / norm
            if d > best:
                best, idx = d, i
        if idx is not None and best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(points, keep) if k]


def simplify_ring(ring, tol):
    # A closed ring starts and ends on the same point, so simplify it as two open halves split at the point farthest
    # from the start.
    if ring and ring[0] == ring[-1]:
        ring = ring[:-1]
    if len(ring) < 4:
        return ring
    x0, y0 = ring[0]
    k = max(range(len(ring)), key=lambda i: (ring[i][0] - x0) ** 2 + (ring[i][1] - y0) ** 2)
    return simplify(ring[: k + 1], tol)[:-1] + simplify(ring[k:] + [ring[0]], tol)[:-1]


def main():
    src = json.load(open(sys.argv[1]))
    rings = [ring for f in src['features'] for poly in (
        f['geometry']['coordinates'] if f['geometry']['type'] == 'MultiPolygon' else [f['geometry']['coordinates']]
    ) for ring in poly]
    out = {}
    for name, region in bm.REDRAW.items():
        hexes = bm.region_hexes(region['bands'])
        lons = [bm.center(c, r)[0] for c, r in hexes]
        lats = [bm.center(c, r)[1] for c, r in hexes]
        x0, x1, y0, y1 = min(lons) - MARGIN, max(lons) + MARGIN, min(lats) - MARGIN, max(lats) + MARGIN
        kept = []
        for ring in rings:
            xs, ys = [p[0] for p in ring], [p[1] for p in ring]
            if max(xs) < x0 or min(xs) > x1 or max(ys) < y0 or min(ys) > y1:
                continue
            part = simplify_ring(clip([tuple(p) for p in ring], x0, y0, x1, y1), TOLERANCE)
            if len(part) >= 3:
                kept.append([[round(x, 3), round(y, 3)] for x, y in part])
        out[name] = kept
        print(f'{name}: {len(kept)} rings, {sum(map(len, kept))} points', file=sys.stderr)
    os.makedirs(os.path.join(os.path.dirname(__file__), 'data'), exist_ok=True)
    with open(os.path.join(os.path.dirname(__file__), 'data', 'coast.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
