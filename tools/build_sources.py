#!/usr/bin/env python3
"""Builds the browser bundles listed in tools/bundles.json without Node (same as tools/build_sources.cjs)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
for target, parts in json.loads((ROOT / 'tools/bundles.json').read_text()).items():
    (ROOT / target).write_text(''.join((ROOT / p).read_text(encoding='utf-8') for p in parts), encoding='utf-8')
    print('Built ' + target)
