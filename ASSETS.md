# Knightmare Conquest visual assets

Every unit and commander displays its published image directly from `dist/assets/art/manifest.json`
and its generated startup script. No procedural Knightmare or portrait substitutes are displayed:

- **Knightmare Frames:** published sprites only; empty space until the image loads.
- **Cities:** city, capital and fortress icons per faction.
- **Commander portraits:** published character portraits only; no substitute faces.
- **Map:** terrain, territory, borders and the minimap are painted on the canvas each frame.
- **Icons** (`dist/icons.js`) are inline SVG.

Unit, character and place names, roles and short lore notes follow the
[Code Geass wiki](https://codegeass.fandom.com/wiki/Knightmare_Frame), paraphrased. This is an unofficial fan game.

## Published images

The game ships **70 Knightmare sprites and 58 commander portraits** in `dist/assets/art/`. These include imagery
from Code Geass anime/design material and manga, cropped or isolated for in-game use. They remain the property
of their respective copyright holders, including the Code Geass production rights holders. The wiki's text
license does not license the studio artwork.

- The owner-supplied `local-art.zip` provided 25 units (17 are still in the lineup) and 13 portraits. The previous handoff identifies Code
  Geass Wiki as the download source; exact original image URLs were not included in the archive. The archive
  checksum and all supplied image IDs are recorded in `dist/assets/art/sources.json` without inventing URLs.
- Another 21 portraits were cropped from rendered images linked by their Code Geass Wiki character pages.
  Alexander Type-02 was isolated as a single front view from a rendered design sheet. The twelve frames added by
  the lineup change of October 2026 come from their Code Geass Wiki pages; for the game's configurations without
  artwork of their own, the closest wiki image stands in (Akito's Alexander for the Type-02 Elite, the
  Akatsuki-Upgrade for the Akatsuki Heavy Weapons). Exact page URLs, image URLs and processing notes are recorded
  per image in `dist/assets/art/sources.json`.
- The commander expansion's 22 portraits and the nine Elite Force sprites came with their own source records.
  Five Elite Force pictures were figure photos or screenshots and three kept a white background; they were replaced
  with wiki reference renders (Royal Guard Gloucester, Mordred, Tohdoh's Gekka, Shinkirō, Guren Mk-II) or cut out
  (Gawain, Lancelot, Lancelot Albion) so every unit sprite has a transparent background. Burai and Raikō come from
  their wiki pages; Zangetsu and Shen Hu reuse earlier archive art; the Akatsuki Flight-Enabled shares the Air Glide
  render; Emperor Lelouch shares Zero's portrait.
- Owner-supplied artwork (added 2026-10-07 from the `feature/canon-unit-art-v2` branch; origin not recorded in this
  repository) covers Vercingetorix, Ahura Mazda, Canterbury, Siegfried, Portman, Portman II, Panzer-Frosch,
  Panzer-Frosch II, the Japanese Army tank and rocket artillery, and the carriers: all three powers share one
  insignia-free generic carrier (three hulls, from the canon Britannian Carrier-Battleship's silhouette). Backgrounds
  were removed with `tools/local_art_prepare.py`; the enclosed-gap seeds are in `tools/art-backgrounds.json`.
- Shui Gun-Ru (green and red) and Shui Gun-Ru II (green and gold) are owner-supplied artwork (added 2026-10-07; origin
  not recorded). Their grey backdrop and floor shadow were removed by an edge flood fill of light neutral grey.
- Every Knightmare type and commander has published art. Missing or failed image loads remain blank.

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
