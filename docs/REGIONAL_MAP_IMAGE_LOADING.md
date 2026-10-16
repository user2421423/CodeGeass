# Smooth regional map imagery

The main source for this branch is `preview/map-render-performance`.

## Why coastline tiles looked mismatched

During the first performance optimization, each detailed map chunk appeared
immediately when its asynchronous render completed. The 1440x900 static
scenario preview underneath was enlarged far beyond its intended gallery
resolution, causing conspicuous blocky coastlines and sharp vertical/horizontal
boundaries between differently resolved tiles.

## Updated presentation

- `dist/scenario-hires/*.webp` supplies a 4096x2560 geographic background
  for all regional scenarios, exported from exactly the same world-aligned
  real-coastline painter used to generate the smaller scenario catalogue images.
- The game requests the detailed image while the scenario briefing is open.
  At load time the gallery image is only a temporary network fallback.
- Missing map chunks are built at idle time **without** becoming visible
  individually. When all static and political chunks for the visible camera
  viewport are present, the full detailed image replaces the backdrop
  atomically.
- During active camera motion the complete backdrop stays visible and
  expensive chunk jobs remain deferred. After motion, the detailed atlas
  can reappear without partial coastline seams.
- Territory ownership remains dynamic. The lower zoom uses an independent
  sparse political-delta overlay; tactical zoom uses the separately cached
  political layer. Main gameplay and units are unchanged.

## Generating the image assets

```sh
node tools/build_sources.cjs
npm install --prefix /tmp/hires-deps --no-save --no-package-lock playwright-core@1.57.0
NODE_PATH=/tmp/hires-deps/node_modules node tools/generate-hires-regional-maps.cjs
```

The image-export GitHub Actions workflow commits resulting WebPs to this preview
branch and republishes the game. The 1440x900 scenario catalogue images remain
unchanged.

You can compare strategic navigation using `tools/benchmark_regional_maps.cjs`.
For a tactical comparison, enter a scenario and zoom until the grid/terrain
icons become visible; the map should either be one complete background image
or an entirely detailed image, never a rectangular patchwork.
