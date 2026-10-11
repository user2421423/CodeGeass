# Chinese Federation starting-force balance experiments
11 October 2026 · Code Geass Conquest · experimental branch `feature/ai-multifront-defense-20261011`

## Executive findings

Simulation-only variants A–D were tested using the current proven AI, identical world map and economy, all-AI normal difficulty (equal-AI observer mode), 50 turns, three starting player/turn orders, and six seeds. The primary four seeds were `42`, `20261007`, `777`, `13579`; two held-out seeds were `314159`, `271828`. **72 successful games = 18 per variant**.

**D (+8 strong two-frame formations) is the most promising of the tested interventions.** It increases mean Chinese cities at turn 50 by **10.89** and mean surviving planning strength by approximately **24.1**, with **0/18** China outcomes at 10 cities or fewer. This comes at the cost of reducing E.U. average territorial control by 12 cities. It is a balance option, **not yet an approved gameplay change**.

## Intervention definitions

The baseline land-army table `dist/engine/world.js` contains **45 Chinese land formations totaling 76 frames**. The engine's full starting Chinese roster also includes naval/amphibious forces; simulation validation checked the full corresponding initial counts of 51/86, 51/86, 55/94 and 59/102 (where the latter figures include six amphibious formations and their ten frames).

### A — Existing baseline (45 land formations / 76 land frames)
No changes.

### B — Reposition/upgrade seven existing formations (45 / 76)
No additional formations or frames, no economy changes, and no modification to commanders:
- Scout near Singapore (103.8°E, 1.35°N) → medium near Iran (54.9°E, 34.7°N), 1 frame.
- Scout in Thailand (100.5°E, 13.7°N) → medium near Central Asia (70.8°E, 39.8°N), 1 frame.
- Scout near Taiwan (124.2°E, 24.1°N) → assault near Northeast Asia (130.8°E, 47.1°N), 1 frame.
- Light in southern China (113.3°E, 23.1°N) → heavy near Iran (55.6°E, 36.3°N), 2 frames.
- Light near Shanghai (121.5°E, 31.2°N) → medium in Central Asia (63.0°E, 39.2°N), 2 frames.
- Medium in Mongolia (106.9°E, 47.9°N) → medium in Northeast Asia (131.0°E, 46.6°N), 2 frames.
- Light in Mongolia (106.9°E, 47.9°N) → rocket in Central Asia (67.7°E, 39.5°N), 1 frame.

### C — Add 4 strong formations (49 / 84)
All additions are two-frame formations: heavy at 54.8°E/34.8°N (Iran), rocket at 65.7°E/39.5°N (Central Asia), medium at 72.7°E/42.4°N (Tashkent approach), heavy at 130.8°E/46.2°N (Northeast Asia). Existing units untouched. **C does not incorporate B**, so effects are separable.

### D — Add 8 strong formations (53 / 92)
C plus four two-frame formations: medium at 56.5°E/38.7°N, rocket at 68.2°E/38.8°N, heavy at 128.2°E/48.3°N and medium at 123.2°E/42.4°N. Existing units untouched. **D does not incorporate B**.

The above locations are geographic coordinates supplied to the game's usual nearest-free-land spawn logic, not guaranteed final tile coordinates.

## Primary matched sample (12 runs per variant)

| Metric | A | B | C | D |
|---|---:|---:|---:|---:|
| China cities at turn 20 | 48.75 | 49.83 | 49.50 | 52.08 |
| China cities at turn 50 | 29.42 | 28.42 | 22.92 | **37.92** |
| China planning strength at turn 50 | 41.89 | 41.39 | 38.15 | **63.30** |
| E.U. cities at turn 50 | 63.50 | 69.00 | 73.75 | 56.67 |
| Britannia cities at turn 50 | 60.50 | 55.58 | 57.92 | 57.92 |
| China ≤10 cities | 3/12 | 4/12 | 2/12 | **0/12** |

[Primary 48-run GitHub Actions workflow](https://github.com/user2421423/CodeGeass/actions/runs/38133814800) — all jobs success.

## Held-out sample (6 runs per variant)

| Metric | A | B | C | D |
|---|---:|---:|---:|---:|
| China cities at turn 20 | 47.67 | 49.67 | 53.17 | 52.83 |
| China cities at turn 50 | 26.00 | 32.67 | 37.33 | **41.67** |
| China planning strength at turn 50 | 39.48 | 42.96 | 72.69 | 69.03 |
| E.U. cities at turn 50 | 72.17 | 62.33 | 62.17 | 49.83 |
| Britannia cities at turn 50 | 53.83 | 58.67 | 53.17 | 61.67 |
| China ≤10 cities | 1/6 | 1/6 | 0/6 | **0/6** |

[Held-out 24-run workflow](https://github.com/user2421423/CodeGeass/actions/runs/38134223980) — all jobs success.

## Combined 18-game results

| Metric | A: current | B: relocate+upgrade | C: +4 | D: +8 |
|---|---:|---:|---:|---:|
| China cities at turn 20 | 48.39 | 49.78 | 50.72 | **52.33** |
| China cities at turn 50 | 28.28 | 29.83 | 27.72 | **39.17** |
| China planning strength at turn 50 | 41.09 | 41.91 | 49.66 | **65.21** |
| E.U. cities at turn 50 | 66.39 | 66.78 | 69.89 | 54.39 |
| Britannia cities at turn 50 | 58.28 | 56.61 | 56.33 | 59.17 |
| China at ≤10 cities | 4/18 | 5/18 | 2/18 | **0/18** |

The D–A difference in Chinese turn-50 cities is +10.89 across the matched seeds, with a paired standard deviation of about 20.82 cities and a nominal t-based 95% interval of +0.53 to +21.24. This interval is **exploratory and unadjusted for selecting the best of B/C/D**; it is not a proof of a general or statistically decisive improvement. D improved the Chinese outcome in 14/18 matched games and all 6 held-out games, but some games deteriorated severely. In particular, mean E.U. territory fell by approximately 12 cities under D.

## Engineering/decision notes

1. Adding +4 strong formations alone is **not** a robust fix: it lowers mean turn-50 Chinese territory relative to the baseline, although it reduces near-eliminations.
2. B does not provide a reliable gain either: in the first twelve games it did worse, and in the six held-out games it did better. Redistributing existing units alone is too sensitive to placement and evolving front assignment.
3. D is the clear winner of these exact four tested configurations. Its effect is large enough to justify consideration of a **small permanent starting-force balance patch** if the designer accepts the shift in E.U. territorial strength.
4. The nonlinearity between C and D suggests possible frontline threshold effects in the existing AI, but these experiments do not establish a causal mechanism.
5. To further refine balance, the next optional simulations could test +6 units, more precise initial guard/mobile role positioning, and the current +8 unit selection on further seeds. No need to alter production, income, starting map, or AI until the designer approves.
6. **No starting force, unit class, income, city, world map, or gameplay AI changes were committed.** Each job rewrote its temporary copy of `dist/engine/world.js` *after* source-bundle checks and full regression tests, before running the simulation. The repository retains only the reusable test script, CI workflow, and this report. Do not merge to main without explicit approval.

### Reproduction

`node tools/ai_starting_forces_variant.cjs A|B|C|D` applies one scenario to the CI checkout's temporary `dist/engine/world.js`; always use a fresh checkout for each run (the script is intentionally not idempotent across different variants). Then run `node tools/balance_sim.cjs --runs 1 --max-turns 50 --players <britannia|eu|cf> --difficulties normal --seed <seed> --snapshot-turns 5,10,15,20,25,30,35,40,45,50 --quiet --equal-ai`.
