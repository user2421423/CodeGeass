# City-protective 2017 Eliminator forward-production hybrid

**Unmerged experiment** on `experiment/eliminator-hybrid-citycap-050` from `experiment/eliminator-launch-diagnostics`. Original offensive F.L.E.I.J.A. target selection, weapons, engine and 2018 defensive AI are untouched.

## Why

The [four-way isolation run](https://github.com/user2421423/CodeGeass/actions/runs/38552666399) (20 matched 2017 seeds, six strict-neutrality 2018 controls; all passed) showed baseline 80 interceptions, 1 mobile interception and 19.59% city coverage. Production-only yielded 85 interceptions / 7 mobile but city coverage 16.86%; anchors-only yielded 83 interceptions / 1 mobile with city coverage 20.35%. The original combined candidate yielded 85 interceptions / 9 mobile with 17.71% city coverage. Need stronger city protection without forfeiting valuable mobile outcomes.

## Controlled hybrid

Retain the 2017 anchors-only city protection and stationary charge placement as established in [PR #72](https://github.com/user2421423/CodeGeass/pull/72).

Reintroduce the threatened-forward-city laboratory priority ONLY if a same-side ready Eliminator already exists (i.e. the first charge remains city-defense-oriented), with a hard cap relative to each lab's baseline city coverage:

```
forwardBonusInput = mobileDesired
  ? min(visibleThreatForwardCityCoverage, cityCoverage * CAP)
  : 0;
bonusUsedInRanking = forwardBonusInput * 0.75;
```

This branch tests CAP = **0.50**; sibling `experiment/eliminator-hybrid-citycap-125` tests CAP = **1.25**. Both preserve 2018 exactly and never inspect rival secret weapon status.

### Comparison

A single [four-way GitHub Actions workflow](https://github.com/user2421423/CodeGeass/actions/workflows/eliminator-hybrid-citycap.yml) uses the same pinned world engine for all four 2017 variants:

1. Original diagnostic AI (baseline).
2. Anchors-only, production unmodified.
3. Anchors plus CAP 0.50 (this branch).
4. Anchors plus CAP 1.25 (sibling branch).

**Twenty matched 2017 wars** (45 turns each) measure real missile interceptions by mobile/fixed charges, surviving carriers, average army and frontline protection, weighted-city value coverage and produced/picked-up charges. **Six 2018 controls** must match baseline gameplay exactly for all variants. Validation includes existing Node suite, source/bundle build synchronization and UI smoke; no new regression-test files were added.

**Merge gate:** demand a demonstrated improvement in city and field protection and sustainable real intercepts, not merely a better interception count with different numbers of attacks. `main` unchanged.

## Results — completed matched simulations (NO MERGE for CAP 0.50)

[All 27 jobs passed](https://github.com/user2421423/CodeGeass/actions/runs/38557249804): existing Node tests, synchronized source/build artifacts, UI smoke, 20 matched 2017 four-way simulations and six 2018 exact-neutrality checks.

| 2017 results, 20 seeds | Original | Anchors-only | CAP 0.50 | CAP 1.25 |
|---|---:|---:|---:|---:|
| Launched | 187 | 188 | 193 | 189 |
| Intercepted | 80 | 83 | 88 | 84 |
| Mobile interceptions | 1 | 1 | 3 | 3 |
| Carrier losses | 7 | 5 | 8 | 5 |
| Mean army-value coverage | 10.29% | 9.97% | **8.93%** | 9.60% |
| Mean frontline-value coverage | 11.10% | 10.27% | **8.16%** | 9.66% |
| Mean weighted city-value coverage | 19.59% | 20.35% | **18.29%** | 20.70% |

All six 2018 runs matched original defensive AI gameplay for all candidates (including charge pickups and losses, intercepts, actions, coverage and survivors).

**Decision: Reject CAP 0.50 for gameplay integration.** It intercepted eight more incoming missiles than the original, but with six more missile launches and materially worse army, frontline and city coverage, plus an extra carrier lost (7→8). The 1.25 cap is a more balanced follow-up, but it too worsens protection of the frontline versus baseline. Do not merge either version based on the interception count alone. `main` unchanged.
