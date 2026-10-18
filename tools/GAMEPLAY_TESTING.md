# Gameplay regression and statistical tournament system

Ownership: `tooling-and-ci` (`docs/LANES.json`). These tools do not change AI, unit stats, rules, art, or mission data.

## Fast checks

Build first: `node tools/build_sources.cjs` (Node.js 22; no package installation).

- `node tools/gameplay_regressions.cjs --fast` runs selected cross-system and existing engine smoke tests.
- `node tools/gameplay_regressions.cjs --all` runs the entire documented real-engine smoke catalog.
- `node tools/tournament_stats_test.cjs` tests Wilson confidence intervals, censoring, thresholds and CSV.
- `node tools/gameplay_interaction_smoke.cjs` checks determinism, rosters, save round-trips (regional and conquest), and whether observer hooks affect AI outcomes.
- `node tools/sim_baseline_check.cjs` checks selected old fingerprints. Add `--all` for every stored fingerprint. Reference files are never regenerated.

## Full tournament

```sh
node tools/scenario_tournament.cjs --list
node tools/scenario_tournament.cjs --scenarios all --players all \
  --difficulties normal,hard,challenge,elite \
  --seeds 11,29,47,83,101,127,151,173 --turns 5,20,50,100 \
  --max-games 10000 --output-dir artifacts/gameplay-tournament
```

The tool discovers all registered regional scenarios (including additions beyond the README's historical 30). Each scenario × playable faction × difficulty × seed × turn horizon produces an independent real-engine simulation using the unchanged scenario initializer, combat rules and AI. Defaults are seeds 11 and 12, and horizons 5, 20, 60. A game-count guard prevents accidental huge CI jobs; an explicitly invoked extended GitHub Actions workflow supports longer studies.

Output files: `runs.json` contains detailed outcomes, city captures, losses, observed units produced by type, attacks, naval movements and deployments, available engine-confirmed invasion wins, inactivity windows, state snapshots and exceptions. `runs.csv` contains per-game records, `summary.csv` contains matched cohorts and statistical uncertainty, and `report.md` contains ranked findings, coverage gaps and recommended investigations. Each run includes its exact deterministic scenario, faction, difficulty, seed and turn cap.

## Interpretation rules

Unresolved matches are censored, **not** counted as victories or defeats. Wilson 95% intervals use only resolved, error-free games. AI-versus-AI selected-player difficulty bonuses mean this is **not a human player win-rate estimate**. Possible faction dominance requires at least eight resolved games, with a 95% interval wholly above 65% or below 35%. Ten turns without captures or attacks is an inactivity window; frequent inactivity (at least 80% of five valid games) is an AI investigation lead, not automatic proof of faulty AI. Naval deployment events are only proxies for landings; confirmed invasion wins, where exposed, come from game war reports. Production by type counts newly observed units, not every AI purchase considered.

## Baseline discipline and follow-ups

Never automatically rewrite `tools/data/sim_baseline.txt`. If comparisons fail against unchanged `main`, document the pre-existing drift rather than silently updating the reference. For gameplay changes authorized separately, explain every changed fingerprint and update it only in the intended change PR. Compare 8–20 independent seeds over 50–100 turns before claiming scenario imbalance. Reproduce errors first; browser UI flows, player input, save migrations and commander-skill combinations still merit separate tests under their ownership lanes.
