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

## Results

Not yet established. No benchmark numbers should be inferred from compilation or passing unit tests.
