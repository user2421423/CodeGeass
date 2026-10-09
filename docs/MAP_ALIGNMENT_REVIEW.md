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
partial coast hexes. **74** met the initial area criteria, of which **59 remain** after the Newfoundland correction and fourteen further coastal conversions:

| Region | Conflicts |
|---|---:|
| Arctic / high north | 40 |
| Americas (excluding Arctic) | 3 |
| East Asia / Japan / Korea | 5 |
| Africa | 2 |
| Middle East / Arabian Peninsula | 3 |
| Southeast Asia / Indonesia | 2 |
| Australia / Pacific | 2 |
| Other | 2 |
| Siberia / Far East | 0 |
| **Total remaining** | **59** |

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
- The GSHHG centre-point audit now documents **469 remaining differences**,
  of which **410 are mixed-coastline hexes** and **59 are strong conflicts**.
  The 59 break down into 19 land gameplay hexes over visual water and
  40 sea gameplay hexes over visual land. None is automatically eligible
  under city, port, route, polar and ownership protections.
- Results: `docs/map-alignment-review.json` (59 strong conflicts) and
  `docs/map-coastline-centre-review.json` (469 centre differences);
  regenerate using `tools/map_alignment_audit.py` and
  `tools/audit_coastline_centres.py` respectively.

## Stage 7 — Six additional high-confidence coastal water fixes

The third small correction batch changes six more occupied-by-no-unit land
hexes to navigable sea: (0,6) at the date line, (127,0) off northern Siberia,
(158,1) off the Laptev coast, (55,8) and (56,8) on the Labrador coastline,
and (156,63) at the Great Australian Bight. These are all over 82% mapped water.
No starting units, cities, ports or explicitly protected straits use the tiles.

The 180×76 gameplay map, source build overrides, locked map and legacy-save
migration have been updated together. On a land/water flood-fill of the resulting
map, **the sea component count remains 2 and the land component count remains
31**. Previously occupied save-game hexes stay land until vacated.

After this batch, there are **59 strong land/sea conflicts** and
**469 centre-point disagreements**, including **410 mixed coastal hexes** that
need not be converted. The remaining stronger conflicts include Japanese
island overrides, Suez and Malacca's navigable sea, and the Aral Sea, Lake
Victoria and Great Lakes inland-water cases, which cannot be converted
casually because they create new isolated water components.

## Stage 6 — Eight safe coastal conversions (committed, pending final CI)

After the Newfoundland land correction, a dry-run full connectivity check was
performed on eight non-polar, unoccupied, non-strategic land spurs that have
18% or less high-detail geographic land coverage. All now become **sea** in
the map source, generated conquest world and approved map lock:

| Region | Hex | Original terrain | What changed |
|---|---|---|---|
| Gulf of Alaska | (13,9) | plains | sea |
| Kamchatka | (168,9) | plains | sea |
| Hudson Bay | (50,10) | plains | sea |
| James Bay | (49,12) | forest | sea |
| Caribbean near Cuba | (49,31) | plains | sea |
| Mauritania Atlantic coast | (81,32) | plains | sea |
| New Guinea north coast | (157,44) | plains | sea |
| Madagascar north coast | (113,51) | plains | sea |

Sea connectivity remains **two components**, and the major ocean component
gains eight sea hexes. The number of land components is unchanged. No
starting units, cities, ports, or designated strategic passages occupy
these tiles. `E.migrateSave` updates unoccupied older-conquest tiles on
load, removes their old land ownership, and leaves any player-occupied
tile or built site unchanged rather than stranding units. Campaign tiles
and previous version rules are not changed.

After the nine cumulative terrain conversions, **65 strong area conflicts**
and **475 centre-point land/sea discrepancies** remain, comprising 25
playable-land/visual-water conflicts, 40 playable-sea/visual-land conflicts,
and 410 mixed-coastline discrepancies. All stronger remaining conflicts
require route, ownership, or special-terrain review rather than blind
conversion.

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
2. **Owned gameplay land over geographic water (19 strong cases)** —
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

## Stage 8 — No inland lakes, Japan Tsugaru Strait open

Inland lakes are deliberately absent: the GSHHG geographic renderer no
longer paints inland-water holes. This includes the Great Lakes, Lake
Victoria, Aral Sea, and Caspian Sea. The Black Sea remains ocean-linked
water through the Turkish Straits.

The Caspian's only isolated naval component (11 sea hexes) has been
converted into plains. Existing conquest saves migrate unoccupied
Caspian water to land with neighbouring faction ownership, but preserve
tiles occupied by ships, units, ports or built sites. Campaign mode
is unaffected.

At (160,19), the artificial Honshu–Hokkaido land bridge is converted to
a sea hex, keeping the Tsugaru Strait navigable and Sapporo an island
destination requiring sea transport. Other Japanese city hexes are
kept intact to protect city placement and garrisons.

The Arctic is out of scope for any further coastline alignment.
