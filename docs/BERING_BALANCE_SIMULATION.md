# Bering Strait Crisis — 50-turn AI balance simulation

**Date:** 13 October 2026  
**Branch:** `feature/bering-strait-crisis`  
**Reproducible CI run:** https://github.com/user2421423/CodeGeass/actions/runs/38351826184  
**Simulation source:** [`tools/bering_long_balance.cjs`](../tools/bering_long_balance.cjs)  
**Gameplay modified?** No. This report and the simulation harness do not change AI decisions or the scenario's starting forces.

## Methodology

Eight independent **actual-engine AI-versus-AI** campaigns, up to 50 turns each, all on **Normal** difficulty. Both Britannia and Europia United are automated using the normal production, tactical orders, carrier-loading/disembarkation and turn logic. Four RNG seeds (11, 43, 79, 131) are tested twice, alternating the faction selected as the game's first player. Each side starts with 14 of the scenario's 28 cities.

A simulation ends when one faction owns all 28 cities or when it reaches the 50-turn cutoff. No simulated event is scripted. F.L.E.I.J.A. remains disabled, and there is no Chinese involvement.

## Results

| RNG seed | First faction | Outcome | Turn | Final cities (Britannia : E.U.) | Carrier disembarkations (Britannia : E.U.) |
|---|---|---|---:|---|---|
| 11 | Britannia | E.U. victory | 41 | 0 : 28 | 48 : 89 |
| 11 | E.U. | E.U. victory | 45 | 0 : 28 | 64 : 69 |
| 43 | Britannia | Britannia victory | 47 | 28 : 0 | 85 : 37 |
| 43 | E.U. | Britannia victory | 34 | 28 : 0 | 93 : 24 |
| 79 | Britannia | Britannia victory | 50 | 28 : 0 | 104 : 50 |
| 79 | E.U. | Britannia victory | 39 | 28 : 0 | 120 : 23 |
| 131 | Britannia | Unresolved; E.U. leading | 50 | 4 : 24 | 63 : 64 |
| 131 | E.U. | Britannia victory | 42 | 28 : 0 | 87 : 34 |

**Aggregate:** 5 Britannian wins, 2 E.U. wins, 1 unresolved at 50 turns; all eight campaigns ran without AI execution errors. Seven victories occurred between turns 34 and 50 (mean **42.6 turns**, rounded). In the unresolved game the E.U. held 24 of 28 cities, but contested territory continued changing hands through turn 49.

Across these games, Britannia recorded **664 carrier disembarkations** compared with **390** for the E.U. (~1.70×). **Important:** This counter measures carrier `deploy` events, not every independently moving amphibious unit crossing a shoreline; do not interpret it as all amphibious landings. Britannian ships recorded **3,414 naval movement events** versus **2,516** for the E.U. Since campaigns finish at different turns, these are total events, not equal-duration rates.

## Findings

**1. The scenario is operational.** Fleet routing, troop transport, coastal attacks, city capture, naval production and eventual total-conquest victories all happen in the live engine. No game timed out because either force could not cross the strait or reach the Aleutian/Kamchatka theatre. Seven of eight campaigns finished within the 50-turn simulation limit.

**2. The naval war has decisive momentum.** Most winning campaigns maintain more carriers or substantially higher transport and disembarkation activity than the loser. Ships and amphibious transports are therefore genuinely central, as intended. Britannia wins the sampled games more often, but eight runs are not enough to establish a statistically reliable long-run win probability or attribute the difference to one specific balance parameter.

**3. Seed and early engagements matter.** The E.U. wins both seed-11 games; Britannia wins both seed-43 and both seed-79 games. Seed 131 reverses which faction dominates depending on selected first player. This suggests substantial sensitivity to early military positioning and combat/production sequencing rather than a universal fixed advantage.

**4. Ports can change hands repeatedly.** Nome, Kotzebue, Adak, Uelen, Provideniya and the Kamchatka coastline are commonly contested. The scenario currently uses the two-faction European-style offensive doctrine; unlike the specific Normal Division-of-Japan case, it does not reserve permanent starting garrisons via `assignDivisionBritanniaGuards`. Mobile defensive responses still exist. That may contribute to frequent city recaptures, but the simulator alone does not prove causation.

## Recommendations for a follow-up test

- **Test the carrier disparity:** vary carrier staging/AI priorities, or run a symmetric naval allocation experiment, before changing production costs or starting unit numbers. Carrier disembarkations are correlated with the sampled winners but the causal factor is unverified.
- **Try light port garrisons:** preserve a few defensive formations near key embarkation ports, while allowing the bulk of both armies to launch overseas operations. Compare capture churn and final territory with the original AI.
- **Increase sample size:** additional seeds and 50-turn runs would give more confidence in a faction win-rate estimate; eight simulations are an exploratory rather than definitive balance study.

**No gameplay rebalance has been implemented.** The tested scenario remains on its separate Bering branch and `main` is unchanged by this simulation work.

## Reproduce

```bash
node tools/bering_long_balance.cjs 11 50 britannia normal
node tools/bering_long_balance.cjs 11 50 eu normal
node tools/bering_long_balance.cjs 43 50 britannia normal
node tools/bering_long_balance.cjs 43 50 eu normal
node tools/bering_long_balance.cjs 79 50 britannia normal
node tools/bering_long_balance.cjs 79 50 eu normal
node tools/bering_long_balance.cjs 131 50 britannia normal
node tools/bering_long_balance.cjs 131 50 eu normal
```
