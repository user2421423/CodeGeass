# Strategic World Campaign Mode: developer handoff

Branch: **feature/campaign-world-map** (not merged to main).

## Modes and save compatibility

- **Story Mode** is the original 58 narrative missions, in six preserved arcs. Its internal game.mode = campaign, its engine is dist/campaign.js, and its key knightmare-conquest-mission is unchanged.
- **Campaign Mode** is a new world map and tier registry in dist/war-campaign.js; its independently saved progress key is knightmare-war-campaign-v1.
- Campaign Mode launches *original* regional scenarios through game.mode = scenario with an attached warCampaign context and uses its own active battle slot, knightmare-war-campaign-battle.
- **Scenarios** remain independent with key knightmare-conquest-scenario and nine unchanged regional battles. Conquest and its 2018 variant keep their existing saves and rules.

Winning a standalone Scenario, quitting, losing or viewing a preview does not count toward Campaign progress.

## Approved tiers (all mandatory; any order within a tier)

| E.U. tier | Objectives | Runtime |
| --- | --- | --- |
| 1: Global Conflicts | War for Australia; Conquest of Area 18; Division of Japan | Existing |
| 2: Bering Strait | Bering Strait Crisis | Existing |
| 3: Overseas Invasions | Invasion of Hawaii; Brazil; Greenland; Caribbean | Planned |
| 4: Continental Landings | Panama Campaign; Invasion of New York; Invasion of Canada | Planned |
| 5: Britannian Homeland | Battle for the Great Lakes; Invasion of California | Planned |
| 6: Final Offensive | Battle of Pendragon | Planned |

| Britannia tier | Objectives | Runtime |
| --- | --- | --- |
| 1: Global Conflicts | War for Australia; Conquest of Area 18; Division of Japan | Existing |
| 2: Bering Strait | Bering Strait Crisis | Existing |
| 3: Imperial Expansion | Invasion of Siberia (planned); Invasion of South Africa (implemented) | Mixed |
| 4: Eurasian Offensive | Crossing the Urals; Invasion of Turkey | Planned |
| 5: Western Russia | Invasion of St. Petersburg and Moscow | Planned |
| 6: European War | European War | Existing |
| 7: Operation Stonehenge | Operation Stonehenge | Existing |

For Britannian Tier 6, battleSide = eb, because the unchanged European War is fought by Euro Britannia; campaignFaction stays britannia. The Tier 5 victory announcement identifies Euro Britannia as established, without manufacturing an army or changing the European War roster.

## Code ownership

- dist/war-campaign.js — authoritative data-driven objective registry, unique IDs, planned-versus-implemented status, independent progression, victory validation, geographical map tinting.
- dist/ui/war-campaign-screen.js — 2017-map canvas, selectable region markers, tier tabs, front arrows, faction selection, pan and zoom, info panel and battle launch.
- dist/war-campaign.css — scoped, responsive styling.
- docs/campaign-placeholders/*.json — one structured implementation task per planned mission, 15 total at initial handoff; South Africa is now implemented.
- tests/war-campaign.test.cjs — focused tier, save, map and verification checks.
- src/hud/00-start-menu.part.js and dist/ui/hud.js — main menu links; Story Mode is a UI-only rename.
- dist/ui/core.js — separate Campaign battle save key.
- dist/ui/scenario-screens.js — optional Campaign context attached when launching an existing scenario.
- dist/ui/turns.js — confirmed-victory hook and link back to Campaign map.
- dist/ui/input.js — modal escape navigation; dist/index.html loads scripts/styles.

Existing generated bundles retain src as their editable source: src/README.md and tools/build_sources.cjs specify exactly which source section to edit. The two new Campaign JavaScript files are standalone and **not** generated. Do not rename existing Story engine APIs or regenerate changes to existing scenario mechanics.

## Placeholder workflow for another coding session

Ten E.U. IDs: eu-hawaii, eu-brazil, eu-greenland, eu-caribbean, eu-panama, eu-new-york, eu-canada, eu-great-lakes, eu-california, eu-pendragon.

Five Britannian IDs: britannia-siberia, britannia-south-africa, britannia-urals, britannia-turkey, britannia-western-russia.

Each is documented in docs/campaign-placeholders/<ID>.json. Runtime fields in dist/war-campaign.js: id, title, campaignFaction, tier, region, marker [longitude,latitude], bounds [west,south,east,north], description, status, scenarioId and battleSide. Planned entries currently have scenarioId = null, and therefore cannot launch or be completed.

1. Implement the specified new regional battle in a **separate** scenario module on its own development branch. Follow an existing scenario API: stable ID, sides array containing the intended battleSide, create(side,difficulty,seed), normal Scenario victory reporting, and registration in E.scenarios.byId.
2. Load the module before the Campaign UI. Change **only its matching registry row** in dist/war-campaign.js from scenarioId null to the actual registered scenario ID. The runtime derives its implemented status automatically.
3. Update that mission's JSON placeholder metadata to specify its new ID, module location and status.
4. Refine marker and bounds to match the actual region if necessary. Geographic bounds are approximate rectangles used for campaign map recoloring; never recolor an unrelated continent.
5. Run Campaign tests and existing Scenario tests. The objective's launch button becomes functional automatically when unlocked. No fake battle, fake victory, cross-scenario resource carryover, or additional UI case is needed.

The registry is the runtime authority; JSON files are implementation handoffs and must be kept consistent with it. South Africa is implemented on scenario/britannia-south-africa. All other remaining placeholders retain their original planned status.

## Map rendering, ownership and navigation

The map derives from an isolated E.createGame(..., world) 2017 snapshot and uses the existing GSHHG geography and faction colors via GEOGRAPHY.paint. Only the **snapshot** has land-tile ownership recolored for completed Campaign objectives; the live Conquest world, its maps and underlying Scenario games are never mutated. The snapshot never renders units, factories, city panels or army orders.

Markers exist for completed, available, locked and planned objectives; small islands have enlarged click targets. A side panel explains all states and contains a play/replay action only if a real scenario exists and its tier is unlocked. Future tiers remain inspectable, not playable. Invasion arrows link relevant current/front objectives visually and have no combat mechanics.

Browser input: click objectives or tier tabs, drag map to pan, scroll or use +/- for zoom, WORLD to reset. The political map is rebuilt on faction switch or return from an actual battle. Each faction has its own wins and map ownership.

## Progress persistence and verified victories

On launch, WC.launch checks objective/faction membership, tier, registered scenario model and battleSide. The scenario is run unchanged; its attached warCampaign context has faction, missionId, scenarioId and battleSide, and its save occupies the separate Campaign-battle slot.

On the scenario's existing result screen, WC.recordVictory verifies the same campaign ID and scenario ID, the exact playable side and game.mode, and the presence of game.over with game.over.winner === game.player. On success it adds that ID for that faction only, persists it and derives tier unlocks. It is idempotent; it does not give HQ rewards. Unimplemented placeholder victory values are rejected by persisted-save sanitization.

There is deliberately no production progression cheat. The CommonJS-only testFixture export can emulate future campaign states in Node tests; it is not available in the browser.

## Verification commands

Run from repository root:

    node tools/build_sources.cjs --check
    node --test tests/war-campaign.test.cjs
    node --test tests/*.test.cjs
    node tests/ui-smoke.cjs
    node tools/validate_assets.cjs --tracked

Also test in a browser: start menu, Story Mode arcs, standalone Scenarios, Conquest, faction-specific map ownership, pan/zoom, locked/planned markers, and a real Campaign-launched scenario victory. Verify standalone Scenario victory does not unlock Campaign. Do not merge without explicit user approval.

## Invasion of South Africa implementation (branch-only)

- Standalone ID: `invasion-south-africa`; module: `dist/scenarios-south-africa.js`; registered in `E.scenarios.byId` and standalone selection.
- Map: 144×108 hexes; 10.5°E–39.5°E and 18°S–38°S. GSHHG intermediate coastline masks use exact 20/80 classification. The rendered map uses the same global GSHHG African geographic underlay and the centre-sampled hex projection.
- Scenario: 47 E.U. cities; Britannia begins without city ownership, with four loaded carrier formations, amphibious escorts and an offshore expedition; defender has fortifications and navy. Victory by conquering all opposing cities (or defender eliminating the cityless expedition). No turn deadline.
- Changes are branch-only, do not merge without explicit approval. Run `node --test tests/south-africa.test.cjs` and `node tools/south-africa_sim.cjs 6 all all`.
