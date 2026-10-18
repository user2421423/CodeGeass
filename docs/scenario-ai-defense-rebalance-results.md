# Scenario Defensive AI — Rebalance & AI-vs-AI Results

Date: 2026-10-18

## Status

**Implemented and tested on feature branch only; not merged to main.**

Feature: `feature/scenario-dynamic-defense-20261018`.

The preferred candidate is the **strict** (conservative, imminent-threat) profile, which is the default in the feature-branch source at the end of this evaluation. It keeps **Offensive**, **Defensive**, and **Regrouping** operations; there is **no counteroffensive state**. All changes are in Scenario Mode AI, not additional unit strength, pricing, or difficulty bonuses.

## Tested changes

1. **Selective threat detection:** A nearby enemy column must genuinely be close to and able to reach a threatened city; no broad two-turn blanket emergency around every friendly city. The conservative profile requires significant local superiority and either a truly immediate approach or defenses below 65% (except imminent city capture, which always qualifies).
2. **Preserve working offensives:** Favor reachable local responders; avoid dismantling an assault already close to its enemy-city objective except in critical emergencies. Local military diversion uses lower ceilings than the original prototype.
3. **Less defensive production overreach:** A factory only receives modest defensive preference, prioritizing meaningful near-term routes and the enemy unit composition. Do not divert the entire economy from offense.
4. **Opt-in diagnostics:** Front activations, assigned defensive/offensive strength, factories serving defense, and actual defensive recruiting are recorded only by the AI simulation test harness.

## Matched Australia benchmark

- Test: **10 seeded, all-AI games**, `war-for-australia`, **Normal**, selected player `britannia`, up to **60 turns**.
- Seeds: `11 37 59 83 101 137 211 307 409 503`.
- The aligned comparison checks out the same game engine revision `ce0b53b07159b8e3930e74374eeb40ec3faa47fd` for both controls, while swapping only scenario AI behavior.
- [Aligned benchmark logs](https://github.com/user2421423/CodeGeass/actions/runs/39108071068).
- All jobs and scenario simulations completed successfully; no recorded simulation errors.

| Metric | main | Combined initial rebalance | Strict final rebalance |
|---|---:|---:|---:|
| Britannian wins by turn 60 | 4/10 | 6/10 | **6/10** |
| Chinese Federation wins | 1/10 | 1/10 | **3/10** |
| Europian wins | 0/10 | 0/10 | 0/10 |
| Unfinished at turn 60 | 5/10 | 3/10 | **1/10** |
| Average city ownership changes | 124.3 | 90.9 | **89.8** |
| Average Britannian defensive recruitments | 0 | 3.9 | 4.1 |
| Average Federation defensive recruitments | 0 | 5.5 | 4.6 |
| Average Europian defensive recruitments | 0 | 3.0 | 3.0 |
| Average Britannian active defensive front-turns | 0 | 30.4 | 23.4 |
| Average Federation active defensive front-turns | 0 | 77.6 | 51.2 |

**Interpretation:** The final strict profile avoids the original prototype's one-sided four-seed Britannian sweep and narrows the discrepancy between factions' defensive resource allocation. Fewer changes of city ownership do **not** imply a stalled offensive: the strict version reached an outright winner in **9/10** simulations, versus **5/10** for main. Some of the reduction represents fewer recaptures and more decisive fronts. Still, Britannia won 6/10 instead of 4/10, so claiming *perfect faction balance* would be premature.

The original unrebalanced prototype had won all four initial Australian seeds for Britannia. Its original four-seed AI trace recorded average defensive recruitments **Britannia 1.5 / Federation 15.3 / Europia 13.0**, explaining much of the asymmetric over-defending. The strict profile reduced this disparity markedly.

## Other scenario checks (four matched seeds each)

Four seeds: `11 37 59 83`. Runs use the same code controls and difficulty settings.

| Scenario | main | Strict feature | Notes |
|---|---|---|---|
| Division of Japan, Hard, BR selected, 50 turns | Britannia eliminated in all four; 93.8 average ownership changes | Britannia eliminated in all four; **70.3** ownership changes | Defense did not rescue the weaker Britannian position; capturing continued |
| Invasion of Japan, Challenge, BR selected, 50 turns | Federation won 3/4; one unfinished | Federation won 2/4; two unfinished | Modest improvement to Britannian survival; no universal outcome change |
| European War, Normal, EU selected, 35-turn cap | Euro Britannia won all four | Euro Britannia won all four | Overall winners unchanged |

All these runs reported zero simulation errors. The Philippines scenario's special island-defense exception passed the separate regression checks. These samples are limited and are not a guarantee against longer-game or human-vs-AI problems.

## Validation

- Script: `tools/scenario_dynamic_defense_smoke.cjs` verifies a threatened city gets a holding defense front, a positive dispatch budget, no runaway defensive commitment, release after two quiet turns, and Philippine island-defense compatibility.
- Runner: `tools/scenario_ai_eval.cjs` records end control, captures, survival, attacks, production, and opt-in AI tactical-production diagnostics.
- The simulation-only `tools/scenario_ai_variant.cjs` can reproduce original, single-change, combined, and strict variants in the **git-ignored compiled AI bundle**, without editing gameplay source.
- [First 4-seed independent-adjustment screen](https://github.com/user2421423/CodeGeass/actions/runs/39107176039).
- [Six extra seeds, making ten combined seeds](https://github.com/user2421423/CodeGeass/actions/runs/39107464082).
- [Latest-main aligned strict confirmation](https://github.com/user2421423/CodeGeass/actions/runs/39108071068).

## Recommendation

Keep the **strict default** on the feature branch for review. It improves emergency targeting and returns to ordinary offense as threats pass, while making Australia more decisive and reducing defensive overproduction by the two factions previously affected most. **Do not automatically merge into main:** conduct a final human playtest or review the remaining faction asymmetry before approval. There are no new defensive damage buffs, resource bonuses, or Counteroffensive state.
