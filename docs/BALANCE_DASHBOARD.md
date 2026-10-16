# Automated balance dashboard

The balance dashboard observes real Code Geass / Knightmare Conquest engine turns under the shipped AI for every player faction. It does not alter combat, economy, maps or victory rules.

## Complete coverage

The simulator reads its regional scenario catalog and dependency order from dist/scenario-manifest.js, so new scenarios are included without maintaining a separate hard-coded list. It currently covers all 37 regional scenarios and both conquest modes (2017 and 2018). The old short names invasion, division and europe still work for existing scripts.

All four difficulty levels are supported: normal, hard, challenge and elite. Results are grouped by scenario, player faction and difficulty, with independently seeded runs. Selecting a player still applies that scenario's real difficulty boosts; the shipped AI drives all factions.

## Local commands

Build the engine bundles first:

    node tools/build_sources.cjs

Run three seeds of every regional scenario and every difficulty for 30 turns:

    node tools/balance_dashboard.cjs --modes regional --difficulties all \
      --runs 3 --max-turns 30 --seed 20261007 \
      --output balance-dashboard.json --html balance-dashboard.html \
      --summary balance-dashboard.md

Quickly inspect specific operations:

    node tools/balance_dashboard.cjs --modes invasion-california,division-japan \
      --difficulties normal,hard,challenge,elite --runs 1 --max-turns 8

Use --modes all to include both conquest modes plus all regions, --modes conquest for 2017 and 2018 only, and --modes regional for the 37 regional operations. --players britannia,cf filters player perspectives. --snapshot-turns 10,20,30 controls territory snapshots. The default options cover all modes and difficulties with one seed.

Divide work across processes with --shard 0/8 through --shard 7/8. Shards contain complete mode/faction/difficulty/seed combinations for different modes. Baseline reports and candidate reports must use schema version 2 and have the same selected faction, difficulty and seed matrix. --baseline path/to/baseline.json refuses unmatched pairs rather than making up deltas.

## GitHub Actions

Open Actions → Automated balance dashboard → Run workflow.

- Smoke: 1 seed × 8 turns; standard: 3 seeds × 30 turns; deep: 5 seeds × 50 turns.
- Modes: all, regional, conquest, or a comma-separated list of canonical scenario IDs.
- Difficulties: all or a comma-separated list of normal,hard,challenge,elite.
- Baseline ref: optional; defaults to the candidate commit's first parent.

The workflow defaults to all 39 modes and all four difficulties. Eight parallel workers run baseline and candidate engines with identical seeds and the current reporting code. The workflow packages per-shard JSON, HTML and Markdown, then validates and merges the matching pairs into one balance-dashboard-combined artifact. Open its index.html to see the filterable full matrix and per-mode territory charts.

The workflow also runs on relevant changes to main and weekly (Monday 02:00 UTC). Weekly runs use standard scope. Each simulation worker has a 110-minute timeout; very large deep runs may still exceed it.

## Metric definitions

| Metric | Definition |
|---|---|
| Win rate | Engine-confirmed victories for the chosen faction divided by seeded matches. Unresolved matches are separately identified, not classified as defeats. |
| Casualty ratio | Total observed opposing formations lost / selected faction formations lost. Undefined when own losses are zero; raw casualty totals remain in JSON. |
| Commander survival | Proportion of starting named-commander formations surviving at the horizon, including units aboard carriers; newly commissioned units are not counted. |
| Naval invasion success | A disembarkation associated with capture of a previously hostile coastal city within five turns and five hexes. Multiple captures cannot double-credit a landing. This is a proximity/timing proxy, not proof the landed unit directly captured the city. |
| AI stalemate | Unresolved match with at least eight consecutive turns without city captures or formation losses while multiple factions still control cities. The longest inactive streak is also recorded. |
| Processing time | Runtime in milliseconds for each run, plus group mean, 95th percentile, and milliseconds per turn. |
| Additional metrics | City totals and transfers, attacks, resources, strength, production, naval losses and landings, coastal captures and AI front switches. |

Eight-turn smoke results detect opening inactivity and technical issues, but are too short to judge full-match balance. All-AI games are engineering diagnostics, not estimated human win probabilities. Runtime varies with the machine.

The simulator clears human elimination overlays to let surviving AI factions continue. It does not invent scenario victories. All balance telemetry is read-only and the workflow does not run gameplay regression tests.
