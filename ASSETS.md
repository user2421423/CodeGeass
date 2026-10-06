# Knightmare Conquest visual assets

There are no image files. All artwork is original and drawn in code at runtime by `dist/art.js`:

- **Knightmare Frames:** one parametric SVG rig (`SPECS`) with body plans (humanoid, giant, insect, dome, box, egg,
  tank, tripod, fortress), heads, shoulders, weapons and back gear, painted per frame. Neutral garrisons are
  repainted khaki.
- **Cities:** city, capital and fortress icons per faction.
- **Commander portraits:** drawn busts (`LOOKS`: hair, eyes, uniform and accessories). They are original character
  designs in each power's colors, not likenesses of the show's characters; the commander's name, rank and abilities
  come from the engine.
- **Map:** terrain, territory, borders and the minimap are painted on the canvas each frame.
- **Icons** (`dist/icons.js`) are inline SVG.

Unit, character and place names, roles and short lore notes follow the
[Code Geass wiki](https://codegeass.fandom.com/wiki/Knightmare_Frame) (CC-BY-SA), paraphrased. No images or text
were copied from the wiki or the anime. Unofficial fan game.

## Using your own art (optional, local only)

`dist/local-art/` is git-ignored. Put your own images there (`units/<knightmare id>.png`,
`portraits/<commander id>.jpg`), run `python3 tools/local_art_manifest.py`, and the game shows them on your machine
over the drawn art; anything missing keeps the drawing. See `dist/local-art/README.md`. The repository and the
published site ship none of it. If you ever commit files from that folder, they become public on GitHub Pages, so
only do that with art you have the rights to publish.
