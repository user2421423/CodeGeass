#!/usr/bin/env python3
"""Turn your own raw images into game-ready local art (needs Pillow and NumPy).

Put raw files, named by id, in dist/local-art/raw/units/ and dist/local-art/raw/portraits/:

  raw/units/glasgow.jpg       -> units/glasgow.png       white background removed, trimmed, max 640 px
  raw/portraits/suzaku.jpg    -> portraits/suzaku.jpg    cropped to 13:16 around the middle-top, max 390 x 480

Run:  python3 tools/local_art_prepare.py            (then reload the game)

Options:
  crops.json   dist/local-art/crops.json maps a portrait id to a pixel box in the raw image, [x0, y0, x1, y1],
               for character sheets or wide shots:  { "suzaku": [380, 40, 520, 215] }
  --no-cutout  keep unit backgrounds as they are (use for files that already have transparency)
  --tolerance  how far from pure white still counts as background (default 40)

Everything under dist/local-art is git-ignored, so none of it is committed or deployed. The script always rebuilds
the outputs from raw/, so you can re-run it after changing crops or replacing a raw file. It also refreshes
manifest.json (see local_art_manifest.py), which the game reads.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import local_art_manifest as manifest  # noqa: E402

EXT = ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp')
UNIT_MAX = 640
PORTRAIT_MAX = (390, 480)
RATIO = 13 / 16


def trim(im):
    box = im.getchannel('A').getbbox()
    if not box:
        raise ValueError('Image is fully transparent after background removal')
    return im.crop(box)


def cutout(im, tolerance):
    """Remove a white-ish background by flood fill from the corners, then clear the light fringe."""
    im = im.convert('RGBA')
    if im.getchannel('A').getextrema()[0] < 255:
        return trim(im)  # already has transparency
    w, h = im.size
    for pt in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if min(im.getpixel(pt)[:3]) >= 225 and im.getpixel(pt)[3] == 255:
            ImageDraw.floodfill(im, pt, (255, 255, 255, 0), thresh=tolerance)
    a = np.array(im)
    clear = a[..., 3] == 0
    near = np.array(Image.fromarray((clear * 255).astype('uint8')).filter(ImageFilter.MaxFilter(3))) > 0
    light = a[..., :3].min(axis=2) >= 215
    a[..., 3][near & light & ~clear] = 0
    return trim(Image.fromarray(a, 'RGBA'))


def unit(path, tolerance, do_cutout):
    im = Image.open(path)
    im = cutout(im, tolerance) if do_cutout else trim(im.convert('RGBA'))
    im.thumbnail((UNIT_MAX, UNIT_MAX), Image.LANCZOS)
    return im


def portrait(path, box):
    im = Image.open(path).convert('RGB')
    if box:
        w, h = im.size
        if (not isinstance(box, list) or len(box) != 4
                or not all(isinstance(v, (int, float)) for v in box)
                or not 0 <= box[0] < box[2] <= w or not 0 <= box[1] < box[3] <= h):
            raise ValueError(f'Portrait crop must be a positive box inside the {w}x{h} image')
        im = im.crop(tuple(box))
    w, h = im.size
    cw = min(w, h * RATIO)
    ch = cw / RATIO
    x0 = (w - cw) / 2
    im = im.crop((round(x0), 0, round(x0 + cw), round(ch)))
    im.thumbnail(PORTRAIT_MAX, Image.LANCZOS)
    return im


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dir', default=manifest.ART, help='local art folder (default: dist/local-art)')
    ap.add_argument('--tolerance', type=int, default=40)
    ap.add_argument('--no-cutout', action='store_true')
    args = ap.parse_args()
    root = os.path.abspath(args.dir)
    crops_path = os.path.join(root, 'crops.json')
    crops = json.load(open(crops_path)) if os.path.exists(crops_path) else {}
    done = 0
    failed = 0
    for kind in ('units', 'portraits'):
        raw = os.path.join(root, 'raw', kind)
        out = os.path.join(root, kind)
        if not os.path.isdir(raw):
            continue
        os.makedirs(out, exist_ok=True)
        for f in sorted(os.listdir(raw)):
            stem, ext = os.path.splitext(f)
            if ext.lower() not in EXT:
                continue
            try:
                if kind == 'units':
                    unit(os.path.join(raw, f), args.tolerance, not args.no_cutout).save(os.path.join(out, stem + '.png'), optimize=True)
                else:
                    portrait(os.path.join(raw, f), crops.get(stem)).save(os.path.join(out, stem + '.jpg'), quality=90)
                done += 1
            except Exception as e:  # keep going: one bad file should not stop the rest
                print(f'  failed {kind}/{f}: {e}')
                failed += 1
    print(f'prepared {done} image(s)')
    if failed:
        print(f'{failed} image(s) failed. Manifest was not rebuilt; fix these before publishing.', file=sys.stderr)
        return 1
    manifest.main(root)
    return 0


if __name__ == '__main__':
    sys.exit(main())
