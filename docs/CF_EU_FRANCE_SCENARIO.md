# CF–E.U. France: Invasion of France

**Scenario ID:** `cf-eu-france`  
**Campaign objective:** `federation-eu-france` (Tier 6 finale)  
**Owner file:** `dist/scenarios-cf-eu-france.js`  
**PR base:** `feature/federation-vs-eu-campaign-architecture`

## Mission

France is initially **100% E.U. controlled**. The Chinese Federation arrives from its preceding North African campaign with four Mediterranean task forces and **no French city or land formation ashore**. Its 18 carrier-battleships carry all 36 starting conventional land formations (two formations per carrier); ten Shui Gun-Ru II amphibious escorts accompany the transports. The E.U. starts with layered coast and interior defenses plus local naval groups.

The decisive routes are Marseille and Toulon -> Avignon/Valence -> Lyon -> Dijon/Orléans -> Paris, with a secondary landing at Nice through Grenoble and a separate Corsican operation. German and Italian territory is off-map and is not an entry lane. Corsica (Ajaccio and Bastia) is included as metropolitan France.

## Map and forces

- 142 x 104 continental/Corsican hex grid: longitude -5.85 to 9.65, latitude 40.95 to 51.55.
- **34 French cities**: Marseille, Toulon, Nice, Paris, Lyon, and the Atlantic/Channel, eastern, central, southwestern and Corsican objectives.
- Eleven *independently capturable* port hexes: Marseille, Toulon, Nice, Ajaccio, Bastia, La Rochelle, Brest, Cherbourg, Le Havre, Calais and Dunkirk. Their `portOwner` and `portAt` are separate from station owner and station hex.
- Geography uses an embedded coordinate-sampled outline of mainland France and Corsica, not an invented land route from the east. Adjacent sea tiles mark coast. The Alps, Pyrenees, and Massif Central add relief; the Rhone, Seine, Loire and Garonne have river-crossing edges and named bridge corridors.
- The geographic outline is an approximate tactical trace, **not a high-precision official shoreline polygon**. Audit every coastal hex and port access against authoritative GIS data before final campaign integration; adjust only this scenario's geometry or a scenario-owned coastal helper.
- The E.U. has 48 defensive land formations and ten naval units, including Mediterranean carriers and Frosch II interceptors; production and reinforcement after setup use shared industry/port/AI systems.
- Named E.U. commanders include Akito, Leila, Ayano, Pierre, Smilas and others. Named Federation commanders include Honggu, Cao, Meiling, Zhaohao and Xingke. Unit classes are created via `E.typeFor(side,cls,g)`, ensuring current faction and campaign-era frames.

## Rules and progression

- `sides: ['cf','eu']`; Normal, Hard, Challenge, Elite.
- Federation expedition survival: `meta.expeditionSide: 'cf'` and `g.scenario.citylessFunding: ['cf']`.
- Elite: `E.prepareEliteEurope(g)`, faction-limited `eliteRosters`, `meta.elite: true`, `meta.eliteRosterOnly: true`; conversion occurs **before** carrier embarkation.
- Named starting groups, cargo carrier IDs and `invasionGroup` support synchronized flotillas; `meta.ai.doctrine: 'invasion'`, `recovery: true` and operational axes use shared AI, never an ID-specific engine branch.
- City income, industry, naval recruitment, research, HQ unlock rules, fleet/land repairs, save compatibility, and rewards are delegated to the existing shared engine. The scenario does not mint special rewards or bypass HQ rules.
- Federation wins only when it owns **all 34** scenario cities. The E.U. wins by eliminating every surviving Federation formation (including cargo) **and** restoring all its cities. No arbitrary turn limit or instant loss for a cityless expedition.

## Scenario-owner startup checks performed

A JavaScript syntax parse and a scenario-creation *structural mock* were performed, for both sides and all four difficulties using seed 11. These checks are **not full-engine or gameplay tests**. The mock yielded:

| Check | Observed |
| --- | --- |
| Scenario parser | Passed |
| Both selectable factions | Passed |
| Four difficulty setup paths | Passed under mocked engine |
| Initial E.U. cities | 34 |
| Initial Federation cities | 0 |
| Federation hulls and marine escorts | 28 (18 carriers, 10 escorts) |
| Starting carrier cargo | 36 KMF formations |
| E.U. surface formations | 58 (land + ships) |
| Port city entries | 11 |
| Mainland + island playable land hexes | 5,852 |

The engine-load attempt hit an execution-tool limit. **Extended AI simulations, full-engine balance, actual capture/recruit/repair, all difficulty mechanics, map/naval reachability, save/reload, reward progression, mobile FPS, and regression baselines have not been verified.** Do not mark them passed or merge based on this structural check alone.

## Integrator-owned changes — do not apply on scenario PR

1. `dist/scenario-manifest.js`: add `{id:"cf-eu-france",title:"Invasion of France",note:"34 cities · 2 sides · Mediterranean landings"}` to `SCENARIO_MANIFEST`; add `'scenarios-cf-eu-france.js'` to `SCENARIO_FILES`. This scenario requires no additional external coast file.
2. `tools/generate-scenario-catalog.cjs`: add dependency entry `'cf-eu-france':['scenarios-cf-eu-france.js']`; regenerate `dist/scenario-catalog.js`.
3. `dist/war-campaign.js`: replace `scenarioId: null` for `federation-eu-france` with `cf-eu-france` **only after** all integration gates pass.
4. `dist/ui/war-campaign-screen.js` / strategic atlas: verify the France overlay follows actual French borders, excludes Germany/Italy and does not color any water (separate from this tactical theatre).
5. Baseline tooling `tools/data/sim_baseline.txt`: update only when a verified integrated scenario genuinely adds new fingerprints. Preserve prior scenarios and save credits.

## Required full-engine validation before integrating

```bash
node tools/build_sources.cjs
node --check dist/scenarios-cf-eu-france.js
node tools/scenario_sim.cjs cf-eu-france cf normal 11 5
node tools/scenario_sim.cjs cf-eu-france eu normal 11 5
for seed in 11 23 47; do
  for side in cf eu; do
    node tools/scenario_sim.cjs cf-eu-france "$side" normal "$seed" 100
    for difficulty in hard challenge elite; do
      node tools/scenario_sim.cjs cf-eu-france "$side" "$difficulty" "$seed" 10
    done
  done
done
node tools/scenario_sim.cjs --all > /tmp/sims-france.txt
node tools/validate_assets.cjs --tracked
node tools/federation_eu_campaign_smoke.cjs
```

**Before the manifest is integrated**, `scenario_sim.cjs` will load a `scenarios-*.js` file from `dist/` on Node and can select it by ID; the browser loader and generated catalog will not register it until the integrator adds the entries. Compare all existing baseline entries excluding the new scenario ID; investigate any pre-existing mismatch.

Additional hands-on/full-engine gates: verify landing reachability, independent port capture, viable ship paths off Marseille/Toulon/Nice and Corsica, no dry land on sea hexes, no off-map path from Germany or Italy, AI fleet disembarkation and reinforcements, EU production and actual counterattacks, late-game expedition survival, all four difficulty Elite/research/HQ restrictions, win and defeat rewards, reload at sea and after taking a port, and mobile draw/frame rates. Tune Normal **chiefly with more friendly formations or fewer enemy formations** and repeat the multi-seed runs.

**Status:** scenario-owned implementation committed for integrator review; **unmerged and not yet certified balanced**.
