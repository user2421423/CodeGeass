# Battle of Beijing — independent E.U.–Federation regional operation

- **World Campaign objective:** `eu-federation-beijing` (mission 12, Tier 5).
- **Runtime scenario:** `eu-cf-beijing`; **registration key:** `euCfBeijing`.
- **Scenario module:** `dist/scenarios-eu-cf-beijing.js`.
- **Campaign base:** `feature/eu-vs-federation-campaign-architecture`.
- **Sides:** `eu`, `cf`; supported difficulties: Normal / Hard / Challenge / Elite.
- **Map:** 176 × 112 hexes, 114.3°–125.2° E and 37.4°–43.3° N; Beijing–Tianjin–Hebei–Liaoxi–southern Manchuria.
- **Cities:** 56 total; 17 initial E.U. and 39 initial Chinese Federation.
- **Harbours:** 11 independently capturable sea-hex ports, distributed across Bohai / Liaodong Bay and Liaodong Peninsula.
- **Starting military formations:** 117 E.U. and 89 Federation ground formations plus 12 E.U. and 12 Federation warships (129 and 101 total, respectively). *The scenario uses standard class stats and faction-specific frames; no synthetic combat buffs.*
- **Initial naval classes:** E.U. `eu_carrier`, `panzer_frosch_ii`; Federation `cf_carrier`, `shui_gun_ru_ii`.
- **Victory:** Capture *all* cities, without timers, scripted victory, or fake campaign completion.

## Situation and army organization

The E.U. holds southern Manchurian bases at Shenyang, Jinzhou, Huludao, Yingkou, Dalian, and northern reserve cities. The Federation owns Suizhong, the Shanhaiguan gateway, Qinhuangdao and Tangshan industrial belt, the Great Wall mountain entrances via Chengde, and concentrated Beijing–Tianjin metropolitan defenses. The E.U. deploys Liaoxi Breakthrough, Northern Encirclement, Bohai Coastal Army, Bohai Amphibious Reserve, and Manchurian Reserve groups. Federation defenders deploy Liaoxi Gate Defense, Tangshan Industrial Army, Great Wall Mountain Guard, Capital Defense, Hai River Defense, Southern Reserve and Western Barrier groups.

The shoreline is generated from a geographically approximated Bohai Sea boundary and a distinct Liaodong Peninsula polygon, sampled at each hex centre and nine points per footprint, with mixed coastal hexes. The scenario deliberately distinguishes Tianjin inland from Tanggu's coastal harbour. Hills follow the Yanshan / Great Wall terrain, while Shanhaiguan, Chengde, Zhangjiakou and other rail-road routes remain usable for ground forces. The mapped Liao, Daling, Luan, Hai and Yongding river alignments affect terrain and local defensive movement but are not fabricated ocean barriers.

All cities receive city-tier output, factory industry, science, normal defensive shields and optional fortification. Both sides start with normal income-funded budgets and can research and produce replacements using standard engine rules. Elite uses the existing `prepareEliteEurope` pathway and faction-specific Elite Force rosters. No global HQ, research, combat, reward, save or medal rules are edited.

## Registration — integrator only

This scenario file is **intentionally absent** from the shared manifest, catalog and World Campaign registry on this PR.

1. Add `{id:"eu-cf-beijing",title:"Battle of Beijing",note:"56 cities · 2 sides · Manchurian offensive"}` to `SCENARIO_MANIFEST` in `dist/scenario-manifest.js`.
2. Add `'scenarios-eu-cf-beijing.js'` to `SCENARIO_FILES` *after* standard engine data and before any module needing this scenario. The module has no external scenario-local dependencies.
3. Regenerate `dist/scenario-catalog.js` via `node tools/generate-scenario-catalog.cjs` and verify the emitted `eu-cf-beijing` entry.
4. In the `eu-federation` campaign, change only objective `eu-federation-beijing`'s `scenarioId:null` to `scenarioId:'eu-cf-beijing'` **after** verifying the integrated scenario. Leave other planned objectives locked.
5. If `tools/scenario_sim.cjs --all` adds fingerprint lines, the tooling owner should append the new scenario's expected baseline after checking other scenarios for regressions.

## Validation performed on this isolated lane

A V8 setup smoke harness loaded the scenario with a restricted engine-API stub and tested `create` with seed **11** as both `eu` and `cf` on all four difficulties. The checks verified: all 56 cities on traversable land, formation tiles valid, no ground units at sea, 11 unique sea-water port locations, non-overlapping starting deployments, both economies initialized, correct Army Group structures and Elite setup entry point. Commander IDs and naval type identifiers were individually cross-checked against `dist/engine/commanders.js` and `dist/engine/frames.js`. A repeated setup test after the balancing commit passed all eight faction/difficulty combinations using an odd-row hex-distance stub: 56 cities, 230 initial total units, no sea-ground deployment mismatches, 11/11 unique port cells on one contiguous sea component, and 24/24 warships in that same navigable component. The tests do not exercise the real engine.

**Not yet verified against the actual built engine:** seeded multi-turn AI-vs-AI simulation, AI production, long-game capture/attrition, actual Elite transformation, save/reload, terrain/port rendering on device, entire campaign baseline, or objective winnability. A structural stub must **not** be counted as passing those tests.

## Full-engine acceptance commands (pending integrator/CI runner)

```bash
node tools/build_sources.cjs
node --check dist/scenarios-eu-cf-beijing.js
node tools/scenario_sim.cjs eu-cf-beijing eu normal 11 5
node tools/scenario_sim.cjs eu-cf-beijing cf normal 11 5
node tools/scenario_sim.cjs eu-cf-beijing eu normal 37 30
node tools/scenario_sim.cjs eu-cf-beijing cf normal 37 30
node tools/scenario_sim.cjs eu-cf-beijing eu normal 91 75
node tools/scenario_sim.cjs eu-cf-beijing cf normal 91 75
node tools/scenario_sim.cjs eu-cf-beijing eu elite 11 5
node tools/scenario_sim.cjs eu-cf-beijing cf elite 11 5
node tools/scenario_sim.cjs --all > /tmp/eu-cf-beijing-all.txt
node tools/validate_assets.cjs --tracked
```

Review: absence of errors, initial AI-produced units, both factions attacking and capturing within a reasonable timeframe, ports navigable for each navy, absence of multi-decade stalemate, Normal difficulty human-playable for either side, sensible attrition, correct Elite conversion, and save-reload state. If the E.U. stalls at Shanhaiguan or the Federation gets wiped out early, **change starting formation counts** before modifying global AI or mechanics. Record the actual results on the PR before integration.
