# Isolated forward-city Eliminator defense experiment

Base: `experiment/eliminator-launch-diagnostics`. This branch is **independent of five-city Tier 1 F.L.E.I.J.A. targeting**. Engine targeting files, scoring and the five-city counter are unchanged from this base.

Only `src/ai/06-production.part.js` and synchronized `dist/engine/ai.js` alter game behavior. A threatened forward friendly city with at least two nearby friendly troops and visible enemy forces within 12 hexes becomes a more attractive Eliminator production/defensive location, taking existing defensive coverage, danger and city value into account. An already-armed capital remains the primary stationary anchor where possible. A second fixed city anchor is permitted **only with at least three total charges** and a strong forward defense score (>=250), to preserve mobile escort capacity.

This is a conservative revision of the combined experiment: the initial combined-version screen raised interceptions 66/127 -> 69/131, but average friendly-army protection slipped 10.69% -> 9.43%. That screen **included unrelated Tier 1 attack changes**; it is not a clean measure of this standalone defensive AI.

### Clean independent test
`.github/workflows/eliminator-forward-city-independent.yml` validates sources/tests/UI and runs 30 identical-seed matched wars: 15 in 2017 and 15 in 2018. Its pinned control uses the same base game engine and original diagnostic AI bundle, replacing **only the AI bundle** after the candidate simulation, eliminating any attacking-rules confounder.

Track real missile interceptions (stationary and mobile), lost carriers, charge pickup, army value and forward coverage separately. Do not merge solely because conceptual coverage rises. Do not infer player-visible improvements without passed CI.

**Draft only; do not merge into `main` without approval.**

## Completed 30-war A/B test: NO MERGE for this defensive variant

- [Original all-war run](https://github.com/user2421423/CodeGeass/actions/runs/38540005863): validation plus 30 simulation jobs passed. The connector exposes only the first 30 jobs, so the final 2018 / 99991 logs were reproduced independently in a [single-seed run](https://github.com/user2421423/CodeGeass/actions/runs/38542188397), which passed.
- 15 matched seed pairs per era; 2017 simulated 45 turns, 2018 simulated 35 turns. Every comparison used the **same world rules and F.L.E.I.J.A. engine**; only the AI defense bundle was swapped. This isolates the forward-city changes.

| Metric | Prior defense AI | Forward-city experiment |
|---|---:|---:|
| Missiles fired | 233 | 238 |
| Missiles intercepted | **118 / 233 (50.64%)** | **126 / 238 (52.94%)** |
| Mobile interceptions | 6 | 8 |
| City interceptions | 112 | 118 |
| Carrier losses | 7 | 8 |
| Avg friendly army value covered | **9.64%** | **8.97%** |
| Avg frontline value covered | **7.40%** | **7.34%** |
| Avg weighted city value covered | **24.35%** | **23.94%** |

### Important era split

| Metric | 2017 baseline | 2017 variant | 2018 baseline | 2018 variant |
|---|---:|---:|---:|---:|
| Missiles intercepted | 57 / 139 | 62 / 140 | 61 / 94 | 64 / 98 |
| Mobile interceptions | 1 | 5 | 5 | 3 |
| Carrier losses | 7 | 4 | 0 | 4 |
| Average army value covered | 10.06% | 10.08% | 9.22% | 7.86% |
| Average frontline value covered | 11.27% | 11.86% | 3.53% | 2.82% |
| Average weighted city value covered | 17.74% | 16.10% | 30.95% | 31.78% |

**Interpretation:** The modest interception increase is real in these runs but comes with different numbers of attacks (233 vs 238), an aggregate reduction in army coverage, and a material 2018 mobile-defense/carrier-loss regression. An extra 8 interceptions do not, by themselves, justify accepting those costs. **This variant is not recommended for merging.**

A safer future option is a *separate 2017-only experiment* that preserves the exact previous 2018 defensive AI, but that has not been implemented in this PR. Require another 30+ 2017 matched pairs before merging a revised defensive AI.

No changes made to `main`.
