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
