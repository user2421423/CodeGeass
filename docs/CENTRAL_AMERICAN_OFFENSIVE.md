# Central American Offensive — isolated scenario handoff

**Branch:** `scenario/cf-central-america` from `feature/federation-war-campaign-structure`  
**Runtime ID:** `cf-central-america`  
**Player / defender:** Chinese Federation (`cf`) / Britannia (`britannia`)  
**Ownership:** scenario-local files only. No changes to `main`, `dist/war-campaign.js`, `dist/index.html`, or tests.

## New standalone files

- `dist/scenarios-central-america.js`: playable regional scenario API, registered at `E.scenarios.byId['cf-central-america']` once loaded.
- `dist/central-america-underlay.js`: scenario-only painter; wraps the existing `GEOGRAPHY.paint` entry point for exactly `cf-central-america`, preserving all other maps.

## Integration order (integrator only)

- Load `scenarios-central-america.js` **after** the shared `engine.js` and existing scenario dependencies, **before** `war-campaign.js`. Natural position: after `scenarios-luoyang.js`.
- Load `central-america-underlay.js` **immediately after** `ui/geography.js` and **before** `ui/renderer.js`. It requires the global geographic shape atlas initialized by `ui/geography-data.js` and the `ui/core.js` pixel constants.
- The integrator can add `cf-central-america` to the standalone scenario selector and the Federation World Campaign registry only after reviewing this branch. Those UI and campaign files were intentionally not changed.

## Map and opening order of battle

- Grid: **184 × 168** (30,912 hexes). WGS84 bounds longitude −94.4 to −81.4, latitude 7.45 to 18.7. Includes Costa Rica, Nicaragua, Honduras, El Salvador, Guatemala, Belize, both oceans and limited southern staging geography; no Mexican conquest objective.
- GSHHS intermediate-resolution coastline: **43 geographic samples per hex**; less than 20% land = sea, 20–80% = mixed coast, more than 80% = land. A 2,149-character RLE contains the 30,912 cell classes. The rendering helper draws **actual GSHHG global atlas coast polygons underneath the grid**, rather than outlining hex cells.
- Lake Nicaragua, Lake Managua, Izabal, Atitlán and Petén Itzá are based on simplified GSHHS inland-water outlines. Mountain and forest concentrations follow the volcanic cordillera, Talamanca, Nicaraguan interior, Honduran mountain ranges and Guatemalan highlands; major river courses, passes and volcanoes are exposed as scenario metadata and rendered geographically where appropriate.
- **81 Britannian cities, 21 independently capturable ports**; China starts with **no cities**. Chinese staging **tiles** (not cities) are limited to the Panama–Costa Rica southern frontier. The Chinese armies are divided among Pacific road, central highlands, Caribbean and mobile-reserve operational groups.
- Four Chinese Pacific task forces: Nicoya, Gulf of Fonseca, Salvadoran Pacific and Guatemalan Pacific. Each starts with five Chinese carrier-battleships plus five or six Shui Gun-Ru II amphibious combat formations and **actual embarked** land troops. Britannia has Caribbean and Pacific naval interceptors and layered field armies from Costa Rica to northern Guatemala and Belize.
- All Army Groups use standard faction equipment and named officers; no new globally balanced unit type or custom rules were introduced.
- Conquest of **all 81 enemy cities**, no turn cap. Since Britannia holds every city on turn one, it can win only once all Federation field forces **including cargo** are eliminated and all cities remain or return to Britannia.

## Difficulty and AI

- Normal, Hard and Challenge follow established regional enemy funding and formation-stack adjustments. Elite uses the established two-faction Korean Elite preparation internally during scenario creation, then restores the true runtime ID. That converts the starting armies and gives rival commanders the existing Elite ranks without changing the shared engine.
- **Integration note — engine Elite whitelist:** `dist/engine.js` still hardcodes which scenario IDs count as Elite scenarios (the internal `eliteScenario(g)` switch). Thus ongoing Elite-only factory restrictions, Elite AI production and certain deployment/save restrictions will not be fully applied to `cf-central-america` until the integrator adds this ID to that whitelist and to `prepareEliteEurope`'s supported IDs/two-faction routing. The branch deliberately leaves the shared engine untouched.
- `aiDoctrine:'europe'` delegates offensive/defensive fronts and mobile reserves to the established route-aware scenario AI; no simulation runs have been performed.

## Static review (no automated tests, no simulations)

- Inspected source for duplicated city names and initial allegiance: **81 unique settlements**, every city initially Britannian.
- Inspected source and geographic cell mask: **30,912 decoded classes**, comprising 20,119 sea, 483 mixed coastal and 10,310 mostly land cells.
- Checked independently allocatable shore-facing sites for the **21 ports** with the geographic mask; no missing candidates were found in the static scan.
- Checked transport loads against the engine's `CARRIER.capacity=2`; every amphibious Army Group has enough carrier berths.
- Inspected independent port assignment, faction-specific equipment, all-city victory, the initial cityless-invader victory edge case, Elite setup and regional geographic registration. This is a **static source review**, not a gameplay verification; actual in-browser rendering, movement, AI success and performance have not been simulated.
- Outstanding integration work: add the two script tags, optionally update the standalone scenario picker and central campaign registry, update the engine Elite scenario ID whitelist if complete ongoing Elite behavior is required, and then perform integration testing when separately authorized.

The source branch remains **unmerged**.
