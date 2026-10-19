# Europia United vs Chinese Federation — World Campaign architecture

**Status:** Architecture only. This feature branch must not be merged into `main` without user approval. All ten regional battles beyond the first three are **planned**, not playable or complete.

**Campaign key:** `eu-federation`; **engine side:** `eu`; **opponent:** `cf`.
**World Campaign registry:** `dist/war-campaign.js`.
**Map route display:** `dist/ui/war-campaign-screen.js`.
**Machine-readable ownership contracts:** `docs/EU_FEDERATION_SCENARIO_HANDOFFS.json`.

## User-approved 13-battle progression

| # | Tier | Mission | World Campaign objective ID | Runtime scenario ID | State |
|---|---|---|---|---|---|
| 1 | 1 Global Conflicts | War for Australia | `eu-federation-australia` | `war-for-australia` | Existing |
| 2 | 1 Global Conflicts | Conquest of Area 18 | `eu-federation-area-18` | `area-18` | Existing |
| 3 | 1 Global Conflicts | Division of Japan | `eu-federation-division-japan` | `division-japan` | Existing |
| 4 | 2 Opening Eastern Front | Invasion of Kazakhstan | `eu-federation-kazakhstan` | `eu-cf-kazakhstan` | Planned |
| 5 | 2 Opening Eastern Front | Invasion of Persia | `eu-federation-persia` | `eu-cf-persia` | Planned |
| 6 | 3 Federation Frontier | Battle for Xinjiang | `eu-federation-xinjiang` | `eu-cf-xinjiang` | Planned |
| 7 | 3 Federation Frontier | Invasion of India | `eu-federation-india` | `eu-cf-india` | Planned |
| 8 | 3 Federation Frontier | Invasion of Mongolia | `eu-federation-mongolia` | `eu-cf-mongolia` | Planned |
| 9 | 3 Federation Frontier | Invasion of Manchuria | `eu-federation-manchuria` | `eu-cf-manchuria` | Planned |
| 10 | 4 Himalayan Offensive | Crossing the Himalayas | `eu-federation-himalayas` | `eu-cf-himalayas` | Planned |
| 11 | 5 Conquest of China | Invasion of Sichuan | `eu-federation-sichuan` | `eu-cf-sichuan` | Planned |
| 12 | 5 Conquest of China | Battle of Beijing | `eu-federation-beijing` | `eu-cf-beijing` | Planned |
| 13 | 6 Imperial Capital | Battle of Luoyang | `eu-federation-luoyang` | `eu-cf-luoyang` | Planned |

*Manchuria is in Tier 3, before Crossing the Himalayas in Tier 4.*
Complete **all** missions within a tier to unlock the next tier; missions within a tier may be completed in any order. The northern route is Kazakhstan → Xinjiang / Mongolia → Manchuria → Beijing; the southern route is Persia → India → Himalayas → Sichuan; both converge on Luoyang.

The first three are unchanged **three-way** regional scenarios, not new two-party remakes. All ten new battles are exclusively `eu` versus `cf`.

## Why the proposed architecture is safe

1. Uses the existing World Campaign `FACTIONS`, `CAMPAIGN_INFO`, tier registry, save slot, victory checks, world map selection and terrain color overlay. Existing four campaign IDs and saves are preserved without migration.
2. All ten regional objectives have `scenarioId:null` and `status:'planned'`. They remain visible with their geographic markers, but **cannot launch**, credit victory, or unlock later tiers through fake progress.
3. Each future scenario has a **separate runtime ID** `eu-cf-<region>`. The final `eu-cf-luoyang` must **not replace, rename, retarget or modify** `battle-luoyang`, which is Britannia vs China. Reuse geographical and city definitions carefully, with a distinct E.U. deployment.
4. A new `eu-federation` route list drives map arrows. The World Campaign UI derives the fifth faction selector from `WC.FACTIONS`; no new faction colors, unit definitions or global game rules are necessary.
5. Campaign map boundary overlays use existing atlas countries for Iran and Chinese regions, and preliminary clipped polygons for Kazakhstan, India, Mongolia because they are absent from the campaign atlas. **Before each scenario's integration, refine these approximate overlays against verified geography**; don't recolor oceans or unrelated countries. These campaign overlays are distinct from tactical maps.

## Parallel agent workflow and file ownership

Each scenario builder should branch from **`feature/eu-vs-federation-campaign-architecture`**, with a branch like `scenario/eu-cf-kazakhstan` and a PR **targeting that architecture branch, not `main`**. Follow `docs/LANES.json` and `docs/ADDING_A_SCENARIO.md`.

**Scenario lane owns:** `dist/scenarios-eu-cf-<region>.js`, scenario-local map/coast/underlay helpers and `docs/EU_CF_<REGION>_SCENARIO.md`. Do not edit `dist/war-campaign.js`, `dist/ui/war-campaign-screen.js`, global commander/unit balance, `src/engine/**`, generated bundles, other scenarios, or `main`. Coordinate any exceptional shared-code need separately.

To avoid ten concurrent edits of `dist/scenario-manifest.js`, each agent **reports** its required manifest/menu/SCENARIO_FILES entries, dependencies and load order, rather than committing changes to that shared file. An integrator adds those entries and refreshes `dist/scenario-catalog.js` using `tools/generate-scenario-catalog.cjs` (and checks the generated catalog) as each PR is accepted. The integrator alone replaces that campaign objective's `scenarioId:null` with the **verified** `eu-cf-* ` runtime ID. Other missions remain placeholders. No future agent should update other campaign rows.

## Common regional scenario acceptance criteria

- **Both sides fully playable.** `sides:['eu','cf']` and registered `create(side,difficulty,seed)` / `winner` / objective contract. Only E.U. and Federation units, named commanders, elite forces and assigned Army Groups. No Britannian or Black Knights faction rosters in these battles.
- **All four difficulties:** Normal, Hard, Challenge and Elite with proper elite transformation, AI named commanders, recruitment and research. Do not bypass HQ unlock policies, commander medals or faction-based fragment rewards.
- **Complete maps and starting economy:** geographically coherent hex terrain, real cities/provinces, independent capturable ports where relevant, usable sea lanes, feasible pass routes, realistic starting forces, income, industry, factory production, repairs and both sides capable of replenishing losses. AI can produce units. No missing starting industry.
- **AI & performance:** meaningful offensive axes and defensive cities; use existing data-driven `meta.ai` switches (not scenario-ID conditionals), coordinated naval or Army Group assaults when appropriate; don't create stalemates or overwhelming first-turn kills. Keep maps responsive on phone and desktop; preserve 20–80% mixed coastal standard.
- **Victory & progression:** total capture of all opposing cities, no artificial turn-limit victory. A cityless invader remains alive only while its qualifying forces survive (expedition rule where needed). Normal scenario victory is confirmed by the existing World Campaign framework; no spoofing or automatic completion. Standalone scenario also playable after manifest integration.
- **Testing:** run source builds where necessary, syntax validation, `node tools/scenario_sim.cjs <scenario-id> eu normal 11 5` and `cf normal 11 5`, additional seeded longer simulations and Elite setup checks, coast/port placement review, production and save-reload smoke tests. Compare `node tools/scenario_sim.cjs --all` against `tools/data/sim_baseline.txt`; if new lines are expected, coordinate an integrator update of the baseline without hiding regressions. Review balance primarily by adjusting starting friendly/enemy forces, not injecting arbitrary bonuses.
- **Delivery:** provide branch, PR, commit SHA, complete new files, intended manifest entry/dependency order, simulated outputs and unresolved balance or shared-engine issues. **Do not merge your own branch.**

## Short agent prompt suffixes

Each of the following goes after this common preface:

> Implement one standalone, two-sided E.U.–Federation regional scenario for `user2421423/CodeGeass`. Read `docs/EU_FEDERATION_CAMPAIGN_ARCHITECTURE.md`, `docs/EU_FEDERATION_SCENARIO_HANDOFFS.json`, `docs/LANES.json`, and `docs/ADDING_A_SCENARIO.md`. Branch from `feature/eu-vs-federation-campaign-architecture`; commit only scenario-owned files and open an unmerged PR targeting that branch. Follow every common acceptance criterion, report the manifest registration to the integrator, and never touch the shared campaign registry.

1. **Kazakhstan:** Build `eu-cf-kazakhstan`: E.U. armies invade from Russia across Kazakhstan's steppe; emphasize broad armored maneuver, multiple axes and important industrial/rail cities.
2. **Persia:** Build `eu-cf-persia`: E.U. invades Iran from the Caucasus and west; adapt accurate geography from the Iraq–Iran scenario where appropriate; Zagros chokepoints, plateau and usable Gulf ports.
3. **Xinjiang:** Build `eu-cf-xinjiang`: E.U. advances from Kazakhstan into Ürümqi and Xinjiang across deserts, Tianshan corridors and defensible passes.
4. **India:** Build `eu-cf-india`: E.U. invasion from Persia in the northwest with Arabian Sea carrier landings; dense inland cities, real ports/coasts and geographically coherent multi-axis operations.
5. **Mongolia:** Build `eu-cf-mongolia`: E.U. attacks south out of Siberia across Mongolia; wide mobile operations and strongly defended Ulaanbaatar.
6. **Manchuria:** Build `eu-cf-manchuria`: E.U. attacks Northeast China from conquered Mongolia and Siberia; Liaoning/Jilin/Heilongjiang industrial cities, rivers and a northern breakthrough.
7. **Himalayas:** Build `eu-cf-himalayas`: E.U. crosses north from India into Chinese-held Tibet through several playable high-mountain routes; mountain defense and attrition, **no impassable victory path**.
8. **Sichuan:** Build `eu-cf-sichuan`: E.U. descends from Tibet into Sichuan; heavily contested passes and Chengdu Basin, with defensive rivers and strong Chinese reserves.
9. **Beijing:** Build `eu-cf-beijing`: E.U. advances from Manchuria into Beijing and Tianjin; defensible northern approaches, urban industry and coastal options where geographically supported.
10. **Luoyang:** Build `eu-cf-luoyang`: independent E.U. versus China finale. Reuse existing `scenarios-luoyang.js` regional geography but preserve the `battle-luoyang` runtime and original Britannian campaign untouched. E.U. attacks from the north and southwest; the Federation has layered capital defenses.

## Focused architecture smoke test

Run `node tools/eu_federation_campaign_smoke.cjs`. It verifies the fifth campaign, 13 objectives, three implemented shared missions, ten safely locked placeholders, expected ordering and save-key isolation. These architecture checks do **not** substitute for per-scenario tactical balance tests.
