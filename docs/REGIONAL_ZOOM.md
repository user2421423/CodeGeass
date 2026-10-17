# Conquest-like regional zoom preview

Branch: `preview/conquest-style-zoom-integrated`.

This improves the seamless performance branch without changing conquest's renderer:

- Regional sea gradients now have fixed world-space endpoints (like the wrapped
  Conquest map), eliminating tile-by-tile blue rectangles and shading seams.
- Both static geography and the separately cached political layer remain
  intact when zooming. Completed previous atlas detail levels are reused
  during camera movement when enough of them are cached for the full viewport.
- Zoomed-out to zoomed-in **and reverse** transitions use a 150 ms crossfade,
  with a complete view at each end and no partially updated rectangular tiles.
- The map no longer deliberately swaps to the static WebP while the camera
  is moving if detailed tiles are already fully cached.
- Simplified regional unit and city markers retain useful minimum screen
  diameter while zoomed out, without altering Conquest's existing sizing.
- Existing map movement controls, hex sizes, assets and gameplay logic remain.

## Browser test

```sh
node tools/build_sources.cjs
npm install --prefix /tmp/zoom-deps --no-save --no-package-lock playwright-core@1.57.0
NODE_PATH=/tmp/zoom-deps/node_modules node tools/check-regional-zoom.cjs
```

This launches actual scenarios (Korea, Division of Japan, California,
Australia) and traverses 18 → 21.8 → 22.2 → 26 → 32 → 26 → 22.2 → 21.8 → 18
pixels per hex, covering both directions across the detail threshold. It
checks for browser exceptions, empty canvas frames and world-anchored
geographic gradients, and saves screenshot samples and renderer statistics.
The preview-branch workflow uploads them as a build artifact.

## Compatibility merge

These fixes were rebased onto the current `main` renderer. The renderer's
byte-budget cache eviction, viewport-prioritized idle tile scheduling,
compressed map asset pipeline, and full current-ownership rendering
remain intact. The original preview branch is preserved for comparison.
