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

## Completed independent results — 20 × 2017, 6 × 2018

[All 27 jobs passed](https://github.com/user2421423/CodeGeass/actions/runs/38542990781): validation, 20 matched 2017 wars and all six 2018-neutrality comparisons. The six 2018 trials asserted exact equality for missiles, intercepts, carried and city charges, projects, pickups, carrier losses, protected army/frontline/city value, unit actions and survivor counts. All six reported `2018_AI_NEUTRALITY_OK`.

| Metric | Original 2017 AI | 2017-only variant |
|---|---:|---:|
| Missiles fired | 187 | 188 |
| Intercepted | **80 / 187 (42.78%)** | **85 / 188 (45.21%)** |
| Mobile interceptions | 1 | 9 |
| City interceptions | 79 | 76 |
| Eliminators started | 253 | 246 |
| Charge pickups | 27 | 30 |
| Carrier losses | 7 | 4 |
| Mean friendly-army value protected | **10.2905%** | **10.1850%** |
| Mean frontline value protected | **11.1040%** | **11.5540%** |
| Mean weighted city value protected | **19.5870%** | **17.7065%** |

**2018 preservation confirmed:** all six matched checks gave byte-equivalent game outcome measurements apart from elapsed runtime. 2018 defenders are not worsened in the tested seeds.

**Decision: hold, do not merge yet.** Five extra intercepted missiles, eight extra mobile interceptions and three fewer lost carriers are promising, but the 1.88-point loss of weighted city coverage is material. A next candidate should improve city-anchor selection without eliminating forward army coverage; compare against this era-gated version *and* the original baseline. Do not claim a general defensive upgrade yet.

No gameplay or merge changes to `main`.
