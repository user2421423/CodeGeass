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

`dist/local-art/` is git-ignored. Put your own raw images in `dist/local-art/raw/units/<knightmare id>.*` and
`raw/portraits/<commander id>.*`, run `python3 tools/local_art_prepare.py`, and the game shows them on your machine
over the drawn art; anything missing keeps the drawing. See `dist/local-art/README.md`. The repository and the
published site ship none of it. If you ever commit files from that folder, they become public on GitHub Pages, so
only do that with art you have the rights to publish.

## Notice and permission terms

The game shows this notice in the start menu, the game menu (credits) and the field manual: "Code Geass and related
characters are trademarks and copyrighted property. This project is an unofficial fan creation and is not officially
affiliated with or endorsed by the copyright holders."

Per the owner's email from the rights holders, the permission to use Code Geass characters, elements and lore in a
fan game is limited and non-exclusive, and conditional on: free distribution with no paid access, microtransactions,
crowdfunding or ad revenue; the visible notice above; no content that violates community guidelines or damages the
brand; and the holders may revoke it at any time. Keep the game free and keep the notice.

The rights holders' follow-up email extends the permission to official imagery and artwork from the anime, provided
the artwork is used strictly within the game itself and the non-commercial and attribution terms are kept. This
repository therefore ships no studio artwork: the owner supplies it locally, and anything they choose to publish
(for example by committing files from `dist/local-art/`) is their decision under those terms.
