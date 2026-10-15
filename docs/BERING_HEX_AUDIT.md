# Bering Strait — exhaustive geography and hex audit

**Branch:** `feature/bering-strait-crisis`  
**Grid:** 120 × 80 = 9,600 hexes; 148°E–228°E (unwrapped across the international date line), 74°N–48°N.  
**Coastline source:** GSHHS intermediate-resolution polygons, sampled using a Basemap geographic dataset. The audit's land/sea classifications and all changed grid coordinates are permanently recorded in the packed mask and accompanying CSV.

## Audit methodology

1. Decode the original binary landmask into 9,600 individual hexes, retaining geographic grid coordinates.
2. For every hex, compare the centre sample with a nine-point GSHHS polygon classification (centre, horizontal and vertical inner offsets, and four interior diagonals). Where the polygon majority disagrees with the centre sample, correct the terrain.
3. Preserve small GSHHS island components, especially **Adak**, which a majority-only method deletes. Keep distinct landmasses at Nome/Uelen and separate Aleutian/Kodiak islands.
4. Correct the eastern edge of odd-numbered offset rows, where the original sampling position is exactly 228°E (the atlas clip line). Adjacent real mainland hexes were incorrectly water there.
5. Replace isolated, non-ocean inland-water pockets with land. The game has no lake terrain: `sea` represents navigable ocean, not isolated inland waterways.
6. Recompute **all coastal hexes** from actual adjacency to the final navigable sea graph. A land hex bordering any sea hex is `coast`; other land hexes retain the existing biome classification.
7. Check every city and port, both mainland components, every surviving island, every starting ship, and sea connectivity. This is now executable via `node tools/bering_hex_audit.cjs`.

## Before and after

| Type | Before | After |
| --- | ---: | ---: |
| Land, including coast | 3,327 | 3,379 |
| Navigable sea | 6,273 | 6,221 |
| Coast (subset of land) | 672 | 550 |
| Connected sea components | 33 | 1 |
| Connected land components | 20 | 16 |
| City anchors | 28 | 28 |
| Active ports | 18 | 18 |

**100 hexes changed** (24 land → sea; 76 sea → land). There is still **no land bridge** between Alaska and Chukotka. The original named island ports remain available, every map harbour launches into reachable ocean, and every city's tactical position is within two hexes of its intended geographic anchor. The reductions in connected land components come from correcting the coarse shoreline and joining nearby slivers; no represented port island is removed.

## Per-hex change ledger

The accompanying CSV, `docs/BERING_HEX_AUDIT.csv`, records the exact 100 modified grid coordinates, the original class, the corrected class and geographic coordinates. All other **9,500** binary land/sea hex classifications remain unchanged. For the entire 9,600-hex map, the automated audit checks the final `sea` / `coast` / inland-biome classification and province assignments.

## Verification commands

```bash
node tools/bering_hex_audit.cjs
node --test tests/bering.test.cjs tests/fleija-mode-gates.test.cjs
node tools/scenario_sim.cjs bering-strait britannia normal 11 4
node --test tests/*.test.cjs
```

This audit changes the new Bering regional scenario only. It does **not** change global conquest geography, the Japan/Europe scenarios, existing economies, diplomacy, naval rules or the main branch.
