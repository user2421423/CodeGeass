# Passing defect-fix verification

The original audit evidence remains unchanged in `../evidence/`. These results use the corrected gameplay files, whose exact SHA-256 hashes are recorded in `../../data/sim_baseline.metadata.json`. Tournament provenance records the local implementation revision; its source changes map to the AI/engine/scenario commits in PR #117. The engine digest is identical in both follow-up matrices.

- `fast.tap`, `full.tap`: final strict regression runs, including the baseline archive/digest guard.
- `affected.*`: five affected scenarios, both playable perspectives, Elite, seeds 11/29, five turns (20 matches).
- `panama-20-turn.*`: EU/Elite Panama, both seeds, twenty turns (two matches).
- `post-fix-fingerprints.txt`: second independent complete capture, identical to the current canonical baseline.
- `baseline-comparison.json`: exact historical→audited main, audited main→corrected, historical→corrected and independent-capture comparisons.
- `pr-baseline.log` / `pr-fingerprints.txt`: fresh comparison using the exact selected-scenario CI command.
- `summary.json`: machine-readable totals and commands.

All 22 follow-up matches completed their full horizons without errors. The sample validates the reported defects, not balance. Original evidence about long games and balance relates to the audited revision and has not been silently relabeled as current behavior.
