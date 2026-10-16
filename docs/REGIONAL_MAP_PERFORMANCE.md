# Regional map performance preview

Current implementation and the seven-map desktop/mobile measurements are documented in
[LAZY_LOADING_MAP_RENDERING.md](performance/LAZY_LOADING_MAP_RENDERING.md).
The historical preview notes below describe the earlier refactor.

Branch: `preview/map-render-performance`

The atlas now stores the immutable geography/terrain separately from the
political ownership/borders. Political changes clear only their separate
cache, while terrain changes increment `mapTerrainRevision` and clear both.

When a scenario's existing troop-free WebP preview is available, the renderer
draws it immediately, then replaces it with detailed regional atlas chunks
rendered in scheduled idle tasks. Each job renders at most one chunk and
requests a repaint; pointer and wheel input never synchronously create
missing chunks after the fallback loads.

The original Conquest rendering and special Bering painters continue to use
the combined legacy path.

## Compare performance in Chrome

```sh
node tools/build_sources.cjs
npm install --prefix /tmp/perf-deps --no-save --no-package-lock playwright-core@1.57.0
NODE_PATH=/tmp/perf-deps/node_modules node tools/benchmark_regional_maps.cjs
```

The script launches real versions of Australia, Division of Japan and
California at 1440x900, pans across 48 deterministic camera positions per
scenario, and reports p50/p95 frame scheduling latency, cache paints,
misses, deferred paints and worst individual atlas chunk paint time.
It writes `regional-map-benchmark.json`; these are measurements from
the machine running the script, not guaranteed device FPS.

The dedicated GitHub Actions workflow runs the same benchmark on this preview
branch and uploads its JSON as an artifact. For a controlled A/B comparison,
run the same tool at the same viewport/device/browser in both revisions.

## Known tradeoffs

* Initial paints before the preview WebP loads may still block; after loading,
  missing chunks use the backdrop and schedule detailed work.
* Under extreme rapid panning the backdrop is briefly lower resolution.
* Territory captured mid-game remains correctly painted once its political
  chunk is rebuilt; the static base remains unchanged.
* Region maps with special Bering-specific painters are intentionally excluded
  from split rendering until validated independently.
