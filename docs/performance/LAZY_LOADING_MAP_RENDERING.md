# On-demand loading and map rendering

Feature branch: `performance/lazy-loading-map-rendering`.
Baseline: `33aa129` (the subsequent balance-dashboard changes on main do not alter loading, rendering, engine rules, or scenario data).

## Implementation

- `dist/scenario-manifest.js` shares successful script promises, evicts failed requests for retry, and loads only the selected operation's dependency closure. Its bulk `loadScenarios()` hook is now used explicitly by offline image exporters, never at startup or by gameplay menus.
- `dist/scenario-catalog.js` contains serializable menu metadata and dependency lists for all 37 operations. Regenerate it with `node tools/generate-scenario-catalog.cjs` after building when scenario metadata/dependencies change. No scenario builder runs during browsing.
- The full, unchanged geography atlas and Japanese coastlines initialize once, on the first operation that needs them. Keeping one shared atlas avoids regional clipping/data-splitting risks and repeated parsing.
- `dist/ui/core.js`, `campaign-screens.js`, `scenario-screens.js`, and `war-campaign-screen.js` gate battle creation and save migration on required assets. Launches coalesce; a delayed status and retry button retain the existing menu/map during network loading. Cold scenario saves load their rules before migration/version validation.
- `dist/ui/geography.js` restricts a regional chunk's clipping stencil to intersecting hexes, preserving every original vertex. Immutable coastline paths remain shared. Per-battle derived geometry is released when the session changes.
- `src/renderer/04-map-caching.part.js` reprioritizes visible jobs, then a one-chunk viewport buffer; discards obsolete jobs; and starts at most one raster job per idle callback. Navigation defers heavy work for 80 ms. Prefetch completion does not trigger another prefetch scan, preventing eviction/requeue loops at a full budget. A viewport-scoped attempt set also prevents idle unit-animation pulses from re-requesting evicted neighbours until the camera or map generation changes.
- `dist/ui/view.js` requests a coalesced animation frame during each drag, so camera movement does not depend on idle unit-animation pulses; drag paths skip hover/HUD recalculation.
- Atlas caches use LRU byte accounting: 144 MiB desktop and 48 MiB on coarse-pointer devices. Current visible chunks are pinned; DPR and visible texture quality are unchanged. High-resolution decoded backdrop retention is limited to three maps on desktop and one on coarse-pointer devices. Session changes release canvases and derived ownership data.
- Regional captures invalidate only political chunks intersecting changed owners plus the coastline/border dependency buffer. Terrain caches survive. World island/province inference and bespoke combined painters retain conservative invalidation because their visual dependencies can be non-local.
- Already-complete cached viewports remain visible during dragging. Existing zoom-band caches survive zoom changes. World, story, and bespoke combined painters use a current vector navigation image while missing chunks are scheduled; its ownership/terrain revision must match before use.
- `dist/central-america-underlay.js` forwards layer arguments to other maps, releases its per-battle owner cache, and retains its existing river/volcano and opaque layer-cover ordering. The renderer preserves main's existing opaque geographic cover above decorations and in the current-ownership backdrop, verified against baseline pixels.

No engine, AI, scenario definition, geography dataset, artwork, faction color, difficulty, or balance rules were changed. Generated bundles remain ignored and are rebuilt with `node tools/build_sources.cjs` (or the existing Python equivalent).

## Measurement protocol

The existing `tools/benchmark_regional_maps.cjs` now covers both Conquests and all five requested regional examples. It accepts `BROWSER_EXECUTABLE_PATH`, `BENCHMARK_DIST`, `BENCHMARK_OUTPUT`, `BENCHMARK_MOBILE`, `BENCHMARK_STARTUP_ONLY`, and optional `SCENARIO_IDS` filters. The same executable, viewport, seed 11, 48 deterministic camera moves and five zoom targets are used for both revisions. Runs are sequential. Startup is served locally without compression; payload byte totals are decoded JavaScript resource bytes, not a prediction of compressed GitHub Pages transfer sizes.

`frameP50Ms`/`frameP95Ms` measure request-to-animation-frame scheduling latency, as in the original benchmark. `drawP50Ms`/`drawP95Ms` measure actual main-canvas draw calls during the pan sequence. Startup waits for a valid map image with a current ownership layer; an empty first canvas is excluded. Zoom settling conservatively includes queued buffer work, not only visible completion. Heap figures are Chromium's retained JS heap after explicit GC; atlas byte counts measure RGBA surfaces, not total browser/GPU memory. These are controlled headless measurements, not physical-device FPS claims.


## Compatibility evidence

- All 37 scenario dependency closures were loaded from separate fresh browser pages. Each downloaded only its declared scenario files and generated the expected complete map. South China explicitly includes its shared Indochina shoreline.
- 624 full serialized setup fingerprints match baseline: every scenario, every playable side, Normal/Hard/Challenge/Elite, seeds 11 and 29. Baseline references use the existing Node engine where identical and eager baseline Chromium for Japan (which intentionally uses visual shoreline classification in the browser) and Siberia (Node/Chromium differ by one floating-point ulp in a projection constant). A direct eager-vs-lazy Chromium comparison confirms no Siberia state change.
- All 37 real scenario launches, save pack/restoration flows, and returns to the main menu passed. Cold Stonehenge versioned-save restoration passed. World Campaign launch and cold campaign-battle restoration passed. Story launch/restart/restoration across all four difficulties, training, and an Academy drill passed.
- A deliberately aborted scenario download retained the existing screen; retry initialized the battle exactly once. Simultaneous repeated launch requests shared the same transaction.
- Capturing a regional tile retained the exact static canvas, removed the affected political chunk, and retained a distant political chunk.
- Pixel comparisons: both Conquests, Division of Japan, California, Australia, Central America, Rocky Mountains, and Bering at four zooms plus a changed-ownership view: zero differing channels across 40 geographic renders. Static-plus-political presentation was separately compared in Division of Japan, California and Australia: zero differing channels across 15 renders.
- Existing checks passed: `commander_assignment_smoke.cjs`, `world_campaign_elite_levels_smoke.cjs`, and `repair_and_port_healing_smoke.cjs`.
- Chromium touch input at 390x844/DPR 3 triggered camera repaints; 844x390 orientation changes produced the expected DPR-2 backing canvas. Twelve repeated scenario/menu transitions released atlas canvases and retained JS heap remained around 19-20 MB after GC (initial 19.20 MB, final 19.92 MB, including warmed session assets). This is not a measurement of decoded-image/GPU memory.
- The existing Australia AI simulation also produced byte-identical outputs before/after for seeds 11 and 29, one complete rival round each.
- No existing tests were edited or deleted, and no permanent regression suite was added. Temporary compatibility scripts were kept outside the repository.

## Remaining limits

- Physical iPhone/Safari and other real mobile devices were unavailable. Mobile results below are Chromium touch/viewport/DPR emulation on the same Linux host, not Safari or device-performance claims.
- The full shared atlas is deferred, not split. First-battle network/parse work moves out of startup; it can increase a cold first battle's wait. Previously loaded scripts remain cached for the session.
- Full-theatre ownership backdrops/minimaps still require synchronous initialization, notably on Rocky Mountains. This remains a startup bottleneck; scenario placement and rules are unchanged. Unit/commander rendering and some whole-world ownership inference remain potential bottlenecks; 60 FPS is not guaranteed.
- The pre-existing `tools/test_coastal_tint.cjs` source-text assertion fails with “Regional faction opacity regression” on both untouched baseline and this branch. It was left unchanged; pixel and ownership checks above verify actual output.
- Heap samples and atlas byte accounting do not establish an absolute browser/GPU peak-memory bound. Visible chunks may temporarily exceed the cache budget if needed to retain full viewport quality.

## Measured results

Chromium 131.0.6778.204, Ubuntu 24.04.3, shared AMD EPYC 9V74 host; desktop 1440x900 at DPR 1, mobile emulation 390x844 at DPR 3 (game backing canvas keeps the existing DPR-2 cap). No physical Safari/device measurements. Each row is one controlled 48-camera/five-zoom workload at seed 11; these are observations, not guarantees.

| Startup metric | Before | After |
| --- | ---: | ---: |
| Menu interactive | 410.7 ms | 399.9 ms |
| JavaScript payload downloaded by startup sample | 4,617,285 B | 1,495,694 B |
| Script execution/initialization (CDP) | 643.6 ms | 174.6 ms |
| Script resources | 96 | 42 |
| Startup JS heap | 22.67 MB | 4.09 MB |

JavaScript payload decreased 67.6%; scripting duration decreased 72.9%. Parsing is not reported separately. No scenario modules or geography atlas were fetched at the optimized menu. Local menu timing remains dominated by the existing core/UI setup.

### Desktop

| Map | Valid startup s before → after | Pan p50 / p95 ms before → after | Draw p95 ms before → after | Zoom settling s before → after | Worst chunk ms before → after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Conquest 2017 | 0.55 → 0.88 | 21.9/55.6 → 14.6/31.7 | 51.7 → 20.7 | 0.77 → 0.83 | 22.4 → 6.2 |
| Conquest 2018 | 0.45 → 0.61 | 28.8/61.6 → 17.5/37.2 | 58.8 → 28.4 | 0.70 → 0.89 | 10.9 → 10.4 |
| Division of Japan | 0.86 → 0.78 | 14.1/21.1 → 18.1/33.8 | 16.4 → 22.1 | 5.16 → 1.46 | 158.4 → 11.2 |
| California | 1.51 → 1.54 | 16.0/30.3 → 14.9/22.3 | 17.7 → 15.8 | 2.82 → 1.73 | 27.0 → 32.9 |
| Australia | 0.46 → 0.49 | 15.4/28.4 → 15.0/21.7 | 19.3 → 14.1 | 1.99 → 1.54 | 8.7 → 8.2 |
| Central America | 1.23 → 1.09 | 16.9/33.0 → 15.1/25.8 | 17.5 → 15.6 | 2.35 → 1.76 | 11.3 → 12.3 |
| Rocky Mountains | 8.08 → 7.73 | 13.7/19.8 → 17.3/31.0 | 13.9 → 22.7 | 2.20 → 1.94 | 21.5 → 25.2 |

### Mobile emulation

| Map | Valid startup s before → after | Pan p50 / p95 ms before → after | Draw p95 ms before → after | Zoom settling s before → after | Worst chunk ms before → after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Conquest 2017 | 0.56 → 0.85 | 3.2/42.9 → 2.8/15.5 | 36.8 → 2.3 | 0.64 → 0.78 | 27.3 → 8.7 |
| Conquest 2018 | 0.36 → 0.71 | 4.0/48.2 → 3.1/24.8 | 43.8 → 21.0 | 0.60 → 0.67 | 11.0 → 5.9 |
| Division of Japan | 0.77 → 0.81 | 15.0/30.1 → 16.5/32.7 | 16.7 → 18.6 | 4.33 → 0.99 | 113.3 → 17.0 |
| California | 1.55 → 1.63 | 15.1/28.1 → 15.2/30.5 | 15.8 → 16.1 | 1.53 → 0.91 | 25.6 → 13.4 |
| Australia | 0.41 → 0.48 | 15.0/25.9 → 15.0/28.5 | 15.3 → 17.4 | 1.55 → 1.15 | 8.4 → 9.8 |
| Central America | 1.03 → 1.13 | 15.0/28.6 → 15.1/32.0 | 16.2 → 25.1 | 1.53 → 1.24 | 8.5 → 13.2 |
| Rocky Mountains | 7.99 → 8.00 | 14.8/27.2 → 14.7/29.9 | 15.0 → 15.7 | 1.93 → 1.22 | 20.9 → 29.6 |

Results are mixed for pan-tail latency: Conquest, California, Australia and Central America improve in this desktop run, while Japan and Rocky Mountains have higher p95 pan/draw samples. The major Japanese raster stall and zoom-settling delay are substantially reduced; bounded memory also increases cache misses/rebuilds during repeated zooms. Cold Conquest startup moves atlas loading out of the menu and into launch. Full-map initialization on Rocky Mountains remains about eight seconds.

Raw results (including cache hits/misses, rebuilds, cancellations, evictions, canvas-byte accounting and retained heap): [desktop before](desktop-before.json), [desktop after](desktop-after.json), [mobile before](mobile-before.json), [mobile after](mobile-after.json). These files exclude abandoned diagnostic experiments. All final zoom queues drained; optimized representative runs had zero synchronous atlas-chunk paints during the measured pan/zoom workload. Atlas surfaces stayed within 144 MiB desktop / 48 MiB mobile budgets in these samples.
