# Audit evidence

This directory is the immutable **pre-fix audit**. Current passing verification is in `../fix-validation/` and [../FIXES.md](../FIXES.md).

Audited remote main: `09458d5900b994d6a2a3f23b59e22f6b955cfcd3`.

- `summary.json`: exact batch configurations, provenance, attempt/distinct counts, statistical groups, test outcomes and baseline verification. Batch `revision` fields describe the reconstructed local validation snapshot; `auditedMain` identifies the actual remote source. Gameplay source/data files were checked against their GitHub blob SHAs.
- `matches-00.json` through `matches-06.json`: 666 distinct configurations, retaining captures, production by type, faction losses, attacks, movement, naval counts, stall intervals, final resources/state and errors. Where a configuration was repeated for diagnostics, its latest observation is retained. These compact records intentionally omit large per-turn and landing histories.
- `matches.csv`: one row per distinct configuration. Failed games remain explicit. Missing early-instrumentation front telemetry is marked `not recorded`, not fabricated as zero.
- `hundred-turn.json`: the complete final 100-turn Greenland run, including all per-turn snapshots, landing events and front quiet intervals. Its paired replay comparison records zero city/attack/winner change after telemetry refinement.
- `long-report.md`: horizon-separated statistics for longer runs. Horizons from a repeated seed are not independent samples.
- `main-fingerprints.txt` and `feature-fingerprints.txt`: independently captured legacy simulator outputs; all 390 lines are byte-identical. These are audit captures, not replacements for the historical baseline.
- `fast.tap` and `full.tap`: observed final test output. The full suite retains 11 failing assertions for inherited defects; none are skipped or marked TODO.

The first broad and long batches used the initial read-only telemetry. Later targeted reruns add per-front engagement, actual cargo event attribution and detailed error stacks. Their instrumentation/source digest versions are kept in batch provenance. This does not change game rules; the deterministic outputs and paired long replay substantiate that distinction. Early batches contain faction-level stall proxies; they do not retroactively acquire unavailable per-front histories.

Reproduce with the commands in `summary.json`'s batch configurations and [../README.md](../README.md). Output directories and worker counts can be changed for a fresh run; resume requires the exact original matrix, source/runtime/time budget. Long simulations stop on actual victory and retain unresolved games at their horizon.
