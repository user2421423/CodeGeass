# Local art (not committed, not deployed)

Put your own images here to replace the drawn art on your machine. Everything in this folder except this file is
git-ignored, so it is never committed, pushed or published. Anything you do not provide keeps the drawn art.

```
dist/local-art/
  units/<knightmare id>.png        e.g. glasgow.png, sutherland.png, shen_hu.png  (transparent PNG works best)
  portraits/<commander id>.jpg     e.g. suzaku.jpg, leila.jpg, xingke.jpg
  manifest.json                    written by tools/local_art_manifest.py
```

Run `python3 tools/local_art_manifest.py` after adding or renaming files, then reload the game. The script also
prints which ids still have no file. Portraits are cropped to a 13:16 frame around the middle-top of the image; to
move the crop add a focus to a manifest entry: `"suzaku": { "src": "portraits/suzaku.jpg", "fx": 0.4, "fy": 0.2 }`
(fx and fy are 0–1 positions inside the image).
