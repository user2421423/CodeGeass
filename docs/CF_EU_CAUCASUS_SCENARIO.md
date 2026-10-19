# CF–E.U. Caucasus — scenario builder handoff

**Mission:** Federation vs E.U., tier 2, mission 5 · **Runtime ID:** `cf-eu-caucasus` · **Campaign objective:** `federation-eu-caucasus`
**Owned module:** `dist/scenarios-cf-eu-caucasus.js` · **Branch:** `scenario/cf-eu-caucasus`.
This PR must target `feature/federation-vs-eu-campaign-architecture` and remain unmerged until the integrator's checks are complete.

## Design and geography

Chinese Federation starts with a dispersed forward line **north of Iran and in northwest Persia** (Tabriz, Jolfa, Ardabil, Astara, Lankaran, Parsabad, Bilasuvar, Van and supporting Iranian cities). E.U. holds Armenia, Georgia, Azerbaijan's Baku industrial/coastal heartland, and the southern Russian defense belt.

- **67 real settlement anchors:** 14 Federation and 53 E.U. at WGS84 coordinates. Existing province assignment creates local territorial ownership on connected land, without awarding disconnected sea or island cells.
- **Greater Caucasus ridge:** high impassable peaks away from authentic corridors; independently traversable Klukhor, Roki, Mamison, Darial and eastern Caspian Gate routes. Do not accidentally turn these mountain accesses into a one-hex blockage during integration.
- **Five mapped river polylines:** Kura, Aras, Terek, Rioni and Kuban. Edge-crossing movement penalties exempt actual settlement bridge approaches: Tbilisi, Gori, Mingachevir, Yevlakh, Vladikavkaz, Grozny, Kutaisi, Jolfa and Nakhchivan.
- **Two maritime basins, never joined:** the **Caspian** has Astara, Lankaran, Baku, Sumqayit, Derbent, Makhachkala and Astrakhan ports; the **Black Sea** has Batumi, Poti, Sochi, Tuapse and Novorossiysk. Water masks are locally generated using 3×3 geographic samples, with sea and transitional coast tiles. The shoreline uses piecewise-geographic approximation, not a surveyed high-resolution national map.
- **12 separately capturable port sea tiles**, with sea-adjacent city placement, independent `portAt` and `portOwner`. Nine naval deployment entries provide 15 ships from faction-appropriate types, including Caspian carriers and E.U. Black Sea defenses.

## Starting formations and gameplay

- **Federation:** 121 land formations grouped into Western Persia Army, Aras Breakthrough, Kura Offensive, Caspian Coastal Army, Persian Mobile Reserve and Caspian Reserve. Key leaders include Zhao Hao, Honggu, Gao Hai, Xingke and Meiling.
- **E.U.:** 111 land formations grouped into Armenian Fortress Corps, Aras Border Guard, Anatolian Border Corps, Georgian Defensive Line, Western Georgia Corps, Caspian Fortress Corps, Kura Reserve, Darial Defense, Western Pass Guard, Caspian Mountain Gate, North Caucasus Reserve, Black Sea Reserve and Lower Volga Reserve. Key leaders include Leila, Akito, Smilas and Fernando.
- The first balance pass reinforced eight Chinese offensive stacks (+16 formations) and reduced ten dispersed E.U. reserve/defense stacks (−10 formations). This is a **design adjustment, not simulation-proven balance**.
- The scenario uses built-in `E.typeFor`, `E.newUnit`, `E.income`, `E.prepareEliteEurope`, `E.scenarioCityDefenseHP`, `E.setGoto`, and shared HQ/medal/research/recruitment systems. The two sides are `['cf','eu']` and all four difficulty values are accepted. Faction-scoped Elite rosters exclude scenario-only entries; AI difficulty modifies the opposing side's income and unit stacks.
- AI metadata: `doctrine:'europe'`, `recovery:true`, `routeBias:'cf'`, and six named operational axes toward Armenia/Georgia, Baku/Derbent, the mountain passes and Russian cities. E.U. defender hubs: Yerevan, Tbilisi, Ganja, Baku, Vladikavkaz, Grozny, Makhachkala, Stavropol.
- **Victory:** only when one side controls **all 67 cities**; no artificial turn or armistice limit, no scripted automatic mission credit. Reward/unlock handling remains in the existing shared engine, once registered by integrator.

## Validation performed here

Connector-only edit environment (no local repository checkout or executable Node runtime was available for the linked GitHub repository).

| Check | Result |
|---|---|
| City dataset: unique names, valid coordinates/bounds, faction-consistent deployment origins | PASS, static |
| 67 planned city locations and separate placement checks using simulated hex-neighbour placement | PASS, approximate geometry check |
| 12 unique, water-adjacent harbour tiles | PASS, approximate hex-grid check |
| Caspian sea tile component spanning all seven Caspian ports | PASS, 4,578 sea tiles in offline geometry approximation |
| Black Sea component spanning all five Black Sea ports | PASS, 1,875 sea tiles in offline geometry approximation |
| Distinct water components, no mixed-basin flotilla assignment | PASS, static |
| Faction selection, difficulty branches, Elite call and real total conquest predicate present | PASS, static source inspection |
| `node --check`, engine-backed `create()`, seeded / extended combat simulation | **NOT RUN** |
| Full AI recruitment / operations, map + naval pathing in actual engine | **NOT RUN** |
| Four-difficulty simulation, save/reload, reward/progression, mobile rendering | **NOT RUN** |
| Source build, `scenario_sim.cjs --all`, assets and other-scenario regression checks | **NOT RUN** |

These are not equivalent to runtime tests. **Do not consider Normal win rate established** until the required seeded simulations and engine integration tests run. Review placement issues exposed by actual `E.distance` / `E.adjacent` behavior if different from the static approximation.

### Required integrator checks (after temporary isolated registration)

```bash
python3 tools/build_sources.py
node --check dist/scenarios-cf-eu-caucasus.js
node tools/scenario_sim.cjs cf-eu-caucasus cf normal 11 5
node tools/scenario_sim.cjs cf-eu-caucasus eu normal 11 5
# Repeat both sides, seeds 11/19/29/41, and at extended turn counts;
# verify Hard / Challenge / Elite; verify AI production, naval paths,
# faction-specific commander/Elite assignment, real victory and rewards,
# save / reload, render/performance on mobile-sized viewport.
node tools/scenario_sim.cjs --all
node tools/federation_eu_campaign_smoke.cjs
node tools/validate_assets.cjs --tracked
```

## Shared changes required from the integrator (NOT part of this branch)

1. In `dist/scenario-manifest.js`, add `{id:"cf-eu-caucasus",title:"Invasion of the Caucasus",note:"67 cities · 2 sides · Caucasus offensive"}` to `SCENARIO_MANIFEST` and add `'scenarios-cf-eu-caucasus.js'` to `SCENARIO_FILES`. This scenario requires **no additional helper file**; its shore/river/ridge logic is embedded.
2. Rebuild `dist/scenario-catalog.js` using `tools/generate-scenario-catalog.cjs` (or the actual current generator command) and check load order.
3. In `dist/war-campaign.js`, replace `scenarioId: null` for `federation-eu-caucasus` **only after** confirming that the real module loads for both factions. Audit the matching world-map marker, route, region boundary overlay and coastline; the architecture flags strategic overlays as provisional.
4. Update generated baselines in the appropriate integration commit if the registered scenario adds expected `--all` output. Do not change current scenarios, save IDs, commander registry, HQ rules or AI engine as a workaround.
5. Capture seeded Normal win rates for each side, then rebalance by changing this scenario's starting formations first. Check each mountain pass, harbour, Caspian/Black Sea separation, AI production, Elite/HQ restrictions, save/version and progression/rewards.

**Unresolved validation blocker:** GitHub connector access in this session supports source edits/PRs but not executing the game's Node test runner or driving the real browser game. This must be cleared before merging.