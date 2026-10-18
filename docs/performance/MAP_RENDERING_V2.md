# Map rendering V2 — profile-first unit culling

Source baseline: `main` commit `09458d5900b994d6a2a3f23b59e22f6b955cfcd3`.
Branch: `perf/map-rendering-v2`. **Unmerged; benchmark and visual approval required.**

## Architecture reviewed

The renderer is built from `src/renderer/00–05-*.part.js` into an ignored
`dist/ui/renderer.js` bundle. `05-frame-painting.part.js` owns the visible
frame and animated overlays. `04-map-caching.part.js` handles cached geographic
chunks, split static/political layers, wraparound tiles, LOD transitions, bounded
LRU atlas storage, fallback regional raster previews, deferred chunk painting
and partial political invalidation after captures. `00-minimap.part.js` caches
minimap geography independently from units and selections; frame rendering is
event-driven with decorative pulses throttled while idle. `dist/ui/geography.js`
contains precompiled global vector paths and optimized overview geometry.

Unit sprites use `ART.drawUnit`, then bars/labels/commander pins, ordered by
`r` then `c`. Movement animation uses `animatedPosition`, which consults
live effects. The viewer transforms canvas coordinates using the camera
`offset`, `scale`, and DPR (backing resolution capped at 2). Pointer, wheel
and resize events request frames. Asset, geography and economy/game-state
ownership are unchanged.

## Bottleneck and scoped change

Before this patch, every dynamic frame executed `game.units.filter(...).sort(...)`
over every living unit, even when the majority were outside the camera.
On non-wrapping maps, the `copiesBetween` helper returned one drawing position
regardless of horizontal visibility, which meant an entire horizontal row
could still enter the relatively costly sprite/plate rendering path.
Commander pins calculated `animatedPosition` again after the unit pass.

The patch instead filters camera-visible formations *before* row/column sorting,
reuses each visible formation's interpolated coordinates and wrapped positions,
and omits off-camera range/target overlays. During active movement effects, a
one-pass set of moving unit IDs avoids repeatedly scanning the effect list
for each stationary unit; the existing interpolation is used for actual movers. Non-wrapping culling retains a
generous world-space margin beyond the already-expanded viewport to protect
partially visible sprites, pins and shadows. Wrapping maps retain every visible
world copy. Depth-order comparator and image selection remain identical.

The unit pass has opt-in render-time and visible/culled counters. Timing
overhead is absent from ordinary gameplay unless the benchmark explicitly
enables `KNIGHTMARE_MAP_PERF.traceDynamic`. Counters are scalar aggregates,
not an unbounded sample collection.

**No changes** to engine rules, unit coordinates, AI, terrain, geography,
coastlines, political colors, assets, campaign/scenario data or save format.

## Benchmark reproducibility

The existing `tools/benchmark_regional_maps.cjs` drives real game sessions,
deterministic seed 11, 48 fixed pans and zoom targets 24/32/38/32/24.
The isolated A/B CI workflow runs the *same benchmark script* against the
exact PR base and candidate, on the *same GitHub Actions Ubuntu runner*:
two complete repetitions of each at desktop 1440×900 DPR 1 and
Chromium touch emulation 390×844 DPR 3. Cases:

- Conquest 2017 and 2018
- Division of Japan (small)
- War for Australia (medium)
- Invasion of Korea (large)

The benchmark reports p50/p95 main-canvas pan and zoom render times separately
from request-to-frame latency; first usable frame readiness; zoom
settling time; after-GC JS heap; atlas cache bytes, paints and evictions.
Candidate unit-cost counters are diagnostic only, as baseline main has no
equivalent counters. The reporting tool computes the median of per-run values
and displays raw before/after deltas. Results are uploaded as JSON plus Markdown;
never infer improvement from a single cached draw.

Fixed-time canvas snapshots at 24 and 38 px/hex are captured for each map and
viewport. Exact PNG matches are counted; differences must be manually reviewed
(for example due to nondeterministic browser/font or asynchronous asset state).
This is not a replacement for fixed-turn screenshot review or real iOS Safari.

The workflow also builds the generated bundle, runs asset/map checks, selected
smoke tests, and compares two-turn all-scenario gameplay fingerprints from
unmodified main against this branch. A mismatch blocks the workflow.

## Previous optimizations preserved

This patch retains regional preview lazy-loading; split static/political
geography atlas; partial invalidation; geographic Path2D compilation;
visible-tile traversal; minimap cached background; atlas capacity bounds,
idle chunk warming, zoom LOD/crossfade and canvas cleanup. No new renderer
framework or loading format is introduced.

Historical measurements in `docs/performance/LAZY_LOADING_MAP_RENDERING.md`
and `MAP_STARTUP_ZOOM_FOLLOWUP.md` are useful context, **not** baseline values
for this PR. Compare this PR only to its exact main base.

## Acceptance gates and remaining work

Do not approve solely because culling looks computationally cheaper.
Read the paired CI report for the 30% p50 pan/zoom and 20% readiness
*targets*, p95 tails, steady-state memory, small-map regressions,
fingerprint parity, and the two-zoom screenshot parity diagnostics.
Physical device Safari/touch and orientation behavior require manual
verification; Chromium mobile emulation must not be mislabeled as a real device.
The project has no dedicated renderer-only screenshot goldens yet.

This change does **not** add a persistent world-unit spatial index: updating
an index with every move, deployment, destruction, load and effect would require
coordination with engine/input ownership lanes, and merits separate profiled
review. Additional likely work includes oversized atlas jobs, tactical
text/sprite compositing, and physical-device input latency.
