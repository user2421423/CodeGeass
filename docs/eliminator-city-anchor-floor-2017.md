# 2017 Eliminator city-anchor coverage floor — controlled experiment

**Do not merge to `main`.** Based on `experiment/eliminator-launch-diagnostics`; engine, F.L.E.I.J.A. targeting and 2018 AI remain unchanged.

## Context

The previous 2017-only experiment, [PR #69](https://github.com/user2421423/CodeGeass/pull/69), passed 20 matched 2017 wars and six strict 2018 baseline-equivalence checks. In 2017 it increased real missile interceptions 80/187 → 85/188 and mobile interceptions 1 → 9, and reduced carrier losses 7 → 4. However mean weighted city protection fell 19.59% → 17.71%, making it unsuitable to merge without another experiment.

## What this candidate changes

Carry over exactly the same prior 2017 forward-city production and secondary anchor behavior. Change **only the primary stationary city anchor selection**:

- Calculate each ready waiting city's `eliminatorCoverageValue` (including nearby friendly city cluster value and overlapping Eliminator coverage).
- Preserve the friendly capital as the primary fixed defensive anchor **only if its coverage value is at least 85% of the strongest eligible city's value**.
- Otherwise preserve the strongest city cluster, rather than always forcing the capital to remain anchored.
- Do not change charge count, interception radius, carrier assignment, offensive AI, classified intel rules or other game economics.
- For the 2018 era, use PR #69's exact baseline allocator and return zero for new forward-city lab scoring. Verify identical gameplay state and metrics.

## Experiment

CI must pass all Node tests, source-to-bundle synchronization and UI smoke, including a regression fixture with a Tier 1 commander beside a low-value capital, testing that the charge becomes mobile while a much more valuable city retains its fixed defense.

The matched sim matrix includes 20 independent 2017 seeds (45 turns) and 6 independent 2018 seeds (35 turns). For each seed, run **three identical game engines** with only the defensive AI bundle changed:

1. Original diagnostic baseline `6e452e5ca7f3148c9392d37701c1e93897a3386e`.
2. Prior 2017-only experiment at `9e070cd77d5ac7a7cb37100fb94d3c787ec5834d`.
3. Current capital city-coverage floor.

The six 2018 simulations must match both prior defensive AIs on missiles, intercepts, charges, losses, protection, unit actions and survivors. Do not use different offensive targeting rules.

## Decision threshold

Do not consider a merge if city protection worsens compared with original baseline without substantial, repeatable compensating survival/coverage gains. The initial test is a screen, not proof of statistically stable superiority. `main` is untouched.

## Results

Pending validation and matched comparisons.
