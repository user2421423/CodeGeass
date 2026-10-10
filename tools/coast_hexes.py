#!/usr/bin/env python3
"""Choose the world map's coast hexes from the GSHHG coastline the game draws (dist/ui/geography-data.js).

A coast hex is part land, part water: land units stand and fight there as on land, and warships sail through it.
  - a sea hex becomes coast when at least SEA_TO_COAST of its area is land (Cornwall, capes, coastal slivers);
  - a land hex becomes coast when less than half of its area is land (thin spits and mostly-water coastlines).
Never converted: city, port, mine and starting-unit hexes; deliberate sea hexes (HEX_SEA / FIX_SEA: straits, the
removed Arctic islands); deliberate land hexes stay closed to ships (HEX_LAND / FIX_LAND); and the hexes around the
strategic straits. A hex is only converted when it touches one stretch of shore (or stretches that meet again within
a few hexes, as around a small bay), so coast never joins two landmasses or opens a new channel for ships.

Requires shapely. Run, then rebuild the map:
  node tools/dump_world_state.cjs > /tmp/world-state.json
  python3 tools/coast_hexes.py /tmp/world-state.json
  python3 tools/build_map.py --inject dist/engine/world.js && python3 tools/check_map.py --update
"""
from collections import deque
import json
from pathlib import Path
import sys

from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import build_map as bm

SEA_TO_COAST = 0.15
OUT = ROOT / 'tools/data/coast_hexes.json'
STRAITS = {'Suez': (32.5, 30.5), 'Gibraltar': (-5.5, 36.5), 'Bosporus': (29, 41), 'Dardanelles': (26.5, 40.2),
           'Malacca': (101.5, 3), 'Sunda': (105.8, -5.8), 'Lombok': (116, -8.5), 'Taiwan Strait': (119.5, 24.5),
           'Korea Strait': (129.5, 34.5), 'Bab-el-Mandeb': (43.4, 12.8), 'Hormuz': (56.5, 26.5), 'Otranto': (19, 40),
           'Dover': (1, 51.3), 'Panama': (-80, 9), 'Bering': (-169, 65)}


def ring(c, r):
    """The six neighbours in order around the hex (odd-r offset, wrapping east-west)."""
    odd = r & 1
    return [((c + dc) % bm.COLS, r + dr) for dc, dr in
            [(1, 0), (odd, -1), (odd - 1, -1), (-1, 0), (odd - 1, 1), (odd, 1)]]


def on_map(k):
    return 0 <= k[1] < bm.ROWS


def stretches(k, test):
    """Groups of consecutive neighbours that pass test (stretches of shore or water around the hex)."""
    ks = ring(*k)
    vals = [on_map(n) and test(n) for n in ks]
    if all(vals):
        return [ks]
    if not any(vals):
        return []
    start = vals.index(False)
    groups, cur = [], []
    for j in range(1, 7):
        i = (start + j) % 6
        if vals[i]:
            cur.append(ks[i])
        elif cur:
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return groups


def rejoin(a, b, test, avoid, depth=4):
    """True when two stretches meet again within depth steps without crossing the hex itself (a small bay)."""
    goal, seen = set(b), set(a) | {avoid}
    q = deque((k, 0) for k in a)
    while q:
        k, d = q.popleft()
        if k in goal:
            return True
        if d < depth:
            for n in ring(*k):
                if on_map(n) and n not in seen and test(n):
                    seen.add(n)
                    q.append((n, d + 1))
    return False


def single_shore(k, test):
    groups = stretches(k, test)
    return bool(groups) and all(rejoin(groups[0], h, test, k) for h in groups[1:])


def land_shares(grid):
    text = (ROOT / 'dist/ui/geography-data.js').read_text()
    geo = json.loads(text.split('const GEOGRAPHY_SHAPES = ', 1)[1].rsplit(';', 1)[0])
    shapes = []
    for ring_pts in geo['land']:
        p = Polygon(ring_pts)
        if not p.is_valid:
            p = make_valid(p)
        if not p.is_empty and p.area > 1e-8:
            shapes.append(p)
    tree = STRtree(shapes)
    out = {}
    for r in range(bm.ROWS):
        for c in range(bm.COLS):
            x, y = bm.center(c, r)
            h = bm.DLAT * 2 / 3
            hexagon = Polygon([(x, y + h), (x + 1, y + h / 2), (x + 1, y - h / 2), (x, y - h), (x - 1, y - h / 2), (x - 1, y + h / 2)])
            clips = [shapes[int(i)].intersection(hexagon) for i in tree.query(hexagon) if shapes[int(i)].intersects(hexagon)]
            area = 0 if not clips else clips[0].area if len(clips) == 1 else unary_union(clips).area
            out[(c, r)] = max(0.0, min(1.0, area / hexagon.area))
    return out


def main(state_path):
    state = json.loads(Path(state_path).read_text())
    grid = bm.build(coast=False)
    terrain = {(c, r): grid[r][c] for r in range(bm.ROWS) for c in range(bm.COLS)}
    share = land_shares(grid)
    keep = {(s['c'], s['r']) for s in state['stations']} | {(s['c'], s['r']) for s in state['sites']}
    keep |= {(s['portAt']['c'], s['portAt']['r']) for s in state['stations'] if s.get('portAt')}
    keep |= {(u['c'], u['r']) for u in state['units'] if isinstance(u['c'], int)}
    keep |= set(bm.HEX_SEA) | set(bm.FIX_SEA)
    for lon, lat in STRAITS.values():
        k = bm.hex_of(lon, lat)
        keep |= {k, *[n for n in ring(*k) if on_map(n)]}
    land_intent = set(bm.HEX_LAND) | set(bm.FIX_LAND)
    candidates = [k for k, t in terrain.items() if k not in keep and (
        (t == '.' and share[k] >= SEA_TO_COAST) or (t not in '.x' and share[k] < 0.5 and k not in land_intent))]
    # Most contradicted first, so the clearest coastline decides each shore.
    candidates.sort(key=lambda k: (-abs(share[k] - (0 if terrain[k] == '.' else 1)), k[1], k[0]))
    cur = dict(terrain)
    walkable = lambda k: cur[k] not in '.x'
    navigable = lambda k: cur[k] in '.w'
    coast = []
    for k in candidates:
        if single_shore(k, walkable if terrain[k] == '.' else navigable):
            cur[k] = 'w'
            coast.append(k)
    coast.sort(key=lambda k: (k[1], k[0]))
    OUT.write_text(json.dumps({'about': 'Coast hexes chosen by tools/coast_hexes.py; build_map.py applies them last.',
                               'hexes': [list(k) for k in coast]}, separators=(',', ':')) + '\n')
    print(f'{len(coast)} coast hexes ({sum(terrain[k] == "." for k in coast)} from sea, '
          f'{sum(terrain[k] != "." for k in coast)} from land) written to {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '/tmp/world-state.json')
