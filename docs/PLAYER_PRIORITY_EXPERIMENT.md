# Player-directed AI priority experiment — 11 October 2026

## Scope

Branch: `feature/player-target-priority-all-modes-20261011` (based on `main` at `56351a818b0addc2bf46704331080602c9b9ae24`).

The configurable `g.aiPlayerPriorityBonus` applies **only to Conquest and Scenario**, at each mode's existing decision points. **Campaign/Story Mode is unchanged**, irrespective of the configured bonus:

- **Conquest:** Increase *offensive* front priority proportional to the share of that front's objective value owned by the player, then bias active attack pathfields toward player-owned objectives. Never bias defensive emergency priorities.
- **Scenario:** Reduce effective travel cost to hostile player-owned cities by dividing by `1 + bonus`, retaining target caps, column persistence, terrain-aware routing and the opening Britannia–Black Knights alliance.
- **Conquest and Scenario only:** Multiply a legal, available tactical target's existing expected-value score by `1 + bonus` if its defender or city belongs to the hostile player. This does not modify actual attack damage or legality.

Default is 60%, after testing. Set `g.aiPlayerPriorityBonus=0` to reproduce baseline behavior or 0.2 / 0.4 / 0.6 / 1 for 20 / 40 / 60 / 100%. The range is clamped to 0–1. Allied factions receive no bonus.

No changes to unit stats, resources, diplomacy, map geography, starting rosters, **or any Story Mode AI decision**.

## Method

Deterministic all-AI games. The faction designated as `g.player` is AI-controlled as well, so the experiment measures **differential AI targeting under paired seeds**, not win rates against human decision-making. The same initial seed, player faction, economy, and units are used for each bonus. Production, movement, combat and city capture resolve through real engine methods. Each turn uses the game's normal AI order priority. These are short-horizon smoke/balance simulations, **not** an exhaustive multi-seed, 50-turn balance analysis.

Attack counts: attacks from an AI rival hitting at least one player-owned unit or a player-owned city. Damage combines direct damage to player-owned units and player-city shield damage (not counter-fire or indirect strategic losses). The player can gain as well as lose cities.

### Conquest — Britannia designated player, seed 19, four rounds

| Bonus | Rival attacks on player | Player damage | Player cities remaining |
|---:|---:|---:|---:|
| 0% | 12 | 1,003 | 51 |
| 20% | 18 | 1,424 | 51 |
| 40% | 13 | 1,128 | 50 |
| 60% | 24 | 1,674 | 51 |
| 100% | 25 | 1,801 | 50 |

No AI order errors. The 60% setting delivered almost the same player-directed pressure as 100% in this seed, without imposing maximum strategic fixation.

### Japan Scenario — Britannia designated player, seed 19, six rounds

| Bonus | Rival attacks on player | Player damage | Player cities lost | Player units at end |
|---:|---:|---:|---:|---:|
| 0% | 62 | 4,498 | 3 | 18 |
| 20% | 64 | 4,877 | 3 | 12 |
| 40% | 53 | 4,663 | 3 | 14 |
| 60% | 59 | 4,857 | 1 | 14 |
| 100% | 71 | 5,847 | 3 | 14 |

No AI order errors. Note the non-monotonic city captures despite increasing player damage.

### Japan Scenario — Chinese Federation designated player, seed 91, six rounds

| Bonus | Rival attacks on player | Player damage | Player cities at end (8 at start) | Player units at end |
|---:|---:|---:|---:|---:|
| 0% | 49 | 3,005 | 12 | 25 |
| 20% | 43 | 2,809 | 12 | 29 |
| 40% | 47 | 2,885 | 10 | 25 |
| 60% | 45 | 3,017 | 11 | 26 |
| 100% | 61 | 4,225 | 11 | 25 |

No AI order errors. At 100%, rivals hit China hardest, but this did not prevent all Chinese expansion.

## Interpretation

- **Strongest player focus:** 100% consistently produced the highest attack count in all three simulation batches above, but has a risk of overconcentrating on the player to the detriment of a strategically superior rival target.
- **Provisional experiment default: 60%.** In the four-round Conquest run it achieved almost all the 100% setting's targeting pressure. It offers a lower risk of forced dogpiling.
- **Not yet proven for long-term balance:** Short tests cannot establish win-rate effects, capture efficiency, or long-term difficulty. Before merging, test longer seeds and all playable player factions, including cases where multiple AI rivals share a front and where the player is weaker than an AI power.
- Avoid interpreting added attacks as equivalent to added territory captured.

## Reproduction

```sh
node --test tests/player-target-priority.test.cjs
node tools/simulate-player-priority.cjs --modes=conquest,scenario --bonuses=0,20,40,60,100 --seeds=19,91 --rounds=8
```

The simulator prints one `SIM_RESULT` per run and a grouped `SIM_SUMMARY` at the end. For China player variants, use `--player=cf`. Set larger `--rounds` for extended balance evaluation. The regression test explicitly verifies that Campaign/Story Mode's AI target fields remain unchanged at every bonus level.
