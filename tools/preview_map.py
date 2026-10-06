#!/usr/bin/env python3
"""Render tools/build_map.py's world grid to a PNG for checking coastlines (needs Pillow).

Usage: python3 tools/preview_map.py out.png [--cities]
--cities marks the conquest cities read from dist/engine.js (CITY_DATA lines: [name, lon, lat, ...]).
"""
import math
import re
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import build_map as bm  # noqa: E402

COLORS = {'.': (34, 84, 128), 'p': (128, 160, 92), 'f': (58, 104, 58), 'm': (138, 120, 96), 'd': (214, 190, 128),
          's': (226, 234, 240), 'x': (70, 66, 70)}
R = 14
SQ = math.sqrt(3)


def hex_center(c, r):
    return SQ * R * (c + 0.5 * (r & 1)) + R, R * 1.5 * r + R


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'world.png'
    grid = bm.build()
    w = int(SQ * R * (bm.COLS + 0.5) + R)
    h = int(R * 1.5 * (bm.ROWS - 1) + 2 * R)
    img = Image.new('RGB', (w, h), (10, 20, 30))
    d = ImageDraw.Draw(img)
    for r in range(bm.ROWS):
        for c in range(bm.COLS):
            x, y = hex_center(c, r)
            pts = [(x + R * math.cos(math.radians(60 * i - 30)), y + R * math.sin(math.radians(60 * i - 30)))
                   for i in range(6)]
            d.polygon(pts, fill=COLORS[grid[r][c]], outline=(20, 30, 40))
            if c % 10 == 0 and r % 4 == 0:
                d.text((x - 6, y - 6), f'{c},{r}', fill=(255, 255, 0))
    if '--cities' in sys.argv:
        src = open(__file__.rsplit('/', 2)[0] + '/dist/engine.js').read()
        for m in re.finditer(r"\['([^']+)', (-?[\d.]+), (-?[\d.]+), '(\w+)'", src):
            name, lon, lat, owner = m.group(1), float(m.group(2)), float(m.group(3)), m.group(4)
            c, r = bm.hex_of(lon, lat)
            x, y = hex_center(c, r)
            col = {'britannia': (180, 120, 255), 'eu': (90, 150, 255), 'cf': (255, 90, 70)}.get(owner, (200, 200, 200))
            d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=col, outline=(0, 0, 0))
            d.text((x + 6, y - 6), name[:10], fill=(255, 255, 255))
    img.save(out)


if __name__ == '__main__':
    main()
