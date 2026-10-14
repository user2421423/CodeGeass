# Greenland scenario — coastline, ice and route audit

Branch: `scenario/eu-greenland` (not merged). Regional module: `dist/scenarios-greenland.js`.

## Geographic construction
- Geographic bounds: 78°W–10°W, 58°N–84°N; 140 × 120 staggered hexes (16,800).
- Coastline mask: Greenland GSHHS intermediate-resolution polygon and nearshore islands, clipped to the regional grid. Each hex sampled at the center and sixteen offsets. Classify <20% sampled land as sea, 20–80% as a mixed coast hex, and >80% as inland land.
- GSHHG atlas vector coastline is projected onto the same geographic hex bounds in `dist/ui/geography.js`. Only Greenland’s shapes are selected, not Canadian Arctic islands or Iceland.
- Topography: coast and fjord landings remain traversable. A distance-to-sea flood fill creates snowy glacier margins at depth 3–5 and impassable central `peak` ice sheet from depth 6 onward. No strategic city is placed on the impassable interior.

## Runtime tile and route audit
Three independently generated seeds (11, 71, 151) yielded identical terrain counts:

| Terrain | Hexes |
| --- | ---: |
| Navigable open sea | 7,998 |
| Off-map sea (outside active theatre) | 2,217 |
| Mixed coast (20–80%) | 662 |
| Impassable ice cap | 3,853 |
| Snow/tundra | 1,919 |
| Coastal mountains | 151 |
| **Total** | **16,800** |

- 18/18 geographic city anchors placed on playable terrain (none on peak, ocean, or off-map terrain).
- 15/15 independent port hexes assigned beside coastal cities, navigable and initially Britannian.
- Land BFS from coastal landing hexes (without traversing the central peak ice sheet): **18/18 cities reachable**.
- Naval BFS from every E.U. carrier's starting position, traversing sea/mixed coastal hexes: **15/15 port approaches reachable**, connected sea/coast region of 8,644 hexes.
- Britannia begins with 18 cities; Europia United begins without any city, all 4 expeditionary Army Groups aboard carriers.
- All 4 difficulty levels and both player choices created successfully for seeds 11, 71 and 151 (24 starts). No initial victory, dead-ended victory condition, or creation error.
- A forced all-city E.U. capture correctly returns an E.U. scenario victory.

## Multi-seed real AI simulations (existing engine, no new tests)
Ran six four-turn AI-versus-AI simulations, both player perspectives, seeds 11/71/151, Normal difficulty. With full-unit iteration and existing `E.aiOrder`, all six simulations ran without exceptions. Observed between 12 and 31 E.U. deployments/landings over four turns, sustained naval movement, attacks from both factions and defensive counter-movement. Additional difficulty-specific and longer balance runs may be performed without committing regression tests.

## Rules and limitations
- Existing faction equipment, commander compatibility, carrier cargo handling, Army Group orders, naval interception and combat rules reused unchanged.
- Victory is complete conquest of all 18 enemy cities (or successful defense through destruction of the invading force, under existing invasion convention), without a turn cap.
- Geographic fidelity is bounded by the GSHHS intermediate-resolution coastline and a sampled hex raster; fine individual fjords thinner than one map cell are suggested by the underlaid geographic coastline rather than promoted into artificial water corridors.
- No regression tests added. The workflow performs only focused syntax/start checks before publishing an isolated playable preview.
