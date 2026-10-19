# EU–Chinese Federation: Invasion of Sichuan

**Scenario:** `eu-cf-sichuan` · Mission 11 of the E.U.–Federation World Campaign
**Campaign objective (integration only):** `eu-federation-sichuan` · Tier 5, Conquest of China
**Ownership:** scenario lane. This PR intentionally does not alter `main`, the campaign registry, scenario manifest/catalog, other scenarios, engine, AI, or map-rendering shared code.

## Scenario content

- Standalone module: `dist/scenarios-eu-cf-sichuan.js`; registered at runtime in `Knightmare.scenarios.byId['eu-cf-sichuan']`.
- Both playable factions: `eu`, `cf`; no Britannian, Black Knights or neutral armies. Military deployment is an alternate-history campaign construction.
- **62 historic/geographically located cities:** 12 E.U.-held Tibetan staging towns including Chamdo, Markam and Jomda; 50 Chinese Federation settlements spanning the Hengduan uplands, Chengdu Basin, the southern Jinsha–Yalong corridors and eastern Sichuan.
- Geographic WGS84 regional bounds **94.0°–109.1° E, 26.1°–34.3° N**; **148 × 108** centre-sampled tactical hexes (15,984 tiles). Relief is derived from labelled regional envelopes and named route control points; not a survey-grade digital elevation model.
- Three western invasion routes deliberately opened to ground movement: **Gonjo–Dege–Garze** (north), **Markam–Batang–Litang–Kangding** (centre), and **Xiangcheng–Daocheng–Xichang** (south). Separate basin highways and relief approaches connect the cities.
- Mountain/peak defense and terrain costs, with the rivers **Jinsha, Yalong, Dadu, Min, Tuo and Jialing** represented as inland defensive lines. River crossing control points include Batang, Tianquan, Dujiangyan, Leshan and Nanchong. Inland rivers are never marked as ocean hexes and cannot create implausible carrier paths.
- The theatre is wholly inland: **zero sea hexes, zero seaports and zero naval fleets**. Independent ports are not relevant geographically.
- Distinct named Army Groups and commanders on both sides, E.U. pass assault formations and strong Federation basin/river reserves.
- Standard faction Knightmare class lookup (including the 2017 Chinese roster), economy, industry, recruitment, production and research. Normal opens with **118 E.U.** and **112 Federation** formations. Both sides receive nonzero starting income and industry.
- Four supported difficulty values: `normal`, `hard`, `challenge`, `elite`. Hard and Challenge use the existing enemy formation stack / resource rules. Elite invokes the shared `prepareEliteEurope` converter, faction-eligible elite rosters and rival research scaling; no bespoke Elite or commander stats.
- `meta.ai.doctrine:'europe'`, `meta.ai.recovery:true`, `operationalFronts` and `groups` provide native AI priorities and coordinated multi-axis fighting. No new engine case logic.
- `winner` requires **all 62 cities** belonging to one faction; `onTurn` adds no scripted units; there is **no turn limit** or fake win/credit. Reward and HQ behavior remain the pre-existing framework's responsibility. Optional `paintRelief` is self-contained and awaits the map-rendering lane's integration if a detailed river/road overlay is desired.

## Validation performed

The game’s real `src/engine` and `src/ai` source parts, together with its `dist/engine/*` data modules, were assembled and evaluated in a JavaScript V8 test environment, then the new scenario module was loaded. This exercises the actual engine and AI logic, not mocked combat.

- All **8 start configurations** (`eu`/`cf` × Normal/Hard/Challenge/Elite) initialized successfully. Elite converted 230 starting formations to standard Elite units and configured 76 rival research nodes.
- Every one of 62 station positions occupies a unique, traversable tile; the Chamdo–Chengdu ground path is connected. **0 sea tiles and 0 port registrations**. Grid contains 1,398 peak tiles.
- The AI-versus-AI game loop mirrors the full-engine `tools/scenario_sim.cjs` behavior, including `beginTurn`, `aiProduction`, `aiNextActor` and `aiOrder`. Both sides generated armies, fought and captured/reclaimed cities with **zero recorded AI exceptions**.

### Seeded results (Normal)

| Player/first side | Seed | Simulated turns | Final EU cities | Final CF cities | Winner | E.U. production | CF production | Errors |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| E.U. | 11 | 5 | 16 | 46 | unfinished | 6 | 7 | 0 |
| Federation | 11 | 5 | 14 | 48 | unfinished | 6 | 7 | 0 |
| E.U. | 11 | 20 | 19 | 43 | unfinished | 23 | 29 | 0 |
| Federation | 23 | 20 | 17 | 45 | unfinished | 29 | 27 | 0 |
| E.U. | 11 | **62** | **62** | **0** | **E.U.** | 124 | 87 | **0** |
| Federation | 23 | **47** | **0** | **62** | **Federation** | 60 | 80 | **0** |

The longer simulations conclude by total city capture, showing winnability in either orientation and demonstrating that the front can continue moving after opening-turn attrition. They do not prove a particular human success rate or guarantee every seed is balanced.

The testing sandbox could not execute the repository's Node CLI directly or run the complete `--all` fingerprint regression, full source-build CLI, asset validator, interactive browser performance measurements, or pack/unpack save-reload. The integrator/PR CI should verify those separately. Do not change a shared baseline inside this scenario PR.

## Integrator handoff

**Required menu manifest row** for `SCENARIO_MANIFEST` in `dist/scenario-manifest.js`:

```js
{id:"eu-cf-sichuan",title:"Invasion of Sichuan",note:"62 cities · E.U. vs Federation · Tibetan passes"},
```

**Required `SCENARIO_FILES` entry**, after the engine/data and before scenario use:

```js
'scenarios-eu-cf-sichuan.js',
```

There is **no scenario-local helper JS file** and no extra load-order dependency on other scenario files. The module requires the standard `Knightmare` engine, shared scenario registration, Army Group support, AI and core faction data, just like the existing regional operations.

After accepting this scenario, the integrator regenerates `dist/scenario-catalog.js` with `node tools/generate-scenario-catalog.cjs`, ensures menu visibility, and changes only the `eu-federation-sichuan` objective from `scenarioId:null` to `scenarioId:'eu-cf-sichuan'` in `dist/war-campaign.js`. All remaining E.U.–Federation mission placeholders remain locked until their scenarios have been verified. No changes to the original `battle-luoyang` runtime or other existing scenarios.

Recommended integration checks: `node tools/scenario_sim.cjs eu-cf-sichuan eu normal 11 5`; `node tools/scenario_sim.cjs eu-cf-sichuan cf normal 11 5`; `node tools/scenario_sim.cjs --all` compared with `tools/data/sim_baseline.txt`; Elite setup, save-reload, responsive mobile/browser rendering, `node tools/validate_assets.cjs --tracked` and World Campaign reward/progression after manifest integration.
