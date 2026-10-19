# Battle for Xinjiang — E.U. / Chinese Federation
## Ownership and integration
- Runtime ID: `eu-cf-xinjiang`; campaign objective: `eu-federation-xinjiang` (mission 6, tier 3).
- Scenario owner file: `dist/scenarios-eu-cf-xinjiang.js`.
- Owns its relief model, city coordinates, Army Groups, difficulty configuration, economy, AI front axes, and self-contained painting; no external scenario assets.
- PR from `scenario/eu-cf-xinjiang` into `feature/eu-vs-federation-campaign-architecture`. Do not merge into `main` without further approval.

## Theatre and design
- 144 x 96 geographic-sample hex theatre: 73–96.5° E, 35.6–50.3° N.
- **70 settlements** (19 western E.U. staging cities in Kazakhstan; 51 Federation-held Xinjiang cities). Ūrümqi / Ürümqi is the Federation's main industrial defensive city; Almaty anchors E.U. supply.
- Openings: Dzungarian Gate / Alashankou from Dostyk, Horgos through the Ili Valley, Zaysan–Jimunai through the Altai frontier, and eastern entries from the Narynkol–Tianshan line. Each has a distinct AI operational front; Federation counterattacks can use the same main corridors.
- Taklamakan, Gurbantunggut and Kumtag are `desert` terrain (default desert attrition). Tianshan, Kunlun/Pamir, Altai, Dzungarian Alatau arcs use approximate geographic control points and normal `mountain` movement/defense rules; roads/pass centers are carved into traversable plains. They are *cartographic approximations*, not a high-resolution digital elevation model.
- Lake Balkhash, Alakol and Issyk-Kul are shaded by the scenario's `paintRelief` and are blocked `peak` hexes for pathfinding. All lakes are landlocked: **no sea shipping, artificial coastal ports, shipyards, or naval units**.
- Named passes include Dzungarian Gate, Horgos, Jimunai gap, Ili Valley, Duku crossing, Muzart historical pass, and Turpan Basin gap. No artificial impassable wall across the E.U. approach.

## Order of battle and rules
- 113 E.U. versus 120 Federation starting formations, 19 Army Groups, commander-equipped HQ groups and local garrisons (figures subject to simulation-based balancing). Named commanders use only their actual faction; no BK/Britannian unit substitutions.
- Factory cities and opening resources for **both** factions; localizable `g.scenario.funding` follows regional income convention and the existing AI may research, produce, recover and counterattack. No custom resource buffs or universal changes.
- `meta.elite:true`, faction-specific `eliteRosters`, `E.prepareEliteEurope` conversion, Normal/Hard/Challenge/Elite, standard research and progression, `saveVersion:1`. Elite naval rules have no effect because this is a landlocked scenario.
- Victory is capture of **every enemy city** (all 70 under the victor); `winner` has no scripted turn cap or synthetic success. `onTurn` introduces no event-based victory bonuses.
- Full map costs 13,824 tile cells. Terrain is precomputed once on setup and shared drawing is unchanged.

## Verified checks and outstanding acceptance work
- Scenario source JavaScript syntax: PASS (`new Function` parse).
- Standalone scenario initialization against a **lightweight compatible engine test harness**, both E.U. and Federation, all four difficulties: PASS (8/8). All 70 city cells valid and not blocked; all 233 units faction-correct; all commander IDs valid; both sides have positive starting industry/income; 0 sea cells; 233 initial Elite conversions in stubbed Elite test.
- Caveat: these are **not complete production-engine simulations**. The engine mock exercises scenario structure and authored data, not true combat / pathfinding / AI production. No seeded combat wins, long tests, save/reload or browser render timing can be responsibly reported as passed from the connected GitHub editing environment.
- Required integrator / full-run validations:
  1. `node tools/build_sources.cjs`
  2. `node --check dist/scenarios-eu-cf-xinjiang.js`
  3. `node tools/scenario_sim.cjs eu-cf-xinjiang eu normal 11 5`
  4. `node tools/scenario_sim.cjs eu-cf-xinjiang cf normal 11 5`
  5. `node tools/scenario_sim.cjs eu-cf-xinjiang eu normal 19 30`
  6. `node tools/scenario_sim.cjs eu-cf-xinjiang cf normal 19 30`
  7. `node tools/scenario_sim.cjs eu-cf-xinjiang eu elite 11 5` and `cf elite 11 5`
  8. `node tools/scenario_sim.cjs --all` compared to `tools/data/sim_baseline.txt` (coordinate expected new lines with integrator).
  9. `node tools/validate_assets.cjs --tracked`, campaign architecture smoke, production, gameplay/save/reload checks, and map preview.
- Tune Normal first by reducing Federation starting formation counts or adding E.U. formations where viable if seeded tests show a stall. Do not claim Normal victory without simulation evidence.

## Integrator-only manifest and campaign entries (do not commit these from scenario lane)
- `dist/scenario-manifest.js` → `SCENARIO_MANIFEST`:
  `{id:"eu-cf-xinjiang",title:"Battle for Xinjiang",note:"70 cities · 2 sides · Tianshan passes"}`
- `dist/scenario-manifest.js` → `SCENARIO_FILES`: `'scenarios-eu-cf-xinjiang.js'` after the common `scenarios.js` prerequisite. There are no map helper dependencies.
- Rebuild `dist/scenario-catalog.js` with `node tools/generate-scenario-catalog.cjs`.
- Only after verified, set `dist/war-campaign.js` objective `eu-federation-xinjiang` from `scenarioId:null` to `scenarioId:'eu-cf-xinjiang'`; do not alter the other nine placeholder objectives.
