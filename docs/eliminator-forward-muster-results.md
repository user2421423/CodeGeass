# Forward-muster Eliminator AI — results and merge decision

**Status: EXPERIMENTAL; DO NOT MERGE.** This branch is isolated from `main` and PR #48 and is proposed only against `experiment/eliminator-permanent-escorts` as draft PR #58.

## Goal and approach

The earlier permanent-escort AI still left spare defensive Eliminator charges unused at rear labs. The new version:
- Discovers threatened friendly army groups using visible combat-unit positions, same-landmass access, and coverage overlap.
- Favors appropriately located labs and gives healthy regular units near a lab a charge even before they have a frontline group immediately beside them.
- Retains normal priority for Tier 1 commanders and one strategic stationary city charge.
- Sends armed rear units toward the allied formation using a safe land route; they retain their charge and ordinary combat orders once in range.
- Keeps weapon costs, range, caps, transfer restrictions, classified rival Eliminator information, and main scenario rules unchanged.

## Validations

- [Eight-pair screen](https://github.com/user2421423/CodeGeass/actions/runs/38514698774): 9/9 jobs passed.
- [Thirty-pair confirmation](https://github.com/user2421423/CodeGeass/actions/runs/38515136619): **31/31 jobs passed** (15 2017 seeds, 15 2018 seeds, validation).
- Full Node regressions, Eliminator carrier tests, source/bundle sync, and UI smoke passed.

### Thirty paired wars (against previous permanent-escort AI)

Identical game engine rules, 45-turn 2017 seeds and 35-turn 2018 seeds; only AI scripts were changed between each matched run. Simulations measure warheads actually launched; counts differ because AI moves and battle outcomes change.

| Metric | Permanent-escort baseline | Forward muster |
|---|---:|---:|
| 2017 interceptions / launches | 62/144 (43.06%) | 57/138 (41.30%) |
| 2018 interceptions / launches | 66/102 (64.71%) | 61/94 (64.89%) |
| **Pooled interceptions / launches** | **128/246 (52.03%)** | **118/232 (50.86%)** |
| **Mobile interceptions** | **8** | **7** |
| Ordinary carriers equipped (cumulative) | 29 | **45** |
| Charges collected (cumulative) | 39 | 42 |
| Carrier-charge losses | 7 | **5** |
| Avg. simultaneous carried charges per exposed side-turn | 0.313 | **0.338** |
| Avg. friendly army value protected | 7.72% | **9.45%** |
| Avg. frontline value protected | 4.03% | **6.92%** |
| Avg. weighted friendly city coverage | **25.37%** | 25.21% |
| Avg. simulation runtime | 60.85s | 61.00s |

**2017:** Frontline coverage 4.29% → 10.59%, all army coverage 7.18% → 9.90%, but city protection 20.63% → 18.80% and interceptions 62/144 → 57/138.

**2018:** Frontline coverage 3.77% → 3.26% (regression), army value 8.26% → 9.00%, city coverage 30.10% → 31.62%, interceptions 66/102 → 61/94.

### Interpretation and decision

Forward muster genuinely resolves some of the equipment and delivery bottleneck, putting defensive charges on 45 ordinary field units rather than 29 and noticeably improving aggregate field protection. No material benchmark slowdown was observed.

However, it has **not fixed the defining failure:** actual mobile F.L.E.I.J.A. interceptions remain rare (7 vs 8). Pooled intercept rate is slightly lower; 2017 intercept counts and 2018 frontline value protection are worse. This is a meaningful gain in passive coverage but insufficient evidence of improved combat outcomes.

**No merge.** Keep draft PR #58 and this branch for future iterations. Next experiment should focus narrowly on predictive mobile defense from publicly visible warhead danger, army concentration or threatened targets, while preserving important stationary city anchors and avoiding any access to classified enemy Eliminator states. Test variant ablations on matched wars. Do not adjust F.L.E.I.J.A. power/cap/balance as part of this work.
