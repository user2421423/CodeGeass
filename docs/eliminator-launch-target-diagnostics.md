# F.L.E.I.J.A. launch-target diagnostics

**Status:** isolated read-only instrumentation. No merge into `main`. Base: `experiment/eliminator-threat-cover`.

## Why

Previous 8-war dual-defense screen: 34/64 intercepted in both versions, with **1** mobile interception in each. Frontline positional coverage rose from 9.15% to 9.51% without additional intercepted missiles. We need direct evidence about the target distribution and defender availability at the actual moment of launch.

## Method

`tools/eliminator_ab_sim.cjs` enables the observer with `ELIMINATOR_TARGET_DIAGNOSTICS=1`. A conditional hook in `src/ai/06-production.part.js` (and generated `dist/engine/ai.js`) runs **after** target selection, **before** `launch()`. It observes only and never adjusts target scoring, carrier assignments, weapon balance, resource budgets, or map state.

For each **successful** launch, record:
- Chosen strike-center coordinates and target classification: `city_center`, `army_center`, `city_splash_only`, `army_splash_only`, or `other`.
- Direct city and unit occupancy, hostile cities and units in the blast area (two hexes), nearby enemy troops, and victim factions.
- Count of ready, mobile, stationary, and still-building hostile Eliminators at launch.
- Distance to nearest ready defensive charge, mobile charge and stationary charge. Ready defensive charge means an Eliminator capable of intercepting for a faction hostile to the launcher.
- Whether interception actually happened; whether interceptor was carried or city-based.

The target classification refers to the **ground-zero hex**, not inferred attacker intent. A city-centered strike may also hit troops, and a unit-centered strike may damage nearby cities. `covered` means the nearest *ready* hostile Eliminator is no farther than the actual interception radius (3 hexes); other categories are 4–6, 7–10, >10, pending-only, or none built.

## Validation

The diagnostics workflow compares identical AI wars with the observer off and on. It asserts identical missiles, interceptions, pickups, charge losses, city/unit survivors and attack/movement counts. Any shot with ready coverage but no interception is treated as an instrumentation/engine inconsistency. The same workflow runs **28 independent wars**: 14 matched seeds each for 2017 (45 turns) and 2018 (35 turns). All launches are captured into per-war JSON in runner output and summarized in the job logs.

## Interpretation

We expect one of three patterns:
- **Targeting bottleneck:** Most launch centers are cities, with very few army-centered strikes to intercept.
- **Production/readiness bottleneck:** Army-centered strikes occur, but ready opposing charges do not exist when fired.
- **Positioning/delivery bottleneck:** Army-centered strikes occur with ready hostile Eliminators, but the nearest charge is more than 3 hexes away.

A mixed pattern is possible. No AI changes should be proposed until we have the distribution, especially by campaign year. This branch has no changes to player-visible mechanics.

## Measured results — 28 complete AI wars

**CI:** https://github.com/user2421423/CodeGeass/actions/runs/38533805925

All 29 jobs passed: validation plus 14 2017 (45-turn) and 14 2018 (35-turn) diagnostic wars. Observer on/off produced identical launch counts, interceptions, carrier pickups/losses, movement and attacks, and surviving units/cities in the neutrality seed. The observer never changes game rules or decisions.

### Where the AI aims

| Metric | 2017 | 2018 | Combined |
|---|---:|---:|---:|
| AI wars | 14 | 14 | 28 |
| Warheads launched | 130 | 87 | **217** |
| Ground zero on enemy city | 126 | 83 | **209 (96.3%)** |
| Ground zero on enemy army unit, not city | 4 | 4 | **8 (3.7%)** |
| Intercepted (any defense) | 53 | 55 | **108 (49.8%)** |
| Intercepted by mobile carrier | 1 | 5 | **6** |
| Intercepted by stationary charge | 52 | 50 | **102** |
| Army-centered missiles intercepted | 1/4 | 2/4 | **3/8** |
| City-centered launches with hostile troops also inside two-hex blast | 105/126 | 76/83 | **181/209 (86.6%)** |

Classification is from the exact strike-center hex before detonation. The 181 mixed-damage city-centered attacks are still counted as city targets. This is **not** evidence that the AI intends to prioritize armies simply because units are near its chosen city targets.

### Why missiles get through

Each war's first successful F.L.E.I.J.A. detonation unlocks the countermeasure. All **28 first launches** had zero Eliminators (2017: first launch at turn 22 in every seed; 2018: first launch at turn 11–12), and all were unopposed. Do not count these as faulty AI deployment.

| Later launches, after the first detonation | 2017 | 2018 | Combined |
|---|---:|---:|---:|
| Later launches | 116 | 73 | **189** |
| Intercepted | 53 | 55 | **108 (57.1%)** |
| Missed: no ready charge at time of launch | 24 | 4 | **28 (34.6% of later misses)** |
| Missed: ready charges exist but all beyond three hexes | 39 | 14 | **53 (65.4% of later misses)** |
| Missed despite an eligible ready charge within three hexes | 0 | 0 | **0** |

Among the **53 late misses with ready defenses too far away**, 5 had the nearest ready Eliminator 4–6 hexes from the impact, 4 had one 7–10 hexes away, and **44 were more than 10 hexes away**. Of the 28 late misses with no ready charge, six occurred when only incomplete charges existed; 22 had no charge available at all.

### Diagnosis

1. **Main constraint on mobile interceptions: targeting distribution.** Only 8/217 missiles were centered on army-only hexes. Four of five mobile-defense positioning experiments cannot create opportunities the attacking AI seldom generates. Defensive carriers can still help protect city-adjacent troops, since 181 city-centered blasts included units.
2. **Main remediable miss cause after unlocking: geography of ready coverage.** 53/81 later misses occurred despite at least one ready Eliminator somewhere on an opposing side; 44 of those 53 had the nearest ready charge more than ten hexes away.
3. **Secondary constraint: readiness, especially in 2017.** 2017 had 24 post-first unready misses; 2018 only 4. Production/site selection may matter in 2017 but alone will not solve the city-centered target bias.
4. **Engine interception is working.** Every observed launch within three hexes of an eligible ready defense was intercepted. No evidence of an interception-range bug.

### Recommendation and branch decision

**Keep this diagnostic branch as reference; do not merge into `main`.** Do not merge the earlier dual-purpose escort change: it produced no additional interceptions.

Next controlled AI experiment should prioritize **forward city-cluster coverage** using legitimate visible public battlefield cues (high-value hostile-threatened friendly cities with nearby allied formations), while retaining the primary capital anchor, and test which production-site/escort allocation changes actually close the 4–10-hex and >10-hex gaps. Report real city and mobile interceptions separately. Avoid altering missile targeting merely to inflate the mobile-defense KPI. No need to retune the fixed three-hex rule.

