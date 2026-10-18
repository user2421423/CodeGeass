# Ranked gameplay findings — 18 October 2026

Audited base: `user2421423/CodeGeass@09458d5900b994d6a2a3f23b59e22f6b955cfcd3` (latest main when work began, including PR #112's Federation-era roster separation). All implementation changes in this branch belong to `tooling-and-ci`. Gameplay fixes below are recommendations for the owning lanes; none were applied here.

## 1. Confirmed bugs, ranked

### P1 — Elite Panama Atlantic AI dereferences a null combat preview

**Observed:** `eu-panama`, selected player `eu`, difficulty `elite`, seeds **11 and 29**, turn **2**, acting formation **63**. Both two-turn tournament games report `TypeError: Cannot read properties of null (reading 'unit')`.

```sh
node tools/build_sources.cjs
node tools/gameplay_tournament.cjs --scenarios eu-panama --players eu \
  --difficulties elite --seeds 11,29 --horizons 2 --output /tmp/panama-reproduction
```

The tournament exits nonzero and retains both errors. A direct simulator reproduction with stack logging locates the unsafe `pr.unit` access in `src/ai/07-tactical-orders.part.js`, inside `choose()`: it calls `preview(...)` for every entry from `targets(...)` and assumes a non-null result. This establishes the failing contract; it does **not** establish why that target's preview became invalid. Owner: **ai**, with engine-rules coordination if target/preview legality differs.

Permanent strict reproduction: `known_defects.test.cjs`, “Elite Panama Atlantic AI completes two turns without an invalid-preview crash.” Do not simply suppress the exception and count the game as a clean balance result. The harness marks the entire affected match as failed and excludes it from successful-run statistics.

### P1 — Regional HQ defense capacity changes on save/load

**Observed:** saving and loading an untouched `area-18` game promotes Riyadh's defense capacity without purchasing an upgrade.

| Difficulty | Before save | After `migrateSave(JSON.parse(JSON.stringify(packSave(g))))` |
|---|---:|---:|
| Normal | 400 | 600 |
| Elite | 900 | 1,100 |

The normal 400→600 change also reproduces for Sana'a and Dammam; spot checks reproduce it for Sydney/Melbourne/Brisbane/Darwin/Perth/Adelaide, Ankara/Aleppo, Nuuk/Ilulissat/Tasiilaq and Phuket/Singapore. These examples are verified, not an exhaustive count of affected cities.

```sh
node --test tools/testing/known_defects.test.cjs
```

The two save/load tests assert that capacity stays unchanged and currently fail. `src/engine/07-save-compatibility.part.js` recalculates defenses through `cityDefenseHP(..., !!s.capital)`, while scenario setup uses the name-aware `scenarioCityDefenseHP(...)`. Regional HQ flags therefore acquire the true-capital capacity on load. Current shield HP need not instantly heal; the confirmed change is the maximum capacity. Owner: **engine-rules**, with scenario owners deciding whether regional HQ flags should remain.

Recommended fix: use one consistent scenario-aware defense classification for setup, loading and city development; retain legitimate research/difficulty bonuses and damaged current shields. Add more regional save fixtures before changing the migration.

### P2 — Four custom Elite scenario conversions retain wrong-era Chinese equipment

Strict roster assertions fail in these **eight scenario/player combinations**, all on Elite difficulty at seed 11:

| Scenario | Selected players | First incompatible Elite found |
|---|---|---|
| `cf-pacific-northwest` | `cf`, `britannia` | `akatsuki_missile` |
| `bf-malacca` | `britannia`, `cf` | `akatsuki_missile` |
| `cf-mexico` | `cf`, `britannia` | `akatsuki_zikisan` |
| `cf-panama` | `cf`, `britannia` | `akatsuki_zikisan` |

The Pacific Northwest and Chinese Pacific Panama examples include incompatible **carrier cargo**, which a check limited to `g.units` would miss. Other incompatible Akatsuki configurations can exist after the first failing assertion. All regular Federation formations pass the ordinary era-roster invariant in the complete setup sweep.

```sh
node --test tools/testing/rosters.test.cjs
```

The custom Elite converters assign `u.type`/`u.elite` after normal unit construction and select from older scenario pools. These paths bypass the new era normalization or retain incompatible entries in cargo. Owners: the respective **scenario lanes**; shared conversion/eligibility improvements belong to **engine-rules**. Recommended fix: use the shared native eligibility rules for both field formations and cargo, then preserve same-class roles and damaged HP when converting. No unit statistics or artwork need to change.

### P2 — Historical deterministic reference predates current main

All **390** fingerprint lines in the preserved `tools/data/sim_baseline.txt` differ from the independently captured starting-main output. This is inherited drift, established **before** the optional observer changes. The reference file was not regenerated or edited. Its SHA-256 remains:

`5e4f1ae0742784af34dd90a2aede0bf19e2183f354daace87a6f4dc07798dc31`

The feature branch is also compared directly with the independently captured main fingerprint output. The historical-reference job intentionally reports the old drift; the PR-base job detects any new behavioral drift introduced by a proposed change. Owner: **tooling-and-ci**, with a separate, reviewed decision needed to reconcile historical gameplay changes. This branch makes no claim that the historical reference passes.

## 2. Scenarios with stronger balance evidence

### Highest-priority investigation: Greenland's all-AI invasion

Normal difficulty, eight independent seeds per selected perspective, 50-turn budgets:

| Selected perspective | Selected-faction victories | Unresolved | Selected-faction final city share, mean [range] |
|---|---:|---:|---|
| Britannia | 3/8 | 5/8 | 93.1% [83.3%–100%] |
| E.U. | 0/8 | 1/8 | 0.7% [0%–5.6%] |

In the E.U.-selected group, Britannia wins **7/8** and the remaining run is unresolved. The descriptive Wilson 95% interval for that observed Britannian victory share is approximately **52.9%–97.8%**. This is a repeated AI invasion-failure pattern, not a claim about human win rates.

Britannia starts with **all 18 cities**; the E.U. starts as a cityless expedition. That asymmetry is intentional, so high Britannian city share alone is not proof that equal-city balance should be imposed. The important evidence is repeated inability to establish/retain a successful expedition across seeds and both turn-order perspectives. Check untouched hold-out seeds, harder difficulties and representative human opening plans before changing resources, force composition or geography.

### Turkey: variation is too large for a strong imbalance claim

Normal, eight seeds per perspective, 50-turn budgets:

| Selected perspective | Selected-faction victories | Unresolved | Mean final city share [range] |
|---|---:|---:|---|
| Britannia | 1/8 | 4/8 | 42.6% [0%–100%] |
| E.U. | 4/8 | 2/8 | 64.6% [0%–100%] |

Both factions achieve total conquest in some configurations. The 100-turn-budget continuation for Britannia/seed 29 resolves as an E.U. victory on **turn 61**; it was unresolved at turn 50. This directly demonstrates why a horizon-limited city lead or non-victory must not be counted as a final defeat. No rebalancing recommendation follows from this sample.

### Area 18: insufficient sample size

Britannia-selected Normal runs at seeds 11 and 29 were unresolved at turn 20 and ultimately became Britannian victories within the 100-turn budgets. Two seeds are insufficient for a firm imbalance finding. The broad two-turn matrix checks initialization/opening behavior and runtime errors; it supplies no persuasive long-run balance evidence for the other scenarios.

## 3. Existing AI weaknesses, ranked

1. **Unsafe combat-preview assumption:** the confirmed Elite Panama crash can interrupt an AI activation. Resolve target/preview consistency before interpreting affected balance results.
2. **Expedition conversion effectiveness:** Greenland repeatedly fails to turn a cityless expedition into sustained conquest. Inspect transport selection, landing cohesion, target choice and replacement logistics; the evidence does not isolate one cause.
3. **High landing activity does not establish invasion success:** Greenland produces thousands of sea-to-land/disembarkation events across the sample while E.U. city control remains very low. Repeated landings are counted separately and carrier orders include actions by launched troops. Use unit IDs, beachhead retention and subsequent captures to distinguish useful deployment from movement churn; event volume alone is not evidence of strong naval AI.
4. **Late-game completion:** five Britannia-selected Greenland runs still have opponents after 50 turns despite retaining at least 15/18 cities. Faction stall proxies flag these runs. The seed-47 continuation actually completes all **100 turns** without a victor, ending at **15 Britannian / 3 E.U. cities**; final telemetry records 17 quiet-front intervals. Inspect the last hostile positions and route reachability before assuming inactivity is irrational.
5. **Perspective sensitivity:** Normal all-AI outcomes vary with the selected player/turn order. Keep player perspective as a separate experimental dimension; do not publish a single pooled faction win percentage.

## 4. Coverage gaps that remain

The suite now executes interaction regressions and the repository's existing smoke checks, and validates every regional setup/player/difficulty combination. It is not exhaustive over all possible game states.

Highest priorities are full active/passive commander effect matrices (including expiry and counter-fire), multi-carrier congestion and beachhead retention, strategic weapons/interception, every World Campaign unlock/victory path, corrupt and old-schema save fuzzing, reward persistence under interrupted browser writes, and DOM/mobile interaction tests. Some inherited smoke checks assert source patterns or static data, which do not prove runtime correctness. The coverage table in [README.md](README.md) maps each subsystem to executable coverage and remaining gaps.

The simulation system currently records realized production choices, not rejected factory options or complete utility-score explanations. Formation-loss telemetry includes surrender/disbanding; it does not attribute every casualty to a particular attack. Front quiet intervals and faction stall proxies are diagnostics, not proof of tactical failure. AI-vs-AI testing does not establish human difficulty.

## 5. Recommended next work

1. Fix the three confirmed gameplay defects in their owning lanes, keeping the strict tests; rerun both affected seeds and the full suite.
2. Expand Greenland to unused seeds and all difficulty/perspective combinations; inspect actual landing histories and successful human openings before proposing balance changes.
3. Add explicit commander-effect/expiry and naval-congestion fixtures, then long save/reload replay comparisons.
4. Add decision tracing for rejected production, route reachability, target utility and transport/reboarding. Keep tracing optional and prove it does not affect deterministic state.
5. Establish reviewed baseline maintenance: explain each intentional gameplay change and retain the previous reference and paired comparison. Do not regenerate an unexplained failing baseline.
6. Grow the extensive CI sample in stages. The configurable deep plan has 9,984 matches on the current catalog; complete small diagnostic matrices before committing substantial CI time to the full plan.

## Validation and evidence

The checked-in `evidence/` files retain per-match summaries, configurations, source digests, statistics and test/baseline verification. Raw simulator outputs were generated separately from the shipped game code. The two-turn matrix covers all 37 scenarios, four difficulties, every playable faction, and seeds 11/29; focused multi-seed runs add 5-, 20-, 50- and 100-turn budgets. The final verification record states completed counts and failures explicitly.

| Check | Observed result |
|---|---|
| Tournament attempts, including diagnostic repeats | 673 |
| Distinct scenario/player/difficulty/seed/horizon configurations | 666 |
| Broad two-turn matrix | 624 completed: 622 clean, 2 Panama runtime failures |
| Fast suite | 49/49 pass |
| Full strict suite | 384 tests: 373 pass, 11 fail (8 roster combinations, 2 HQ-load cases, 1 Panama AI reproduction) |
| Legacy fingerprints versus starting main | All 390 lines byte-identical; zero new mismatches |
| Preserved historical reference versus starting main | 390 inherited mismatches; reference unchanged |
| Map guard | Pass; 573 existing permitted differences from map lock |
| Long-run budget validation | Turkey resolves at turn 61; Greenland reaches turn 100 unresolved |

See [evidence/summary.json](evidence/summary.json), [evidence/matches.csv](evidence/matches.csv), [evidence/long-report.md](evidence/long-report.md), and [evidence/hundred-turn.json](evidence/hundred-turn.json). Duplicate diagnostic runs do not increase statistical seed counts. The full 100-turn telemetry is preserved, while the seven compact `matches-*.json` files retain per-configuration gameplay measurements for all 666 configurations.

The strict full suite is expected to fail on inherited defects listed above. No skipped/TODO tests, gameplay changes, statistical adjustments to conceal failures or baseline regeneration were used. PR CI runs bounded passing checks and a direct comparison with its base; the manually dispatched extensive workflow exposes the strict failures and uploads evidence even when a job fails.
