# Invasion of Siberia — `cf-eu-siberia`

**Parent:** `feature/federation-vs-eu-campaign-architecture`  
**Ownership:** `scenario/cf-eu-siberia` only; no shared engine, catalog or campaign changes.  
**World Campaign:** tier 2, mission 4; objective `federation-eu-siberia`.

## Map and design
Reuses the 160 × 88 GSHHG-derived shoreline mask from `dist/siberia-landmask.js` (55°–180°E, 47°–79°N) and the existing Siberian taiga, Altai/Sayan and Far Eastern relief. Rivers are regionally drawn underlays, **not added movement blockers**: Lena, Yenisei, Ob, Irtysh, Angara, Selenga, Argun and Amur. No invented straits, bridges, deadlines or map-wide supply-attrition mechanics.

Starting city geography: 72 genuine settlement positions, 13 Chinese Federation staging cities in Mongolia/northeastern China and 59 E.U. cities across the Russian Far East and Siberia. City and fortification ownership is fictional in the Code Geass setting. The hex map is geographically broad: the full Siberian interior and Arctic are in play; long advances are deliberate. Railway/supply routes appear in `g.scenario.supplyCorridors` for operational planning, **not as a separate custom engine system**. Standard cities, economy, recruitment, manual repairs, technology, capture and income remain in force.

## Forces and operational design
- Federation: 141 land formations split into 11 Army Groups, staged from Ulaanbaatar, Choibalsan, Hailar, Manzhouli, Heihe, Fuyuan and supporting bases. Commander-led heavy armor and rockets; distinct Federation classes via `E.typeFor('cf', cls, g)`.
- E.U.: 108 land formations in 16 Army Groups guarding Kyakhta, Chita, the Amur, Yakutsk, Irkutsk and western industrial hubs. E.U. class selection uses `E.typeFor('eu', cls, g)`. Europian counterattacks are expected from defended railheads under the shared Europe AI doctrine; this remains to be confirmed by simulation.
- Ocean: six Federation ships stage off the Amur/Okhotsk approach; Europian fleets defend the Okhotsk and Arctic seas. **Nine individually capturable ports** use city-associated `portAt` / `portOwner` / `portLevel` with separate ocean hexes and no ship spawning on land. Federation must capture enemy ports to gain forward dock access. The source needs a runtime sea-component connectivity check.
- `meta.ai` provides Federation operational axes, Europe doctrine and E.U. defensive hubs. No ID-specific shared AI hack, scripted spawns or turn limits. Victory is strictly **all 72 cities owned by one faction**.
- Four settings: normal, hard, challenge, elite; seed passed into `create(side,difficulty,seed)`. Only enemy economic scaling/formation stacking for harder settings. Elite uses established `E.prepareEliteEurope` and scenario faction-legal elite rosters. No modifications to HQ rules, rewards, medals, saves or progression.

## Integrator dependency report
1. In `dist/scenario-manifest.js`, add exactly `{id:"cf-eu-siberia",title:"Invasion of Siberia",note:"72 cities · 2 sides · northern offensive"}` to `SCENARIO_MANIFEST`.
2. Add `'scenarios-cf-eu-siberia.js'` to `SCENARIO_FILES` **after** the already-listed `'siberia-landmask.js'`; do not duplicate the shared coastline helper. Regenerate `dist/scenario-catalog.js` via the catalog tool. Ensure the browser loader adds the `dist/` prefix automatically as for other scenarios.
3. Replace the null runtime `scenarioId` for `federation-eu-siberia` with `cf-eu-siberia` in the Federation World Campaign registry **only after** tests pass. Keep reward amounts and tier unlock semantics owned by the integrator.
4. Shared-code requests: **none intended**. Verify the already-shared `prepareEliteEurope`, generic HQ, city-linked port capture, AI operational axes and save/medal handlers recognize new scenarios by `meta`. Escalate actual incompatibilities to the relevant lane, rather than modifying shared files here.

## Verification and limitations
Static implementation checks: unique city names and valid side-owned staging bases, source-level victory predicate, required metadata and independent port field usage. This deliverable uses the existing exact sampled landmask, but **no full game-engine simulations or browser/mobile checks have been executed in the current environment**; do not treat balance or naval reachability as certified. Before merging run:
```bash
python3 tools/build_sources.py
node --check dist/scenarios-cf-eu-siberia.js
node tools/scenario_sim.cjs cf-eu-siberia cf normal 11 5
node tools/scenario_sim.cjs cf-eu-siberia eu normal 11 5
# Repeat 11, 27, 61, 97 at 25–100 turns; also both sides all 4 difficulties.
node tools/scenario_sim.cjs --all > /tmp/cf-eu-now.txt
node tools/validate_assets.cjs --tracked
node tools/federation_eu_campaign_smoke.cjs
```
Compare previous scenario fingerprint lines with `tools/data/sim_baseline.txt`; separately regenerate baseline in the integrator lane when scenario catalog changes. Manually validate coastline/port sea-connected components, capture and independent control, save/reload, commander/HQ/medal rules, rewards, technology, AI recruitment and performance at phone viewport. Prioritize starting formation adjustments if seeded runs show unwinnable Normal for either side.
