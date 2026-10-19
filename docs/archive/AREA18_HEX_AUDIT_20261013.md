# Area 18: Middle East geographic map and full hex audit
**Date:** 13 October 2026. **Scope:** `The Conquest of Area 18` regional scenario only.

## Rendering correction
The regional scene previously used filled gameplay hexes as the political terrain image (the Bering fallback). It now draws the global GSHHG coastline data reprojected to the scenario's actual 120 × 88, centre-sampled, odd-row tactical grid. The geographic coastline is background artwork; gameplay terrain, ownership, pathfinding, ports, capture and naval access still come exclusively from the independent Natural Earth regional landmask. Suez also receives a visual canal cut, aligned with its existing playable sea connection. The coastal political tint buffer is one sea hex deep to reduce ownership bleed across the narrow Persian Gulf.

The renderer regression in `tests/area18.test.cjs` asserts the actual canvas coastline transform aligns to the centre of **every** tactical hex, including all shifted odd rows. It also tests that all three faction colours are rendered against a geographic polygon, not the flat fallback.

## Independent packed landmask findings

| Measure | Result |
| --- | ---: |
| Total cells | 10,560 |
| Land cells | 7,590 |
| Water cells | 2,970 |
| Land cells bordering playable water | 523 |
| Interior land cells | 7,067 |
| Connected land components | 5 (6,163; 1,381; 37; 8; 1) |
| Connected water components | 4 (2,729; 182; 39; 20) |
| Declared cities | 50 |
| Declared port cities | 17 |

Coastal hex counts by adjacent sea hexes: **145** with one, **247** with two, **107** with three, **18** with four, and **6** with five. These are analytical readings of the packed gameplay mask; water components include interior bodies such as lakes as well as the connected navigable maritime theatre.

The sampled landmask correctly classifies Riyadh, Baghdad, Tehran, Damascus, Cairo and Muscat as land; the Red Sea, eastern Mediterranean, Persian Gulf, Strait of Hormuz, Arabian Sea and Suez Canal as sea.

Six exact city-coordinate sample hexes appear as water at this scale: **Kuwait City, Dubai, Latakia, Port Said, Suez and Bushehr**. This is expected for shoreline settlements on a coarse grid: the scenario's city-placement routine snaps each coastal settlement onto a nearby valid land hex with adjacent navigable sea. The regression test checks the snapped city is within two hexes of its true coordinates.

## Automated strict audit
`tools/area18_hex_audit.cjs` now checks each of the 10,560 hexes for binary-mask parity, coordinate indexing, coastal terrain correctness, legal province ownership and matching parent-city ownership. For each playable starting faction it additionally checks:
- Exactly 50 distinct cities, 17 usable ports and 191 non-overlapping units.
- Ports occupy water immediately adjacent to their owning cities and all reach the same connected navigable sea.
- Every naval unit starts in connected sea, every land unit starts on friendly dry land.
- All 50 cities are placed within two hexes of their geographic coordinates.
- Map extent and strategic sea/land landmarks remain valid.

The dedicated Area 18 GitHub Actions workflow runs this hex audit **before** the more general regression suite, so an unrelated test failure cannot suppress the regional hex results. Scenario tests also validate Suez-Persian Gulf connectivity, Mesopotamian traversability, all faction/difficulty starts, restoration of saves and AI planning.

**Limitations:** The GSHHG continuous coastline and Natural Earth raster gameplay coastline are separately sourced. Exact sub-hex visual overlaps are approximate in places, but the canvas transform is exact at every sampled gameplay centre. Visual shading is never allowed to change traversability.
