# Chinese Federation — Pacific Northwest Invasion

**Runtime scenario ID:** `cf-pacific-northwest`  
**Module:** `dist/scenarios-cf-pacific-northwest.js`  
**Branch:** `scenario/cf-pacific-northwest`, based on `feature/federation-war-campaign-structure`  
**Status:** Implemented in an isolated scenario module; **not yet integrated into shared engine/renderer/UI allowlists**. This branch must not be merged into main without approval.

## Battlefield and order of battle

- Geographic theatre: Washington, Oregon, western Idaho, central-Pacific maritime approaches. Bounds: 130.1°W–112.45°W, 41.85°N–49.15°N. **176 × 120** staggered hexes.
- Coastline: GSHHS intermediate-resolution source sampled over individual hex footprints; strictly classify sampled dry coverage at **less than 20% as sea, 20–80% inclusive as mixed coast, greater than 80% as land**. Puget Sound, the Strait of Juan de Fuca, Olympic Peninsula, Columbia estuary and Oregon beaches follow the sampled geographic shoreline, not a hand-drawn island pattern.
- The scenario's province, city and coastline data use WGS84 coordinates. Landforms model the Olympic Mountains, Coast Range, Cascades, Columbia Plateau, Blue Mountains and western Idaho highlands. Named land passes include Stevens, Snoqualmie, Chinook, White, Santiam and Willamette, as well as the Columbia River Gorge. Rivers are available as geographic polylines for the eventual underlay renderer.
- **63 cities**, all starting Britannian, including Seattle, Tacoma, Olympia, Spokane, Vancouver (Washington), Portland, Salem, Eugene, Bend, Medford, Yakima, Kennewick, Boise and Coeur d'Alene. California's key cities and campaign objectives are excluded.
- **19 independently capturable deep-water/estuary ports**, with valid sea-adjacent anchors. Portland is **not** made an ocean-port shortcut through the Columbia Gorge.
- Britannian heavy garrisons, air-defense/artillery, coastal warships and east-of-Cascades counterattack reserves; 5 distinct Chinese Federation offshore carrier-led invasion commands at Juan de Fuca, Puget Sound, Columbia, central Oregon and southern Oregon. Chinese carrier cargo starts embarked. The Chinese Federation controls **zero cities on turn one**.
- Normal / Hard / Challenge / Elite; faction-standard units and commanders; existing Army Group interface; no turn cap. China wins only after taking **all** Britannian cities. Britannia wins by destroying the entire Chinese expedition with no Chinese city held.

## Static source review (no tests or simulations executed)

Reviewed the module and shoreline RLE without executing game logic:

- The encoded atlas has exactly **120 complete rows of 176 hexes**; sampled mask includes **7,035 sea-class cells**.
- All **63** city anchors resolve to valid, non-overlapping land/coast locations using the game's offset-hex adjacency convention.
- All **19** designated port cities have adjacent sea cells and distinct proposed port slots; all are within **2 hexes** of their geographical WGS84 anchor in the static anchoring review.
- Each of the five Chinese invasion detachments has enough carrier berths for its starting cargo. All invader landing formations are initially at sea; no Chinese mainland city is defined.
- Terrain passes are dry traversable corridors; no artificial inland maritime connectors are authored.
- Existing `dist/war-campaign.js`, shared engine/AI/renderer files, `dist/index.html`, and `dist/ui/scenario-screens.js` were left unchanged.
- **These checks are static only.** Real-time naval pathfinding, turn resolution, AI counteroffensives, visual overlay and Elite production have not been runtime validated.

## Required integrator changes — DO NOT silently mark campaign objective playable

These belong to the central integrator, **not** this scenario branch, under the approved campaign handoff contract. Without them, the isolated scenario module is **not end-to-end playable**.

1. **Engine: cityless invasion eligibility** (`dist/engine.js`): add `cf-pacific-northwest` to `decideVictory`'s special amphibious scenario ID list, which bypasses immediate defeat for a player initially owning zero cities. Also add it to the `captureCity`/`expeditionAfloat` list for **`loser === 'cf'`**, so losing the first captured beachhead does not surrender surviving offshore Chinese armies. These checks are **required**, not optional.
2. **Engine: Elite scenario eligibility** (`dist/engine.js`): add the ID to `eliteScenario` and `prepareEliteEurope` ID allowlists, with player sides **`['britannia','cf']`**. The scenario already supplies local, faction-correct starting Elite units to avoid modifying the shared engine here; shared Elite production remains disabled until integration.
3. **Geographic underlay** (`dist/ui/geography.js`): recognize the ID in `paintJapan` as a **centre-sampled regional theatre**, so the renderer chooses the existing global **`LAYERS.land`** rather than `JAPAN_LAND` and uses the correct pixel alignment; add it to the scenario ID condition drawing `g.scenario.rivers` geographic polylines. This is necessary for the *geographic underlay*, not merely the tactical hex grid.
4. **Standalone scenario loading**: add `<script src="scenarios-cf-pacific-northwest.js"></script>` to `dist/index.html` **after `engine.js` and existing core scenario modules, before `war-campaign.js` / UI scripts**; add `cf-pacific-northwest` to `dist/ui/scenario-screens.js`'s scenario selector and description, with available sides `cf` and `britannia`.
5. **World Campaign integrator only**: activate objective `federation-britannia-pacific-northwest` by setting its currently-null `scenarioId` to `cf-pacific-northwest` **after** the engine, renderer and standalone UI wiring is reviewed. Preserve the seven-tier Chinese campaign structure and the separate California objective.
6. **AI integration observation**: this scenario provides five distinct `invasionGroup` carrier assignments, staged Britannian pass/Idaho reserves, coastal batteries, port targets and `operationalFronts` metadata. The shared generic European-doctrine AI handles tactical combat/naval landings, but its `operationalFronts` metadata is **not** by itself an AI scripting directive. The integrator should consider scenario-specific targeting if coordinated anti-beachhead counterattacks or multi-stage mountain breakthroughs prove weak once testing is authorized.

**No tests or simulations were added or run.** The shared World Campaign registry was not changed, and this branch remains unmerged.
