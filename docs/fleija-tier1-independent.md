# Isolated F.L.E.I.J.A. Tier 1 milestone

Base: `experiment/eliminator-launch-diagnostics`. This branch is **independent of forward-city Eliminator defense**, and does not modify `src/ai/06-production.part.js` or `dist/engine/ai.js`.

An attacking faction records one successful city hit only when its **unintercepted** F.L.E.I.J.A. strike destroys a **hostile city at ground zero**. Damage to neighboring cities, intercepted launches, and shots aimed at a field formation do not increment the attacker's count. Counts are per side and persist through the existing compact-save format.

Starting with the next F.L.E.I.J.A. target decision after five city destructions, a Tier 1 enemy commander at ground zero receives a major score bonus (+4500), a commander in the inner ring +1100 and in the outer ring +300. Existing target scoring still applies, so city targets remain meaningful; legality and friendly fire rules are unchanged. No enemy Eliminator status is accessed.

Tests:
- Real city detonation increments the correct side from 4 to 5, persisted on save.
- Intercepted city shot and splash-only city damage do not count.
- AI chooses a legal Tier 1 commander as a direct target after, but not before, the threshold.
- Integrated scenario: actual fifth detonation followed by `E.aiProduction` firing at the named Tier 1 commander.
- Full Node suite, UI smoke and source/build sync.
- Four extended AI-observer wars to check how frequently the five-success threshold naturally occurs; absence of a milestone in short wars is expected and **not** proof the trigger is broken.

No change to Eliminator AI defense placement or production. **Draft only; do not merge into `main` without approval.**

## Extended simulated-war results (completed)

[Four extended AI wars](https://github.com/user2421423/CodeGeass/actions/runs/38539998542) all passed, as did the full Node suite, source/build synchronization, UI smoke, and the integrated fifth-city hit → commander-target strike test.

| Era / seed | Simulated turns | Missiles fired | City's destruction count by most successful attacker | Attacks by any qualifying attacker after their fifth success | Tier 1 direct hits after threshold |
|---|---:|---:|---:|---:|---:|
| 2017 / 401 | 91 | 21 | Britannia: 7 | 3 | 0 |
| 2017 / 777 | 97 | 22 | Britannia: 6 | 2 | 0 |
| 2018 / 401 | 54 | 12 | CF: 2 | 0 | 0 |
| 2018 / 777 | 90 | 23 | Britannia: 5 | 2 | **2** |

The 2018/777 case proves the rule works without an artificially injected fifth-hit state: Britannia earned all five city destructions in real AI gameplay and then directly aimed the next two warheads at Tier 1 commanders. The two 2017 cases had five or more successful enemy-city destructions but the subsequent targets were not Tier 1. **This is not enough to conclude the preference failed** because legal high-value Tier 1 opportunities were not recorded in the current observer. The AI remains free to choose safe non-commander targets. Do not claim a 100% Tier 1 strike rate.

Decision: this branch has an independently validated implemented rule. Keep it unmerged pending explicit user approval; it no longer depends on the forward-defense experiment.
