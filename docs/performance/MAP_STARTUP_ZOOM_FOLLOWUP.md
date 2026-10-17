# Map startup, minimap and zoom follow-up

Branch: `performance/map-startup-zoom-followup`. Implementation: [`86fd2fd`](https://github.com/user2421423/CodeGeass/commit/86fd2fd96436d30654bcde77f14c1498c806f5e1).

## Implementation

- `dist/ui/geography.js`: remove redundant `closePath()` from the active filled-hex helper. All its callers fill or clip; both operations implicitly close every subpath. The vertices, winding, fill rules, coastline clipping and faction styles are unchanged. Repeated explicit native path closure was the dominant full-map cost on Chromium. No polygon/data simplification or reduced resolution is used.
- `src/renderer/00-minimap.part.js`: separate geographic background generation from city/site/unit markers. Backgrounds are cached by tile identity, ownership/terrain revisions and pixel dimensions. Selection and unit-position changes reuse them; ownership, terrain and size changes repaint them. Briefing/offline `paintMap` retains its complete original behavior.
- `src/renderer/04-map-caching.part.js`: batch inexpensive jobs within a 4 ms desktop / 3 ms mobile idle-work target, retaining atomic jobs and viewport reprioritization. Work yields during navigation; one delayed wake replaces repeated rendering while waiting for the navigation quiet period. Neighbour prefetch begins after visible detail and its fade complete.
- Completed source detail remains pinned alongside visible target tiles until the transition finishes. Distant tiles remain subject to LRU eviction. Pins are released and the atlas trimmed immediately after completion. An incomplete or ownership-stale source is never displayed as current territory.
- Crossfade alpha applies to a complete screen-resolution map composite, rather than independently to neutral terrain and political canvases. This prevents neutral terrain from changing faction tints during a fade. The temporary composite is released on completion/session reset. Existing terrain artwork/grid/border rendering order, including the recent terrain-icon fix, is retained.
- Session reset releases minimap canvas backing stores and any transition composite. Existing full geography/scenario lazy loading remains intact.
- `tools/benchmark_regional_maps.cjs`: retain the eight-map camera workload and add separate visible-detail/crossfade completion timing. Queue completion waits until that presentation is valid and background work has drained. Timeouts fail the run.

No engine, AI, scenario definitions, map data, assets, difficulty or balance changes are part of this patch. No permanent regression suite was added and no existing tests were deleted or edited. Generated bundles remain ignored and are rebuilt using `node tools/build_sources.cjs`.

## Controlled measurements

Both sides of the paired comparison use main `acb104c7152851e787c15bb4001c60d14fab27b7`, with only this performance patch added on the after side. This isolates it from concurrent development. Main subsequently added Challenge Pass/Elite changes through `a6d4f9a`; these were integrated without renderer/geography changes. All 37 launch/save workflows and the existing relevant smoke checks were repeated on that integrated code, plus desktop/mobile benchmark spot checks for Japan and Rocky Mountains. Menu/script byte figures in the primary raw files describe the isolated pair, not the later Challenge Pass payload.

Chromium 131.0.6778.204; sequential runs on the same Linux host. Desktop 1440×900 DPR 1; mobile Chromium touch emulation 390×844 DPR 3 with the existing game DPR-2 backing cap. Seed 11, 48 deterministic camera positions, five zoom targets (24/32/38/32/24 pixels per hex). Each profile is one paired workload, not repeated statistical trials. Assets are served locally without compression.

Pan values measure request-to-animation-frame scheduling latency, not physical-device FPS. Draw values measure main canvas drawing. Visible zoom timing includes the completed current detail level AND the end of the crossfade; it is reported for regional split-layer maps. Queue timing additionally waits for nearby prefetch. First-playable startup waits for a valid map with current ownership. JS heap is sampled after explicit GC; atlas bytes represent RGBA canvas storage, not total browser/GPU memory.

### Desktop — before → after

| Map | Playable startup s | Pan p50 / p95 ms | Draw p95 ms | Visible zoom s | Queue drained s |
| --- | ---: | ---: | ---: | ---: | ---: |
| Conquest 2017 | 0.86 → 0.85 | 14.2/31.3 → 14.5/31.6 | 21.7 → 20.3 | — | 0.92 → 0.60 |
| Conquest 2018 | 0.59 → 0.50 | 18.1/38.8 → 18.4/32.9 | 23.7 → 26.9 | — | 0.88 → 0.61 |
| Division of Japan | 0.84 → 0.48 | 14.8/28.9 → 14.4/23.0 | 17.5 → 15.4 | 1.12 → 0.98 | 1.49 → 1.55 |
| California | 1.57 → 0.48 | 14.7/17.6 → 15.0/26.1 | 13.9 → 15.1 | 1.12 → 0.78 | 2.11 → 1.34 |
| Australia | 0.39 → 0.34 | 14.9/20.7 → 14.8/19.2 | 14.1 → 14.3 | 1.22 → 0.66 | 2.29 → 1.09 |
| Korea | 1.04 → 0.50 | 15.1/28.4 → 15.0/18.3 | 15.2 → 13.9 | 1.39 → 1.10 | 3.40 → 2.45 |
| Central America | 1.17 → 1.08 | 14.7/18.1 → 15.2/22.8 | 13.4 → 14.0 | 1.04 → 0.66 | 2.00 → 1.04 |
| Rocky Mountains | 8.17 → 0.92 | 13.8/25.0 → 13.8/21.0 | 15.4 → 14.2 | 1.10 → 0.80 | 2.16 → 1.49 |

### Mobile emulation — before → after

| Map | Playable startup s | Pan p50 / p95 ms | Draw p95 ms | Visible zoom s | Queue drained s |
| --- | ---: | ---: | ---: | ---: | ---: |
| Conquest 2017 | 0.85 → 0.75 | 11.9/15.9 → 2.3/16.7 | 2.1 → 2.5 | — | 0.61 → 0.49 |
| Conquest 2018 | 0.58 → 0.54 | 3.3/31.5 → 14.6/19.0 | 23.0 → 19.4 | — | 0.64 → 0.45 |
| Division of Japan | 0.90 → 0.45 | 18.4/38.1 → 14.6/18.6 | 25.9 → 14.6 | 0.77 → 0.55 | 1.84 → 1.17 |
| California | 1.61 → 0.44 | 15.0/28.2 → 15.0/26.6 | 15.9 → 16.3 | 0.56 → 0.47 | 1.59 → 0.83 |
| Australia | 0.47 → 0.28 | 15.0/19.8 → 15.0/23.2 | 13.6 → 14.5 | 0.72 → 0.65 | 1.92 → 1.02 |
| Korea | 1.05 → 0.51 | 15.4/26.8 → 15.6/29.9 | 16.2 → 19.2 | 0.80 → 0.52 | 2.46 → 0.92 |
| Central America | 1.06 → 1.02 | 16.1/30.9 → 15.2/28.3 | 16.5 → 15.5 | 0.66 → 0.52 | 1.21 → 0.89 |
| Rocky Mountains | 8.02 → 0.94 | 15.3/26.7 → 13.8/20.5 | 14.8 → 16.6 | 0.70 → 0.62 | 1.93 → 1.08 |

Rocky Mountains startup decreased about 89% in both profiles. Visible zoom completion improved on all six regional examples in this paired sample. Panning remains mixed: desktop California/Central America and mobile Australia/Korea have higher p95 samples. Queue time also remains mixed for desktop Japan. These observations do not establish universal smoothness or a 60 FPS guarantee.

The exact-pixel full-map diagnostic painted Rocky Mountains in 90.6 ms versus 5,111.3 ms before; its minimap diagnostic took 24.0 ms versus 1,740.3 ms. Those are isolated paint calls, not game startup. After integrating newer main, the separate Rocky Mountains spot runs reached valid gameplay in 866.6 ms desktop and 903.6 ms mobile.

## Verification

- 72 pixel comparisons across 12 maps: Conquest 2017/2018, Japan, California, Australia, Korea, Central America, Rocky Mountains, Area 18, Bering, Greenland and Indochina. Full map, minimap, three zoom crops and changed ownership: zero differing channels. Twelve complete serialized initial states at seed 11 also matched before/after within Chromium.
- All 37 actual regional starts, saves/restores, menu returns and explicit old-surface cleanup checks passed. Repeated after integrating current main. Existing scenario dependency/loading paths were retained.
- Synthetic position and selection updates made zero new minimap geography calls; ownership/terrain changes each repainted once. Cached-plus-marker minimaps matched a fresh complete minimap pixel for pixel after every operation.
- Faction-color crossfade checks at alpha .1/.25/.5/.75/.9 retained the exact faction color with neutral geography underneath. This targets the former independent-layer-alpha tint defect.
- Story start/save restoration passed Normal/Hard/Challenge/Elite; tutorial and Conquest restoration passed. Existing `commander_assignment_smoke.cjs`, `repair_and_port_healing_smoke.cjs`, `world_campaign_elite_levels_smoke.cjs`, `interactive_tutorial_smoke.cjs` and `challenge_pass_smoke.cjs` passed on integrated main.
- Mobile 24→32→38→32→24→18 zoom traversal exercised retained source detail; composites released and budgets restored at every settled level. Trusted CDP touch dragging changed the camera. Orientation resizing retained the expected DPR-capped canvas dimensions.
- Twelve warmed scenario/menu transitions released all referenced old minimap/tile/composite backing stores. Post-GC retained JS heap ranged from 20.11 to 20.87 MB and ended at 20.36 MB (initial 20.51 MB). This does not measure decoded-image/GPU peaks.
- Primary and integration benchmark cases finished without uncaught browser exceptions, with zero synchronous atlas paints and empty final queues. Final atlas samples remained within 144 MiB desktop / 48 MiB mobile.

## Remaining limitations

- Two visible LODs are pinned during a transition. In the mobile traversal, sampled atlas usage briefly reached 57.4 MiB; it returned to 45.5 MiB after settling. A screen-resolution composite adds transient storage on top of that. The budget deliberately yields to current visible quality during the short transition; it is not a hard total-memory ceiling.
- Atomic raster jobs can exceed the 3/4 ms batching target; complex chunks still produced roughly 20–30 ms samples. The scheduler can stop between jobs but cannot preempt one. Unit drawing, canvas/image compositing, shared atlas parsing and bespoke Central America work remain possible bottlenecks.
- Physical iPhone/Safari was unavailable. Mobile timings are emulation on a Linux host. No reduction in visible DPR or texture resolution was introduced.
- The full shared geography atlas is still loaded once on demand rather than split into regions. Further story/AI/training lazy loading and unit-order/spatial-index changes were outside this four-item follow-up.

## Raw evidence

- [Desktop before](followup-desktop-before.json) / [after](followup-desktop-after.json)
- [Mobile before](followup-mobile-before.json) / [after](followup-mobile-after.json)
- [Integrated main desktop spot checks](followup-integrated-desktop.json) / [mobile spot checks](followup-integrated-mobile.json)
- [Pixel, mode, cache, touch and memory verification](followup-verification.json)

Run `node tools/build_sources.cjs` and then the existing benchmark with `BROWSER_EXECUTABLE_PATH`, `BENCHMARK_DIST`, `BENCHMARK_OUTPUT`, optional `BENCHMARK_MOBILE=1`, and `NODE_PATH` pointing to playwright-core. Both revisions must use this updated benchmark harness for the new visible-zoom metric.
