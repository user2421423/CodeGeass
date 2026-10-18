# Gameplay defect fixes — 18 October 2026

Follow-up to the initial [ranked audit](FINDINGS.md). The original failed tests and simulations remain in `evidence/`; passing follow-up evidence is in `fix-validation/`. This update fixes the three confirmed gameplay defects and reconciles the inherited stale baseline. It does not claim to resolve the remaining balance hypotheses or coverage gaps.

## Fixed defects

| Priority | Reproduction on audited main | Corrected behavior | Regression evidence |
|---|---|---|---|
| P1 | `eu-panama`, EU, Elite, seed 11 or 29: null combat preview on turn 2, actor 63 | Tactical scoring skips candidates the combat engine cannot preview. Positional probes restore coordinates, movement flags and the spatial index in `finally`. Other exceptions still fail the match. | Permanent two-turn reproduction; both seeds complete five and twenty turns without errors |
| P1 | Save/load `area-18`: Riyadh capacity rises 400→600 (Normal), 900→1,100 (Elite) | Loading and construction use scenario-aware capital classification. Separate city levels are inferred from authored defenses when absent. Damaged shields retain their absolute damage; already-inflated saves are repaired idempotently. | Normal/Elite damaged-save and inflated-save tests, Sydney factory/lab interaction, exact defense/HP round trips for all 312 regional configurations |
| P2 | Elite `cf-pacific-northwest`, `bf-malacca`, `cf-mexico`, `cf-panama`, either selected faction: incompatible Akatsuki equipment in CF field units/cargo | Custom converters use the shared native era eligibility rules. Pacific Northwest falls back to an eligible native land unit when that class has no native Elite, following the existing shared converter policy. | All scenario/player/difficulty roster assertions, including cargo; both perspectives and seeds 11/29 complete five turns on all four maps |

Changed gameplay files are limited to the AI tactical-orders part, three engine parts and four custom scenario converters. Unit statistics, sprites and unrelated rules are unchanged. Implementation commits group source changes by ownership lane; the follow-up is authorized by the request to fix the reported defects.

## Deterministic reference reconciliation

The original `sim_baseline.txt` was already stale: all 390 lines differed from independently captured starting main, before any gameplay changes. Both old references are preserved byte-for-byte:

- `tools/data/sim_baseline.legacy.txt`: original historical reference.
- `tools/data/sim_baseline.audited-main-09458d5.txt`: starting main (`09458d5900b994d6a2a3f23b59e22f6b955cfcd3`), also matched exactly by the original tooling-only implementation.

The current canonical reference is generated only after the focused regressions pass. Two independent complete captures must match byte-for-byte. `tools/data/sim_baseline.metadata.json` records their hashes, source hashes and exact old/new differences. Exactly 40 of 390 lines change from audited main: 32 setup and eight Normal simulation fingerprints, all in the four corrected custom-roster scenarios. The baseline does not simulate Elite combat or save/load, so the Panama/HQ repairs are protected by independent regressions. No unexplained failing reference or audit evidence is removed.

Every PR runs the Panama/HQ reproductions and all eight affected Elite roster configurations. PR CI also checks selected configurations against this documented current reference. Extensive CI checks all 390 lines. The comparator remains strict and never rewrites references. Archive/digest assertions make accidental replacement of either historical capture fail the fast suite.

## Verification and limits

The final fast suite passes **62/62** checks and the full suite passes **386/386**, with no failures, skips or TODOs. Both complete 390-line captures match exactly; the fresh 35-line PR selection also matches. See `fix-validation/summary.json` for exact totals and deterministic comparison counts, the passing TAP files for individual checks, and the two tournament result sets for complete per-turn evidence. The affected matrix covers five scenarios, both selected perspectives, Elite, seeds 11/29 and five-turn horizons (20 matches). The additional Panama matrix covers EU/Elite at both seeds and twenty turns (two matches).

These short affected-map checks validate the fixes, not long-run balance. The earlier broad and long-game audit remains evidence about the audited revision. Greenland invasion effectiveness, other AI weaknesses, commander-effect coverage and long replay testing remain future work; no speculative rebalancing is included.
