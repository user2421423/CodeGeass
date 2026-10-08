# Code Geass conquest map: coastline / gameplay hex alignment

Status: **first protected correction batch committed; further regional review required**. Independent branch from
`feature/map-rendering-overhaul`: `feature/map-hex-alignment`.
Do not merge this branch until protected strategic passages, city/port positions,
initial units, save migration and AI naval routes have been checked.

## Stage 1 — Area-weighted audit

Compared all 13,680 odd-r hex areas with the *same GSHHG high-detail outlines
used to draw the map*. Thresholds: recommend land only when visual land covers
at least 80% of a currently sea hex; recommend sea only when land covers 18%
or less of a currently land hex. Mixed coastal hexes are not conversion targets.
The previous centre-point comparison marked 484, but that included legitimate
partial coast hexes. **74** met the initial area criteria, of which **73 remain** after the approved Newfoundland correction:

| Region | Conflicts |
|---|---:|
| Arctic / high north | 43 |
| Americas (excluding Arctic) | 9 |
| East Asia / Japan / Korea | 5 |
| Africa | 4 |
| Middle East / Arabian Peninsula | 3 |
| Southeast Asia / Indonesia | 3 |
| Australia / Pacific | 3 |
| Other | 2 |
| Siberia / Far East | 1 |
| **Total remaining** | **73** |

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
| (61,15) | Newfoundland area | **Plains (converted)** | 92.2% | **Applied**; city-free, no starting units, sea connectivity preserved |

Protected sea hexes with high geographic land coverage should remain sea
but receive visibly navigable corridors (cartographic exaggeration). Likewise,
coastal city sprites may need a visual placement offset or localized shoreline
adjustment without changing unit movement.

## Stage 4 — First correction applied; remaining work

- The only low-risk candidate `(61,15)` on Newfoundland is now **land**
  in the generated world and map lock (previously sea).
- Water connectivity: **2 sea components before and after**, largest sea
  component 9,276 → 9,275 after the one-tile conversion.
- No station, port, or starting unit occupied the edited tile.
- Suez, northern Red Sea, Bab-el-Mandeb, Malacca and Sunda retain their
  intentionally navigable gameplay sea hexes. The visual atlas now draws
  **thin cartographically exaggerated water channels** along those passages;
  no gameplay movement logic changes.
- The GSHHG centre-point audit now documents **483 remaining differences**,
  of which **410 are mixed-coastline hexes** and **73 are strong conflicts**.
  The 73 break down into 33 land gameplay hexes over visual water and
  40 sea gameplay hexes over visual land. None is automatically eligible
  under city, port, route, polar and ownership protections.
- Results: `docs/map-alignment-review.json` (73 strong conflicts) and
  `docs/map-coastline-centre-review.json` (483 centre differences);
  regenerate using `tools/map_alignment_audit.py` and
  `tools/audit_coastline_centres.py` respectively.

## Stage 5 — City and harbour visual alignment (committed)

All **23 flagged city centres** now have small shoreline art anchors positioned
on the detailed GSHHG land geometry. The adjustments range from roughly
1.5 to 27 map-space pixels, always within 0.72 of a logical hex radius.
The gameplay stations are **not relocated**: ownership, tile movement,
garrisons, recruitment, city defence and save files still use the original
(c,r) coordinates. Hovering/clicking artwork that extends into an adjacent
hex selects the intended city unless that click is a valid move/attack or hits
an intervening unit. Port causeways attach to the visual city artwork.

Barcelona's harbour has a separate `visualPortCenter` 3-pixel correction
onto geographic water, without changing its playable sea hex. City artwork
for campaign missions is unchanged.

Both corrections are guarded by `tests/ui-smoke.cjs` and the geographic
audit: all 23 city anchors must fall inside land, remain within 0.72R of their
gameplay hex centres and be selectable; the Barcelona harbour visual anchor
must lie on sea. A remaining centre-point audit conflict **does not mean a
city graphic is still offshore**—it evaluates the fixed gameplay hex centre,
which intentionally has not moved.

## Remaining regional work

1. **Visual city alignments (23 corrected)** — inspect the committed art
   offsets at ordinary and close zoom for overlap/legibility. Gameplay hex
   centres remain fixed by design; no city data migration is required.
2. **Owned gameplay land over geographic water (33 strong cases)** —
   inspect terrain, neighbouring navigation, unit placement and faction
   ownership individually before converting any tile.
3. **Protected sea over geographic land (40 strong cases)** — improve visual
   coastlines/channel exaggeration or preserve intentional arctic simplifications.
   Do not block established waterways.
4. **Mixed-coastline remainder (410 cases)** — these are not necessarily errors.
   Keep the exact vector coast, but display enough tactical information to make
   movement/embarkation unambiguous when a tile is hovered or selected.

For future gameplay conversions, adjust `tools/build_map.py` source-of-truth
overrides, regenerate `dist/engine/world.js`, update the approved map lock
and explicitly validate city placements, saved-game compatibility, naval
pathfinding and conquest AI. Do not blindly convert all mismatches.
