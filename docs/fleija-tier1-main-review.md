# Tier 1 F.L.E.I.J.A. milestone targeting

Ported from reviewed [PR #81](https://github.com/user2421423/CodeGeass/pull/81) onto **current main**, following its move to source-only generated bundles.

**Rule:** A side receives one `fleijaSuccessfulCityHits` per unintercepted F.L.E.I.J.A. strike that actually destroys a hostile city at ground zero. After 5 successes, target scoring adds a story Tier 1 commander bonus of 4500 at center, 1100 in inner ring or 300 in outer ring. An illegal strike remains illegal. Enemy Eliminator positions remain secret. Counters are per attacking side, save/load through existing compact-save rest fields, and do not count intercepted warheads or city splash.

The current main uses `tools/build_sources.cjs` to generate ignored `dist/engine.js`. **Never merge the previously tracked generated `dist/engine.js` from the original PR branch.** This integration changes only the two corresponding engine source parts and their two targeted tests.

Evidence on the older main: fourteen paired wars comparing original to feature showed 7 direct post-threshold Tier 1 attacks across eight 2017 long wars (five not intercepted), 36 versus 29 total units destroyed and 68 versus 70 cities destroyed. These measurements establish the targeting tradeoff on that exact prior engine, **not an overall win-rate improvement and not a current-main benchmark**. Six 2018 games were equivalent because no attacker fired another warhead after reaching five successes.

This rebased source-only implementation is validated separately against updated main. Archive-only defensive AI PRs were not imported. The historical pre-refresh PR81 state is retained in branch `archive/fleija-tier1-pr81-before-main-refresh-20261015`.
