# Commander portrait refresh — 12 October 2026

Feature branch: `feature/commander-portrait-audit-fixes-20261012` (not merged into main).

## Scope
- Replaces the 24 entries flagged in the portrait audit; all 100 roster IDs remain intact.
- Adds 24 first-pass checked-in portraits plus 5 second-pass 320×320 JPEG replacements; both art manifests now reference the latest images.
- Keeps commander statistics, faction access, game rules, other artworks, existing saves, and older asset binaries untouched.
- Keeps a record of art sources and caveats in `tools/portrait-refresh-20261012.json`.

## Visual changes
- Reframed the seven E.U. support characters (Sarah, Olivia, Hilda, Chloe, Kate, Sophie and Joe) using front-facing full-resolution *Akito the Exiled* official character sheets.
- Zero now shows his signature helmet rather than duplicating the unmasked Emperor Lelouch portrait.
- Ichijiku now shows the named character instead of the unrelated two-person illustration.
- Zi Dien, Vritra, Oldrin, Marrybell, Nonette and Benio use individual color character artwork instead of partial bodies or multiperson sheets.
- Tianzi, Pierre, Cheng Zhong and Huang Qian were recropped and/or sharpened. Original lower-resolution source details cannot be recovered by upscaling.
- Fernando, Xu Lifeng and Colonel Ren now have distinct, region-colored head-and-shoulders crops from their authentic manga portraits. Their clothing/hair palette remains interpretive fan coloring (not official canon colors).
- Indira Tharoor now uses his published full-color *Lost Stories / Pure Almaria* character artwork with his real face, replacing the headless placeholder.
- Marirrosa Noriega now uses her published full-color *OZ the Reflection O2* photo-novel illustration, replacing the monochrome manga tint.

## Five-portrait finalization

All five entries flagged as incomplete now show locally hosted, colored character-specific portraits. There are no headless placeholders. Color provenance and the limitations of fan colorizations are recorded in `tools/portrait-refresh-20261012.json`.

## Release expectations
1. Verify all 100 portrait paths in `dist/assets/art/manifest.json` resolve to local tracked images.
2. Verify the startup `manifest.js` mirrors the JSON manifest.
3. Review the 24 portraits in a browser, including 96px/64px icons.
4. Review the five follow-up portraits: Indira and Marirrosa have published color originals; Fernando, Xu Lifeng, and Colonel Ren are fan-colorized authentic manga panels, and official palettes have not been established.

No gameplay JavaScript, art loading mechanism, save serialization or commander IDs were altered.
