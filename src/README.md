# Editable Code Geass source sections

The five large classic-script entrypoints now have **one editable source of truth** in `src/`.

| Production artifact | Edit these source sections |
| --- | --- |
| `dist/engine.js` | `src/engine/*.part.js` |
| `dist/engine/ai.js` | `src/ai/*.part.js` |
| `dist/missions.js` | `src/missions/*.part.js` |
| `dist/ui/renderer.js` | `src/renderer/*.part.js` |
| `dist/ui/hud.js` | `src/hud/*.part.js` |

Run `python3 tools/build_sources.py` (or `node tools/build_sources.cjs`) after editing sections, and before playing locally after a `git pull`. The five bundles are build output and are **not committed** (see `.gitignore`); commit only the edited parts. Every CI workflow and the GitHub Pages deploy build them first. Never edit the bundles in `dist/`: the next build overwrites them. No npm install is needed.

The sections are **lexically shared source fragments**, not independent JavaScript modules. Keep their ordering in `tools/bundles.json`, which both build scripts read. Some fragments start or end inside the containing classic-script IIFE, so they are compiled together instead of being executed on their own. This is an intentional, behavior-preserving first step; a future ES-module migration should use explicit imports and exports with targeted regression tests.

Deployment continues to serve `dist/index.html` and its existing scripts. There are no changes to browser script order, globals, game rules, mission IDs, or save formats. Large generated vector coastline data in `dist/ui/geography-data.js` is intentionally not split: its load-time optimization is a separate performance task.

To validate: build, then `node tools/validate_assets.cjs --tracked` and `python3 tools/check_map.py`.
