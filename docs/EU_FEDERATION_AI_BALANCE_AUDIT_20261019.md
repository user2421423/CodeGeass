# E.U. vs Chinese Federation — integrated AI balance review (19 October 2026)

**Branch:** `feature/eu-vs-federation-campaign-architecture` — not merged into `main`. **Status:** completed full-engine, three-seed Normal AI sweep; recommended rebalance has **not** been applied.

## Method and source evidence

- Executed the actual build plus `tools/scenario_sim.cjs` from GitHub Actions in **ten independent scenario jobs**. For each scenario, seeds **11, 37 and 91**, with `eu` and `cf` as the selected player in separate fully AI-driven games. Each game ran until a true winner or a **45-turn cutoff**.
- **60 valid simulations; 0 AI exceptions.** **21 E.U. victories, 25 Federation victories and 14 ongoing** (across different scenarios; totals alone do not describe balance). All tests used **Normal** difficulty only. A cutoff without a victor is **not** a tie or stalemate by itself.
- Kazakhstan's original job crashed because its `supplyCorridors` metadata lacked the `prairie` list expected by the shared operational AI; fixed `dist/scenarios-eu-cf-kazakhstan.js` on this feature branch, then reran **all six** Kazakhstan tests successfully. Those invalid attempts are excluded from the 60-run matrix.
- [Original matrix and full job logs](https://github.com/user2421423/CodeGeass/actions/runs/39218624440) · [Kazakhstan corrected rerun](https://github.com/user2421423/CodeGeass/actions/runs/39219059864) · machine-readable records: [EU_FEDERATION_BALANCE_MATRIX_20261019.json](EU_FEDERATION_BALANCE_MATRIX_20261019.json).

## Findings and first-pass force changes

| Scenario | E.U. wins | CF wins | Ongoing at 45 | Diagnosis | Recommended next test (starting forces only) |
|---|---:|---:|---:|---|---|
| Invasion of Kazakhstan | 6 | 0 | 0 | Severely EU-favored | +30–40 CF starting formations around Aktobe, Astana, Karaganda and eastern approaches; or trim 15–20 EU |
| Invasion of Persia | 6 | 0 | 0 | Severely EU-favored | +25–35 CF starting formations around Zagros, Tehran, Isfahan; keep both sides' Gulf activity |
| Battle for Xinjiang | 0 | 6 | 0 | Severely CF-favored | +25–35 EU starting formations across Dzungarian Gate, Ili Valley and Altai; alternatively remove 15–20 CF |
| Invasion of India | 2 | 1 | 3 | Most promising / mild EU edge | Hold opening formations; extend inconclusive 45-turn runs to 75+ before retuning |
| Invasion of Mongolia | 5 | 0 | 1 | Severely EU-favored | +25–35 CF starting formations, reinforcing Ulaanbaatar, Darkhan, northern roads and eastern reserves |
| Invasion of Manchuria | 1 | 2 | 3 | Mixed / promising | Hold opening formations; extend three EU 47/49-city turn-45 runs to determine whether a mild EU advantage emerges |
| Crossing the Himalayas | 0 | 0 | 6 | Strongly CF-favored | +20–30 EU starting formations on playable Himalayan routes and supporting artillery; or remove 10–15 CF |
| Invasion of Sichuan | 0 | 5 | 1 | CF-favored | +12–20 EU formations at mountain exits around Batang/Dege/Kangding; keep defensive Chengdu core |
| Battle of Beijing | 0 | 6 | 0 | Severely CF-favored | +25–35 EU formations near Shanhaiguan, Jinzhou and Chengde, including siege/artillery; or remove 10–15 CF |
| Battle of Luoyang | 1 | 5 | 0 | Strongly CF-favored | +25–35 EU ground formations across northern and southwestern bridgeheads, emphasizing city-assault support; preserve capital forts |

## Interpreting the results

**E.U. too strong:** Kazakhstan won 6/6 for the E.U. (turns 25–32), Persia won 6/6 (29–33), and Mongolia won 5/6 (20–25; seed 37 as E.U. was still active at turn 45 with 23 of 51 cities). These three need more Federation defenders, especially around exposed industrial hubs, rather than economic cheats.

**E.U. too weak:** Xinjiang lost 6/6 (Federation wins at turns 21–42); Beijing lost 6/6 (34–42); Luoyang lost 5/6 (22–28, one E.U. win at turn 32); Sichuan lost 5/6 (Federation wins 34–45; the other was 40/62 E.U.-held at turn 45). In the Himalayas, all six games were still active at turn 45, but the E.U. held only 6–14 of 57 cities, down from 31 at the start. Prioritize frontline assault numbers, cities' initial garrisons, and city-break siege capability before weakening map features.

**Better initial balance:** India returned 2 E.U. wins, 1 Federation win, and 3 ongoing games with the E.U. holding 100, 98 and 61 of 113 cities; longer testing may show E.U. lean. Manchuria returned 1 E.U. win, 2 Federation wins and 3 ongoing games, each with E.U. holding 47/49 cities. Don't change their opening forces until the unfinished seeds run to 75–90 turns.

**Target:** After first-pass force adjustments, rerun the *same* three seeds from both perspectives for each adjusted scenario, plus 2–3 unseen seeds. Favor an E.U. Normal win opportunity without a universal one-sided AI steamroll; manual play can differ from AI-vs-AI outcomes. Favor changes to the starting formation numbers over new global combat modifiers, free income or artificial victory turns.

## Known limitations / further checks

- **No human playtesting** or proof of human Normal win rates. AI wins show one algorithmic path, not how skilled players perform.
- Some maps can remain actively contested past turn 45; follow up especially **Himalayas, India and Manchuria** using 75–90 turns and several seeds.
- `scenario_sim.cjs`'s production counter may count initially *embarked* troops as newly encountered units; interpret production totals as activity indicators, not exact industrial builds, especially for India.
- These runs do **not** validate Hard, Challenge, Elite, mobile performance, screenshots, saves or other global regression checks; keep the feature branch separate from `main` until those later checks are authorized.

## Reproducible commands

```bash
node tools/build_sources.cjs
node tools/eu_federation_balance_matrix.cjs eu-cf-kazakhstan 45 11,37,91
node tools/eu_federation_balance_matrix.cjs eu-cf-himalayas 45 11,37,91
# Replace the scenario suffix with any of the other eight scenarios.
```
