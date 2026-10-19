# Federation vs E.U. — integration and preliminary QA report

**Date:** 2026-10-19 · **Branch:** `feature/federation-vs-eu-campaign-architecture` · **Parent PR:** #141 · **Status:** integrated, **not released**; `main` unchanged.

## Integration

All ten scenario PRs merged into this feature branch: #146 Siberia, #142 Caucasus, #145 Turkey, #150 Volga, #143 Suez, #144 Moscow, #149 Balkans, #147 North Africa, #151 Central Europe and #148 France. Their distinct `cf-eu-*` modules are registered in `dist/scenario-manifest.js`, `dist/scenario-catalog.js`, `tools/generate-scenario-catalog.cjs` and `dist/war-campaign.js`. The campaign has 13 objectives in six tiers; the three original global conflicts remain reused. The Balkan coast loads before its scenario; other geographic dependencies retain their original precedence.

The strategic map uses five target-country polygons in Central Europe, excluding Germany, and France mainland/Corsica outlines. Only the North African route enters the France finale. Existing campaigns are not retargeted.

## Real-engine CI evidence

Initial integrated [GitHub Actions run #39240381364](https://github.com/user2421423/CodeGeass/actions/runs/39240381364) built the source engine, generated the catalog and passed registration. **Nine of ten scenario matrix jobs succeeded:** Caucasus, Turkey, Volga, Suez, Moscow, Balkans, North Africa, Central Europe and France. Each successful job tested both playable factions in Normal/Hard/Challenge/Elite for two turns, Normal seeds 11/23/47 for six turns, and Normal seed 71 for 18 turns. Simulations reported zero caught AI order errors; active fighting, captures, production and naval movement were observed. **These are not end-to-end victory proofs.**

**Siberia's first real-engine run failed at AI production** with `TypeError` from `g.scenario.supplyCorridors?.prairie.includes` in `src/ai/02-fronts.part.js`. Fixed both calls to `prairie?.includes` so an optional supply corridor cannot crash AI planning. **The fixed Siberia build still requires a fresh successful CI run**.

## Formation-first balance corrections (pending retest)

- **Turkey:** +20 E.U. defensive formations around Kars, Erzurum, Van, Diyarbakir, Sivas, Ankara and Istanbul. Initial tests strongly favored the advancing Federation; a large differential in offensive city captures was observed.
- **Volga:** +15 E.U. formations protecting the Volgograd/Astrakhan, Saratov, Samara and Kazan bridgeheads and industrial hubs.
- **Central Europe:** +40 E.U. formations at Warsaw, Lublin, Bialystok, Krakow, Katowice, Ostrava, Prague, Bratislava, Kosice, Budapest, Debrecen, Vienna and Graz. The original 18-turn simulation showed aggressive Chinese capture dominance.

These changes intentionally leave economy formulas, elite scaling, global AI, turn limits and victory rules unchanged. New multi-seed results, not the old run, must be used to assess them. No Normal win-rate claim is made until longer proper testing establishes it.

## Legacy safety checks

A direct registry comparison of this architecture branch versus base `38e519e789998010c5e336e170e6000c61205ab0` confirmed that **all five pre-existing campaign registries retain exactly the same mission identifiers, order, tiers, playable sides and scenario IDs**. The new Federation-E.U. tier counts are `[3,2,3,3,1,1]` with ten unique runtime IDs. The architecture smoke also tests old save preservation and victory isolation.

`.github/workflows/federation-eu-integration.yml` now contains full-engine scenario matrices and a deterministic comparative gameplay regression job against the pinned original `main` revision, avoiding confusion from stale fingerprint baselines. **Full regression completion still requires reviewing that job's outcome.** Initial expedition cargo is counted correctly as starting formations in Federation-E.U. sim reporting without changing older fingerprint output.

## Not yet signed off

1. Rerun Siberia on the AI fix; rerun Turkey/Volga/Central Europe on formation changes.
2. Evaluate longer multi-seed games for genuine Normal winnability for *both* sides; an 18-turn run with city captures is not enough to show either faction can conquer the map.
3. Test real save/reload, campaign rewards, HQ/recruitment restrictions, progression and finale unlocks end to end in the client.
4. Conduct visual and performance audits on desktop and mobile, especially Mediterranean landings, the Suez canal, and 102-city Central Europe.
5. Review comparative existing-gameplay regression CI and resolve any true mismatch before requesting a merge to `main`.

**Do not interpret this report or the successful initial nine jobs as permission to merge #141 into `main`.**
