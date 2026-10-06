#!/usr/bin/env python3
"""Isolate the three full-body replacement units from their saved rendered design sheets.

Input: <id>-source-view.jpg at the recorded 1363x936 browser viewport.
The public source URLs and precise outline recipes are recorded alongside the artwork.
Output: transparent raw/units/<id>.png, suitable for local_art_prepare.py.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/local-art/raw/units')
    args = parser.parse_args()
    recipes = json.loads((ROOT / 'tools/art-sheet-recipes.json').read_text())
    args.output.mkdir(parents=True, exist_ok=True)
    for key, recipe in recipes.items():
        image = Image.open(args.input / f'{key}-source-view.jpg').convert('RGBA')
        if image.size != (1363, 936):
            raise ValueError(f'{key}: expected the recorded 1363x936 source view')
        mask = Image.new('L', image.size, 0)
        ImageDraw.Draw(mask).polygon([tuple(p) for p in recipe['polygon']], fill=255)
        pixels = np.array(image)
        distance = np.linalg.norm(pixels[..., :3].astype('int16') - np.array(recipe['background']), axis=2)
        pixels[..., 3] = np.array(mask)
        pixels[..., 3][distance < recipe['distance']] = 0
        image = Image.fromarray(pixels)
        image = image.crop(image.getchannel('A').getbbox())
        image.save(args.output / f'{key}.png', optimize=True)


if __name__ == '__main__':
    main()
