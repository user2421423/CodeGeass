# The War for Australia — validation and 50-turn AI balance

**13 October 2026** · Branch `scenario/australia` · PR [#52](https://github.com/user2421423/CodeGeass/pull/52)

## Map and scenario

The theatre is 132 × 92 hexes (12,144 total). It contains 48 real-coordinate cities (20 Britannian eastern/Tasmanian, 14 Chinese northern, 14 Europian western/southwestern), 32 shipbuilding ports, Australia's mainland and Tasmania as separate landmasses, coastal oceans, inland desert corridors, eastern forests and mountain belts. The final shoreline is a 1-bit-per-hex bitmap sampled from GSHHS intermediate-resolution GIS coastline polygons, with Papua New Guinea and Indonesian islands excluded. At the 132×92 sampling resolution it has **4,968 land** and **7,176 sea** hexes; adjacent waters are connected and Tasmania remains geographically separate.

The revised starting forces contain **160 formations**, of which **124 are land units and 36 are naval units**, allocated **46 Britannia / 56 Chinese Federation / 58 Europia United**. Britannia has the largest population/production belt, while China's and Europia's extra formations and fixed wartime resource funding offset their smaller city bases. All three powers are hostile, and victory requires all 48 rival cities, without a turn cap or F.L.E.I.J.A. weapons.

`node tools/australia_hex_audit.cjs` exhaustively verifies every hex against its packed GIS shoreline bit and checks coast transitions, province assignment, city coordinates, ports, naval sea routing, and separate Bass Strait / Tasmania components. The bitmap is generated from external GSHHS polygons; the in-repository exhaustive check verifies its application to gameplay, not an independent second GIS survey. `tests/australia.test.cjs` tests each faction on Normal, Hard, Challenge and Elite, save migration, diplomacy, army deployment and city-conquest victory. The complete existing test suite, UI smoke tests, source/build parity and world map asset audits run in `.github/workflows/australia-scenario.yml`.

## Actual-engine simulation methodology

The `tools/scenario_sim.cjs war-for-australia` harness uses production code for `E.aiPlan`, `E.aiProduction`, `E.aiOrder`, beginning turns, unit movement, city capture, naval moves and carrier amphibious disembarkation. Both or all three rivals plus the nominated player are AI-controlled; `player` selects turn order and normal-difficulty starting resources, **not** a scripted player-targeting bonus. A run stops at victory or the **50-turn observation cutoff**, which does **not** set a game turn limit. Five deterministic seeds are sampled with the same `player` in baseline and revised starts.

### Before rebalancing (original approximate shoreline)

| Seed / first AI | Final cities (Britannia / China / Europia) | Outcome | City captures |
| --- | --- | --- | ---: |
| 11 / Britannia | 48 / 0 / 0 | Britannia victory, turn 45 | 103 |
| 101 / Britannia | 47 / 0 / 1 | Unresolved at 50 | 75 |
| 131 / China | 5 / 24 / 19 | Unresolved at 50 | 100 |
| 79 / Europia | 35 / 5 / 8 | Unresolved at 50 | 119 |
| 43 / China | 38 / 2 / 8 | Unresolved at 50 | 84 |

**Finding:** Britannia led four of five games, Europia never led, and China led one. This was not a five-game win-rate estimate: one completed victory and four unfinished games.

### After increasing Chinese and Europian troops and funding (original approximate shoreline)

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

## Final GSHHS shoreline: repeated five-seed 50-turn simulations

The final, geographically sourced map was re-simulated **after replacing the hand-drawn coastline**, with exactly the same rebalanced 160 starting formations and scenario-specific funding. Outcomes differ from those above because coast/strait movement, land masses and port approaches are different. The complete run is [GitHub Actions #38357278141](https://github.com/user2421423/CodeGeass/actions/runs/38357278141), with all six regression/balance jobs passing. Source/build parity and other regression workflows are also green at the tested commit.

| Seed / first AI | Final cities (Britannia / China / Europia) | Captures | Last capture turn | Carrier disembarkations (B / C / E) | End state |
| --- | --- | ---: | ---: | --- | --- |
| 11 / Britannia | 18 / 3 / 27 | 113 | 49 | 120 / 94 / 103 | Unresolved at 50; E.U. ahead |
| 43 / China | 24 / 5 / 19 | 99 | 50 | 179 / 71 / 95 | Unresolved at 50; Britannia ahead |
| 79 / Europia | 25 / 9 / 14 | 118 | 49 | 105 / 88 / 91 | Unresolved at 50; Britannia ahead |
| 101 / Britannia | 27 / 4 / 17 | 133 | 50 | 180 / 90 / 138 | Unresolved at 50; Britannia ahead |
| 131 / China | 33 / 15 / 0 | 92 | 49 | 178 / 114 / 51 | Unresolved at 50; Britannia ahead |

**Aggregate:** 555 city ownership changes; **762 Britannian / 457 Chinese / 478 Europian carrier deployments**; all three powers employed naval invasion mechanics. All five campaigns recorded a capture as late as turns 49–50, **zero AI errors, zero 12-turn capture stalemates and zero completed total-conquest victories by the observation cutoff**. Thus a reliable faction *win-rate estimate cannot be calculated from these five unfinished campaigns*. A territorial lead at turn 50 is not a victory.

Britannia led four final snapshots and Europia one; China retained 15 cities in seed 131 but did not lead any final snapshot. The Chinese Federation remains the faction most likely to need further balance attention, while Europia's successful seed-11 campaign and continuing captures show the west is operationally viable. Five seeds are insufficient to quantify ultimate faction victory probabilities or guarantee symmetric play. All factions are playable, actively manoeuvre, take cities and mount amphibious operations. No special player-targeting modifiers have been added.

### Final regression coverage

- `node --test tests/*.test.cjs`: complete scenario and historical regression suite; passing at the final gameplay commit.
- `node tools/australia_hex_audit.cjs`: every hex, valid coast transitions, cities, port/sea access, ground deployment and navigable ocean; passing.
- `node tests/ui-smoke.cjs`, `node tools/validate_assets.cjs --tracked`, `python3 tools/check_map.py`: passing.
- `node tools/build_sources.cjs --check`: passing; `src/ai/02-fronts.part.js` matches generated `dist/engine/ai.js`.
- `tests/australia.test.cjs`: covers all three player factions on Normal, Hard, Challenge and Elite including save/reload and continued turns.
