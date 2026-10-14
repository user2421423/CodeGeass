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

## Status

Awaiting benchmark validation and results. No merge unless data justify it and user explicitly approves.
