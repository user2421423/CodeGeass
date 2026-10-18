# Scenario Dynamic Defense — Matched AI Balance Comparison

Date: 2026-10-18

## Reproducible controls

- Baseline main: `5e952a674ad051d32c7826f506c8daa35cc86b6a`.
- Experimental defensive AI (after latest-main sync): `1d6f59221e4da3e23dfa432fc426fb146c6b0a9b`.
- Both are built with `node tools/build_sources.cjs`. `tools/scenario_sim.cjs` runs all factions using AI on an identical game setup with the same seed, scenario, chosen player, and difficulty.
- Full results: [30-turn multi-scenario checks](https://github.com/user2421423/CodeGeass/actions/runs/39101581255), [50–60-turn checks](https://github.com/user2421423/CodeGeass/actions/runs/39101754879).
- All 16 paired cases passed. No simulation errors were reported. These are deterministic paired seed runs; short and extended horizons include repeated seeds and are not independent samples. No direct mixed-version AI-versus-AI match is implied.

## Australia: 60-turn benchmark (Normal, selected player Britannia)

| Seed | Main at end | Defensive AI at end |
|---|---|---|
| 11 | Britannia wins turn 56 | Britannia wins turn 52 |
| 37 | Chinese Federation wins turn 53 | Britannia wins turn 49 |
| 59 | No winner at turn 60: BR 36, CF 12 | Britannia wins turn 53 |
| 83 | No winner at turn 60: BR 26, CF 22 | Britannia wins turn 57 |

- Main: Britannia 1/4 victories, Federation 1/4, unfinished 2/4.
- Defensive AI: Britannia **4/4** victories, by turn 49–57.
- Average total changes of city ownership: **125.25 main vs 70.25 defense**, a 44% reduction.
- This is a substantial faction-balance shift. The feature is **not recommended for merge** until corrected and retested.

## Division of Japan: 50 turns (Hard, selected player Britannia)

| Seed | Main final cities | Defensive final cities |
|---|---|---|
| 11 | BR 0, EU 12, CF 32 | BR 0, EU 7, CF 37 |
| 37 | BR 0, EU 4, CF 40 | BR 0, EU 18, CF 26 |

- Britannia eliminated in both seeds for both versions.
- Average total city ownership changes: **89.5 main vs 52 defense**, a 42% reduction.
- City captures continued into turns 49–50 in the defense runs, so the drop does not represent a complete stall; however the AI isn't consistently better at preserving faction survival.

## Invasion of Japan: 50 turns (Challenge, selected player Britannia)

| Seed | Main | Defensive AI |
|---|---|---|
| 11 | Federation wins turn 48 | No winner by turn 50; BR 4 cities, CF 40 |
| 37 | No winner by turn 50; BR 3, CF 41 | Federation wins turn 43 |

- At **turn 25, seed 11**, Britannia retained 17 cities on main vs 25 with defensive AI; this short-horizon advantage did not generalize across seeds or to victory outcomes.

## European War: 30-turn cap (Normal, selected player EU)

| Seed | Main winner | Defensive AI winner |
|---|---|---|
| 11 | Euro Britannia, turn 22 | Euro Britannia, turn 21 |
| 37 | Euro Britannia, turn 20 | Euro Britannia, turn 22 |

No material change in ultimate result.

## Philippines: 25-turn cap (Normal, selected player Chinese Federation)

Both versions ended with Britannia 7 and Federation 30 cities. Total city ownership changes: 24 main vs 28 defense. The special island-defense behavior remained intact.

## Interpretation

The defensive AI demonstrably changes outcomes. It can finish wars, so the concern is not blanket passivity. The serious issue is asymmetric advantage in Australia: all tested seeds changed to Britannian victories, compared with a split on main. Division of Japan captures fewer cities without rescuing Britannia, and Invasion of Japan has conflicting results depending on seed.

Possible mechanisms to investigate before merging:
1. Prioritize immediate, local, objectively dangerous city threats over broad threats to every holding.
2. Inspect faction-by-faction counts of newly activated defensive fronts, diverted force strength, and defensive factory builds.
3. Ensure the 25%/40%/60% diversion ceilings do not advantage the largest starting industrial base.
4. Re-run the same seeds plus other factions as the selected player at each difficulty.

**Recommendation:** Keep the feature branch unmerged pending a focused defensive-priority rebalance. The results do not justify claiming an across-the-board AI improvement.
