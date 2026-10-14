# 2017 Eliminator protection-gated production experiment

**Do not merge into `main`.** Branched directly from `experiment/eliminator-launch-diagnostics`, using PR #76's combined 2017 fixed-city anchoring and 1.25× city-coverage forward lab cap as the comparison candidate.

## Motivation

Twenty matched 2017 wars in [PRs #75 and #76's CI](https://github.com/user2421423/CodeGeass/actions/runs/38557249804) showed that simply adjusting forward laboratory scoring cannot solve the trade-off. The 1.25 cap boosted weighted city-value protection (baseline 19.59% to 20.70%), but reduced protected frontline value (11.10% to 9.66%) and army value (10.29% to 9.60%). The 0.50 cap was worse on both.

## Single targeted behavioral change

Preserve the prior 1.25 cap and all existing 2017 anchor placement, carrier and escort logic. Before awarding any **forward-lab production score**, construct a baseline (no-forward-score) production ranking and identify its first-choice laboratory. For a new forward candidate, compute *incremental marginal value protected by a new charge* using:

- Friendly city-value assets weighted for visible threat, city tier, projects, and friendly concentrations;
- Friendly field-formation assets whose units are within 12 hexes of at least one visible enemy unit, weighted for commander tier, strength, health, and proximity to friendly reinforcements;
- Existing friendly *ready* Eliminator overlap discounts.

Allow the 1.25× capped **forward-laboratory score** only when the candidate's prospective protection meets all conditions:

1. City value covered is at least **95%** of the unboosted baseline production choice.
2. Frontline field value covered is at least **90%** of that baseline choice.
3. It covers some actual threatened friendly field value.
4. An existing friendly Eliminator already exists and the era is not `ufn2018`.

Otherwise, the laboratory competes using its unchanged original non-forward production score. These are **marginal prospective protection estimates**, not a guarantee that every future war has at least those coverage levels; simulations remain essential. No secret enemy Eliminator state, F.L.E.I.J.A. ammo, or hidden enemy projects are examined. No weapon mechanics, F.L.E.I.J.A. attacking/commander targeting, 2018 AI, economy or stationary anchors are changed.

## Benchmark

[GitHub Actions workflow](https://github.com/user2421423/CodeGeass/actions/workflows/eliminator-threat-protection-gate.yml) validates the existing Node suite, source-to-dist synchronization and UI smoke, with no new regression tests or test files.

Then compare four defensive AI bundles under identical engine and paired seeds:

1. Original diagnostic baseline.
2. Prior 2017 anchors-only.
3. Prior 1.25× uncensored forward lab bonus.
4. This value-preserving gated lab bonus.

Run 20 matched 2017 games (45 turns) and six 2018 controls (35 turns) with strict full-gameplay neutrality assertions. Track missile launches, actual interceptions split by city and mobile, carrier losses, protected army and frontline value, weighted-city protection, charge construction and pickup. Don't promote based solely on interceptions with more incoming missiles.

## Completed 20-seed 2017 + six 2018-neutrality results

[All 27 jobs passed](https://github.com/user2421423/CodeGeass/actions/runs/38564626578): existing Node suite, source/build synchronization, UI smoke, all twenty matched 2017 comparisons and all six strict 2018 baseline-neutrality checks. Game engine and weapon rules were identical; only the defender AI bundle changed.

| Metric | Original diagnostic AI | Anchors-only | CAP 1.25 | Value-protection gate |
|---|---:|---:|---:|---:|
| Missiles launched | 187 | 188 | 189 | 186 |
| Missile interceptions | 80 | 83 | 84 | 81 |
| Mobile interceptions | 1 | 1 | 3 | 4 |
| City interceptions | 79 | 82 | 81 | 77 |
| Eliminator charges started | 253 | 255 | 254 | 253 |
| Picked up | 27 | 20 | 20 | 17 |
| Carrier losses | 7 | 5 | 5 | 4 |
| Mean army value protected | **10.29%** | 9.97% | 9.60% | 9.51% |
| Mean frontline value protected | **11.10%** | 10.27% | 9.66% | 9.60% |
| Mean weighted city value protected | 19.59% | 20.35% | **20.70%** | 20.11% |

Six 2018 trials passed exact gameplay-neutrality assertions against baseline for all variants (intercepts, charges, losses, coverage, actions and survivor counts).

### Interpretation and decision

**NO MERGE for this gate**. One extra mobile interception and one fewer carrier loss versus CAP 1.25 do not compensate for its decline in army and city coverage. Only 81 actual interceptions across 186 attacks, compared with 84/189 under CAP 1.25. The expected-value gate's 95% city and 90% frontline thresholds were local *production-site forecasts*, not end-to-end protective constraints, and downstream carrier/army positioning still changes. The gate can even alter the shortlist for actual carrier route scoring, making baseline comparisons nontrivial.

Recommendations: keep baseline defensive AI for the general 2017 experience unless the user explicitly prefers the trade-off from a tested 2017 variant; if continuing experiments, isolate **actual carrier distribution and protected front-line assets** instead of repeatedly changing lab bonuses. PR #67 offensive Tier 1 targeting was validated independently and is unaffected. No changes to `main`.

