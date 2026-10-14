# Isolated forward-city Eliminator defense experiment

Base: `experiment/eliminator-launch-diagnostics`. This branch is **independent of five-city Tier 1 F.L.E.I.J.A. targeting**. Engine targeting files, scoring and the five-city counter are unchanged from this base.

Only `src/ai/06-production.part.js` and synchronized `dist/engine/ai.js` alter game behavior. A threatened forward friendly city with at least two nearby friendly troops and visible enemy forces within 12 hexes becomes a more attractive Eliminator production/defensive location, taking existing defensive coverage, danger and city value into account. An already-armed capital remains the primary stationary anchor where possible. A second fixed city anchor is permitted **only with at least three total charges** and a strong forward defense score (>=250), to preserve mobile escort capacity.

This is a conservative revision of the combined experiment: the initial combined-version screen raised interceptions 66/127 -> 69/131, but average friendly-army protection slipped 10.69% -> 9.43%. That screen **included unrelated Tier 1 attack changes**; it is not a clean measure of this standalone defensive AI.

### Clean independent test
`.github/workflows/eliminator-forward-city-independent.yml` validates sources/tests/UI and runs 30 identical-seed matched wars: 15 in 2017 and 15 in 2018. Its pinned control uses the same base game engine and original diagnostic AI bundle, replacing **only the AI bundle** after the candidate simulation, eliminating any attacking-rules confounder.

Track real missile interceptions (stationary and mobile), lost carriers, charge pickup, army value and forward coverage separately. Do not merge solely because conceptual coverage rises. Do not infer player-visible improvements without passed CI.

**Draft only; do not merge into `main` without approval.**
