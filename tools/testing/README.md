# Automated gameplay testing

Testing ownership: `tooling-and-ci` (`tools/**`, `.github/workflows/**`, `.gitignore`). The simulator observes the shipped rules. This branch also contains focused AI, engine-rules and custom-scenario defect fixes documented in [FIXES.md](FIXES.md); unit statistics and visual assets are unchanged. Build first; there are no npm dependencies. Node 22 is the CI runtime; local verification also used Node 24.

```sh
node tools/build_sources.cjs
node tools/gameplay_checks.cjs fast
node tools/gameplay_checks.cjs full
```

## Regression suites

The fast suite runs real-engine interaction tests, tournament-tool tests, all four defect reproductions, the eight affected Elite roster configurations and a bounded set of existing smoke checks. The full suite additionally discovers **every** `tools/*_smoke.cjs`, checks every regional scenario/player/difficulty setup and runs strict reproductions of known gameplay defects. Individual smoke scripts run in isolated child processes with timeouts. No failed checks are skipped or converted into passing assertions.

| Area | Executable coverage | Remaining gaps |
|---|---|---|
| Combat / movement / breakthroughs | `interactions.test.cjs`; amphibious, city-defense-refresh, regular/Elite class smoke checks | Exhaustive terrain, critical-hit and every commander combination |
| Commander skills | Zero reactivation with heavy movement caps and persistent cooldown; commander assignment/progression and signature-related city-break smoke checks | Most individual active/passive skills need dedicated effect and expiry assertions |
| Research / economy | Research combat, pricing/progression/mobility, advanced production/reinforcement and AI affordability smoke checks | Long-run scarcity and multi-resource reserve stress |
| City upgrades / defenses | Resource spending, independent factory levels, once-per-turn locks, regional HQ damage/capacity retention, inflated-save repair and fortress checks | Exhaustive fortification/research/difficulty combinations |
| Naval | Carrier cargo through loading, disembarkation/capture/ready state, repairs, amphibious chain actions | Multi-carrier blocking, contested beach routing and invasion causality |
| Conquest / campaign | Capital versus elimination rules, UFN alliances/rosters, campaign rewards/repeats, World Campaign level/color rules | Every campaign victory/unlock path and all strategic weapon interactions |
| Save/load | Compact regional terrain/ownership, deterministic action continuation, damaged era-migrated cargo, action limits/cooldowns | Corrupt/truncated/untrusted saves, schema-version fuzzing and long replay equivalence |
| Faction rosters | Every regional/player/difficulty combination; Federation 2017 / UFN 2018, classes, ordinary/Elite eligibility and custom-converter cargo | Exhaustive reinforcement/production paths after long games |
| Rewards | Story mastery per difficulty, persistent repeat prevention, reward economy, loot boxes, challenge pass and max-level fragment smoke checks | Browser storage interruption and migration across multiple old profiles |

Some older smoke checks inspect source text or data tables. They remain useful compatibility checks, but are not substitutes for gameplay execution. See `interactions.test.cjs` for the added multi-mechanic behavioral tests.

**The original defects are fixed.** The eight failing Elite roster combinations, two HQ save/load cases and Elite Panama AI reproduction all pass now. Their assertions remain active, with stronger coverage for damaged/inflated saves and every regional setup. Original audit evidence is preserved under `evidence/`; current verification is recorded in [FIXES.md](FIXES.md) and `fix-validation/`.

## Tournament matrices

`gameplay_tournament.cjs` calls the exported `simulate` from the existing `scenario_sim.cjs`. It does not copy or replace the gameplay loop. All factions use the shipped AI, with the selected player retaining the real difficulty configuration and turn order. This does not simulate human skill or alternative commander-action strategies.

```sh
# Inspect the complete plan without running any games.
node tools/gameplay_tournament.cjs --preset standard --plan

# All 37 current scenarios, all four difficulties, every playable faction,
# two seeds, bounded two-turn coverage (624 matches).
node tools/gameplay_tournament.cjs --preset quick --difficulties all \
  --seeds 11,29 --jobs 4 --output tools/results/coverage

# A focused sample with multiple horizons, including long games.
node tools/gameplay_tournament.cjs --scenarios invasion-turkey \
  --difficulties normal --seeds 11,29,47,71,101,131,173,211 \
  --horizons 5,20,50,100 --jobs 4 --timeout-ms 600000 \
  --output tools/results/turkey

# Resume exactly the same matrix, source, Node version and time budget.
# Add --resume to the ORIGINAL command (including its selections).
node tools/gameplay_tournament.cjs --preset quick --difficulties all \
  --seeds 11,29 --jobs 4 --output tools/results/coverage --resume
```

The default scenario list is discovered from shipped registrations and tested against `scenario-manifest.js`. It currently contains **37**, including all 30 originally requested and the newer maps. Every playable perspective is selected by default, including `eb` where applicable. Difficulty changes are relative to the selected player; do not pool perspectives when judging balance.

| Preset | Seeds | Horizons | Default difficulties | Current match count |
|---|---|---|---|---:|
| `quick` | 11 | 2 | Normal | 78 |
| `standard` | 11, 29, 47 | 5, 20, 50 | All four | 2,808 |
| `deep` | 11, 29, 47, 71, 101, 131, 173, 211 | 5, 20, 50, 100 | All four | 9,984 |

Long games stop on an actual scenario victory. A 100-turn budget does not force 100 turns after victory. Long matches on large maps can exceed practical time limits; such results are explicitly timed out, never fabricated as defeats. Start with selected scenarios, inspect cost, and expand using shards. The complete deep matrix is expensive.

Other options:

- `--players britannia,cf`, `--difficulties normal,elite`, `--scenarios id,id` filter the matrix.
- `--seeds` accepts unsigned 32-bit integers, including zero; duplicate seeds/horizons are deduplicated.
- `--horizons` accepts 1–150 turns; `--jobs` accepts 1–32 child workers.
- `--shard 0/16` partitions match keys across workers without repetition.
- `--stall-turns 8` sets the quiet/stall threshold.
- `--limit 10` intentionally samples only the first ten jobs in that shard; it is not full coverage.
- `--config file.json` accepts the camelCase configuration keys shown by `--plan`; CLI options override the file.
- `--compare prior/results.json` produces deltas for identical scenario/player/difficulty/seed/horizon keys. Check provenance and intentionally select comparable revisions.

An output directory contains `manifest.json`, append-only `matches.jsonl`, `results.json`, `matches.csv` and `report.md`. An exclusive `.running` lock prevents concurrent writers. Resume rejects source/configuration/runtime/time-budget mismatches and retains failed matches rather than silently rerunning them. SIGINT/SIGTERM kill active children and preserve completed rows. A killed process's stale PID lock can be recovered with `--resume` when the owning process no longer exists. A torn final journal append is discarded; malformed complete rows are errors.

Merge shards (different engine/tooling digests and duplicate match keys are rejected):

```sh
node tools/gameplay_tournament.cjs \
  --merge tools/results/shard0/results.json,tools/results/shard1/results.json \
  --output tools/results/combined
```

Use `--expected-shards 16` when merging a 16-shard job so an entirely missing shard cannot look complete. Empty shards produce valid zero-match reports. Merging also reads completed journal rows from interrupted shards. A missing planned result is visible in the planned/completed count and makes the merge fail. Completed evidence survives worker errors. The raw journals remain the source for recovering an interrupted runner; do not delete them merely because an older `results.json` is present.

## Measurements and interpretation

The legacy simulator accepts optional read-only observer hooks. With no hooks, its CLI format, results object and game-state fingerprints are preserved. Tournament telemetry initializes known units with **carrier cargo included**, distinguishes factory-created formations from scripted reinforcements, counts real attack/movement/disembarkation events and observes ownership/loss changes throughout turns. Timeout/error rows retain the last reported turn, phase and actor where available. Successful games retain per-turn cities, formations, resources, production by type, captures and landings.

Losses mean formation disappearance, including surrender and embarked cargo; added frames are not new formations. Landing counts include ordinary sea transport and repeated landings, not unique successful invasions. Faction stalls are eight turns without a city ownership change or an own formation loss while still holding cities. This proxy can flag legitimate distant operations or defensive holding; inspect attacks and movement before calling it an AI defect. Front-level quiet intervals are a separate diagnostic of assigned members' engagement.

Reports keep every scenario/player/difficulty/horizon separate. They show seed counts, victories, unresolved games, failures, city-share ranges, attacks per turn, landings and stall counts. Wilson 95% intervals describe observed victories **by that horizon** among successful simulations. Unresolved games are censored, not defeats. Failed/timeout games are shown separately and must be investigated before drawing balance conclusions. Repeated horizons from the same seed are correlated and are never pooled into a larger statistical sample.

The repeated-dominance screen requires at least eight independent seeds and a lower victory interval above 50%, at least 80% final city share in every successful run, or at most 20% share in every run (repeated disadvantage). This is a triage heuristic, not a design target or a multiple-comparison-corrected significance test. Starting asymmetry, expedition objectives, selected-player effects and unused hold-out seeds must be checked before considering a balance change.

## Deterministic baselines

Never replace an unexplained failing reference. The historical baseline and independently captured starting main are preserved byte-for-byte as `tools/data/sim_baseline.legacy.txt` and `tools/data/sim_baseline.audited-main-09458d5.txt`. Their hashes, the old-to-new comparisons, fixed source hashes and two independent post-fix captures are recorded in `tools/data/sim_baseline.metadata.json`.

The canonical `sim_baseline.txt` now describes the corrected rules. Its reconciliation is explicit: the historical file already differed on all 390 lines before this work; the follow-up repairs then intentionally changed AI error handling, regional city defenses and four Elite scenario rosters. Tests and affected simulations must pass before producing the new reference. No earlier reference or failed test evidence is deleted.

On 2026-10-20 the reference was refreshed for the Gene Smilas rework and for commander-rework drift that had reached main without a refresh. The previous file is recorded under `history` in the metadata. The per-line attribution and both captures are in `tools/testing/smilas-rework-validation/`.

```sh
# Strict comparison against the documented current reference.
node tools/check_sim_baseline.cjs --actual tools/results/current-fingerprints.txt

# Inspect historical drift; this is expected to fail against corrected rules.
node tools/check_sim_baseline.cjs --reference tools/data/sim_baseline.legacy.txt

# Direct comparisons remain available for pure refactors.
node tools/check_sim_baseline.cjs --base-root /path/to/base-checkout \
  --scenarios eu-greenland,division-japan,battle-luoyang
```

The comparator reports missing/changed configurations and a bounded diff. It never writes its reference. PR CI compares representative scenarios with the documented defect-fix reference; extensive CI checks all 390 lines. A direct comparison with pre-fix main is retained as audit evidence, rather than required to pass despite intentional gameplay repairs. Future intentional rule changes need their own explanation and paired evidence in review.

## CI

`gameplay-checks.yml` runs the fast suite on every PR and a deterministic comparison with the documented baseline. `gameplay-tournament.yml` is manually dispatched: it runs full strict regressions, a full deterministic-baseline check and 16 independent simulation shards, then merges their reports. Failure in one shard does not cancel the others. Logs, raw JSONL and reports are uploaded even on failure. Inputs are passed through quoted environment variables/arrays, not interpolated into shell code.

Use a focused deep matrix before a broad run. Each shard has a bounded overall job budget; incomplete plans are evidence of unfinished coverage, not a clean tournament result. The checked-in evidence and ranked findings document exactly what was actually run for this change.
