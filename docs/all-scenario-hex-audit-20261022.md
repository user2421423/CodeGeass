# All-scenario terrain audit — 22 October 2026

## Scope

Every one of the **68 registered scenarios** was instantiated for **every playable side** and checked for stable terrain; **1,200,612 unique scenario hexes** were inspected. In total, **1,110,564 hexes** had a centre-point land-versus-sea comparison to an independent Natural Earth 1:50m land polygon dataset.

The audit checks supported terrain identifiers, tile/grid coordinates, faction-side terrain agreement, city and port placement, ship navigability, and illegal blocked-hex deployment. Sea, mixed coast, playable land and deliberately nonplayable `offmap` are separately counted. **Final structural errors: 0.**

## Corrections committed to main

- **Partition of Britannia:** replace unsupported internal `tundra` identifier with the supported `snow` identifier (which the game displays as tundra) for **2,027 hexes**, including intended legacy-save terrain references. Commit `f3d16d2b5f161a9877899a8456350b4f448b29ae`.
- **Alternate history:** preserve faction-correct flying airships during force conversions; never convert airships to ordinary sea-only carriers and strand them on land. This resolves the Chinese Civil War and Knights of the Round Rebellion deployment failures. Commit `d46cae77bda3002ac8075883ed67bf1bf53494c7`.
- **Battle for Xinjiang:** stop city/army nearest-hex selection from using impassable lake/peak cells. Commit `ac43b5d913b98cf629774b76acac27be92c2f735`.

Audit script: `tools/audit_all_scenario_hexes.cjs`. [Successful complete audit run](https://github.com/user2421423/CodeGeass/actions/runs/39729895635).

## Important accuracy distinction

The independent Natural Earth point comparison reports **24,953 raw geographic disagreements**, which **must not be presented as confirmed bugs or silently mass-converted**. That geodata excludes inland lakes (e.g. the Great Lakes and Caspian), while scenarios also intentionally crop playable countries, use fictional coast/canal crossings, explicit GSHHS 20–80% mixed-coast footprints, or reserve background `offmap` cells. Coastline edge pixels differ further between data sources. The independent comparison identifies candidates for map-specific cartographic review; it is not a definitive validation of every external coast. The structural and deployment audit **passed**, but an independently certified cartographic match for every hex is **not claimed**. No unverified broad terrain remapping was made.

The `Reference mismatches` column below counts independent centre-point land/sea disagreements (not verified defects); coastline cells and nonplayable background cells are excluded from that direct comparison.

## Every scenario

| Scenario ID | Hex dimensions | Playable sides | Sea | Coast | Offmap | Reference mismatches | Structural checks |
|---|---:|---:|---:|---:|---:|---:|---|
| `area-18` | 120 × 88 | 3 | 6082 | 210 | 0 | 2884 | PASS |
| `battle-luoyang` | 174 × 116 | 2 | 164 | 6 | 0 | 171 | PASS |
| `bering-strait` | 120 × 80 | 2 | 6221 | 219 | 0 | 56 | PASS |
| `bf-malacca` | 168 × 132 | 2 | 13360 | 779 | 0 | 71 | PASS |
| `bf-south-china` | 168 × 124 | 2 | 5077 | 307 | 0 | 62 | PASS |
| `bf-yangtze` | 196 × 122 | 2 | 265 | 270 | 0 | 265 | PASS |
| `bk-civil-war` | 110 × 84 | 2 | 1596 | 289 | 6204 | 658 | PASS |
| `britannia-iraq-iran` | 168 × 112 | 2 | 2520 | 290 | 0 | 51 | PASS |
| `britannia-siberia` | 160 × 88 | 2 | 4319 | 556 | 0 | 105 | PASS |
| `britannia-western-russia` | 128 × 88 | 2 | 283 | 28 | 0 | 222 | PASS |
| `cf-central-america` | 184 × 168 | 2 | 20119 | 483 | 0 | 180 | PASS |
| `cf-eu-balkans` | 160 × 116 | 2 | 7519 | 905 | 0 | 44 | PASS |
| `cf-eu-caucasus` | 164 × 114 | 2 | 6453 | 157 | 0 | 1154 | PASS |
| `cf-eu-central-europe` | 156 × 100 | 2 | 788 | 51 | 5509 | 49 | PASS |
| `cf-eu-france` | 142 × 104 | 2 | 4904 | 259 | 4012 | 705 | PASS |
| `cf-eu-moscow` | 160 × 100 | 2 | 118 | 20 | 0 | 118 | PASS |
| `cf-eu-north-africa` | 176 × 108 | 2 | 7285 | 334 | 0 | 1691 | PASS |
| `cf-eu-siberia` | 160 × 88 | 2 | 4319 | 556 | 0 | 105 | PASS |
| `cf-eu-suez` | 144 × 112 | 2 | 4566 | 462 | 0 | 1501 | PASS |
| `cf-eu-turkey` | 144 × 104 | 2 | 4850 | 484 | 0 | 104 | PASS |
| `cf-eu-volga` | 164 × 112 | 2 | 1668 | 117 | 0 | 719 | PASS |
| `cf-mexico` | 204 × 136 | 2 | 15952 | 262 | 0 | 19 | PASS |
| `cf-new-zealand` | 160 × 160 | 2 | 23199 | 352 | 0 | 11 | PASS |
| `cf-pacific-northwest` | 176 × 120 | 2 | 7035 | 267 | 0 | 10 | PASS |
| `cf-panama` | 156 × 100 | 2 | 10612 | 435 | 0 | 54 | PASS |
| `cf-pendragon` | 180 × 126 | 2 | 0 | 0 | 0 | 131 | PASS |
| `chinese-civil-war` | 174 × 116 | 2 | 164 | 6 | 0 | 171 | PASS |
| `conquest-indochina` | 120 × 104 | 2 | 5602 | 148 | 0 | 67 | PASS |
| `crossing-urals` | 120 × 90 | 2 | 0 | 0 | 0 | 37 | PASS |
| `defense-japan` | 110 × 84 | 2 | 1596 | 289 | 6204 | 658 | PASS |
| `division-japan` | 110 × 84 | 3 | 1596 | 289 | 6204 | 658 | PASS |
| `eu-cf-beijing` | 176 × 112 | 2 | 5703 | 105 | 0 | 1475 | PASS |
| `eu-cf-himalayas` | 144 × 108 | 2 | 0 | 0 | 0 | 0 | PASS |
| `eu-cf-india` | 168 × 124 | 2 | 9520 | 213 | 0 | 498 | PASS |
| `eu-cf-kazakhstan` | 156 × 104 | 2 | 852 | 143 | 0 | 364 | PASS |
| `eu-cf-luoyang` | 174 × 116 | 2 | 164 | 6 | 0 | 171 | PASS |
| `eu-cf-manchuria` | 144 × 112 | 2 | 1965 | 125 | 0 | 336 | PASS |
| `eu-cf-mongolia` | 164 × 96 | 2 | 0 | 0 | 0 | 0 | PASS |
| `eu-cf-persia` | 168 × 112 | 2 | 2520 | 290 | 0 | 51 | PASS |
| `eu-cf-sichuan` | 148 × 108 | 2 | 0 | 0 | 0 | 0 | PASS |
| `eu-cf-xinjiang` | 144 × 96 | 2 | 0 | 0 | 0 | 0 | PASS |
| `eu-great-lakes` | 176 × 112 | 2 | 3209 | 594 | 0 | 3209 | PASS |
| `eu-greenland` | 140 × 120 | 2 | 7998 | 662 | 2217 | 1008 | PASS |
| `eu-military-coup` | 120 × 80 | 2 | 2602 | 292 | 2236 | 238 | PASS |
| `eu-panama` | 156 × 100 | 2 | 10612 | 435 | 0 | 54 | PASS |
| `eu-pendragon` | 180 × 126 | 2 | 0 | 0 | 0 | 131 | PASS |
| `eu-rocky-mountains` | 224 × 168 | 2 | 175 | 0 | 0 | 175 | PASS |
| `european-war` | 120 × 80 | 2 | 2602 | 292 | 2236 | 238 | PASS |
| `geass-war` | 120 × 80 | 2 | 2602 | 292 | 2236 | 238 | PASS |
| `invasion-american-east-coast` | 160 × 176 | 2 | 15583 | 842 | 671 | 41 | PASS |
| `invasion-brazil` | 176 × 144 | 2 | 8654 | 396 | 1411 | 7 | PASS |
| `invasion-california` | 160 × 120 | 2 | 4661 | 194 | 1665 | 6 | PASS |
| `invasion-canada` | 196 × 112 | 2 | 9525 | 2005 | 0 | 265 | PASS |
| `invasion-caribbean` | 184 × 120 | 2 | 19080 | 380 | 1933 | 7 | PASS |
| `invasion-hawaii` | 176 × 114 | 2 | 18704 | 179 | 0 | 43 | PASS |
| `invasion-japan` | 110 × 84 | 3 | 1596 | 289 | 6204 | 658 | PASS |
| `invasion-korea` | 184 × 160 | 2 | 20652 | 837 | 0 | 978 | PASS |
| `invasion-south-africa` | 144 × 108 | 2 | 6529 | 228 | 1351 | 0 | PASS |
| `invasion-turkey` | 144 × 104 | 2 | 4850 | 484 | 0 | 104 | PASS |
| `operation-stonehenge` | 120 × 96 | 2 | 6640 | 264 | 264 | 380 | PASS |
| `partition-britannia` | 178 × 110 | 3 | 8866 | 1051 | 544 | 477 | PASS |
| `philippines-invasion` | 144 × 112 | 2 | 14988 | 363 | 0 | 256 | PASS |
| `protagonists-antagonists` | 120 × 80 | 2 | 2602 | 292 | 2236 | 238 | PASS |
| `rounds-rebellion` | 180 × 126 | 2 | 0 | 0 | 0 | 131 | PASS |
| `rounds-tournament` | 180 × 126 | 6 | 0 | 0 | 0 | 131 | PASS |
| `shin-independence` | 120 × 80 | 2 | 2602 | 292 | 2236 | 238 | PASS |
| `ufn-civil-war` | 200 × 120 | 2 | 0 | 91 | 13838 | 12 | PASS |
| `war-for-australia` | 132 × 92 | 3 | 7176 | 171 | 0 | 64 | PASS |

