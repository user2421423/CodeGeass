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

## Results

Pending 30 matched 2017 war comparisons and six 2018 neutrality controls.
