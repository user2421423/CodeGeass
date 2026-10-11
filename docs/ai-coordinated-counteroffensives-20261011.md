# Coordinated counteroffensive AI experiments — 11 October 2026

**Repository:** `user2421423/CodeGeass`  
**Branch:** `feature/ai-multifront-defense-20261011`  
**Proven control commit:** `87674e4af10f47f70ae6d15cdd9df6574a19518b`  
**Experimental builds:** `3439d2e5b8fb4aa2dfd9fc385f6ac9f7d77ce431` (version 1); `0bbfd7cfd07be530c1484f456d7ee88c4cf826b6` (version 2).

## Scope
Faction-neutral, Conquest-only local target sharing between mobile formations assigned to the same active front. Garrison, recovery, assembly, production, faction bonuses, deployment, resources and city map remained unchanged. Focus persists for up to three turns unless target dies. Neither experiment modifies main.

**V1:** Favored a shared enemy with up to 110 attack-score points and rewarded movement toward it.  
**V2:** Removed the shared-target movement bonus. Reduced attack bonus to 65, and applied it only when the unit could contribute to a likely finishing attack.

## Results
Each variant ran twelve identical all-AI 50-turn simulations: three starting player/turn orders × four seeds (42, 777, 13579, 20261007).

| Metric | Proven AI | Coordination V1 | Coordination V2 |
|---|---:|---:|---:|
| China cities, turn 20 | 48.75 | 45.50 | 49.08 |
| China cities, turn 50 | **29.42** | 18.08 | 26.00 |
| China combat strength, turn 50 | **41.89** | 22.14 | 36.17 |
| China severe collapse ≤10 cities | 3/12 | 4/12 | **2/12** |
| E.U. cities, turn 50 | 63.50 | 72.75 | 69.92 |
| Britannia cities, turn 50 | 60.50 | 62.83 | 57.00 |

All 122 regression tests and five source-bundle checks passed for the coordinator variants; six standard 50-turn Conquest jobs passed for V1. The complete 24-job A/B comparison completed successfully for both variants.

## Conclusion

Neither implementation improves Chinese average survival or territorial control. Coordinated attacks improve certain individual cases but the enemy powers also benefit; removing the disruptive movement bonus substantially reduces the harm but does not reverse it. Coordination is **not accepted** for gameplay. Source and distribution bundles are restored to the proven control. This is evidence of an asymmetric strategic environment, not proof that coordination in all forms is harmful.

## Recommended next steps
1. Instrument losses by local contact and identify whether the E.U. and Britannia actually have opportunities to attack one another.
2. Run carefully separated geography/diplomacy counterfactuals that increase EU–Britannia fighting **without** China-specific buffs; measure whether Chinese survival improves.
3. Only then revisit operational AI: develop combat plans with realistic multi-unit attack scheduling rather than additive target-score bonuses.
4. Validate against held-out seeds, faction turn order, full tests and all three factions' outcomes.

This document records rejected experiments. It does **not** authorize merging or changing `main`.
