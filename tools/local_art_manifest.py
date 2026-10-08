#!/usr/bin/env python3
"""Write dist/local-art/manifest.json from the files in dist/local-art/units, portraits and buildings.

A file's name (without extension) must be a Knightmare id (units/) or a commander id (portraits/), as listed in
dist/engine/frames.js and commanders.js. Existing focus settings ("fx"/"fy") in the manifest are kept. Prints the
ids that have no file.
"""
import json
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist')
ART = os.path.join(ROOT, 'local-art')
EXT = ('.png', '.jpg', '.jpeg', '.webp', '.gif')


def ids(src, start, end):
    block = src[src.index(start):src.index(end)]
    return re.findall(r'^    (\w+): \{$', block, re.M)


def known_ids(dist=ROOT):
    """Knightmare and commander ids from the engine's data files (dist/engine/frames.js and commanders.js)."""
    frames = open(os.path.join(dist, 'engine', 'frames.js')).read()
    commanders = open(os.path.join(dist, 'engine', 'commanders.js')).read()
    return {
        'units': ids(frames, 'const KNIGHTMARES = {', 'const LINEUPS ='),
        'portraits': ids(commanders, 'const COMMANDERS = {', 'const RANKS'),
        'buildings': ['city', 'port'],  # one picture each, used for every power
    }


def main(art=ART):
    known = known_ids()
    path = os.path.join(art, 'manifest.json')
    old = json.load(open(path)) if os.path.exists(path) else {}
    manifest = {}
    for kind in known:
        manifest[kind] = {}
        folder = os.path.join(art, kind)
        files = sorted(os.listdir(folder)) if os.path.isdir(folder) else []
        for f in files:
            stem, ext = os.path.splitext(f)
            if ext.lower() not in EXT:
                continue
            if stem not in known[kind]:
                print(f'  skipped {kind}/{f}: "{stem}" is not a known id')
                continue
            prev = old.get(kind, {}).get(stem)
            entry = f'{kind}/{f}'
            if isinstance(prev, dict):
                entry = {**prev, 'src': entry}
            manifest[kind][stem] = entry
        missing = [i for i in known[kind] if i not in manifest[kind]]
        print(f'{kind}: {len(manifest[kind])} of {len(known[kind])} have a file')
        if missing:
            print('  missing:', ', '.join(missing))
    os.makedirs(art, exist_ok=True)
    json.dump(manifest, open(path, 'w'), indent=2)
    print('wrote', os.path.normpath(path))


if __name__ == '__main__':
    main()
