# Battle of the Strait of Malacca — geographic and integration audit

## Scope

- **Scenario ID:** `bf-malacca`, standalone Regional Scenarios only.
- **Branch:** `scenario/bf-malacca` from `feature/federation-war-campaign-structure`.
- **Battlefield:** 168 columns × 132 rows, **22,176 hexes**; WGS84 bounds 97.4°–105.85° E, 0.45°–8.35° N. The projection, city anchors, game hexes and vector geographic underlay use the same regional bounds.
- **Coastline source:** GSHHS intermediate-resolution land polygons (level 1). Each centre-sampled hex uses 43 deterministic stratified points to estimate area coverage: **sea under 20% land**, **mixed coast 20–80%**, and **land over 80%**. This is a sampled 20–80 classification, **not** an exact polygon-intersection area computation.
- **Hex classifications:** 13,360 sea; 779 mixed coast; 8,037 inland.
- **Starting setup:** 54 named cities (9 Britannian, 45 Chinese Federation), 30 independently capturable ports, 174 grounded army formations, 63 naval formations and 12 embarked Britannian landing troops: **249 starting units including carrier cargo**. The two capitals are Phuket and Singapore.

## Shoreline and navigation

The static connected-component audit of the geography classifies **20 physical land components**, including distinct Malay Peninsula, Sumatra, Phuket, Langkawi, Batam, Bintan and Karimun components. Johor Bahru and Singapore share the mainland component at this scale, consistent with the short causeway crossings; ships retain sea approaches to either side. The Malay Peninsula and Sumatra have no tactical land bridge over the strait.

There are seven sea-only components. The **largest has 12,604 connected sea hexes** and covers the navigable Malacca–Singapore maritime route. Secondary components represent the cropped far side of Sumatra or very small enclosed water bodies. Scenario initialization floods the actual sea grid to identify the dominant component, then **requires every one of the 30 port hexes and every deployed ship to use that connected main sea**. This specifically avoids initial Songkhla Lake and Bengkalis lagoon snaps stranding naval groups or shipyards. Coastal cities may shift a maximum of four hexes from their real-world coordinate to obtain a valid, unoccupied site; names and projected geography are otherwise preserved.

The narrow sea passage is fully playable using the engine's established sea/coast navigation and coastal artillery rules. No imaginary physical land bridges, unlimited-range blockade mechanics, supply severance, or automatic closure of every route to Indonesia are introduced. Capturing Malacca and Singapore is strategically valuable through **ports, production, fleet staging and sea control**, not a fabricated global blockade modifier.

## Deployment and strategic objectives

Britannia attacks by heavy formations from Phuket/Krabi/Trang/Satun and southward Thai fronts at Hat Yai/Pattani, with separate **Western Landing**, **Sumatra Landing** and **Singapore Flank** carrier forces carrying 12 embarked Knightmare formations. The Federation holds the western peninsular approaches, Kuala Lumpur, Malacca, Singapore, eastern Sumatra and the Riau islands, supported by coastal defense formations, named commanders and substantial carrier/amphibious forces.

The scenario uses standard `aiDoctrine: 'europe'` to reuse multi-front land and naval planning, without changes to the central AI. The named operational fronts and carrier landing groups make the intended invasion and counteroffensive axes explicit. Capturable independent ports permit fleet expansion and counter-landings on both shores.

Normal, Hard, Challenge and Elite are selectable for either faction. Hard/Challenge upgrade enemy formations including troops inside carriers. Elite uses the engine's existing faction-specific Elite Force definitions locally; standard carrier hulls are left unchanged. **Victory is determined only by total conquest of all 54 cities, without a turn limit.**

## Integration checks and limitations

- Registered through `dist/index.html` and `dist/ui/scenario-screens.js` as a selectable standalone scenario; `E.scenarios.byId['bf-malacca']` registered by `dist/scenarios-malacca.js`.
- The standard geographic renderer now treats `bf-malacca` as a centre-sampled geographic region and displays the global GSHHG shoreline beneath the correctly aligned 168 × 132 gameplay hexes.
- Static source syntax was checked. All 54 city sites, 30 connected port sites and 63 naval deployments were placed without collision under the topology audit. The **production engine**, with its real unit definitions, officers, resources and Elite Forces, successfully constructed **all eight faction/difficulty combinations** without advancing a turn. Each has 249 initial units including 12 carrier passengers; both Elite configurations produce 226 eligible Elite formations.
- **No gameplay simulations, multi-seed AI battles or regression tests were run or added.** Construction checks loaded the real engine but did not launch a browser, execute turn cycles, play out combat, or benchmark strategic AI. Long-form balance and AI performance therefore remain unverified.
- The World Campaign registry, its planned Malacca marker, Story Mode, existing scenarios and `main` are deliberately unchanged.
