# Baseline refresh for the Smilas rework (2026-10-20)

Why `deterministic-baseline` and `regression` failed on every PR after #156, and why the new reference is correct.

- `post-rework-fingerprints.txt`: second independent Node 22 capture of the 390-line profile at c517408e; identical to `tools/data/sim_baseline.txt`.
- `pre-smilas-6f9ac77-fingerprints.txt`: Node 22 capture at 6f9ac77 (main after #155, before Smilas).
- `attribution.json`: for each of the 73 changed sim lines, the old and new line and every main commit that changed it since 12dc577 (the source of the previous reference), found by replaying each engine-touching first-parent commit under JavaScriptCore and comparing builds with each other.

Findings:

1. The Smilas rework (3f9e4fa4…be8b46ac, pushed to main between #155 and #156) changes 32 sim lines. Every one is a game where the E.U. fields Smilas, on the map or aboard a carrier. No setup line and no Smilas-free game changes. The rework is documented in `docs/COMMANDER_REWORK.md`, so these changes are intended. They include eu-greenland (state and E.U.-side battle report; same cities) and, in the regression job, area-18/britannia (the Federation retakes Hafr al Batin on turn 2), eu-cf-kazakhstan, eu-cf-luoyang/eu and european-war/eu. The regression exceptions are in `tools/data/approved_legacy_changes.json`.
2. Before Smilas, the canonical file was already stale on 71 sim lines. Intentional commander reworks and balance commits pushed on 2026-10-19 caused the drift, and PR CI only checks three scenarios, so nobody saw it. `attribution.json` names the commits.
3. Refactors in the same range reproduce their parents on all 390 lines: #118, a0c53d6e, #155, #158 and #159.
4. Intermediate split commits 21e1ef63, 340ddd5f and 8294107f crash, and 026fe1ea is reverted byte-for-byte by 3a68ad80. Their successors on main are sound.
