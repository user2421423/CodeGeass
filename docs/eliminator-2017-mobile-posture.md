# Mobile Eliminator frontline-posture A/B (2017 only)

**Status:** independent unmerged experiment based on `experiment/eliminator-launch-diagnostics`. Original 2017 defensive **production, first-charge city allocation, stationary anchor choices, courier pickups, weapon rules and economics are unchanged**. The 2018 behavior must exactly match the baseline in all six controls.

## Hypothesis

Earlier 2017-only experiments #68–#77 improved mobile interceptions by changing *where charges were constructed or anchored* but often lowered protected frontline army value. Carrier movement is an independent lever: where an existing, ready, mobile Eliminator ends a unit's turn changes whether it can intercept a missile centered on a threatened army.

## Narrow code change

Only `eliminatorMobileCoverBonus` in `src/ai/06-production.part.js` and its synchronized `dist/engine/ai.js` copy are modified, preserving the previous exact score for `ufn2018`. For 2017:

- Compute protection of **currently threatened** friendly field-unit assets (a visible opposing combat unit within twelve hexes), weighting our own units and Tier 1 commanders using the established existing threat-asset heuristic.
- Compare the value protected from the **current tile** versus each candidate movement tile, discounting duplicate coverage from other **own ready** Eliminators.
- Also compare threatened city-value protected between the current and proposed carrier tiles; penalize abandoning existing coverage.
- Deter moves losing more than 10% of a valuable already-covered frontline formation (`frontBefore > 200`) and moves leaving the three-hex protection radius of a selected friendly Tier 1 escort.
- Preserve the baseline tactical/move-score function. No new map vision, no inspection of hidden rival Eliminator stations, and no new regression-test files.

This is a preference score, **not** a hard command to move, nor a guarantee of avoiding unnecessary movement. It changes only candidates already evaluated by normal game AI.

## Matched benchmark design

[Batch 1 workflow](https://github.com/user2421423/CodeGeass/actions/workflows/eliminator-mobile-posture-batch-1.yml) runs validation plus 15 matched 2017 wars and six 2018 strict-equivalence controls; [Batch 2](https://github.com/user2421423/CodeGeass/actions/workflows/eliminator-mobile-posture-batch-2.yml) runs validation plus 15 other 2017 wars. Both use 45 turns for 2017, 35 for 2018, deterministic seeded Normal-difficulty all-AI conquest, and identical world engine/rules.

For every seed compare three AI bundles only:

1. Baseline original defensive AI (`6e452e5ca7f3148c9392d37701c1e93897a3386e`).
2. City-focused 2017 alternative from PR #76 (pinned `5465627c9709ec764d49404d3124633a0b08b23f`).
3. This new 2017 mobile-posture movement-only candidate.

Collect total incoming missiles, successful interceptions by carrier/stationary city, actual carrier survival, weighted city coverage, army value protected, frontline value protected, pickup/production counts and destruction. Require exact equality with the original 2018 AI in missile/intercept/charge/coverage/action/final-world results for every 2018 control. **Do not select the new candidate on more raw interceptions alone**: avoid major city-coverage loss, guard against carrier losses and weak frontline coverage, and look at variation across different seeds.

## Merge safety

**Do not merge this branch** without strong matched evidence and explicit user approval. Prior offensive Tier 1 targeting PR #67 is separate. No changes to `main` or scenario implementation.

## Results — complete: HOLD / NO MERGE

All **38/38 GitHub Actions jobs passed**: [batch 1](https://github.com/user2421423/CodeGeass/actions/runs/38665018338) ran validation, fifteen 2017 paired wars and six 2018 controls; [batch 2](https://github.com/user2421423/CodeGeass/actions/runs/38665018209) ran validation and fifteen more paired 2017 wars. The existing Node tests, source/bundle sync, UI smoke and every comparison succeeded; all six 2018 controls passed strict baseline gameplay neutrality.

| Metric, thirty 2017 wars | Original defensive AI | PR #76 city-focused | PR #80 mobile posture |
|---|---:|---:|---:|
| Incoming launches | 279 | 279 | 278 |
| Actual interceptions | **123** | 126 | 120 |
| Mobile interceptions | 3 | **6** | 4 |
| Stationary/city interceptions | 120 | 120 | 116 |
| Charges started | 379 | 380 | 379 |
| Charge pickups | 37 | 32 | 37 |
| Carrier losses | 10 | **8** | 9 |
| Mean protected army value | **10.66%** | 9.77% | 10.60% |
| Mean protected frontline value | **11.32%** | 9.66% | 11.13% |
| Mean protected weighted-city value | 19.94% | 19.90% | **20.15%** |
| Units destroyed by warheads | **74** | **72** | 75 |
| Cities destroyed by warheads | 151 | **144** | 153 |

Protection rates are arithmetic means over thirty seeds, rather than pooled ratios or confidence intervals. Shot totals vary slightly as the wars evolve; compare protection value and outcomes together.

**Decision: NO MERGE.** The movement-only experiment preserves most of the baseline's frontline cover and yields a small mean city-coverage gain (+0.22 percentage points); carrier losses decline by one. However, interceptions decrease 123→120, army coverage decreases 10.66%→10.60%, frontline decreases 11.32%→11.13%, and warhead-destroyed cities increase 151→153. It is not a robust all-around improvement on the original AI.

### What next

Stop tuning the defensive AI heuristics blindly. Keep the original 2017 defense as the game's broad-purpose behavior and the original 2018 rules unchanged. Preserve PRs #68–#80 as measured historical experiments, not gameplay changes. If the project resumes defensive work, prioritize direct unit/AI battle diagnostics and scenario-specific failure cases, with hard user-visible gameplay problems; otherwise shift to more impactful playtesting and gameplay features. Offensive [PR #67](https://github.com/user2421423/CodeGeass/pull/67) was separately validated; review/approval of it should not depend on these defensive tests. `main` remains unchanged.

