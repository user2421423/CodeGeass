# Automated gameplay testing

Ownership: `tooling-and-ci` (`tools/**`, `.github/workflows/**`, `.gitignore`). These tools do not change gameplay, unit data or assets. Build first; there are no npm dependencies. Node 22 is the CI runtime; local verification also used Node 24.

```sh
node tools/build_sources.cjs
node tools/gameplay_checks.cjs fast
node tools/gameplay_checks.cjs full
```

## Regression suites

The fast suite runs real-engine interaction tests, tournament-tool tests and a bounded set of existing smoke checks. The full suite additionally discovers **every** `tools/*_smoke.cjs`, checks every regional scenario/player/difficulty setup and runs strict reproductions of known gameplay defects. Individual smoke scripts run in isolated child processes with timeouts. No failed checks are skipped or converted into passing assertions.

| Area | Executable coverage | Remaining gaps |
|---|---|---|
| Combat / movement / breakthroughs | `interactions.test.cjs`; amphibious, city-defense-refresh, regular/Elite class smoke checks | Exhaustive terrain, critical-hit and every commander combination |
| Commander skills | Zero reactivation with heavy movement caps and persistent cooldown; commander assignment/progression and signature-related city-break smoke checks | Most individual active/passive skills need dedicated effect and expiry assertions |
| Research / economy | Research combat, pricing/progression/mobility, advanced production/reinforcement and AI affordability smoke checks | Long-run scarcity and multi-resource reserve stress |
| City upgrades / defenses | Resource spending, independent factory levels, once-per-turn lock through save/load, fortress checks | Strict regional-HQ load-capacity regression currently exposes an inherited defect |
| Naval | Carrier cargo through loading, disembarkation/capture/ready state, repairs, amphibious chain actions | Multi-carrier blocking, contested beach routing and invasion causality |
| Conquest / campaign | Capital versus elimination rules, UFN alliances/rosters, campaign rewards/repeats, World Campaign level/color rules | Every campaign victory/unlock path and all strategic weapon interactions |
| Save/load | Compact regional terrain/ownership, deterministic action continuation, damaged era-migrated cargo, action limits/cooldowns | Corrupt/truncated/untrusted saves, schema-version fuzzing and long replay equivalence |
| Faction rosters | Every regional/player/difficulty combination; Federation 2017 / UFN 2018, classes, ordinary/Elite eligibility | Four custom Elite scenario converters currently fail strict eligibility checks |
| Rewards | Story mastery per difficulty, persistent repeat prevention, reward economy, loot boxes, challenge pass and max-level fragment smoke checks | Browser storage interruption and migration across multiple old profiles |

Some older smoke checks inspect source text or data tables. They remain useful compatibility checks, but are not substitutes for gameplay execution. See `interactions.test.cjs` for the added multi-mechanic behavioral tests.

**Known failures are intentional findings, not a green full-suite claim.** At the audited main revision, eight Elite roster combinations, two HQ save/load reproductions and an Elite Panama AI reproduction fail. See [FINDINGS.md](FINDINGS.md). Fast checks pass; the extensive regression job stays red until the owners fix these defects. `node --test tools/testing/known_defects.test.cjs` reproduces the HQ and Panama issues directly.

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

The repeated-dominance screen requires at least eight independent seeds and either a lower victory interval above 50% at least 80% final city share in every successful run, or at most 20% share in every run (repeated disadvantage). This is a triage heuristic, not a design target or a multiple-comparison-corrected significance test. Starting asymmetry, expedition objectives, selected-player effects and unused hold-out seeds must be checked before considering a balance change.

## Deterministic baselines

Never update `tools/data/sim_baseline.txt` merely to obtain a passing check.

```sh
# Compare with the tracked historical reference (strict; currently detects inherited drift).
node tools/check_sim_baseline.cjs --actual tools/results/current-fingerprints.txt

# Compare with a separately checked-out and built PR base.
node tools/check_sim_baseline.cjs --base-root /path/to/base-checkout \
  --scenarios eu-greenland,division-japan,battle-luoyang

# Or compare with an independently captured starting-main fingerprint file.
node tools/check_sim_baseline.cjs --reference /tmp/main-fingerprints.txt
```

The comparator reports missing/changed configurations and a bounded diff. It never writes the reference. PR CI compares representative scenarios directly to the PR base, so an outdated historical baseline does not hide a new tooling regression. The separate extensive job checks the preserved historical reference and reports its inherited failures explicitly.

## CI

`gameplay-checks.yml` runs the fast suite on every PR and a deterministic comparison with the PR base. `gameplay-tournament.yml` is manually dispatched: it runs full strict regressions, a historical-baseline check and 16 independent simulation shards, then merges their reports. Failure in one shard does not cancel the others. Logs, raw JSONL and reports are uploaded even on failure. Inputs are passed through quoted environment variables/arrays, not interpolated into shell code.

Use a focused deep matrix before a broad run. Each shard has a bounded overall job budget; incomplete plans are evidence of unfinished coverage, not a clean tournament result. The checked-in evidence and ranked findings document exactly what was actually run for this change.
