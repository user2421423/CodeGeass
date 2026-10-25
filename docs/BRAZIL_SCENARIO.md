# Invasion of Brazil — scenario/eu-brazil

- Runtime ID: `invasion-brazil`; Campaign objective `eu-brazil` (tier 3).
- Files: `dist/scenarios-brazil.js` plus geography renderer, selector, loader and registry.
- Geographic bounds (cropped from the original shoreline lattice): approximately -75.318° to -31.568° longitude, -35.375° to +6.5° latitude. 154 x 134 hexes, retaining all 57 cities and all six EU fleet anchors. The preserved source coastline and Brazil boundary masks are sampled at matching original-cell offsets, so there is no coastline resampling.
- GSHHS intermediate land-area intersection per hex; below 20% land is sea, 20–80% is mixed coast, above 80% is land. Inland waterways are *not* naval shortcuts.
- 57 Britannian-held urban nodes from Belém/Manaus through Brasília and southern Brazil; 19 independent coastal ports. Brasília is the capital.
- Six E.U. transatlantic landing commands: Amazon Estuary, Ceará, Pernambuco, Bahia, Rio and Southern Assault. Each starts offshore with embarked army formations and naval escorts, not cities.
- Defending Britannian coastal fortifications, inland reserves and fleet cover create multi-axis fronts. Standard AI doctrine, unit statistics, difficulty rules and Army Group ordering retained.
- Major river lines: Amazon, Rio Negro, Madeira, Tapajós, Xingu, Tocantins, São Francisco, Paraná and Paraguay; forested river approaches and highland terrain restrict advance. Rivers are tactical barriers (not sea).
- Victory: all enemy cities conquered. Defenders may alternatively win if the E.U. has no cities and no surviving field/naval units. No turn limit.
- Campaign wins register only through actual victorious Campaign launches; standalone victories cannot unlock tiers.
- No regression tests added.
