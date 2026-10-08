# Code Geass conquest map: coastline / gameplay hex alignment

Status: **review required; no gameplay tiles converted**. Independent branch from
`feature/map-rendering-overhaul`: `feature/map-hex-alignment`.
Do not merge this branch until protected strategic passages, city/port positions,
initial units, save migration and AI naval routes have been checked.

## Stage 1 — Area-weighted audit

Compared all 13,680 odd-r hex areas with the *same GSHHG high-detail outlines
used to draw the map*. Thresholds: recommend land only when visual land covers
at least 80% of a currently sea hex; recommend sea only when land covers 18%
or less of a currently land hex. Mixed coastal hexes are not conversion targets.
The previous centre-point comparison marked 484, but that included legitimate
partial coast hexes. **74** meet the stronger area criteria:

| Region | Conflicts |
|---|---:|
| Arctic / high north | 43 |
| Americas (excluding Arctic) | 10 |
| East Asia / Japan / Korea | 5 |
| Africa | 4 |
| Middle East / Arabian Peninsula | 3 |
| Southeast Asia / Indonesia | 3 |
| Australia / Pacific | 3 |
| Other | 2 |
| Siberia / Far East | 1 |
| **Total** | **74** |

City art alignment is another layer: **23 city gameplay centres** fall on
visually painted water, including Singapore, Manila, Shanghai and Taipei.
Barcelona's designated port water centre falls on visual land. These cities,
ports and adjacent gameplay tiles are protected; any repositioning requires
explicit review. A city shown on water is NOT automatically safe to convert.

## Stage 2 — Gameplay protections

Must preserve: all 149 cities (plus adjacent hexes), ports (plus adjacent
hexes), all initial unit hexes, explicit `HEX_LAND`/`HEX_SEA`/`FIX_LAND`/
`FIX_SEA` overrides, and the routes at Suez, Gibraltar, Bosporus,
Dardanelles, Malacca, Sunda, Lombok, Taiwan/Korea Straits,
Bab-el-Mandeb, Hormuz, Otranto, Dover, Panama and Bering. Protect an area
around each strategic passage rather than just a single hex.
Do not automatically convert owned land to sea; that requires a deliberate
territory ownership and save-migration policy. Polar exceptions are held out
because the existing game intentionally suppresses minor Arctic islands.

## Stage 3 — First regional review

| Hex (c,r) | Place | Current | Land coverage | Proposed decision |
|---|---|---|---:|---|
| (106,26) | Suez / Sinai | Sea | 85.9% | **Keep water** for navigation; reconcile visual coastline |
| (107,27) | Northern Red Sea | Sea | 84.4% | **Keep water**; intentional sea override |
| (111,35) | Bab-el-Mandeb | Sea | 96.5% | **Keep water**; navigable passage |
| (140,43) | Malacca / Singapore | Sea | 92.1% | **Keep water**; strategic strait |
| (142,46) | Sunda / Java | Sea | 95.3% | **Keep water**; preserve open strait |
| (157,44) | West New Guinea | Owned land | 9.9% | **Review conversion** after verifying ownership and adjacent routes |
| (119,17) | Central Asia near Caspian | Owned land | 0.01% | **Review conversion** and ownership migration |
| (61,15) | Newfoundland area | Sea | 92.2% | Candidate land; check coast, shipping and placement before approval |

Protected sea hexes with high geographic land coverage should remain sea
but receive visibly navigable corridors (cartographic exaggeration). Likewise,
coastal city sprites may need a visual placement offset or localized shoreline
adjustment without changing unit movement.

## Stage 4 — Dry-run validation before any map mutation

Applying the **only initially unprotected, unowned, non-polar candidate**
(61,15), in a *hypothetical* graph audit:
- Current: 9,287 water hexes; 2 water components; largest contains 9,276.
- Hypothetical: 9,286 water hexes; 2 components; largest contains 9,275.
- No existing port or city tile is converted.
- **This is not a gameplay patch. No changes have been applied.**

Once decisions are approved, use `tools/build_map.py` source-of-truth
overrides, regenerate `dist/engine/world.js`, migrate/validate saves,
update the map lock with the specific approved positions, then run
`tools/check_map.py`, gameplay tests, port/naval pathing tests, AI
conquest checks, and the area-weighted audit again. Do not silently
override existing `FIX_SEA` passages.
