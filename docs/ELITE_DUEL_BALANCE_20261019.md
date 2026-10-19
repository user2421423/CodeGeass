# Elite level-5 solo-duel calibration — 19 October 2026

## Accepted target
Every persistent Elite Force at **Level 5**, acting alone against a fresh ordinary **three-stack Super-Heavy**, should win effectively every duel and end with >=50% of its initial HP. Measure using the actual `E.attack` and `E.preview` calculations, not the displayed attack number.

## Test conditions
`tools/testing/elite_duels.test.cjs`: 7x7 neutral plains, no stations, no research, no assigned commander, neutral morale and XP, either combatant attacking first. Enemy is a 3-stack ordinary Britannian Brighton (1,416 HP). Amphibious elites are tested on land; artillery starts at range 2, close combat at range 1. Counterfire, damage variance, intrinsic critical hit rate and all Lv.5 abilities are processed by the real combat engine. No automatic turn healing or tactical repositioning. Test uses 256 deterministic seeds per first-strike order; 28 elites x 2 orders x 256 seeds = 14,336 duels. Assert each duel is won and HP retained >=50%.

## Conservative base-attack proposal

| Elite class | Current Lv.1 attack | Proposed Lv.1 attack | Current Lv.5 attack | Proposed Lv.5 attack | Base HP |
| --- | ---: | ---: | ---: | ---: | --- |
| Raider | 165 | 155 | 330 | 310 | unchanged (600) |
| Medium Armor | 145 | 160 | 290 | 320 | unchanged (650) |
| Heavy Armor | 135 | 165 | 270 | 330 | unchanged (700) |
| Super-Heavy Armor | 145 | 175 | 290 | 350 | unchanged (750) |
| Rocket Artillery | 140 | 140 | 280 | 280 | unchanged (550) |
| Siege Artillery | 135 | 135 | 270 | 270 | unchanged (600) |
| Amphibious Elite | 145 | 145 | 290 | 290 | unchanged (600) |

The shared Level 5 attack/HP multiplier is **still 2.00**, as before. Every class's critical chance, penetration, armor, range, movement, cost, research behavior and factory tier remain unchanged.

## Targeted Level-5 damage-taken modifiers
A multiplier of 0.80 means 20% less incoming damage. These values were selected through a real-engine 72-seed-per-first-strike calibration pass; the committed 256-seed CI test is the acceptance check.

| Elite | Previous incoming-damage multiplier | Candidate multiplier |
| --- | ---: | ---: |
| Cornelia's Gloucester | 1.00 | 0.50 |
| Tohdoh's Gekka | 1.00 | 0.65 |
| Mordred | 1.00 | 0.90 |
| Gawain | 1.00 | 0.65 |
| Lancelot Albion | 1.00 | 0.90 |
| Leila's Alexander | 0.85 | 0.60 |
| Yukiya's Valiant | 1.00 | 0.80 |
| Xu Lifeng's Chuyen | 1.00 | 0.75 |
| Akatsuki Zikisan | 1.00 | 0.65 |
| Vincent Ward | 1.00 | 0.85 |
| Sutherland Air Rocket | 1.00 | 0.75 |
| Panzer-Hummel Siege Battery | 1.00 | 0.95 |
| Akatsuki Missile | 1.00 | 0.75 |
| Akatsuki Heavy Weapons | 1.00 | 0.95 |
| Portman II | 1.00 | 0.55 |
| Panzer-Frosch II | 1.00 | 0.55 |
| Shui Gun-Ru II | 1.00 | 0.55 |
| Gekka Amphibious II | 1.00 | 0.55 |

All other elites keep their existing Lv.5 unique abilities and damage-taken modifiers. These changes are deliberately concentrated at Lv.5 to avoid massively buffing elites at Levels 1–4.

## Audit notes and risks
- The unmodified main-branch data already passed the solo-duel **win** test for 27/28 elites across 128 seeds per initiative; only Cornelia had occasional losses. However, just **7/28** elites maintained >=50% HP in every sampled fight.
- A strict 50% HP floor, especially when either side can attack first and the elite must be isolated on open terrain, requires sizable level-5 mitigation for a few weak units. These are transparent skill changes, not hidden bonuses to level scaling.
- Amphibious Elite Force survivability is substantially improved at sea as well as on land due to generic damage-taken multipliers; **review naval-balance impact** before merging.
- City assault, terrain cover, XP, commander stats, research, morale swings, healing and other battlefield scenarios are not covered by this isolated benchmark.
- The pre-existing deterministic scenario fingerprints were not matching `tools/data/sim_baseline.txt` even on the original branch with *test-only* modifications. They should be audited separately; do not blindly update baselines as part of this balance branch.
- This is a draft PR, **not approved to merge**.
