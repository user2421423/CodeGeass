# Conquest of the Mexican Heartland — integration handoff

Scenario branch: scenario/cf-mexico (based on feature/federation-war-campaign-structure).
Scenario module: dist/scenarios-mexico.js. Runtime ID: cf-mexico.

This branch intentionally does NOT edit shared geography, campaign registry, engine, or dist/index.html. Apply the changes below centrally after the scenario is reviewed; DO NOT apply them here.

## Atlas and coordinates

- WGS84 bounds: west -108.8, east -91.0, north 24.3, south 14.0.
- Tactical grid: 204 columns x 136 rows, 27,744 pointy hexes, odd rows shifted by half a column.
- Tile centre:
  lon = west + (c + 0.5 + 0.5*(r&1)) * (east-west)/cols
  lat = north - (r + 0.5) * (north-south)/rows
- Inverse (rounded to nearest hex):
  r = round((north-lat)*rows/(north-south) - 0.5)
  c = round((lon-west)*cols/(east-west) - 0.5 - 0.5*(r&1))
  Then clamp to tile bounds.
- Projection metadata: centreLon=-99.9, centreLat=19.15, angle=0;
  uMin=-8.9*cos(19.15 deg), uMax=8.9*cos(19.15 deg), vMin=-5.15, vMax=5.15.
- Atlas pixels, using existing SQ and R from renderer:
  x = R - SQ*R/2 + (lon-west)*SQ*R*cols/(east-west)
  y = R - 0.75*R + (north-lat)*1.5*R*rows/(north-south)
- The GSHHS intermediate-resolution shoreline mask is embedded in the module as exact area-thresholded coastline classes: <20% land sea; 20–80% mixed coast; >80% land. Totals: 15,952 sea, 262 coast and 11,530 land hexes. Use the global GSHHS vectors from GEOGRAPHY_SHAPES / LAYERS.land for the UNDERLYING map; never trace the tactical hex edges as a substitute for real shorelines.
- Rivers are WGS84 polylines, lakes polygons, and named Sierra Madre/volcanic ranges curved geographic centre-lines with widths. Actual playable terrain uses the same ridge/pass data. DO NOT replace these with rectangular mountain bands or turn river lines into sea hexes. The Trans-Mexican Volcanic Belt, Sierra Madre del Sur and the inland Valley of Mexico need legible geographic shading on the atlas.

## Exact central integration requirements

1. In dist/index.html, insert the script tag pointing to scenarios-mexico.js with the other standalone scenario scripts, before war-campaign.js and game.js. The module itself already registers E.scenarios.byId['cf-mexico'].
2. In dist/ui/geography.js, within paintJapan, define:
   const mexico = g.scenario.id === 'cf-mexico';
   Append mexico to centreSampledRegion. This selects the existing bounds-aware A/D/tx/ty affine transform and LAYERS.land data source. Do not add Mexico to JAPAN_LAND; do not use the Japan (cols-1)/(rows-1) transform.
3. Still in geography.js, use g.scenario.atlas.ridges, .passes, .rivers, .volcanoes, .lakes to render Mexican relief and hydrography under the political/hex overlay using the WGS84 x/y projection above. Clip to bounds, and preserve actual GSHHS Pacific and Gulf polygons. Mexico City (-99.1332, 19.4326) must occupy its inland basin. Real passes should align with passable road-corridor land hexes.
4. In dist/war-campaign.js, find the Mexico entry in federationBritanniaRows, Tier 6. Change ONLY its scenarioId from null to 'cf-mexico'. Preserve existing tiers, position, description, and other mission placeholders.
5. If dist/ui/scenario-screens.js contains explicit scenario listings or descriptions, add cf-mexico there. Ensure the campaign launch passes player='cf' and supports normal, hard, challenge, elite. Do not change shared engine rules.
6. Existing E.scenarios.byId callbacks must be used for create, orderGroup, objective, winner and onTurn. The scenario never wins for merely taking Mexico City: victory requires every opposing city.

## Composition

There are 76 initially Britannian Mexican cities and four Chinese-controlled Guatemalan staging cities: Quetzaltenango, Huehuetenango, Retalhuleu and San Marcos. Four southern mainland Chinese field formations command clusters of standardized 2017 Federation land units. Three offshore landing Army Groups and three Chinese fleet groups support the Gulf/Veracruz, Pacific/Acapulco, and Pacific/Manzanillo axes. The Gulf and Pacific operate in disconnected navigable water basins and cannot shortcut through Tehuantepec. Britannia holds concentrated plateau defense and mobile reserves around the capital, Puebla, Guadalajara and industrial centres. PortAt/portOwner/portLevel use the existing independent-port mechanics. The scenario has no turn limit.

## Limitations

- The module has NOT yet been loaded into index.html or selected for GSHHS underlay rendering in the shared geography module. It will not yet appear as a fully launchable campaign entry.
- The inland geographic ridges and road passes are curated vector approximations rather than a high-resolution digital elevation model. The shared renderer still needs to paint those relief layers.
- No tests or simulations were added or run on this branch. Runtime placement, balance, UI atlas appearance, pathfinding and AI behaviour remain unverified. Operational-front metadata and reserve release enhance the scenario but the shared engine retains authority over actual AI orders.

Do not merge this branch automatically.