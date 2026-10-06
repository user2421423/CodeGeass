# Knightmare Conquest visual assets

Every unit and commander has a drawn fallback in `dist/art.js`. Finished imported images can override these
through the tracked `dist/assets/art/manifest.json` and its generated startup script:

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
[Code Geass wiki](https://codegeass.fandom.com/wiki/Knightmare_Frame) (CC-BY-SA), paraphrased. No imported images are currently present: the image bundle from the previous session was not supplied.
When that bundle is published, add per-image source URLs and credits here; keep studio imagery identified separately
from the wiki’s text license. Unofficial fan game.

## Preparing and publishing art

Raw downloads and the working `dist/local-art/` folder stay ignored. The broad `*.png` ignore was removed so
finished public PNGs can be tracked. Run `tools/local_art_prepare.py` to remove unit backgrounds and crop portraits
using the hand-picked boxes in `crops.json`. Preparation fails on empty sprites and out-of-bounds crops.

Run `python3 tools/publish_art.py` on the processed folder. It verifies images, accepts only known unit/commander
IDs and finished `units/` or `portraits/` paths, preserves portrait focus, and copies only those files to
`dist/assets/art/`. It writes matching JSON and JavaScript manifests. The game registers the public art before
rendering menus, using relative URLs that work under `/CodeGeass/` and when opening `index.html` directly.
On localhost, an optional local manifest can override individual public entries. Missing or failed images retain
the drawings on the map and in menus.

Before deployment, `node tools/validate_assets.cjs --tracked` checks the entrypoint, both manifests, image paths
and signatures, known IDs, focus bounds, Git tracking, and exclusion of raw/local-only images. GitHub Actions runs
this check, the engine/art tests, and the UI smoke check before uploading the site.

## Notice and permission terms

The game shows this notice in the start menu, the game menu (credits) and the field manual: "Code Geass and related
characters are trademarks and copyrighted property. This project is an unofficial fan creation and is not officially
affiliated with or endorsed by the copyright holders."

Per the owner's email from the rights holders, the permission to use Code Geass characters, elements and lore in a
fan game is limited and non-exclusive, and conditional on: free distribution with no paid access, microtransactions,
crowdfunding or ad revenue; the visible notice above; no content that violates community guidelines or damages the
brand; and the holders may revoke it at any time. Keep the game free and keep the notice.

The rights holders' follow-up email extends the permission to official imagery and artwork from the anime, provided
the artwork is used strictly within the game itself and the non-commercial and attribution terms are kept. The owner has requested publication of the finished artwork under those terms. Finished files belong in
`dist/assets/art/`; raw downloads remain excluded. Preserve the notice and record source credits when the
missing bundle is supplied.
