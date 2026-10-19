# Battle of Luoyang — E.U. vs Chinese Federation

- Runtime scenario ID: `eu-cf-luoyang`; campaign objective: `eu-federation-luoyang` (mission 13, Tier 6).
- Owned: `dist/scenarios-eu-cf-luoyang.js`, this scenario design note. No other source, original Luoyang scenario, or campaign registry edits.
- Geographic inheritance: 83 real cities, Henan / Shanxi approaches, 174 × 116 hexes, Yellow/Luo/Yi/Qin/Huai rivers and six bridge/fords, Qinling/Taihang pass corridors. Independent clone, no runtime module dependency on original.
- E.U. 18 northern and southwestern staging cities, China 65 fortified/interior/eastern cities. Starting formations **E.U. 125** / **China 120**. E.U. superiority in field strength counterbalances Federation city/factory advantage. The numbers are provisional pending simulation.
- E.U. northern axes: Handan–Xinxiang–Zhengzhou; Changzhi–Jincheng–Jiyuan; Linzhou–Jiaozuo; Puyang–Kaifeng. Southwestern: Nanyang–Pingdingshan–Yichuan; Dengzhou–Songxian; Xichuan–Sanmenxia. All converge on Luoyang.
- Mainland inland theatre; no ocean coast/seaports/naval fleet. Yellow River has playable land bridges and standard transport water tiles; invented sea ports would be inaccurate.
- Faction-specific EU and Chinese unit mappings, 2017 Chinese lineup, named EU/CF commanders, separate Army Groups, 3/2 normal unit stacks, real industrial city output plus starting funding, shared AI factory production, research, Elite conversion. All four difficulties; winner only by every city held. No turn cap, scripted reinforcement, unique balance buffs or artificial completion.
- E.U.–China uses standard European theater AI (`meta.ai.doctrine:'europe'`). Original `guards:'luoyang'` filter assumes **Britannian** enemies and is intentionally not copied; changing it requires independent AI-lane work.

## Integrator manifest and campaign handoff (NOT changed here)

1. `SCENARIO_MANIFEST` entry: `{id:"eu-cf-luoyang",title:"Battle of Luoyang — E.U. vs Federation",note:"83 cities · 2 sides · final offensive"}`.
2. In `SCENARIO_FILES` add `'scenarios-eu-cf-luoyang.js'` **after** `'scenarios-luoyang.js'` (the clone is self-contained: only shared engine dependency). Run `node tools/generate-scenario-catalog.cjs` and inspect generated catalog.
3. Only after validation, update `eu-federation-luoyang` objective's `scenarioId:null` to `eu-cf-luoyang` in `dist/war-campaign.js`. Leave nine remaining planned operations untouched and preserve `battle-luoyang`.
4. Run `node tools/scenario_sim.cjs --all` and compare against `tools/data/sim_baseline.txt`; coordinate addition of the new-scenario fingerprints in the integrator lane without changing baseline lines of other missions.

## Runner QA required before merging

```sh
node --check dist/scenarios-eu-cf-luoyang.js
node tools/scenario_sim.cjs eu-cf-luoyang eu normal 11 5
node tools/scenario_sim.cjs eu-cf-luoyang cf normal 11 5
node tools/scenario_sim.cjs eu-cf-luoyang eu normal 19 30
node tools/scenario_sim.cjs eu-cf-luoyang cf normal 19 30
node tools/scenario_sim.cjs eu-cf-luoyang eu elite 11 5
node tools/scenario_sim.cjs eu-cf-luoyang cf elite 11 5
```

Also exercise normal/hard/challenge/elite setup, factory recruitment and AI production, 50+ turn simulations if feasible, saves, city/crossing reachability, unit/commander ownership, and absence of CI regressions. **These are outstanding executable tests, not claimed successful results.** The standalone harness discovers `dist/scenarios-*.js` directly; browser/UI registration remains integrator-owned.

## Observed checks (October 19, 2026)

**Independent static checks against the committed scenario source:** 83/83 source-city names and coordinates preserved from the original; 18/65 initial city ownership; all 25 distinct named commanders were found in the engine roster and matched their assigned factions; every army base belongs to its formation's faction; all 13 front origins belong to the specified side and objectives exist. A hex connectivity audit reconstructed the inherited relief, Yellow River cells, bridges and pass roads: **83/83 cities place successfully, six named bridges/fords exist, and all 83 cities are reachable within one non-peak land component**, with 1,022 peak tiles and 164 river water tiles. This audit is **not** a combat AI simulation.

**PR-triggered CI:** E.U.–Federation campaign architecture and Story Mode AI production checks passed. Source/build synchronization and gameplay deterministic-baseline checks reported failures in existing unrelated test cases (Kallen Breakthrough reposition, and existing Division Japan / Greenland scenario fingerprints, respectively); the Luoyang PR changes no shared engine or those scenarios. Recheck against the parent branch before treating failures as newly introduced. No full seeded Luoyang combat run has been completed and no Normal winnability conclusion can be claimed.
