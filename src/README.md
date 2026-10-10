# Editable Code Geass source sections

The five large classic-script entrypoints now have **one editable source of truth** in `src/`.

| Production artifact | Edit these source sections |
| --- | --- |
| `dist/engine.js` | `src/engine/*.part.js` |
| `dist/engine/ai.js` | `src/ai/*.part.js` |
| `dist/missions.js` | `src/missions/*.part.js` |
| `dist/ui/renderer.js` | `src/renderer/*.part.js` |
| `dist/ui/hud.js` | `src/hud/*.part.js` |

Run `node tools/build_sources.cjs` after editing sections. Commit **both** the edited parts and the regenerated `dist/` files. Run `node tools/build_sources.cjs --check` to verify the checked-in output. No npm install is needed.

The sections are **lexically shared source fragments**, not independent JavaScript modules. Keep their ordering in `tools/build_sources.cjs`. Some fragments start or end inside the containing classic-script IIFE, so they are compiled together instead of being executed on their own. This is an intentional, behavior-preserving first step; a future ES-module migration should use explicit imports and exports with targeted regression tests.

Deployment continues to serve `dist/index.html` and its existing scripts. There are no changes to browser script order, globals, game rules, mission IDs, or save formats; generated production files are initially byte-for-byte identical to the originals. Large generated vector coastline data in `dist/ui/geography-data.js` is intentionally not split: its load-time optimization is a separate performance task.

To validate: `node --test tests/core.test.cjs tests/source-parts.test.cjs`, `node tests/ui-smoke.cjs`, `node tools/validate_assets.cjs --tracked`, and `python3 tools/check_map.py`.
