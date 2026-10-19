# Invasion of Manchuria — independent scenario handoff

**Mission:** 9, Tier 3 • **World Campaign objective:** `eu-federation-manchuria` • **runtime ID:** `eu-cf-manchuria` • **base:** `feature/eu-vs-federation-campaign-architecture`

## Geography and fronts
- 144 × 112 sampled regional hexes, 105–137°E / 37.5–53.5°N, including northeastern Mongolia, Transbaikal, the Russian Amur region, Heilongjiang, Jilin, Liaoning, and the Liaodong coastline.
- Ten E.U.-controlled staging centers including Chita, Borzya, Zabaykalsk, Choibalsan, Blagoveshchensk and Khabarovsk. The Chinese Federation holds 39 northeast Chinese cities, including Manzhouli, Qiqihar, Harbin, Changchun, Jilin, Shenyang, Anshan, Dalian and Dandong.
- Northeast China industrial / railway axis: Qiqihar–Daqing–Harbin–Changchun–Siping–Shenyang–Dalian. Hailar and Manzhouli defend the western approach; Heihe and Jiamusi defend the Amur / north-east approaches.
- Major geographical waterways are represented as map overlays: Amur/Argun, Nen, Songhua, Liao and Yalu. The Great Khingan and Changbai forests/mountains are present; passable railway/valley approaches remain.
- Coastal atlas source: existing `dist/korea-landmask.js` (southern/eastern coast) plus scenario-owned Liaodong/Bohai continuation. Mixed coasts use 25 subhex samples with 20/80 cutoffs. Dalian, Yingkou, Panjin and Huludao have discrete city-adjacent capturable ports and conventional Chinese fleets.

## Setup and mechanics
- Two playable factions (`eu`, `cf`), standard `E.typeFor` classes, named commanders, per-city Army Groups, `E.prepareEliteEurope` on Elite, faction-filtered `eliteRosters`.
- Normal / Hard / Challenge / Elite setups, normal city-level income/industry/science and `E.income`-calibrated scenario funding; no scenario-specific forced research or free technologies.
- EU ground formations: **117**; CF ground formations: **149**. Defenders have more industrial cities and fortified urban strongholds; the invasion relies on opening force superiority. Balance by formation counts, not global unit stats.
- `meta.ai`: europe doctrine, recovery, EU route bias, northern operational axes and Chinese hub defense. Standard AI production remains enabled. Winner is determined exclusively by one side controlling all 49 cities. No scripted time-limit victory.
- Performance: 16,128 hexes and no costly per-frame procedural terrain generation; terrain is generated once during scenario setup.

## Integrator only
Do **not** change these within this scenario PR:
1. Add to `SCENARIO_MANIFEST` in `dist/scenario-manifest.js`: `{id:"eu-cf-manchuria",title:"Invasion of Manchuria",note:"49 cities · 2 sides"}`.
2. Add to `SCENARIO_FILES` after `korea-landmask.js`: `'scenarios-eu-cf-manchuria.js'`; `korea-landmask.js` must load first.
3. Run `node tools/generate-scenario-catalog.cjs` and commit `dist/scenario-catalog.js` as an integrator change.
4. Once verified, change *only* `eu-federation-manchuria` objective's `scenarioId:null` in `dist/war-campaign.js` to `'eu-cf-manchuria'`, retaining later placeholders. Campaign rewards and progression are inherited without overrides.

## Tests requested before integration
```sh
node --check dist/scenarios-eu-cf-manchuria.js
node tools/scenario_sim.cjs eu-cf-manchuria eu normal 11 5
node tools/scenario_sim.cjs eu-cf-manchuria cf normal 11 5
node tools/scenario_sim.cjs eu-cf-manchuria eu normal 17 25
node tools/scenario_sim.cjs eu-cf-manchuria cf normal 17 25
node tools/scenario_sim.cjs eu-cf-manchuria eu elite 11 3
node tools/scenario_sim.cjs eu-cf-manchuria cf elite 11 3
```
**Integration prerequisite:** Because the simulation harness only imports local `scenarios*.js` alphabetically, it can load this module after `korea-landmask.js`; if a harness imports modules in a different order, explicitly require `korea-landmask.js` before this scenario. Compare existing scenario fingerprints with baseline and check port positions / save reload before enabling campaign entry.
