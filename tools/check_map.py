#!/usr/bin/env python3
"""Fail if the map in dist/engine/world.js changed outside the hexes that are allowed to change.

tools/data/map_locked.txt is the approved map, one row per line. Only hexes in build_map.py's REDRAW regions and its
FIX_LAND / FIX_SEA lists may differ from it; anything else is an accidental edit. After approving a map change,
refresh the lock:  python3 tools/check_map.py --update
Also fails if world.js is out of date with build_map.py (run build_map.py --inject). Needs only the standard library.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_map as bm  # noqa: E402

LOCK = os.path.join(HERE, 'data', 'map_locked.txt')
WORLD = os.path.join(HERE, '..', 'dist', 'engine', 'world.js')


def world_rows():
    src = open(WORLD).read()
    return re.findall(r"'([.pfmdsx]+)'", src.split('// <world>')[1].split('// </world>')[0])


def main():
    rows = world_rows()
    if '--update' in sys.argv:
        open(LOCK, 'w').write('\n'.join(rows) + '\n')
        print('map lock updated')
        return 0
    locked = open(LOCK).read().split()
    allowed = {h for region in bm.REDRAW.values() for h in bm.region_hexes(region['bands'])}
    allowed |= set(bm.FIX_LAND) | set(bm.FIX_SEA)
    stray = [(c, r) for r in range(bm.ROWS) for c in range(bm.COLS)
             if rows[r][c] != locked[r][c] and (c, r) not in allowed]
    built = [''.join(row) for row in bm.build()]
    problems = []
    if stray:
        problems.append(f'{len(stray)} hexes changed outside the allowed regions: {stray[:20]}')
    if built != rows:
        problems.append('dist/engine/world.js is out of date: run python3 tools/build_map.py --inject dist/engine/world.js')
    for p in problems:
        print('FAIL:', p)
    if not problems:
        print(f'map OK: {sum(rows[r][c] != locked[r][c] for r in range(bm.ROWS) for c in range(bm.COLS))} hexes '
              'differ from the lock, all inside the redrawn regions and fix lists')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
