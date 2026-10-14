# Era-gated 2017-only forward-city defense

**Experiment only. No merge to main.** Base: `experiment/eliminator-launch-diagnostics` (original opponent and weapon rules). This is an independent follow-up to the [negative mixed-era experiment #68](https://github.com/user2421423/CodeGeass/pull/68).

## Why test an era gate?

Prior 30 matched wars (15 each 2017 and 2018) showed:

| Metric | 2017 prior → experiment | 2018 prior → experiment |
|---|---|---|
| Intercepted | 57/139 → 62/140 | 61/94 → 64/98 |
| Mobile interceptions | 1 → 5 | 5 → 3 |
| Carrier losses | 7 → 4 | 0 → 4 |
| Average army value protected | 10.06% → 10.08% | 9.22% → 7.86% |
| Avg frontline protection | 11.27% → 11.86% | 3.53% → 2.82% |

The variant's 2017 results looked directionally useful; 2018 had unacceptable army and carrier regressions. More interceptions cannot offset worse force protection.

## Exact change

Retain PR #68's **conservative 2017** forward-city production-score and second-anchor rules, while restoring the **original 2018** behavior.

- `eliminatorStationaryCities2018Baseline` is a renamed, byte-for-byte body copy of the diagnostic baseline anchor allocator. If `g.era === 'ufn2018'`, the existing `eliminatorStationaryCities` delegates to it.
- `eliminatorForwardCityCoverage` returns zero for 2018; the extra laboratory score term is thus inert.
- F.L.E.I.J.A. targeting, Tier 1 five-city priority, intercept radius, weapons, resources, campaign scenarios and opponent secrets are untouched.

This is a controlled era-gating experiment; do not infer that the 2017 variant is proven beneficial without its dedicated larger matched sample.

## Clean tests

- Source/bundle sync, Node tests and UI smoke.
- **Twenty 2017 paired AI wars**, 45 turns each, against an unchanged pinned defensive AI baseline.
- **Six 2018 paired AI wars**, 35 turns each, assert identical missiles, intercepts, charges, pickups, losses, army/frontline/city coverage, AI actions and survivors. Engine and game rules are identical; the compared baseline swaps only the AI bundle.
- All 26 job results plus validation are within the connected GitHub job-list page limit of 30.

## Results

Awaiting the new matched benchmark. Do not merge this branch or PR #68 to main without explicit user approval.
