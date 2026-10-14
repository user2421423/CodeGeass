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

## Measured results

Awaiting the workflow outcomes. Do not infer a result from validation success alone.
