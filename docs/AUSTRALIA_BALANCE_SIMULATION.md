# The War for Australia — validation and 50-turn AI balance

**13 October 2026** · Branch `scenario/australia` · PR [#52](https://github.com/user2421423/CodeGeass/pull/52)

## Map and scenario

The theatre is 132 × 92 hexes (12,144 total). It contains 48 real-coordinate cities (20 Britannian eastern/Tasmanian, 14 Chinese northern, 14 Europian western/southwestern), 32 shipbuilding ports, Australia's mainland and Tasmania as separate landmasses, coastal oceans, inland desert corridors, eastern forests and mountain belts.

The revised starting forces contain **160 formations**, of which **124 are land units and 36 are naval units**, allocated **46 Britannia / 56 Chinese Federation / 58 Europia United**. Britannia has the largest population/production belt, while China's and Europia's extra formations and fixed wartime resource funding offset their smaller city bases. All three powers are hostile, and victory requires all 48 rival cities, without a turn cap or F.L.E.I.J.A. weapons.

`node tools/australia_hex_audit.cjs` independently audits every land/sea bit, coast transition, province assignment, city coordinate, port and naval sea route, and the separate Bass Strait / Tasmania components. `tests/australia.test.cjs` tests each faction on Normal, Hard, Challenge and Elite, save migration, diplomacy, army deployment and city-conquest victory. The complete existing test suite, UI smoke tests, source/build parity and world map asset audits run in `.github/workflows/australia-scenario.yml`.

## Actual-engine simulation methodology

The `tools/australia_sim.cjs` harness uses production code for `E.aiPlan`, `E.aiProduction`, `E.aiOrder`, beginning turns, unit movement, city capture, naval moves and carrier amphibious disembarkation. Both or all three rivals plus the nominated player are AI-controlled; `player` selects turn order and normal-difficulty starting resources, **not** a scripted player-targeting bonus. A run stops at victory or the **50-turn observation cutoff**, which does **not** set a game turn limit. Five deterministic seeds are sampled with the same `player` in baseline and revised starts.

### Before rebalancing

| Seed / first AI | Final cities (Britannia / China / Europia) | Outcome | City captures |
| --- | --- | --- | ---: |
| 11 / Britannia | 48 / 0 / 0 | Britannia victory, turn 45 | 103 |
| 101 / Britannia | 47 / 0 / 1 | Unresolved at 50 | 75 |
| 131 / China | 5 / 24 / 19 | Unresolved at 50 | 100 |
| 79 / Europia | 35 / 5 / 8 | Unresolved at 50 | 119 |
| 43 / China | 38 / 2 / 8 | Unresolved at 50 | 84 |

**Finding:** Britannia led four of five games, Europia never led, and China led one. This was not a five-game win-rate estimate: one completed victory and four unfinished games.

### After increasing Chinese and Europian troops and funding

| Seed / first AI | Final cities (Britannia / China / Europia) | Outcome | City captures | Carrier disembarkations (B / C / E) |
| --- | --- | --- | ---: | --- |
| 11 / Britannia | 47 / 0 / 1 | Unresolved at 50 | 79 | 170 / 65 / 91 |
| 101 / Britannia | 33 / 11 / 4 | Unresolved at 50 | 140 | 136 / 160 / 54 |
| 131 / China | 48 / 0 / 0 | Britannia victory, turn 46 | 83 | 67 / 74 / 73 |
| 79 / Europia | 9 / 6 / 33 | Unresolved at 50 | 105 | 153 / 80 / 147 |
| 43 / China | 31 / 17 / 0 | Unresolved at 50 | 84 | 108 / 114 / 54 |

Rebalanced source: `dist/scenarios-australia.js` at the current PR head. Simulation job logs at the [Australia scenario workflow](https://github.com/user2421423/CodeGeass/actions/workflows/australia-scenario.yml).

### Interpretation and limitations

- The updated Europian army can conquer significant territory (33 cities in the seed-79 run), and the Chinese army holds 17 cities by turn 50 in seed 43; both were considerably weaker in the corresponding baseline seeds.
- Britannia nevertheless remains the dominant territorial power in four of the five **revised** outcomes, winning one decisively. These five cases are insufficient to establish long-run faction victory rates. More seeds or difficulty-specific balance passes are appropriate before calling the scenario statistically symmetric.
- All revised matches had changing city control through the observed campaign, carrier disembarkations on **every** side and no AI execution errors. There were no deadlocked 50-turn games in this sample.
- The `landings` counter records ship-carried `deploy` events only; it does not count every self-propelled amphibious crossing.
- `city captures` counts ownership changes, including repeated recaptures; it is not the number of unique cities taken.
