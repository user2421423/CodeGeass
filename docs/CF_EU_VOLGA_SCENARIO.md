# CF vs E.U. — Battle for the Volga (cf-eu-volga)

**Ownership:** scenario lane only. **Base/PR target:** `feature/federation-vs-eu-campaign-architecture`.  
**Runtime ID:** `cf-eu-volga` · **Campaign objective ID:** `federation-eu-volga` · **Tier:** 3 (battle 7).
**Source:** `dist/scenarios-cf-eu-volga.js` (self-contained; no separate landmask file).

## Scenario
Two playable factions: Chinese Federation (`cf`) and E.U. (`eu`). The 164 × 112 north-up, centre-sampled hex theatre spans 40.5°E–60.7°E and 42.15°N–59.15°N. It contains **69 geographically placed cities** (30 CF staging, 39 E.U.), **274 starting formations** (157 CF, 117 E.U., including 13 Caspian naval units), and 30 operational Army Group/fleet containers. There are no Britannian participants.

- **Caucasus / lower Volga:** Stavropol, Makhachkala, Kizlyar, Elista, Salsk and Kotelnikovo feed coordinated Chinese drives on Kalach-na-Donu, Volgograd/Volzhsky and Kamyshin.
- **Delta / Caspian:** Makhachkala, Kaspiysk and Lagan support an assault on the E.U. harbor at Olya, Astrakhan and Akhtubinsk. Northern Caspian coastline is a self-contained map mask; fleets use only the connected Caspian basin.
- **Eastern operational front:** Orenburg, Buzuluk, Buguruslan and Ufa attack Pugachyov, Samara, Tolyatti, Ulyanovsk, Naberezhnye Chelny and Kazan through distinct axes.
- **E.U. defended industrial line:** Volgograd, Saratov/Engels, Balakovo, Samara, Ulyanovsk and Kazan begin with forts, factories, batteries, tiered industry and named E.U. officers; rear industry is retained at Penza, Nizhny Novgorod and Izhevsk.

`g.scenario.rivers` includes Volga, Kama, Akhtuba, Samara, Ural and Don polylines. River edges are applied through the existing `riverBarriers` contract; sixteen named bridge-city crossings waive the extra movement cost locally. No continuous impassable river tile barrier or artificial turn limit is introduced.

The four independent harbours (**Makhachkala, Kaspiysk, Lagan, Olya**) have `portAt`, `portLevel` and `portOwner`. Faction naval frames are `cf_carrier`, `shui_gun_ru_ii`, `eu_carrier` and `panzer_frosch_ii`. Both factions get factories, resources, standard recruitment, repair, research and Elite Force rosters from existing engine APIs; `meta.elite` and `eliteRosterOnly` keep Elite conversion and HQ constraints data-driven.

## Victory and AI
`winner(g)` returns a victor **only** after one faction owns **every one of the 69 cities**. `onTurn()` does not issue scripted victory or deadline checks. There are no neutral or Britannian victory candidates.

`meta.ai` requests standard `europe` doctrine with recovery and Chinese route bias, E.U. `riverlineDefense`, and twelve named attacker axes plus E.U. industrial defender hubs. These are data-driven hints to the shared AI, not new engine switches or scenario-ID hacks. Funding applies to both factions; Hard/Challenge enemy scaling uses existing patterns. Normal starts favor Chinese numbers to compensate for stronger entrenched E.U. positions, but real AI victory rates are not established yet.

## Validation performed
- **PASS, structural:** source parses as JavaScript; module exports `create`, `winner`, `objective`, `orderGroup`, `meta`; all 69 city entries, commander IDs, fleet types, Army Group origins and AI destination names refer to known game content.
- **PASS, isolated API test with engine stubs, not a full game run:** all eight combinations of CF/E.U. × Normal/Hard/Challenge/Elite construct the same full theatre; 69 stations, 274 deployed units, four attached coastal ports, 618 river barrier edges. Elite setup hook is invoked at the right difficulty.
- **PASS, isolated structural tests:** no duplicate IDs or invalid land unit locations, genuine initial no-winner condition, winning either side on complete city conquest, basic JSON save/parse round-trip, map positions close to provided real-world coordinates (worst sampled weighted deviation ~0.116°).
- **PASS, isolated coastal connectivity:** Caspian port hexes lie in the selected navigable water/coast component. The mock test does **not** validate actual naval AI or the full engine's movement rules.
- **NOT RUN:** real `node tools/scenario_sim.cjs` seeded/extended AI turns, full-engine 4-difficulty outcome comparison, real recruitment/repairs, build/asset validation, real save/reload progression, reward/medal checks, mobile FPS, and `--all` regression baseline. No CI or local executable checkout was available within this session; do not infer Normal win rates from setup checks.

## Commands for full-engine QA before integration
```bash
python3 tools/build_sources.py
node tools/scenario_sim.cjs cf-eu-volga cf normal 11 5
node tools/scenario_sim.cjs cf-eu-volga eu normal 11 5
for seed in 11 27 43; do
  for side in cf eu; do
    for difficulty in normal hard challenge elite; do
      node tools/scenario_sim.cjs cf-eu-volga "$side" "$difficulty" "$seed" 50
    done
    node tools/scenario_sim.cjs cf-eu-volga "$side" normal "$seed" 150
  done
done
node tools/scenario_sim.cjs --all > /tmp/volga-sim.txt
# compare only pre-existing scenarios against tools/data/sim_baseline.txt
node tools/validate_assets.cjs --tracked
```
The scenario is **not certified balanced or complete until these full-engine tests and interactive/mobile checks pass**. Adjust primarily by adding CF/E.U. friendly starting units or removing enemy units, not modifying shared combat rules. Verify AI crossings, AI production, independent ports, elite rules, victory and saved rewards.

## Integrator-only dependencies (not edited here)
1. Add `{id:"cf-eu-volga",title:"Battle for the Volga",note:"69 cities · 2 sides · Volga riverline"}` to `SCENARIO_MANIFEST` in `dist/scenario-manifest.js`.
2. Insert `'scenarios-cf-eu-volga.js'` in `SCENARIO_FILES` after prerequisites (`scenarios.js`, engine data) and update/regenerate `dist/scenario-catalog.js` through the catalogue generator as appropriate.
3. Replace `scenarioId: null` for objective `federation-eu-volga` with `'cf-eu-volga'` **only after full verification**. Campaign objective and tier structure stay unchanged.
4. Integrator owns the simulation baseline update, if needed, and campaign/manifest wiring. No engine/AI/rendering changes are requested; any issue discovered in live tests must be handed off to its owner.

**Delivery:** implementation is committed exclusively to `scenario/cf-eu-volga`; open PR targets the architecture branch and must remain unmerged until reviewed.
