# Experimental uniform 20–80% coastline: engineering review

Source branch: `feature/coastal-20-80-world-audit` based on `c2c3c4f999d91b1558afa09df557f327d18f7e30`.

**Status: Experimental. NOT approved for merge into main.** The purpose is to expose gameplay implications of applying geography uniformly without legacy protection rules.

## Method and implementation

Each of the 13,680 hexes is clipped against the project's GSHHG land polygons (dist/ui/geography-data.js). Coverage below 20% becomes sea (`.`); 20–80% inclusive becomes coast (`w`); above 80% becomes land (preserves existing land biome where possible, otherwise becomes plains). The new classification is applied **after** the previous coastline, `HEX_*` and `FIX_*` rules; they do not veto it. Both source and built game map reflect the experimental result. No files on `main` are modified.

Baseline-to-experiment tile changes: **621** of 13,680. Result totals: **8,950 sea, 862 coast, 3,868 land**. In particular 144 existing sea hexes become traversable by ground units (108 coast, 36 solid land); 381 formerly non-navigable land hexes or other solids become navigable (coast/sea).

## Topology audit before implementation

Hex grid adjacency is six-sided, odd-r offset, east–west wrapping. Land traversability excludes sea and peak; water navigability includes sea and coast.

| Network | Baseline connected components | Experiment connected components |
|:---|---:|---:|
| Ground | **32** | **22** |
| Naval | **1** | **1** |

**The naval component count staying at one does NOT prove narrow waterways remain viable.** Existing routes can be severely changed even when open-ocean navigation is still globally connected. Potentially significant topology changes:

- **Strait of Dover**: (90,13) and (90,14) become coast. Coastal land could connect Great Britain and mainland Europe.
- **Strait of Malacca**: (140,42) and (141,42) become coast; (140,43) becomes solid land. Land crossing and constrained channel risk.
- **Sunda Strait**: (142,46) becomes land and neighbouring hexes coast; risks changing Java–Sumatra separation.
- **Bosporus and Dardanelles**: (103,19), (103,20), (104,19), (105,19) become coast; an amphibious crossing may turn into a land crossing.
- **India–Sri Lanka**: (129,37) and (129,38) become coastal, potentially eliminating an embarkation requirement.
- **Panama**: (49,38), (50,38), (49,39), (50,39), (51,38) become coast, allowing warships to cross coast-marked land around the isthmus.
- **Suez / Bab-el-Mandeb / Gibraltar / Hormuz / Korea**: tile-level navigability changes, with coastal cells possibly bridging shores that should remain separated.

## Starting placements and other player impact

46 intended city coordinates switch terrain class under the rule, including **Pearl Harbor (10,31) and Perth (147,62) changing from land to sea**; these will snap to other locations under the game's nearest-solid-land placement logic. Other affected named city coordinates include Reykjavik, Stockholm, Edinburgh, Gibraltar, Athens, Istanbul, Manila, Singapore, Jakarta, Shanghai, Taipei, Cape Town, Sydney, Melbourne, Montevideo and Auckland. A new game's cities and port sites must be checked after the changes; a visually valid land percentage does not ensure a well-placed settlement.

Starting army and resource coordinates are also affected. Existing saves follow the coast migration logic in the engine; this experiment needs explicit save/load and site-preservation testing before release.

## Recommendation

Keep this experimental branch separate. Confirm acceptable handling of strategic channels, mixed coastal hexes, city/port placement and existing saves before merging. If every hex must remain uniformly 20–80% classified, solve the channel/bridge behaviour with movement/pathing restrictions rather than adding terrain overrides back.

## Repro and validation

- `python3 tools/rebuild_coastal_20_80.py --check` (requires `shapely`)
- `python3 tools/build_map.py --inject dist/engine/world.js` (regenerates the map; should make no diff)
- `python3 tools/check_map.py`
- `node --test tests/coastal-20-80.test.cjs`
- `node --test tests/*.test.cjs`
- `node tests/ui-smoke.cjs`

For per-tile changes and contact points see `tools/data/coastal_20_80_changes.json`.

## Post-classification city, port and resource-placement assessment

A static replay of the game's actual `createGame` nearest-solid-land placement and
`portSite` (requires adjacent **pure sea**, not merely navigable coast) found:

- **49 of 149 starting city positions relocate** compared with `main`.
- **5 of 12 starting ports cannot be placed at all**: Gibraltar, Barcelona, Shanghai, Singapore, Mumbai.
- The **Pearl Harbor** city relocates from **(10,31) in Hawaii to (11,9) near Alaska**;
  its port likewise moves from (10,30) to (12,10). The Hawaiian island's hex
  is only about **5% land**, below the universal 20% minimum.
- **Mount Fuji and Kyushu Sakuradite mine sites relocate**, weakening their geographic identity.
- Other representative city movements include Kyoto (157,23) → (159,21),
  Fukuoka (155,24) → (153,20), Taipei (150,29) → (149,27),
  Jakarta (142,47) → (142,46), and Singapore (141,43) → (140,43).
- 156 ground/naval starting-unit records can still find terrain-valid placement
  using the current nearest-tile fallbacks, but this alone does not establish
  sensible force geography.

These are **confirmed blockers to merging the experiment**. A strict uniform terrain
threshold cannot represent very small inhabited islands as land. Supporting them
would require separate city/island mechanics or intentional exceptions, rather
than merely adjusting the threshold. Changing ports to support navigable coast
would address five missing ports but needs collision/combat/naval deployment tests.

Run `node tools/audit_coastal_starting_positions.cjs` to reproduce city/port
and representative island checks against the committed experimental map.
