# Forward city-cluster Eliminator + Tier 1 commander F.L.E.I.J.A. experiment

**Branch:** `experiment/eliminator-forward-city-tier1`; **base:** `experiment/eliminator-launch-diagnostics`. **Do not merge into `main` without explicit approval.**

## Design decisions

1. **Forward-city defense:** Production site ranking now rewards actual three-hex coverage of friendly cities that have at least two friendly combat units nearby and a visible opposing field unit within twelve hexes. A city is less valuable if ready or pending same-side charges already cover it. Existing danger penalties avoid unsafe laboratories. The first stationary anchor remains the capital (where available); a second ready city charge may stay in place to guard a strongly threatened and co-located army cluster only if three or more total charges exist (preserving at least one mobile charge). Any further charges can travel with Tier 1 or ordinary escorts under existing rules.
2. **Tier 1 targeting after five cities successfully hit:** The attacker gets a per-faction `fleijaSuccessfulCityHits` counter. It increases by one **only** when an unintercepted F.L.E.I.J.A. strike destroys a *hostile* city at ground zero. Intercepted launches and peripheral damage do not count. At >=5, Tier 1 enemies receive a major direct-impact target-scoring bonus (4500) and smaller splash bonuses (1100 inner/300 outer). Existing blast safety, player controls, warhead caps, resource requirements, targeting legality, and enemy Eliminator secrecy remain unchanged. This is an incentive, not a forced shot through allied troops. The new counter survives compact saves.
3. **Validation:** All engine sources must match built bundles, existing Node and UI smoke regressions, and new tests for city-hit counting, interception noncounting, saves, before/after Tier 1 preference, and forward-city anchor retention.

## A/B testing

A reproducible GitHub Actions workflow runs sixteen matched wars: eight 2017 (45 turns) and eight 2018 (35 turns). It compares the candidate against the pinned untouched diagnostic baseline commit `6e452e5ca7f3148c9392d37701c1e93897a3386e`, replacing both engine and AI bundles so the entire feature effect is measured. Target classification and Tier 1 target frequency are recorded separately from interception and city/frontline protection. The target-score threshold is also exercised by dedicated deterministic unit tests because a particular 35-turn war may not record five successful city detonations by a single faction.

## Merge criteria

No merge without explicit approval. Do not accept forward defense simply because theoretical coverage rose: compare actual interceptions, capital coverage and carrier losses. Validate commander hunting at the exact successful-hit threshold, ignoring intercepted strikes and illegal friendly-fire shots.

## First screen and conservative revision

[Initial 16-pair run](https://github.com/user2421423/CodeGeass/actions/runs/38536631541): all tests and 16 paired jobs passed. Combined 2017/2018 intercepts changed from 66/127 to 69/131, while mean weighted friendly-army value protected dropped from 10.69% to 9.43%. 2017 improved interceptions (33/78 → 37/78), but 2018 declined (33/49 → 32/53) and its army protection fell from 9.96% to 7.70%. There were **zero** simulated launches after the attacking faction had hit five enemy cities. The five-city behavior is verified by the deterministic tests, not the naturally sampled war population.

**Second iteration:** To reduce overcommitment to forward city garrisons, a second fixed charge now requires three total charges (rather than two) and a stronger urgency score; lab-location preference for the forward city cluster is reduced. Re-run the same matched baseline and verify that the 2018 army-protection regression improves. No changes to five-city Tier 1 commander targeting.

## Second-run results

Pending rerun. Do not claim superiority from the initial screen.
