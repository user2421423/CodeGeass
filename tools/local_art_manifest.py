#!/usr/bin/env python3
"""Write dist/local-art/manifest.json from the files in dist/local-art/units and dist/local-art/portraits.

A file's name (without extension) must be a Knightmare id (units/) or a commander id (portraits/), as listed in
dist/engine.js. Existing focus settings ("fx"/"fy") in the manifest are kept. Prints the ids that have no file.
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


def main(art=ART):
    src = open(os.path.join(ROOT, 'engine.js')).read()
    known = {
        'units': ids(src, 'const KNIGHTMARES = {', 'const TYPES ='),
        'portraits': ids(src, 'const COMMANDERS = {', 'const NOFX'),
    }
    path = os.path.join(art, 'manifest.json')
    old = json.load(open(path)) if os.path.exists(path) else {}
    manifest = {}
    for kind in ('units', 'portraits'):
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
