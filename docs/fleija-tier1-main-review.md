# F.L.E.I.J.A. Tier 1 targeting: isolated clean-main review

Source: [independent experimental PR #67](https://github.com/user2421423/CodeGeass/pull/67). This branch was created from **current main at commit `85bbdfe735d0460057fb0ea7c7081f51b6cccf9a`**, rather than merging the heavily diverged old experiments.

## Exact scope

After an attacking faction has destroyed **five enemy cities with unintercepted F.L.E.I.J.A. strikes at ground zero**, this faction begins emphasizing enemy Story Tier 1 commanders for subsequent F.L.E.I.J.A. launches.

- Per-attacking-side counter `fleijaSuccessfulCityHits` updates only after destruction of a hostile city under an actual non-intercepted launch.
- Non-destructive hits, splash-only city damage, neutral/friendly cities and intercepted shots do not increment the counter.
- The attacking AI applies a bonus to already legal and otherwise valuable targets containing a hostile Story Tier 1 commander: +4500 at ground zero, +1100 at one hex, +300 at two hexes.
- All original city targeting and unit-value scoring, friendly-fire/2018 site restrictions, hidden enemy Eliminator information and gameplay mechanics remain unchanged.
- Existing compact save/load's `...rest` fields preserve the new side-specific counter. Old games safely default to zero if it does not exist.

Source touched: `src/engine/14-fleija.part.js`, `src/engine/15-turns-and-fortresses.part.js`, and **their synchronized generated bundle** `dist/engine.js`. `src/ai`, `dist/engine/ai.js`, defense production, scenario files, economy, geographic maps and unit performance are untouched.

## Ported and repeatable tests

- `tests/fleija-tier1-after-five.test.cjs`: real fifth city destroyed, save/load persistence, interception not counted, splash not counted, scoring preference for a Tier 1 direct target only once threshold reached.
- `tests/fleija-tier1-milestone-sim.test.cjs`: the real fifth successful city strike followed by a subsequent AI production launch at the Tier 1 commander.
- `node tools/build_sources.cjs --check`: all generated bundles synchronized.
- `node --test tests/*.test.cjs` plus UI smoke check.
- Two real-world 2017 equal-AI 95-turn stability campaigns (seeds 401, 777) using the **current main** balance simulator, as distinct from the older experimental branch's simulation code.

[Review CI workflow](https://github.com/user2421423/CodeGeass/actions/workflows/fleija-tier1-main-review.yml)

## Notes

Prior experimental [PR #67](https://github.com/user2421423/CodeGeass/pull/67) passed long 2017/2018 wars and exhibited two direct post-threshold Tier 1 attacks in its 2018/777 game. Those older outcomes are historical and **do not establish** identical results on the current main. This review branch must pass its own current-main checks; even if the two 2017 wars do not reach the threshold naturally, direct fifth-city integration tests verify functionality.

**No merge** without user's explicit authorization. Main remains unchanged.
