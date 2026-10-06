# Local art (not committed, not deployed)

Put your own images here to replace the drawn art on your machine. Everything in this folder except this file is
git-ignored, so it is never committed, pushed or published. Anything you do not provide keeps the drawn art.

## Quick way: drop in raw files and let the helper prepare them

```
dist/local-art/raw/units/<knightmare id>.jpg|png|webp      e.g. glasgow.jpg, shen_hu.png
dist/local-art/raw/portraits/<commander id>.jpg|png|webp   e.g. suzaku.jpg, leila.png
dist/local-art/crops.json                                  optional, see below
```

Then run `python3 tools/local_art_prepare.py` (needs `pip install pillow numpy`) and reload the game. It removes
white backgrounds from unit images, trims and resizes them, crops portraits to the 13:16 frame, writes the results to
`units/` and `portraits/`, rebuilds `manifest.json` and lists the ids that still have no file. Re-run it any time;
it always rebuilds from `raw/`.

For character sheets or wide shots, give a pixel box per portrait in `crops.json` (`[x0, y0, x1, y1]` in the raw
image): `{ "suzaku": [380, 40, 520, 215] }`. Files that already have a transparent background are kept as they are;
use `--no-cutout` to skip background removal entirely.

## By hand

Place finished files at `units/<id>.png` and `portraits/<id>.jpg`, then run `python3 tools/local_art_manifest.py`.
To move a portrait's crop, add a focus to its manifest entry:
`"suzaku": { "src": "portraits/suzaku.jpg", "fx": 0.4, "fy": 0.2 }` (positions inside the image, 0 to 1).

Ids are the keys in `dist/engine.js` (`KNIGHTMARES` and `COMMANDERS`); the scripts print the full list of missing ids.

## Publish the finished images

After preparation, run `python3 tools/publish_art.py`. This copies only processed units and portraits into tracked
`dist/assets/art/` and generates the public manifest. Commit that folder to publish the images on GitHub Pages.
This working folder and raw downloads remain ignored. See the repository README for the complete commands.
