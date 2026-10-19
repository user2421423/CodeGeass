# The European War — manual hex and theatre audit

**Scope:** the 120 × 80 (9,600-hex) European War tactical grid, Europe atlas, provinces, ports, and initial formations. This audit is confined to the European scenario. Japan, global Conquest, saves, and combat rules are not redesigned.

## Findings and corrections

| Finding | Evidence | Correction |
| --- | --- | --- |
| 270 genuine shoreline hexes were not classified as coast. | Initial 5,410-land-hex mask: 856 land hexes border sea; 270 of them have more than two adjacent water hexes. The previous `sea>0&&sea<=2` rule misclassified narrow peninsulas and islands. | A land hex is now coastal whenever it borders **actual playable water**, regardless of the number of water neighbours. |
| North Africa was present on the European map and received territory ownership. | Separate African coastal landmasses in the unfiltered landmask, including the north-Algerian/Tunisian coastline. Province allocation previously gave those unoccupied landmasses to nearby European cities. | Exclude these African components from European land and mark excluded cells as impassable `offmap`. |
| Anatolia/Caucasus was treated as Euro Britannian European land. | The original Eurasian component extends into western/central Anatolia and the southern Black Sea, despite these areas lying outside the proposed European theatre. | Apply a European-theatre border across the Aegean, Bosporus, southern Black Sea and Caucasus, retaining the European side of Istanbul/Thrace. Excluded cells are impassable, not navigable water. |
| Continental vector artwork reintroduced Africa and Asia even where no tactical provinces existed. | Europe's regional renderer was filling and stroking the **entire global GSHHG land polygon**, including foreign land outside the playable map. | Show only geographically clipped *European owned provinces* in the European War; leave Japan's geographic silhouette alone. The coast colour buffer is one hex in Europe, two in Japan. |
| Small European islands could be lost during landmass filtering. | The raw grid includes isolated one-hex landmasses. A broad <39°N rule also removed a Balearic island. | Tighten the north-Africa landmass rule to below 38°N and explicitly check the Balearics, Sardinia, Sicily, Crete and Rhodes. |

## Tactical terrain classification

The complete raw 9,600-hex bitmask was traversed component by component, including all six neighbours of each land hex. With the revised theatre mask:

- **4,762** continental/island European land hexes, including **729** coastal hexes and **4,033** non-coastal land hexes.
- **2,601** playable navigable sea hexes, limited by the existing five-hex coastal sea range.
- **2,237** `offmap` hexes, including 648 removed raw non-European land cells which must not be treated as sea.
- **44** existing cities (28 Europia United, 16 Euro Britannia) and **13** existing shore-based naval ports are retained.

These are grid-level figures, not coastline lengths or real-world land areas. At 120 × 80 resolution small straits, narrow islands and irregular coastlines are necessarily approximate; the geographic coastline remains drawn from the existing GSHHG dataset rather than from hex edges.

## Geographic spot checks

| Region | Land / coast to keep | Out-of-theatre land to exclude |
| --- | --- | --- |
| British Isles / Atlantic | London, Edinburgh, Dublin, British and Irish shorelines | No extra global Atlantic land silhouette |
| Iberia / western Mediterranean | Portugal, Spanish south coast, Balearic islands | Morocco, Algerian coast |
| Italy / central Mediterranean | Peninsula, Sardinia, Sicily | Tunisian coastline |
| Aegean / eastern Mediterranean | Greece, Crete, Rhodes | Turkish Aegean / Anatolian mainland |
| Eastern Europe / Black Sea | Warsaw, Kyiv, Odessa, European Thrace / Istanbul | Anatolia and the Turkish Black Sea coast |
| Baltics / Scandinavia / European Russia | Scandinavian land, Baltic coast, St Petersburg, Moscow | Asian land south of the Caucasus border |

## Regression checks

`tests/europe.test.cjs` now audits all playable land hexes: **every** true sea-adjacent land hex must be marked coastal, **every** non-coastal hex must lack navigable sea neighbours, and **every** playable European land hex must have a valid owner. The same tests check geographic landmarks, excluded African/Anatolian land, preserved islands, 44 cities, and 13 ports.

`tests/ui-smoke.cjs` checks Europe-only rendering and unchanged Japan-specific camera/silhouette rules. Existing tests continue to exercise normal and Elite European armies, ports, economy, AI turns, and both playable factions.

## Boundary interpretation

“Only Europe” means **no African or Asian territory or artwork inside the playable map**. European Russia remains part of the war; Euro Britannia keeps Istanbul on the European side of the Bosporus. Border hexes are intentionally made `offmap` rather than fake sea to avoid unintended naval access into inland Anatolia.
