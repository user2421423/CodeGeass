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
[Code Geass wiki](https://codegeass.fandom.com/wiki/Knightmare_Frame), paraphrased. This is an unofficial fan game.

## Published images

The game ships **28 Knightmare sprites and 34 commander portraits** in `dist/assets/art/`. These include imagery
from Code Geass anime/design material and manga, cropped or isolated for in-game use. They remain the property
of their respective copyright holders, including the Code Geass production rights holders. The wiki's text
license does not license the studio artwork.

- The owner-supplied `local-art.zip` provided 25 units and 13 portraits. The previous handoff identifies Code
  Geass Wiki as the download source; exact original image URLs were not included in the archive. The archive
  checksum and all supplied image IDs are recorded in `dist/assets/art/sources.json` without inventing URLs.
- Another 21 portraits were cropped from rendered images linked by their Code Geass Wiki character pages.
  The three replacement units (Alexander Type-02, Alexander Valiant and Zetland) were isolated as single front
  views from rendered design sheets. Exact page URLs, image URLs and processing notes are recorded per image
  in `dist/assets/art/sources.json`.
- Guren Type-Hei, Wang Hu, Panzer-Wespe and Fernando Noriega retain the original drawn fallbacks. Every imported
  image also has a drawn fallback if it fails to load.

## Preparing and publishing art

Raw downloads and the working `dist/local-art/` folder stay ignored. The broad `*.png` ignore was removed so
finished public PNGs can be tracked. Run `tools/local_art_prepare.py` to remove unit backgrounds and crop portraits
using the hand-picked boxes in `crops.json`. If local recipes are absent, it uses the tracked
`tools/art-crops.json` and `tools/art-backgrounds.json`. Background seeds clear enclosed gaps while keeping white
armor. Preparation fails on empty sprites and out-of-bounds crops and writes each finished image atomically.
For the replacement design sheets, `tools/extract_art_sheet.py /path/to/source-views` uses the recorded outline
recipes at their original 1363×936 capture viewport before preparation.

Run `python3 tools/publish_art.py` on the processed folder. It fully decodes images, accepts only known unit/commander
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
artwork is updated.
