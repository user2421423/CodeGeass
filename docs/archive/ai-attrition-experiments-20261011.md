# China AI attrition experiments — 11 October 2026

Branch: `feature/ai-multifront-defense-20261011`. Benchmark: `764cbb85a907b02c7c560275d99b5c419b22edcf`.
All results are 12 matched 50-turn Conquest simulations: three faction turn orders × four seeds (42, 20261007, 777, 13579). No extra starting troops, credits, faction-specific bonuses, or changes to main.

| Strategy | China turn 20 cities | China turn 50 cities | China ≤10 cities | Chinese formations produced |
|---|---:|---:|---:|---:|
| Verified pre-experiment AI | 48.75 | **29.42** | 3 / 12 | 37.92 |
| Emergency recruitment + quiet guard reduction | 44.25 | 26.50 | 2 / 12 | 54.83 |
| Emergency recruitment only | 48.33 | 26.42 | 1 / 12 | 56.42 |
| Quiet guard reduction only | 44.50 | 22.67 | 2 / 12 | 34.75 |
| Emergency recruitment + 45% static garrison cap | 44.30 | **15.90** | 5 / 12 | 54.20 |
| Avoid lethal, non-killing attacks by wounded units | 48.33 | 24.83 | 1 / 12 | 36.50 |

The baseline remains the strongest on mean Chinese territory at turn 50. All evaluated AI gameplay changes have therefore been rejected and source/dist code restored to the benchmark. Simulator telemetry for guards, recoveries, and mobile formations remains.

## Confirmed diagnosis

- At turn 20, China assigns roughly **28.8 formations to fixed garrisons** and has only **11 available mobile formations**. Yet cutting static guards nearly in half causes larger territorial losses, demonstrating that the city's garrison actually matters.
- Releasing strategic-weapon reserves allows approximately **17–19 additional Chinese formations to be produced** but does not improve turn-50 territory; indiscriminate production funding is not a sufficient fix.
- Protecting badly injured formations from predicted lethal counterattacks reduces collapse frequency but reduces average territorial control from 29.42 to 24.83 cities. Some aggressive trades are operationally useful.
- The strategic problem involves two distant hostile fronts and weak coordination of mobile forces across them, not just missing troops or insufficient funds.

## Next experiments

1. Collect per-theater casualty, attack-quality, and city-loss reasons; track the same army between turns 20 and 50.
2. Test **concentrated regional counterattacks** by existing mobile formations while preserving locally vital static defenses.
3. Target emergency recruitment to specific endangered factories and fronts rather than lifting national savings indiscriminately.
4. Check all three powers' outcomes on held-out seeds and turn orders before accepting a gameplay change.

Never modify or merge into `main` without explicit authorization.
