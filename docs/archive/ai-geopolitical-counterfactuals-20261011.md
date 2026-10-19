# China and the Three-Way Geopolitical Balance — Controlled Simulation Report

**Date:** 11 October 2026  
**Repository:** `user2421423/CodeGeass`  
**Experimental branch:** `feature/ai-multifront-defense-20261011`  
**Gameplay baseline:** `4113a15c43edf132ddfa0b3ea5ba15538231b20f`  
**Primary experiment commit:** `04fe9f31bfc492f7cdc333add95b13b97b1d224a`  
**Held-out experiment commit:** `33e7f6bc535edec686f937a1a9377c991721096c`

## Research question

Does the Chinese Federation's poor survival come primarily from the European Union and Britannia spending too much of their military effort fighting China instead of one another?

This is a **counterfactual diagnostic**, not a recommended new faction mechanic. All 54 comparisons ran for 50 turns with the same underlying map, starting formations, starting income, ordinary production AI and economy. All AI-controlled powers used the same observer/normal rules. The scenarios differ only in temporary E.U.–Britannia target-selection preferences.

## Variants

- **Control:** unchanged baseline.
- **4× bilateral priority:** E.U. and Britannian objective scoring multiplies value of the other power's objectives by 4, while retaining the original operational-range restriction.
- **12× priority + wider search:** same bilateral preference with a multiplier of 12 and a 25-hex search radius *only for bilateral enemy objectives*. The planner still requires an operationally feasible approach on the appropriate landmass or a loaded overseas force.

The temporary variant patch was applied only to `dist/engine/ai.js` in CI simulation jobs; **no game-source or gameplay bundle was changed**. After the experiment, the default simulation workflow and variant script were restored. `tools/balance_sim.cjs` now records pairwise attacks, damage, and major-power city transfers for future testing.

The primary battery used four fixed seeds (`42`, `20261007`, `777`, `13579`) and all three player/turn orders (12 games/variant). The held-out battery used `314159` and `271828` and the same three orders (6 more/variant).

## Primary 12-run results

| Metric | Control | 4× priority | 12× + wider search |
|---|---:|---:|---:|
| China cities, turn 20 | 48.75 | 48.67 | 50.83 |
| China cities, turn 50 | 29.42 | 29.58 | 30.83 |
| China combat strength, turn 50 | 41.89 | 45.55 | 46.99 |
| China finishes ≤10 cities | 3/12 | 0/12 | 0/12 |
| E.U.–Britannia attacks/game | 145.33 | 208.08 | 173.58 |
| E.U.–Britannia city transfers/game | 13.92 | 11.25 | 15.92 |

## Held-out 6-run results

| Metric | Control | 4× priority | 12× + wider search |
|---|---:|---:|---:|
| China cities, turn 20 | 47.67 | 45.50 | 49.67 |
| China cities, turn 50 | 26.00 | 14.83 | 30.33 |
| China combat strength, turn 50 | 39.48 | 20.98 | 46.46 |
| China finishes ≤10 cities | 1/6 | 2/6 | 0/6 |
| E.U.–Britannia attacks/game | 122.33 | 185.17 | 106.50 |
| E.U.–Britannia city transfers/game | 9.17 | 13.67 | 15.00 |

The held-out seeds falsified the initial hypothesis that 4× preference reliably improves China: China lost 11.17 additional cities on average compared with matched control scenarios.

## Combined 18-run results

| Metric | Control | 4× priority | 12× + wider search |
|---|---:|---:|---:|
| China cities, turn 20 | 48.39 | 47.61 | 50.44 |
| China cities, turn 50 | **28.28** | 24.67 | **30.67** |
| China combat strength, turn 50 | 41.09 | 37.36 | 46.81 |
| E.U. cities, turn 50 | 66.39 | 76.06 | 67.22 |
| Britannia cities, turn 50 | 58.28 | 52.56 | 53.72 |
| China finishes ≤10 cities | 4/18 | 2/18 | 0/18 |
| E.U.–Britannia attacks/game | 137.67 | 200.44 | 151.22 |
| China–Britannia attacks/game | 440.28 | 375.28 | 359.39 |
| China–E.U. attacks/game | 521.11 | 535.22 | 557.17 |
| E.U.–Britannia city transfers/game | 12.33 | 12.06 | 15.61 |

In matched comparisons, the 4× variant changes China turn-50 city control by **−3.61** on average, while the 12× variant changes it by **+2.39**. Approximate paired 95% intervals are **−14.5 to +7.3** and **−9.3 to +14.1** respectively. Neither variant demonstrates a reliable positive average effect with 18 scenarios.

## Geographic constraints

The starting location data reinforces the structural issue: many Britannian cities and European Union cities lie on different continents or across straits. For example, the nearest among the parsed starting city pairs include **Reykjavik (E.U.)–Nuuk (Britannia), approximately 1,432 km apart across sea**, and **Petropavlovsk (E.U.)–Sapporo (Britannia), approximately 1,625 km apart across sea**. These are approximate geographical distances, not traversable game path lengths.

The existing AI already scales enemy objective values by a rival's strength. Increasing E.U.–Britannia target importance cannot force fleets and armies to cross an absent practical route, and direct E.U.–Britannia combat need not reduce European Union pressure on China. The 12× intervention decreased China–Britannia engagements but increased China–E.U. engagements.

## Conclusions and next steps

1. China is disproportionately exposed to both rivals: baseline EU–Britannia combat is only about 13% of all recorded major-power attacks.
2. **Simply increasing reciprocal hostility is not a robust remedy.** The mild version is harmful on held-out seeds and the stronger version improves average China cities by only 2.39 with very wide uncertainty.
3. The stronger variant eliminates severe Chinese collapses in the tested 18 games, which is a useful research signal, but it should not be shipped without more seeds and broader balance evaluation.
4. A more informative next experiment would compare the same amount of E.U./Britannian military diversion with and without direct bilateral combat. That would separate the effect of moving attacks away from China from the effect of the other two empires actively damaging each other.
5. Before permanent diplomacy/map changes, inspect navigable Atlantic and Pacific approaches and the routing constraints preventing more direct E.U.–Britannia fronts. Avoid faction-specific buffs and do not merge experimental changes into `main` without explicit permission.

## Validation

- [Primary 36-job comparison](https://github.com/user2421423/CodeGeass/actions/runs/38130529621): success.
- [Held-out 18-job comparison](https://github.com/user2421423/CodeGeass/actions/runs/38130937682): success.
- [Standard 6-job Conquest validation](https://github.com/user2421423/CodeGeass/actions/runs/38130529717): success.

Raw detailed run artifacts for all 54 games were uploaded by the GitHub Actions comparison workflows with 14-day retention. The tables above preserve aggregate results.
