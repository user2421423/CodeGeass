# Invasion of Kazakhstan — E.U. vs Chinese Federation

## Ownership and integration

- **Runtime ID:** `eu-cf-kazakhstan`; campaign objective: `eu-federation-kazakhstan` (#4, tier 2).
- **File owned by this lane:** `dist/scenarios-eu-cf-kazakhstan.js`.
- **Other file in this lane:** `docs/EU_CF_KAZAKHSTAN_SCENARIO.md`.
- Parent architecture: `feature/eu-vs-federation-campaign-architecture`.
- **No changes** to `main`, `dist/war-campaign.js`, `dist/scenario-manifest.js`, `dist/scenario-catalog.js`, shared engine/AI, rewards or other scenarios. Integrator must register the scenario before it can launch normally.

### Manifest handoff — integrator only

Add this entry to `SCENARIO_MANIFEST`:

```js
{id:"eu-cf-kazakhstan",title:"Invasion of Kazakhstan",note:"65 cities · E.U. vs Chinese Federation · steppe offensive"},
```

Add this file after `scenarios-urals.js` in `SCENARIO_FILES`:

```js
'scenarios-eu-cf-kazakhstan.js',
```

There are **no external map helper dependencies**. Prerequisites are the normal `engine.js`, faction unit/commander data, AI, and default `regionalRivers` overlay, already loaded for other scenarios. The scenario is self-contained.

After the integrator verifies this PR, change only mission #4 in `dist/war-campaign.js` from `scenarioId:null` to `scenarioId:'eu-cf-kazakhstan'`, then run `node tools/generate-scenario-catalog.cjs` and ensure the generated catalog and campaign architecture checks pass. All remaining nine missions should stay planned.

## Geographic design

This is a **156 × 104** projected WGS84 hex theater (`44.5°–87.5°E; 40.6°–56.4°N`). City positions are real settlement control points; their initial ownership is explicitly alternate-history fiction. It includes Russian staging cities and the western, central, northern, eastern and southern Kazakhstan approaches.

- **Northern and Siberian fronts:** Samara, Orenburg, Troitsk, Kurgan, Omsk and Barnaul stage separate E.U. columns. The Federation holds Kostanay, Petropavl, Astana, Ekibastuz, Pavlodar, Semey and Oskemen.
- **Western and southern fronts:** Oral, Atyrau, Aktobe, Aktau, Aralsk, Kyzylorda, Turkistan and Shymkent anchor Chinese defense belts.
- **Industrial objectives:** Kostanay/Rudny, Astana, Karaganda/Temirtau, Zhezkazgan, Pavlodar/Ekibastuz, Semey/Oskemen, Almaty/Taldykorgan.
- **Terrain:** wide traversable open steppe for armored maneuver; patterned northern woodland and mountainous Altai and Tien Shan rims. Named Korday Pass, Dzungarian Gate and Altai/Irtysh valley are deliberately passable; no `peak` walls cut off conquest paths.
- **Rivers and rail axes:** the Ural, Tobol, Ishim, Irtysh, Syr Darya and Ili systems, with five named logistical corridors. The `regionalRivers` drawing overlay uses normal game rendering.
- **Inland water:** approximate shoreline and 20–80% mixed coast sampling for the **Caspian Sea**, distinct from the disconnected Aral, Balkhash and Zaysan lakes. No open-ocean access. Four **independent Caspian harbor tiles** (Astrakhan, Atyrau, Aktau and Fort-Shevchenko). Short EU and Federation amphibious flotillas start in the Caspian. No lake-to-lake naval teleportation.

The coastline is a deliberately simplified control-point approximation rather than a raster shoreline product. Continental province borders follow the existing nearest-city ownership convention. The Caspian does not count as open ocean or a route to another inland lake.

## Gameplay configuration

| Item | Setup |
| --- | --- |
| Factions | `eu` and `cf` only |
| Starting cities | E.U. 12; Federation 53 |
| Starting land formations | E.U. 149; Federation 119 |
| Caspian amphibious starts | E.U. 3; Federation 4 |
| Army groups | 35, including three Caspian flotillas |
| Named commanders | 28; all are native to their faction |
| Opening effective funding / turn | E.U. 1,180 credits / 960 industry / 105 science / 62 sakuradite; Federation 980 / 810 / 110 / 66 |
| Initial reserves | Twice effective opening per-turn funding |
| Normal | Base formation stacks and funding |
| Hard | Existing enemy stack and funding upgrades |
| Challenge | Existing stronger enemy upgrades |
| Elite | `meta.elite:true` and standard `prepareEliteEurope` conversion on all `api.sides` |
| Victory | All 65 cities under one side; no deadline or alternate victory trigger |

**Balance rationale:** The Federation has over four times as many starting cities and stronger geographical depth. E.U. forces instead begin with a roughly 1.25:1 advantage in land formation count and slightly higher effective starting industry, distributed across four operational routes. These counts are a **provisional play-balance hypothesis**, not a verified win-rate. Later changes should first redistribute/increase/decrease starting forces instead of adding arbitrary multipliers.

City factories, income, research, commander assignment, Army Group destinations and faction-appropriate `E.typeFor` units use the existing regional engine. `g.scenario.eliteRosters` is generated from native `ELITE_FORCES.availableTo` only. The scenario supplies no custom reward, medal, fragment, progression or production overrides.

## Validation performed

The authoring environment could read GitHub files and commit the scenario but could not run the repository's Node-based `tools/scenario_sim.cjs` or a source build (the untracked bundles and repository shell are unavailable in this environment). **Do not mistake the following setup tests for completed AI simulations or confirmed Normal winnability.**

Completed checks directly against the committed scenario module and actual GitHub `frames.js` and `commanders.js` definitions, using a stub for engine creation primitives:

- JavaScript syntax compiled.
- All four difficulties initialized for both `eu` and `cf`, seed 11: 8/8 configurations.
- All 65 city placements succeeded; largest projection displacement below 0.3 degrees after coastline adjustment.
- 149 + 3 E.U. land/amphibious units and 119 + 4 Federation land/amphibious units spawned, all with valid faction unit types.
- 28 named commander IDs all matched the appropriate native faction.
- Army Group unit IDs resolved with no overlaps; the four harbor tiles were valid sea and connected within the Caspian basin.
- State survived JSON serialize/parse; Elite setup dispatch is called on Elite only.
- Total-conquest objective references all 65 cities; no turn-limit victory logic.

**Not yet executed:** real-engine AI production and research, combat/captures, coast mobility/pathfinding, save/load through the actual engine, long-run battle balance, source build, regressions against `tools/data/sim_baseline.txt`, and browser performance. These need integrator/CI runs; until they pass, gameplay balance remains unverified.

## Required seeded test matrix

Once registered locally on the integrator branch (or temporarily loaded in the simulation harness), run:

```bash
python3 tools/build_sources.py
node tools/scenario_sim.cjs eu-cf-kazakhstan eu normal 11 5
node tools/scenario_sim.cjs eu-cf-kazakhstan cf normal 11 5
node tools/scenario_sim.cjs eu-cf-kazakhstan eu normal 29 30
node tools/scenario_sim.cjs eu-cf-kazakhstan cf normal 29 30
node tools/scenario_sim.cjs eu-cf-kazakhstan eu normal 101 60
node tools/scenario_sim.cjs eu-cf-kazakhstan cf normal 101 60
node tools/scenario_sim.cjs eu-cf-kazakhstan eu elite 11 5
node tools/scenario_sim.cjs eu-cf-kazakhstan cf elite 11 5
node tools/scenario_sim.cjs --all > /tmp/kazakhstan-sim-baseline.txt
diff -u tools/data/sim_baseline.txt /tmp/kazakhstan-sim-baseline.txt
node tools/validate_assets.cjs --tracked
node tools/eu_federation_campaign_smoke.cjs
```

Verify bidirectional captures and unit production, not merely no exceptions; inspect at least two longer seeds for each faction. Check actual move/attack metrics, no multi-turn front stall, lakes and ports, Elite conversions, performance on mobile, and total-conquest logic. Compare unrelated scenarios against the existing baseline; coordinate new baseline rows with the integrator only. The **planned** campaign objective must remain unlaunchable until the integrator explicitly enables the scenario.

## Open issues / dependencies

1. **Integration required** in the shared scenario manifest and generated catalog before normal browser/menu access or `scenario_sim.cjs` discovery. This is intentionally deferred because the architecture contract reserves it for the integrator.
2. **Full AI simulations still required** for both factions and longer runs; Normal winnability cannot yet be certified.
3. **Exact Caspian shoreline and responsive rendering** still require visual inspection in the browser against a geographic reference, although the initial cell and port connectivity checks passed.
