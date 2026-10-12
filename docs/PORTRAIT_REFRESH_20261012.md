# Commander portrait refresh — 12 October 2026

Feature branch: `feature/commander-portrait-audit-fixes-20261012` (not merged into main).

## Scope
- Replaces the 24 entries flagged in the portrait audit; all 100 roster IDs remain intact.
- Adds 24 checked-in, locally hosted 320×320 JPEG files and updates both art manifests.
- Keeps commander statistics, faction access, game rules, other artworks, existing saves, and older asset binaries untouched.
- Keeps a record of art sources and caveats in `tools/portrait-refresh-20261012.json`.

## Visual changes
- Reframed the seven E.U. support characters (Sarah, Olivia, Hilda, Chloe, Kate, Sophie and Joe) using front-facing full-resolution *Akito the Exiled* official character sheets.
- Zero now shows his signature helmet rather than duplicating the unmasked Emperor Lelouch portrait.
- Ichijiku now shows the named character instead of the unrelated two-person illustration.
- Zi Dien, Vritra, Oldrin, Marrybell, Nonette and Benio use individual color character artwork instead of partial bodies or multiperson sheets.
- Tianzi, Pierre, Cheng Zhong and Huang Qian were recropped and/or sharpened. Original lower-resolution source details cannot be recovered by upscaling.
- Fernando, Marirrosa, Xu Lifeng and Colonel Ren are modestly colored versions of authentic monochrome manga portraits; the added tint is not asserted to be the official color palette.
- Indira Tharoor remains **provisional**: the available local art is headless and no verified face source was found. The new asset clearly labels the image unverified rather than inventing a face or showing another character as Indira.

## Release expectations
1. Verify all 100 portrait paths in `dist/assets/art/manifest.json` resolve to local tracked images.
2. Verify the startup `manifest.js` mirrors the JSON manifest.
3. Review the 24 portraits in a browser, including 96px/64px icons.
4. Seek verified character facial art for Indira and higher-quality/color sources for the four manga-only commanders before calling those five fully final.

No gameplay JavaScript, art loading mechanism, save serialization or commander IDs were altered.
