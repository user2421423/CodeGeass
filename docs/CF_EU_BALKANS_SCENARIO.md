# Balkan Offensive — Chinese Federation vs E.U.

- **Scenario:** `cf-eu-balkans` · **Objective:** `federation-eu-balkans` (Tier 4, battle 10)
- **Ownership:** scenario branch `scenario/cf-eu-balkans`, based on `feature/federation-vs-eu-campaign-architecture`
- **Files:** `dist/scenarios-cf-eu-balkans.js` and `dist/cf-eu-balkans-coast.js` only, plus this note.
- **Sides/difficulties:** `cf`, `eu` · Normal, Hard, Challenge, Elite. Victory strictly requires controlling all 57 cities; there is no turn or score win condition.

## Battle design

The Chinese Federation controls eight genuine Turkish Thrace and Dardanelles bases: Istanbul, Edirne, Kirklareli, Tekirdag, Corlu, Ipsala, Canakkale and Gelibolu. The E.U. holds 49 starting cities across Greece, Bulgaria, Serbia, North Macedonia, Kosovo, Albania, Montenegro, Bosnia-Herzegovina, Croatia and Romania. Territorial control is alternate-history. Actual WGS84 settlement coordinates govern placement, and provinces inherit their closest city on the same land component (the hex-scale political borders are **not** precise modern country polygons).

- **Primary axes:** (1) Edirne–Svilengrad–Haskovo–Plovdiv–Sofia, (2) Ipsala–Alexandroupoli–Komotini–Kavala–Thessaloniki, (3) Istanbul–Burgas–Varna–Constanta–Bucharest, (4) Aegean–Thessaloniki–Skopje–Nis–Belgrade. The Dardanelles Expedition and carriers enable maritime flanking operations.
- **Defense:** E.U. forward Maritsa, Rhodope and Aegean commands, reserve lines at Sofia, Thessaloniki, Skopje and Belgrade, and inland Danube/Romanian reserves.
- **Geography:** 160 × 116 tiles, W15.0–E31.8, N47.3–S34.8; intermediate-resolution GSHHS polygons packed into a self-contained two-bit coastal dataset. Narrow Dardanelles/Bosporus passages are explicitly carved at grid resolution. The connected navigable component contains 7,344 sea hexes; isolated raster lagoons cannot host harbours. The Rhodopes, Balkan Mountains, Rila/Pirin, Pindus, Dinarics and Carpathians influence passable terrain, with named passes remaining open.
- **Rivers and roads:** Maritsa, Danube, Sava, Morava, Vardar, Struma and Nestos; 439 non-bridge crossing penalty edges. City bridges include Edirne, Svilengrad, Plovdiv, Ruse, Belgrade, Skopje and others. Seven overlay highway corridors cover Thrace/Sofia, Via Egnatia, Morava–Vardar, Black Sea, Danube, Adriatic and mainland Greece.
- **Navy/ports:** 18 independently capturable port hexes in the Aegean, Adriatic, Black Sea and Marmara; 23 naval units initially. Every harbour has an adjacent connected water hex; carrier and frigate classes follow original faction equipment. Seas are geographic, not invented land crossings.
- **Armies and economy:** eight Chinese field commands plus E.U. border/interior defenses, with the engine's `E.typeFor` faction-specific land classes, named commanders, land/sea unit placement, realistic city production statistics and `E.income` funding. Initial formations: Chinese Federation 91, E.U. 138, **including fleets**. Both have cities, deployable land, recruiting industry and research. No new commander, Elite Force, economy, repair, victory or AI engine code.
- **HQ/Elite:** the existing `E.prepareEliteEurope` and side-filtered `eliteRosters` are used on Elite; the existing HQ restrictions, Elite production, rewards, medal rules, research and repairs are delegated to engine logic, not circumvented in scenario code.
- **AI:** `meta.ai.doctrine='europe'`, `recovery:true`, `routeBias:'cf'`, named `operationalAxes`, defender hubs and synchronized flotillas. Operational routes are mirrored in the serializable `g.scenario.offensiveAxes` and `operationalFronts`. No scenario-ID-specific engine conditions.

## Validation performed

A JavaScript-isolate structural harness loaded **both scenario source files**, decoded the map, and constructed the new scenario under a minimal **engine stub** (not the actual game engine) in eight combinations: Chinese and E.U. player side × Normal, Hard, Challenge and Elite. All eight initialized with **57 cities (8 Chinese, 49 E.U.), 229 total starting units (91 Chinese, 138 E.U.), 18 port hexes, 23 ships, 35 land/naval group records and 439 river-crossing edges**. Each built scenario had a nonempty side-filtered Elite roster and did not claim an immediate winner. A water-connectivity flood fill of 7,344 navigable sea hexes reached **all 18 harbour sea hexes**. Early checks uncovered and fixed a disconnected Dardanelles strait and invalid tiny-lagoon port access.

**Important:** These are **not** full-engine AI battle results. The actual Node engine build, AI turn loop, recruitment, repairs, research, saves, progression/rewards, browser and mobile UI are not present in the isolated evaluation environment. No claims are made that this battle has passed seeded AI simulations, gameplay balance, mobile performance or real save/reload tests. The integrator must run those gates **before registering or merging the scenario as playable**.

## Integrator-owned registration and load order

Do not commit these shared edits from the scenario branch. The central integrator must add:

1. `SCENARIO_MANIFEST`: `{id:'cf-eu-balkans',title:'Balkan Offensive',note:'57 cities · 2 sides · Chinese invasion of the Balkans'}`.
2. `SCENARIO_FILES`, in this order: `'cf-eu-balkans-coast.js'`, then `'scenarios-cf-eu-balkans.js'`.
3. Regenerate `dist/scenario-catalog.js` with `tools/generate-scenario-catalog.cjs` and any required generated catalog metadata.
4. Replace only the `federation-eu-balkans` objective's `scenarioId:null` with `'cf-eu-balkans'` in the Federation vs E.U. campaign registry, after verifying `create('cf',difficulty,seed)`, `create('eu',difficulty,seed)` and `winner`.
5. Replace the **provisional campaign-world Balkans political overlay** with verified country boundaries, separate from this tactical module. No current shared manifest/registry/overlay files were touched.

## Required engine and balance verification

From the architecture branch **with the scenario module integrated for testing**:

```bash
python3 tools/build_sources.py
node tools/scenario_sim.cjs cf-eu-balkans cf normal 11 5
node tools/scenario_sim.cjs cf-eu-balkans eu normal 11 5
node tools/scenario_sim.cjs cf-eu-balkans cf normal 21 50
node tools/scenario_sim.cjs cf-eu-balkans eu normal 21 50
node tools/scenario_sim.cjs cf-eu-balkans cf normal 37 75
node tools/scenario_sim.cjs cf-eu-balkans eu normal 37 75
node tools/scenario_sim.cjs cf-eu-balkans cf hard 11 10
node tools/scenario_sim.cjs cf-eu-balkans eu challenge 11 10
node tools/scenario_sim.cjs cf-eu-balkans cf elite 11 10
node tools/scenario_sim.cjs cf-eu-balkans eu elite 11 10
node tools/scenario_sim.cjs --all > /tmp/now.txt
# Compare old scenario lines against tools/data/sim_baseline.txt;
# the integrator owns addition of the new scenario's fingerprint baseline.
node tools/validate_assets.cjs --tracked
node tools/federation_eu_campaign_smoke.cjs
```

Additionally verify all four difficulties for **both** sides, multiple seeds and longer games (capture timelines, error counts, production, fleet paths and victory); independent port capture/repair and naval recruitment; city upgrades, research, elite recruitment/HQ caps, user-controlled saves/reloads; proper medals/rewards only on genuine conquest; mobile frame/render responsiveness; and no unrelated scenario regressions. Aim for both players to win Normal with deliberate play. If offense stalls, primarily **increase friendly starting formations or reduce hostile formations** within this scenario module; do not patch shared engine rules.

## Known integration restrictions

- No engine-wide AI, commander data, catalog, reward logic, manifest, generated bundles, other scenarios or `main` are changed.
- The GSHHS coastline is geographically detailed but necessarily rasterized. City-controlled province tiles are closest-city approximations rather than authoritative international borders.
- Base scenario remains unregistered until explicit integrator quality gates complete. Do not merge this PR as a completed campaign mission without the pending gameplay tests.
