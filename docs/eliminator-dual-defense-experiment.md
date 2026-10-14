# Dual-purpose Eliminator defense experiment

**Status:** experimental. Do not merge into `main`.

**Branch:** `experiment/eliminator-dual-defense`, based on `experiment/eliminator-threat-cover` at `4373be17e8f8838d2923874726f016ab89f84758`.

## Hypothesis

The strike-center baseline improves potential interception positions but rarely intercepts F.L.E.I.J.A. aimed at field armies. Spare charged **ordinary** escorts should preferentially protect an uncovered, visibly threatened friendly city **and** adjacent army together, without weakening fixed city anchors or diverting frontline commanders.

## Implementation

- Only ordinary, healthy, ready Eliminator carriers in Conquest can accept proactive patrols.
- Reject patrols when an enemy is within six hexes of the carrier, when recovery/emergency assignments exist, or when a previous forward-muster assignment is outstanding.
- Select only own uncovered cities on the same landmass, 4–14 hexes away, with at least two visible friendly combat units within four hexes and visible enemy units within twelve hexes.
- Require a large increase in estimated strike-center protection before leaving a previous position. Preserve previous target during travel, provided the city remains threatened.
- Move through safe reachable land tiles; do not enter squares within four hexes of enemies. Give combat/recovery priority once close to a threat.
- After arriving, lightly reward staying inside the actual three-hex interception radius in ordinary tactical scoring.
- No weapon cost, damage, range, faction, map, secrecy, or F.L.E.I.J.A. cap changes.

## Experiment

Workflow: `.github/workflows/eliminator-dual-defense.yml`

Run eight matched wars, four in 2017 (45 turns) and four in 2018 (35 turns), each with exactly the same game seed and engine; change only `dist/engine/ai.js` between baseline and experiment. Compare:
1. **Actual mobile interceptions** — primary metric.
2. Total intercepted / launched warheads and city interceptions.
3. Frontline and all-army value protection, weighted city protection.
4. Carrier losses and charges collected.
5. Runtime and automated test status.

**Decision gate:** No merge if mobile interceptions or frontline protection deteriorate materially, even if city interception or static coverage improves. If the 8-pair screening offers meaningful battlefield benefits, run a separate full 30-pair confirmation. Do not interpret improved theoretical coverage alone as success.

## Results — completed 8-pair screen

[CI run 38530448263](https://github.com/user2421423/CodeGeass/actions/runs/38530448263): validate and all eight matched-war jobs passed. Source/build check, complete Node regression suite, and UI smoke were successful.

| Metric | Strike-center baseline | Dual defense |
|---|---:|---:|
| Warheads launched | 64 | 64 |
| Total warheads intercepted | **34/64 (53.13%)** | **34/64 (53.13%)** |
| Mobile interceptions | **1** | **1** |
| Stationary city interceptions | 33 | 33 |
| Carrier charge losses | 2 | 2 |
| Charges picked up | 15 | 15 |
| Mean frontline value protected | 9.15% | 9.51% |
| Mean all-army value protected | 10.71% | 10.86% |
| Mean weighted city value protected | 23.14% | 22.98% |
| Mean simulation runtime | 65.14 s | 65.93 s |

Across four matched 2017 wars and four matched 2018 wars, seven pairs had unchanged frontline protection; the only material frontline improvement occurred in 2018 seed 401 (1.90% → 3.90%) and 2017 seed 13579 also improved (16.28% → 17.19%), so six of eight were unchanged. No seed yielded additional real missile interceptions.

**Interpretation:** Patrol paths appear to alter positional coverage in only a few wars; real field-warhead interception remains too rare for this tactic to demonstrate value. The main bottleneck is more likely the low rate of field-targeted launches, or too few deployable spare carriers near strike opportunities. The result does not prove which explanation dominates.

**Decision: NO MERGE.** Retain the draft branch for diagnostic comparison. Do not run a full 30-pair confirmation of an eight-pair candidate with zero increase in interceptions. Next priority is to instrument strike-target categories (city, adjacent army, open-field army), readiness and defender distance at launch, then test relocation rules against the observed target distribution.
