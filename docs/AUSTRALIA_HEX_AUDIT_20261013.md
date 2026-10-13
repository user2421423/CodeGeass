# Australia geographic background and hex audit — 13 October 2026

## Implementation on main

The War for Australia now draws the existing GSHHG geographic coastline below
the tactical hex grid in gameplay, minimap and scenario preview. The atlas
includes the Australian mainland, Tasmania, Kangaroo Island, Flinders Island,
King Island, Melville Island, Bathurst Island, Groote Eylandt and Mornington
Island while excluding Papua New Guinea and Indonesia. Faction ownership is
clipped to these land polygons. Australia's equirectangular 132 × 92 sampled
hex-centre projection is explicitly matched by the visual affine transform.

This is a **render-only gameplay change**. The authoritative hex landmask, city
ownership, armies, naval routes, unit balance and victory rules are unchanged.

## Exhaustive independent GIS and game-state audit

The script `node tools/australia_hex_audit.cjs` checks every hex against both
the packed gameplay shoreline and the separately sourced visual GSHHG polygons,
then validates city positions, provinces, coastal classification, connected
ocean, the Tasmania/Bass Strait separation, adjacent naval ports, ship routes
and formation deployments. It creates and audits games for all three playable
factions.

| Metric | Verified |
| --- | ---: |
| Dimensions | 132 × 92 |
| All hexes | 12,144 |
| Land | 4,968 |
| Sea | 7,176 |
| Coastal land | 438 |
| Plains | 2,091 |
| Forest | 649 |
| Mountains | 327 |
| Deserts | 1,463 |
| Connected sea components | 1 |
| Mainland land component | 4,903 |
| Tasmania land component | 48 |
| Cities | 48 |
| Coastal ports | 32 |
| Starting formations | 160 (124 land, 36 naval) |
| Independent vector-vs-hex centre discrepancies | 16 / 12,144 (0.13%) |

All 16 independent vector/hex discrepancies occur within two hexes of the
coastline. They represent sub-hex polygon-versus-centre sampling differences,
not incorrect sea navigation or misplaced inland territory.

**Result:** the standalone `australia-hex-audit` CI job passed for Britannia,
the Chinese Federation and Europia United. Its [workflow run is
#38386731342](https://github.com/user2421423/CodeGeass/actions/runs/38386731342).
The independent audit job does not depend on unrelated gameplay regression jobs
succeeding. Future pushes to `main` rerun this audit.

## Regression coverage

`tests/australia-visual-map.test.cjs` checks proper island selection, exclusion
of foreign land, polygon land clipping, coastline strokes and numeric alignment
between geographic map coordinates and tactical hex centres. Existing
`tests/australia.test.cjs` covers scenario initialization, factions, landmask,
cities, ports, save/load, AI and victory conditions. No scenario balance
assumptions were changed.
